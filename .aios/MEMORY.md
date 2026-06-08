# AIOS Memory
> This file is the project's single source of truth.
> Agents: read this before making any architectural decision.
> Update this file when a decision is made or a milestone is completed.
> Format: add entries with date. Never delete old entries — strike through if reversed.

---

## PROJECT IDENTITY

| Field | Value |
|---|---|
| Project Name | AIOS — AI-Native Operating System |
| Version | 0.1.0-dev |
| Current Phase | Phase 0 — Foundation |
| Base Distro | Arch Linux (archiso) |
| Target Arch | x86_64 only (v1.0). ARM64 = v2.0 roadmap. |
| License | Open-Core: MIT for core OS, commercial license for enterprise features (SSO, MDM, audit, SLA) |
| Repo Root | `/` (this file is at `/.aios/MEMORY.md`) |

---

## LOCKED ARCHITECTURAL DECISIONS
> These are final. Do not re-debate unless a decision is explicitly reversed below.

### OS Base
- **Decision:** Arch Linux base via `archiso`
- **Why:** Rolling release = latest kernel, minimal bloat, AUR = massive ecosystem, `mkinitcpio` is flexible for custom initramfs
- **Not chosen:** Ubuntu (too much Canonical control, snap), Fedora (too opinionated), Gentoo (too slow to iterate)

### Init System
- **Decision:** systemd
- **Why:** D-Bus integration, socket activation, cgroups v2 native, journald, networkd — we need all of this for aisd
- **Not chosen:** OpenRC (no D-Bus native), runit (too minimal)

### Display Server
- **Decision:** Wayland only. No X11 support in v1.0.
- **Why:** Security model, no root requirement, proper GPU abstraction, future-proof
- **Compositor base:** wlroots library
- **Not chosen:** X11/Xorg (dead end), Mir (Canonical lock-in)

### AI Daemon Language
- **Decision:** Rust for `aisd` core
- **Why:** Memory safety critical at UID 0, async runtime (tokio), excellent Linux syscall crates
- **AI orchestration layer:** Python 3.11+ (for ML library access)
- **IPC between Rust core and Python:** Unix socket + msgpack

### LLM Inference Backend
- **Decision:** llama.cpp (GGUF format)
- **Why:** Runs on CPU+GPU, quantized (Q4_K_M default), no Python dependency for inference
- **Model selection at install time** via Calamares module based on detected VRAM
- **Default model:** Mistral-7B-Instruct Q4_K_M (fits in 8GB RAM)
- **Code model:** Qwen2.5-Coder-7B (loaded on demand, not always-on)

### Vision Model (Screen Understanding)
- **Decision:** MiniCPM-V 2.6 via ONNX Runtime
- **Capture method:** Wayland compositor screenshot protocol (not X11 scrot)
- **Frequency:** 4 fps passive, 30 fps when AI action is in progress

### Package Manager
- **Decision:** pacman + custom AIOS overlay repo
- **App sandboxing:** Flatpak for third-party apps
- **Not chosen:** snap (Canonical), AppImage only (no updates)

### Installer
- **Decision:** Calamares with custom AIOS modules
- **Why:** GTK/Qt agnostic, Python-extensible, used by Manjaro/EndeavourOS (proven)
- **Custom modules needed:** AI model download/selection, aisd configuration, disk encryption setup

### Filesystem
- **Decision:** ext4 default, btrfs optional (with subvolume snapshots)
- **Encryption:** LUKS2 + Argon2id, TPM2 auto-unlock optional
- **AI index store:** SQLite + sqlite-vec for embeddings (lives at `~/.local/share/aios/index.db`)

### Dual Desktop Architecture
- **Decision:** Two separate Wayland sessions under one compositor
- **Human session:** User's normal desktop (seat0, human input)
- **AI session:** Isolated Wayland session for AI agent actions (virtual seat, synthetic input via uinput)
- **Compositor:** Single `aios-comp` process manages both sessions

### Business Model
- **Decision:** Open-Core
- **Core (free, MIT):** Base OS, aisd, compositor, shell, all fundamental AI features
- **Enterprise (paid):** SSO/LDAP integration, group policy (JSON), MDM, SLA support contracts, audit compliance exports
- **Why:** Proven Linux model (Red Hat, GitLab, HashiCorp). Donations alone cannot sustain an OS company. Community first → enterprise second.
- **Not chosen:** Pure donations (unsustainable), per-seat (kills adoption), subscription only (no community flywheel)

### Low-VRAM Fallback (<4GB)
- **Decision:** User chooses at install time — local small model OR cloud LLM
- **Local path:** Phi-3 Mini / TinyLlama (runs on CPU, no GPU required, fully offline)
- **Cloud path:** Optional, requires explicit user opt-in, prominent privacy warning shown during install
- **Why:** Minimum spec enforcement loses users unnecessarily. Cloud fallback is privacy-hostile by default — must be informed consent.
- **Privacy rule:** Cloud fallback NEVER enabled by default. User must explicitly activate it.

### ARM64 Strategy
- **Decision:** ARM64 is v2.0 scope. v1.0 = x86_64 only.
- **Why:** Asahi Linux maintenance is a separate full-time team effort. Raspberry Pi is not AIOS primary user. Focus matters.
- **Not chosen:** RPi5 only (too niche), Asahi (unsustainable to maintain)

### AI Desktop Default Visibility
- **Decision:** Default hidden. Triggered via hotkey (to be defined, e.g. Super+A)
- **First boot:** Tooltip shown once explaining AI desktop exists and how to access it
- **Why:** Mainstream users first. Don't overwhelm on first login. macOS Spaces/Mission Control approach — discoverable, not forced.
- **Not chosen:** Default PiP (distracting during work), default fullscreen AI (terrifying for new users)

### App Store Architecture
- **Decision:** Self-hosted AIOS repo (primary) + Flathub as secondary source
- **Self-hosted:** Only AIOS-certified, AI-native apps — curated, tested, verified
- **Flathub:** Enabled as opt-in secondary source for general apps (2000+ already available)
- **Why:** Curation control is more important than raw app count. Flathub handles the long tail. Self-hosted handles quality control.
- **Not chosen:** Flathub only (no curation), AUR only (no sandboxing)

### Development Environment
- **Decision:** Dedicated Linux machine for all kernel/ISO/Wayland development
- **Why:** WSL2 cannot run Wayland compositors, cannot build bootable ISOs properly, kernel dev is painful. One-time setup, permanent smoothness.
- **Version Control:** GitHub private repo during Phase 0-5. Public release when v0.1 ISO is bootable.
- **Why public later:** Incomplete public repo disappoints early community. Ship something real first.

---

## PROJECT STRUCTURE

```
/
├── .aios/
│   ├── RULES.md          ← Agent behaviour rules (read first)
│   ├── MEMORY.md         ← This file
│   └── ROADMAP.md        ← Phase-by-phase build plan
│
├── aisd/                 ← AI System Daemon (Rust)
│   ├── Cargo.toml
│   ├── src/
│   │   ├── main.rs       ← Entry point, tokio runtime
│   │   ├── fs/           ← File system watcher + indexer
│   │   ├── ipc/          ← Unix socket server (msgpack)
│   │   ├── process/      ← Process control (spawn, kill, monitor)
│   │   ├── display/      ← Wayland compositor IPC
│   │   ├── browser/      ← CDP bridge to Chromium/Firefox
│   │   ├── acl/          ← Capability ACL engine
│   │   └── inference/    ← llama.cpp FFI bindings
│   └── systemd/
│       └── aisd.service
│
├── compositor/           ← aios-comp (C + wlroots)
│   ├── meson.build
│   ├── src/
│   │   ├── main.c
│   │   ├── server.c
│   │   ├── ai_session.c  ← AI desktop session management
│   │   └── input.c       ← Synthetic input routing
│   └── protocols/        ← Custom Wayland protocol extensions
│
├── desktop/              ← AIOS Shell (Python + GTK4 → Rust production)
│   ├── shell/            ← Main desktop shell
│   ├── launcher/         ← App launcher with NL search
│   ├── panel/            ← System bar (Waybar config + custom widgets)
│   └── settings/         ← Settings application
│
├── installer/            ← Calamares modules
│   ├── modules/
│   │   ├── aios-ai-setup/
│   │   ├── aios-disk/
│   │   └── aios-user/
│   └── branding/
│
├── iso/                  ← archiso build config
│   ├── profiledef.sh
│   ├── packages.x86_64
│   ├── airootfs/
│   └── efiboot/
│
├── models/               ← Model download scripts + configs
│   └── model-select.py
│
└── docs/
    └── PRD_v1.0.docx     ← Product Requirements Document
```

---

## COMPLETED WORK

| Date | Component | What was done |
|---|---|---|
| 2025-06 | PRD | Full Product Requirements Document created (PRD_v1.0.docx) |
| 2025-06 | .aios/ | Agent rules, memory, roadmap files created |
| 2026-06 | decisions | All open questions resolved: licensing (Open-Core), low-VRAM (install-time choice), ARM64 (v2.0), AI desktop (hidden default), app store (self-hosted+Flathub), dev env (dedicated Linux machine), VCS (GitHub private → public at v0.1) |
| 2026-06 | Phase 0 scaffolding | Full project structure created: iso/ (profiledef.sh, packages.x86_64, grub.cfg, systemd-boot, sway config, Plymouth theme, customize hook), aisd/ (Cargo.toml, main.rs, all module skeletons, systemd unit), compositor/ (meson.build, main.c, server.h, all src placeholders), models/model-select.py, Makefile, .github/workflows/build-iso.yml, README.md, LICENSE, .gitignore |
| 2026-06 | Phase 0 ISO Build | Successfully setup Arch WSL build environment, resolved package and configuration mismatches, and compiled the final bootable ISO (1.84 GB) |
| 2026-06 | desktop-shell | Integrated shared VFS, clipboard (copy/cut/paste), key shortcuts, search and properties update in files.js |
| 2026-06 | foundation gap pass | Matched AIOS PRD/DE PRD foundation requirements against the repo; added AIOS Plymouth alias path, mkinitcpio.conf, fontconfig, aisd ISO staging/service wiring, systemd notify/watchdog handling, and a foundation gap audit. |
| 2026-06 | aisd IPC/security foundation | Implemented length-prefixed MessagePack Unix socket IPC at `/run/aios/aisd.sock`, kept WebSocket compatibility mode, added peer UID detection, basic capability ACL decisions, and JSONL audit logging for daemon actions. |
| 2026-06 | installer & security hardening | Developed custom Calamares modules (`felbicos-ai-setup`, `felbicos-disk`), custom systemd firstboot model downloader (`aios-firstboot.service` & `firstboot-download.sh`), target services config, staged files in Makefile & build-wsl.sh, and verified builds/syntax. |
| 2026-06 | compositor implementation | Created wlroots 0.18-based custom compositor (`aios-comp`), implementing dual-session isolation (human vs virtual AI seat via uinput), custom protocol server (`aios-compositor-v1`), and integrated staging rules. |
| 2026-06 | LLM inference implementation | Developed the tokio process-wrapped `llama-server` subprocess manager inside `aisd`, parsed hardware selected GGUFs, wired `"ai/query"` MessagePack IPC socket methods, and expanded the `felbicos-ai ask` CLI. |

---

## IN PROGRESS

| Component | Status | Blocker |
|---|---|---|
| archiso base config | ✅ Done — iso/ fully rebranded and corrected | — |
| aisd skeleton | ✅ Done — Cargo.toml + module structure created | — |
| aios-comp skeleton | ✅ Done — meson.build + src files created | — |
| Plymouth FELBIC OS theme | ✅ Done — logo + pulse animation script configured | — |
| ISO first boot test | ✅ Done — WSL build complete, ISO generated and copied to host | — |
| Calamares integration | ✅ Done — EndeavourOS repo added, Calamares installed in ISO | — |

---

## OPEN QUESTIONS
> Unresolved. Agent must NOT make unilateral decisions on these — flag for human review.

- [x] ~~Enterprise licensing model~~ → Open-Core (2026-06)
- [x] ~~Default LLM for low-VRAM systems~~ → User chooses at install time, cloud = explicit opt-in with privacy warning (2026-06)
- [x] ~~ARM64 target~~ → v2.0 only, x86_64 for v1.0 (2026-06)
- [x] ~~AI Desktop visibility~~ → Default hidden, hotkey triggered, first-boot tooltip (2026-06)
- [x] ~~App Store backend~~ → Self-hosted primary (AIOS-certified) + Flathub secondary opt-in (2026-06)

---

## REVERSED DECISIONS
> Things we tried and abandoned. Don't suggest these again.

*(none yet)*

---

## AGENT UPDATE INSTRUCTIONS

When you complete a task, add a row to COMPLETED WORK:
```
| YYYY-MM | component | brief description |
```

When a new architectural decision is made, add it to LOCKED ARCHITECTURAL DECISIONS.

When you discover a blocker or open question, add it to OPEN QUESTIONS.

Do not rewrite this file. Only append.
