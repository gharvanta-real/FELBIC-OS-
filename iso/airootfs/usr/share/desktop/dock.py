# AIOS Dock — Wayland layer bottom app dock
import gi
import subprocess
gi.require_version('Gtk', '4.0')
gi.require_version('Adw', '1')
from gi.repository import Gtk, Gdk, GLib, Adw

try:
    gi.require_version('Gtk4LayerShell', '1.0')
    from gi.repository import Gtk4LayerShell
    HAS_LAYER_SHELL = True
except ValueError:
    HAS_LAYER_SHELL = False

class Dock(Gtk.ApplicationWindow):
    def __init__(self, app, toggle_launcher_callback=None):
        super().__init__(application=app)
        self.toggle_launcher = toggle_launcher_callback
        self.set_title("AIOS Dock")
        
        # Apply Layer Shell rules if available
        if HAS_LAYER_SHELL:
            Gtk4LayerShell.init_for_window(self)
            Gtk4LayerShell.set_layer(self, Gtk4LayerShell.Layer.TOP)
            Gtk4LayerShell.auto_exclusive_zone_enable(self)
            Gtk4LayerShell.set_anchor(self, Gtk4LayerShell.Edge.BOTTOM, True)
            Gtk4LayerShell.set_anchor(self, Gtk4LayerShell.Edge.TOP, False)
            Gtk4LayerShell.set_anchor(self, Gtk4LayerShell.Edge.LEFT, False)
            Gtk4LayerShell.set_anchor(self, Gtk4LayerShell.Edge.RIGHT, False)
            # Center the dock at the bottom
            Gtk4LayerShell.set_margin(self, Gtk4LayerShell.Edge.BOTTOM, 12)
        else:
            self.set_default_size(600, 70)
            
        self.init_ui()
        
    def init_ui(self):
        # Master CSS classes
        self.add_css_class("dock-window")
        
        # Dock Layout
        dock_box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=16)
        dock_box.set_halign(Gtk.Align.CENTER)
        
        # App list configuration (name, icon_name, command_or_callback)
        apps = [
            ("Launcher", "system-search-symbolic", self.on_launcher_clicked),
            ("Files", "folder-symbolic", "python /usr/share/desktop/filemanager.py"),
            ("Terminal", "utilities-terminal-symbolic", "foot"),
            ("Browser", "web-browser-symbolic", "chromium"),
            ("Settings", "preferences-system-symbolic", "python /usr/share/desktop/settings.py"),
        ]
        
        for name, icon, target in apps:
            btn = Gtk.Button()
            btn.add_css_class("dock-icon-btn")
            btn.set_tooltip_text(name)
            
            img = Gtk.Image.new_from_icon_name(icon)
            img.set_icon_size(Gtk.IconSize.LARGE)
            btn.set_child(img)
            
            # Connect action
            if callable(target):
                btn.connect("clicked", target)
            else:
                btn.connect("clicked", self.on_app_clicked, target)
                
            dock_box.append(btn)
            
        self.set_child(dock_box)

    def on_launcher_clicked(self, btn):
        if self.toggle_launcher:
            self.toggle_launcher()

    def on_app_clicked(self, btn, command):
        try:
            # Run app non-blocking
            subprocess.Popen(command.split())
        except Exception as e:
            dialog = Gtk.AlertDialog(
                message=f"Failed to launch: {command}",
                detail=str(e)
            )
            dialog.show(self)
