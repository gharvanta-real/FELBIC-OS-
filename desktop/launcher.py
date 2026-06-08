# AIOS Launcher — Spotlight-style Natural Language HUD
import gi
import subprocess
gi.require_version('Gtk', '4.0')
gi.require_version('Adw', '1')
from gi.repository import Gtk, Gdk, GLib, Adw

from ipc_client import AiosIpcClient

try:
    gi.require_version('Gtk4LayerShell', '1.0')
    from gi.repository import Gtk4LayerShell
    HAS_LAYER_SHELL = True
except ValueError:
    HAS_LAYER_SHELL = False

class Launcher(Gtk.ApplicationWindow):
    def __init__(self, app, ipc_client: AiosIpcClient):
        super().__init__(application=app)
        self.ipc = ipc_client
        self.set_title("AIOS Spotlight")
        
        # Setup layer shell for full screen overlay with focus
        if HAS_LAYER_SHELL:
            Gtk4LayerShell.init_for_window(self)
            Gtk4LayerShell.set_layer(self, Gtk4LayerShell.Layer.OVERLAY)
            Gtk4LayerShell.set_keyboard_mode(self, Gtk4LayerShell.KeyboardMode.EXCLUSIVE)
            
            # Anchor to all edges to capture clicks on background
            Gtk4LayerShell.set_anchor(self, Gtk4LayerShell.Edge.TOP, True)
            Gtk4LayerShell.set_anchor(self, Gtk4LayerShell.Edge.BOTTOM, True)
            Gtk4LayerShell.set_anchor(self, Gtk4LayerShell.Edge.LEFT, True)
            Gtk4LayerShell.set_anchor(self, Gtk4LayerShell.Edge.RIGHT, True)
        else:
            self.set_default_size(700, 500)
            
        self.init_ui()
        self.setup_actions()
        
    def init_ui(self):
        # Semi-transparent backdrop overlay box
        overlay_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL)
        overlay_box.set_halign(Gtk.Align.FILL)
        overlay_box.set_valign(Gtk.Align.FILL)
        
        # Click gesture to close when clicking the background
        click_gesture = Gtk.GestureClick()
        click_gesture.connect("pressed", self.on_backdrop_clicked)
        overlay_box.add_controller(click_gesture)
        
        # Center card container (Spotlight HUD)
        self.hud_card = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=14)
        self.hud_card.add_css_class("launcher-card")
        self.hud_card.set_size_request(650, 420)
        self.hud_card.set_halign(Gtk.Align.CENTER)
        self.hud_card.set_valign(Gtk.Align.CENTER)
        
        # Prevent clicks inside the card from closing the launcher
        card_gesture = Gtk.GestureClick()
        card_gesture.connect("pressed", lambda g, n, x, y: None)
        self.hud_card.add_controller(card_gesture)
        
        # 1. Search Entry
        self.search_entry = Gtk.Entry()
        self.search_entry.add_css_class("launcher-search-entry")
        self.search_entry.set_placeholder_text("Type an app, search files, or ask AI...")
        self.search_entry.connect("changed", self.on_search_changed)
        self.search_entry.connect("activate", self.on_search_activated)
        self.hud_card.append(self.search_entry)
        
        # 2. Results List
        self.results_scroll = Gtk.ScrolledWindow()
        self.results_scroll.set_propagate_natural_height(True)
        self.results_scroll.set_hexpand(True)
        self.results_scroll.set_vexpand(True)
        
        self.results_list = Gtk.ListBox()
        self.results_list.set_selection_mode(Gtk.SelectionMode.SINGLE)
        self.results_list.connect("row-activated", self.on_row_activated)
        self.results_scroll.set_child(self.results_list)
        
        self.hud_card.append(self.results_scroll)
        
        # 3. AI Inline Answer area (collapsible)
        self.ai_answer_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=8)
        self.ai_answer_box.set_margin_top(8)
        self.ai_answer_box.set_visible(False)
        
        sep = Gtk.Separator()
        self.ai_answer_box.append(sep)
        
        self.ai_answer_title = Gtk.Label()
        self.ai_answer_title.set_halign(Gtk.Align.START)
        self.ai_answer_title.add_css_class("top-bar-title")
        self.ai_answer_box.append(self.ai_answer_title)
        
        self.ai_answer_label = Gtk.Label()
        self.ai_answer_label.set_wrap(True)
        self.ai_answer_label.set_selectable(True)
        self.ai_answer_label.set_halign(Gtk.Align.START)
        self.ai_answer_box.append(self.ai_answer_label)
        
        self.hud_card.append(self.ai_answer_box)
        
        overlay_box.append(self.hud_card)
        self.set_child(overlay_box)

    def setup_actions(self):
        # Close on Escape key press
        key_controller = Gtk.EventControllerKey()
        key_controller.connect("key-pressed", self.on_key_pressed)
        self.add_controller(key_controller)

    def on_backdrop_clicked(self, gesture, n_press, x, y):
        self.close_launcher()

    def on_key_pressed(self, controller, keyval, keycode, state):
        if keyval == Gdk.KEY_Escape:
            self.close_launcher()
            return True
        return False

    def close_launcher(self):
        self.set_visible(False)

    def open_launcher(self):
        self.set_visible(True)
        self.search_entry.grab_focus()
        self.search_entry.set_text("")
        self.ai_answer_box.set_visible(False)
        self.clear_results()
        self.populate_default_actions()

    def clear_results(self):
        while True:
            row = self.results_list.get_row_at_index(0)
            if not row:
                break
            self.results_list.remove(row)

    def populate_default_actions(self):
        # Default options when text box is empty
        self.add_result_row("Terminal", "Launch Foot terminal emulator", "foot")
        self.add_result_row("Files", "Semantic AI File Browser", "filemanager")
        self.add_result_row("Settings", "System configuration and AI Permissions", "settings")

    def add_result_row(self, title, desc, action_type, metadata=None):
        row_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=2)
        row_box.add_css_class("launcher-suggestion-row")
        
        title_lbl = Gtk.Label(label=title)
        title_lbl.set_halign(Gtk.Align.START)
        title_lbl.add_css_class("top-bar-title")
        
        desc_lbl = Gtk.Label(label=desc)
        desc_lbl.set_halign(Gtk.Align.START)
        
        row_box.append(title_lbl)
        row_box.append(desc_lbl)
        
        # Attach values for callback
        row_box.action_type = action_type
        row_box.metadata = metadata
        row_box.title = title
        
        self.results_list.append(row_box)

    def on_search_changed(self, entry):
        text = entry.get_text().strip()
        self.ai_answer_box.set_visible(False)
        
        if not text:
            self.clear_results()
            self.populate_default_actions()
            return
            
        self.clear_results()
        
        # Option 1: AI Prompt query
        self.add_result_row("Ask AIOS", f"Run query: \"{text}\"", "ai_query", text)
        
        # Option 2: Search Files matching indexer
        def on_search_done(items, err):
            if items:
                GLib.idle_add(self.display_file_results, items)
                
        self.ipc.search_files(text, limit=5, callback=on_search_done)

    def display_file_results(self, items):
        # items is list of paths matching the search
        for path in items:
            name = path.split("/")[-1]
            self.add_result_row(name, f"Open: {path}", "file_open", path)

    def on_search_activated(self, entry):
        # Trigger first result
        row = self.results_list.get_row_at_index(0)
        if row:
            self.on_row_activated(self.results_list, row)

    def on_row_activated(self, listbox, row):
        widget = row.get_child()
        action = widget.action_type
        metadata = widget.metadata
        
        if action == "foot":
            subprocess.Popen(["foot"])
            self.close_launcher()
        elif action == "filemanager":
            subprocess.Popen(["python", "/usr/share/desktop/filemanager.py"])
            self.close_launcher()
        elif action == "settings":
            subprocess.Popen(["python", "/usr/share/desktop/settings.py"])
            self.close_launcher()
        elif action == "file_open":
            # Open file using default app
            subprocess.Popen(["xdg-open", metadata])
            self.close_launcher()
        elif action == "ai_query":
            # Run AI Query inline
            self.run_ai_query(metadata)

    def run_ai_query(self, prompt):
        self.ai_answer_title.set_label("AIOS Thinking...")
        self.ai_answer_label.set_label("Querying system LLM daemon...")
        self.ai_answer_box.set_visible(True)
        
        def on_ai_done(response, err):
            GLib.idle_add(self.display_ai_response, response, err)
            
        self.ipc.query_ai(prompt, on_ai_done)

    def display_ai_response(self, response, err):
        if err:
            self.ai_answer_title.set_label("AI Daemon Error")
            self.ai_answer_label.set_label(err)
        else:
            self.ai_answer_title.set_label("AIOS Response")
            self.ai_answer_label.set_label(response)
