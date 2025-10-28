@echo off
REM Lumina One-Command Installer
REM Just run this once and everything works

cls
echo.
echo ========================================
echo   Lumina Installer
echo   Voice-to-Intelligence for Developers
echo ========================================
echo.

REM Step 1: Add scripts directory to PATH
set "SCRIPTS_DIR=%~dp0"
set "SCRIPTS_DIR=%SCRIPTS_DIR:~0,-1%"

echo [1/3] Checking PATH...
echo %PATH% | findstr /C:"%SCRIPTS_DIR%" >nul
if %ERRORLEVEL% EQU 0 (
    echo       Already in PATH
) else (
    echo       Adding to PATH...
    powershell -Command "[Environment]::SetEnvironmentVariable('Path', [Environment]::GetEnvironmentVariable('Path', 'User') + ';%SCRIPTS_DIR%', 'User')"
    echo       Added to PATH
)

REM Step 2: Check if VS Code or Cursor is installed
echo.
echo [2/3] Checking editors...

set "EDITOR_CMD="
where cursor >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo       Cursor found (will install there)
    set "EDITOR_CMD=cursor"
    goto editor_found
)

where code >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo       VS Code found (will install there)
    set "EDITOR_CMD=code"
    goto editor_found
)

echo       ERROR: Neither VS Code nor Cursor found!
echo       Install from:
echo         - VS Code: https://code.visualstudio.com/
echo         - Cursor: https://cursor.sh/
pause
exit /b 1

:editor_found

REM Step 3: Install extension
echo.
echo [3/3] Installing Lumina extension...
cd "%~dp0..\vscode-lumina"

REM Get current version from package.json
for /f "tokens=2 delims=:" %%a in ('findstr /C:"\"version\"" package.json') do (
    set "VERSION=%%a"
)
set "VERSION=%VERSION:"=%"
set "VERSION=%VERSION:,=%"
set "VERSION=%VERSION: =%"

set "VSIX_FILE=lumina-vscode-%VERSION%.vsix"

REM Build if needed
if not exist "%VSIX_FILE%" (
    echo       Building extension package (v%VERSION%)...
    call npm install >nul 2>&1
    call npm run compile >nul 2>&1
    call npm run package >nul 2>&1
)

REM Install to editor
echo       Installing to %EDITOR_CMD%...
%EDITOR_CMD% --install-extension "%VSIX_FILE%" --force >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo       Extension v%VERSION% installed

    REM Save installed version
    if not exist "%USERPROFILE%\.lumina" mkdir "%USERPROFILE%\.lumina"
    echo %VERSION% > "%USERPROFILE%\.lumina\installed_version.txt"
) else (
    echo       Warning: Extension install may have failed
    echo       Try manually: %EDITOR_CMD% --install-extension %VSIX_FILE%
)

echo.
echo ========================================
echo   Installation Complete!
echo ========================================
echo.
echo Quick Start:
echo   1. Close this window
echo   2. Open a NEW terminal (to refresh PATH)
echo   3. Type: lumina
echo   4. Press Ctrl+Shift+V for voice OR type normally
echo.
echo Status bar: Look for microphone icon (bottom-left)
echo.
echo Commands:
echo   lumina          - Activate voice capture
echo   lumina claude   - Open VS Code with Claude Code
echo.
pause
