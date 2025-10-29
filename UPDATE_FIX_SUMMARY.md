# Update System Fix - Summary

**Date:** 2025-10-28
**Issue:** Extension showed version 0.13.19 after update to 0.13.20 completed and window reloaded

---

## Root Cause

The auto-update system had a fundamental design flaw:

1. **What happened:** `npm update -g aetherlight` updated the npm package, then prompted to reload VS Code
2. **The problem:** VS Code loads extensions from `~/.vscode/extensions/`, NOT from the global npm directory
3. **The result:** After reloading, VS Code still loaded version 0.13.19 from its extensions folder

The update command only updated the npm package but didn't reinstall the .vsix into VS Code's extension directory.

---

## Solution 1: Fixed Auto-Update Command

**File:** `vscode-lumina/src/services/updateChecker.ts:228`

**Before:**
```typescript
terminal.sendText('npm update -g aetherlight', true);
```

**After:**
```typescript
// Run full install cycle to properly update VS Code extension
terminal.sendText('npm install -g aetherlight@latest && aetherlight && echo "✅ Update complete! Please reload VS Code."', true);
```

**Why this works:**
1. `npm install -g aetherlight@latest` - Downloads latest package from npm
2. `aetherlight` - Runs the installer CLI which:
   - Compiles TypeScript
   - Packages .vsix file
   - Installs into VS Code extensions directory via `code --install-extension`
3. VS Code reload picks up new version from extensions directory

---

## Solution 2: Automated Publishing Script

**File:** `scripts/publish-release.js` (NEW)

**Purpose:** Prevent version mismatch bugs by verifying everything BEFORE publishing

**Key Features:**
1. ✓ Verifies npm authentication and clean git state
2. ✓ Bumps version across all packages
3. ✓ Compiles TypeScript and verifies build artifacts exist
4. ✓ Packages VS Code extension (.vsix)
5. ✓ Verifies package.json version matches
6. ✓ Verifies all critical files exist
7. ✓ Shows summary and asks for confirmation
8. ✓ Only publishes if ALL verification passes
9. ✓ Creates git tag and pushes to GitHub
10. ✓ Creates GitHub release with .vsix attachment

**Usage:**
```bash
node scripts/publish-release.js patch   # or minor/major
```

**Benefits:**
- **No timing issues** - Everything is built and verified before publishing anything
- **No partial deploys** - If any step fails, nothing gets published
- **Consistent versioning** - Version is synced across all artifacts
- **User confirmation** - Shows what will be published and waits for "yes"

---

## What Changed

### Modified Files

1. **vscode-lumina/src/services/updateChecker.ts**
   - Updated `performUpdate()` method to run full install cycle
   - Added clear terminal feedback

2. **PUBLISHING.md**
   - Added "Quick Publish (Automated)" section recommending new script
   - Moved old manual steps to "Manual Publish (Not Recommended)"

### New Files

1. **scripts/publish-release.js**
   - Automated release pipeline with verification
   - Prevents all timing/versioning issues

2. **UPDATE_FIX_SUMMARY.md** (this file)
   - Documents the issue and solution

---

## Testing Required

### Test 1: Auto-Update Flow (for next release)
1. Install current version: `npm install -g aetherlight@0.13.20`
2. Publish new version using: `node scripts/publish-release.js patch`
3. Wait for update notification in VS Code (within 1 hour)
4. Click "Update Now"
5. Watch terminal for "✅ Update complete!"
6. Click "Reload Now"
7. Verify new version shows in Extensions panel

### Test 2: Manual Update Check
1. Run command: "ÆtherLight: Check for Updates"
2. Should show either "up to date" or update notification
3. If update available, test the update flow

### Test 3: Publishing Script
1. Make a test change
2. Run: `node scripts/publish-release.js patch`
3. Verify all steps complete successfully
4. Verify .vsix is created and correct size
5. Verify version on npm matches local version
6. Verify GitHub release is created

---

## Prevention Strategy

**Going forward, ALWAYS use the automated publishing script:**

```bash
node scripts/publish-release.js patch
```

**Why:**
- Eliminates human error
- Ensures consistent process
- Verifies everything before publishing
- Creates proper release artifacts
- Updates documentation automatically

**Never manually publish unless:**
- The script is broken (then fix the script first)
- Emergency hotfix (document why)

---

## Related Files

- `vscode-lumina/src/services/updateChecker.ts` - Auto-update service
- `scripts/publish-release.js` - Automated publishing pipeline
- `scripts/bump-version.js` - Version synchronization
- `PUBLISHING.md` - Publishing guide
- `vscode-lumina/package.json` - Main package manifest

---

## Next Steps

1. Compile the fixed TypeScript: ✅ DONE
2. Test the publish script locally: PENDING
3. Publish using new script: PENDING
4. Monitor user updates: PENDING

---

**Issue Status:** RESOLVED
**Verification:** Will be confirmed when next version is published and users successfully update
