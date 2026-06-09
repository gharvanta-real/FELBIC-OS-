// aisd — LLM Inference Engine with Tool-Use Loop + Conversation Context
//
// Architecture:
//   User prompt → build_system_prompt() + conversation history →
//   llama-server /completion → parse tool calls → execute tools →
//   inject results → second pass → return final response
//
// Tool format (XML-style, simple to parse without regex):
//   <tool_call>{"tool":"fs_search","args":{"query":"pdf files"}}</tool_call>

use anyhow::{anyhow, Result};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use std::process::Stdio;
use std::sync::OnceLock;
use std::time::Duration;
use tokio::process::{Child, Command};
use tokio::sync::Mutex;
use tracing::{error, info, warn};

// ──────────────────────────────────────────────────────────────────────────────
// Configuration
// ──────────────────────────────────────────────────────────────────────────────

#[derive(Clone, Deserialize)]
struct ModelConfig {
    name: String,
    path: String,
    vram_offload_layers: u32,
    context_size: u32,
}

#[derive(Clone, Deserialize)]
struct DaemonConfig {
    model: ModelConfig,
}

impl Default for DaemonConfig {
    fn default() -> Self {
        Self {
            model: ModelConfig {
                name: "tinyllama".to_string(),
                path: "/var/lib/aios/models/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf".to_string(),
                vram_offload_layers: 0,
                context_size: 2048,
            },
        }
    }
}

fn load_config() -> DaemonConfig {
    let path = PathBuf::from("/etc/aios/aisd.toml");
    if !path.exists() {
        warn!("Config file not found at {:?}. Using default TinyLlama settings.", path);
        return DaemonConfig::default();
    }
    match std::fs::read_to_string(&path) {
        Ok(text) => match toml::from_str::<DaemonConfig>(&text) {
            Ok(cfg) => {
                info!("Loaded LLM config: model={}, path={}", cfg.model.name, cfg.model.path);
                cfg
            }
            Err(e) => {
                error!("Failed to parse config at {:?}: {}. Using default.", path, e);
                DaemonConfig::default()
            }
        },
        Err(e) => {
            error!("Failed to read config at {:?}: {}. Using default.", path, e);
            DaemonConfig::default()
        }
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// State: subprocess + per-session conversation history
// ──────────────────────────────────────────────────────────────────────────────

struct InferenceState {
    child: Option<Child>,
    config: DaemonConfig,
    /// session_id → list of (role, content) pairs
    conversations: HashMap<String, Vec<(String, String)>>,
}

static STATE: OnceLock<Mutex<InferenceState>> = OnceLock::new();

fn get_state() -> &'static Mutex<InferenceState> {
    STATE.get_or_init(|| {
        Mutex::new(InferenceState {
            child: None,
            config: load_config(),
            conversations: HashMap::new(),
        })
    })
}

// ──────────────────────────────────────────────────────────────────────────────
// llama-server subprocess lifecycle
// ──────────────────────────────────────────────────────────────────────────────

async fn ensure_server_running(state: &mut InferenceState) -> Result<()> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_millis(500))
        .build()?;

    if client.get("http://127.0.0.1:8081/health").send().await.is_ok() {
        return Ok(());
    }

    if let Some(mut child) = state.child.take() {
        let _ = child.kill().await;
    }

    let model_path = PathBuf::from(&state.config.model.path);
    if !model_path.exists() {
        error!("Model weights not found at {:?}", model_path);
        return Err(anyhow!("Model weights file not found at {:?}", model_path));
    }

    info!(
        model_path = %model_path.display(),
        layers = state.config.model.vram_offload_layers,
        "Spawning llama-server subprocess..."
    );

    let child = Command::new("llama-server")
        .arg("-m").arg(&state.config.model.path)
        .arg("-c").arg(state.config.model.context_size.to_string())
        .arg("-ngl").arg(state.config.model.vram_offload_layers.to_string())
        .arg("--port").arg("8081")
        .arg("-t").arg("4")
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|e| anyhow!("Failed to spawn llama-server: {}", e))?;

    state.child = Some(child);

    info!("Waiting for llama-server to become healthy (max 30s)...");
    let health_client = reqwest::Client::builder().timeout(Duration::from_secs(1)).build()?;
    for _ in 0..30 {
        tokio::time::sleep(Duration::from_secs(1)).await;
        if health_client.get("http://127.0.0.1:8081/health").send().await.is_ok() {
            info!("llama-server is healthy.");
            return Ok(());
        }
    }

    error!("llama-server failed to become healthy within 30 seconds.");
    Err(anyhow!("llama-server startup timeout"))
}

// ──────────────────────────────────────────────────────────────────────────────
// HTTP Types for llama-server /completion
// ──────────────────────────────────────────────────────────────────────────────

#[derive(Serialize)]
struct CompletionRequest<'a> {
    prompt: &'a str,
    n_predict: u32,
    temperature: f32,
    stop: Vec<&'a str>,
}

#[derive(Deserialize)]
struct CompletionResponse {
    content: String,
}

async fn llm_complete(prompt: &str, max_tokens: u32) -> Result<String> {
    let client = reqwest::Client::new();
    let req = CompletionRequest {
        prompt,
        n_predict: max_tokens,
        temperature: 0.7,
        stop: vec!["</s>", "[INST]", "[/INST]", "</tool_call>"],
    };

    let res = client
        .post("http://127.0.0.1:8081/completion")
        .json(&req)
        .send()
        .await
        .map_err(|e| anyhow!("llama-server connection failed: {}", e))?;

    if !res.status().is_success() {
        return Err(anyhow!("llama-server returned status: {}", res.status()));
    }

    let resp = res
        .json::<CompletionResponse>()
        .await
        .map_err(|e| anyhow!("Failed to parse completion response: {}", e))?;

    Ok(resp.content.trim().to_string())
}

// ──────────────────────────────────────────────────────────────────────────────
// Tool definitions & execution
// ──────────────────────────────────────────────────────────────────────────────

const TOOLS_SCHEMA: &str = r#"
You are AIOS Assistant — the AI built into FELBIC OS. You are a powerful AI agent, not just a chatbot.
You can ACTUALLY control the operating system, run applications, fill forms, search files, and take actions.

Call tools using XML format:
<tool_call>{"tool":"TOOL_NAME","args":{...}}</tool_call>

Available tools:

[SYSTEM INFO]
- stats_get: {} — Get CPU and memory usage
- process_list: {} — List running processes

[FILE SYSTEM]
- fs_search: {"query": "pdf files", "limit": 10} — Search files by name
- fs_list: {"path": "Documents"} — List directory contents

[APP CONTROL — Real GUI application control]
- app_list_windows: {} — List all open application windows
- app_find_elements: {"app": "libreoffice", "role": "text", "name": "First Name"} — Find UI elements
- app_fill_field: {"app": "libreoffice", "label": "First Name", "value": "John"} — Fill form field in any app
- app_click: {"app": "firefox", "path": [0, 1, 3]} — Click UI element by path
- app_type: {"app": "gedit", "path": [0], "text": "Hello World"} — Type text into element
- app_launch: {"app": "libreoffice writer"} — Launch an application
- app_shortcut: {"keys": ["ctrl", "s"]} — Send keyboard shortcut to active window
- app_save: {} — Save current document (Ctrl+S)

[INPUT INJECTION — Raw keyboard/mouse]
- input_type: {"text": "Hello"} — Type text into currently focused element
- input_click: {"x": 500, "y": 300} — Click at screen coordinates
- input_key: {"key": "Return"} — Press a keyboard key

[SCREEN]
- screenshot_take: {"path": "/tmp/screen.png"} — Take a screenshot

Rules:
- When user asks to OPEN an app, use app_launch
- When user asks to FILL a form, use app_fill_field (works with LibreOffice, Firefox, gedit, etc.)
- When user asks to TYPE something, use input_type after focusing the right element
- When user asks to DRAW or PAINT, open the paint app or use input_click to draw
- DO NOT just describe actions — ACTUALLY call the tools to perform them
- Chain multiple tool calls if needed to complete complex tasks
"#;

#[derive(Deserialize)]
struct ToolCall {
    tool: String,
    args: serde_json::Value,
}

fn parse_tool_call(text: &str) -> Option<ToolCall> {
    let start = text.find("<tool_call>")?;
    let end = text.find("</tool_call>")?;
    let json_str = &text[start + "<tool_call>".len()..end];
    serde_json::from_str::<ToolCall>(json_str).ok()
}

fn execute_tool(tool_call: &ToolCall) -> String {
    match tool_call.tool.as_str() {
        "fs_search" => {
            let query = tool_call.args.get("query")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            let limit = tool_call.args.get("limit")
                .and_then(|v| v.as_u64())
                .unwrap_or(10) as usize;
            match crate::fs::search_files(query, limit) {
                Ok(results) if results.is_empty() => {
                    format!("No files found matching '{}'", query)
                }
                Ok(results) => {
                    let lines: Vec<String> = results.iter()
                        .map(|r| format!("  {} ({})", r.path, if r.is_dir { "dir" } else { "file" }))
                        .collect();
                    format!("Found {} results:\n{}", results.len(), lines.join("\n"))
                }
                Err(e) => format!("fs_search error: {}", e),
            }
        }
        "fs_list" => {
            let path = tool_call.args.get("path")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            match crate::fs::list_files(path) {
                Ok(items) if items.is_empty() => "Directory is empty.".to_string(),
                Ok(items) => {
                    let lines: Vec<String> = items.iter()
                        .map(|i| format!("  {} {}", if i.is_dir { "📁" } else { "📄" }, i.name))
                        .collect();
                    lines.join("\n")
                }
                Err(e) => format!("fs_list error: {}", e),
            }
        }
        "process_list" => {
            match crate::process::get_running_processes() {
                Ok(procs) => {
                    let top5: Vec<String> = procs.iter().take(10)
                        .map(|p| format!("  PID {:6} {:20} {}", p.pid, p.name, p.state))
                        .collect();
                    format!("Running processes ({} total):\n{}", procs.len(), top5.join("\n"))
                }
                Err(e) => format!("process_list error: {}", e),
            }
        }
        "stats_get" => {
            let stats = crate::process::get_system_stats();
            let mem_pct = if stats.memory_total_bytes > 0 {
                stats.memory_used_bytes * 100 / stats.memory_total_bytes
            } else {
                0
            };
            format!(
                "CPU: {:.1}% | Memory: {}% ({:.1} GB / {:.1} GB)",
                stats.cpu_load_percent,
                mem_pct,
                stats.memory_used_bytes as f64 / 1_073_741_824.0,
                stats.memory_total_bytes as f64 / 1_073_741_824.0,
            )
        }
        // ── App Control (AT-SPI2) ──
        "app_list_windows" => {
            match crate::atspi::list_accessible_apps() {
                Ok(apps) if apps.is_empty() => "No accessible windows found. Make sure apps are open.".to_string(),
                Ok(apps) => {
                    let lines: Vec<String> = apps.iter()
                        .map(|a| format!("  [{}] {} (PID {}) — {}", a.role, a.title, a.pid, a.app_name))
                        .collect();
                    format!("Open windows ({}):\n{}", apps.len(), lines.join("\n"))
                }
                Err(e) => format!("app_list_windows error: {}", e),
            }
        }
        "app_find_elements" => {
            let app_name = tool_call.args.get("app").and_then(|v| v.as_str()).unwrap_or("");
            let role = tool_call.args.get("role").and_then(|v| v.as_str());
            let name = tool_call.args.get("name").and_then(|v| v.as_str());
            match crate::atspi::find_elements(app_name, role, name) {
                Ok(els) if els.is_empty() => format!("No elements found in '{}'", app_name),
                Ok(els) => {
                    let lines: Vec<String> = els.iter().take(10)
                        .map(|e| format!(
                            "  [{}] '{}' path={:?}{}",
                            e.role, e.name, e.index_path,
                            e.text_value.as_ref().map(|t| format!(" value='{}'", t)).unwrap_or_default()
                        ))
                        .collect();
                    format!("Found {} elements:\n{}", els.len(), lines.join("\n"))
                }
                Err(e) => format!("app_find_elements error: {}", e),
            }
        }
        "app_fill_field" => {
            let app_name = tool_call.args.get("app").and_then(|v| v.as_str()).unwrap_or("");
            let label = tool_call.args.get("label").and_then(|v| v.as_str()).unwrap_or("");
            let value = tool_call.args.get("value").and_then(|v| v.as_str()).unwrap_or("");
            match crate::atspi::fill_form_field(app_name, label, value) {
                Ok(()) => format!("Filled '{}' with '{}' in {}", label, value, app_name),
                Err(e) => format!("app_fill_field error: {}", e),
            }
        }
        "app_click" => {
            let app_name = tool_call.args.get("app").and_then(|v| v.as_str()).unwrap_or("");
            let path: Vec<i32> = tool_call.args.get("path")
                .and_then(|v| v.as_array())
                .map(|arr| arr.iter().filter_map(|v| v.as_i64().map(|n| n as i32)).collect())
                .unwrap_or_default();
            match crate::atspi::click_element(app_name, &path) {
                Ok(()) => format!("Clicked element at {:?} in {}", path, app_name),
                Err(e) => format!("app_click error: {}", e),
            }
        }
        "app_type" => {
            let app_name = tool_call.args.get("app").and_then(|v| v.as_str()).unwrap_or("");
            let path: Vec<i32> = tool_call.args.get("path")
                .and_then(|v| v.as_array())
                .map(|arr| arr.iter().filter_map(|v| v.as_i64().map(|n| n as i32)).collect())
                .unwrap_or_default();
            let text = tool_call.args.get("text").and_then(|v| v.as_str()).unwrap_or("");
            match crate::atspi::type_text(app_name, &path, text) {
                Ok(()) => format!("Typed {} chars into {} element {:?}", text.len(), app_name, path),
                Err(e) => format!("app_type error: {}", e),
            }
        }
        "app_launch" => {
            // Tool execution can't be async — use a blocking runtime
            let app_name = tool_call.args.get("app").and_then(|v| v.as_str()).unwrap_or("");
            // Spawn the process (non-async via std::process::Command for tool context)
            match std::process::Command::new("sh")
                .arg("-c")
                .arg(app_name)
                .spawn()
            {
                Ok(child) => format!("Launched '{}' with PID {}", app_name, child.id()),
                Err(e) => format!("app_launch error: {}", e),
            }
        }
        "app_shortcut" | "input_key" => {
            let keys: Vec<&str> = if tool_call.tool == "app_shortcut" {
                tool_call.args.get("keys")
                    .and_then(|v| v.as_array())
                    .map(|arr| arr.iter().filter_map(|v| v.as_str()).collect())
                    .unwrap_or_default()
            } else {
                vec![tool_call.args.get("key").and_then(|v| v.as_str()).unwrap_or("")]
            };
            let combo = keys.join("+");
            let status = std::process::Command::new("xdotool")
                .args(&["key", "--clearmodifiers", &combo])
                .status();
            match status {
                Ok(s) if s.success() => format!("Sent key combo: {}", combo),
                _ => format!("Key combo sent (xdotool may not be available): {}", combo),
            }
        }
        "app_save" => {
            let _ = std::process::Command::new("xdotool")
                .args(&["key", "ctrl+s"])
                .status();
            "Document save shortcut sent (Ctrl+S)".to_string()
        }
        "input_type" => {
            let text = tool_call.args.get("text").and_then(|v| v.as_str()).unwrap_or("");
            let status = std::process::Command::new("xdotool")
                .args(&["type", "--clearmodifiers", "--delay", "20", text])
                .status();
            match status {
                Ok(s) if s.success() => format!("Typed: {}", text),
                _ => format!("Type attempted: {}", text),
            }
        }
        "input_click" => {
            let x = tool_call.args.get("x").and_then(|v| v.as_i64()).unwrap_or(0);
            let y = tool_call.args.get("y").and_then(|v| v.as_i64()).unwrap_or(0);
            let _ = std::process::Command::new("xdotool")
                .args(&["mousemove", &x.to_string(), &y.to_string()])
                .status();
            let _ = std::process::Command::new("xdotool")
                .args(&["click", "1"])
                .status();
            format!("Clicked at ({}, {})", x, y)
        }
        "screenshot_take" => {
            let path = tool_call.args.get("path")
                .and_then(|v| v.as_str())
                .unwrap_or("/tmp/aios-screenshot.png");
            match crate::atspi::take_screenshot(path) {
                Ok(p) => format!("Screenshot saved to: {}", p),
                Err(e) => format!("screenshot error: {}", e),
            }
        }
        other => format!("Unknown tool: {}", other),
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// Public API
// ──────────────────────────────────────────────────────────────────────────────

/// Simple stateless query — used by `ai/query` IPC method and CLI.
pub async fn query(prompt: &str) -> Result<String> {
    chat(prompt, "default").await
}

/// Stateful chat with conversation context and tool-use loop.
/// `session_id` identifies the conversation (e.g. "default", user UID string, tab ID).
pub async fn chat(prompt: &str, session_id: &str) -> Result<String> {
    let mut state = get_state().lock().await;
    ensure_server_running(&mut state).await?;

    // Build conversation history text
    let history = state.conversations
        .entry(session_id.to_string())
        .or_default();

    // Limit history to last 10 exchanges (20 messages) to keep context bounded
    if history.len() > 20 {
        let drain_count = history.len() - 20;
        history.drain(0..drain_count);
    }

    // Build the full prompt with system context + history + new user message
    let mut full_prompt = format!("{}\n\n", TOOLS_SCHEMA.trim());
    for (role, content) in history.iter() {
        full_prompt.push_str(&format!("[{}]: {}\n", role, content));
    }
    full_prompt.push_str(&format!("[user]: {}\n[assistant]:", prompt));

    // Release lock while doing network I/O
    drop(state);

    // ── Tool-Use Loop (max 3 iterations to avoid runaway) ──
    let mut response = llm_complete(&full_prompt, 512).await?;
    let mut tool_results_injected = String::new();

    for _iteration in 0..3 {
        if let Some(tool_call) = parse_tool_call(&response) {
            info!(tool = %tool_call.tool, "LLM requested tool call");

            // Execute the tool synchronously (all our tools are cheap)
            let tool_result = execute_tool(&tool_call);
            info!(result_len = tool_result.len(), "Tool result ready");

            // Inject tool result and ask LLM to continue
            tool_results_injected = format!(
                "{}\n<tool_result>\n{}\n</tool_result>\n[assistant]:",
                response, tool_result
            );
            let continued = llm_complete(&format!("{}{}", full_prompt, tool_results_injected), 512).await?;
            response = continued;
        } else {
            break;
        }
    }

    // Clean up any leftover tool tags from final response
    let clean_response = response
        .split("<tool_call>").next()
        .unwrap_or(&response)
        .trim()
        .to_string();

    // Persist to conversation history
    let mut state = get_state().lock().await;
    let history = state.conversations
        .entry(session_id.to_string())
        .or_default();
    history.push(("user".to_string(), prompt.to_string()));
    history.push(("assistant".to_string(), clean_response.clone()));

    info!("Chat response ready ({} chars, {} history entries)", clean_response.len(), history.len());
    Ok(clean_response)
}

/// Clear conversation history for a session.
pub async fn clear_session(session_id: &str) {
    let mut state = get_state().lock().await;
    state.conversations.remove(session_id);
    info!("Cleared conversation history for session '{}'", session_id);
}

/// Clean shutdown hook to kill the subprocess.
pub async fn shutdown() {
    let mut state = get_state().lock().await;
    if let Some(mut child) = state.child.take() {
        info!("Terminating llama-server subprocess...");
        let _ = child.kill().await;
    }
}
