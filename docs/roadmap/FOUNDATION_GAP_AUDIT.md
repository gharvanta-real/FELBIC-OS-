# Foundation Gap Audit

Source documents:
- `.aios/AIOS_PRD_v1.0.docx`
- `.aios/AIOS_DE_PRD_v1.0.docx`

Scope: Phase A foundation and early B1 service wiring only. No ISO build was run.

## PRD Alignment Summary

| PRD ID | Requirement | Repo status after this pass |
|---|---|---|
| A1 | UEFI bootloader files exist and boot menu is branded | Present: `iso/efiboot/loader/loader.conf`, `iso/efiboot/loader/entries/felbicos.conf`, `iso/grub/grub.cfg`. Secure Boot signing is not implemented yet. |
| A2 | Plymouth theme at AIOS path | Added `iso/airootfs/usr/share/plymouth/themes/aios/aios.plymouth`, `aios.script`, and `aios-logo.png` alias. Existing FELBIC theme remains for compatibility. |
| A3 | initramfs config path exists | Added `iso/airootfs/etc/mkinitcpio.conf`, synced with the archiso hook config. Early AI init is still not implemented. |
| A4 | systemd service wiring for `aisd` | Added ISO-profile service file and build-script staging for `/usr/bin/aisd`. Service now has `/run/aios`, `/var/log/aios`, `/var/lib/aios`, resource limits, and watchdog environment. |
| B1 | `aisd` core daemon starts under systemd notify | `aisd` now sends `READY=1` through `systemd-notify`, emits watchdog heartbeats, and handles SIGTERM gracefully. |
| B2 | Unix socket MessagePack IPC | Added `/run/aios/aisd.sock` Unix IPC with length-prefixed MessagePack frames and peer UID detection. Existing WebSocket remains as compatibility mode for the current web shell. |
| B5 | Capability ACL and audit | Added a basic capability gate plus JSONL audit log for IPC actions. Read/list actions are allowed by default; write/kill/system-control require root or explicit development override. |
| G2 | System font configuration | Added `iso/airootfs/etc/fonts/local.conf` with DM Sans/Inter/Noto and JetBrains Mono preference stack. |
| J1 | Reproducible ISO build stages core daemon | `build-wsl.sh`, `Makefile`, and CI now build/stage `aisd` before `mkarchiso`. |

## Remaining Foundation Gaps

| Gap | Why it matters | Next fix |
|---|---|---|
| Secure Boot signing not implemented | PRD A1 requires signed bootloader/kernel. | Add signing workflow with `sbctl`/`sbsigntools`, then document key handling. |
| Early AI init is only represented by mkinitcpio config | PRD A3 expects early AI init behavior, not just hooks. | Add a small initramfs hook placeholder only after deciding exactly what must run before root switch. |
| IPC needs protocol hardening | Unix socket exists, but protocol versioning, request schemas, and client SDK are not done. | Add typed request/response enums and compatibility tests. |
| ACL/audit need policy files and user prompts | Basic gate exists, but TOML policy, `ask` mode UI, and enterprise override are not implemented. | Add `~/.aios/permissions.toml`, `/etc/aios/policy.toml`, and notification-based ask/approve flow. |
| QEMU/real hardware tests not rerun | User explicitly asked not to build now. | Next validation turn should run BIOS/UEFI smoke tests after user approval. |

## Validation Done

- `cargo check` and `cargo test` passed in Arch WSL.
- `bash -n` passed for `build-wsl.sh` and `customize_airootfs.sh`.
- Added package names were checked in Arch package DB.
- PRD-required foundation files now exist locally.
