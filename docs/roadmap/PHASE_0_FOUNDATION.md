# Phase 0 — Foundation: Bootable ISO
> **Status:** 🔄 In Progress
> **Depends on:** Nothing — yeh pehla step hai
> **Next Phase:** [Phase 1 — Custom Installer](./PHASE_1_INSTALLER.md)

---

## Goal
FELBIC OS ka ek bootable live ISO banana jo:
- Real hardware aur QEMU dono mein cleanly boot kare
- FELBIC OS branding dikhaye (Plymouth splash, custom motd)
- Sway desktop environment launch kare
- Calamares installer accessible ho

---

## Tasks

### ISO Build Environment
- [x] Arch Linux WSL setup Windows pe
- [x] `archiso` + `mkarchiso` install
- [x] WSL se Windows drive mount (`/mnt/e/AIoS`)
- [x] `build-wsl.sh` helper script
- [x] GitHub Actions CI pipeline (`.github/workflows/build-iso.yml`)

### ISO Profile Config
- [x] `iso/profiledef.sh` — FELBIC OS identity, `iso_label=FELBICOS_LIVE`
- [x] `iso/packages.x86_64` — base + desktop packages (wofi, waybar, grim, slurp, mako added)
- [x] `iso/pacman.conf` — mirror + repos
- [x] `iso/airootfs/etc/os-release` — FELBIC OS identity
- [x] `iso/airootfs/etc/hostname` — `felbicos-live`
- [x] `iso/airootfs/etc/issue` — TTY banner
- [x] `iso/airootfs/etc/motd` — login greeting
- [x] `iso/airootfs/etc/locale.conf` + `vconsole.conf`

### Boot Config
- [x] `iso/grub/grub.cfg` — GRUB2 BIOS boot, label `FELBICOS_LIVE`
- [x] `iso/efiboot/loader/` — systemd-boot UEFI
- [x] `iso/efiboot/loader/entries/felbicos.conf` — boot entry
- [x] `iso/syslinux/` — BIOS syslinux config, label `FELBICOS_LIVE`

### Branding
- [x] `iso/airootfs/usr/share/plymouth/themes/felbicos/` — Plymouth boot splash
- [x] `iso/airootfs/etc/plymouth/plymouthd.conf` — `Theme=felbicos`
- [x] `iso/airootfs/etc/sway/config` — Sway desktop config (temporary WM)

### Live Environment
- [x] `iso/airootfs/root/customize_airootfs.sh` — chroot hook
  - [x] locale-gen
  - [x] root password remove (live mode)
  - [x] NetworkManager enable
  - [x] TTY1 auto-login
  - [x] Sway auto-start on TTY1
  - [x] fastfetch config (FELBIC OS branding)
  - [x] `install-felbicos` shortcut

### Testing
- [x] ISO built successfully (1.9 GB)
- [ ] **ISO boots in QEMU without Switch Root error** ← CURRENT BLOCKER
- [ ] Sway desktop visible in QEMU
- [ ] Calamares launches via `install-felbicos`

---

## Exit Criteria (Sabhi Pass Hone Chahiye)

| Test | Status |
|------|--------|
| ISO builds without errors in WSL | ✅ Pass |
| ISO label = `FELBICOS_LIVE` (blkid verify) | ✅ Pass |
| QEMU BIOS boot → Sway desktop | ❌ Fail (Switch Root error — rebuild running) |
| QEMU UEFI boot → systemd-boot menu | ❌ Not tested yet |
| `install-felbicos` command launches Calamares | ❌ Not tested yet |
| Plymouth splash visible during boot | ❌ Not tested yet |
| `fastfetch` shows FELBIC OS name | ❌ Not tested yet |
| Real hardware boot (USB dd) | ❌ Not tested yet |

---

## Known Bugs / Blockers

| Bug | Root Cause | Fix | Status |
|-----|-----------|-----|--------|
| `Failed to start Switch Root` | QEMU `-machine q35` + AHCI CD-ROM — archiso hook detect nahi kar pata | Rebuild with `pc` machine + IDE CD-ROM | 🔄 Rebuilding |
| `wofi` missing crash | Not in packages.x86_64 | Added wofi, waybar, grim, slurp, mako | 🔄 Rebuilding |
| UEFI shell instead of boot menu | edk2 i386 vars with x86_64 code = mismatch | Fixed QEMU launcher to use BIOS first | ✅ Fixed |

---

## Commands

```powershell
# ISO rebuild karna (WSL mein)
wsl -d archlinux -u root -- bash /mnt/e/AIoS/build-wsl.sh

# QEMU BIOS mode test
.\test-qemu.ps1 -Mode bios

# QEMU UEFI mode test
.\test-qemu.ps1 -Mode uefi

# USB pe flash karna (real hardware test)
# wsl -d archlinux -u root -- bash -c "dd if=/mnt/e/AIoS/build/iso/felbicos-0.1.0-x86_64.iso of=/dev/sdX bs=4M status=progress"
```

---

## Next: Phase 1
Jab yeh sab exit criteria pass ho jayein → [Phase 1 — Custom Installer](./PHASE_1_INSTALLER.md) shuru karo.
