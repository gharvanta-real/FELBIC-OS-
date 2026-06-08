/* ============================================================
   AIOS — macOS-style Custom Alert / Confirm / Prompt Dialogs
   Asynchronous helper methods (resolving promises on action).
   ============================================================ */

let dialogOverlay = null;

export function initDialog() {
    if (document.getElementById('dialog-overlay')) return;

    // Create the overlay container dynamically if not present
    dialogOverlay = document.createElement('div');
    dialogOverlay.id = 'dialog-overlay';
    dialogOverlay.className = 'dialog-overlay';
    document.body.appendChild(dialogOverlay);

    // Expose dynamic promise-based dialog methods globally
    window.showDialog = {
        alert: (message, title = "System Message") => {
            return new Promise((resolve) => {
                renderDialog({
                    type: 'alert',
                    title,
                    message,
                    onConfirm: () => {
                        closeDialog();
                        resolve();
                    }
                });
            });
        },
        confirm: (message, title = "Confirm Action", danger = false) => {
            return new Promise((resolve) => {
                renderDialog({
                    type: 'confirm',
                    title,
                    message,
                    danger,
                    onConfirm: () => {
                        closeDialog();
                        resolve(true);
                    },
                    onCancel: () => {
                        closeDialog();
                        resolve(false);
                    }
                });
            });
        },
        prompt: (message, defaultValue = "", title = "Input Required") => {
            return new Promise((resolve) => {
                renderDialog({
                    type: 'prompt',
                    title,
                    message,
                    defaultValue,
                    onConfirm: (val) => {
                        closeDialog();
                        resolve(val);
                    },
                    onCancel: () => {
                        closeDialog();
                        resolve(null);
                    }
                });
            });
        }
    };
}

function closeDialog() {
    if (dialogOverlay) {
        dialogOverlay.classList.remove('active');
        setTimeout(() => {
            dialogOverlay.innerHTML = '';
        }, 200);
    }
}

function renderDialog({ type, title, message, defaultValue = "", danger = false, onConfirm, onCancel }) {
    if (!dialogOverlay) return;

    let inputHTML = '';
    if (type === 'prompt') {
        inputHTML = `
            <div class="dialog-input-wrapper">
                <input type="text" id="dialog-prompt-input" class="dialog-prompt-input" value="${defaultValue}" autocomplete="off" spellcheck="false">
            </div>
        `;
    }

    let buttonsHTML = '';
    if (type === 'alert') {
        buttonsHTML = `
            <button class="dialog-btn primary" id="dialog-confirm-btn">OK</button>
        `;
    } else {
        const confirmClass = danger ? 'primary danger' : 'primary';
        buttonsHTML = `
            <button class="dialog-btn secondary" id="dialog-cancel-btn">Cancel</button>
            <button class="dialog-btn ${confirmClass}" id="dialog-confirm-btn">OK</button>
        `;
    }

    // Determine semantic icon based on title/type
    let iconClass = 'hgi-information-circle';
    let iconColorClass = 'info';
    
    const lowerTitle = title.toLowerCase();
    const lowerMsg = message.toLowerCase();
    
    if (danger || lowerTitle.includes('delete') || lowerTitle.includes('quit') || lowerTitle.includes('remove') || lowerTitle.includes('trash') || lowerTitle.includes('shutdown') || lowerTitle.includes('restart') || lowerMsg.includes('delete') || lowerMsg.includes('trash')) {
        iconClass = 'hgi-alert-circle';
        iconColorClass = 'danger';
    } else if (type === 'confirm') {
        iconClass = 'hgi-help-circle';
        iconColorClass = 'help';
    } else if (type === 'prompt') {
        iconClass = 'hgi-pencil-line';
        iconColorClass = 'prompt';
    }

    dialogOverlay.innerHTML = `
        <div class="dialog-box">
            <div class="dialog-header-area">
                <div class="dialog-icon ${iconColorClass}">
                    <i class="hgi-stroke ${iconClass}"></i>
                </div>
                <div class="dialog-header-text">
                    <h3 class="dialog-title">${title}</h3>
                    <p class="dialog-message">${message}</p>
                </div>
            </div>
            ${inputHTML}
            <div class="dialog-buttons">
                ${buttonsHTML}
            </div>
        </div>
    `;

    // Focus input if prompt
    if (type === 'prompt') {
        const input = document.getElementById('dialog-prompt-input');
        if (input) {
            input.focus();
            input.select();
            
            // Event listeners for keys
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    onConfirm(input.value);
                } else if (e.key === 'Escape') {
                    onCancel();
                }
            });
        }
    }

    // Add click event listeners
    const confirmBtn = document.getElementById('dialog-confirm-btn');
    if (confirmBtn) {
        confirmBtn.addEventListener('click', () => {
            if (type === 'prompt') {
                const input = document.getElementById('dialog-prompt-input');
                onConfirm(input ? input.value : '');
            } else {
                onConfirm();
            }
        });
    }

    const cancelBtn = document.getElementById('dialog-cancel-btn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', onCancel);
    }

    // Trigger active state for transition
    dialogOverlay.classList.add('active');

    // Auto-focus confirm button
    if (type !== 'prompt' && confirmBtn) {
        confirmBtn.focus();
    }
}
