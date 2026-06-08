# AIOS Preferences & AI Permissions Manager
import gi
import os
gi.require_version('Gtk', '4.0')
gi.require_version('Adw', '1')
from gi.repository import Gtk, Gdk, GLib, Adw

from ipc_client import AiosIpcClient

class SettingsApp(Adw.Application):
    def __init__(self):
        super().__init__(application_id="dev.felbicos.settings")
        self.ipc = AiosIpcClient()
        self.connect("activate", self.on_activate)

    def on_activate(self, app):
        self.win = SettingsWindow(app, self.ipc)
        self.win.present()

class SettingsWindow(Adw.ApplicationWindow):
    def __init__(self, app, ipc_client: AiosIpcClient):
        super().__init__(application=app)
        self.ipc = ipc_client
        self.set_title("AIOS Settings")
        self.set_default_size(750, 500)
        
        # Load user capabilities from $HOME/.aios/permissions.toml
        self.policy_dir = os.path.expanduser("~/.aios")
        self.policy_path = os.path.join(self.policy_dir, "permissions.toml")
        
        # Default capabilities
        self.capabilities = {
            "stats_read": "allow",
            "fs_read": "allow",
            "fs_write": "deny",
            "process_list": "allow",
            "process_kill": "deny",
            "system_control": "deny"
        }
        self.load_permissions()
        
        self.init_ui()

    def init_ui(self):
        self.add_css_class("glass-panel")
        
        # Header bar
        header = Adw.HeaderBar()
        self.set_titlebar(header)
        
        # Preferences Window container
        view = Adw.PreferencesWindow()
        view.set_hexpand(True)
        view.set_vexpand(True)
        
        # Page 1: General Settings
        general_page = Adw.PreferencesPage()
        general_page.set_title("General")
        general_page.set_icon_name("preferences-other-symbolic")
        
        # Group: Appearance
        appearance_group = Adw.PreferencesGroup()
        appearance_group.set_title("Appearance")
        
        # Dark Theme Toggle
        theme_row = Adw.ActionRow()
        theme_row.set_title("Dark Theme")
        theme_row.set_subtitle("Enable high-contrast glassmorphic styling")
        theme_switch = Gtk.Switch()
        theme_switch.set_active(True)
        theme_switch.set_valign(Gtk.Align.CENTER)
        theme_row.add_suffix(theme_switch)
        appearance_group.add(theme_row)
        
        # Scale select
        scale_row = Adw.ActionRow()
        scale_row.set_title("Display Scale")
        scale_row.set_subtitle("Adjust UI scaling resolution")
        scale_dropdown = Gtk.DropDown.new_from_strings(["1.0x", "1.25x", "1.5x", "2.0x"])
        scale_dropdown.set_selected(0)
        scale_dropdown.set_valign(Gtk.Align.CENTER)
        scale_row.add_suffix(scale_dropdown)
        appearance_group.add(scale_row)
        
        general_page.add(appearance_group)
        
        # Group: Audio
        audio_group = Adw.PreferencesGroup()
        audio_group.set_title("Audio")
        
        audio_row = Adw.ActionRow()
        audio_row.set_title("Master Volume")
        audio_slider = Gtk.Scale.new_with_range(Gtk.Orientation.HORIZONTAL, 0, 100, 1)
        audio_slider.set_value(70)
        audio_slider.set_size_request(200, -1)
        audio_slider.set_valign(Gtk.Align.CENTER)
        audio_slider.connect("value-changed", self.on_volume_changed)
        audio_row.add_suffix(audio_slider)
        audio_group.add(audio_row)
        
        general_page.add(audio_group)
        view.add(general_page)
        
        # Page 2: AI Permissions (ACL)
        acl_page = Adw.PreferencesPage()
        acl_page.set_title("AI Access Permissions")
        acl_page.set_icon_name("security-high-symbolic")
        
        acl_group = Adw.PreferencesGroup()
        acl_group.set_title("System Capabilities Authorization")
        acl_group.set_description("Manage permissions allowed for the system AI agent interface.")
        
        # Add a row for each capability
        cap_details = [
            ("stats_read", "Read System Stats", "Allows the AI to monitor CPU, memory and GPU levels."),
            ("fs_read", "Read File Indexes", "Allows the AI to search and read user directory documents."),
            ("fs_write", "Modify Filesystems", "Allows the AI to create, delete, and organize files on-disk."),
            ("process_list", "View Running Programs", "Allows the AI to list all running operating system tasks."),
            ("process_kill", "Terminate Applications", "Allows the AI to end/kill running system processes."),
            ("system_control", "Adjust Hardware Parameters", "Allows the AI to set volume, screen brightness, and power states.")
        ]
        
        for key, title, desc in cap_details:
            row = Adw.ActionRow()
            row.set_title(title)
            row.set_subtitle(desc)
            
            switch = Gtk.Switch()
            switch.set_active(self.capabilities.get(key) == "allow")
            switch.set_valign(Gtk.Align.CENTER)
            # Bind change event using closure
            switch.connect("state-set", self.make_perm_handler(key))
            
            row.add_suffix(switch)
            acl_group.add(row)
            
        acl_page.add(acl_group)
        view.add(acl_page)
        
        self.set_child(view)

    def load_permissions(self):
        if not os.path.exists(self.policy_path):
            return
            
        try:
            with open(self.policy_path, "r") as f:
                for line in f:
                    if "=" in line:
                        k, v = line.split("=")
                        k = k.strip()
                        v = v.strip().replace('"', '').replace("'", "")
                        if k in self.capabilities:
                            self.capabilities[k] = v
        except Exception as e:
            print(f"Error reading permissions configuration: {e}")

    def save_permissions(self):
        os.makedirs(self.policy_dir, exist_ok=True)
        try:
            with open(self.policy_path, "w") as f:
                f.write("[capabilities]\n")
                for k, v in self.capabilities.items():
                    f.write(f'{k} = "{v}"\n')
        except Exception as e:
            print(f"Error saving permissions configuration: {e}")

    def make_perm_handler(self, cap_key):
        def on_toggle(switch, state):
            decision = "allow" if state else "deny"
            self.capabilities[cap_key] = decision
            self.save_permissions()
            return False # Allow default behavior
        return on_toggle

    def on_volume_changed(self, scale):
        val = int(scale.get_value())
        self.ipc.set_system_control("volume", val)

if __name__ == "__main__":
    app = SettingsApp()
    app.run(None)
