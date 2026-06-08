# Phase 5 — FELBIC OS Desktop Shell (aios-shell)
> **Status:** ⏳ Pending
> **Depends on:** [Phase 4 — Custom Compositor](./PHASE_4_COMPOSITOR.md) ✅ complete
> **Next Phase:** [Phase 6 — Browser AI Automation](./PHASE_6_BROWSER_AI.md)

---

## Goal
FELBIC OS ka user interface design karna. Custom bars, panels, desktop widgets aur system dialogs jo AI-native design system ko follow karein (Glassmorphism, Neon accents, smooth animations).

```
┌───────────────────────────────────────────────┐
│ [AI OS Status]     [Workspace 1 2 3]    [10:09]│ ← aios-bar
├───────────────────────────────┬───────────────┤
│                               │               │
│                               │  AI Assistant │
│                               │  (Side Panel) │
│                               │               │
│                               │  - Chat       │
│        Active Windows         │  - Tasks      │
│        (Human Session)        │  - Logs       │
│                               │               │
│                               │               │
│                               │               │
└───────────────────────────────┴───────────────┘
                                  ↑ aios-panel
```

---

## Tech Stack
- **Framework:** Tauri / Webview2 (For premium HTML/JS/CSS glassmorphic UI)
- **Frontend:** Vanilla JS / CSS (Or React/Svelte if requested later)
- **Styling:** Custom CSS with HSL variables, backdrop-filter blur, CSS grids, keyframe animations
- **IPC:** Tauri Rust backend to `aisd` IPC socket

---

## Tasks

### System Bar (`aios-bar`)
- [ ] Top status bar with custom widgets
- [ ] Active workspace indicator
- [ ] AI system status indicator (Idle, Thinking, Working, Error)
- [ ] Resource monitoring widgets (NPU usage, RAM, CPU)
- [ ] Clock and settings tray

### AI Sidebar (`aios-panel`)
- [ ] Sliding glassmorphic assistant panel (`Super+Space` to toggle)
- [ ] Interactive chat interface (Markdown support, code blocks with copy button)
- [ ] Voice visualizer (Wave animation when listening)
- [ ] Agent process monitor (Show sub-tasks currently being executed by the AI)
- [ ] Terminal integration (Interactive bash within panel)

### Command Center / Launcher (`aios-launcher`)
- [ ] Launcher screen overlay (replaces wofi)
- [ ] Semantic app search (e.g., typing "i want to edit a photo" suggests GIMP)
- [ ] AI prompt entry (Run actions directly from launcher)
- [ ] Calculator, currency converter, file search integration

### System Notifications (`aios-mako`)
- [ ] Glassmorphic notification banners
- [ ] Actionable notifications (e.g., "AI has finished organizing your downloads. View changes? [Yes] [No]")
- [ ] Desktop widgets (CPU/NPU load graph, clipboard history)

### IPC & Integration
- [ ] Shell connection to `aisd` socket (`/run/aisd/aisd.sock`)
- [ ] Listen to events (AI start, AI end, new chat token, task list update)
- [ ] Send user requests, toggle sessions

---

## File Structure

```
shell/
├── Cargo.toml
├── src/
│   ├── main.rs                   ← Tauri app bootstrapper
│   ├── ipc.rs                    ← Connect to aisd unix socket
│   └── window.rs                 ← Window configuration (layer shell)
├── src-ui/                       ← Web UI files
│   ├── index.html
│   ├── css/
│   │   ├── variables.css         ← Theme & design tokens
│   │   ├── bar.css               ← Top bar styling
│   │   ├── panel.css             ← Side panel styling
│   │   └── animations.css        ← Micro-animations
│   └── js/
│       ├── main.js
│       ├── ipc.js
│       └── components/           ← Chat, status widgets
└── package.json
```

---

## Exit Criteria

| Test | Expected Result |
|------|----------------|
| Launch `aios-shell` | Shell renders properly on top of the compositor |
| Toggle Panel | `Super+Space` slides panel in/out smoothly (300ms cubic-bezier) |
| IPC connection | Panel displays real-time `aisd` CPU/NPU metrics |
| AI Chat | User message sent → stream reply works with markdown formatting |
| Layout integrity | Panels do not overlap with normal windows (respects struts) |

---

## Next: Phase 6
Desktop shell complete → [Phase 6 — Browser AI Automation](./PHASE_6_BROWSER_AI.md) shuru karo.
