/* FELBIC OS — Calamares Live Installer Wizard Module */

export function initInstaller() {
    console.log('[felbicos] Initializing Calamares Installer Module...');

    const win = document.getElementById('installer-window');
    if (!win) return;

    let currentStep = 1;
    const totalSteps = 6;

    // Elements
    const stepItems = win.querySelectorAll('.installer-step-item');
    const pages = win.querySelectorAll('.installer-page');
    const btnBack = win.getElementById ? win.getElementById('inst-btn-back') : document.getElementById('inst-btn-back');
    const btnNext = win.getElementById ? win.getElementById('inst-btn-next') : document.getElementById('inst-btn-next');
    const driveBar = win.querySelector('#drive-visual-bar');
    const partErase = win.querySelector('#part-erase');
    const partManual = win.querySelector('#part-manual');
    const kbdTestInput = win.querySelector('#kbd-test-input');
    const kbKeys = win.querySelectorAll('.kb-key');
    
    // Progress Elements
    const progressFill = win.querySelector('#inst-progress-fill');
    const progressPercent = win.querySelector('#inst-progress-percent');
    const consoleLog = win.querySelector('#installer-console-log');

    // Setup Wizard Navigation
    function updateStepUI() {
        // Update sidebar
        stepItems.forEach(item => {
            const stepNum = parseInt(item.getAttribute('data-step'));
            item.classList.remove('active', 'completed');
            if (stepNum === currentStep) {
                item.classList.add('active');
            } else if (stepNum < currentStep) {
                item.classList.add('completed');
            }
        });

        // Update pages
        pages.forEach(page => {
            const pageNum = parseInt(page.getAttribute('data-page'));
            if (pageNum === currentStep) {
                page.classList.add('active');
            } else {
                page.classList.remove('active');
            }
        });

        // Update footer buttons
        if (currentStep === 1) {
            btnBack.style.display = 'none';
        } else {
            btnBack.style.display = 'inline-block';
        }

        if (currentStep === 5) {
            // Installation in progress - hide controls
            btnBack.style.display = 'none';
            btnNext.style.display = 'none';
            startInstallationProgress();
        } else if (currentStep === 6) {
            // Finished
            btnBack.style.display = 'none';
            btnNext.style.display = 'none';
        } else {
            btnNext.style.display = 'inline-block';
            btnNext.textContent = 'Next';
            btnNext.disabled = false;
            btnBack.disabled = false;
        }
    }

    if (btnBack) {
        btnBack.addEventListener('click', () => {
            if (currentStep > 1 && currentStep !== 5 && currentStep !== 6) {
                currentStep--;
                updateStepUI();
            }
        });
    }

    if (btnNext) {
        btnNext.addEventListener('click', () => {
            if (currentStep === 4) {
                // Validate user info before moving to install page
                const username = document.getElementById('inst-username')?.value.trim();
                const hostname = document.getElementById('inst-hostname')?.value.trim();
                if (!username || !hostname) {
                    if (window.showNotification) {
                        window.showNotification('Validation Error', 'Please enter a username and computer name.', 'hgi-alert-01');
                    } else {
                        alert('Please enter a username and computer name.');
                    }
                    return;
                }
            }

            if (currentStep < totalSteps) {
                currentStep++;
                updateStepUI();
            }
        });
    }

    // Keyboard Layout Key Click Interactions
    kbKeys.forEach(key => {
        key.addEventListener('click', () => {
            if (!kbdTestInput) return;
            
            // Visual feedback
            key.classList.add('pressed');
            setTimeout(() => key.classList.remove('pressed'), 150);

            const keyText = key.textContent.trim();
            if (keyText === 'Backspace') {
                kbdTestInput.value = kbdTestInput.value.slice(0, -1);
            } else if (keyText === 'Enter') {
                kbdTestInput.value = '';
            } else if (['Esc', 'Tab', 'Caps', 'Shift'].includes(keyText)) {
                // Non-typing control keys
            } else {
                kbdTestInput.value += keyText.toLowerCase();
            }
        });
    });

    // Partition Selection Logic
    if (partErase && partManual && driveBar) {
        partErase.addEventListener('click', () => {
            partErase.classList.add('active');
            partManual.classList.remove('active');
            
            driveBar.innerHTML = `
                <div class="drive-segment root-seg" style="width: 100%; background: linear-gradient(135deg, #3b82f6, #1d4ed8);">
                    /dev/vda1 (ext4) - 64.0 GiB (Erase & Install)
                </div>
            `;
        });

        partManual.addEventListener('click', () => {
            partManual.classList.add('active');
            partErase.classList.remove('active');
            
            driveBar.innerHTML = `
                <div class="drive-segment boot-seg" style="width: 12%; background: linear-gradient(135deg, #a855f7, #7e22ce);" title="EFI System Boot Partition">
                    /dev/vda1 (efi) - 512 MiB
                </div>
                <div class="drive-segment root-seg" style="width: 73%; background: linear-gradient(135deg, #3b82f6, #1d4ed8);" title="Root ext4 System Partition">
                    /dev/vda2 (ext4) - 59.5 GiB
                </div>
                <div class="drive-segment swap-seg" style="width: 15%; background: linear-gradient(135deg, #10b981, #047857);" title="Swap File Cache">
                    /dev/vda3 (swap) - 4.0 GiB
                </div>
            `;
        });
    }

    // Step 5: Installation progress simulator
    let installTimer = null;
    function startInstallationProgress() {
        if (installTimer) clearInterval(installTimer);
        
        progressFill.style.width = '0%';
        progressPercent.textContent = '0%';
        consoleLog.innerHTML = '';

        const logs = [
            { pct: 0, text: 'Creating ext4 partition table on /dev/vda...' },
            { pct: 8, text: 'Writing EFI system bootloader headers...' },
            { pct: 15, text: 'Formatting /dev/vda2 with ext4 journaled filesystem...' },
            { pct: 22, text: 'Mounting root partition /dev/vda2 on Target Directory /mnt...' },
            { pct: 28, text: 'Unpacking root archive filesystem.squashfs...' },
            { pct: 40, text: 'Extracting core system packages (linux, glibc, systemd)...' },
            { pct: 55, text: 'Configuring basic systems locales (/etc/locale.gen)...' },
            { pct: 68, text: 'Generating hardware ramdisk image initramfs-linux...' },
            { pct: 78, text: 'Setting root hostname, network hooks, and user database...' },
            { pct: 85, text: 'Installing bootloader GRUB into MBR of /dev/vda...' },
            { pct: 92, text: 'Running post-installation cleanup scripts...' },
            { pct: 98, text: 'Writing final configuration state config.json...' },
            { pct: 100, text: 'Completed successfully! System is ready.' }
        ];

        let currentPct = 0;
        let logIndex = 0;

        // Append first log
        appendConsoleLog(logs[0].text);
        logIndex = 1;

        installTimer = setInterval(() => {
            currentPct += 1;
            if (currentPct > 100) currentPct = 100;

            progressFill.style.width = `${currentPct}%`;
            progressPercent.textContent = `${currentPct}%`;

            // Check if we should log something new
            if (logIndex < logs.length && currentPct >= logs[logIndex].pct) {
                appendConsoleLog(logs[logIndex].text);
                logIndex++;
            }

            if (currentPct >= 100) {
                clearInterval(installTimer);
                installTimer = null;

                // Wait 1.5 seconds and move to Step 6
                setTimeout(() => {
                    currentStep = 6;
                    updateStepUI();
                }, 1500);
            }
        }, 80); // roughly 8 seconds total
    }

    function appendConsoleLog(text) {
        const span = document.createElement('div');
        span.className = 'console-log-line';
        span.textContent = `[${new Date().toLocaleTimeString()}] ${text}`;
        consoleLog.appendChild(span);
        consoleLog.scrollTop = consoleLog.scrollHeight;
    }

    // Step 6: Restart button click action
    const btnRestart = win.querySelector('.installer-finish-banner + p + button, #inst-restart-btn');
    // We can also just delegate click listener on the restart button on step 6.
    // Let's make sure it is wired properly by target id or dynamic button addition.
    document.addEventListener('click', (e) => {
        if (e.target && e.target.id === 'inst-restart-btn') {
            handleRestartAction();
        }
    });

    function handleRestartAction() {
        if (window.showNotification) {
            window.showNotification('System Rebooting', 'Rebooting into your new FELBIC OS installation...', 'hgi-reload');
        } else {
            alert('Rebooting system...');
        }

        // Close the window
        win.style.transition = 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease';
        win.style.transform = 'scale(0.93) translateY(12px)';
        win.style.opacity = '0';
        
        setTimeout(() => {
            win.style.display = 'none';
            win.classList.remove('active-focus');
            
            // Remove running indicator from dock
            const dockItem = document.querySelector(`.dock-item[data-app="installer"]`);
            if (dockItem) dockItem.classList.remove('running');

            // Reset installer steps for next launch
            currentStep = 1;
            updateStepUI();
        }, 250);
    }
}
