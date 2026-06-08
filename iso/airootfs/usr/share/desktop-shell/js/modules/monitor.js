/* FELBIC OS — Task Manager Module */

export function initMonitor() {
    console.log('[felbicos] Initializing Task Manager Module...');

    const tabs = document.querySelectorAll('.monitor-tab');
    const panes = document.querySelectorAll('.monitor-pane');

    // ── 1. Tab Switching ──
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.getAttribute('data-tab');
            
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const graphsPane = document.getElementById('monitor-pane-graphs');
            const procPane = document.getElementById('monitor-pane-processes');

            if (targetTab === 'cpu' || targetTab === 'memory') {
                graphsPane.style.display = 'flex';
                procPane.style.display = 'none';
            } else {
                graphsPane.style.display = 'none';
                procPane.style.display = 'flex';
            }
        });
    });

    // ── 2. SVG Performance Graphs ──
    const cpuPath = document.getElementById('cpu-chart-path');
    const memPath = document.getElementById('mem-chart-path');

    const cpuHistory = Array(20).fill(10);
    const memHistory = Array(20).fill(40);

    function updateChart(history, value, pathElement) {
        if (!pathElement) return;

        // Shift and push new value
        history.shift();
        history.push(value);

        // Convert history points to SVG path coordinate strings
        // SVG viewport is 100 x 40. Height coordinate 0 is at top, 40 is at bottom.
        const widthStep = 100 / (history.length - 1);
        let pathD = 'M 0 40';

        history.forEach((val, idx) => {
            const x = idx * widthStep;
            // Map percentage (0-100) to height (40 to 0)
            const y = 40 - (val / 100) * 40;
            pathD += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
        });

        // Close the filled area polygon at the bottom right and bottom left
        pathD += ' L 100 40 L 0 40 Z';
        pathElement.setAttribute('d', pathD);
    }

    // Interval to simulate performance changes and update graphs
    setInterval(() => {
        // Read stats from header elements if available, otherwise mock
        const cpuText = document.getElementById('stat-cpu');
        const memText = document.getElementById('stat-mem');

        const cpuVal = cpuText ? parseInt(cpuText.textContent) || 12 : Math.floor(Math.random() * 20) + 5;
        const memVal = memText ? parseInt(memText.textContent) || 28 : Math.floor(Math.random() * 5) + 30;

        updateChart(cpuHistory, cpuVal, cpuPath);
        updateChart(memHistory, memVal, memPath);
    }, 800);

    // ── 3. Process Table Logic ──
    const appWindowProcesses = [
        { windowId: 'terminal-window', name: 'Terminal Console', pid: 630, defaultCpu: 0.8, mem: '22 MB' },
        { windowId: 'settings-window', name: 'System Settings', pid: 115, defaultCpu: 0.5, mem: '15.4 MB' },
        { windowId: 'files-window', name: 'Files Explorer', pid: 210, defaultCpu: 0.3, mem: '18 MB' },
        { windowId: 'browser-window', name: 'Web Browser', pid: 502, defaultCpu: 4.2, mem: '142 MB' },
        { windowId: 'store-window', name: 'Software Center', pid: 310, defaultCpu: 1.1, mem: '35 MB' },
        { windowId: 'monitor-window', name: 'Task Manager', pid: 412, defaultCpu: 2.1, mem: '28 MB' },
        { windowId: 'editor-window', name: 'Text Editor', pid: 180, defaultCpu: 0.2, mem: '12 MB' },
        { windowId: 'installer-window', name: 'Calamares Installer', pid: 90, defaultCpu: 1.5, mem: '45 MB' },
        { windowId: 'paint-window', name: 'GIMP Editor', pid: 720, defaultCpu: 3.4, mem: '92 MB' },
        { windowId: 'media-window', name: 'VLC Media Player', pid: 810, defaultCpu: 5.6, mem: '68 MB' },
        { windowId: 'chat-window', name: 'Discord Client', pid: 880, defaultCpu: 2.8, mem: '78 MB' }
    ];

    const systemProcesses = [
        { name: 'aios-comp', pid: 411, cpu: 3.5, mem: '122 MB', type: 'system' },
        { name: 'aisd', pid: 452, cpu: 1.2, mem: '84.6 MB', type: 'system' },
        { name: 'systemd', pid: 1, cpu: 0.0, mem: '12.1 MB', type: 'system' },
        { name: 'dbus-daemon', pid: 280, cpu: 0.1, mem: '8.4 MB', type: 'system' },
        { name: 'zsh', pid: 615, cpu: 0.0, mem: '6.5 MB', type: 'system' }
    ];

    // Helper to scan DOM and build current processes list
    function getProcesses() {
        const list = [...systemProcesses];
        appWindowProcesses.forEach(app => {
            const win = document.getElementById(app.windowId);
            if (win && win.style.display !== 'none') {
                list.push({
                    name: app.name,
                    pid: app.pid,
                    cpu: app.currentCpu || app.defaultCpu,
                    mem: app.mem,
                    windowId: app.windowId,
                    type: 'app'
                });
            }
        });
        return list;
    }

    const tbody = document.getElementById('monitor-process-tbody');
    const killBtn = document.getElementById('monitor-kill-process');
    const selectedLabel = document.getElementById('monitor-selected-label');
    let selectedPid = null;

    function renderProcesses() {
        if (!tbody) return;
        tbody.innerHTML = '';

        const currentProcesses = getProcesses();

        currentProcesses.forEach(proc => {
            const tr = document.createElement('tr');
            if (proc.pid === selectedPid) {
                tr.className = 'selected';
            }

            tr.innerHTML = `
                <td style="font-weight: 500;">${proc.name}</td>
                <td style="color: var(--color-topbar-text-muted);">${proc.pid}</td>
                <td>${proc.cpu.toFixed(1)}%</td>
                <td>${proc.mem}</td>
            `;

            tr.addEventListener('click', () => {
                selectedPid = proc.pid;
                selectedLabel.textContent = `Selected: ${proc.name} (PID ${proc.pid})`;
                killBtn.disabled = false;
                renderProcesses(); // re-draw selection styles
            });

            tbody.appendChild(tr);
        });
    }

    // Simulated task execution activity modifier
    setInterval(() => {
        // Fluctuate system cpu
        systemProcesses.forEach(proc => {
            if (proc.name === 'systemd') return;
            const delta = (Math.random() - 0.5) * 1.5;
            proc.cpu = Math.max(0.1, proc.cpu + delta);
        });

        // Fluctuate app cpu
        appWindowProcesses.forEach(app => {
            if (!app.currentCpu) app.currentCpu = app.defaultCpu;
            const delta = (Math.random() - 0.5) * 1.5;
            app.currentCpu = Math.max(0.1, app.currentCpu + delta);
        });

        renderProcesses();
    }, 2000);

    // Force Quit Task handler
    if (killBtn) {
        killBtn.addEventListener('click', () => {
            if (selectedPid === null) return;
            
            const currentProcesses = getProcesses();
            const proc = currentProcesses.find(p => p.pid === selectedPid);
            
            if (proc) {
                // Confirm action
                if (confirm(`Are you sure you want to force quit ${proc.name} (PID ${selectedPid})?`)) {
                    if (proc.type === 'app' && proc.windowId) {
                        const win = document.getElementById(proc.windowId);
                        if (win) {
                            // Trigger close event on window element
                            const closeEvent = new CustomEvent('window-close', { bubbles: true, detail: { windowId: proc.windowId } });
                            win.dispatchEvent(closeEvent);

                            // Simulate close button click to let app.js perform clean shutdown
                            const closeBtn = win.querySelector('.window-btn.close');
                            if (closeBtn) {
                                closeBtn.click();
                            } else {
                                win.style.display = 'none';
                                win.classList.remove('active-focus');
                            }
                        }
                    } else {
                        // System process removal
                        const systemIdx = systemProcesses.findIndex(p => p.pid === selectedPid);
                        if (systemIdx !== -1) {
                            systemProcesses.splice(systemIdx, 1);
                        }
                    }

                    selectedPid = null;
                    selectedLabel.textContent = 'Select a process...';
                    killBtn.disabled = true;
                    renderProcesses();
                    console.log(`[monitor] Force-killed process PID: ${selectedPid}`);
                }
            }
        });
    }

    renderProcesses();
}
