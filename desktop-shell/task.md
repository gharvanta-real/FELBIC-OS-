# FELBIC OS Phase 2: Implementation Tasks

## 1. Window Management (`js/modules/window-manager.js`)
- [x] Implement mouse dragging on window titlebars (`.window-titlebar`), keeping windows inside viewport bounds.
- [x] Implement window resizing on 8 directions/handles: top, bottom, left, right, top-left, top-right, bottom-left, bottom-right.
- [x] Add resize borders dynamically to each window in JS to keep HTML clean.
- [x] Implement screen snapping: drag window near left/right edge to snap to 50% width; near top edge to maximize. Show a translucent `.snap-preview` ghost window.
- [x] Restore original window state if dragged away from snap position.
- [x] Implement double-click titlebar to maximize/restore.
- [x] Implement keyboard shortcuts:
  - `Alt + ArrowLeft` (snap left)
  - `Alt + ArrowRight` (snap right)
  - `Alt + ArrowUp` (maximize)
  - `Alt + ArrowDown` (minimize/restore)
- [x] Implement window focus and Z-index layering.
- [x] Implement cascaded positioning for new windows.

## 2. Desktop Features (`js/modules/desktop.js`)
- [x] Glassmorphic Right-click Context Menu on desktop (New Folder, Change Wallpaper, Open Terminal, Show Overview).
- [x] Desktop icon grid displaying launcher icons for applications (Files, Browser, Editor, Store).
- [x] Dragging desktop icons with snap-to-grid alignment.
- [x] Selection marquee lasso: click-and-drag on desktop empty space draws selection box.
- [x] Virtual desktops / Workspaces (1 & 2): transition sliding effect, switch with `Alt + 1` / `Alt + 2`.
- [x] Window overview/expose mode when hitting `Super` (or Alt+Tab/Alt+o).

## 3. Notifications Module (`js/modules/notifications.js`)
- [x] Dynamic slide-in toast notifications.
- [x] Expose `showNotification(title, message, icon)` globally.

## 4. UI Injections & Styles (`index.html` & `css/style.css`)
- [x] Update `index.html` to inject container elements (snap preview, desktop icon grid, context menu container, notifications container, workspace overlays).
- [x] Update `css/style.css` to add CSS styles for:
  - Window borders, drag handles, and cursors.
  - Ghost preview, lasso marquee, desktop context menu, desktop icons, notifications.
  - Workspace transitions.

## 5. Integration (`js/app.js`)
- [x] Import and initialize all these modules.
- [x] Clean up legacy window logic.
- [x] Connect app actions (like saving files or installing packages) to call `showNotification`.

## 6. Interactive Live System Installer (Calamares Emulator)
- [x] Create `#installer-window` wizard steps inside `index.html`.
- [x] Create `js/modules/installer.js` to manage step progression and form state.
- [x] Implement Language selector with greetings and Keyboard layout interactive picker.
- [x] Implement Partitioning selector (Erase Disk vs Manual Partitioning) with visual disk layout mapping.
- [x] Implement User settings fields (Username, Hostname, Password) with verification.
- [x] Implement installation simulator with a progress bar and scrolling console logs.
- [x] Implement reboot command action with reset flow and system notification.
- [x] Connect with dock item click event and App list launching.

## 7. Interactive Terminal Command Interpreter
- [x] Refactor terminal window to support command history, command caret, and text inputs.
- [x] Create `js/modules/terminal.js` with Command Parser.
- [x] Implement commands: `help`, `fastfetch`/`neofetch`, `ls`, `cat`, `theme`, `pacman -S`, `clear`, `systemctl status`, `uname`.
- [x] Integrate `pacman -S` with Software Center installation database, Dock running indicators, and App Drawer.
- [x] Implement dynamic body theme switching from terminal theme command.
- [x] Add terminal input scrolling and interactive click-to-focus helper.

