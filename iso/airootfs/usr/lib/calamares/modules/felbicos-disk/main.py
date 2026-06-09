#!/usr/bin/env python3
# -*- coding: utf-8 -*-
#
#   Calamares custom job module: felbicos-disk
#   Configures LUKS2 auto-unlock using TPM2 chip (if present).
#
import os
import subprocess
import libcalamares

def has_tpm2_hardware():
    """Checks if a TPM2 chip is present in the system."""
    return os.path.exists("/sys/class/tpm/tpm0") or os.path.exists("/dev/tpm0") or os.path.exists("/dev/tpmrm0")

def get_encrypted_devices(root_mount):
    """Parses /etc/crypttab inside the target root to identify LUKS devices."""
    crypttab_path = os.path.join(root_mount, "etc", "crypttab")
    devices = []
    
    if not os.path.exists(crypttab_path):
        return devices
        
    try:
        with open(crypttab_path, "r") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                parts = line.split()
                if len(parts) >= 2:
                    name = parts[0]
                    source = parts[1] # e.g. UUID=xxxx-xxxx-xxxx-xxxx or /dev/sdX
                    devices.append((name, source))
    except Exception as e:
        libcalamares.utils.debug(f"[felbicos-disk] Failed to parse crypttab: {e}")
        
    return devices

def resolve_device_source(source):
    """Resolves UUID=... syntax to a direct /dev/disk/by-uuid/... path."""
    if source.startswith("UUID="):
        uuid_val = source.split("=")[1].strip('"').strip("'")
        return f"/dev/disk/by-uuid/{uuid_val}"
    return source

def run():
    if not has_tpm2_hardware():
        libcalamares.utils.debug("[felbicos-disk] No TPM2 device found. Skipping cryptenroll auto-unlock setup.")
        return None
        
    root_mount = libcalamares.globalstorage.value("rootMountPoint")
    enc_devices = get_encrypted_devices(root_mount)
    
    if not enc_devices:
        libcalamares.utils.debug("[felbicos-disk] No LUKS devices found in target crypttab. Skipping encryption binding.")
        return None
        
    libcalamares.utils.debug(f"[felbicos-disk] Found TPM2 chip and {len(enc_devices)} encrypted target partitions.")
    
    for name, source in enc_devices:
        dev_path = resolve_device_source(source)
        libcalamares.utils.debug(f"[felbicos-disk] Binding device {name} ({dev_path}) to TPM2 chip (PCRs 0+7)...")
        
        # We run systemd-cryptenroll inside the target chroot.
        # This requires the backing device to be present inside the chroot namespaces.
        # Since Calamares binds /dev inside the chroot, the device path is accessible.
        try:
            # Command structure: systemd-cryptenroll --tpm2-device=auto --tpm2-pcrs=0+7 <device>
            # We use target_env_call to run it in the target environment.
            res = libcalamares.utils.target_env_call([
                "systemd-cryptenroll",
                "--tpm2-device=auto",
                "--tpm2-pcrs=0+7",
                dev_path
            ])
            
            if res == 0:
                libcalamares.utils.debug(f"[felbicos-disk] Successfully enrolled TPM2 unlock for {name} ({dev_path})")
            else:
                libcalamares.utils.debug(f"[felbicos-disk] systemd-cryptenroll returned exit status: {res}")
        except Exception as e:
            libcalamares.utils.debug(f"[felbicos-disk] Failed to enroll TPM2 for {name}: {e}")
            
    return None
