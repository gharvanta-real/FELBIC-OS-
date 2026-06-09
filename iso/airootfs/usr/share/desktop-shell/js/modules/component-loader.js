export async function loadComponents() {
    const components = [
        { id: 'topbar-container', file: 'components/topbar.html' },
        { id: 'control-center-container', file: 'components/control-center.html' },
        { id: 'spotlight-container', file: 'components/spotlight.html' },
        { id: 'dock-container', file: 'components/dock.html' },
        { id: 'windows-container', file: 'components/windows.html' },
        { id: 'notification-center-container', file: 'components/notification-center.html' },
        { id: 'audit-log-container', file: 'components/audit-log.html' }
    ];

    for (const comp of components) {
        try {
            const response = await fetch(comp.file);
            if (!response.ok) {
                console.error(`Failed to load ${comp.file}: ${response.statusText}`);
                continue;
            }
            const text = await response.text();
            document.getElementById(comp.id).innerHTML = text;
        } catch (error) {
            console.error(`Error loading ${comp.file}:`, error);
        }
    }
}
