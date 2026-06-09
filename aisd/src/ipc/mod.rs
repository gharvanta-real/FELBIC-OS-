use anyhow::{anyhow, Result};
use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::time::Duration;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpListener;
#[cfg(unix)]
use tokio::net::{UnixListener, UnixStream};
use tokio_tungstenite::accept_async;
use tokio_tungstenite::tungstenite::Message;
use tracing::{error, info, warn};

use crate::acl::{self, Capability, Decision};

const MAX_FRAME_BYTES: usize = 8 * 1024 * 1024;

#[derive(Deserialize)]
struct RawRequest {
    id: Option<serde_json::Value>,
    method: String,
    params: Option<serde_json::Value>,
}

#[derive(Serialize)]
struct RawResponse {
    id: Option<serde_json::Value>,
    success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    result: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<String>,
}

pub async fn start() -> Result<()> {
    start_websocket_compat().await?;

    #[cfg(unix)]
    start_unix_msgpack().await?;

    #[cfg(not(unix))]
    warn!("Unix MessagePack IPC disabled on non-Unix target");

    Ok(())
}

async fn start_websocket_compat() -> Result<()> {
    let addr = "127.0.0.1:8080";
    let listener = TcpListener::bind(addr)
        .await
        .map_err(|e| anyhow!("Failed to bind WebSocket IPC to {}: {}", addr, e))?;
    info!("Compatibility WebSocket IPC listening on {}", addr);

    tokio::spawn(async move {
        while let Ok((stream, peer)) = listener.accept().await {
            info!("New WebSocket connection from {}", peer);
            tokio::spawn(async move {
                if let Err(e) = handle_websocket_connection(stream).await {
                    error!("Error handling WebSocket connection from {}: {}", peer, e);
                }
            });
        }
    });

    Ok(())
}

#[cfg(unix)]
async fn start_unix_msgpack() -> Result<()> {
    let socket_path = socket_path();
    if let Some(parent) = socket_path.parent() {
        tokio::fs::create_dir_all(parent).await?;
    }
    if socket_path.exists() {
        tokio::fs::remove_file(&socket_path).await?;
    }

    let listener = UnixListener::bind(&socket_path)
        .map_err(|e| anyhow!("Failed to bind Unix IPC at {:?}: {}", socket_path, e))?;

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let perms = std::fs::Permissions::from_mode(0o660);
        std::fs::set_permissions(&socket_path, perms)?;
    }

    info!(path = %socket_path.display(), "MessagePack Unix IPC listening");

    tokio::spawn(async move {
        loop {
            match listener.accept().await {
                Ok((stream, _addr)) => {
                    tokio::spawn(async move {
                        if let Err(e) = handle_unix_connection(stream).await {
                            error!("Error handling Unix IPC connection: {}", e);
                        }
                    });
                }
                Err(e) => warn!("Unix IPC accept failed: {}", e),
            }
        }
    });

    Ok(())
}

async fn handle_websocket_connection(stream: tokio::net::TcpStream) -> Result<()> {
    let ws_stream = accept_async(stream)
        .await
        .map_err(|e| anyhow!("WebSocket handshake failed: {}", e))?;
    info!("WebSocket connection established");

    let uid = current_uid();
    let (mut ws_sender, mut ws_receiver) = ws_stream.split();
    let mut stats_interval = tokio::time::interval(Duration::from_secs(5));
    stats_interval.tick().await;

    loop {
        tokio::select! {
            msg_opt = ws_receiver.next() => {
                match msg_opt {
                    Some(Ok(msg)) => {
                        if msg.is_text() || msg.is_binary() {
                            let text = msg.to_text().unwrap_or_default();
                            let response = handle_request_text(text, uid).await;
                            let resp_json = serde_json::to_string(&response).unwrap_or_default();
                            if let Err(e) = ws_sender.send(Message::Text(resp_json)).await {
                                warn!("Failed to send WebSocket response: {}", e);
                                break;
                            }
                        } else if msg.is_close() {
                            info!("WebSocket connection closed by client");
                            break;
                        }
                    }
                    Some(Err(e)) => {
                        warn!("Error reading WebSocket message: {}", e);
                        break;
                    }
                    None => {
                        info!("WebSocket client disconnected");
                        break;
                    }
                }
            }
            _ = stats_interval.tick() => {
                let stats = crate::process::get_system_stats();
                let event = serde_json::json!({
                    "event": "stats",
                    "data": stats
                });
                let event_json = serde_json::to_string(&event).unwrap_or_default();
                if let Err(e) = ws_sender.send(Message::Text(event_json)).await {
                    warn!("Failed to send periodic stats: {}", e);
                    break;
                }
            }
        }
    }

    Ok(())
}

#[cfg(unix)]
async fn handle_unix_connection(mut stream: UnixStream) -> Result<()> {
    let uid = stream
        .peer_cred()
        .ok()
        .map(|cred| cred.uid())
        .unwrap_or_else(current_uid);

    loop {
        let len = match stream.read_u32().await {
            Ok(len) => len as usize,
            Err(e) if e.kind() == std::io::ErrorKind::UnexpectedEof => break,
            Err(e) => return Err(e.into()),
        };

        if len == 0 || len > MAX_FRAME_BYTES {
            return Err(anyhow!("Invalid IPC frame length: {}", len));
        }

        let mut payload = vec![0_u8; len];
        stream.read_exact(&mut payload).await?;

        let response = match rmp_serde::from_slice::<RawRequest>(&payload) {
            Ok(req) => dispatch(req, uid).await,
            Err(e) => RawResponse {
                id: None,
                success: false,
                result: None,
                error: Some(format!("Invalid MessagePack request: {}", e)),
            },
        };

        let encoded = rmp_serde::to_vec_named(&response)?;
        if encoded.len() > MAX_FRAME_BYTES {
            return Err(anyhow!("IPC response exceeded max frame size"));
        }

        stream.write_u32(encoded.len() as u32).await?;
        stream.write_all(&encoded).await?;
        stream.flush().await?;
    }

    Ok(())
}

async fn handle_request_text(text: &str, uid: u32) -> RawResponse {
    let req: RawRequest = match serde_json::from_str(text) {
        Ok(r) => r,
        Err(e) => {
            return RawResponse {
                id: None,
                success: false,
                result: None,
                error: Some(format!("Invalid request JSON: {}", e)),
            };
        }
    };

    dispatch(req, uid).await
}

async fn dispatch(req: RawRequest, uid: u32) -> RawResponse {
    let id = req.id.clone();
    let result = dispatch_result(req, uid).await;

    match result {
        Ok(res) => RawResponse {
            id,
            success: true,
            result: Some(res),
            error: None,
        },
        Err(err_msg) => RawResponse {
            id,
            success: false,
            result: None,
            error: Some(err_msg),
        },
    }
}

async fn dispatch_result(req: RawRequest, uid: u32) -> std::result::Result<serde_json::Value, String> {
    let method = req.method.as_str();
    let params = req.params.unwrap_or_default();

    match method {
        "ping" => Ok(serde_json::json!({ "pong": true })),
        "version" => Ok(serde_json::json!({
            "name": env!("CARGO_PKG_NAME"),
            "version": env!("CARGO_PKG_VERSION")
        })),
        "capabilities" => Ok(serde_json::json!([
            "stats/get",
            "fs/index",
            "fs/search",
            "fs/list",
            "fs/read",
            "fs/write",
            "process/list",
            "process/kill",
            "system/control",
            "ai/query",
            "ai/chat",
            "ai/clear-session",
            "app/list-windows",
            "app/find-elements",
            "app/click",
            "app/type",
            "app/fill-field",
            "app/launch",
            "app/shortcut",
            "app/save",
            "input/type",
            "input/click",
            "input/key",
            "screenshot/take"
        ])),
        "stats/get" => {
            require(uid, method, Capability::StatsRead)?;
            serde_json::to_value(crate::process::get_system_stats()).map_err(|e| e.to_string())
        }
        "fs/index" => {
            require(uid, method, Capability::FsRead)?;
            crate::fs::rebuild_index()
                .map(|indexed| serde_json::json!({ "indexed": indexed }))
                .map_err(|e| e.to_string())
        }
        "fs/search" => {
            require(uid, method, Capability::FsRead)?;
            let query = params
                .get("query")
                .and_then(|v| v.as_str())
                .ok_or_else(|| "Missing query parameter".to_string())?;
            let limit = params.get("limit").and_then(|v| v.as_u64()).unwrap_or(10) as usize;
            crate::fs::search_files(query, limit)
                .and_then(|items| serde_json::to_value(items).map_err(Into::into))
                .map_err(|e| e.to_string())
        }
        "fs/list" => {
            require(uid, method, Capability::FsRead)?;
            let sub_path = params.get("path").and_then(|v| v.as_str()).unwrap_or("");
            crate::fs::list_files(sub_path)
                .and_then(|items| serde_json::to_value(items).map_err(Into::into))
                .map_err(|e| e.to_string())
        }
        "fs/read" => {
            require(uid, method, Capability::FsRead)?;
            let path = params
                .get("path")
                .and_then(|v| v.as_str())
                .ok_or_else(|| "Missing path parameter".to_string())?;
            crate::fs::read_file_content(path)
                .and_then(|content| serde_json::to_value(content).map_err(Into::into))
                .map_err(|e| e.to_string())
        }
        "fs/write" => {
            require(uid, method, Capability::FsWrite)?;
            let path = params
                .get("path")
                .and_then(|v| v.as_str())
                .ok_or_else(|| "Missing path parameter".to_string())?;
            let content = params
                .get("content")
                .and_then(|v| v.as_str())
                .ok_or_else(|| "Missing content parameter".to_string())?;
            crate::fs::write_file_content(path, content)
                .map(|_| serde_json::Value::Null)
                .map_err(|e| e.to_string())
        }
        "process/list" => {
            require(uid, method, Capability::ProcessList)?;
            crate::process::get_running_processes()
                .and_then(|list| serde_json::to_value(list).map_err(Into::into))
                .map_err(|e| e.to_string())
        }
        "process/kill" => {
            require(uid, method, Capability::ProcessKill)?;
            let pid = params
                .get("pid")
                .and_then(|v| v.as_i64())
                .ok_or_else(|| "Missing pid parameter".to_string())?;
            let sig = params.get("signal").and_then(|v| v.as_i64());
            crate::process::kill_process(pid as i32, sig.map(|s| s as i32))
                .map(|_| serde_json::Value::Null)
                .map_err(|e| e.to_string())
        }
        "system/control" => {
            require(uid, method, Capability::SystemControl)?;
            let action = params
                .get("action")
                .and_then(|v| v.as_str())
                .ok_or_else(|| "Missing action parameter".to_string())?;
            let value = params
                .get("value")
                .and_then(|v| v.as_u64())
                .ok_or_else(|| "Missing value parameter".to_string())?;
            match action {
                "volume" => crate::display::set_volume(value as u32),
                "brightness" => crate::display::set_brightness(value as u32),
                other => Err(anyhow!("Unknown control action: {}", other)),
            }
            .map(|_| serde_json::Value::Null)
            .map_err(|e| e.to_string())
        }
        "ai/query" => {
            require(uid, method, Capability::StatsRead)?;
            let prompt = params
                .get("prompt")
                .and_then(|v| v.as_str())
                .ok_or_else(|| "Missing prompt parameter".to_string())?;
            crate::inference::query(prompt)
                .await
                .map(|resp| serde_json::json!({ "response": resp }))
                .map_err(|e| e.to_string())
        }
        "ai/chat" => {
            require(uid, method, Capability::StatsRead)?;
            let prompt = params
                .get("prompt")
                .and_then(|v| v.as_str())
                .ok_or_else(|| "Missing prompt parameter".to_string())?;
            let session = params
                .get("session")
                .and_then(|v| v.as_str())
                .unwrap_or("default");
            crate::inference::chat(prompt, session)
                .await
                .map(|resp| serde_json::json!({ "response": resp, "session": session }))
                .map_err(|e| e.to_string())
        }
        "ai/clear-session" => {
            require(uid, method, Capability::StatsRead)?;
            let session = params
                .get("session")
                .and_then(|v| v.as_str())
                .unwrap_or("default");
            crate::inference::clear_session(session).await;
            Ok(serde_json::json!({ "cleared": true, "session": session }))
        }

        // ── Agent: App Control via AT-SPI2 ─────────────────────────────────

        "app/list-windows" => {
            require(uid, method, Capability::StatsRead)?;
            tokio::task::spawn_blocking(|| crate::atspi::list_accessible_apps())
                .await
                .map_err(|e| e.to_string())?
                .map(|apps| serde_json::json!({ "windows": apps }))
                .map_err(|e| e.to_string())
        }
        "app/find-elements" => {
            require(uid, method, Capability::StatsRead)?;
            let app_name = params.get("app").and_then(|v| v.as_str()).unwrap_or("");
            let role = params.get("role").and_then(|v| v.as_str());
            let name = params.get("name").and_then(|v| v.as_str());
            let app_owned = app_name.to_string();
            let role_owned = role.map(|s| s.to_string());
            let name_owned = name.map(|s| s.to_string());
            tokio::task::spawn_blocking(move || {
                crate::atspi::find_elements(
                    &app_owned,
                    role_owned.as_deref(),
                    name_owned.as_deref(),
                )
            })
            .await
            .map_err(|e| e.to_string())?
            .map(|els| serde_json::json!({ "elements": els }))
            .map_err(|e| e.to_string())
        }
        "app/click" => {
            require(uid, method, Capability::FsWrite)?;
            let app_name = params.get("app").and_then(|v| v.as_str()).unwrap_or("").to_string();
            let path: Vec<i32> = params.get("path")
                .and_then(|v| v.as_array())
                .map(|arr| arr.iter().filter_map(|v| v.as_i64().map(|n| n as i32)).collect())
                .unwrap_or_default();
            tokio::task::spawn_blocking(move || crate::atspi::click_element(&app_name, &path))
                .await
                .map_err(|e| e.to_string())?
                .map(|_| serde_json::json!({ "clicked": true }))
                .map_err(|e| e.to_string())
        }
        "app/type" => {
            require(uid, method, Capability::FsWrite)?;
            let app_name = params.get("app").and_then(|v| v.as_str()).unwrap_or("").to_string();
            let path: Vec<i32> = params.get("path")
                .and_then(|v| v.as_array())
                .map(|arr| arr.iter().filter_map(|v| v.as_i64().map(|n| n as i32)).collect())
                .unwrap_or_default();
            let text = params.get("text").and_then(|v| v.as_str()).unwrap_or("").to_string();
            tokio::task::spawn_blocking(move || crate::atspi::type_text(&app_name, &path, &text))
                .await
                .map_err(|e| e.to_string())?
                .map(|_| serde_json::json!({ "typed": true }))
                .map_err(|e| e.to_string())
        }
        "app/fill-field" => {
            require(uid, method, Capability::FsWrite)?;
            let app_name = params.get("app").and_then(|v| v.as_str()).unwrap_or("").to_string();
            let label = params.get("label").and_then(|v| v.as_str()).unwrap_or("").to_string();
            let value = params.get("value").and_then(|v| v.as_str()).unwrap_or("").to_string();
            let label_clone = label.clone();
            let value_clone = value.clone();
            tokio::task::spawn_blocking(move || crate::atspi::fill_form_field(&app_name, &label, &value))
                .await
                .map_err(|e| e.to_string())?
                .map(|_| serde_json::json!({ "filled": true, "label": label_clone, "value": value_clone }))
                .map_err(|e| e.to_string())
        }
        "app/launch" => {
            require(uid, method, Capability::FsWrite)?;
            let app_name = params.get("app").and_then(|v| v.as_str()).unwrap_or("").to_string();
            crate::uinput::launch_app(&app_name)
                .await
                .map(|pid| serde_json::json!({ "launched": true, "pid": pid }))
                .map_err(|e| e.to_string())
        }
        "app/shortcut" => {
            require(uid, method, Capability::StatsRead)?;
            let keys: Vec<String> = params.get("keys")
                .and_then(|v| v.as_array())
                .map(|arr| arr.iter().filter_map(|v| v.as_str().map(|s| s.to_string())).collect())
                .unwrap_or_default();
            let key_refs: Vec<&str> = keys.iter().map(|s| s.as_str()).collect();
            crate::uinput::keyboard_shortcut(&key_refs)
                .await
                .map(|_| serde_json::json!({ "sent": true, "keys": keys }))
                .map_err(|e| e.to_string())
        }
        "app/save" => {
            require(uid, method, Capability::StatsRead)?;
            crate::uinput::save_document()
                .await
                .map(|_| serde_json::json!({ "saved": true }))
                .map_err(|e| e.to_string())
        }

        // ── Agent: Raw Input Injection ─────────────────────────────────────

        "input/type" => {
            require(uid, method, Capability::FsWrite)?;
            let text = params.get("text").and_then(|v| v.as_str()).unwrap_or("").to_string();
            crate::uinput::type_string(&text)
                .await
                .map(|_| serde_json::json!({ "typed": text.len() }))
                .map_err(|e| e.to_string())
        }
        "input/click" => {
            require(uid, method, Capability::FsWrite)?;
            let x = params.get("x").and_then(|v| v.as_i64()).unwrap_or(0) as i32;
            let y = params.get("y").and_then(|v| v.as_i64()).unwrap_or(0) as i32;
            crate::uinput::mouse_click(x, y)
                .await
                .map(|_| serde_json::json!({ "clicked": true, "x": x, "y": y }))
                .map_err(|e| e.to_string())
        }
        "input/key" => {
            require(uid, method, Capability::StatsRead)?;
            let key = params.get("key").and_then(|v| v.as_str()).unwrap_or("").to_string();
            crate::uinput::keyboard_shortcut(&[key.as_str()])
                .await
                .map(|_| serde_json::json!({ "sent": true }))
                .map_err(|e| e.to_string())
        }

        // ── Screenshot ─────────────────────────────────────────────────────

        "screenshot/take" => {
            require(uid, method, Capability::StatsRead)?;
            let path = params
                .get("path")
                .and_then(|v| v.as_str())
                .unwrap_or("/tmp/aios-screenshot.png")
                .to_string();
            tokio::task::spawn_blocking(move || crate::atspi::take_screenshot(&path))
                .await
                .map_err(|e| e.to_string())?
                .map(|saved_path| serde_json::json!({ "path": saved_path }))
                .map_err(|e| e.to_string())
        }

        other => Err(format!("Method not found: {}", other)),
    }
}

fn require(uid: u32, method: &str, capability: Capability) -> std::result::Result<(), String> {
    match acl::authorize(uid, method, capability) {
        Decision::Allow => Ok(()),
        Decision::Deny => Err(acl::denied_message(capability)),
    }
}

#[cfg(unix)]
fn socket_path() -> PathBuf {
    std::env::var("AISD_SOCKET")
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from("/run/aios/aisd.sock"))
}

fn current_uid() -> u32 {
    #[cfg(unix)]
    {
        nix::unistd::Uid::current().as_raw()
    }

    #[cfg(not(unix))]
    {
        0
    }
}
