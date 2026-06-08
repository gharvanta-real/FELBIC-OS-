/* FELBIC OS — Files Explorer Module */

export function initFiles() {
    console.log('[felbicos] Initializing Files Module...');

    let currentFolder = '/workspace';
    let navigationHistory = ['/workspace'];
    let searchFilter = '';

    const contentGrid = document.getElementById('finder-content-grid');
    const sidebarItems = document.querySelectorAll('.finder-sidebar-item');
    const backBtn = document.getElementById('files-back-btn');
    const breadcrumb = document.getElementById('files-breadcrumb');
    const searchInput = document.getElementById('files-search');

    const propertiesSidebar = document.getElementById('finder-properties-sidebar');
    const propertiesContent = document.getElementById('properties-content');

    // Action buttons
    const newFileBtn = document.getElementById('files-new-file');
    const newFolderBtn = document.getElementById('files-new-folder');
    const renameBtn = document.getElementById('files-rename');
    const deleteBtn = document.getElementById('files-delete');
    const togglePropertiesBtn = document.getElementById('files-toggle-properties');
    const closePropertiesBtn = document.getElementById('properties-close-btn');

    // Context Menu element
    let contextMenu = document.getElementById('files-context-menu');
    if (!contextMenu) {
        contextMenu = document.createElement('div');
        contextMenu.id = 'files-context-menu';
        contextMenu.className = 'desktop-context-menu';
        document.body.appendChild(contextMenu);
    }

    function getFileType(fileName) {
        const ext = fileName.split('.').pop().toLowerCase();
        if (['js', 'c', 'rs', 'py', 'html', 'css', 'conf'].includes(ext) || fileName === 'Makefile') {
            return 'code';
        } else if (ext === 'sh') {
            return 'script';
        } else if (['iso', 'zip', 'tar', 'gz'].includes(ext)) {
            return 'archive';
        }
        return 'text';
    }

    function renderFolder() {
        if (!contentGrid) return;
        contentGrid.innerHTML = '';

        // Get VFS contents
        let contents = window.VFS.listDirectory(currentFolder) || [];
        let files = contents.map(node => {
            return {
                name: node.name,
                type: node.type === 'folder' ? 'folder' : getFileType(node.name),
                content: node.content,
                lastModified: node.lastModified
            };
        });

        if (searchFilter) {
            files = files.filter(f => f.name.toLowerCase().includes(searchFilter.toLowerCase()));
        }

        // Format breadcrumb path: Workspace > Subfolder
        breadcrumb.textContent = currentFolder
            .split('/')
            .filter(p => p !== '')
            .map(p => p.charAt(0).toUpperCase() + p.slice(1))
            .join(' > ') || 'Root';
            
        backBtn.disabled = navigationHistory.length <= 1;

        if (files.length === 0) {
            contentGrid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--color-topbar-text-muted); padding-top: 40px;">No files found</div>`;
            updateToolbarState();
            return;
        }

        files.forEach(file => {
            const item = document.createElement('div');
            item.className = 'finder-grid-item';
            item.setAttribute('draggable', 'true');

            // Resolve symbols from Hugeicons
            let iconClass = 'hgi-folder-01'; 
            let iconColor = '#3b82f6'; // Folders default blue
            
            if (file.type === 'text') {
                iconClass = 'hgi-file-01';
                iconColor = '#94a3b8';
            } else if (file.type === 'code' || file.type === 'script') {
                iconClass = 'hgi-code';
                iconColor = '#10b981';
            } else if (file.type === 'archive') {
                iconClass = 'hgi-package';
                iconColor = '#f59e0b';
            }

            item.innerHTML = `
                <span class="finder-grid-icon" style="color: ${iconColor};"><i class="hgi-stroke ${iconClass}"></i></span>
                <span class="finder-grid-label">${file.name}</span>
            `;

            // Selection styles (Single Click)
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                document.querySelectorAll('.finder-grid-item').forEach(i => i.classList.remove('active-select'));
                item.classList.add('active-select');
                updatePropertiesPane(file);
                updateToolbarState();
            });

            // Navigation or open trigger (Double Click)
            item.addEventListener('dblclick', () => {
                if (file.type === 'folder') {
                    const nextFolder = currentFolder === '/' ? `/${file.name}` : `${currentFolder}/${file.name}`;
                    currentFolder = nextFolder;
                    navigationHistory.push(currentFolder);
                    searchFilter = '';
                    if (searchInput) searchInput.value = '';
                    renderFolder();
                    updatePropertiesPane(null);
                } else if (file.type === 'text' || file.type === 'code' || file.type === 'script') {
                    openFile(file);
                } else {
                    alert(`Binary File: ${file.name} cannot be opened in text format.`);
                }
            });

            // HTML5 Drag and Drop events
            item.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', currentFolder === '/' ? `/${file.name}` : `${currentFolder}/${file.name}`);
                e.dataTransfer.effectAllowed = 'move';
                item.classList.add('dragging');
            });

            item.addEventListener('dragend', () => {
                item.classList.remove('dragging');
            });

            contentGrid.appendChild(item);
        });

        updateToolbarState();
    }

    // Properties Pane updating logic
    function updatePropertiesPane(file) {
        if (!propertiesContent) return;

        if (!file) {
            // Show properties of the current folder
            const filesInDir = window.VFS.listDirectory(currentFolder) || [];
            const folderSize = filesInDir.length;
            propertiesContent.innerHTML = `
                <div class="properties-detail">
                    <div class="properties-preview-box">
                        <i class="hgi-stroke hgi-folder-01" style="font-size: 48px; color: #3b82f6;"></i>
                    </div>
                    <div class="properties-row">
                        <strong>Name</strong>
                        <span>${currentFolder.split('/').pop()}</span>
                    </div>
                    <div class="properties-row">
                        <strong>Type</strong>
                        <span>Folder</span>
                    </div>
                    <div class="properties-row">
                        <strong>Size</strong>
                        <span>${folderSize} items</span>
                    </div>
                    <div class="properties-row">
                        <strong>Path</strong>
                        <span>${currentFolder}</span>
                    </div>
                </div>
            `;
            return;
        }

        let iconClass = 'hgi-folder-01'; 
        let iconColor = '#3b82f6';
        let cleanType = 'Folder';
        let sizeStr = '—';

        if (file.type === 'text') {
            iconClass = 'hgi-file-01';
            iconColor = '#94a3b8';
            cleanType = 'Text Document';
            sizeStr = file.content ? `${new Blob([file.content]).size} bytes` : '0 bytes';
        } else if (file.type === 'code') {
            iconClass = 'hgi-code';
            iconColor = '#10b981';
            cleanType = 'Source Code';
            sizeStr = file.content ? `${new Blob([file.content]).size} bytes` : '0 bytes';
        } else if (file.type === 'script') {
            iconClass = 'hgi-code';
            iconColor = '#10b981';
            cleanType = 'Shell Script';
            sizeStr = file.content ? `${new Blob([file.content]).size} bytes` : '0 bytes';
        } else if (file.type === 'archive') {
            iconClass = 'hgi-package';
            iconColor = '#f59e0b';
            cleanType = 'Archive Package';
            sizeStr = '12.4 MB'; // mock size
        }

        const modifiedStr = file.lastModified || new Date().toLocaleString();

        propertiesContent.innerHTML = `
            <div class="properties-detail">
                <div class="properties-preview-box">
                    <i class="hgi-stroke ${iconClass}" style="font-size: 48px; color: ${iconColor};"></i>
                </div>
                <div class="properties-row">
                    <strong>Name</strong>
                    <span>${file.name}</span>
                </div>
                <div class="properties-row">
                    <strong>Type</strong>
                    <span>${cleanType}</span>
                </div>
                <div class="properties-row">
                    <strong>Size</strong>
                    <span>${sizeStr}</span>
                </div>
                <div class="properties-row">
                    <strong>Modified</strong>
                    <span>${modifiedStr}</span>
                </div>
                <div class="properties-row">
                    <strong>Path</strong>
                    <span>${currentFolder === '/' ? `/${file.name}` : `${currentFolder}/${file.name}`}</span>
                </div>
            </div>
        `;
    }

    // Toggle disabled toolbar actions based on selection
    function updateToolbarState() {
        const selectedItem = document.querySelector('.finder-grid-item.active-select');
        if (selectedItem) {
            if (renameBtn) renameBtn.disabled = false;
            if (deleteBtn) deleteBtn.disabled = false;
        } else {
            if (renameBtn) renameBtn.disabled = true;
            if (deleteBtn) deleteBtn.disabled = true;
        }
    }

    // Open file details in editor window
    function openFile(file) {
        const fullPath = currentFolder === '/' ? `/${file.name}` : `${currentFolder}/${file.name}`;
        const openEvent = new CustomEvent('open-file', {
            detail: {
                name: file.name,
                path: fullPath,
                content: file.content || ''
            }
        });
        document.dispatchEvent(openEvent);
    }

    // Create New File Action
    function createNewFilePrompt() {
        const name = prompt('Enter new file name:', 'untitled.txt');
        if (!name) return;

        const fullPath = currentFolder === '/' ? `/${name}` : `${currentFolder}/${name}`;
        if (window.VFS.exists(fullPath)) {
            alert('A file or folder with that name already exists.');
            return;
        }

        const success = window.VFS.createFile(currentFolder, name, '');
        if (success) {
            if (window.showNotification) {
                window.showNotification('File Created', `Created file "${name}"`, 'hgi-file-add');
            }
        } else {
            alert('Failed to create file.');
        }
    }

    // Create New Folder Action
    function createNewFolderPrompt() {
        const name = prompt('Enter new folder name:', 'New Folder');
        if (!name) return;

        const fullPath = currentFolder === '/' ? `/${name}` : `${currentFolder}/${name}`;
        if (window.VFS.exists(fullPath)) {
            alert('A file or folder with that name already exists.');
            return;
        }

        const success = window.VFS.mkdir(currentFolder, name);
        if (success) {
            if (window.showNotification) {
                window.showNotification('Folder Created', `Created folder "${name}"`, 'hgi-folder-add');
            }
        } else {
            alert('Failed to create folder.');
        }
    }

    // Rename file/folder Action
    function renameFile(file) {
        const newName = prompt('Enter new name:', file.name);
        if (!newName || newName === file.name) return;

        const currentPath = currentFolder === '/' ? `/${file.name}` : `${currentFolder}/${file.name}`;
        const newPath = currentFolder === '/' ? `/${newName}` : `${currentFolder}/${newName}`;
        if (window.VFS.exists(newPath)) {
            alert('A file or folder with that name already exists.');
            return;
        }

        const oldName = file.name;
        const success = window.VFS.renamePath(currentPath, newName);
        if (success) {
            if (window.showNotification) {
                window.showNotification('Renamed', `Renamed "${oldName}" to "${newName}"`, 'hgi-edit-01');
            }
            // Keep renamed item selected after re-render completes
            setTimeout(() => {
                const matchItem = Array.from(document.querySelectorAll('.finder-grid-item')).find(i => i.querySelector('.finder-grid-label').textContent === newName);
                if (matchItem) {
                    matchItem.classList.add('active-select');
                    const contents = window.VFS.listDirectory(currentFolder) || [];
                    const node = contents.find(n => n.name === newName);
                    if (node) {
                        const mappedFile = {
                            name: node.name,
                            type: getFileType(node.name),
                            content: node.content,
                            lastModified: node.lastModified
                        };
                        updatePropertiesPane(mappedFile);
                    }
                    updateToolbarState();
                }
            }, 50);
        } else {
            alert('Failed to rename.');
        }
    }

    // Delete file/folder Action
    function deleteFile(file) {
        if (!confirm(`Are you sure you want to delete "${file.name}"?`)) return;

        const filePath = currentFolder === '/' ? `/${file.name}` : `${currentFolder}/${file.name}`;
        const success = window.VFS.deletePath(filePath);
        if (success) {
            if (window.showNotification) {
                window.showNotification('Deleted', `Deleted "${file.name}"`, 'hgi-delete-02');
            }
            updatePropertiesPane(null);
            updateToolbarState();
        } else {
            alert('Failed to delete file.');
        }
    }

    // Delete file by path (Drag-and-Drop Dock Trash helper)
    function deleteFileByPath(filePath) {
        if (confirm(`Are you sure you want to move "${filePath.split('/').pop()}" to the Trash?`)) {
            const success = window.VFS.deletePath(filePath);
            if (success) {
                if (window.showNotification) {
                    window.showNotification('Moved to Trash', `Deleted "${filePath.split('/').pop()}"`, 'hgi-delete-02');
                }
            }
        }
    }

    // Sidebar Category clicks
    sidebarItems.forEach(item => {
        item.addEventListener('click', () => {
            let targetFolder = '/' + item.getAttribute('data-folder');
            if (targetFolder === '/documents') targetFolder = '/Documents';
            if (targetFolder === '/downloads') targetFolder = '/Downloads';
            if (targetFolder === '/pictures') targetFolder = '/Pictures';
            
            if (targetFolder === currentFolder) return;

            sidebarItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            currentFolder = targetFolder;
            navigationHistory = [currentFolder];
            searchFilter = '';
            if (searchInput) searchInput.value = '';
            renderFolder();
            updatePropertiesPane(null);
        });
    });

    // Back button click
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            if (navigationHistory.length > 1) {
                navigationHistory.pop(); // remove current
                currentFolder = navigationHistory[navigationHistory.length - 1];
                
                // Sync sidebar active state to top level category
                const topLevel = currentFolder.split('/')[1]?.toLowerCase() || '';
                sidebarItems.forEach(item => {
                    if (item.getAttribute('data-folder') === topLevel) {
                        item.classList.add('active');
                    } else {
                        item.classList.remove('active');
                    }
                });

                renderFolder();
                updatePropertiesPane(null);
            }
        });
    }

    // File searching
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchFilter = e.target.value;
            renderFolder();
        });
    }

    // Clear selection on container click
    if (contentGrid) {
        contentGrid.addEventListener('click', () => {
            document.querySelectorAll('.finder-grid-item').forEach(i => i.classList.remove('active-select'));
            updatePropertiesPane(null);
            updateToolbarState();
        });
    }

    // Context menu right-clicks handler
    if (contentGrid) {
        contentGrid.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();

            const gridItem = e.target.closest('.finder-grid-item');
            let selectedFile = null;

            if (gridItem) {
                const name = gridItem.querySelector('.finder-grid-label').textContent;
                const contents = window.VFS.listDirectory(currentFolder) || [];
                const node = contents.find(n => n.name === name);
                if (node) {
                    selectedFile = {
                        name: node.name,
                        type: node.type === 'folder' ? 'folder' : getFileType(node.name),
                        content: node.content,
                        lastModified: node.lastModified
                    };
                }

                // Set selection active
                document.querySelectorAll('.finder-grid-item').forEach(i => i.classList.remove('active-select'));
                gridItem.classList.add('active-select');
                updatePropertiesPane(selectedFile);
                updateToolbarState();
            } else {
                document.querySelectorAll('.finder-grid-item').forEach(i => i.classList.remove('active-select'));
                updatePropertiesPane(null);
                updateToolbarState();
            }

            // Render context menu options
            if (selectedFile) {
                contextMenu.innerHTML = `
                    <div class="menu-item" id="files-menu-open">
                        <i class="hgi-stroke hgi-folder-open"></i> Open
                    </div>
                    <div class="menu-item" id="files-menu-rename">
                        <i class="hgi-stroke hgi-edit-01"></i> Rename
                    </div>
                    <div class="menu-item" id="files-menu-delete">
                        <i class="hgi-stroke hgi-delete-02"></i> Delete
                    </div>
                    <div class="menu-item" id="files-menu-properties">
                        <i class="hgi-stroke hgi-information-circle"></i> Get Info
                    </div>
                `;
            } else {
                contextMenu.innerHTML = `
                    <div class="menu-item" id="files-menu-new-file">
                        <i class="hgi-stroke hgi-file-add"></i> New File
                    </div>
                    <div class="menu-item" id="files-menu-new-folder">
                        <i class="hgi-stroke hgi-folder-add"></i> New Folder
                    </div>
                    <div class="menu-item" id="files-menu-properties">
                        <i class="hgi-stroke hgi-information-circle"></i> Folder Info
                    </div>
                `;
            }

            // Position context menu
            const menuWidth = 165;
            const menuHeight = selectedFile ? 130 : 100;
            let left = e.clientX;
            let top = e.clientY;

            if (left + menuWidth > window.innerWidth) left -= menuWidth;
            if (top + menuHeight > window.innerHeight) top -= menuHeight;

            contextMenu.style.left = `${left}px`;
            contextMenu.style.top = `${top}px`;
            contextMenu.classList.add('active');

            // Listeners for context menu operations
            if (selectedFile) {
                document.getElementById('files-menu-open').addEventListener('click', () => {
                    contextMenu.classList.remove('active');
                    openFile(selectedFile);
                });
                document.getElementById('files-menu-rename').addEventListener('click', () => {
                    contextMenu.classList.remove('active');
                    renameFile(selectedFile);
                });
                document.getElementById('files-menu-delete').addEventListener('click', () => {
                    contextMenu.classList.remove('active');
                    deleteFile(selectedFile);
                });
            } else {
                document.getElementById('files-menu-new-file').addEventListener('click', () => {
                    contextMenu.classList.remove('active');
                    createNewFilePrompt();
                });
                document.getElementById('files-menu-new-folder').addEventListener('click', () => {
                    contextMenu.classList.remove('active');
                    createNewFolderPrompt();
                });
            }

            document.getElementById('files-menu-properties').addEventListener('click', () => {
                contextMenu.classList.remove('active');
                if (propertiesSidebar) propertiesSidebar.classList.remove('collapsed');
            });
        });
    }

    // Dismiss files context menu on general click
    document.addEventListener('click', (e) => {
        if (contextMenu && !e.target.closest('#files-context-menu')) {
            contextMenu.classList.remove('active');
        }
    });

    // Toolbar button listeners
    if (newFileBtn) newFileBtn.addEventListener('click', (e) => { e.stopPropagation(); createNewFilePrompt(); });
    if (newFolderBtn) newFolderBtn.addEventListener('click', (e) => { e.stopPropagation(); createNewFolderPrompt(); });
    
    if (renameBtn) {
        renameBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const selectedItem = document.querySelector('.finder-grid-item.active-select');
            if (selectedItem) {
                const name = selectedItem.querySelector('.finder-grid-label').textContent;
                const contents = window.VFS.listDirectory(currentFolder) || [];
                const node = contents.find(n => n.name === name);
                if (node) {
                    const file = {
                        name: node.name,
                        type: node.type === 'folder' ? 'folder' : getFileType(node.name),
                        content: node.content,
                        lastModified: node.lastModified
                    };
                    renameFile(file);
                }
            }
        });
    }

    if (deleteBtn) {
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const selectedItem = document.querySelector('.finder-grid-item.active-select');
            if (selectedItem) {
                const name = selectedItem.querySelector('.finder-grid-label').textContent;
                const contents = window.VFS.listDirectory(currentFolder) || [];
                const node = contents.find(n => n.name === name);
                if (node) {
                    const file = {
                        name: node.name,
                        type: node.type === 'folder' ? 'folder' : getFileType(node.name),
                        content: node.content,
                        lastModified: node.lastModified
                    };
                    deleteFile(file);
                }
            }
        });
    }

    if (togglePropertiesBtn && propertiesSidebar) {
        togglePropertiesBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            propertiesSidebar.classList.toggle('collapsed');
        });
    }

    if (closePropertiesBtn && propertiesSidebar) {
        closePropertiesBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            propertiesSidebar.classList.add('collapsed');
        });
    }

    // Drag-and-drop Trash dock item listener setup
    const trashDockItem = document.querySelector('.dock-item.dock-trash');
    if (trashDockItem) {
        trashDockItem.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            trashDockItem.classList.add('drag-hover');
        });
        trashDockItem.addEventListener('dragleave', () => {
            trashDockItem.classList.remove('drag-hover');
        });
        trashDockItem.addEventListener('drop', (e) => {
            e.preventDefault();
            trashDockItem.classList.remove('drag-hover');
            const filePath = e.dataTransfer.getData('text/plain');
            if (filePath) {
                deleteFileByPath(filePath);
            }
        });
    }

    // Listen to files saved updates from editor
    document.addEventListener('file-saved', (e) => {
        const { path, content } = e.detail;
        if (!path) return;

        window.VFS.writeFile(path, content);
        
        // Update properties pane if active select is the saved file
        const activeSelect = document.querySelector('.finder-grid-item.active-select');
        if (activeSelect) {
            const name = activeSelect.querySelector('.finder-grid-label').textContent;
            const fullPath = currentFolder === '/' ? `/${name}` : `${currentFolder}/${name}`;
            if (fullPath === path) {
                const contents = window.VFS.listDirectory(currentFolder) || [];
                const node = contents.find(n => n.name === name);
                if (node) {
                    const mappedFile = {
                        name: node.name,
                        type: getFileType(node.name),
                        content: node.content,
                        lastModified: node.lastModified
                    };
                    updatePropertiesPane(mappedFile);
                }
            }
        }
    });

    // Listen for general VFS updates
    document.addEventListener('vfs-updated', (e) => {
        renderFolder();
        const activeSelect = document.querySelector('.finder-grid-item.active-select');
        if (activeSelect) {
            const name = activeSelect.querySelector('.finder-grid-label').textContent;
            const contents = window.VFS.listDirectory(currentFolder) || [];
            const node = contents.find(n => n.name === name);
            if (node) {
                const mappedFile = {
                    name: node.name,
                    type: node.type === 'folder' ? 'folder' : getFileType(node.name),
                    content: node.content,
                    lastModified: node.lastModified
                };
                updatePropertiesPane(mappedFile);
            } else {
                updatePropertiesPane(null);
            }
        } else {
            updatePropertiesPane(null);
        }
    });

    // Initial render and properties setup
    renderFolder();
    updatePropertiesPane(null);
}
