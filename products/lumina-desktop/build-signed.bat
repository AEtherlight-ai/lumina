@echo off
REM Build Lumina Desktop with code signing
REM Reads private key from .tauri-keys directory and builds signed installers

echo [1/3] Loading Tauri signing private key...
set /p TAURI_SIGNING_PRIVATE_KEY=<"..\..\tauri-keys\TAURI_PRIVATE_KEY.txt"

echo [2/3] Building desktop app with signing...
call npm run tauri build

echo [3/3] Build complete!
echo.
echo Signed installers location:
echo   - MSI: src-tauri\target\release\bundle\msi\Lumina_0.17.5_x64_en-US.msi
echo   - NSIS: src-tauri\target\release\bundle\nsis\Lumina_0.17.5_x64-setup.exe
echo.
echo Signature files (.sig) should be present next to each installer.
