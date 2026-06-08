// aisd - LLM Inference Engine Subprocess Manager
use anyhow::{anyhow, Result};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::process::Stdio;
use std::time::Duration;
use tokio::process::{Child, Command};
use tracing::{info, warn, error};

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

use std::sync::OnceLock;
use tokio::sync::Mutex;

struct InferenceState {
    child: Option<Child>,
    config: DaemonConfig,
}

static STATE: OnceLock<Mutex<InferenceState>> = OnceLock::new();

fn get_state() -> &'static Mutex<InferenceState> {
    STATE.get_or_init(|| {
        Mutex::new(InferenceState {
            child: None,
            config: load_config(),
        })
    })
}

// Load Daemon TOML configuration
fn load_config() -> DaemonConfig {
    let path = PathBuf::from("/etc/aios/aisd.toml");
    if !path.exists() {
        warn!("Config file not found at {:?}. Using default TinyLlama settings.", path);
        return DaemonConfig::default();
    }

    match std::fs::read_to_string(&path) {
        Ok(text) => match toml::from_str::<DaemonConfig>(&text) {
            Ok(cfg) => {
                info!("Loaded LLM daemon config: model={}, path={}", cfg.model.name, cfg.model.path);
                cfg
            }
            Err(e) => {
                error!("Failed to parse config at {:?}: {}. Using default fallback.", path, e);
                DaemonConfig::default()
            }
        },
        Err(e) => {
            error!("Failed to read config file at {:?}: {}. Using default fallback.", path, e);
            DaemonConfig::default()
        }
    }
}

// Start llama-server subprocess if not already running
async fn ensure_server_running(state: &mut InferenceState) -> Result<()> {
    // Check if the llama-server is already up
    let client = reqwest::Client::builder()
        .timeout(Duration::from_millis(500))
        .build()?;
    
    if client.get("http://127.0.0.1:8081/health").send().await.is_ok() {
        return Ok(());
    }

    // Kill any orphan process if we have a handle
    if let Some(mut child) = state.child.take() {
        let _ = child.kill().await;
    }

    // Verify model weights exist
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

    // Build args list: llama-server -m <path> -c <ctx> -ngl <layers> --port 8081 --threads 4
    let mut cmd = Command::new("llama-server");
    cmd.arg("-m").arg(&state.config.model.path)
       .arg("-c").arg(state.config.model.context_size.to_string())
       .arg("-ngl").arg(state.config.model.vram_offload_layers.to_string())
       .arg("--port").arg("8081")
       .arg("-t").arg("4")
       .stdout(Stdio::piped())
       .stderr(Stdio::null());

    let child = cmd.spawn()
        .map_err(|e| anyhow!("Failed to spawn llama-server: {}", e))?;

    state.child = Some(child);

    // Wait for the server to bind and respond to health check (max 30 seconds)
    info!("Waiting for llama-server to become healthy...");
    let health_client = reqwest::Client::builder()
        .timeout(Duration::from_secs(1))
        .build()?;

    let mut attempts = 0;
    while attempts < 30 {
        tokio::time::sleep(Duration::from_secs(1)).await;
        if health_client.get("http://127.0.0.1:8081/health").send().await.is_ok() {
            info!("llama-server is healthy and ready for queries.");
            return Ok(());
        }
        attempts += 1;
    }

    error!("llama-server failed to become healthy within 30 seconds.");
    Err(anyhow!("llama-server startup timeout"))
}

#[derive(Serialize)]
struct CompletionRequest<'a> {
    prompt: &'a str,
    n_predict: u32,
    temperature: f32,
}

#[derive(Deserialize)]
struct CompletionResponse {
    content: String,
}

// Main external interface to submit natural language queries to the local model
pub async fn query(prompt: &str) -> Result<String> {
    let mut state = get_state().lock().await;
    ensure_server_running(&mut state).await?;

    let client = reqwest::Client::new();
    let req = CompletionRequest {
        prompt,
        n_predict: 256,
        temperature: 0.7,
    };

    info!(prompt = %prompt, "Sending query to llama-server");

    let res = client.post("http://127.0.0.1:8081/completion")
        .json(&req)
        .send()
        .await
        .map_err(|e| anyhow!("Failed to connect to llama-server completion endpoint: {}", e))?;

    if !res.status().is_success() {
        let code = res.status();
        return Err(anyhow!("llama-server completion returned status code: {}", code));
    }

    let response = res.json::<CompletionResponse>()
        .await
        .map_err(|e| anyhow!("Failed to parse completion JSON response: {}", e))?;

    info!("Query complete. Response received ({} characters)", response.content.len());
    Ok(response.content)
}

// Clean shutdown hook to kill the subprocess
pub async fn shutdown() {
    let mut state = get_state().lock().await;
    if let Some(mut child) = state.child.take() {
        info!("Terminating llama-server subprocess...");
        let _ = child.kill().await;
    }
}
