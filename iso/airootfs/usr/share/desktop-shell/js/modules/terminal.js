/* FELBIC OS — Interactive Terminal Command Interpreter Module */
import { aisd } from './aisd-client.js';

export function initTerminal() {
    console.log('[felbicos] Initializing Interactive Terminal Module...');

    const win = document.getElementById('terminal-window');
    if (!win) return;

    const winContent = win.querySelector('.window-content');
    if (!winContent) return;

    let currentPath = '/workspace';

    // Refactor static content to interactive console
    winContent.innerHTML = `
        <div class="terminal-content-wrapper">
            <div class="terminal-history" id="terminal-history">
                <!-- Welcome prompt & initial output -->
                <div class="terminal-history-row">
                    <span class="terminal-prompt">felbicos-live:/workspace#</span> <span class="terminal-cmd">fastfetch</span>
                </div>
                <div class="terminal-output">
       .---.            <b>root@felbicos-live</b>
      /     \\           -------------------
      \\.---./           <b>OS</b>: FELBIC OS — AI-Native Operating System 0.1.0 x86_64
      /  o o  \\          <b>Host</b>: VMware Virtual Platform
      \\   -   /          <b>Kernel</b>: Linux 7.0.11-arch1-1
       '-----'           <b>Uptime</b>: 16 seconds
                         -------------------
                         <b>CPU</b>: 2 x 11th Gen Intel(R) Core(TM) i5-1135G7 (2) @ 2.42 GHz
                         <b>GPU</b>: VMware SVGA II Adapter
                         <b>Memory</b>: 509.38 MiB / 1.81 GiB (27%)
                         <b>Terminal</b>: foot 1.27.0
                         <b>Shell</b>: zsh 5.9.1</div>
            </div>
            <div class="terminal-input-line">
                <span class="terminal-prompt">felbicos-live:/workspace#</span>
                <input type="text" id="terminal-input" class="terminal-input" autocomplete="off" spellcheck="false">
            </div>
        </div>
    `;

    const historyContainer = document.getElementById('terminal-history');
    const terminalInput = document.getElementById('terminal-input');
    const wrapper = winContent.querySelector('.terminal-content-wrapper');

    // Command History tracking for arrow keys
    const cmdHistory = [];
    let historyIndex = -1;

    // Focus input on wrapper click
    if (wrapper && terminalInput) {
        wrapper.addEventListener('click', () => {
            terminalInput.focus();
        });
    }

    if (terminalInput) {
        terminalInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const commandText = terminalInput.value;
                terminalInput.value = '';
                if (commandText.trim()) {
                    cmdHistory.push(commandText);
                }
                historyIndex = cmdHistory.length;
                handleCommand(commandText);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (historyIndex > 0) {
                    historyIndex--;
                    terminalInput.value = cmdHistory[historyIndex];
                }
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (historyIndex < cmdHistory.length - 1) {
                    historyIndex++;
                    terminalInput.value = cmdHistory[historyIndex];
                } else {
                    historyIndex = cmdHistory.length;
                    terminalInput.value = '';
                }
            } else if (e.key === 'Tab') {
                e.preventDefault(); // Prevent default focus switching
                handleAutocomplete();
            }
        });
    }

    function appendHistoryRow(commandText) {
        const row = document.createElement('div');
        row.className = 'terminal-history-row';
        row.innerHTML = `<span class="terminal-prompt">felbicos-live:${currentPath}#</span> <span class="terminal-cmd"></span>`;
        row.querySelector('.terminal-cmd').textContent = commandText;
        historyContainer.appendChild(row);
    }

    function appendOutput(htmlContent, isText = false) {
        const div = document.createElement('div');
        div.className = 'terminal-output';
        if (isText) {
            div.textContent = htmlContent;
        } else {
            div.innerHTML = htmlContent;
        }
        historyContainer.appendChild(div);
        wrapper.scrollTop = wrapper.scrollHeight;
    }

    function handleCommand(commandLine) {
        const trimmed = commandLine.trim();
        appendHistoryRow(commandLine); // append exact text including trailing spaces as typed

        if (trimmed === '') {
            wrapper.scrollTop = wrapper.scrollHeight;
            return;
        }

        const parts = trimmed.split(/\s+/);
        const command = parts[0].toLowerCase();
        const args = parts.slice(1);

        switch (command) {
            case 'help':
                showHelp();
                break;
            case 'fastfetch':
            case 'neofetch':
                showFastfetch();
                break;
            case 'ls':
                handleLs(args);
                break;
            case 'cd':
                handleCd(args);
                break;
            case 'pwd':
                handlePwd();
                break;
            case 'mkdir':
                handleMkdir(args);
                break;
            case 'touch':
                handleTouch(args);
                break;
            case 'rm':
                handleRm(args);
                break;
            case 'cp':
                handleCp(args);
                break;
            case 'mv':
                handleMv(args);
                break;
            case 'cat':
                handleCat(args);
                break;
            case 'write':
                handleWrite(args);
                break;
            case 'theme':
                setTheme(args[0]);
                break;
            case 'pacman':
                handlePacman(args);
                break;
            case 'clear':
                historyContainer.innerHTML = '';
                break;
            case 'systemctl':
                handleSystemctl(args);
                break;
            case 'uname':
                handleUname(args);
                break;
            case 'aisd':
                handleAisd(args);
                break;
            default:
                appendOutput(`sh: command not found: ${command}. Type 'help' to see available commands.`);
        }

        wrapper.scrollTop = wrapper.scrollHeight;
    }

    function showHelp() {
        const helpText = `
<b>FELBIC OS Interactive Shell Terminal</b>
Available commands:
  <b>help</b>                         Show this help menu
  <b>fastfetch</b> / <b>neofetch</b>         Display system statistics and logo
  <b>ls [path]</b>                   List contents of directory
  <b>cd &lt;dir&gt;</b>                    Change current working directory
  <b>pwd</b>                          Print current working directory
  <b>mkdir &lt;name&gt;</b>                 Create directory in current VFS path
  <b>touch &lt;name&gt;</b>                 Create empty file in current VFS path
  <b>rm [-r] &lt;name&gt;</b>               Remove file or directory in current VFS path
  <b>cp &lt;src&gt; &lt;dest&gt;</b>              Copy file or folder
  <b>mv &lt;src&gt; &lt;dest&gt;</b>              Move/rename file or folder
  <b>cat &lt;name&gt;</b>                   Print file content
  <b>write &lt;file&gt; &lt;text&gt;</b>          Write content to file (creates or overwrites)
  <b>theme &lt;light|dark&gt;</b>           Toggle theme appearance dynamically
  <b>pacman -S &lt;package&gt;</b>          Simulates package installation & links with App drawer
  <b>clear</b>                        Clears terminal output screen
  <b>systemctl status aisd</b>        Check status of system core services
  <b>uname -a</b>                     Print kernel architecture and configuration info
  <b>aisd ask &lt;query&gt;</b>            Ask the AI assistant (uses live aisd daemon)
  <b>aisd status</b>                  Show aisd connection status
        `;
        appendOutput(helpText);
    }

    function handleAisd(args) {
        if (args.length === 0) {
            appendOutput('aisd: missing operand. Try "aisd status" or "aisd ask &lt;query&gt;"');
            return;
        }
        if (args[0] === 'status') {
            const status = aisd.connected ? 
                '<span style="color:var(--color-success)">● ONLINE</span> — connected to ws://127.0.0.1:8080' :
                '<span style="color:var(--color-danger)">● OFFLINE</span> — start with: systemctl start aisd';
            appendOutput(`aisd daemon: ${status}`);
        } else if (args[0] === 'ask') {
            const query = args.slice(1).join(' ');
            if (!query) {
                appendOutput('aisd ask: missing query. Usage: aisd ask &lt;natural language query&gt;');
                return;
            }
            if (!aisd.connected) {
                appendOutput('<span style="color:var(--color-danger)">aisd is offline.</span> Start it with: systemctl start aisd');
                return;
            }
            const loadingEl = document.createElement('div');
            loadingEl.className = 'terminal-output';
            loadingEl.innerHTML = '<span style="color:var(--color-accent)">⠋ Thinking…</span>';
            historyContainer.appendChild(loadingEl);
            wrapper.scrollTop = wrapper.scrollHeight;

            aisd.call('ai/chat', { prompt: query, session: 'terminal' })
                .then(result => {
                    loadingEl.remove();
                    const response = result?.response ?? '(no response)';
                    // Display with simple formatting
                    const div = document.createElement('div');
                    div.className = 'terminal-output';
                    div.innerHTML = response
                        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                        .replace(/`([^`]+)`/g, '<code style="background:rgba(255,255,255,0.1);padding:1px 4px;border-radius:3px;">$1</code>')
                        .replace(/\n/g, '<br>');
                    historyContainer.appendChild(div);
                    wrapper.scrollTop = wrapper.scrollHeight;
                })
                .catch(err => {
                    loadingEl.remove();
                    appendOutput(`<span style="color:var(--color-danger)">aisd error: ${err.message}</span>`);
                });
        } else {
            appendOutput(`aisd: unknown subcommand '${args[0]}'. Try: aisd ask, aisd status`);
        }
    }

    function showFastfetch() {
        const fastfetchText = `
       .---.            <b>root@felbicos-live</b>
      /     \\           -------------------
      \\.---./           <b>OS</b>: FELBIC OS — AI-Native Operating System 0.1.0 x86_64
      /  o o  \\          <b>Host</b>: VMware Virtual Platform
      \\   -   /          <b>Kernel</b>: Linux 7.0.11-arch1-1
       '-----'           <b>Uptime</b>: 16 seconds
                         -------------------
                         <b>CPU</b>: 2 x 11th Gen Intel(R) Core(TM) i5-1135G7 (2) @ 2.42 GHz
                         <b>GPU</b>: VMware SVGA II Adapter
                         <b>Memory</b>: 509.38 MiB / 1.81 GiB (27%)
                         <b>Terminal</b>: foot 1.27.0
                         <b>Shell</b>: zsh 5.9.1
        `;
        appendOutput(fastfetchText);
    }

    function handleLs(args) {
        let targetPath = args[0] ? resolveRelativePath(args[0]) : currentPath;
        const contents = window.VFS.listDirectory(targetPath);
        if (contents === null) {
            appendOutput(`ls: cannot access '${args[0]}': No such file or directory`);
            return;
        }
        if (contents.length === 0) {
            return;
        }
        const formatted = contents.map(node => {
            if (node.type === 'folder') {
                return `<span style="color: var(--color-accent); font-weight: bold;">${node.name}</span>`;
            }
            const ext = node.name.split('.').pop().toLowerCase();
            if (ext === 'sh') {
                return `<span style="color: var(--color-success); font-weight: bold;">${node.name}</span>`;
            }
            return `<span>${node.name}</span>`;
        }).join('    ');
        appendOutput(formatted);
    }

    function handleCd(args) {
        const target = args[0] || '/workspace';
        const targetPath = resolveRelativePath(target);
        
        if (!window.VFS.exists(targetPath)) {
            appendOutput(`cd: no such file or directory: ${target}`);
            return;
        }
        
        if (!window.VFS.isFolder(targetPath)) {
            appendOutput(`cd: not a directory: ${target}`);
            return;
        }
        
        currentPath = window.VFS.resolveAbsolutePath(targetPath);
        updatePrompt();
        
        const winTitle = win.querySelector('.window-title');
        if (winTitle) {
            winTitle.textContent = `root@felbicos-live: ${currentPath} (foot)`;
        }
    }

    function handlePwd() {
        appendOutput(currentPath);
    }

    function handleMkdir(args) {
        if (args.length === 0) {
            appendOutput('mkdir: missing operand');
            return;
        }
        for (const name of args) {
            const targetPath = resolveRelativePath(name);
            const { parent, name: folderName } = splitPath(targetPath);
            const success = window.VFS.mkdir(parent, folderName);
            if (!success) {
                appendOutput(`mkdir: cannot create directory '${name}': File exists or invalid path`);
            } else {
                dispatchVfsUpdated();
            }
        }
    }

    function handleTouch(args) {
        if (args.length === 0) {
            appendOutput('touch: missing file operand');
            return;
        }
        for (const name of args) {
            const targetPath = resolveRelativePath(name);
            const { parent, name: fileName } = splitPath(targetPath);
            if (!window.VFS.exists(targetPath)) {
                const success = window.VFS.createFile(parent, fileName, '');
                if (!success) {
                    appendOutput(`touch: cannot touch '${name}': Parent directory does not exist`);
                } else {
                    dispatchVfsUpdated();
                }
            } else {
                const currentContent = window.VFS.readFile(targetPath);
                window.VFS.writeFile(targetPath, currentContent);
                dispatchVfsUpdated();
            }
        }
    }

    function handleRm(args) {
        if (args.length === 0) {
            appendOutput('rm: missing operand');
            return;
        }
        
        let recursive = false;
        let filesToRemove = [];
        for (const arg of args) {
            if (arg === '-r' || arg === '-rf' || arg === '-f') {
                recursive = true;
            } else {
                filesToRemove.push(arg);
            }
        }
        
        if (filesToRemove.length === 0) {
            appendOutput('rm: missing operand');
            return;
        }

        for (const name of filesToRemove) {
            const targetPath = resolveRelativePath(name);
            if (!window.VFS.exists(targetPath)) {
                appendOutput(`rm: cannot remove '${name}': No such file or directory`);
                continue;
            }
            if (window.VFS.isFolder(targetPath) && !recursive) {
                appendOutput(`rm: cannot remove '${name}': Is a directory`);
                continue;
            }
            const success = window.VFS.deletePath(targetPath);
            if (!success) {
                appendOutput(`rm: cannot remove '${name}': Permission denied`);
            } else {
                dispatchVfsUpdated();
            }
        }
    }

    function handleCp(args) {
        if (args.length < 2) {
            appendOutput('cp: missing file operand');
            return;
        }
        const src = args[0];
        const dest = args[1];
        
        const srcFull = resolveRelativePath(src);
        const destFull = resolveRelativePath(dest);
        
        if (!window.VFS.exists(srcFull)) {
            appendOutput(`cp: cannot stat '${src}': No such file or directory`);
            return;
        }
        
        let destParent, destName;
        if (window.VFS.exists(destFull) && window.VFS.isFolder(destFull)) {
            destParent = destFull;
            destName = srcFull.split('/').pop();
        } else {
            const parts = splitPath(destFull);
            destParent = parts.parent;
            destName = parts.name;
        }
        
        if (!window.VFS.exists(destParent)) {
            appendOutput(`cp: cannot copy to '${dest}': Parent directory does not exist`);
            return;
        }
        
        const targetPath = destParent === '/' ? `/${destName}` : `${destParent}/${destName}`;
        if (window.VFS.exists(targetPath)) {
            window.VFS.deletePath(targetPath);
        }
        
        const success = window.VFS.copyPath(srcFull, destParent);
        if (!success) {
            appendOutput(`cp: failed to copy '${src}' to '${dest}'`);
            return;
        }
        
        const createdPath = destParent === '/' ? `/${srcFull.split('/').pop()}` : `${destParent}/${srcFull.split('/').pop()}`;
        if (createdPath.toLowerCase() !== targetPath.toLowerCase()) {
            window.VFS.renamePath(createdPath, destName);
        }
        dispatchVfsUpdated();
    }

    function handleMv(args) {
        if (args.length < 2) {
            appendOutput('mv: missing file operand');
            return;
        }
        const src = args[0];
        const dest = args[1];
        
        const srcFull = resolveRelativePath(src);
        const destFull = resolveRelativePath(dest);
        
        if (!window.VFS.exists(srcFull)) {
            appendOutput(`mv: cannot stat '${src}': No such file or directory`);
            return;
        }
        
        const { parent: srcParent } = splitPath(srcFull);
        
        let destParent, destName;
        if (window.VFS.exists(destFull) && window.VFS.isFolder(destFull)) {
            destParent = destFull;
            destName = srcFull.split('/').pop();
        } else {
            const parts = splitPath(destFull);
            destParent = parts.parent;
            destName = parts.name;
        }
        
        if (!window.VFS.exists(destParent)) {
            appendOutput(`mv: cannot move to '${dest}': Parent directory does not exist`);
            return;
        }
        
        const targetPath = destParent === '/' ? `/${destName}` : `${destParent}/${destName}`;
        
        if (srcParent.toLowerCase() === destParent.toLowerCase()) {
            if (window.VFS.exists(targetPath)) {
                window.VFS.deletePath(targetPath);
            }
            window.VFS.renamePath(srcFull, destName);
        } else {
            if (window.VFS.exists(targetPath)) {
                window.VFS.deletePath(targetPath);
            }
            const success = window.VFS.movePath(srcFull, destParent);
            if (!success) {
                appendOutput(`mv: failed to move '${src}' to '${dest}'`);
                return;
            }
            const createdPath = destParent === '/' ? `/${srcFull.split('/').pop()}` : `${destParent}/${srcFull.split('/').pop()}`;
            if (createdPath.toLowerCase() !== targetPath.toLowerCase()) {
                window.VFS.renamePath(createdPath, destName);
            }
        }
        dispatchVfsUpdated();
    }

    function handleCat(args) {
        if (args.length === 0) {
            appendOutput('cat: missing filename');
            return;
        }
        const targetPath = resolveRelativePath(args[0]);
        if (!window.VFS.exists(targetPath)) {
            appendOutput(`cat: ${args[0]}: No such file or directory`);
            return;
        }
        if (window.VFS.isFolder(targetPath)) {
            appendOutput(`cat: ${args[0]}: Is a directory`);
            return;
        }
        const content = window.VFS.readFile(targetPath);
        appendOutput(content, true);
    }

    function resolveRelativePath(path) {
        if (!path) return currentPath;
        if (path.startsWith('/')) {
            return path;
        }
        if (currentPath === '/') {
            return '/' + path;
        }
        return currentPath + '/' + path;
    }

    function handleWrite(args) {
        if (args.length < 2) {
            appendOutput('write: missing filename or text content');
            return;
        }
        const fileName = args[0];
        const textContent = args.slice(1).join(' ');
        const targetPath = resolveRelativePath(fileName);
        const { parent, name } = splitPath(targetPath);
        
        let success;
        if (window.VFS.exists(targetPath)) {
            success = window.VFS.writeFile(targetPath, textContent);
        } else {
            success = window.VFS.createFile(parent, name, textContent);
        }
        
        if (success) {
            appendOutput(`Successfully wrote to ${fileName}`);
            dispatchVfsUpdated();
        } else {
            appendOutput(`write: failed to write to '${fileName}': Parent directory does not exist or permission denied`);
        }
    }

    function splitPath(path) {
        const parts = path.split('/').filter(p => p !== '');
        if (parts.length === 0) return { parent: '/', name: '' };
        const name = parts.pop();
        const parent = '/' + parts.join('/');
        return { parent, name };
    }

    function updatePrompt() {
        const inputPrompt = document.querySelector('.terminal-input-line .terminal-prompt');
        if (inputPrompt) {
            inputPrompt.textContent = `felbicos-live:${currentPath}#`;
        }
    }

    function dispatchVfsUpdated() {
        document.dispatchEvent(new CustomEvent('vfs-updated', { detail: { path: currentPath } }));
    }

    function handleAutocomplete() {
        const val = terminalInput.value;
        if (!val.trim() && val.length > 0) {
            const contents = window.VFS.listDirectory(currentPath);
            if (contents && contents.length > 0) {
                const names = contents.map(n => n.type === 'folder' ? `${n.name}/` : n.name).join('    ');
                appendHistoryRow(val);
                appendOutput(names);
            }
            return;
        }
        
        const parts = val.split(/\s+/);
        const hasTrailingSpace = val.endsWith(' ');
        
        if (parts.length === 1 && !hasTrailingSpace) {
            const prefix = parts[0];
            const cmds = ['help', 'fastfetch', 'neofetch', 'ls', 'cd', 'pwd', 'mkdir', 'touch', 'rm', 'cp', 'mv', 'cat', 'write', 'theme', 'pacman', 'clear', 'systemctl', 'uname'];
            const matches = cmds.filter(c => c.startsWith(prefix.toLowerCase()));
            
            if (matches.length === 1) {
                terminalInput.value = matches[0] + ' ';
            } else if (matches.length > 1) {
                appendHistoryRow(val);
                appendOutput(matches.join('    '));
            }
        } else {
            const prefix = hasTrailingSpace ? '' : parts[parts.length - 1];
            const beforeText = val.substring(0, val.length - prefix.length);
            
            let searchPath = currentPath;
            let filePrefix = prefix;
            let dirPart = '';
            
            if (prefix.includes('/')) {
                const lastSlashIndex = prefix.lastIndexOf('/');
                dirPart = prefix.substring(0, lastSlashIndex);
                filePrefix = prefix.substring(lastSlashIndex + 1);
                searchPath = resolveRelativePath(dirPart);
            }
            
            const contents = window.VFS.listDirectory(searchPath);
            if (!contents) return;
            
            let matches = contents.filter(n => n.name.toLowerCase().startsWith(filePrefix.toLowerCase()));
            
            const cmdWords = beforeText.trim().split(/\s+/);
            const activeCmd = cmdWords[0].toLowerCase();
            if (activeCmd === 'cd') {
                matches = matches.filter(n => n.type === 'folder');
            }
            
            if (matches.length === 1) {
                const node = matches[0];
                const suffix = node.type === 'folder' ? '/' : ' ';
                const completedName = dirPart ? (dirPart + '/' + node.name) : node.name;
                terminalInput.value = beforeText + completedName + suffix;
            } else if (matches.length > 1) {
                appendHistoryRow(val);
                const displayNames = matches.map(n => n.type === 'folder' ? `${n.name}/` : n.name).join('    ');
                appendOutput(displayNames);
            }
        }
    }

    function setTheme(themeName) {
        if (!themeName) {
            appendOutput(`usage: theme &lt;light|dark&gt;`);
            return;
        }

        const btnDark = document.getElementById('theme-btn-dark');
        const btnLight = document.getElementById('theme-btn-light');

        if (themeName === 'light') {
            document.body.classList.add('light-theme');
            if (btnDark && btnLight) {
                btnLight.classList.add('active');
                btnDark.classList.remove('active');
            }
            appendOutput('Theme switched to Light mode.');
        } else if (themeName === 'dark') {
            document.body.classList.remove('light-theme');
            if (btnDark && btnLight) {
                btnDark.classList.add('active');
                btnLight.classList.remove('active');
            }
            appendOutput('Theme switched to Dark mode.');
        } else {
            appendOutput(`theme: invalid theme '${themeName}'. Use 'light' or 'dark'.`);
        }
    }

    function handleSystemctl(args) {
        if (args.length >= 2 && args[0] === 'status' && args[1] === 'aisd') {
            const status = `
● aisd.service - AIOS System Daemon Core
     Loaded: loaded (/usr/lib/systemd/system/aisd.service; enabled; preset: disabled)
     Active: <span style="color: var(--color-success); font-weight: bold;">active (running)</span> since Mon 2026-06-08 15:10:00 IST
   Main PID: 452 (aisd)
     Memory: 84.6M (limit: 150.0M)
     CGroup: /system.slice/aisd.service
             └─452 /usr/bin/aisd

Jun 08 15:10:00 felbicos-live aisd[452]: [INFO] starting aisd v0.1.0-dev
Jun 08 15:10:00 felbicos-live aisd[452]: [INFO] initialized async tokio runtime
Jun 08 15:10:01 felbicos-live aisd[452]: [INFO] loaded SQLite database index.db
Jun 08 15:10:01 felbicos-live aisd[452]: [INFO] loaded embedding model nomic-embed-text
Jun 08 15:10:02 felbicos-live aisd[452]: [INFO] inotify watcher active on /home/felbic
Jun 08 15:10:02 felbicos-live aisd[452]: [INFO] loopback websocket server listening on 127.0.0.1:8080
            `;
            appendOutput(status);
        } else {
            appendOutput(`usage: systemctl status aisd`);
        }
    }

    function handleUname(args) {
        if (args.includes('-a') || args.length === 0) {
            appendOutput(`Linux felbicos-live 7.0.11-arch1-1-felbic #1 SMP PREEMPT_DYNAMIC Mon Jun 8 15:10:00 IST 2026 x86_64 GNU/Linux`);
        } else {
            appendOutput(`uname: invalid options`);
        }
    }

    function handlePacman(args) {
        if (args.length < 2 || args[0] !== '-S') {
            appendOutput(`usage: pacman -S &lt;package_name&gt;`);
            return;
        }

        const packageName = args[1];
        const validPackages = ['firefox', 'vscode', 'rust', 'gimp', 'blender', 'vlc', 'discord'];

        if (!validPackages.includes(packageName)) {
            appendOutput(`<span style="color: var(--color-danger);">error: target not found: ${packageName}</span>`);
            return;
        }

        terminalInput.disabled = true;
        terminalInput.placeholder = `Installing ${packageName}...`;

        appendOutput(`resolving dependencies...`);
        appendOutput(`looking for conflicting packages...`);
        
        let progress = 0;
        const outDiv = document.createElement('div');
        outDiv.className = 'terminal-output';
        historyContainer.appendChild(outDiv);

        const progressInterval = setInterval(() => {
            progress += 10;
            outDiv.textContent = `Downloading package ${packageName} [${progress}%] ...`;
            wrapper.scrollTop = wrapper.scrollHeight;

            if (progress >= 100) {
                clearInterval(progressInterval);
                
                setTimeout(() => {
                    appendOutput(`checking package integrity...`);
                    
                    setTimeout(() => {
                        appendOutput(`(1/1) installing <span style="color: var(--color-success); font-weight:bold;">${packageName}</span> [100%]`);
                        appendOutput(`:: Running post-transaction hooks...`);

                        if (window.SoftwareCenter && typeof window.SoftwareCenter.installApp === 'function') {
                            window.SoftwareCenter.installApp(packageName, (success) => {
                                if (success) {
                                    appendOutput(`:: <span style="color: var(--color-success); font-weight:bold;">${packageName}</span> installed successfully! Added to App Drawer and Dock.`);
                                } else {
                                    appendOutput(`error: failed to install ${packageName} in system database.`);
                                }
                                finishPacman();
                            });
                        } else {
                            appendOutput(`:: ${packageName} installed successfully!`);
                            finishPacman();
                        }
                    }, 500);
                }, 500);
            }
        }, 150);
    }

    function finishPacman() {
        terminalInput.disabled = false;
        terminalInput.placeholder = '';
        terminalInput.focus();
        wrapper.scrollTop = wrapper.scrollHeight;
    }
}
