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

    document.addEventListener('click', (e) => {
        const isTrigger = (clockTrigger && clockTrigger.contains(e.target)) || 
                          (bellTrigger && bellTrigger.contains(e.target));
        if (ncPanel.classList.contains('active') && !ncPanel.contains(e.target) && !isTrigger) {
            toggleDrawer(false);
        }
    });

    // ── 2. Notifications History rendering ──
    function renderNotifications() {
        if (!notificationsList) return;
        notificationsList.innerHTML = '';

        const history = JSON.parse(localStorage.getItem('aios_notifications_history') || '[]');

        if (history.length === 0) {
            notificationsList.innerHTML = `<div style="font-size: 10px; color: var(--text-muted); text-align: center; padding: 20px 0;">No Notifications</div>`;
            return;
        }

        [...history].reverse().forEach(notif => {
            const card = document.createElement('div');
            card.className = 'nc-notification-card';
            
            const isEmoji = !notif.icon.startsWith('hgi-');
            const iconHtml = isEmoji ? `<span style="font-size: 14px;">${notif.icon}</span>` : `<i class="hgi-stroke ${notif.icon}"></i>`;

            card.innerHTML = `
                <div class="nc-notification-icon">${iconHtml}</div>
                <div class="nc-notification-body">
                    <span class="nc-notification-title">${notif.title}</span>
                    <span class="nc-notification-msg">${notif.message}</span>
                </div>
            `;
            notificationsList.appendChild(card);
        });
    }

    // ── 3. Widget Components (Safe Injection) ──
    async function drawWeatherWidget(container) {
        if (!container) return;
        let card = container.querySelector('.widget-weather');
        if (!card) {
            card = document.createElement('div');
            card.className = 'widget-card widget-weather';
            container.appendChild(card);
        }
        // Simplified content to prevent injection issues
        card.innerHTML = `<div class="weather-header"><span class="weather-city">San Francisco</span><span class="weather-temp-large">16°</span></div>`;
    }

    function drawCalendarWidget(container) {
        if (!container) return;
        let card = container.querySelector('.widget-calendar');
        if (!card) {
            card = document.createElement('div');
            card.className = 'widget-card widget-calendar';
            container.appendChild(card);
        }
        const d = new Date();
        card.innerHTML = `<div class="cal-widget-header"><span class="cal-widget-dayname">Today</span><div class="cal-widget-daynum">${d.getDate()}</div></div>`;
    }

    function drawResourceWidget(container) {
        if (!container) return;
        let card = container.querySelector('.widget-resources');
        if (!card) {
            card = document.createElement('div');
            card.className = 'widget-card widget-resources';
            container.appendChild(card);
        }
        card.innerHTML = `<div class="res-widget-title">Activity</div><div class="res-widget-bar-bg"><div class="res-widget-bar-fill" style="width: 30%"></div></div>`;
    }

    async function updateWidgets() {
        if (widgetsList) {
            widgetsList.innerHTML = '';
            await drawWeatherWidget(widgetsList);
            drawCalendarWidget(widgetsList);
            drawResourceWidget(widgetsList);
        }
    }
}
