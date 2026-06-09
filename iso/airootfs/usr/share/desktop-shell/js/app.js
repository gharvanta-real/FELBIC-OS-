import { initClock } from './modules/clock.js';
import { initWeather } from './modules/weather.js';
import { initStats } from './modules/system-stats.js';
import { initSettings } from './modules/settings.js';
import { initAppManager } from './modules/app-manager.js';
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
import { initCalculatorApp } from './modules/apps/calculator-app.js';
import { initCalendarApp } from './modules/apps/calendar-app.js';
import { initNotesApp } from './modules/apps/notes-app.js';
import { initClockApp } from './modules/apps/clock-app.js';
import { initMailApp } from './modules/apps/mail-app.js';
import { initTasksApp } from './modules/apps/tasks-app.js';
import { initAuditLog } from './modules/apps/audit-log.js';
import { initDialog } from './modules/dialog.js';
import { initVFS } from './modules/vfs.js';
import { loadComponents } from './modules/component-loader.js';
import { initTopbarMenus } from './modules/topbar-menus.js';
import { initAIAssistant } from './modules/ai-assistant.js';
import { aisd } from './modules/aisd-client.js';
import { initAgentAPI } from './modules/aios-agent.js';
import { initNotificationCenter } from './modules/notification-center.js';

const APP_ID_MAP = {
    'terminal-window': 'terminal', 'settings-window': 'settings', 'files-window': 'files',
    'browser-window': 'browser', 'store-window': 'software', 'monitor-window': 'monitor',
    'editor-window': 'editor', 'installer-window': 'installer', 'paint-window': 'gimp',
    'media-window': 'vlc', 'chat-window': 'discord', 'calculator-window': 'calculator',
    'calendar-window': 'calendar', 'notes-window': 'notes', 'clock-app-window': 'clock',
    'mail-window': 'mail', 'tasks-window': 'tasks', 'ai-window': 'ai', 'audit-log-window': 'audit'
};

async function init() {
    console.log('[AIOS] Starting system initialization...');
    initAppManager();
    await loadComponents();

    // 1. Initialize core services
    initDialog();
    initVFS();
    initNotifications();
    initWindowManager();
    initDesktop();
    initAesthetics();
    initTopbarMenus();
    initAgentAPI();
    initAIAssistant();
    initNotificationCenter();

    // 2. Initialize system features
    initClock('topbar-clock');
    initWeather();
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

    // 3. Register windows
    Object.keys(APP_ID_MAP).forEach(id => {
        const win = document.getElementById(id);
        if (win) registerWindow(win);
    });

    // 4. Initialize application logic
    initPaintApp();
    initMediaApp();
    initChatApp();
    initCalculatorApp();
    initCalendarApp();
    initNotesApp();
    initClockApp();
    initMailApp();
    initTasksApp();
    initAuditLog();

    // 5. Global Window Controller
    window.openWindow = (windowId) => {
        const win = document.getElementById(windowId);
        if (!win) return;

        // Check if disabled in AppManager
        if (window.AppManager) {
            const associatedApp = window.AppManager.getApps().find(app => app.windowId === windowId);
            if (associatedApp && associatedApp.disabled) {
                if (window.showDialog && window.showDialog.alert) {
                    window.showDialog.alert(`The application "${associatedApp.name}" is currently disabled. Please enable it in Settings -> Applications.`, 'Application Blocked');
                } else {
                    alert(`The application "${associatedApp.name}" is currently disabled. Please enable it in Settings.`);
                }
                return;
            }
        }

        const appName = APP_ID_MAP[windowId] || "";
        const dockItem = appName ? document.querySelector(`.dock-item[data-app="${appName}"]`) : null;

        if (win.style.display === 'none') {
            win.style.display = 'flex';
            if (dockItem) {
                win.style.opacity = '0';
                win.style.transition = 'none';
                const dRect = dockItem.getBoundingClientRect();
                const wRect = win.getBoundingClientRect();
                win.style.transform = `translate(${(dRect.left + dRect.width/2) - (wRect.left + wRect.width/2)}px, ${(dRect.top + dRect.height/2) - (wRect.top + wRect.height/2)}px) scale(0.05)`;
                win.offsetHeight;
                win.style.transition = 'transform 0.45s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.45s ease';
                win.style.transform = 'translate(0, 0) scale(1)';
                win.style.opacity = '1';
                dockItem.classList.add('running');
            } else {
                win.style.transform = 'scale(0.93) translateY(12px)';
                win.style.opacity = '0';
                win.offsetHeight;
                win.style.transition = 'transform 0.45s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.45s ease';
                win.style.transform = 'scale(1) translateY(0)';
                win.style.opacity = '1';
            }
        }
        
        const activeWS = document.body.getAttribute('data-active-workspace') || '1';
        win.dataset.workspace = activeWS;
        focusWindow(win);
    };

    // 6. Event Listeners
    document.addEventListener('click', (e) => {
        const dockItem = e.target.closest('.dock-item');
        if (dockItem) {
            const app = dockItem.getAttribute('data-app');
            const map = {
                'launchpad': () => document.getElementById('launchpad-overlay').classList.toggle('active'),
                'files': () => window.openWindow('files-window'),
                'browser': () => window.openWindow('browser-window'),
                'software': () => window.openWindow('store-window'),
                'terminal': () => window.openWindow('terminal-window'),
                'monitor': () => window.openWindow('monitor-window'),
                'settings': () => window.openWindow('settings-window'),
                'editor': () => window.openWindow('editor-window'),
                'installer': () => window.openWindow('installer-window'),
                'calculator': () => window.openWindow('calculator-window'),
                'calendar': () => window.openWindow('calendar-window'),
                'notes': () => window.openWindow('notes-window'),
                'clock': () => window.openWindow('clock-app-window'),
                'audit': () => window.openWindow('audit-log-window'),
                'mail': () => window.openWindow('mail-window'),
                'tasks': () => window.openWindow('tasks-window'),
                'ai': () => window.openWindow('ai-window'),
                'trash': () => alert('Trash is empty.')
            };
            if (map[app]) map[app]();
        }

        const closeBtn = e.target.closest('.window-btn.close');
        if (closeBtn) {
            e.stopPropagation();
            const win = closeBtn.closest('.window');
            const appId = APP_ID_MAP[win.id];
            win.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
            win.style.transform = 'scale(0.95)';
            win.style.opacity = '0';
            setTimeout(() => {
                win.style.display = 'none';
                win.style.transform = '';
                if (appId) {
                    const di = document.querySelector(`.dock-item[data-app="${appId}"]`);
                    if (di) di.classList.remove('running');
                }
            }, 300);
        }
    });

    document.addEventListener('launch-app-window', (e) => {
        if (e.detail && e.detail.windowId) window.openWindow(e.detail.windowId);
    });



    document.getElementById('control-center-trigger')?.addEventListener('click', (e) => {
        e.stopPropagation();
        const cc = document.getElementById('control-center-panel');
        if (cc) cc.classList.toggle('active');
    });

    document.getElementById('topbar-theme-toggle')?.addEventListener('click', () => {
        document.body.classList.toggle('light-theme');
        // Optional: Update icon
        const icon = document.getElementById('theme-toggle-icon');
        if (icon) {
            icon.className = document.body.classList.contains('light-theme') ? 'hgi-stroke hgi-moon' : 'hgi-stroke hgi-sun-01';
        }
    });

    // 8. Spotlight Integration
    const spotlight = document.getElementById('spotlight-overlay');
    const input = document.getElementById('spotlight-input');
    const results = document.getElementById('spotlight-results');
    const appList = [
        { name: 'Terminal', icon: '💻', action: () => window.openWindow('terminal-window') },
        { name: 'MailBox', icon: '📩', action: () => window.openWindow('mail-window') },
        { name: 'PlanIt Tasks', icon: '✅', action: () => window.openWindow('tasks-window') },
        { name: 'Files Explorer', icon: '📁', action: () => window.openWindow('files-window') },
        { name: 'Web Browser', icon: '🧭', action: () => window.openWindow('browser-window') },
        { name: 'System Settings', icon: '⚙️', action: () => window.openWindow('settings-window') }
    ];

    let selIdx = 0;
    let filtered = [...appList];

    function renderSpotlight() {
        if (!results) return;
        results.innerHTML = filtered.length ? '' : '<li class="spotlight-result-item">No results</li>';
        filtered.forEach((app, i) => {
            const li = document.createElement('li');
            li.className = `spotlight-result-item ${i === selIdx ? 'selected' : ''}`;
            li.innerHTML = `<span>${app.icon}</span> <span>${app.name}</span>`;
            li.onclick = () => { app.action(); spotlight.classList.remove('active'); };
            results.appendChild(li);
        });
    }

    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
            e.preventDefault();
            spotlight.classList.toggle('active');
            if (spotlight.classList.contains('active')) {
                input.value = ''; filtered = [...appList]; selIdx = 0; renderSpotlight(); input.focus();
            }
        }
        if (spotlight.classList.contains('active')) {
            if (e.key === 'ArrowDown') { e.preventDefault(); selIdx = (selIdx + 1) % filtered.length; renderSpotlight(); }
            if (e.key === 'ArrowUp') { e.preventDefault(); selIdx = (selIdx - 1 + filtered.length) % filtered.length; renderSpotlight(); }
            if (e.key === 'Enter') { e.preventDefault(); filtered[selIdx]?.action(); spotlight.classList.remove('active'); }
            if (e.key === 'Escape') spotlight.classList.remove('active');
        }
    });

    input?.addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase();
        filtered = appList.filter(a => a.name.toLowerCase().includes(q));
        selIdx = 0;
        renderSpotlight();
    });

    console.log('[AIOS] System ready.');
}

init().catch(err => console.error('[AIOS] Startup error:', err));
