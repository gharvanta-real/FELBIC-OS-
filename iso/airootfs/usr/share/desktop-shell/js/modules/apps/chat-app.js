/* FELBIC OS — Discord Chat Mockup Application Module */

export function initChatApp() {
    console.log('[chat-app] Initializing Chat App...');
    const form = document.getElementById('chat-form');
    const input = document.getElementById('chat-input');
    const messagesContainer = document.getElementById('chat-messages');
    const channels = document.querySelectorAll('.chat-channel');
    const channelTitle = document.getElementById('chat-channel-title');

    // Bot messages mapping based on channel or random
    const botReplies = {
        general: [
            "Hey! Welcome to the FELBIC OS community channel.",
            "Glad you're here. Let me know if you need help exploring the shell!",
            "Did you know you can customize system themes and colors in Settings?",
            "Yes! FELBIC OS is built as an AI-native operating system mockup."
        ],
        announcements: [
            "Please note: This is an announcements channel. Only administrators can post here, but you can chat with me in #general!",
            "FELBIC OS Phase 2 is now live! Enjoy the new desktop capabilities."
        ],
        'bot-playground': [
            "Beep boop! Command list: **!help**, **!ping**, **!specs**, **!fortune**",
            "I'm listening. Try sending a command!",
            "System online. Core load is nominal.",
            "Processing your request at 100 TFLOPS!"
        ]
    };

    let activeChannel = 'general';

    // Channel selection
    channels.forEach(ch => {
        ch.addEventListener('click', () => {
            channels.forEach(c => {
                c.style.background = "transparent";
                c.style.color = "#949ba4";
            });
            ch.style.background = "rgba(255, 255, 255, 0.06)";
            ch.style.color = "#fff";

            activeChannel = ch.getAttribute('data-channel');
            if (channelTitle) channelTitle.textContent = activeChannel;
            if (input) input.placeholder = `Message #${activeChannel}`;

            // Clear messages and load initial channel welcome message
            if (messagesContainer) {
                messagesContainer.innerHTML = '';
                appendBotMessage(`Welcome to #${activeChannel}! This is the start of the channel.`);
            }
        });
    });

    function appendUserMessage(text) {
        if (!messagesContainer) return;
        const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const msgHtml = `
            <div style="display: flex; gap: 12px; margin-top: 10px;">
                <div style="width: 40px; height: 40px; border-radius: 50%; background: #22c55e; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: bold; font-size: 14px; flex-shrink: 0;">U</div>
                <div style="display: flex; flex-direction: column; flex: 1;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="color: #fff; font-weight: 600; font-size: 14px;">Live User</span>
                        <span style="color: #949ba4; font-size: 11px;">Today at ${timeString}</span>
                    </div>
                    <span style="color: #dbdee1; font-size: 14px; margin-top: 4px; word-break: break-word;">${escapeHtml(text)}</span>
                </div>
            </div>
        `;
        messagesContainer.insertAdjacentHTML('beforeend', msgHtml);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    function appendBotMessage(text) {
        if (!messagesContainer) return;
        const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const msgHtml = `
            <div style="display: flex; gap: 12px; margin-top: 10px;">
                <div style="width: 40px; height: 40px; border-radius: 50%; background: #5865f2; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: bold; font-size: 14px; flex-shrink: 0;">BOT</div>
                <div style="display: flex; flex-direction: column; flex: 1;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="color: #fff; font-weight: 600; font-size: 14px;">FELBIC Bot</span>
                        <span style="background: #5865f2; color: #fff; font-size: 9px; padding: 1px 4px; border-radius: 3px; font-weight: bold; margin-left: 4px;">BOT</span>
                        <span style="color: #949ba4; font-size: 11px; margin-left: 8px;">Today at ${timeString}</span>
                    </div>
                    <span style="color: #dbdee1; font-size: 14px; margin-top: 4px; word-break: break-word;">${text}</span>
                </div>
            </div>
        `;
        messagesContainer.insertAdjacentHTML('beforeend', msgHtml);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    function escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, function(m) { return map[m]; });
    }

    function handleBotResponse(userMsg) {
        if (!messagesContainer) return;
        
        // Typing indicator simulation
        const typingId = 'bot-typing-indicator';
        const typingHtml = `
            <div id="${typingId}" style="display: flex; gap: 12px; align-items: center; margin-top: 10px;">
                <div style="width: 40px; height: 40px; border-radius: 50%; background: #5865f2; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: bold; font-size: 14px; flex-shrink: 0;">BOT</div>
                <div style="display: flex; gap: 4px;">
                    <span style="color: #949ba4; font-size: 12px; font-style: italic;">FELBIC Bot is typing...</span>
                </div>
            </div>
        `;
        messagesContainer.insertAdjacentHTML('beforeend', typingHtml);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        setTimeout(() => {
            const typingIndicator = document.getElementById(typingId);
            if (typingIndicator) typingIndicator.remove();

            // Determine response
            let response = "";
            const msg = userMsg.toLowerCase().trim();

            if (activeChannel === 'bot-playground') {
                if (msg.startsWith('!help')) {
                    response = "Playground commands: **!help**, **!ping**, **!specs**, **!fortune**";
                } else if (msg.startsWith('!ping')) {
                    response = "Pong! 🏓";
                } else if (msg.startsWith('!specs')) {
                    const threads = navigator.hardwareConcurrency || 'unknown';
                    response = `Specs: Logical Threads: **${threads}**, Platform: **${navigator.platform}**, UserAgent: **${navigator.userAgent.substring(0, 30)}...**`;
                } else if (msg.startsWith('!fortune')) {
                    const fortunes = [
                        "You will write clean code today.",
                        "A compiler warning is a sign of love from your compiler.",
                        "CSS will align perfectly on your next try.",
                        "A bug is just an undocumented feature in waiting."
                    ];
                    response = fortunes[Math.floor(Math.random() * fortunes.length)];
                } else {
                    response = "Command not recognized. Type **!help** for available options.";
                }
            } else {
                // Channel random reply
                const replies = botReplies[activeChannel] || botReplies.general;
                response = replies[Math.floor(Math.random() * replies.length)];
            }

            appendBotMessage(response);
        }, 1000);
    }

    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            if (!input) return;
            const text = input.value.trim();
            if (!text) return;

            input.value = '';
            appendUserMessage(text);
            handleBotResponse(text);
        });
    }
}
