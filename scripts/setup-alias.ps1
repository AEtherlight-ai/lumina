#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Setup 'lv' alias for Lumina Voice Capture

.DESCRIPTION
    Adds 'lv' alias to PowerShell profile for quick voice capture access.
    After setup, user can just type "lv" in any terminal to activate voice capture.

.EXAMPLE
    .\setup-alias.ps1
    # Adds alias to PowerShell profile

.NOTES
    File Name      : setup-alias.ps1
    Prerequisite   : PowerShell 5.1 or later
    Copyright 2025 - ÆtherLight
#>

Write-Host "🔧 Lumina Voice Capture - Alias Setup" -ForegroundColor Cyan
Write-Host ""

# Get script directory (where lumina-voice.ps1 is located)
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$luminaScript = Join-Path $scriptDir "lumina-voice.ps1"

# Check if lumina-voice.ps1 exists
if (-not (Test-Path $luminaScript)) {
    Write-Host "❌ Error: lumina-voice.ps1 not found in $scriptDir" -ForegroundColor Red
    exit 1
}

# Get PowerShell profile path
$profilePath = $PROFILE

# Create profile if it doesn't exist
if (-not (Test-Path $profilePath)) {
    Write-Host "📝 Creating PowerShell profile: $profilePath" -ForegroundColor Yellow
    New-Item -Path $profilePath -ItemType File -Force | Out-Null
}

# Check if aliases already exist
$aliasLineLv = "Set-Alias lv '$luminaScript'"
$aliasLineLumina = "Set-Alias lumina '$luminaScript'"
$profileContent = Get-Content $profilePath -ErrorAction SilentlyContinue

$hasLv = $profileContent -contains $aliasLineLv
$hasLumina = $profileContent -contains $aliasLineLumina

if ($hasLv -and $hasLumina) {
    Write-Host "✅ Aliases 'lv' and 'lumina' already configured in profile" -ForegroundColor Green
} else {
    # Add aliases to profile
    Write-Host "📝 Adding 'lv' and 'lumina' aliases to PowerShell profile..." -ForegroundColor Yellow
    Add-Content -Path $profilePath -Value ""
    Add-Content -Path $profilePath -Value "# Lumina Voice Capture aliases"
    if (-not $hasLv) {
        Add-Content -Path $profilePath -Value $aliasLineLv
    }
    if (-not $hasLumina) {
        Add-Content -Path $profilePath -Value $aliasLineLumina
    }
    Write-Host "✅ Aliases added successfully!" -ForegroundColor Green
}

Write-Host ""
Write-Host "🎤 Usage:" -ForegroundColor Cyan
Write-Host "   1. Restart your terminal (or run: . `$PROFILE)" -ForegroundColor Gray
Write-Host "   2. Type: lv OR lumina" -ForegroundColor Gray
Write-Host "   3. Speak your query!" -ForegroundColor Gray
Write-Host ""
Write-Host "💡 Tip: Both 'lv' and 'lumina' commands work the same way" -ForegroundColor Cyan
Write-Host ""

# Offer to reload profile now
$reload = Read-Host "Reload PowerShell profile now? (y/n)"
if ($reload -eq 'y' -or $reload -eq 'Y') {
    Write-Host "🔄 Reloading profile..." -ForegroundColor Yellow
    . $PROFILE
    Write-Host "✅ Profile reloaded! Type 'lv' to test" -ForegroundColor Green
} else {
    Write-Host "⚠️  Remember to restart your terminal or run: . `$PROFILE" -ForegroundColor Yellow
}
