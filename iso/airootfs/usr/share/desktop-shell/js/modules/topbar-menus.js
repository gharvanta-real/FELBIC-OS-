/* ============================================================
   AIOS — Topbar Interactive Dropdown Menus
   Implements full macOS-style menus with hover-switching,
   window controls, VFS file integration, and visual state syncing.
   ============================================================ */

let activeMenu = null;
let isMenuOpen = false;

// Menu options definition
const menusData = {
    'logo-menu': [
        { label: 'About Felbicos', action: () => showAboutDialog() },
        { label: 'System Settings...', action: () => openWin('settings-window') },
        { label: 'Activity Monitor', action: () => openWin('monitor-window') },
        { divider: true },
        { label: 'Lock Screen', shortcut: '⌥L', action: () => triggerBtnClick('btn-lock') },
        { label: 'Restart...', action: () => triggerBtnClick('btn-restart') },
        { label: 'Shut Down...', action: () => triggerBtnClick('btn-shutdown') }
    ],
    'file-menu': [
        { label: 'New File', shortcut: '⌘N', action: () => triggerDesktopOrFilesAction('new-file') },
        { label: 'New Folder', shortcut: '⌘⇧N', action: () => triggerDesktopOrFilesAction('new-folder') },
        { divider: true },
        { label: 'Open Finder', shortcut: '⌘F', action: () => openWin('files-window') },
        { label: 'Close Window', shortcut: '⌘W', action: () => closeActiveWindow() }
    ],
    'edit-menu': [
        { label: 'Undo', shortcut: '⌘Z', action: () => showToast('Edit', 'Undo action performed', 'hgi-arrow-undo-up-left') },
        { label: 'Redo', shortcut: '⌘⇧Z', action: () => showToast('Edit', 'Redo action performed', 'hgi-arrow-redo-up-right') },
        { divider: true },
        { label: 'Cut', shortcut: '⌘X', action: () => showToast('Clipboard', 'Cut to clipboard', 'hgi-cut') },
        { label: 'Copy', shortcut: '⌘C', action: () => showToast('Clipboard', 'Copied to clipboard', 'hgi-copy') },
        { label: 'Paste', shortcut: '⌘V', action: () => showToast('Clipboard', 'Pasted from clipboard', 'hgi-clipboard') },
        { divider: true },
        { label: 'Select All', shortcut: '⌘A', action: () => selectAllDesktopIcons() }
    ],
    'view-menu': [
        { label: 'Refresh Desktop', action: () => refreshDesktopGrid() },
        { label: 'Clean Up Desktop', action: () => cleanUpDesktopGrid() },
        { divider: true },
        { label: 'Toggle Light/Dark Theme', action: () => triggerBtnClick('topbar-theme-toggle') }
    ],
    'go-menu': [
        { label: 'Switch to Workspace 1', shortcut: '⌥1', action: () => switchWorkspace(1) },
        { label: 'Switch to Workspace 2', shortcut: '⌥2', action: () => switchWorkspace(2) },
        { label: 'Switch to Workspace 3', shortcut: '⌥3', action: () => switchWorkspace(3) },
        { label: 'Switch to Workspace 4', shortcut: '⌥4', action: () => switchWorkspace(4) },
        { divider: true },
        { label: 'Go to Documents', action: () => openFilesPath('/Documents') },
        { label: 'Go to Downloads', action: () => openFilesPath('/Downloads') },
        { label: 'Go to Desktop', action: () => openFilesPath('/Desktop') }
    ],
    'window-menu': [
        { label: 'Minimize Active', shortcut: '⌘M', action: () => minimizeActiveWindow() },
        { label: 'Maximize Active', shortcut: '⌘F', action: () => maximizeActiveWindow() },
        { label: 'Close Active', shortcut: '⌘W', action: () => closeActiveWindow() },
        { divider: true },
        { label: 'Overview / Expose Mode', shortcut: '⌥O', action: () => toggleOverviewMode() }
    ],
    'help-menu': [
        { label: 'Felbicos Documentation', action: () => showDocumentation() },
        { label: 'Keyboard Shortcuts', shortcut: '⌘?', action: () => showShortcuts() },
        { divider: true },
        { label: 'About AIoS Shell', action: () => showAboutDialog() }
    ],
    'wifi-menu': [
        { label: 'Wi-Fi Status', action: () => {} },
        { divider: true },
        { label: 'Network: Connected', action: () => {} },
        { label: 'Open Network Settings...', action: () => openWin('settings-window') }
    ],
    'bell-menu': [
        { label: 'Notifications Log', action: () => {} },
        { divider: true },
        { label: 'No new notifications', action: () => {} },
        { label: 'Clear All', action: () => {} }
    ],
    'avatar-menu': [
        { label: 'User Profile: aios', action: () => {} },
        { label: 'Host: felbicos-os', action: () => {} },
        { divider: true },
        { label: 'Account Settings...', action: () => openWin('settings-window') },
        { label: 'Log Out aios...', action: () => triggerBtnClick('btn-shutdown') }
    ]
};

export function initTopbarMenus() {
    const topbar = document.querySelector('.topbar');
    if (!topbar) return;

    // Create dropdown container dynamically if not present
    let dropdownContainer = document.getElementById('topbar-dropdown');
    if (!dropdownContainer) {
        dropdownContainer = document.createElement('div');
        dropdownContainer.id = 'topbar-dropdown';
        dropdownContainer.className = 'topbar-dropdown';
        document.body.appendChild(dropdownContainer);
    }

    // ── 1. Setup Logo Menu Click ──
    const logoTrigger = document.getElementById('logo-trigger');
    if (logoTrigger) {
        setupTrigger(logoTrigger, 'logo-menu', dropdownContainer);
    }

    // ── 2. Setup Topbar Menus (File, Edit, View, Go, Window, Help) ──
    const menuItems = document.querySelectorAll('.topbar-menu-item');
    const menuKeys = ['file-menu', 'edit-menu', 'view-menu', 'go-menu', 'window-menu', 'help-menu'];
    
    menuItems.forEach((item, index) => {
        const key = menuKeys[index];
        if (key) {
            setupTrigger(item, key, dropdownContainer);
        }
    });

    // ── 3. Setup Right Action Icons (Wifi, Bell, Avatar) ──
    const wifiTrigger = document.getElementById('topbar-wifi');
    if (wifiTrigger) {
        setupTrigger(wifiTrigger, 'wifi-menu', dropdownContainer);
    }

    const bellTrigger = document.getElementById('topbar-bell');
    if (bellTrigger) {
        setupTrigger(bellTrigger, 'bell-menu', dropdownContainer);
    }

    const avatarTrigger = document.getElementById('avatar-trigger');
    if (avatarTrigger) {
        setupTrigger(avatarTrigger, 'avatar-menu', dropdownContainer);
    }

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (isMenuOpen && !e.target.closest('.topbar-dropdown') && !e.target.closest('#logo-trigger') && !e.target.closest('.topbar-menu-item') && !e.target.closest('.topbar-right-icon') && !e.target.closest('.topbar-avatar')) {
            closeMenu(dropdownContainer);
        }
    });
}

function setupTrigger(trigger, key, container) {
    // Click triggers menu opening
    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        if (isMenuOpen && activeMenu === key) {
            closeMenu(container);
        } else {
            openMenu(trigger, key, container);
        }
    });

    // Hover switches menu if one is already open (macOS style!)
    trigger.addEventListener('mouseenter', () => {
        if (isMenuOpen && activeMenu !== key) {
            openMenu(trigger, key, container);
        }
    });
}

function openMenu(trigger, key, container) {
    activeMenu = key;
    isMenuOpen = true;

    // Render items
    renderMenuItems(key, container);

    // Calculate triggers bounds
    const rect = trigger.getBoundingClientRect();
    container.style.left = `${rect.left}px`;
    container.style.top = `${rect.bottom + 4}px`;

    // Adjust if overflow right boundary
    container.offsetHeight; // force layout
    const containerRect = container.getBoundingClientRect();
    if (containerRect.right > window.innerWidth) {
        container.style.left = `${window.innerWidth - containerRect.width - 12}px`;
    }

    container.classList.add('active');
}

function closeMenu(container) {
    activeMenu = null;
    isMenuOpen = false;
    if (container) {
        container.classList.remove('active');
    }
}

function renderMenuItems(key, container) {
    const items = menusData[key] || [];
    container.innerHTML = '';

    items.forEach(item => {
        if (item.divider) {
            const div = document.createElement('div');
            div.className = 'dropdown-divider';
            container.appendChild(div);
        } else {
            const div = document.createElement('div');
            div.className = 'dropdown-item';
            
            const labelSpan = document.createElement('span');
            labelSpan.textContent = item.label;
            div.appendChild(labelSpan);

            if (item.shortcut) {
                const shortcutSpan = document.createElement('span');
                shortcutSpan.className = 'dropdown-shortcut';
                shortcutSpan.textContent = item.shortcut;
                div.appendChild(shortcutSpan);
            }

            div.addEventListener('click', (e) => {
                e.stopPropagation();
                closeMenu(container);
                if (item.action) item.action();
            });

            container.appendChild(div);
        }
    });
}

// ── Action Helper Implementations ──

function openWin(windowId) {
    if (window.openWindow) {
        window.openWindow(windowId);
    }
}

function triggerBtnClick(btnId) {
    const btn = document.getElementById(btnId);
    if (btn) btn.click();
}

function showToast(title, msg, icon) {
    if (window.showNotification) {
        window.showNotification(title, msg, icon);
    }
}

async function showAboutDialog() {
    if (window.showDialog) {
        await window.showDialog.alert('FELBIC OS v0.1.0\nRunning AIoS Desktop Environment\nCreated for gharvanta-real', 'About Felbicos');
    }
}

function closeActiveWindow() {
    const activeWin = document.querySelector('.window.active-focus');
    if (activeWin) {
        const closeBtn = activeWin.querySelector('.window-btn.close');
        if (closeBtn) closeBtn.click();
    }
}

function minimizeActiveWindow() {
    const activeWin = document.querySelector('.window.active-focus');
    if (activeWin) {
        const minBtn = activeWin.querySelector('.window-btn.minimize');
        if (minBtn) minBtn.click();
    }
}

function maximizeActiveWindow() {
    const activeWin = document.querySelector('.window.active-focus');
    if (activeWin) {
        const maxBtn = activeWin.querySelector('.window-btn.maximize');
        if (maxBtn) maxBtn.click();
    }
}

function toggleOverviewMode() {
    // Dispatch Alt+O key event or toggle overview directly if keybound
    const event = new KeyboardEvent('keydown', { key: 'o', altKey: true });
    document.dispatchEvent(event);
}

function switchWorkspace(num) {
    if (window.switchWorkspace) {
        window.switchWorkspace(num);
    }
}

function selectAllDesktopIcons() {
    const icons = document.querySelectorAll('.desktop-icon');
    icons.forEach(i => i.classList.add('active-select'));
}

function refreshDesktopGrid() {
    // Fire vfs update
    const event = new CustomEvent('vfs-updated');
    document.dispatchEvent(event);
    showToast('Desktop', 'Refreshed grid icons', 'hgi-arrow-reload-horizontal');
}

function cleanUpDesktopGrid() {
    const icons = document.querySelectorAll('.desktop-icon');
    // Just trigger snappy re-alignment on all icons
    icons.forEach(icon => {
        // Send a mouseup simulation or let the layout reflow
        const mouseUpEvt = new MouseEvent('mouseup');
        icon.dispatchEvent(mouseUpEvt);
    });
    showToast('Desktop', 'Cleaned up layout grid', 'hgi-grid-view');
}

function openFilesPath(path) {
    openWin('files-window');
    // Wait a brief moment for files window DOM to focus and navigate
    setTimeout(() => {
        const event = new CustomEvent('navigate-folder', { detail: { path } });
        document.dispatchEvent(event);
    }, 100);
}

function triggerDesktopOrFilesAction(type) {
    const filesWin = document.getElementById('files-window');
    if (filesWin && filesWin.style.display !== 'none' && filesWin.classList.contains('active-focus')) {
        // Trigger folder explorer new folder/file buttons
        if (type === 'new-file') {
            const btn = document.getElementById('new-file-btn');
            if (btn) btn.click();
        } else {
            const btn = document.getElementById('new-folder-btn');
            if (btn) btn.click();
        }
    } else {
        // Trigger desktop new folder logic
        if (type === 'new-folder') {
            // Find desktop context menu New Folder and click it
            const createBtn = document.getElementById('desktop-menu-new-folder');
            if (createBtn) createBtn.click();
        }
    }
}

function showDocumentation() {
    openWin('browser-window');
    setTimeout(() => {
        const iframe = document.querySelector('.browser-iframe');
        if (iframe) {
            iframe.srcdoc = `
                <html>
                <head>
                    <style>
                        body { font-family: -apple-system, sans-serif; background: #0c1020; color: #f0f4ff; padding: 24px; }
                        h1 { color: #5a7fff; border-bottom: 1px solid #ffffff14; padding-bottom: 8px; }
                        code { background: #ffffff0a; padding: 2px 4px; border-radius: 4px; }
                    </style>
                </head>
                <body>
                    <h1>FELBIC OS Documentation</h1>
                    <p>Welcome to the AIoS Desktop Environment manual.</p>
                    <h3>Shortcuts</h3>
                    <ul>
                        <li><code>⌥1</code> - <code>⌥4</code>: Switch Workspace</li>
                        <li><code>⌥O</code>: Overview Mode</li>
                        <li><code>⌘K</code>: Spotlight Search</li>
                    </ul>
                </body>
                </html>
            `;
        }
    }, 100);
}

async function showShortcuts() {
    if (window.showDialog) {
        await window.showDialog.alert(
            'Keyboard Shortcuts:\n\n' +
            '• Switch Workspace: Alt + 1/2/3/4\n' +
            '• Overview Mode: Alt + O\n' +
            '• Spotlight Search: Cmd + K\n' +
            '• Close active window: Cmd + W',
            'Keyboard Shortcuts'
        );
    }
}
