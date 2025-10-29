# Post-Mortem: Extension Activation Failure (v0.13.23)

**Date:** October 29, 2025
**Incident:** ÆtherLight extension failed to activate for all users
**Versions Affected:** v0.13.22, v0.13.23
**Time to Resolution:** 9 hours
**Severity:** CRITICAL (P0)

---

## Executive Summary

On October 29, 2025, versions 0.13.22 and 0.13.23 of the ÆtherLight VS Code extension were published with a critical bug that prevented the extension from activating on any user's machine. The issue was caused by a native Node.js dependency (`@nut-tree-fork/nut-js`) that was not properly packaged in the `.vsix` distribution file, resulting in a "Cannot find module" error at runtime.

The bug took 9 hours to identify and fix because:
1. Extension worked perfectly in development environment (F5 debug mode)
2. Only failed when packaged as `.vsix` and installed
3. Required full package → install → reload cycle to test each fix attempt

**Root Cause:** Native dependencies don't package correctly in VS Code extensions
**Fix:** Removed native dependency and replaced with VS Code native APIs
**Status:** Resolved in v0.13.24

---

## Timeline

### October 29, 2025

**Morning (exact time unknown)**
- Versions 0.13.22 and 0.13.23 published to npm and VS Code Marketplace
- Native dependency `@nut-tree-fork/nut-js` added to `package.json` for keyboard typing simulation

**~12:00 - 14:00** (Discovery Phase - 2 hours)
- First user reports: Extension not activating
- Error message: "Cannot find module '@nut-tree-fork/nut-js'"
- Initial assumption: Installation issue, tried various npm cache clearing

**~14:00 - 17:00** (Investigation Phase - 3 hours)
- Tested in development mode: Extension works perfectly (F5 debug)
- Tested installed .vsix: Extension fails to activate
- Realized: Works in dev because `node_modules` exists, fails in packaged .vsix
- Investigated vsce packaging options for native dependencies

**~17:00 - 19:00** (Failed Fix Attempts - 2 hours)
- Attempted fix #1: Add native dependency to `.vscodeignore` (didn't help)
- Attempted fix #2: Try different packaging options for vsce (no improvement)
- Attempted fix #3: Research bundling native modules with webpack (too complex)

**~19:00 - 21:00** (Solution & Deployment - 2 hours)
- Realized correct solution: Remove native dependency entirely
- Replaced `keyboard.type()` with VS Code native APIs:
  - `editor.edit()` for text insertion
  - `terminal.sendText()` for terminal input
  - `vscode.env.clipboard` as fallback
- Published v0.13.24 with fix
- Verified fix works in packaged extension

**Total Time:** ~9 hours from first publish to fix deployed

---

## Root Cause Analysis

### What Happened

The extension included a native Node.js module (`@nut-tree-fork/nut-js`) in its dependencies. This module contains C++ code (NAPI bindings) that must be compiled for each platform (Windows, macOS, Linux).

When VS Code extensions are packaged using `vsce package`:
1. It bundles JavaScript files from `node_modules`
2. It does NOT properly bundle platform-specific native binaries
3. The `.vsix` file is missing the compiled `.node` files
4. At runtime, Node.js can't find the native module → extension crashes

### Why It Wasn't Caught Earlier

**Development Environment (F5 Debug Mode):**
- Extension runs directly from source directory
- Full `node_modules` directory is present with all native binaries
- Everything works perfectly ✅

**Packaged Extension (.vsix Install):**
- Extension runs from compressed `.vsix` in VS Code extensions directory
- Native binaries missing from package ❌
- Fails immediately on `require('@nut-tree-fork/nut-js')`

**Key Learning:** Development and production environments are fundamentally different for VS Code extensions. Native dependencies that work in development WILL fail in production.

### The 5 Whys

1. **Why did the extension fail to activate?**
   - Because it couldn't load the `@nut-tree-fork/nut-js` module

2. **Why couldn't it load the module?**
   - Because the native binary files (.node) weren't included in the .vsix package

3. **Why weren't the native files included?**
   - Because vsce doesn't properly handle native dependencies during packaging

4. **Why was a native dependency used?**
   - To simulate keyboard typing for transcribed voice text (keyboard.type() function)

5. **Why didn't we use VS Code APIs instead?**
   - Lack of awareness that VS Code provides built-in text insertion APIs (editor.edit())

**Root Root Cause:** Knowledge gap about VS Code extension packaging limitations and available VS Code APIs

---

## Impact Assessment

### User Impact
- **Affected Users:** 100% of users who installed v0.13.22 or v0.13.23
- **Severity:** Extension completely non-functional
- **Duration:** ~9 hours from publish to fix
- **User Actions Required:** Update to v0.13.24 (automatic if auto-update enabled)

### Business Impact
- Loss of user trust
- Potential negative reviews on VS Code Marketplace
- Developer time: 9 hours of urgent debugging
- Emergency release required (v0.13.24)

### Technical Debt Created
- None (fix was clean removal, not a workaround)

---

## What Went Wrong

### Process Failures

1. **No Pre-Publish Testing of Packaged Extension**
   - Testing only done in development environment (F5 debug)
   - Packaged .vsix never tested before publish
   - **Should have:** Test installed .vsix on clean system

2. **No Dependency Review Process**
   - Native dependency added without considering packaging implications
   - No checklist for reviewing new dependencies
   - **Should have:** Dependency review checklist checking for native modules

3. **Insufficient Documentation**
   - No written guidelines about native dependencies in extensions
   - No warnings in project documentation
   - **Should have:** Clear guidelines in .claude/CLAUDE.md

### Technical Decisions

1. **Wrong Tool for the Job**
   - Used native keyboard library for text insertion
   - VS Code provides native APIs for this exact use case
   - **Should have:** Research VS Code APIs first before adding dependencies

2. **Didn't Consider Packaging Constraints**
   - VS Code extensions have unique packaging requirements
   - Native modules are explicitly problematic in this ecosystem
   - **Should have:** Understand extension packaging model

---

## What Went Right

### Quick Detection
- Users reported issue immediately after publish
- Clear error message made root cause identifiable

### Clean Solution
- Found proper VS Code API alternative
- No technical debt or workarounds needed
- Solution is more reliable than original approach

### Good Version Control
- Git history made it easy to identify when dependency was added
- Could quickly trace change through commits

---

## Action Items

### Immediate (Completed)

- [x] Remove `@nut-tree-fork/nut-js` dependency (v0.13.24)
- [x] Replace with VS Code native APIs
- [x] Test packaged extension before publish
- [x] Document issue in Known Issues section

### Short-term (In Progress)

- [x] Create comprehensive documentation in `.claude/CLAUDE.md`
- [x] Add pre-publish checklist for native dependencies
- [x] Add automated check to `publish-release.js` script
- [x] Write this post-mortem document

### Long-term (Planned)

- [ ] Create automated CI/CD pipeline that:
  - Packages extension
  - Installs in clean VS Code instance
  - Runs activation tests
  - Blocks publish if activation fails
- [ ] Add unit tests for all command handlers
- [ ] Create integration test suite that tests packaged extension

---

## Lessons Learned

### Technical Lessons

1. **Never use native dependencies in VS Code extensions**
   - They don't package correctly
   - VS Code APIs cover most use cases
   - Move native functionality to separate process if truly needed

2. **Development ≠ Production for extensions**
   - Always test packaged .vsix before publish
   - Can't rely on F5 debug mode alone
   - Need production-like testing environment

3. **VS Code API is comprehensive**
   - Text editing: `editor.edit()`
   - Terminal: `terminal.sendText()`
   - Clipboard: `vscode.env.clipboard`
   - Usually no need for external libraries

### Process Lessons

1. **Pre-publish testing is mandatory**
   - Must test packaged extension, not just dev mode
   - Need checklist to ensure all tests run
   - Automated testing would prevent this entirely

2. **Dependency reviews matter**
   - Review all new dependencies before adding
   - Check for native modules, large bundles, security issues
   - Document why each dependency is needed

3. **Documentation prevents incidents**
   - Clear guidelines about what NOT to do
   - List of known problematic patterns
   - Makes onboarding and AI assistants more effective

### Human Factors

1. **Time pressure leads to shortcuts**
   - Likely skipped packaging test to save time
   - Would have caught issue immediately
   - Lesson: Never skip critical tests, even under pressure

2. **Assumptions are dangerous**
   - Assumed dependency would work because it worked in dev
   - Didn't verify packaging implications
   - Lesson: Verify assumptions, especially in new territory

---

## Prevention Measures Implemented

### 1. Documentation (`.claude/CLAUDE.md`)

Added comprehensive "Known Issues" section documenting:
- The bug and its symptoms
- Root cause analysis
- Prevention rules (what NOT to do)
- List of problematic dependencies to avoid
- Safe alternatives using VS Code APIs

### 2. Pre-Publish Checklist

Created mandatory checklist in `.claude/CLAUDE.md`:
- Native dependency check
- Package and test .vsix before publish
- Test all critical commands in packaged extension
- Verify activation succeeds

### 3. Automated Checks (`scripts/publish-release.js`)

Added Step 4.5 to publish script:
- Scans `package.json` for known native dependencies
- Blocks publish if any found
- Runs `npm ls` to check dependency tree
- Warns if native indicators detected
- Requires explicit confirmation to proceed

### 4. Updated Publishing Workflow

Modified standard publishing process:
1. Compile TypeScript
2. **Check for native dependencies (NEW)**
3. Package extension
4. **Install and test .vsix (NEW)**
5. Publish to npm
6. Create GitHub release

---

## Metrics

### Time Breakdown
- Discovery: 2 hours (22%)
- Investigation: 3 hours (33%)
- Failed fixes: 2 hours (22%)
- Solution & deploy: 2 hours (22%)
- **Total: 9 hours**

### Cost
- Developer time: 9 hours @ senior eng rate
- User impact: ~100% of user base for 9 hours
- Reputation impact: Not quantified

### Success Metrics (Future)
- Time to detection: < 1 hour (automated monitoring)
- Time to fix: < 2 hours (better processes)
- Prevention rate: 100% (automated checks)

---

## Related Documents

- `.claude/CLAUDE.md` - Project instructions with prevention guidelines
- `scripts/publish-release.js` - Automated publish script with checks
- `vscode-lumina/src/commands/voicePanel.ts:278-300` - Fixed code
- Git commits:
  - `6ef9a6c` - Remove nut-js dependency (first fix attempt)
  - `6abcae4` - Remove native dependency (final fix)

---

## Sign-off

**Incident Commander:** Brett Blackman
**Date:** October 29, 2025
**Status:** RESOLVED
**Follow-up Review:** December 2025 (verify prevention measures working)

---

## Appendix: Code Comparison

### Before (v0.13.22-0.13.23)
```typescript
import { keyboard } from '@nut-tree-fork/nut-js';

private async simulateTyping(text: string, delayMs: number = 50): Promise<void> {
    const chars = Array.from(text);
    for (const char of chars) {
        try {
            await keyboard.type(char); // Native C++ module
            await new Promise(resolve => setTimeout(resolve, delayMs));
        } catch (error) {
            console.error(`Failed to type character '${char}':`, error);
        }
    }
}
```

**Problem:** `keyboard.type()` requires native C++ bindings that don't package in .vsix

### After (v0.13.24)
```typescript
// No import needed - uses VS Code APIs

private async simulateTyping(text: string, delayMs: number = 50): Promise<void> {
    // Try to insert in active text editor first
    const editor = vscode.window.activeTextEditor;
    if (editor) {
        await editor.edit(editBuilder => {
            editBuilder.insert(editor.selection.active, text);
        });
        return;
    }

    // Try to send to active terminal
    const terminal = vscode.window.activeTerminal;
    if (terminal) {
        terminal.sendText(text, false);
        return;
    }

    // Fallback: Copy to clipboard
    await vscode.env.clipboard.writeText(text);
    vscode.window.showInformationMessage('Transcription copied to clipboard');
}
```

**Solution:** Pure TypeScript using VS Code's built-in APIs - packages perfectly

---

**End of Post-Mortem**
