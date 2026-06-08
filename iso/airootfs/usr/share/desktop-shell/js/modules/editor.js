/* FELBIC OS — Text Editor Module */

export function initEditor() {
    console.log('[felbicos] Initializing Text Editor Module...');

    const editorWindow = document.getElementById('editor-window');
    const editorContent = document.getElementById('editor-content');
    const editorLabel = document.getElementById('editor-file-label');
    const saveBtn = document.getElementById('editor-save');
    const tabsBar = document.getElementById('editor-tabs-bar');
    const gutter = document.getElementById('editor-gutter');
    const syntaxSelect = document.getElementById('editor-syntax-select');

    let openTabs = []; // { name, path, content, syntax }
    let activeTabIndex = -1;
    let activeFilePath = '';

    // Render the tabs list
    function renderTabs() {
        if (!tabsBar) return;
        tabsBar.innerHTML = '';
        
        openTabs.forEach((tab, index) => {
            const tabEl = document.createElement('div');
            tabEl.className = `editor-tab ${index === activeTabIndex ? 'active' : ''}`;
            tabEl.innerHTML = `
                <span>${tab.name}</span>
                <span class="editor-tab-close" title="Close Tab">×</span>
            `;
            
            // Switch tab click
            tabEl.addEventListener('click', (e) => {
                if (e.target.classList.contains('editor-tab-close')) {
                    closeTab(index, e);
                } else {
                    switchTab(index);
                }
            });
            
            tabsBar.appendChild(tabEl);
        });
    }

    // Switch tab
    function switchTab(index) {
        if (index === activeTabIndex) return;

        // Save current changes of the active tab
        if (activeTabIndex >= 0 && activeTabIndex < openTabs.length) {
            openTabs[activeTabIndex].content = editorContent.value;
        }

        activeTabIndex = index;
        loadActiveTab();
        renderTabs();
    }

    // Close tab
    function closeTab(index, e) {
        if (e) e.stopPropagation();

        openTabs.splice(index, 1);

        if (openTabs.length === 0) {
            activeTabIndex = -1;
            activeFilePath = '';
            editorContent.value = '';
            editorLabel.textContent = 'unsaved_draft.txt';
            if (syntaxSelect) syntaxSelect.value = 'text';
            updateLineNumbers();
            
            // Hide editor window
            if (editorWindow) {
                editorWindow.style.transition = 'transform 0.25s ease, opacity 0.25s ease';
                editorWindow.style.transform = 'scale(0.93) translateY(12px)';
                editorWindow.style.opacity = '0';
                setTimeout(() => {
                    editorWindow.style.display = 'none';
                }, 250);

                const dockItem = document.querySelector(`.dock-item[data-app="editor"]`);
                if (dockItem) dockItem.classList.remove('running');
            }
        } else {
            if (activeTabIndex >= openTabs.length) {
                activeTabIndex = openTabs.length - 1;
            }
            loadActiveTab();
            renderTabs();
        }
    }

    // Load active tab data into UI
    function loadActiveTab() {
        const tab = openTabs[activeTabIndex];
        if (!tab) return;

        activeFilePath = tab.path;
        if (editorLabel) editorLabel.textContent = tab.path;
        if (editorContent) editorContent.value = tab.content;
        
        // Auto select syntax based on file extension
        let syntax = 'text';
        const ext = tab.name.split('.').pop().toLowerCase();
        if (ext === 'js') syntax = 'javascript';
        else if (ext === 'md') syntax = 'markdown';
        else if (ext === 'html' || ext === 'css') syntax = 'html';
        
        tab.syntax = syntax;
        if (syntaxSelect) syntaxSelect.value = syntax;

        updateLineNumbers();
        
        // Scroll to top
        if (editorContent) editorContent.scrollTop = 0;
        if (gutter) gutter.scrollTop = 0;
    }

    // Update line numbers and highlight active line
    function updateLineNumbers() {
        if (!gutter || !editorContent) return;
        
        const text = editorContent.value;
        const lines = text.split('\n');
        const lineCount = lines.length;
        
        // Calculate active line index based on cursor position
        const cursorPosition = editorContent.selectionStart;
        const textUpToCursor = text.substring(0, cursorPosition);
        const activeLine = textUpToCursor.split('\n').length;

        let gutterHTML = '';
        for (let i = 1; i <= lineCount; i++) {
            const isActive = i === activeLine;
            gutterHTML += `<div class="${isActive ? 'active-gutter-line' : ''}">${i}</div>`;
        }
        gutter.innerHTML = gutterHTML;
        
        // Keep scroll synced
        gutter.scrollTop = editorContent.scrollTop;
    }

    // Listen for custom file open event triggered by Files Explorer
    document.addEventListener('open-file', (e) => {
        const file = e.detail;
        if (!file) return;

        console.log(`[editor] Loading file for editing: ${file.name}`);

        // Check if file is already open
        let tabIndex = openTabs.findIndex(t => t.path === file.path);
        if (tabIndex === -1) {
            openTabs.push({
                name: file.name,
                path: file.path,
                content: file.content
            });
            tabIndex = openTabs.length - 1;
        }

        // Set active index
        activeTabIndex = tabIndex;
        loadActiveTab();
        renderTabs();

        // 2. Open editor window and bring to front
        if (editorWindow) {
            editorWindow.style.display = 'flex';
            editorWindow.offsetHeight; // force reflow
            editorWindow.style.transition = 'transform 0.45s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.45s ease';
            editorWindow.style.transform = 'scale(1) translateY(0)';
            editorWindow.style.opacity = '1';
            
            // Set indicator dot on editor dock icon if it exists
            const dockItem = document.querySelector(`.dock-item[data-app="editor"]`);
            if (dockItem) dockItem.classList.add('running');
            
            // Focus editor window
            const focusEvent = new CustomEvent('focus-window', { detail: { targetId: 'editor-window' } });
            document.dispatchEvent(focusEvent);
        }
    });

    // Sync line numbers events
    if (editorContent) {
        editorContent.addEventListener('input', updateLineNumbers);
        editorContent.addEventListener('scroll', () => {
            if (gutter) gutter.scrollTop = editorContent.scrollTop;
        });
        
        // Listen to cursor position changes to update active line number in gutter
        const cursorEvents = ['click', 'keyup', 'keydown', 'mouseup', 'focus'];
        cursorEvents.forEach(evt => {
            editorContent.addEventListener(evt, () => {
                // Wrap in setTimeout to ensure selection position is updated in DOM
                setTimeout(updateLineNumbers, 0);
            });
        });
    }

    // Save Changes click handler
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            if (activeTabIndex === -1 || !activeFilePath) {
                alert('No active file is loaded to save.');
                return;
            }

            const updatedContent = editorContent.value;
            openTabs[activeTabIndex].content = updatedContent;
            
            // Dispatch a save-file notification or run mock saving
            if (window.showNotification) {
                window.showNotification('File Saved', `Changes saved to ${activeFilePath.split('/').pop()} successfully!`, 'hgi-floppy-disk');
            } else {
                alert(`Saved changes to ${activeFilePath} successfully!`);
            }
            console.log(`[editor] Saved ${activeFilePath}:`, updatedContent);

            // Trigger a custom event in case other modules need to know about the update
            const saveEvent = new CustomEvent('file-saved', {
                detail: {
                    path: activeFilePath,
                    content: updatedContent
                }
            });
            document.dispatchEvent(saveEvent);
        });
    }

    // Syntax select change listener
    if (syntaxSelect) {
        syntaxSelect.addEventListener('change', (e) => {
            if (activeTabIndex !== -1) {
                openTabs[activeTabIndex].syntax = e.target.value;
                if (window.showNotification) {
                    window.showNotification('Syntax Changed', `Mode changed to ${e.target.value.toUpperCase()}`, 'hgi-code');
                }
            }
        });
    }

    // Initial render
    updateLineNumbers();
}
