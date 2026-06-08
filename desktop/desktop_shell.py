# AIOS Desktop Shell — Main Coordinator
import gi
import os
import sys
import signal
gi.require_version('Gtk', '4.0')
gi.require_version('Adw', '1')
from gi.repository import Gtk, Gdk, GLib, Adw

from ipc_client import AiosIpcClient
from top_bar import TopBar
from dock import Dock
from launcher import Launcher

class DesktopShellApp(Adw.Application):
    def __init__(self):
        super().__init__(application_id="dev.felbicos.desktop")
        self.ipc = AiosIpcClient()
        self.connect("activate", self.on_activate)

    def on_activate(self, app):
        # 1. Apply Stylesheet
        self.load_styles()
        
        # 2. Initialize HUD Launcher (Hidden initially)
        self.launcher = Launcher(app, self.ipc)
        self.launcher.set_visible(False)
        
        # 3. Initialize Panels
        self.top_bar = TopBar(app, self.ipc)
        self.top_bar.present()
        
        self.dock = Dock(app, toggle_launcher_callback=self.toggle_launcher)
        self.dock.present()
        
        # 4. Handle SIGUSR1 to toggle launcher (sent from keyboard shortcuts or compositor)
        self.setup_signals()

    def load_styles(self):
        css_provider = Gtk.CssProvider()
        
        # Look in standard install path first, fallback to local script dir
        paths = [
            "/usr/share/desktop/styles.css",
            os.path.join(os.path.dirname(os.path.realpath(__file__)), "styles.css")
        ]
        
        loaded = False
        for path in paths:
            if os.path.exists(path):
                css_provider.load_from_path(path)
                loaded = True
                break
                
        if loaded:
            Gtk.StyleContext.add_provider_for_display(
                Gdk.Display.get_default(),
                css_provider,
                Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION
            )
        else:
            print("Warning: styles.css stylesheet not found!")

    def toggle_launcher(self):
        if self.launcher.get_visible():
            self.launcher.close_launcher()
        else:
            self.launcher.open_launcher()

    def setup_signals(self):
        # Save PID to file so compositor/helper scripts know where to send SIGUSR1
        pid_dir = "/run/user/%d" % os.getuid()
        if not os.path.exists(pid_dir):
            pid_dir = "/tmp"
            
        pid_file = os.path.join(pid_dir, "aios-shell.pid")
        try:
            with open(pid_file, "w") as f:
                f.write(str(os.getpid()))
        except Exception as e:
            print(f"Warning: Could not write pid file: {e}")
            
        # Bind SIGUSR1
        def signal_handler(signum, frame):
            # Run GTK UI modification on main GLib loop thread
            GLib.idle_add(self.toggle_launcher)
            
        signal.signal(signal.SIGUSR1, signal_handler)

if __name__ == "__main__":
    app = DesktopShellApp()
    app.run(sys.argv)
