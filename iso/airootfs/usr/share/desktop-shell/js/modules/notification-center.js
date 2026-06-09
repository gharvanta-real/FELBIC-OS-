/* ==========================================================================
   FELBIC OS — NOTIFICATION CENTER & WIDGETS MANAGER
   ========================================================================== */

export function initNotificationCenter() {
    console.log('[notification-center] Initializing Notification Center...');

    const ncPanel = document.getElementById('notification-center');
    const ncCloseBtn = document.getElementById('nc-close-btn');
    const clockTrigger = document.getElementById('topbar-clock');
    const bellTrigger = document.getElementById('topbar-bell');
    const clearAllBtn = document.getElementById('nc-clear-all');
    const notificationsList = document.getElementById('nc-notifications-list');
    const widgetsList = document.getElementById('nc-widgets-list');
    const desktopContainer = document.getElementById('desktop-widgets-container');

    if (!ncPanel) return;

    // ── 1. Toggle Drawer Handlers ──
    function toggleDrawer(show) {
        if (show) {
            ncPanel.classList.add('active');
            renderNotifications();
            updateWidgets();
        } else {
            ncPanel.classList.remove('active');
        }
    }

    if (clockTrigger) {
        clockTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const isActive = ncPanel.classList.contains('active');
            toggleDrawer(!isActive);
        });
    }

    if (bellTrigger) {
        bellTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const isActive = ncPanel.classList.contains('active');
            toggleDrawer(!isActive);
        });
    }

    if (ncCloseBtn) {
        ncCloseBtn.addEventListener('click', () => toggleDrawer(false));
    }

    // Close on clicking outside
    document.addEventListener('click', (e) => {
        const isTrigger = (clockTrigger && clockTrigger.contains(e.target)) || 
                          (bellTrigger && bellTrigger.contains(e.target));
        if (ncPanel.classList.contains('active') && !ncPanel.contains(e.target) && !isTrigger) {
            toggleDrawer(false);
        }
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && ncPanel.classList.contains('active')) {
            toggleDrawer(false);
        }
    });

    // ── 2. Notifications History rendering ──
    function renderNotifications() {
        if (!notificationsList) return;
        notificationsList.innerHTML = '';

        const history = JSON.parse(localStorage.getItem('aios_notifications_history') || '[]');

        if (history.length === 0) {
            notificationsList.innerHTML = `
                <div style="font-size: 10px; color: var(--text-muted); text-align: center; padding: 20px 0;">
                    No Notifications
                </div>
            `;
            return;
        }

        // Render most recent first
        [...history].reverse().forEach(notif => {
            const card = document.createElement('div');
            card.className = 'nc-notification-card';
            
            // Format dynamic relative timestamp
            const deltaSec = Math.floor((Date.now() - notif.time) / 1000);
            let timeStr = 'Just now';
            if (deltaSec >= 60 && deltaSec < 3600) {
                timeStr = `${Math.floor(deltaSec / 60)}m ago`;
            } else if (deltaSec >= 3600 && deltaSec < 86400) {
                timeStr = `${Math.floor(deltaSec / 3600)}h ago`;
            } else if (deltaSec >= 86400) {
                timeStr = `${Math.floor(deltaSec / 86400)}d ago`;
            }

            const isEmoji = !notif.icon.startsWith('hgi-');
            const iconHtml = isEmoji 
                ? `<span style="font-size: 14px;">${notif.icon}</span>`
                : `<i class="hgi-stroke ${notif.icon}"></i>`;

            card.innerHTML = `
                <div class="nc-notification-icon">
                    ${iconHtml}
                </div>
                <div class="nc-notification-body">
                    <span class="nc-notification-title">${notif.title}</span>
                    <span class="nc-notification-msg">${notif.message}</span>
                </div>
                <span class="nc-notification-time">${timeStr}</span>
            `;
            
            notificationsList.appendChild(card);
        });
    }

    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', () => {
            localStorage.setItem('aios_notifications_history', '[]');
            renderNotifications();
        });
    }

    // Refresh notification feed dynamically when a new notification is added
    document.addEventListener('notification-added', () => {
        if (ncPanel.classList.contains('active')) {
            renderNotifications();
        }
    });

    // ── 3. Widget Components renderers ──

    // A. Weather Widget renderer
    async function getWeatherData() {
        try {
            // Fetch live data from wttr.in
            const res = await fetch('https://wttr.in/San%20Francisco?format=j1');
            if (!res.ok) throw new Error("wttr.in response error");
            const data = await res.json();
            
            const current = data.current_condition[0];
            const temp = current.temp_C;
            const desc = current.weatherDesc[0].value;
            
            const day = data.weather[0];
            const high = day.maxtempC;
            const low = day.mintempC;
            
            // Build 6 hourly forecast blocks
            const hourly = day.hourly.slice(0, 6).map(h => {
                const hourNum = parseInt(h.time) / 100;
                const ampm = hourNum >= 12 ? 'PM' : 'AM';
                const displayH = hourNum % 12 ? hourNum % 12 : 12;
                return {
                    time: `${displayH} ${ampm}`,
                    temp: `${h.tempC}°`,
                    desc: h.weatherDesc[0].value
                };
            });

            return { temp: `${temp}°`, desc, high, low, hourly };
        } catch (e) {
            // Realistic fallback data matching the uploaded mockup
            const now = new Date();
            const curH = now.getHours();
            const mockHourly = [];
            for (let i = 0; i < 6; i++) {
                const h = (curH + i) % 24;
                const ampm = h >= 12 ? 'PM' : 'AM';
                const displayH = h % 12 ? h % 12 : 12;
                mockHourly.push({
                    time: `${displayH} ${ampm}`,
                    temp: `${16 - Math.round(i * 0.4)}°`,
                    desc: 'Partly Cloudy'
                });
            }
            return {
                temp: '16°',
                desc: 'Partly Cloudy',
                high: '18',
                low: '12',
                hourly: mockHourly
            };
        }
    }

    async function drawWeatherWidget(container) {
        if (!container) return;

        // Render card frame immediately with loader
        let card = container.querySelector('.widget-weather');
        if (!card) {
            card = document.createElement('div');
            card.className = 'widget-card widget-weather';
            container.appendChild(card);
        }

        card.innerHTML = `
            <div class="weather-header">
                <div style="display:flex; flex-direction:column;">
                    <span class="weather-city">San Francisco</span>
                    <span class="weather-temp-large">--°</span>
                    <span class="weather-condition">Loading Weather...</span>
                </div>
                <div class="weather-icon-main"><i class="hgi-stroke hgi-sun-01"></i></div>
            </div>
        `;

        const weather = await getWeatherData();

        // Map condition description to Hugeicons icon
        let iconClass = 'hgi-cloudy-01';
        const d = weather.desc.toLowerCase();
        if (d.includes('sun') || d.includes('clear')) iconClass = 'hgi-sun-01';
        else if (d.includes('rain') || d.includes('shower')) iconClass = 'hgi-rainy-01';
        else if (d.includes('snow') || d.includes('ice')) iconClass = 'hgi-snow-01';
        else if (d.includes('thunder')) iconClass = 'hgi-thunder-01';

        // Render timeline columns HTML
        let hourlyHtml = '';
        weather.hourly.forEach(item => {
            let itemIcon = 'hgi-cloudy-01';
            const descLower = item.desc.toLowerCase();
            if (descLower.includes('sun') || descLower.includes('clear')) itemIcon = 'hgi-sun-01';
            else if (descLower.includes('rain') || descLower.includes('shower')) itemIcon = 'hgi-rainy-01';

            hourlyHtml += `
                <div class="weather-hour-item">
                    <span class="weather-hour-time">${item.time}</span>
                    <span class="weather-hour-icon"><i class="hgi-stroke ${itemIcon}"></i></span>
                    <span class="weather-hour-temp">${item.temp}</span>
                </div>
            `;
        });

        card.innerHTML = `
            <div class="weather-header">
                <div style="display:flex; flex-direction:column;">
                    <span class="weather-city">San Francisco</span>
                    <span class="weather-temp-large">${weather.temp}</span>
                    <span class="weather-condition">${weather.desc}</span>
                    <span class="weather-range">H: ${weather.high}° &nbsp; L: ${weather.low}°</span>
                </div>
                <div class="weather-icon-main"><i class="hgi-stroke ${iconClass}"></i></div>
            </div>
            <div class="weather-hourly">
                ${hourlyHtml}
            </div>
        `;
    }

    // B. Calendar Widget renderer
    function drawCalendarWidget(container) {
        if (!container) return;

        let card = container.querySelector('.widget-calendar');
        if (!card) {
            card = document.createElement('div');
            card.className = 'widget-card widget-calendar';
            container.appendChild(card);
        }

        const now = new Date();
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const currentDayName = days[now.getDay()];
        const currentDayNum = now.getDate();

        // Get today's events from calendar LocalStorage
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(currentDayNum).padStart(2, '0');
        const todayStr = `${now.getFullYear()}-${mm}-${dd}`;

        const calendarEventsStore = JSON.parse(localStorage.getItem('aios_calendar_events') || '{}');
        const todayEventsList = calendarEventsStore[todayStr] || [];

        // Build list elements
        let eventsHtml = '';
        if (todayEventsList.length === 0) {
            eventsHtml = `<div class="cal-widget-no-events">No events scheduled today</div>`;
        } else {
            // Display first 2 events
            todayEventsList.slice(0, 2).forEach(ev => {
                eventsHtml += `
                    <div class="cal-widget-event-item tag-${ev.tag || 'work'}">
                        <span class="cal-widget-event-title">${ev.title}</span>
                        <span class="cal-widget-event-time">${ev.desc || 'All Day'}</span>
                    </div>
                `;
            });
        }

        card.innerHTML = `
            <div class="cal-widget-header">
                <span class="cal-widget-dayname">${currentDayName}</span>
                <div class="cal-widget-daynum">${currentDayNum}</div>
            </div>
            <div class="cal-widget-events">
                ${eventsHtml}
            </div>
        `;
    }

    // C. Resource Monitor Widget renderer
    function drawResourceWidget(container) {
        if (!container) return;

        let card = container.querySelector('.widget-resources');
        if (!card) {
            card = document.createElement('div');
            card.className = 'widget-card widget-resources';
            container.appendChild(card);
        }

        // Setup CPU/RAM values (oscillates with clean math)
        const cpuVal = Math.floor(Math.random() * 18) + 8;
        const ramVal = 54;

        card.innerHTML = `
            <div class="res-widget-title">Activity Monitor</div>
            
            <div class="res-widget-row">
                <div class="res-widget-label-group">
                    <span>CPU usage</span>
                    <span>${cpuVal}%</span>
                </div>
                <div class="res-widget-bar-bg">
                    <div class="res-widget-bar-fill" style="width: ${cpuVal}%"></div>
                </div>
            </div>

            <div class="res-widget-row" style="margin-top: 6px;">
                <div class="res-widget-label-group">
                    <span>RAM occupancy</span>
                    <span>${ramVal}%</span>
                </div>
                <div class="res-widget-bar-bg">
                    <div class="res-widget-bar-fill ram" style="width: ${ramVal}%"></div>
                </div>
            </div>
        `;
    }

    // D. Quick Notepad Widget renderer
    function drawQuickNotesWidget(container) {
        if (!container) return;

        let card = container.querySelector('.widget-quicknotes');
        if (!card) {
            card = document.createElement('div');
            card.className = 'widget-card widget-quicknotes';
            container.appendChild(card);
        }

        const noteKey = 'aios_quick_notes_widget_data';
        const savedText = localStorage.getItem(noteKey) || '';

        card.innerHTML = `
            <div class="qn-widget-header">
                <span class="res-widget-title">Quick Scribble</span>
                <span class="qn-widget-status" id="qn-status-txt">Auto Saved</span>
            </div>
            <textarea class="qn-widget-textarea" id="qn-textarea-widget" placeholder="Jot down a quick thought...">${savedText}</textarea>
        `;

        const textarea = card.querySelector('#qn-textarea-widget');
        const statusTxt = card.querySelector('#qn-status-txt');

        if (textarea && statusTxt) {
            textarea.addEventListener('input', () => {
                localStorage.setItem(noteKey, textarea.value);
                statusTxt.textContent = 'Saving...';
                
                // Clear text status in 1 second
                setTimeout(() => {
                    statusTxt.textContent = 'Auto Saved';
                }, 800);
            });
        }
    }

    // ── 4. Coordinate rendering drawers & desktop panels ──
    async function updateWidgets() {
        // Draw inside Notification Center drawer
        if (widgetsList) {
            widgetsList.innerHTML = '';
            await drawWeatherWidget(widgetsList);
            drawCalendarWidget(widgetsList);
            drawResourceWidget(widgetsList);
            drawQuickNotesWidget(widgetsList);
        }

        // Draw inside Wallpaper background widgets list
        if (desktopContainer) {
            // Render Weather and Calendar on desktop (matching uploaded image layout!)
            await drawWeatherWidget(desktopContainer);
            drawCalendarWidget(desktopContainer);
        }
    }

    // Initial render on boot
    updateWidgets();

    // Set interval to periodically update time-dependent fields (Resource statistics / clock syncs)
    setInterval(() => {
        const ncOpen = ncPanel.classList.contains('active');
        if (ncOpen && widgetsList) {
            drawResourceWidget(widgetsList);
        }
    }, 4000);
}
