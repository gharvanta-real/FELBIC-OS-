/* FELBIC OS — Weather Module */

export async function initWeather() {
    const topbarWeather = document.getElementById('topbar-weather');
    if (!topbarWeather) return;

    async function updateWeather() {
        try {
            // Using ?format=%t to get just the temperature as plain text, 
            // ensuring we don't get the full HTML report.
            const res = await fetch('https://wttr.in/San%20Francisco?format=%t');
            if (!res.ok) throw new Error("Weather fetch failed");
            const temp = await res.text();
            
            // Validate that the response is actually temperature text and not HTML
            if (temp.includes('<')) {
                throw new Error("Received HTML instead of plain text");
            }

            const span = topbarWeather.querySelector('span');
            if (span) span.textContent = temp.trim();
        } catch (e) {
            console.warn('[weather] Could not fetch topbar weather:', e);
            // Fallback display
            const span = topbarWeather.querySelector('span');
            if (span) span.textContent = "--°";
        }
    }

    // Initial update
    updateWeather();
    
    // Update every 30 minutes
    setInterval(updateWeather, 30 * 60 * 1000);
}
