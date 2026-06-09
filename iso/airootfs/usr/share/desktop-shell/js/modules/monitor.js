/* AURA OS — Task Manager / Activity Monitor Module */

export function initMonitor() {
    console.log('[monitor] Initializing Activity Monitor Module...');

    const showDialog = window.showDialog || {
        confirm: async (msg) => confirm(msg),
        alert: (msg) => alert(msg)
    };

    // System processes database (expanded simulation)
    const systemProcesses = [
        { pid: 1, name: 'systemd', cpu: 0.1, mem: '12.4 MB', type: 'system' },
        { pid: 2, name: 'kthreadd', cpu: 0.0, mem: '0 KB', type: 'system' },
        { pid: 12, name: 'ksoftirqd/0', cpu: 0.1, mem: '0 KB', type: 'system' },
        { pid: 452, name: 'aisd (AI Daemon)', cpu: 1.8, mem: '112.4 MB', type: 'system' },
        { pid: 102, name: 'xorg-server', cpu: 1.2, mem: '64.5 MB', type: 'system' },
        { pid: 310, name: 'pulseaudio', cpu: 0.4, mem: '21.2 MB', type: 'system' },
        { pid: 215, name: 'network-manager', cpu: 0.2, mem: '14.8 MB', type: 'system' },
        { pid: 512, name: 'dock-daemon', cpu: 0.5, mem: '28.1 MB', type: 'system' },
        { pid: 520, name: 'desktop-shell', cpu: 1.4, mem: '42.9 MB', type: 'system' },
        { pid: 615, name: 'node-server', cpu: 0.9, mem: '58.3 MB', type: 'system' },
        { pid: 820, name: 'dbus-daemon', cpu: 0.1, mem: '8.4 MB', type: 'system' },
        { pid: 911, name: 'syslogd', cpu: 0.1, mem: '6.2 MB', type: 'system' }
    ];

    // Map desktop windows to processes lists
    const appWindowProcesses = [
        { windowId: 'terminal-window', name: 'foot (Terminal)', defaultCpu: 0.5, mem: '32.1 MB', type: 'app' },
        { windowId: 'browser-window', name: 'Firefox', defaultCpu: 2.5, mem: '184.2 MB', type: 'app' },
        { windowId: 'editor-window', name: 'Text Editor', defaultCpu: 0.2, mem: '15.4 MB', type: 'app' },
        { windowId: 'paint-window', name: 'GIMP Editor', defaultCpu: 4.0, mem: '210.8 MB', type: 'app' },
        { windowId: 'media-window', name: 'VLC Media Player', defaultCpu: 5.5, mem: '92.4 MB', type: 'app' },
        { windowId: 'chat-window', name: 'Discord Client', defaultCpu: 1.8, mem: '128.0 MB', type: 'app' },
        { windowId: 'store-window', name: 'Software Center', defaultCpu: 0.9, mem: '64.3 MB', type: 'app' },
        { windowId: 'notes-window', name: 'Notes Manager', defaultCpu: 0.3, mem: '24.1 MB', type: 'app' },
        { windowId: 'calculator-window', name: 'Calculator', defaultCpu: 0.1, mem: '12.0 MB', type: 'app' },
        { windowId: 'calendar-window', name: 'Calendar', defaultCpu: 0.2, mem: '18.5 MB', type: 'app' }
    ];

    // SVG Graph data states (40 points history)
    const cpuHistory = Array(40).fill(12);
    const memHistory = Array(40).fill(28);
    const netHistory = Array(40).fill(5);
    const diskHistory = Array(40).fill(2);

    const cpuPath = document.getElementById('cpu-chart-path');
    const memPath = document.getElementById('mem-chart-path');
    const netPath = document.getElementById('net-chart-path');
    const diskPath = document.getElementById('disk-chart-path');

    function updateChart(historyArray, newValue, pathElement) {
        if (!pathElement) return;
        historyArray.push(newValue);
        historyArray.shift();

        // Build SVG filled path coordinates (viewBox 100x40)
        const width = 100;
        const height = 40;
        const step = width / (historyArray.length - 1);
        
        let pathData = '';
        for (let i = 0; i < historyArray.length; i++) {
            const x = i * step;
            const percent = historyArray[i];
            const y = height - (percent / 100) * height;
            if (i === 0) {
                pathData += `M ${x.toFixed(1)} ${y.toFixed(1)}`;
            } else {
                pathData += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
            }
        }
        
        // Append bottom boundary to fill the polygon
        const fillPathData = `${pathData} L ${width} ${height} L 0 ${height} Z`;
        pathElement.setAttribute('d', fillPathData);
    }

    // Interval to simulate performance changes and update graphs
    const graphUpdateInterval = setInterval(() => {
        // Read stats from header elements if available, otherwise mock
        const cpuText = document.getElementById('stat-cpu');
        const memText = document.getElementById('stat-mem');

        const cpuVal = cpuText ? parseInt(cpuText.textContent) || 12 : Math.floor(Math.random() * 20) + 5;
        const memVal = memText ? parseInt(memText.textContent) || 28 : Math.floor(Math.random() * 5) + 30;

        // Simulated Network Traffic (0 to 800 KB/s)
        const netVal = Math.floor(Math.random() * 150) + (Math.random() > 0.8 ? 500 : 8);
        // Simulated Disk Activity (0 to 120 MB/s)
        const diskVal = Math.floor(Math.random() * 8) + (Math.random() > 0.9 ? 85 : 0.5);

        // Update charts
        updateChart(cpuHistory, cpuVal, cpuPath);
        updateChart(memHistory, memVal, memPath);

        const netPercent = Math.min(100, (netVal / 800) * 100);
        updateChart(netHistory, netPercent, netPath);

        const diskPercent = Math.min(100, (diskVal / 100) * 100);
        updateChart(diskHistory, diskPercent, diskPath);

        // Update graph labels
        const cpuLabel = document.getElementById('cpu-graph-label');
        const memLabel = document.getElementById('mem-graph-label');
        const netLabel = document.getElementById('net-graph-label');
        const diskLabel = document.getElementById('disk-graph-label');

        if (cpuLabel) cpuLabel.textContent = `CPU Load: ${cpuVal}%`;
        if (memLabel) memLabel.textContent = `Memory Usage: ${memVal}%`;
        if (netLabel) netLabel.textContent = `Network Traffic: ${netVal} KB/s`;
        if (diskLabel) diskLabel.textContent = `Disk Activity: ${diskVal.toFixed(1)} MB/s`;
    }, 800);

    // Tab Pane Toggles (Performance Grid vs Processes list)
    const tabs = document.querySelectorAll('.monitor-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const tabId = tab.getAttribute('data-tab');
            const graphPane = document.getElementById('monitor-pane-graphs');
            const procPane = document.getElementById('monitor-pane-processes');

            if (tabId === 'performance') {
                if (graphPane) graphPane.style.display = 'grid';
                if (procPane) procPane.style.display = 'none';
            } else if (tabId === 'processes') {
                if (graphPane) graphPane.style.display = 'none';
                if (procPane) procPane.style.display = 'flex';
                renderProcesses();
            }
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
        switch (windowId) {
            case 'terminal-window': return 892;
            case 'browser-window': return 1024;
            case 'editor-window': return 744;
            case 'paint-window': return 1102;
            case 'media-window': return 954;
            case 'chat-window': return 1308;
            case 'store-window': return 620;
            case 'notes-window': return 812;
            case 'calculator-window': return 504;
            case 'calendar-window': return 412;
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
    const processUpdateInterval = setInterval(() => {
        // Fluctuate system cpu
        systemProcesses.forEach(proc => {
            if (proc.name === 'systemd' || proc.name === 'kthreadd') return;
            const delta = (Math.random() - 0.5) * 1.5;
            proc.cpu = Math.max(0.1, proc.cpu + delta);
        });

        // Fluctuate app cpu
        appWindowProcesses.forEach(app => {
            if (!app.currentCpu) app.currentCpu = app.defaultCpu;
            const delta = (Math.random() - 0.5) * 1.5;
            app.currentCpu = Math.max(0.1, app.currentCpu + delta);
        });

        const procTab = document.querySelector('.monitor-tab[data-tab="processes"]');
        if (procTab && procTab.classList.contains('active')) {
            renderProcesses();
        }
    }, 2000);

    // Force Quit Task handler
    if (killBtn) {
        killBtn.addEventListener('click', async () => {
            if (selectedPid === null) return;
            
            const currentProcesses = getProcesses();
            const proc = currentProcesses.find(p => p.pid === selectedPid);
            
            if (proc) {
                const confirmed = await showDialog.confirm(`Are you sure you want to force quit ${proc.name} (PID ${selectedPid})?`, 'Force Quit Process');
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

    // Cleanup interval bindings when window close is detected (optional/safety)
    const monitorWin = document.getElementById('monitor-window');
    if (monitorWin) {
        monitorWin.addEventListener('window-close', () => {
            // Can clear intervals if needed, but since it's a persistent tab in background, we let it tick
        });
    }
}
