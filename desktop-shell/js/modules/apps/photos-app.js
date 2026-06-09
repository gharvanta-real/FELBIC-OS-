/* FELBIC OS — Photos / Image Viewer Application Module */

const PRESET_PHOTOS = [
    { name: 'Aurora Glow', path: 'assets/Aurora-wallpaper.png', type: 'PNG Image', size: '1.39 MB', width: 1920, height: 1080, camera: 'Aura Studio Mark I', iso: '100', exposure: '1/250s' },
    { name: 'Ink Dark', path: 'assets/Mono-chromium-dark.png', type: 'PNG Image', size: '1.47 MB', width: 2560, height: 1440, camera: 'Hasselblad X2D', iso: '64', exposure: '1/60s' },
    { name: 'Default Slate', path: 'assets/wallpaper.png', type: 'PNG Image', size: '433 KB', width: 1920, height: 1080, camera: 'Leica Q3', iso: '200', exposure: '1/125s' }
];

export function initPhotosApp() {
    console.log('[photos-app] Initializing Aura Photos...');

    const windowEl = document.getElementById('photos-window');
    if (!windowEl) return;

    const displayImg = document.getElementById('photos-display-img');
    const emptyState = document.getElementById('photos-empty-state');
    const imgContainer = document.getElementById('photos-image-container');
    const filmstrip = document.getElementById('photos-filmstrip');
    const openBtn = document.getElementById('photos-open-btn');
    const fileInput = document.getElementById('photos-file-input');
    
    // Nav
    const prevBtn = document.getElementById('photos-prev-btn');
    const nextBtn = document.getElementById('photos-next-btn');
    const indexIndicator = document.getElementById('photos-index-indicator');

    // Zoom
    const zoomInBtn = document.getElementById('photos-zoom-in');
    const zoomOutBtn = document.getElementById('photos-zoom-out');
    const zoomSlider = document.getElementById('photos-zoom-slider');
    const zoomVal = document.getElementById('photos-zoom-val');
    const zoomResetBtn = document.getElementById('photos-zoom-reset');

    // Transforms
    const rotateBtn = document.getElementById('photos-rotate-btn');
    const flipHBtn = document.getElementById('photos-flip-h-btn');
    const slideshowBtn = document.getElementById('photos-slideshow-btn');
    const slideshowIcon = document.getElementById('photos-slideshow-icon');
    const wallpaperBtn = document.getElementById('photos-wallpaper-btn');

    // Metadata
    const metaName = document.getElementById('meta-name');
    const metaSize = document.getElementById('meta-size');
    const metaBytes = document.getElementById('meta-bytes');
    const metaType = document.getElementById('meta-type');
    const metaIso = document.getElementById('meta-iso');
    const metaExposure = document.getElementById('meta-exposure');

    // Adjustments
    const adjSliders = {
        brightness: document.getElementById('adj-brightness'),
        contrast: document.getElementById('adj-contrast'),
        saturation: document.getElementById('adj-saturation'),
        sepia: document.getElementById('adj-sepia'),
        grayscale: document.getElementById('adj-grayscale'),
        blur: document.getElementById('adj-blur')
    };

    const adjVals = {
        brightness: document.getElementById('val-brightness'),
        contrast: document.getElementById('val-contrast'),
        saturation: document.getElementById('val-saturation'),
        sepia: document.getElementById('val-sepia'),
        grayscale: document.getElementById('val-grayscale'),
        blur: document.getElementById('val-blur')
    };

    const resetAdjBtn = document.getElementById('photos-reset-adj');

    // State
    let currentPhotoIndex = 0;
    let photosList = [...PRESET_PHOTOS];
    let currentZoom = 100;
    let rotation = 0;
    let isFlipped = false;
    let isPanning = false;
    let startX = 0, startY = 0;
    let translateX = 0, translateY = 0;
    let slideshowInterval = null;

    // Create Set Wallpaper popup menu dynamically
    let wallpaperMenu = document.createElement('div');
    wallpaperMenu.id = 'photos-wallpaper-menu';
    wallpaperMenu.style.cssText = `
        display: none;
        position: absolute;
        right: 16px;
        top: 52px;
        background: var(--surface-secondary);
        border: 1px solid var(--border-strong);
        border-radius: 6px;
        z-index: 100;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.35);
        padding: 4px 0;
        min-width: 150px;
        backdrop-filter: blur(10px);
    `;
    wallpaperMenu.innerHTML = `
        <button class="photos-menu-item" data-target="home" style="display: block; width: 100%; text-align: left; background: none; border: none; padding: 8px 16px; color: var(--text-normal); font-size: 12px; cursor: pointer; font-family: inherit; transition: background 0.15s;">Home Screen Only</button>
        <button class="photos-menu-item" data-target="lock" style="display: block; width: 100%; text-align: left; background: none; border: none; padding: 8px 16px; color: var(--text-normal); font-size: 12px; cursor: pointer; font-family: inherit; transition: background 0.15s;">Lock Screen Only</button>
        <button class="photos-menu-item" data-target="both" style="display: block; width: 100%; text-align: left; background: none; border: none; padding: 8px 16px; color: var(--text-normal); font-size: 12px; cursor: pointer; font-family: inherit; transition: background 0.15s; border-top: 1px solid var(--border-subtle);">Both Screens</button>
    `;
    windowEl.querySelector('.photos-app-content').appendChild(wallpaperMenu);

    // Style menu buttons hover
    wallpaperMenu.querySelectorAll('.photos-menu-item').forEach(btn => {
        btn.addEventListener('mouseenter', () => btn.style.background = 'var(--surface-hover)');
        btn.addEventListener('mouseleave', () => btn.style.background = 'none');
    });

    // ── FILMSTRIP CAROUSEL RENDER ──
    function renderFilmstrip() {
        if (!filmstrip) return;
        filmstrip.innerHTML = '';
        photosList.forEach((photo, idx) => {
            const thumb = document.createElement('img');
            thumb.className = `filmstrip-thumb ${idx === currentPhotoIndex ? 'active' : ''}`;
            thumb.src = photo.path;
            thumb.alt = photo.name;
            thumb.title = photo.name;
            thumb.addEventListener('click', () => {
                loadPhoto(idx);
            });
            filmstrip.appendChild(thumb);
        });
    }

    // ── LOAD PHOTO ──
    function loadPhoto(index) {
        if (photosList.length === 0) {
            emptyState.style.display = 'flex';
            displayImg.style.display = 'none';
            indexIndicator.textContent = '0 / 0';
            updateMetadata(null);
            return;
        }

        currentPhotoIndex = index;
        const photo = photosList[currentPhotoIndex];

        emptyState.style.display = 'none';
        displayImg.src = photo.path;
        displayImg.style.display = 'block';

        indexIndicator.textContent = `${currentPhotoIndex + 1} / ${photosList.length}`;

        // Reset transforms
        currentZoom = 100;
        rotation = 0;
        isFlipped = false;
        translateX = 0;
        translateY = 0;
        
        updateTransform();
        resetAdjustments();
        updateMetadata(photo);

        // Active thumb
        const thumbs = filmstrip.querySelectorAll('.filmstrip-thumb');
        thumbs.forEach((thumb, idx) => {
            if (idx === currentPhotoIndex) {
                thumb.classList.add('active');
                thumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            } else {
                thumb.classList.remove('active');
            }
        });
    }

    // ── METADATA RENDER ──
    function updateMetadata(photo) {
        if (!photo) {
            metaName.textContent = '-';
            metaName.title = '-';
            metaSize.textContent = '-';
            metaBytes.textContent = '-';
            metaType.textContent = '-';
            metaIso.textContent = '-';
            metaExposure.textContent = '-';
            return;
        }

        metaName.textContent = photo.name;
        metaName.title = photo.name;
        metaSize.textContent = `${photo.width} × ${photo.height}`;
        metaBytes.textContent = photo.size;
        metaType.textContent = photo.type;
        metaIso.textContent = photo.iso || '100';
        metaExposure.textContent = photo.exposure || '1/125s';
    }

    // ── TRANSFORMS ──
    function updateTransform() {
        if (!displayImg) return;
        displayImg.style.transform = `
            translate(${translateX}px, ${translateY}px)
            scale(${currentZoom / 100})
            rotate(${rotation}deg)
            scaleX(${isFlipped ? -1 : 1})
        `;
        
        // Update Zoom UI elements
        if (zoomSlider) zoomSlider.value = currentZoom;
        if (zoomVal) zoomVal.textContent = `${currentZoom}%`;
    }

    // ── ADJUSTMENTS ──
    function resetAdjustments() {
        Object.keys(adjSliders).forEach(key => {
            const slider = adjSliders[key];
            if (!slider) return;
            if (key === 'brightness' || key === 'contrast' || key === 'saturation') {
                slider.value = 100;
                adjVals[key].textContent = '100%';
            } else if (key === 'blur') {
                slider.value = 0;
                adjVals[key].textContent = '0px';
            } else {
                slider.value = 0;
                adjVals[key].textContent = '0%';
            }
        });
        applyAdjustments();
    }

    function applyAdjustments() {
        if (!displayImg) return;
        const b = adjSliders.brightness ? adjSliders.brightness.value : 100;
        const c = adjSliders.contrast ? adjSliders.contrast.value : 100;
        const s = adjSliders.saturation ? adjSliders.saturation.value : 100;
        const sep = adjSliders.sepia ? adjSliders.sepia.value : 0;
        const g = adjSliders.grayscale ? adjSliders.grayscale.value : 0;
        const bl = adjSliders.blur ? adjSliders.blur.value : 0;

        displayImg.style.filter = `
            brightness(${b}%)
            contrast(${c}%)
            saturate(${s}%)
            sepia(${sep}%)
            grayscale(${g}%)
            blur(${bl}px)
        `;
    }

    // Bind slider events
    Object.keys(adjSliders).forEach(key => {
        const slider = adjSliders[key];
        if (!slider) return;
        slider.addEventListener('input', (e) => {
            const val = e.target.value;
            if (key === 'blur') {
                adjVals[key].textContent = `${val}px`;
            } else {
                adjVals[key].textContent = `${val}%`;
            }
            applyAdjustments();
        });
    });

    if (resetAdjBtn) {
        resetAdjBtn.addEventListener('click', resetAdjustments);
    }

    // ── NAVIGATION BINDINGS ──
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (photosList.length === 0) return;
            let idx = currentPhotoIndex - 1;
            if (idx < 0) idx = photosList.length - 1;
            loadPhoto(idx);
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            if (photosList.length === 0) return;
            let idx = (currentPhotoIndex + 1) % photosList.length;
            loadPhoto(idx);
        });
    }

    // ── ZOOM BINDINGS ──
    if (zoomInBtn) {
        zoomInBtn.addEventListener('click', () => {
            currentZoom = Math.min(400, currentZoom + 25);
            updateTransform();
        });
    }

    if (zoomOutBtn) {
        zoomOutBtn.addEventListener('click', () => {
            currentZoom = Math.max(10, currentZoom - 25);
            updateTransform();
        });
    }

    if (zoomSlider) {
        zoomSlider.addEventListener('input', (e) => {
            currentZoom = parseInt(e.target.value);
            updateTransform();
        });
    }

    if (zoomResetBtn) {
        zoomResetBtn.addEventListener('click', () => {
            currentZoom = 100;
            translateX = 0;
            translateY = 0;
            updateTransform();
        });
    }

    // Mouse wheel zoom
    imgContainer.addEventListener('wheel', (e) => {
        if (photosList.length === 0) return;
        e.preventDefault();
        const delta = e.deltaY > 0 ? -15 : 15;
        currentZoom = Math.max(10, Math.min(400, currentZoom + delta));
        updateTransform();
    }, { passive: false });

    // ── PANNING BINDINGS ──
    imgContainer.addEventListener('mousedown', (e) => {
        if (photosList.length === 0) return;
        isPanning = true;
        imgContainer.classList.add('dragging');
        startX = e.clientX - translateX;
        startY = e.clientY - translateY;
    });

    window.addEventListener('mousemove', (e) => {
        if (!isPanning) return;
        translateX = e.clientX - startX;
        translateY = e.clientY - startY;
        updateTransform();
    });

    window.addEventListener('mouseup', () => {
        if (isPanning) {
            isPanning = false;
            imgContainer.classList.remove('dragging');
        }
    });

    // ── ROTATE & FLIP BINDINGS ──
    if (rotateBtn) {
        rotateBtn.addEventListener('click', () => {
            rotation = (rotation + 90) % 360;
            updateTransform();
        });
    }

    if (flipHBtn) {
        flipHBtn.addEventListener('click', () => {
            isFlipped = !isFlipped;
            updateTransform();
        });
    }

    // ── SLIDESHOW BINDINGS ──
    function stopSlideshow() {
        if (slideshowInterval) {
            clearInterval(slideshowInterval);
            slideshowInterval = null;
        }
        if (slideshowBtn) {
            slideshowBtn.classList.remove('btn-primary');
            slideshowBtn.classList.add('btn-secondary');
            slideshowBtn.querySelector('span').textContent = 'Slideshow';
        }
        if (slideshowIcon) {
            slideshowIcon.className = 'hgi-stroke hgi-play-list';
        }
    }

    function startSlideshow() {
        if (photosList.length === 0) return;
        slideshowInterval = setInterval(() => {
            let idx = (currentPhotoIndex + 1) % photosList.length;
            loadPhoto(idx);
        }, 3000);

        if (slideshowBtn) {
            slideshowBtn.classList.remove('btn-secondary');
            slideshowBtn.classList.add('btn-primary');
            slideshowBtn.querySelector('span').textContent = 'Stop';
        }
        if (slideshowIcon) {
            slideshowIcon.className = 'hgi-stroke hgi-pause';
        }
    }

    if (slideshowBtn) {
        slideshowBtn.addEventListener('click', () => {
            if (slideshowInterval) {
                stopSlideshow();
            } else {
                startSlideshow();
            }
        });
    }

    // ── FILE UPLOAD BINDINGS ──
    if (openBtn && fileInput) {
        openBtn.addEventListener('click', () => {
            fileInput.click();
        });
    }

    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            const files = e.target.files;
            if (files.length === 0) return;

            Array.from(files).forEach(file => {
                const reader = new FileReader();
                reader.onload = function(event) {
                    const img = new Image();
                    img.onload = function() {
                        // Create user upload metadata record
                        const name = file.name;
                        const sizeKB = (file.size / 1024).toFixed(0);
                        const sizeStr = sizeKB > 1024 ? `${(sizeKB / 1024).toFixed(1)} MB` : `${sizeKB} KB`;
                        
                        const formatMap = {
                            'image/png': 'PNG Image',
                            'image/jpeg': 'JPEG Image',
                            'image/webp': 'WebP Image',
                            'image/gif': 'GIF Image'
                        };
                        const typeStr = formatMap[file.type] || 'Image';

                        // Mock ISO/shutter speeds for realistic EXIF details
                        const isoPresets = ['64', '100', '200', '400', '800'];
                        const expPresets = ['1/60s', '1/125s', '1/250s', '1/500s', '1/1000s'];
                        const cameraPresets = ['Fujifilm X-T5', 'Sony Alpha 7 IV', 'Canon EOS R6', 'Nikon Z6 II'];

                        const mockIso = isoPresets[Math.floor(Math.random() * isoPresets.length)];
                        const mockExp = expPresets[Math.floor(Math.random() * expPresets.length)];
                        const mockCam = cameraPresets[Math.floor(Math.random() * cameraPresets.length)];

                        const record = {
                            name,
                            path: event.target.result,
                            type: typeStr,
                            size: sizeStr,
                            width: img.width,
                            height: img.height,
                            camera: mockCam,
                            iso: mockIso,
                            exposure: mockExp
                        };

                        photosList.push(record);
                        renderFilmstrip();
                        loadPhoto(photosList.length - 1);
                    };
                    img.src = event.target.result;
                };
                reader.readAsDataURL(file);
            });
        });
    }

    // ── DRAG & DROP BINDINGS ──
    imgContainer.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        imgContainer.style.background = 'rgba(255, 255, 255, 0.05)';
    });

    imgContainer.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        imgContainer.style.background = '';
    });

    imgContainer.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        imgContainer.style.background = '';

        const files = e.dataTransfer.files;
        if (files.length === 0) return;

        Array.from(files).forEach(file => {
            if (!file.type.startsWith('image/')) return;
            const reader = new FileReader();
            reader.onload = function(event) {
                const img = new Image();
                img.onload = function() {
                    const name = file.name;
                    const sizeKB = (file.size / 1024).toFixed(0);
                    const sizeStr = sizeKB > 1024 ? `${(sizeKB / 1024).toFixed(1)} MB` : `${sizeKB} KB`;
                    
                    const formatMap = {
                        'image/png': 'PNG Image',
                        'image/jpeg': 'JPEG Image',
                        'image/webp': 'WebP Image',
                        'image/gif': 'GIF Image'
                    };
                    const typeStr = formatMap[file.type] || 'Image';

                    const record = {
                        name,
                        path: event.target.result,
                        type: typeStr,
                        size: sizeStr,
                        width: img.width,
                        height: img.height,
                        camera: 'Sony Alpha 7 IV',
                        iso: '100',
                        exposure: '1/250s'
                    };

                    photosList.push(record);
                    renderFilmstrip();
                    loadPhoto(photosList.length - 1);
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        });
    });

    // ── SET AS WALLPAPER INTEGRATION ──
    if (wallpaperBtn) {
        wallpaperBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const rect = wallpaperBtn.getBoundingClientRect();
            const winRect = windowEl.getBoundingClientRect();
            
            // Toggle dropdown positioning relative to the window
            wallpaperMenu.style.top = `${rect.bottom - winRect.top + 8}px`;
            wallpaperMenu.style.left = `${rect.left - winRect.left - 40}px`;
            
            wallpaperMenu.style.display = wallpaperMenu.style.display === 'none' ? 'block' : 'none';
        });
    }

    // Close menu when clicking outside
    document.addEventListener('click', () => {
        if (wallpaperMenu) wallpaperMenu.style.display = 'none';
    });

    wallpaperMenu.querySelectorAll('.photos-menu-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            wallpaperMenu.style.display = 'none';
            
            if (photosList.length === 0) return;
            const target = item.getAttribute('data-target');
            const activePhoto = photosList[currentPhotoIndex];
            
            // Set wallpaper using the photo path (base64 or preset asset path)
            const styleValue = `url("${activePhoto.path}")`;
            
            if (window.showDialog && window.showDialog.alert) {
                // Resize image to ensure it fits in localStorage if it is a large base64
                if (activePhoto.path.startsWith('data:')) {
                    const img = new Image();
                    img.onload = function() {
                        const maxW = 1920;
                        const maxH = 1080;
                        let width = img.width;
                        let height = img.height;
                        
                        if (width > maxW || height > maxH) {
                            if (width / height > maxW / maxH) {
                                height = Math.round(height * (maxW / width));
                                width = maxW;
                            } else {
                                width = Math.round(width * (maxH / height));
                                height = maxH;
                            }
                        }
                        
                        const canvas = document.createElement('canvas');
                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, width, height);
                        
                        const compressedData = canvas.toDataURL('image/jpeg', 0.8);
                        const finalBg = `url("${compressedData}")`;
                        
                        applyWallpaperAndNotify(finalBg, activePhoto.name, target);
                    };
                    img.src = activePhoto.path;
                } else {
                    applyWallpaperAndNotify(styleValue, activePhoto.name, target);
                }
            } else {
                applyWallpaperAndNotify(styleValue, activePhoto.name, target);
            }
        });
    });

    function applyWallpaperAndNotify(bgStyle, name, target) {
        // Apply
        if (target === 'both' || target === 'home') {
            localStorage.setItem('auraos-wallpaper-home', bgStyle);
            localStorage.setItem('auraos-wallpaper-home-name', name);
            if (window.setWallpaper) {
                window.setWallpaper(bgStyle, 'home');
            }
            const activeHomeName = document.getElementById('active-wallpaper-home-name');
            if (activeHomeName) activeHomeName.textContent = name;
        }
        if (target === 'both' || target === 'lock') {
            localStorage.setItem('auraos-wallpaper-lock', bgStyle);
            localStorage.setItem('auraos-wallpaper-lock-name', name);
            if (window.setWallpaper) {
                window.setWallpaper(bgStyle, 'lock');
            }
            const activeLockName = document.getElementById('active-wallpaper-lock-name');
            if (activeLockName) activeLockName.textContent = name;
        }

        // Show toast notification
        if (window.showNotification) {
            let targetLabel = 'Both Screens';
            if (target === 'home') targetLabel = 'Home Screen';
            if (target === 'lock') targetLabel = 'Lock Screen';
            window.showNotification('Wallpaper Updated', `Successfully set "${name}" as wallpaper for ${targetLabel}.`, 'hgi-image-01');
        }
    }

    // Reset slideshow on window close/hidden
    const observer = new MutationObserver(() => {
        if (windowEl.style.display === 'none') {
            stopSlideshow();
        }
    });
    observer.observe(windowEl, { attributes: true, attributeFilter: ['style'] });

    // Initial render
    renderFilmstrip();
    loadPhoto(0);
}
