# ÆtherLight Extension Cleanup Script
# Run this AFTER closing the Cursor window for lumina-clean workspace

Write-Host "Cleaning up old ÆtherLight extension versions..." -ForegroundColor Cyan

$extensionsPath = "C:\Users\Brett\.cursor\extensions"
$oldVersions = @(
    "aetherlight.aetherlight-0.13.1",
    "aetherlight.aetherlight-0.13.19"
)

foreach ($version in $oldVersions) {
    $path = Join-Path $extensionsPath $version
    if (Test-Path $path) {
        Write-Host "Removing $version..." -ForegroundColor Yellow
        try {
            Remove-Item -Recurse -Force $path -ErrorAction Stop
            Write-Host "  ✓ Removed successfully" -ForegroundColor Green
        } catch {
            Write-Host "  ✗ Failed to remove: $_" -ForegroundColor Red
            Write-Host "  Make sure Cursor is completely closed and try again." -ForegroundColor Yellow
        }
    } else {
        Write-Host "  $version not found (already removed)" -ForegroundColor Gray
    }
}

Write-Host "`nChecking remaining versions..." -ForegroundColor Cyan
Get-ChildItem $extensionsPath -Filter "aetherlight.aetherlight-*" | ForEach-Object {
    Write-Host "  Found: $($_.Name)" -ForegroundColor Green
}

Write-Host "`nCleanup complete! You can now reopen Cursor." -ForegroundColor Cyan
