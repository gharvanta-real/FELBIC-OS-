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

    function renderBluetooth() {
        bluetoothList.innerHTML = '';
        if (!bluetoothToggle.checked) {
            bluetoothList.innerHTML = `<div class="settings-row" style="color: var(--color-topbar-text-muted); font-style: italic;">Bluetooth is turned off</div>`;
            if (ccBtSub) ccBtSub.textContent = 'Off';
            return;
        }

        if (ccBtSub) ccBtSub.textContent = 'On';

        btDevices.forEach(dev => {
            const row = document.createElement('div');
            row.className = 'settings-row';
            row.style.cursor = 'pointer';
            row.innerHTML = `
                <span class="row-label">${dev.name}</span>
                <span style="font-size:10px; color: ${dev.status === 'Connected' ? 'var(--color-success)' : 'var(--color-topbar-text-muted)'};">${dev.status}</span>
            `;
            bluetoothList.appendChild(row);
        });
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

    // ── 6. Wallpaper Selection Live Update ──
    const wallThumbs = document.querySelectorAll('.wallpaper-thumb');
    wallThumbs.forEach(thumb => {
        thumb.addEventListener('click', () => {
            wallThumbs.forEach(t => t.classList.remove('active'));
            thumb.classList.add('active');

            // Read the computed background from the CSS class (not inline style)
            const computedBg = getComputedStyle(thumb).background;
            if (window.setWallpaper) {
                window.setWallpaper(computedBg);
            }
        });
    });

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
    const btnDark = document.getElementById('theme-btn-dark');
    const btnLight = document.getElementById('theme-btn-light');

    if (btnDark && btnLight) {
        const themeToggleIcon = document.getElementById('theme-toggle-icon');
        btnDark.addEventListener('click', () => {
            document.body.classList.remove('light-theme');
            btnDark.classList.add('active');
            btnLight.classList.remove('active');
            if (themeToggleIcon) {
                themeToggleIcon.className = 'hgi-stroke hgi-sun-01';
            }
        });

        btnLight.addEventListener('click', () => {
            document.body.classList.add('light-theme');
            btnLight.classList.add('active');
            btnDark.classList.remove('active');
            if (themeToggleIcon) {
                themeToggleIcon.className = 'hgi-stroke hgi-moon';
            }
        });
    }

    // ── 9. Display Scale Adjustment ──
    const displaysScale = document.getElementById('settings-displays-scale');
    if (displaysScale) {
        displaysScale.addEventListener('change', (e) => {
            const scale = e.target.value;
            document.documentElement.style.setProperty('--workspace-scale', scale);
            console.log(`[settings] Set workspace scale to: ${scale}`);
        });
        // Set initial scale value
        document.documentElement.style.setProperty('--workspace-scale', displaysScale.value);
    }

    // ── 10. General System Specifications ──
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

