#!/usr/bin/env bash
# AIOS archiso profile definition
# https://gitlab.archlinux.org/archlinux/archiso/-/blob/master/docs/profile.rst

iso_name="felbicos"
iso_label="FELBICOS_LIVE"
iso_publisher="FELBIC OS Project <https://felbicos.dev>"
iso_application="FELBIC OS — AI-Native Operating System"
iso_version="0.1.0"

install_dir="arch"
buildmodes=('iso')
bootmodes=(
    'bios.syslinux'
    'uefi.systemd-boot'
)

arch="x86_64"
pacman_conf="pacman.conf"
airootfs_image_type="squashfs"
airootfs_image_tool_options=('-comp' 'zstd' '-Xcompression-level' '15')

# File permissions inside airootfs
# Format: [path]=[mode]:[user]:[group]
file_permissions=(
    ["/etc/shadow"]="0:0:400"
    ["/root/customize_airootfs.sh"]="0:0:755"
    ["/etc/aios/autostart.sh"]="0:0:755"
)
