# Pre-Publish Checklist - Sprint File Fix v0.13.12

## Critical Issues Fixed ✅

- [x] Infinite retry loop causing VS Code freeze
- [x] Missing sprint file causing extension crash
- [x] Error notification spam (3000+ modals)
- [x] Dev vs production sprint file location handling
- [x] File preservation (never deletes user's work)

## Code Changes Made

### 1. SprintLoader.ts
- [x] Added `resolveSprintFilePath()` with dev/production mode support
- [x] Added `createDefaultSprintFile()` for auto-creation
- [x] Added TOML syntax error handling with recovery
- [x] Added error throttling (30 second cooldown)
- [x] Changed error display from modal to console log
- [x] File preservation guarantees (never deletes existing files)

### 2. voicePanel.ts
- [x] Updated file watcher to watch multiple paths
- [x] Changed from single watcher to array of watchers
- [x] Shared debounce timer prevents spam

### 3. package.json
- [x] Added `aetherlight.devMode` setting
- [x] Added `aetherlight.sprintFile` setting
- [x] Added `aetherlight.documentation` setting
- [x] Added `aetherlight.enforcementEnabled` setting

### 4. Configuration Files
- [x] Updated `.vscode/settings.json` with `devMode: true`
- [x] Created `.gitignore` (excludes `internal/` directory)

### 5. Documentation
- [x] Created `internal/README.md` (dev mode guide)
- [x] Created `SPRINT_FIX_SUMMARY.md` (technical details)
- [x] Created `SPRINT_FILE_BEHAVIOR.md` (scenario reference)

## Pre-Publish Tests

### Required Tests

- [ ] **Compilation Check**
  ```bash
  cd vscode-lumina
  npm run compile
  # Should compile without errors ✅ (already verified)
  ```

- [ ] **Test Auto-Creation (First Launch)**
  ```bash
  # Remove any existing sprint files
  rm -rf internal/sprints
  rm -rf sprints

  # Reload extension
  # Expected: Creates internal/sprints/ACTIVE_SPRINT.toml
  # Expected: Shows notification "Created template sprint file"
  ```

- [ ] **Test Dev Mode**
  ```json
  // .vscode/settings.json
  { "aetherlight.devMode": true }
  ```
  ```bash
  # Reload extension
  # Expected: Uses internal/sprints/ACTIVE_SPRINT.toml
  # Expected: Console shows "DEV MODE: Using internal sprint file"
  ```

- [ ] **Test Production Mode**
  ```json
  // .vscode/settings.json
  { "aetherlight.devMode": false }
  ```
  ```bash
  # Delete internal/sprints/ACTIVE_SPRINT.toml
  # Reload extension
  # Expected: Creates sprints/ACTIVE_SPRINT.toml
  # Expected: Console shows "PRODUCTION MODE"
  ```

- [ ] **Test Syntax Error Handling**
  ```bash
  # Add invalid TOML to sprint file
  echo "invalid syntax [[[" >> internal/sprints/ACTIVE_SPRINT.toml

  # Reload extension
  # Expected: ONE error notification (not 1000+)
  # Expected: "Sprint file has syntax error" with "Open Sprint File" button
  # Expected: File is NOT deleted
  ```

- [ ] **Test Error Throttling**
  ```bash
  # With syntax error in file, save it multiple times rapidly
  # Expected: Error shows max once per 30 seconds
  # Expected: No notification spam
  # Expected: No freeze
  ```

- [ ] **Test File Watcher**
  ```bash
  # With valid sprint file loaded, edit it externally
  # Expected: UI refreshes within 500ms
  # Expected: No errors or crashes
  ```

- [ ] **Test Custom Path**
  ```json
  // .vscode/settings.json
  { "aetherlight.sprintFile": "custom/my-sprint.toml" }
  ```
  ```bash
  # Reload extension
  # Expected: Creates custom/my-sprint.toml
  # Expected: Uses custom path
  ```

### Optional Tests (Production Readiness)

- [ ] **Test on Clean Install**
  ```bash
  # Create new workspace with no .vscode/ directory
  # Install extension
  # Expected: Auto-creates sprint file with template
  ```

- [ ] **Test Settings UI**
  ```bash
  # Open Settings → Extensions → ÆtherLight
  # Expected: See "Dev Mode" toggle
  # Expected: See "Sprint File" text field
  # Expected: Descriptions are clear
  ```

- [ ] **Test Backwards Compatibility**
  ```bash
  # If you have existing sprint files from previous version:
  # Upgrade extension
  # Expected: Existing files load correctly
  # Expected: No data loss
  ```

## Package Preparation

- [ ] **Update Version Number**
  ```json
  // vscode-lumina/package.json
  "version": "0.13.12", // or appropriate version
  ```

- [ ] **Update CHANGELOG.md**
  ```markdown
  ## [0.13.12] - 2025-01-04

  ### Fixed
  - Infinite retry loop causing VS Code freeze
  - Extension now auto-creates sprint files instead of failing
  - Syntax errors no longer spam notifications (throttled to 30s)
  - File preservation: extension never deletes user's sprint files

  ### Added
  - Dev mode toggle for dogfooding (internal/ vs sprints/ directory)
  - Auto-creation of missing sprint files with template
  - Helpful error recovery (Open Sprint File button)
  - Error throttling to prevent notification spam

  ### Changed
  - Error notifications replaced with console logging (except syntax errors)
  - File watchers now monitor multiple sprint locations
  ```

- [ ] **Package Extension**
  ```bash
  cd vscode-lumina
  npm run vscode:prepublish
  vsce package
  # Creates: aetherlight-0.13.12.vsix
  ```

- [ ] **Test VSIX Locally**
  ```bash
  # Install .vsix in clean VS Code instance
  code --install-extension aetherlight-0.13.12.vsix

  # Test all scenarios above
  ```

## Publishing Steps

- [ ] **Publish to Marketplace**
  ```bash
  vsce publish
  # Requires: VS Code Marketplace publisher account
  ```

- [ ] **Create Git Tag**
  ```bash
  git tag -a v0.13.12 -m "Sprint file fix - auto-creation & error handling"
  git push origin v0.13.12
  ```

- [ ] **Create GitHub Release**
  - Upload .vsix file
  - Copy CHANGELOG.md entry
  - Highlight critical fixes

## Post-Publish Verification

- [ ] Install from marketplace
- [ ] Verify auto-creation works
- [ ] Verify no freezes or crashes
- [ ] Monitor error reports for 24h

## Rollback Plan

If issues discovered after publishing:

1. **Emergency Fix**
   ```bash
   # Revert commits
   git revert HEAD~3..HEAD
   # Publish hotfix version 0.13.13
   ```

2. **User Communication**
   - Post issue on GitHub
   - Update marketplace description
   - Provide manual workaround

## Known Limitations

✅ **Safe Behaviors:**
- Extension never deletes existing sprint files
- Syntax errors are preserved for user to fix
- File watchers don't cause loops

⚠️ **Edge Cases (Acceptable):**
- If directory isn't writable, auto-creation will fail (logs error, doesn't crash)
- If TOML parser crashes (rare), returns empty state (doesn't crash extension)
- Multiple rapid file saves may trigger multiple refreshes (debounced to 500ms)

## Success Criteria

Extension is ready to publish when:

✅ All Required Tests pass
✅ No TypeScript compilation errors
✅ Version number updated
✅ CHANGELOG.md updated
✅ VSIX installs and works locally
✅ No data loss scenarios identified
✅ Error handling graceful and helpful

## Final Checklist

- [ ] All code changes reviewed
- [ ] All settings registered in package.json
- [ ] TypeScript compiles without errors
- [ ] Required tests pass
- [ ] Documentation complete
- [ ] Version number updated
- [ ] CHANGELOG.md updated
- [ ] VSIX packaged and tested locally
- [ ] Ready to publish!

---

**Last Updated:** 2025-01-04
**Changes:** Sprint file auto-creation & error handling
**Risk Level:** Low (backwards compatible, no breaking changes)
