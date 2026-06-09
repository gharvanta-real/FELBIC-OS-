/* FELBIC OS — AIOS Intelligence
 *
 * Native Windowed AI Control Panel App logic & IPC integration.
 * Adapts chat and configuration controls inside the standard #ai-window container.
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
    console.log('[felbicos] Initializing AI Control Panel App (Windowed)...');

    const aiWindow = document.getElementById('ai-window');
    if (!aiWindow) {
        console.error('[ai-assistant] #ai-window not found in DOM!');
        return;
    }

    // ── 1. Inject Menu Bar Orb ──
    injectMenuOrb();

    // ── 2. DOM Elements Cache ──
    const convoScroll  = aiWindow.querySelector('#ai-convo-scroll');
    const inputField   = aiWindow.querySelector('#ai-input-field');
    const actionBtn    = aiWindow.querySelector('#ai-input-action-btn');
    const actionIcon   = aiWindow.querySelector('#ai-action-icon');
    const tabs         = aiWindow.querySelectorAll('.ai-app-tab');
    const paneChat     = aiWindow.querySelector('#ai-pane-chat');
    const paneSettings = aiWindow.querySelector('#ai-pane-settings');

    let isLoading = false;
    const SESSION_ID = 'aios-main';

    // ── 3. Load Persistent Config Object ──
    const config = {
        model: localStorage.getItem('ai_config_model') || 'mistral-7b',
        temp: parseFloat(localStorage.getItem('ai_config_temp') || '0.7'),
        memory: localStorage.getItem('ai_config_memory') !== 'false',
        indexing: localStorage.getItem('ai_config_indexing') !== 'false',
        desktopControl: localStorage.getItem('ai_config_desktop_control') !== 'false',
        inputInjection: localStorage.getItem('ai_config_input_injection') !== 'false',
        systemPrompt: localStorage.getItem('ai_config_prompt') || [
            "You are AIOS Assistant — the AI built into FELBIC OS.",
            "You are a powerful AI agent, not just a chatbot.",
            "You can ACTUALLY control the operating system, run applications, fill forms, search files, and take actions.",
            "",
            "Available tools:",
            "- stats_get: Get CPU and memory usage",
            "- process_list: List running processes",
            "- fs_search: Search files by name",
            "- app_fill_field: Fill form field in any app",
            "- app_launch: Launch an application",
            "- input_type: Type text into active element",
            "- screenshot_take: Take a screenshot",
            "",
            "Rules:",
            "- When user asks to OPEN an app, use app_launch",
            "- When user asks to FILL a form, use app_fill_field",
            "- Chain multiple tool calls if needed to complete complex tasks"
        ].join('\n')
    };

    // ── 4. Shared Settings Synchronization ──
    function syncSettingsUI() {
        // App controls
        const modelApp = aiWindow.querySelector('#ai-settings-model');
        const memoryApp = aiWindow.querySelector('#ai-settings-memory');
        const dtApp = aiWindow.querySelector('#ai-settings-desktop-control');
        const iiApp = aiWindow.querySelector('#ai-settings-input-injection');

        if (modelApp) modelApp.value = config.model;
        if (memoryApp) memoryApp.checked = config.memory;
        if (dtApp) dtApp.checked = config.desktopControl;
        if (iiApp) iiApp.checked = config.inputInjection;

        // System Settings app controls
        const modelSys = document.querySelector('#settings-ai-model');
        const tempSlider = document.querySelector('#settings-ai-temp');
        const tempVal = document.querySelector('#settings-ai-temp-val');
        const memorySys = document.querySelector('#settings-ai-memory');
        const indexingSys = document.querySelector('#settings-ai-indexing');
        const dtSys = document.querySelector('#settings-ai-desktop-control');
        const iiSys = document.querySelector('#settings-ai-input-injection');
        const promptSys = document.querySelector('#settings-ai-prompt');

        if (modelSys) modelSys.value = config.model;
        if (tempSlider) {
            tempSlider.value = config.temp * 100;
            if (tempVal) tempVal.textContent = config.temp.toFixed(1);
        }
        if (memorySys) memorySys.checked = config.memory;
        if (indexingSys) indexingSys.checked = config.indexing;
        if (dtSys) dtSys.checked = config.desktopControl;
        if (iiSys) iiSys.checked = config.inputInjection;
        if (promptSys) promptSys.value = config.systemPrompt;
    }

    function updateConfig(key, value) {
        config[key] = value;
        const storageKey = `ai_config_${key.replace(/([A-Z])/g, "_$1").toLowerCase()}`;
        localStorage.setItem(storageKey, value);
        syncSettingsUI();
    }

    // Initialize UI from localStorage
    syncSettingsUI();

    // Hook listeners when System Settings window loads/binds (or immediately if already in DOM)
    function setupSystemSettingsListeners() {
        const modelSys = document.querySelector('#settings-ai-model');
        const tempSlider = document.querySelector('#settings-ai-temp');
        const memorySys = document.querySelector('#settings-ai-memory');
        const indexingSys = document.querySelector('#settings-ai-indexing');
        const dtSys = document.querySelector('#settings-ai-desktop-control');
        const iiSys = document.querySelector('#settings-ai-input-injection');
        const daemonStatus = document.querySelector('#settings-ai-daemon-status');
        const daemonRestartBtn = document.querySelector('#settings-ai-daemon-restart');
        const promptSys = document.querySelector('#settings-ai-prompt');

        if (!modelSys) {
            // If settings app isn't fully loaded in DOM, retry shortly
            setTimeout(setupSystemSettingsListeners, 300);
            return;
        }

        modelSys.addEventListener('change', () => {
            updateConfig('model', modelSys.value);
            showActionToast('✓', `Language Model set to: ${modelSys.options[modelSys.selectedIndex].text}`);
        });

        tempSlider.addEventListener('input', () => {
            const val = parseFloat((tempSlider.value / 100).toFixed(1));
            updateConfig('temp', val);
        });

        memorySys.addEventListener('change', () => {
            updateConfig('memory', memorySys.checked);
            showActionToast('🧠', `Session Memory ${memorySys.checked ? 'Enabled' : 'Disabled'}`);
        });

        indexingSys.addEventListener('change', () => {
            updateConfig('indexing', indexingSys.checked);
            showActionToast('🔍', `Local File Indexing ${indexingSys.checked ? 'Enabled' : 'Disabled'}`);
        });

        dtSys.addEventListener('change', () => {
            updateConfig('desktopControl', dtSys.checked);
            showActionToast('🖥️', `Desktop Control ${dtSys.checked ? 'Allowed' : 'Revoked'}`);
        });

        iiSys.addEventListener('change', () => {
            updateConfig('inputInjection', iiSys.checked);
            showActionToast('⌨️', `Input Injection ${iiSys.checked ? 'Allowed' : 'Revoked'}`);
        });

        promptSys.addEventListener('input', () => {
            updateConfig('systemPrompt', promptSys.value);
        });

        daemonRestartBtn.addEventListener('click', () => {
            daemonStatus.textContent = 'restarting...';
            daemonStatus.style.color = 'var(--text-muted)';
            daemonRestartBtn.disabled = true;
            showActionToast('🔄', 'Restarting aisd daemon service...');
            
            setTimeout(() => {
                daemonStatus.textContent = 'active (running)';
                daemonStatus.style.color = 'var(--success)';
                daemonRestartBtn.disabled = false;
                showActionToast('✓', 'aisd daemon service restarted successfully');
            }, 1500);
        });
    }

    setupSystemSettingsListeners();

    // ── 5. Open / Close Controls ──
    function open() {
        if (window.openWindow) {
            window.openWindow('ai-window');
        } else {
            aiWindow.style.display = 'flex';
        }
        document.getElementById('ai-menu-orb')?.classList.add('ai-active');
        setTimeout(() => inputField?.focus(), 200);
    }

    function close() {
        const closeBtn = aiWindow.querySelector('.window-btn.close');
        if (closeBtn) {
            closeBtn.click();
        } else {
            aiWindow.style.display = 'none';
        }
        document.getElementById('ai-menu-orb')?.classList.remove('ai-active', 'ai-thinking');
    }

    function toggle() {
        const isOpen = aiWindow.style.display !== 'none' && aiWindow.style.opacity !== '0';
        if (isOpen) close(); else open();
    }

    window.toggleAIAssistant = toggle;
    window.openAIAssistant   = open;
    window.closeAIAssistant  = close;
    window.showAIActionToast = showActionToast;

    // ── 6. System Event Listeners ──

    // Listen to OS focus event to highlight menu bar orb
    document.addEventListener('window-focused', (e) => {
        const orb = document.getElementById('ai-menu-orb');
        if (!orb) return;
        if (e.detail.windowId === 'ai-window') {
            orb.classList.add('ai-active');
        } else {
            orb.classList.remove('ai-active');
        }
    });

    // Close on overlay focus or Escape keyboard actions
    document.addEventListener('keydown', (e) => {
        const isOpen = aiWindow.style.display !== 'none' && aiWindow.style.opacity !== '0';
        if ((e.metaKey && e.key === 'a') || (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'a')) {
            e.preventDefault();
            toggle();
        }
        if (e.key === 'Escape' && isOpen) {
            if (document.activeElement === inputField) {
                inputField.blur();
            } else {
                close();
            }
        }
    });

    // ── 7. Tab Switching UI ──
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const targetTab = tab.getAttribute('data-tab');
            if (targetTab === 'chat') {
                paneChat.style.display = 'flex';
                paneSettings.style.display = 'none';
                setTimeout(() => inputField?.focus(), 50);
            } else {
                paneChat.style.display = 'none';
                paneSettings.style.display = 'flex';
            }
        });
    });

    // ── Bind UI Events for AI Control Panel App ──
    const modelApp = aiWindow.querySelector('#ai-settings-model');
    const memoryApp = aiWindow.querySelector('#ai-settings-memory');
    const dtApp = aiWindow.querySelector('#ai-settings-desktop-control');
    const iiApp = aiWindow.querySelector('#ai-settings-input-injection');

    modelApp?.addEventListener('change', () => {
        updateConfig('model', modelApp.value);
        showActionToast('✓', `Language Model set to: ${modelApp.options[modelApp.selectedIndex].text}`);
    });

    memoryApp?.addEventListener('change', () => {
        updateConfig('memory', memoryApp.checked);
        showActionToast('🧠', `Session Memory ${memoryApp.checked ? 'Enabled' : 'Disabled'}`);
    });

    dtApp?.addEventListener('change', () => {
        updateConfig('desktopControl', dtApp.checked);
        showActionToast('🖥️', `Desktop Control ${dtApp.checked ? 'Allowed' : 'Revoked'}`);
    });

    iiApp?.addEventListener('change', () => {
        updateConfig('inputInjection', iiApp.checked);
        showActionToast('⌨️', `Input Injection ${iiApp.checked ? 'Allowed' : 'Revoked'}`);
    });

    // ── 8. Chat Input Event Bindings ──

    // Morph Send icon as user types
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
    aiWindow.querySelectorAll('.ai-suggestion-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const prompt = chip.getAttribute('data-prompt');
            if (prompt) sendMessage(prompt);
        });
    });

    // ── 9. Voice Input Simulation ──
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

    // ── 10. Chat Message Flow ──
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
        const chips = aiWindow.querySelector('#ai-suggestions');
        if (chips) chips.style.display = 'none';

        appendMsg('user', prompt);
        const thinkEl = appendThinking();

        isLoading = true;
        actionBtn.disabled = true;
        aiWindow.classList.add('thinking');
        
        const menuOrb = document.getElementById('ai-menu-orb');
        menuOrb?.classList.add('ai-thinking');

        try {
            let response;
            if (aisd.connected) {
                const currentModel = modelSelect ? modelSelect.value : 'mistral-7b';
                const currentTemp = tempSlider ? parseFloat((tempSlider.value / 100).toFixed(1)) : 0.7;
                
                const result = await aisd.call('ai/chat', { 
                    prompt, 
                    session: SESSION_ID,
                    model: currentModel,
                    temperature: currentTemp
                });
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
            aiWindow.classList.remove('thinking');
            menuOrb?.classList.remove('ai-thinking');
            inputField?.focus();
        }
    }

    // ── 11. Rendering Helpers ──
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

    // ── 12. Fallback Offline Agent Executions ──
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
                '- Configure system model, temp, session memory, and vectors database settings'
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
