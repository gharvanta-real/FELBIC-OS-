/* FELBIC OS — Web Browser Module */

export function initBrowser() {
    console.log('[felbicos] Initializing Web Browser Module...');

    const backBtn = document.getElementById('browser-back');
    const forwardBtn = document.getElementById('browser-forward');
    const reloadBtn = document.getElementById('browser-reload');
    const homeBtn = document.getElementById('browser-home');
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
            
            <div class="browser-mock-card" style="background: var(--bg-tertiary); border: 1px solid var(--border-default); border-radius: var(--radius-sm); padding: 12px; margin-bottom: 12px;">
                <h3 style="margin-bottom: 8px; font-size: 14px; font-weight: 600;">Welcome to your Web Shell Dashboard</h3>
                <p style="font-size: 12px; color: var(--color-topbar-text-muted); line-height: 1.6;">
                    FELBIC OS runs a customized Sway window manager that boots directly into this web-based environment. 
                    You can configure hardware switches, explore files, edit code, and compile software packages seamlessly.
                </p>
            </div>

            <div class="browser-mock-card" style="background: var(--bg-tertiary); border: 1px solid var(--border-default); border-radius: var(--radius-sm); padding: 12px; margin-top: 16px;">
                <h3 style="margin-bottom: 8px; font-size: 14px; font-weight: 600;">Local IPC Bridge Status</h3>
                <p style="font-size: 12px; color: var(--color-topbar-text-muted); line-height: 1.6;">
                    The system communicates with the host daemon using a local WebSocket server on <span style="font-family: monospace;">port 8080</span>. 
                    Hardware controls (brightness, volume) and folder explorers send messages to execute native Linux commands on the host.
                </p>
            </div>
        `,
        'google.com': `
            <div style="text-align: center; margin: 40px 0 20px 0;">
                <h1 style="font-size: 32px; font-weight: 800; letter-spacing: -1px; background: var(--gradient-accent); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Search Engine</h1>
            </div>
            <div style="display:flex; justify-content:center; margin-bottom: 30px;">
                <input type="text" placeholder="Search the World Wide Web" style="width: 80%; height: 32px; border-radius: 16px; border: 1px solid var(--border-default); background-color: var(--surface-3); padding: 0 16px; color: var(--text-primary); outline: none;">
            </div>
            <div class="browser-mock-card" style="background: var(--bg-tertiary); border: 1px solid var(--border-default); border-radius: var(--radius-sm); padding: 12px;">
                <h4 style="font-size:12px; font-weight:600; margin-bottom:4px; color: var(--text-primary);">Trending Searches</h4>
                <ul style="font-size:11px; color:var(--color-topbar-text-muted); line-height:1.8; padding-left:14px;">
                    <li>How to install Arch Linux on VirtualBox</li>
                    <li>Sway window manager layout configuration cheatsheet</li>
                    <li>Compiling Rust binaries on base-devel</li>
                </ul>
            </div>
        `,
        'help.felbic.org': `
            <h2 style="font-size: 18px; font-weight: 700; margin-bottom: 12px; color: var(--text-primary);">Help Center & Keyboard Shortcuts</h2>
            
            <div class="browser-mock-card" style="background: var(--bg-tertiary); border: 1px solid var(--border-default); border-radius: var(--radius-sm); padding: 12px;">
                <table style="width:100%; font-size:12px; line-height:2.0; border-collapse:collapse; color: var(--text-primary);">
                    <thead>
                        <tr style="border-bottom: 1px solid var(--border-default); text-align:left; color: var(--color-topbar-text-muted);">
                            <th>Action</th>
                            <th>Shortcut Key</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Open Quick Search (Spotlight)</td>
                            <td><kbd style="background: var(--surface-3); padding:2px 6px; border-radius:4px; color: var(--text-primary);">Alt + D</kbd></td>
                        </tr>
                        <tr>
                            <td>Launch terminal console</td>
                            <td><kbd style="background: var(--surface-3); padding:2px 6px; border-radius:4px; color: var(--text-primary);">Super + Enter</kbd></td>
                        </tr>
                        <tr>
                            <td>Close focused window</td>
                            <td><kbd style="background: var(--surface-3); padding:2px 6px; border-radius:4px; color: var(--text-primary);">Super + Shift + Q</kbd></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `,
        'docs.felbic.org': `
            <div style="padding: 16px; font-family: var(--font-sans); color: var(--text-primary);">
                <h2 style="font-size: var(--font-size-lg); font-weight: var(--font-weight-bold); color: var(--color-accent); margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                    <i class="hgi-stroke hgi-book-open-01" style="font-size: var(--icon-md);"></i> Developer Documentation
                </h2>
                <p style="font-size: var(--font-size-sm); color: var(--text-secondary); line-height: 1.6; margin-bottom: 16px;">
                    Welcome to the FELBIC OS API and Integration guide. Use the following references to develop applications for our AI-Native environment.
                </p>
                <div class="browser-mock-card" style="background: var(--bg-tertiary); border: 1px solid var(--border-default); border-radius: var(--radius-sm); padding: 12px; margin-bottom: 12px;">
                    <h4 style="font-size: var(--font-size-sm); font-weight: var(--font-weight-semibold); color: var(--text-primary); margin-bottom: 6px;">VFS API (Virtual File System)</h4>
                    <p style="font-size: var(--font-size-xs); color: var(--text-muted); line-height: 1.5; margin-bottom: 8px;">
                        FELBIC OS provides a persistent, hierarchical virtual file system under <code style="font-family: var(--font-mono); background: var(--surface-hover); padding: 2px 4px; border-radius: var(--radius-2xs);">window.VFS</code>.
                    </p>
                    <ul style="font-size: var(--font-size-xs); color: var(--text-secondary); padding-left: 16px; line-height: 1.6;">
                        <li><code style="font-family: var(--font-mono);">listDirectory(path)</code>: Lists contents of a directory.</li>
                        <li><code style="font-family: var(--font-mono);">readFile(path)</code>: Returns string contents of a file.</li>
                        <li><code style="font-family: var(--font-mono);">writeFile(path, content)</code>: Writes string data to path.</li>
                        <li><code style="font-family: var(--font-mono);">createFile(parent, name, content)</code>: Instantiates a file node.</li>
                    </ul>
                </div>
                <div class="browser-mock-card" style="background: var(--bg-tertiary); border: 1px solid var(--border-default); border-radius: var(--radius-sm); padding: 12px;">
                    <h4 style="font-size: var(--font-size-sm); font-weight: var(--font-weight-semibold); color: var(--text-primary); margin-bottom: 6px;">Global Event Bus</h4>
                    <p style="font-size: var(--font-size-xs); color: var(--text-muted); line-height: 1.5; margin-bottom: 8px;">
                        Interact with core modules by dispatching or listening to custom events on the global document object.
                    </p>
                    <ul style="font-size: var(--font-size-xs); color: var(--text-secondary); padding-left: 16px; line-height: 1.6;">
                        <li><code style="font-family: var(--font-mono);">vfs-updated</code>: Dispatched when directory structure changes.</li>
                        <li><code style="font-family: var(--font-mono);">file-saved</code>: Fired by editor to propagate file saves.</li>
                        <li><code style="font-family: var(--font-mono);">focus-window</code>: Brings specific window ID to focus.</li>
                    </ul>
                </div>
            </div>
        `,
        'dev.felbic.org': `
            <div style="padding: 16px; font-family: var(--font-sans); color: var(--text-primary);">
                <h2 style="font-size: var(--font-size-lg); font-weight: var(--font-weight-bold); color: var(--color-success); margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                    <i class="hgi-stroke hgi-settings-02" style="font-size: var(--icon-md);"></i> Developer Sandbox Guide
                </h2>
                <p style="font-size: var(--font-size-sm); color: var(--text-secondary); line-height: 1.6; margin-bottom: 16px;">
                    Learn how to run custom scripts, write code files, and build native shell components.
                </p>
                <div class="browser-mock-card" style="background: var(--bg-tertiary); border: 1px solid var(--border-default); border-radius: var(--radius-sm); padding: 12px; margin-bottom: 12px;">
                    <h4 style="font-size: var(--font-size-sm); font-weight: var(--font-weight-semibold); color: var(--text-primary); margin-bottom: 6px;">How to edit & build code</h4>
                    <ol style="font-size: var(--font-size-xs); color: var(--text-secondary); padding-left: 16px; line-height: 1.6;">
                        <li>Double-click any source file (e.g. <code style="font-family: var(--font-mono);">app.js</code>) in Files Explorer.</li>
                        <li>The Text Editor will automatically focus, load the file, and highlight its syntax.</li>
                        <li>Make modifications and click <b>Save Changes</b> (or run terminal write).</li>
                        <li>Open the Terminal window and type <code style="font-family: var(--font-mono);">cat</code> to verify VFS updates.</li>
                    </ol>
                </div>
            </div>
        `
    };

    function loadURL(url, isBackForward = false) {
        let cleanUrl = url.toLowerCase().trim();
        
        // Check if scheme is present, if not guess/default
        let hasScheme = cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://');
        if (!hasScheme) {
            const baseDomain = cleanUrl.replace('www.', '');
            if (websites[baseDomain]) {
                cleanUrl = 'https://' + cleanUrl;
            } else if (cleanUrl.includes('.')) {
                cleanUrl = 'https://' + cleanUrl;
            } else {
                cleanUrl = 'https://google.com';
            }
        }

        let finalURL = cleanUrl;
        let key = finalURL.replace('https://', '').replace('http://', '').replace('www.', '');
        if (key.endsWith('/')) key = key.slice(0, -1);

        let content = websites[key] || websites[`https://${key}`];

        if (content) {
            viewport.innerHTML = content;
            urlInput.value = finalURL;
        } else {
            // Load in iframe for actual external sites or non-mock URLs
            viewport.innerHTML = `
                <iframe src="${finalURL}" style="width: 100%; height: 100%; border: none; background: var(--bg-tertiary);" sandbox="allow-scripts allow-same-origin allow-forms"></iframe>
            `;
            urlInput.value = finalURL;
        }

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

    if (homeBtn) {
        homeBtn.addEventListener('click', () => {
            loadURL('https://felbic.aios.org');
        });
    }

    // Load home page initially
    loadURL('https://felbic.aios.org');
}
