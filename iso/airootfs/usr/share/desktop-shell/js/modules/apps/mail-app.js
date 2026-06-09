/* FELBIC OS — MailBox Application Module */
import { aisd } from '../aisd-client.js';

export function initMailApp() {
    console.log('[mail-app] Initializing MailBox...');

    const inboxList = [
        { id: 1, sender: "Alice Chen", email: "alice@aurora.io", subject: "Project Update - Phase 2", date: "10:45 AM", body: "Hi team,\n\nI've just uploaded the latest design specs for Phase 2. Please take a look at the glassmorphic components and let me know if you have any feedback.\n\nBest,\nAlice", read: false },
        { id: 2, sender: "System Daemon", email: "root@felbicos.local", subject: "Security Alert: New Login", date: "Yesterday", body: "A new login was detected from a known device. If this was you, please disregard this message. Otherwise, please check your security settings immediately.", read: true },
        { id: 3, sender: "Leo Maxwell", email: "leo@nexus.org", subject: "Dinner tonight?", date: "Monday", body: "Hey, are we still on for dinner at 7? Let me know! I found this great new place that serves the best sushi in town.", read: true },
        { id: 4, sender: "Newsletter", email: "news@tech-insights.com", subject: "The Future of AI-Native OS", date: "Jun 5", body: "In this week's issue, we explore how AI-native operating systems are redefining user interaction. From predictive workflows to automated resource management, the OS of the future is here.\n\nRead more at our website.", read: false }
    ];

    let currentMail = inboxList[0];

    const mailListScroll = document.getElementById('mail-list-scroll');
    const mailFullSubject = document.getElementById('mail-full-subject');
    const mailSenderName = document.getElementById('mail-sender-name');
    const mailSenderEmail = document.getElementById('mail-sender-email');
    const mailAvatar = document.getElementById('mail-avatar');
    const mailBodyContent = document.getElementById('mail-body-content');
    const aiSummaryBtn = document.getElementById('mail-ai-summary-btn');
    const aiSummaryContainer = document.getElementById('mail-ai-summary-container');
    const composeBtn = document.getElementById('mail-compose-btn');
    const composeModal = document.getElementById('mail-compose-modal');
    const closeCompose = document.getElementById('mail-compose-close');
    const sendBtn = document.getElementById('mail-btn-send');

    function renderMailList() {
        if (!mailListScroll) return;
        mailListScroll.innerHTML = '';
        inboxList.forEach(mail => {
            const item = document.createElement('div');
            item.className = `mail-item ${mail.id === currentMail.id ? 'active' : ''} ${!mail.read ? 'unread' : ''}`;
            item.innerHTML = `
                <div class="mail-item-top">
                    <span class="mail-sender">${mail.sender}</span>
                    <span class="mail-date">${mail.date}</span>
                </div>
                <div class="mail-subject">${mail.subject}</div>
                <div class="mail-preview">${mail.body.substring(0, 50)}...</div>
            `;
            item.addEventListener('click', () => {
                currentMail = mail;
                mail.read = true;
                renderMailList();
                renderMailDetail();
            });
            mailListScroll.appendChild(item);
        });
    }

    function renderMailDetail() {
        if (!mailFullSubject) return;
        mailFullSubject.textContent = currentMail.subject;
        mailSenderName.textContent = currentMail.sender;
        mailSenderEmail.textContent = `<${currentMail.email}>`;
        mailAvatar.textContent = currentMail.sender.charAt(0);
        mailBodyContent.textContent = currentMail.body;
        
        // Reset AI summary
        if (aiSummaryContainer) {
            aiSummaryContainer.innerHTML = '';
            aiSummaryContainer.style.display = 'none';
        }
    }

    async function generateSummary() {
        if (!aiSummaryContainer) return;
        
        aiSummaryContainer.style.display = 'block';
        aiSummaryContainer.innerHTML = `
            <div class="mail-ai-summary-box">
                <div class="mail-ai-summary-title">
                    <i class="hgi-stroke hgi-ai-brain-01"></i>
                    <span>AI Generating Summary...</span>
                </div>
            </div>
        `;

        try {
            const prompt = `Summarize this email in 2 short bullet points:\n\nSubject: ${currentMail.subject}\nFrom: ${currentMail.sender}\n\nContent: ${currentMail.body}`;
            const response = await aisd.call('ai/chat', { 
                prompt: prompt,
                system: "You are an AI assistant that provides concise email summaries."
            });

            aiSummaryContainer.innerHTML = `
                <div class="mail-ai-summary-box">
                    <div class="mail-ai-summary-title">
                        <i class="hgi-stroke hgi-ai-brain-01"></i>
                        <span>AI Summary</span>
                    </div>
                    <div class="mail-ai-summary-text">${response.replace(/\n/g, '<br>')}</div>
                </div>
            `;
        } catch (err) {
            aiSummaryContainer.innerHTML = `
                <div class="mail-ai-summary-box" style="border-left-color: var(--danger);">
                    <div class="mail-ai-summary-title" style="color: var(--danger);">
                        <i class="hgi-stroke hgi-alert-circle"></i>
                        <span>AI Summary Failed</span>
                    </div>
                    <div class="mail-ai-summary-text">Could not connect to AI service.</div>
                </div>
            `;
        }
    }

    // Event Listeners
    if (aiSummaryBtn) {
        aiSummaryBtn.addEventListener('click', generateSummary);
    }

    if (composeBtn) {
        composeBtn.addEventListener('click', () => {
            composeModal.style.display = 'flex';
        });
    }

    if (closeCompose) {
        closeCompose.addEventListener('click', () => {
            composeModal.style.display = 'none';
        });
    }

    if (sendBtn) {
        sendBtn.addEventListener('click', () => {
            const to = document.getElementById('mail-to').value;
            const subject = document.getElementById('mail-subject-input').value;
            const body = document.getElementById('mail-body-input').value;

            if (!to || !subject) {
                alert("Please fill in recipient and subject.");
                return;
            }

            console.log(`Sending mail to ${to}: ${subject}`);
            composeModal.style.display = 'none';
            // Mock sending
            alert("Message sent successfully!");
        });
    }

    renderMailList();
    renderMailDetail();
}
