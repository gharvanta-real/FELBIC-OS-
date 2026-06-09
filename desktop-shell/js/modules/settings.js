/* FELBIC OS — Settings Module */

export function initSettings() {
    console.log('[felbicos] Initializing Settings Module...');

    // Settings sidebar uses .app-sidebar-item[data-tab] (not settings-sidebar-item)
    const sidebarItems = document.querySelectorAll('.settings-sidebar-list .app-sidebar-item[data-tab]');
    const panes = document.querySelectorAll('.settings-tab-pane');

    // ── 1. Tab Switching ──
    sidebarItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetTab = item.getAttribute('data-tab');
            
            sidebarItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            panes.forEach(pane => {
                pane.style.display = pane.id === `pane-${targetTab}` ? 'block' : 'none';
            });
        });
    });

    // ── 2. Wi-Fi Simulated List ──
    const wifiToggle = document.getElementById('settings-wifi-toggle');
    const wifiList = document.getElementById('wifi-networks-list');
    const ccWifiSub = document.querySelector('#toggle-wifi .cc-toggle-sub');

    const networks = [
        { name: 'FELBIC_5G', status: 'Connected', secure: true, strength: '90%' },
        { name: 'Arch_Hotspot_Secure', status: 'Available', secure: true, strength: '75%' },
        { name: 'AirPort_Public_Free', status: 'Available', secure: false, strength: '60%' },
        { name: 'Home_Fiber_Line', status: 'Available', secure: true, strength: '85%' }
    ];

    function renderWifi() {
        wifiList.innerHTML = '';
        if (!wifiToggle.checked) {
            wifiList.innerHTML = `<div class="settings-row" style="color: var(--color-topbar-text-muted); font-style: italic;">Wi-Fi is turned off</div>`;
            if (ccWifiSub) ccWifiSub.textContent = 'Off';
            return;
        }

        if (ccWifiSub) ccWifiSub.textContent = 'Connected';

        networks.forEach(net => {
            const row = document.createElement('div');
            row.className = 'settings-row';
            row.style.cursor = 'pointer';
            row.innerHTML = `
                <div style="display:flex; flex-direction:column;">
                    <span class="row-label">${net.name}</span>
                    <span style="font-size:10px; color:var(--color-topbar-text-muted);">${net.status === 'Connected' ? 'Connected (Active)' : 'Secured (WPA3)'}</span>
                </div>
                <div style="display:flex; align-items:center; gap:8px;">
                    <span style="font-size:10px; color:var(--color-topbar-text-muted);">${net.strength}</span>
                    <span>${net.secure ? '🔒' : '🔓'}</span>
                </div>
            `;
            row.addEventListener('click', async () => {
                if (net.status === 'Connected') {
                    net.status = 'Available';
                    if (window.showNotification) {
                        window.showNotification('Wi-Fi Disconnected', `Disconnected from ${net.name}`, 'hgi-wifi-01');
                    }
                } else {
                    if (net.secure) {
                        let pwd = '';
                        if (window.showDialog && window.showDialog.prompt) {
                            pwd = await window.showDialog.prompt(`Enter password for "${net.name}":`, '', 'Wi-Fi Password');
                        } else {
                            pwd = prompt(`Enter password for "${net.name}":`);
                        }
                        if (pwd === null || pwd === '') return;
                    }
                    networks.forEach(n => n.status = 'Available');
                    net.status = 'Connected';
                    if (window.showNotification) {
                        window.showNotification('Wi-Fi Connected', `Connected to ${net.name}`, 'hgi-wifi-01');
                    }
                }
                renderWifi();
            });
            wifiList.appendChild(row);
        });
    }

    if (wifiToggle) {
        wifiToggle.addEventListener('change', renderWifi);
        renderWifi();
    }

    // ── 3. Bluetooth Simulated List ──
    const bluetoothToggle = document.getElementById('settings-bluetooth-toggle');
    const bluetoothList = document.getElementById('bluetooth-devices-list');
    const ccBtSub = document.querySelector('#toggle-bluetooth .cc-toggle-sub');

    const btDevices = [
        { name: 'Keychron K2 Keyboard', status: 'Connected' },
        { name: 'Logitech MX Master 3S', status: 'Connected' },
        { name: 'Beats Studio Pro Headphones', status: 'Not Connected' }
    ];
    const availableDevices = [
        { name: 'Sony WH-1000XM4', status: 'Ready to Pair' },
        { name: 'Bose QC45', status: 'Ready to Pair' }
    ];
    let isScanning = false;
    let scanCompleted = false;

    function renderBluetooth() {
        bluetoothList.innerHTML = '';
        if (!bluetoothToggle.checked) {
            bluetoothList.innerHTML = `<div class="settings-row" style="color: var(--color-topbar-text-muted); font-style: italic;">Bluetooth is turned off</div>`;
            if (ccBtSub) ccBtSub.textContent = 'Off';
            return;
        }

        if (ccBtSub) ccBtSub.textContent = 'On';

        // Render My Devices
        const myDevicesHeader = document.createElement('div');
        myDevicesHeader.className = 'settings-section-title';
        myDevicesHeader.textContent = 'My Devices';
        myDevicesHeader.style.marginTop = '10px';
        bluetoothList.appendChild(myDevicesHeader);

        const myDevicesGroup = document.createElement('div');
        myDevicesGroup.className = 'settings-row-group';
        bluetoothList.appendChild(myDevicesGroup);

        btDevices.forEach(dev => {
            const row = document.createElement('div');
            row.className = 'settings-row';
            row.style.cursor = 'pointer';
            row.innerHTML = `
                <span class="row-label">${dev.name}</span>
                <span style="font-size:10px; color: ${dev.status === 'Connected' ? 'var(--color-success)' : 'var(--color-topbar-text-muted)'};">${dev.status}</span>
            `;
            row.addEventListener('click', () => {
                if (dev.status === 'Connected') {
                    dev.status = 'Not Connected';
                    if (window.showNotification) {
                        window.showNotification('Bluetooth Disconnected', `Disconnected from ${dev.name}`, 'hgi-bluetooth');
                    }
                } else {
                    dev.status = 'Connected';
                    if (window.showNotification) {
                        window.showNotification('Bluetooth Connected', `Connected to ${dev.name}`, 'hgi-bluetooth');
                    }
                }
                renderBluetooth();
            });
            myDevicesGroup.appendChild(row);
        });

        // Scan Container
        const scanContainer = document.createElement('div');
        scanContainer.style.marginTop = '20px';
        scanContainer.style.display = 'flex';
        scanContainer.style.flexDirection = 'column';
        scanContainer.style.gap = '10px';
        bluetoothList.appendChild(scanContainer);

        const scanBtn = document.createElement('button');
        scanBtn.className = 'settings-select';
        scanBtn.style.alignSelf = 'flex-start';
        scanBtn.textContent = isScanning ? 'Scanning...' : 'Scan for Devices';
        scanBtn.disabled = isScanning;
        scanContainer.appendChild(scanBtn);

        scanBtn.addEventListener('click', () => {
            isScanning = true;
            scanCompleted = false;
            renderBluetooth();

            setTimeout(() => {
                isScanning = false;
                scanCompleted = true;
                const devNames = ['Sony WH-1000XM4', 'Bose QC45', 'Apple AirPods Max'];
                devNames.forEach(name => {
                    if (!btDevices.some(d => d.name === name) && !availableDevices.some(d => d.name === name)) {
                        availableDevices.push({ name, status: 'Ready to Pair' });
                    }
                });
                renderBluetooth();
                if (window.showNotification) {
                    window.showNotification('Bluetooth Scan', 'Scan complete. New devices found.', 'hgi-bluetooth');
                }
            }, 1500);
        });

        if (isScanning) {
            const scanningHint = document.createElement('div');
            scanningHint.style.fontSize = '11px';
            scanningHint.style.color = 'var(--text-muted)';
            scanningHint.style.fontStyle = 'italic';
            scanningHint.textContent = 'Searching for active accessories nearby...';
            scanContainer.appendChild(scanningHint);
        }

        if (scanCompleted && availableDevices.length > 0) {
            const availableHeader = document.createElement('div');
            availableHeader.className = 'settings-section-title';
            availableHeader.textContent = 'Other Devices';
            scanContainer.appendChild(availableHeader);

            const availableGroup = document.createElement('div');
            availableGroup.className = 'settings-row-group';
            scanContainer.appendChild(availableGroup);

            availableDevices.forEach((dev, index) => {
                const row = document.createElement('div');
                row.className = 'settings-row';
                row.style.cursor = 'pointer';
                row.innerHTML = `
                    <span class="row-label">${dev.name}</span>
                    <span style="font-size:10px; color: var(--color-accent); font-weight:600;">Pair Device</span>
                `;
                row.addEventListener('click', () => {
                    btDevices.push({ name: dev.name, status: 'Connected' });
                    availableDevices.splice(index, 1);
                    if (window.showNotification) {
                        window.showNotification('Bluetooth Paired', `Successfully paired with ${dev.name}`, 'hgi-bluetooth');
                    }
                    renderBluetooth();
                });
                availableGroup.appendChild(row);
            });
        }
    }

    if (bluetoothToggle) {
        bluetoothToggle.addEventListener('change', renderBluetooth);
        renderBluetooth();
    }

    // ── 4. Sound Control Sync & Mic Meter Animation ──
    const volSlider = document.getElementById('settings-sound-volume');
    const ccVolSlider = document.getElementById('volume-slider');
    const volValText = document.getElementById('sound-vol-val');
    const micSlider = document.getElementById('settings-sound-input');
    const micValText = document.getElementById('sound-input-val');
    const micMeterBar = document.getElementById('mic-meter-bar');

    function syncVolume(val) {
        if (volSlider) volSlider.value = val;
        if (ccVolSlider) ccVolSlider.value = val;
        if (volValText) volValText.textContent = `${val}%`;
    }

    if (volSlider) {
        volSlider.addEventListener('input', (e) => syncVolume(e.target.value));
    }
    if (ccVolSlider) {
        ccVolSlider.addEventListener('input', (e) => syncVolume(e.target.value));
    }

    if (micSlider) {
        micSlider.addEventListener('input', (e) => {
            if (micValText) micValText.textContent = `${e.target.value}%`;
        });
    }

    // Mic meter bounce simulation
    setInterval(() => {
        if (!micSlider || !micMeterBar) return;
        const currentGain = parseInt(micSlider.value) / 100;
        // Generate random wave level relative to microphone volume setting
        const randomLevel = Math.max(10, Math.floor(Math.random() * currentGain * 100));
        micMeterBar.style.width = `${randomLevel}%`;
    }, 120);

    // ── 5. Displays Settings & Night Light Warmth Filter ──
    const brightSlider = document.getElementById('settings-displays-brightness');
    const ccBrightSlider = document.getElementById('brightness-slider');
    const brightValText = document.getElementById('displays-bright-val');
    const nightToggle = document.getElementById('settings-nightlight-toggle');
    const nightTempRow = document.getElementById('nightlight-temp-row');
    const nightTempSlider = document.getElementById('settings-nightlight-temp');

    function syncBrightness(val) {
        if (brightSlider) brightSlider.value = val;
        if (ccBrightSlider) ccBrightSlider.value = val;
        if (brightValText) brightValText.textContent = `${val}%`;
        
        // Simulating display dimming layer
        const brightnessPercentage = 0.3 + (val / 100) * 0.7; // clamp to 30%-100% brightness
        document.body.style.filter = `brightness(${brightnessPercentage})`;
        updateDisplayFilters();
    }

    function updateDisplayFilters() {
        // Combines brightness and Night Light color filters
        const brightnessValue = brightSlider ? 0.3 + (brightSlider.value / 100) * 0.7 : 1;
        const hasNightLight = nightToggle && nightToggle.checked;
        const warmthValue = hasNightLight ? (nightTempSlider ? nightTempSlider.value / 250 : 0.2) : 0;
        
        document.body.style.filter = `brightness(${brightnessValue}) sepia(${warmthValue})`;
    }

    if (brightSlider) {
        brightSlider.addEventListener('input', (e) => syncBrightness(e.target.value));
    }
    if (ccBrightSlider) {
        ccBrightSlider.addEventListener('input', (e) => syncBrightness(e.target.value));
    }

    if (nightToggle) {
        nightToggle.addEventListener('change', () => {
            const isActive = nightToggle.checked;
            if (nightTempRow) {
                nightTempRow.style.opacity = isActive ? '1' : '0.5';
                nightTempRow.style.pointerEvents = isActive ? 'all' : 'none';
            }
            updateDisplayFilters();
        });
    }

    if (nightTempSlider) {
        nightTempSlider.addEventListener('input', updateDisplayFilters);
    }

    // ── 5b. Notifications & Do Not Disturb ──
    const dndToggle = document.getElementById('settings-dnd-toggle');
    if (dndToggle) {
        dndToggle.addEventListener('change', () => {
            const status = dndToggle.checked ? 'Enabled' : 'Disabled';
            if (window.showNotification) {
                window.showNotification('Do Not Disturb', `DND is now ${status}`, 'hgi-notification-01');
            }
            document.body.classList.toggle('dnd-active', dndToggle.checked);
        });
    }

    // ── 5c. Power & Battery ──
    const lowPowerToggle = document.getElementById('settings-low-power');
    if (lowPowerToggle) {
        lowPowerToggle.addEventListener('change', () => {
            if (lowPowerToggle.checked) {
                document.body.style.setProperty('--transition-fast', '0.2s'); // slow down for "efficiency"
                if (window.showNotification) {
                    window.showNotification('Low Power Mode', 'Battery saving active. Performance may be reduced.', 'hgi-battery-charging-01');
                }
            } else {
                document.body.style.removeProperty('--transition-fast');
            }
        });
    }

    // ── 6. Wallpaper Selection Live Update ──
    const targetSelect = document.getElementById('wallpaper-target-select');
    const uploadBtn = document.getElementById('wallpaper-upload-btn');
    const uploadInput = document.getElementById('wallpaper-upload-input');
    const activeHomeName = document.getElementById('active-wallpaper-home-name');
    const activeLockName = document.getElementById('active-wallpaper-lock-name');
    const autoSwitchToggle = document.getElementById('wallpaper-auto-switch');
    const themePreviewsContainer = document.getElementById('theme-aware-previews-container');

    // Update active indicators from localStorage on settings load
    function updateActiveWallpaperLabels() {
        if (activeHomeName) {
            activeHomeName.textContent = localStorage.getItem('auraos-wallpaper-home-name') || 'Default Slate';
        }
        if (activeLockName) {
            activeLockName.textContent = localStorage.getItem('auraos-wallpaper-lock-name') || 'Default Slate';
        }
    }
    updateActiveWallpaperLabels();

    function updateThemePreviewBoxes() {
        const lightPreview = document.getElementById('wallpaper-light-preview');
        const darkPreview = document.getElementById('wallpaper-dark-preview');
        
        const savedLight = localStorage.getItem('auraos-wallpaper-home-light') || 'var(--gradient-wallpaper-default)';
        const savedDark = localStorage.getItem('auraos-wallpaper-home-dark') || 'var(--gradient-wallpaper-aurora)';
        
        if (lightPreview) lightPreview.style.background = savedLight;
        if (darkPreview) darkPreview.style.background = savedDark;
    }
    updateThemePreviewBoxes();

    // Initialize Auto-Switch checkbox and container display
    if (autoSwitchToggle) {
        const autoSwitch = localStorage.getItem('auraos-wallpaper-auto-switch') === 'true';
        autoSwitchToggle.checked = autoSwitch;
        if (themePreviewsContainer) {
            themePreviewsContainer.style.display = autoSwitch ? 'block' : 'none';
        }

        autoSwitchToggle.addEventListener('change', () => {
            const enabled = autoSwitchToggle.checked;
            localStorage.setItem('auraos-wallpaper-auto-switch', enabled ? 'true' : 'false');
            if (themePreviewsContainer) {
                themePreviewsContainer.style.display = enabled ? 'block' : 'none';
            }
            if (enabled) {
                applyThemeWallpaper();
            }
        });
    }

    function applyThemeWallpaper() {
        const autoSwitch = localStorage.getItem('auraos-wallpaper-auto-switch') === 'true';
        if (!autoSwitch) return;

        const isLight = document.body.classList.contains('light-theme');
        const themeSuffix = isLight ? '-light' : '-dark';
        
        const homeBg = localStorage.getItem('auraos-wallpaper-home' + themeSuffix) || 
                       (isLight ? 'var(--gradient-wallpaper-default)' : 'var(--gradient-wallpaper-aurora)');
        const homeName = localStorage.getItem('auraos-wallpaper-home' + themeSuffix + '-name') || 
                       (isLight ? 'Default Slate' : 'Aurora Glow');
                       
        const lockBg = localStorage.getItem('auraos-wallpaper-lock' + themeSuffix) || 
                       (isLight ? 'var(--gradient-wallpaper-default)' : 'var(--gradient-wallpaper-aurora)');
        const lockName = localStorage.getItem('auraos-wallpaper-lock' + themeSuffix + '-name') || 
                       (isLight ? 'Default Slate' : 'Aurora Glow');

        if (window.setWallpaper) {
            window.setWallpaper(homeBg, 'home');
            window.setWallpaper(lockBg, 'lock');
        }
        
        localStorage.setItem('auraos-wallpaper-home', homeBg);
        localStorage.setItem('auraos-wallpaper-home-name', homeName);
        localStorage.setItem('auraos-wallpaper-lock', lockBg);
        localStorage.setItem('auraos-wallpaper-lock-name', lockName);
        
        updateActiveWallpaperLabels();
        
        const wallThumbs = document.querySelectorAll('.wallpaper-thumb');
        wallThumbs.forEach(thumb => {
            const label = thumb.querySelector('.wallpaper-label')?.textContent;
            if (label && label === homeName) {
                wallThumbs.forEach(t => t.classList.remove('active'));
                thumb.classList.add('active');
            }
        });
    }

    // Observer for body theme changes to auto-switch wallpaper
    const themeObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.attributeName === 'class') {
                const autoSwitch = localStorage.getItem('auraos-wallpaper-auto-switch') === 'true';
                if (autoSwitch) {
                    applyThemeWallpaper();
                }
                
                // Keep auraos-theme in sync
                const isLight = document.body.classList.contains('light-theme');
                const activeTheme = isLight ? 'light' : 'dark';
                if (localStorage.getItem('auraos-theme') !== activeTheme) {
                    localStorage.setItem('auraos-theme', activeTheme);
                    
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
                }
            }
        });
    });
    themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });

    // Helper to apply and save
    function applyAndPersistWallpaper(bgStyle, name, target) {
        const autoSwitch = localStorage.getItem('auraos-wallpaper-auto-switch') === 'true';
        const isLight = document.body.classList.contains('light-theme');
        const themeSuffix = isLight ? '-light' : '-dark';

        if (target === 'both' || target === 'home') {
            localStorage.setItem('auraos-wallpaper-home', bgStyle);
            localStorage.setItem('auraos-wallpaper-home-name', name);
            if (autoSwitch) {
                localStorage.setItem('auraos-wallpaper-home' + themeSuffix, bgStyle);
                localStorage.setItem('auraos-wallpaper-home' + themeSuffix + '-name', name);
            }
            if (window.setWallpaper) {
                window.setWallpaper(bgStyle, 'home');
            }
        }
        if (target === 'both' || target === 'lock') {
            localStorage.setItem('auraos-wallpaper-lock', bgStyle);
            localStorage.setItem('auraos-wallpaper-lock-name', name);
            if (autoSwitch) {
                localStorage.setItem('auraos-wallpaper-lock' + themeSuffix, bgStyle);
                localStorage.setItem('auraos-wallpaper-lock' + themeSuffix + '-name', name);
            }
            if (window.setWallpaper) {
                window.setWallpaper(bgStyle, 'lock');
            }
        }
        updateThemePreviewBoxes();
        updateActiveWallpaperLabels();
        
        // Highlight active thumbnail if matches preset
        const wallThumbs = document.querySelectorAll('.wallpaper-thumb');
        wallThumbs.forEach(thumb => {
            const label = thumb.querySelector('.wallpaper-label')?.textContent;
            if (label && label === name) {
                wallThumbs.forEach(t => t.classList.remove('active'));
                thumb.classList.add('active');
            }
        });
    }

    // Preset selection click
    const wallThumbs = document.querySelectorAll('.wallpaper-thumb');
    wallThumbs.forEach(thumb => {
        thumb.addEventListener('click', () => {
            const target = targetSelect ? targetSelect.value : 'both';
            const label = thumb.querySelector('.wallpaper-label')?.textContent || 'Preset';
            const computedBg = getComputedStyle(thumb).background;
            
            applyAndPersistWallpaper(computedBg, label, target);
        });
    });

    // Upload box click triggers file input
    if (uploadBtn && uploadInput) {
        uploadBtn.addEventListener('click', () => {
            uploadInput.click();
        });

        uploadInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const target = targetSelect ? targetSelect.value : 'both';
            const reader = new FileReader();
            
            reader.onload = function(event) {
                const img = new Image();
                img.onload = function() {
                    // Compress to max 1920x1080 to prevent QuotaExceededError in localStorage
                    const maxW = 1920;
                    const maxH = 1080;
                    let width = img.width;
                    let height = img.height;
                    
                    if (width > maxW || height > maxH) {
                        if (width / height > maxW / maxH) {
                            height = Math.round(height * (maxW / width));
                            width = maxW;
                        } else {
                            width = Math.round(width * (maxH / height));
                            height = maxH;
                        }
                    }
                    
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    // Convert to optimized JPEG (quality 0.8)
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                    const bgStyle = `url("${dataUrl}")`;
                    
                    applyAndPersistWallpaper(bgStyle, 'Custom Image', target);
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    // ── 7. Theme Accent Color Selection ──
    const accentDots = document.querySelectorAll('.accent-dot');
    accentDots.forEach(dot => {
        dot.addEventListener('click', () => {
            accentDots.forEach(d => d.classList.remove('active'));
            dot.classList.add('active');

            const selectedColor = dot.getAttribute('data-color');
            let hexColor = '#ffffff';

            switch (selectedColor) {
                case 'blue': hexColor = '#4f7cff'; break;
                case 'navy': hexColor = '#20293a'; break;
                case 'graphite': hexColor = '#475569'; break;
                case 'green': hexColor = '#10b981'; break;
                case 'amber': hexColor = '#f59e0b'; break;
                default: hexColor = '#f4f6fb';
            }

            document.documentElement.style.setProperty('--color-accent', hexColor);
            
            // Re-render wallpaper thumbnails and active selectors accordingly
            console.log(`[settings] Updated theme primary accent to: ${hexColor}`);
        });
    });

    // ── 8. Settings Keyword Search ──
    const searchInput = document.getElementById('settings-search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            if (query === '') {
                sidebarItems.forEach(i => i.style.display = 'flex');
                return;
            }

            sidebarItems.forEach(item => {
                // Get text from the last span child (label)
                const spans = item.querySelectorAll('span');
                const label = spans[spans.length - 1]?.textContent?.toLowerCase() || '';
                item.style.display = label.includes(query) ? 'flex' : 'none';
            });
        });
    }

    // ── Theme Card Click Handlers ──
    const btnDark  = document.getElementById('theme-btn-dark');
    const btnLight = document.getElementById('theme-btn-light');
    // Keep legacy references if old buttons exist
    const btnMonochrome = document.getElementById('theme-btn-monochrome');
    const btnScientific = document.getElementById('theme-btn-scientific');

    const allThemeBtns = [btnDark, btnLight, btnMonochrome, btnScientific].filter(Boolean);

    function clearThemes() {
        document.body.classList.remove('light-theme', 'scientific-theme', 'monochrome-theme');
        allThemeBtns.forEach(btn => btn?.classList.remove('active'));
    }

    if (btnDark) {
        btnDark.addEventListener('click', () => {
            clearThemes();
            btnDark.classList.add('active');
            localStorage.setItem('auraos-theme', 'dark');
        });
    }

    if (btnLight) {
        btnLight.addEventListener('click', () => {
            clearThemes();
            document.body.classList.add('light-theme');
            btnLight.classList.add('active');
            localStorage.setItem('auraos-theme', 'light');
        });
    }

    if (btnMonochrome) {
        btnMonochrome.addEventListener('click', () => {
            clearThemes();
            document.body.classList.add('monochrome-theme');
            btnMonochrome.classList.add('active');
            localStorage.setItem('auraos-theme', 'monochrome');
        });
    }

    if (btnScientific) {
        btnScientific.addEventListener('click', () => {
            clearThemes();
            document.body.classList.add('scientific-theme');
            btnScientific.classList.add('active');
            localStorage.setItem('auraos-theme', 'scientific');
        });
    }

    // Auto-load saved theme
    const savedTheme = localStorage.getItem('auraos-theme') || localStorage.getItem('felbicos-theme') || 'light';
    if      (savedTheme === 'light')      btnLight?.click();
    else if (savedTheme === 'monochrome') btnMonochrome?.click();
    else if (savedTheme === 'scientific') btnScientific?.click();
    else                                  btnDark?.click();


    // ── 9. Display Scale Adjustment ──
    const displaysScale = document.getElementById('settings-displays-scale');
    if (displaysScale) {
        displaysScale.addEventListener('change', (e) => {
            const scale = e.target.value;
            document.documentElement.style.setProperty('--workspace-scale', scale);
            // Handle preset scaling options for window container transform
            const mainWorkspaces = document.querySelectorAll('.workspace-container');
            mainWorkspaces.forEach(container => {
                container.style.transform = `scale(${scale})`;
                container.style.transformOrigin = 'top left';
                container.style.width = `${100 / scale}%`;
                container.style.height = `${100 / scale}%`;
            });
            console.log(`[settings] Set workspace scale to: ${scale}`);
        });
        // Set initial scale value
        document.documentElement.style.setProperty('--workspace-scale', displaysScale.value);
    }

    // ── 10. General System Specifications ──
    const btnReset = document.querySelector('#pane-general .settings-row:last-child');
    if (btnReset) {
        btnReset.addEventListener('click', async () => {
            if (window.showDialog && window.showDialog.confirm) {
                const confirmed = await window.showDialog.confirm('Are you sure you want to reset all settings? This will revert the OS to factory defaults.', 'System Reset');
                if (confirmed) {
                    location.reload();
                }
            }
        });
    }

    // ── 10b. Users & Password Logic ──
    const btnChangePwd = document.querySelector('#pane-users .monitor-kill-btn');
    if (btnChangePwd) {
        btnChangePwd.addEventListener('click', async () => {
            if (window.showDialog && window.showDialog.prompt) {
                const newPwd = await window.showDialog.prompt('Enter new password for Administrator:', '', 'Change Password');
                if (newPwd) {
                    window.showNotification('Security', 'Password updated successfully.', 'hgi-security-check');
                }
            }
        });
    }

    const aboutUa = document.getElementById('about-val-ua');
    const aboutRes = document.getElementById('about-val-resolution');
    const aboutCores = document.getElementById('about-val-cores');
    const aboutUptime = document.getElementById('about-val-uptime');

    if (aboutUa) {
        aboutUa.textContent = navigator.userAgent;
    }
    if (aboutRes) {
        aboutRes.textContent = `${window.screen.width} x ${window.screen.height}`;
        window.addEventListener('resize', () => {
            aboutRes.textContent = `${window.screen.width} x ${window.screen.height}`;
        });
    }
    if (aboutCores) {
        aboutCores.textContent = `${navigator.hardwareConcurrency || 'Unknown'} Logical Threads`;
    }
    if (aboutUptime) {
        const startTime = Date.now();
        setInterval(() => {
            const diffMs = Date.now() - startTime;
            const secs = Math.floor(diffMs / 1000) % 60;
            const mins = Math.floor(diffMs / 60000) % 60;
            const hrs = Math.floor(diffMs / 3600000);
            
            let uptimeStr = '';
            if (hrs > 0) uptimeStr += `${hrs}h `;
            if (mins > 0 || hrs > 0) uptimeStr += `${mins}m `;
            uptimeStr += `${secs}s`;
            
            aboutUptime.textContent = uptimeStr;
        }, 1000);
    }

    // ── 12. VFS Storage Usage Calculation ──
    const storageSidebarItem = document.querySelector('.settings-sidebar-list .app-sidebar-item[data-tab="storage"]');
    
    function getVFSSize() {
        const visited = new Set();
        function calcSize(node) {
            if (!node) return 0;
            if (node.type === 'file') {
                return node.content ? new Blob([node.content]).size : 0;
            }
            if (node.type === 'folder') {
                if (visited.has(node)) return 0;
                visited.add(node);
                let total = 0;
                if (node.children) {
                    for (const key in node.children) {
                        if (['documents', 'downloads', 'pictures', 'desktop', 'music', 'videos', 'aios-drive', 'network'].includes(key)) {
                            continue;
                        }
                        total += calcSize(node.children[key]);
                    }
                }
                return total;
            }
            return 0;
        }
        if (window.VFS && window.VFS.resolvePath) {
            const res = window.VFS.resolvePath('/');
            return res ? calcSize(res.node) : 0;
        }
        return 0;
    }

    const TOTAL_STORAGE = 50 * 1024 * 1024; // 50 MB

    function formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    function updateStorageInfo() {
        const usedBytes = getVFSSize();
        const freeBytes = Math.max(0, TOTAL_STORAGE - usedBytes);
        const usedPct = ((usedBytes / TOTAL_STORAGE) * 100).toFixed(1);

        const storageUsedPct = document.getElementById('storage-used-pct');
        const storageMeterBar = document.getElementById('storage-meter-bar');
        const storageUsedTxt = document.getElementById('storage-used-txt');
        const storageFreeTxt = document.getElementById('storage-free-txt');

        if (storageUsedPct) storageUsedPct.textContent = `${usedPct}%`;
        if (storageMeterBar) storageMeterBar.style.width = `${usedPct}%`;
        if (storageUsedTxt) storageUsedTxt.textContent = `Used: ${formatBytes(usedBytes)}`;
        if (storageFreeTxt) storageFreeTxt.textContent = `Free: ${formatBytes(freeBytes)}`;
    }

    updateStorageInfo();
    document.addEventListener('vfs-updated', updateStorageInfo);
    if (storageSidebarItem) {
        storageSidebarItem.addEventListener('click', updateStorageInfo);
    }

    // ── 11. System Sound Effects Hooks ──
    document.addEventListener('click', (e) => {
        const target = e.target;
        const closeBtn = target.closest('.window-btn.close');
        if (closeBtn) {
            playSound('close');
            return;
        }
        
        const isInteractive = target.closest('button') || 
                              target.closest('.window-btn') || 
                              target.closest('.dock-item') || 
                              target.closest('.settings-sidebar-item') || 
                              target.closest('.finder-sidebar-item') || 
                              target.closest('.store-sidebar-item') || 
                              target.closest('.accent-dot') || 
                              target.closest('.wallpaper-thumb') || 
                              target.closest('.cc-toggle-item') || 
                              target.closest('.cc-power-btn') ||
                              target.closest('.chat-channel');
        
        if (isInteractive) {
            playSound('click');
        }
    });

    function hookNotification() {
        if (window.showNotification) {
            const orig = window.showNotification;
            window.showNotification = function(title, message, icon) {
                orig(title, message, icon);
                playSound('notification');
            };
        } else {
            setTimeout(hookNotification, 100);
        }
    }
    hookNotification();

    function hookOpenWindow() {
        if (window.openWindow) {
            const orig = window.openWindow;
            window.openWindow = function(windowId) {
                const win = document.getElementById(windowId);
                const wasHidden = win && win.style.display === 'none';
                orig(windowId);
                if (wasHidden) {
                    playSound('open');
                }
            };
        } else {
            setTimeout(hookOpenWindow, 100);
        }
    }
    hookOpenWindow();

    // ── 13. Applications Tab Logic ──
    const appsListWrapper = document.getElementById('settings-apps-list-wrapper');
    const filterBtns = document.querySelectorAll('.app-filter-btn');
    let currentAppFilter = 'all';

    function renderSettingsApps() {
        if (!appsListWrapper || !window.AppManager) return;
        appsListWrapper.innerHTML = '';

        const apps = window.AppManager.getApps();
        let list = apps;

        if (currentAppFilter === 'system') {
            list = apps.filter(a => a.type === 'system');
        } else if (currentAppFilter === 'installed') {
            list = apps.filter(a => a.type !== 'system' && a.installed === true);
        } else {
            // 'all': Show system apps AND installed store/custom apps
            list = apps.filter(a => a.type === 'system' || a.installed === true);
        }

        if (list.length === 0) {
            appsListWrapper.innerHTML = `<div class="settings-row" style="color: var(--color-topbar-text-muted); font-style: italic; justify-content: center; width: 100%; text-align: center; padding: var(--space-4) 0;">No applications found</div>`;
            return;
        }

        list.forEach(app => {
            const item = document.createElement('div');
            item.className = `app-list-item ${app.disabled ? 'app-disabled' : ''}`;
            
            const isUninstallable = app.type !== 'system';
            
            item.innerHTML = `
                <div class="app-item-info-wrapper">
                    <div class="app-item-icon-box">
                        ${app.icon}
                    </div>
                    <div class="app-item-details">
                        <span class="app-item-name">${app.name}</span>
                        <div class="app-item-meta">
                            <span class="app-item-type-badge ${app.type}">${app.type === 'system' ? 'System' : 'Installed'}</span>
                            <span>•</span>
                            <span>${app.version || '1.0.0'}</span>
                            <span>•</span>
                            <span>${app.size || 'N/A'}</span>
                        </div>
                    </div>
                </div>
                <div class="app-item-actions">
                    <label class="switch-container" title="${app.disabled ? 'Enable application' : 'Disable application'}">
                        <input type="checkbox" class="app-toggle-disable" data-id="${app.id}" ${!app.disabled ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                    </label>
                    ${isUninstallable ? `
                        <button class="monitor-kill-btn app-uninstall-btn" data-id="${app.id}" style="padding: 4px 8px; border-radius: var(--radius-xs); background-color: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); font-size: 11px; cursor: pointer; height: 24px; display: flex; align-items: center; margin: 0;">
                            Uninstall
                        </button>
                    ` : ''}
                </div>
            `;

            // Disable toggle listener
            const toggle = item.querySelector('.app-toggle-disable');
            toggle.addEventListener('change', () => {
                window.AppManager.toggleAppDisabled(app.id);
                renderSettingsApps();
                if (window.showNotification) {
                    const status = app.disabled ? 'Disabled' : 'Enabled';
                    window.showNotification('Applications', `"${app.name}" is now ${status}`, 'hgi-settings-01');
                }
            });

            // Uninstall button listener
            if (isUninstallable) {
                const uninstallBtn = item.querySelector('.app-uninstall-btn');
                uninstallBtn.addEventListener('click', async () => {
                    let confirmed = false;
                    if (window.showDialog && window.showDialog.confirm) {
                        confirmed = await window.showDialog.confirm(`Are you sure you want to completely uninstall "${app.name}"?`, 'Confirm Uninstall');
                    } else {
                        confirmed = confirm(`Are you sure you want to uninstall "${app.name}"?`);
                    }

                    if (confirmed) {
                        window.AppManager.uninstallApp(app.id);
                        if (window.showNotification) {
                            window.showNotification('Application Uninstalled', `"${app.name}" has been removed.`, 'hgi-delete-02');
                        }
                    }
                });
            }

            appsListWrapper.appendChild(item);
        });
    }

    // Filter Buttons Clicks
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentAppFilter = btn.getAttribute('data-filter');
            renderSettingsApps();
        });
    });

    // Listen to AppManager events to update the list
    document.addEventListener('app-state-changed', () => {
        renderSettingsApps();
    });
    document.addEventListener('app-uninstalled', () => {
        renderSettingsApps();
    });

    // Initial render when sidebar tab is selected
    const appsSidebarItem = document.querySelector('.settings-sidebar-list .app-sidebar-item[data-tab="applications"]');
    if (appsSidebarItem) {
        appsSidebarItem.addEventListener('click', renderSettingsApps);
    }

    // ── 14. App Installer Wizard Logic ──
    const btnOpenInstaller = document.getElementById('btn-open-installer-file');
    const appFileInput = document.getElementById('settings-app-file-input');
    const installerDialog = document.getElementById('app-installer-dialog');
    const btnInstallerCancel = document.getElementById('btn-installer-cancel');
    const btnInstallerAction = document.getElementById('btn-installer-action');
    const btnInstallerClose = document.getElementById('btn-installer-close');

    // Steps
    const step1 = document.getElementById('installer-step-1');
    const step2 = document.getElementById('installer-step-2');
    const step3 = document.getElementById('installer-step-3');

    // Package details
    const installerAppName = document.getElementById('installer-app-name');
    const installerAppPkg = document.getElementById('installer-app-pkg');
    const installerAppIcon = document.getElementById('installer-app-icon');
    const installerSpecVersion = document.getElementById('installer-spec-version');
    const installerSpecSize = document.getElementById('installer-spec-size');

    // Progress bar
    const progressText = document.getElementById('installer-progress-text');
    const progressBar = document.getElementById('installer-progress-bar');
    const progressPct = document.getElementById('installer-progress-pct');
    const progressBytes = document.getElementById('installer-progress-bytes');

    let loadedPackage = null;

    if (btnOpenInstaller && appFileInput) {
        btnOpenInstaller.addEventListener('click', () => {
            appFileInput.click();
        });

        appFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const extension = file.name.split('.').pop().toLowerCase();
            if (extension !== 'app' && extension !== 'pkg') {
                if (window.showDialog && window.showDialog.alert) {
                    window.showDialog.alert('Invalid app package format. Please select a valid .app or .pkg file installer.', 'Installer Error');
                } else {
                    alert('Invalid app package format. Please select a .app or .pkg file.');
                }
                appFileInput.value = '';
                return;
            }

            // Parse file name to app details
            const baseName = file.name.substring(0, file.name.lastIndexOf('.'));
            // Capitalize each word
            const appName = baseName.split(/[-_]/).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

            // Generate random spec details
            const sizeMB = (Math.random() * 80 + 5).toFixed(1);
            const sizeStr = `${sizeMB} MB`;
            const versionStr = `v${Math.floor(Math.random()*3)+1}.${Math.floor(Math.random()*10)}.${Math.floor(Math.random()*10)}`;

            // Choose icon class based on name keyword
            let iconClass = 'hgi-download-01';
            const nameLower = appName.toLowerCase();
            if (nameLower.includes('spotify') || nameLower.includes('music')) iconClass = 'hgi-music-note-01';
            else if (nameLower.includes('whatsapp') || nameLower.includes('chat') || nameLower.includes('tele')) iconClass = 'hgi-bubble-chat-user';
            else if (nameLower.includes('zoom') || nameLower.includes('meet') || nameLower.includes('video')) iconClass = 'hgi-video-console';
            else if (nameLower.includes('game') || nameLower.includes('steam')) iconClass = 'hgi-game-controller-a';
            else if (nameLower.includes('code') || nameLower.includes('editor')) iconClass = 'hgi-code';
            else if (nameLower.includes('paint') || nameLower.includes('design')) iconClass = 'hgi-brush';
            
            loadedPackage = {
                name: appName,
                pkgName: file.name,
                iconClass,
                version: versionStr,
                size: sizeStr
            };

            // Set UI details
            installerAppName.textContent = appName;
            installerAppPkg.textContent = file.name;
            installerAppIcon.innerHTML = `<i class="hgi-stroke ${iconClass}"></i>`;
            installerSpecVersion.textContent = versionStr;
            installerSpecSize.textContent = sizeStr;

            // Reset wizard steps
            step1.style.display = 'block';
            step2.style.display = 'none';
            step3.style.display = 'none';
            btnInstallerCancel.style.display = 'block';
            btnInstallerAction.style.display = 'block';
            btnInstallerAction.textContent = 'Install App';
            progressBar.style.width = '0%';
            progressPct.textContent = '0%';
            progressBytes.textContent = 'Unpacking...';

            // Show installer modal
            installerDialog.style.display = 'flex';
        });
    }

    function closeInstaller() {
        if (installerDialog) {
            installerDialog.style.display = 'none';
        }
        if (appFileInput) {
            appFileInput.value = '';
        }
        loadedPackage = null;
    }

    if (btnInstallerClose) btnInstallerClose.addEventListener('click', closeInstaller);
    if (btnInstallerCancel) btnInstallerCancel.addEventListener('click', closeInstaller);

    if (btnInstallerAction) {
        btnInstallerAction.addEventListener('click', () => {
            if (btnInstallerAction.textContent === 'Done') {
                closeInstaller();
                return;
            }

            // Start installation animation
            step1.style.display = 'none';
            step2.style.display = 'block';
            btnInstallerCancel.style.display = 'none';
            btnInstallerAction.style.display = 'none';

            let pct = 0;
            const steps = [
                'Unpacking package archives...',
                'Verifying integrity signatures...',
                'Writing binary systems paths...',
                'Creating execution symlinks...',
                'Registering system MIME associations...',
                'Rebuilding launchpad menu grid...',
                'Finalizing installation database...'
            ];

            const interval = setInterval(() => {
                pct += 2;
                progressBar.style.width = `${pct}%`;
                progressPct.textContent = `${pct}%`;

                // Update text description based on percentage
                const textIdx = Math.min(steps.length - 1, Math.floor((pct / 100) * steps.length));
                progressText.textContent = steps[textIdx];
                progressBytes.textContent = `Progress: ${((pct / 100) * parseFloat(loadedPackage.size)).toFixed(1)} / ${loadedPackage.size}`;

                if (pct >= 100) {
                    clearInterval(interval);

                    // Call AppManager to record custom package installation
                    if (window.AppManager && loadedPackage) {
                        window.AppManager.installCustomPackage(
                            loadedPackage.name,
                            loadedPackage.iconClass,
                            loadedPackage.version,
                            loadedPackage.size
                        );
                    }

                    // Success step
                    step2.style.display = 'none';
                    step3.style.display = 'block';
                    btnInstallerAction.style.display = 'block';
                    btnInstallerAction.textContent = 'Done';

                    if (window.showNotification && loadedPackage) {
                        window.showNotification('Application Installed', `"${loadedPackage.name}" was successfully installed.`, 'hgi-security-check');
                    }

                    // Refresh setting apps list
                    renderSettingsApps();
                }
            }, 60);
        });
    }
}


let audioCtx = null;

function playSound(type) {
    const toggle = document.getElementById('settings-sound-effects-toggle');
    if (toggle && !toggle.checked) return;

    try {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }

        const now = audioCtx.currentTime;
        const volVal = document.getElementById('settings-sound-volume');
        const gainLevel = volVal ? (parseInt(volVal.value) / 100) * 0.15 : 0.1;

        if (type === 'click') {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(600, now);
            osc.frequency.exponentialRampToValueAtTime(150, now + 0.08);
            
            gain.gain.setValueAtTime(gainLevel, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
            
            osc.start(now);
            osc.stop(now + 0.08);
        } else if (type === 'close') {
            const notes = [523.25, 392.00, 329.63];
            notes.forEach((freq, idx) => {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now + idx * 0.08);
                
                gain.gain.setValueAtTime(0, now + idx * 0.08);
                gain.gain.linearRampToValueAtTime(gainLevel, now + idx * 0.08 + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.25);
                
                osc.start(now + idx * 0.08);
                osc.stop(now + idx * 0.08 + 0.3);
            });
        } else if (type === 'open') {
            const notes = [329.63, 392.00, 523.25];
            notes.forEach((freq, idx) => {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now + idx * 0.08);
                
                gain.gain.setValueAtTime(0, now + idx * 0.08);
                gain.gain.linearRampToValueAtTime(gainLevel, now + idx * 0.08 + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.25);
                
                osc.start(now + idx * 0.08);
                osc.stop(now + idx * 0.08 + 0.3);
            });
        } else if (type === 'notification') {
            const notes = [523.25, 659.25, 783.99];
            notes.forEach((freq, idx) => {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now + idx * 0.06);
                
                gain.gain.setValueAtTime(0, now + idx * 0.06);
                gain.gain.linearRampToValueAtTime(gainLevel, now + idx * 0.06 + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.3);
                
                osc.start(now + idx * 0.06);
                osc.stop(now + idx * 0.06 + 0.35);
            });
        }
    } catch (err) {
        console.error('[settings] Web Audio API failed to play sound:', err);
    }
}

