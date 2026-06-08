/* FELBIC OS — Desktop Module */

import { registerWindow, focusWindow } from './window-manager.js';

let activeWorkspace = 1;
let overviewActive = false;
let savedWindowPositions = new Map(); // to restore post-overview positions

export function initDesktop() {
    console.log('[felbicos] Initializing Desktop Features...');

    // 1. Initialize workspaces (Assign default workspace to existing windows)
    initWorkspaces();

    // 2. Setup Context Menu
    setupContextMenu();

    // 3. Setup Desktop Icons
    setupDesktopIcons();

    // 4. Setup Selection Lasso
    setupSelectionLasso();

    // 5. Setup Expose / Overview Mode
    setupOverviewMode();
}

/* ── WORKSPACES (VIRTUAL DESKTOPS) ── */

function initWorkspaces() {
    document.body.setAttribute('data-active-workspace', '1');

    // Assign workspace 1 to all existing windows
    const windows = document.querySelectorAll('.window');
    windows.forEach(win => {
        if (!win.dataset.workspace) {
            win.dataset.workspace = '1';
        }
    });

    // Keyboard shortcut Alt+1 and Alt+2 to switch
    document.addEventListener('keydown', (e) => {
        if (e.altKey && e.key === '1') {
            e.preventDefault();
            switchWorkspace(1);
        } else if (e.altKey && e.key === '2') {
            e.preventDefault();
            switchWorkspace(2);
        }
    });

    // Create workspace switcher overlays dynamically
    const switcher = document.createElement('div');
    switcher.id = 'workspace-switcher-overlay';
    switcher.className = 'workspace-switcher-overlay';
    document.body.appendChild(switcher);
}

function switchWorkspace(num) {
    if (activeWorkspace === num) return;
    activeWorkspace = num;

    // Show visual overlay
    const overlay = document.getElementById('workspace-switcher-overlay');
    if (overlay) {
        overlay.textContent = `Workspace ${num}`;
        overlay.classList.add('visible');
        setTimeout(() => {
            overlay.classList.remove('visible');
        }, 850);
    }

    // Deactivate overview mode if switching
    if (overviewActive) {
        toggleOverview(false);
    }

    // Animate transition
    document.body.setAttribute('data-active-workspace', num.toString());

    // Focus the first window in the new workspace (if any)
    const newWorkspaceWindows = Array.from(document.querySelectorAll('.window'))
        .filter(w => w.dataset.workspace === num.toString() && w.style.display !== 'none');
    
    if (newWorkspaceWindows.length > 0) {
        focusWindow(newWorkspaceWindows[0]);
    }
}

/* ── WINDOW OVERVIEW / EXPOSE MODE ── */

function setupOverviewMode() {
    // Listen for Super (Meta) key or Alt+Tab or Alt+o
    document.addEventListener('keydown', (e) => {
        // Alt+Tab is generally hijacked by the browser, but we can capture it or provide Alt+o
        if ((e.key === 'Meta') || (e.altKey && e.key.toLowerCase() === 'o')) {
            e.preventDefault();
            toggleOverview(!overviewActive);
        }
    });
}

function toggleOverview(active) {
    if (overviewActive === active) return;
    overviewActive = active;

    const windows = Array.from(document.querySelectorAll('.window'))
        .filter(w => w.dataset.workspace === activeWorkspace.toString() && w.style.display !== 'none');

    if (active) {
        document.body.classList.add('overview-active');
        
        // Save current geometries of active windows
        windows.forEach(win => {
            savedWindowPositions.set(win.id, {
                left: win.style.left,
                top: win.style.top,
                width: win.style.width,
                height: win.style.height,
                transform: win.style.transform,
                zIndex: win.style.zIndex
            });
            win.classList.add('in-overview');
        });

        layoutOverview(windows);

        // Click a window in overview to focus it and exit overview
        windows.forEach(win => {
            const onOverviewClick = (e) => {
                if (!overviewActive) return;
                win.removeEventListener('click', onOverviewClick);
                focusWindow(win);
                toggleOverview(false);
            };
            win.addEventListener('click', onOverviewClick);
        });

        // Click on background desktop to dismiss overview
        setTimeout(() => {
            document.addEventListener('click', dismissOverviewOnClick);
        }, 50);

    } else {
        document.body.classList.remove('overview-active');
        document.removeEventListener('click', dismissOverviewOnClick);

        // Restore window geometries
        windows.forEach(win => {
            win.classList.remove('in-overview');
            const saved = savedWindowPositions.get(win.id);
            if (saved) {
                win.style.left = saved.left;
                win.style.top = saved.top;
                win.style.width = saved.width;
                win.style.height = saved.height;
                win.style.transform = saved.transform;
                win.style.zIndex = saved.zIndex;
            }
        });
    }
}

function dismissOverviewOnClick(e) {
    // If user clicks desktop background, close overview
    if (!e.target.closest('.window')) {
        toggleOverview(false);
    }
}

function layoutOverview(windows) {
    const count = windows.length;
    if (count === 0) return;

    const topBarHeight = 28;
    const padding = 60;
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight - topBarHeight - 70; // sub dock area

    // Determine grid rows and columns
    let cols = 1;
    let rows = 1;

    if (count === 2) {
        cols = 2; rows = 1;
    } else if (count > 2 && count <= 4) {
        cols = 2; rows = 2;
    } else if (count > 4 && count <= 6) {
        cols = 3; rows = 2;
    } else if (count > 6) {
        cols = Math.ceil(Math.sqrt(count));
        rows = Math.ceil(count / cols);
    }

    const cellWidth = (screenWidth - padding * 2) / cols;
    const cellHeight = (screenHeight - padding * 2) / rows;

    windows.forEach((win, index) => {
        const col = index % cols;
        const row = Math.floor(index / cols);

        const cellX = padding + col * cellWidth;
        const cellY = topBarHeight + padding + row * cellHeight;

        // Scale window down to fit cell, maintaining aspect ratio
        const rect = win.getBoundingClientRect();
        const winWidth = rect.width;
        const winHeight = rect.height;

        const scaleX = (cellWidth * 0.85) / winWidth;
        const scaleY = (cellHeight * 0.85) / winHeight;
        const scale = Math.min(scaleX, scaleY, 0.8); // max 0.8 scale

        // Calculate center position in grid cell
        const centerX = cellX + cellWidth / 2;
        const centerY = cellY + cellHeight / 2;

        // Position window centered in its cell
        const newLeft = centerX - winWidth / 2;
        const newTop = centerY - winHeight / 2;

        win.style.left = `${newLeft}px`;
        win.style.top = `${newTop}px`;
        win.style.transform = `scale(${scale})`;
    });
}


/* ── DESKTOP CONTEXT MENU ── */

function setupContextMenu() {
    let menu = document.getElementById('desktop-context-menu');
    if (!menu) {
        menu = document.createElement('div');
        menu.id = 'desktop-context-menu';
        menu.className = 'desktop-context-menu';
        document.body.appendChild(menu);
    }

    // Listen to right-click on workspace empty space or desktop itself
    document.addEventListener('contextmenu', (e) => {
        // Prevent context menu on windows, topbar, or dock
        if (e.target.closest('.window') || e.target.closest('.topbar') || e.target.closest('.dock-container') || e.target.closest('.control-center') || e.target.closest('.spotlight')) {
            return;
        }

        e.preventDefault();

        // Render context menu options
        menu.innerHTML = `
            <div class="menu-item" id="menu-new-folder">
                <i class="hgi-stroke hgi-folder-add"></i> New Folder
            </div>
            <div class="menu-item" id="menu-wallpaper">
                <i class="hgi-stroke hgi-image-01"></i> Change Wallpaper
            </div>
            <div class="menu-item" id="menu-terminal">
                <i class="hgi-stroke hgi-command-line"></i> Open Terminal
            </div>
            <div class="menu-item" id="menu-overview">
                <i class="hgi-stroke hgi-grid-view"></i> Show Overview
            </div>
        `;

        // Position menu
        const menuWidth = 160;
        const menuHeight = 130;
        let left = e.clientX;
        let top = e.clientY;

        // Keep inside screen
        if (left + menuWidth > window.innerWidth) left -= menuWidth;
        if (top + menuHeight > window.innerHeight) top -= menuHeight;

        menu.style.left = `${left}px`;
        menu.style.top = `${top}px`;
        menu.classList.add('active');

        // Context Menu Action Listeners
        document.getElementById('menu-new-folder').addEventListener('click', () => {
            createNewFolder();
            menu.classList.remove('active');
        });

        document.getElementById('menu-wallpaper').addEventListener('click', () => {
            openAppWindow('settings-window');
            // Switch Settings app to Wallpaper tab
            const tabBtn = document.querySelector('.settings-sidebar-item[data-tab="wallpaper"]');
            if (tabBtn) tabBtn.click();
            menu.classList.remove('active');
        });

        document.getElementById('menu-terminal').addEventListener('click', () => {
            openAppWindow('terminal-window');
            menu.classList.remove('active');
        });

        document.getElementById('menu-overview').addEventListener('click', () => {
            toggleOverview(true);
            menu.classList.remove('active');
        });
    });

    // Dismiss context menu
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.desktop-context-menu')) {
            menu.classList.remove('active');
        }
    });
}

function openAppWindow(windowId) {
    if (window.openWindow) {
        window.openWindow(windowId);
    } else {
        const win = document.getElementById(windowId);
        if (win) {
            if (win.style.display === 'none') {
                win.style.display = 'flex';
                win.offsetHeight;
                win.style.transform = 'scale(1) translateY(0)';
                win.style.opacity = '1';

                // Add running indicator dot on dock
                let appName = "";
                if (windowId === 'terminal-window') appName = 'terminal';
                else if (windowId === 'settings-window') appName = 'settings';
                else if (windowId === 'files-window') appName = 'files';
                else if (windowId === 'browser-window') appName = 'browser';
                else if (windowId === 'store-window') appName = 'software';
                else if (windowId === 'monitor-window') appName = 'monitor';
                else if (windowId === 'editor-window') appName = 'editor';
                else if (windowId === 'paint-window') appName = 'gimp';
                else if (windowId === 'media-window') appName = 'vlc';
                else if (windowId === 'chat-window') appName = 'discord';

                if (appName) {
                    const dockItem = document.querySelector(`.dock-item[data-app="${appName}"]`);
                    if (dockItem) dockItem.classList.add('running');
                }
            }
            
            // Move window to active workspace if needed
            win.dataset.workspace = activeWorkspace.toString();
            
            focusWindow(win);
        }
    }
}


/* ── DESKTOP ICONS GRID & SNAPPING ── */

const desktopLauncherApps = [
    { id: 'app-files', name: 'Files Explorer', icon: 'hgi-folder-open', targetWindow: 'files-window' },
    { id: 'app-browser', name: 'Web Browser', icon: 'hgi-compass', targetWindow: 'browser-window' },
    { id: 'app-editor', name: 'Text Editor', icon: 'hgi-sticky-note-01', targetWindow: 'editor-window' },
    { id: 'app-store', name: 'Software Center', icon: 'hgi-app-store', targetWindow: 'store-window' }
];

function setupDesktopIcons() {
    let grid = document.getElementById('desktop-icon-grid');
    if (!grid) {
        grid = document.createElement('div');
        grid.id = 'desktop-icon-grid';
        grid.className = 'desktop-icon-grid';
        document.body.appendChild(grid);
    }

    grid.innerHTML = '';

    // Initialize launcher icons
    desktopLauncherApps.forEach((app, index) => {
        createDesktopIcon(app.name, app.icon, () => {
            openAppWindow(app.targetWindow);
        }, index);
    });
}

function createDesktopIcon(name, iconClass, doubleClickAction, initialIndex = 0, isFolder = false) {
    const grid = document.getElementById('desktop-icon-grid');
    if (!grid) return;

    const iconItem = document.createElement('div');
    iconItem.className = 'desktop-icon';
    if (isFolder) iconItem.classList.add('folder-icon');

    iconItem.innerHTML = `
        <div class="desktop-icon-visual">
            <i class="hgi-stroke ${iconClass}"></i>
        </div>
        <span class="desktop-icon-label">${name}</span>
    `;

    // Position in vertical-first grid layout initially
    const gridWidth = 100;
    const gridHeight = 110;
    const paddingX = 28;
    const paddingY = 64; // below topbar

    const gridClientHeight = grid.clientHeight || (window.innerHeight - 118);
    const maxRows = Math.max(1, Math.floor((gridClientHeight - paddingY) / gridHeight));
    const col = Math.floor(initialIndex / maxRows);
    const row = initialIndex % maxRows;

    const initialX = col * gridWidth + paddingX;
    const initialY = row * gridHeight + paddingY;

    iconItem.style.left = `${initialX}px`;
    iconItem.style.top = `${initialY}px`;

    grid.appendChild(iconItem);

    // Double click to open
    iconItem.addEventListener('dblclick', doubleClickAction);

    // Simple Dragging + snap to grid
    let isDragging = false;
    let offsetLeft = 0;
    let offsetTop = 0;

    iconItem.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return; // Left click only
        e.stopPropagation();

        isDragging = true;
        
        // Highlight selection
        document.querySelectorAll('.desktop-icon').forEach(item => item.classList.remove('active-select'));
        iconItem.classList.add('active-select');

        // Calculate dragging offset relative to the parent coordinates
        offsetLeft = e.clientX - iconItem.offsetLeft;
        offsetTop = e.clientY - iconItem.offsetTop;

        const onMouseMove = (moveEvent) => {
            if (!isDragging) return;
            iconItem.style.left = `${moveEvent.clientX - offsetLeft}px`;
            iconItem.style.top = `${moveEvent.clientY - offsetTop}px`;
        };

        const onMouseUp = (upEvent) => {
            if (!isDragging) return;
            isDragging = false;

            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);

            // Snap to nearest grid slot using offset parent coordinates
            const col = Math.round((iconItem.offsetLeft - paddingX) / gridWidth);
            const row = Math.round((iconItem.offsetTop - paddingY) / gridHeight);

            // Clamp inside grid boundaries
            const maxCols = Math.floor((grid.clientWidth - paddingX * 2) / gridWidth);
            const maxRows = Math.floor((grid.clientHeight - paddingY * 2) / gridHeight);

            const clampedCol = Math.max(0, Math.min(col, maxCols - 1));
            const clampedRow = Math.max(0, Math.min(row, maxRows - 1));

            const snappedX = clampedCol * gridWidth + paddingX;
            const snappedY = clampedRow * gridHeight + paddingY;

            iconItem.style.left = `${snappedX}px`;
            iconItem.style.top = `${snappedY}px`;
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });
}

async function createNewFolder() {
    const folderName = await showDialog.prompt('Enter folder name:', 'New Folder', 'Create Folder');
    if (!folderName) return;

    const existingIconsCount = document.querySelectorAll('.desktop-icon').length;

    createDesktopIcon(folderName, 'hgi-folder-01', () => {
        // Double-clicking folder opens files window focused on Documents/Folder
        openAppWindow('files-window');
        if (window.showNotification) {
            window.showNotification('Folder Opened', `Opened desktop folder "${folderName}"`, 'hgi-folder-01');
        }
    }, existingIconsCount, true);

    if (window.showNotification) {
        window.showNotification('Folder Created', `Created new folder "${folderName}"`, 'hgi-folder-add');
    }
}


/* ── SELECTION MARQUEE LASSO ── */

function setupSelectionLasso() {
    let lasso = document.getElementById('selection-lasso');
    if (!lasso) {
        lasso = document.createElement('div');
        lasso.id = 'selection-lasso';
        lasso.className = 'selection-lasso';
        document.body.appendChild(lasso);
    }

    let isDrawing = false;
    let startX = 0;
    let startY = 0;

    document.addEventListener('mousedown', (e) => {
        // Only trigger on empty space on the desktop
        if (e.target.closest('.window') || e.target.closest('.topbar') || e.target.closest('.dock-container') || e.target.closest('.control-center') || e.target.closest('.desktop-icon') || e.target.closest('.desktop-context-menu')) {
            return;
        }

        if (e.button !== 0) return; // Left click only

        isDrawing = true;
        startX = e.clientX;
        startY = e.clientY;

        lasso.style.left = `${startX}px`;
        lasso.style.top = `${startY}px`;
        lasso.style.width = '0px';
        lasso.style.height = '0px';
        lasso.classList.add('active');

        // Clear previous selections
        document.querySelectorAll('.desktop-icon').forEach(item => item.classList.remove('active-select'));

        const onMouseMove = (moveEvent) => {
            if (!isDrawing) return;

            const currentX = moveEvent.clientX;
            const currentY = moveEvent.clientY;

            const width = Math.abs(currentX - startX);
            const height = Math.abs(currentY - startY);
            const left = Math.min(currentX, startX);
            const top = Math.min(currentY, startY);

            lasso.style.width = `${width}px`;
            lasso.style.height = `${height}px`;
            lasso.style.left = `${left}px`;
            lasso.style.top = `${top}px`;

            // Select icons within marquee bounds
            const lassoRect = {
                left: left,
                top: top,
                right: left + width,
                bottom: top + height
            };

            const icons = document.querySelectorAll('.desktop-icon');
            icons.forEach(icon => {
                const iconRect = icon.getBoundingClientRect();
                const isOverlapping = !(
                    iconRect.right < lassoRect.left ||
                    iconRect.left > lassoRect.right ||
                    iconRect.bottom < lassoRect.top ||
                    iconRect.top > lassoRect.bottom
                );

                if (isOverlapping) {
                    icon.classList.add('active-select');
                } else {
                    icon.classList.remove('active-select');
                }
            });
        };

        const onMouseUp = () => {
            if (!isDrawing) return;
            isDrawing = false;
            lasso.classList.remove('active');
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });
}
