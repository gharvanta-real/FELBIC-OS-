# FELBIC OS — Complete Roadmap Index
> **Yahan se shuru karo.** Har phase complete hone ke baad us phase ka file check karo aur next phase pe jao.
> **Rule:** Ek phase ke exit criteria 100% pass hone chahiye tabhi next phase start karo.

---

## Current Status

| Phase | Name | Status |
|-------|------|--------|
| [Phase 0](./PHASE_0_FOUNDATION.md) | Foundation — Bootable ISO | 🔄 In Progress (ISO booting) |
| [Phase 1](./PHASE_1_INSTALLER.md) | Custom Installer (Calamares) | ⏳ Next |
| [Phase 2](./PHASE_2_AISD_CORE.md) | AI Daemon Core (aisd) | ⏳ Pending |
| [Phase 3](./PHASE_3_LLM.md) | LLM Integration | ⏳ Pending |
| [Phase 4](./PHASE_4_COMPOSITOR.md) | Custom Compositor | ⏳ Pending |
| [Phase 5](./PHASE_5_SHELL.md) | FELBIC OS Desktop Shell | ⏳ Pending |
| [Phase 6](./PHASE_6_BROWSER_AI.md) | Browser AI Automation | ⏳ Pending |
| [Phase 7](./PHASE_7_RELEASE.md) | v1.0 Public Release | ⏳ Pending |

---

## Quick Phase Summary

```
Phase 0 → ISO boots cleanly in QEMU + real hardware
    ↓
Phase 1 → Calamares installer works, OS installs on disk
    ↓
Phase 2 → aisd Rust daemon runs as systemd service
    ↓
Phase 3 → LLM answers questions, voice input/output works
    ↓
Phase 4 → Custom Wayland compositor (Human + AI dual sessions)
    ↓
Phase 5 → Full FELBIC OS desktop shell (no more stock Sway)
    ↓
Phase 6 → AI can control browser autonomously
    ↓
Phase 7 → App store + SDK + v1.0 public launch
```

---

## Phase Transition Rule

```
✅ All tasks done
✅ All exit criteria tested (not assumed)
✅ MEMORY.md updated
✅ Code committed to Git
✅ No P0 bugs open
→ THEN move to next phase
```
