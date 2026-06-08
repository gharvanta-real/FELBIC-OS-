import { initClock } from './modules/clock.js';
import { initStats } from './modules/system-stats.js';
import { initSettings } from './modules/settings.js';
import { initFiles } from './modules/files.js';
import { initSoftware } from './modules/software.js';
import { initMonitor } from './modules/monitor.js';
import { initEditor } from './modules/editor.js';
import { initBrowser } from './modules/browser.js';
import { initLaunchpad } from './modules/launchpad.js';
import { initNotifications } from './modules/notifications.js';
import { initWindowManager, focusWindow, registerWindow } from './modules/window-manager.js';
import { initDesktop } from './modules/desktop.js';
import { initInstaller } from './modules/installer.js';
import { initTerminal } from './modules/terminal.js';
import { initAesthetics } from './modules/aesthetics.js';
import { initPaintApp } from './modules/apps/paint-app.js';
import { initMediaApp } from './modules/apps/media-app.js';
import { initChatApp } from './modules/apps/chat-app.js';
import { initVFS } from './modules/vfs.js';
import { loadComponents } from './modules/component-loader.js';

document.addEventListener('DOMContentLoaded', async () => {
    console.log('[felbicos] Loading components...');
    await loadComponents();
    console.log('[felbicos] Components loaded. Initializing Desktop Shell...');

    // ── 1. Init Base & System Modules ──
    initVFS();
    initNotifications();
    initWindowManager();
    initDesktop();
    initAesthetics();

    initClock('topbar-clock');
    initStats('stat-cpu', 'stat-mem');
    initSettings();
    initFiles();
    initSoftware();
    initMonitor();
    initEditor();
    initBrowser();
    initLaunchpad();
    initInstaller();
    initTerminal();

    // Register paint, media, chat windows under the Window Manager
    const paintWin = document.getElementById('paint-window');
    const mediaWin = document.getElementById('media-window');
    const chatWin = document.getElementById('chat-window');
    if (paintWin) registerWindow(paintWin);
    if (mediaWin) registerWindow(mediaWin);
    if (chatWin) registerWindow(chatWin);

    // Initialize paint, media, chat app logics
    initPaintApp();
    initMediaApp();
    initChatApp();

    // ── 2. Window Control & Focus Actions ──
    // Close button click handler
    const closeBtns = document.querySelectorAll('.window-btn.close');
    closeBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation(); // prevent triggering focus on close
            const targetId = btn.getAttribute('data-target');
            const targetWindow = document.getElementById(targetId);
            if (targetWindow) {
                let appName = "";
                if (targetId === 'terminal-window') appName = 'terminal';
                else if (targetId === 'settings-window') appName = 'settings';
                else if (targetId === 'files-window') appName = 'files';
                else if (targetId === 'browser-window') appName = 'browser';
                else if (targetId === 'store-window') appName = 'software';
                else if (targetId === 'monitor-window') appName = 'monitor';
                else if (targetId === 'editor-window') appName = 'editor';
                else if (targetId === 'installer-window') appName = 'installer';
                else if (targetId === 'paint-window') appName = 'gimp';
                else if (targetId === 'media-window') appName = 'vlc';
                else if (targetId === 'chat-window') appName = 'discord';

                const dockItem = appName ? document.querySelector(`.dock-item[data-app="${appName}"]`) : null;
                
                if (dockItem) {
                    const dockRect = dockItem.getBoundingClientRect();
                    const winRect = targetWindow.getBoundingClientRect();
                    
                    const winCenterX = winRect.left + winRect.width / 2;
                    const winCenterY = winRect.top + winRect.height / 2;
                    const dockCenterX = dockRect.left + dockRect.width / 2;
                    const dockCenterY = dockRect.top + dockRect.height / 2;

                    const deltaX = dockCenterX - winCenterX;
                    const deltaY = dockCenterY - winCenterY;

                    targetWindow.style.transition = 'transform 0.45s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.45s ease';
                    targetWindow.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(0.05)`;
                } else {
                    targetWindow.style.transition = 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease';
                    targetWindow.style.transform = 'scale(0.93) translateY(12px)';
                }
                
                targetWindow.style.opacity = '0';
                setTimeout(() => {
                    targetWindow.style.display = 'none';
                    targetWindow.classList.remove('active-focus');
                    targetWindow.style.transform = 'scale(1) translateY(0) translate(0px, 0px)'; // Reset for next open
                }, 450);

                // Remove running indicator dot
                if (appName) {
                    const dockItem = document.querySelector(`.dock-item[data-app="${appName}"]`);
                    if (dockItem) dockItem.classList.remove('running');
                }
            }
        });
    });

    // Function to show/re-open a window
    function openWindow(windowId) {
        const win = document.getElementById(windowId);
        if (win) {
            let appName = "";
            if (windowId === 'terminal-window') appName = 'terminal';
            else if (windowId === 'settings-window') appName = 'settings';
            else if (windowId === 'files-window') appName = 'files';
            else if (windowId === 'browser-window') appName = 'browser';
            else if (windowId === 'store-window') appName = 'software';
            else if (windowId === 'monitor-window') appName = 'monitor';
            else if (windowId === 'editor-window') appName = 'editor';
            else if (windowId === 'installer-window') appName = 'installer';
            else if (windowId === 'paint-window') appName = 'gimp';
            else if (windowId === 'media-window') appName = 'vlc';
            else if (windowId === 'chat-window') appName = 'discord';

            const dockItem = appName ? document.querySelector(`.dock-item[data-app="${appName}"]`) : null;

            if (win.style.display === 'none') {
                if (dockItem) {
                    // Temporarily set display to flex to get bounding rect of the target window
                    win.style.display = 'flex';
                    win.style.opacity = '0';
                    win.style.transition = 'none';
                    
                    const dockRect = dockItem.getBoundingClientRect();
                    const winRect = win.getBoundingClientRect();
                    const winCenterX = winRect.left + winRect.width / 2;
                    const winCenterY = winRect.top + winRect.height / 2;
                    const dockCenterX = dockRect.left + dockRect.width / 2;
                    const dockCenterY = dockRect.top + dockRect.height / 2;

                    const deltaX = dockCenterX - winCenterX;
                    const deltaY = dockCenterY - winCenterY;

                    win.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(0.05)`;
                    win.offsetHeight; // trigger reflow
                    
                    win.style.transition = 'transform 0.45s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.45s ease';
                    win.style.transform = 'translate(0px, 0px) scale(1)';
                    win.style.opacity = '1';
                } else {
                    win.style.display = 'flex';
                    win.style.transform = 'scale(0.93) translateY(12px)';
                    win.style.opacity = '0';
                    win.offsetHeight; // trigger reflow
                    win.style.transition = 'transform 0.45s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.45s ease';
                    win.style.transform = 'scale(1) translateY(0)';
                    win.style.opacity = '1';
                }

                // Add running indicator dot
                if (dockItem) {
                    dockItem.classList.add('running');
                }
            }
            
            // Move window to active workspace if needed
            const activeWS = document.body.getAttribute('data-active-workspace') || '1';
            win.dataset.workspace = activeWS;
            
            focusWindow(win);
        }
    }

    // Expose openWindow globally so other modules can use it
    window.openWindow = openWindow;

    // Set initial running indicators and focus (Terminal open by default)
    const initialTerminal = document.getElementById('terminal-window');
    if (initialTerminal) {
        // Move to active workspace 1
        initialTerminal.dataset.workspace = '1';
        focusWindow(initialTerminal);
        const termDock = document.querySelector('.dock-item[data-app="terminal"]');
        if (termDock) termDock.classList.add('running');
    }

    // ── 3. Control Center Dropdown Panel ──
    const ccTrigger = document.getElementById('control-center-trigger');
    const ccPanel = document.getElementById('control-center-panel');

    ccTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        ccPanel.classList.toggle('active');
    });

    document.addEventListener('click', (e) => {
        if (ccPanel.classList.contains('active') && !ccPanel.contains(e.target) && e.target !== ccTrigger) {
            ccPanel.classList.remove('active');
        }
    });

    // CC Toggles
    const toggleWifi = document.getElementById('toggle-wifi');
    const toggleBluetooth = document.getElementById('toggle-bluetooth');
    const toggleDnd = document.getElementById('toggle-dnd');

    toggleWifi.addEventListener('click', () => {
        const isActive = toggleWifi.classList.toggle('active');
        toggleWifi.querySelector('.cc-toggle-sub').textContent = isActive ? 'Connected' : 'Off';
        
        // Sync Settings toggle if loaded
        const settingsWifi = document.getElementById('settings-wifi-toggle');
        if (settingsWifi) {
            settingsWifi.checked = isActive;
            settingsWifi.dispatchEvent(new Event('change'));
        }
    });

    toggleBluetooth.addEventListener('click', () => {
        const isActive = toggleBluetooth.classList.toggle('active');
        toggleBluetooth.querySelector('.cc-toggle-sub').textContent = isActive ? 'On' : 'Off';

        // Sync Settings toggle if loaded
        const settingsBt = document.getElementById('settings-bluetooth-toggle');
        if (settingsBt) {
            settingsBt.checked = isActive;
            settingsBt.dispatchEvent(new Event('change'));
        }
    });

    toggleDnd.addEventListener('click', () => {
        toggleDnd.classList.toggle('active');
    });

    // CC Power Actions
    document.getElementById('btn-lock').addEventListener('click', () => alert('Locking screen...'));
    document.getElementById('btn-restart').addEventListener('click', () => alert('Rebooting system...'));
    document.getElementById('btn-shutdown').addEventListener('click', () => alert('Shutting down...'));


    // ── 4. Spotlight Search Overlay ──
    const spotlightOverlay = document.getElementById('spotlight-overlay');
    const spotlightInput = document.getElementById('spotlight-input');
    const spotlightResults = document.getElementById('spotlight-results');

    const appList = [
        { name: 'Terminal Console', icon: '💻', desc: 'Open command shell terminal', action: () => openWindow('terminal-window') },
        { name: 'Settings', icon: '⚙️', desc: 'Configure system settings & controls', action: () => openWindow('settings-window') },
        { name: 'Files Explorer', icon: '📁', desc: 'Explore folders and files', action: () => openWindow('files-window') },
        { name: 'Web Browser', icon: '🧭', desc: 'Browse web pages', action: () => openWindow('browser-window') },
        { name: 'Software Center', icon: '🚀', desc: 'Install Linux apps', action: () => openWindow('store-window') },
        { name: 'Task Manager', icon: '📊', desc: 'Monitor CPU and system tasks', action: () => openWindow('monitor-window') },
        { name: 'Text Editor', icon: '📝', desc: 'Write or edit text draft files', action: () => openWindow('editor-window') },
        { name: 'Install System', icon: '⚙️', desc: 'Run Calamares Live Installer', action: () => openWindow('installer-window') }
    ];

    let selectedIndex = 0;
    let filteredApps = [...appList];

    function toggleSpotlight(show) {
        if (show) {
            spotlightOverlay.classList.add('active');
            spotlightInput.value = '';
            renderResults();
            setTimeout(() => spotlightInput.focus(), 50);
        } else {
            spotlightOverlay.classList.remove('active');
            spotlightInput.blur();
        }
    }

    function renderResults() {
        spotlightResults.innerHTML = '';
        if (filteredApps.length === 0) {
            spotlightResults.innerHTML = `<li class="spotlight-result-item" style="color: var(--color-topbar-text-muted);">No results found</li>`;
            return;
        }

        filteredApps.forEach((app, idx) => {
            const li = document.createElement('li');
            li.className = `spotlight-result-item ${idx === selectedIndex ? 'selected' : ''}`;
            li.innerHTML = `
                <span class="spotlight-result-icon">${app.icon}</span>
                <div style="display:flex; flex-direction:column;">
                    <span style="font-weight:500;">${app.name}</span>
                    <span style="font-size:10px; color:var(--color-topbar-text-muted);">${app.desc}</span>
                </div>
            `;
            
            li.addEventListener('click', () => {
                app.action();
                toggleSpotlight(false);
            });

            spotlightResults.appendChild(li);
        });
    }

    spotlightInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        filteredApps = appList.filter(app => 
            app.name.toLowerCase().includes(query) || 
            app.desc.toLowerCase().includes(query)
        );
        selectedIndex = 0;
        renderResults();
    });

    spotlightInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            toggleSpotlight(false);
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            selectedIndex = (selectedIndex + 1) % filteredApps.length;
            renderResults();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            selectedIndex = (selectedIndex - 1 + filteredApps.length) % filteredApps.length;
            renderResults();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (filteredApps[selectedIndex]) {
                filteredApps[selectedIndex].action();
                toggleSpotlight(false);
            }
        }
    });

    spotlightOverlay.addEventListener('click', (e) => {
        if (e.target === spotlightOverlay) {
            toggleSpotlight(false);
        }
    });

    // Ctrl + K or Alt + D to trigger Search
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
            e.preventDefault();
            toggleSpotlight(!spotlightOverlay.classList.contains('active'));
        } else if (e.altKey && e.key === 'd') {
            e.preventDefault();
            toggleSpotlight(!spotlightOverlay.classList.contains('active'));
        }
    });

    // Topbar search click trigger
    const topbarSearchTrigger = document.getElementById('topbar-search-trigger');
    if (topbarSearchTrigger) {
        topbarSearchTrigger.addEventListener('click', () => {
            toggleSpotlight(true);
        });
    }

    // Topbar theme toggle
    const topbarThemeToggle = document.getElementById('topbar-theme-toggle');
    const themeToggleIcon = document.getElementById('theme-toggle-icon');
    if (topbarThemeToggle) {
        topbarThemeToggle.addEventListener('click', () => {
            const isLight = document.body.classList.toggle('light-theme');
            if (themeToggleIcon) {
                themeToggleIcon.className = isLight ? 'hgi-stroke hgi-moon' : 'hgi-stroke hgi-sun-01';
            }
            // Sync settings pane theme cards
            const btnDark = document.getElementById('theme-btn-dark');
            const btnLight = document.getElementById('theme-btn-light');
            if (btnDark && btnLight) {
                if (isLight) {
                    btnLight.classList.add('active');
                    btnDark.classList.remove('active');
                } else {
                    btnDark.classList.add('active');
                    btnLight.classList.remove('active');
                }
            }
        });
    }

    // ── 5. App Drawer Drawer Overlay Trigger ──
    const launchpadOverlay = document.getElementById('launchpad-overlay');

    // Listen to custom window focus event
    document.addEventListener('focus-window', (e) => {
        const targetWindow = document.getElementById(e.detail.targetId);
        if (targetWindow) focusWindow(targetWindow);
    });

    // Listen to Launchpad custom launch actions
    document.addEventListener('launch-app-window', (e) => {
        openWindow(e.detail.windowId);
    });


    // ── 6. Dock Item Clicks ──
    const dockItems = document.querySelectorAll('.dock-item');
    dockItems.forEach(item => {
        item.addEventListener('click', () => {
            const appName = item.getAttribute('data-app');
            
            if (appName === 'launchpad') {
                launchpadOverlay.classList.toggle('active');
            } else if (appName === 'files') {
                openWindow('files-window');
            } else if (appName === 'browser') {
                openWindow('browser-window');
            } else if (appName === 'software') {
                openWindow('store-window');
            } else if (appName === 'terminal') {
                openWindow('terminal-window');
            } else if (appName === 'monitor') {
                openWindow('monitor-window');
            } else if (appName === 'settings') {
                openWindow('settings-window');
            } else if (appName === 'editor') {
                openWindow('editor-window');
            } else if (appName === 'installer') {
                openWindow('installer-window');
            } else if (appName === 'trash') {
                alert('Trash is empty.');
            }
        });
    });

    // ── 7. Handle app-installed events (adds to Dock and shows running state) ──
    document.addEventListener('app-installed', (e) => {
        const newApp = e.detail;
        if (!newApp) return;

        let dockItem = document.querySelector(`.dock-item[data-app="${newApp.id}"]`);
        if (!dockItem) {
            const dock = document.querySelector('.dock');
            if (dock) {
                dockItem = document.createElement('div');
                dockItem.className = `dock-item dock-${newApp.id} running`;
                dockItem.setAttribute('data-app', newApp.id);
                dockItem.setAttribute('title', newApp.name);
                dockItem.innerHTML = newApp.icon;
                
                const trash = document.querySelector('.dock-item.dock-trash');
                if (trash) {
                    dock.insertBefore(dockItem, trash);
                } else {
                    dock.appendChild(dockItem);
                }

                let winId = null;
                if (newApp.id === 'gimp') winId = 'paint-window';
                else if (newApp.id === 'vlc') winId = 'media-window';
                else if (newApp.id === 'discord') winId = 'chat-window';

                dockItem.addEventListener('click', () => {
                    if (winId) {
                        openWindow(winId);
                    } else if (newApp.windowId) {
                        openWindow(newApp.windowId);
                    } else if (newApp.action) {
                        newApp.action();
                    }
                });
            }
        } else {
            dockItem.classList.add('running');
        }
    });
});
