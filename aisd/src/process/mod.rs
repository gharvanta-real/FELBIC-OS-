use std::fs;
use std::path::Path;
use serde::Serialize;
use anyhow::{Result, anyhow};
use std::sync::atomic::{AtomicU64, Ordering};

static LAST_ACTIVE: AtomicU64 = AtomicU64::new(0);
static LAST_TOTAL: AtomicU64 = AtomicU64::new(0);

#[derive(Serialize, Clone, Debug)]
pub struct SystemStats {
    pub cpu_load_percent: f64,
    pub memory_used_bytes: u64,
    pub memory_total_bytes: u64,
}

#[derive(Serialize, Clone, Debug)]
pub struct ProcessInfo {
    pub pid: i32,
    pub name: String,
    pub cmdline: String,
    pub state: String,
    pub ppid: i32,
    pub rss_bytes: u64,
}

fn read_cpu_ticks() -> Option<(u64, u64)> {
    let content = fs::read_to_string("/proc/stat").ok()?;
    let first_line = content.lines().next()?;
    if !first_line.starts_with("cpu ") {
        return None;
    }
    let parts: Vec<u64> = first_line
        .split_whitespace()
        .skip(1)
        .filter_map(|s| s.parse::<u64>().ok())
        .collect();
    if parts.len() < 7 {
        return None;
    }
    let user = parts[0];
    let nice = parts[1];
    let system = parts[2];
    let idle = parts[3];
    let iowait = parts[4];
    let irq = parts[5];
    let softirq = parts[6];
    let steal = parts.get(7).copied().unwrap_or(0);

    let idle_total = idle + iowait;
    let active = user + nice + system + irq + softirq + steal;
    let total = active + idle_total;
    Some((active, total))
}

pub fn get_cpu_load() -> f64 {
    if let Some((active, total)) = read_cpu_ticks() {
        let prev_active = LAST_ACTIVE.swap(active, Ordering::Relaxed);
        let prev_total = LAST_TOTAL.swap(total, Ordering::Relaxed);
        
        if prev_total == 0 || total <= prev_total {
            0.0
        } else {
            let diff_active = active.saturating_sub(prev_active);
            let diff_total = total.saturating_sub(prev_total);
            if diff_total == 0 {
                0.0
            } else {
                let load = (diff_active as f64 / diff_total as f64) * 100.0;
                load.clamp(0.0, 100.0)
            }
        }
    } else {
        // Fallback for non-Linux or if /proc/stat can't be read: mock load
        15.4
    }
}

pub fn get_system_stats() -> SystemStats {
    let cpu_load = get_cpu_load();
    
    // Read mem info
    let mut mem_used = 4 * 1024 * 1024 * 1024; // Mock defaults (4GB used of 16GB)
    let mut mem_total = 16 * 1024 * 1024 * 1024;
    
    if let Ok(content) = fs::read_to_string("/proc/meminfo") {
        let mut total_kb = None;
        let mut available_kb = None;
        for line in content.lines() {
            if line.starts_with("MemTotal:") {
                total_kb = line.split_whitespace().nth(1).and_then(|s| s.parse::<u64>().ok());
            } else if line.starts_with("MemAvailable:") {
                available_kb = line.split_whitespace().nth(1).and_then(|s| s.parse::<u64>().ok());
            }
        }
        if let (Some(total), Some(avail)) = (total_kb, available_kb) {
            mem_total = total * 1024;
            mem_used = total.saturating_sub(avail) * 1024;
        }
    }
    
    SystemStats {
        cpu_load_percent: cpu_load,
        memory_used_bytes: mem_used,
        memory_total_bytes: mem_total,
    }
}

pub fn get_running_processes() -> Result<Vec<ProcessInfo>> {
    let mut processes = Vec::new();
    let proc_dir = Path::new("/proc");
    
    if !proc_dir.exists() {
        // Return mock process list on non-Linux systems
        return Ok(vec![
            ProcessInfo {
                pid: 1,
                name: "systemd".to_string(),
                cmdline: "/sbin/init".to_string(),
                state: "S".to_string(),
                ppid: 0,
                rss_bytes: 5 * 1024 * 1024,
            },
            ProcessInfo {
                pid: 1024,
                name: "aisd".to_string(),
                cmdline: "/usr/bin/aisd".to_string(),
                state: "R".to_string(),
                ppid: 1,
                rss_bytes: 22 * 1024 * 1024,
            }
        ]);
    }

    let entries = fs::read_dir(proc_dir)?;
    for entry in entries {
        let entry = entry?;
        let file_name = entry.file_name();
        let name_str = file_name.to_string_lossy();
        
        if name_str.chars().all(|c| c.is_ascii_digit()) {
            if let Ok(pid) = name_str.parse::<i32>() {
                if let Ok(proc_info) = parse_proc_entry(pid) {
                    processes.push(proc_info);
                }
            }
        }
    }
    
    Ok(processes)
}

fn parse_proc_entry(pid: i32) -> Result<ProcessInfo> {
    let path = format!("/proc/{}", pid);
    
    let comm = fs::read_to_string(format!("{}/comm", path))
        .map(|s| s.trim().to_string())
        .unwrap_or_else(|_| "unknown".to_string());
        
    let cmdline = fs::read(format!("{}/cmdline", path))
        .map(|bytes| {
            if bytes.is_empty() {
                comm.clone()
            } else {
                let mut s = String::from_utf8_lossy(&bytes).into_owned();
                s = s.replace('\0', " ");
                s.trim().to_string()
            }
        })
        .unwrap_or_else(|_| comm.clone());

    let status_content = fs::read_to_string(format!("{}/status", path)).unwrap_or_default();
    let mut ppid = 0;
    let mut state = "unknown".to_string();
    let mut rss_bytes = 0;
    
    for line in status_content.lines() {
        if line.starts_with("State:") {
            state = line.split_whitespace().nth(1).unwrap_or("unknown").to_string();
        } else if line.starts_with("PPid:") {
            ppid = line.split_whitespace().nth(1).and_then(|s| s.parse::<i32>().ok()).unwrap_or(0);
        } else if line.starts_with("VmRSS:") {
            let rss_kb = line.split_whitespace().nth(1).and_then(|s| s.parse::<u64>().ok()).unwrap_or(0);
            rss_bytes = rss_kb * 1024;
        }
    }

    Ok(ProcessInfo {
        pid,
        name: comm,
        cmdline,
        state,
        ppid,
        rss_bytes,
    })
}

#[cfg(unix)]
pub fn kill_process(pid: i32, sig: Option<i32>) -> Result<()> {
    use nix::sys::signal::{kill as nix_kill, Signal};
    use nix::unistd::Pid;
    use std::convert::TryFrom;

    let sig_num = sig.unwrap_or(15); // Default to SIGTERM
    let signal = match sig_num {
        1 => Signal::SIGHUP,
        2 => Signal::SIGINT,
        3 => Signal::SIGQUIT,
        9 => Signal::SIGKILL,
        15 => Signal::SIGTERM,
        other => Signal::try_from(other).unwrap_or(Signal::SIGTERM),
    };
    
    nix_kill(Pid::from_raw(pid), signal)
        .map_err(|e| anyhow!("Failed to send signal {} to pid {}: {}", sig_num, pid, e))
}

#[cfg(not(unix))]
pub fn kill_process(pid: i32, sig: Option<i32>) -> Result<()> {
    tracing::info!("Mock kill_process called for pid: {}, sig: {:?}", pid, sig);
    Ok(())
}
