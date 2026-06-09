# AIOS Semantic File Manager
import gi
import os
gi.require_version('Gtk', '4.0')
gi.require_version('Adw', '1')
from gi.repository import Gtk, Gdk, GLib, Adw

from ipc_client import AiosIpcClient

class FileManagerApp(Adw.Application):
    def __init__(self):
        super().__init__(application_id="dev.felbicos.filemanager")
        self.ipc = AiosIpcClient()
        self.connect("activate", self.on_activate)

    def on_activate(self, app):
        self.win = FileManagerWindow(app, self.ipc)
        self.win.present()

class FileManagerWindow(Adw.ApplicationWindow):
    def __init__(self, app, ipc_client: AiosIpcClient):
        super().__init__(application=app)
        self.ipc = ipc_client
        self.set_title("AIOS Files")
        self.set_default_size(900, 600)
        
        self.current_dir = os.path.expanduser("~")
        self.selected_file = None
        
        self.init_ui()
        self.load_directory()

    def init_ui(self):
        # Apply CSS styling
        self.add_css_class("glass-panel")
        
        # Header bar
        header = Adw.HeaderBar()
        self.set_titlebar(header)
        
        # Path Bar display widget
        self.path_lbl = Gtk.Label()
        self.path_lbl.add_css_class("top-bar-title")
        header.set_title_widget(self.path_lbl)
        
        # Back button
        back_icon = Gtk.Image.new_from_icon_name("go-previous-symbolic")
        back_btn = Gtk.Button()
        back_btn.set_child(back_icon)
        back_btn.connect("clicked", self.on_back_clicked)
        header.pack_start(back_btn)
        
        # Main layout splitting folder view and AI Sidebar
        paned = Gtk.Paned(orientation=Gtk.Orientation.HORIZONTAL)
        paned.set_position(550)
        
        # 1. Left side: File Explorer List View
        explorer_scroll = Gtk.ScrolledWindow()
        explorer_scroll.set_hexpand(True)
        explorer_scroll.set_vexpand(True)
        
        self.explorer_list = Gtk.ListBox()
        self.explorer_list.set_selection_mode(Gtk.SelectionMode.SINGLE)
        self.explorer_list.connect("row-activated", self.on_file_activated)
        self.explorer_list.connect("row-selected", self.on_file_selected)
        explorer_scroll.set_child(self.explorer_list)
        paned.set_start_child(explorer_scroll)
        
        # 2. Right side: AI Sidebar
        sidebar_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=10)
        sidebar_box.add_css_class("ai-sidebar")
        sidebar_box.set_size_request(300, -1)
        
        # Sidebar Title
        sb_title = Gtk.Label(label="AI Copilot")
        sb_title.add_css_class("ai-sidebar-title")
        sb_title.set_halign(Gtk.Align.START)
        sidebar_box.append(sb_title)
        
        # AI Output Log (Scrolled box)
        self.ai_log_scroll = Gtk.ScrolledWindow()
        self.ai_log_scroll.set_vexpand(True)
        
        self.ai_log_label = Gtk.Label(label="Select a file and click 'Summarize' or ask a question about this folder.")
        self.ai_log_label.set_wrap(True)
        self.ai_log_label.set_selectable(True)
        self.ai_log_label.add_css_class("ai-chat-area")
        self.ai_log_label.set_valign(Gtk.Align.START)
        self.ai_log_label.set_halign(Gtk.Align.START)
        self.ai_log_scroll.set_child(self.ai_log_label)
        sidebar_box.append(self.ai_log_scroll)
        
        # Quick action buttons
        actions_box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=6)
        
        self.summary_btn = Gtk.Button(label="Summarize")
        self.summary_btn.connect("clicked", self.on_summarize_clicked)
        self.summary_btn.set_sensitive(False)
        actions_box.append(self.summary_btn)
        
        self.organize_btn = Gtk.Button(label="Organize Folder")
        self.organize_btn.connect("clicked", self.on_organize_clicked)
        actions_box.append(self.organize_btn)
        
        sidebar_box.append(actions_box)
        
        # Sidebar User Input Prompt
        prompt_box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=6)
        self.prompt_entry = Gtk.Entry()
        self.prompt_entry.add_css_class("ai-input-entry")
        self.prompt_entry.set_placeholder_text("Ask AI about files...")
        self.prompt_entry.set_hexpand(True)
        self.prompt_entry.connect("activate", self.on_prompt_submitted)
        
        submit_btn = Gtk.Button()
        submit_btn.set_child(Gtk.Image.new_from_icon_name("paper-airplane-symbolic"))
        submit_btn.connect("clicked", self.on_prompt_submitted)
        
        prompt_box.append(self.prompt_entry)
        prompt_box.append(submit_btn)
        sidebar_box.append(prompt_box)
        
        paned.set_end_child(sidebar_box)
        
        self.set_child(paned)

    def load_directory(self):
        self.path_lbl.set_label(self.current_dir)
        self.selected_file = None
        self.summary_btn.set_sensitive(False)
        
        # Clear list
        while True:
            row = self.explorer_list.get_row_at_index(0)
            if not row:
                break
            self.explorer_list.remove(row)
            
        try:
            # Query daemon's fs/list to get files (or fall back to standard os.listdir)
            # Connecting to actual Daemon gives security authorization context!
            def on_list_done(items, err):
                if err:
                    # Fallback to local files if daemon is not running
                    GLib.idle_add(self.load_local_directory)
                else:
                    GLib.idle_add(self.display_items, items)
                    
            self.ipc.list_files(self.current_dir, callback=on_list_done)
        except Exception:
            self.load_local_directory()

    def load_local_directory(self):
        try:
            items = []
            for name in os.listdir(self.current_dir):
                full = os.path.join(self.current_dir, name)
                is_dir = os.path.isdir(full)
                items.append({"name": name, "isDir": is_dir})
            self.display_items(items)
        except Exception as e:
            self.ai_log_label.set_label(f"Error loading path: {e}")

    def display_items(self, items):
        # Sort directories first
        items.sort(key=lambda x: (not x.get("isDir", False), x.get("name").lower()))
        
        for item in items:
            name = item.get("name")
            is_dir = item.get("isDir", False)
            
            box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=10)
            box.set_margin_top(6)
            box.set_margin_bottom(6)
            box.set_margin_start(10)
            
            icon_name = "folder-symbolic" if is_dir else "document-symbolic"
            icon = Gtk.Image.new_from_icon_name(icon_name)
            
            lbl = Gtk.Label(label=name)
            
            box.append(icon)
            box.append(lbl)
            
            # Save attributes inside row box
            box.name = name
            box.is_dir = is_dir
            
            self.explorer_list.append(box)

    def on_back_clicked(self, btn):
        parent = os.path.dirname(self.current_dir)
        if parent != self.current_dir:
            self.current_dir = parent
            self.load_directory()

    def on_file_activated(self, listbox, row):
        widget = row.get_child()
        name = widget.name
        is_dir = widget.is_dir
        
        full_path = os.path.join(self.current_dir, name)
        if is_dir:
            self.current_dir = full_path
            self.load_directory()
        else:
            # Try launching with open command
            os.system(f"xdg-open '{full_path}' &")

    def on_file_selected(self, listbox, row):
        if not row:
            self.selected_file = None
            self.summary_btn.set_sensitive(False)
            return
            
        widget = row.get_child()
        if not widget.is_dir:
            self.selected_file = os.path.join(self.current_dir, widget.name)
            self.summary_btn.set_sensitive(True)
        else:
            self.selected_file = None
            self.summary_btn.set_sensitive(False)

    def on_summarize_clicked(self, btn):
        if not self.selected_file:
            return
            
        self.ai_log_label.set_label(f"Reading file contents: {self.selected_file}...")
        
        def on_read_done(content, err):
            if err:
                GLib.idle_add(self.ai_log_label.set_label, f"Could not read file contents: {err}")
            else:
                GLib.idle_add(self.request_ai_summary, content)
                
        self.ipc.read_file(self.selected_file, callback=on_read_done)

    def request_ai_summary(self, content):
        self.ai_log_label.set_label("AI is reading and compiling summary...")
        
        # Handle binary or extremely long files
        if len(content) > 10000:
            content = content[:10000] + "\n[Truncated...]"
            
        prompt = f"Provide a brief, high-level summary of the following file content:\n\n{content}"
        
        def on_ai_done(resp, err):
            if err:
                GLib.idle_add(self.ai_log_label.set_label, f"AI Summary failed: {err}")
            else:
                GLib.idle_add(self.ai_log_label.set_label, resp)
                
        self.ipc.query_ai(prompt, callback=on_ai_done)

    def on_organize_clicked(self, btn):
        prompt = f"Explain a plan to organize the files in the directory '{self.current_dir}' by sorting them into logical subfolders."
        self.ai_log_label.set_label("AI is analyzing folder contents...")
        
        def on_ai_done(resp, err):
            if err:
                GLib.idle_add(self.ai_log_label.set_label, f"AI action failed: {err}")
            else:
                GLib.idle_add(self.ai_log_label.set_label, resp)
                
        self.ipc.query_ai(prompt, callback=on_ai_done)

    def on_prompt_submitted(self, widget):
        prompt = self.prompt_entry.get_text().strip()
        if not prompt:
            return
            
        self.prompt_entry.set_text("")
        self.ai_log_label.set_label(f"User Prompt: {prompt}\n\nAI is formulating response...")
        
        # Build prompt adding current folder context
        context_prompt = f"In the context of the directory '{self.current_dir}' and selected file '{self.selected_file}', execute or answer: {prompt}"
        
        def on_ai_done(resp, err):
            if err:
                GLib.idle_add(self.ai_log_label.set_label, f"Query failed: {err}")
            else:
                GLib.idle_add(self.ai_log_label.set_label, resp)
                
        self.ipc.query_ai(context_prompt, callback=on_ai_done)

if __name__ == "__main__":
    app = FileManagerApp()
    app.run(None)
