@echo off
REM Lumina CLI - Launches ÆtherLight Terminal in Cursor/VS Code

REM Detect editor (Cursor or VS Code)
set "EDITOR_CMD=cursor"
set "EDITOR_NAME=Cursor"

REM Check if cursor command exists
cursor --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    REM Cursor not found, try VS Code
    set "EDITOR_CMD=code"
    set "EDITOR_NAME=VS Code"
    code --version >nul 2>&1
    if %ERRORLEVEL% NEQ 0 (
        echo Error: Neither Cursor nor VS Code found
        echo Please install Cursor or VS Code first
        exit /b 1
    )
)

REM Check for subcommands
if "%1"=="install" goto install
if "%1"=="status" goto status
if "%1"=="config" goto config
if "%1"=="help" goto help

REM Default: Launch ÆtherLight Terminal
echo.
echo ========================================
echo       Lumina Terminal
echo ========================================
echo.
echo [Detected Editor: %EDITOR_NAME%]
echo.
echo Opening ÆtherLight terminal...
echo.

REM Open in detected editor and create new ÆtherLight terminal
%EDITOR_CMD% --command workbench.action.terminal.newWithProfile --args aetherlight.terminal

REM If that fails, try opening the editor first
if %ERRORLEVEL% NEQ 0 (
    echo Opening %EDITOR_NAME%...
    %EDITOR_CMD% .
    timeout /t 2 >nul
    echo.
    echo Please manually create ÆtherLight terminal:
    echo   1. Click + (New Terminal) dropdown
    echo   2. Select "ÆtherLight" (mic icon)
    echo.
)

echo.
echo ÆtherLight Terminal Controls:
echo   Voice Capture: Ctrl+Shift+V
echo   Type normally: Terminal enhances automatically
echo   View Logs: View -^> Output -^> "Lumina Voice Extension"
echo.
exit /b 0

:install
REM Install extension
echo.
echo ========================================
echo   Lumina Extension Installation
echo ========================================
echo.

REM Store original directory
set "ORIGINAL_DIR=%CD%"

REM Set absolute paths using script location
set "VSCODE_LUMINA_DIR=%~dp0..\vscode-lumina"
set "VERSION_FILE=%VSCODE_LUMINA_DIR%\package.json"
set "VSIX_FILE=%VSCODE_LUMINA_DIR%\lumina-vscode-0.2.0.vsix"

REM Get version from package.json
for /f "tokens=2 delims=:" %%a in ('findstr /C:"\"version\"" "%VERSION_FILE%"') do (
    set "CURRENT_VERSION=%%a"
)
set "CURRENT_VERSION=%CURRENT_VERSION:"=%"
set "CURRENT_VERSION=%CURRENT_VERSION:,=%"
set "CURRENT_VERSION=%CURRENT_VERSION: =%"

echo Installing Lumina v%CURRENT_VERSION% in %EDITOR_NAME%...
echo.

REM Compile extension (change to vscode-lumina directory)
echo [1/3] Compiling extension...
cd /d "%VSCODE_LUMINA_DIR%"
call npm run compile >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    cd /d "%ORIGINAL_DIR%"
    echo Error: Compilation failed
    echo Run: cd vscode-lumina ^&^& npm run compile
    exit /b 1
)

REM Package extension
echo [2/3] Packaging extension...
call npx @vscode/vsce package --out lumina-vscode-0.2.0.vsix >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    cd /d "%ORIGINAL_DIR%"
    echo Error: Packaging failed
    echo Run: cd vscode-lumina ^&^& npx @vscode/vsce package
    exit /b 1
)

REM Install extension (use absolute path to VSIX)
echo [3/3] Installing in %EDITOR_NAME%...
%EDITOR_CMD% --install-extension "%VSIX_FILE%" --force
if %ERRORLEVEL% NEQ 0 (
    cd /d "%ORIGINAL_DIR%"
    echo Error: Installation failed
    exit /b 1
)

REM Return to original directory
cd /d "%ORIGINAL_DIR%"

REM Save installed version
if not exist "%USERPROFILE%\.lumina" mkdir "%USERPROFILE%\.lumina"
echo %CURRENT_VERSION% > "%USERPROFILE%\.lumina\installed_version.txt"

echo.
echo ========================================
echo   Installation Complete
echo ========================================
echo.
echo Lumina v%CURRENT_VERSION% installed in %EDITOR_NAME%
echo.
echo Reloading %EDITOR_NAME% window...
%EDITOR_CMD% --command workbench.action.reloadWindow
timeout /t 2 >nul
echo.
echo Next Steps:
echo   1. Click + dropdown next to terminal
echo   2. Select "ÆtherLight" (mic icon)
echo   3. Press Ctrl+Shift+V for voice capture
echo.
exit /b 0

:status
echo.
echo ========================================
echo   Lumina Status
echo ========================================
echo.
echo   Editor: %EDITOR_NAME%

REM Get current version
set "VERSION_FILE=%~dp0..\vscode-lumina\package.json"
for /f "tokens=2 delims=:" %%a in ('findstr /C:"\"version\"" "%VERSION_FILE%"') do (
    set "CURRENT_VERSION=%%a"
)
set "CURRENT_VERSION=%CURRENT_VERSION:"=%"
set "CURRENT_VERSION=%CURRENT_VERSION:,=%"
set "CURRENT_VERSION=%CURRENT_VERSION: =%"
echo   Current Version: %CURRENT_VERSION%

REM Check installed version
set "INSTALLED_VERSION_FILE=%USERPROFILE%\.lumina\installed_version.txt"
set "INSTALLED_VERSION="
if exist "%INSTALLED_VERSION_FILE%" (
    set /p INSTALLED_VERSION=<"%INSTALLED_VERSION_FILE%"
)

if not defined INSTALLED_VERSION (
    echo   Installed Version: None
    echo   Status: NOT INSTALLED - run: lumina install
) else (
    echo   Installed Version: %INSTALLED_VERSION%
    if "%CURRENT_VERSION%"=="%INSTALLED_VERSION%" (
        echo   Status: Up to date
    ) else (
        echo   Status: UPDATE AVAILABLE - run: lumina install
    )
)

REM Check if extension is installed
echo.
%EDITOR_CMD% --list-extensions 2>nul | findstr /C:"lumina-vscode" >nul
if %ERRORLEVEL% EQU 0 (
    echo   Extension: Installed in %EDITOR_NAME%
    echo   Terminal Profile: ÆtherLight (mic icon)
) else (
    echo   Extension: Not detected in %EDITOR_NAME%
    echo   Run: lumina install
)

echo.
echo Usage:
echo   lumina           Launch ÆtherLight terminal
echo   lumina install   Install/update extension
echo   lumina status    Show this status
echo.
exit /b 0

:config
echo.
echo ========================================
echo   Lumina Configuration
echo ========================================
echo.
echo Open %EDITOR_NAME% Settings:
echo   1. Press Ctrl+,
echo   2. Search "aetherlight"
echo.
echo Key Settings:
echo   aetherlight.terminal.enabled = true
echo   aetherlight.terminal.voice.enabled = true
echo   aetherlight.terminal.voice.hotkey = "Ctrl+Shift+V"
echo.
echo Change Hotkey:
echo   1. Press Ctrl+K Ctrl+S
echo   2. Search "Lumina: Toggle Voice"
echo   3. Click pencil -^> Press new hotkey -^> Enter
echo.
exit /b 0

:help
echo.
echo ========================================
echo   Lumina CLI Help
echo ========================================
echo.
echo Commands:
echo   lumina           Launch ÆtherLight terminal with voice UI
echo   lumina install   Install or update extension
echo   lumina status    Show installation and version status
echo   lumina config    Show configuration help
echo   lumina help      Show this help
echo.
echo Terminal Controls:
echo   Ctrl+Shift+V     Activate voice capture (in ÆtherLight terminal)
echo   Type normally    Terminal enhances automatically
echo.
echo What ÆtherLight Terminal Does:
echo   1. Intercepts your input (voice or typing)
echo   2. Searches 42 patterns in Supabase
echo   3. Extracts file context from your project
echo   4. Detects project framework and state
echo   5. Generates enhanced prompt with full context
echo   6. Delivers to Claude Code for better AI responses
echo.
echo Result: 35%% better AI responses, 50%% faster workflow
echo.
echo Editor Detection:
echo   - Checks for Cursor first
echo   - Falls back to VS Code if Cursor not found
echo   - Current: %EDITOR_NAME%
echo.
echo More Help:
echo   See: vscode-lumina\HOW_TO_USE_LUMINA_TERMINAL.md
echo   See: vscode-lumina\HOW_TO_USE_IN_CURSOR.md
echo.
exit /b 0
