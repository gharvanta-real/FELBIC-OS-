# AIOS Roadmap
> Agents: use this to understand build order. Do not skip phases.
> Each phase must be complete before the next begins.
> "Complete" = defined exit criteria met. Not "mostly done."

---

## HOW TO USE THIS FILE

1. Find the current phase in `MEMORY.md → Current Phase`
2. Look at that phase below
3. Work only on tasks within that phase
4. When all exit criteria pass → update MEMORY.md, move to next phase

---

## PHASE 0 — FOUNDATION
**Goal:** A bootable Arch-based ISO with AIOS branding, nothing more.
**Duration estimate:** 6-8 weeks

### Tasks
- [ ] Set up archiso build environment (`archiso` package, `mkarchiso`)
- [ ] Create `profiledef.sh` with AIOS identity
- [ ] Define base `packages.x86_64` — minimal: kernel, systemd, wayland, wlroots, pipewire, networkmanager, calamares
- [ ] Configure GRUB2 + systemd-boot dual EFI support
- [ ] Custom splash screen / boot logo (Plymouth)
- [ ] Basic live environment: TTY login → startx → sway (temporary WM for testing)
- [ ] CI: automated ISO build on every commit (GitHub Actions / Gitea CI)
- [ ] ISO smoke test: boots in QEMU, gets to login

### Exit Criteria
- [ ] `dd if=aios-0.1.iso of=/dev/sdX` boots on real hardware
- [ ] UEFI Secure Boot passes (signed kernel)
- [ ] ISO boots in QEMU/KVM without errors
- [ ] Calamares installer starts from live desktop

---

## PHASE 1 — AI DAEMON CORE (aisd v0.1)
**Goal:** `aisd` runs as a systemd service with file system intelligence and IPC.
**Duration estimate:** 8-10 weeks
**Depends on:** Phase 0 complete

### Tasks
- [ ] `cargo new aisd` with workspace structure per MEMORY.md
- [ ] Tokio async runtime setup, structured logging (tracing + tracing-subscriber)
- [ ] Unix socket IPC server (msgpack protocol)
- [ ] File system watcher: inotify-based, watches `$HOME` recursively
- [ ] File indexer: metadata (name, path, mtime, size, mime) → SQLite
- [ ] Semantic embeddings: nomic-embed-text via ONNX → sqlite-vec storage
- [ ] Natural language file search endpoint over IPC
- [ ] Capability ACL engine: policy file (TOML) → runtime permission checks
- [ ] systemd unit file: `aisd.service` (Type=notify, WatchdogSec=30)
- [ ] Process control module: spawn, kill, list processes
- [ ] Audit logger: all AI actions → JSONL at `/var/log/aios/audit.jsonl`

### Exit Criteria
- [ ] `systemctl start aisd` succeeds, stays running
- [ ] File search via IPC returns correct results for test corpus
- [ ] ACL blocks unauthorized actions (tested with policy denying network)
- [ ] Audit log entries appear for every AI action
- [ ] Memory usage of aisd at idle: <150MB RSS

---

## PHASE 2 — LLM INTEGRATION
**Goal:** `aisd` can run local LLM inference and respond to natural language commands.
**Duration estimate:** 4-6 weeks
**Depends on:** Phase 1 complete

### Tasks
- [ ] llama.cpp FFI bindings in Rust (or subprocess approach — decide based on stability)
- [ ] Model loader: reads GGUF from `/usr/share/aios/models/`
- [ ] Inference endpoint over IPC: streaming token output via Unix socket
- [ ] Context manager: maintains conversation history per session (bounded, evicts oldest)
- [ ] Tool-use layer: LLM can call aisd internal functions (fs search, process list, etc.)
- [ ] Model selection at runtime based on available VRAM (detect via `/sys/class/drm`)
- [ ] Whisper ASR integration (whisper.cpp, microphone via PipeWire)
- [ ] Kokoro TTS integration (ONNX, output via PipeWire)

### Exit Criteria
- [ ] `aios-cli ask "list my PDF files from last week"` returns correct files
- [ ] LLM can invoke fs_search tool and return results in natural language
- [ ] Voice input → LLM → voice output pipeline works end-to-end
- [ ] Inference latency P95 < 3s for first token on CPU (8B Q4 model)

---

## PHASE 3 — COMPOSITOR + DUAL DESKTOP
**Goal:** `aios-comp` runs both Human and AI Wayland sessions.
**Duration estimate:** 10-12 weeks
**Depends on:** Phase 1 complete (Phase 2 parallel OK)

### Tasks
- [ ] `aios-comp` skeleton: wlroots-based compositor compiles and renders a window
- [ ] Human session: full Wayland desktop, seat0, real HID input
- [ ] AI session: isolated Wayland session, virtual seat, no direct HID
- [ ] Custom Wayland protocol extension: `aios-compositor-v1` (AI screen access, AI input injection)
- [ ] `aisd` ↔ compositor IPC: aisd can request screenshot, inject input events
- [ ] uinput-based synthetic input: keyboard + mouse injection for AI session
- [ ] AT-SPI2 bridge: aisd can query accessibility tree of any running app
- [ ] Screen capture to aisd: 4fps RGBA → MiniCPM-V vision model

### Exit Criteria
- [ ] Both sessions visible (human desktop + AI desktop in PiP)
- [ ] AI can click a button in a GTK app running in AI session via synthetic input
- [ ] Screen capture reaches aisd and vision model returns description
- [ ] No frame drops in human session while AI session is active

---

## PHASE 4 — AIOS SHELL (Desktop Environment)
**Goal:** A complete, polished desktop environment replacing the test WM.
**Duration estimate:** 8-10 weeks
**Depends on:** Phase 3 complete

### Tasks
- [ ] AIOS Shell GTK4 application: panels, launcher, window list
- [ ] Waybar integration with custom AIOS widgets (AI status, quick actions)
- [ ] App launcher with natural language: "open my project notes" → correct app + file
- [ ] File manager: Nautilus fork or custom GTK4, with AI sidebar
- [ ] System settings app: GTK4, covers network, display, AI permissions
- [ ] Wallpaper engine: static + animated (mpv backend)
- [ ] Lock screen: Hyprlock-based with voice unlock option
- [ ] Notification daemon: Mako-based with AI summary for clustered notifications
- [ ] Default theme: AIOS design system (dark + light, custom GTK theme)
- [ ] System fonts: Inter (UI) + JetBrains Mono (terminal)

### Exit Criteria
- [ ] Fresh install boots directly into AIOS Shell (no TTY intermediate)
- [ ] All above components functional on 1080p and 4K displays
- [ ] HiDPI scaling works correctly (1x, 1.5x, 2x)
- [ ] AI sidebar in file manager returns search results in <2s

---

## PHASE 5 — BROWSER AUTOMATION
**Goal:** AI can control a browser autonomously in the AI Desktop session.
**Duration estimate:** 4-6 weeks
**Depends on:** Phase 3 complete

### Tasks
- [ ] Chromium package in AIOS with remote debugging enabled for AI session
- [ ] CDP (Chrome DevTools Protocol) client in Rust within aisd
- [ ] Navigate, click, type, scroll, screenshot via CDP
- [ ] DOM query API: AI can ask "find the login button" → CDP selector
- [ ] Download management: AI can trigger and track downloads
- [ ] Session isolation: AI browser profile completely separate from user profile
- [ ] User permission gate: AI must request per-domain approval for browsing

### Exit Criteria
- [ ] AI can complete a multi-step form fill on a test site
- [ ] AI can search Google and return results to user
- [ ] User browser profile is provably isolated (different profile path, no cookie sharing)
- [ ] All browser actions logged in audit trail

---

## PHASE 6 — INSTALLER + ISO v0.9 BETA
**Goal:** Installable ISO that a real user can install on real hardware.
**Duration estimate:** 6-8 weeks
**Depends on:** Phases 0-4 complete

### Tasks
- [ ] Calamares: partition editor, locale, timezone, user creation
- [ ] Custom module: AI model selection (based on detected GPU/RAM)
- [ ] Custom module: LUKS2 setup with TPM2 enrollment
- [ ] Custom module: aisd initial configuration
- [ ] Post-install: first boot setup wizard
- [ ] Hardware compatibility testing: 20+ laptop/desktop models
- [ ] OTA update system: systemd-based A/B updates
- [ ] Beta ISO: public download, release notes

### Exit Criteria
- [ ] Install completes in <20 minutes on SSD
- [ ] Post-install system boots without manual intervention
- [ ] OTA update applies and rolls back successfully
- [ ] 90% success rate on hardware compatibility test matrix

---

## PHASE 7 — APP ECOSYSTEM + v1.0 GA
**Goal:** App store, developer SDK, 500+ apps, public release.
**Duration estimate:** 12-16 weeks
**Depends on:** Phase 6 complete

### Tasks
- [ ] AIOS App Store: GTK4 app, Flatpak backend, AIOS overlay repo
- [ ] Developer SDK: `aios-agent-sdk` (Python + Rust), docs, examples
- [ ] AI Agent API: third-party agents can register with aisd via SDK
- [ ] 500+ curated Flatpak apps verified on AIOS
- [ ] Enterprise features: LDAP/AD integration, group policy (JSON), MDM prep
- [ ] SOC 2 audit preparation
- [ ] v1.0 release: ISO, website, documentation, announcement

### Exit Criteria
- [ ] App store lists 500+ apps, installs work
- [ ] SDK: hello-world agent works in <30 minutes from docs
- [ ] 100K download milestone within 60 days of GA
- [ ] Zero P0 security vulnerabilities at launch

---

## WHAT AGENTS MUST NEVER DO

- Jump to Phase 4 work when Phase 1 is not done
- Create new phases or reorganize this roadmap without human approval
- Mark a task complete without the exit criteria passing
- Estimate timelines differently from what is written here (changes need human approval)
- Implement features from a later phase because they "seem related"

---

## PHASE TRANSITION CHECKLIST

Before marking any phase complete and moving on, verify:

1. All tasks in the phase have checkboxes ticked
2. All exit criteria pass (tested, not assumed)
3. MEMORY.md is updated: Current Phase incremented, Completed Work updated
4. Code is committed with proper commit message format
5. No known P0 bugs open against this phase

Only then move to the next phase.
