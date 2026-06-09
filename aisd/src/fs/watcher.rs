// aisd - File System Watcher (Phase 1)
//
// Linux: inotify via the `inotify` crate, wrapped in a tokio blocking thread.
// Non-Linux: polling every 5 seconds (macOS dev, WSL).
//
// Either way, detects changes → rebuilds SQLite file index with 500ms debounce.

use anyhow::Result;
use std::path::PathBuf;
use std::time::Duration;
use tracing::{info, warn};

/// Spawns the filesystem watcher as a background tokio task.
pub fn spawn_watcher() {
    let root = super::get_fs_root();
    tokio::spawn(async move {
        if let Err(e) = run_watcher(root).await {
            warn!("File system watcher exited with error: {}", e);
        }
    });
}

// ──────────────────────────────────────────────────────────────────────────────
// Linux: inotify (blocking thread bridged via tokio channel)
// ──────────────────────────────────────────────────────────────────────────────

#[cfg(target_os = "linux")]
async fn run_watcher(root: PathBuf) -> Result<()> {
    use inotify::{Inotify, WatchMask};
    use tokio::sync::mpsc;

    info!(path = %root.display(), "inotify watcher starting");

    let (tx, mut rx) = mpsc::channel::<()>(16);
    let watch_root = root.clone();

    // inotify must run in a blocking thread — it's not async
    std::thread::spawn(move || {
        let mut inotify = match Inotify::init() {
            Ok(i) => i,
            Err(e) => { warn!("Failed to init inotify: {}", e); return; }
        };

        let mask = WatchMask::CREATE
            | WatchMask::DELETE
            | WatchMask::MODIFY
            | WatchMask::MOVED_FROM
            | WatchMask::MOVED_TO
            | WatchMask::CLOSE_WRITE;

        register_watches_recursive(&mut inotify, &watch_root, &mask, 0);
        info!("inotify watches registered on {:?}", watch_root);

        let mut buffer = [0u8; 8192];
        loop {
            match inotify.read_events_blocking(&mut buffer) {
                Ok(events) => {
                    let has_relevant = events.into_iter().count() > 0;
                    if has_relevant {
                        let _ = tx.blocking_send(());
                    }
                }
                Err(e) => {
                    warn!("inotify read error: {}", e);
                    std::thread::sleep(Duration::from_secs(1));
                }
            }
        }
    });

    // Debounce: wait 500ms after last event before rebuilding
    let mut debounce_pending = false;
    loop {
        if debounce_pending {
            tokio::select! {
                _ = tokio::time::sleep(Duration::from_millis(500)) => {
                    debounce_pending = false;
                    let root_clone = root.clone();
                    tokio::task::spawn_blocking(move || {
                        match super::indexer::rebuild_index(&root_clone) {
                            Ok(n) => info!("inotify: index rebuilt ({} files)", n),
                            Err(e) => warn!("inotify: index rebuild error: {}", e),
                        }
                    }).await.ok();
                }
                msg = rx.recv() => {
                    if msg.is_none() { break; }
                    // More events during debounce — reset timer
                    debounce_pending = true;
                }
            }
        } else {
            match rx.recv().await {
                Some(()) => { debounce_pending = true; }
                None => break,
            }
        }
    }

    Ok(())
}

#[cfg(target_os = "linux")]
fn register_watches_recursive(
    inotify: &mut inotify::Inotify,
    path: &std::path::Path,
    mask: &inotify::WatchMask,
    depth: usize,
) {
    const MAX_DEPTH: usize = 4;
    if depth > MAX_DEPTH { return; }

    if let Some(name) = path.file_name().and_then(|s| s.to_str()) {
        if depth > 0 && matches!(name, ".git" | "target" | "node_modules" | ".cache") {
            return;
        }
    }

    let _ = inotify.watches().add(path, *mask);

    if let Ok(entries) = std::fs::read_dir(path) {
        for entry in entries.flatten() {
            if entry.metadata().map(|m| m.is_dir()).unwrap_or(false) {
                register_watches_recursive(inotify, &entry.path(), mask, depth + 1);
            }
        }
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// Non-Linux: polling fallback (macOS dev machine, WSL, CI)
// ──────────────────────────────────────────────────────────────────────────────

#[cfg(not(target_os = "linux"))]
async fn run_watcher(root: PathBuf) -> Result<()> {
    use std::collections::HashMap;
    use std::time::SystemTime;

    info!(path = %root.display(), "Polling watcher starting (non-Linux, interval=5s)");

    let mut last_state: HashMap<String, (u64, SystemTime)> = HashMap::new();
    snapshot_dir(&root, &root, &mut last_state);

    loop {
        tokio::time::sleep(Duration::from_secs(5)).await;

        let mut current_state: HashMap<String, (u64, SystemTime)> = HashMap::new();
        snapshot_dir(&root, &root, &mut current_state);

        if current_state != last_state {
            info!("Polling watcher: change detected — rebuilding index...");
            let root_clone = root.clone();
            tokio::task::spawn_blocking(move || {
                match super::indexer::rebuild_index(&root_clone) {
                    Ok(n) => info!("Polling: index rebuilt ({} files)", n),
                    Err(e) => warn!("Polling: index rebuild error: {}", e),
                }
            }).await.ok();
            last_state = current_state;
        }
    }
}

#[cfg(not(target_os = "linux"))]
fn snapshot_dir(
    root: &std::path::Path,
    dir: &std::path::Path,
    state: &mut std::collections::HashMap<String, (u64, std::time::SystemTime)>,
) {
    let Ok(entries) = std::fs::read_dir(dir) else { return; };
    for entry in entries.flatten() {
        let path = entry.path();
        let name = path.file_name().and_then(|s| s.to_str()).unwrap_or("").to_string();
        if matches!(name.as_str(), ".git" | "target" | "node_modules") { continue; }
        if let Ok(meta) = entry.metadata() {
            let rel = path.strip_prefix(root).unwrap_or(&path).to_string_lossy().to_string();
            let mtime = meta.modified().unwrap_or(std::time::UNIX_EPOCH);
            state.insert(rel, (meta.len(), mtime));
            if meta.is_dir() {
                snapshot_dir(root, &path, state);
            }
        }
    }
}
