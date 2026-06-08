# AIOS Next Focus: System Integration & Release Validation
*Goal: Assemble the final release live ISO, validate TTY1 native autostart in QEMU, and optimize LLM inference performance during graphics load.*

---

## Why we focus on Release Validation next
Now that all custom core operating system elements—the daemon (`aisd`), the Wayland compositor (`aios-comp`), the installer modules, and the native GTK4 desktop environment—are implemented, we must validate their end-to-end orchestration. We need to verify that TTY1 auto-login spawns the custom compositor, the compositor successfully loads the GTK4 layer-shell panels, and the shell queries the background LLM daemon with low latency.

---

## Action Plan: Release & Validation

### 1. ISO Packaging & WSL Compilation (`R1`)
* **Assemble OS Image:** Execute the `build-wsl.sh` script inside the Arch Linux WSL build container.
* Stage all custom Calamares templates, Python modules, Plymouth boot branding, the Rust `aisd` daemon, the `aios-comp` Wayland compositor, and the native GTK4 `desktop` scripts into the final Archiso directory tree.
* Generate the final `build/iso/felbicos-0.1.0-x86_64.iso` image.

### 2. QEMU Boot Smoke Testing (`R2`)
* **UEFI VM Execution:** Run the `test-qemu.ps1` script to spin up the VM with 4 CPU cores and 4GB memory.
* Verify that Plymouth loads the boot splash correctly, hides kernel console spam, and transitions to auto-login.
* Confirm that `aios-comp` launches on TTY1 and successfully forks `/etc/aios/autostart.sh`, executing the GTK4 shell.

### 3. Desktop Shell & Daemon Verification (`R3`)
* Verify the top bar displays system time and queries system load statistics.
* Click the "Ask AI" row in the Spotlight launcher HUD, enter a query, and check that the inline answer displays correctly from the background daemon completing text inference.
* Open the Semantic File Manager, select a file, and verify that clicking the "Summarize" button successfully reads the file over socket IPC and produces a prompt completion.
* Modify a capability permission in the settings screen and check that the changes are written to `$HOME/.aios/permissions.toml`.

### 4. LLM Runtime & Compositor Optimization (`R4`)
* **Inference Resource Profiling:** Monitor VRAM usage during active UI rendering to prevent graphics stalling.
* Verify the systemd watchdog settings for `aisd` to ensure it restarts automatically if GPU allocation fails during bootstrap.
