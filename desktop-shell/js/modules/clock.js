/* FELBIC OS — Clock Module */

export function initClock(elementId) {
    const clockElement = document.getElementById(elementId);
    const dateEl = document.getElementById('topbar-date');
    const timeEl = document.getElementById('topbar-time');

    function updateTime() {
        const now = new Date();
        
        const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
        const w = weekdays[now.getDay()];
        const m = months[now.getMonth()];
        const d = now.getDate();
        
        let hr = now.getHours();
        const min = String(now.getMinutes()).padStart(2, '0');
        const ampm = hr >= 12 ? 'PM' : 'AM';
        
        hr = hr % 12;
        hr = hr ? hr : 12;
        const hrStr = String(hr).padStart(2, '0');
        
        if (dateEl) {
            dateEl.textContent = `${w}, ${d} ${m}`;
        }
        if (timeEl) {
            timeEl.textContent = `${hrStr}:${min} ${ampm}`;
        }
        if (clockElement) {
            clockElement.textContent = `${w}, ${m} ${d} • ${hrStr}:${min} ${ampm}`;
        }
    }

    // Run immediately
    updateTime();
    
    // Update every second
    setInterval(updateTime, 1000);
}
