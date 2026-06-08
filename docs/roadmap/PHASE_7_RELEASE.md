# Phase 7 — v1.0 Public Release (felbicos-release)
> **Status:** ⏳ Pending
> **Depends on:** [Phase 6 — Browser AI Automation](./PHASE_6_BROWSER_AI.md) ✅ complete

---

## Goal
FELBIC OS ko public distribution ke liye tayar karna. CI/CD build automation, developer SDK release, branding polish, documentation site setup aur installation media distributions.

```
┌────────────────────────────────────────────────────────┐
│               FELBIC OS Distribution Pipeline          │
│                                                        │
│  [Code Push] ──► [GitHub Actions] ──► [Build ISO]      │
│                                            │           │
│                                            ▼           │
│  [Torrent/Mirror] ◄── [Verify ISO] ◄── [Sign ISO]      │
└────────────────────────────────────────────────────────┘
```

---

## Tasks

### Developer SDK (`felbicos-sdk`)
- [ ] Rust library (`felbicos-sdk-rs`) to talk to `aisd` APIs
- [ ] Python library (`felbicos-sdk-py`) for ML developers
- [ ] TypeScript/JS library (`felbicos-sdk-js`) for shell and app developers
- [ ] Sample apps: AI notepad, AI music player, AI-assisted calculator

### App Packaging & Repositories
- [ ] Custom AUR repository setup (`felbicos-packages`)
- [ ] System apps pre-compiled and packaged as Arch packages (`.pkg.tar.zst`)
- [ ] Automated updates daemon (`felbicos-update`) using Pacman hooks
- [ ] Flatpak integration for sandboxed app installs

### Security & Hardening
- [ ] Read-only root filesystem fallback (using overlayfs)
- [ ] AppArmor profiles for AI process (`aisd` and children)
- [ ] Secure boot support (signed bootloader and kernels)
- [ ] User data encryption options in Calamares installer

### CI/CD ISO Builder
- [ ] GitHub Actions workflow for weekly builds
- [ ] Auto-testing QEMU run in headless CI environment
- [ ] ISO checksum verification and GPG signing
- [ ] Release release notes generator

### Documentation & Launch
- [ ] Main website (felbicos.org or similar) with premium dark/glassmorphic design
- [ ] Installation handbook (Step-by-step guides for dual boot, virtual machines)
- [ ] API documentation for the custom compositor protocol and aisd socket
- [ ] Launch on ProductHunt, GitHub, and Arch Forums

---

## Exit Criteria

| Test | Expected Result |
|------|----------------|
| SDK test | External app can connect to `aisd` and run a prompt using 3 lines of code |
| Security check | AI agent cannot read `/etc/shadow` or run arbitrary sudo commands without auth |
| ISO size | ISO size < 4.0 GB (fits on standard USB drive) |
| Installation test | Clean install on physical hardware (Intel, AMD, Nvidia GPUs) works |
| CI Build | GitHub Actions builds bootable ISO in under 30 minutes |

---

## CONGRATULATIONS!
Once Phase 7 exit criteria are met, FELBIC OS v1.0 is officially released! 🎉
