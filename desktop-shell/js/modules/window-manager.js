/* FELBIC OS — Advanced Window Manager Module */

let maxZIndex = 100;
let cascadeOffset = 0;          // small stagger for multiple windows
const TOPBAR_HEIGHT = 40;
const DOCK_HEIGHT   = 10;       // minimized bottom margin
const SNAP_THRESHOLD = 20;

// Track window positions and sizes before they are maximized or snapped
const windowStates = new Map();

export function initWindowManager() {
    console.log('[felbicos] Initializing Window Manager...');

    // 1. Initialize existing windows in the DOM
    const windows = document.querySelectorAll('.window');
    windows.forEach(win => {
        registerWindow(win);
    });

    // 2. Setup Global Keyboard Shortcuts
    setupKeyboardShortcuts();

    // 3. Setup snap preview element
    ensureSnapPreview();
}

/**
 * Ensures the snap preview element exists in the DOM.
 */
function ensureSnapPreview() {
    let preview = document.getElementById('snap-preview');
    if (!preview) {
        preview = document.createElement('div');
        preview.id = 'snap-preview';
        preview.className = 'snap-preview';
        const workspace = document.getElementById('windows-container') || document.body;
        workspace.appendChild(preview);
    }
    return preview;
}

/**
 * Registers a window under the window manager (adds drag/resize handles, listeners, etc.).
 */
export function registerWindow(win) {
    if (win.dataset.windowRegistered) return;
    win.dataset.windowRegistered = 'true';

    // Set initial styles for transitions
    win.style.position = 'absolute';

    // Position window if not already positioned
    if (!win.style.left || !win.style.top) {
        cascadePosition(win);
    }

    // Save initial state
    saveWindowState(win);

    // Setup focus on mousedown
    win.addEventListener('mousedown', (e) => {
        // Don't focus if clicking controls or close buttons to prevent race conditions
        if (e.target.classList.contains('window-btn')) return;
        focusWindow(win);
    });

    // Setup dragging on titlebar
    const titlebar = win.querySelector('.window-titlebar');
    if (titlebar) {
        setupDragging(win, titlebar);
        setupTitlebarDoubleClick(win, titlebar);
    }

    // Setup 8-directional resizing
    setupResizing(win);

    // Setup minimize and maximize buttons
    setupWindowControls(win);
}

/**
 * Binds click events to minimize and maximize window control buttons.
 */
function setupWindowControls(win) {
    const minimizeBtn = win.querySelector('.window-btn.minimize');
    const maximizeBtn = win.querySelector('.window-btn.maximize');

    if (minimizeBtn) {
        minimizeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            minimizeWindow(win);
        });
    }

    if (maximizeBtn) {
        maximizeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleMaximize(win);
        });
    }
}

/**
 * Focuses a window and brings it to the front.
 */
export function focusWindow(win) {
    if (!win || win.style.display === 'none') return;
    
    maxZIndex++;
    win.style.zIndex = maxZIndex;

    const windows = document.querySelectorAll('.window');
    windows.forEach(w => w.classList.remove('active-focus'));
    win.classList.add('active-focus');

    // Update active app label in topbar
    const activeAppLabel = document.getElementById('topbar-active-app');
    if (activeAppLabel) {
        let appDisplayName = 'FELBIC OS';
        if (win.id === 'terminal-window') appDisplayName = 'Terminal';
        else if (win.id === 'settings-window') appDisplayName = 'Settings';
        else if (win.id === 'files-window') appDisplayName = 'Files';
        else if (win.id === 'browser-window') appDisplayName = 'Browser';
        else if (win.id === 'store-window') appDisplayName = 'Software';
        else if (win.id === 'monitor-window') appDisplayName = 'Task Manager';
        else if (win.id === 'editor-window') appDisplayName = 'Text Editor';
        
        activeAppLabel.textContent = appDisplayName;
    }

    // Fire a custom event
    const event = new CustomEvent('window-focused', { detail: { windowId: win.id } });
    document.dispatchEvent(event);
}

/**
 * Opens windows centered in the workspace area.
 * Each successive window is offset by 30px so they don't stack exactly.
 */
function cascadePosition(win) {
    const OFFSET = 30;
    const workspace = document.getElementById('windows-container') || document.body;
    const wsRect = workspace.getBoundingClientRect();

    const availW = wsRect.width;
    const availH = wsRect.height;

    // Compute window dimensions (use CSS min-width/min-height as fallback)
    const computedStyle = window.getComputedStyle(win);
    const winW = parseFloat(win.style.width)  || parseFloat(computedStyle.width)  || 680;
    const winH = parseFloat(win.style.height) || parseFloat(computedStyle.height) || 420;

    // Center in workspace area (relative coordinates)
    const centerLeft = Math.round((availW - winW) / 2) + cascadeOffset;
    const centerTop  = Math.round((availH - winH) / 2) + cascadeOffset;

    win.style.left = `${Math.max(0, centerLeft)}px`;
    win.style.top  = `${Math.max(0, centerTop)}px`;

    // Increment offset so next window is slightly staggered
    cascadeOffset = (cascadeOffset + OFFSET) % (OFFSET * 5);
}

/**
 * Saves the window's normal (unsnapped/unmaximized) geometry.
 */
function saveWindowState(win) {
    if (win.classList.contains('maximized') || win.classList.contains('snapped-left') || win.classList.contains('snapped-right')) {
        return; // Don't save snapped state as the restore geometry
    }

    const workspace = document.getElementById('windows-container') || document.body;
    const wsRect = workspace.getBoundingClientRect();
    const rect = win.getBoundingClientRect();

    windowStates.set(win.id, {
        left: win.style.left || `${rect.left - wsRect.left}px`,
        top: win.style.top || `${rect.top - wsRect.top}px`,
        width: win.style.width || `${rect.width}px`,
        height: win.style.height || `${rect.height}px`
    });
}

/**
 * Restores a window to its saved normal geometry.
 */
function restoreWindowState(win) {
    const state = windowStates.get(win.id);
    if (state) {
        win.style.left = state.left;
        win.style.top = state.top;
        win.style.width = state.width;
        win.style.height = state.height;
    }
    win.classList.remove('maximized', 'snapped-left', 'snapped-right');
}

/**
 * Sets up titlebar double-click to maximize/restore.
 */
function setupTitlebarDoubleClick(win, titlebar) {
    titlebar.addEventListener('doubleclick', () => {
        toggleMaximize(win);
    });
    titlebar.addEventListener('dblclick', () => {
        toggleMaximize(win);
    });
}

/**
 * Maximizes or restores a window.
 */
export function toggleMaximize(win) {
    if (win.classList.contains('maximized') || win.classList.contains('snapped-left') || win.classList.contains('snapped-right')) {
        restoreWindowState(win);
    } else {
        saveWindowState(win);
        maximizeWindow(win);
    }
}

function maximizeWindow(win) {
    win.classList.remove('snapped-left', 'snapped-right');
    win.classList.add('maximized');
    
    win.style.left = '0px';
    win.style.top = '0px';
    win.style.width = '100%';
    win.style.height = '100%';
}

function snapWindowLeft(win) {
    saveWindowState(win);
    win.classList.remove('maximized', 'snapped-right');
    win.classList.add('snapped-left');

    win.style.left = '0px';
    win.style.top = '0px';
    win.style.width = '50%';
    win.style.height = '100%';
}

function snapWindowRight(win) {
    saveWindowState(win);
    win.classList.remove('maximized', 'snapped-left');
    win.classList.add('snapped-right');

    win.style.left = '50%';
    win.style.top = '0px';
    win.style.width = '50%';
    win.style.height = '100%';
}

/**
 * Sets up titlebar dragging and snapping.
 */
function setupDragging(win, titlebar) {
    let startX = 0;
    let startY = 0;
    let isDragging = false;
    let restoreOffsetPct = 0.5; // default center offset when dragging a maximized window

    const onMouseDown = (e) => {
        // Only drag with left click
        if (e.button !== 0) return;
        
        // Prevent drag on window controls
        if (e.target.closest('.window-controls')) return;

        isDragging = true;
        win.classList.add('dragging');
        focusWindow(win);

        const workspace = document.getElementById('windows-container') || document.body;
        const wsRect = workspace.getBoundingClientRect();
        const rect = win.getBoundingClientRect();

        // If maximized or snapped, dragging restores it
        if (win.classList.contains('maximized') || win.classList.contains('snapped-left') || win.classList.contains('snapped-right')) {
            // Find click location ratio relative to window width
            const clickOffsetPx = e.clientX - rect.left;
            restoreOffsetPct = clickOffsetPx / rect.width;

            // Restore state internally but don't apply immediately, wait for move
            const state = windowStates.get(win.id);
            if (state) {
                // We will position the restored window under the mouse
                const targetWidth = parseFloat(state.width);
                const restoredLeft = e.clientX - (targetWidth * restoreOffsetPct) - wsRect.left;
                const restoredTop = e.clientY - (e.clientY - rect.top) - wsRect.top; // keep top delta

                win.style.width = state.width;
                win.style.height = state.height;
                win.style.left = `${restoredLeft}px`;
                win.style.top = `${restoredTop}px`;
            }

            win.classList.remove('maximized', 'snapped-left', 'snapped-right');
        } else {
            // Normal dragging start
            saveWindowState(win);
        }

        const currentRect = win.getBoundingClientRect();
        startX = e.clientX - currentRect.left;
        startY = e.clientY - currentRect.top;

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        
        // Disable text selection during drag
        document.body.style.userSelect = 'none';
        
        e.preventDefault();
    };

    const onMouseMove = (e) => {
        if (!isDragging) return;

        const workspace = document.getElementById('windows-container') || document.body;
        const wsRect = workspace.getBoundingClientRect();
        const rect = win.getBoundingClientRect();

        let left = (e.clientX - startX) - wsRect.left;
        let top = (e.clientY - startY) - wsRect.top;

        // Keep titlebar within workspace bounds
        left = Math.max(0, Math.min(left, wsRect.width - rect.width));
        top = Math.max(0, Math.min(top, wsRect.height - 40));

        win.style.left = `${left}px`;
        win.style.top = `${top}px`;

        // Check for snapping (using viewport coordinates)
        const snapPreview = ensureSnapPreview();
        if (e.clientX < wsRect.left + SNAP_THRESHOLD) {
            // Snap Left
            snapPreview.style.left = '0px';
            snapPreview.style.top = '0px';
            snapPreview.style.width = '50%';
            snapPreview.style.height = '100%';
            snapPreview.classList.add('visible');
        } else if (e.clientX > wsRect.right - SNAP_THRESHOLD) {
            // Snap Right
            snapPreview.style.left = '50%';
            snapPreview.style.top = '0px';
            snapPreview.style.width = '50%';
            snapPreview.style.height = '100%';
            snapPreview.classList.add('visible');
        } else if (e.clientY < wsRect.top + SNAP_THRESHOLD) {
            // Snap Maximize
            snapPreview.style.left = '0px';
            snapPreview.style.top = '0px';
            snapPreview.style.width = '100%';
            snapPreview.style.height = '100%';
            snapPreview.classList.add('visible');
        } else {
            snapPreview.classList.remove('visible');
        }
    };

    const onMouseUp = (e) => {
        if (!isDragging) return;
        isDragging = false;
        win.classList.remove('dragging');

        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        document.body.style.userSelect = '';

        const snapPreview = ensureSnapPreview();
        snapPreview.classList.remove('visible');

        const workspace = document.getElementById('windows-container') || document.body;
        const wsRect = workspace.getBoundingClientRect();

        // Apply Snap if threshold hit (using viewport coordinates)
        if (e.clientX < wsRect.left + SNAP_THRESHOLD) {
            snapWindowLeft(win);
        } else if (e.clientX > wsRect.right - SNAP_THRESHOLD) {
            snapWindowRight(win);
        } else if (e.clientY < wsRect.top + SNAP_THRESHOLD) {
            maximizeWindow(win);
        } else {
            // Normal release, save normal position
            saveWindowState(win);
        }
    };

    titlebar.addEventListener('mousedown', onMouseDown);
}

/**
 * Appends 8 resize handles and hooks resize mouse events.
 */
function setupResizing(win) {
    const handleClasses = ['t', 'b', 'l', 'r', 'tl', 'tr', 'bl', 'br'];

    handleClasses.forEach(dir => {
        const handle = document.createElement('div');
        handle.className = `resize-handle handle-${dir}`;
        win.appendChild(handle);

        handle.addEventListener('mousedown', (e) => {
            // Left click only
            if (e.button !== 0) return;
            
            e.stopPropagation();
            e.preventDefault();

            // Snapped/maximized windows cannot be resized
            if (win.classList.contains('maximized') || win.classList.contains('snapped-left') || win.classList.contains('snapped-right')) {
                return;
            }

            win.classList.add('resizing');
            focusWindow(win);
            saveWindowState(win);

            const workspace = document.getElementById('windows-container') || document.body;
            const wsRect = workspace.getBoundingClientRect();

            const initialRect = win.getBoundingClientRect();
            const initialMouseX = e.clientX;
            const initialMouseY = e.clientY;

            const onMouseMove = (moveEvent) => {
                const deltaX = moveEvent.clientX - initialMouseX;
                const deltaY = moveEvent.clientY - initialMouseY;

                let newWidth = initialRect.width;
                let newHeight = initialRect.height;
                let newLeft = initialRect.left;
                let newTop = initialRect.top;

                const computedStyle = window.getComputedStyle(win);
                const minWidthVal = parseFloat(computedStyle.minWidth);
                const minHeightVal = parseFloat(computedStyle.minHeight);
                const minWidth = !isNaN(minWidthVal) && minWidthVal > 0 ? minWidthVal : 320;
                const minHeight = !isNaN(minHeightVal) && minHeightVal > 0 ? minHeightVal : 200;

                // Horizontal resize
                if (dir.includes('r')) {
                    newWidth = Math.max(minWidth, initialRect.width + deltaX);
                } else if (dir.includes('l')) {
                    const proposedWidth = initialRect.width - deltaX;
                    if (proposedWidth >= minWidth) {
                        newWidth = proposedWidth;
                        newLeft = initialRect.left + deltaX;
                    }
                }

                // Vertical resize
                if (dir.includes('b')) {
                    newHeight = Math.max(minHeight, initialRect.height + deltaY);
                } else if (dir.includes('t')) {
                    const proposedHeight = initialRect.height - deltaY;
                    if (proposedHeight >= minHeight) {
                        newHeight = proposedHeight;
                        newTop = initialRect.top + deltaY;
                    }
                }

                // Prevent top from going above workspace top (equivalent to wsRect.top)
                if (newTop < wsRect.top) {
                    const diff = wsRect.top - newTop;
                    newHeight -= diff;
                    newTop = wsRect.top;
                }

                // Apply styles (converted to workspace-relative)
                win.style.width = `${newWidth}px`;
                win.style.height = `${newHeight}px`;
                win.style.left = `${newLeft - wsRect.left}px`;
                win.style.top = `${newTop - wsRect.top}px`;
            };

            const onMouseUp = () => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                document.body.style.userSelect = '';
                win.classList.remove('resizing');
                saveWindowState(win);
            };

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
            document.body.style.userSelect = 'none';
        });
    });
}

/**
 * Handles keyboard shortcuts for snapping, maximizing, and restoring/minimizing.
 */
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Check if Alt modifier is pressed
        if (!e.altKey) return;

        const activeWin = document.querySelector('.window.active-focus');
        if (!activeWin) return;

        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            snapWindowLeft(activeWin);
        } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            snapWindowRight(activeWin);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            saveWindowState(activeWin);
            maximizeWindow(activeWin);
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (activeWin.classList.contains('maximized') || activeWin.classList.contains('snapped-left') || activeWin.classList.contains('snapped-right')) {
                restoreWindowState(activeWin);
            } else {
                // Minimize - hide window and remove running indicator/focus
                minimizeWindow(activeWin);
            }
        }
    });
}

/**
 * Minimizes a window (hides it with animation).
 */
export function minimizeWindow(win) {
    let appName = "";
    if (win.id === 'terminal-window') appName = 'terminal';
    else if (win.id === 'settings-window') appName = 'settings';
    else if (win.id === 'files-window') appName = 'files';
    else if (win.id === 'browser-window') appName = 'browser';
    else if (win.id === 'store-window') appName = 'software';
    else if (win.id === 'monitor-window') appName = 'monitor';
    else if (win.id === 'editor-window') appName = 'editor';

    const dockItem = document.querySelector(`.dock-item[data-app="${appName}"]`);

    if (dockItem) {
        const dockRect = dockItem.getBoundingClientRect();
        const winRect = win.getBoundingClientRect();

        // Calculate translation to slide towards dock icon
        const winCenterX = winRect.left + winRect.width / 2;
        const winCenterY = winRect.top + winRect.height / 2;
        const dockCenterX = dockRect.left + dockRect.width / 2;
        const dockCenterY = dockRect.top + dockRect.height / 2;

        const deltaX = dockCenterX - winCenterX;
        const deltaY = dockCenterY - winCenterY;

        win.style.transition = 'transform 0.45s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.45s ease';
        win.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(0.05)`;
        win.style.opacity = '0';
    } else {
        win.style.transition = 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease';
        win.style.transform = 'scale(0.93) translateY(12px)';
        win.style.opacity = '0';
    }
    
    setTimeout(() => {
        win.style.display = 'none';
        win.classList.remove('active-focus');
        // Restore transform state so next show works properly
        win.style.transform = 'scale(1) translateY(0)';
    }, 450);
}
