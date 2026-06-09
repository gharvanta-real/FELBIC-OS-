/* FELBIC OS — AIOS Agent API
 *
 * This is the bridge that lets the AI ACTUALLY control the desktop shell.
 * When aisd can't reach real OS apps (e.g. in browser prototype mode),
 * this JS API allows the AI to control the shell's own apps.
 *
 * Exposed as window.AIOS_AGENT — the AI assistant calls these functions
 * based on user requests. The AI tool-use loop in aisd maps tool_calls
 * to JSON messages → aisd-client → aisd WebSocket → back to shell.
 *
 * But ALSO: when running in browser mode, the AI assistant can call
 * these directly via the window API (offline-capable agent).
 *
 * Capabilities:
 *  - Open/close any app window in the shell
 *  - Write to the code editor
 *  - Draw shapes/patterns on the paint canvas
 *  - Fill forms in the built-in browser
 *  - Create files in VFS
 *  - Control media player
 *  - Take "screenshot" (canvas export)
 *  - Show notifications
 */

import { aisd } from './aisd-client.js';

export function initAgentAPI() {
    console.log('[felbicos] Initializing AIOS Agent API...');

    const agent = {

        // ── App Control ────────────────────────────────────────────────────────

        /** Open any app window by ID or name */
        openApp(appName) {
            const map = {
                'files': 'files-window',
                'finder': 'files-window',
                'terminal': 'terminal-window',
                'editor': 'editor-window',
                'code': 'editor-window',
                'paint': 'paint-window',
                'canvas': 'paint-window',
                'browser': 'browser-window',
                'monitor': 'monitor-window',
                'system': 'monitor-window',
                'media': 'media-window',
                'music': 'media-window',
                'chat': 'chat-window',
                'settings': 'settings-window',
                'installer': 'installer-window',
            };
            const windowId = map[appName.toLowerCase()] || `${appName.toLowerCase()}-window`;
            const win = document.getElementById(windowId);
            if (win) {
                win.style.display = 'flex';
                win.style.zIndex = '1000';
                // Trigger focusWindow if available
                if (window.focusWindow) window.focusWindow(windowId);
                return { success: true, opened: windowId };
            }
            // Try dock icon click
            const dockBtn = document.querySelector(`[data-window="${windowId}"], [onclick*="${windowId}"]`);
            if (dockBtn) {
                dockBtn.click();
                return { success: true, opened: windowId, via: 'dock' };
            }
            return { success: false, error: `App '${appName}' not found` };
        },

        /** Close an app window */
        closeApp(appName) {
            const result = this.openApp(appName);
            if (result.success) {
                const win = document.getElementById(result.opened);
                if (win) { win.style.display = 'none'; }
                return { success: true, closed: result.opened };
            }
            return result;
        },

        // ── Paint/Canvas ───────────────────────────────────────────────────────

        /** Draw on the paint canvas — supports shapes and AI brush patterns */
        drawOnCanvas(instructions) {
            const canvas = document.getElementById('paint-canvas');
            if (!canvas) {
                // Try to open paint window first
                this.openApp('paint');
                setTimeout(() => this.drawOnCanvas(instructions), 800);
                return { success: false, error: 'Opening paint first...' };
            }

            const ctx = canvas.getContext('2d');
            const { shape, color, x, y, width, height, text, points, pattern } = instructions;

            ctx.save();
            ctx.strokeStyle = color || '#6366f1';
            ctx.fillStyle = color || '#6366f1';
            ctx.lineWidth = instructions.lineWidth || 3;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            if (shape === 'circle') {
                ctx.beginPath();
                ctx.arc(x || canvas.width/2, y || canvas.height/2, (width || 80)/2, 0, Math.PI * 2);
                ctx.stroke();
            } else if (shape === 'rectangle' || shape === 'rect') {
                ctx.strokeRect(x || 50, y || 50, width || 200, height || 150);
            } else if (shape === 'fill-circle') {
                ctx.beginPath();
                ctx.arc(x || canvas.width/2, y || canvas.height/2, (width || 80)/2, 0, Math.PI * 2);
                ctx.fill();
            } else if (shape === 'fill-rect') {
                ctx.fillRect(x || 50, y || 50, width || 200, height || 150);
            } else if (shape === 'line') {
                const pts = points || [[0, canvas.height/2], [canvas.width, canvas.height/2]];
                ctx.beginPath();
                ctx.moveTo(pts[0][0], pts[0][1]);
                for (let i = 1; i < pts.length; i++) {
                    ctx.lineTo(pts[i][0], pts[i][1]);
                }
                ctx.stroke();
            } else if (shape === 'text') {
                ctx.font = `${instructions.fontSize || 24}px Inter, sans-serif`;
                ctx.fillText(text || 'AIOS', x || 50, y || 80);
            } else if (shape === 'star') {
                drawStar(ctx, x || canvas.width/2, y || canvas.height/2, width || 60, 5, color || '#f59e0b');
            } else if (shape === 'gradient-bg') {
                const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
                grad.addColorStop(0, color || '#6366f1');
                grad.addColorStop(1, instructions.color2 || '#a78bfa');
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            } else if (pattern === 'ai-art' || shape === 'ai-art') {
                // Procedural AI art pattern
                drawAIPattern(ctx, canvas.width, canvas.height);
            } else {
                // Default: draw a gradient filled circle
                const grad = ctx.createRadialGradient(canvas.width/2, canvas.height/2, 10, canvas.width/2, canvas.height/2, 100);
                grad.addColorStop(0, '#6366f1');
                grad.addColorStop(1, '#a78bfa');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(canvas.width/2, canvas.height/2, 100, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
            return { success: true, shape: shape || 'default' };
        },

        /** Create multi-element artwork */
        createArtwork(theme) {
            this.openApp('paint');
            setTimeout(() => {
                const canvas = document.getElementById('paint-canvas');
                if (!canvas) return;
                const ctx = canvas.getContext('2d');

                // Clear
                ctx.clearRect(0, 0, canvas.width, canvas.height);

                if (theme === 'landscape' || theme === 'nature') {
                    drawLandscape(ctx, canvas.width, canvas.height);
                } else if (theme === 'galaxy' || theme === 'space') {
                    drawGalaxy(ctx, canvas.width, canvas.height);
                } else if (theme === 'geometric' || theme === 'abstract') {
                    drawGeometric(ctx, canvas.width, canvas.height);
                } else {
                    drawAIPattern(ctx, canvas.width, canvas.height);
                }
            }, 600);
            return { success: true, theme };
        },

        // ── Editor ─────────────────────────────────────────────────────────────

        /** Write code/text content to the code editor */
        writeToEditor(content, filename) {
            this.openApp('editor');
            setTimeout(() => {
                const textarea = document.querySelector('#editor-window textarea, #editor-window .cm-content, #editor-content');
                if (textarea) {
                    if (textarea.tagName === 'TEXTAREA') {
                        textarea.value = content;
                        textarea.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                }
                // Update filename if editor has tab
                if (filename) {
                    const tabEl = document.querySelector('#editor-tab-name, .editor-tab.active .tab-name');
                    if (tabEl) tabEl.textContent = filename;
                }
            }, 500);
            return { success: true, chars: content.length };
        },

        // ── VFS File Operations ────────────────────────────────────────────────

        /** Create a file in the VFS */
        createFile(path, content) {
            if (!window.VFS) return { success: false, error: 'VFS not ready' };
            const parts = path.split('/').filter(Boolean);
            const filename = parts.pop();
            const dirPath = '/' + parts.join('/');

            // Ensure parent directory exists
            let current = '/';
            for (const part of parts) {
                const next = current === '/' ? `/${part}` : `${current}/${part}`;
                if (!window.VFS.exists(next)) {
                    window.VFS.mkdir(current, part);
                }
                current = next;
            }

            window.VFS.writeFile(dirPath || '/', filename, content);
            return { success: true, path: `${dirPath}/${filename}`, size: content.length };
        },

        /** Read a file from VFS */
        readFile(path) {
            if (!window.VFS) return { success: false, error: 'VFS not ready' };
            try {
                const content = window.VFS.readFile(path);
                return { success: true, content, size: content?.length || 0 };
            } catch (e) {
                return { success: false, error: e.message };
            }
        },

        // ── Browser ────────────────────────────────────────────────────────────

        /** Navigate the built-in browser to a URL */
        navigateTo(url) {
            this.openApp('browser');
            setTimeout(() => {
                const urlBar = document.getElementById('browser-url') || document.querySelector('#browser-window input[type="text"]');
                if (urlBar) {
                    urlBar.value = url;
                    urlBar.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
                }
                const iframe = document.getElementById('browser-iframe') || document.querySelector('#browser-window iframe');
                if (iframe) {
                    iframe.src = url;
                }
            }, 600);
            return { success: true, url };
        },

        // ── Notifications ──────────────────────────────────────────────────────

        /** Show a system notification */
        notify(title, message, type = 'info') {
            if (window.showNotification) {
                window.showNotification(title, message, type);
            } else {
                // Fallback — create notification ourselves
                const notif = document.createElement('div');
                notif.className = 'system-notification';
                notif.style.cssText = `
                    position: fixed; bottom: 20px; right: 20px; z-index: 99999;
                    background: rgba(15,15,20,0.95); backdrop-filter: blur(20px);
                    border: 1px solid rgba(255,255,255,0.12); border-radius: 12px;
                    padding: 14px 18px; color: white; font-family: Inter, sans-serif;
                    font-size: 13px; max-width: 320px; box-shadow: 0 8px 32px rgba(0,0,0,0.5);
                    animation: slideInNotif 0.3s ease;
                `;
                notif.innerHTML = `<strong>${title}</strong><br><span style="opacity:0.7">${message}</span>`;
                document.body.appendChild(notif);
                setTimeout(() => notif.remove(), 4000);
            }
            return { success: true };
        },

        // ── Screenshot ─────────────────────────────────────────────────────────

        /** Export the current view as a PNG data URL */
        async screenshot() {
            // If html2canvas available, capture whole screen
            if (window.html2canvas) {
                const canvas = await window.html2canvas(document.body);
                return { success: true, dataUrl: canvas.toDataURL('image/png') };
            }
            // Fallback: just export paint canvas
            const paintCanvas = document.getElementById('paint-canvas');
            if (paintCanvas) {
                return { success: true, dataUrl: paintCanvas.toDataURL('image/png') };
            }
            return { success: false, error: 'No canvas available for screenshot' };
        },

        // ── Form Filling ───────────────────────────────────────────────────────

        /** Fill a form field anywhere on the page by label or selector */
        fillField(selector, value) {
            let el = null;

            // Try by label text
            const labels = document.querySelectorAll('label');
            for (const label of labels) {
                if (label.textContent.toLowerCase().includes(selector.toLowerCase())) {
                    const forId = label.getAttribute('for');
                    if (forId) el = document.getElementById(forId);
                    if (!el) el = label.nextElementSibling;
                    if (!el) el = label.querySelector('input, textarea, select');
                    if (el) break;
                }
            }

            // Try by placeholder
            if (!el) el = document.querySelector(`[placeholder*="${selector}"]`);

            // Try by name/id
            if (!el) el = document.querySelector(`[name="${selector}"], #${selector}`);

            if (!el) return { success: false, error: `Field '${selector}' not found` };

            el.focus();
            if (el.tagName === 'SELECT') {
                const option = [...el.options].find(o => o.text.toLowerCase().includes(value.toLowerCase()));
                if (option) el.value = option.value;
            } else {
                el.value = value;
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
            }

            return { success: true, field: selector, value };
        },
    };

    // ── Register global ───────────────────────────────────────────────────────
    window.AIOS_AGENT = agent;

    // ── Register agent action handler on aisd push events ────────────────────
    // When aisd sends an 'agent_action' push event, execute it locally
    aisd.on('agent_action', (action) => {
        if (!action || !action.type) return;
        console.log('[AIOS_AGENT] Received action:', action);

        try {
            switch (action.type) {
                case 'open_app': agent.openApp(action.app); break;
                case 'draw': agent.drawOnCanvas(action); break;
                case 'artwork': agent.createArtwork(action.theme); break;
                case 'write_editor': agent.writeToEditor(action.content, action.filename); break;
                case 'create_file': agent.createFile(action.path, action.content); break;
                case 'navigate': agent.navigateTo(action.url); break;
                case 'notify': agent.notify(action.title, action.message, action.level); break;
                case 'fill_field': agent.fillField(action.selector, action.value); break;
            }
        } catch (e) {
            console.warn('[AIOS_AGENT] Action error:', e);
        }
    });

    console.log('[felbicos] AIOS Agent API ready. window.AIOS_AGENT is available.');
}

// ── Drawing Helpers ───────────────────────────────────────────────────────────

function drawStar(ctx, cx, cy, radius, points, color) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
        const r = i % 2 === 0 ? radius : radius * 0.4;
        const angle = (i * Math.PI) / points - Math.PI / 2;
        if (i === 0) ctx.moveTo(cx + r * Math.cos(angle), cy + r * Math.sin(angle));
        else ctx.lineTo(cx + r * Math.cos(angle), cy + r * Math.sin(angle));
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

function drawAIPattern(ctx, w, h) {
    const colors = ['#6366f1', '#8b5cf6', '#a78bfa', '#ec4899', '#3b82f6', '#10b981'];
    ctx.save();

    // Background
    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, '#0f0f14');
    bg.addColorStop(1, '#1a1a2e');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Organic circles
    for (let i = 0; i < 12; i++) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        const r = 20 + Math.random() * 80;
        const color = colors[Math.floor(Math.random() * colors.length)];
        const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
        grad.addColorStop(0, color + 'aa');
        grad.addColorStop(1, color + '00');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    }

    // Grid lines
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.15)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y < h; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    // Central glow text
    ctx.font = 'bold 28px Inter, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.textAlign = 'center';
    ctx.fillText('AIOS', w / 2, h / 2);

    ctx.restore();
}

function drawLandscape(ctx, w, h) {
    ctx.save();
    // Sky gradient
    const sky = ctx.createLinearGradient(0, 0, 0, h * 0.6);
    sky.addColorStop(0, '#1e3a5f');
    sky.addColorStop(1, '#f97316');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h * 0.6);

    // Sun
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(w * 0.7, h * 0.25, 35, 0, Math.PI * 2);
    ctx.fill();

    // Mountains
    ctx.fillStyle = '#374151';
    ctx.beginPath();
    ctx.moveTo(0, h * 0.6);
    ctx.lineTo(w * 0.2, h * 0.3);
    ctx.lineTo(w * 0.4, h * 0.5);
    ctx.lineTo(w * 0.6, h * 0.28);
    ctx.lineTo(w * 0.8, h * 0.45);
    ctx.lineTo(w, h * 0.35);
    ctx.lineTo(w, h * 0.6);
    ctx.closePath();
    ctx.fill();

    // Ground
    const ground = ctx.createLinearGradient(0, h * 0.6, 0, h);
    ground.addColorStop(0, '#166534');
    ground.addColorStop(1, '#052e16');
    ctx.fillStyle = ground;
    ctx.fillRect(0, h * 0.6, w, h * 0.4);

    ctx.restore();
}

function drawGalaxy(ctx, w, h) {
    ctx.save();
    ctx.fillStyle = '#000010';
    ctx.fillRect(0, 0, w, h);

    // Stars
    for (let i = 0; i < 200; i++) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        const r = Math.random() * 1.5;
        ctx.fillStyle = `rgba(255,255,255,${0.3 + Math.random() * 0.7})`;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    }

    // Galaxy spiral
    const cx = w / 2, cy = h / 2;
    for (let i = 0; i < 500; i++) {
        const angle = i * 0.15;
        const r = i * 0.35;
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);
        const alpha = Math.max(0, 1 - r / (Math.min(w, h) * 0.45));
        const hue = 200 + (i / 500) * 60;
        ctx.fillStyle = `hsla(${hue}, 80%, 70%, ${alpha * 0.6})`;
        ctx.beginPath();
        ctx.arc(x, y, 1.5, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
}

function drawGeometric(ctx, w, h) {
    ctx.save();
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, w, h);

    const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f59e0b'];
    const count = 8;

    for (let i = 0; i < count; i++) {
        const x = (i / count) * w;
        const color = colors[i % colors.length];
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;

        // Triangles
        ctx.beginPath();
        ctx.moveTo(x + w / count / 2, 20);
        ctx.lineTo(x + w / count - 10, h - 20);
        ctx.lineTo(x + 10, h - 20);
        ctx.closePath();
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = color;
        ctx.fill();
        ctx.globalAlpha = 0.8;
        ctx.stroke();
    }

    ctx.restore();
}
