/* FELBIC OS — Media Player (VLC Mockup) Application Module */

export function initMediaApp() {
    console.log('[media-app] Initializing Media App...');
    const playBtn = document.getElementById('media-btn-play');
    const playIcon = document.getElementById('media-play-icon');
    const prevBtn = document.getElementById('media-btn-prev');
    const nextBtn = document.getElementById('media-btn-next');
    const progressInput = document.getElementById('media-progress');
    const volumeInput = document.getElementById('media-volume');
    const currentText = document.getElementById('media-time-current');
    const durationText = document.getElementById('media-time-duration');
    const nowPlayingText = document.getElementById('media-now-playing');
    const playlistContainer = document.getElementById('media-playlist');
    const mediaIcon = document.getElementById('media-icon');
    const visualWaves = document.getElementById('media-visual-waves');

    const playlist = [
        { id: 0, title: "Lofi Chill Coding Beats", duration: 180, type: "audio" },
        { id: 1, title: "Cyberpunk Horizon", duration: 240, type: "audio" },
        { id: 2, title: "FELBIC OS Promo Video", duration: 90, type: "video" }
    ];

    let currentTrackIdx = 0;
    let isPlaying = false;
    let currentTime = 0;
    let timer = null;

    function formatTime(secs) {
        const m = Math.floor(secs / 60).toString().padStart(2, '0');
        const s = Math.floor(secs % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    }

    function loadTrack(idx) {
        currentTrackIdx = idx;
        const track = playlist[currentTrackIdx];
        if (nowPlayingText) nowPlayingText.textContent = track.title;
        if (durationText) durationText.textContent = formatTime(track.duration);
        if (progressInput) {
            progressInput.max = track.duration;
            progressInput.value = 0;
        }
        currentTime = 0;
        if (currentText) currentText.textContent = "00:00";

        // Update active class in playlist elements
        if (playlistContainer) {
            const items = playlistContainer.querySelectorAll('.playlist-item');
            items.forEach((item, i) => {
                if (i === idx) {
                    item.style.background = "rgba(249, 115, 22, 0.2)";
                    item.style.color = "#fff";
                } else {
                    item.style.background = "transparent";
                    item.style.color = "#aaa";
                }
            });
        }

        if (mediaIcon) {
            if (track.type === 'video') {
                mediaIcon.className = "hgi-stroke hgi-video-console";
                mediaIcon.style.color = "#3b82f6";
            } else {
                mediaIcon.className = "hgi-stroke hgi-music-note-01";
                mediaIcon.style.color = "#f97316";
            }
        }
    }

    function renderPlaylist() {
        if (!playlistContainer) return;
        playlistContainer.innerHTML = '';
        playlist.forEach((track, idx) => {
            const item = document.createElement('div');
            item.className = 'playlist-item';
            item.style.display = "flex";
            item.style.justifyContent = "space-between";
            item.style.alignItems = "center";
            item.style.padding = "6px 8px";
            item.style.borderRadius = "4px";
            item.style.cursor = "pointer";
            item.style.fontSize = "12px";
            item.style.color = "#aaa";
            item.style.transition = "background 0.2s";
            
            const icon = track.type === 'video' ? '<i class="hgi-stroke hgi-video-console" style="margin-right: 6px;"></i>' : '<i class="hgi-stroke hgi-music-note-01" style="margin-right: 6px;"></i>';
            item.innerHTML = `
                <div style="display: flex; align-items: center;">
                    ${icon}
                    <span>${track.title}</span>
                </div>
                <span>${formatTime(track.duration)}</span>
            `;

            item.addEventListener('click', () => {
                loadTrack(idx);
                playTrack();
            });

            playlistContainer.appendChild(item);
        });
    }

    function playTrack() {
        isPlaying = true;
        if (playIcon) playIcon.className = "hgi-stroke hgi-pause";
        if (timer) clearInterval(timer);
        timer = setInterval(() => {
            const track = playlist[currentTrackIdx];
            if (currentTime < track.duration) {
                currentTime++;
                if (progressInput) progressInput.value = currentTime;
                if (currentText) currentText.textContent = formatTime(currentTime);
                animateVisualizer();
            } else {
                nextTrack();
            }
        }, 1000);
    }

    function pauseTrack() {
        isPlaying = false;
        if (playIcon) playIcon.className = "hgi-stroke hgi-play";
        if (timer) {
            clearInterval(timer);
            timer = null;
        }
        resetVisualizer();
    }

    function nextTrack() {
        let nextIdx = currentTrackIdx + 1;
        if (nextIdx >= playlist.length) nextIdx = 0;
        loadTrack(nextIdx);
        if (isPlaying) playTrack();
    }

    function prevTrack() {
        let prevIdx = currentTrackIdx - 1;
        if (prevIdx < 0) prevIdx = playlist.length - 1;
        loadTrack(prevIdx);
        if (isPlaying) playTrack();
    }

    function animateVisualizer() {
        if (!visualWaves) return;
        const waveBars = visualWaves.querySelectorAll('.wave-bar');
        waveBars.forEach(bar => {
            const randHeight = Math.floor(Math.random() * 25) + 5;
            bar.style.height = `${randHeight}px`;
        });
    }

    function resetVisualizer() {
        if (!visualWaves) return;
        const waveBars = visualWaves.querySelectorAll('.wave-bar');
        waveBars.forEach(bar => {
            bar.style.height = `8px`;
        });
    }

    // Event listeners
    if (playBtn) {
        playBtn.addEventListener('click', () => {
            if (isPlaying) {
                pauseTrack();
            } else {
                playTrack();
            }
        });
    }

    if (prevBtn) prevBtn.addEventListener('click', prevTrack);
    if (nextBtn) nextBtn.addEventListener('click', nextTrack);

    if (progressInput) {
        progressInput.addEventListener('input', () => {
            currentTime = parseInt(progressInput.value);
            if (currentText) currentText.textContent = formatTime(currentTime);
        });
    }

    // Render & load initial state
    renderPlaylist();
    loadTrack(0);
}
