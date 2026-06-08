# AIOS Top Bar — Wayland layer top panel
import gi
import time
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

class TopBar(Gtk.ApplicationWindow):
    def __init__(self, app, ipc_client: AiosIpcClient):
        super().__init__(application=app)
        self.ipc = ipc_client
        self.set_title("AIOS Top Bar")
        
        # Apply Layer Shell rules if available
        if HAS_LAYER_SHELL:
            Gtk4LayerShell.init_for_window(self)
            Gtk4LayerShell.set_layer(self, Gtk4LayerShell.Layer.TOP)
            Gtk4LayerShell.auto_exclusive_zone_enable(self)
            Gtk4LayerShell.set_anchor(self, Gtk4LayerShell.Edge.TOP, True)
            Gtk4LayerShell.set_anchor(self, Gtk4LayerShell.Edge.LEFT, True)
            Gtk4LayerShell.set_anchor(self, Gtk4LayerShell.Edge.RIGHT, True)
            Gtk4LayerShell.set_anchor(self, Gtk4LayerShell.Edge.BOTTOM, False)
            Gtk4LayerShell.set_margin(self, Gtk4LayerShell.Edge.TOP, 0)
        else:
            self.set_default_size(1920, 40)
            
        self.init_ui()
        
    def init_ui(self):
        # Master CSS styling classes
        self.add_css_class("top-bar-window")
        
        # Main layout centerbox
        center_box = Gtk.CenterBox()
        center_box.set_margin_start(16)
        center_box.set_margin_end(16)
        center_box.set_margin_top(6)
        center_box.set_margin_bottom(6)
        
        # 1. Start area: Logo & OS Brand
        brand_box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=8)
        brand_label = Gtk.Label(label="FELBIC OS")
        brand_label.add_css_class("top-bar-title")
        brand_box.append(brand_label)
        
        # 2. Center area: Clock Widget
        self.clock_label = Gtk.Label(label="")
        self.clock_label.add_css_class("clock-widget")
        self.update_clock()
        GLib.timeout_add_seconds(1, self.update_clock)
        
        # 3. End area: System info & AI Status & Controls
        end_box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=14)
        
        # AI Status widget (circular pulse)
        self.ai_status_indicator = Gtk.Box()
        self.ai_status_indicator.add_css_class("ai-status-idle")
        self.ai_status_indicator.set_tooltip_text("AI Daemon: Idle")
        
        # Wrap in a button to trigger details
        ai_btn = Gtk.Button()
        ai_btn.set_child(self.ai_status_indicator)
        ai_btn.set_has_frame(False)
        ai_btn.connect("clicked", self.on_ai_status_clicked)
        end_box.append(ai_btn)
        
        # Periodic daemon polling to update status color
        GLib.timeout_add_seconds(4, self.poll_ai_status)
        
        # Quick Settings Menu Button
        settings_icon = Gtk.Image.new_from_icon_name("view-more-symbolic")
        settings_btn = Gtk.MenuButton()
        settings_btn.set_child(settings_icon)
        settings_btn.set_has_frame(False)
        
        # Create quick controls popover
        self.create_quick_controls_popover(settings_btn)
        end_box.append(settings_btn)
        
        # Set parts of the centerbox
        center_box.set_start_widget(brand_box)
        center_box.set_center_widget(self.clock_label)
        center_box.set_end_widget(end_box)
        
        self.set_child(center_box)

    def update_clock(self):
        curr_time = time.strftime("%H:%M | %a, %b %d")
        self.clock_label.set_label(curr_time)
        return True

    def poll_ai_status(self):
        def on_ping_done(stats, err):
            GLib.idle_add(self.update_ai_visual_status, stats, err)

        self.ipc.get_stats(on_ping_done)
        return True

    def update_ai_visual_status(self, stats, err):
        # Reset classes
        self.ai_status_indicator.remove_css_class("ai-status-idle")
        self.ai_status_indicator.remove_css_class("ai-status-thinking")
        self.ai_status_indicator.remove_css_class("ai-status-error")
        
        if err:
            self.ai_status_indicator.add_css_class("ai-status-error")
            self.ai_status_indicator.set_tooltip_text(f"AI Daemon Error: {err}")
        else:
            # Check if model is processing queries or loaded
            is_thinking = stats.get("ai_thinking", False) if stats else False
            if is_thinking:
                self.ai_status_indicator.add_css_class("ai-status-thinking")
                self.ai_status_indicator.set_tooltip_text("AI Daemon: Thinking...")
            else:
                self.ai_status_indicator.add_css_class("ai-status-idle")
                self.ai_status_indicator.set_tooltip_text("AI Daemon: Online (Idle)")

    def on_ai_status_clicked(self, btn):
        # Show simple alert box detailing connection
        dialog = Gtk.AlertDialog(
            message="AIOS Daemon Connection status: Online\nProtocol: UNIX IPC / MessagePack\nSocket: /run/aios/aisd.sock"
        )
        dialog.show(self)

    def create_quick_controls_popover(self, parent_btn):
        popover = Gtk.Popover()
        popover.add_css_class("quick-settings-menu")
        
        box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=12)
        box.set_size_request(220, -1)
        
        # Title
        title = Gtk.Label(label="Quick Controls")
        title.set_halign(Gtk.Align.START)
        title.add_css_class("top-bar-title")
        box.append(title)
        
        # Volume slider
        vol_box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=8)
        vol_icon = Gtk.Image.new_from_icon_name("audio-volume-high-symbolic")
        vol_scale = Gtk.Scale.new_with_range(Gtk.Orientation.HORIZONTAL, 0, 100, 5)
        vol_scale.set_value(70)
        vol_scale.set_hexpand(True)
        vol_scale.add_css_class("settings-slider")
        vol_scale.connect("value-changed", self.on_volume_changed)
        vol_box.append(vol_icon)
        vol_box.append(vol_scale)
        box.append(vol_box)
        
        # Brightness slider
        bri_box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=8)
        bri_icon = Gtk.Image.new_from_icon_name("display-brightness-symbolic")
        bri_scale = Gtk.Scale.new_with_range(Gtk.Orientation.HORIZONTAL, 0, 100, 5)
        bri_scale.set_value(80)
        bri_scale.set_hexpand(True)
        bri_scale.add_css_class("settings-slider")
        bri_scale.connect("value-changed", self.on_brightness_changed)
        bri_box.append(bri_icon)
        bri_box.append(bri_scale)
        box.append(bri_box)
        
        # Separator
        sep = Gtk.Separator()
        box.append(sep)
        
        # Action Buttons (Lock, Logout, Power)
        btn_box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=8)
        
        lock_btn = Gtk.Button(label="Lock")
        lock_btn.set_hexpand(True)
        lock_btn.connect("clicked", self.on_lock_clicked)
        
        shutdown_btn = Gtk.Button(label="Power Off")
        shutdown_btn.set_hexpand(True)
        # style button red-ish using standard Gtk destruction styling
        shutdown_btn.add_css_class("destructive-action")
        shutdown_btn.connect("clicked", self.on_shutdown_clicked)
        
        btn_box.append(lock_btn)
        btn_box.append(shutdown_btn)
        box.append(btn_box)
        
        popover.set_child(box)
        parent_btn.set_popover(popover)

    def on_volume_changed(self, scale):
        val = int(scale.get_value())
        self.ipc.set_system_control("volume", val)

    def on_brightness_changed(self, scale):
        val = int(scale.get_value())
        self.ipc.set_system_control("brightness", val)

    def on_lock_clicked(self, btn):
        # Execute swaylock if present or just print
        try:
            subprocess.Popen(["swaylock"])
        except Exception:
            logger.warning("Could not execute swaylock")

    def on_shutdown_clicked(self, btn):
        dialog = Gtk.AlertDialog(
            message="Are you sure you want to shut down FELBIC OS?",
            detail="All unsaved progress will be lost."
        )
        dialog.set_buttons(["Shutdown", "Cancel"])
        def on_response(diag, result):
            if result == 0:
                subprocess.Popen(["sudo", "poweroff"])
        dialog.choose(self, None, on_response)
