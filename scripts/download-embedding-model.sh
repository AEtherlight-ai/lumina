#!/bin/bash
set -e

MODEL_NAME="all-MiniLM-L6-v2.onnx"
TOKENIZER_NAME="tokenizer.json"
MODEL_URL="https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2/resolve/main/onnx/model.onnx"
TOKENIZER_URL="https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2/resolve/main/tokenizer.json"
MODELS_DIR="${HOME}/.lumina/models"

mkdir -p "${MODELS_DIR}"

# Check if model already exists
if [ -f "${MODELS_DIR}/${MODEL_NAME}" ] && [ -f "${MODELS_DIR}/${TOKENIZER_NAME}" ]; then
    echo "Embedding model already exists:"
    echo "   Model: ${MODELS_DIR}/${MODEL_NAME} ($(du -h "${MODELS_DIR}/${MODEL_NAME}" | cut -f1))"
    echo "   Tokenizer: ${MODELS_DIR}/${TOKENIZER_NAME} ($(du -h "${MODELS_DIR}/${TOKENIZER_NAME}" | cut -f1))"
    exit 0
fi

echo "Downloading all-MiniLM-L6-v2 embedding model (22MB)..."
echo ""

# Download model
if [ ! -f "${MODELS_DIR}/${MODEL_NAME}" ]; then
    echo "Downloading ONNX model..."
    echo "   From: ${MODEL_URL}"
    echo "   To: ${MODELS_DIR}/${MODEL_NAME}"

    if command -v curl &> /dev/null; then
        curl -L --progress-bar -o "${MODELS_DIR}/${MODEL_NAME}" "${MODEL_URL}"
    elif command -v wget &> /dev/null; then
        wget --show-progress -O "${MODELS_DIR}/${MODEL_NAME}" "${MODEL_URL}"
    else
        echo "Error: Neither curl nor wget found."
        exit 1
    fi

    echo "Model downloaded successfully!"
    echo "   Size: $(du -h "${MODELS_DIR}/${MODEL_NAME}" | cut -f1)"
else
    echo "Model already exists, skipping..."
fi

echo ""

# Download tokenizer
if [ ! -f "${MODELS_DIR}/${TOKENIZER_NAME}" ]; then
    echo "Downloading tokenizer..."
    echo "   From: ${TOKENIZER_URL}"
    echo "   To: ${MODELS_DIR}/${TOKENIZER_NAME}"

    if command -v curl &> /dev/null; then
        curl -L --progress-bar -o "${MODELS_DIR}/${TOKENIZER_NAME}" "${TOKENIZER_URL}"
    elif command -v wget &> /dev/null; then
        wget --show-progress -O "${MODELS_DIR}/${TOKENIZER_NAME}" "${TOKENIZER_URL}"
    else
        echo "Error: Neither curl nor wget found."
        exit 1
    fi

    echo "Tokenizer downloaded successfully!"
    echo "   Size: $(du -h "${MODELS_DIR}/${TOKENIZER_NAME}" | cut -f1)"
else
    echo "Tokenizer already exists, skipping..."
fi

echo ""
echo "Embedding model setup complete!"
echo "You can now use semantic search in Lumina!"
