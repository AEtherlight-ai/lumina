# Phase 3-5 Self-Configuration System - Manual Test Plan

**Sprint:** Phase 3-5 Self-Configuration
**Version:** v0.16.15+
**Date Created:** 2025-11-07
**Status:** ⏳ Ready for Post-Release Testing

---

## Purpose

Manual test checklist for **Phase 3-5 Self-Configuration System**. Use this for post-release validation in the actual VS Code extension environment.

**What's in Phase 3-5:**
- **Phase 3:** Project Detection (Language, Tools, Workflows, Domain)
- **Phase 4:** Interview & Config Generation (Init flow, Templates, Variables)
- **Phase 5:** Migration & Upgrade (Version tracking, Config migration, Backup/rollback)

**Total Tests:** 40 manual tests across 3 phases

**Note:** Most functionality is covered by automated integration tests. These manual tests focus on VS Code extension UX, commands, and real-world scenarios that are hard to automate.

---

## Quick Test Status

| Feature Area | Tests | Status | Priority |
|-------------|-------|--------|----------|
| **Phase 3: Detection** | 8 | ⏳ Pending | HIGH |
| **Phase 4: Init Flow** | 15 | ⏳ Pending | HIGH |
| **Phase 5: Migration** | 10 | ⏳ Pending | MEDIUM |
| **Performance** | 4 | ⏳ Pending | HIGH |
| **Error Handling** | 3 | ⏳ Pending | MEDIUM |

---

## Testing Instructions

1. **Install Extension:** Use latest build from F5 or VSIX
2. **Open Test Project:** Create or use existing projects
3. **Run tests in order** (or skip to specific sections)
4. **Mark results:** ✅ PASS | ❌ FAIL | ⏭️ SKIP
5. **Document issues** at the end

---

# Phase 3: Project Detection (8 Tests)

**Goal:** Validate automatic project detection across different project types

**Phase Status:** ✅ Implementation Complete | ⏳ Testing Pending

---

## Test 3.1: TypeScript Project Detection

**Status:** ⏳ Not Tested

**Prerequisites:**
- Create a new folder with `package.json` and `tsconfig.json`
- Add TypeScript + Jest dependencies

**Steps:**
1. Open the folder in VS Code
2. Open Developer Tools (Help → Toggle Developer Tools)
3. Check Console for detection logs

**Expected:**
- ✅ Console shows "TechStackDetector" log with `language: 'typescript'`
- ✅ Console shows "ToolDetector" log with `packageManager: 'npm'`, `testFramework: 'jest'`

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

## Test 3.2: Python Project Detection

**Status:** ⏳ Not Tested

**Prerequisites:**
- Create a new folder with `setup.py` and `requirements.txt` (including `pytest`)

**Steps:**
1. Open the folder in VS Code
2. Check Developer Console for detection logs

**Expected:**
- ✅ Console shows `language: 'python'`
- ✅ Console shows `packageManager: 'pip'`, `testFramework: 'pytest'`

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

## Test 3.3: Rust Project Detection

**Status:** ⏳ Not Tested

**Prerequisites:**
- Create a new folder with `Cargo.toml`

**Steps:**
1. Open the folder in VS Code
2. Check Developer Console for detection logs

**Expected:**
- ✅ Console shows `language: 'rust'`
- ✅ Console shows `packageManager: 'cargo'`

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

## Test 3.4: Git Workflow Detection

**Status:** ⏳ Not Tested

**Prerequisites:**
- Create project with `.git` directory
- Add `.github/workflows/ci.yml`

**Steps:**
1. Open the folder in VS Code
2. Check Developer Console for "WorkflowDetector" logs

**Expected:**
- ✅ Console shows `vcs: 'git'`
- ✅ Console shows `ci_cd: 'github-actions'`

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

## Test 3.5: Domain Detection (Web App)

**Status:** ⏳ Not Tested

**Prerequisites:**
- Create project with React/Vue dependencies in package.json
- Add `public/` directory

**Steps:**
1. Open the folder in VS Code
2. Check Developer Console for "DomainDetector" logs

**Expected:**
- ✅ Console shows `primary: 'web'`
- ✅ Console shows framework detected (React/Vue)

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

## Test 3.6: Domain Detection (CLI Tool)

**Status:** ⏳ Not Tested

**Prerequisites:**
- Create project with `bin` field in package.json

**Steps:**
1. Open the folder in VS Code
2. Check Developer Console for "DomainDetector" logs

**Expected:**
- ✅ Console shows `primary: 'cli'`

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

## Test 3.7: Detection Performance

**Status:** ⏳ Not Tested

**Prerequisites:**
- Create a realistic project (package.json, tsconfig.json, src/, test/)

**Steps:**
1. Open the folder in VS Code
2. Check Developer Console for detection timing logs

**Expected:**
- ✅ TechStackDetector completes in < 200ms
- ✅ ToolDetector completes in < 200ms
- ✅ WorkflowDetector completes in < 100ms
- ✅ DomainDetector completes in < 100ms
- ✅ Total detection pipeline < 500ms

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

## Test 3.8: Detection with Missing Files

**Status:** ⏳ Not Tested

**Prerequisites:**
- Create minimal project (only package.json, no tsconfig.json)

**Steps:**
1. Open the folder in VS Code
2. Check Developer Console for detection logs

**Expected:**
- ✅ Detection completes without errors
- ✅ Falls back to defaults for missing info
- ✅ No console errors

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

# Phase 4: Init Flow & Config Generation (15 Tests)

**Goal:** Validate init command, interview flow, config generation, and templates

**Phase Status:** ✅ Implementation Complete | ⏳ Testing Pending

---

## Test 4.1: Init Command Exists

**Status:** ⏳ Not Tested

**Prerequisites:**
- Extension installed

**Steps:**
1. Open Command Palette (Ctrl+Shift+P)
2. Type "ÆtherLight: Init"

**Expected:**
- ✅ "ÆtherLight: Init Self-Configuration" command appears
- ✅ Command is enabled (not grayed out)

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

## Test 4.2: Init Flow - Detection Phase

**Status:** ⏳ Not Tested

**Prerequisites:**
- Create TypeScript project (package.json + tsconfig.json)
- Open in VS Code

**Steps:**
1. Run "ÆtherLight: Init Self-Configuration"
2. Observe detection phase

**Expected:**
- ✅ Progress notification appears: "Detecting project..."
- ✅ Detection completes in < 500ms
- ✅ Console shows detection results

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

## Test 4.3: Init Flow - Interview Phase

**Status:** ⏳ Not Tested

**Prerequisites:**
- Run init command from Test 4.2

**Steps:**
1. After detection, observe interview phase
2. Answer 2-3 questions

**Expected:**
- ✅ Interview questions appear (Quick Pick UI)
- ✅ Detection results pre-populate defaults
- ✅ Questions are relevant to detected project type

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

## Test 4.4: Config File Generation

**Status:** ⏳ Not Tested

**Prerequisites:**
- Complete init flow from Test 4.3

**Steps:**
1. After interview completes, check workspace
2. Open `.aetherlight/project-config.json`

**Expected:**
- ✅ File exists at `.aetherlight/project-config.json`
- ✅ File is valid JSON
- ✅ Contains `schema_version: "2.0"`
- ✅ Contains `project_name`, `language`, `structure`, etc.
- ✅ Interview answers are reflected in config

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

## Test 4.5: Config Validation

**Status:** ⏳ Not Tested

**Prerequisites:**
- Generated config from Test 4.4

**Steps:**
1. Check Developer Console for validation logs

**Expected:**
- ✅ Console shows "ProjectConfigValidator" log with `valid: true`
- ✅ No validation errors

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

## Test 4.6: Template Customization

**Status:** ⏳ Not Tested

**Prerequisites:**
- Complete init flow
- Check `.aetherlight/templates/` directory

**Steps:**
1. Verify templates were customized
2. Open a template file (e.g., `CLAUDE.md`)

**Expected:**
- ✅ Templates directory exists with customized files
- ✅ Variables like `{{PROJECT_NAME}}` are replaced with actual values
- ✅ Template content is project-specific

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

## Test 4.7: Variable Resolution

**Status:** ⏳ Not Tested

**Prerequisites:**
- Generated config with custom values

**Steps:**
1. Check Developer Console for "VariableResolver" logs
2. Verify all variables resolved

**Expected:**
- ✅ Console shows variables resolved successfully
- ✅ No "MissingVariableError" in console

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

## Test 4.8: Init on Greenfield Project

**Status:** ⏳ Not Tested

**Prerequisites:**
- Create empty folder (no files)
- Open in VS Code

**Steps:**
1. Run "ÆtherLight: Init Self-Configuration"
2. Answer interview questions

**Expected:**
- ✅ Detection returns defaults (no errors)
- ✅ Interview flow completes successfully
- ✅ Config generated from interview answers only
- ✅ No detection errors

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

## Test 4.9: Init on Existing Project with Config

**Status:** ⏳ Not Tested

**Prerequisites:**
- Project already has `.aetherlight/project-config.json`

**Steps:**
1. Run "ÆtherLight: Init Self-Configuration"

**Expected:**
- ✅ Warning message: "Config already exists. Overwrite?"
- ✅ If user cancels: No changes made
- ✅ If user confirms: New config generated

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

## Test 4.10: Init Performance (Full Flow)

**Status:** ⏳ Not Tested

**Prerequisites:**
- Realistic project

**Steps:**
1. Run init command
2. Complete interview
3. Measure total time

**Expected:**
- ✅ Full flow (detection + interview + config + templates) < 5s
- ✅ (excluding user interaction time)

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

## Test 4.11: Config Schema Validation (Invalid Config)

**Status:** ⏳ Not Tested

**Prerequisites:**
- Manually edit `.aetherlight/project-config.json` to be invalid

**Steps:**
1. Remove required field (e.g., `project_name`)
2. Save file
3. Check Developer Console

**Expected:**
- ✅ Validation error logged
- ✅ Clear error message indicating missing field

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

## Test 4.12: Custom Build Command

**Status:** ⏳ Not Tested

**Prerequisites:**
- Run init flow

**Steps:**
1. In interview, provide custom build command (e.g., "npm run build:prod")
2. Check generated config

**Expected:**
- ✅ Config contains `language.build_command: "npm run build:prod"`
- ✅ Custom value preserved (not overwritten with default)

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

## Test 4.13: Custom Directory Structure

**Status:** ⏳ Not Tested

**Prerequisites:**
- Run init flow

**Steps:**
1. In interview, provide custom directories (e.g., "custom-src", "custom-test")
2. Check generated config

**Expected:**
- ✅ Config contains `structure.source_directory: "custom-src"`
- ✅ Config contains `structure.test_directory: "custom-test"`

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

## Test 4.14: Interview Cancellation

**Status:** ⏳ Not Tested

**Prerequisites:**
- Run init flow

**Steps:**
1. Start interview
2. Press ESC or click "Cancel"

**Expected:**
- ✅ Interview cancelled gracefully
- ✅ No config file created
- ✅ No errors in console

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

## Test 4.15: Multiple Project Types in Workspace

**Status:** ⏳ Not Tested

**Prerequisites:**
- Open workspace with multiple folders (different project types)

**Steps:**
1. Run init on each folder

**Expected:**
- ✅ Each folder gets correct detection
- ✅ Each folder gets appropriate config
- ✅ No cross-contamination between folders

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

# Phase 5: Migration & Upgrade (10 Tests)

**Goal:** Validate version tracking, config migration, backup/rollback, and upgrade command

**Phase Status:** ✅ Implementation Complete | ⏳ Testing Pending

---

## Test 5.1: Version Tracking - Initial Install

**Status:** ⏳ Not Tested

**Prerequisites:**
- Fresh init (no prior version)

**Steps:**
1. Run init command
2. Check `.aetherlight/version.json`

**Expected:**
- ✅ File exists at `.aetherlight/version.json`
- ✅ Contains `version` field (e.g., "2.0.0")
- ✅ Contains `installed_at` timestamp

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

## Test 5.2: Upgrade Command Exists

**Status:** ⏳ Not Tested

**Prerequisites:**
- Extension installed

**Steps:**
1. Open Command Palette (Ctrl+Shift+P)
2. Type "ÆtherLight: Upgrade"

**Expected:**
- ✅ "ÆtherLight: Upgrade Configuration" command appears
- ✅ Command is enabled

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

## Test 5.3: Upgrade Check - No Upgrade Available

**Status:** ⏳ Not Tested

**Prerequisites:**
- Already on latest version

**Steps:**
1. Run "ÆtherLight: Upgrade Configuration"

**Expected:**
- ✅ Message: "Already on latest version (v2.0.0)"
- ✅ No changes made

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

## Test 5.4: Backup Creation

**Status:** ⏳ Not Tested

**Prerequisites:**
- Project with existing config
- Simulate upgrade scenario

**Steps:**
1. Run upgrade command (mock available upgrade)
2. Check `.aetherlight/backups/` directory

**Expected:**
- ✅ Backup directory created: `.aetherlight/backups/pre-upgrade-v2.0.0/`
- ✅ Backup contains: `project-config.json`, `version.json`, `checksums.json`, `metadata.json`
- ✅ Backup created in < 200ms

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

## Test 5.5: Config Migration (v1 → v2)

**Status:** ⏳ Not Tested

**Prerequisites:**
- Create old v1 config format manually
- Run upgrade

**Steps:**
1. Create `.aetherlight/project-config.json` with v1 format
2. Run upgrade command
3. Check migrated config

**Expected:**
- ✅ Config migrated to v2 schema
- ✅ `schema_version: "2.0"` in new config
- ✅ Old fields mapped to new fields correctly

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

## Test 5.6: Customization Preservation

**Status:** ⏳ Not Tested

**Prerequisites:**
- v1 config with custom build command

**Steps:**
1. Create v1 config with `buildCommand: "custom-build"`
2. Run upgrade
3. Check new config

**Expected:**
- ✅ New config contains `language.build_command: "custom-build"`
- ✅ Custom value preserved (not lost during migration)

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

## Test 5.7: Migration Log Generation

**Status:** ⏳ Not Tested

**Prerequisites:**
- Run migration from Test 5.5

**Steps:**
1. Check `.aetherlight/migration.log`

**Expected:**
- ✅ Log file exists
- ✅ Contains migration timestamp
- ✅ Contains old config content
- ✅ Contains new config content
- ✅ Contains migration result (success/failure)

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

## Test 5.8: Rollback on Failure

**Status:** ⏳ Not Tested

**Prerequisites:**
- Simulate migration failure (corrupt config)

**Steps:**
1. Create invalid v1 config
2. Run upgrade
3. Check rollback behavior

**Expected:**
- ✅ Migration fails with clear error
- ✅ Rollback triggered automatically
- ✅ Original config restored from backup
- ✅ No data loss

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

## Test 5.9: Backup Verification (Checksum)

**Status:** ⏳ Not Tested

**Prerequisites:**
- Backup created from Test 5.4

**Steps:**
1. Check Developer Console for verification logs
2. Manually verify checksums.json

**Expected:**
- ✅ Checksums calculated for all backup files
- ✅ Verification passes (checksums match)
- ✅ Verification completes in < 100ms

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

## Test 5.10: Backup Cleanup (Keep Last 5)

**Status:** ⏳ Not Tested

**Prerequisites:**
- Create 6+ backups manually

**Steps:**
1. Check `.aetherlight/backups/` directory

**Expected:**
- ✅ Only 5 most recent backups remain
- ✅ Oldest backups deleted automatically
- ✅ Cleanup logged in console

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

# Performance Tests (4 Tests)

**Goal:** Validate all performance targets are met

---

## Test P.1: Detection Pipeline < 500ms

**Status:** ⏳ Not Tested

**Prerequisites:**
- Realistic project

**Steps:**
1. Open project in VS Code
2. Check Developer Console for detection timing

**Expected:**
- ✅ TechStackDetector < 200ms
- ✅ ToolDetector < 200ms
- ✅ WorkflowDetector < 100ms
- ✅ DomainDetector < 100ms
- ✅ Total < 500ms

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

## Test P.2: Config Generation < 100ms

**Status:** ⏳ Not Tested

**Prerequisites:**
- Run init flow

**Steps:**
1. Check Developer Console for config generation timing

**Expected:**
- ✅ ProjectConfigGenerator completes in < 100ms

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

## Test P.3: Full Init Flow < 5s

**Status:** ⏳ Not Tested

**Prerequisites:**
- Run complete init flow

**Steps:**
1. Measure total time (detection + interview + config + templates)
2. Exclude user interaction time

**Expected:**
- ✅ Total < 5s (automated portions only)

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

## Test P.4: Upgrade Flow < 10s

**Status:** ⏳ Not Tested

**Prerequisites:**
- Run complete upgrade flow

**Steps:**
1. Measure total time (backup + migration + version update)

**Expected:**
- ✅ Full upgrade < 10s

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

# Error Handling Tests (3 Tests)

**Goal:** Validate graceful error handling and recovery

---

## Test E.1: Invalid package.json

**Status:** ⏳ Not Tested

**Prerequisites:**
- Create project with malformed package.json

**Steps:**
1. Run init command

**Expected:**
- ✅ Detection handles error gracefully
- ✅ Falls back to interview
- ✅ No extension crash
- ✅ Clear error message

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

## Test E.2: Missing Permissions (Write Error)

**Status:** ⏳ Not Tested

**Prerequisites:**
- Make `.aetherlight/` directory read-only

**Steps:**
1. Run init command

**Expected:**
- ✅ Clear error message: "Cannot write config (permission denied)"
- ✅ No silent failure
- ✅ No extension crash

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

## Test E.3: Network Error (Version Check)

**Status:** ⏳ Not Tested

**Prerequisites:**
- Disconnect internet
- Run upgrade command

**Steps:**
1. Observe behavior

**Expected:**
- ✅ Clear error message: "Cannot check for updates (network error)"
- ✅ Option to retry or skip
- ✅ No extension crash

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

# Test Results Summary

## Pass/Fail Count

- **Phase 3 Detection:** ___ / 8 tests passed
- **Phase 4 Init Flow:** ___ / 15 tests passed
- **Phase 5 Migration:** ___ / 10 tests passed
- **Performance:** ___ / 4 tests passed
- **Error Handling:** ___ / 3 tests passed

**Overall:** ___ / 40 tests passed (___%)

---

## Critical Issues Found

| Test ID | Issue Description | Severity | Repro Steps |
|---------|------------------|----------|-------------|
| ___ | ___ | ___ | ___ |

---

## Minor Issues Found

| Test ID | Issue Description | Severity | Notes |
|---------|------------------|----------|-------|
| ___ | ___ | ___ | ___ |

---

## Performance Issues

| Test ID | Metric | Expected | Actual | Notes |
|---------|--------|----------|--------|-------|
| ___ | ___ | ___ | ___ | ___ |

---

## Recommendations

1. ___________
2. ___________
3. ___________

---

## Sign-Off

**Tester:** ___________
**Date:** ___________
**Status:** [ ] PASS | [ ] FAIL | [ ] NEEDS WORK
**Ready for Release:** [ ] YES | [ ] NO

---

## Notes

Use this space for general observations, feedback, or suggestions:

___________
___________
___________
