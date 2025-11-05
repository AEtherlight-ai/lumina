# Pre-Publish Verification: v0.16.1
## Comprehensive Clean Build Audit

**Date:** 2025-11-04
**Target Version:** 0.16.1
**Release Type:** Patch Release (Bug Fixes)

---

## Executive Summary

**Purpose:** Verify all components clean and ready before publishing v0.16.1 to npm + GitHub

**Key Changes:**
- ✅ Fixed 61 TypeScript compilation errors (all type signature mismatches)
- ✅ Fixed SprintTask interface missing properties
- ✅ Fixed test file constructor signatures
- ✅ Code now compiles cleanly with 0 errors

**Status:** ⏳ IN PROGRESS - Verification underway

---

## Version Consistency Check

**Main Extension:**
- Version: 0.16.1 ✅
- Package: aetherlight
- Publisher: aetherlight
- Repository: https://github.com/AEtherlight-ai/lumina

**Sub-Packages:**
| Package | Version | Status |
|---------|---------|--------|
| aetherlight-analyzer | 1.0.0 | ✅ Independent versioning |
| aetherlight-node | 0.1.0 | ✅ Independent versioning |
| aetherlight-sdk | 0.1.0 | ✅ Independent versioning |

**Note:** Sub-packages don't need to match main extension version (Pattern-PUBLISH-001)

---

## Uncommitted Changes Review

**Modified Files:** 30 files
**Status:** ⏳ Need to review and commit

**TypeScript Fixes (5 files):**
- `vscode-lumina/src/commands/SprintLoader.ts` - Added missing SprintTask properties
- `vscode-lumina/src/test/integration/middleware.test.ts` - Fixed constructor signatures
- `vscode-lumina/src/test/integration/workflows.test.ts` - Fixed constructor signatures + config calls
- `vscode-lumina/src/test/performance/benchmarks.test.ts` - Fixed constructor signatures + ErrorHandler calls
- `vscode-lumina/src/realtime_sync/__tests__/client.test.ts` - Removed invalid timeout parameter

**Other Modified Files (25 files):**
```
 M .claude/settings.local.json
 M .gitignore
 M packages/aetherlight-analyzer/README.md
 M packages/aetherlight-analyzer/package.json
 M packages/aetherlight-analyzer/src/analyzers/technical-debt-analyzer.test.ts
 M packages/aetherlight-analyzer/src/cli/index.ts
 M packages/aetherlight-analyzer/src/generators/pattern-extractor.ts
 M packages/aetherlight-analyzer/src/index.ts
 M packages/aetherlight-node/README.md
 M packages/aetherlight-node/package.json
 M packages/aetherlight-sdk/README.md
 M packages/aetherlight-sdk/package.json
 M packages/aetherlight-sdk/tsconfig.json
 M vscode-lumina/.vscodeignore
 M vscode-lumina/NPM_README.md
 M vscode-lumina/README.md
 M vscode-lumina/bin/aetherlight.js
 M vscode-lumina/package.json
 M vscode-lumina/src/commands/TabManager.ts
 M vscode-lumina/src/commands/analyzeWorkspace.ts
 M vscode-lumina/src/commands/voicePanel.ts
 M vscode-lumina/src/extension.ts
 M vscode-lumina/src/sprint_progress_panel/SprintProgressPanel.ts
 M vscode-lumina/src/test/runTest.ts
 M vscode-lumina/tsconfig.json
```

**Action Required:** Review each file to determine if changes belong to v0.16.1 or should be reverted

---

## Analyzer Tarball Verification

**Tarball Location:** `packages/aetherlight-analyzer/aetherlight-analyzer-1.0.0.tgz`
**Status:** ⏳ Need to verify

**Checks:**
- [ ] File exists
- [ ] File size reasonable (not corrupted)
- [ ] Created date matches recent build
- [ ] Referenced correctly in vscode-lumina/package.json

**Current Reference:**
```json
{
  "dependencies": {
    "@aetherlight/analyzer": "file:../packages/aetherlight-analyzer/aetherlight-analyzer-1.0.0.tgz"
  },
  "bundledDependencies": [
    "@aetherlight/analyzer"
  ]
}
```

---

## Native Dependency Check (CRITICAL)

**Pattern-PUBLISH-003 Enforcement**

**Why Critical:** v0.13.23 incident - 9 hours debugging native dependency failure

**Command:**
```bash
cd vscode-lumina
npm ls | grep -E "(node-gyp|bindings|prebuild|napi|\.node)"
```

**Expected:** No matches (clean)

**Forbidden Dependencies:**
- ❌ `@nut-tree-fork/nut-js` (native keyboard/mouse)
- ❌ `robotjs` (desktop automation)
- ❌ `node-hid` (USB devices)
- ❌ `serialport` (serial ports)
- ❌ Any package requiring C++ compilation

**Status:** ⏳ Need to verify

---

## Runtime npm Dependency Check (CRITICAL)

**Pattern-PUBLISH-003 Enforcement**

**Why Critical:** v0.15.31-0.15.32 incident - 2 hours debugging `glob` exclusion

**Current Dependencies (from package.json):**
```json
{
  "dependencies": {
    "@aetherlight/analyzer": "file:../packages/aetherlight-analyzer/aetherlight-analyzer-1.0.0.tgz",
    "@iarna/toml": "^2.2.5",
    "@nut-tree-fork/nut-js": "^4.2.6",
    "form-data": "^4.0.4",
    "node-fetch": "^2.7.0",
    "ws": "^8.14.0"
  }
}
```

**Whitelist (Allowed):**
- ✅ `@aetherlight/analyzer` (sub-package)
- ✅ `@iarna/toml` (TOML parser)
- ✅ `form-data` (HTTP multipart)
- ✅ `node-fetch` (HTTP client)
- ✅ `ws` (WebSocket)

**⚠️ VIOLATION DETECTED:**
- ❌ `@nut-tree-fork/nut-js` - **FORBIDDEN NATIVE DEPENDENCY**

**Status:** ❌ **BLOCKER** - Must remove `@nut-tree-fork/nut-js` before publishing

**History:** This was already fixed in v0.13.24 but somehow returned in package.json

**Action Required:** Remove from package.json immediately

---

## Git Repository URL Verification

**Main Extension (vscode-lumina/package.json):**
```json
{
  "repository": {
    "type": "git",
    "url": "https://github.com/AEtherlight-ai/lumina"
  }
}
```

**Status:** ✅ Correct

---

## VSIX Package Status

**File:** `vscode-lumina/aetherlight-0.16.1.vsix`
- **Exists:** Yes
- **Size:** 14MB
- **Modified:** 2025-11-04 11:17
- **Status:** ⚠️ **STALE** - Built before TypeScript fixes (11:17 vs current time 12:00+)

**Action Required:** Delete and rebuild after committing TypeScript fixes

---

## Clean Build Plan

### Step 1: Fix Native Dependency Violation
```bash
cd vscode-lumina
# Remove @nut-tree-fork/nut-js from package.json dependencies
```

**Verification:** Check if code still uses this dependency (should be removed already per v0.13.24 fix)

### Step 2: Commit All TypeScript Fixes
```bash
git add vscode-lumina/src/commands/SprintLoader.ts
git add vscode-lumina/src/test/integration/middleware.test.ts
git add vscode-lumina/src/test/integration/workflows.test.ts
git add vscode-lumina/src/test/performance/benchmarks.test.ts
git add vscode-lumina/src/realtime_sync/__tests__/client.test.ts
git commit -m "fix(types): fix 61 TypeScript compilation errors for v0.16.1

- Add missing SprintTask interface properties (why, context, reasoning_chain, pattern_context, success_impact)
- Fix ConfigurationManager/CacheManager constructor signatures (require logger parameter)
- Fix ErrorHandlerOptions (change service → operationName, remove requestId)
- Fix ErrorHandler.handle() calls (first param must be function, not Error object)
- Fix config.set() calls (add required whisperEndpoint, timeout, maxRetries)
- Fix CacheManager.invalidatePattern() (string pattern, not RegExp)
- Fix test() timeout parameter (remove invalid third parameter)

All test files now compile cleanly with 0 errors.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

### Step 3: Review Other Modified Files
Review remaining 25 modified files to determine:
- Belong to v0.16.1? → Commit with appropriate message
- Unrelated changes? → Stash or revert
- Configuration changes? → Review if should be committed

### Step 4: Clean Build
```bash
cd vscode-lumina

# Clean previous build
rm -rf out/
rm -f aetherlight-*.vsix

# Compile TypeScript
npm run compile

# Verify 0 errors
# Expected: Clean compilation

# Run tests (optional but recommended)
npm test

# Package extension
vsce package

# Expected: aetherlight-0.16.1.vsix created (clean build)
```

### Step 5: Test Packaged Extension (MANDATORY)
```bash
code --install-extension aetherlight-0.16.1.vsix
# Reload VS Code
# Test ALL critical commands:
# - Extension activates
# - Voice panel opens
# - Sprint tab works
```

### Step 6: Execute Automated Publish
```bash
# From repository root
node scripts/publish-release.js patch

# This script will:
# 1. Verify prerequisites
# 2. Check native dependencies
# 3. Build and compile
# 4. Create GitHub release
# 5. Publish to npm
# 6. Verify everything worked
```

---

## Publishing Enforcement (Pattern-PUBLISH-002)

**⛔ FORBIDDEN OPERATIONS:**
- ❌ `npm publish` (manual)
- ❌ `vsce publish` (manual)
- ❌ `gh release create` (manual)
- ❌ `npm version` (manual)

**✅ REQUIRED OPERATION:**
- ✅ `node scripts/publish-release.js [patch|minor|major]`

**Why:** Manual publishing breaks version sync, causes GitHub Actions failures, prevents user installation

**Historical Incidents:**
- v0.13.20: Manual publish → GitHub release missing → Users couldn't install
- v0.13.23: Native dependency → Extension broken for 9 hours
- v0.13.29: Sub-packages not published → Install failure for 2 hours
- v0.15.11: Wrong publish order → GitHub Actions failed

---

## Blockers Summary

### ❌ BLOCKERS (Must Fix Before Publishing)

1. **Native Dependency Violation**
   - Issue: `@nut-tree-fork/nut-js` in package.json dependencies
   - Fix: Remove from package.json (should be gone per v0.13.24)
   - Verification: Check if code still references it

### ⚠️ WARNINGS (Should Fix)

1. **Uncommitted Changes**
   - Issue: 30 modified files not committed
   - Fix: Review and commit TypeScript fixes
   - Impact: Can't publish without committing

2. **Stale VSIX Package**
   - Issue: Built before TypeScript fixes
   - Fix: Rebuild after committing changes
   - Impact: Old bugs in packaged extension

### ✅ CLEAN

1. **TypeScript Compilation** - 0 errors
2. **Version Numbers** - 0.16.1 correct
3. **Git Repository URL** - Correct
4. **Analyzer Tarball** - Exists (needs verification)

---

## Next Steps

1. **Remove Native Dependency** (@nut-tree-fork/nut-js)
2. **Commit TypeScript Fixes** (5 files)
3. **Review Other Modified Files** (25 files)
4. **Clean Build** (delete old VSIX, rebuild)
5. **Test Packaged Extension** (install .vsix, verify works)
6. **Execute Automated Publish** (`node scripts/publish-release.js patch`)

---

## Approval Checklist

Before running automated publish script:

- [ ] ❌ Native dependency removed
- [ ] ⏳ TypeScript fixes committed
- [ ] ⏳ All changes committed or stashed
- [ ] ⏳ Clean build completed (0 errors)
- [ ] ⏳ VSIX package tested and working
- [ ] ⏳ No uncommitted changes in git
- [ ] ✅ Logged in to npm as `aelor`
- [ ] ⏳ GitHub CLI authenticated (`gh auth status`)

**Ready to Publish:** ❌ NO - Blockers must be resolved

---

**Last Updated:** 2025-11-04 12:00
**Status:** ⏳ VERIFICATION IN PROGRESS
**Next Step:** Fix native dependency blocker
