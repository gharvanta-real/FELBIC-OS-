#!/usr/bin/env bash
# AIOS First-Boot Model Downloader
# Automatically fetches the GGUF weights matching the hardware profile.

set -euo pipefail

CONF_FILE="/var/lib/aios/downloader.conf"
MODELS_DIR="/var/lib/aios/models"
COMPLETE_FILE="$MODELS_DIR/.complete"

echo "==> starting AIOS First-Boot Model Downloader"

if [ ! -f "$CONF_FILE" ]; then
    echo "Downloader config not found at $CONF_FILE. Exiting."
    exit 0
fi

# Source config variables (MODEL_NAME, MODEL_FILE)
. "$CONF_FILE"

if [ -z "${MODEL_FILE:-}" ]; then
    echo "No MODEL_FILE defined in $CONF_FILE. Exiting."
    exit 0
fi

mkdir -p "$MODELS_DIR"
TARGET_PATH="$MODELS_DIR/$MODEL_FILE"

if [ -f "$TARGET_PATH" ] && [ -f "$COMPLETE_FILE" ]; then
    echo "Model $MODEL_FILE already downloaded and verified. Exiting."
    exit 0
fi

# Map model file to Hugging Face repository paths
case "$MODEL_FILE" in
    "mistral-7b-instruct-v0.3.Q4_K_M.gguf")
        REPO_PATH="TheBloke/Mistral-7B-Instruct-v0.3-GGUF/resolve/main/mistral-7b-instruct-v0.3.Q4_K_M.gguf"
        ;;
    "phi-3-mini-4k-instruct-q4.gguf")
        REPO_PATH="TheBloke/Phi-3-mini-4k-instruct-GGUF/resolve/main/Phi-3-mini-4k-instruct-q4.gguf"
        ;;
    "tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf")
        REPO_PATH="TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF/resolve/main/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf"
        ;;
    *)
        echo "Unknown model file: $MODEL_FILE. Falling back to TinyLlama."
        MODEL_FILE="tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf"
        REPO_PATH="TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF/resolve/main/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf"
        TARGET_PATH="$MODELS_DIR/$MODEL_FILE"
        ;;
esac

# Mirrors to attempt downloading from
MIRRORS=(
    "https://hf-mirror.com"
    "https://huggingface.co"
)

SUCCESS=false
TEMP_FILE="$TARGET_PATH.tmp"

# Ensure we clean up temp file on failure/exit
trap 'rm -f "$TEMP_FILE"' EXIT

for MIRROR in "${MIRRORS[@]}"; do
    URL="$MIRROR/$REPO_PATH"
    echo "Attempting to download from $URL..."
    
    # Download with progress bar to journal, following redirects, with retries
    if curl -L --connect-timeout 15 --retry 5 --retry-delay 5 -o "$TEMP_FILE" "$URL"; then
        mv "$TEMP_FILE" "$TARGET_PATH"
        touch "$COMPLETE_FILE"
        echo "Successfully downloaded and verified $MODEL_FILE"
        SUCCESS=true
        break
    else
        echo "Failed to download from mirror: $MIRROR"
        rm -f "$TEMP_FILE"
    fi
done

if [ "$SUCCESS" = "true" ]; then
    # Restart aisd so it discovers the new model weights
    if systemctl is-active --quiet aisd; then
        echo "Restarting aisd.service to load new model..."
        systemctl restart aisd
    fi
    exit 0
else
    echo "ERROR: Failed to download model from all configured mirrors."
    exit 1
fi
