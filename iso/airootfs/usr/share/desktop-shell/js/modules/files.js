/* FELBIC OS — Files Explorer Module */

export function initFiles() {
    console.log('[felbicos] Initializing Files Module...');

    // Access dialog and VFS components
    const dialog = window.showDialog || {
        alert: async (msg) => alert(msg),
        confirm: async (msg) => confirm(msg),
        prompt: async (msg, def) => prompt(msg, def)
    };

    // State Variables
    let tabs = [
        {
            id: 'tab-default',
            name: 'Workspace',
            path: '/workspace',
            history: ['/workspace'],
            historyIndex: 0,
            currentView: 'grid', // grid, list, columns, gallery
            currentSort: 'name', // name, date, size
            searchFilter: '',
            searchType: 'all', // all, folders, images, audio, archives, code
            tagFilter: '',
            smartFilter: '', // null, recents, images, documents, code, trash
            selectedItem: null,
            scrollPos: 0
        }
    ];
    let activeTabId = 'tab-default';
    
    // Clipboard State
    let clipboard = {
        paths: [],
        action: 'copy' // copy, cut
    };

    // View Option Preferences
    let viewOptions = {
        iconSize: 64,
        gridSpacing: 12,
        showHidden: false,
        showItemInfo: true
    };

    // Dom elements
    const contentGrid = document.getElementById('finder-content-grid');
    const sidebarItems = document.querySelectorAll('.finder-sidebar .app-sidebar-item');
    const backBtn = document.getElementById('files-back-btn');
    const forwardBtn = document.getElementById('files-forward-btn');
    const breadcrumb = document.getElementById('files-breadcrumb');
    const searchInput = document.getElementById('files-search');

    const propertiesSidebar = document.getElementById('finder-properties-sidebar');
    const propertiesContent = document.getElementById('properties-content');
    const activePanelTab = 'details'; // details, activity

    // Toolbar actions
    const newFileBtn = document.getElementById('files-new-file');
    const newFolderBtn = document.getElementById('files-new-folder');
    const sortSelect = document.getElementById('files-sort');
    const toggleViewOptionsBtn = document.getElementById('files-toggle-view-options'); // Keep for sidebar if needed
    const closePropertiesBtn = document.getElementById('properties-close-btn');

    // New Dropdown Elements
    const actionsDropdown = document.getElementById('files-actions-dropdown');
    const viewDropdown = document.getElementById('files-view-dropdown');
    
    // Dropdown Item Proxies
    const renameBtn = document.getElementById('files-rename-dropdown');
    const deleteBtn = document.getElementById('files-delete-dropdown');
    const copyBtn = document.getElementById('files-copy-dropdown');
    const cutBtn = document.getElementById('files-cut-dropdown');
    const pasteBtn = document.getElementById('files-paste-dropdown');
    const duplicateBtn = document.getElementById('files-duplicate-dropdown');
    const quicklookBtn = document.getElementById('files-quicklook-dropdown');
    const getinfoBtn = document.getElementById('files-getinfo-dropdown');

    const viewGridBtn = document.getElementById('files-view-grid-dropdown');
    const viewListBtn = document.getElementById('files-view-list-dropdown');
    const viewColumnsBtn = document.getElementById('files-view-columns-dropdown');
    const viewGalleryBtn = document.getElementById('files-view-gallery-dropdown');
    const togglePropertiesBtn = document.getElementById('files-toggle-properties-dropdown');
    const toggleViewOptionsItem = document.getElementById('files-toggle-view-options-dropdown');

    const sortNameBtn = document.getElementById('files-sort-name-dropdown');
    const sortDateBtn = document.getElementById('files-sort-date-dropdown');
    const sortSizeBtn = document.getElementById('files-sort-size-dropdown');

    // Dropdown Toggling Logic
    document.querySelectorAll('.files-dropdown .files-nav-btn').forEach(trigger => {
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const parent = trigger.parentElement;
            const wasActive = parent.classList.contains('active');
            
            // Close all other dropdowns
            document.querySelectorAll('.files-dropdown').forEach(d => d.classList.remove('active'));
            
            if (!wasActive) parent.classList.add('active');
        });
    });

    // Close dropdowns on click outside
    document.addEventListener('click', () => {
        document.querySelectorAll('.files-dropdown').forEach(d => d.classList.remove('active'));
    });

    // Helper: get current active tab state object
    let contextMenu = document.getElementById('files-context-menu');
    if (!contextMenu) {
        contextMenu = document.createElement('div');
        contextMenu.id = 'files-context-menu';
        contextMenu.className = 'desktop-context-menu';
        document.body.appendChild(contextMenu);
    }

    // Helper: get current active tab state object
    function getActiveTab() {
        return tabs.find(t => t.id === activeTabId) || tabs[0];
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
            return { icon: 'hgi-figma', color: '#a855f7', label: 'figma Design' };
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

    // VFS Traversal Helper
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

    // RENDER: Main Folder Rendering Orchestrator
    function renderFolder() {
        if (!contentGrid) return;
        const tab = getActiveTab();
        
        // Synchronize toolbar navigation buttons
        backBtn.disabled = tab.historyIndex <= 0;
        forwardBtn.disabled = tab.historyIndex >= tab.history.length - 1;
        
        // Sync active view buttons
        [viewGridBtn, viewListBtn, viewColumnsBtn, viewGalleryBtn].forEach(btn => {
            if (btn) btn.classList.remove('active');
        });
        if (tab.currentView === 'grid' && viewGridBtn) viewGridBtn.classList.add('active');
        if (tab.currentView === 'list' && viewListBtn) viewListBtn.classList.add('active');
        if (tab.currentView === 'columns' && viewColumnsBtn) viewColumnsBtn.classList.add('active');
        if (tab.currentView === 'gallery' && viewGalleryBtn) viewGalleryBtn.classList.add('active');
        
        // Sync sort selection value
        if (sortSelect) sortSelect.value = tab.currentSort;

        // Render breadcrumbs
        renderBreadcrumb(tab.path);

        // Hide list view styling on container if not list
        const contentContainer = document.querySelector('.finder-content');
        if (contentContainer) {
            if (tab.currentView === 'list') contentContainer.classList.add('list-view');
            else contentContainer.classList.remove('list-view');
        }

        // Check if smart folder is selected
        let files = [];
        if (tab.smartFilter) {
            files = getSmartFolderFiles(tab.smartFilter);
        } else {
            // Load standard VFS contents
            const contents = tab.searchFilter ? getRecursiveNodes(tab.path) : (window.VFS.listDirectory(tab.path) || []);
            files = contents.map(node => ({
                name: node.name,
                type: node.type === 'folder' ? 'folder' : getFileType(node.name),
                content: node.content,
                size: node.size || (node.type === 'folder' ? '—' : (node.content ? `${new Blob([node.content]).size} B` : '0 B')),
                tags: node.tags || [],
                lastModified: node.lastModified,
                parentPath: node.parentPath || tab.path
            }));
        }

        // Apply filters
        // Hidden files filter
        if (!viewOptions.showHidden) {
            files = files.filter(f => !f.name.startsWith('.'));
        }

        // Tag filter
        if (tab.tagFilter) {
            files = files.filter(f => f.tags && f.tags.includes(tab.tagFilter));
        }

        // Search bar filter (supports regex and content search)
        if (tab.searchFilter) {
            const query = tab.searchFilter.trim();
            const isRegex = query.startsWith('/') && query.endsWith('/');
            let regex = null;
            if (isRegex) {
                try {
                    regex = new RegExp(query.slice(1, -1), 'i');
                } catch (e) {
                    regex = null;
                }
            }

            files = files.filter(f => {
                // Name match
                const nameMatch = regex ? regex.test(f.name) : f.name.toLowerCase().includes(query.toLowerCase());
                if (nameMatch) return true;

                // Content match (Search-in-contents)
                if (f.type !== 'folder' && f.content) {
                    const textContent = f.content.toString();
                    return regex ? regex.test(textContent) : textContent.toLowerCase().includes(query.toLowerCase());
                }
                return false;
            });
        }

        // Sort items (directories always grouped on top)
        files.sort((a, b) => {
            if (a.type === 'folder' && b.type !== 'folder') return -1;
            if (a.type !== 'folder' && b.type === 'folder') return 1;
            
            if (tab.currentSort === 'name') {
                return a.name.localeCompare(b.name);
            } else if (tab.currentSort === 'date') {
                return getTimestamp(b) - getTimestamp(a);
            } else if (tab.currentSort === 'size') {
                return getNumericSize(b) - getNumericSize(a);
            }
            return 0;
        });

        // Clear contents
        contentGrid.innerHTML = '';

        // Dispatch view-specific renderers
        if (tab.currentView === 'grid') {
            renderGridView(files);
        } else if (tab.currentView === 'list') {
            renderListView(files);
        } else if (tab.currentView === 'columns') {
            renderColumnView(tab.path);
        } else if (tab.currentView === 'gallery') {
            renderGalleryView(files);
        }

        updateToolbarState();
        renderTabs();
    }

    // Dynamic Breadcrumb
    function renderBreadcrumb(path) {
        if (!breadcrumb) return;
        const parts = path.split('/').filter(p => p !== '');
        
        breadcrumb.innerHTML = '';
        
        const rootSpan = document.createElement('span');
        rootSpan.className = 'breadcrumb-segment';
        rootSpan.textContent = 'Root';
        rootSpan.style.cursor = 'pointer';
        rootSpan.addEventListener('click', () => navigateToPath('/'));
        breadcrumb.appendChild(rootSpan);

        let activeAccumPath = '';
        parts.forEach(part => {
            activeAccumPath += '/' + part;
            
            const divider = document.createElement('span');
            divider.style.display = 'inline-flex';
            divider.style.alignItems = 'center';
            divider.style.margin = '0 6px';
            divider.innerHTML = '<i class="hgi-stroke hgi-arrow-right-01" style="font-size: 10px; opacity: 0.5;"></i>';
            breadcrumb.appendChild(divider);

            const segmentSpan = document.createElement('span');
            segmentSpan.className = 'breadcrumb-segment';
            segmentSpan.textContent = part.charAt(0).toUpperCase() + part.slice(1);
            segmentSpan.style.cursor = 'pointer';
            const targetPath = activeAccumPath;
            segmentSpan.addEventListener('click', () => navigateToPath(targetPath));
            breadcrumb.appendChild(segmentSpan);
        });
    }

    // Smart Folder File Collectors
    function getSmartFolderFiles(type) {
        const rootNodes = getRecursiveNodes('/');
        if (type === 'recents') {
            return rootNodes.filter(n => n.type === 'file').map(n => ({
                ...n,
                type: getFileType(n.name)
            })).sort((a,b) => getTimestamp(b) - getTimestamp(a)).slice(0, 30);
        } else if (type === 'images') {
            return rootNodes.filter(n => ['png','jpg','jpeg','fig','sketch','gif'].includes(n.name.split('.').pop().toLowerCase())).map(n => ({
                ...n,
                type: 'image'
            }));
        } else if (type === 'documents') {
            return rootNodes.filter(n => ['pdf','xlsx','xls','csv','pptx','txt','md'].includes(n.name.split('.').pop().toLowerCase())).map(n => ({
                ...n,
                type: getFileType(n.name)
            }));
        } else if (type === 'code') {
            return rootNodes.filter(n => ['js','py','c','rs','sh','html','css','conf','makefile'].includes(n.name.split('.').pop().toLowerCase())).map(n => ({
                ...n,
                type: getFileType(n.name)
            }));
        } else if (type === 'trash') {
            // Trash VFS folder list
            if (!window.VFS.exists('/Trash')) {
                window.VFS.mkdir('/', 'Trash');
            }
            return (window.VFS.listDirectory('/Trash') || []).map(n => ({
                ...n,
                type: n.type === 'folder' ? 'folder' : getFileType(n.name),
                parentPath: '/Trash'
            }));
        }
        return [];
    }

    // RENDER: Grid View
    function renderGridView(files) {
        if (files.length === 0) {
            contentGrid.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding-top: 40px; width: 100%;">No items found</div>`;
            return;
        }

        // Folders section
        const folders = files.filter(f => f.type === 'folder');
        const normalFiles = files.filter(f => f.type !== 'folder');

        if (folders.length > 0) {
            const heading = document.createElement('div');
            heading.className = 'finder-section-header';
            heading.textContent = 'Folders';
            contentGrid.appendChild(heading);

            const grid = document.createElement('div');
            grid.className = 'finder-folders-grid';
            grid.style.display = 'grid';
            grid.style.gridTemplateColumns = `repeat(auto-fill, minmax(${viewOptions.iconSize + 28}px, 1fr))`;
            grid.style.gap = `${viewOptions.gridSpacing}px`;
            grid.style.marginBottom = '20px';
            contentGrid.appendChild(grid);

            folders.forEach(file => {
                const item = document.createElement('div');
                item.className = 'finder-folder-card';
                item.setAttribute('draggable', 'true');
                item.style.width = '100%';
                item.style.padding = '8px';
                item.style.display = 'flex';
                item.style.flexDirection = 'column';
                item.style.alignItems = 'center';
                
                const childrenCount = window.VFS.listDirectory((file.parentPath === '/' ? '' : file.parentPath) + '/' + file.name)?.length || 0;
                const infoLabel = viewOptions.showItemInfo ? `<span style="font-size: 9px; opacity:0.6; margin-top:2px;">${childrenCount} items</span>` : '';

                item.innerHTML = `
                    <span class="finder-grid-icon" style="color: #3b82f6; font-size: ${viewOptions.iconSize / 2}px; display: flex; align-items:center;"><i class="hgi-stroke hgi-folder-01"></i></span>
                    <span class="finder-grid-label" style="font-size: 11px; margin-top: 6px; text-align:center; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; width:100%;">${file.name}</span>
                    ${infoLabel}
                `;
                bindItemEvents(item, file);
                grid.appendChild(item);
            });
        }

        if (normalFiles.length > 0) {
            const heading = document.createElement('div');
            heading.className = 'finder-section-header';
            heading.textContent = 'Files';
            contentGrid.appendChild(heading);

            const grid = document.createElement('div');
            grid.className = 'finder-files-grid';
            grid.style.display = 'grid';
            grid.style.gridTemplateColumns = `repeat(auto-fill, minmax(${viewOptions.iconSize + 28}px, 1fr))`;
            grid.style.gap = `${viewOptions.gridSpacing}px`;
            contentGrid.appendChild(grid);

            normalFiles.forEach(file => {
                const info = getFileInfo(file.name);
                const item = document.createElement('div');
                item.className = 'finder-file-card';
                item.setAttribute('draggable', 'true');
                item.style.width = '100%';
                item.style.padding = '8px';
                item.style.display = 'flex';
                item.style.flexDirection = 'column';
                item.style.alignItems = 'center';

                const infoLabel = viewOptions.showItemInfo ? `<span style="font-size: 9px; opacity:0.6; margin-top:2px;">${file.size}</span>` : '';

                item.innerHTML = `
                    <span class="finder-grid-icon" style="color: ${info.color}; font-size: ${viewOptions.iconSize / 2}px; display: flex; align-items:center;"><i class="hgi-stroke ${info.icon}"></i></span>
                    <span class="finder-grid-label" title="${file.name}" style="font-size: 11px; margin-top: 6px; text-align:center; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; width:100%;">${file.name}</span>
                    ${infoLabel}
                `;
                bindItemEvents(item, file);
                grid.appendChild(item);
            });
        }
    }

    // RENDER: List View
    function renderListView(files) {
        if (files.length === 0) {
            contentGrid.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding-top: 40px; width: 100%;">No items found</div>`;
            return;
        }

        const table = document.createElement('table');
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        table.style.fontSize = 'var(--font-size-xs)';
        table.style.color = 'var(--text-primary)';

        table.innerHTML = `
            <thead>
                <tr style="border-bottom: 1px solid var(--border-default); text-align: left; color: var(--text-muted); font-size: 10px;">
                    <th style="padding: 6px 12px; font-weight: 600;">Name</th>
                    <th style="padding: 6px 12px; font-weight: 600; text-align: right; width: 100px;">Size</th>
                    <th style="padding: 6px 12px; font-weight: 600; width: 120px;">Type</th>
                    <th style="padding: 6px 12px; font-weight: 600; width: 160px; text-align: right;">Date Modified</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;

        const tbody = table.querySelector('tbody');
        files.forEach(file => {
            const row = document.createElement('tr');
            row.className = file.type === 'folder' ? 'finder-folder-card' : 'finder-file-card';
            row.setAttribute('draggable', 'true');
            row.style.borderBottom = '1px solid var(--border-subtle)';
            row.style.cursor = 'pointer';

            const info = getFileInfo(file.name);
            const iconHtml = file.type === 'folder' ? 
                `<span style="color: #3b82f6; display: flex; align-items:center;"><i class="hgi-stroke hgi-folder-01"></i></span>` :
                `<span style="color: ${info.color}; display: flex; align-items:center;"><i class="hgi-stroke ${info.icon}"></i></span>`;

            row.innerHTML = `
                <td style="padding: 6px 12px; display: flex; align-items: center; gap: 8px; font-weight: 500;">
                    ${iconHtml}
                    <span class="finder-grid-label" style="text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${file.name}</span>
                </td>
                <td style="padding: 6px 12px; text-align: right; color: var(--text-secondary);">${file.size}</td>
                <td style="padding: 6px 12px; color: var(--text-secondary);">${file.type === 'folder' ? 'Folder' : info.label}</td>
                <td style="padding: 6px 12px; text-align: right; color: var(--text-secondary);">${formatMetaDate(file.lastModified)}</td>
            `;

            bindItemEvents(row, file);
            tbody.appendChild(row);
        });

        contentGrid.appendChild(table);
    }

    // RENDER: Miller Columns View
    function renderColumnView(path) {
        const columnsContainer = document.createElement('div');
        columnsContainer.className = 'finder-columns-view';
        contentGrid.appendChild(columnsContainer);

        // Deconstruct current path to navigate columns
        const segments = path.split('/').filter(s => s !== '');
        const pathsList = ['/'];
        let accum = '';
        segments.forEach(seg => {
            accum += '/' + seg;
            pathsList.push(accum);
        });

        // Load columns recursively
        pathsList.forEach((colPath, idx) => {
            const column = document.createElement('div');
            column.className = 'finder-column';
            columnsContainer.appendChild(column);

            const items = window.VFS.listDirectory(colPath) || [];
            if (items.length === 0) {
                column.innerHTML = `<span style="font-size:10px; color:var(--text-muted); padding: 8px; text-align:center;">Empty</span>`;
                return;
            }

            // Group folders first
            const folders = items.filter(i => i.type === 'folder').sort((a,b) => a.name.localeCompare(b.name));
            const filesList = items.filter(i => i.type !== 'folder').sort((a,b) => a.name.localeCompare(b.name));
            const sortedItems = [...folders, ...filesList];

            sortedItems.forEach(node => {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'finder-column-item';
                
                // Check if this item lies on our active path route
                const isFolder = node.type === 'folder';
                const nodeFullPath = colPath === '/' ? `/${node.name}` : `${colPath}/${node.name}`;
                const isActive = (pathsList[idx + 1] === nodeFullPath) || (path === nodeFullPath);

                if (isActive) itemDiv.classList.add('active');

                const info = getFileInfo(node.name);
                const iconClass = isFolder ? 'hgi-folder-01' : info.icon;
                const iconColor = isFolder ? '#3b82f6' : info.color;

                const arrowHtml = isFolder ? `<span class="finder-column-item-arrow">▶</span>` : '';

                itemDiv.innerHTML = `
                    <div class="finder-column-item-left">
                        <span style="color: ${iconColor}; display: flex; align-items:center;"><i class="hgi-stroke ${iconClass}"></i></span>
                        <span class="finder-grid-label" style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${node.name}</span>
                    </div>
                    ${arrowHtml}
                `;

                // Single Click: updates selection route and re-navigates subcolumns
                itemDiv.addEventListener('click', (e) => {
                    e.stopPropagation();
                    
                    const tab = getActiveTab();
                    tab.selectedItem = {
                        name: node.name,
                        type: isFolder ? 'folder' : getFileType(node.name),
                        content: node.content,
                        size: node.size || (isFolder ? '—' : (node.content ? `${new Blob([node.content]).size} B` : '0 B')),
                        tags: node.tags || [],
                        lastModified: node.lastModified,
                        parentPath: colPath
                    };

                    updatePropertiesPane(tab.selectedItem);

                    if (isFolder) {
                        navigateToPath(nodeFullPath);
                    } else {
                        // For files, select without changing active tab directory path, but force rendering preview column
                        renderColumnViewPreview(column, tab.selectedItem);
                    }
                });

                // Double click: open editor/folder
                itemDiv.addEventListener('dblclick', (e) => {
                    e.stopPropagation();
                    if (!isFolder) {
                        openFile({
                            name: node.name,
                            parentPath: colPath,
                            content: node.content || ''
                        });
                    }
                });

                // Context Menu trigger
                itemDiv.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    const mappedNode = {
                        name: node.name,
                        type: isFolder ? 'folder' : getFileType(node.name),
                        content: node.content,
                        size: node.size || (isFolder ? '—' : (node.content ? `${new Blob([node.content]).size} B` : '0 B')),
                        tags: node.tags || [],
                        lastModified: node.lastModified,
                        parentPath: colPath
                    };
                    
                    triggerItemContextMenu(e, mappedNode);
                });

                column.appendChild(itemDiv);
            });
        });

        // Auto scroll to rightmost column
        setTimeout(() => {
            columnsContainer.scrollLeft = columnsContainer.scrollWidth;
        }, 30);
    }

    // Render Miller columns rightmost file preview pane
    function renderColumnViewPreview(activeColumn, file) {
        // Clean columns to the right of activeColumn
        let sibling = activeColumn.nextElementSibling;
        while (sibling) {
            const next = sibling.nextElementSibling;
            sibling.remove();
            sibling = next;
        }

        const previewPane = document.createElement('div');
        previewPane.className = 'column-preview-pane';
        activeColumn.parentNode.appendChild(previewPane);

        const info = getFileInfo(file.name);
        const kindLabel = info.label;

        previewPane.innerHTML = `
            <span class="preview-large-icon" style="color: ${info.color};"><i class="hgi-stroke ${info.icon}"></i></span>
            <span class="preview-title">${file.name}</span>
            <span style="font-size:10px; color:var(--text-muted);">${kindLabel}</span>
            
            <div class="preview-meta-table">
                <div class="preview-meta-row"><span class="preview-meta-label">Size</span><span class="preview-meta-val">${file.size}</span></div>
                <div class="preview-meta-row"><span class="preview-meta-label">Location</span><span class="preview-meta-val">${file.parentPath}/${file.name}</span></div>
                <div class="preview-meta-row"><span class="preview-meta-label">Modified</span><span class="preview-meta-val">${formatMetaDate(file.lastModified)}</span></div>
            </div>

            <div style="display: flex; gap: 8px; margin-top: 12px; width: 100%;">
                <button id="column-btn-open" class="files-nav-btn" style="flex:1; width:auto; height:28px; font-size:11px; font-weight:600;">Open</button>
                <button id="column-btn-quick" class="files-nav-btn" style="flex:1; width:auto; height:28px; font-size:11px; font-weight:600; background-color: var(--accent-soft); color: var(--accent-primary); border-color: var(--accent-primary);">Quick Look</button>
            </div>
        `;

        previewPane.querySelector('#column-btn-open').addEventListener('click', () => openFile(file));
        previewPane.querySelector('#column-btn-quick').addEventListener('click', () => toggleQuickLook(file));

        // Auto scroll
        setTimeout(() => {
            activeColumn.parentNode.scrollLeft = activeColumn.parentNode.scrollWidth;
        }, 30);
    }

    // RENDER: Gallery View
    function renderGalleryView(files) {
        if (files.length === 0) {
            contentGrid.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding-top: 40px; width: 100%;">No items found</div>`;
            return;
        }

        const tab = getActiveTab();
        
        // Find selected item or default to first file
        let selected = tab.selectedItem;
        if (!selected || !files.find(f => f.name === selected.name)) {
            selected = files[0];
            tab.selectedItem = selected;
        }

        const galleryContainer = document.createElement('div');
        galleryContainer.className = 'finder-gallery-view';
        contentGrid.appendChild(galleryContainer);

        // Preview zone
        const previewZone = document.createElement('div');
        previewZone.className = 'gallery-preview-zone';
        galleryContainer.appendChild(previewZone);

        const info = getFileInfo(selected.name);
        const kindLabel = selected.type === 'folder' ? 'Folder' : info.label;

        // Render preview zone media layout
        let previewWidgetHtml = '';
        if (selected.type === 'folder') {
            previewWidgetHtml = `<span style="font-size: 72px; color: #3b82f6;"><i class="hgi-stroke hgi-folder-01"></i></span>`;
        } else if (['png','jpg','jpeg','gif'].includes(selected.name.split('.').pop().toLowerCase())) {
            previewWidgetHtml = `<div style="width: 140px; height: 110px; background: var(--surface-1); border-radius:var(--radius-sm); border:1px solid var(--border-default); display:flex; align-items:center; justify-content:center; color: var(--text-muted);"><i class="hgi-stroke hgi-image-01" style="font-size: 48px;"></i></div>`;
        } else if (['mp3','wav','ogg'].includes(selected.name.split('.').pop().toLowerCase())) {
            previewWidgetHtml = `
                <div style="display:flex; flex-direction:column; align-items:center; gap: 8px; width:200px; background:var(--surface-1); padding: 12px; border-radius: var(--radius-sm); border:1px solid var(--border-default);">
                    <span style="font-size:32px; color: #ec4899;"><i class="hgi-stroke hgi-music-note-01"></i></span>
                    <strong style="font-size:11px; word-break:break-all; text-align:center; width:100%;">${selected.name}</strong>
                    <!-- Audio controls simulation -->
                    <div style="display:flex; gap:10px; align-items:center; margin-top:4px;">
                        <button class="files-nav-btn" style="width:24px; height:24px; font-size:9px;" onclick="alert('Playing record...')">▶</button>
                        <div style="width:80px; height:3px; background: var(--border-default); border-radius:2px; position:relative;"><div style="position:absolute; width:40%; height:100%; background: var(--accent-primary); left:0; top:0;"></div></div>
                    </div>
                </div>
            `;
        } else {
            // Monospace code snippet
            const snippet = selected.content ? selected.content.toString().slice(0, 150) + '...' : '[Empty File]';
            previewWidgetHtml = `
                <pre style="width:80%; max-height:110px; overflow-y:auto; background: var(--surface-1); border:1px solid var(--border-default); padding: 10px; border-radius:var(--radius-sm); font-family:var(--font-mono); font-size:10px; text-align:left; color: var(--text-primary); box-sizing:border-box; margin:0;">${escapeHtml(snippet)}</pre>
            `;
        }

        previewZone.innerHTML = `
            <div style="flex:1; display:flex; align-items:center; justify-content:center;">
                ${previewWidgetHtml}
            </div>
            <span style="font-size:14px; font-weight:700; color:var(--text-primary); margin-top:8px;">${selected.name}</span>
            <span style="font-size:10px; color:var(--text-muted); margin-bottom:8px;">${kindLabel} — ${selected.size}</span>
        `;

        // Bottom carousel thumbnails list
        const carousel = document.createElement('div');
        carousel.className = 'gallery-carousel';
        galleryContainer.appendChild(carousel);

        files.forEach(file => {
            const card = document.createElement('div');
            card.className = 'gallery-card';
            if (file.name === selected.name) card.classList.add('active');

            const fInfo = getFileInfo(file.name);
            const iconClass = file.type === 'folder' ? 'hgi-folder-01' : fInfo.icon;
            const iconColor = file.type === 'folder' ? '#3b82f6' : fInfo.color;

            card.innerHTML = `
                <span class="gallery-card-icon" style="color: ${iconColor}; display: flex; align-items:center;"><i class="hgi-stroke ${iconClass}"></i></span>
                <span class="gallery-card-label">${file.name}</span>
            `;

            card.addEventListener('click', (e) => {
                e.stopPropagation();
                tab.selectedItem = file;
                updatePropertiesPane(file);
                renderFolder();
            });

            // Double click: open
            card.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                if (file.type !== 'folder') openFile(file);
            });

            // Context menu
            card.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                e.stopPropagation();
                triggerItemContextMenu(e, file);
            });

            carousel.appendChild(card);
        });

        // Center active thumbnail in carousel scroll
        setTimeout(() => {
            const activeCard = carousel.querySelector('.gallery-card.active');
            if (activeCard) {
                carousel.scrollLeft = activeCard.offsetLeft - (carousel.clientWidth / 2) + (activeCard.clientWidth / 2);
            }
        }, 30);
    }

    // Escape HTML Helper
    function escapeHtml(unsafe) {
        return unsafe
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
    }

    // MULTI-TAB CONTROLLERS
    function renderTabs() {
        const tabList = document.getElementById('finder-tabs-list');
        const addTabBtn = document.getElementById('finder-add-tab');
        if (!tabList) return;

        tabList.innerHTML = '';
        tabs.forEach(t => {
            const tabEl = document.createElement('div');
            tabEl.className = 'finder-tab';
            if (t.id === activeTabId) tabEl.classList.add('active');

            const tabIconClass = t.smartFilter === 'trash' ? 'hgi-delete-01' : 'hgi-folder-01';

            tabEl.innerHTML = `
                <span style="display:flex; align-items:center;"><i class="hgi-stroke ${tabIconClass}"></i></span>
                <span class="tab-title" style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${t.name}</span>
                <span class="tab-close-btn" title="Close Tab">×</span>
            `;

            // Switch to tab
            tabEl.addEventListener('click', (e) => {
                if (e.target.classList.contains('tab-close-btn')) {
                    e.stopPropagation();
                    closeTab(t.id);
                    return;
                }
                activeTabId = t.id;
                
                // Load search filter
                if (searchInput) searchInput.value = t.searchFilter;
                
                // Clear selection states
                document.querySelectorAll('.finder-folder-card, .finder-file-card').forEach(i => i.classList.remove('active-select'));
                updatePropertiesPane(null);
                
                renderFolder();
            });

            tabList.appendChild(tabEl);
        });

        // Add tab binding
        if (addTabBtn) {
            addTabBtn.onclick = (e) => {
                e.stopPropagation();
                createNewTab();
            };
        }
    }

    function createNewTab(path = '/workspace', name = 'Workspace') {
        const id = 'tab-' + Date.now();
        const activeTab = getActiveTab();
        
        // Inherit current path and view options
        tabs.push({
            id: id,
            name: name,
            path: path,
            history: [path],
            historyIndex: 0,
            currentView: activeTab ? activeTab.currentView : 'grid',
            currentSort: activeTab ? activeTab.currentSort : 'name',
            searchFilter: '',
            searchType: 'all',
            tagFilter: '',
            smartFilter: '',
            selectedItem: null,
            scrollPos: 0
        });

        activeTabId = id;
        if (searchInput) searchInput.value = '';
        renderFolder();
    }

    function closeTab(id) {
        if (tabs.length <= 1) return; // Keep at least one tab
        const idx = tabs.findIndex(t => t.id === id);
        
        tabs = tabs.filter(t => t.id !== id);
        
        if (activeTabId === id) {
            // Select nearest tab
            const nextActive = tabs[idx] || tabs[idx - 1] || tabs[0];
            activeTabId = nextActive.id;
            if (searchInput) searchInput.value = nextActive.searchFilter;
        }

        renderFolder();
    }

    function navigateToPath(targetPath) {
        const tab = getActiveTab();
        
        // Remove forward history
        tab.history = tab.history.slice(0, tab.historyIndex + 1);
        tab.history.push(targetPath);
        tab.historyIndex = tab.history.length - 1;
        tab.path = targetPath;
        tab.smartFilter = '';
        tab.selectedItem = null;
        
        // Update tab display name
        tab.name = targetPath.split('/').pop() || 'Root';

        // Sync sidebar active highlight
        const topLevel = targetPath.split('/')[1]?.toLowerCase() || '';
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

    // Properties Pane Details layout
    function updatePropertiesPane(file) {
        const tab = getActiveTab();
        tab.selectedItem = file;
        if (!propertiesContent) return;

        const isFolderContext = !file;
        const name = isFolderContext ? (tab.path.split('/').pop() || 'Workspace') : file.name;
        const typeStr = isFolderContext ? 'Folder' : getFileInfo(file.name).label;
        const sizeStr = isFolderContext ? '—' : file.size;
        const iconClass = isFolderContext ? 'hgi-folder-01' : getFileInfo(file.name).icon;
        const iconColor = isFolderContext ? '#3b82f6' : getFileInfo(file.name).color;
        const tags = isFolderContext ? [] : (file.tags || []);
        const modified = isFolderContext ? '—' : (file.lastModified || '—');
        const created = isFolderContext ? '—' : '—';

        // Update properties header title
        const propertiesTitle = document.getElementById('properties-title');
        if (propertiesTitle) {
            propertiesTitle.textContent = isFolderContext ? 'Folder Info' : 'File Info';
        }

        const tagsHtml = tags.map(tag => {
            let dotColor = '#ef4444';
            if (tag === 'Personal') dotColor = '#10b981';
            else if (tag === 'Projects') dotColor = '#a855f7';
            else if (tag === 'Important') dotColor = '#f59e0b';
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
                        <span style="color: var(--text-primary); font-weight: 500; font-family: var(--font-mono); font-size: 9px; word-break: break-all;">${isFolderContext ? tab.path : (file.parentPath || tab.path)}</span>
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
                    ${!isFolderContext ? '<span id="add-tag-trigger" style="font-size: 9px; color: var(--color-accent); cursor: pointer; font-weight: 600; margin-top: 4px; display: inline-block;">+ Add Tag</span>' : ''}
                </div>
            </div>
        `;
    }

    // Toggle disabled toolbar actions based on selection
    function updateToolbarState() {
        const selectedItem = document.querySelector('.finder-folder-card.active-select, .finder-file-card.active-select');
        const tab = getActiveTab();
        const hasSelection = selectedItem || tab.selectedItem;

        const actionBtns = [renameBtn, deleteBtn, copyBtn, cutBtn, duplicateBtn, quicklookBtn, getinfoBtn];
        
        actionBtns.forEach(btn => {
            if (btn) {
                if (hasSelection) btn.classList.remove('disabled');
                else btn.classList.add('disabled');
            }
        });
    }

    // Bind selection & drag events to rendered grid/list cards
    function bindItemEvents(item, file) {
        const tab = getActiveTab();

        // Selection
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.finder-folder-card, .finder-file-card').forEach(i => i.classList.remove('active-select'));
            item.classList.add('active-select');
            
            tab.selectedItem = file;
            updatePropertiesPane(file);
            updateToolbarState();
        });

        // Navigation (Double Click)
        item.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            if (file.type === 'folder') {
                const parent = file.parentPath || tab.path;
                const nextFolder = parent === '/' ? `/${file.name}` : `${parent}/${file.name}`;
                navigateToPath(nextFolder);
            } else {
                openFile(file);
            }
        });

        // Drag start
        item.addEventListener('dragstart', (e) => {
            const itemPath = (file.parentPath === '/' ? '' : file.parentPath) + '/' + file.name;
            e.dataTransfer.setData('text/plain', itemPath);
            e.dataTransfer.effectAllowed = 'move';
            item.classList.add('dragging');
        });

        item.addEventListener('dragend', () => {
            item.classList.remove('dragging');
        });

        // Context menu right-clicks
        item.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            document.querySelectorAll('.finder-folder-card, .finder-file-card').forEach(i => i.classList.remove('active-select'));
            item.classList.add('active-select');
            tab.selectedItem = file;
            updatePropertiesPane(file);
            updateToolbarState();

            triggerItemContextMenu(e, file);
        });
    }

    // Open file in Editor
    function openFile(file) {
        const parent = file.parentPath || getActiveTab().path;
        const fullPath = parent === '/' ? `/${file.name}` : `${parent}/${file.name}`;
        
        // Dispatch custom open-file event
        const openEvent = new CustomEvent('open-file', {
            detail: {
                name: file.name,
                path: fullPath,
                content: file.content || ''
            }
        });
        document.dispatchEvent(openEvent);
    }

    // CONTEXT MENUS TRIGGER
    function triggerItemContextMenu(e, file) {
        const tab = getActiveTab();
        
        let trashActionHtml = `<div class="menu-item" id="files-menu-trash"><i class="hgi-stroke hgi-delete-02"></i> Move to Trash</div>`;
        if (tab.smartFilter === 'trash' || file.parentPath === '/Trash') {
            trashActionHtml = `
                <div class="menu-item" id="files-menu-putback"><i class="hgi-stroke hgi-refresh"></i> Put Back</div>
                <div class="menu-item" id="files-menu-delete-perm" style="color: #ef4444;"><i class="hgi-stroke hgi-delete-02"></i> Delete Immediately</div>
            `;
        }

        contextMenu.innerHTML = `
            <div class="menu-item" id="files-menu-open"><i class="hgi-stroke hgi-folder-open"></i> Open</div>
            <div class="menu-item" id="files-menu-quicklook"><i class="hgi-stroke hgi-view-card"></i> Quick Look</div>
            <div class="menu-item" id="files-menu-rename"><i class="hgi-stroke hgi-edit-01"></i> Rename (Enter)</div>
            <div class="menu-divider"></div>
            <div class="menu-item" id="files-menu-copy"><i class="hgi-stroke hgi-copy"></i> Copy (Cmd+C)</div>
            <div class="menu-item" id="files-menu-cut"><i class="hgi-stroke hgi-cut"></i> Cut (Cmd+X)</div>
            <div class="menu-item" id="files-menu-duplicate"><i class="hgi-stroke hgi-document-copy"></i> Duplicate</div>
            <div class="menu-item" id="files-menu-alias"><i class="hgi-stroke hgi-link-02"></i> Create Alias</div>
            <div class="menu-divider"></div>
            <div class="menu-item" id="files-menu-compress"><i class="hgi-stroke hgi-package"></i> Compress</div>
            ${file.name.endsWith('.zip') ? '<div class="menu-item" id="files-menu-uncompress"><i class="hgi-stroke hgi-package-open"></i> Uncompress</div>' : ''}
            <div class="menu-divider"></div>
            ${trashActionHtml}
            <div class="menu-divider"></div>
            <div class="menu-item" id="files-menu-info"><i class="hgi-stroke hgi-information-circle"></i> Get Info</div>
            <div class="menu-divider"></div>
            <div class="menu-tags-row" style="display:flex; justify-content:space-around; padding: 4px 8px;">
                <span class="tag-color-btn" data-color="Work" style="background:#ef4444; width:14px; height:14px; border-radius:50%; cursor:pointer;"></span>
                <span class="tag-color-btn" data-color="Personal" style="background:#10b981; width:14px; height:14px; border-radius:50%; cursor:pointer;"></span>
                <span class="tag-color-btn" data-color="Projects" style="background:#a855f7; width:14px; height:14px; border-radius:50%; cursor:pointer;"></span>
                <span class="tag-color-btn" data-color="Important" style="background:#f59e0b; width:14px; height:14px; border-radius:50%; cursor:pointer;"></span>
            </div>
        `;

        positionContextMenu(e);

        // Events
        document.getElementById('files-menu-open').onclick = () => {
            contextMenu.classList.remove('active');
            if (file.type === 'folder') {
                navigateToPath((file.parentPath === '/' ? '' : file.parentPath) + '/' + file.name);
            } else {
                openFile(file);
            }
        };

        document.getElementById('files-menu-quicklook').onclick = () => {
            contextMenu.classList.remove('active');
            toggleQuickLook(file);
        };

        document.getElementById('files-menu-rename').onclick = () => {
            contextMenu.classList.remove('active');
            triggerInlineRename(file);
        };

        document.getElementById('files-menu-copy').onclick = () => {
            contextMenu.classList.remove('active');
            copyToClipboard([file], 'copy');
        };

        document.getElementById('files-menu-cut').onclick = () => {
            contextMenu.classList.remove('active');
            copyToClipboard([file], 'cut');
        };

        document.getElementById('files-menu-duplicate').onclick = () => {
            contextMenu.classList.remove('active');
            duplicateNode(file);
        };

        document.getElementById('files-menu-alias').onclick = () => {
            contextMenu.classList.remove('active');
            createAlias(file);
        };

        document.getElementById('files-menu-compress').onclick = () => {
            contextMenu.classList.remove('active');
            compressNode(file);
        };

        const uncompressBtn = document.getElementById('files-menu-uncompress');
        if (uncompressBtn) {
            uncompressBtn.onclick = () => {
                contextMenu.classList.remove('active');
                uncompressNode(file);
            };
        }

        if (document.getElementById('files-menu-trash')) {
            document.getElementById('files-menu-trash').onclick = () => {
                contextMenu.classList.remove('active');
                moveToTrash(file);
            };
        }

        if (document.getElementById('files-menu-putback')) {
            document.getElementById('files-menu-putback').onclick = () => {
                contextMenu.classList.remove('active');
                putBackFromTrash(file);
            };
        }

        if (document.getElementById('files-menu-delete-perm')) {
            document.getElementById('files-menu-delete-perm').onclick = () => {
                contextMenu.classList.remove('active');
                deleteFilePermanently(file);
            };
        }

        document.getElementById('files-menu-info').onclick = () => {
            contextMenu.classList.remove('active');
            openGetInfoWindow(file);
        };

        // Tag color dots onclick
        contextMenu.querySelectorAll('.tag-color-btn').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                contextMenu.classList.remove('active');
                const tagColor = btn.getAttribute('data-color');
                assignTag(file, tagColor);
            };
        });
    }

    function triggerEmptyAreaContextMenu(e) {
        const tab = getActiveTab();
        
        let pasteDisabledHtml = clipboard.paths.length === 0 ? 'opacity:0.5; pointer-events:none;' : '';
        let emptyTrashHtml = tab.path === '/Trash' || tab.smartFilter === 'trash' ? `
            <div class="menu-divider"></div>
            <div class="menu-item" id="files-menu-empty" style="color: #ef4444;"><i class="hgi-stroke hgi-delete-01"></i> Empty Trash</div>
        ` : '';

        contextMenu.innerHTML = `
            <div class="menu-item" id="files-menu-new-file"><i class="hgi-stroke hgi-file-add"></i> New File</div>
            <div class="menu-item" id="files-menu-new-folder"><i class="hgi-stroke hgi-folder-add"></i> New Folder</div>
            <div class="menu-item" id="files-menu-paste" style="${pasteDisabledHtml}"><i class="hgi-stroke hgi-clipboard"></i> Paste (Cmd+V)</div>
            <div class="menu-divider"></div>
            <div class="menu-item" id="files-menu-view-grid"><i class="hgi-stroke hgi-grid-view"></i> Grid View</div>
            <div class="menu-item" id="files-menu-view-list"><i class="hgi-stroke hgi-menu-01"></i> List View</div>
            <div class="menu-item" id="files-menu-view-columns"><i class="hgi-stroke hgi-layout-column"></i> Column View</div>
            <div class="menu-item" id="files-menu-view-gallery"><i class="hgi-stroke hgi-image-02"></i> Gallery View</div>
            ${emptyTrashHtml}
        `;

        positionContextMenu(e);

        // Bindings
        document.getElementById('files-menu-new-file').onclick = () => {
            contextMenu.classList.remove('active');
            createNewFilePrompt();
        };
        document.getElementById('files-menu-new-folder').onclick = () => {
            contextMenu.classList.remove('active');
            createNewFolderPrompt();
        };
        document.getElementById('files-menu-paste').onclick = () => {
            contextMenu.classList.remove('active');
            pasteFromClipboard();
        };
        document.getElementById('files-menu-view-grid').onclick = () => {
            contextMenu.classList.remove('active');
            tab.currentView = 'grid';
            renderFolder();
        };
        document.getElementById('files-menu-view-list').onclick = () => {
            contextMenu.classList.remove('active');
            tab.currentView = 'list';
            renderFolder();
        };
        document.getElementById('files-menu-view-columns').onclick = () => {
            contextMenu.classList.remove('active');
            tab.currentView = 'columns';
            renderFolder();
        };
        document.getElementById('files-menu-view-gallery').onclick = () => {
            contextMenu.classList.remove('active');
            tab.currentView = 'gallery';
            renderFolder();
        };
        
        const emptyBtn = document.getElementById('files-menu-empty');
        if (emptyBtn) {
            emptyBtn.onclick = () => {
                contextMenu.classList.remove('active');
                emptyTrashAction();
            };
        }
    }

    function positionContextMenu(e) {
        const menuWidth = 165;
        const menuHeight = 240;
        let left = e.clientX;
        let top = e.clientY;

        if (left + menuWidth > window.innerWidth) left -= menuWidth;
        if (top + menuHeight > window.innerHeight) top -= menuHeight;

        contextMenu.style.left = `${left}px`;
        contextMenu.style.top = `${top}px`;
        contextMenu.classList.add('active');
    }

    // FILE & SYSTEM OPERATIONS

    // Create New File Action
    async function createNewFilePrompt() {
        const tab = getActiveTab();
        const name = await dialog.prompt('Enter new file name:', 'untitled.txt', 'New File');
        if (!name) return;

        const fullPath = tab.path === '/' ? `/${name}` : `${tab.path}/${name}`;
        if (window.VFS.exists(fullPath)) {
            await dialog.alert('A file or folder with that name already exists.', 'Create File');
            return;
        }

        const success = window.VFS.createFile(tab.path, name, '');
        if (success) {
            if (window.showNotification) {
                window.showNotification('File Created', `Created file "${name}"`, 'hgi-file-add');
            }
        } else {
            await dialog.alert('Failed to create file.', 'Create File');
        }
    }

    // Create New Folder Action
    async function createNewFolderPrompt() {
        const tab = getActiveTab();
        const name = await dialog.prompt('Enter new folder name:', 'New Folder', 'Create Folder');
        if (!name) return;

        const fullPath = tab.path === '/' ? `/${name}` : `${tab.path}/${name}`;
        if (window.VFS.exists(fullPath)) {
            await dialog.alert('A file or folder with that name already exists.', 'Create Folder');
            return;
        }

        const success = window.VFS.mkdir(tab.path, name);
        if (success) {
            if (window.showNotification) {
                window.showNotification('Folder Created', `Created folder "${name}"`, 'hgi-folder-add');
            }
        } else {
            await dialog.alert('Failed to create folder.', 'Create Folder');
        }
    }

    // Rename file/folder Action
    async function renameFile(file, newName) {
        if (!newName || newName === file.name) return;
        const tab = getActiveTab();

        const currentPath = (file.parentPath === '/' ? '' : file.parentPath) + '/' + file.name;
        const newPath = (file.parentPath === '/' ? '' : file.parentPath) + '/' + newName;
        
        if (window.VFS.exists(newPath)) {
            await dialog.alert('A file or folder with that name already exists.', 'Rename');
            renderFolder();
            return;
        }

        const success = window.VFS.renamePath(currentPath, newName);
        if (success) {
            if (window.showNotification) {
                window.showNotification('Renamed', `Renamed "${file.name}" to "${newName}"`, 'hgi-edit-01');
            }
            
            // Re-render folder, keeping item selected
            setTimeout(() => {
                const matchItem = Array.from(document.querySelectorAll('.finder-folder-card, .finder-file-card, .finder-column-item, .gallery-card')).find(i => {
                    const lbl = i.querySelector('.finder-grid-label');
                    return lbl && lbl.textContent === newName;
                });
                if (matchItem) {
                    matchItem.classList.add('active-select');
                    const contents = window.VFS.listDirectory(tab.path) || [];
                    const node = contents.find(n => n.name === newName);
                    if (node) {
                        tab.selectedItem = {
                            name: node.name,
                            type: node.type === 'folder' ? 'folder' : getFileType(node.name),
                            content: node.content,
                            lastModified: node.lastModified,
                            parentPath: file.parentPath
                        };
                        updatePropertiesPane(tab.selectedItem);
                    }
                    updateToolbarState();
                }
            }, 50);
        } else {
            await dialog.alert('Failed to rename.', 'Rename');
        }
    }

    // INLINE RENAME (macOS style label editing)
    function triggerInlineRename(file) {
        // Find corresponding visual DOM element
        const matchItem = Array.from(document.querySelectorAll('.finder-folder-card, .finder-file-card, .finder-column-item, .gallery-card')).find(i => {
            const lbl = i.querySelector('.finder-grid-label');
            return lbl && lbl.textContent === file.name;
        });

        if (!matchItem) return;

        const label = matchItem.querySelector('.finder-grid-label');
        if (!label) return;

        const originalText = label.textContent;
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'inline-rename-input';
        input.value = originalText;
        
        // Remove label temporarily and insert input
        label.style.display = 'none';
        label.parentNode.insertBefore(input, label);

        // Select the name excluding file extension (if file)
        input.focus();
        const dotIdx = originalText.lastIndexOf('.');
        if (dotIdx > 0 && file.type !== 'folder') {
            input.setSelectionRange(0, dotIdx);
        } else {
            input.select();
        }

        let finished = false;
        const commit = () => {
            if (finished) return;
            finished = true;
            const val = input.value.trim();
            input.remove();
            label.style.display = '';
            if (val && val !== originalText) {
                renameFile(file, val);
            }
        };

        const cancel = () => {
            if (finished) return;
            finished = true;
            input.remove();
            label.style.display = '';
        };

        input.addEventListener('blur', commit);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                commit();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                cancel();
            }
        });
    }

    // CLIPBOARD ACTIONS (Copy, Cut, Paste)
    function copyToClipboard(items, action = 'copy') {
        const tab = getActiveTab();
        clipboard.paths = items.map(file => (file.parentPath === '/' ? '' : file.parentPath) + '/' + file.name);
        clipboard.action = action;
        
        if (window.showNotification) {
            window.showNotification(
                action === 'copy' ? 'Copied to Clipboard' : 'Cut to Clipboard',
                `Selected ${items.length} item(s)`,
                'hgi-clipboard'
            );
        }
    }

    function pasteFromClipboard() {
        if (clipboard.paths.length === 0) return;
        const tab = getActiveTab();

        let count = 0;
        clipboard.paths.forEach(srcPath => {
            const success = clipboard.action === 'copy' ? 
                window.VFS.copyPath(srcPath, tab.path) : 
                window.VFS.movePath(srcPath, tab.path);
            if (success) count++;
        });

        if (count > 0) {
            if (window.showNotification) {
                window.showNotification(
                    'Pasted successfully',
                    `Pasted ${count} item(s) to ${tab.path}`,
                    'hgi-clipboard'
                );
            }
            if (clipboard.action === 'cut') {
                clipboard.paths = []; // Clear cut paths
            }
            renderFolder();
        } else {
            dialog.alert('Failed to paste items. Make sure target folder exists.', 'Clipboard');
        }
    }

    // DUPLICATE (CLONE)
    function duplicateNode(file) {
        const srcPath = (file.parentPath === '/' ? '' : file.parentPath) + '/' + file.name;
        const success = window.VFS.copyPath(srcPath, file.parentPath);
        if (success) {
            if (window.showNotification) {
                window.showNotification('Duplicated', `Created copy of "${file.name}"`, 'hgi-document-copy');
            }
            renderFolder();
        }
    }

    // CREATE ALIAS (SHORTCUT)
    function createAlias(file) {
        const targetPath = (file.parentPath === '/' ? '' : file.parentPath) + '/' + file.name;
        const aliasName = `${file.name.split('.')[0]} Alias.txt`;
        const content = `[Alias Target: ${targetPath}]`;
        
        const success = window.VFS.createFile(file.parentPath, aliasName, content);
        if (success) {
            if (window.showNotification) {
                window.showNotification('Alias Created', `Shortcut linked to "${file.name}"`, 'hgi-link-02');
            }
            renderFolder();
        }
    }

    // ZIP COMPRESSION / EXTRACTION
    function compressNode(file) {
        const zipName = `${file.name.split('.')[0]}.zip`;
        const content = `[ZIP Archive Package: ${file.name}]`;
        const success = window.VFS.createFile(file.parentPath, zipName, content);
        if (success) {
            // Set size of simulated ZIP node
            const zipPath = (file.parentPath === '/' ? '' : file.parentPath) + '/' + zipName;
            const resolved = window.VFS.resolveAbsolutePath(zipPath);
            const node = window.VFS.listDirectory(file.parentPath).find(n => n.name === zipName);
            if (node) {
                node.size = '1.2 MB'; // Mock size
            }

            if (window.showNotification) {
                window.showNotification('Compressed', `Created archive package "${zipName}"`, 'hgi-package');
            }
            renderFolder();
        }
    }

    function uncompressNode(file) {
        const folderName = `${file.name.split('.')[0]}_extracted`;
        const success = window.VFS.mkdir(file.parentPath, folderName);
        if (success) {
            const targetFolder = (file.parentPath === '/' ? '' : file.parentPath) + '/' + folderName;
            // Create mock files inside extracted folder
            window.VFS.createFile(targetFolder, 'manifest.json', '{\n  "status": "extracted",\n  "app": "felbic-os"\n}');
            window.VFS.createFile(targetFolder, 'readme.txt', 'Extracted content package.');

            if (window.showNotification) {
                window.showNotification('Extracted Archive', `Unzipped folder "${folderName}"`, 'hgi-package-open');
            }
            renderFolder();
        }
    }

    // TRASH BIN ACTIONS

    function moveToTrash(file) {
        const srcPath = (file.parentPath === '/' ? '' : file.parentPath) + '/' + file.name;
        
        // Ensure /Trash directory exists
        if (!window.VFS.exists('/Trash')) {
            window.VFS.mkdir('/', 'Trash');
        }

        // Get VFS node to insert originalPath metadata
        const resolved = window.VFS.resolveAbsolutePath(srcPath);
        const parentRes = window.VFS.listDirectory(file.parentPath);
        const node = parentRes ? parentRes.find(n => n.name === file.name) : null;
        if (node) {
            node.originalPath = file.parentPath; // Save location for Put Back
        }

        const success = window.VFS.movePath(srcPath, '/Trash');
        if (success) {
            if (window.showNotification) {
                window.showNotification('Moved to Trash', `"${file.name}" was trashed`, 'hgi-delete-01');
            }
            updatePropertiesPane(null);
            renderFolder();
        }
    }

    function putBackFromTrash(file) {
        const srcPath = `/Trash/${file.name}`;
        
        // Resolve node to read originalPath metadata
        const trashContents = window.VFS.listDirectory('/Trash') || [];
        const node = trashContents.find(n => n.name === file.name);
        
        const targetParent = (node && node.originalPath) ? node.originalPath : '/workspace';

        // Move back
        const success = window.VFS.movePath(srcPath, targetParent);
        if (success) {
            if (window.showNotification) {
                window.showNotification('Restored Item', `Returned "${file.name}" to ${targetParent}`, 'hgi-refresh');
            }
            renderFolder();
            updatePropertiesPane(null);
        } else {
            dialog.alert(`Failed to restore. The target directory ${targetParent} may no longer exist.`, 'Trash Bin');
        }
    }

    async function deleteFilePermanently(file) {
        const confirmed = await dialog.confirm(`Are you sure you want to permanently delete "${file.name}"? This action cannot be undone.`, 'Delete Immediately', true);
        if (!confirmed) return;

        const srcPath = (file.parentPath === '/' ? '' : file.parentPath) + '/' + file.name;
        const success = window.VFS.deletePath(srcPath);
        if (success) {
            if (window.showNotification) {
                window.showNotification('Deleted', `Permanently deleted "${file.name}"`, 'hgi-delete-02');
            }
            updatePropertiesPane(null);
            renderFolder();
        }
    }

    async function emptyTrashAction() {
        const confirmed = await dialog.confirm('Are you sure you want to empty the Trash? All items will be permanently erased.', 'Empty Trash', true);
        if (!confirmed) return;

        const trashItems = window.VFS.listDirectory('/Trash') || [];
        trashItems.forEach(item => {
            window.VFS.deletePath(`/Trash/${item.name}`);
        });

        if (window.showNotification) {
            window.showNotification('Trash Emptied', 'Permanently cleared all items.', 'hgi-delete-01');
        }
        renderFolder();
        updatePropertiesPane(null);
    }

    // TAG OPERATIONS
    function assignTag(file, tag) {
        const filePath = (file.parentPath === '/' ? '' : file.parentPath) + '/' + file.name;
        const contents = window.VFS.listDirectory(file.parentPath) || [];
        const node = contents.find(n => n.name === file.name);
        if (node) {
            if (!node.tags) node.tags = [];
            if (!node.tags.includes(tag)) {
                node.tags.push(tag);
                node.lastModified = new Date().toLocaleString();
                document.dispatchEvent(new CustomEvent('vfs-updated', { detail: { path: filePath } }));
                if (window.showNotification) {
                    window.showNotification('Tag Assigned', `Assigned tag "${tag}" to "${file.name}"`, 'hgi-tag-01');
                }
            }
        }
    }

    // QUICK LOOK MODAL (Spacebar Preview overlay)
    function toggleQuickLook(file) {
        const modal = document.getElementById('quick-look-modal');
        const title = document.getElementById('quick-look-title');
        const content = document.getElementById('quick-look-content');
        const footerMeta = document.getElementById('quick-look-meta');
        const closeBtn = document.getElementById('quick-look-close');

        if (!modal || !content) return;

        title.textContent = `Quick Look: ${file.name}`;
        footerMeta.textContent = `Location: ${file.parentPath}/${file.name}  |  Size: ${file.size}`;

        // Preview Render Switch
        const ext = file.name.split('.').pop().toLowerCase();
        content.innerHTML = '';

        if (['png','jpg','jpeg','gif','ico','webp'].includes(ext)) {
            // Renders large mockup visual container
            content.innerHTML = `
                <div style="display:flex; flex-direction:column; align-items:center; gap: 10px;">
                    <div style="width: 240px; height: 180px; background: rgba(255,255,255,0.05); border: 1px dashed rgba(255,255,255,0.2); border-radius: var(--radius-sm); display:flex; align-items:center; justify-content:center; color:rgba(255,255,255,0.4);">
                        <i class="hgi-stroke hgi-image-01" style="font-size: 64px;"></i>
                    </div>
                    <span style="font-size:11px; opacity: 0.8;">Mock Image Frame (Dimensions: 1024x768)</span>
                </div>
            `;
        } else if (['mp3','wav','ogg','flac'].includes(ext)) {
            // Mock Audio Player
            content.innerHTML = `
                <div style="display:flex; flex-direction:column; align-items:center; gap:16px; width:280px; background:rgba(255,255,255,0.05); padding: 20px; border-radius: var(--radius-md); border:1px solid rgba(255,255,255,0.1);">
                    <span style="font-size:48px; color: #ec4899; display:flex;"><i class="hgi-stroke hgi-music-note-01"></i></span>
                    <strong style="font-size:13px; text-align:center; width:100%;">${file.name}</strong>
                    <div style="display:flex; gap:14px; align-items:center; width:100%; justify-content:center; margin-top:8px;">
                        <button class="files-nav-btn" style="width:32px; height:32px; font-size:12px; background:#fff; color:#000;" onclick="alert('Audio playing...')">▶</button>
                        <!-- Simulated Sound Waveform -->
                        <div style="display:flex; gap:2px; height:24px; align-items:center; flex:1;">
                            <div style="height:40%; width:3px; background:#fff; border-radius:1px;"></div>
                            <div style="height:70%; width:3px; background:#fff; border-radius:1px;"></div>
                            <div style="height:100%; width:3px; background:#fff; border-radius:1px;"></div>
                            <div style="height:50%; width:3px; background:#fff; border-radius:1px;"></div>
                            <div style="height:80%; width:3px; background:#fff; border-radius:1px;"></div>
                            <div style="height:30%; width:3px; background:#fff; border-radius:1px;"></div>
                        </div>
                    </div>
                </div>
            `;
        } else {
            // Text or Monospace code snippet renderer
            const textContent = file.content ? file.content.toString() : '[Empty File]';
            content.innerHTML = `
                <pre style="width:100%; height:300px; margin:0; background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.1); border-radius:var(--radius-sm); padding:14px; text-align:left; font-family:var(--font-mono); font-size:11px; line-height:1.5; color:#fff; overflow:auto; box-sizing:border-box;">${escapeHtml(textContent)}</pre>
            `;
        }

        modal.style.display = 'flex';

        // Close triggers
        const closeQuickLook = () => {
            modal.style.display = 'none';
        };
        closeBtn.onclick = closeQuickLook;
        modal.querySelector('.quick-look-backdrop').onclick = closeQuickLook;
    }

    // GET INFO DIALOG WINDOW
    function openGetInfoWindow(file) {
        const windowEl = document.getElementById('get-info-window');
        if (!windowEl) return;

        // Populate fields
        document.getElementById('get-info-title').textContent = `Info: ${file.name}`;
        document.getElementById('get-info-name').textContent = file.name;
        document.getElementById('get-info-size-label').textContent = file.size;
        document.getElementById('get-info-size').textContent = file.size;
        document.getElementById('get-info-path').textContent = `${file.parentPath}/${file.name}`;
        
        const info = getFileInfo(file.name);
        document.getElementById('get-info-kind').textContent = file.type === 'folder' ? 'Folder' : info.label;
        document.getElementById('get-info-icon').innerHTML = `<i class="hgi-stroke ${file.type === 'folder' ? 'hgi-folder-01' : info.icon}"></i>`;
        document.getElementById('get-info-icon').style.color = file.type === 'folder' ? '#3b82f6' : info.color;
        document.getElementById('get-info-modified').textContent = formatMetaDate(file.lastModified);

        // Simulated changes to permissions dropdown
        const permOwner = document.getElementById('perm-owner');
        const permEveryone = document.getElementById('perm-everyone');
        
        // Load mock metadata or defaults
        const contents = window.VFS.listDirectory(file.parentPath) || [];
        const node = contents.find(n => n.name === file.name);
        if (node) {
            permOwner.value = node.privOwner || 'rw';
            permEveryone.value = node.privEveryone || 'r';
        }

        const savePrivileges = () => {
            if (node) {
                node.privOwner = permOwner.value;
                node.privEveryone = permEveryone.value;
                if (window.showNotification) {
                    window.showNotification('Privileges Saved', `Updated permissions for "${file.name}"`, 'hgi-settings-02');
                }
            }
        };

        permOwner.onchange = savePrivileges;
        permEveryone.onchange = savePrivileges;

        // Display and make draggable
        windowEl.style.display = 'flex';
        
        // Window Titlebar dragging handler
        const titlebar = windowEl.querySelector('.window-titlebar');
        let isDragging = false;
        let startX = 0, startY = 0;
        
        const onMouseDown = (e) => {
            isDragging = true;
            startX = e.clientX - windowEl.offsetLeft;
            startY = e.clientY - windowEl.offsetTop;
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        };
        
        const onMouseMove = (e) => {
            if (!isDragging) return;
            windowEl.style.left = `${e.clientX - startX}px`;
            windowEl.style.top = `${e.clientY - startY}px`;
        };
        
        const onMouseUp = () => {
            isDragging = false;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
        
        titlebar.addEventListener('mousedown', onMouseDown);
        
        // Close button
        windowEl.querySelector('.window-btn.close').onclick = () => {
            windowEl.style.display = 'none';
        };
    }

    // SIDEBAR CATEGORY CLICK TRIGGERS
    sidebarItems.forEach(item => {
        item.addEventListener('click', () => {
            const tagAttr = item.getAttribute('data-tag');
            const tab = getActiveTab();

            // Clear search text
            if (searchInput) searchInput.value = '';
            tab.searchFilter = '';

            if (tagAttr) {
                sidebarItems.forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                
                tab.tagFilter = tagAttr;
                tab.smartFilter = '';
                tab.name = `${tagAttr} Tag`;
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

            sidebarItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            tab.tagFilter = '';
            tab.smartFilter = '';
            tab.path = targetFolder;
            
            // Push history
            tab.history = tab.history.slice(0, tab.historyIndex + 1);
            tab.history.push(targetFolder);
            tab.historyIndex = tab.history.length - 1;
            tab.name = folderAttr.charAt(0).toUpperCase() + folderAttr.slice(1);

            renderFolder();
            updatePropertiesPane(null);
        });
    });

    // Smart Folder clicks
    document.querySelectorAll('.smart-folder-item').forEach(item => {
        item.addEventListener('click', () => {
            const filterAttr = item.getAttribute('data-smart');
            const tab = getActiveTab();

            sidebarItems.forEach(i => i.classList.remove('active'));
            document.querySelectorAll('.smart-folder-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            tab.tagFilter = '';
            tab.smartFilter = filterAttr;
            tab.name = item.querySelector('span:last-child').textContent;
            
            if (searchInput) searchInput.value = '';
            tab.searchFilter = '';

            renderFolder();
            updatePropertiesPane(null);
        });
    });

    // Toolbar Navigation clicks
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            const tab = getActiveTab();
            if (tab.historyIndex > 0) {
                tab.historyIndex--;
                tab.path = tab.history[tab.historyIndex];
                tab.smartFilter = '';
                tab.selectedItem = null;
                tab.name = tab.path.split('/').pop() || 'Root';
                renderFolder();
                updatePropertiesPane(null);
            }
        });
    }

    if (forwardBtn) {
        forwardBtn.addEventListener('click', () => {
            const tab = getActiveTab();
            if (tab.historyIndex < tab.history.length - 1) {
                tab.historyIndex++;
                tab.path = tab.history[tab.historyIndex];
                tab.smartFilter = '';
                tab.selectedItem = null;
                tab.name = tab.path.split('/').pop() || 'Root';
                renderFolder();
                updatePropertiesPane(null);
            }
        });
    }

    // View Options Sidepane triggers
    if (toggleViewOptionsBtn && propertiesSidebar) {
        toggleViewOptionsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const pane = document.getElementById('view-options-pane');
            if (pane) {
                pane.style.display = pane.style.display === 'none' ? 'flex' : 'none';
            }
        });
    }

    const viewOptCloseBtn = document.getElementById('view-options-close');
    if (viewOptCloseBtn) {
        viewOptCloseBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const pane = document.getElementById('view-options-pane');
            if (pane) pane.style.display = 'none';
        });
    }

    // View Option inputs listeners
    const iconSizeInput = document.getElementById('option-icon-size');
    const gridSpacingInput = document.getElementById('option-grid-spacing');
    const showHiddenCheckbox = document.getElementById('option-show-hidden');
    const showItemInfoCheckbox = document.getElementById('option-show-item-info');

    if (iconSizeInput) {
        iconSizeInput.addEventListener('input', (e) => {
            viewOptions.iconSize = parseInt(e.target.value);
            document.getElementById('icon-size-val').textContent = `${viewOptions.iconSize}px`;
            renderFolder();
        });
    }
    if (gridSpacingInput) {
        gridSpacingInput.addEventListener('input', (e) => {
            viewOptions.gridSpacing = parseInt(e.target.value);
            document.getElementById('grid-spacing-val').textContent = `${viewOptions.gridSpacing}px`;
            renderFolder();
        });
    }
    if (showHiddenCheckbox) {
        showHiddenCheckbox.addEventListener('change', (e) => {
            viewOptions.showHidden = e.target.checked;
            renderFolder();
        });
    }
    if (showItemInfoCheckbox) {
        showItemInfoCheckbox.addEventListener('change', (e) => {
            viewOptions.showItemInfo = e.target.checked;
            renderFolder();
        });
    }

    // File search input
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const tab = getActiveTab();
            tab.searchFilter = e.target.value;
            renderFolder();
        });
    }

    // Clear Selection on folder body click
    if (contentGrid) {
        contentGrid.addEventListener('click', (e) => {
            if (e.target === contentGrid || e.target.classList.contains('finder-columns-view') || e.target.classList.contains('finder-gallery-view') || e.target.classList.contains('gallery-preview-zone')) {
                document.querySelectorAll('.finder-folder-card, .finder-file-card, .finder-column-item, .gallery-card').forEach(i => i.classList.remove('active-select'));
                
                const tab = getActiveTab();
                tab.selectedItem = null;
                updatePropertiesPane(null);
                updateToolbarState();
            }
        });

        // Context menu empty area click
        contentGrid.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();

            const isCard = e.target.closest('.finder-folder-card, .finder-file-card, .finder-column-item, .gallery-card');
            if (!isCard) {
                triggerEmptyAreaContextMenu(e);
            }
        });
    }

    // Dismiss context menu
    document.addEventListener('click', (e) => {
        if (contextMenu && !e.target.closest('#files-context-menu')) {
            contextMenu.classList.remove('active');
        }
    });

    // View toggles buttons
    if (viewGridBtn) {
        viewGridBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            getActiveTab().currentView = 'grid';
            renderFolder();
        });
    }
    if (viewListBtn) {
        viewListBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            getActiveTab().currentView = 'list';
            renderFolder();
        });
    }
    if (viewColumnsBtn) {
        viewColumnsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            getActiveTab().currentView = 'columns';
            renderFolder();
        });
    }
    if (viewGalleryBtn) {
        viewGalleryBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            getActiveTab().currentView = 'gallery';
            renderFolder();
        });
    }

    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            getActiveTab().currentSort = e.target.value;
            renderFolder();
        });
    }

    // Top action buttons
    if (newFileBtn) newFileBtn.onclick = (e) => { e.stopPropagation(); createNewFilePrompt(); };
    if (newFolderBtn) newFolderBtn.onclick = (e) => { e.stopPropagation(); createNewFolderPrompt(); };
    
    if (copyBtn) {
        copyBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (copyBtn.classList.contains('disabled')) return;
            const tab = getActiveTab();
            if (tab.selectedItem) copyToClipboard(tab.selectedItem, false);
        });
    }

    if (cutBtn) {
        cutBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (cutBtn.classList.contains('disabled')) return;
            const tab = getActiveTab();
            if (tab.selectedItem) copyToClipboard(tab.selectedItem, true);
        });
    }

    if (pasteBtn) {
        pasteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            pasteFromClipboard();
        });
    }

    if (duplicateBtn) {
        duplicateBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (duplicateBtn.classList.contains('disabled')) return;
            const tab = getActiveTab();
            if (tab.selectedItem) duplicateNode(tab.selectedItem);
        });
    }

    if (quicklookBtn) {
        quicklookBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (quicklookBtn.classList.contains('disabled')) return;
            const tab = getActiveTab();
            if (tab.selectedItem) toggleQuickLook(tab.selectedItem);
        });
    }

    if (getinfoBtn) {
        getinfoBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (getinfoBtn.classList.contains('disabled')) return;
            const tab = getActiveTab();
            if (tab.selectedItem) openGetInfoWindow(tab.selectedItem);
        });
    }

    if (renameBtn) {
        renameBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (renameBtn.classList.contains('disabled')) return;
            const tab = getActiveTab();
            if (tab.selectedItem) triggerInlineRename(tab.selectedItem);
        });
    }

    if (deleteBtn) {
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (deleteBtn.classList.contains('disabled')) return;
            const tab = getActiveTab();
            if (tab.selectedItem) moveToTrash(tab.selectedItem);
        });
    }

    // Sort Listeners
    if (sortNameBtn) {
        sortNameBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('#files-view-dropdown .dropdown-item').forEach(i => i.classList.remove('active'));
            sortNameBtn.classList.add('active');
            if (sortSelect) sortSelect.value = 'name';
            renderFolder();
        });
    }
    if (sortDateBtn) {
        sortDateBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('#files-view-dropdown .dropdown-item').forEach(i => i.classList.remove('active'));
            sortDateBtn.classList.add('active');
            if (sortSelect) sortSelect.value = 'date';
            renderFolder();
        });
    }
    if (sortSizeBtn) {
        sortSizeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('#files-view-dropdown .dropdown-item').forEach(i => i.classList.remove('active'));
            sortSizeBtn.classList.add('active');
            if (sortSelect) sortSelect.value = 'size';
            renderFolder();
        });
    }

    if (togglePropertiesBtn && propertiesSidebar) {
        togglePropertiesBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            propertiesSidebar.classList.toggle('collapsed');
            
            // Sync dropdown item state
            if (propertiesSidebar.classList.contains('collapsed')) {
                togglePropertiesBtn.classList.remove('active');
            } else {
                togglePropertiesBtn.classList.add('active');
            }
        });
    }

    if (toggleViewOptionsItem) {
        toggleViewOptionsItem.addEventListener('click', (e) => {
            e.stopPropagation();
            const pane = document.getElementById('view-options-pane');
            if (pane) {
                const isHidden = (pane.style.display === 'none');
                pane.style.display = isHidden ? 'flex' : 'none';
                
                if (isHidden) toggleViewOptionsItem.classList.add('active');
                else toggleViewOptionsItem.classList.remove('active');
            }
        });
    }
    
    if (closePropertiesBtn && propertiesSidebar) {
        closePropertiesBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            propertiesSidebar.classList.add('collapsed');
        });
    }

    // Drag and Drop sidebar folders (Moving files)
    sidebarItems.forEach(asideFolder => {
        asideFolder.addEventListener('dragover', (e) => {
            e.preventDefault();
            asideFolder.classList.add('drag-hover');
        });
        asideFolder.addEventListener('dragleave', () => {
            asideFolder.classList.remove('drag-hover');
        });
        asideFolder.addEventListener('drop', (e) => {
            e.preventDefault();
            asideFolder.classList.remove('drag-hover');
            const srcPath = e.dataTransfer.getData('text/plain');
            const targetFolderAttr = asideFolder.getAttribute('data-folder');
            if (srcPath && targetFolderAttr) {
                let destFolder = '/' + targetFolderAttr;
                if (targetFolderAttr === 'workspace') destFolder = '/workspace';
                else if (targetFolderAttr === 'desktop') destFolder = '/Desktop';
                else if (targetFolderAttr === 'documents') destFolder = '/Documents';
                else if (targetFolderAttr === 'downloads') destFolder = '/Downloads';
                else if (targetFolderAttr === 'pictures') destFolder = '/Pictures';
                
                const success = window.VFS.movePath(srcPath, destFolder);
                if (success) {
                    if (window.showNotification) {
                        window.showNotification('File Moved', `Relocated item to ${destFolder}`, 'hgi-folder-01');
                    }
                    renderFolder();
                }
            }
        });
    });

    // Drag and Drop Trash Dock item
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
                // Parse filename from path
                const parts = filePath.split('/');
                const fileName = parts.pop();
                const parentPath = parts.join('/') || '/';
                moveToTrash({
                    name: fileName,
                    parentPath: parentPath
                });
            }
        });
    }

    // Drag-and-drop Sidebar Tag Categories (Assigning tags)
    document.querySelectorAll('.finder-sidebar .tag-item').forEach(tagEl => {
        tagEl.addEventListener('dragover', (e) => {
            e.preventDefault();
            tagEl.classList.add('drag-hover');
        });
        tagEl.addEventListener('dragleave', () => {
            tagEl.classList.remove('drag-hover');
        });
        tagEl.addEventListener('drop', (e) => {
            e.preventDefault();
            tagEl.classList.remove('drag-hover');
            const srcPath = e.dataTransfer.getData('text/plain');
            const tagLabel = tagEl.getAttribute('data-tag');
            if (srcPath && tagLabel) {
                const parts = srcPath.split('/');
                const name = parts.pop();
                const parentPath = parts.join('/') || '/';
                assignTag({ name: name, parentPath: parentPath }, tagLabel);
            }
        });
    });

    // Keyboard Shortcuts Listener
    document.addEventListener('keydown', (e) => {
        // Only trigger if Finder window is the active focused window
        const finderWindow = document.getElementById('files-window');
        if (!finderWindow || finderWindow.style.display === 'none') return;
        if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;

        const tab = getActiveTab();
        const selected = tab.selectedItem;

        // Spacebar: Quick Look preview overlay
        if (e.key === ' ' && selected) {
            e.preventDefault();
            toggleQuickLook(selected);
        }

        // Enter: inline rename label
        if (e.key === 'Enter' && selected) {
            e.preventDefault();
            triggerInlineRename(selected);
        }

        // Escape: deselect all
        if (e.key === 'Escape') {
            document.querySelectorAll('.finder-folder-card, .finder-file-card, .finder-column-item, .gallery-card').forEach(i => i.classList.remove('active-select'));
            tab.selectedItem = null;
            updatePropertiesPane(null);
            updateToolbarState();
        }

        // Cmd/Ctrl combinations
        const isCmd = e.metaKey || e.ctrlKey;
        if (isCmd) {
            if (e.key.toLowerCase() === 'c' && selected) {
                // Copy
                e.preventDefault();
                copyToClipboard([selected], 'copy');
            }
            if (e.key.toLowerCase() === 'x' && selected) {
                // Cut
                e.preventDefault();
                copyToClipboard([selected], 'cut');
            }
            if (e.key.toLowerCase() === 'v') {
                // Paste
                e.preventDefault();
                pasteFromClipboard();
            }
            if (e.key.toLowerCase() === 'a') {
                // Select all items
                e.preventDefault();
                document.querySelectorAll('.finder-folder-card, .finder-file-card, .finder-column-item, .gallery-card').forEach(i => i.classList.add('active-select'));
            }
            if (e.key === 'Backspace' || e.key === 'Delete') {
                // Move to Trash
                if (selected) {
                    e.preventDefault();
                    moveToTrash(selected);
                }
            }
        }
    });

    // System VFS events listeners
    document.addEventListener('file-saved', (e) => {
        const { path, content } = e.detail;
        if (!path) return;
        window.VFS.writeFile(path, content);
        renderFolder();
    });

    document.addEventListener('vfs-updated', () => {
        renderFolder();
    });

    document.addEventListener('navigate-folder', (e) => {
        const path = e.detail.path;
        if (path) navigateToPath(path);
    });

    // Tag removal delegate inside Properties Pane
    if (propertiesContent) {
        propertiesContent.addEventListener('click', async (e) => {
            const tab = getActiveTab();
            if (!tab.selectedItem) return;
            const file = tab.selectedItem;
            
            const filePath = (file.parentPath === '/' ? '' : file.parentPath) + '/' + file.name;
            const resolved = window.VFS.resolveAbsolutePath(filePath);
            const parentRes = window.VFS.listDirectory(file.parentPath) || [];
            const node = parentRes.find(n => n.name === file.name);
            if (!node) return;

            // "+ Add Tag" is clicked
            if (e.target.id === 'add-tag-trigger' || e.target.textContent === '+ Add Tag') {
                e.stopPropagation();
                const newTag = await dialog.prompt('Enter tag name (e.g. Work, Personal, Projects, Important):', '', 'Add Tag');
                if (!newTag) return;
                
                if (!node.tags) node.tags = [];
                if (!node.tags.includes(newTag)) {
                    node.tags.push(newTag);
                    node.lastModified = new Date().toLocaleString();
                    document.dispatchEvent(new CustomEvent('vfs-updated', { detail: { path: filePath } }));
                    if (window.showNotification) {
                        window.showNotification('Tag Added', `Added tag "${newTag}" to "${file.name}"`, 'hgi-tag-01');
                    }
                }
            }

            // Tag badge click (delete)
            const badge = e.target.closest('.file-tag-badge');
            if (badge) {
                e.stopPropagation();
                const tagToRemove = badge.getAttribute('data-tag');
                if (tagToRemove && node.tags) {
                    node.tags = node.tags.filter(t => t !== tagToRemove);
                    node.lastModified = new Date().toLocaleString();
                    document.dispatchEvent(new CustomEvent('vfs-updated', { detail: { path: filePath } }));
                    if (window.showNotification) {
                        window.showNotification('Tag Removed', `Removed tag "${tagToRemove}"`, 'hgi-tag-01');
                    }
                }
            }
        });
    }

    // INITIAL RENDER
    createNewTab('/workspace', 'Workspace');
}
