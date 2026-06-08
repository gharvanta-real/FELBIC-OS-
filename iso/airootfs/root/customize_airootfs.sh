#!/usr/bin/env bash
# FELBIC OS airootfs post-build customization hook
# Runs inside the chroot during mkarchiso build
# Must be executable (set in profiledef.sh file_permissions)

set -euo pipefail

# ── Locale ───────────────────────────────────────────────────────────────────
sed -i 's/#en_US.UTF-8/en_US.UTF-8/' /etc/locale.gen
locale-gen

# ── Root account — password is 'root' for emergency debugging ──────────────────
echo "root:root" | chpasswd
useradd -m -G wheel,audio,video,input,storage -s /bin/bash felbic || true
echo "felbic:felbic" | chpasswd

# ── sudoers — wheel group ────────────────────────────────────────────────────
echo "%wheel ALL=(ALL:ALL) NOPASSWD: ALL" > /etc/sudoers.d/felbicos-live

# ── Enable services ──────────────────────────────────────────────────────────
systemctl enable NetworkManager
systemctl enable systemd-timesyncd
systemctl enable plymouth-start
systemctl enable plymouth-quit
if [ -x /usr/bin/aisd ] && [ -f /etc/systemd/system/aisd.service ]; then
    systemctl enable aisd.service
fi
if [ -f /etc/systemd/system/aios-firstboot.service ]; then
    systemctl enable aios-firstboot.service
fi
systemctl mask systemd-firstboot.service

# ── Auto-login on TTY1 ───────────────────────────────────────────────────────
mkdir -p /etc/systemd/system/getty@tty1.service.d
cat > /etc/systemd/system/getty@tty1.service.d/autologin.conf << 'EOF'
[Service]
ExecStart=
ExecStart=-/sbin/agetty --autologin felbic --noclear %I $TERM
EOF

# ── Auto-start AIOS Compositor on TTY1 login ─────────────────────────────────
cat >> /root/.bash_profile << 'EOF'

# Auto-start aios-comp on TTY1
if [ -z "$WAYLAND_DISPLAY" ] && [ "$(tty)" = "/dev/tty1" ]; then
    exec aios-comp
fi
EOF
cat > /home/felbic/.bash_profile << 'EOF'

# Auto-start aios-comp on TTY1
if [ -z "$WAYLAND_DISPLAY" ] && [ "$(tty)" = "/dev/tty1" ]; then
    exec aios-comp
fi
EOF
chown felbic:felbic /home/felbic/.bash_profile

# ── install-felbicos shortcut ────────────────────────────────────────────────
cat > /usr/local/bin/install-felbicos << 'EOF'
#!/usr/bin/env bash
if [ "$(id -u)" -eq 0 ]; then
    exec calamares -d
fi
exec sudo -E calamares -d
EOF
chmod +x /usr/local/bin/install-felbicos

# ── fastfetch FELBIC OS config ────────────────────────────────────────────────
mkdir -p /root/.config/fastfetch
cat > /root/.config/fastfetch/config.jsonc << 'EOF'
{
    "$schema": "https://github.com/fastfetch-cli/fastfetch/raw/dev/doc/json_schema.json",
    "logo": {
        "source": "arch",
        "padding": { "top": 1 }
    },
    "display": {
        "separator": "  ",
        "color": { "keys": "magenta", "title": "magenta" }
    },
    "modules": [
        "title", "separator",
        "os", "host", "kernel", "uptime",
        "separator",
        "cpu", "gpu", "memory", "disk",
        "separator",
        "terminal", "shell"
    ]
}
EOF

# ── Plymouth FELBIC OS theme link ─────────────────────────────────────────────
if [ -d /usr/share/plymouth/themes/aios ]; then
    plymouth-set-default-theme aios
elif [ -d /usr/share/plymouth/themes/felbicos ]; then
    plymouth-set-default-theme felbicos
else
    plymouth-set-default-theme bgrt
fi

echo "[felbicos] customize_airootfs.sh complete"
