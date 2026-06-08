/* FELBIC OS — Paint Application Module */

export function initPaintApp() {
    console.log('[paint-app] Initializing Paint App...');
    const canvas = document.getElementById('paint-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const colorInput = document.getElementById('paint-color');
    const sizeInput = document.getElementById('paint-size');
    const sizeVal = document.getElementById('paint-size-val');
    const clearBtn = document.getElementById('paint-clear');
    const presetColors = document.querySelectorAll('.paint-preset-color');

    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;

    // Set canvas dimensions to parent element size
    function resizeCanvas() {
        const rect = canvas.parentElement.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;
        
        // Save state
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(canvas, 0, 0);

        canvas.width = rect.width;
        canvas.height = rect.height;

        // Restore state
        ctx.drawImage(tempCanvas, 0, 0);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
    }

    // Initial resize
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    const windowEl = document.getElementById('paint-window');
    if (windowEl) {
        const observer = new ResizeObserver(() => {
            if (windowEl.style.display !== 'none') {
                resizeCanvas();
            }
        });
        observer.observe(windowEl);
    }

    // Drawing handlers
    function getMousePos(e) {
        const rect = canvas.getBoundingClientRect();
        // Account for any potential CSS workspace scaling
        const style = window.getComputedStyle(document.documentElement);
        const scale = parseFloat(style.getPropertyValue('--workspace-scale')) || 1.0;
        return {
            x: (e.clientX - rect.left) / scale,
            y: (e.clientY - rect.top) / scale
        };
    }

    function startDrawing(e) {
        isDrawing = true;
        const pos = getMousePos(e);
        lastX = pos.x;
        lastY = pos.y;
    }

    function draw(e) {
        if (!isDrawing) return;
        const pos = getMousePos(e);

        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(pos.x, pos.y);
        ctx.strokeStyle = colorInput.value;
        ctx.lineWidth = sizeInput.value;
        ctx.stroke();

        lastX = pos.x;
        lastY = pos.y;
    }

    function stopDrawing() {
        isDrawing = false;
    }

    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);

    // Brush size update
    sizeInput.addEventListener('input', () => {
        sizeVal.textContent = `${sizeInput.value}px`;
    });

    // Clear board
    clearBtn.addEventListener('click', () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    });

    // Preset colors selection
    presetColors.forEach(btn => {
        btn.addEventListener('click', () => {
            const color = btn.getAttribute('data-color');
            colorInput.value = color;
        });
    });
}
