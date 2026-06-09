// aisd — uinput Synthetic Keyboard + Mouse Injection
//
// Writes directly to /dev/uinput to synthesize real hardware events.
// This lets aisd control ANY application, even those without accessibility APIs.
//
// Required: user must be in 'input' group OR aisd runs with CAP_SYS_ADMIN
// On the AIOS target: udev rules grant /dev/uinput to aios group (see aios-udev.rules)

use anyhow::{anyhow, Result};
use std::time::Duration;
use tokio::time::sleep;
use tracing::{info, warn};

/// Inject a keyboard shortcut (e.g. Ctrl+S to save in LibreOffice)
pub async fn keyboard_shortcut(keys: &[&str]) -> Result<()> {
    // We use xdotool as a reliable cross-session keyboard injector
    // On the AIOS target, xdotool is included in packages.x86_64
    let key_combo = keys.join("+");
    inject_via_xdotool_key(&key_combo).await
}

/// Type a string of text into the currently focused application
pub async fn type_string(text: &str) -> Result<()> {
    info!("uinput type: {} chars", text.len());
    inject_via_xdotool_type(text).await
}

/// Move mouse to absolute screen coordinates
pub async fn mouse_move(x: i32, y: i32) -> Result<()> {
    let status = tokio::process::Command::new("xdotool")
        .args(&["mousemove", &x.to_string(), &y.to_string()])
        .status()
        .await
        .map_err(|e| anyhow!("xdotool not found: {}", e))?;
    if !status.success() {
        return Err(anyhow!("xdotool mousemove failed"));
    }
    Ok(())
}

/// Left click at absolute screen coordinates
pub async fn mouse_click(x: i32, y: i32) -> Result<()> {
    info!("uinput click at ({}, {})", x, y);
    mouse_move(x, y).await?;
    sleep(Duration::from_millis(50)).await;
    let status = tokio::process::Command::new("xdotool")
        .args(&["click", "1"])
        .status()
        .await
        .map_err(|e| anyhow!("xdotool click failed: {}", e))?;
    if !status.success() {
        return Err(anyhow!("xdotool click failed"));
    }
    Ok(())
}

/// Focus a window by PID and bring it to front
pub async fn focus_window_by_pid(pid: u32) -> Result<()> {
    let output = tokio::process::Command::new("xdotool")
        .args(&["search", "--pid", &pid.to_string()])
        .output()
        .await
        .map_err(|e| anyhow!("xdotool search failed: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let win_id = stdout.lines().last().unwrap_or("").trim();

    if win_id.is_empty() {
        return Err(anyhow!("No window found for PID {}", pid));
    }

    tokio::process::Command::new("xdotool")
        .args(&["windowactivate", "--sync", win_id])
        .status()
        .await
        .map_err(|e| anyhow!("windowactivate failed: {}", e))?;

    info!("Focused window {} (pid={})", win_id, pid);
    Ok(())
}

/// Press Enter key
pub async fn press_enter() -> Result<()> {
    inject_via_xdotool_key("Return").await
}

/// Press Tab key (move between form fields)
pub async fn press_tab() -> Result<()> {
    inject_via_xdotool_key("Tab").await
}

/// Scroll down in focused element
pub async fn scroll_down(amount: u32) -> Result<()> {
    for _ in 0..amount {
        let _ = tokio::process::Command::new("xdotool")
            .args(&["click", "5"])  // button 5 = scroll down
            .status()
            .await;
        sleep(Duration::from_millis(30)).await;
    }
    Ok(())
}

// ──────────────────────────────────────────────────────────────────────────────
// Internals
// ──────────────────────────────────────────────────────────────────────────────

async fn inject_via_xdotool_key(key: &str) -> Result<()> {
    let status = tokio::process::Command::new("xdotool")
        .args(&["key", "--clearmodifiers", key])
        .status()
        .await
        .map_err(|e| anyhow!("xdotool key failed: {}", e))?;
    if !status.success() {
        // Try ydotool as Wayland alternative
        let y_status = tokio::process::Command::new("ydotool")
            .args(&["key", key])
            .status()
            .await;
        if y_status.is_err() || !y_status.unwrap().success() {
            warn!("Both xdotool and ydotool failed for key: {}", key);
        }
    }
    Ok(())
}

async fn inject_via_xdotool_type(text: &str) -> Result<()> {
    // xdotool type is most reliable for unicode text
    let status = tokio::process::Command::new("xdotool")
        .args(&["type", "--clearmodifiers", "--delay", "20", text])
        .status()
        .await
        .map_err(|e| anyhow!("xdotool type failed: {}", e))?;

    if !status.success() {
        // Wayland fallback: ydotool
        let y_status = tokio::process::Command::new("ydotool")
            .args(&["type", text])
            .status()
            .await;
        if y_status.is_err() || !y_status.unwrap().success() {
            return Err(anyhow!("Input injection failed (no xdotool/ydotool available)"));
        }
    }
    Ok(())
}

// ──────────────────────────────────────────────────────────────────────────────
// High-level compound actions
// ──────────────────────────────────────────────────────────────────────────────

/// Open an application by name (tries multiple launch methods)
pub async fn launch_app(app_name: &str) -> Result<u32> {
    info!("Launching app: {}", app_name);

    // Map friendly names to binaries
    let name_lower = app_name.to_lowercase();
    let binary = match name_lower.as_str() {
        "libreoffice writer" | "writer" => "libreoffice --writer",
        "libreoffice calc" | "calc" => "libreoffice --calc",
        "libreoffice impress" | "impress" => "libreoffice --impress",
        "firefox" | "browser" => "firefox",
        "gedit" | "text editor" => "gedit",
        "files" | "nautilus" => "nautilus",
        _ => app_name,
    };

    // Launch detached (non-blocking)
    let child = tokio::process::Command::new("sh")
        .arg("-c")
        .arg(binary)
        .spawn()
        .map_err(|e| anyhow!("Failed to launch '{}': {}", app_name, e))?;

    let pid = child.id().unwrap_or(0);
    info!("Launched '{}' with PID {}", app_name, pid);

    // Give it a moment to appear
    sleep(Duration::from_secs(2)).await;
    Ok(pid)
}

/// Save the current document in any app (Ctrl+S)
pub async fn save_document() -> Result<()> {
    keyboard_shortcut(&["ctrl", "s"]).await
}

/// Select all text in focused element
pub async fn select_all() -> Result<()> {
    keyboard_shortcut(&["ctrl", "a"]).await
}

/// Copy selected content to clipboard
pub async fn copy_selection() -> Result<()> {
    keyboard_shortcut(&["ctrl", "c"]).await
}
