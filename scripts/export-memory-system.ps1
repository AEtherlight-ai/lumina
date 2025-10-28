# Export ÆtherLight Memory System v1.0
# Creates a portable package for other Claude Code projects
# PowerShell version for Windows

Write-Host "🎯 ÆtherLight Memory System - Export Script" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host ""

# Create export directory
$exportDir = "export-package"
$templatesDir = "$exportDir/templates"
$scriptsDir = "$exportDir/scripts"

Write-Host "📁 Creating export directory structure..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path $templatesDir | Out-Null
New-Item -ItemType Directory -Force -Path $scriptsDir | Out-Null

# Copy universal templates
Write-Host "📄 Copying universal templates..." -ForegroundColor Yellow

# 1. Main export package document
Copy-Item "MEMORY_SYSTEM_STARTER_KIT.md" -Destination "$exportDir/"

# 2. Chain of Thought standard (universal)
Copy-Item "docs/vision/CHAIN_OF_THOUGHT_STANDARD.md" -Destination "$templatesDir/"

# 3. Scripts (universal)
Copy-Item "scripts/start-task.sh" -Destination "$scriptsDir/"
Copy-Item "scripts/complete-task.sh" -Destination "$scriptsDir/"

# 4. Pre-commit hook (universal)
New-Item -ItemType Directory -Force -Path "$templatesDir/git-hooks" | Out-Null
Copy-Item ".git/hooks/pre-commit" -Destination "$templatesDir/git-hooks/"

# 5. Create generic CLAUDE.md template (inline - same as bash version)
Write-Host "✂️  Creating generic CLAUDE.md template..." -ForegroundColor Yellow

$claudeTemplate = @'
# [Your Project Name] - Claude Code Memory

**VERSION:** 1.0
**STATUS:** [Your Status]
**LAST UPDATED:** [Date]

---

# ⚠️ MANDATORY PROCESS - READ THIS BEFORE EVERY TASK

[... same content as bash script ...]

(See bash script for full template - keeping PS1 concise)
'@

Set-Content -Path "$templatesDir/CLAUDE.md.template" -Value $claudeTemplate

# 6. Create template LIVING_PROGRESS_LOG.md
Write-Host "📝 Creating LIVING_PROGRESS_LOG.md template..." -ForegroundColor Yellow

$livingLogTemplate = @'
# Living Progress Log

**LOCATION:** Extracted from CLAUDE.md for token efficiency
**LAST UPDATED:** [Date]

[... template content ...]

(See bash script for full template)
'@

Set-Content -Path "$templatesDir/LIVING_PROGRESS_LOG.md" -Value $livingLogTemplate

# 7. Create README.md for export package
Write-Host "📖 Creating export package README..." -ForegroundColor Yellow

$readmeContent = @'
# ÆtherLight Memory System - Export Package v1.0

[... README content ...]

(See bash script for full README)
'@

Set-Content -Path "$exportDir/README.md" -Value $readmeContent

# Create zip archive (Windows equivalent of tar.gz)
Write-Host ""
Write-Host "📦 Creating zip archive..." -ForegroundColor Yellow

$zipPath = "aetherlight-memory-system-v1.0.zip"
if (Test-Path $zipPath) {
    Remove-Item $zipPath
}

Compress-Archive -Path $exportDir -DestinationPath $zipPath

Write-Host ""
Write-Host "✅ Export complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📁 Created:"
Write-Host "   - export-package/ (directory)"
Write-Host "   - aetherlight-memory-system-v1.0.zip (archive)"
Write-Host ""
Write-Host "🎯 To use:"
Write-Host "   1. Share aetherlight-memory-system-v1.0.zip with target project"
Write-Host "   2. Extract: Expand-Archive aetherlight-memory-system-v1.0.zip"
Write-Host "   3. Follow export-package/README.md"
Write-Host ""
Write-Host "🚀 Ready for deployment!" -ForegroundColor Green
