# Phase 2 — AI System Daemon Core (aisd v0.1)
> **Status:** ⏳ Pending
> **Depends on:** [Phase 1 — Installer](./PHASE_1_INSTALLER.md) ✅ complete
> **Next Phase:** [Phase 3 — LLM Integration](./PHASE_3_LLM.md)

---

## Goal
`aisd` — FELBIC OS ka brain — ek Rust daemon banana jo:
- Systemd service ki tarah silently background mein chale
- File system ko index aur samjhe
- IPC (Unix socket) se commands receive kare
- Har AI action ko audit log mein record kare
- Permission system ke through security enforce kare

---

## Tech Stack
- **Language:** Rust (memory safety, async, zero-cost abstractions)
- **Async runtime:** Tokio
- **IPC Protocol:** Unix socket + MessagePack (msgpack)
- **Database:** SQLite via `rusqlite`
- **Embeddings:** `sqlite-vec` extension
- **File watching:** `inotify` via `notify` crate
- **Logging:** `tracing` + `tracing-subscriber`

---

## Tasks

### Project Setup
- [ ] `aisd/Cargo.toml` — workspace dependencies define karna
- [ ] Tokio async runtime setup (`#[tokio::main]`)
- [ ] Structured logging setup (`tracing`)
- [ ] systemd `Type=notify` integration (`sd-notify` crate)
- [ ] `aisd.service` systemd unit complete karna
- [ ] Config file: `/etc/aisd/aisd.conf` (TOML format)

### IPC Server (Unix Socket)
- [ ] Unix socket server: `/run/aisd/aisd.sock`
- [ ] MessagePack protocol: request/response format define karna
- [ ] Authentication: UID-based (sirf allowed users connect kar sakein)
- [ ] Async connection handler (multiple clients simultaneously)
- [ ] Basic commands implement karna:
  - `ping` → `pong` (health check)
  - `version` → aisd version string
  - `capabilities` → supported features list

### File System Intelligence
- [ ] inotify watcher: `$HOME` recursively watch karna
- [ ] File metadata indexer → SQLite:
  - Path, name, size, mtime, mime-type
  - Last accessed, tags (auto-generated)
- [ ] Semantic embeddings:
  - `nomic-embed-text` model via ONNX Runtime
  - File names + content snippets embed karna
  - Embeddings store karna `sqlite-vec` mein
- [ ] Natural language file search IPC endpoint:
  - Input: `"mere last week ke PDF dhundo"`
  - Output: `[{path, name, relevance_score}]`

### Capability ACL Engine
- [ ] Policy file format: TOML (`/etc/aisd/policy.toml`)
- [ ] Default policy: restrictive (deny everything not explicitly allowed)
- [ ] ACL checks:
  - `fs.read` — file padhne ki permission
  - `fs.write` — file likhne ki permission
  - `process.spawn` — process start karna
  - `network.request` — network access
  - `display.capture` — screen capture
- [ ] Policy violation = log + deny + notify user

### Process Control
- [ ] Process list: running processes ka snapshot
- [ ] Process spawn: AI ke liye controlled process start karna
- [ ] Process kill: specific PID terminate karna
- [ ] Resource limits: CPU + memory limits on AI-spawned processes

### Audit Logger
- [ ] Audit log file: `/var/log/felbicos/audit.jsonl`
- [ ] Har AI action log karna:
  - Timestamp, action type, parameters, result, user, policy decision
- [ ] Log rotation: daily, max 30 days retain
- [ ] Audit query IPC endpoint: date range se logs fetch karna

### CLI Tool
- [ ] `felbicos-ai` CLI tool (Rust):
  - `felbicos-ai ask "sawal"` → aisd se answer
  - `felbicos-ai search "query"` → file search
  - `felbicos-ai status` → aisd health
  - `felbicos-ai audit` → recent actions
  - `felbicos-ai policy` → current permissions

---

## File Structure

```
aisd/
├── Cargo.toml
├── Cargo.lock
├── src/
│   ├── main.rs          ← Entry point, tokio runtime, signal handling
│   ├── config.rs        ← Config file parsing (TOML)
│   ├── ipc/
│   │   ├── mod.rs       ← IPC server setup
│   │   ├── server.rs    ← Unix socket listener
│   │   ├── protocol.rs  ← MessagePack message types
│   │   └── handler.rs   ← Command dispatch
│   ├── fs/
│   │   ├── mod.rs
│   │   ├── watcher.rs   ← inotify file system watcher
│   │   ├── indexer.rs   ← SQLite metadata indexer
│   │   └── search.rs    ← NL search + embedding query
│   ├── acl/
│   │   ├── mod.rs
│   │   ├── policy.rs    ← Policy file parser
│   │   └── engine.rs    ← Permission check runtime
│   ├── process/
│   │   ├── mod.rs
│   │   ├── control.rs   ← spawn/kill/list
│   │   └── limits.rs    ← cgroup resource limits
│   ├── audit/
│   │   ├── mod.rs
│   │   └── logger.rs    ← JSONL audit log writer
│   └── inference/       ← (Placeholder — Phase 3 mein fill hoga)
│       └── mod.rs
└── systemd/
    └── aisd.service
```

---

## Exit Criteria

| Test | Expected Result |
|------|----------------|
| `systemctl start aisd` | Active (running), no crash |
| `systemctl status aisd` | `active (running)`, sd-notify OK |
| `felbicos-ai status` | `aisd v0.1 running, 0 errors` |
| File search test | `felbicos-ai search "PDF files"` → correct results |
| ACL deny test | Policy deny network → network call blocked |
| Audit log | Every action logged to `/var/log/felbicos/audit.jsonl` |
| Memory usage at idle | < 150 MB RSS |
| Crash recovery | systemd restarts aisd within 5 seconds |
| Multiple clients | 5 simultaneous IPC connections handled |

---

## Next: Phase 3
`aisd` stable chale → [Phase 3 — LLM Integration](./PHASE_3_LLM.md) shuru karo.
