#!/usr/bin/env python3
# -*- coding: utf-8 -*-
#
#   Calamares custom job module: felbicos-ai-setup
#   Probes hardware GPU/VRAM/RAM and generates target aisd.toml configuration.
#
import os
import re
import subprocess
import libcalamares

def get_system_ram():
    """Returns total system RAM in gigabytes."""
    try:
        with open("/proc/meminfo", "r") as f:
            for line in f:
                if line.startswith("MemTotal:"):
                    kb = int(line.split()[1])
                    return kb / 1024.0 / 1024.0
    except Exception:
        pass
    # Fallback to sysconf
    try:
        pages = os.sysconf('SC_PHYS_PAGES')
        page_size = os.sysconf('SC_PAGE_SIZE')
        return (pages * page_size) / 1024.0 / 1024.0 / 1024.0
    except Exception:
        return 8.0  # Safe default assumption (8GB)

def get_vram_via_sysfs():
    """Queries sysfs mem_info_vram_total (commonly used by modern amdgpu and other open drivers)."""
    vram_bytes = 0
    try:
        drm_path = "/sys/class/drm"
        if os.path.exists(drm_path):
            for card in os.listdir(drm_path):
                if card.startswith("card") and not card.endswith("-"):
                    vram_file = os.path.join(drm_path, card, "device", "mem_info_vram_total")
                    if os.path.exists(vram_file):
                        with open(vram_file, "r") as f:
                            vram_bytes = max(vram_bytes, int(f.read().strip()))
    except Exception:
        pass
    return vram_bytes / 1024.0 / 1024.0 / 1024.0

def get_vram_via_nvidia():
    """Queries VRAM via nvidia-smi if Nvidia proprietary drivers are loaded."""
    try:
        if subprocess.run(["which", "nvidia-smi"], capture_output=True).returncode == 0:
            out = subprocess.run(["nvidia-smi", "--query-gpu=memory.total", "--format=csv,noheader,nounits"], capture_output=True, text=True)
            if out.returncode == 0:
                megabytes = int(out.stdout.strip().split("\n")[0])
                return megabytes / 1024.0
    except Exception:
        pass
    return 0.0

def get_vram_via_lspci():
    """Probes PCI devices for VGA controllers and parses prefetchable memory allocations (fallback)."""
    max_mb = 0.0
    try:
        out = subprocess.run(["lspci", "-v"], capture_output=True, text=True)
        if out.returncode == 0:
            current_is_vga = False
            for line in out.stdout.split("\n"):
                if "VGA compatible" in line or "3D controller" in line or "Display controller" in line:
                    current_is_vga = True
                elif line.startswith("") and not line.strip(): # empty line reset
                    current_is_vga = False
                
                if current_is_vga and "Memory at" in line and "prefetchable" in line:
                    match = re.search(r"size=(\d+)([KMGT])", line)
                    if match:
                        val = int(match.group(1))
                        unit = match.group(2)
                        mb = 0.0
                        if unit == "K": mb = val / 1024.0
                        elif unit == "M": mb = val
                        elif unit == "G": mb = val * 1024.0
                        max_mb = max(max_mb, mb)
    except Exception:
        pass
    return max_mb / 1024.0

def detect_gpu_hardware():
    """Aggregates all VRAM detection logic."""
    sysfs_vram = get_vram_via_sysfs()
    if sysfs_vram > 0.1:
        return sysfs_vram
    
    nvidia_vram = get_vram_via_nvidia()
    if nvidia_vram > 0.1:
        return nvidia_vram
        
    lspci_vram = get_vram_via_lspci()
    return lspci_vram

def run():
    # 1. Probe hardware specs
    system_ram = get_system_ram()
    vram = detect_gpu_hardware()
    
    libcalamares.utils.debug(f"[felbicos-ai-setup] System RAM: {system_ram:.2f} GB, Detected GPU VRAM: {vram:.2f} GB")
    
    # 2. Select default model based on specs
    if vram >= 7.5:
        model_name = "mistral-7b"
        model_file = "mistral-7b-instruct-v0.3.Q4_K_M.gguf"
        layers = 32
    elif vram >= 3.5:
        model_name = "phi-3-mini"
        model_file = "phi-3-mini-4k-instruct-q4.gguf"
        layers = 24
    else:
        # Check system RAM if GPU VRAM is low or CPU-only
        if system_ram >= 7.5:
            model_name = "phi-3-mini"
            model_file = "phi-3-mini-4k-instruct-q4.gguf"
            layers = 0  # CPU execution only
        else:
            model_name = "tinyllama"
            model_file = "tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf"
            layers = 0  # CPU execution only

    libcalamares.utils.debug(f"[felbicos-ai-setup] Selected Model: {model_name} (Layers offloaded: {layers})")

    # 3. Write target TOML config file
    root_mount = libcalamares.globalstorage.value("rootMountPoint")
    etc_dir = os.path.join(root_mount, "etc", "aios")
    os.makedirs(etc_dir, exist_ok=True)
    
    config_path = os.path.join(etc_dir, "aisd.toml")
    
    toml_content = f"""# AIOS System Daemon Configuration
# Generated automatically by the Installer.

[model]
name = "{model_name}"
path = "/var/lib/aios/models/{model_file}"
vram_offload_layers = {layers}
context_size = 4096

[ipc]
socket_path = "/run/aios/aisd.sock"
websocket_port = 8080
allow_unsafe = false

[acl]
policy_path = "/etc/aios/policy.toml"
audit_log_path = "/var/log/aios/audit.jsonl"
"""
    with open(config_path, "w") as f:
        f.write(toml_content)
        
    libcalamares.utils.debug(f"[felbicos-ai-setup] Configuration written to {config_path}")
    
    # 4. Generate first-boot downloader config
    # This keeps track of what the target needs to download on its first startup
    downloader_config = os.path.join(root_mount, "var", "lib", "aios", "downloader.conf")
    os.makedirs(os.path.dirname(downloader_config), exist_ok=True)
    with open(downloader_config, "w") as f:
        f.write(f"MODEL_NAME={model_name}\nMODEL_FILE={model_file}\n")
        
    return None
