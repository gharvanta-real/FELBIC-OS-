/* FELBIC OS — Notifications Module */

export function initNotifications() {
    let container = document.getElementById('notifications-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notifications-container';
        container.className = 'notifications-container';
        document.body.appendChild(container);
    }

    // Expose showNotification globally
    window.showNotification = function(title, message, icon = 'hgi-information-circle') {
        const toast = document.createElement('div');
        toast.className = 'notification-toast';

        // Check if icon is an emoji or a Hugeicons class name
        const isEmoji = !icon.startsWith('hgi-');
        const iconHtml = isEmoji 
            ? `<span class="notification-emoji">${icon}</span>`
            : `<i class="hgi-stroke ${icon}"></i>`;

        toast.innerHTML = `
            <div class="notification-icon">
                ${iconHtml}
            </div>
            <div class="notification-content">
                <div class="notification-title">${title}</div>
                <div class="notification-message">${message}</div>
            </div>
            <button class="notification-close" aria-label="Close notification">
                <i class="hgi-stroke hgi-cancel-01"></i>
            </button>
        `;

        const closeBtn = toast.querySelector('.notification-close');
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            closeToast(toast);
        });

        container.appendChild(toast);

        // Animate slide-in
        requestAnimationFrame(() => {
            toast.classList.add('active');
        });

        // Auto close after 4 seconds
        const autoCloseTimeout = setTimeout(() => {
            closeToast(toast);
        }, 4000);

        // Store timeout in element so it can be cleared if manually closed
        toast.dataset.timeoutId = autoCloseTimeout;
    };
}

function closeToast(toast) {
    if (toast.classList.contains('closing')) return;
    toast.classList.add('closing');
    
    // Clear auto-close timeout if it exists
    if (toast.dataset.timeoutId) {
        clearTimeout(parseInt(toast.dataset.timeoutId, 10));
    }

    // Wait for transition, fallback if transitionend doesn't fire
    let transitionFired = false;
    const onTransitionEnd = () => {
        if (transitionFired) return;
        transitionFired = true;
        toast.remove();
    };

    toast.addEventListener('transitionend', onTransitionEnd);
    setTimeout(onTransitionEnd, 400); // safety fallback matching CSS transition
}
