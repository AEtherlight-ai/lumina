# ÆtherLight Project - Claude Code Instructions

**Project:** ÆtherLight (Voice-to-intelligence platform for developers)
**Last Updated:** 2025-10-31
**Initialized:** 2025-10-31 (Full ÆtherLight setup complete)

---

## Project Overview

ÆtherLight is a VS Code extension + desktop app that provides:
- Voice capture and transcription (Whisper API)
- Pattern matching to prevent AI hallucinations
- Real-time context sync
- Sprint management and workspace analysis

**Tech Stack:**
- VS Code Extension: TypeScript
- Desktop App: Tauri (Rust + TypeScript)
- Packages: Node.js, native bindings (NAPI)

---

## ⛔⛔⛔ CRITICAL RULES - VIOLATION = CATASTROPHIC FAILURE ⛔⛔⛔

### 🚨 PUBLISHING & RELEASES - DO NOT FUCK THIS UP 🚨

# ⚠️ READ THIS OR BREAK EVERYTHING ⚠️

**THE ONLY ACCEPTABLE WAY TO PUBLISH:**
```bash
node scripts/publish-release.js [patch|minor|major]
```

**❌ FORBIDDEN COMMANDS - NEVER RUN THESE:**
```bash
❌ npm publish              # BREAKS VERSION SYNC
❌ vsce publish             # BREAKS GITHUB RELEASE
❌ gh release create        # BREAKS NPM SYNC
❌ git tag                  # BREAKS AUTOMATION
❌ npm version              # BREAKS EVERYTHING
```

**🔴 WHAT HAPPENS IF YOU VIOLATE THIS:**
1. GitHub Actions FAIL
2. Users can't install
3. Desktop app breaks
4. Version mismatches everywhere
5. HOURS of manual fixing
6. Users lose trust
7. EVERYTHING IS FUCKED

**✅ CORRECT ORDER (ENFORCED BY SCRIPT):**
1. GitHub release created FIRST (with ALL assets)
2. npm publish happens LAST
3. Desktop installers MUST be in GitHub release
4. ALL packages publish together

**NEVER manually run individual publish steps** - this causes CATASTROPHIC FAILURES.

**Why:** The script ensures:
- Everything is compiled before publishing
- All artifacts are verified
- Versions are synced across all packages
- No timing issues or partial deploys

**Related Files:**
- `scripts/publish-release.js` - Automated release pipeline
- `scripts/bump-version.js` - Version synchronization
- `.claude/commands/publish.md` - Publishing command
- `PUBLISHING.md` - Publishing documentation

### Version Management

All packages MUST stay in sync:
- `vscode-lumina/package.json` (main extension)
- `packages/aetherlight-sdk/package.json`
- `packages/aetherlight-analyzer/package.json`
- `packages/aetherlight-node/package.json`

The bump-version script handles this automatically.

### Code Quality

1. **Always compile TypeScript before testing:**
   ```bash
   cd vscode-lumina && npm run compile
   ```

2. **Pattern for extension code:**
   - Add Chain of Thought comments explaining WHY
   - Reference related files and patterns
   - Document design decisions

3. **Testing:**
   - Manual testing required (no automated tests yet)
   - Test in VS Code extension host (F5)
   - Verify all commands work

---

## Common Tasks

### Publishing a New Version

Use the `/publish` command or:
```bash
node scripts/publish-release.js patch   # Bug fixes (0.13.20 → 0.13.21)
node scripts/publish-release.js minor   # New features (0.13.20 → 0.14.0)
node scripts/publish-release.js major   # Breaking changes (0.13.20 → 1.0.0)
```

### Making Changes to Extension

1. Edit TypeScript files in `vscode-lumina/src/`
2. Compile: `cd vscode-lumina && npm run compile`
3. Test: Press F5 in VS Code to launch Extension Development Host
4. Verify changes work
5. Commit changes
6. Publish using automated script

### Updating Auto-Update System

The update checker is in `vscode-lumina/src/services/updateChecker.ts`

**Important:** Any changes here affect how users receive updates. Test thoroughly.

---

## Project Structure

```
lumina-clean/
├── vscode-lumina/           # Main VS Code extension
│   ├── src/
│   │   ├── extension.ts     # Entry point
│   │   ├── services/
│   │   │   └── updateChecker.ts  # Auto-update system
│   │   └── commands/        # Command handlers
│   ├── out/                 # Compiled JavaScript (git-ignored)
│   └── package.json         # Main package manifest
├── packages/
│   ├── aetherlight-sdk/     # SDK for app integration
│   ├── aetherlight-analyzer/# Workspace analyzer
│   └── aetherlight-node/    # Native Rust bindings
├── scripts/
│   ├── publish-release.js   # Automated publishing (USE THIS!)
│   └── bump-version.js      # Version sync utility
├── .claude/
│   ├── commands/
│   │   └── publish.md       # /publish command
│   └── settings.local.json  # Local settings
├── CLAUDE.md               # This file - project instructions
└── PUBLISHING.md           # Publishing guide
```

---

## Known Issues & Fixes

### Issue: Extension shows old version after update
**Status:** FIXED in 0.13.21
**Cause:** Update command only updated npm, not VS Code extension directory
**Fix:** Updated `updateChecker.ts` to run full install cycle
**Files:** `vscode-lumina/src/services/updateChecker.ts:228`

### Issue: Version mismatches between packages
**Status:** PREVENTED by automated script
**Prevention:** Always use `scripts/publish-release.js`
**Never:** Manually publish individual packages

### Issue: Publish script verification falsely reports .vsix not found (v0.15.16)
**Status:** FIXED in publish script
**Time to Fix:** 45 minutes
**Severity:** MEDIUM - Script was functional but reported false failures
**Cause:** GitHub API propagation delay - assets take 1-3 seconds to appear in API after upload
**Impact:**
- Script would report "✗ GitHub release verification failed - .vsix not found"
- Verification happened IMMEDIATELY after upload, before GitHub API propagated
- File was actually uploaded successfully, but verification timed out
- User had to bypass script rules and manually publish npm packages
**Why This Happened:**
- Step 11: `gh release create` uploads assets synchronously
- Step 14: Verification runs IMMEDIATELY after (< 1 second later)
- GitHub's API takes 1-3 seconds to reflect uploaded assets
- Single check with no retry = false negative
**Root Cause:** No retry logic for API propagation delays
**Fix:** Added exponential backoff retry logic (5 attempts: 1s, 2s, 4s, 8s delays)
**Files:**
- `scripts/publish-release.js:546-578` - Added retry loop with exponential backoff
- `scripts/publish-release.js:570-575` - Enhanced error logging with debug info
**Solution Details:**
```javascript
// BEFORE: Single check, immediate failure
const vsixCheck = execSilent(`gh release view v${newVersion} ...`);
if (!vsixCheck || !vsixCheck.includes(...)) {
  process.exit(1); // FAIL IMMEDIATELY
}

// AFTER: Retry with exponential backoff
let vsixCheck = null;
const maxRetries = 5;
for (let attempt = 1; attempt <= maxRetries; attempt++) {
  vsixCheck = execSilent(`gh release view v${newVersion} ...`);
  if (vsixCheck && vsixCheck.includes(...)) break; // Success!
  if (attempt < maxRetries) {
    const delay = baseDelay * Math.pow(2, attempt - 1);
    // Wait 1s, 2s, 4s, 8s before retrying
  }
}
```
**Prevention:**
1. Always account for API propagation delays (1-5 seconds typical)
2. Use exponential backoff for retries (prevents API hammering)
3. Enhanced error logging shows what was expected vs received
4. Fail ONLY after all retries exhausted

### Issue: Publish script fails with "uncommitted changes" after version bump (v0.15.14)
**Status:** FIXED in publish script
**Time to Fix:** 30 minutes
**Severity:** HIGH - Script was unusable, requiring manual workarounds
**Cause:** Script checked for uncommitted changes BEFORE version bump, but then tried to commit AFTER bump, causing workflow conflicts
**Impact:**
- Running `node scripts/publish-release.js patch` would fail with "Git working directory has uncommitted changes" after bumping version
- Using `--skip-bump` flag would try to commit nothing, causing git errors
- Users had to manually commit version bumps and work around the script
**Why This Happened:**
- Step 2: Git status check rejected ANY uncommitted changes
- Step 3: Script bumped version (creating package.json changes)
- Step 9: Script tried to commit, but git check had already failed OR no changes existed with --skip-bump
**Root Cause:** Script didn't track version bump state or allow package.json changes
**Fix:** Updated publish script workflow logic
**Files:**
- `scripts/publish-release.js:190-214` - Now allows package.json changes in git status check
- `scripts/publish-release.js:222` - Tracks if script bumped version vs already bumped
- `scripts/publish-release.js:407-423` - Only commits if uncommitted changes exist
**Solution Details:**
```javascript
// BEFORE: Rejected ALL uncommitted changes
if (gitStatus && gitStatus.length > 0) {
  log('✗ Git working directory has uncommitted changes', 'red');
  process.exit(1);
}

// AFTER: Allow package.json changes (from version bump)
const uncommittedChanges = gitStatus ? gitStatus.split('\n').filter(line => {
  return line && !line.includes('package.json');
}) : [];

// BEFORE: Always tried to commit
exec('git add .');
exec(`git commit -m "chore: release v${newVersion}"`);

// AFTER: Only commit if changes exist
const finalGitStatus = execSilent('git status --porcelain');
if (finalGitStatus && finalGitStatus.trim().length > 0) {
  exec('git add .');
  exec(`git commit -m "chore: bump version to ${newVersion}"`);
} else {
  log('No uncommitted changes (version already committed)', 'blue');
}
```
**Prevention:**
1. Script now gracefully handles all version bump states (not bumped, already bumped, --skip-bump)
2. Only rejects non-package.json uncommitted changes
3. Smart commit logic only commits when necessary

### Issue: npm published but GitHub release missing (v0.13.20)
**Status:** FIXED in publish script
**Cause:** GitHub release creation was "optional" and could fail silently
**Impact:** Users got v0.13.19 .vsix even though npm showed 0.13.20
**Why Critical:** CLI installer downloads .vsix from GitHub releases, not npm
**Fix:** Made GitHub release mandatory with verification step
**Files:**
- `scripts/publish-release.js:232-297` - Now requires gh CLI auth and verifies release
- `.claude/skills/publish/SKILL.md` - Updated to document new checks
**Prevention:** Script now:
1. Fails if gh CLI not installed (not optional anymore)
2. Fails if not authenticated to GitHub
3. Verifies the .vsix exists in the release after creation
4. All checks happen BEFORE "Release Complete!" message

### Issue: Sub-packages not published, breaking user installs (v0.13.29)
**Status:** FIXED in publish script
**Time to Fix:** 2 hours
**Severity:** CRITICAL - No users could install or update to v0.13.29
**Cause:** Publish script only published main package (`vscode-lumina`), not sub-packages
**Impact:** Users saw "No matching version found for aetherlight-analyzer@^0.13.29" when trying to install
**Why This Happened:**
- Main package (`aetherlight@0.13.29`) depends on:
  - `aetherlight-analyzer@^0.13.29`
  - `aetherlight-sdk@^0.13.29`
  - `aetherlight-node@^0.13.29`
- Publish script only ran `npm publish` in `vscode-lumina` directory
- Sub-packages stayed at 0.13.28 on npm
- npm couldn't resolve dependencies → install failed
**User Experience:**
- Update notification appeared in Cursor ✅
- User clicked "Install and Reload" ✅
- `npm install -g aetherlight@latest` ran ❌ FAILED
- Extension stayed at 0.13.27 (no update)
- No error shown to user (silent failure)
**Root Cause:** Monorepo with multiple npm packages, but only publishing one
**Fix:** Updated publish script to publish ALL packages in order
**Files:**
- `scripts/publish-release.js:270-322` - Now publishes all 4 packages
- Published in order: analyzer → sdk → node → main (dependencies first)
- Verifies ALL packages after publishing
- Fails loudly if any package verification fails
**Prevention:**
1. Publish sub-packages BEFORE main package (dependency order)
2. Verify each package exists on npm at correct version
3. Don't continue if verification fails
4. Clear error messages if any package is missing

### Issue: Extension fails to activate - Cannot find module @nut-tree-fork/nut-js (v0.13.22-0.13.23)
**Status:** FIXED in v0.13.24
**Time to Fix:** 9 hours
**Severity:** CRITICAL - Extension completely non-functional for all users
**Cause:** Native dependency (@nut-tree-fork/nut-js) added to package.json that doesn't package correctly in VS Code extensions
**Impact:** Extension failed to activate on install, showing error: "Cannot find module '@nut-tree-fork/nut-js'"
**Root Cause Analysis:**
- Native Node.js modules (C++ addons via NAPI) require compilation for each platform
- VS Code extension packaging (via vsce) doesn't handle native dependencies reliably
- The dependency was used for `keyboard.type()` to simulate typing transcribed text
- Native binaries weren't included in .vsix package, causing module load failures
**Fix:** Removed native dependency and replaced with VS Code native APIs
**Files Changed:**
- `vscode-lumina/src/commands/voicePanel.ts:278-300` - Replaced keyboard.type() with VS Code APIs
- `vscode-lumina/package.json:592` - Removed @nut-tree-fork/nut-js from dependencies
**Solution Details:**
```typescript
// BEFORE (v0.13.22-0.13.23): Used native keyboard library
await keyboard.type(char); // Native C++ addon - doesn't package

// AFTER (v0.13.24): Use VS Code APIs
const editor = vscode.window.activeTextEditor;
if (editor) {
    await editor.edit(editBuilder => {
        editBuilder.insert(editor.selection.active, text);
    });
}
```
**Why This Took 9 Hours:**
1. Extension loaded fine in development (Extension Development Host) where node_modules exists
2. Only failed in packaged .vsix where native deps weren't included
3. Required testing full package → install → reload cycle to reproduce
4. Initially tried fixing packaging, but proper solution was removing the dependency
**Prevention Rules (CRITICAL - MUST FOLLOW):**
1. **NEVER add native Node.js dependencies to VS Code extensions**
   - No packages with native bindings (NAPI, node-gyp, C++ addons)
   - Common culprits: robotjs, nut-js, keyboard, mouse libraries, native audio/video
2. **Always use VS Code APIs instead:**
   - Text insertion: `editor.edit()` API
   - Terminal: `terminal.sendText()` API
   - Clipboard: `vscode.env.clipboard` API
3. **Test packaged extension before publishing:**
   ```bash
   cd vscode-lumina
   npm run compile
   vsce package
   code --install-extension aetherlight-0.13.24.vsix
   # Reload VS Code and test ALL commands
   ```
4. **Check for native dependencies before publish:**
   - Review package.json dependencies for native modules
   - Run `npm ls` and look for packages with "bindings", "node-gyp", or "prebuild"
5. **Move native functionality to separate processes if needed:**
   - Use desktop app (Tauri) for native OS features
   - Communicate via IPC, WebSocket, or HTTP
   - Keep VS Code extension pure TypeScript/JavaScript

**Red Flags - Dependencies to Avoid:**
- `@nut-tree-fork/nut-js` ❌ (keyboard/mouse automation)
- `robotjs` ❌ (desktop automation)
- `node-hid` ❌ (USB device access)
- `serialport` ❌ (serial port access)
- `usb` ❌ (USB access)
- `ffi-napi`, `ref-napi` ❌ (native library bindings)
- Any package requiring `node-gyp` to install ❌

**Safe Alternatives:**
- VS Code APIs: `vscode.window`, `vscode.workspace`, `vscode.env` ✅
- Pure JavaScript/TypeScript libraries ✅
- External processes via child_process (if necessary) ✅
- IPC to desktop app for native features ✅

---

## Design Patterns

### Pattern-UPDATE-002: VS Code Extension Update Flow
When updating the extension:
1. `npm install -g aetherlight@latest` downloads package
2. `aetherlight` CLI compiles, packages, and installs .vsix
3. VS Code reload picks up new version from extensions directory

### Pattern-PUBLISH-001: Automated Release Pipeline
All releases go through:
1. Prerequisites check (auth, git state)
2. Build and compile
3. Verify artifacts
4. User confirmation
5. Publish to npm
6. Create git tag and GitHub release

---

## Authentication

**npm Publishing:**
- Requires login as `aelor`
- Check: `npm whoami`
- Login: `npm login`

**GitHub:**
- Uses local git credentials
- GitHub CLI (`gh`) optional but recommended for releases

---

## Pre-Publish Checklist

**CRITICAL: Complete ALL steps before publishing to prevent repeat of 9-hour v0.13.23 bug**

### 1. Code Quality Checks
- [ ] Extension compiles without errors: `cd vscode-lumina && npm run compile`
- [ ] No TypeScript errors in output
- [ ] Version numbers are synced (use `node scripts/bump-version.js`)
- [ ] Git working directory is clean
- [ ] Logged in to npm as `aelor` (check: `npm whoami`)

### 2. Native Dependency Check (CRITICAL)
**This prevents the v0.13.23 bug that took 9 hours to fix**

Run these commands and verify NO native dependencies:
```bash
cd vscode-lumina
npm ls | grep -E "(node-gyp|bindings|prebuild|napi|\.node)"
```

Check package.json for red flag dependencies:
- [ ] NO `@nut-tree-fork/nut-js` or similar keyboard/mouse libraries
- [ ] NO `robotjs`, `node-hid`, `serialport`, `usb`
- [ ] NO `ffi-napi`, `ref-napi`, or native binding libraries
- [ ] NO packages requiring C++ compilation

**If ANY native deps found:** Remove them and use VS Code APIs instead

### 3. Package and Test (MANDATORY)
**Test the packaged .vsix BEFORE publishing - v0.13.23 worked in dev but failed when packaged**

```bash
cd vscode-lumina
npm run compile
vsce package
code --install-extension aetherlight-[VERSION].vsix
# Reload VS Code (Ctrl+R in Extension Host)
```

Test ALL critical commands in PACKAGED extension:
- [ ] Extension activates without errors (check Output → ÆtherLight)
- [ ] Voice panel opens (backtick key)
- [ ] Voice recording works
- [ ] Transcription inserts into editor
- [ ] Terminal commands work
- [ ] Sprint loader works (if applicable)

### 4. Publish
Only after ALL checks pass:
```bash
node scripts/publish-release.js [patch|minor|major]
```

The automated script checks most items automatically, but YOU must verify native deps manually.

---

## Questions?

- Read `PUBLISHING.md` for publishing process
- Read `UPDATE_FIX_SUMMARY.md` for update system details
- Check `.claude/commands/` for available slash commands
- Review `vscode-lumina/src/extension.ts` for architecture

---

**Remember:** Use the automated publishing script. Don't repeat the version mismatch bug.
