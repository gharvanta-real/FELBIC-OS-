/* FELBIC OS — Files Explorer Module */

export function initFiles() {
    console.log('[felbicos] Initializing Files Module...');

    let currentFolder = '/workspace';
    let navigationHistory = ['/workspace'];
    let searchFilter = '';
    let currentTagFilter = '';
    let activePanelTab = 'details';
    let lastSelectedFile = null;

    const contentGrid = document.getElementById('finder-content-grid');
    const sidebarItems = document.querySelectorAll('.finder-sidebar .app-sidebar-item');
    const backBtn = document.getElementById('files-back-btn');
    const viewGridBtn = document.getElementById('files-view-grid');
    const viewListBtn = document.getElementById('files-view-list');
    const sortSelect = document.getElementById('files-sort');
    let currentView = 'grid';
    let currentSort = 'name';
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

    // Tab switching for properties sidebar
    const propTabs = document.querySelectorAll('.properties-tab');
    propTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            propTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            activePanelTab = tab.getAttribute('data-tab');
            updatePropertiesPane(lastSelectedFile);
        });
    });

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

    function formatMetaDate(dateStr) {
        if (!dateStr) return '—';
        const parts = dateStr.split(' ');
        if (parts.length >= 2) {
            return `${parts[0]} ${parts[1].replace(',', '')}`;
        }
        return dateStr;
    }

    function getFileInfo(fileName) {
        const ext = fileName.split('.').pop().toLowerCase();
        if (ext === 'pdf') {
            return { icon: 'hgi-pdf-01', color: '#ef4444', label: 'PDF Document' };
        } else if (['xlsx', 'xls', 'csv'].includes(ext)) {
            return { icon: 'hgi-excel-01', color: '#10b981', label: 'Spreadsheet' };
        } else if (ext === 'sketch') {
            return { icon: 'hgi-diamond', color: '#f59e0b', label: 'Sketch Design' };
        } else if (['pptx', 'ppt'].includes(ext)) {
            return { icon: 'hgi-presentation-01', color: '#f97316', label: 'Presentation' };
        } else if (ext === 'txt') {
            return { icon: 'hgi-file-01', color: '#94a3b8', label: 'Text Document' };
        } else if (['wav', 'mp3', 'ogg', 'flac'].includes(ext)) {
            return { icon: 'hgi-music-note-01', color: '#ec4899', label: 'Audio Record' };
        } else if (ext === 'fig') {
            return { icon: 'hgi-figma', color: '#a855f7', label: 'Figma Design' };
        } else if (ext === 'numbers') {
            return { icon: 'hgi-chart-bar-01', color: '#10b981', label: 'Numbers Sheet' };
        } else if (['zip', 'rar', 'tar', 'gz', '7z'].includes(ext)) {
            return { icon: 'hgi-package', color: '#8b5cf6', label: 'Archive Package' };
        } else if (ext === 'md') {
            return { icon: 'hgi-note-01', color: '#3b82f6', label: 'Markdown Document' };
        } else if (['js', 'c', 'rs', 'py', 'html', 'css', 'conf'].includes(ext) || fileName === 'Makefile') {
            return { icon: 'hgi-code', color: '#10b981', label: 'Source Code' };
        } else if (ext === 'sh') {
            return { icon: 'hgi-code', color: '#10b981', label: 'Shell Script' };
        }
        return { icon: 'hgi-file-01', color: '#94a3b8', label: 'File' };
    }

    function bindItemEvents(item, file) {
        // Selection styles (Single Click)
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.finder-folder-card, .finder-file-card').forEach(i => i.classList.remove('active-select'));
            item.classList.add('active-select');
            updatePropertiesPane(file);
            updateToolbarState();
        });

        // Navigation or open trigger (Double Click)
        item.addEventListener('dblclick', () => {
            if (file.type === 'folder') {
                const parent = file.parentPath || currentFolder;
                const nextFolder = parent === '/' ? `/${file.name}` : `${parent}/${file.name}`;
                currentFolder = nextFolder;
                navigationHistory.push(currentFolder);
                searchFilter = '';
                currentTagFilter = ''; // Clear tag filter on folder navigation
                // Sync sidebar items focus to none active if we went inside a folder
                sidebarItems.forEach(i => i.classList.remove('active'));
                if (searchInput) searchInput.value = '';
                renderFolder();
                updatePropertiesPane(null);
            } else {
                openFile(file);
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
    }

    function getRecursiveNodes(folderPath) {
        let results = [];
        const contents = window.VFS.listDirectory(folderPath) || [];
        for (const node of contents) {
            results.push({
                ...node,
                parentPath: folderPath
            });
            if (node.type === 'folder') {
                const subPath = folderPath === '/' ? `/${node.name}` : `${folderPath}/${node.name}`;
                results = results.concat(getRecursiveNodes(subPath));
            }
        }
        return results;
    }

    function getNumericSize(file) {
        if (file.type === 'folder') return -1;
        if (!file.size || file.size === '—') return 0;
        const s = file.size.toString().trim();
        const num = parseFloat(s);
        if (isNaN(num)) return 0;
        if (s.endsWith('GB')) return num * 1024 * 1024 * 1024;
        if (s.endsWith('MB')) return num * 1024 * 1024;
        if (s.endsWith('KB')) return num * 1024;
        return num;
    }

    function getTimestamp(file) {
        if (!file.lastModified) return 0;
        return Date.parse(file.lastModified) || 0;
    }

    function renderFolder() {
        if (!contentGrid) return;
        contentGrid.innerHTML = '';

        // Apply visual classes for list view
        const contentContainer = document.querySelector('.finder-content');
        if (contentContainer) {
            if (currentView === 'list') {
                contentContainer.classList.add('list-view');
                if (viewListBtn) viewListBtn.classList.add('active');
                if (viewGridBtn) viewGridBtn.classList.remove('active');
            } else {
                contentContainer.classList.remove('list-view');
                if (viewGridBtn) viewGridBtn.classList.add('active');
                if (viewListBtn) viewListBtn.classList.remove('active');
            }
        }

        // Get VFS contents
        let contents;
        if (searchFilter) {
            contents = getRecursiveNodes(currentFolder);
        } else {
            contents = window.VFS.listDirectory(currentFolder) || [];
        }

        let files = contents.map(node => {
            const rawSize = node.size || (node.type === 'folder' ? '—' : (node.content ? `${new Blob([node.content]).size} B` : '0 B'));
            return {
                name: node.name,
                type: node.type === 'folder' ? 'folder' : getFileType(node.name),
                content: node.content,
                size: rawSize,
                tags: node.tags || [],
                lastModified: node.lastModified,
                parentPath: node.parentPath || currentFolder
            };
        });

        if (searchFilter) {
            files = files.filter(f => f.name.toLowerCase().includes(searchFilter.toLowerCase()));
        }

        if (currentTagFilter) {
            files = files.filter(f => f.tags.includes(currentTagFilter));
        }

        // Sort files and folders (folders always first, then by currentSort)
        files.sort((a, b) => {
            if (a.type === 'folder' && b.type !== 'folder') return -1;
            if (a.type !== 'folder' && b.type === 'folder') return 1;
            
            if (currentSort === 'name') {
                return a.name.localeCompare(b.name);
            } else if (currentSort === 'date') {
                return getTimestamp(b) - getTimestamp(a);
            } else if (currentSort === 'size') {
                return getNumericSize(b) - getNumericSize(a);
            }
            return 0;
        });

        // Format breadcrumb path: Home > Documents
        const cleanBreadcrumb = currentFolder === '/workspace' ? 'Home > Documents' : 
                                currentFolder.startsWith('/workspace/') ? 'Home > Documents > ' + currentFolder.split('/').slice(2).join(' > ') :
                                currentFolder === '/Documents' ? 'Home > Documents' :
                                currentFolder.startsWith('/Documents/') ? 'Home > Documents > ' + currentFolder.split('/').slice(2).join(' > ') :
                                currentFolder
                                    .split('/')
                                    .filter(p => p !== '')
                                    .map(p => p.charAt(0).toUpperCase() + p.slice(1))
                                    .join(' > ') || 'Root';
        
        breadcrumb.textContent = cleanBreadcrumb;
        backBtn.disabled = navigationHistory.length <= 1;

        if (files.length === 0) {
            contentGrid.innerHTML = `<div style="text-align: center; color: var(--color-topbar-text-muted); padding-top: 40px; width: 100%;">No items found</div>`;
            updateToolbarState();
            return;
        }

        // Separate folders and files
        const folders = files.filter(f => f.type === 'folder');
        const normalFiles = files.filter(f => f.type !== 'folder');

        // Render Folders section
        if (folders.length > 0) {
            const heading = document.createElement('div');
            heading.className = 'finder-section-header';
            heading.textContent = 'Folders';
            contentGrid.appendChild(heading);

            const grid = document.createElement('div');
            grid.className = 'finder-folders-grid';
            contentGrid.appendChild(grid);

            folders.forEach(file => {
                const item = document.createElement('div');
                item.className = 'finder-folder-card';
                item.setAttribute('draggable', 'true');
                item.innerHTML = `
                    <span class="finder-grid-icon" style="color: #3b82f6;"><i class="hgi-stroke hgi-folder-01"></i></span>
                    <span class="finder-grid-label">${file.name}</span>
                `;
                bindItemEvents(item, file);
                grid.appendChild(item);
            });
        }

        // Render Files section
        if (normalFiles.length > 0) {
            const heading = document.createElement('div');
            heading.className = 'finder-section-header';
            heading.textContent = 'Files';
            contentGrid.appendChild(heading);

            const grid = document.createElement('div');
            grid.className = 'finder-files-grid';
            contentGrid.appendChild(grid);

            normalFiles.forEach(file => {
                const info = getFileInfo(file.name);
                const item = document.createElement('div');
                item.className = 'finder-file-card';
                item.setAttribute('draggable', 'true');

                const cleanDate = formatMetaDate(file.lastModified);

                item.innerHTML = `
                    <span class="finder-grid-icon" style="color: ${info.color};"><i class="hgi-stroke ${info.icon}"></i></span>
                    <span class="finder-grid-label" title="${file.name}">${file.name}</span>
                    <div class="finder-file-meta">
                        <span class="finder-file-size">${file.size}</span>
                        <span class="finder-file-date">${cleanDate}</span>
                    </div>
                `;
                bindItemEvents(item, file);
                grid.appendChild(item);
            });
        }

        updateToolbarState();
    }

    // Properties Pane updating logic
    function updatePropertiesPane(file) {
        lastSelectedFile = file;
        if (!propertiesContent) return;

        const isFolderContext = !file;
        const name = isFolderContext ? (currentFolder.split('/').pop() || 'Workspace') : file.name;
        const typeStr = isFolderContext ? 'Folder' : getFileInfo(file.name).label;
        const sizeStr = isFolderContext ? '1.2 GB • 24 items' : file.size;
        const iconClass = isFolderContext ? 'hgi-folder-01' : getFileInfo(file.name).icon;
        const iconColor = isFolderContext ? '#3b82f6' : getFileInfo(file.name).color;
        const tags = isFolderContext ? ['Work', 'Projects'] : (file.tags || []);
        const modified = isFolderContext ? 'Jun 8, 2025 06:45 PM' : (file.lastModified || 'May 24, 2024 10:30 AM');
        const created = isFolderContext ? 'May 24, 2024 10:30 AM' : 'May 24, 2024 10:30 AM';

        // Update properties header title
        const propertiesTitle = document.getElementById('properties-title');
        if (propertiesTitle) {
            propertiesTitle.textContent = isFolderContext ? 'Folder Info' : 'File Info';
        }

        if (activePanelTab === 'activity') {
            propertiesContent.innerHTML = `
                <div class="properties-detail" style="display: flex; flex-direction: column; gap: 14px;">
                    <div style="display: flex; align-items: center; gap: 12px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 12px;">
                        <span style="font-size: 28px; color: ${iconColor}; display: flex;"><i class="hgi-stroke ${iconClass}"></i></span>
                        <div style="display: flex; flex-direction: column; min-width: 0;">
                            <span style="font-size: 13px; font-weight: 700; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${name}</span>
                            <span style="font-size: 10px; color: var(--text-muted);">${typeStr}</span>
                        </div>
                    </div>
                    
                    <div style="display: flex; flex-direction: column; gap: 10px; font-size: 11px;">
                        <div style="display: flex; gap: 8px; align-items: flex-start;">
                            <span style="color: var(--success); font-size: 12px;">●</span>
                            <div style="display: flex; flex-direction: column;">
                                <strong style="color: var(--text-primary);">Created by aios</strong>
                                <span style="color: var(--text-muted); font-size: 10px;">${created}</span>
                            </div>
                        </div>
                        <div style="display: flex; gap: 8px; align-items: flex-start;">
                            <span style="color: var(--color-accent); font-size: 12px;">●</span>
                            <div style="display: flex; flex-direction: column;">
                                <strong style="color: var(--text-primary);">Modified contents</strong>
                                <span style="color: var(--text-muted); font-size: 10px;">${modified}</span>
                            </div>
                        </div>
                        <div style="display: flex; gap: 8px; align-items: flex-start;">
                            <span style="color: var(--text-muted); font-size: 12px;">●</span>
                            <div style="display: flex; flex-direction: column;">
                                <strong style="color: var(--text-primary);">Sync daemon update</strong>
                                <span style="color: var(--text-muted); font-size: 10px;">Just now</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            return;
        }

        // Details view (default)
        const tagsHtml = tags.map(tag => {
            let dotColor = '#3b82f6';
            if (tag === 'Personal') dotColor = '#10b981';
            else if (tag === 'Projects') dotColor = '#a855f7';
            else if (tag === 'Important') dotColor = '#ef4444';
            return `
                <span class="file-tag-badge" data-tag="${tag}" style="font-size: 9px; padding: 3px 8px; background: var(--bg-primary); border: 1px solid var(--border-subtle); border-radius: 99px; color: var(--text-secondary); display: flex; align-items: center; gap: 5px; cursor: pointer;" title="Click to remove tag">
                    <span style="width: 6px; height: 6px; border-radius: 50%; background-color: ${dotColor};"></span>
                    ${tag} <span style="opacity: 0.5; margin-left: 2px;">×</span>
                </span>
            `;
        }).join('');

        propertiesContent.innerHTML = `
            <div class="properties-detail" style="display: flex; flex-direction: column; gap: 14px;">
                <div style="display: flex; align-items: center; gap: 12px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 12px;">
                    <span style="font-size: 28px; color: ${iconColor}; display: flex;"><i class="hgi-stroke ${iconClass}"></i></span>
                    <div style="display: flex; flex-direction: column; min-width: 0;">
                        <span style="font-size: 13px; font-weight: 700; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${name}</span>
                        <span style="font-size: 10px; color: var(--text-muted);">${typeStr}</span>
                    </div>
                </div>
                
                <div style="display: flex; flex-direction: column; gap: 8px; font-size: 11px;">
                    <div style="display: flex; justify-content: space-between;">
                        <span style="color: var(--text-muted);">Type</span>
                        <span style="color: var(--text-primary); font-weight: 500;">${typeStr}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span style="color: var(--text-muted);">Size</span>
                        <span style="color: var(--text-primary); font-weight: 500;">${sizeStr}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; flex-direction: column; gap: 2px;">
                        <span style="color: var(--text-muted);">Location</span>
                        <span style="color: var(--text-primary); font-weight: 500; font-family: var(--font-mono); font-size: 9px; word-break: break-all;">/home/aios${currentFolder}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span style="color: var(--text-muted);">Created</span>
                        <span style="color: var(--text-primary); font-size: 10px;">${created}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span style="color: var(--text-muted);">Modified</span>
                        <span style="color: var(--text-primary); font-size: 10px;">${modified}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span style="color: var(--text-muted);">Owner</span>
                        <span style="color: var(--text-primary); font-weight: 500;">aios</span>
                    </div>
                </div>

                <div style="border-top: 1px solid var(--border-subtle); padding-top: 12px; display: flex; flex-direction: column; gap: 6px;">
                    <span style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.5px;">Tags</span>
                    <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-top: 2px;">
                        ${tagsHtml || '<span style="font-size: 10px; color: var(--text-muted); font-style: italic;">No tags</span>'}
                    </div>
                    <span id="add-tag-trigger" style="font-size: 9px; color: var(--color-accent); cursor: pointer; font-weight: 600; margin-top: 4px; display: inline-block;">+ Add Tag</span>
                </div>
            </div>
        `;
    }

    // Toggle disabled toolbar actions based on selection
    function updateToolbarState() {
        const selectedItem = document.querySelector('.finder-folder-card.active-select, .finder-file-card.active-select');
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
        const parent = file.parentPath || currentFolder;
        const fullPath = parent === '/' ? `/${file.name}` : `${parent}/${file.name}`;
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
    async function createNewFilePrompt() {
        const name = await showDialog.prompt('Enter new file name:', 'untitled.txt', 'New File');
        if (!name) return;

        const fullPath = currentFolder === '/' ? `/${name}` : `${currentFolder}/${name}`;
        if (window.VFS.exists(fullPath)) {
            await showDialog.alert('A file or folder with that name already exists.', 'Create File');
            return;
        }

        const success = window.VFS.createFile(currentFolder, name, '');
        if (success) {
            if (window.showNotification) {
                window.showNotification('File Created', `Created file "${name}"`, 'hgi-file-add');
            }
        } else {
            await showDialog.alert('Failed to create file.', 'Create File');
        }
    }

    // Create New Folder Action
    async function createNewFolderPrompt() {
        const name = await showDialog.prompt('Enter new folder name:', 'New Folder', 'Create Folder');
        if (!name) return;

        const fullPath = currentFolder === '/' ? `/${name}` : `${currentFolder}/${name}`;
        if (window.VFS.exists(fullPath)) {
            await showDialog.alert('A file or folder with that name already exists.', 'Create Folder');
            return;
        }

        const success = window.VFS.mkdir(currentFolder, name);
        if (success) {
            if (window.showNotification) {
                window.showNotification('Folder Created', `Created folder "${name}"`, 'hgi-folder-add');
            }
        } else {
            await showDialog.alert('Failed to create folder.', 'Create Folder');
        }
    }

    // Rename file/folder Action
    async function renameFile(file) {
        const newName = await showDialog.prompt('Enter new name:', file.name, 'Rename');
        if (!newName || newName === file.name) return;

        const currentPath = currentFolder === '/' ? `/${file.name}` : `${currentFolder}/${file.name}`;
        const newPath = currentFolder === '/' ? `/${newName}` : `${currentFolder}/${newName}`;
        if (window.VFS.exists(newPath)) {
            await showDialog.alert('A file or folder with that name already exists.', 'Rename');
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
                const matchItem = Array.from(document.querySelectorAll('.finder-folder-card, .finder-file-card')).find(i => i.querySelector('.finder-grid-label').textContent === newName);
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
            await showDialog.alert('Failed to rename.', 'Rename');
        }
    }

    // Delete file/folder Action
    async function deleteFile(file) {
        const confirmed = await showDialog.confirm(`Are you sure you want to delete "${file.name}"?`, 'Delete File', true);
        if (!confirmed) return;

        const filePath = currentFolder === '/' ? `/${file.name}` : `${currentFolder}/${file.name}`;
        const success = window.VFS.deletePath(filePath);
        if (success) {
            if (window.showNotification) {
                window.showNotification('Deleted', `Deleted "${file.name}"`, 'hgi-delete-02');
            }
            updatePropertiesPane(null);
            updateToolbarState();
        } else {
            await showDialog.alert('Failed to delete file.', 'Delete File');
        }
    }

    // Delete file by path (Drag-and-Drop Dock Trash helper)
    async function deleteFileByPath(filePath) {
        const confirmed = await showDialog.confirm(`Are you sure you want to move "${filePath.split('/').pop()}" to the Trash?`, 'Move to Trash', true);
        if (confirmed) {
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
            const tagAttr = item.getAttribute('data-tag');
            if (tagAttr) {
                sidebarItems.forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                currentTagFilter = tagAttr;
                renderFolder();
                updatePropertiesPane(null);
                return;
            }

            let folderAttr = item.getAttribute('data-folder');
            if (!folderAttr) return;

            let targetFolder = '/' + folderAttr;
            if (folderAttr === 'workspace') targetFolder = '/workspace';
            else if (folderAttr === 'desktop') targetFolder = '/Desktop';
            else if (folderAttr === 'documents') targetFolder = '/Documents';
            else if (folderAttr === 'downloads') targetFolder = '/Downloads';
            else if (folderAttr === 'pictures') targetFolder = '/Pictures';
            else if (folderAttr === 'music') targetFolder = '/Music';
            else if (folderAttr === 'videos') targetFolder = '/Videos';
            else if (folderAttr === 'aios-drive') targetFolder = '/AIOS Drive';
            else if (folderAttr === 'network') targetFolder = '/Network';

            if (targetFolder === currentFolder && currentTagFilter === '') return;

            sidebarItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            currentTagFilter = '';
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
            document.querySelectorAll('.finder-folder-card, .finder-file-card').forEach(i => i.classList.remove('active-select'));
            updatePropertiesPane(null);
            updateToolbarState();
        });
    }

    // Context menu right-clicks handler
    if (contentGrid) {
        contentGrid.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();

            const gridItem = e.target.closest('.finder-folder-card, .finder-file-card');
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
                        size: node.size || (node.type === 'folder' ? '—' : (node.content ? `${new Blob([node.content]).size} B` : '0 B')),
                        tags: node.tags || [],
                        lastModified: node.lastModified
                    };
                }

                // Set selection active
                document.querySelectorAll('.finder-folder-card, .finder-file-card').forEach(i => i.classList.remove('active-select'));
                gridItem.classList.add('active-select');
                updatePropertiesPane(selectedFile);
                updateToolbarState();
            } else {
                document.querySelectorAll('.finder-folder-card, .finder-file-card').forEach(i => i.classList.remove('active-select'));
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
    
    if (viewGridBtn) {
        viewGridBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            currentView = 'grid';
            renderFolder();
        });
    }

    if (viewListBtn) {
        viewListBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            currentView = 'list';
            renderFolder();
        });
    }

    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            currentSort = e.target.value;
            renderFolder();
        });
    }
    
    if (renameBtn) {
        renameBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const selectedItem = document.querySelector('.finder-folder-card.active-select, .finder-file-card.active-select');
            if (selectedItem) {
                const name = selectedItem.querySelector('.finder-grid-label').textContent;
                const contents = window.VFS.listDirectory(currentFolder) || [];
                const node = contents.find(n => n.name === name);
                if (node) {
                    const file = {
                        name: node.name,
                        type: node.type === 'folder' ? 'folder' : getFileType(node.name),
                        content: node.content,
                        lastModified: node.lastModified,
                        parentPath: node.parentPath || currentFolder
                    };
                    renameFile(file);
                }
            }
        });
    }

    if (deleteBtn) {
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const selectedItem = document.querySelector('.finder-folder-card.active-select, .finder-file-card.active-select');
            if (selectedItem) {
                const name = selectedItem.querySelector('.finder-grid-label').textContent;
                const contents = window.VFS.listDirectory(currentFolder) || [];
                const node = contents.find(n => n.name === name);
                if (node) {
                    const file = {
                        name: node.name,
                        type: node.type === 'folder' ? 'folder' : getFileType(node.name),
                        content: node.content,
                        lastModified: node.lastModified,
                        parentPath: node.parentPath || currentFolder
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
        const activeSelect = document.querySelector('.finder-folder-card.active-select, .finder-file-card.active-select');
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
        const activeSelect = document.querySelector('.finder-folder-card.active-select, .finder-file-card.active-select');
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

    // Listen for custom folder navigation events (e.g. from topbar menus)
    document.addEventListener('navigate-folder', (e) => {
        const path = e.detail.path;
        if (!path) return;

        currentFolder = path;
        navigationHistory = [currentFolder];
        searchFilter = '';
        if (searchInput) searchInput.value = '';
        
        // Sync sidebar active state
        const category = path.split('/')[1]?.toLowerCase() || '';
        sidebarItems.forEach(item => {
            if (item.getAttribute('data-folder') === category) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        renderFolder();
        updatePropertiesPane(null);
    });

    // Tag addition and deletion delegation in Properties Pane
    if (propertiesContent) {
        propertiesContent.addEventListener('click', async (e) => {
            if (!lastSelectedFile) return;
            const parent = lastSelectedFile.parentPath || currentFolder;
            const filePath = parent === '/' ? `/${lastSelectedFile.name}` : `${parent}/${lastSelectedFile.name}`;
            const resolved = window.VFS.resolvePath(filePath);
            if (!resolved || !resolved.node) return;

            // Check if "+ Add Tag" is clicked
            if (e.target.id === 'add-tag-trigger' || e.target.textContent === '+ Add Tag') {
                e.stopPropagation();
                if (window.showDialog && window.showDialog.prompt) {
                    const newTag = await window.showDialog.prompt('Enter tag name (e.g. Work, Personal, Projects, Important):', '', 'Add Tag');
                    if (!newTag) return;
                    
                    if (!resolved.node.tags) resolved.node.tags = [];
                    if (!resolved.node.tags.includes(newTag)) {
                        resolved.node.tags.push(newTag);
                        resolved.node.lastModified = new Date().toLocaleString();
                        document.dispatchEvent(new CustomEvent('vfs-updated', { detail: { path: filePath } }));
                        if (window.showNotification) {
                            window.showNotification('Tag Added', `Added tag "${newTag}" to "${lastSelectedFile.name}"`, 'hgi-tag-01');
                        }
                    }
                }
            }

            // Check if tag badge is clicked (for deletion)
            const badge = e.target.closest('.file-tag-badge');
            if (badge) {
                e.stopPropagation();
                const tagToRemove = badge.getAttribute('data-tag');
                if (tagToRemove && resolved.node.tags) {
                    resolved.node.tags = resolved.node.tags.filter(t => t !== tagToRemove);
                    resolved.node.lastModified = new Date().toLocaleString();
                    document.dispatchEvent(new CustomEvent('vfs-updated', { detail: { path: filePath } }));
                    if (window.showNotification) {
                        window.showNotification('Tag Removed', `Removed tag "${tagToRemove}"`, 'hgi-tag-01');
                    }
                }
            }
        });
    }

    // Initial render and properties setup
    renderFolder();
    updatePropertiesPane(null);
}
