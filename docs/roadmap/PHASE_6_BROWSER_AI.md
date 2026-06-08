# Phase 6 — Browser AI Automation (aios-browser)
> **Status:** ⏳ Pending
> **Depends on:** [Phase 5 — Desktop Shell](./PHASE_5_SHELL.md) ✅ complete
>                 [Phase 4 — Custom Compositor](./PHASE_4_COMPOSITOR.md) ✅ complete
> **Next Phase:** [Phase 7 — Release](./PHASE_7_RELEASE.md)

---

## Goal
AI agent ko web automation capability dena. AI headed browser (Chromium) launch karega virtual AI session mein, use interact karega (clicks, typing, scrolls) aur real-time tasks perform karega (e.g., booking tickets, searching info, filling forms) bina user screen interrupt kiye.

```
┌───────────────────────────────────────────────┐
│              Compositor (aios-comp)           │
│                                               │
│  ┌────────────────────┐   ┌────────────────┐  │
│  │   Human Session    │   │   AI Session   │  │
│  │                    │   │                │  │
│  │  User reads mail   │   │  [Chromium]    │  │
│  │                    │   │  AI fills form │  │
│  └────────────────────┘   └────────────────┘  │
└───────────────────────────────────────────────┘
                                   ↑ Playwright /
                                     CDP controls
```

---

## Tech Stack
- **Engine:** Playwright / Chromium
- **Integration:** Rust (via `playwright-rust` or direct Chrome DevTools Protocol `chromiumoxide`)
- **Visual Grounding:** MiniCPM-V / custom model mapping bounding boxes to DOM elements
- **IPC:** `aisd` controls the browser via a background worker thread

---

## Tasks

### Browser Integration
- [ ] Chromium package verify karna live environment mein
- [ ] Rust browser controller client build karna
- [ ] Connect to CDP (Chrome DevTools Protocol)
- [ ] Headed browser launch on display `:1` (AI virtual seat/session display)

### DOM Parsing & Grounding
- [ ] Page DOM simplified tree serialization (Convert HTML to clean Markdown/JSON for LLM)
- [ ] Element filtering (Remove hidden items, ads, tracking scripts)
- [ ] Bounding box mapping (Get coordinates of buttons, inputs relative to viewport)
- [ ] Visual overlay (Draw a tiny red dot or bounding box on the element being clicked)

### Action Injection
- [ ] Click element by ID or XPath
- [ ] Type text into input fields
- [ ] Scroll page (up/down/to element)
- [ ] Handle tabs and multi-page routing
- [ ] Handle dropdowns, checkboxes, frames

### Interactive Agent Loop
- [ ] Prompt: "Go to github.com and check notifications"
- [ ] Step 1: Open browser, navigate to URL
- [ ] Step 2: Screen capture + DOM parsing
- [ ] Step 3: LLM decides next action ("Click sign in button")
- [ ] Step 4: Perform click, repeat loop until goal met
- [ ] Send status updates to `aios-shell` side panel

---

## File Structure

```
browser-agent/
├── Cargo.toml
├── src/
│   ├── main.rs                   ← Entry point for browser controller
│   ├── cdp.rs                    ← Chrome DevTools Protocol wrapper
│   ├── dom.rs                    ← DOM element parser & selector
│   └── actions.rs                ← Click, type, scroll implementations
└── tests/
    └── automation_tests.rs
```

---

## Exit Criteria

| Test | Expected Result |
|------|----------------|
| Launch Chromium | Launches successfully on headless or secondary X11/Wayland display |
| Extract Page | Returns structured JSON with correct bounding boxes for buttons |
| Action execution | `click("#submit")` successfully triggers page submit event |
| AI session isolation | Browser runs inside AI session without stealing human keyboard focus |
| Full flow | Agent successfully logs into a mock site and extracts profile data |

---

## Next: Phase 7
Browser automation working → [Phase 7 — Release](./PHASE_7_RELEASE.md) shuru karo.
