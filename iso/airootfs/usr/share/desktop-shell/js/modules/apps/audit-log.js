/* ============================================================
   AIOS — Audit Log Viewer Logic
   Standard: Modular initialization, Promise-based IPC
   ============================================================ */

import { aisd } from '../aisd-client.js';

export function initAuditLog() {
    console.log('[AuditLog] Initializing Audit Log Module...');

    const refreshBtn = document.getElementById('audit-refresh-btn');
    const clearBtn = document.getElementById('audit-clear-btn');
    const tbody = document.getElementById('audit-log-tbody');
    const emptyState = document.getElementById('audit-empty-state');

    if (!refreshBtn || !tbody) return;

    async function loadLogs() {
        try {
            // Since aisd doesn't have a direct 'audit/get' method yet based on my audit,
            // we simulate it or use 'fs/read' on the audit log path if permitted.
            // For now, we'll try to read the log file directly via aisd IPC.
            const response = await aisd.call('fs/read', { path: '/var/log/aios/audit.jsonl' });
            
            if (response.success && response.result) {
                renderLogs(response.result);
            } else {
                // Fallback: the log might be at a different path or empty
                renderLogs("");
            }
        } catch (error) {
            console.error('[AuditLog] Failed to load logs:', error);
            renderLogs("");
        }
    }

    function renderLogs(logData) {
        tbody.innerHTML = '';
        
        if (!logData || logData.trim() === "") {
            emptyState.style.display = 'flex';
            return;
        }

        emptyState.style.display = 'none';
        
        const lines = logData.trim().split('\n').reverse(); // Newest first
        
        lines.forEach(line => {
            try {
                const entry = JSON.parse(line);
                const row = document.createElement('tr');
                
                const date = new Date(entry.ts_unix_ms);
                const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                
                row.innerHTML = `
                    <td>${timeStr}</td>
                    <td>${entry.uid}</td>
                    <td><code>${entry.method}</code></td>
                    <td><code>${entry.capability}</code></td>
                    <td><span class="audit-badge ${entry.decision}">${entry.decision}</span></td>
                `;
                
                tbody.appendChild(row);
            } catch (e) {
                console.warn('[AuditLog] Failed to parse log line:', line);
            }
        });
    }

    refreshBtn.addEventListener('click', () => {
        loadLogs();
    });

    clearBtn.addEventListener('click', async () => {
        if (confirm('Are you sure you want to clear the audit logs? This action requires root privileges.')) {
            // Logic to clear logs via aisd
            await aisd.call('fs/write', { path: '/var/log/aios/audit.jsonl', content: '' });
            loadLogs();
        }
    });

    // Load on open
    const auditWin = document.getElementById('audit-log-window');
    if (auditWin) {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'style' && auditWin.style.display !== 'none') {
                    loadLogs();
                }
            });
        });
        observer.observe(auditWin, { attributes: true });
    }
}
