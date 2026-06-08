# Phase 1 — Custom Installer (Calamares)
> **Status:** ⏳ Pending (Phase 0 complete hone ke baad)
> **Depends on:** [Phase 0 — Foundation](./PHASE_0_FOUNDATION.md) ✅ complete
> **Next Phase:** [Phase 2 — AI Daemon Core](./PHASE_2_AISD_CORE.md)

---

## Goal
Ek proper, user-friendly installer banana jo:
- FELBIC OS ko real disk pe install kare
- AI model automatically select kare (GPU/RAM ke basis pe)
- Disk encryption (LUKS2) support kare
- Puri installation 15-20 minute mein complete ho

---

## Tasks

### Calamares Base Config
- [ ] `installer/` directory structure banana
- [ ] `installer/settings.conf` — module sequence define karna
- [ ] `installer/branding/felbicos/` — FELBIC OS installer theme
  - [ ] Custom logo, colors, slideshow
  - [ ] Welcome screen text ("Welcome to FELBIC OS")
- [ ] FELBIC OS slideshow (3-5 slides installation ke dauran dikhne wali)

### Core Installer Modules (Standard Calamares)
- [ ] `welcome` — language + timezone selector
- [ ] `locale` — locale + keyboard layout
- [ ] `partition` — disk partitioning (auto + manual mode)
  - [ ] Auto: single ext4 partition + EFI
  - [ ] Auto + btrfs subvolumes (optional)
  - [ ] Manual: advanced users ke liye
- [ ] `users` — username, password, hostname setup
- [ ] `bootloader` — GRUB2 install karna
- [ ] `packages` — final package selection
- [ ] `finished` — installation complete, reboot option

### Custom FELBIC OS Modules
- [ ] `felbicos-ai-setup` module (Python):
  - [ ] GPU detect karna (`lspci`, `/sys/class/drm`)
  - [ ] Available VRAM detect karna
  - [ ] Model options show karna user ko:
    - VRAM >= 8GB → Mistral-7B-Instruct Q4_K_M (default)
    - VRAM 4-8GB → Phi-3 Mini Q4
    - VRAM < 4GB / CPU only → TinyLlama Q4 OR cloud opt-in
  - [ ] Selected model download karna (post-install first boot pe)
- [ ] `felbicos-disk` module:
  - [ ] LUKS2 encryption option (optional but recommended)
  - [ ] TPM2 auto-unlock option (if TPM2 detected)
  - [ ] Encryption passphrase setup
- [ ] `felbicos-aisd-config` module:
  - [ ] `aisd.conf` generate karna based on user choices
  - [ ] Default AI permissions set karna

### Post-Install First Boot
- [ ] First boot setup wizard (systemd service jo pehle boot pe chale)
  - [ ] FELBIC OS welcome screen
  - [ ] AI model download (background mein)
  - [ ] System ready notification
- [ ] `aisd` service auto-enable on install

### Testing
- [ ] QEMU mein full installation test
- [ ] Real hardware pe installation test (minimum 1 machine)
- [ ] LUKS2 encryption test — encrypted disk boot kare
- [ ] Recovery test — installation fail ho toh gracefully exit kare

---

## File Structure (Kya Banana Hai)

```
installer/
├── settings.conf              ← Module sequence
├── branding/
│   └── felbicos/
│       ├── branding.desc      ← Colors, fonts, images
│       ├── logo.png           ← FELBIC OS logo
│       ├── sidebar.png        ← Installer sidebar image
│       └── slideshow/
│           ├── slide1.html    ← "AI-Native by Design"
│           ├── slide2.html    ← "Your AI is Local & Private"
│           └── slide3.html    ← "Built on Arch Linux"
└── modules/
    ├── felbicos-ai-setup/
    │   ├── module.desc
    │   └── main.py
    ├── felbicos-disk/
    │   ├── module.desc
    │   └── main.py
    └── felbicos-aisd-config/
        ├── module.desc
        └── main.py
```

---

## Exit Criteria

| Test | Expected Result |
|------|----------------|
| QEMU mein full install complete | OS reboots into installed system |
| Installer language select karna | Hindi/English dono kaam karein |
| Auto partition mode | EFI + root partition automatically bane |
| LUKS2 encryption select karna | Encrypted disk pe boot kare |
| AI model selection screen | GPU ke basis pe sahi model suggest kare |
| Installation time | < 20 minutes on SSD |
| Post-install first boot | FELBIC OS desktop load ho (no errors) |
| `aisd` service status | `systemctl status aisd` = active |

---

## Next: Phase 2
Installer kaam karne lage → [Phase 2 — AI Daemon Core](./PHASE_2_AISD_CORE.md) shuru karo.
