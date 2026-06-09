/* FELBIC OS — AIOS Intelligence
 *
 * macOS Siri-style integrated AI interface.
 * NOT a side panel. A centered floating overlay anchored above the dock.
 *
 * Anatomy:
 *   1. Menu bar orb  — tiny pulsing sphere in topbar (always visible)
 *   2. Veil          — subtle dark overlay when active
 *   3. Float card    — centered glass container (appears from below)
 *      ├─ Siri orb  — big animated sphere
 *      ├─ Convo     — floating message history
 *      ├─ Chips     — quick suggestions
 *      └─ Input     — Spotlight-style glass pill input
 *   4. Action toast  — tiny pill at top when AI takes action
 *
 * Keyboard: Ctrl+Shift+A or Super+A to toggle
 *           Escape to close
 *           Enter to send, Shift+Enter for newline
 */

import { aisd } from './aisd-client.js';

function getAgent() { return window.AIOS_AGENT || null; }

// ── Action Toast ──────────────────────────────────────────────────────────────
let toastTimer = null;

function showActionToast(icon, text) {
    let toast = document.getElementById('ai-action-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'ai-action-toast';
        toast.className = 'ai-action-toast';
        toast.innerHTML = '<span class="ai-action-toast-icon"></span><span class="ai-action-toast-text"></span>';
        document.body.appendChild(toast);
    }
    toast.querySelector('.ai-action-toast-icon').textContent = icon;
    toast.querySelector('.ai-action-toast-text').textContent = text;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
}

// ── Module init ───────────────────────────────────────────────────────────────

export function initAIAssistant() {
    console.log('[felbicos] Initializing AIOS Intelligence (Siri-style)...');

    // ── 1. Inject HTML ────────────────────────────────────────────────────────
    const veil = document.createElement('div');
    veil.id = 'ai-veil';
    veil.className = 'ai-veil';
    document.body.appendChild(veil);

    const container = document.createElement('div');
    container.id = 'ai-float-container';
    container.className = 'ai-float-container';
    container.setAttribute('role', 'dialog');
    container.setAttribute('aria-label', 'AIOS Intelligence');
    container.innerHTML = `
        <div class="ai-siri-orb" id="ai-siri-orb">
            <div class="ai-siri-orb-inner"></div>
        </div>

        <div class="ai-convo-scroll" id="ai-convo-scroll">
            <div class="ai-msg ai-msg-assistant ai-msg-welcome">
                <div class="ai-msg-bubble">
                    <strong>✦ AIOS Intelligence</strong><br>
                    I can draw, open apps, fill forms, search your files, and control LibreOffice.<br><br>
                    <em>Try: "Draw a galaxy" &nbsp;•&nbsp; "Open terminal" &nbsp;•&nbsp; "Write a Python script"</em>
                </div>
            </div>
        </div>

        <div class="ai-suggestions" id="ai-suggestions">
            <button class="ai-suggestion-chip" data-prompt="Draw a galaxy on the canvas">✦ Draw Galaxy</button>
            <button class="ai-suggestion-chip" data-prompt="Show CPU and memory stats">⬡ System Stats</button>
            <button class="ai-suggestion-chip" data-prompt="Open the terminal">⌘ Terminal</button>
            <button class="ai-suggestion-chip" data-prompt="Search for PDF files">⌕ Find Files</button>
            <button class="ai-suggestion-chip" data-prompt="What can you do?">◎ Help</button>
        </div>

        <div class="ai-input-card" id="ai-input-card">
            <div class="ai-input-row">
                <textarea
                    id="ai-input-field"
                    class="ai-input-field"
                    placeholder="Ask anything…"
                    rows="1"
                    autocomplete="off"
                    spellcheck="false"
                ></textarea>
                <button class="ai-send-btn" id="ai-send-btn" aria-label="Send">
                    <i class="hgi-stroke hgi-arrow-up-01"></i>
                </button>
            </div>
            <div class="ai-input-meta">
                <span class="ai-input-hint">↵ Send &nbsp;·&nbsp; ⇧↵ Newline &nbsp;·&nbsp; ⎋ Close</span>
                <span class="ai-status-chip" id="ai-status-chip">
                    <span class="ai-status-dot"></span>
                    <span id="ai-status-text">Connecting</span>
                </span>
            </div>
        </div>
    `;
    document.body.appendChild(container);

    // ── 2. Inject topbar orb ──────────────────────────────────────────────────
    injectMenuOrb();

    // ── 3. DOM refs ───────────────────────────────────────────────────────────
    const convoScroll  = document.getElementById('ai-convo-scroll');
    const inputField   = document.getElementById('ai-input-field');
    const sendBtn      = document.getElementById('ai-send-btn');
    const statusChip   = document.getElementById('ai-status-chip');
    const statusText   = document.getElementById('ai-status-text');
    const menuOrb      = document.getElementById('ai-menu-orb');
    const siriOrb      = document.getElementById('ai-siri-orb');

    let isOpen    = false;
    let isLoading = false;
    const SESSION_ID = 'aios-main';

    // ── 4. Connection state ───────────────────────────────────────────────────

    function syncStatus(connected) {
        if (connected) {
            statusChip?.classList.add('connected');
            statusChip?.classList.remove('offline');
            if (statusText) statusText.textContent = 'aisd connected';
            menuOrb?.classList.add('aisd-live');
        } else {
            statusChip?.classList.remove('connected');
            statusChip?.classList.add('offline');
            if (statusText) statusText.textContent = 'Offline mode';
            menuOrb?.classList.remove('aisd-live');
        }
    }

    aisd.on('connected',    () => syncStatus(true));
    aisd.on('disconnected', () => syncStatus(false));
    syncStatus(aisd.connected);

    // ── 5. Open / Close ───────────────────────────────────────────────────────

    function open() {
        if (isOpen) return;
        isOpen = true;
        veil.classList.add('active');
        container.classList.add('active');
        menuOrb?.classList.add('ai-active');
        setTimeout(() => inputField?.focus(), 250);
        document.body.style.overflow = 'hidden';
    }

    function close() {
        if (!isOpen) return;
        isOpen = false;
        veil.classList.remove('active');
        container.classList.remove('active');
        container.classList.remove('thinking');
        menuOrb?.classList.remove('ai-active', 'ai-thinking');
        document.body.style.overflow = '';
    }

    function toggle() { if (isOpen) close(); else open(); }

    // ── 6. Global API ─────────────────────────────────────────────────────────
    window.toggleAIAssistant = toggle;
    window.openAIAssistant   = open;
    window.closeAIAssistant  = close;
    window.showAIActionToast = showActionToast;

    // ── 7. Event bindings ─────────────────────────────────────────────────────

    // Veil click = close
    veil.addEventListener('click', close);

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if ((e.metaKey && e.key === 'a') || (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'a')) {
            e.preventDefault();
            toggle();
        }
        if (e.key === 'Escape' && isOpen) {
            e.stopPropagation();
            close();
        }
    });

    // Input field
    inputField?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage(inputField.value);
        }
    });

    inputField?.addEventListener('input', () => {
        inputField.style.height = 'auto';
        inputField.style.height = Math.min(inputField.scrollHeight, 130) + 'px';
    });

    sendBtn?.addEventListener('click', () => sendMessage(inputField?.value));

    // Suggestion chips
    container.querySelectorAll('.ai-suggestion-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const prompt = chip.getAttribute('data-prompt');
            if (prompt) sendMessage(prompt);
        });
    });

    // ── 8. Send / Response flow ───────────────────────────────────────────────

    async function sendMessage(text) {
        const prompt = text?.trim();
        if (!prompt || isLoading) return;

        // Clear input
        if (inputField) {
            inputField.value = '';
            inputField.style.height = 'auto';
        }

        // Hide chips after first message for cleaner look
        const chips = document.getElementById('ai-suggestions');
        if (chips) chips.style.display = 'none';

        appendMsg('user', prompt);
        const thinkEl = appendThinking();

        isLoading = true;
        sendBtn.disabled = true;
        container.classList.add('thinking');
        menuOrb?.classList.add('ai-thinking');
        menuOrb?.classList.remove('ai-active');

        try {
            let response;
            if (aisd.connected) {
                const result = await aisd.call('ai/chat', { prompt, session: SESSION_ID });
                response = result?.response ?? '(no response)';
            } else {
                response = handleOfflineAgent(prompt);
            }
            thinkEl.remove();
            appendMsg('assistant', response);
        } catch (err) {
            thinkEl.remove();
            appendMsg('assistant', `⚠ ${err.message}`, true);
        } finally {
            isLoading = false;
            sendBtn.disabled = false;
            container.classList.remove('thinking');
            menuOrb?.classList.remove('ai-thinking');
            menuOrb?.classList.add('ai-active');
            inputField?.focus();
        }
    }

    // ── 9. Message rendering ──────────────────────────────────────────────────

    function appendMsg(role, content, isError = false) {
        const wrapper = document.createElement('div');
        wrapper.className = `ai-msg ai-msg-${role}${isError ? ' ai-msg-error' : ''}`;

        const bubble = document.createElement('div');
        bubble.className = 'ai-msg-bubble';
        bubble.innerHTML = formatContent(content);

        wrapper.appendChild(bubble);
        convoScroll.appendChild(wrapper);
        convoScroll.scrollTop = convoScroll.scrollHeight;
        return wrapper;
    }

    function appendThinking() {
        const wrapper = document.createElement('div');
        wrapper.className = 'ai-msg ai-msg-assistant ai-msg-thinking';
        wrapper.innerHTML = `
            <div class="ai-msg-bubble">
                <div class="ai-waveform">
                    <span></span><span></span><span></span>
                    <span></span><span></span><span></span><span></span>
                </div>
            </div>
        `;
        convoScroll.appendChild(wrapper);
        convoScroll.scrollTop = convoScroll.scrollHeight;
        return wrapper;
    }

    function formatContent(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            .replace(/\n/g, '<br>');
    }

    // ── 10. Offline Agent Mode ────────────────────────────────────────────────

    function handleOfflineAgent(prompt) {
        const agent = getAgent();
        const lp = prompt.toLowerCase();

        if (lp.match(/draw|paint|create art|sketch/)) {
            if (!agent) return '🎨 Open Paint from the Dock and I\'ll draw for you!';
            const theme = lp.includes('galaxy') || lp.includes('space') ? 'galaxy'
                : lp.includes('landscape') || lp.includes('nature') ? 'landscape'
                : lp.includes('geometric') || lp.includes('abstract') ? 'geometric'
                : 'ai-art';
            agent.createArtwork(theme);
            showActionToast('🎨', `Drawing ${theme}…`);
            return `Drawing a **${theme}** in the Paint app. Check it out!`;
        }

        if (lp.match(/open|launch|show/) ) {
            const appMap = { files: 'Files', terminal: 'Terminal', editor: 'Editor',
                paint: 'Paint', browser: 'Browser', monitor: 'Monitor',
                settings: 'Settings', media: 'Media Player', chat: 'Chat' };
            for (const [key, label] of Object.entries(appMap)) {
                if (lp.includes(key)) {
                    agent?.openApp(key);
                    showActionToast('✓', `Opening ${label}`);
                    return `Opening **${label}**…`;
                }
            }
        }

        if (lp.match(/python|\.py|script|code/)) {
            const code = '#!/usr/bin/env python3\n# Generated by AIOS Intelligence\n\nprint("Hello from AIOS!")\n\ndef main():\n    print("AI Agent is running!")\n\nif __name__ == "__main__":\n    main()';
            agent?.writeToEditor(code, 'aios_script.py');
            agent?.createFile('/workspace/aios_script.py', code);
            showActionToast('📝', 'Created aios_script.py');
            return '✅ Created **aios_script.py** in the editor!';
        }

        if (lp.match(/cpu|memory|ram|stats/)) {
            const cpuEl = document.getElementById('stat-cpu');
            const memEl = document.getElementById('stat-mem');
            return `**System** (UI live data)\n• CPU: ${cpuEl?.textContent || '—'}\n• Memory: ${memEl?.textContent || '—'}\n\nFor full stats: \`systemctl start aisd\``;
        }

        if (lp.match(/help|what can|capabilities/)) {
            return [
                '**AIOS Intelligence can:**',
                '',
                '🎨 `Draw a galaxy` — Paint artwork on canvas',
                '📱 `Open terminal` — Launch any app',
                '📝 `Write a Python script` — Create code files',
                '📊 `Show CPU stats` — System monitoring',
                '🔍 `Find PDF files` — Search filesystem',
                '',
                '_With aisd running:_',
                '• Fill LibreOffice forms automatically',
                '• Control any app via AT-SPI2',
                '• Take screenshots',
                '• Inject keystrokes into any window',
            ].join('\n');
        }

        return `I'm in **offline mode**. I can still:\n• 🎨 Draw artwork\n• 📱 Open apps\n• 📝 Create files\n\nFor full AI power: \`systemctl start aisd\``;
    }
}

// ── Topbar orb injection ──────────────────────────────────────────────────────

function injectMenuOrb() {
    // Prefer topbar-right; fall back to any topbar element
    const topbar = document.querySelector('.topbar-right, .topbar-center, #topbar, .topbar');
    if (!topbar) {
        // Retry after DOM is stable
        setTimeout(injectMenuOrb, 500);
        return;
    }

    if (document.getElementById('ai-menu-orb')) return;

    const orb = document.createElement('button');
    orb.id = 'ai-menu-orb';
    orb.className = 'ai-menu-orb';
    orb.title = 'AIOS Intelligence (⌃⇧A)';
    orb.setAttribute('aria-label', 'Toggle AIOS Intelligence');
    orb.innerHTML = `
        <div class="ai-orb-sphere"></div>
        <div class="ai-orb-live-dot"></div>
    `;

    orb.addEventListener('click', () => {
        if (window.toggleAIAssistant) window.toggleAIAssistant();
    });

    aisd.on('connected',    () => orb.classList.add('aisd-live'));
    aisd.on('disconnected', () => orb.classList.remove('aisd-live'));
    if (aisd.connected) orb.classList.add('aisd-live');

    // Insert in topbar — try right side first
    const rightSide = document.querySelector('.topbar-right');
    if (rightSide) {
        rightSide.insertBefore(orb, rightSide.firstChild);
    } else {
        topbar.appendChild(orb);
    }
}
