/* ==========================================================================
   FELBIC OS — CLOCK APP LOGIC MODULE
   ========================================================================== */

export function initClockApp() {
    console.log('[clock-app] Initializing Clock App...');

    const win = document.getElementById('clock-app-window');
    if (!win) return;

    // ── 1. Tab Switching Controls ──
    const tabButtons = win.querySelectorAll('.clock-tab-btn');
    const tabPanes = win.querySelectorAll('.clock-tab-pane');

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');

            // Set active class on buttons
            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Set active class on panes
            tabPanes.forEach(pane => {
                pane.classList.remove('active');
                if (pane.id === `pane-${targetTab}`) {
                    pane.classList.add('active');
                }
            });
        });
    });

    // ── 2. World Clock Module ──
    function updateWorldClocks() {
        const now = new Date();
        const options = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true };

        const zones = {
            cupertino: 'America/Los_Angeles',
            london: 'Europe/London',
            delhi: 'Asia/Kolkata',
            tokyo: 'Asia/Tokyo'
        };

        for (const city in zones) {
            const timeEl = document.getElementById(`world-time-${city}`);
            if (timeEl) {
                try {
                    timeEl.textContent = now.toLocaleTimeString('en-US', {
                        ...options,
                        timeZone: zones[city]
                    });
                } catch (e) {
                    console.error(`Error formatting time for ${city}:`, e);
                }
            }
        }
    }

    // Update clocks every second
    updateWorldClocks();
    setInterval(updateWorldClocks, 1000);

    // ── 3. Alarm Module ──
    const alarmHrInput = document.getElementById('alarm-hr');
    const alarmMinInput = document.getElementById('alarm-min');
    const alarmAmpmSelect = document.getElementById('alarm-ampm');
    const alarmAddBtn = document.getElementById('alarm-add-btn');
    const alarmsContainer = document.getElementById('alarms-list-container');

    let alarms = JSON.parse(localStorage.getItem('aios_alarms_data') || '[]');

    function saveAlarms() {
        localStorage.setItem('aios_alarms_data', JSON.stringify(alarms));
    }

    function renderAlarms() {
        if (!alarmsContainer) return;
        alarmsContainer.innerHTML = '';

        if (alarms.length === 0) {
            alarmsContainer.innerHTML = `<div style="font-size: 11px; color: var(--text-muted); text-align: center; margin-top: 24px;">No Alarms set</div>`;
            return;
        }

        alarms.forEach(alarm => {
            const row = document.createElement('div');
            row.className = 'alarm-item-row';
            row.innerHTML = `
                <span class="alarm-item-time">${alarm.hr}:${alarm.min} ${alarm.ampm}</span>
                <button class="alarm-item-delete" data-id="${alarm.id}">Delete</button>
            `;

            // Delete event handler
            const deleteBtn = row.querySelector('.alarm-item-delete');
            deleteBtn.addEventListener('click', () => {
                alarms = alarms.filter(a => a.id !== alarm.id);
                saveAlarms();
                renderAlarms();
            });

            alarmsContainer.appendChild(row);
        });
    }

    if (alarmAddBtn) {
        alarmAddBtn.addEventListener('click', () => {
            let hrVal = alarmHrInput ? alarmHrInput.value.trim() : '';
            let minVal = alarmMinInput ? alarmMinInput.value.trim() : '';
            const ampmVal = alarmAmpmSelect ? alarmAmpmSelect.value : 'AM';

            const hr = parseInt(hrVal, 10);
            const min = parseInt(minVal, 10);

            if (isNaN(hr) || hr < 1 || hr > 12) {
                if (window.showDialog) {
                    window.showDialog.alert('Please enter a valid hour (1-12).', 'Invalid Alarm');
                } else {
                    alert('Please enter a valid hour (1-12).');
                }
                return;
            }

            if (isNaN(min) || min < 0 || min > 59) {
                if (window.showDialog) {
                    window.showDialog.alert('Please enter valid minutes (0-59).', 'Invalid Alarm');
                } else {
                    alert('Please enter valid minutes (0-59).');
                }
                return;
            }

            const formattedHr = String(hr).padStart(2, '0');
            const formattedMin = String(min).padStart(2, '0');

            const newAlarm = {
                id: Date.now().toString(),
                hr: formattedHr,
                min: formattedMin,
                ampm: ampmVal,
                active: true
            };

            alarms.push(newAlarm);
            saveAlarms();
            renderAlarms();

            // Clear inputs
            if (alarmHrInput) alarmHrInput.value = '';
            if (alarmMinInput) alarmMinInput.value = '';
        });
    }

    // Alarm scheduler tick
    let lastTriggeredMinute = "";
    function checkAlarmsTick() {
        const now = new Date();
        let hours = now.getHours();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12; // convert 0 to 12

        const hoursStr = String(hours).padStart(2, '0');
        const minutesStr = String(now.getMinutes()).padStart(2, '0');
        const currentMinuteString = `${hoursStr}:${minutesStr} ${ampm}`;

        if (currentMinuteString !== lastTriggeredMinute) {
            // Check alarms matching this minute string
            const triggered = alarms.filter(a => a.active && `${a.hr}:${a.min} ${a.ampm}` === currentMinuteString);
            if (triggered.length > 0) {
                lastTriggeredMinute = currentMinuteString;
                triggered.forEach(a => {
                    if (window.showNotification) {
                        window.showNotification('Alarm Triggered', `It's time! (${currentMinuteString})`, 'hgi-alarm-clock');
                    }
                    playAlarmBeep();
                });
            }
        }
    }

    renderAlarms();
    setInterval(checkAlarmsTick, 1000);

    // ── 4. Stopwatch Module ──
    const swDisplay = document.getElementById('stopwatch-display');
    const swLapBtn = document.getElementById('stopwatch-lap-btn');
    const swStartBtn = document.getElementById('stopwatch-start-btn');
    const swLapsContainer = document.getElementById('stopwatch-laps-container');

    let stopwatchStartTime = 0;
    let stopwatchElapsedTime = 0;
    let stopwatchInterval = null;
    let stopwatchLaps = [];

    function formatStopwatchTime(timeMs) {
        const centiseconds = Math.floor((timeMs % 1000) / 10);
        const seconds = Math.floor((timeMs / 1000) % 60);
        const minutes = Math.floor((timeMs / 60000) % 60);
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}`;
    }

    function updateStopwatchDisplay() {
        if (swDisplay) {
            const duration = Date.now() - stopwatchStartTime;
            swDisplay.textContent = formatStopwatchTime(duration);
        }
    }

    function renderStopwatchLaps() {
        if (!swLapsContainer) return;
        swLapsContainer.innerHTML = '';

        if (stopwatchLaps.length === 0) return;

        // Determine fastest and slowest lap durations
        let minDuration = Infinity;
        let maxDuration = -Infinity;

        if (stopwatchLaps.length >= 2) {
            stopwatchLaps.forEach(lap => {
                if (lap.duration < minDuration) minDuration = lap.duration;
                if (lap.duration > maxDuration) maxDuration = lap.duration;
            });
        }

        // Display laps (most recent first)
        const reversedLaps = [...stopwatchLaps].reverse();
        reversedLaps.forEach(lap => {
            const row = document.createElement('div');
            row.className = 'stopwatch-lap-row';

            if (stopwatchLaps.length >= 2) {
                if (lap.duration === minDuration) row.classList.add('fastest');
                else if (lap.duration === maxDuration) row.classList.add('slowest');
            }

            row.innerHTML = `
                <span>Lap ${lap.number}</span>
                <span>${formatStopwatchTime(lap.duration)}</span>
            `;
            swLapsContainer.appendChild(row);
        });
    }

    if (swStartBtn) {
        swStartBtn.addEventListener('click', () => {
            if (stopwatchInterval === null) {
                // Start
                stopwatchStartTime = Date.now() - stopwatchElapsedTime;
                stopwatchInterval = setInterval(updateStopwatchDisplay, 10);
                
                swStartBtn.textContent = 'Stop';
                swStartBtn.className = 'stopwatch-btn stop';

                if (swLapBtn) {
                    swLapBtn.textContent = 'Lap';
                    swLapBtn.disabled = false;
                    swLapBtn.className = 'stopwatch-btn lap';
                }
            } else {
                // Stop
                clearInterval(stopwatchInterval);
                stopwatchInterval = null;
                stopwatchElapsedTime = Date.now() - stopwatchStartTime;

                if (swDisplay) {
                    swDisplay.textContent = formatStopwatchTime(stopwatchElapsedTime);
                }

                swStartBtn.textContent = 'Start';
                swStartBtn.className = 'stopwatch-btn start';

                if (swLapBtn) {
                    swLapBtn.textContent = 'Reset';
                    swLapBtn.className = 'stopwatch-btn reset';
                }
            }
        });
    }

    if (swLapBtn) {
        swLapBtn.addEventListener('click', () => {
            if (stopwatchInterval !== null) {
                // Lap action
                const totalTime = Date.now() - stopwatchStartTime;
                const prevCumulative = stopwatchLaps.length > 0 ? stopwatchLaps[stopwatchLaps.length - 1].cumulative : 0;
                const lapDuration = totalTime - prevCumulative;

                stopwatchLaps.push({
                    number: stopwatchLaps.length + 1,
                    duration: lapDuration,
                    cumulative: totalTime
                });

                renderStopwatchLaps();
            } else {
                // Reset action
                stopwatchElapsedTime = 0;
                stopwatchLaps = [];
                if (swDisplay) swDisplay.textContent = '00:00.00';
                renderStopwatchLaps();

                swLapBtn.textContent = 'Lap';
                swLapBtn.disabled = true;
                swLapBtn.className = 'stopwatch-btn lap';
            }
        });
    }

    // ── 5. Timer Module ──
    const timerSelectors = document.getElementById('timer-selectors');
    const timerHrSelect = document.getElementById('timer-hr');
    const timerMinSelect = document.getElementById('timer-min');
    const timerSecSelect = document.getElementById('timer-sec');

    const timerRingContainer = document.getElementById('timer-ring-container');
    const timerProgressBar = document.getElementById('timer-progress-bar');
    const timerDisplayDigits = document.getElementById('timer-display-digits');

    const timerCancelBtn = document.getElementById('timer-cancel-btn');
    const timerStartBtn = document.getElementById('timer-start-btn');

    let timerTotalSeconds = 0;
    let timerRemainingSeconds = 0;
    let timerInterval = null;
    let timerState = 'stopped'; // 'stopped', 'running', 'paused'

    // Populate Timer select options dynamically
    function populateTimerSelectors() {
        if (!timerHrSelect || !timerMinSelect || !timerSecSelect) return;

        timerHrSelect.innerHTML = '';
        timerMinSelect.innerHTML = '';
        timerSecSelect.innerHTML = '';

        for (let i = 0; i < 24; i++) {
            const opt = document.createElement('option');
            opt.value = i;
            opt.textContent = String(i).padStart(2, '0');
            timerHrSelect.appendChild(opt);
        }

        for (let i = 0; i < 60; i++) {
            const optMin = document.createElement('option');
            optMin.value = i;
            optMin.textContent = String(i).padStart(2, '0');
            timerMinSelect.appendChild(optMin);

            const optSec = document.createElement('option');
            optSec.value = i;
            optSec.textContent = String(i).padStart(2, '0');
            timerSecSelect.appendChild(optSec);
        }
    }

    populateTimerSelectors();

    function formatTimerDigits(sec) {
        const hrs = Math.floor(sec / 3600);
        const mins = Math.floor((sec % 3600) / 60);
        const secs = sec % 60;
        return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    function updateTimerProgress() {
        if (timerDisplayDigits) {
            timerDisplayDigits.textContent = formatTimerDigits(timerRemainingSeconds);
        }

        if (timerProgressBar) {
            const circumference = 440; // SVG circle stroke-dasharray
            const offset = timerTotalSeconds > 0 
                ? circumference - (timerRemainingSeconds / timerTotalSeconds) * circumference 
                : circumference;
            timerProgressBar.style.strokeDashoffset = offset;
        }
    }

    function timerTick() {
        if (timerRemainingSeconds <= 0) {
            // Timer Finished!
            clearInterval(timerInterval);
            timerInterval = null;
            timerState = 'stopped';

            if (window.showNotification) {
                window.showNotification('Timer Finished', 'Time is up!', 'hgi-time-02');
            }
            playAlarmBeep();

            // Reset UI
            if (timerSelectors) timerSelectors.style.display = 'flex';
            if (timerRingContainer) timerRingContainer.style.display = 'none';

            if (timerStartBtn) {
                timerStartBtn.textContent = 'Start';
                timerStartBtn.className = 'timer-btn start';
            }
            if (timerCancelBtn) {
                timerCancelBtn.disabled = true;
            }
            return;
        }

        timerRemainingSeconds--;
        updateTimerProgress();
    }

    if (timerStartBtn) {
        timerStartBtn.addEventListener('click', () => {
            if (timerState === 'stopped') {
                const hr = parseInt(timerHrSelect ? timerHrSelect.value : '0', 10);
                const min = parseInt(timerMinSelect ? timerMinSelect.value : '0', 10);
                const sec = parseInt(timerSecSelect ? timerSecSelect.value : '0', 10);

                timerTotalSeconds = hr * 3600 + min * 60 + sec;

                if (timerTotalSeconds <= 0) {
                    if (window.showDialog) {
                        window.showDialog.alert('Please set a duration greater than 0 seconds.', 'Invalid Timer');
                    } else {
                        alert('Please set a duration greater than 0 seconds.');
                    }
                    return;
                }

                timerRemainingSeconds = timerTotalSeconds;
                timerState = 'running';

                if (timerSelectors) timerSelectors.style.display = 'none';
                if (timerRingContainer) timerRingContainer.style.display = 'flex';

                timerInterval = setInterval(timerTick, 1000);
                updateTimerProgress();

                timerStartBtn.textContent = 'Pause';
                timerStartBtn.className = 'timer-btn pause';

                if (timerCancelBtn) timerCancelBtn.disabled = false;
            } else if (timerState === 'running') {
                // Pause timer
                clearInterval(timerInterval);
                timerInterval = null;
                timerState = 'paused';

                timerStartBtn.textContent = 'Resume';
                timerStartBtn.className = 'timer-btn start';
            } else if (timerState === 'paused') {
                // Resume timer
                timerState = 'running';
                timerInterval = setInterval(timerTick, 1000);

                timerStartBtn.textContent = 'Pause';
                timerStartBtn.className = 'timer-btn pause';
            }
        });
    }

    if (timerCancelBtn) {
        timerCancelBtn.addEventListener('click', () => {
            if (timerInterval) {
                clearInterval(timerInterval);
                timerInterval = null;
            }

            timerState = 'stopped';
            timerTotalSeconds = 0;
            timerRemainingSeconds = 0;

            if (timerSelectors) timerSelectors.style.display = 'flex';
            if (timerRingContainer) timerRingContainer.style.display = 'none';

            if (timerStartBtn) {
                timerStartBtn.textContent = 'Start';
                timerStartBtn.className = 'timer-btn start';
            }
            timerCancelBtn.disabled = true;
        });
    }

    // ── 6. Audio Synth Alarm tone generator (Web Audio API) ──
    function playAlarmBeep() {
        try {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (!AudioContextClass) return;

            const audioCtx = new AudioContextClass();
            let startTime = audioCtx.currentTime;

            // Generate 3 rapid beeps
            for (let i = 0; i < 3; i++) {
                const osc = audioCtx.createOscillator();
                const gainNode = audioCtx.createGain();

                osc.connect(gainNode);
                gainNode.connect(audioCtx.destination);

                osc.type = 'sine';
                osc.frequency.setValueAtTime(880, startTime + i * 0.4); // 880 Hz (A5 Note)

                // Enveloping
                gainNode.gain.setValueAtTime(0, startTime + i * 0.4);
                gainNode.gain.linearRampToValueAtTime(0.25, startTime + i * 0.4 + 0.05);
                gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + i * 0.4 + 0.3);

                osc.start(startTime + i * 0.4);
                osc.stop(startTime + i * 0.4 + 0.3);
            }
        } catch (e) {
            console.error('Failed to play alarm sound beep:', e);
        }
    }
}
