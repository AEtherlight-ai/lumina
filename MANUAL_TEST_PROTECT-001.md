# Manual Test Plan: PROTECT-001 - Code Protection Annotations

**Task:** PROTECT-001 (Phase 1 - Stabilization)
**Test Date:** 2025-11-07
**Version:** v0.16.7+
**Tester:** _____________

## Purpose

Verify that @protected annotations are correctly applied to passing code and documented in CODE_PROTECTION_POLICY.md.

---

## Pre-Test Setup

1. ✅ Compile extension: `cd vscode-lumina && npm run compile`
2. ✅ Package extension: `vsce package`
3. ✅ Install in VS Code: Extensions → Install from VSIX
4. ✅ Restart VS Code

---

## Test 1: Annotation Existence

Verify all 5 files have @protected annotations in their headers:

### 1.1 extension.ts
- [ ] Open `vscode-lumina/src/extension.ts`
- [ ] Verify file header contains `@protected`
- [ ] Verify includes lock date: `Locked: 2025-11-07`
- [ ] Verify includes test reference: `Tests: Core Extension activation, command registration`

**Expected:** Annotation present with all required fields

### 1.2 SprintLoader.ts
- [ ] Open `vscode-lumina/src/commands/SprintLoader.ts`
- [ ] Verify file header contains `@protected`
- [ ] Verify includes lock date: `Locked: 2025-11-07`
- [ ] Verify includes test reference: `Tests: TOML parsing with rich fields`

**Expected:** Annotation present with all required fields

### 1.3 AutoTerminalSelector.ts
- [ ] Open `vscode-lumina/src/commands/AutoTerminalSelector.ts`
- [ ] Verify file header contains `@protected`
- [ ] Verify includes lock date: `Locked: 2025-11-07`
- [ ] Verify includes test reference: `Tests: Terminal list/dropdown logic`

**Expected:** Annotation present with all required fields

### 1.4 TaskDependencyValidator.ts
- [ ] Open `vscode-lumina/src/services/TaskDependencyValidator.ts`
- [ ] Verify file header contains `@protected`
- [ ] Verify includes lock date: `Locked: 2025-11-07`
- [ ] Verify includes test reference: `Tests: Dependency blocking functionality`

**Expected:** Annotation present with all required fields

### 1.5 voicePanel.ts
- [ ] Open `vscode-lumina/src/commands/voicePanel.ts`
- [ ] Verify file header contains `@protected - Partial protection`
- [ ] Verify includes lock date: `Locked: 2025-11-07`
- [ ] Verify lists protected sections (terminal list, sprint dropdown, refresh button, skills, settings)

**Expected:** Annotation present with partial protection note

---

## Test 2: CODE_PROTECTION_POLICY.md Documentation

### 2.1 File Existence
- [ ] Open `CODE_PROTECTION_POLICY.md`
- [ ] Verify file exists at project root

**Expected:** File exists

### 2.2 Status Banner
- [ ] Check for `✅ ACTIVE` status
- [ ] Check for lock date: `2025-11-07`
- [ ] Check for `PROTECT-001 stabilization` reference

**Expected:** Active status with correct metadata

### 2.3 Protected Files List
- [ ] Verify section "## Protected Files (v0.16.7 Lock-down)" exists
- [ ] Verify all 5 files are listed:
  - [ ] `vscode-lumina/src/extension.ts`
  - [ ] `vscode-lumina/src/commands/SprintLoader.ts`
  - [ ] `vscode-lumina/src/commands/AutoTerminalSelector.ts`
  - [ ] `vscode-lumina/src/services/TaskDependencyValidator.ts`
  - [ ] `vscode-lumina/src/commands/voicePanel.ts`

**Expected:** All files documented with lock dates and test references

### 2.4 Total Count
- [ ] Check documentation states: "**Total:** 5 files locked with @protected annotations"

**Expected:** Correct count

---

## Test 3: Functional Verification

Verify protected features still work correctly:

### 3.1 Extension Activation
- [ ] Press `` ` `` (backtick) to open voice panel
- [ ] Verify panel opens without errors
- [ ] Check VS Code console for activation errors

**Expected:** Extension activates, voice panel opens

### 3.2 Sprint Loading
- [ ] Open voice panel Sprint section
- [ ] Verify ACTIVE_SPRINT.toml loads
- [ ] Check that tasks display with full metadata
- [ ] Verify no TOML parsing errors

**Expected:** Sprint loads correctly with rich fields

### 3.3 Terminal Selection
- [ ] Create 2 terminals
- [ ] Open voice panel
- [ ] Verify terminal dropdown shows both terminals
- [ ] Select each terminal from dropdown

**Expected:** Terminal list populates correctly

### 3.4 Dependency Blocking
- [ ] Find a task with dependencies in sprint panel
- [ ] Try to start task with unmet dependencies
- [ ] Verify blocking message appears

**Expected:** Dependency validation works (BRILLIANT!)

### 3.5 Voice Panel Core Features
- [ ] Sprint dropdown works
- [ ] Sprint refresh button works
- [ ] Skills browser opens
- [ ] Settings UI opens

**Expected:** All protected sections function correctly

---

## Test 4: Historical Bug Prevention

Verify protection annotations prevent known issues:

### 4.1 v0.13.23 Prevention
- [ ] Check package.json has no native dependencies (robot js, nut-tree-fork)
- [ ] Verify no new native dependencies added

**Expected:** No native dependencies (9-hour bug prevented)

### 4.2 v0.15.31-32 Prevention
- [ ] Check no runtime npm dependencies added (glob, lodash, etc.)
- [ ] Verify dependencies are dev-only or whitelisted

**Expected:** No forbidden runtime dependencies (2-hour bug prevented)

---

## Test 5: Documentation Completeness

### 5.1 Enforcement Mechanisms Section
- [ ] Verify `## Enforcement Mechanisms` section exists
- [ ] Check `Status: ✅ ACTIVE (PROTECT-002 complete - 2025-11-07)` is present
- [ ] Verify pre-commit hook is documented
- [ ] Verify validate-protection.js script is documented

**Expected:** Enforcement mechanisms documented

### 5.2 Override Process Section
- [ ] Verify `## Override Process` section exists
- [ ] Check 3-step approval workflow documented
- [ ] Verify example override commit message provided

**Expected:** Override process clear and actionable

### 5.3 Audit Trail Section
- [ ] Verify `## Audit Trail` section exists
- [ ] Check git log commands provided
- [ ] Verify verification commands listed

**Expected:** Audit trail commands work

---

## Test Results Summary

**Total Tests:** ___ / ___
**Passed:** ___
**Failed:** ___
**Blocked:** ___

**Critical Failures:**
- [ ] None

**Non-Critical Issues:**
_List any issues that don't block release_

---

## Acceptance Criteria

- [ ] All 5 files have @protected annotations with required fields
- [ ] CODE_PROTECTION_POLICY.md lists all protected files
- [ ] Protected features function correctly (Tests 3.1-3.5 pass)
- [ ] Historical bugs are prevented (Tests 4.1-4.2 pass)
- [ ] Documentation is complete (Tests 5.1-5.3 pass)

**PROTECT-001 Status:** ☐ PASS | ☐ FAIL | ☐ PARTIAL

**Notes:**
_Add any additional observations or issues_

---

## Sign-Off

**Tester Signature:** _____________
**Date:** _____________
**Approved for PROTECT-002:** ☐ YES | ☐ NO
