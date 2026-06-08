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

        // Dynamically update the header title
        const storeHeaderTitle = document.querySelector('.store-header h2');
        if (storeHeaderTitle) {
            if (searchQuery) {
                storeHeaderTitle.textContent = `Results for "${searchQuery}"`;
            } else {
                switch (currentCategory) {
                    case 'featured': storeHeaderTitle.textContent = 'Explore'; break;
                    case 'developer': storeHeaderTitle.textContent = 'Develop'; break;
                    case 'graphics': storeHeaderTitle.textContent = 'Create'; break;
                    case 'utilities': storeHeaderTitle.textContent = 'Utilities'; break;
                    default: storeHeaderTitle.textContent = 'Explore';
                }
            }
        }

        // Render Hero Banner for Firefox in the featured / Explore view
        if (currentCategory === 'featured' && !searchQuery) {
            const heroBanner = document.createElement('div');
            heroBanner.className = 'store-hero-banner';
            const firefoxApp = appsDb.find(a => a.id === 'firefox');
            
            heroBanner.innerHTML = `
                <div class="store-hero-content">
                    <span class="store-hero-tag">FEATURED APP</span>
                    <h1 class="store-hero-title">Firefox Browser</h1>
                    <p class="store-hero-desc">Secure, modern web browsing platform with built-in privacy protection.</p>
                    <button class="store-hero-btn ${firefoxApp.installed ? 'installed' : (firefoxApp.isInstalling ? 'installing' : '')}" data-id="firefox" ${firefoxApp.isInstalling ? 'disabled' : ''}>
                        ${firefoxApp.installed ? 'Installed' : (firefoxApp.isInstalling ? `<span class="store-btn-progress-fill" style="width: ${firefoxApp.installProgress}%;"></span><span class="store-btn-text">${Math.floor(firefoxApp.installProgress)}%</span>` : 'GET')}
                    </button>
                </div>
                <div class="store-hero-visual">
                    <i class="hgi-stroke hgi-internet"></i>
                </div>
            `;
            const heroBtn = heroBanner.querySelector('.store-hero-btn');
            if (heroBtn && !firefoxApp.installed && !firefoxApp.isInstalling) {
                heroBtn.addEventListener('click', () => {
                    installApp(firefoxApp);
                });
            }
            appsList.appendChild(heroBanner);
        }

        // Filter apps to show in the grid
        let list = appsDb;
        if (currentCategory === 'featured') {
            // Show all apps except the hero (Firefox) on Explore page
            list = appsDb.filter(app => app.id !== 'firefox');
        } else if (currentCategory !== 'all') {
            list = list.filter(app => app.cat === currentCategory);
        }

        if (searchQuery) {
            list = list.filter(app => 
                app.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                app.desc.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        if (list.length === 0 && (currentCategory !== 'featured' || searchQuery)) {
            const emptyHint = document.createElement('div');
            emptyHint.style.gridColumn = '1/-1';
            emptyHint.style.textAlign = 'center';
            emptyHint.style.color = 'var(--text-muted)';
            emptyHint.style.paddingTop = '40px';
            emptyHint.textContent = 'No software packages found in repository.';
            appsList.appendChild(emptyHint);
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
                <button class="store-card-btn ${app.installed ? 'installed' : (app.isInstalling ? 'installing' : '')}" data-id="${app.id}" ${app.isInstalling ? 'disabled' : ''}>
                    ${app.installed ? 'Installed' : (app.isInstalling ? `<span class="store-btn-progress-fill" style="width: ${app.installProgress}%;"></span><span class="store-btn-text">${Math.floor(app.installProgress)}%</span>` : 'GET')}
                </button>
            `;

            const btn = card.querySelector('.store-card-btn');
            if (btn && !app.installed && !app.isInstalling) {
                btn.addEventListener('click', () => {
                    installApp(app);
                });
            }

            appsList.appendChild(card);
        });
    }

    function installApp(app, callback) {
        if (app.isInstalling) return;

        app.isInstalling = true;
        app.installProgress = 0;

        const intervalTime = 50; // ms
        const totalDuration = 2500; // ms
        const step = (intervalTime / totalDuration) * 100;

        function updateUI() {
            const buttons = document.querySelectorAll(`.store-card-btn[data-id="${app.id}"], .store-hero-btn[data-id="${app.id}"]`);
            buttons.forEach(btn => {
                if (app.installed) {
                    btn.disabled = false;
                    btn.className = btn.classList.contains('store-hero-btn') ? 'store-hero-btn installed' : 'store-card-btn installed';
                    btn.innerHTML = 'Installed';
                } else if (app.isInstalling) {
                    btn.disabled = true;
                    btn.className = btn.classList.contains('store-hero-btn') ? 'store-hero-btn installing' : 'store-card-btn installing';
                    btn.innerHTML = `
                        <span class="store-btn-progress-fill" style="width: ${app.installProgress}%;"></span>
                        <span class="store-btn-text">${Math.floor(app.installProgress)}%</span>
                    `;
                } else {
                    btn.disabled = false;
                    btn.className = btn.classList.contains('store-hero-btn') ? 'store-hero-btn' : 'store-card-btn';
                    btn.innerHTML = 'GET';
                }
            });
        }

        updateUI();

        const interval = setInterval(() => {
            app.installProgress += step;
            if (app.installProgress >= 100) {
                app.installProgress = 100;
                clearInterval(interval);

                app.installed = true;
                app.isInstalling = false;
                
                updateUI();

                // Notify Launchpad App Drawer that a new app has been installed
                const installEvent = new CustomEvent('app-installed', {
                    detail: {
                        id: app.id,
                        name: app.name,
                        icon: app.icon,
                        action: () => showDialog.alert(`Running installed program: ${app.name}`, 'Software Center')
                    }
                });
                document.dispatchEvent(installEvent);

                if (window.showNotification) {
                    window.showNotification('Software Installed', `${app.name} has been added to your app drawer.`, 'hgi-app-store');
                }

                console.log(`[software] Installed app: ${app.name}`);
                if (callback) callback(true);
            } else {
                updateUI();
            }
        }, intervalTime);
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
            
            installApp(app, callback);
        }
    };

    // Initial load
    renderApps();
}
