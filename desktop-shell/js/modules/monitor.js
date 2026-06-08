/* FELBIC OS — Task Manager / Activity Monitor Module */

export function initMonitor() {
    console.log('[felbicos] Initializing Activity Monitor Module...');

    // System processes database (simulated background jobs)
    const systemProcesses = [
        { pid: 1, name: 'systemd', cpu: 0.1, mem: '12.4 MB', type: 'system' },
        { pid: 452, name: 'aisd', cpu: 1.2, mem: '84.6 MB', type: 'system' },
        { pid: 102, name: 'xorg-server', cpu: 0.8, mem: '45.1 MB', type: 'system' },
        { pid: 310, name: 'pulseaudio', cpu: 0.3, mem: '18.9 MB', type: 'system' },
        { pid: 215, name: 'network-manager', cpu: 0.1, mem: '9.2 MB', type: 'system' },
        { pid: 512, name: 'dock-daemon', cpu: 0.4, mem: '24.5 MB', type: 'system' }
    ];

    // Map desktop windows to processes lists
    const appWindowProcesses = [
        { windowId: 'terminal-window', name: 'foot (Terminal)', defaultCpu: 0.5, mem: '32.1 MB', type: 'app' },
        { windowId: 'browser-window', name: 'Firefox', defaultCpu: 2.5, mem: '184.2 MB', type: 'app' },
        { windowId: 'editor-window', name: 'Text Editor', defaultCpu: 0.2, mem: '15.4 MB', type: 'app' },
        { windowId: 'paint-window', name: 'GIMP Editor', defaultCpu: 4.0, mem: '210.8 MB', type: 'app' },
        { windowId: 'media-window', name: 'VLC Media Player', defaultCpu: 5.5, mem: '92.4 MB', type: 'app' },
        { windowId: 'chat-window', name: 'Discord Client', defaultCpu: 1.8, mem: '128.0 MB', type: 'app' },
        { windowId: 'store-window', name: 'Software Center', defaultCpu: 0.9, mem: '64.3 MB', type: 'app' }
    ];

    // SVG Graph data states
    const cpuHistory = Array(40).fill(12);
    const memHistory = Array(40).fill(28);

    const cpuPath = document.getElementById('cpu-graph-path');
    const memPath = document.getElementById('mem-graph-path');

    function updateChart(historyArray, newValue, pathElement) {
        if (!pathElement) return;
        historyArray.push(newValue);
        historyArray.shift();

        // Build SVG Polyline coordinates (40 points across 100% width)
        const width = 300;
        const height = 80;
        const step = width / (historyArray.length - 1);
        
        let points = '';
        for (let i = 0; i < historyArray.length; i++) {
            const x = i * step;
            // Invert scale since SVG 0 is at the top (scale max to 100%)
            const percent = historyArray[i];
            const y = height - (percent / 100) * height;
            points += `${x},${y} `;
        }
        pathElement.setAttribute('points', points.trim());
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

        const cpuLabel = document.querySelector('#monitor-pane-graphs .monitor-graph-section:nth-child(1) .graph-label');
        const memLabel = document.querySelector('#monitor-pane-graphs .monitor-graph-section:nth-child(2) .graph-label');
        if (cpuLabel) cpuLabel.textContent = `CPU System Core Load: ${cpuVal}%`;
        if (memLabel) memLabel.textContent = `Physical Memory Active Usage: ${memVal}%`;
    }, 800);

    // Tab Pane Toggles
    const tabs = document.querySelectorAll('.monitor-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const targetPane = tab.getAttribute('data-pane');
            document.querySelectorAll('.monitor-pane').forEach(pane => {
                pane.style.display = pane.id === targetPane ? 'flex' : 'none';
            });
        });
    });

    // Process List Builder helper
    function getProcesses() {
        const list = [...systemProcesses];
        appWindowProcesses.forEach(app => {
            const win = document.getElementById(app.windowId);
            if (win && win.style.display !== 'none') {
                list.push({
                    name: app.name,
                    pid: getAppPid(app.windowId),
                    cpu: app.currentCpu || app.defaultCpu,
                    mem: app.mem,
                    type: 'app',
                    windowId: app.windowId
                });
            }
        });
        return list;
    }

    function getAppPid(windowId) {
        // Static mapping for demo consistency
        switch (windowId) {
            case 'terminal-window': return 892;
            case 'browser-window': return 1024;
            case 'editor-window': return 744;
            case 'paint-window': return 1102;
            case 'media-window': return 954;
            case 'chat-window': return 1308;
            case 'store-window': return 620;
            default: return 999;
        }
    }

    const tbody = document.getElementById('monitor-process-tbody');
    const killBtn = document.getElementById('monitor-kill-process');
    const selectedLabel = document.getElementById('monitor-selected-label');
    let selectedPid = null;
    let sortBy = 'cpu'; // default sort by CPU
    let sortDesc = true;

    const headers = {
        name: document.querySelector('.monitor-table th:nth-child(1)'),
        pid: document.querySelector('.monitor-table th:nth-child(2)'),
        cpu: document.querySelector('.monitor-table th:nth-child(3)'),
        mem: document.querySelector('.monitor-table th:nth-child(4)')
    };

    Object.keys(headers).forEach(key => {
        const th = headers[key];
        if (th) {
            th.style.cursor = 'pointer';
            th.addEventListener('click', () => {
                if (sortBy === key) {
                    sortDesc = !sortDesc;
                } else {
                    sortBy = key;
                    sortDesc = true;
                }
                renderProcesses();
            });
        }
    });

    function parseMem(memStr) {
        const val = parseFloat(memStr);
        if (memStr.includes('GB')) return val * 1024;
        if (memStr.includes('KB')) return val / 1024;
        return val;
    }

    function renderProcesses() {
        if (!tbody) return;
        tbody.innerHTML = '';

        // Update sorting indicators on headers
        Object.keys(headers).forEach(key => {
            const th = headers[key];
            if (!th) return;
            let baseText = 'Process Name';
            if (key === 'pid') baseText = 'PID';
            else if (key === 'cpu') baseText = 'CPU %';
            else if (key === 'mem') baseText = 'Memory';

            if (sortBy === key) {
                th.innerHTML = `${baseText}${sortDesc ? ' &#9662;' : ' &#9652;'}`;
            } else {
                th.innerHTML = baseText;
            }
        });

        const currentProcesses = getProcesses();

        // Apply sorting
        currentProcesses.sort((a, b) => {
            let valA = a[sortBy];
            let valB = b[sortBy];

            if (sortBy === 'mem') {
                valA = parseMem(a.mem);
                valB = parseMem(b.mem);
            }

            if (typeof valA === 'string') {
                return sortDesc ? valB.localeCompare(valA) : valA.localeCompare(valB);
            } else {
                return sortDesc ? valB - valA : valA - valB;
            }
        });

        currentProcesses.forEach(proc => {
            const tr = document.createElement('tr');
            if (proc.pid === selectedPid) {
                tr.className = 'selected';
            }

            tr.innerHTML = `
                <td style="font-weight: 500;">${proc.name}</td>
                <td style="color: var(--text-muted);">${proc.pid}</td>
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
        killBtn.addEventListener('click', async () => {
            if (selectedPid === null) return;
            
            const currentProcesses = getProcesses();
            const proc = currentProcesses.find(p => p.pid === selectedPid);
            
            if (proc) {
                // Confirm action
                const confirmed = await showDialog.confirm(`Are you sure you want to force quit ${proc.name} (PID ${selectedPid})?`, 'Force Quit Process', true);
                if (confirmed) {
                    const killedPid = selectedPid;
                    const killedName = proc.name;

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
                    console.log(`[monitor] Force-killed process ${killedName} (PID: ${killedPid})`);
                    if (window.showNotification) {
                        window.showNotification('Process Terminated', `${killedName} (PID ${killedPid}) has been force quit.`, 'hgi-cancel-01');
                    }
                }
            }
        });
    }

    renderProcesses();
}
