#!/bin/bash

# Download Whisper.cpp Model
#
# DESIGN DECISION: Download ggml-base model (74MB) for production use
# WHY: Good accuracy, reasonable size, fast inference (32x realtime)
#
# REASONING CHAIN:
# 1. Whisper models: tiny (39MB), base (74MB), small (244MB), medium (769MB), large (1.5GB)
# 2. Base model: 74MB = acceptable download, good accuracy (>85% WER)
# 3. 32x realtime = <1s transcription for 30s audio
# 4. Download from HuggingFace (official Whisper.cpp models)
# 5. Store in ~/.lumina/models/ for cross-app sharing
#
# PATTERN: Pattern-VOICE-002 (Local Transcription Engine)
# PERFORMANCE: 74MB download, 32x realtime inference

set -e  # Exit on error

# Model configuration
MODEL_NAME="ggml-base.bin"
MODEL_URL="https://huggingface.co/ggerganov/whisper.cpp/resolve/main/${MODEL_NAME}"
MODELS_DIR="${HOME}/.lumina/models"

# Create models directory
mkdir -p "${MODELS_DIR}"

# Check if model already exists
if [ -f "${MODELS_DIR}/${MODEL_NAME}" ]; then
    echo "✅ Whisper model already exists: ${MODELS_DIR}/${MODEL_NAME}"
    echo "   Size: $(du -h "${MODELS_DIR}/${MODEL_NAME}" | cut -f1)"
    exit 0
fi

echo "📥 Downloading Whisper base model (74MB)..."
echo "   From: ${MODEL_URL}"
echo "   To: ${MODELS_DIR}/${MODEL_NAME}"

# Download with progress bar (using curl)
if command -v curl &> /dev/null; then
    curl -L --progress-bar -o "${MODELS_DIR}/${MODEL_NAME}" "${MODEL_URL}"
elif command -v wget &> /dev/null; then
    wget --show-progress -O "${MODELS_DIR}/${MODEL_NAME}" "${MODEL_URL}"
else
    echo "❌ Error: Neither curl nor wget found. Please install one of them."
    exit 1
fi

echo "✅ Model downloaded successfully!"
echo "   Size: $(du -h "${MODELS_DIR}/${MODEL_NAME}" | cut -f1)"
echo ""
echo "🎤 You can now use voice transcription in Lumina!"
