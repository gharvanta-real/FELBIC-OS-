/* FELBIC OS — Launchpad / App Drawer Module */

export function initLaunchpad() {
    console.log('[felbicos] Initializing Launchpad Module...');

    const overlay = document.getElementById('launchpad-overlay');
    const appsGrid = document.getElementById('launchpad-apps-grid');
    const searchInput = document.getElementById('launchpad-search');

    // Default system apps list
    const systemApps = [
        { id: 'files', name: 'Files Explorer', icon: '<i class="hgi-stroke hgi-folder-01"></i>', windowId: 'files-window' },
        { id: 'browser', name: 'Web Browser', icon: '<i class="hgi-stroke hgi-compass"></i>', windowId: 'browser-window' },
        { id: 'software', name: 'Software Center', icon: '<i class="hgi-stroke hgi-app-store"></i>', windowId: 'store-window' },
        { id: 'terminal', name: 'Terminal Console', icon: '<i class="hgi-stroke hgi-command-line"></i>', windowId: 'terminal-window' },
        { id: 'monitor', name: 'Task Manager', icon: '<i class="hgi-stroke hgi-activity-01"></i>', windowId: 'monitor-window' },
        { id: 'settings', name: 'System Settings', icon: '<i class="hgi-stroke hgi-settings-01"></i>', windowId: 'settings-window' },
        { id: 'editor', name: 'Text Editor', icon: '<i class="hgi-stroke hgi-file-01"></i>', windowId: 'editor-window' },
        { id: 'calculator', name: 'Calculator', icon: '<i class="hgi-stroke hgi-calculator"></i>', windowId: 'calculator-window' },
        { id: 'calendar', name: 'Calendar', icon: '<i class="hgi-stroke hgi-calendar-01"></i>', windowId: 'calendar-window' },
        { id: 'notes', name: 'Notes', icon: '<i class="hgi-stroke hgi-file-01"></i>', windowId: 'notes-window' },
        { id: 'clock', name: 'Clock', icon: '<i class="hgi-stroke hgi-time-02"></i>', windowId: 'clock-app-window' },
        { id: 'mail', name: 'MailBox', icon: '<i class="hgi-stroke hgi-mail-01"></i>', windowId: 'mail-window' },
        { id: 'tasks', name: 'PlanIt Tasks', icon: '<i class="hgi-stroke hgi-task-edit-01"></i>', windowId: 'tasks-window' }
    ];

    let installedApps = [];

    // Trigger window open events via app.js triggers
    function launchApplication(winId) {
        // Toggle overlay off
        overlay.classList.remove('active');
        if (searchInput) searchInput.value = '';

        // Dispatch dynamic launch event that app.js listens to
        const launchEvent = new CustomEvent('launch-app-window', {
            detail: { windowId: winId }
        });
        document.dispatchEvent(launchEvent);
    }

    function renderApps() {
        if (!appsGrid) return;
        appsGrid.innerHTML = '';

        const allApps = [...systemApps, ...installedApps];
        const query = searchInput ? searchInput.value.toLowerCase().trim() : '';

        // Filter apps if search query exists
        const filtered = allApps.filter(app => app.name.toLowerCase().includes(query));

        filtered.forEach(app => {
            const item = document.createElement('div');
            item.className = 'launchpad-item';
            item.innerHTML = `
                <div class="launchpad-icon">${app.icon}</div>
                <span class="launchpad-label">${app.name}</span>
            `;

            item.addEventListener('click', (e) => {
                e.stopPropagation();
                if (app.windowId) {
                    launchApplication(app.windowId);
                } else if (app.action) {
                    overlay.classList.remove('active');
                    app.action();
                }
            });

            appsGrid.appendChild(item);
        });
    }

    // Register event listener for software center dynamic installs
    document.addEventListener('app-installed', (e) => {
        const newApp = e.detail;
        if (!newApp) return;

        // Check if already in installedApps list to prevent duplicates
        if (!installedApps.some(app => app.id === newApp.id)) {
            let winId = null;
            if (newApp.id === 'gimp') winId = 'paint-window';
            else if (newApp.id === 'vlc') winId = 'media-window';
            else if (newApp.id === 'discord') winId = 'chat-window';

            installedApps.push({
                id: newApp.id,
                name: newApp.name,
                icon: newApp.icon,
                windowId: winId,
                action: winId ? null : newApp.action
            });
            renderApps();
            console.log(`[launchpad] Added newly installed app: ${newApp.name}`);
        }
    });

    // Close Launchpad clicking empty space
    if (overlay) {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay || e.target === appsGrid) {
                overlay.classList.remove('active');
                if (searchInput) searchInput.value = '';
            }
        });
    }

    // Escape key closes Launchpad
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && overlay.classList.contains('active')) {
            overlay.classList.remove('active');
            if (searchInput) searchInput.value = '';
        }
    });

    // App drawer search input
    if (searchInput) {
        searchInput.addEventListener('input', renderApps);
    }

    // Initial render
    renderApps();
}
