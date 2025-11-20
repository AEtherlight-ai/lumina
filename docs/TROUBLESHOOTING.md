# ÆtherLight Troubleshooting Guide

**Last Updated**: 2025-01-20
**Version**: v0.18.5

This guide helps you diagnose and resolve common issues with the ÆtherLight extension.

---

## Console Warnings During Extension Launch

### Expected Platform Warnings (Non-Blocking)

When launching the Extension Development Host (F5) or activating ÆtherLight, you may see console warnings that are **not caused by ÆtherLight**. These are VS Code/Cursor platform warnings and can be safely ignored:

#### 1. Search Provider Warning
```
WARN No search provider registered for scheme: file, waiting
```
**Source**: VS Code platform
**Cause**: VS Code language services initializing
**Impact**: None - Extension functions normally
**Action**: Safe to ignore

#### 2. Python Analysis Warning
```
Python analysis property already registered warning
```
**Source**: VS Code Python extension
**Cause**: Multiple Python extensions or extension conflicts
**Impact**: None - ÆtherLight doesn't use Python analysis
**Action**: Safe to ignore

#### 3. Service Worker Mismatch
```
Service worker controller mismatch (webview)
```
**Source**: VS Code webview platform
**Cause**: Service worker caching during development
**Impact**: None - Webviews render correctly
**Action**: Safe to ignore (or reload window to clear)

#### 4. KnowledgeBaseService Error (Cursor IDE)
```
[KnowledgeBaseService] Error fetching git upstream URL: Error: No full commit provider registered
```
**Source**: Cursor IDE (not VS Code)
**Cause**: Cursor's knowledge base trying to fetch git info
**Impact**: None - ÆtherLight doesn't depend on KnowledgeBaseService
**Action**: Safe to ignore (Cursor-specific, doesn't affect VS Code users)

#### 5. Background Composer Warning (Cursor IDE)
```
[Background Composer] No preferred remote found after 10 attempts
```
**Source**: Cursor IDE (not VS Code)
**Cause**: Cursor's background composer looking for git remote
**Impact**: None - ÆtherLight doesn't use Background Composer
**Action**: Safe to ignore (Cursor-specific, doesn't affect VS Code users)

#### 6. TypeScript/npm Task Timeouts
```
Timed out getting tasks from typescript
Timed out getting tasks from npm
```
**Source**: VS Code language service providers
**Cause**: Large workspaces or slow task providers
**Impact**: None - ÆtherLight doesn't depend on TypeScript/npm tasks
**Action**: Safe to ignore (VS Code language service issue)

---

## ÆtherLight-Specific Warnings (Expected in Development)

These warnings are from ÆtherLight but are **expected** during development:

### Desktop App Connection Warnings

```
⚠️ Failed to connect to desktop app: <error>
   Voice capture features will be unavailable until desktop app is running
```

**Cause**: Lumina Desktop App not running in background
**Impact**: Voice capture disabled, other features work normally
**Solution**:
1. Start Lumina Desktop App manually before using voice capture
2. Check desktop app is listening on port 34543
3. Verify desktop app version matches extension version

### Desktop App Version Mismatch

```
Desktop app (vX.X.X) is outdated. Extension is vY.Y.Y. Please rebuild desktop app for best experience.
```

**Cause**: Desktop app version doesn't match extension version
**Impact**: Voice capture may be unstable or missing features
**Solution**: Rebuild desktop app
```bash
cd products/lumina-desktop
npm run tauri build
```

### Sprint TOML Syntax Warnings

```
[ÆtherLight] Sprint file uses deprecated {text} placeholder syntax.
[ÆtherLight] Auto-converting to <text> syntax for compatibility.
[ÆtherLight] Please run: node scripts/migrate-sprint-syntax.js to update files permanently.
```

**Cause**: Sprint TOML files using old `{text}` syntax (conflicts with TOML table headers)
**Impact**: Auto-converted for compatibility, but should migrate permanently
**Solution**: Run migration script
```bash
node scripts/migrate-sprint-syntax.js
```

---

## Critical Errors (Require Action)

### Sprint TOML Parsing Errors

```
[ÆtherLight] TOML parsing failed: <error>
```

**Cause**: Invalid TOML syntax in sprint file
**Impact**: Sprint panel broken, tasks won't load
**Solution**:
1. Check sprint file for syntax errors
2. Run validation: `node scripts/validate-sprint-schema.js`
3. Fix errors reported by validator
4. Reload extension

### Resource Sync Failures

```
[ÆtherLight] Resource sync failed: <error>
```

**Cause**: Unable to copy bundled resources (.claude/skills/, internal/agents/, docs/patterns/)
**Impact**: Extension features may be missing or broken
**Solution**:
1. Check workspace folder permissions
2. Manually run: Command Palette → "ÆtherLight: Sync Bundled Resources"
3. Check Extension Output panel for details (View → Output → ÆtherLight Extension)

### License Validation Errors

```
[ÆtherLight] License validation failed: <error>
```

**Cause**: Invalid license key or network issues
**Impact**: Extension defaults to Free tier (voice capture disabled)
**Solution**:
1. Check license key: Command Palette → "ÆtherLight: Set License Key"
2. Verify network connection (license check requires internet)
3. Check license key validity at https://aetherlight.ai
4. If network issue: Extension will retry on next activation

---

## Diagnostic Tools

### Extension Output Panel

**Location**: View → Output → Select "ÆtherLight Extension"

Shows detailed logs for:
- Extension activation
- Resource sync operations
- Sprint loading
- Desktop app connection
- License validation

### Sprint Validation

**Command**:
```bash
node scripts/validate-sprint-schema.js
```

**Checks**:
- TOML syntax errors
- Required fields present
- Task dependencies valid
- Document links correct

### Check Desktop App Status

**Verify Running**:
```bash
# Windows
tasklist | findstr "lumina-desktop"

# Mac/Linux
ps aux | grep lumina-desktop
```

**Check Port**:
```bash
# Windows
netstat -an | findstr "34543"

# Mac/Linux
lsof -i :34543
```

---

## FAQ

### Q: Why am I seeing so many console warnings?

A: Most console warnings during extension activation are from VS Code/Cursor platform, not ÆtherLight. The extension functions normally despite these warnings. See "Expected Platform Warnings" section above.

### Q: Voice capture isn't working

A: Voice capture requires the Lumina Desktop App running in the background. Start the desktop app manually before using voice capture features.

### Q: Sprint panel shows "No tasks loaded"

A: This usually means:
1. Sprint TOML parsing failed (check for syntax errors)
2. No sprint file found (extension will create template)
3. Sprint file empty (add tasks or run sprint-plan skill)

Check Extension Output panel for errors.

### Q: Welcome message didn't appear on first install

A: Fixed in v0.18.5. If you're on an older version, the welcome message is sent 3 seconds after extension activation. If you didn't open the Voice Panel within 3 seconds, the message was lost.

**Workaround**: Delete `hasSeenWelcome` flag from `.vscode/settings.json`, reload extension, open Voice Panel immediately.

### Q: Resources (skills/agents/patterns) are missing

A: Run manual resource sync:
1. Open Command Palette (Ctrl+Shift+P / Cmd+Shift+P)
2. Type: "ÆtherLight: Sync Bundled Resources"
3. Press Enter
4. Check Extension Output panel for sync status

---

## Getting Help

**GitHub Issues**: https://github.com/anthropics/aetherlight/issues
**Documentation**: Check `docs/` folder in workspace
**Known Issues**: See `docs/KNOWN_ISSUES.md` for historical bugs and fixes

---

**Note**: This guide documents expected behavior as of v0.18.5. Console warnings are categorized based on Sprint 18.2 manual testing (2025-11-19) conducted on Windows 11 with VS Code and Cursor IDE.
