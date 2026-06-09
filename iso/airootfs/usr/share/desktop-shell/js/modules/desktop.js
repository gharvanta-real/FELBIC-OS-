/* FELBIC OS — Desktop Module */

import { registerWindow, focusWindow } from './window-manager.js';

let activeWorkspace = 1;
let overviewActive = false;
let savedWindowPositions = new Map(); // to restore post-overview positions
const wallpaperAssets = [
    'assets/Aurora-wallpaper.png',
    'assets/wallpaper.png'
];
let currentWallpaperIdx = 0; // Default to Aurora PNG (index 0)

export function initDesktop() {
    console.log('[felbicos] Initializing Desktop Features...');

    // Expose switchWorkspace globally
    window.switchWorkspace = switchWorkspace;
    window.setWallpaper = setWallpaper; // Expose setWallpaper

    // Set Wallpapers from localStorage or default (with Auto-Switch support)
    const autoSwitch = localStorage.getItem('auraos-wallpaper-auto-switch') === 'true';
    if (autoSwitch) {
        const isLight = document.body.classList.contains('light-theme');
        const themeSuffix = isLight ? '-light' : '-dark';
        
        const homeBg = localStorage.getItem('auraos-wallpaper-home' + themeSuffix) || 
                       (isLight ? 'var(--gradient-wallpaper-default)' : 'var(--gradient-wallpaper-aurora)');
        const lockBg = localStorage.getItem('auraos-wallpaper-lock' + themeSuffix) || 
                       (isLight ? 'var(--gradient-wallpaper-default)' : 'var(--gradient-wallpaper-aurora)');
                       
        setWallpaper(homeBg, 'home');
        setWallpaper(lockBg, 'lock');
    } else {
        const savedHome = localStorage.getItem('auraos-wallpaper-home');
        const savedLock = localStorage.getItem('auraos-wallpaper-lock');
        if (savedHome) {
            setWallpaper(savedHome, 'home');
        } else {
            setWallpaper(wallpaperAssets[0], 'home');
        }
        if (savedLock) {
            setWallpaper(savedLock, 'lock');
        } else {
            setWallpaper(wallpaperAssets[0], 'lock');
        }
    }

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

    // Sync dock visibility initially
    setTimeout(syncDockVisibility, 100);

    // Listen to changes in application state to sync dock visibility
    document.addEventListener('app-state-changed', syncDockVisibility);
    document.addEventListener('app-uninstalled', syncDockVisibility);

    // 6. Setup Power & Lock Screen Manager
    initPowerManager();
}

function setWallpaper(styleStr, target = 'home') {
    if (target === 'both' || target === 'home') {
        const bg = document.getElementById('wallpaper-bg');
        if (bg) {
            if (styleStr.includes('url(') || styleStr.includes('gradient') || styleStr.includes('var(')) {
                bg.style.background = styleStr;
            } else {
                bg.style.background = `url("${styleStr}")`;
            }
            bg.style.backgroundSize = 'cover';
            bg.style.backgroundPosition = 'center';
            bg.style.backgroundRepeat = 'no-repeat';
        }
    }
    if (target === 'both' || target === 'lock') {
        const lockBg = document.getElementById('lock-screen-overlay');
        if (lockBg) {
            if (styleStr.includes('url(') || styleStr.includes('gradient') || styleStr.includes('var(')) {
                lockBg.style.background = styleStr;
            } else {
                lockBg.style.background = `url("${styleStr}")`;
            }
            lockBg.style.backgroundSize = 'cover';
            lockBg.style.backgroundPosition = 'center';
            lockBg.style.backgroundRepeat = 'no-repeat';
        }
    }
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

    const topBarHeight = 40;
    const padding = 60;
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight - topBarHeight - 10; // sub bottom margin

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
            <div class="menu-item" id="menu-cleanup">
                <i class="hgi-stroke hgi-grid-view"></i> Clean Up Desktop
            </div>
            <div class="menu-item" id="menu-terminal">
                <i class="hgi-stroke hgi-command-line"></i> Open Terminal
            </div>
            <div class="menu-item" id="menu-toggle-weather">
                <i class="hgi-stroke hgi-sun-01"></i> Toggle Weather
            </div>
            <div class="menu-item" id="menu-toggle-calendar">
                <i class="hgi-stroke hgi-calendar-01"></i> Toggle Calendar
            </div>
            <div class="menu-item" id="menu-overview">
                <i class="hgi-stroke hgi-grid-view"></i> Show Overview
            </div>
        `;

        // Position menu
        const menuWidth = 160;
        const menuHeight = 180;
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
            currentWallpaperIdx = (currentWallpaperIdx + 1) % wallpaperAssets.length;
            const assetPath = wallpaperAssets[currentWallpaperIdx];
            if (window.setWallpaper) {
                window.setWallpaper(assetPath);
            }
            if (window.showNotification) {
                let wallName = "Aurora Glow";
                if (currentWallpaperIdx === 1) wallName = "Default Abstract";
                window.showNotification('Wallpaper Changed', `Switched to ${wallName}`, 'hgi-image-01');
            }
            menu.classList.remove('active');
        });

        document.getElementById('menu-cleanup').addEventListener('click', () => {
            cleanUpDesktop();
            menu.classList.remove('active');
        });

        document.getElementById('menu-terminal').addEventListener('click', () => {
            openAppWindow('terminal-window');
            menu.classList.remove('active');
        });

        document.getElementById('menu-toggle-weather').addEventListener('click', () => {
            if (window.toggleDesktopWidget) {
                window.toggleDesktopWidget('weather');
            }
            menu.classList.remove('active');
        });

        document.getElementById('menu-toggle-calendar').addEventListener('click', () => {
            if (window.toggleDesktopWidget) {
                window.toggleDesktopWidget('calendar');
            }
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

    const gridClientHeight = grid.clientHeight || (window.innerHeight - 60);
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

function cleanUpDesktop() {
    const grid = document.getElementById('desktop-icon-grid');
    if (!grid) return;

    const icons = Array.from(grid.querySelectorAll('.desktop-icon'));
    const gridWidth = 100;
    const gridHeight = 110;
    const paddingX = 28;
    const paddingY = 64; // below topbar

    const gridClientHeight = grid.clientHeight || (window.innerHeight - 60);
    const maxRows = Math.max(1, Math.floor((gridClientHeight - paddingY) / gridHeight));

    icons.forEach((iconItem, index) => {
        const col = Math.floor(index / maxRows);
        const row = index % maxRows;

        const snappedX = col * gridWidth + paddingX;
        const snappedY = row * gridHeight + paddingY;

        // Apply smooth transition for clean up
        iconItem.style.transition = 'left 0.3s var(--curve-smooth), top 0.3s var(--curve-smooth)';
        iconItem.style.left = `${snappedX}px`;
        iconItem.style.top = `${snappedY}px`;

        // Remove transition after it's done so dragging stays responsive
        setTimeout(() => {
            iconItem.style.transition = '';
        }, 300);
    });

    if (window.showNotification) {
        window.showNotification('Desktop Cleared', 'All desktop icons have been re-aligned to the grid.', 'hgi-grid-view');
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

        document.addEventListener('mousedown', (e) => {
            // Fix: properly scoped mousedown
        });
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });
}

function syncDockVisibility() {
    if (!window.AppManager) return;
    const apps = window.AppManager.getApps();
    apps.forEach(app => {
        // Find dock item
        const dockAppId = app.id === 'gimp' ? 'gimp' : (app.id === 'vlc' ? 'vlc' : (app.id === 'discord' ? 'discord' : app.id));
        const dockItem = document.querySelector(`.dock-item[data-app="${dockAppId}"]`);
        if (dockItem) {
            const shouldShow = (app.type === 'system' || app.installed) && !app.disabled;
            if (shouldShow) {
                dockItem.style.display = 'flex';
            } else {
                dockItem.style.display = 'none';
            }
        }
    });
}

/* ── POWER & LOCK SCREEN MANAGER ── */

function initPowerManager() {
    const shutdownBtn = document.getElementById('btn-shutdown');
    const restartBtn = document.getElementById('btn-restart');
    const lockBtn = document.getElementById('btn-lock');
    
    const powerOverlay = document.getElementById('power-dialog-overlay');
    const countdownText = document.getElementById('power-countdown-text');
    const powerCancel = document.getElementById('btn-power-cancel');
    
    const lockOverlay = document.getElementById('lock-screen-overlay');
    const lockTime = document.getElementById('lock-time');
    const lockDate = document.getElementById('lock-date');
    const lockPasswordInput = document.getElementById('lock-password-input');
    const lockSubmit = document.getElementById('btn-lock-submit');
    const lockLoginBox = document.getElementById('lock-login-box');
    const lockUnlockPrompt = document.getElementById('lock-unlock-prompt');
    const lockTimeContainer = document.querySelector('.lock-screen-time-container');
    
    const transitionOverlay = document.getElementById('system-transition-overlay');
    const transitionTitle = document.getElementById('transition-title');
    
    let countdownVal = 60;
    let countdownInterval = null;
    let currentPowerAction = null; // 'shutdown' or 'restart'
    let lockClockInterval = null;
    let lockScreenState = 'clean'; // 'clean' or 'login'
    let lockScreenIdleTimer = null;

    // Show power dialog with countdown
    function showPowerDialog(action) {
        // Close Control Center panel if open
        const ccPanel = document.getElementById('control-center-panel');
        if (ccPanel) ccPanel.classList.remove('active');
        
        currentPowerAction = action;
        countdownVal = 60;
        
        if (action === 'shutdown') {
            countdownText.textContent = `Shutting down in ${countdownVal}s...`;
        } else {
            countdownText.textContent = `Restarting in ${countdownVal}s...`;
        }
        
        powerOverlay.style.display = 'flex';
        powerOverlay.offsetHeight; // force layout reflow
        powerOverlay.classList.add('active');
        
        clearInterval(countdownInterval);
        countdownInterval = setInterval(() => {
            countdownVal--;
            if (countdownVal <= 0) {
                clearInterval(countdownInterval);
                executePowerAction();
            } else {
                if (action === 'shutdown') {
                    countdownText.textContent = `Shutting down in ${countdownVal}s...`;
                } else {
                    countdownText.textContent = `Restarting in ${countdownVal}s...`;
                }
            }
        }, 1000);
    }
    
    function closePowerDialog() {
        powerOverlay.classList.remove('active');
        clearInterval(countdownInterval);
        setTimeout(() => {
            powerOverlay.style.display = 'none';
        }, 200);
    }
    
    function executePowerAction() {
        closePowerDialog();
        
        if (currentPowerAction === 'shutdown') {
            transitionTitle.textContent = "Shutting down...";
            transitionOverlay.style.display = 'flex';
            
            setTimeout(() => {
                transitionTitle.textContent = "It is now safe to turn off your computer.";
                // Remove spinner
                const spinner = transitionOverlay.querySelector('.transition-spinner');
                if (spinner) spinner.style.display = 'none';
                
                // Add a helper click to restore
                const hint = document.createElement('p');
                hint.textContent = "Click anywhere to power back on";
                hint.style.fontSize = "11px";
                hint.style.color = "var(--text-muted)";
                hint.style.marginTop = "20px";
                hint.style.cursor = "pointer";
                transitionOverlay.querySelector('.transition-content').appendChild(hint);
                
                const powerOn = () => {
                    transitionOverlay.style.display = 'none';
                    if (spinner) spinner.style.display = 'block';
                    hint.remove();
                    transitionOverlay.removeEventListener('click', powerOn);
                };
                setTimeout(() => {
                    transitionOverlay.addEventListener('click', powerOn);
                }, 500);
                
            }, 2500);
            
        } else if (currentPowerAction === 'restart') {
            transitionTitle.textContent = "Restarting...";
            transitionOverlay.style.display = 'flex';
            
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        }
    }
    
    function executeSleep() {
        closePowerDialog();
        transitionTitle.textContent = "Going to sleep...";
        transitionOverlay.style.display = 'flex';
        
        setTimeout(() => {
            transitionOverlay.style.display = 'none';
            showLockScreen();
        }, 1500);
    }

    // Lock screen management
    function showLockScreen() {
        // Close Control Center panel if open
        const ccPanel = document.getElementById('control-center-panel');
        if (ccPanel) ccPanel.classList.remove('active');
        
        lockOverlay.style.display = 'flex';
        lockOverlay.offsetHeight;
        lockOverlay.classList.add('active');
        
        setLockScreenState('clean');
        
        updateLockClock();
        clearInterval(lockClockInterval);
        lockClockInterval = setInterval(updateLockClock, 1000);
    }
    
    function setLockScreenState(state) {
        lockScreenState = state;
        clearTimeout(lockScreenIdleTimer);
        
        if (state === 'clean') {
            lockOverlay.classList.remove('login-active');
            if (lockTimeContainer) lockTimeContainer.classList.remove('login-active');
            if (lockLoginBox) {
                lockLoginBox.classList.remove('visible');
            }
            if (lockUnlockPrompt) {
                lockUnlockPrompt.classList.add('visible');
            }
        } else if (state === 'login') {
            lockOverlay.classList.add('login-active');
            if (lockTimeContainer) lockTimeContainer.classList.add('login-active');
            if (lockLoginBox) {
                lockLoginBox.classList.add('visible');
            }
            if (lockUnlockPrompt) {
                lockUnlockPrompt.classList.remove('visible');
            }
            // Focus the input
            setTimeout(() => {
                if (lockPasswordInput) {
                    lockPasswordInput.value = '';
                    lockPasswordInput.focus();
                }
            }, 200);
            
            resetLockScreenIdleTimer();
        }
    }
    
    function resetLockScreenIdleTimer() {
        clearTimeout(lockScreenIdleTimer);
        if (lockScreenState === 'login') {
            lockScreenIdleTimer = setTimeout(() => {
                setLockScreenState('clean');
            }, 15000); // return to clean screen after 15s idle
        }
    }
    
    function updateLockClock() {
        const now = new Date();
        
        // Time format (e.g. 11:42 PM)
        let hours = now.getHours();
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12;
        lockTime.textContent = `${hours}:${minutes} ${ampm}`;
        
        // Date format (e.g. Monday, May 20)
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        lockDate.textContent = `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}`;
    }
    
    function unlockScreen() {
        const pass = lockPasswordInput.value.trim().toLowerCase();
        
        // Valid password is "aios" or empty
        if (pass === 'aios' || pass === '1234' || pass === '') {
            lockOverlay.classList.remove('active');
            lockOverlay.classList.remove('login-active');
            clearInterval(lockClockInterval);
            clearTimeout(lockScreenIdleTimer);
            setTimeout(() => {
                lockOverlay.style.display = 'none';
            }, 400);
        } else {
            // Shake login box on incorrect password
            lockLoginBox.classList.add('shake');
            setTimeout(() => {
                lockLoginBox.classList.remove('shake');
            }, 400);
            
            lockPasswordInput.value = '';
            lockPasswordInput.focus();
            resetLockScreenIdleTimer();
        }
    }

    // Power dialog buttons event bindings
    if (shutdownBtn) shutdownBtn.addEventListener('click', () => showPowerDialog('shutdown'));
    if (restartBtn) restartBtn.addEventListener('click', () => showPowerDialog('restart'));
    if (lockBtn) lockBtn.addEventListener('click', showLockScreen);
    
    if (powerCancel) powerCancel.addEventListener('click', closePowerDialog);
    
    // Direct actions inside power menu card
    const optSleep = document.getElementById('power-opt-sleep');
    const optRestart = document.getElementById('power-opt-restart');
    const optShutdown = document.getElementById('power-opt-shutdown');
    const optLock = document.getElementById('power-opt-lock');
    
    if (optSleep) optSleep.addEventListener('click', executeSleep);
    if (optRestart) optRestart.addEventListener('click', () => { closePowerDialog(); showPowerDialog('restart'); executePowerAction(); });
    if (optShutdown) optShutdown.addEventListener('click', () => { closePowerDialog(); showPowerDialog('shutdown'); executePowerAction(); });
    if (optLock) optLock.addEventListener('click', () => { closePowerDialog(); showLockScreen(); });
    
    // Lock screen event bindings
    if (lockSubmit) lockSubmit.addEventListener('click', unlockScreen);
    if (lockPasswordInput) {
        lockPasswordInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                unlockScreen();
            } else {
                resetLockScreenIdleTimer();
            }
        });
        lockPasswordInput.addEventListener('input', resetLockScreenIdleTimer);
    }
    
    // Click on overlay to switch to login view
    if (lockOverlay) {
        lockOverlay.addEventListener('click', (e) => {
            // Prevent trigger if clicking login box or controls
            if (e.target.closest('#lock-login-box') || e.target.closest('.lock-bottom-controls')) {
                return;
            }
            if (lockScreenState === 'clean') {
                setLockScreenState('login');
            }
        });
    }

    // Keyboard trigger to switch to login view, or escape key to go back
    window.addEventListener('keydown', (e) => {
        if (lockOverlay && lockOverlay.classList.contains('active')) {
            if (lockScreenState === 'clean') {
                e.preventDefault();
                setLockScreenState('login');
            } else if (e.key === 'Escape') {
                e.preventDefault();
                setLockScreenState('clean');
            }
        }
    });
    
    // Lock screen bottom buttons
    const lockSleep = document.getElementById('lock-ctrl-sleep');
    const lockRestart = document.getElementById('lock-ctrl-restart');
    const lockShutdown = document.getElementById('lock-ctrl-shutdown');
    
    if (lockSleep) lockSleep.addEventListener('click', () => {
        lockOverlay.classList.remove('active');
        clearInterval(lockClockInterval);
        setTimeout(() => {
            lockOverlay.style.display = 'none';
            executeSleep();
        }, 300);
    });
    if (lockRestart) lockRestart.addEventListener('click', () => {
        lockOverlay.classList.remove('active');
        clearInterval(lockClockInterval);
        setTimeout(() => {
            lockOverlay.style.display = 'none';
            showPowerDialog('restart');
            executePowerAction();
        }, 300);
    });
    if (lockShutdown) lockShutdown.addEventListener('click', () => {
        lockOverlay.classList.remove('active');
        clearInterval(lockClockInterval);
        setTimeout(() => {
            lockOverlay.style.display = 'none';
            showPowerDialog('shutdown');
            executePowerAction();
        }, 300);
    });
}
