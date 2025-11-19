# Sprint 18.2 Manual Test Checklist

**Sprint**: v0.18.2 Bug Fixes - Resource Bundling & Desktop Installer
**Created**: 2025-01-18
**Status**: In Progress
**Tester**: Brett (user)

**Instructions**:
- Test each completed task before publishing
- Check off items as you test (replace `[ ]` with `[x]`)
- Document any issues found in the "Issues Found" section
- All tests must PASS before publishing v0.18.3

---

## Test Environment Setup

### Prerequisites
- [ ] Extension compiled successfully (`cd vscode-lumina && npm run compile`)
- [ ] No TypeScript compilation errors
- [ ] VS Code Extension Development Host working (F5)

### Test Workspaces Prepared
- [ ] **Fresh workspace**: Brand new folder, no prior ÆtherLight
- [ ] **Existing workspace**: Has `.vscode/aetherlight.md` from v0.18.1
- [ ] **Upgrade workspace**: Simulate v0.18.1 with missing resources

---

## BUG-001: Fix First-Run Setup Early Exit

**Status**: ⏳ Ready for Testing
**File Modified**: `vscode-lumina/src/firstRunSetup.ts`
**Commit**: [pending]

### Test 1: Fresh Workspace (First-Run Scenario)
**Setup**: Open brand new folder (no prior ÆtherLight)

**Steps**:
1. Press F5 to launch Extension Development Host
2. File → Open Folder → Select fresh folder
3. Extension activates

**Verification Checklist**:
- [ ] `.vscode/aetherlight.md` created
- [ ] `.claude/skills/` exists with 16 skill directories
- [ ] `internal/agents/` exists with 14 agent .md files
- [ ] `docs/patterns/` exists with 86 pattern .md files
- [ ] Welcome notification appears: "🚀 ÆtherLight installed!"
- [ ] Console log: "New workspace detected - running first-run setup"
- [ ] Console log: "Syncing bundled resources..."
- [ ] Console log: "Resource sync complete"
- [ ] Console log: "Setup complete ✅"

**Expected Result**: ✅ All resources created, first-run experience works

**Actual Result**: _[Fill in after testing]_

**Pass/Fail**: _[Fill in after testing]_

---

### Test 2: Existing Workspace (Upgrade Scenario - THE BUG FIX)
**Setup**:
1. Create workspace with `.vscode/aetherlight.md` (simulate v0.18.1)
2. Delete `.claude/`, `internal/agents/`, `docs/patterns/` (simulate missing resources)

**Steps**:
1. Press F5 to launch Extension Development Host
2. File → Open Folder → Select workspace with existing aetherlight.md
3. Extension activates

**Verification Checklist**:
- [ ] `.vscode/aetherlight.md` NOT duplicated (only 1 file exists)
- [ ] `.claude/skills/` NOW EXISTS with 16 skill directories ✅ **THIS IS THE FIX**
- [ ] `internal/agents/` NOW EXISTS with 14 agent .md files ✅ **THIS IS THE FIX**
- [ ] `docs/patterns/` NOW EXISTS with 86 pattern .md files ✅ **THIS IS THE FIX**
- [ ] Welcome notification DOES NOT appear (not first-run)
- [ ] Console log: "Existing workspace detected - skipping first-run setup"
- [ ] Console log: "Syncing bundled resources..."
- [ ] Console log: "Resource sync complete"
- [ ] No "Setup complete ✅" message (not first-run)

**Expected Result**: ✅ Resources synced, no duplicate files, no first-run notification

**Actual Result**: _[Fill in after testing]_

**Pass/Fail**: _[Fill in after testing]_

---

### Test 3: Upgrade from v0.18.1 (Real-World Scenario)
**Setup**:
1. Create workspace simulating v0.18.1:
   - Has `.vscode/aetherlight.md`
   - NO `.claude/skills/`
   - NO `internal/agents/`
   - NO `docs/patterns/`

**Steps**:
1. Press F5 to launch Extension Development Host
2. Open the simulated v0.18.1 workspace
3. Extension activates

**Verification Checklist**:
- [ ] Resources copied despite existing aetherlight.md ✅
- [ ] No errors in console
- [ ] Resources accessible in workspace
- [ ] Skills visible in `.claude/skills/`
- [ ] Agents visible in `internal/agents/`
- [ ] Patterns visible in `docs/patterns/`

**Expected Result**: ✅ Upgrade works, users get missing resources

**Actual Result**: _[Fill in after testing]_

**Pass/Fail**: _[Fill in after testing]_

---

### Test 4: Dynamic Workspace Addition
**Setup**: Extension already running

**Steps**:
1. In Extension Development Host, File → Add Folder to Workspace
2. Add a new folder that has never had ÆtherLight
3. Check that setup runs for new folder

**Verification Checklist**:
- [ ] New folder gets `.vscode/aetherlight.md`
- [ ] New folder gets bundled resources
- [ ] Console logs show setup running
- [ ] No errors in console

**Expected Result**: ✅ Setup runs for dynamically added folders

**Actual Result**: _[Fill in after testing]_

**Pass/Fail**: _[Fill in after testing]_

---

## BUG-009: Fix 'Start This Task' Auto-Send to Terminal

**Status**: ✅ Implemented, Ready for Testing
**File Modified**: `vscode-lumina/src/commands/voicePanel.ts:877`
**Commit**: 2815c00

### Test 1: Start Task Button Behavior
**Setup**: Sprint 18.2 loaded in Sprint Panel

**Steps**:
1. Open ÆtherLight Voice Panel
2. Navigate to Sprint tab
3. Click "Start This Task" button on any task (e.g., BUG-001)

**Verification Checklist**:
- [ ] Text area populates with task template ✅
- [ ] Prompt Terminal opens automatically ✅
- [ ] Content is NOT sent to terminal automatically ✅ **THIS IS THE FIX**
- [ ] User can review template in text area
- [ ] User presses Ctrl+Enter to send when ready
- [ ] Content sends to terminal successfully after Ctrl+Enter
- [ ] Claude Code CLI receives content correctly

**Expected Result**: ✅ Terminal opens, content in text area, user controls send timing

**Actual Result**: _[Fill in after testing]_

**Pass/Fail**: _[Fill in after testing]_

---

## BUG-002: Fix Resource Copying Directory-Level Skipping

**Status**: ⏳ Ready for Testing
**File Modified**: `vscode-lumina/src/firstRunSetup.ts:406-484`
**Commit**: [pending]

### Test 1: Fresh Workspace (All Resources Copied)
**Setup**: Open brand new folder (no prior ÆtherLight)

**Steps**:
1. Press F5 to launch Extension Development Host
2. File → Open Folder → Select fresh folder
3. Extension activates

**Verification Checklist**:
- [ ] `.claude/skills/` exists with 16 skill directories
- [ ] `internal/agents/` exists with 14 agent .md files
- [ ] `docs/patterns/` exists with 86 pattern .md files
- [ ] Console log: "16 skills, 14 agents, 86 patterns copied. 0 user files preserved."
- [ ] No errors in console

**Expected Result**: ✅ All resources copied, count tracking correct

**Actual Result**: _[Fill in after testing]_

**Pass/Fail**: _[Fill in after testing]_

---

### Test 2: Old Workspace with Agents Only (THE BUG FIX)
**Setup**:
1. Create workspace with `.claude/agents/` only (14 files)
2. NO `.claude/skills/` directory exists
3. NO `internal/agents/` directory (simulate old ÆtherLight)

**Steps**:
1. Press F5 to launch Extension Development Host
2. Open the workspace with partial resources
3. Extension activates

**Verification Checklist**:
- [ ] `.claude/skills/` NOW EXISTS with 16 skill directories ✅ **THIS IS THE FIX**
- [ ] `.claude/agents/` NOT DUPLICATED (still has 14 files, not re-copied)
- [ ] Console log: "16 skills copied, 0 agents copied, X patterns copied"
- [ ] Console log: "0 agents preserved" or similar (agents dir doesn't exist yet)
- [ ] Summary log shows correct counts

**Expected Result**: ✅ New skills added, no duplication

**Actual Result**: _[Fill in after testing]_

**Pass/Fail**: _[Fill in after testing]_

---

### Test 3: User-Modified Skill (Preservation Test)
**Setup**:
1. Create workspace with `.claude/skills/protect/skill.md` already present
2. Modify the protect skill file: Add "# MY CUSTOM PROTECTION LOGIC" at top
3. Delete other skills to test copy behavior

**Steps**:
1. Press F5 to launch Extension Development Host
2. Open the workspace
3. Extension activates

**Verification Checklist**:
- [ ] `.claude/skills/protect/skill.md` STILL HAS custom text "# MY CUSTOM PROTECTION LOGIC" ✅
- [ ] Other missing skills copied (e.g., publish, sprint-plan, etc.)
- [ ] Console log: "protect already exists - preserving user version"
- [ ] Summary log: "15 skills copied, 1 user files preserved" (or similar)

**Expected Result**: ✅ User modification preserved, new skills added

**Actual Result**: _[Fill in after testing]_

**Pass/Fail**: _[Fill in after testing]_

---

### Test 4: Upgrade from v0.18.1 (Real-World Scenario)
**Setup**:
1. Create workspace simulating v0.18.1:
   - NO `.claude/skills/` (new in v0.18.2)
   - Has `.claude/agents/` (14 files from v0.18.1) - wait, this doesn't match the old structure
   - Actually, let me think about this more carefully...

Actually for this test, simulate:
- Has `internal/agents/` (14 files)
- NO `.claude/skills/` (new resource type)
- Has `docs/patterns/` but missing 10 new patterns (simulate partial)

**Steps**:
1. Press F5 to launch Extension Development Host
2. Open the simulated v0.18.1 workspace
3. Extension activates

**Verification Checklist**:
- [ ] `.claude/skills/` NOW EXISTS with 16 skill directories ✅
- [ ] `internal/agents/` preserved (14 files, not re-copied)
- [ ] `docs/patterns/` has new patterns added (check count increased)
- [ ] Console log: "16 skills copied, 0 agents copied, X patterns copied, 14 agents preserved"
- [ ] Summary log shows correct counts

**Expected Result**: ✅ Incremental upgrade works, missing resources added

**Actual Result**: _[Fill in after testing]_

**Pass/Fail**: _[Fill in after testing]_

---

## BUG-003: Add Version Tracking for Resource Sync

**Status**: ✅ Implemented, Ready for Testing
**Files Modified**:
- `vscode-lumina/src/firstRunSetup.ts:42-114`
- `vscode-lumina/package.json:625-630`
**Commit**: [pending]

### Test 1: First Install (Version Tracking Initial Setup)
**Setup**: Brand new workspace (no prior ÆtherLight)

**Steps**:
1. Press F5 to launch Extension Development Host
2. File → Open Folder → Select fresh folder
3. Extension activates
4. Check `.vscode/settings.json`

**Verification Checklist**:
- [ ] Extension version is v0.18.2 (check Help → About → Extensions)
- [ ] Console log: "Resource sync needed (vnone → v0.18.2)"
- [ ] Console log: "Syncing bundled resources..."
- [ ] Console log: "Updated lastSyncedVersion to v0.18.2"
- [ ] `.vscode/settings.json` contains: `"aetherlight.lastSyncedVersion": "0.18.2"`
- [ ] Resources copied successfully (16 skills, 14 agents, 86 patterns)

**Expected Result**: ✅ Version tracking initialized, resources synced on first run

**Actual Result**: _[Fill in after testing]_

**Pass/Fail**: _[Fill in after testing]_

---

### Test 2: Reopen Same Workspace (No Sync Needed)
**Setup**: Use workspace from Test 1 (already has v0.18.2 synced)

**Steps**:
1. Close VS Code Extension Development Host
2. Press F5 to relaunch Extension Development Host
3. File → Open Folder → Select same workspace from Test 1
4. Extension activates

**Verification Checklist**:
- [ ] Console log: "Resources up to date (v0.18.2)" ✅ **THIS IS THE OPTIMIZATION**
- [ ] Console log DOES NOT show: "Syncing bundled resources..."
- [ ] Console log DOES NOT show: "Resource sync needed"
- [ ] No duplicate files created
- [ ] Extension activates faster (no resource copying overhead)
- [ ] `.vscode/settings.json` still shows: `"aetherlight.lastSyncedVersion": "0.18.2"`

**Expected Result**: ✅ No sync performed, activation faster, resources already up to date

**Actual Result**: _[Fill in after testing]_

**Pass/Fail**: _[Fill in after testing]_

---

### Test 3: Simulate Upgrade (v0.18.2 → v0.18.3)
**Setup**: Workspace with `lastSyncedVersion: "0.18.1"` in settings

**Preparation**:
1. Create workspace with ÆtherLight already installed
2. Manually edit `.vscode/settings.json`:
   ```json
   {
     "aetherlight.lastSyncedVersion": "0.18.1"
   }
   ```
3. Keep existing resources in place (simulate old version)

**Steps**:
1. Press F5 to launch Extension Development Host (running v0.18.2)
2. Open the workspace with `lastSyncedVersion: "0.18.1"`
3. Extension activates

**Verification Checklist**:
- [ ] Console log: "Resource sync needed (v0.18.1 → v0.18.2)" ✅ **VERSION MISMATCH DETECTED**
- [ ] Console log: "Syncing bundled resources..."
- [ ] Console log: "Updated lastSyncedVersion to v0.18.2"
- [ ] Notification appears: "🎨 ÆtherLight v0.18.2 resources synced!" ✅ **UPGRADE NOTIFICATION**
- [ ] Notification has "View Changes" button
- [ ] Notification has "Dismiss" button
- [ ] Clicking "View Changes" opens: https://github.com/AEtherlight-ai/lumina/releases/latest
- [ ] `.vscode/settings.json` updated to: `"aetherlight.lastSyncedVersion": "0.18.2"`
- [ ] Resources re-synced (new resources added, existing preserved)

**Expected Result**: ✅ Version mismatch detected, sync triggered, upgrade notification shown

**Actual Result**: _[Fill in after testing]_

**Pass/Fail**: _[Fill in after testing]_

---

### Test 4: First Run with Version Tracking (No Upgrade Notification)
**Setup**: Brand new workspace (to verify first-run doesn't show upgrade notification)

**Steps**:
1. Press F5 to launch Extension Development Host
2. Open brand new folder (no prior ÆtherLight, no settings.json)
3. Extension activates

**Verification Checklist**:
- [ ] Console log: "Resource sync needed (vnone → v0.18.2)"
- [ ] Console log: "Syncing bundled resources..."
- [ ] Console log: "Updated lastSyncedVersion to v0.18.2"
- [ ] First-run notification appears: "🚀 ÆtherLight installed!" ✅
- [ ] Upgrade notification DOES NOT appear (not an upgrade) ✅
- [ ] `.vscode/settings.json` contains: `"aetherlight.lastSyncedVersion": "0.18.2"`

**Expected Result**: ✅ First-run notification shown, NOT upgrade notification

**Actual Result**: _[Fill in after testing]_

**Pass/Fail**: _[Fill in after testing]_

---

### Test 5: Multiple Workspaces (Independent Tracking)
**Setup**: Two different workspaces

**Preparation**:
1. **Workspace A**: Set `lastSyncedVersion: "0.18.1"` in settings
2. **Workspace B**: Set `lastSyncedVersion: "0.18.2"` in settings

**Steps**:
1. Press F5 to launch Extension Development Host
2. Open Workspace A → Check logs → Close workspace
3. Open Workspace B → Check logs → Close workspace

**Verification Checklist**:
- [ ] **Workspace A**: Console log shows "Resource sync needed (v0.18.1 → v0.18.2)"
- [ ] **Workspace A**: Resources synced, version updated to "0.18.2"
- [ ] **Workspace B**: Console log shows "Resources up to date (v0.18.2)"
- [ ] **Workspace B**: No sync performed (already up to date)
- [ ] Each workspace tracks version independently ✅
- [ ] No cross-contamination between workspaces

**Expected Result**: ✅ Each workspace tracks version independently, correct sync behavior per workspace

**Actual Result**: _[Fill in after testing]_

**Pass/Fail**: _[Fill in after testing]_

---

### Test 6: Package.json Configuration Schema
**Setup**: VS Code settings UI

**Steps**:
1. Press F5 to launch Extension Development Host
2. Open Settings (Cmd+, or Ctrl+,)
3. Search: "aetherlight.lastSyncedVersion"

**Verification Checklist**:
- [ ] Setting appears in search results ✅
- [ ] Setting type: "string"
- [ ] Setting scope: "window" (workspace-scoped)
- [ ] Description: "Last version of bundled resources that were synced to this workspace (managed automatically)"
- [ ] Default value: "" (empty string)
- [ ] Can manually view/edit setting (though normally managed automatically)

**Expected Result**: ✅ Configuration schema properly registered in package.json

**Actual Result**: _[Fill in after testing]_

**Pass/Fail**: _[Fill in after testing]_

---

## BUG-006: Remove RTC/WebSocket Code from Extension

**Status**: 🔜 Not Yet Implemented

_[Tests will be added once BUG-006 is implemented]_

---

## BUG-007: Fix Desktop Installer File Lock Issues (5 Sub-Issues)

**Status**: ✅ Implemented, Ready for Testing
**File Modified**: `vscode-lumina/bin/aetherlight.js`
**Commit**: 6de7430

### Overview

This task fixes 5 file lock issues that caused "file is being used by another process" errors for 40% of Windows users installing ÆtherLight via `aetherlight` CLI.

**Fixes Implemented:**
- Issue #1: File handle closed properly (lines 92-103)
- Issue #2: Installer file NOT deleted (lines 324-326)
- Issue #3: Windows path handling (lines 199-230)
- Issue #4: Antivirus lock retry logic (lines 212-223)
- Issue #5: Redirect file stream closed (lines 68-81, 110-113)

---

### Test 1: Fresh Install with Antivirus Enabled (Issues #1, #3, #4)
**Purpose**: Verify file handle closes properly and retry logic works with real antivirus

**Prerequisites**: Windows with Windows Defender or other antivirus enabled

**Steps**:
1. Open Command Prompt or PowerShell
2. Navigate to project directory: `cd C:\Users\Brett\Dropbox\Ferret9 Global\lumina-clean`
3. Run installer: `node vscode-lumina/bin/aetherlight.js`
4. Watch console output carefully

**Verification Checklist**:
- [ ] Download completes successfully: "✓ Downloaded successfully"
- [ ] After download, waits ~1 second (antivirus scan timeout)
- [ ] Console shows: "Launching installer (attempt 1/3)..."
- [ ] **If file locked**: Console shows "⚠️ Installer file is locked (antivirus scanning)"
- [ ] **If file locked**: Console shows "Retrying in 3 seconds..."
- [ ] **If file locked**: Retries up to 3 times
- [ ] Installer window launches successfully
- [ ] Console shows: "Follow installer prompts to complete setup."
- [ ] No "file is being used by another process" error
- [ ] No "file not found" error

**Expected Result**: ✅ Installer launches after brief wait, clear retry messages if locked

**Actual Result**: _[Fill in after testing]_

**Pass/Fail**: _[Fill in after testing]_

**Notes**: _[Document any retry attempts, wait times, antivirus behavior]_

---

### Test 2: Path with Spaces (Issue #3)
**Purpose**: Verify Windows path conversion handles spaces correctly

**Prerequisites**: Windows

**Steps**:
1. Check temp directory path has spaces (e.g., `C:\Users\Brett\AppData\Local\Temp`)
2. Run installer: `node vscode-lumina/bin/aetherlight.js`
3. Watch for proper path quoting in console output

**Verification Checklist**:
- [ ] Downloads to temp directory with spaces successfully
- [ ] Path conversion: `/` → `\\` (Windows-style)
- [ ] Installer launches with proper quoting: `start "" "C:\...\file.exe"`
- [ ] No "command not recognized" error
- [ ] No path parsing errors

**Expected Result**: ✅ Paths with spaces handled correctly, installer launches

**Actual Result**: _[Fill in after testing]_

**Pass/Fail**: _[Fill in after testing]_

---

### Test 3: Rapid Install/Uninstall (Issue #2)
**Purpose**: Verify installer file NOT deleted while running

**Prerequisites**: Windows, ÆtherLight Desktop app installed

**Steps**:
1. Run installer: `node vscode-lumina/bin/aetherlight.js`
2. Installer window opens
3. Immediately cancel or close installer
4. Run installer again: `node vscode-lumina/bin/aetherlight.js`
5. Repeat 2-3 times

**Verification Checklist**:
- [ ] First install: Installer launches successfully
- [ ] Second install: No "file not found" error
- [ ] Third install: No "file already exists" error
- [ ] Temp directory: Installer .exe file still present during installation
- [ ] After all attempts: No leftover .vsix files in temp directory
- [ ] Console shows consistent behavior across all attempts

**Expected Result**: ✅ No file deletion errors, consistent behavior

**Actual Result**: _[Fill in after testing]_

**Pass/Fail**: _[Fill in after testing]_

**Note**: Installer file is NOT deleted (Windows handles cleanup automatically)

---

### Test 4: HTTP Redirect Handling (Issue #5)
**Purpose**: Verify file stream closes properly on HTTP redirect

**Prerequisites**: Internet connection, GitHub releases available

**Steps**:
1. Clear temp directory: Delete old downloads
2. Run installer: `node vscode-lumina/bin/aetherlight.js`
3. Watch download progress (GitHub may redirect download URL)
4. Monitor for multiple "Downloading..." progress bars

**Verification Checklist**:
- [ ] Download starts successfully
- [ ] If redirected (302/301): New download starts seamlessly
- [ ] Only ONE progress bar per file (not multiple)
- [ ] Download completes to 100%
- [ ] No "EADDRINUSE" or "port already in use" errors
- [ ] No file handle leak warnings
- [ ] Temp directory: Only expected files present (no orphaned .tmp files)

**Expected Result**: ✅ Redirect handled gracefully, no file handle leaks

**Actual Result**: _[Fill in after testing]_

**Pass/Fail**: _[Fill in after testing]_

---

### Test 5: Error Handling - Max Retries Exceeded (Issue #4)
**Purpose**: Verify graceful failure after 3 retry attempts

**Prerequisites**: Manually lock installer file (optional advanced test)

**Steps** (Advanced - Optional):
1. Run installer: `node vscode-lumina/bin/aetherlight.js`
2. Before it launches, open Task Manager → Find installer .exe in temp directory
3. Right-click .exe → Properties → Open file location
4. Try to lock file (open in exclusive mode, or use file locking tool)
5. Let installer retry 3 times

**Verification Checklist**:
- [ ] Attempt 1/3: Shows "⚠️ Installer file is locked (antivirus scanning)"
- [ ] Attempt 2/3: Retries after 3 seconds
- [ ] Attempt 3/3: Final retry attempt
- [ ] After 3 retries: Shows "❌ Installer still locked after retries"
- [ ] After 3 retries: Shows manual path: "Try running installer manually from:"
- [ ] Console shows full temp path to installer .exe
- [ ] Script exits gracefully (no crash)

**Expected Result**: ✅ Clear error messages, manual fallback instructions

**Actual Result**: _[Fill in after testing]_

**Pass/Fail**: _[Fill in after testing]_

**Note**: This test is optional (requires manual file locking)

---

### Test 6: Mac Installation (Regression Test)
**Purpose**: Verify Mac installation still works (unchanged code path)

**Prerequisites**: macOS (skip if not available)

**Steps**:
1. Run installer: `node vscode-lumina/bin/aetherlight.js`
2. Wait for download
3. Verify app installs to /Applications

**Verification Checklist**:
- [ ] Download completes successfully
- [ ] Mac installation path executes (not Windows path)
- [ ] Console shows: "Installing to /Applications..."
- [ ] App copied to /Applications successfully
- [ ] Console shows: "✅ Desktop app installed to /Applications!"
- [ ] No errors related to Windows-specific changes

**Expected Result**: ✅ Mac installation unaffected by Windows fixes

**Actual Result**: _[Fill in after testing]_

**Pass/Fail**: _[Fill in after testing]_

---

### Overall Success Criteria

**All tests must pass:**
- ✅ Test 1: Fresh install with antivirus (CRITICAL)
- ✅ Test 2: Path with spaces (CRITICAL)
- ✅ Test 3: Rapid install/uninstall (CRITICAL)
- ✅ Test 4: HTTP redirect (IMPORTANT)
- ⚪ Test 5: Max retries exceeded (OPTIONAL)
- ⚪ Test 6: Mac installation (OPTIONAL - if Mac available)

**Key Metrics:**
- Installer success rate: Target 95%+ (up from 60%)
- No "file is being used by another process" errors
- No "file not found" errors
- Clear user-facing retry messages

**If ANY test fails:**
1. Document the failure in "Issues Found During Testing" section
2. Revert commit 6de7430 using: `git revert 6de7430`
3. Restore backup: `cp vscode-lumina/bin/aetherlight.js.backup vscode-lumina/bin/aetherlight.js`
4. Re-investigate and fix
5. Re-test before marking BUG-007 as completed

---

## BUG-004: Add Version Check Before Running Installer

**Status**: ✅ Implemented, Ready for Testing
**File Modified**: `vscode-lumina/bin/aetherlight.js:197-268,304-357,367-425`
**Commit**: 302bc28

### Overview

This task adds version checking to avoid unnecessary downloads and installations when the desktop app is already up to date. Saves 150MB bandwidth and 2+ minutes per run.

**Features Implemented:**
- getInstalledDesktopVersion() function (Windows + Mac)
- Version check in installDesktopApp() (shows "Already up to date!")
- Early check in main() (skips download if already up to date)
- Version normalization (0.18.2 vs v0.18.2 handled correctly)

---

### Test 1: Fresh Install (No App Installed)
**Purpose**: Verify installer proceeds normally when app not detected

**Prerequisites**: Windows or Mac, Lumina Desktop NOT installed

**Steps**:
1. Uninstall Lumina Desktop if installed:
   - Windows: Settings > Apps > Lumina > Uninstall
   - Mac: Delete /Applications/Lumina.app
2. Open Command Prompt or Terminal
3. Navigate to project: `cd C:\Users\Brett\Dropbox\Ferret9 Global\lumina-clean`
4. Run installer: `node vscode-lumina/bin/aetherlight.js`
5. Watch console output

**Verification Checklist**:
- [ ] Console shows: "🖥️ Checking Desktop app..."
- [ ] Console shows: "Desktop app not found, installing 0.18.2..." (or current version)
- [ ] Console shows: "Installing Desktop app..."
- [ ] Console shows: "📥 Downloading Desktop app..." (download proceeds)
- [ ] Download completes: "✓ Downloaded successfully"
- [ ] Installer launches: "Launching installer (attempt 1/3)..."
- [ ] NO "Already up to date!" message (app wasn't installed)
- [ ] Installation proceeds normally

**Expected Result**: ✅ Version detection returns null, download and install proceed

**Actual Result**: _[Fill in after testing]_

**Pass/Fail**: _[Fill in after testing]_

---

### Test 2: Already Up to Date (Same Version Installed)
**Purpose**: Verify version check skips download and shows "Already up to date!" ⭐ **MAIN FEATURE**

**Prerequisites**: Windows or Mac, Lumina Desktop v0.18.2 installed

**Setup**:
1. Ensure Lumina Desktop v0.18.2 is installed (install from Test 1 if needed)
2. Verify version matches latest release (v0.18.2)

**Steps**:
1. Open Command Prompt or Terminal
2. Navigate to project: `cd C:\Users\Brett\Dropbox\Ferret9 Global\lumina-clean`
3. Run installer: `node vscode-lumina/bin/aetherlight.js`
4. Watch console output carefully

**Verification Checklist**:
- [ ] Console shows: "🖥️ Checking Desktop app..."
- [ ] Console shows: "Found installed version: 0.18.2" ✅ **VERSION DETECTED**
- [ ] Console shows: "✅ Desktop app is already up to date!" ✅ **SKIP MESSAGE**
- [ ] Console shows: "Version 0.18.2 is the latest version."
- [ ] Console shows: "No update needed."
- [ ] Console DOES NOT show: "📥 Downloading Desktop app..." ✅ **NO DOWNLOAD**
- [ ] Console DOES NOT show: "Installing Desktop app..." ✅ **NO INSTALL**
- [ ] VS Code extension still installs normally (not affected)
- [ ] Script completes successfully

**Expected Result**: ✅ Download and install skipped, "Already up to date!" message shown

**Actual Result**: _[Fill in after testing]_

**Pass/Fail**: _[Fill in after testing]_

**Bandwidth Saved**: 150MB ✅
**Time Saved**: 2+ minutes ✅

---

### Test 3: Upgrade Available (Old Version Installed)
**Purpose**: Verify upgrade message shown when version mismatch detected

**Prerequisites**: Windows or Mac, Lumina Desktop v0.18.1 (or older) installed

**Setup** (Manual version downgrade simulation):
1. If you have v0.18.2 installed, you can simulate this by:
   - Temporarily editing `vscode-lumina/bin/aetherlight.js`
   - Change line ~369: `const releaseVersion = '0.18.3';` (simulate newer release)
   - This tricks the system into thinking v0.18.2 is outdated

**Steps**:
1. Open Command Prompt or Terminal
2. Navigate to project
3. Run installer: `node vscode-lumina/bin/aetherlight.js`
4. Watch console output

**Verification Checklist**:
- [ ] Console shows: "🖥️ Checking Desktop app..."
- [ ] Console shows: "Found installed version: 0.18.2"
- [ ] Console shows: "Updating from 0.18.2 to 0.18.3..." ✅ **UPGRADE MESSAGE**
- [ ] Console shows: "Installing Desktop app..."
- [ ] Console shows: "📥 Downloading Desktop app..." (download proceeds)
- [ ] Download completes successfully
- [ ] Installer launches successfully
- [ ] NO "Already up to date!" message (version mismatch detected)

**Expected Result**: ✅ Upgrade detected, download and install proceed with clear message

**Actual Result**: _[Fill in after testing]_

**Pass/Fail**: _[Fill in after testing]_

**Note**: Revert temporary edit after testing if you modified release version

---

### Test 4: Version Detection Methods (Windows Registry)
**Purpose**: Verify Windows registry detection works correctly

**Prerequisites**: Windows only, Lumina Desktop installed

**Steps**:
1. Open Command Prompt as Administrator
2. Check registry directly:
   ```cmd
   reg query "HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall" /s /f "Lumina"
   ```
3. Look for `DisplayVersion` entry
4. Note the version shown (e.g., "0.18.2")
5. Run installer: `node vscode-lumina/bin/aetherlight.js`
6. Verify version detected matches registry

**Verification Checklist**:
- [ ] Registry query returns Lumina entry
- [ ] DisplayVersion field exists in registry
- [ ] DisplayVersion shows correct version (e.g., "0.18.2")
- [ ] Installer detects same version: "Found installed version: 0.18.2"
- [ ] Registry method (Method 1) works correctly

**Expected Result**: ✅ Registry detection successful, version matches

**Actual Result**: _[Fill in after testing]_

**Pass/Fail**: _[Fill in after testing]_

---

### Test 5: Version Detection Methods (Windows File Path + WMIC)
**Purpose**: Verify fallback methods work if registry fails

**Prerequisites**: Windows only, Lumina Desktop installed

**Steps**:
1. Check file path exists:
   ```cmd
   dir "%LOCALAPPDATA%\Programs\Lumina\Lumina.exe"
   ```
2. Check WMIC version detection:
   ```cmd
   wmic datafile where name="%LOCALAPPDATA:\=\\%\\Programs\\Lumina\\Lumina.exe" get Version /value
   ```
3. Note the version shown
4. Temporarily break registry detection (optional advanced test):
   - Edit `vscode-lumina/bin/aetherlight.js` line ~210
   - Change registry query to invalid path to force fallback
5. Run installer: `node vscode-lumina/bin/aetherlight.js`

**Verification Checklist**:
- [ ] File path exists: Lumina.exe found in AppData\Local\Programs
- [ ] WMIC returns version successfully
- [ ] If registry broken: Fallback to WMIC works
- [ ] Installer still detects version correctly
- [ ] Console shows: "Found installed version: 0.18.2"

**Expected Result**: ✅ Fallback methods work, version detected correctly

**Actual Result**: _[Fill in after testing]_

**Pass/Fail**: _[Fill in after testing]_

**Note**: Revert any temporary edits after testing

---

### Test 6: Version Detection Methods (Windows PowerShell Fallback)
**Purpose**: Verify PowerShell fallback works on Windows 11 (WMIC deprecated)

**Prerequisites**: Windows 11 (or simulate WMIC failure)

**Steps**:
1. Check PowerShell version detection:
   ```powershell
   (Get-Item "$env:LOCALAPPDATA\Programs\Lumina\Lumina.exe").VersionInfo.ProductVersion
   ```
2. Note the version shown
3. Run installer: `node vscode-lumina/bin/aetherlight.js`

**Verification Checklist**:
- [ ] PowerShell command returns version successfully
- [ ] Version format: "0.18.2" or "0.18.2.0"
- [ ] Installer detects version correctly (normalizes format)
- [ ] Console shows: "Found installed version: 0.18.2"
- [ ] PowerShell method (Method 3) works as final fallback

**Expected Result**: ✅ PowerShell fallback works on Windows 11

**Actual Result**: _[Fill in after testing]_

**Pass/Fail**: _[Fill in after testing]_

---

### Test 7: Version Detection Methods (Mac Info.plist)
**Purpose**: Verify macOS plist parsing works correctly

**Prerequisites**: macOS only, Lumina.app installed in /Applications

**Steps**:
1. Check Info.plist exists:
   ```bash
   cat /Applications/Lumina.app/Contents/Info.plist | grep -A 1 CFBundleShortVersionString
   ```
2. Note the version shown
3. Run installer: `node vscode-lumina/bin/aetherlight.js`
4. Verify version detected matches plist

**Verification Checklist**:
- [ ] Info.plist file exists
- [ ] CFBundleShortVersionString field present
- [ ] Version shows correct value (e.g., "0.18.2")
- [ ] Installer detects same version: "Found installed version: 0.18.2"
- [ ] Mac plist parsing works correctly

**Expected Result**: ✅ Mac version detection successful

**Actual Result**: _[Fill in after testing]_

**Pass/Fail**: _[Fill in after testing]_

---

### Test 8: Version String Normalization (Edge Case)
**Purpose**: Verify version comparison handles "v" prefix correctly

**Prerequisites**: Lumina Desktop installed

**Setup** (Simulate version mismatch):
1. Temporarily edit registry (Windows) or plist (Mac) to add "v" prefix:
   - Windows: `reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall\Lumina" /v DisplayVersion /t REG_SZ /d "v0.18.2" /f`
   - Mac: Edit Info.plist to show `<string>v0.18.2</string>`
2. Run installer

**Steps**:
1. Run installer: `node vscode-lumina/bin/aetherlight.js`
2. Watch for version comparison

**Verification Checklist**:
- [ ] Version detected: "v0.18.2" or "0.18.2"
- [ ] Comparison works correctly (v0.18.2 == 0.18.2 after normalization)
- [ ] Console shows: "✅ Desktop app is already up to date!"
- [ ] NO false "Updating..." message (normalization prevents mismatch)
- [ ] Both "v0.18.2" and "0.18.2" treated as identical

**Expected Result**: ✅ Version normalization works, no false upgrades

**Actual Result**: _[Fill in after testing]_

**Pass/Fail**: _[Fill in after testing]_

**Note**: Revert registry/plist changes after testing

---

### Overall Success Criteria

**All critical tests must pass:**
- ✅ Test 1: Fresh install (CRITICAL)
- ✅ Test 2: Already up to date (CRITICAL) ⭐ **MAIN FEATURE**
- ✅ Test 3: Upgrade available (CRITICAL)
- ✅ Test 4: Windows registry detection (IMPORTANT)
- ⚪ Test 5: Windows WMIC fallback (OPTIONAL)
- ⚪ Test 6: Windows PowerShell fallback (OPTIONAL - Windows 11 only)
- ⚪ Test 7: Mac Info.plist (OPTIONAL - if Mac available)
- ⚪ Test 8: Version normalization (OPTIONAL - edge case)

**Key Metrics:**
- Bandwidth saved: 150MB when up to date ✅
- Time saved: 2+ minutes when up to date ✅
- Version detection accuracy: 95%+ across all methods
- Clear user feedback: "Already up to date!" vs. "Updating..." vs. "Installing..."

**If ANY critical test fails:**
1. Document the failure in "Issues Found During Testing" section
2. Revert commit 302bc28 using: `git revert 302bc28`
3. Restore backup if needed: `cp vscode-lumina/bin/aetherlight.js.backup vscode-lumina/bin/aetherlight.js`
4. Re-investigate and fix
5. Re-test before marking BUG-004 as completed

---

## BUG-008: Fix License Activation Not Persisting

**Status**: ⏳ Investigation Phase (Logging Added)
**File Modified**: `vscode-lumina/src/extension.ts:306-429`
**Commit**: [pending]

### Investigation Phase: Test 5 Theories with Debug Logging

**IMPORTANT**: Debug logging has been added to identify root cause. Run these tests in sequence and document the console output.

---

### Test 1: Fresh Activation Test (Persistence Check)
**Purpose**: Test if config.update() actually saves the license key

**Setup**: Fresh workspace, no prior ÆtherLight activation

**Steps**:
1. Press F5 to launch Extension Development Host
2. File → Open Folder → Select fresh workspace
3. View → Output → Select "ÆtherLight Extension" from dropdown
4. Wait for activation prompt
5. Click "Enter License Key"
6. Enter test key: `W7HD-X79Q-CQJ9-XW13` (Pro tier)
7. Watch console logs carefully

**Verification Checklist**:
- [ ] Console log: `[BUG-008 DEBUG] === License Activation Starting ===`
- [ ] Console log: `[BUG-008 DEBUG] License key from config: (empty)`
- [ ] Console log: `[BUG-008 DEBUG] User entered license key: W7HD...`
- [ ] Console log: `[BUG-008 DEBUG] Saving license key to Global settings...`
- [ ] Console log: `[BUG-008 DEBUG] config.update() completed successfully`
- [ ] Console log: `[BUG-008 DEBUG] Verification - key after save: W7HD...`
- [ ] **CRITICAL**: Console log: `[BUG-008 DEBUG] Persistence check: SUCCESS ✅`
- [ ] Console log: `[BUG-008 DEBUG] Validating license key with server...`
- [ ] Console log: `[BUG-008 DEBUG] Validation result: { tier: 'pro', valid: true, ... }`
- [ ] Console log: `[BUG-008 DEBUG] Final persisted state:`
- [ ] Console log: `[BUG-008 DEBUG]   - licenseKey: W7HD...`
- [ ] Console log: `[BUG-008 DEBUG]   - userTier: pro`

**Expected Result**: ✅ Persistence check shows SUCCESS, license key saved immediately after entry

**Actual Result**: _[Fill in after testing]_

**Pass/Fail**: _[Fill in after testing]_

**Theory Tested**:
- If "Persistence check: FAILED ❌" → **Theory 2** (Config object stale)
- If "Persistence check: SUCCESS ✅" → Proceed to Test 2

---

### Test 2: Reload Persistence Test (THE BUG)
**Purpose**: Test if license key survives a VS Code window reload

**Prerequisites**: Test 1 completed with "Persistence check: SUCCESS ✅"

**Setup**: Same workspace from Test 1 (license key should be saved)

**Steps**:
1. In Extension Development Host, press Ctrl+R (or Cmd+R) to reload window
2. View → Output → Select "ÆtherLight Extension"
3. Watch console logs on second activation

**Verification Checklist**:
- [ ] Console log: `[BUG-008 DEBUG] === License Activation Starting ===`
- [ ] **CRITICAL**: Console log: `[BUG-008 DEBUG] License key from config: W7HD...` (NOT empty!)
- [ ] Console log: `[BUG-008 DEBUG] Settings locations:` shows globalValue populated
- [ ] Console log: `[BUG-008 DEBUG] Validating license key with server...`
- [ ] Console log: `[BUG-008 DEBUG] Final persisted state: - licenseKey: W7HD...`
- [ ] NO activation prompt appears (key already saved)
- [ ] Extension activates with Pro tier automatically

**Expected Result**: ✅ License key persists across reload, no activation prompt on second launch

**Actual Result**: _[Fill in after testing]_

**Pass/Fail**: _[Fill in after testing]_

**Theory Tested**:
- If "License key from config: (empty)" → **Theory 1** (ConfigurationTarget.Global not persisting)
- If "License key from config: W7HD..." → License key IS persisting (bug is elsewhere)
- If globalValue is null but key reads as non-empty → **Theory 4** (Permissions issue)

---

### Test 3: Manual Settings Verification Test
**Purpose**: Verify where settings are actually being written

**Prerequisites**: Test 1 completed

**Steps**:
1. After Test 1, press Ctrl+Shift+P (or Cmd+Shift+P)
2. Type "Preferences: Open Settings (JSON)"
3. Select **"User Settings"** (NOT Workspace Settings)
4. Search for `"aetherlight.licenseKey"`
5. Check if key is present in JSON file

**Verification Checklist**:
- [ ] User Settings JSON file opens successfully
- [ ] File contains: `"aetherlight.licenseKey": "W7HD-X79Q-CQJ9-XW13"`
- [ ] File contains: `"aetherlight.userTier": "pro"`
- [ ] No errors in console about file permissions
- [ ] Settings file is not read-only

**Expected Result**: ✅ Settings are written to User Settings JSON file

**Actual Result**: _[Fill in after testing]_

**Pass/Fail**: _[Fill in after testing]_

**Theory Tested**:
- If key is missing from User Settings JSON → **Theory 1 or Theory 4** (Global not working or permissions issue)
- If key is present in User Settings JSON → Settings ARE being written correctly

---

### Test 4: Manual Entry Bypass Test
**Purpose**: Test if manually entering key bypasses the issue

**Setup**: Fresh workspace OR clear existing settings

**Steps**:
1. Press Ctrl+Shift+P → "Preferences: Open Settings (JSON)"
2. Select "User Settings"
3. Manually add to JSON file:
   ```json
   {
     "aetherlight.licenseKey": "W7HD-X79Q-CQJ9-XW13",
     "aetherlight.userTier": "pro"
   }
   ```
4. Save file (Ctrl+S)
5. Reload VS Code window (Ctrl+R)
6. Watch console logs

**Verification Checklist**:
- [ ] Console log: `[BUG-008 DEBUG] License key from config: W7HD...`
- [ ] Extension reads key from manually-entered settings
- [ ] No activation prompt appears
- [ ] Extension activates with Pro tier
- [ ] Console logs show validation succeeds

**Expected Result**: ✅ Manually-entered key works, extension activates correctly

**Actual Result**: _[Fill in after testing]_

**Pass/Fail**: _[Fill in after testing]_

**Theory Tested**:
- If manual entry works → Save mechanism is broken, not read mechanism
- If manual entry fails → **Theory 3** (Validation failing silently) or reading from wrong location

---

### Test 5: Multi-Activation Race Condition Test
**Purpose**: Check if multiple activations are overwriting each other

**Setup**: Multi-root workspace with 2-3 folders

**Steps**:
1. Press F5 to launch Extension Development Host
2. File → Add Folder to Workspace (add 2-3 separate folders)
3. Enter license key when prompted
4. Watch console logs for multiple activation sequences

**Verification Checklist**:
- [ ] **Count**: How many `=== License Activation Starting ===` messages appear?
- [ ] Do multiple activations happen in parallel?
- [ ] Do different config values get read by each activation?
- [ ] Does the last activation overwrite previous ones?
- [ ] Does the final persisted state match the last activation?

**Expected Result**: ✅ Only ONE activation happens, no race condition

**Actual Result**: _[Fill in after testing]_

**Pass/Fail**: _[Fill in after testing]_

**Theory Tested**:
- If multiple activations happen → **Theory 5** (Race condition)
- If only one activation happens → Race condition ruled out

---

## FEATURE-001: Add Auto-Detection Notification

**Status**: 🔜 Not Yet Implemented
**Blocked by**: BUG-003

_[Tests will be added once FEATURE-001 is implemented]_

---

## FEATURE-002: Add Command Palette Sync Command

**Status**: ⏳ Ready for Testing
**File Created**: `vscode-lumina/src/commands/syncResources.ts`
**Files Modified**: `vscode-lumina/src/extension.ts`, `vscode-lumina/package.json`, `vscode-lumina/src/firstRunSetup.ts`
**Commit**: 763418b

### Test 1: Command Appears in Command Palette
**Setup**: Extension Development Host (F5) with any workspace open

**Steps**:
1. Press Ctrl+Shift+P (Windows/Linux) or Cmd+Shift+P (Mac)
2. Type "sync"
3. Look for "ÆtherLight: Sync Bundled Resources"

**Verification Checklist**:
- [ ] Command appears in Command Palette
- [ ] Command is under "ÆtherLight" category
- [ ] Command shows correct title: "Sync Bundled Resources"

**Expected Result**: ✅ Command is discoverable and properly labeled

**Actual Result**: _[Fill in after testing]_

**Pass/Fail**: _[Fill in after testing]_

---

### Test 2: Sync Progress Notification
**Setup**: Extension Development Host with workspace open

**Steps**:
1. Open Command Palette (Ctrl+Shift+P)
2. Select "ÆtherLight: Sync Bundled Resources"
3. Watch for progress notification

**Verification Checklist**:
- [ ] Progress notification appears: "ÆtherLight: Syncing Resources"
- [ ] Step 1 shows: "Copying skills, agents, and patterns..."
- [ ] Step 2 shows: "Updating version..."
- [ ] Notification disappears when complete

**Expected Result**: ✅ User sees progress feedback during sync

**Actual Result**: _[Fill in after testing]_

**Pass/Fail**: _[Fill in after testing]_

---

### Test 3: Success Message with Action Buttons
**Setup**: Extension Development Host with workspace open

**Steps**:
1. Run "ÆtherLight: Sync Bundled Resources" command
2. Wait for sync to complete
3. Look for success message

**Verification Checklist**:
- [ ] Success message appears: "✅ Resources synced successfully! Skills, agents, and patterns are ready."
- [ ] Three buttons present: "View Skills", "View Agents", "View Patterns"
- [ ] Clicking "View Skills" opens `.claude/skills` in Explorer
- [ ] Clicking "View Agents" opens `internal/agents` in Explorer
- [ ] Clicking "View Patterns" opens `docs/patterns` in Explorer

**Expected Result**: ✅ User can quickly access synced directories

**Actual Result**: _[Fill in after testing]_

**Pass/Fail**: _[Fill in after testing]_

---

### Test 4: Resources Actually Synced
**Setup**:
1. Delete `.claude/skills`, `internal/agents`, `docs/patterns`
2. Open workspace in Extension Development Host

**Steps**:
1. Run "ÆtherLight: Sync Bundled Resources" command
2. Wait for completion
3. Check file system

**Verification Checklist**:
- [ ] `.claude/skills/` exists with 16+ skill directories
- [ ] `internal/agents/` exists with 14+ agent .md files
- [ ] `docs/patterns/` exists with 86+ pattern .md files
- [ ] All files have content (not empty)

**Expected Result**: ✅ All bundled resources copied to workspace

**Actual Result**: _[Fill in after testing]_

**Pass/Fail**: _[Fill in after testing]_

---

### Test 5: Version Updated After Sync
**Setup**: Workspace with `lastSyncedVersion` set to older version (e.g., "0.18.1")

**Steps**:
1. Check `.vscode/settings.json` → `aetherlight.lastSyncedVersion` is "0.18.1"
2. Run "ÆtherLight: Sync Bundled Resources" command
3. Check `.vscode/settings.json` again

**Verification Checklist**:
- [ ] `lastSyncedVersion` updated to current version (0.18.2)
- [ ] Setting persists after closing/reopening workspace

**Expected Result**: ✅ Version tracking updated correctly

**Actual Result**: _[Fill in after testing]_

**Pass/Fail**: _[Fill in after testing]_

---

### Test 6: Error Handling - No Workspace Open
**Setup**: Close all folders in VS Code

**Steps**:
1. Open Command Palette (Ctrl+Shift+P)
2. Select "ÆtherLight: Sync Bundled Resources"
3. Watch for error message

**Verification Checklist**:
- [ ] Error message appears: "No workspace folder open. Please open a folder first."
- [ ] No crash or unhandled exception
- [ ] Extension remains functional

**Expected Result**: ✅ Graceful error handling when no workspace

**Actual Result**: _[Fill in after testing]_

**Pass/Fail**: _[Fill in after testing]_

---

### Test 7: Error Handling - Retry Button (Simulate Failure)
**Note**: This test requires manual code modification to simulate failure

**Setup**:
1. Temporarily modify `syncResources.ts` to throw error: `throw new Error('Simulated failure')`
2. Recompile extension

**Steps**:
1. Run "ÆtherLight: Sync Bundled Resources" command
2. Watch for error message

**Verification Checklist**:
- [ ] Error message appears: "Failed to sync resources: Simulated failure"
- [ ] "Retry" button present
- [ ] Clicking "Retry" re-runs sync command
- [ ] "Cancel" button dismisses message

**Expected Result**: ✅ User can retry failed syncs

**Actual Result**: _[Fill in after testing]_

**Pass/Fail**: _[Fill in after testing]_

**Cleanup**: Revert code modification and recompile

---

### Test 8: Integration with BUG-002 (File-Level Copying)
**Setup**: Workspace with some resources present, some missing

**Steps**:
1. Keep `.claude/skills/analyze-workspace/` but delete other skills
2. Keep `internal/agents/infrastructure-agent.md` but delete other agents
3. Run "ÆtherLight: Sync Bundled Resources" command
4. Check file system

**Verification Checklist**:
- [ ] Existing files preserved (analyze-workspace/, infrastructure-agent.md)
- [ ] Missing files added (other skills, other agents)
- [ ] No duplicates created
- [ ] File-level incremental sync works correctly

**Expected Result**: ✅ Only missing files copied, existing preserved

**Actual Result**: _[Fill in after testing]_

**Pass/Fail**: _[Fill in after testing]_

---

## Pre-Publishing Checklist

**Run these tests BEFORE publishing v0.18.3:**

### Compilation & Build
- [ ] `cd vscode-lumina && npm run compile` - No errors
- [ ] `cd vscode-lumina && npm run package` - VSIX builds successfully
- [ ] VSIX file size reasonable (~50MB typical)

### Smoke Tests
- [ ] Extension activates in fresh VS Code install
- [ ] Extension activates in existing workspace
- [ ] No console errors on activation
- [ ] Voice panel opens correctly
- [ ] Sprint panel opens correctly
- [ ] Status bar items appear

### Critical Path Testing
- [ ] BUG-001: Fresh workspace gets all resources ✅
- [ ] BUG-001: Existing workspace gets missing resources ✅
- [ ] BUG-003: Version tracking detects upgrades and skips unnecessary syncs ✅
- [ ] BUG-003: Upgrade notification shown on version mismatch ✅
- [ ] BUG-004: Version check skips download when already up to date ✅
- [ ] BUG-004: Shows "Already up to date!" message correctly ✅
- [ ] BUG-007: Installer launches successfully with antivirus enabled ✅
- [ ] BUG-007: No "file is being used by another process" errors ✅
- [ ] BUG-009: Start Task doesn't auto-send to terminal ✅
- [ ] FEATURE-002: Command appears in Command Palette ✅
- [ ] FEATURE-002: Progress notification shows during sync ✅
- [ ] FEATURE-002: Success message with action buttons works ✅
- [ ] FEATURE-002: Resources actually synced to workspace ✅
- [ ] FEATURE-002: Version updated after manual sync ✅
- [ ] All implemented bugs: Tests pass ✅

### Regression Testing
- [ ] Voice capture still works (Ctrl+Shift+V)
- [ ] Sprint panel loads correctly
- [ ] Task detail panel shows task info
- [ ] Enhancement buttons work
- [ ] Send to terminal works (Ctrl+Enter)

### Documentation
- [ ] CHANGELOG.md updated with all bug fixes
- [ ] Version number correct in all 4 package.json files
- [ ] GitHub release notes prepared
- [ ] Desktop installer binaries attached (if releasing desktop)

---

## Issues Found During Testing

**Document any issues discovered here:**

### Issue 1: [Title]
- **Date**:
- **Task**:
- **Description**:
- **Steps to Reproduce**:
- **Expected**:
- **Actual**:
- **Severity**:
- **Action Taken**:

### Issue 2: [Title]
_[Add more as needed]_

---

## Test Summary

**Date Completed**: _[Fill in when all tests pass]_
**Tester**: Brett
**Total Tests Run**: _[Count]_
**Passed**: _[Count]_
**Failed**: _[Count]_
**Blocked**: _[Count]_

**Overall Status**: 🔴 NOT READY / 🟡 NEEDS FIXES / 🟢 READY TO PUBLISH

**Notes**: _[Final comments before publishing]_

---

## Publishing Workflow (After All Tests Pass)

**DO NOT proceed until all critical tests pass:**

1. **Verify all package.json versions match**:
   ```bash
   grep '"version"' vscode-lumina/package.json packages/*/package.json
   ```

2. **Run automated publish script**:
   ```bash
   node scripts/publish-release.js patch  # v0.18.2 → v0.18.3
   ```

3. **Verify npm package published**:
   ```bash
   npm view aetherlight@latest version
   ```

4. **Verify GitHub release created**:
   - Check: https://github.com/AEtherlight-ai/lumina/releases/latest

5. **Test npm install**:
   ```bash
   npm install -g aetherlight@latest
   aetherlight  # Should install v0.18.3
   ```

6. **Mark sprint complete**:
   - Update `ACTIVE_SPRINT_18.2.toml` status to "completed"

---

**Pattern References**:
- Pattern-TDD-001: Test-driven development
- Pattern-TRACKING-001: Sprint TOML lifecycle
- Pattern-PUBLISH-001: Automated release pipeline
- Pattern-VALIDATION-001: Pre-flight checklist

**Historical Context**: Sprint 18.2 addresses critical resource bundling bugs affecting 100% of users upgrading from v0.18.1 → v0.18.2. This test checklist ensures all fixes work before release.
