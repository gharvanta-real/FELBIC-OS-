//! aisd - AIOS AI System Daemon
//! Entry point for the privileged async daemon.

#![deny(unsafe_code)]

use anyhow::Result;
use std::process::Command;
use std::time::Duration;
use tracing::info;

mod acl;
mod browser;
mod display;
mod fs;
mod inference;
mod ipc;
mod process;

fn systemd_notify(state: &str) {
    if std::env::var_os("NOTIFY_SOCKET").is_none() {
        return;
    }

    let _ = Command::new("systemd-notify").arg(state).status();
}

fn spawn_watchdog_notifier() {
    if std::env::var_os("NOTIFY_SOCKET").is_none() {
        return;
    }

    tokio::spawn(async {
        let mut interval = tokio::time::interval(Duration::from_secs(15));
        loop {
            interval.tick().await;
            systemd_notify("WATCHDOG=1");
        }
    });
}

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt()
        .json()
        .with_env_filter(
            tracing_subscriber::EnvFilter::from_default_env()
                .add_directive("aisd=info".parse()?),
        )
        .init();

    info!(version = env!("CARGO_PKG_VERSION"), "aisd starting");

    ipc::start().await?;

    systemd_notify("--ready");
    spawn_watchdog_notifier();

    info!("aisd initialized - Phase 1 WebSocket daemon");

    wait_for_shutdown().await?;
    info!("aisd shutting down");

    // Cleanly terminate local LLM subprocess
    crate::inference::shutdown().await;

    Ok(())
}

#[cfg(unix)]
async fn wait_for_shutdown() -> Result<()> {
    use tokio::signal::unix::{signal, SignalKind};

    let mut terminate = signal(SignalKind::terminate())?;
    tokio::select! {
        _ = tokio::signal::ctrl_c() => {}
        _ = terminate.recv() => {}
    }

    Ok(())
}

#[cfg(not(unix))]
async fn wait_for_shutdown() -> Result<()> {
    tokio::signal::ctrl_c().await?;
    Ok(())
}
