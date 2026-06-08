# AIOS Completed Steps Audit (Actual Codebase Verification)
*Documenting the exact system-level implementations found in the source files.*

---

## 1. Boot & Base ISO Environment (`/iso`)
* **Archiso Profile Configured:** Base Arch Linux rolling release profile. Rebranded for `FELBICOS_LIVE`.
* **Dual Boot Support:** Secure boot-compatible GRUB2 and systemd-boot loader configs implemented under `iso/grub` and `iso/efiboot`.
* **System Fonts:** System font configurations under `iso/airootfs/etc/fonts/local.conf` prioritizing high-quality fonts (Inter, Noto Emoji, JetBrains Mono).
* **Plymouth Theme:** Animated Plymouth theme config (`aios` / `felbicos` logo) to hide kernel log spam and transition smoothly to the graphics shell.
* **Auto-Start Loop:** `customize_airootfs.sh` configures TTY1 auto-login, launches the temporary Sway window manager, and creates the default `install-felbicos` installer script.

---

## 2. AI System Daemon Core & Local Inference (`/aisd`)
Written in Rust for memory safety at UID 0. It is a real background system service.
* **Service Lifecycle (`main.rs`):** Implements Tokio async executor. Integrates with systemd notify API (`systemd-notify --ready` and a 15-second `WATCHDOG=1` loop to prevent systemd from killing the daemon).
* **On-Device LLM Inference Manager (`inference/mod.rs`):** Implements a robust, fault-tolerant subprocess manager for `llama-server`. Parses the installer-generated hardware configuration at `/etc/aios/aisd.toml`, monitors subprocess lifecycles, and automatically starts/polls health checks on the HTTP server. Exposes the `"ai/query"` MessagePack IPC endpoint to execute queries and retrieve responses from model weights (Mistral-7B, Phi-3, TinyLlama).
* **Client Command Line Helper (`felbicos-ai`):** Added the `"ask <prompt>"` sub-command, allowing direct text query submission to the system daemon, returning processed AI output to stdout.
* **Length-Prefixed MessagePack Unix IPC (`ipc/mod.rs`):** Unix domain socket listener at `/run/aios/aisd.sock` using length-prefixed MessagePack frames for low latency. Includes peer UID check (`SO_PEERCRED`) for security.
* **Localhost WebSocket Bridge (`ipc/mod.rs`):** Active on port `8080` to communicate with the web shell during early stages.
* **Metadata Filesystem Indexer (`fs/mod.rs`, `indexer.rs`):** A working file indexer that recursively scans home folders, hashes metadata into SQLite schema, and searches using SQL text match. Implements read, write, and directory listings.
* **Process Control (`process/mod.rs`):** Active `/proc` parsing for CPU/RAM utilization stats, system load calculations, process enumeration, and Nix bindings for sending signals (`kill`).
* **Security ACL & Logging (`acl/mod.rs`):** Implements a declarative capability ACL checker (StatsRead, FsRead, FsWrite, ProcessList, ProcessKill, SystemControl) and prints structured audit logs to `/var/log/aios/audit.jsonl`.

---

## 3. UI Shell Mockups (`/desktop-shell`)
* **High-Fidelity Simulated Interface:** An HTML/JS/CSS frontend that runs in a Chromium kiosk.
* **Simulated Environment:** Terminal (`terminal.js`), virtual filesystem (`vfs.js`), software center (`software.js`), settings (`settings.js`), and window manager (`window-manager.js`) are fully mock implementations running in browser memory.
* **Real Integration:** The mock shell queries `ws://127.0.0.1:8080` to receive CPU and Memory stats from the actual Rust daemon.

---

## 4. Custom Production Installer & Security Stack (`/installer` & `/aisd/systemd`)
* **Calamares Hardware Probing (`felbicos-ai-setup`):** Leverages sysfs (`/sys/class/drm`), nvidia-smi, and lspci fallback to auto-detect system RAM and VRAM size. Automatically selects optimal local LLM (Mistral 7B Q4, Phi-3 Mini, or TinyLlama) and generates target configuration files at `/etc/aios/aisd.toml` and `/var/lib/aios/downloader.conf`.
* **LUKS2 + TPM2 Security Enrollment (`felbicos-disk`):** Queries system for TPM2 chip presence, scans target crypttab configurations, and automates `systemd-cryptenroll --tpm2-device=auto --tpm2-pcrs=0+7` for PIN-less secure auto-unlock at boot.
* **First-Boot Model Downloader (`aios-firstboot.service` & `firstboot-download.sh`):** A custom systemd one-shot service and a robust download script that sources installer presets, fetches selected LLM weights over verified mirrors (using `hf-mirror.com` first, falling back to `huggingface.co`), verifies integrity, and restarts `aisd` to run local inference.
* **Systemd Target Presets (`services-systemd.conf`):** Configures Calamares to auto-enable `NetworkManager`, `aisd`, and `aios-firstboot` services on the target system.
* **Staging & Build Pipeline Integration (`Makefile` & `build-wsl.sh`):** Wire staging of all custom Calamares settings, branding templates, Python modules, first-boot scripts, and configurations into the Archiso staging tree.
* **Quality Verification:** Validated python syntax checks (`py_compile`) and Rust system daemon builds (`cargo check`) inside the WSL environment successfully.

---

## 5. Custom Wayland Compositor (`/compositor`)
Written in C11 using modern `wlroots` 0.18 and `libwayland-server`.
* **wlroots Core Compositor (`main.c` / `server.c`):** Handles output laying out, modes setup, dynamic scale rendering (commits via wlroots scene graph output layout API), and mapped XDG toplevel client windows.
* **Dual Seat Isolation (`input.c` / `ai_session.c`):** Separates user physical seat (`seat0` handling pointer updates and focus) from the AI isolated virtual seat (`ai-seat0` handling simulated keyboard/mouse relative and absolute movement utilizing Linux `/dev/uinput` driver, with direct seat notification programmatic fallback for virtualization/headless environments).
* **Custom Compositor Protocol (`protocol.c` / XML):** Implements `aios-compositor-v1` protocol supporting client credential verification (restricting access to root UID 0 daemon `aisd`), window list queries, and screenshot captures using shared memory file descriptors (shm).
* **Build System & Protocols Compiler (`meson.build` / `Makefile` / `build-wsl.sh`):** Integrates stable `xdg-shell` scanner targets, configures unstable features flag (`-DWLR_USE_UNSTABLE`), and wires compositor compiling and target packaging commands into the ISO release pipeline.

---

## 6. Native GTK4/Libadwaita Desktop Environment (`/desktop`)
* **Layer Shell Window Panels (`desktop_shell.py`):** Serves as main shell coordinator utilizing GTK4 and Wayland Layer Shell protocols to anchor the top panel bar and bottom liquid-glass dock.
* **Top Bar Clock & Quick Settings Popovers (`top_bar.py`):** Custom widget showing real-time clock, quick toggles for system volume/brightness (linked to `system/control` daemon IPC calls), session controls (lock, poweroff), and the **AI Status Indicator Widget** (visual idle/thinking/error pulse polling the daemon health).
* **Magnified Spring App Dock (`dock.py`):** Bottom-anchored glassmorphic dock featuring spring magnification hover scales and shortcuts to launchers, terminal, browser, file manager, and system settings.
* **Spotlight-Style HUD Natural Language Launcher (`launcher.py`):** Keyboard focus interactive HUD overlay connecting user query inputs to `aisd` file indexer (`fs/search`) and local LLM query dispatcher (`ai/query`). Shows answers inline in a dedicated AI card.
* **Semantic File Browser & AI Copilot Sidebar (`filemanager.py`):** Standard folder viewer alongside an interactive AI Sidebar chat. Reads selected file contents and sends them to the local system LLM daemon for actions (e.g., "Summarize", "Explain").
* **Preferences & AI Permissions Manager (`settings.py`):** UI interface for customizing UI scale, dark theme toggle, volume, and editing granular system capabilities permissions (allow/deny) stored inside `$HOME/.aios/permissions.toml`.
* **Length-Prefixed MsgPack IPC client (`ipc_client.py`):** Python socket client managing connections, serialization, and deserialization over Unix sockets at `/run/aios/aisd.sock`.
* **Staging & Packaging Integration (`Makefile` / `build-wsl.sh` / `packages.x86_64`):** Wires python dependencies (`python-gobject`, `python-msgpack`, `gtk4`, `libadwaita`, `gtk4-layer-shell`), autostart launch hook scripts (`autostart.sh`), and the `desktop/` source folder staging into the ISO filesystem layout.
