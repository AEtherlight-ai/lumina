# MANUAL_TEST_PROTECT-002: Pre-Commit Protection Enforcement

**Task:** PROTECT-002 - Build pre-commit protection enforcement
**Version:** v0.16.7
**Date:** 2025-11-07
**Agent:** infrastructure-agent
**Pattern:** Pattern-CODE-PROTECTION-001, Pattern-GIT-001

---

## Purpose

Verify that the pre-commit hook correctly enforces protection on @protected files and blocks unauthorized changes.

**Prevention Value:** 13+ hours of historical debugging:
- v0.13.23: 9 hours (native dependency break)
- v0.15.31-32: 2 hours (runtime dependency break)
- 2025-11-03: 2 hours (TOML format break)

---

## Prerequisites

1. ✅ PROTECT-001 completed (5 files annotated with @protected)
2. ✅ `scripts/validate-protection.js` script created
3. ✅ `.git/hooks/pre-commit` hook updated with protection enforcement
4. ✅ Git repository initialized

---

## Test Section 1: Protected File Modification Detection

### Test 1.1: Modify @protected file triggers prompt

**Steps:**
1. Edit `vscode-lumina/src/extension.ts` (add a comment)
2. Stage the file: `git add vscode-lumina/src/extension.ts`
3. Attempt commit: `git commit -m "test: modify protected file"`
4. Observe prompt: "WARNING: You are modifying protected code..."

**Expected Result:**
- ✅ Prompt appears listing the protected file(s)
- ✅ Prompt asks for approval (y/n)

**Actual Result:** ___________

**Status:** ⬜ PASS | ⬜ FAIL

---

### Test 1.2: Answer 'no' blocks commit

**Steps:**
1. Continue from Test 1.1
2. When prompted, answer: `n` (no)
3. Check git status: `git status`

**Expected Result:**
- ✅ Commit blocked (exit code 1)
- ✅ Message: "Commit aborted by user"
- ✅ Changes remain staged (not committed)
- ✅ Git log unchanged

**Actual Result:** ___________

**Status:** ⬜ PASS | ⬜ FAIL

---

### Test 1.3: Answer 'yes' allows commit with PROTECTED: prefix

**Steps:**
1. Attempt commit again: `git commit -m "test: modify protected file"`
2. When prompted, answer: `y` (yes)
3. Check git log: `git log --oneline -1`

**Expected Result:**
- ✅ Commit succeeds
- ✅ Commit message prefixed with `PROTECTED: `
- ✅ Full message: "PROTECTED: test: modify protected file"
- ✅ Audit trail established in git log

**Actual Result:** ___________

**Status:** ⬜ PASS | ⬜ FAIL

---

## Test Section 2: Non-Protected File Modification (No Prompt)

### Test 2.1: Modify non-protected file bypasses prompt

**Steps:**
1. Create a test file: `echo "test" > test-file.txt`
2. Stage the file: `git add test-file.txt`
3. Commit: `git commit -m "test: add non-protected file"`
4. Observe no prompt shown

**Expected Result:**
- ✅ No prompt displayed
- ✅ Commit succeeds immediately
- ✅ Message unchanged: "test: add non-protected file"
- ✅ No PROTECTED: prefix added

**Actual Result:** ___________

**Status:** ⬜ PASS | ⬜ FAIL

---

### Test 2.2: Modify multiple files (mixed protected and non-protected)

**Steps:**
1. Edit `vscode-lumina/src/extension.ts` (protected)
2. Edit `test-file.txt` (non-protected)
3. Stage both: `git add .`
4. Commit: `git commit -m "test: mixed changes"`
5. When prompted, answer: `y`

**Expected Result:**
- ✅ Prompt shown (because extension.ts is protected)
- ✅ Prompt lists only protected file(s)
- ✅ After approval, commit succeeds with PROTECTED: prefix
- ✅ Both files committed

**Actual Result:** ___________

**Status:** ⬜ PASS | ⬜ FAIL

---

## Test Section 3: CI Mode (Non-Interactive)

### Test 3.1: CI mode bypasses prompts

**Steps:**
1. Set environment variable: `export SKIP_PROTECTION_CHECK=true` (Linux/Mac) or `set SKIP_PROTECTION_CHECK=true` (Windows)
2. Edit `vscode-lumina/src/SprintLoader.ts` (protected)
3. Stage: `git add vscode-lumina/src/SprintLoader.ts`
4. Commit: `git commit -m "test: ci mode commit"`
5. Observe no prompt shown

**Expected Result:**
- ✅ No prompt displayed (CI mode active)
- ✅ Commit succeeds immediately
- ✅ Message unchanged (no PROTECTED: prefix in CI mode)
- ✅ Warning logged: "CI mode: Skipping protection check"

**Actual Result:** ___________

**Status:** ⬜ PASS | ⬜ FAIL

---

### Test 3.2: CI mode validation (unset variable)

**Steps:**
1. Unset environment variable: `unset SKIP_PROTECTION_CHECK` (Linux/Mac) or `set SKIP_PROTECTION_CHECK=` (Windows)
2. Edit `vscode-lumina/src/AutoTerminalSelector.ts` (protected)
3. Stage: `git add vscode-lumina/src/AutoTerminalSelector.ts`
4. Commit: `git commit -m "test: after ci mode"`
5. Observe prompt returns

**Expected Result:**
- ✅ Prompt displayed (CI mode disabled)
- ✅ Protection enforcement active again
- ✅ User approval required

**Actual Result:** ___________

**Status:** ⬜ PASS | ⬜ FAIL

---

## Test Section 4: Performance

### Test 4.1: Protection check completes < 200ms

**Steps:**
1. Edit all 5 protected files (extension.ts, SprintLoader.ts, AutoTerminalSelector.ts, TaskDependencyValidator.ts, voicePanel.ts)
2. Stage all: `git add vscode-lumina/src/`
3. Time the commit: `time git commit -m "test: performance check"`
4. Answer `n` to abort commit
5. Measure time taken for protection check

**Expected Result:**
- ✅ Protection check completes < 200ms
- ✅ All 5 protected files detected
- ✅ Prompt shown listing all files

**Actual Result:** ___________ ms

**Status:** ⬜ PASS | ⬜ FAIL

---

## Test Section 5: Audit Trail

### Test 5.1: Git log shows PROTECTED: commits

**Steps:**
1. Review git log: `git log --all --oneline --grep="PROTECTED:"`
2. Verify all approved protected changes have PROTECTED: prefix

**Expected Result:**
- ✅ All approved protected commits visible in log
- ✅ Each has PROTECTED: prefix
- ✅ Audit trail complete and searchable

**Actual Result:** ___________

**Status:** ⬜ PASS | ⬜ FAIL

---

### Test 5.2: Rejected commits not in git log

**Steps:**
1. Verify git log after Test 1.2 (rejected commit)
2. Ensure rejected commit NOT in git log

**Expected Result:**
- ✅ Rejected commit not recorded
- ✅ Only approved commits in log
- ✅ No partial/incomplete commits

**Actual Result:** ___________

**Status:** ⬜ PASS | ⬜ FAIL

---

## Test Section 6: Edge Cases

### Test 6.1: No staged files

**Steps:**
1. Ensure no staged changes: `git status`
2. Attempt commit: `git commit -m "test: no changes"`

**Expected Result:**
- ✅ Git's default behavior (no protection check needed)
- ✅ Message: "nothing to commit, working tree clean"

**Actual Result:** ___________

**Status:** ⬜ PASS | ⬜ FAIL

---

### Test 6.2: Invalid annotation format (missing @protected)

**Steps:**
1. Create a test file with malformed annotation
2. Update CODE_PROTECTION_POLICY.md to include this file
3. Edit the file and commit
4. Observe protection check behavior

**Expected Result:**
- ✅ Script handles missing annotations gracefully
- ✅ File not treated as protected (no prompt)
- ✅ OR: Warning shown about missing annotation

**Actual Result:** ___________

**Status:** ⬜ PASS | ⬜ FAIL

---

## Summary

**Total Tests:** 13
**Passing:** _____ / 13
**Failing:** _____ / 13

**Critical Scenarios (Must Pass):**
- ✅ Test 1.1: Protected file triggers prompt
- ✅ Test 1.2: 'no' answer blocks commit
- ✅ Test 1.3: 'yes' answer allows commit with PROTECTED: prefix
- ✅ Test 2.1: Non-protected file bypasses prompt
- ✅ Test 3.1: CI mode works without prompts
- ✅ Test 4.1: Performance < 200ms

**Protection System Status:**
- ⬜ Ready for production
- ⬜ Needs fixes

---

## Notes

Record any observations, issues, or unexpected behavior here:

_______________________________________________
