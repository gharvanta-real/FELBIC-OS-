/* ==========================================================================
   FELBIC OS — CALENDAR APPLICATION MODULE
   ========================================================================== */

export function initCalendarApp() {
    console.log('[calendar-app] Initializing Calendar App...');

    const win = document.getElementById('calendar-window');
    if (!win) return;

    // Today indicators (Sidebar static display)
    const todayNameEl = document.getElementById('cal-today-dayname');
    const todayNumEl = document.getElementById('cal-today-daynumber');

    // Month headers & grids
    const monthHeader = document.getElementById('cal-current-month');
    const gridDays = document.getElementById('cal-grid-days');
    const prevMonthBtn = document.getElementById('cal-prev-month');
    const nextMonthBtn = document.getElementById('cal-next-month');
    const jumpTodayBtn = document.getElementById('cal-jump-today');

    // Events Sidebar
    const searchInput = document.getElementById('cal-search');
    const upcomingList = document.getElementById('cal-upcoming-events-list');

    // Event Modal elements
    const eventModal = document.getElementById('cal-event-modal');
    const modalCloseBtn = document.getElementById('cal-close-modal');
    const eventTitle = document.getElementById('cal-event-title');
    const eventDesc = document.getElementById('cal-event-desc');
    const eventTag = document.getElementById('cal-event-tag');
    const saveEventBtn = document.getElementById('cal-save-event');
    const cancelEventBtn = document.getElementById('cal-cancel-event');

    // Local state
    const today = new Date();
    let currentYear = today.getFullYear();
    let currentMonth = today.getMonth(); // 0-11
    let selectedDateStr = ''; // YYYY-MM-DD format for selected day modal

    // Events store
    let events = JSON.parse(localStorage.getItem('aios_calendar_events') || '{}');

    // Helper: format YYYY-MM-DD
    function formatDateString(year, month, day) {
        const mm = String(month + 1).padStart(2, '0');
        const dd = String(day).padStart(2, '0');
        return `${year}-${mm}-${dd}`;
    }

    // 1. Setup Static Sidebar Today Info
    function updateTodayInfo() {
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        if (todayNameEl) todayNameEl.textContent = dayNames[today.getDay()];
        if (todayNumEl) todayNumEl.textContent = today.getDate();
    }

    // 2. Render Month Grid Days
    function renderMonthGrid() {
        if (!gridDays || !monthHeader) return;

        gridDays.innerHTML = '';
        const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];

        monthHeader.textContent = `${monthNames[currentMonth]} ${currentYear}`;

        // Get details of active month
        const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay(); // 0-6
        const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
        const prevTotalDays = new Date(currentYear, currentMonth, 0).getDate();

        // 42 cells total (6 rows * 7 columns)
        let cellsCount = 0;

        // Render previous month days
        for (let i = firstDayIndex - 1; i >= 0; i--) {
            const dayNum = prevTotalDays - i;
            const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
            const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
            const dateStr = formatDateString(prevYear, prevMonth, dayNum);

            createDayCell(dayNum, dateStr, true);
            cellsCount++;
        }

        // Render current month days
        for (let dayNum = 1; dayNum <= totalDays; dayNum++) {
            const dateStr = formatDateString(currentYear, currentMonth, dayNum);
            const isToday = currentYear === today.getFullYear() && currentMonth === today.getMonth() && dayNum === today.getDate();

            createDayCell(dayNum, dateStr, false, isToday);
            cellsCount++;
        }

        // Render next month days
        let nextMonthDay = 1;
        while (cellsCount < 42) {
            const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
            const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
            const dateStr = formatDateString(nextYear, nextMonth, nextMonthDay);

            createDayCell(nextMonthDay, dateStr, true);
            nextMonthDay++;
            cellsCount++;
        }
    }

    // Helper: Create individual day HTML cell
    function createDayCell(dayNum, dateStr, isOtherMonth, isToday = false) {
        const cell = document.createElement('div');
        cell.className = 'calendar-day-cell';
        if (isOtherMonth) cell.classList.add('other-month');
        if (isToday) cell.classList.add('today');

        cell.innerHTML = `<span class="cal-day-number">${dayNum}</span>`;

        // Render event indicators if any events exist
        const dayEvents = events[dateStr] || [];
        if (dayEvents.length > 0) {
            const dotsContainer = document.createElement('div');
            dotsContainer.className = 'cal-cell-events-dots';
            
            // Limit to 3 dots
            dayEvents.slice(0, 3).forEach(ev => {
                const dot = document.createElement('span');
                dot.className = `cal-event-dot tag-${ev.tag}`;
                dotsContainer.appendChild(dot);
            });
            cell.appendChild(dotsContainer);
        }

        // Click handler to open add event modal
        cell.addEventListener('click', () => {
            selectedDateStr = dateStr;
            openEventModal();
        });

        gridDays.appendChild(cell);
    }

    // 3. Render Events List inside Sidebar
    function renderEventsList() {
        if (!upcomingList) return;
        upcomingList.innerHTML = '';

        const searchQuery = searchInput ? searchInput.value.toLowerCase().trim() : '';

        // Gather all events and flatten into an array
        const allEvents = [];
        Object.keys(events).forEach(dateStr => {
            events[dateStr].forEach(ev => {
                allEvents.push({
                    dateStr,
                    title: ev.title,
                    desc: ev.desc,
                    tag: ev.tag
                });
            });
        });

        // Sort events chronologically by date
        allEvents.sort((a, b) => new Date(a.dateStr) - new Date(b.dateStr));

        // Filter events based on search query
        const filtered = allEvents.filter(ev => 
            ev.title.toLowerCase().includes(searchQuery) || 
            ev.desc.toLowerCase().includes(searchQuery) ||
            ev.dateStr.includes(searchQuery)
        );

        if (filtered.length === 0) {
            upcomingList.innerHTML = `<div style="font-size: 10px; color: var(--text-muted); text-align: center; margin-top: 20px;">No Events</div>`;
            return;
        }

        filtered.forEach(ev => {
            const card = document.createElement('div');
            card.className = `calendar-event-sidebar-card tag-${ev.tag}`;

            // Clean date display format
            const eventDate = new Date(ev.dateStr + 'T00:00:00');
            const dateStrFormatted = eventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

            card.innerHTML = `
                <div class="cal-event-title-text">${ev.title}</div>
                <div class="cal-event-desc-text">${ev.desc}</div>
                <div class="cal-event-date-text">${dateStrFormatted}</div>
            `;
            upcomingList.appendChild(card);
        });
    }

    // 4. Modal actions
    function openEventModal() {
        if (!eventModal) return;
        
        // Populate current date in modal header
        const modalTitle = document.getElementById('cal-modal-title');
        const selectedDate = new Date(selectedDateStr + 'T00:00:00');
        const dateFormatted = selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
        
        if (modalTitle) modalTitle.textContent = `New Event - ${dateFormatted}`;
        
        // Reset inputs
        if (eventTitle) eventTitle.value = '';
        if (eventDesc) eventDesc.value = '';
        if (eventTag) eventTag.value = 'work';
        
        eventModal.style.display = 'flex';
        if (eventTitle) eventTitle.focus();
    }

    function closeEventModal() {
        if (eventModal) eventModal.style.display = 'none';
    }

    function saveEvent() {
        const title = eventTitle ? eventTitle.value.trim() : '';
        const desc = eventDesc ? eventDesc.value.trim() : '';
        const tag = eventTag ? eventTag.value : 'work';

        if (!title) {
            alert('Please enter an event title.');
            return;
        }

        if (!events[selectedDateStr]) {
            events[selectedDateStr] = [];
        }

        events[selectedDateStr].push({ title, desc, tag });
        localStorage.setItem('aios_calendar_events', JSON.stringify(events));

        closeEventModal();
        renderMonthGrid();
        renderEventsList();
    }

    // 5. Setup Listeners
    if (prevMonthBtn) {
        prevMonthBtn.addEventListener('click', () => {
            if (currentMonth === 0) {
                currentMonth = 11;
                currentYear--;
            } else {
                currentMonth--;
            }
            renderMonthGrid();
        });
    }

    if (nextMonthBtn) {
        nextMonthBtn.addEventListener('click', () => {
            if (currentMonth === 11) {
                currentMonth = 0;
                currentYear++;
            } else {
                currentMonth++;
            }
            renderMonthGrid();
        });
    }

    if (jumpTodayBtn) {
        jumpTodayBtn.addEventListener('click', () => {
            currentYear = today.getFullYear();
            currentMonth = today.getMonth();
            renderMonthGrid();
        });
    }

    if (searchInput) {
        searchInput.addEventListener('input', renderEventsList);
    }

    // Modal save/close buttons
    if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeEventModal);
    if (cancelEventBtn) cancelEventBtn.addEventListener('click', closeEventModal);
    if (saveEventBtn) saveEventBtn.addEventListener('click', saveEvent);

    // Close modal clicking overlay
    if (eventModal) {
        eventModal.addEventListener('click', (e) => {
            if (e.target === eventModal) closeEventModal();
        });
    }

    // Escape closes modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && eventModal && eventModal.style.display === 'flex') {
            closeEventModal();
        }
    });

    // 6. Initial render execution
    updateTodayInfo();
    renderMonthGrid();
    renderEventsList();
}
