/* FELBIC OS — Clock Module */

export function initClock(elementId) {
    const clockElement = document.getElementById(elementId);
    if (!clockElement) return;

    function updateTime() {
        const now = new Date();
        
        // Format options resembling macOS top menu bar clock
        const options = { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
        };
        
        let timeString = now.toLocaleDateString('en-US', options);
        // Clean double spaces if any
        timeString = timeString.replace(/\s+/g, ' ');
        
        clockElement.textContent = timeString;
    }

    // Run immediately
    updateTime();
    
    // Update every second
    setInterval(updateTime, 1000);
}
