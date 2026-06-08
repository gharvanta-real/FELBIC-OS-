#!/usr/bin/env bash
# FELBIC OS WSL Build Helper Script
# Runs inside the Arch Linux WSL distribution as root

set -euo pipefail

echo "==> Starting FELBIC OS WSL Build Process"

# 1. Initialize keyring and pacman databases
echo "==> Initializing keyring..."
pacman-key --init
pacman-key --populate archlinux

echo "==> Updating system packages and installing archiso + Rust toolchain..."
pacman -Syu --noconfirm archiso rust

# 2. Setup build workspaces
SRC_DIR="/mnt/e/AIoS"
BUILD_ROOT="/root/felbicos-build"
WORK_DIR="/root/felbicos-work"
OUT_DIR="/root/felbicos-out"

echo "==> Cleaning old build paths..."
rm -rf "$BUILD_ROOT" "$WORK_DIR" "$OUT_DIR"
mkdir -p "$BUILD_ROOT" "$OUT_DIR"

# 3. Copy ISO profile to local native Linux path (crucial for permissions)
echo "==> Copying profile to local Linux filesystem..."
cp -r "$SRC_DIR/iso" "$BUILD_ROOT/iso"

# Ensure custom scripts are executable
chmod +x "$BUILD_ROOT/iso/airootfs/root/customize_airootfs.sh"

echo "==> Syncing desktop shell into ISO profile..."
rm -rf "$BUILD_ROOT/iso/airootfs/usr/share/desktop-shell"
rm -rf "$BUILD_ROOT/iso/airootfs/usr/share/desktop"
mkdir -p "$BUILD_ROOT/iso/airootfs/usr/share"
cp -r "$SRC_DIR/desktop-shell" "$BUILD_ROOT/iso/airootfs/usr/share/desktop-shell"
cp -r "$SRC_DIR/desktop" "$BUILD_ROOT/iso/airootfs/usr/share/desktop"

# Build and stage the AI system daemon into the ISO profile.
echo "==> Building aisd release binary..."
cargo build --release --manifest-path "$SRC_DIR/aisd/Cargo.toml"
install -Dm755 "$SRC_DIR/aisd/target/release/aisd" \
    "$BUILD_ROOT/iso/airootfs/usr/bin/aisd"
install -Dm755 "$SRC_DIR/aisd/target/release/felbicos-ai" \
    "$BUILD_ROOT/iso/airootfs/usr/bin/felbicos-ai"
install -Dm644 "$SRC_DIR/aisd/systemd/aisd.service" \
    "$BUILD_ROOT/iso/airootfs/etc/systemd/system/aisd.service"
install -Dm644 "$SRC_DIR/aisd/systemd/aios-firstboot.service" \
    "$BUILD_ROOT/iso/airootfs/etc/systemd/system/aios-firstboot.service"
install -Dm755 "$SRC_DIR/aisd/systemd/firstboot-download.sh" \
    "$BUILD_ROOT/iso/airootfs/usr/lib/aios/firstboot-download.sh"

# Build and stage Wayland compositor (aios-comp)
rm -rf "$SRC_DIR/compositor/build-meson"
meson setup "$SRC_DIR/compositor/build-meson" "$SRC_DIR/compositor"
meson compile -C "$SRC_DIR/compositor/build-meson"
install -Dm755 "$SRC_DIR/compositor/build-meson/aios-comp" \
    "$BUILD_ROOT/iso/airootfs/usr/bin/aios-comp"

# Keep both AIOS and FELBIC Plymouth paths available during the rename period.
if [ -f "$BUILD_ROOT/iso/airootfs/usr/share/plymouth/themes/felbicos/felbicos-logo.png" ]; then
    cp "$BUILD_ROOT/iso/airootfs/usr/share/plymouth/themes/felbicos/felbicos-logo.png" \
       "$BUILD_ROOT/iso/airootfs/usr/share/plymouth/themes/aios/aios-logo.png"
fi

# Stage custom Calamares configurations
mkdir -p "$BUILD_ROOT/iso/airootfs/etc/calamares/modules"
cp "$SRC_DIR/installer/settings.conf" "$BUILD_ROOT/iso/airootfs/etc/calamares/settings.conf"
cp "$SRC_DIR/installer/modules/felbicos-ai-setup/felbicos-ai-setup.conf" "$BUILD_ROOT/iso/airootfs/etc/calamares/modules/felbicos-ai-setup.conf"
cp "$SRC_DIR/installer/modules/felbicos-disk/felbicos-disk.conf" "$BUILD_ROOT/iso/airootfs/etc/calamares/modules/felbicos-disk.conf"
cp "$SRC_DIR/installer/modules/services-systemd.conf" "$BUILD_ROOT/iso/airootfs/etc/calamares/modules/services-systemd.conf"

# Stage custom Calamares branding
mkdir -p "$BUILD_ROOT/iso/airootfs/usr/share/calamares/branding/felbicos"
cp -r "$SRC_DIR/installer/branding/felbicos"/* "$BUILD_ROOT/iso/airootfs/usr/share/calamares/branding/felbicos/"

# Stage custom Calamares python modules
mkdir -p "$BUILD_ROOT/iso/airootfs/usr/lib/calamares/modules/felbicos-ai-setup"
cp "$SRC_DIR/installer/modules/felbicos-ai-setup/main.py" "$BUILD_ROOT/iso/airootfs/usr/lib/calamares/modules/felbicos-ai-setup/"
cp "$SRC_DIR/installer/modules/felbicos-ai-setup/module.desc" "$BUILD_ROOT/iso/airootfs/usr/lib/calamares/modules/felbicos-ai-setup/"

mkdir -p "$BUILD_ROOT/iso/airootfs/usr/lib/calamares/modules/felbicos-disk"
cp "$SRC_DIR/installer/modules/felbicos-disk/main.py" "$BUILD_ROOT/iso/airootfs/usr/lib/calamares/modules/felbicos-disk/"
cp "$SRC_DIR/installer/modules/felbicos-disk/module.desc" "$BUILD_ROOT/iso/airootfs/usr/lib/calamares/modules/felbicos-disk/"


# 4. Build the ISO
echo "==> Executing mkarchiso..."
mkarchiso -v -w "$WORK_DIR" -o "$OUT_DIR" "$BUILD_ROOT/iso"

# 5. Move generated ISO back to the Windows share
echo "==> Copying compiled ISO back to Windows host..."
mkdir -p "$SRC_DIR/build/iso"
cp "$OUT_DIR"/*.iso "$SRC_DIR/build/iso/"

echo "==> Build complete! ISO available at Windows path: E:\\AIoS\\build\\iso"
