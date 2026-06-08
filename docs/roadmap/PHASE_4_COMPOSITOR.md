# Phase 4 — Custom Compositor (aios-comp)
> **Status:** ⏳ Pending
> **Depends on:** [Phase 2 — aisd Core](./PHASE_2_AISD_CORE.md) ✅ complete
>                 (Phase 3 parallel mein chal sakta hai)
> **Next Phase:** [Phase 5 — FELBIC OS Shell](./PHASE_5_SHELL.md)

---

## Goal
FELBIC OS ka sabse unique feature: **Dual Wayland Session**.

```
┌─────────────────────────────────────────┐
│           aios-comp (Compositor)        │
│                                         │
│  ┌──────────────┐   ┌────────────────┐  │
│  │ Human Session│   │   AI Session   │  │
│  │  (seat0)     │   │ (virtual seat) │  │
│  │              │   │                │  │
│  │ User ka      │   │ AI agent yahan │  │
│  │ actual work  │   │ kaam karta hai │  │
│  └──────────────┘   └────────────────┘  │
└─────────────────────────────────────────┘
```

- **Human session:** Aapka normal desktop — real keyboard/mouse
- **AI session:** AI agent ka isolated workspace — synthetic input
- **aisd** dono sessions ko control karta hai via compositor IPC

---

## Tech Stack
- **Language:** C (wlroots native), future rewrite in Rust
- **Build system:** Meson
- **Wayland library:** wlroots (proven by Sway, Hyprland)
- **Protocols:** Standard + custom `felbicos-compositor-v1`

---

## Tasks

### Foundation
- [ ] `compositor/` meson build kaam kare (`meson setup build && ninja -C build`)
- [ ] wlroots dependency link karna
- [ ] Basic compositor: ek window render karna (proof of concept)
- [ ] DRM/KMS backend: GPU se direct output
- [ ] Input handling: keyboard + mouse events

### Human Session
- [ ] Full Wayland desktop session:
  - XDG shell (normal windows)
  - Layer shell (panels, wallpaper, lock screen)
  - XWayland (X11 app compatibility)
- [ ] seat0 real HID input routing
- [ ] Multi-monitor support
- [ ] HiDPI scaling (1x, 1.5x, 2x)
- [ ] VRR/FreeSync support

### AI Session (Virtual)
- [ ] Virtual seat create karna (libseat)
- [ ] AI session: completely isolated Wayland environment
- [ ] No real HID access in AI session
- [ ] AI session visible as PiP overlay on human desktop (`Super+A`)
- [ ] AI session size: 25% screen (default), resizable

### Custom Wayland Protocol
- [ ] `felbicos-compositor-v1` protocol design karna (`protocols/` directory)
- [ ] Implement karna:
  - `felbicos_screen_capture` — aisd ko screenshot lene dena
  - `felbicos_input_inject` — AI session mein synthetic input
  - `felbicos_window_query` — window list + geometry aisd ko
  - `felbicos_session_switch` — sessions ke beech toggle karna
- [ ] Protocol XML file + C bindings generate karna (`wayland-scanner`)

### aisd ↔ Compositor IPC
- [ ] Compositor Unix socket expose karna: `/run/aios-comp/comp.sock`
- [ ] aisd compositor client module (`aisd/src/display/`)
- [ ] API implement karna:
  - `capture_screen()` → PNG/raw RGBA buffer
  - `inject_key(keycode, modifiers)` → keyboard input
  - `inject_mouse(x, y, button)` → mouse input
  - `get_windows()` → [{title, pid, geometry}]
  - `focus_window(pid)` → specific window focus karna

### Screen Capture to AI
- [ ] 4fps capture loop: compositor → aisd
- [ ] RGBA → JPEG compression (bandwidth save)
- [ ] aisd → MiniCPM-V vision model (Phase 3 se)
- [ ] Vision model output: scene description
- [ ] 30fps mode: jab AI actively kaam kar raha ho

### uinput Synthetic Input
- [ ] `uinput` device create karna (Rust `evdev` crate via aisd)
- [ ] Keyboard events inject karna
- [ ] Mouse move + click inject karna
- [ ] Clipboard access: Wayland clipboard protocol via compositor
- [ ] Rate limiting: max 100 actions/second (safety)

### Accessibility Bridge
- [ ] AT-SPI2 bridge: accessibility tree query karna
- [ ] aisd endpoint: `get_ui_elements(window_pid)` → buttons, text fields
- [ ] Combined with vision: AI can see AND understand UI structure

---

## File Structure

```
compositor/
├── meson.build
├── meson.options
├── protocols/
│   └── felbicos-compositor-v1.xml    ← Custom protocol
├── src/
│   ├── main.c                        ← Entry point
│   ├── server.c / server.h           ← wlroots server
│   ├── session.c                     ← Session management
│   ├── ai_session.c                  ← AI virtual session
│   ├── input.c                       ← Input routing
│   ├── capture.c                     ← Screen capture
│   └── ipc.c                         ← Compositor IPC socket
└── include/
    └── compositor.h
```

---

## Exit Criteria

| Test | Expected Result |
|------|----------------|
| `aios-comp` compiles | No errors, binary produces |
| Basic render | Ek GTK4 window compositor mein render ho |
| Human session | Normal desktop fully functional |
| AI session toggle | `Super+A` se AI session PiP dikhaye |
| Screen capture | `aisd capture_screen()` → valid PNG milta hai |
| Synthetic keyboard | `inject_key("a")` → AI session mein "a" type ho |
| Synthetic mouse | `inject_mouse(100,200,"left")` → AI session mein click ho |
| Session isolation | Human clipboard AI session se accessible na ho |
| No frame drops | Human session 60fps maintain kare jab AI session active ho |

---

## Next: Phase 5
Dual session compositor ready → [Phase 5 — FELBIC OS Shell](./PHASE_5_SHELL.md) shuru karo.
