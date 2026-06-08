#!/usr/bin/env python3
"""
AIOS model selector — runs during Calamares AI setup module.
Detects available VRAM and RAM, then selects the appropriate model bundle.
Phase 0 skeleton. Phase 2 will call llama.cpp download APIs.
"""

from __future__ import annotations

import subprocess
import json
import sys
from dataclasses import dataclass
from pathlib import Path


MODEL_BUNDLES = [
    {
        "id": "mistral-7b-q4",
        "name": "Mistral 7B Q4_K_M",
        "min_vram_gb": 6,
        "min_ram_gb": 8,
        "size_gb": 4.1,
        "url": "https://huggingface.co/TheBloke/Mistral-7B-Instruct-v0.2-GGUF/resolve/main/mistral-7b-instruct-v0.2.Q4_K_M.gguf",
        "description": "Best quality for 8GB+ RAM systems",
    },
    {
        "id": "phi3-mini-q4",
        "name": "Phi-3 Mini Q4_K_M",
        "min_vram_gb": 0,
        "min_ram_gb": 4,
        "size_gb": 2.2,
        "url": "https://huggingface.co/microsoft/Phi-3-mini-4k-instruct-gguf/resolve/main/Phi-3-mini-4k-instruct-q4.gguf",
        "description": "Optimised for 4-8GB RAM, CPU-only friendly",
    },
    {
        "id": "tinyllama-q4",
        "name": "TinyLlama 1.1B Q4_K_M",
        "min_vram_gb": 0,
        "min_ram_gb": 2,
        "size_gb": 0.7,
        "url": "https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF/resolve/main/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf",
        "description": "Emergency fallback for very low-RAM systems",
    },
]


def detect_vram_gb() -> float:
    """Detect total VRAM via /sys/class/drm. Returns 0 if no discrete GPU."""
    total = 0.0
    drm_path = Path("/sys/class/drm")
    if not drm_path.exists():
        return 0.0
    for card in drm_path.glob("card*/device/mem_info_vram_total"):
        try:
            total += int(card.read_text().strip()) / (1024 ** 3)
        except (ValueError, OSError):
            pass
    return total


def detect_ram_gb() -> float:
    """Detect total RAM from /proc/meminfo."""
    try:
        mem = Path("/proc/meminfo").read_text()
        for line in mem.splitlines():
            if line.startswith("MemTotal:"):
                kb = int(line.split()[1])
                return kb / (1024 ** 2)
    except (OSError, ValueError):
        pass
    return 0.0


def select_model(vram_gb: float, ram_gb: float) -> dict:
    """Pick the best fitting model bundle for detected hardware."""
    for bundle in MODEL_BUNDLES:
        if ram_gb >= bundle["min_ram_gb"]:
            return bundle
    return MODEL_BUNDLES[-1]  # Always fall back to smallest


def main() -> None:
    vram = detect_vram_gb()
    ram  = detect_ram_gb()

    print(f"[aios-model-select] Detected VRAM: {vram:.1f}GB, RAM: {ram:.1f}GB")

    selected = select_model(vram, ram)
    print(f"[aios-model-select] Selected: {selected['name']} ({selected['size_gb']:.1f}GB)")
    print(f"[aios-model-select] URL: {selected['url']}")

    # Output JSON for Calamares module to consume
    out = {
        "selected_model": selected,
        "detected_vram_gb": round(vram, 2),
        "detected_ram_gb": round(ram, 2),
    }
    print(json.dumps(out, indent=2))


if __name__ == "__main__":
    main()
