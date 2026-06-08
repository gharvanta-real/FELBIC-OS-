/* FELBIC OS — Advanced Window Manager Module */

let maxZIndex = 100;
let cascadeX = 80;
let cascadeY = 100;
const TOPBAR_HEIGHT = 28;
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
        document.body.appendChild(preview);
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
 * Positions a window in a cascaded layout.
 */
function cascadePosition(win) {
    win.style.left = `${cascadeX}px`;
    win.style.top = `${cascadeY}px`;

    cascadeX += 30;
    cascadeY += 30;

    // Reset cascade position if it goes too far
    if (cascadeX > window.innerWidth * 0.4 || cascadeY > window.innerHeight * 0.4) {
        cascadeX = 80;
        cascadeY = 100;
    }
}

/**
 * Saves the window's normal (unsnapped/unmaximized) geometry.
 */
function saveWindowState(win) {
    if (win.classList.contains('maximized') || win.classList.contains('snapped-left') || win.classList.contains('snapped-right')) {
        return; // Don't save snapped state as the restore geometry
    }

    const rect = win.getBoundingClientRect();
    windowStates.set(win.id, {
        left: win.style.left || `${rect.left}px`,
        top: win.style.top || `${rect.top}px`,
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
    // In case 'doubleclick' is named 'dblclick' in some standards
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
    win.style.top = `${TOPBAR_HEIGHT}px`;
    win.style.width = '100vw';
    win.style.height = `calc(100vh - ${TOPBAR_HEIGHT}px)`;
}

function snapWindowLeft(win) {
    saveWindowState(win);
    win.classList.remove('maximized', 'snapped-right');
    win.classList.add('snapped-left');

    win.style.left = '0px';
    win.style.top = `${TOPBAR_HEIGHT}px`;
    win.style.width = '50vw';
    win.style.height = `calc(100vh - ${TOPBAR_HEIGHT}px)`;
}

function snapWindowRight(win) {
    saveWindowState(win);
    win.classList.remove('maximized', 'snapped-left');
    win.classList.add('snapped-right');

    win.style.left = '50vw';
    win.style.top = `${TOPBAR_HEIGHT}px`;
    win.style.width = '50vw';
    win.style.height = `calc(100vh - ${TOPBAR_HEIGHT}px)`;
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
                const restoredLeft = e.clientX - (targetWidth * restoreOffsetPct);
                const restoredTop = e.clientY - (e.clientY - rect.top); // keep top delta

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

        let left = e.clientX - startX;
        let top = e.clientY - startY;

        // Keep titlebar within viewport bounds
        const rect = win.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // Clamping bounds
        left = Math.max(0, Math.min(left, viewportWidth - rect.width));
        top = Math.max(TOPBAR_HEIGHT, Math.min(top, viewportHeight - 40));

        win.style.left = `${left}px`;
        win.style.top = `${top}px`;

        // Check for snapping
        const snapPreview = ensureSnapPreview();
        if (e.clientX < SNAP_THRESHOLD) {
            // Snap Left
            snapPreview.style.left = '0px';
            snapPreview.style.top = `${TOPBAR_HEIGHT}px`;
            snapPreview.style.width = '50vw';
            snapPreview.style.height = `calc(100vh - ${TOPBAR_HEIGHT}px)`;
            snapPreview.classList.add('visible');
        } else if (e.clientX > viewportWidth - SNAP_THRESHOLD) {
            // Snap Right
            snapPreview.style.left = '50vw';
            snapPreview.style.top = `${TOPBAR_HEIGHT}px`;
            snapPreview.style.width = '50vw';
            snapPreview.style.height = `calc(100vh - ${TOPBAR_HEIGHT}px)`;
            snapPreview.classList.add('visible');
        } else if (e.clientY < TOPBAR_HEIGHT + SNAP_THRESHOLD) {
            // Snap Maximize
            snapPreview.style.left = '0px';
            snapPreview.style.top = `${TOPBAR_HEIGHT}px`;
            snapPreview.style.width = '100vw';
            snapPreview.style.height = `calc(100vh - ${TOPBAR_HEIGHT}px)`;
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

        // Apply Snap if threshold hit
        const viewportWidth = window.innerWidth;
        if (e.clientX < SNAP_THRESHOLD) {
            snapWindowLeft(win);
        } else if (e.clientX > viewportWidth - SNAP_THRESHOLD) {
            snapWindowRight(win);
        } else if (e.clientY < TOPBAR_HEIGHT + SNAP_THRESHOLD) {
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

                const minWidth = 320;
                const minHeight = 200;

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

                // Prevent top from going above topbar
                if (newTop < TOPBAR_HEIGHT) {
                    const diff = TOPBAR_HEIGHT - newTop;
                    newHeight -= diff;
                    newTop = TOPBAR_HEIGHT;
                }

                // Apply styles
                win.style.width = `${newWidth}px`;
                win.style.height = `${newHeight}px`;
                win.style.left = `${newLeft}px`;
                win.style.top = `${newTop}px`;
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
