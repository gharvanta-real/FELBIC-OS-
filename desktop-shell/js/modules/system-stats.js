/* FELBIC OS - System Stats Module */

export function initStats(cpuId, memoryId) {
    const cpuElement = document.getElementById(cpuId);
    const memoryElement = document.getElementById(memoryId);
    let connected = false;
    let socket = null;
    let cpuBase = 4;
    let memoryBase = 27;

    function setStats(cpuPercent, memoryUsedBytes, memoryTotalBytes) {
        if (cpuElement) cpuElement.textContent = `${Math.round(cpuPercent)}%`;
        if (memoryElement && memoryTotalBytes > 0) {
            const memPercent = (memoryUsedBytes / memoryTotalBytes) * 100;
            memoryElement.textContent = `${Math.round(memPercent)}%`;
        }
    }

    function randomFluctuation(base, range) {
        const delta = (Math.random() - 0.5) * range;
        return Math.max(1, Math.min(100, Math.round(base + delta)));
    }

    function updateFallbackStats() {
        if (connected) return;
        const currentCpu = randomFluctuation(cpuBase, 6);
        const currentMemory = randomFluctuation(memoryBase, 1);
        if (cpuElement) cpuElement.textContent = `${currentCpu}%`;
        if (memoryElement) memoryElement.textContent = `${currentMemory}%`;
        if (Math.random() > 0.8) cpuBase = Math.random() > 0.5 ? 8 : 3;
    }

    function requestStats() {
        if (!socket || socket.readyState !== WebSocket.OPEN) return;
        socket.send(JSON.stringify({
            id: Date.now(),
            method: 'stats/get',
            params: {}
        }));
    }

    function connectDaemon() {
        try {
            socket = new WebSocket('ws://127.0.0.1:8080');
        } catch (error) {
            connected = false;
            return;
        }

        socket.addEventListener('open', () => {
            connected = true;
            document.body.classList.add('aisd-connected');
            requestStats();
        });

        socket.addEventListener('message', (event) => {
            try {
                const message = JSON.parse(event.data);
                const stats = message.event === 'stats' ? message.data : message.result;
                if (!stats) return;
                setStats(
                    stats.cpu_load_percent || 0,
                    stats.memory_used_bytes || 0,
                    stats.memory_total_bytes || 1
                );
            } catch (error) {
                console.warn('[felbicos] Failed to parse aisd stats payload', error);
            }
        });

        socket.addEventListener('close', () => {
            connected = false;
            document.body.classList.remove('aisd-connected');
            setTimeout(connectDaemon, 3000);
        });

        socket.addEventListener('error', () => {
            connected = false;
            document.body.classList.remove('aisd-connected');
        });
    }

    updateFallbackStats();
    connectDaemon();
    setInterval(updateFallbackStats, 2500);
    setInterval(requestStats, 5000);
}
