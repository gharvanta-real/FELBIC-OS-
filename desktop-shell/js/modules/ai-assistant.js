/* FELBIC OS — AIOS Intelligence
 *
 * macOS Siri Panel Window UI & Logic.
 * Directly styled as a vertical right-anchored panel matching the provided design.
 */

import { aisd } from './aisd-client.js';

function getAgent() { return window.AIOS_AGENT || null; }

// ── Action Toast Notification ──────────────────────────────────────────────────
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

// ── Code Clipboard Copy Helper ────────────────────────────────────────────────
window.copyAICode = function(button) {
    const codeBlock = button.closest('.ai-code-block');
    const codeEl = codeBlock.querySelector('pre code');
    if (codeEl) {
        const tempTextarea = document.createElement('textarea');
        tempTextarea.innerHTML = codeEl.innerHTML;
        const textToCopy = tempTextarea.value;

        navigator.clipboard.writeText(textToCopy).then(() => {
            const originalHTML = button.innerHTML;
            button.innerHTML = '<i class="hgi-stroke hgi-tick-01"></i> Copied!';
            button.disabled = true;
            setTimeout(() => {
                button.innerHTML = originalHTML;
                button.disabled = false;
            }, 2000);
        }).catch(err => {
            console.error('[ai-assistant] Copy failed', err);
        });
    }
};

// ── Markdown Content Formatter ───────────────────────────────────────────────
function formatContent(text) {
    if (!text) return '';

    // Step 1: Escape HTML tags
    let html = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    // Step 2: Extract code blocks
    const codeBlocks = [];
    const codeBlockRegex = /```(\w*)\r?\n([\s\S]*?)\r?\n```/g;
    
    html = html.replace(codeBlockRegex, (match, lang, code) => {
        const language = lang || 'code';
        const placeholder = `___AI_CODE_BLOCK_PLACEHOLDER_${codeBlocks.length}___`;
        
        const blockHtml = `
            <div class="ai-code-block">
                <div class="ai-code-header">
                    <span class="ai-code-lang">${language}</span>
                    <button class="ai-copy-btn" onclick="window.copyAICode(this)">
                        <i class="hgi-stroke hgi-copy"></i> Copy
                    </button>
                </div>
                <pre><code class="language-${language}">${code.trim()}</code></pre>
            </div>
        `.trim();
        
        codeBlocks.push(blockHtml);
        return placeholder;
    });

    // Step 3: Parse inline code segments
    html = html.replace(/`([^`]+)`/g, '<code class="ai-inline-code">$1</code>');

    // Step 4: Parse bold text
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Step 5: Parse lists line-by-line
    const lines = html.split(/\r?\n/);
    let inList = false;
    let inOrderedList = false;
    const processedLines = [];

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        let trimmed = line.trim();

        if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ')) {
            if (inOrderedList) {
                processedLines.push('</ol>');
                inOrderedList = false;
            }
            if (!inList) {
                processedLines.push('<ul class="ai-list">');
                inList = true;
            }
            const content = line.replace(/^\s*[-*•]\s+/, '');
            processedLines.push(`<li>${content}</li>`);
        }
        else if (/^\d+\.\s+/.test(trimmed)) {
            if (inList) {
                processedLines.push('</ul>');
                inList = false;
            }
            if (!inOrderedList) {
                processedLines.push('<ol class="ai-list-ordered">');
                inOrderedList = true;
            }
            const content = line.replace(/^\s*\d+\.\s+/, '');
            processedLines.push(`<li>${content}</li>`);
        }
        else {
            if (inList) {
                processedLines.push('</ul>');
                inList = false;
            }
            if (inOrderedList) {
                processedLines.push('</ol>');
                inOrderedList = false;
            }
            
            if (trimmed.startsWith('___AI_CODE_BLOCK_PLACEHOLDER_') && trimmed.endsWith('___')) {
                processedLines.push(line);
            } else if (trimmed === '') {
                processedLines.push('<br>');
            } else {
                processedLines.push(line);
            }
        }
    }

    if (inList) processedLines.push('</ul>');
    if (inOrderedList) processedLines.push('</ol>');

    let finalHtml = processedLines.join('\n');

    // Step 6: Restore code blocks
    for (let j = 0; j < codeBlocks.length; j++) {
        finalHtml = finalHtml.replace(`___AI_CODE_BLOCK_PLACEHOLDER_${j}___`, codeBlocks[j]);
    }

    finalHtml = finalHtml.replace(/(<br>\s*){3,}/g, '<br><br>');

    return finalHtml;
}

// ── Module Initialization ──────────────────────────────────────────────────────

export function initAIAssistant() {
    console.log('[felbicos] Initializing Siri Panel Window (macOS style)...');

    // ── 1. Scrim Veil ──
    const veil = document.createElement('div');
    veil.id = 'ai-veil';
    veil.className = 'ai-veil';
    document.body.appendChild(veil);

    // ── 2. Siri Tall Panel Window ──
    const container = document.createElement('div');
    container.id = 'ai-float-container';
    container.className = 'ai-float-container';
    container.setAttribute('role', 'dialog');
    container.setAttribute('aria-label', 'Siri');
    container.innerHTML = `
        <div class="ai-card-header">
            <button class="ai-close-circle-btn" id="ai-close-btn" aria-label="Minimize" title="Minimize">
                <i class="hgi-stroke hgi-minus"></i>
            </button>
        </div>

        <div class="ai-convo-scroll" id="ai-convo-scroll">
            <div class="ai-msg ai-msg-assistant ai-msg-welcome">
                <div class="ai-msg-bubble">
                    👋 Hi! I'm Siri.<br>
                    You can chat with me about anything.<br><br>
                    <em>Try: "Draw a galaxy" &nbsp;•&nbsp; "Open terminal" &nbsp;•&nbsp; "Write a Python script"</em>
                </div>
            </div>
        </div>

        <div class="ai-suggestions" id="ai-suggestions">
            <button class="ai-suggestion-chip" data-prompt="Draw a galaxy on the canvas">Draw Galaxy</button>
            <button class="ai-suggestion-chip" data-prompt="Show CPU and memory stats">System Stats</button>
            <button class="ai-suggestion-chip" data-prompt="Open the terminal">Terminal</button>
            <button class="ai-suggestion-chip" data-prompt="Search for PDF files">Find Files</button>
            <button class="ai-suggestion-chip" data-prompt="What can you do?">Help</button>
        </div>

        <div class="ai-input-card" id="ai-input-card">
            <div class="ai-input-row">
                <input 
                    type="text" 
                    id="ai-input-field" 
                    class="ai-input-field" 
                    placeholder="Type to Siri" 
                    autocomplete="off" 
                    spellcheck="false"
                >
                <button class="ai-input-action-btn" id="ai-input-action-btn" aria-label="Voice Input" title="Voice Input">
                    <i class="hgi-stroke hgi-mic-01" id="ai-action-icon"></i>
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(container);

    // ── 3. Inject menu bar orb ──
    injectMenuOrb();

    // ── 4. DOM Cache ──
    const convoScroll  = document.getElementById('ai-convo-scroll');
    const inputField   = document.getElementById('ai-input-field');
    const actionBtn    = document.getElementById('ai-input-action-btn');
    const actionIcon   = document.getElementById('ai-action-icon');

    let isOpen    = false;
    let isLoading = false;
    const SESSION_ID = 'aios-main';

    // ── 5. Open / Close Controls ──
    function open() {
        if (isOpen) return;
        isOpen = true;
        veil.classList.add('active');
        container.classList.add('active');
        document.getElementById('ai-menu-orb')?.classList.add('ai-active');
        setTimeout(() => inputField?.focus(), 200);
        document.body.style.overflow = 'hidden';
    }

    function close() {
        if (!isOpen) return;
        isOpen = false;
        veil.classList.remove('active');
        container.classList.remove('active');
        container.classList.remove('thinking');
        document.getElementById('ai-menu-orb')?.classList.remove('ai-active', 'ai-thinking');
        document.body.style.overflow = '';
    }

    function toggle() { if (isOpen) close(); else open(); }

    window.toggleAIAssistant = toggle;
    window.openAIAssistant   = open;
    window.closeAIAssistant  = close;
    window.showAIActionToast = showActionToast;

    // ── 6. Event Bindings ──

    // Close dot click
    document.getElementById('ai-close-btn')?.addEventListener('click', close);
    veil.addEventListener('click', close);

    // Keyboard bindings
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

    // Morph Icon as user types
    inputField?.addEventListener('input', () => {
        const hasText = inputField.value.trim().length > 0;
        if (hasText) {
            actionIcon.className = 'hgi-stroke hgi-arrow-up-01';
            actionBtn.setAttribute('aria-label', 'Send');
            actionBtn.setAttribute('title', 'Send');
        } else {
            actionIcon.className = 'hgi-stroke hgi-mic-01';
            actionBtn.setAttribute('aria-label', 'Voice Input');
            actionBtn.setAttribute('title', 'Voice Input');
        }
    });

    // Enter Key to Send
    inputField?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const text = inputField.value.trim();
            if (text) sendMessage(text);
        }
    });

    // Mic / Send button click
    actionBtn?.addEventListener('click', () => {
        const text = inputField.value.trim();
        if (text) {
            sendMessage(text);
        } else {
            simulateVoiceInput();
        }
    });

    // Suggestion chips triggers
    container.querySelectorAll('.ai-suggestion-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const prompt = chip.getAttribute('data-prompt');
            if (prompt) sendMessage(prompt);
        });
    });

    // ── 7. Voice Input Simulation ──
    function simulateVoiceInput() {
        if (isLoading) return;
        
        actionIcon.className = 'hgi-stroke hgi-mic-mute-01'; // listening indicator
        showActionToast('🎙️', 'Listening for voice command...');
        
        setTimeout(() => {
            actionIcon.className = 'hgi-stroke hgi-mic-01';
            const voiceCommands = [
                'Show CPU and memory stats',
                'Draw a galaxy on the canvas',
                'Open the terminal',
                'Search for PDF files'
            ];
            const randomCommand = voiceCommands[Math.floor(Math.random() * voiceCommands.length)];
            inputField.value = randomCommand;
            
            // Trigger input morph
            actionIcon.className = 'hgi-stroke hgi-arrow-up-01';
            actionBtn.setAttribute('aria-label', 'Send');
            
            // Send after a brief delay
            setTimeout(() => {
                sendMessage(randomCommand);
            }, 800);
        }, 1800);
    }

    // ── 8. Chat Message Flow ──
    async function sendMessage(text) {
        const prompt = text?.trim();
        if (!prompt || isLoading) return;

        // Reset text input
        if (inputField) {
            inputField.value = '';
            actionIcon.className = 'hgi-stroke hgi-mic-01';
            actionBtn.setAttribute('aria-label', 'Voice Input');
        }

        // Hide suggestions chips
        const chips = document.getElementById('ai-suggestions');
        if (chips) chips.style.display = 'none';

        appendMsg('user', prompt);
        const thinkEl = appendThinking();

        isLoading = true;
        actionBtn.disabled = true;
        container.classList.add('thinking');
        
        const menuOrb = document.getElementById('ai-menu-orb');
        menuOrb?.classList.add('ai-thinking');

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
            actionBtn.disabled = false;
            container.classList.remove('thinking');
            menuOrb?.classList.remove('ai-thinking');
            inputField?.focus();
        }
    }

    // ── 9. Rendering Helpers ──
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

    // ── 10. Fallback Offline Agent Executions ──
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

        if (lp.match(/open|launch|show/)) {
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
            return 'Created **aios_script.py** in the editor! Here is the script:\n\n```python\n#!/usr/bin/env python3\n# Generated by AIOS Intelligence\n\nprint("Hello from AIOS!")\n\ndef main():\n    print("AI Agent is running!")\n\nif __name__ == "__main__":\n    main()\n```';
        }

        if (lp.match(/cpu|memory|ram|stats/)) {
            const cpuEl = document.getElementById('stat-cpu');
            const memEl = document.getElementById('stat-mem');
            return `**System Live Stats**\n- **CPU Usage:** ${cpuEl?.textContent || '—'}\n- **Memory Usage:** ${memEl?.textContent || '—'}\n\nTo manage backend services, run \`systemctl start aisd\`.`;
        }

        if (lp.match(/help|what can|capabilities/)) {
            return [
                '**AIOS Intelligence capabilities:**',
                '',
                '- 🎨 **Draw art:** `Draw a galaxy` — paints on canvas',
                '- 📱 **Open apps:** `Open terminal` — launches any OS window',
                '- 📝 **Create files:** `Write a Python script` — edits and saves files',
                '- 📊 **Monitor stats:** `Show CPU stats` — gathers resources usage',
                '- 🔍 **Find files:** `Find PDF files` — searches virtual file system',
                '',
                '_With aisd backend active:_',
                '- Fill LibreOffice sheets/forms automatically',
                '- Interact with other apps via accessibility layer (AT-SPI2)',
                '- Capture screenshots and input keystrokes programmatically',
            ].join('\n');
        }

        return `I am running in **offline mode**. I can still do these locally:\n- 🎨 **Paint art** (e.g. "Draw a galaxy")\n- 📱 **Open applications** (e.g. "Open files")\n- 📝 **Write code drafts**\n\nRun \`systemctl start aisd\` to connect full online AI features.`;
    }
}

// ── Topbar Menu Orb Injector ──────────────────────────────────────────────────
function injectMenuOrb() {
    const topbar = document.querySelector('.topbar-right, .topbar-center, #topbar, .topbar');
    if (!topbar) {
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

    const rightSide = document.querySelector('.topbar-right');
    if (rightSide) {
        rightSide.insertBefore(orb, rightSide.firstChild);
    } else {
        topbar.appendChild(orb);
    }
}
