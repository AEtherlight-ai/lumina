$MODEL_NAME = "all-MiniLM-L6-v2.onnx"
$TOKENIZER_NAME = "tokenizer.json"
$MODEL_URL = "https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2/resolve/main/onnx/model.onnx"
$TOKENIZER_URL = "https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2/resolve/main/tokenizer.json"
$MODELS_DIR = "$env:USERPROFILE\.lumina\models"
$MODEL_PATH = "$MODELS_DIR\$MODEL_NAME"
$TOKENIZER_PATH = "$MODELS_DIR\$TOKENIZER_NAME"

New-Item -ItemType Directory -Force -Path $MODELS_DIR | Out-Null

if ((Test-Path $MODEL_PATH) -and (Test-Path $TOKENIZER_PATH)) {
    $modelSize = (Get-Item $MODEL_PATH).Length / 1MB
    $tokenizerSize = (Get-Item $TOKENIZER_PATH).Length / 1KB
    Write-Host "Embedding model already exists:" -ForegroundColor Green
    Write-Host "   Model: $MODEL_PATH ($([math]::Round($modelSize, 2)) MB)"
    Write-Host "   Tokenizer: $TOKENIZER_PATH ($([math]::Round($tokenizerSize, 2)) KB)"
    exit 0
}

Write-Host "Downloading all-MiniLM-L6-v2 embedding model (22MB)..." -ForegroundColor Cyan
Write-Host ""

try {
    $ProgressPreference = 'Continue'

    # Download model
    if (-not (Test-Path $MODEL_PATH)) {
        Write-Host "Downloading ONNX model..." -ForegroundColor Cyan
        Write-Host "   From: $MODEL_URL"
        Write-Host "   To: $MODEL_PATH"

        Invoke-WebRequest -Uri $MODEL_URL -OutFile $MODEL_PATH -UseBasicParsing

        $modelSize = (Get-Item $MODEL_PATH).Length / 1MB
        Write-Host "Model downloaded successfully!" -ForegroundColor Green
        Write-Host "   Size: $([math]::Round($modelSize, 2)) MB"
    } else {
        Write-Host "Model already exists, skipping..." -ForegroundColor Yellow
    }

    Write-Host ""

    # Download tokenizer
    if (-not (Test-Path $TOKENIZER_PATH)) {
        Write-Host "Downloading tokenizer..." -ForegroundColor Cyan
        Write-Host "   From: $TOKENIZER_URL"
        Write-Host "   To: $TOKENIZER_PATH"

        Invoke-WebRequest -Uri $TOKENIZER_URL -OutFile $TOKENIZER_PATH -UseBasicParsing

        $tokenizerSize = (Get-Item $TOKENIZER_PATH).Length / 1KB
        Write-Host "Tokenizer downloaded successfully!" -ForegroundColor Green
        Write-Host "   Size: $([math]::Round($tokenizerSize, 2)) KB"
    } else {
        Write-Host "Tokenizer already exists, skipping..." -ForegroundColor Yellow
    }

    Write-Host ""
    Write-Host "Embedding model setup complete!" -ForegroundColor Green
    Write-Host "You can now use semantic search in Lumina!" -ForegroundColor Cyan
}
catch {
    Write-Host "Error downloading files: $_" -ForegroundColor Red
    exit 1
}
