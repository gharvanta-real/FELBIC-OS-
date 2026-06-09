/* FELBIC OS - System Stats Module
 * Uses the shared aisd-client singleton instead of its own WebSocket.
 */

import { aisd } from './aisd-client.js';

export function initStats(cpuId, memoryId) {
    const cpuElement = document.getElementById(cpuId);
    const memoryElement = document.getElementById(memoryId);

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
        if (aisd.connected) return;
        const currentCpu = randomFluctuation(cpuBase, 6);
        const currentMemory = randomFluctuation(memoryBase, 1);
        if (cpuElement) cpuElement.textContent = `${currentCpu}%`;
        if (memoryElement) memoryElement.textContent = `${currentMemory}%`;
        if (Math.random() > 0.8) cpuBase = Math.random() > 0.5 ? 8 : 3;
    }

    async function requestStats() {
        if (!aisd.connected) return;
        try {
            const stats = await aisd.call('stats/get', {});
            if (stats) {
                setStats(
                    stats.cpu_load_percent || 0,
                    stats.memory_used_bytes || 0,
                    stats.memory_total_bytes || 1
                );
            }
        } catch {
            // silently ignore — fallback animation handles UI
        }
    }

    // Listen to push stats events from aisd (sent every 5s by IPC server)
    aisd.on('stats', (data) => {
        if (data) {
            setStats(
                data.cpu_load_percent || 0,
                data.memory_used_bytes || 0,
                data.memory_total_bytes || 1
            );
        }
    });

    // Start fallback animation immediately
    updateFallbackStats();
    setInterval(updateFallbackStats, 2500);

    // Poll stats every 5s as well (belt + suspenders approach)
    setInterval(requestStats, 5000);
    // First poll
    requestStats();
}
