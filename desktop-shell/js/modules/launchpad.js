/* FELBIC OS — Launchpad / App Drawer Module */

export function initLaunchpad() {
    console.log('[felbicos] Initializing Launchpad Module...');

    const overlay = document.getElementById('launchpad-overlay');
    const appsGrid = document.getElementById('launchpad-apps-grid');
    const searchInput = document.getElementById('launchpad-search');

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

        if (!window.AppManager) {
            console.error('[launchpad] AppManager is not initialized yet.');
            return;
        }

        const apps = window.AppManager.getApps();
        const query = searchInput ? searchInput.value.toLowerCase().trim() : '';

        // Filter apps:
        // 1. Must match search query (if any)
        // 2. Cannot be disabled
        // 3. If store app, must be installed
        const filtered = apps.filter(app => {
            const matchesQuery = app.name.toLowerCase().includes(query);
            const isNotDisabled = !app.disabled;
            const isInstalled = app.type === 'system' || app.installed === true;
            return matchesQuery && isNotDisabled && isInstalled;
        });

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
                } else {
                    overlay.classList.remove('active');
                    if (window.showDialog && window.showDialog.alert) {
                        window.showDialog.alert(`Running application: ${app.name}`, 'Application Launcher');
                    } else {
                        alert(`Running application: ${app.name}`);
                    }
                }
            });

            appsGrid.appendChild(item);
        });
    }

    // Listen to AppManager events to re-render
    document.addEventListener('app-state-changed', () => {
        renderApps();
    });
    document.addEventListener('app-uninstalled', () => {
        renderApps();
    });
    document.addEventListener('app-installed', () => {
        renderApps();
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
