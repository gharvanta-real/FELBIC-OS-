/* FELBIC OS — Aura Player Application Module */
import { aisd } from '../aisd-client.js';

export function initMediaApp() {
    console.log('[media-app] Initializing Aura Player...');

    const playlist = [
        { id: 0, title: "Midnight City", artist: "M83", duration: 243, vibe: "Electronic / Nostalgic" },
        { id: 1, title: "Starboy", artist: "The Weeknd", duration: 230, vibe: "R&B / Dark" },
        { id: 2, title: "Blinding Lights", artist: "The Weeknd", duration: 200, vibe: "Synthwave / Energetic" },
        { id: 3, title: "Instant Crush", artist: "Daft Punk", duration: 337, vibe: "Disco / Melancholic" },
        { id: 4, title: "Nightcall", artist: "Kavinsky", duration: 258, vibe: "Outrun / Moody" }
    ];

    let currentIdx = 0;
    let isPlaying = false;
    let currentTime = 0;
    let timer = null;
    let animationId = null;

    // UI Elements
    const canvas = document.getElementById('media-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    const playBtn = document.getElementById('media-btn-play');
    const playIcon = document.getElementById('media-play-icon');
    const prevBtn = document.getElementById('media-btn-prev');
    const nextBtn = document.getElementById('media-btn-next');
    const progressSlider = document.getElementById('media-progress');
    const volumeSlider = document.getElementById('media-volume');
    const currentTimeTxt = document.getElementById('media-time-current');
    const durationTxt = document.getElementById('media-time-duration');
    const titleTxt = document.getElementById('media-now-playing-title');
    const artistTxt = document.getElementById('media-now-playing-artist');
    const vibeBadge = document.getElementById('media-vibe-text');
    const playlistScroll = document.getElementById('media-playlist-scroll');
    const vibeCheckBtn = document.getElementById('media-vibe-check');

    function formatTime(s) {
        const min = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${min}:${sec.toString().padStart(2, '0')}`;
    }

    function renderPlaylist() {
        if (!playlistScroll) return;
        playlistScroll.innerHTML = '';
        playlist.forEach((track, idx) => {
            const item = document.createElement('div');
            item.className = `media-playlist-item ${idx === currentIdx ? 'active' : ''}`;
            item.innerHTML = `
                <div class="media-item-thumb">
                    <i class="hgi-stroke hgi-music-note-01"></i>
                </div>
                <div class="media-item-info">
                    <div class="media-item-title">${track.title}</div>
                    <div class="media-item-duration">${formatTime(track.duration)}</div>
                </div>
            `;
            item.addEventListener('click', () => {
                loadTrack(idx);
                play();
            });
            playlistScroll.appendChild(item);
        });
    }

    function loadTrack(idx) {
        currentIdx = idx;
        const track = playlist[currentIdx];
        if (titleTxt) titleTxt.textContent = track.title;
        if (artistTxt) artistTxt.textContent = track.artist;
        if (vibeBadge) vibeBadge.textContent = track.vibe;
        if (durationTxt) durationTxt.textContent = formatTime(track.duration);
        if (progressSlider) {
            progressSlider.max = track.duration;
            progressSlider.value = 0;
        }
        currentTime = 0;
        if (currentTimeTxt) currentTimeTxt.textContent = "0:00";
        renderPlaylist();
    }

    function play() {
        isPlaying = true;
        if (playIcon) playIcon.className = "hgi-stroke hgi-pause";
        startTimer();
        startVisualizer();
    }

    function pause() {
        isPlaying = false;
        if (playIcon) playIcon.className = "hgi-stroke hgi-play";
        stopTimer();
        stopVisualizer();
    }

    function startTimer() {
        if (timer) clearInterval(timer);
        timer = setInterval(() => {
            if (currentTime < playlist[currentIdx].duration) {
                currentTime++;
                if (progressSlider) progressSlider.value = currentTime;
                if (currentTimeTxt) currentTimeTxt.textContent = formatTime(currentTime);
            } else {
                next();
            }
        }, 1000);
    }

    function stopTimer() {
        clearInterval(timer);
        timer = null;
    }

    function next() {
        loadTrack((currentIdx + 1) % playlist.length);
        if (isPlaying) play();
    }

    function prev() {
        loadTrack((currentIdx - 1 + playlist.length) % playlist.length);
        if (isPlaying) play();
    }

    // Canvas Visualizer
    function startVisualizer() {
        if (!ctx) return;
        
        function draw() {
            if (!isPlaying) return;
            animationId = requestAnimationFrame(draw);
            
            const w = canvas.width = canvas.offsetWidth;
            const h = canvas.height = canvas.offsetHeight;
            
            ctx.clearRect(0, 0, w, h);
            
            const bars = 64;
            const barWidth = w / bars;
            
            for (let i = 0; i < bars; i++) {
                const barHeight = Math.random() * (h / 2);
                const hue = (i / bars) * 360;
                
                ctx.fillStyle = `hsla(${hue}, 70%, 50%, 0.4)`;
                ctx.fillRect(i * barWidth, h - barHeight, barWidth - 2, barHeight);
                
                // Mirror
                ctx.fillStyle = `hsla(${hue}, 70%, 50%, 0.1)`;
                ctx.fillRect(i * barWidth, 0, barWidth - 2, barHeight);
            }
        }
        draw();
    }

    function stopVisualizer() {
        cancelAnimationFrame(animationId);
        if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }

    async function vibeCheck() {
        if (!vibeCheckBtn) return;
        
        const originalText = vibeCheckBtn.textContent;
        vibeCheckBtn.textContent = "Checking...";
        vibeCheckBtn.disabled = true;

        try {
            const currentVibe = playlist[currentIdx].vibe;
            const prompt = `Current vibe is "${currentVibe}". Suggest another musical vibe that would complement this for a late-night coding session. Be creative but concise (2-3 words).`;
            
            const response = await aisd.call('ai/chat', { prompt });
            
            if (vibeBadge) {
                vibeBadge.textContent = `AI Suggests: ${response}`;
                setTimeout(() => {
                    vibeBadge.textContent = playlist[currentIdx].vibe;
                }, 5000);
            }
        } catch (err) {
            console.error("Vibe check failed", err);
        } finally {
            vibeCheckBtn.textContent = originalText;
            vibeCheckBtn.disabled = false;
        }
    }

    // Listeners
    if (playBtn) playBtn.addEventListener('click', () => isPlaying ? pause() : play());
    if (nextBtn) nextBtn.addEventListener('click', next);
    if (prevBtn) prevBtn.addEventListener('click', prev);
    if (vibeCheckBtn) vibeCheckBtn.addEventListener('click', vibeCheck);
    
    if (progressSlider) {
        progressSlider.addEventListener('input', () => {
            currentTime = parseInt(progressSlider.value);
            if (currentTimeTxt) currentTimeTxt.textContent = formatTime(currentTime);
        });
    }

    loadTrack(0);
}
