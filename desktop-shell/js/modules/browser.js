/* FELBIC OS — Web Browser Module */

export function initBrowser() {
    console.log('[felbicos] Initializing Web Browser Module...');

    const backBtn = document.getElementById('browser-back');
    const forwardBtn = document.getElementById('browser-forward');
    const reloadBtn = document.getElementById('browser-reload');
    const urlInput = document.getElementById('browser-url');
    const viewport = document.getElementById('browser-page-content');

    let history = ['https://felbic.aios.org'];
    let historyIndex = 0;

    const websites = {
        'https://felbic.aios.org': `
            <div style="text-align: center; margin-bottom: 24px;">
                <h1 style="font-size: 24px; font-weight: 700; color: var(--color-accent); margin-bottom: 8px;">FELBIC OS</h1>
                <p style="color: var(--color-topbar-text-muted); font-size: 14px;">The AI-Native Operating System Shell</p>
            </div>
            
            <div class="browser-mock-card">
                <h3 style="margin-bottom: 8px; font-size: 14px; font-weight: 600;">Welcome to your Web Shell Dashboard</h3>
                <p style="font-size: 12px; color: var(--color-topbar-text-muted); line-height: 1.6;">
                    FELBIC OS runs a customized Sway window manager that boots directly into this web-based environment. 
                    You can configure hardware switches, explore files, edit code, and compile software packages seamlessly.
                </p>
            </div>

            <div class="browser-mock-card" style="margin-top: 16px;">
                <h3 style="margin-bottom: 8px; font-size: 14px; font-weight: 600;">Local IPC Bridge Status</h3>
                <p style="font-size: 12px; color: var(--color-topbar-text-muted); line-height: 1.6;">
                    The system communicates with the host daemon using a local WebSocket server on <span style="font-family: monospace;">port 8080</span>. 
                    Hardware controls (brightness, volume) and folder explorers send messages to execute native Linux commands on the host.
                </p>
            </div>
        `,
        'google.com': `
            <div style="text-align: center; margin: 40px 0 20px 0;">
                <h1 style="font-size: 32px; font-weight: 800; letter-spacing: -1px; background: linear-gradient(135deg, #3b82f6, #ef4444, #f59e0b, #10b981); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Search Engine</h1>
            </div>
            <div style="display:flex; justify-content:center; margin-bottom: 30px;">
                <input type="text" placeholder="Search the World Wide Web" style="width: 80%; height: 32px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1); background-color: rgba(255,255,255,0.05); padding: 0 16px; color: white; outline: none;">
            </div>
            <div class="browser-mock-card">
                <h4 style="font-size:12px; font-weight:600; margin-bottom:4px;">Trending Searches</h4>
                <ul style="font-size:11px; color:var(--color-topbar-text-muted); line-height:1.8; padding-left:14px;">
                    <li>How to install Arch Linux on VirtualBox</li>
                    <li>Sway window manager layout configuration cheatsheet</li>
                    <li>Compiling Rust binaries on base-devel</li>
                </ul>
            </div>
        `,
        'help.felbic.org': `
            <h2 style="font-size: 18px; font-weight: 700; margin-bottom: 12px;">Help Center & Keyboard Shortcuts</h2>
            
            <div class="browser-mock-card">
                <table style="width:100%; font-size:12px; line-height:2.0; border-collapse:collapse;">
                    <thead>
                        <tr style="border-bottom: 1px solid rgba(255,255,255,0.1); text-align:left; color: var(--color-topbar-text-muted);">
                            <th>Action</th>
                            <th>Shortcut Key</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Open Quick Search (Spotlight)</td>
                            <td><kbd style="background:rgba(255,255,255,0.1); padding:2px 6px; border-radius:4px;">Alt + D</kbd></td>
                        </tr>
                        <tr>
                            <td>Launch terminal console</td>
                            <td><kbd style="background:rgba(255,255,255,0.1); padding:2px 6px; border-radius:4px;">Super + Enter</kbd></td>
                        </tr>
                        <tr>
                            <td>Close focused window</td>
                            <td><kbd style="background:rgba(255,255,255,0.1); padding:2px 6px; border-radius:4px;">Super + Shift + Q</kbd></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `
    };

    function loadURL(url, isBackForward = false) {
        // Clean URL scheme
        let cleanUrl = url.toLowerCase().trim();
        cleanUrl = cleanUrl.replace('https://', '').replace('http://', '').replace('www.', '');
        if (cleanUrl.endsWith('/')) cleanUrl = cleanUrl.slice(0, -1);

        let finalURL = `https://${cleanUrl}`;
        let content = websites[cleanUrl] || websites[`https://${cleanUrl}`];

        if (!content) {
            content = `
                <div style="text-align: center; padding: 40px 20px;">
                    <div style="font-size: 40px; margin-bottom: 16px;">⚠️</div>
                    <h2 style="font-size: 18px; font-weight: 700; margin-bottom: 8px;">Network Connection Blocked</h2>
                    <p style="color: var(--color-topbar-text-muted); font-size: 12px; line-height: 1.6;">
                        Site <span style="font-family: monospace; color:#f87171;">${finalURL}</span> could not be reached. 
                        Live external network calls are restricted in the current development sandbox. Try searching "google.com" or "help.felbic.org".
                    </p>
                </div>
            `;
        }

        viewport.innerHTML = content;
        urlInput.value = finalURL;

        if (!isBackForward) {
            // Trim history ahead of current index if we navigated manually
            history = history.slice(0, historyIndex + 1);
            history.push(finalURL);
            historyIndex = history.length - 1;
        }

        backBtn.disabled = historyIndex === 0;
        forwardBtn.disabled = historyIndex === history.length - 1;
    }

    if (urlInput) {
        urlInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                loadURL(urlInput.value);
            }
        });
    }

    if (backBtn) {
        backBtn.addEventListener('click', () => {
            if (historyIndex > 0) {
                historyIndex--;
                loadURL(history[historyIndex], true);
            }
        });
    }

    if (forwardBtn) {
        forwardBtn.addEventListener('click', () => {
            if (historyIndex < history.length - 1) {
                historyIndex++;
                loadURL(history[historyIndex], true);
            }
        });
    }

    if (reloadBtn) {
        reloadBtn.addEventListener('click', () => {
            loadURL(history[historyIndex], true);
        });
    }

    // Load home page initially
    loadURL('https://felbic.aios.org');
}
