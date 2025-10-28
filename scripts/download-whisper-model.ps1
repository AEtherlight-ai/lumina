# Download Whisper.cpp Model (PowerShell)
#
# DESIGN DECISION: Download ggml-base model (74MB) for production use
# WHY: Good accuracy, reasonable size, fast inference (32x realtime)

$MODEL_NAME = "ggml-base.bin"
$MODEL_URL = "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/$MODEL_NAME"
$MODELS_DIR = "$env:USERPROFILE\.lumina\models"
$MODEL_PATH = "$MODELS_DIR\$MODEL_NAME"

# Create models directory
New-Item -ItemType Directory -Force -Path $MODELS_DIR | Out-Null

# Check if model already exists
if (Test-Path $MODEL_PATH) {
    $size = (Get-Item $MODEL_PATH).Length / 1MB
    Write-Host "Whisper model already exists: $MODEL_PATH" -ForegroundColor Green
    Write-Host "   Size: $([math]::Round($size, 2)) MB"
    exit 0
}

Write-Host "Downloading Whisper base model (74MB)..." -ForegroundColor Cyan
Write-Host "   From: $MODEL_URL"
Write-Host "   To: $MODEL_PATH"

# Download with progress
try {
    $ProgressPreference = 'Continue'
    Invoke-WebRequest -Uri $MODEL_URL -OutFile $MODEL_PATH -UseBasicParsing

    $size = (Get-Item $MODEL_PATH).Length / 1MB
    Write-Host "Model downloaded successfully!" -ForegroundColor Green
    Write-Host "   Size: $([math]::Round($size, 2)) MB"
    Write-Host ""
    Write-Host "You can now use voice transcription in Lumina!" -ForegroundColor Cyan
}
catch {
    Write-Host "Error downloading model: $_" -ForegroundColor Red
    exit 1
}
