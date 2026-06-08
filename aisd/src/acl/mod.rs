use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Clone, Copy, Debug, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum Capability {
    StatsRead,
    FsRead,
    FsWrite,
    ProcessList,
    ProcessKill,
    SystemControl,
}

impl Capability {
    pub fn as_str(self) -> &'static str {
        match self {
            Capability::StatsRead => "stats_read",
            Capability::FsRead => "fs_read",
            Capability::FsWrite => "fs_write",
            Capability::ProcessList => "process_list",
            Capability::ProcessKill => "process_kill",
            Capability::SystemControl => "system_control",
        }
    }
}

#[derive(Clone, Copy, Debug, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum Decision {
    Allow,
    Deny,
}

#[derive(Serialize)]
struct AuditEntry<'a> {
    ts_unix_ms: u128,
    uid: u32,
    method: &'a str,
    capability: &'a str,
    decision: Decision,
    reason: &'a str,
}

pub fn authorize(uid: u32, method: &str, capability: Capability) -> Decision {
    let unsafe_override = std::env::var("AISD_ALLOW_UNSAFE")
        .map(|value| value == "1" || value.eq_ignore_ascii_case("true"))
        .unwrap_or(false);

    let policy_decision = load_policy_decision(capability);
    let decision = match policy_decision {
        Some(PolicyDecision::Allow) => Decision::Allow,
        Some(PolicyDecision::Deny) => Decision::Deny,
        Some(PolicyDecision::Ask) | None => match capability {
            Capability::StatsRead | Capability::FsRead | Capability::ProcessList => Decision::Allow,
            Capability::FsWrite | Capability::ProcessKill | Capability::SystemControl => {
                if uid == 0 || unsafe_override {
                    Decision::Allow
                } else {
                    Decision::Deny
                }
            }
        },
    };

    let reason = match decision {
        Decision::Allow => "policy_allow_or_root",
        Decision::Deny => "policy_deny_or_ask_without_prompt",
    };
    let _ = audit(uid, method, capability, decision, reason);

    decision
}

#[derive(Clone, Copy, Debug, Deserialize)]
#[serde(rename_all = "snake_case")]
enum PolicyDecision {
    Allow,
    Ask,
    Deny,
}

#[derive(Default, Deserialize)]
struct PolicyFile {
    #[serde(default)]
    capabilities: HashMap<String, PolicyDecision>,
}

fn load_policy_decision(capability: Capability) -> Option<PolicyDecision> {
    for path in policy_paths() {
        let Ok(text) = fs::read_to_string(path) else {
            continue;
        };
        let Ok(policy) = toml::from_str::<PolicyFile>(&text) else {
            continue;
        };
        if let Some(decision) = policy.capabilities.get(capability.as_str()) {
            return Some(*decision);
        }
    }

    None
}

fn policy_paths() -> Vec<PathBuf> {
    let mut paths = Vec::new();
    if let Ok(path) = std::env::var("AISD_POLICY") {
        paths.push(PathBuf::from(path));
    }
    if let Ok(home) = std::env::var("HOME") {
        paths.push(PathBuf::from(home).join(".aios/permissions.toml"));
    }
    paths.push(PathBuf::from("/etc/aios/policy.toml"));
    paths
}

pub fn audit(
    uid: u32,
    method: &str,
    capability: Capability,
    decision: Decision,
    reason: &str,
) -> Result<()> {
    let ts_unix_ms = SystemTime::now().duration_since(UNIX_EPOCH)?.as_millis();
    let entry = AuditEntry {
        ts_unix_ms,
        uid,
        method,
        capability: capability.as_str(),
        decision,
        reason,
    };

    let line = serde_json::to_string(&entry)?;
    let path = audit_path();
    if let Some(parent) = path.parent() {
        let _ = fs::create_dir_all(parent);
    }

    let mut file = OpenOptions::new().create(true).append(true).open(path)?;
    writeln!(file, "{line}")?;
    Ok(())
}

fn audit_path() -> PathBuf {
    std::env::var("AISD_AUDIT_LOG")
        .map(PathBuf::from)
        .unwrap_or_else(|_| {
            let primary = PathBuf::from("/var/log/aios/audit.jsonl");
            if primary.parent().map(|p| p.exists()).unwrap_or(false) {
                primary
            } else {
                std::env::current_dir()
                    .unwrap_or_else(|_| PathBuf::from("."))
                    .join("aios-audit.jsonl")
            }
        })
}

pub fn denied_message(capability: Capability) -> String {
    format!(
        "ACL denied capability '{}'. Run as root or set AISD_ALLOW_UNSAFE=1 for development.",
        capability.as_str()
    )
}
