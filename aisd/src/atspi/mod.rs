// aisd — AT-SPI2 Accessibility Bridge
//
// This module lets aisd control ANY running Linux GUI application:
// GTK4, Qt, LibreOffice, Firefox, etc.
//
// How it works:
//   1. Use D-Bus to talk to org.a11y.atspi (AT-SPI2 registry)
//   2. Enumerate windows and their accessibility trees
//   3. Find UI elements by role/name/label
//   4. Perform actions: click, type, activate, select, scroll
//
// Dependencies: `zbus` (async D-Bus in Rust)
// Runtime requirement: at-spi2-core service running (standard on all GNOME/GTK desktops)

use anyhow::{anyhow, Result};
use serde::{Deserialize, Serialize};
use std::process::Command;
use std::time::Duration;
use tracing::{info, warn};

// ──────────────────────────────────────────────────────────────────────────────
// Public types
// ──────────────────────────────────────────────────────────────────────────────

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct AppWindow {
    pub app_name: String,
    pub pid: u32,
    pub title: String,
    pub role: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct UiElement {
    pub role: String,
    pub name: String,
    pub description: String,
    pub index_path: Vec<i32>, // path from root to this element
    pub is_focusable: bool,
    pub is_enabled: bool,
    pub text_value: Option<String>,
}

// ──────────────────────────────────────────────────────────────────────────────
// AT-SPI2 bridge via Python subprocess (pyatspi has best API coverage)
// This avoids zbus complexity while being equally powerful.
// On the real OS: `python3-pyatspi` is a dependency in packages.x86_64
// ──────────────────────────────────────────────────────────────────────────────

/// Run an AT-SPI2 operation via embedded Python helper
fn run_atspi_python(script: &str) -> Result<serde_json::Value> {
    let full_script = format!(
        r#"
import sys, json
try:
    import pyatspi
    {script}
except ImportError:
    print(json.dumps({{"error": "pyatspi not installed. Run: pip install pyatspi"}}))
except Exception as e:
    print(json.dumps({{"error": str(e)}}))
"#,
        script = script
    );

    let output = Command::new("python3")
        .arg("-c")
        .arg(&full_script)
        .output()
        .map_err(|e| anyhow!("Failed to run python3: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);

    if !output.status.success() && stdout.trim().is_empty() {
        return Err(anyhow!("AT-SPI2 python error: {}", stderr));
    }

    let result: serde_json::Value = serde_json::from_str(stdout.trim())
        .map_err(|e| anyhow!("Failed to parse AT-SPI2 output: {} (raw: {})", e, stdout.trim()))?;

    if let Some(err) = result.get("error") {
        return Err(anyhow!("AT-SPI2 error: {}", err));
    }

    Ok(result)
}

/// List all running accessible applications + their windows
pub fn list_accessible_apps() -> Result<Vec<AppWindow>> {
    let script = r#"
desktop = pyatspi.Registry.getDesktop(0)
apps = []
for app in desktop:
    if app is None:
        continue
    try:
        pid = app.get_process_id()
        app_name = app.name or "unknown"
        for i in range(app.childCount):
            child = app.getChildAtIndex(i)
            if child and child.getRoleName() in ('frame', 'window', 'dialog'):
                apps.append({
                    "app_name": app_name,
                    "pid": pid,
                    "title": child.name or app_name,
                    "role": child.getRoleName()
                })
    except Exception as e:
        pass
print(json.dumps(apps))
"#;

    let result = run_atspi_python(script)?;
    let apps: Vec<AppWindow> = serde_json::from_value(result)
        .map_err(|e| anyhow!("Failed to parse app list: {}", e))?;
    Ok(apps)
}

/// Find UI elements in an application by role and/or name
/// `app_name`: application name (e.g. "soffice", "firefox", "gedit")
/// `role_filter`: optional role filter ("push button", "text", "entry", "combo box", etc.)
/// `name_filter`: optional substring match on element name/label
pub fn find_elements(
    app_name: &str,
    role_filter: Option<&str>,
    name_filter: Option<&str>,
) -> Result<Vec<UiElement>> {
    let role_filter_py = role_filter
        .map(|r| format!("'{}'", r))
        .unwrap_or("None".to_string());
    let name_filter_py = name_filter
        .map(|n| format!("'{}'", n.replace('\'', "\\'")))
        .unwrap_or("None".to_string());

    let script = format!(
        r#"
import re

app_name_target = '{app_name}'
role_filter = {role_filter}
name_filter = {name_filter}

desktop = pyatspi.Registry.getDesktop(0)
elements = []

def walk(node, path):
    if node is None:
        return
    try:
        role = node.getRoleName()
        name = node.name or ''
        desc = node.description or ''

        matches = True
        if role_filter and role != role_filter:
            matches = False
        if name_filter and name_filter.lower() not in name.lower() and name_filter.lower() not in desc.lower():
            matches = False

        if matches and role not in ('application', 'desktop frame'):
            # Try to get text value
            text_val = None
            try:
                text_iface = node.queryText()
                text_val = text_iface.getText(0, -1)
            except:
                pass

            ifaces = node.getInterfaces()
            is_focusable = 'Component' in ifaces
            is_enabled = True
            try:
                state_set = node.getState()
                is_enabled = state_set.contains(pyatspi.STATE_ENABLED)
            except:
                pass

            elements.append({{
                "role": role,
                "name": name,
                "description": desc,
                "index_path": list(path),
                "is_focusable": is_focusable,
                "is_enabled": is_enabled,
                "text_value": text_val
            }})

        for i in range(min(node.childCount, 200)):
            walk(node.getChildAtIndex(i), path + [i])
    except Exception as e:
        pass

for app in desktop:
    if app is None:
        continue
    if app_name_target.lower() not in (app.name or '').lower():
        continue
    walk(app, [])

print(json.dumps(elements[:50]))  # cap at 50 to avoid payload explosion
"#,
        app_name = app_name.replace('\'', "\\'"),
        role_filter = role_filter_py,
        name_filter = name_filter_py,
    );

    let result = run_atspi_python(&script)?;
    let elements: Vec<UiElement> = serde_json::from_value(result)
        .map_err(|e| anyhow!("Failed to parse elements: {}", e))?;
    Ok(elements)
}

/// Click a UI element by index_path in an application
pub fn click_element(app_name: &str, index_path: &[i32]) -> Result<()> {
    let path_str = format!(
        "[{}]",
        index_path
            .iter()
            .map(|i| i.to_string())
            .collect::<Vec<_>>()
            .join(", ")
    );

    let script = format!(
        r#"
app_name_target = '{app_name}'
index_path = {path_str}

desktop = pyatspi.Registry.getDesktop(0)

def get_at_path(node, path):
    current = node
    for idx in path:
        if current is None or idx >= current.childCount:
            return None
        current = current.getChildAtIndex(idx)
    return current

for app in desktop:
    if app is None:
        continue
    if app_name_target.lower() not in (app.name or '').lower():
        continue
    node = get_at_path(app, index_path)
    if node is None:
        print(json.dumps({{"error": "Element not found at path"}}))
        break
    # Try action interface first
    try:
        action = node.queryAction()
        for i in range(action.nActions):
            if action.getName(i) in ('click', 'activate', 'press'):
                action.doAction(i)
                print(json.dumps({{"success": True, "action": action.getName(i)}}))
                import sys; sys.exit(0)
    except:
        pass
    # Try component click (raw coordinate click)
    try:
        comp = node.queryComponent()
        bounds = comp.getExtents(pyatspi.DESKTOP_COORDS)
        cx = bounds.x + bounds.width // 2
        cy = bounds.y + bounds.height // 2
        node.grabFocus()
        comp.grabFocus()
        pyatspi.Registry.generateMouseEvent(cx, cy, 'b1c')
        print(json.dumps({{"success": True, "action": "mouse_click", "x": cx, "y": cy}}))
    except Exception as e:
        print(json.dumps({{"error": str(e)}}))
    break
else:
    print(json.dumps({{"error": "Application not found: " + app_name_target}}))
"#,
        app_name = app_name.replace('\'', "\\'"),
        path_str = path_str,
    );

    let result = run_atspi_python(&script)?;
    if result.get("success").is_none() {
        return Err(anyhow!(
            "Click failed: {}",
            result.get("error").and_then(|v| v.as_str()).unwrap_or("unknown")
        ));
    }
    info!("AT-SPI2 click: app={} path={:?}", app_name, index_path);
    Ok(())
}

/// Type text into the focused/specified element
pub fn type_text(app_name: &str, index_path: &[i32], text: &str) -> Result<()> {
    let path_str = format!(
        "[{}]",
        index_path
            .iter()
            .map(|i| i.to_string())
            .collect::<Vec<_>>()
            .join(", ")
    );

    let escaped_text = text.replace('\'', "\\'").replace('\n', "\\n");

    let script = format!(
        r#"
import time
app_name_target = '{app_name}'
index_path = {path_str}
text_to_type = '{text}'

desktop = pyatspi.Registry.getDesktop(0)

def get_at_path(node, path):
    current = node
    for idx in path:
        if current is None or idx >= current.childCount:
            return None
        current = current.getChildAtIndex(idx)
    return current

for app in desktop:
    if app is None:
        continue
    if app_name_target.lower() not in (app.name or '').lower():
        continue
    node = get_at_path(app, index_path)
    if node is None:
        print(json.dumps({{"error": "Element not found"}}))
        break
    # Focus element
    try:
        node.grabFocus()
    except:
        pass
    time.sleep(0.1)
    # Try EditableText interface first (most reliable)
    try:
        editable = node.queryEditableText()
        # Clear existing + insert new
        length = editable.characterCount
        if length > 0:
            editable.deleteText(0, length)
        editable.insertText(0, text_to_type, len(text_to_type))
        print(json.dumps({{"success": True, "method": "EditableText", "chars": len(text_to_type)}}))
        import sys; sys.exit(0)
    except:
        pass
    # Fallback: generate keyboard events
    for char in text_to_type:
        pyatspi.Registry.generateKeyboardEvent(0, char, pyatspi.KEY_SYM)
        time.sleep(0.02)
    print(json.dumps({{"success": True, "method": "keyboard_events", "chars": len(text_to_type)}}))
    break
else:
    print(json.dumps({{"error": "Application not found"}}))
"#,
        app_name = app_name.replace('\'', "\\'"),
        path_str = path_str,
        text = escaped_text,
    );

    let result = run_atspi_python(&script)?;
    if result.get("success").is_none() {
        return Err(anyhow!(
            "Type failed: {}",
            result.get("error").and_then(|v| v.as_str()).unwrap_or("unknown")
        ));
    }
    info!("AT-SPI2 type: app={} chars={}", app_name, text.len());
    Ok(())
}

/// Take a screenshot — tries grim (Wayland) then scrot/import (X11) then xwd
pub fn take_screenshot(output_path: &str) -> Result<String> {
    // Try grim (Wayland/wlroots)
    let grim = Command::new("grim").arg(output_path).status();
    if grim.is_ok() && grim.unwrap().success() {
        info!("Screenshot taken with grim: {}", output_path);
        return Ok(output_path.to_string());
    }

    // Try scrot (X11)
    let scrot = Command::new("scrot").arg(output_path).status();
    if scrot.is_ok() && scrot.unwrap().success() {
        info!("Screenshot taken with scrot: {}", output_path);
        return Ok(output_path.to_string());
    }

    // Try import (ImageMagick, works on X11)
    let import = Command::new("import")
        .args(&["-window", "root", output_path])
        .status();
    if import.is_ok() && import.unwrap().success() {
        info!("Screenshot taken with import: {}", output_path);
        return Ok(output_path.to_string());
    }

    Err(anyhow!(
        "No screenshot tool available. Install: grim (Wayland) or scrot (X11)"
    ))
}

/// High-level: find and fill a form field by label/placeholder in an app
/// This is the "fill LibreOffice form" function.
pub fn fill_form_field(app_name: &str, field_label: &str, value: &str) -> Result<()> {
    info!(
        "fill_form_field: app='{}' label='{}' value='{}'",
        app_name, field_label, value
    );

    // Find text entry elements near the label
    let elements = find_elements(app_name, Some("text"), Some(field_label))
        .or_else(|_| find_elements(app_name, Some("entry"), Some(field_label)))
        .or_else(|_| find_elements(app_name, None, Some(field_label)))?;

    if elements.is_empty() {
        return Err(anyhow!(
            "No field found with label '{}' in '{}'",
            field_label,
            app_name
        ));
    }

    let element = &elements[0];
    type_text(app_name, &element.index_path, value)?;
    info!(
        "Filled '{}' with '{}' in app '{}'",
        field_label, value, app_name
    );
    Ok(())
}
