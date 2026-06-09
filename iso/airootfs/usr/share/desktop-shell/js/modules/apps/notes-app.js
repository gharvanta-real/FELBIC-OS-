/* ==========================================================================
   FELBIC OS — NOTES APPLICATION MODULE
   ========================================================================== */

export function initNotesApp() {
    console.log('[notes-app] Initializing Notes App...');

    const win = document.getElementById('notes-window');
    if (!win) return;

    const listContainer = document.getElementById('notes-list-container');
    const newNoteBtn = document.getElementById('notes-new-note');
    const searchInput = document.getElementById('notes-search');

    const editorPanel = document.getElementById('notes-editor-panel');
    const emptyState = document.getElementById('notes-empty-state');
    const titleInput = document.getElementById('note-title-input');
    const bodyTextarea = document.getElementById('note-body-textarea');
    const tagSelect = document.getElementById('note-tag-select');
    const deleteBtn = document.getElementById('notes-delete-btn');

    // Local State
    let notes = [];
    try {
        notes = JSON.parse(localStorage.getItem('aios_notes_data') || '[]');
        if (!Array.isArray(notes)) notes = [];
    } catch (e) {
        console.error('[notes-app] Error parsing notes from localStorage:', e);
        notes = [];
    }
    let activeNoteId = null;

    // 1. Render Note List Sidebar
    function renderNotesList() {
        if (!listContainer) return;
        listContainer.innerHTML = '';

        const query = searchInput ? searchInput.value.toLowerCase().trim() : '';

        // Filter notes by search query defensively
        const filtered = notes.filter(n => {
            const title = (n && n.title) ? String(n.title).toLowerCase() : '';
            const body = (n && n.body) ? String(n.body).toLowerCase() : '';
            return title.includes(query) || body.includes(query);
        });

        if (filtered.length === 0) {
            listContainer.innerHTML = `<div style="font-size: 10px; color: var(--text-muted); text-align: center; margin-top: 20px;">No Notes</div>`;
            return;
        }

        // Sort notes by date (most recent first)
        filtered.sort((a, b) => b.date - a.date);

        filtered.forEach(note => {
            const card = document.createElement('div');
            card.className = 'notes-item-card';
            if (note.id === activeNoteId) card.classList.add('active');

            // Format date Modified
            const noteDate = new Date(note.date);
            const dateStr = noteDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

            const descSnippet = note.body ? note.body.trim().substring(0, 40) : 'No additional text';

            card.innerHTML = `
                <span class="notes-item-title">${note.title || 'Untitled Note'}</span>
                <span class="notes-item-desc">${descSnippet}</span>
                <div class="notes-item-meta">
                    <span class="notes-item-date">${dateStr}</span>
                    <span class="notes-item-tag tag-${note.tag}">${note.tag}</span>
                </div>
            `;

            // Select Note click event
            card.addEventListener('click', () => {
                selectNote(note.id);
            });

            listContainer.appendChild(card);
        });
    }

    // 2. Select Note to Edit
    function selectNote(noteId) {
        activeNoteId = noteId;
        const note = notes.find(n => n.id === noteId);
        
        if (!note) {
            // reset editor panel
            activeNoteId = null;
            if (editorPanel) editorPanel.style.display = 'none';
            if (emptyState) emptyState.style.display = 'flex';
            return;
        }

        // Show editor, hide empty state
        if (editorPanel) editorPanel.style.display = 'flex';
        if (emptyState) emptyState.style.display = 'none';

        // Populate editor fields
        if (titleInput) titleInput.value = note.title;
        if (bodyTextarea) bodyTextarea.value = note.body;
        if (tagSelect) tagSelect.value = note.tag;

        renderNotesList();
    }

    // 3. Create Note
    function createNewNote() {
        const newNote = {
            id: Date.now().toString(),
            title: 'New Note',
            body: '',
            tag: 'work',
            date: Date.now()
        };

        notes.push(newNote);
        saveNotesData();
        selectNote(newNote.id);
    }

    // 4. Delete Note
    function deleteActiveNote() {
        if (!activeNoteId) return;

        notes = notes.filter(n => n.id !== activeNoteId);
        saveNotesData();
        selectNote(null);
    }

    // 5. Save Notes data to LocalStorage
    function saveNotesData() {
        localStorage.setItem('aios_notes_data', JSON.stringify(notes));
    }

    // 6. Handle input updates in Editor
    function handleNoteUpdate() {
        if (!activeNoteId) return;

        const note = notes.find(n => n.id === activeNoteId);
        if (!note) return;

        note.title = titleInput ? titleInput.value : '';
        note.body = bodyTextarea ? bodyTextarea.value : '';
        note.tag = tagSelect ? tagSelect.value : 'work';
        note.date = Date.now();

        saveNotesData();
        
        // Re-render note list details in sidebar (without losing selection focus)
        renderNotesList();
    }

    // 7. Event listeners
    if (newNoteBtn) newNoteBtn.addEventListener('click', createNewNote);
    if (deleteBtn) deleteBtn.addEventListener('click', deleteActiveNote);
    if (searchInput) searchInput.addEventListener('input', renderNotesList);

    // Event updates in text areas/select boxes
    if (titleInput) titleInput.addEventListener('input', handleNoteUpdate);
    if (bodyTextarea) bodyTextarea.addEventListener('input', handleNoteUpdate);
    if (tagSelect) tagSelect.addEventListener('change', handleNoteUpdate);

    // Initial render
    renderNotesList();
}
