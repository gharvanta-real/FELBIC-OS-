/* FELBIC OS — Software Center Module */

export function initSoftware() {
    console.log('[felbicos] Initializing Software Center Module...');

    const appsDb = [
        { id: 'firefox', name: 'Firefox Browser', desc: 'Secure, modern web browsing platform.', cat: 'featured', icon: '<i class="hgi-stroke hgi-internet"></i>', installed: false },
        { id: 'vscode', name: 'VS Code', desc: 'Powerful open-source code and text editor.', cat: 'developer', icon: '<i class="hgi-stroke hgi-code"></i>', installed: false },
        { id: 'rust', name: 'Rust Compiler', desc: 'Compile safe and fast programs.', cat: 'developer', icon: '<i class="hgi-stroke hgi-developer"></i>', installed: false },
        { id: 'gimp', name: 'GIMP Editor', desc: 'GNU Image Manipulation program.', cat: 'graphics', icon: '<i class="hgi-stroke hgi-brush"></i>', installed: false },
        { id: 'blender', name: 'Blender 3D', desc: 'Open-source 3D modeling and rendering.', cat: 'graphics', icon: '<i class="hgi-stroke hgi-artboard"></i>', installed: false },
        { id: 'vlc', name: 'VLC Media Player', desc: 'Play any video or audio stream instantly.', cat: 'utilities', icon: '<i class="hgi-stroke hgi-video-console"></i>', installed: false },
        { id: 'discord', name: 'Discord Client', desc: 'Voice, video, and text communication.', cat: 'utilities', icon: '<i class="hgi-stroke hgi-bubble-chat-user"></i>', installed: false }
    ];

    let currentCategory = 'featured';
    let searchQuery = '';

    const appsList = document.getElementById('store-apps-list');
    const sidebarItems = document.querySelectorAll('.store-sidebar-item');
    const searchInput = document.getElementById('store-search');

    function renderApps() {
        if (!appsList) return;
        appsList.innerHTML = '';

        // Filter apps
        let list = appsDb;
        if (currentCategory !== 'all') {
            list = list.filter(app => app.cat === currentCategory || (currentCategory === 'featured' && app.cat === 'featured'));
        }

        if (searchQuery) {
            list = list.filter(app => 
                app.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                app.desc.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        if (list.length === 0) {
            appsList.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--color-topbar-text-muted); padding-top: 40px;">No software packages found in repository.</div>`;
            return;
        }

        list.forEach(app => {
            const card = document.createElement('div');
            card.className = 'store-card';
            card.innerHTML = `
                <div class="store-card-icon">${app.icon}</div>
                <div class="store-card-info">
                    <span class="store-card-name">${app.name}</span>
                    <span class="store-card-desc">${app.desc}</span>
                </div>
                <button class="store-card-btn ${app.installed ? 'installed' : ''}" data-id="${app.id}">
                    ${app.installed ? 'Installed' : 'GET'}
                </button>
            `;

            const btn = card.querySelector('.store-card-btn');
            if (btn && !app.installed) {
                btn.addEventListener('click', () => {
                    installApp(app, btn);
                });
            }

            appsList.appendChild(card);
        });
    }

    function installApp(app, buttonElement) {
        buttonElement.disabled = true;
        buttonElement.textContent = 'Installing...';
        buttonElement.style.backgroundColor = 'var(--color-accent-dim)';
        buttonElement.style.color = 'var(--color-topbar-text-muted)';

        // Simulate compiling/installing package (like yay / pacman)
        setTimeout(() => {
            app.installed = true;
            buttonElement.className = 'store-card-btn installed';
            buttonElement.textContent = 'Installed';
            buttonElement.disabled = false;
            buttonElement.style.backgroundColor = '';
            buttonElement.style.color = '';

            // Notify Launchpad App Drawer that a new app has been installed
            const installEvent = new CustomEvent('app-installed', {
                detail: {
                    id: app.id,
                    name: app.name,
                    icon: app.icon,
                    action: () => alert(`Running installed program: ${app.name}`)
                }
            });
            document.dispatchEvent(installEvent);

            if (window.showNotification) {
                window.showNotification('Software Installed', `${app.name} has been added to your app drawer.`, 'hgi-app-store');
            }

            console.log(`[software] Installed app: ${app.name}`);
        }, 2500);
    }

    // Sidebar navigation clicks
    sidebarItems.forEach(item => {
        item.addEventListener('click', () => {
            const cat = item.getAttribute('data-category');
            if (cat === currentCategory) return;

            sidebarItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            currentCategory = cat;
            renderApps();
        });
    });

    // Search input
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value;
            renderApps();
        });
    }

    // Expose installer API globally for terminal pacman command
    window.SoftwareCenter = {
        installApp: (appId, callback) => {
            const app = appsDb.find(a => a.id === appId);
            if (!app) {
                if (callback) callback(false);
                return;
            }
            if (app.installed) {
                if (callback) callback(true);
                return;
            }
            
            // Find button element in the store UI if it is currently rendered
            let btn = null;
            if (appsList) {
                btn = appsList.querySelector(`.store-card-btn[data-id="${appId}"]`);
            }
            
            // If button exists in UI, call the installApp helper
            if (btn) {
                installApp(app, btn);
                // Call callback after 2.5 seconds (installation delay)
                setTimeout(() => {
                    if (callback) callback(true);
                }, 2550);
            } else {
                // Background install (when Store window is not active or rendered)
                app.installed = true;
                
                // Notify Launchpad App Drawer
                const installEvent = new CustomEvent('app-installed', {
                    detail: {
                        id: app.id,
                        name: app.name,
                        icon: app.icon,
                        action: () => alert(`Running installed program: ${app.name}`)
                    }
                });
                document.dispatchEvent(installEvent);

                if (window.showNotification) {
                    window.showNotification('Software Installed', `${app.name} has been added to your app drawer.`, 'hgi-app-store');
                }

                console.log(`[software] Installed app (background): ${app.name}`);
                if (callback) callback(true);
            }
        }
    };

    // Initial load
    renderApps();
}

