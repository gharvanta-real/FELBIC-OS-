# FELBIC OS

> AI-Native Operating System — AI embedded at the daemon level, not bolted on top.

[![Build ISO](https://github.com/felbic-os/felbicos/actions/workflows/build-iso.yml/badge.svg)](https://github.com/felbic-os/felbicos/actions/workflows/build-iso.yml)
![Phase](https://img.shields.io/badge/phase-0%20foundation-blueviolet)
![Status](https://img.shields.io/badge/status-pre--alpha-orange)
![License](https://img.shields.io/badge/license-open--core-blue)

---

## What is FELBIC OS?

FELBIC OS is a fully installable Linux-based operating system where AI runs as a privileged system daemon (`felbicd`) with native access to the filesystem, processes, display, and hardware — not as a browser extension, not as a sandboxed app.

| Component | Technology |
|---|---|
| Base | Arch Linux (rolling) |
| Init | systemd |
| Display | Wayland only (wlroots compositor) |
| AI Daemon | Rust (`aisd`) + tokio async runtime |
| LLM | llama.cpp (GGUF, local, no cloud) |
| Vision | MiniCPM-V 2.6 via ONNX |
| Installer | Calamares |
| License | Open-Core (MIT core, commercial enterprise) |

---

## Current Status

**Phase 0 — Foundation** (In Progress)

Building the bootable base ISO. AI features come in Phase 1+.

See [ROADMAP.md](.aios/ROADMAP.md) for the full build plan.

---

## Build

Requires a dedicated **Arch Linux** machine.

```bash
# Install archiso
sudo pacman -S archiso

# Build the ISO
make iso

# Test in QEMU (BIOS)
make qemu

# Test in QEMU (UEFI)
make qemu-uefi
```

The ISO will be at `build/iso/felbicos-0.1.0-x86_64.iso`.

---

## Project Structure

```
.aios/          ← Agent rules, memory, roadmap (read first)
aisd/           ← AI System Daemon (Rust)
compositor/     ← aios-comp Wayland compositor (C + wlroots)
desktop/        ← AIOS Shell (Python/GTK4 → Rust)
installer/      ← Calamares modules
iso/            ← archiso build config
models/         ← Model download + selection
docs/           ← Documentation
```

---

## Contributing

Not open to public contributions yet. Repo goes public when v0.1 ISO boots on real hardware.

---

## License

- **Core OS, felbicd, compositor, shell:** MIT License
- **Enterprise features (SSO, MDM, group policy, SLA):** Commercial license

See [LICENSE](LICENSE) for details.
