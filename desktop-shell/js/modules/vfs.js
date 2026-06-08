/* FELBIC OS — Virtual File System (VFS) Module */

const root = {
    type: 'folder',
    name: '/',
    children: {
        'workspace': {
            type: 'folder',
            name: 'workspace',
            children: {
                'aisd': { type: 'folder', name: 'aisd', children: {}, lastModified: new Date().toLocaleString() },
                'compositor': { type: 'folder', name: 'compositor', children: {}, lastModified: new Date().toLocaleString() },
                'Makefile': { 
                    type: 'file', 
                    name: 'Makefile', 
                    content: '# FELBIC OS — Build Orchestration Makefile\n\nall: build\n\nbuild:\n\t@echo "Compiling aisd system daemon..."\n\tcargo build --release\n\nclean:\n\t@echo "Cleaning compiled workspace..."\n\tcargo clean\n', 
                    lastModified: new Date().toLocaleString() 
                },
                'README.md': { 
                    type: 'file', 
                    name: 'README.md', 
                    content: '# FELBIC OS\n\nFELBIC OS is a premium, AI-native operating system built on top of Arch Linux.\n\n## Features\n- High-fidelity glassmorphic desktop environment\n- AI System Daemon (`aisd`) background bridge\n- Modular system dashboard and settings panel\n- Web-based system explorer\n', 
                    lastModified: new Date().toLocaleString() 
                },
                'build-wsl.sh': { 
                    type: 'file', 
                    name: 'build-wsl.sh', 
                    content: '#!/bin/bash\n# Helper compilation script for Windows Subsystem for Linux (WSL)\n\necho "[felbic-wsl] Preparing build environment..."\nsudo pacman -Sy --needed base-devel rust\n\necho "[felbic-wsl] Building binaries..."\nmake all\n', 
                    lastModified: new Date().toLocaleString() 
                }
            },
            lastModified: new Date().toLocaleString()
        },
        'Documents': {
            type: 'folder',
            name: 'Documents',
            children: {
                'Work': { type: 'folder', name: 'Work', children: {}, lastModified: 'May 24, 2024 10:30 AM', size: '12 items' },
                'Personal': { type: 'folder', name: 'Personal', children: {}, lastModified: 'May 24, 2024 10:30 AM', size: '5 items' },
                'Projects': { type: 'folder', name: 'Projects', children: {}, lastModified: 'May 24, 2024 10:30 AM', size: '8 items' },
                'Assets': { type: 'folder', name: 'Assets', children: {}, lastModified: 'May 24, 2024 10:30 AM', size: '15 items' },
                'Notes': { type: 'folder', name: 'Notes', children: {}, lastModified: 'May 24, 2024 10:30 AM', size: '4 items' },
                'Archive': { type: 'folder', name: 'Archive', children: {}, lastModified: 'May 24, 2024 10:30 AM', size: '20 items' },
                'Project Proposal.pdf': { 
                    type: 'file', 
                    name: 'Project Proposal.pdf', 
                    content: 'Project proposal details and AIOS strategy plan.', 
                    size: '2.4 MB', 
                    tags: ['Work', 'Important'], 
                    lastModified: 'May 24, 2024 10:30 AM' 
                },
                'Monthly Report.xlsx': { 
                    type: 'file', 
                    name: 'Monthly Report.xlsx', 
                    content: 'Spreadsheet containing active resource budgeting.', 
                    size: '1.8 MB', 
                    tags: ['Work'], 
                    lastModified: 'May 23, 2024 09:15 AM' 
                },
                'Design System.sketch': { 
                    type: 'file', 
                    name: 'Design System.sketch', 
                    content: 'Vector assets and design tokens for AIOS interface.', 
                    size: '3.6 MB', 
                    tags: ['Projects'], 
                    lastModified: 'May 22, 2024 04:40 PM' 
                },
                'Presentation.pptx': { 
                    type: 'file', 
                    name: 'Presentation.pptx', 
                    content: 'Slide deck for seed round presentation.', 
                    size: '5.2 MB', 
                    tags: ['Work', 'Projects'], 
                    lastModified: 'May 21, 2024 11:00 AM' 
                },
                'Notes.txt': { 
                    type: 'file', 
                    name: 'Notes.txt', 
                    content: 'Simple developer notes, command listings, and todo items.', 
                    size: '120 KB', 
                    tags: ['Personal'], 
                    lastModified: 'May 20, 2024 02:30 PM' 
                },
                'Meeting Record.wav': { 
                    type: 'file', 
                    name: 'Meeting Record.wav', 
                    content: 'Audio log from general developer sprint alignment.', 
                    size: '3.1 MB', 
                    tags: ['Work'], 
                    lastModified: 'May 20, 2024 10:00 AM' 
                },
                'Prototype.fig': { 
                    type: 'file', 
                    name: 'Prototype.fig', 
                    content: 'Figma canvas link for responsive layout designs.', 
                    size: '7.8 MB', 
                    tags: ['Projects'], 
                    lastModified: 'May 19, 2024 05:12 PM' 
                },
                'Budget 2024.numbers': { 
                    type: 'file', 
                    name: 'Budget 2024.numbers', 
                    content: 'Budget planning worksheets and calculations.', 
                    size: '2.2 MB', 
                    tags: ['Work'], 
                    lastModified: 'May 18, 2024 08:45 AM' 
                },
                'Archive.zip': { 
                    type: 'file', 
                    name: 'Archive.zip', 
                    content: 'Compressed backup directory containing release 0.0.9 source.', 
                    size: '9.3 MB', 
                    tags: ['Important'], 
                    lastModified: 'May 17, 2024 06:10 PM' 
                },
                'Readme.md': { 
                    type: 'file', 
                    name: 'Readme.md', 
                    content: '# AIOS Documents\nWelcome to your command documents directory.', 
                    size: '18 KB', 
                    tags: ['Work', 'Projects'], 
                    lastModified: 'May 16, 2024 01:25 PM' 
                }
            },
            lastModified: new Date().toLocaleString()
        },
        'Pictures': {
            type: 'folder',
            name: 'Pictures',
            children: {},
            lastModified: new Date().toLocaleString()
        },
        'Downloads': {
            type: 'folder',
            name: 'Downloads',
            children: {
                'felbicos-0.1.0-x86_64.iso': { 
                    type: 'file', 
                    name: 'felbicos-0.1.0-x86_64.iso', 
                    content: '[Binary ISO File]', 
                    lastModified: new Date().toLocaleString() 
                },
                'chromium-linux-stable.zip': { 
                    type: 'file', 
                    name: 'chromium-linux-stable.zip', 
                    content: '[Binary Zip File]', 
                    lastModified: new Date().toLocaleString() 
                }
            },
            lastModified: new Date().toLocaleString()
        },
        'Desktop': {
            type: 'folder',
            name: 'Desktop',
            children: {},
            lastModified: new Date().toLocaleString()
        },
        'Music': {
            type: 'folder',
            name: 'Music',
            children: {},
            lastModified: new Date().toLocaleString()
        },
        'Videos': {
            type: 'folder',
            name: 'Videos',
            children: {},
            lastModified: new Date().toLocaleString()
        },
        'AIOS Drive': {
            type: 'folder',
            name: 'AIOS Drive',
            children: {},
            lastModified: new Date().toLocaleString()
        },
        'Network': {
            type: 'folder',
            name: 'Network',
            children: {},
            lastModified: new Date().toLocaleString()
        },
        'todo.md': {
            type: 'file',
            name: 'todo.md',
            content: '# FELBIC OS Todo list\n- [x] Complete window manager implementation\n- [x] Configure desktop icons & workspaces\n- [x] Integrate Calamares Live Installer\n- [x] Implement interactive shell terminal',
            lastModified: new Date().toLocaleString()
        },
        'welcome.txt': {
            type: 'file',
            name: 'welcome.txt',
            content: 'Welcome to FELBIC OS!\nThis is an AI-native operating system designed to run intelligently in web browsers and local virtualization environments.\nEnjoy exploring the interface.',
            lastModified: new Date().toLocaleString()
        }
    }
};

// Aliases for case matching robustness
root.children['documents'] = root.children['Documents'];
root.children['downloads'] = root.children['Downloads'];
root.children['pictures'] = root.children['Pictures'];
root.children['desktop'] = root.children['Desktop'];
root.children['music'] = root.children['Music'];
root.children['videos'] = root.children['Videos'];
root.children['aios-drive'] = root.children['AIOS Drive'];
root.children['network'] = root.children['Network'];

// Helper to deep clone a node
function cloneNode(node, newName) {
    if (node.type === 'file') {
        return {
            type: 'file',
            name: newName || node.name,
            content: node.content,
            lastModified: new Date().toLocaleString()
        };
    } else {
        const newChildren = {};
        for (const key in node.children) {
            newChildren[key] = cloneNode(node.children[key]);
        }
        return {
            type: 'folder',
            name: newName || node.name,
            children: newChildren,
            lastModified: new Date().toLocaleString()
        };
    }
}

// Path resolver helper
function resolvePath(path) {
    if (!path) return { node: root, path: '/' };
    if (path === '/') return { node: root, path: '/' };
    
    // Normalize path by splitting
    const parts = path.split('/').filter(p => p !== '' && p !== '.');
    const resolvedParts = [];
    for (const part of parts) {
        if (part === '..') {
            resolvedParts.pop();
        } else {
            resolvedParts.push(part);
        }
    }
    
    let current = root;
    const pathSegments = [];
    
    for (const part of resolvedParts) {
        if (current.type !== 'folder') {
            return null; // Cannot traverse into file
        }
        
        let foundKey = null;
        for (const key in current.children) {
            if (key.toLowerCase() === part.toLowerCase()) {
                foundKey = key;
                break;
            }
        }
        
        if (!foundKey) {
            return null; // Part not found
        }
        
        current = current.children[foundKey];
        pathSegments.push(foundKey);
    }
    
    return {
        node: current,
        path: '/' + pathSegments.join('/')
    };
}

function getParentAndName(fullPath) {
    const parts = fullPath.split('/').filter(p => p !== '' && p !== '.');
    const resolvedParts = [];
    for (const part of parts) {
        if (part === '..') {
            resolvedParts.pop();
        } else {
            resolvedParts.push(part);
        }
    }
    
    if (resolvedParts.length === 0) {
        return { parent: null, parentPath: null, name: '' };
    }
    
    const name = resolvedParts.pop();
    const parentPath = '/' + resolvedParts.join('/');
    const parentRes = resolvePath(parentPath);
    
    return {
        parent: parentRes ? parentRes.node : null,
        parentPath: parentRes ? parentRes.path : null,
        name: name
    };
}

function notifyVFSUpdate(updatedPath) {
    console.log(`[VFS] dispatching vfs-updated for path: ${updatedPath}`);
    document.dispatchEvent(new CustomEvent('vfs-updated', { detail: { path: updatedPath } }));
}

export const VFS = {
    mkdir(parentPath, folderName) {
        const parentRes = resolvePath(parentPath);
        if (!parentRes || parentRes.node.type !== 'folder') {
            return false;
        }
        
        const parentNode = parentRes.node;
        // Check duplicate
        for (const key in parentNode.children) {
            if (key.toLowerCase() === folderName.toLowerCase()) {
                return false;
            }
        }
        
        parentNode.children[folderName] = {
            type: 'folder',
            name: folderName,
            children: {},
            lastModified: new Date().toLocaleString()
        };
        
        notifyVFSUpdate(parentRes.path);
        return true;
    },
    
    createFile(parentPath, fileName, content = '') {
        const parentRes = resolvePath(parentPath);
        if (!parentRes || parentRes.node.type !== 'folder') {
            return false;
        }
        
        const parentNode = parentRes.node;
        // Check duplicate
        for (const key in parentNode.children) {
            if (key.toLowerCase() === fileName.toLowerCase()) {
                return false;
            }
        }
        
        parentNode.children[fileName] = {
            type: 'file',
            name: fileName,
            content: content,
            lastModified: new Date().toLocaleString()
        };
        
        notifyVFSUpdate(parentRes.path);
        return true;
    },
    
    deletePath(fullPath) {
        const pInfo = getParentAndName(fullPath);
        if (!pInfo.parent || !pInfo.name) {
            return false;
        }
        
        let exactName = null;
        for (const key in pInfo.parent.children) {
            if (key.toLowerCase() === pInfo.name.toLowerCase()) {
                exactName = key;
                break;
            }
        }
        
        if (!exactName) {
            return false;
        }
        
        delete pInfo.parent.children[exactName];
        notifyVFSUpdate(pInfo.parentPath);
        return true;
    },
    
    renamePath(fullPath, newName) {
        const resolved = resolvePath(fullPath);
        if (!resolved) return false;
        
        const pInfo = getParentAndName(fullPath);
        if (!pInfo.parent || !pInfo.name) return false;
        
        // Check for siblings with newName
        for (const key in pInfo.parent.children) {
            if (key.toLowerCase() === newName.toLowerCase()) {
                return false;
            }
        }
        
        let exactOldName = null;
        for (const key in pInfo.parent.children) {
            if (key.toLowerCase() === pInfo.name.toLowerCase()) {
                exactOldName = key;
                break;
            }
        }
        
        if (!exactOldName) return false;
        
        const node = pInfo.parent.children[exactOldName];
        node.name = newName;
        node.lastModified = new Date().toLocaleString();
        
        delete pInfo.parent.children[exactOldName];
        pInfo.parent.children[newName] = node;
        
        notifyVFSUpdate(pInfo.parentPath);
        return true;
    },
    
    copyPath(srcPath, destParentPath) {
        const srcRes = resolvePath(srcPath);
        if (!srcRes) return false;
        
        const destRes = resolvePath(destParentPath);
        if (!destRes || destRes.node.type !== 'folder') return false;
        
        const cloned = cloneNode(srcRes.node);
        
        // Check for target duplicate
        let finalName = cloned.name;
        let counter = 1;
        while (destRes.node.children[finalName]) {
            const parts = cloned.name.split('.');
            if (parts.length > 1 && cloned.type === 'file') {
                const ext = parts.pop();
                finalName = `${parts.join('.')}_copy${counter}.${ext}`;
            } else {
                finalName = `${cloned.name}_copy${counter}`;
            }
            counter++;
        }
        
        cloned.name = finalName;
        destRes.node.children[finalName] = cloned;
        
        notifyVFSUpdate(destRes.path);
        return true;
    },
    
    movePath(srcPath, destParentPath) {
        const srcRes = resolvePath(srcPath);
        if (!srcRes) return false;
        
        const destRes = resolvePath(destParentPath);
        if (!destRes || destRes.node.type !== 'folder') return false;
        
        const pInfo = getParentAndName(srcPath);
        if (!pInfo.parent || !pInfo.name) return false;
        
        let exactOldName = null;
        for (const key in pInfo.parent.children) {
            if (key.toLowerCase() === pInfo.name.toLowerCase()) {
                exactOldName = key;
                break;
            }
        }
        
        if (!exactOldName) return false;
        
        const node = pInfo.parent.children[exactOldName];
        
        // Check for target duplicate
        let finalName = node.name;
        let counter = 1;
        while (destRes.node.children[finalName]) {
            const parts = node.name.split('.');
            if (parts.length > 1 && node.type === 'file') {
                const ext = parts.pop();
                finalName = `${parts.join('.')}_copy${counter}.${ext}`;
            } else {
                finalName = `${node.name}_copy${counter}`;
            }
            counter++;
        }
        
        node.name = finalName;
        node.lastModified = new Date().toLocaleString();
        
        delete pInfo.parent.children[exactOldName];
        destRes.node.children[finalName] = node;
        
        notifyVFSUpdate(pInfo.parentPath);
        notifyVFSUpdate(destRes.path);
        return true;
    },
    
    listDirectory(path) {
        const res = resolvePath(path);
        if (!res || res.node.type !== 'folder') return null;
        return Object.values(res.node.children);
    },
    
    readFile(path) {
        const res = resolvePath(path);
        if (!res || res.node.type !== 'file') return null;
        return res.node.content;
    },
    
    writeFile(path, content) {
        const res = resolvePath(path);
        if (res && res.node.type === 'file') {
            res.node.content = content;
            res.node.lastModified = new Date().toLocaleString();
            
            const pInfo = getParentAndName(res.path);
            notifyVFSUpdate(pInfo.parentPath || '/');
            return true;
        }
        
        // If not found, try to create in parent
        const pInfo = getParentAndName(path);
        if (pInfo.parent && pInfo.parent.type === 'folder') {
            pInfo.parent.children[pInfo.name] = {
                type: 'file',
                name: pInfo.name,
                content: content,
                lastModified: new Date().toLocaleString()
            };
            notifyVFSUpdate(pInfo.parentPath);
            return true;
        }
        
        return false;
    },
    
    resolveAbsolutePath(path) {
        const res = resolvePath(path);
        return res ? res.path : null;
    },

    exists(path) {
        return resolvePath(path) !== null;
    },

    isFolder(path) {
        const res = resolvePath(path);
        return res && res.node.type === 'folder';
    }
};

window.VFS = VFS;

export function initVFS() {
    console.log('[felbicos] Unified Virtual File System (VFS) Initialized.');
}
