/* FELBIC OS — Application Manager Module */

const DEFAULT_APPS = [
    // System Apps
    { id: 'files', name: 'Files Explorer', desc: 'Semantic AI File Browser and VFS interface.', type: 'system', icon: '<i class="hgi-stroke hgi-folder-open"></i>', windowId: 'files-window', size: '14.5 MB', version: '1.2.0', disabled: false },
    { id: 'browser', name: 'Web Browser', desc: 'Lightning-fast glassmorphic web browser.', type: 'system', icon: '<i class="hgi-stroke hgi-compass"></i>', windowId: 'browser-window', size: '28.1 MB', version: '2.0.1', disabled: false },
    { id: 'software', name: 'Software Center', desc: 'App market for native and verified applications.', type: 'system', icon: '<i class="hgi-stroke hgi-app-store"></i>', windowId: 'store-window', size: '18.2 MB', version: '1.0.0', disabled: false },
    { id: 'terminal', name: 'Terminal Console', desc: 'Secure root CLI with msgpack IPC shell.', type: 'system', icon: '<i class="hgi-stroke hgi-command-line"></i>', windowId: 'terminal-window', size: '4.2 MB', version: '1.27.0', disabled: false },
    { id: 'monitor', name: 'Task Manager', desc: 'System resources monitor and process manager.', type: 'system', icon: '<i class="hgi-stroke hgi-analytics-01"></i>', windowId: 'monitor-window', size: '8.7 MB', version: '1.1.0', disabled: false },
    { id: 'settings', name: 'System Settings', desc: 'Configure preferences, hardware, and AI permissions.', type: 'system', icon: '<i class="hgi-stroke hgi-settings-01"></i>', windowId: 'settings-window', size: '12.0 MB', version: '1.0.0', disabled: false },
    { id: 'editor', name: 'Text Editor', desc: 'Rich plain-text and code editor with syntax highlighting.', type: 'system', icon: '<i class="hgi-stroke hgi-file-01"></i>', windowId: 'editor-window', size: '5.1 MB', version: '1.0.2', disabled: false },
    { id: 'calculator', name: 'Calculator', desc: 'Neumorphic standard and scientific calculator.', type: 'system', icon: '<i class="hgi-stroke hgi-calculator"></i>', windowId: 'calculator-window', size: '2.4 MB', version: '1.0.0', disabled: false },
    { id: 'calendar', name: 'Calendar', desc: 'Plan days and view local/global agendas.', type: 'system', icon: '<i class="hgi-stroke hgi-calendar-01"></i>', windowId: 'calendar-window', size: '3.9 MB', version: '1.0.0', disabled: false },
    { id: 'notes', name: 'Notes', desc: 'Draft quick thoughts, checklists, and text snippets.', type: 'system', icon: '<i class="hgi-stroke hgi-file-01"></i>', windowId: 'notes-window', size: '3.0 MB', version: '1.0.0', disabled: false },
    { id: 'clock', name: 'Clock', desc: 'World clock, timer, and stopwatch utility.', type: 'system', icon: '<i class="hgi-stroke hgi-time-02"></i>', windowId: 'clock-app-window', size: '2.1 MB', version: '1.0.0', disabled: false },
    { id: 'mail', name: 'MailBox', desc: 'Check personal and server administrative emails.', type: 'system', icon: '<i class="hgi-stroke hgi-mail-01"></i>', windowId: 'mail-window', size: '7.8 MB', version: '1.0.0', disabled: false },
    { id: 'tasks', name: 'PlanIt Tasks', desc: 'Kanban boards and tasks checklists.', type: 'system', icon: '<i class="hgi-stroke hgi-task-edit-01"></i>', windowId: 'tasks-window', size: '4.5 MB', version: '1.0.1', disabled: false },
    { id: 'audit', name: 'Audit Logs', desc: 'View chronological AI security and process actions.', type: 'system', icon: '<i class="hgi-stroke hgi-shield-01"></i>', windowId: 'audit-log-window', size: '1.9 MB', version: '1.0.0', disabled: false },
    { id: 'photos', name: 'Aura Photos', desc: 'Professional image viewer and editor.', type: 'system', icon: '<i class="hgi-stroke hgi-image-01"></i>', windowId: 'photos-window', size: '5.4 MB', version: '1.0.0', disabled: false },

    // Store Apps (initially not installed)
    { id: 'firefox', name: 'Firefox Browser', desc: 'Secure, modern web browsing platform.', type: 'store', cat: 'featured', icon: '<i class="hgi-stroke hgi-internet"></i>', windowId: 'browser-window', size: '84.2 MB', version: '124.0.1', installed: false, disabled: false },
    { id: 'vscode', name: 'VS Code', desc: 'Powerful open-source code and text editor.', type: 'store', cat: 'developer', icon: '<i class="hgi-stroke hgi-code"></i>', windowId: 'editor-window', size: '122.4 MB', version: '1.87.2', installed: false, disabled: false },
    { id: 'rust', name: 'Rust Compiler', desc: 'Compile safe and fast programs.', type: 'store', cat: 'developer', icon: '<i class="hgi-stroke hgi-developer"></i>', windowId: null, size: '240.5 MB', version: '1.76.0', installed: false, disabled: false },
    { id: 'gimp', name: 'GIMP Editor', desc: 'GNU Image Manipulation program.', type: 'store', cat: 'graphics', icon: '<i class="hgi-stroke hgi-brush"></i>', windowId: 'paint-window', size: '64.9 MB', version: '2.10.36', installed: false, disabled: false },
    { id: 'blender', name: 'Blender 3D', desc: 'Open-source 3D modeling and rendering.', type: 'store', cat: 'graphics', icon: '<i class="hgi-stroke hgi-artboard"></i>', windowId: null, size: '312.0 MB', version: '4.1.0', installed: false, disabled: false },
    { id: 'vlc', name: 'VLC Media Player', desc: 'Play any video or audio stream instantly.', type: 'store', cat: 'utilities', icon: '<i class="hgi-stroke hgi-video-console"></i>', windowId: 'media-window', size: '38.6 MB', version: '3.0.20', installed: false, disabled: false },
    { id: 'discord', name: 'Discord Client', desc: 'Voice, video, and text communication.', type: 'store', cat: 'utilities', icon: '<i class="hgi-stroke hgi-bubble-chat-user"></i>', windowId: 'chat-window', size: '56.1 MB', version: '0.0.43', installed: false, disabled: false }
];

class AppManager {
    constructor() {
        this.apps = [];
        this.loadState();
    }

    loadState() {
        const saved = localStorage.getItem('auraos-apps-state');
        const customSaved = localStorage.getItem('auraos-apps-custom');
        
        let savedState = {};
        if (saved) {
            try {
                savedState = JSON.parse(saved);
            } catch (e) {
                console.error('[AppManager] Failed to parse apps state:', e);
            }
        }

        let customAppsList = [];
        if (customSaved) {
            try {
                customAppsList = JSON.parse(customSaved);
            } catch (e) {
                console.error('[AppManager] Failed to parse custom apps:', e);
            }
        }

        // Merge saved state into default apps
        this.apps = DEFAULT_APPS.map(app => {
            const state = savedState[app.id];
            if (state) {
                return {
                    ...app,
                    installed: state.installed !== undefined ? state.installed : app.installed,
                    disabled: state.disabled !== undefined ? state.disabled : app.disabled
                };
            }
            return app;
        });

        // Add saved custom apps
        customAppsList.forEach(customApp => {
            // Recreate action if missing (custom apps run a placeholder dialog)
            if (!customApp.action && !customApp.windowId) {
                customApp.action = () => {
                    if (window.showDialog && window.showDialog.alert) {
                        window.showDialog.alert(`Running installed third-party package: ${customApp.name}`, 'Application Launcher');
                    } else {
                        alert(`Running installed third-party package: ${customApp.name}`);
                    }
                };
            }
            this.apps.push(customApp);
        });
    }

    saveState() {
        const stateToSave = {};
        const customToSave = [];

        this.apps.forEach(app => {
            if (app.type === 'custom') {
                customToSave.push({
                    id: app.id,
                    name: app.name,
                    desc: app.desc,
                    type: app.type,
                    icon: app.icon,
                    windowId: app.windowId,
                    size: app.size,
                    version: app.version,
                    installed: app.installed,
                    disabled: app.disabled,
                    category: app.category || 'installed'
                });
            } else {
                stateToSave[app.id] = {
                    installed: app.installed,
                    disabled: app.disabled
                };
            }
        });

        localStorage.setItem('auraos-apps-state', JSON.stringify(stateToSave));
        localStorage.setItem('auraos-apps-custom', JSON.stringify(customToSave));
    }

    getApps() {
        return this.apps;
    }

    getApp(id) {
        return this.apps.find(app => app.id === id);
    }

    installApp(id) {
        const app = this.getApp(id);
        if (!app) return false;

        app.installed = true;
        app.disabled = false;
        this.saveState();

        // Dispatch events for UI updates
        const installEvent = new CustomEvent('app-installed', {
            detail: {
                id: app.id,
                name: app.name,
                icon: app.icon,
                windowId: app.windowId,
                action: app.windowId ? null : () => {
                    if (window.showDialog && window.showDialog.alert) {
                        window.showDialog.alert(`Running installed program: ${app.name}`, 'Application Launcher');
                    } else {
                        alert(`Running installed program: ${app.name}`);
                    }
                }
            }
        });
        document.dispatchEvent(installEvent);

        const stateEvent = new CustomEvent('app-state-changed', { detail: { id, state: 'installed' } });
        document.dispatchEvent(stateEvent);

        return true;
    }

    uninstallApp(id) {
        const app = this.getApp(id);
        if (!app) return false;

        // Custom apps are deleted from the array, store apps are reset to installed = false
        if (app.type === 'custom') {
            this.apps = this.apps.filter(a => a.id !== id);
        } else {
            app.installed = false;
            app.disabled = false;
        }
        
        this.saveState();

        const uninstallEvent = new CustomEvent('app-uninstalled', { detail: { id } });
        document.dispatchEvent(uninstallEvent);

        const stateEvent = new CustomEvent('app-state-changed', { detail: { id, state: 'uninstalled' } });
        document.dispatchEvent(stateEvent);

        return true;
    }

    toggleAppDisabled(id) {
        const app = this.getApp(id);
        if (!app) return false;

        app.disabled = !app.disabled;
        this.saveState();

        const stateEvent = new CustomEvent('app-state-changed', { detail: { id, state: app.disabled ? 'disabled' : 'enabled' } });
        document.dispatchEvent(stateEvent);

        return true;
    }

    installCustomPackage(name, iconClass, version = '1.0.0', size = '15.0 MB') {
        const id = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
        
        // Prevent duplicate custom app ids
        if (this.getApp(id)) {
            return false;
        }

        const icon = `<i class="hgi-stroke ${iconClass}"></i>`;
        const newApp = {
            id,
            name,
            desc: `Custom application installed from local file package.`,
            type: 'custom',
            icon,
            windowId: null, // Custom installer files don't have built-in windows, run action
            size,
            version,
            installed: true,
            disabled: false,
            action: () => {
                if (window.showDialog && window.showDialog.alert) {
                    window.showDialog.alert(`Running installed third-party package: ${name}`, 'Application Launcher');
                } else {
                    alert(`Running installed third-party package: ${name}`);
                }
            }
        };

        this.apps.push(newApp);
        this.saveState();

        // Dispatch install event
        const installEvent = new CustomEvent('app-installed', {
            detail: {
                id: newApp.id,
                name: newApp.name,
                icon: newApp.icon,
                windowId: null,
                action: newApp.action
            }
        });
        document.dispatchEvent(installEvent);

        const stateEvent = new CustomEvent('app-state-changed', { detail: { id, state: 'installed' } });
        document.dispatchEvent(stateEvent);

        return true;
    }
}

export function initAppManager() {
    if (!window.AppManager) {
        window.AppManager = new AppManager();
        console.log('[AppManager] Initialized global window.AppManager');
    }
}
