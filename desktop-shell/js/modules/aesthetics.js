/* FELBIC OS — Aesthetics & Polish Module */

export function initAesthetics() {
    console.log('[felbicos] Initializing Aesthetics & Polish Module...');

    // ── 1. Wallpaper Transition Setups ──
    let mainBg = document.getElementById('wallpaper-bg');
    if (!mainBg) {
        mainBg = document.createElement('div');
        mainBg.id = 'wallpaper-bg';
        mainBg.className = 'wallpaper-bg';
        // Apply default wallpaper — CSS class already handles the gradient token
        // Don't read body.background (it's transparent) — just let the CSS class do its work
        document.body.insertBefore(mainBg, document.body.firstChild);
    }

    // Set wallpaper function exposed globally for Settings integration
    window.setWallpaper = function(bgStyle) {
        const mainBg = document.getElementById('wallpaper-bg');
        if (!mainBg) return;

        let tempBg = document.getElementById('wallpaper-bg-temp');
        if (!tempBg) {
            tempBg = document.createElement('div');
            tempBg.id = 'wallpaper-bg-temp';
            tempBg.className = 'wallpaper-bg-temp';
            document.body.appendChild(tempBg);
        }

        // Set layout and styles
        tempBg.style.transition = 'none';
        tempBg.style.opacity = '0';
        tempBg.style.background = bgStyle;
        tempBg.style.backgroundSize = 'cover';
        tempBg.style.backgroundPosition = 'center';

        tempBg.offsetHeight; // force reflow

        // Animate fade in
        tempBg.style.transition = 'opacity var(--transition-slow) var(--curve-smooth)';
        tempBg.style.opacity = '1';

        setTimeout(() => {
            mainBg.style.background = bgStyle;
            mainBg.style.backgroundSize = 'cover';
            mainBg.style.backgroundPosition = 'center';
            tempBg.style.opacity = '0';
        }, 350); // Match var(--transition-slow) = 0.35s
    };

    // ── 2. Custom Tooltips (Event Delegation) ──
    let tooltip = document.getElementById('os-tooltip');
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = 'os-tooltip';
        tooltip.className = 'os-tooltip';
        document.body.appendChild(tooltip);
    }

    function getTooltipTarget(targetEl) {
        if (!targetEl || targetEl === document.documentElement || targetEl === document.body) return null;
        
        // 1. Check topbar clock
        if (targetEl.id === 'topbar-clock' || targetEl.classList.contains('topbar-clock')) {
            return { el: targetEl, position: 'bottom', title: 'Calendar & Notifications' };
        }
        // 2. Check topbar logo
        if (targetEl.id === 'logo-trigger' || targetEl.classList.contains('topbar-logo') || targetEl.closest('#logo-trigger')) {
            const logo = targetEl.id === 'logo-trigger' ? targetEl : targetEl.closest('#logo-trigger');
            return { el: logo, position: 'bottom', title: 'Launch Menu' };
        }
        // 3. Check control center trigger
        if (targetEl.id === 'control-center-trigger' || targetEl.closest('#control-center-trigger')) {
            const cc = targetEl.id === 'control-center-trigger' ? targetEl : targetEl.closest('#control-center-trigger');
            return { el: cc, position: 'bottom', title: 'Control Center' };
        }
        // 4. Check dock items
        if (targetEl.classList.contains('dock-item') || targetEl.closest('.dock-item')) {
            const dockItem = targetEl.classList.contains('dock-item') ? targetEl : targetEl.closest('.dock-item');
            let title = dockItem.getAttribute('title') || dockItem.getAttribute('data-os-tooltip');
            if (!title) {
                const app = dockItem.getAttribute('data-app');
                title = app ? app.charAt(0).toUpperCase() + app.slice(1) : '';
            }
            return { el: dockItem, position: 'top', title: title };
        }
        return null;
    }

    document.addEventListener('mouseover', (e) => {
        const targetInfo = getTooltipTarget(e.target);
        if (!targetInfo || !targetInfo.title) return;

        const { el, position, title } = targetInfo;

        // Remove native title to prevent default browser tooltip
        if (el.hasAttribute('title')) {
            el.setAttribute('data-os-tooltip', el.getAttribute('title'));
            el.removeAttribute('title');
        }

        tooltip.textContent = title;
        tooltip.classList.add('visible');

        // Position calculation
        const elRect = el.getBoundingClientRect();
        
        // Force layout pass to calculate tooltip size
        tooltip.offsetHeight;
        const tooltipRect = tooltip.getBoundingClientRect();

        let top = 0;
        let left = elRect.left + elRect.width / 2;

        if (position === 'top') {
            top = elRect.top - tooltipRect.height - 8;
        } else {
            top = elRect.bottom + 8;
        }

        // Stay within screen bounds
        if (left - tooltipRect.width / 2 < 4) {
            left = tooltipRect.width / 2 + 4;
        } else if (left + tooltipRect.width / 2 > window.innerWidth - 4) {
            left = window.innerWidth - tooltipRect.width / 2 - 4;
        }

        tooltip.style.top = `${top}px`;
        tooltip.style.left = `${left}px`;
    });

    document.addEventListener('mouseout', (e) => {
        const targetInfo = getTooltipTarget(e.target);
        if (targetInfo) {
            tooltip.classList.remove('visible');
        }
    });

    document.addEventListener('click', () => {
        tooltip.classList.remove('visible');
    });
}
