# Build Lumina Desktop with code signing
# Reads private key from .tauri-keys directory and builds signed installers

Write-Host "[1/3] Loading Tauri signing private key..." -ForegroundColor Cyan
$keyPath = "C:\Users\Brett\Dropbox\Ferret9 Global\lumina-clean\.tauri-keys\TAURI_PRIVATE_KEY.txt"
$env:TAURI_SIGNING_PRIVATE_KEY = Get-Content $keyPath -Raw

Write-Host "[2/3] Building desktop app with signing..." -ForegroundColor Cyan
Set-Location $PSScriptRoot
npm run tauri build

Write-Host "[3/3] Build complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Signed installers location:" -ForegroundColor Yellow
Write-Host "  - MSI: src-tauri\target\release\bundle\msi\Lumina_0.17.5_x64_en-US.msi"
Write-Host "  - NSIS: src-tauri\target\release\bundle\nsis\Lumina_0.17.5_x64-setup.exe"
Write-Host ""
Write-Host "Signature files (.sig) should be present next to each installer." -ForegroundColor Yellow
