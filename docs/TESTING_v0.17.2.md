# ÆtherLight v0.17.2 Testing Document

**Version**: 0.17.2
**Sprint**: v0.17.1 Bug Fixes
**Branch**: feature/v0.17.2-bug-fixes
**Created**: 2025-11-12
**Status**: Ready for Testing

---

## Table of Contents

1. [Overview](#overview)
2. [Commits and Changes](#commits-and-changes)
3. [Test Categories](#test-categories)
4. [Critical Path Testing](#critical-path-testing)
5. [Enhanced Prompt System Testing](#enhanced-prompt-system-testing)
6. [Sprint TOML Updates Testing](#sprint-toml-updates-testing)
7. [Regression Testing](#regression-testing)
8. [Test Credentials](#test-credentials)
9. [Test Checklist](#test-checklist)

---

## Overview

This document provides comprehensive testing instructions for v0.17.2, which includes:

1. **MVP-003 Enhanced Prompt System** - Infrastructure for AI-enhanced task prompts
2. **Sprint 17.1 Bug Fixes** - Critical corrections and consensus validation
3. **Template System Updates** - Enhanced template with agent/skill tracking

**Goals**:
- Verify enhanced prompt system displays correctly in Sprint Panel
- Validate sprint TOML updates (BUG-002A/B/C additions)
- Confirm template improvements for future task generation
- Ensure no regressions in existing functionality

---

## Commits and Changes

### Commit 1: TaskAnalyzer Safety Check (BUG-001)
**Commit**: `67f2d6a`
**Date**: 2025-11-11
**Branch**: feature/v0.17.2-bug-fixes
**Message**: `fix(TaskAnalyzer): Add safety check for missing config.agents (BUG-001)`

**Changes**:
- `vscode-lumina/src/services/TaskAnalyzer.ts:292-333`
- Added `if (!config.agents)` safety check
- Prevents crash when config.json doesn't exist yet

**Testing**:
- [ ] Install extension in new workspace (no config.json)
- [ ] Click "Code Analyzer" button
- [ ] Verify modal opens successfully (no crash)
- [ ] Verify no "Cannot read properties of undefined" error

---

### Commit 2: Enhanced Prompt System (MVP-003)
**Commit**: `3f05ea9`
**Date**: 2025-11-12
**Branch**: feature/v0.17.2-bug-fixes
**Message**: `feat(sprint): Add enhanced prompt system to Sprint Panel UI (MVP-003)`

**Changes**:

#### File 1: SprintLoader.ts
**Path**: `vscode-lumina/src/commands/SprintLoader.ts`
**Lines**: 71-72

**Before**:
```typescript
// Enhanced prompt fields (used by SprintRenderer)
why?: string;
context?: string;
reasoning_chain?: string[];
pattern_context?: string;
success_impact?: string;
// Test-related fields (TDD enforcement)
```

**After**:
```typescript
// Enhanced prompt fields (used by SprintRenderer)
why?: string;
context?: string;
reasoning_chain?: string[];
pattern_context?: string;
success_impact?: string;
enhanced_prompt?: string;  // MVP-003: Path to enhanced task prompt
template?: string;  // MVP-003: Template version used
// Test-related fields (TDD enforcement)
```

**Testing**:
- [ ] Compile TypeScript: `cd vscode-lumina && npm run compile`
- [ ] Verify no compilation errors
- [ ] Check SprintTask interface includes new fields

#### File 2: SprintRenderer.ts
**Path**: `vscode-lumina/src/commands/SprintRenderer.ts`
**Lines**: 423-446

**Before**:
- No enhanced prompt section in task details

**After**:
- Added "📋 Enhanced Prompt" section
- Displays file path with file icon
- Shows template version
- Includes description and "Open Enhanced Prompt" button

**Testing**:
- [ ] Open Sprint Panel in VS Code
- [ ] Click on BUG-002A task
- [ ] Verify "View Details" shows enhanced prompt section
- [ ] Verify file path displayed: `internal/sprints/enhanced_prompts/BUG-002A_ENHANCED_PROMPT.md`
- [ ] Verify template displayed: `MVP-003-PromptEnhancer-TaskTemplate-v1.0`
- [ ] Click "Open Enhanced Prompt" button
- [ ] Verify file opens in new editor tab (beside column)
- [ ] Verify success notification appears

#### File 3: voicePanel.ts
**Path**: `vscode-lumina/src/commands/voicePanel.ts`

**Changes**:
1. **Lines 864-895**: Added `openEnhancedPrompt` message handler
2. **Lines 1724-1726**: Added `window.openEnhancedPrompt()` JavaScript function

**Testing**:
- [ ] F5 to launch Extension Development Host
- [ ] Open Sprint Panel
- [ ] View BUG-002A task details
- [ ] Click "Open Enhanced Prompt" button
- [ ] Verify handler executes without errors
- [ ] Verify file opens correctly
- [ ] Check console for errors (Ctrl+Shift+I in webview)

---

### Local Changes: Sprint TOML Updates (NOT COMMITTED - GITIGNORED)
**File**: `internal/sprints/ACTIVE_SPRINT_17.1_BUGS.toml`
**Status**: Local changes only (file is gitignored)

**Changes Made**:

#### 1. Header Update (Lines 1-6)
```toml
# ÆtherLight Bug Sprint 17.1
# Version: 0.17.2
# Created: 2025-11-11
# Updated: 2025-11-12 (Added BUG-002B, BUG-002C from consensus validation)
# Status: Active
```

#### 2. Metadata Updates (Lines 28, 39)
```toml
[metadata.priority_order]
phase_0_critical_blockers = "BUG-002A, BUG-002B, BUG-002C (MUST complete before phase_2)"

[metadata.audit_context]
critical_bugs_found = 15  # Updated: 12 original + BUG-002B + BUG-002C + ENHANCE-001
```

#### 3. Added BUG-002A Enhanced Prompt Link (Line 322)
```toml
[tasks.BUG-002A]
id = "BUG-002A"
name = "Migrate TranscriptionResponse struct from USD to tokens"
status = "pending"
phase = "desktop-auth-integration"
agent = "tauri-desktop-agent"
enhanced_prompt = "internal/sprints/enhanced_prompts/BUG-002A_ENHANCED_PROMPT.md"
template = "MVP-003-PromptEnhancer-TaskTemplate-v1.0"
```

#### 4. Added BUG-002B Task (Lines 467-589)
- **Task**: Update token balance API to use Bearer authentication
- **Critical Correction #2**: Desktop uses query parameter, API requires Authorization header
- **Estimated Time**: 30 minutes
- **Dependencies**: None (parallel with BUG-002A)

#### 5. Added BUG-002C Task (Lines 591-725)
- **Task**: Update license key format validation
- **Critical Correction #3**: Desktop expects `lic_XXXX`, actual format is `XXXX-XXXX-XXXX-XXXX`
- **Estimated Time**: 15 minutes
- **Dependencies**: None (parallel with BUG-002A)

#### 6. Fixed BUG-002 Dependencies (Line 310)
```toml
dependencies = ["BUG-002A", "BUG-002B", "BUG-002C", "BUG-003"]
```

#### 7. Fixed BUG-003 Dependencies (Line 825)
```toml
dependencies = ["BUG-002A", "BUG-002B", "BUG-002C"]
```

#### 8. Updated Progress Tracking (Lines 2601-2606)
```toml
[progress]
total_tasks = 18  # 13 bugs + BUG-002A + BUG-002B + BUG-002C + ENHANCE-001 + 4 templates
completed_tasks = 1  # BUG-001 completed
completion_percentage = 6  # (1 / 18) * 100
```

#### 9. Fixed ENHANCE-001 Contradiction (Lines 2127-2214)
**Before**: Said "TaskAnalyzer is central hub" (WRONG)
**After**: Says "PromptEnhancer is central hub" (CORRECT)

**Testing**:
- [ ] Read ACTIVE_SPRINT_17.1_BUGS.toml
- [ ] Verify BUG-002A has enhanced_prompt and template fields
- [ ] Verify BUG-002B exists with Bearer auth details
- [ ] Verify BUG-002C exists with license key format details
- [ ] Verify BUG-002 dependencies include all 3 corrections + BUG-003
- [ ] Verify ENHANCE-001 says "PromptEnhancer" not "TaskAnalyzer"
- [ ] Verify total_tasks = 18
- [ ] Run validation: `node scripts/validate-sprint-schema.js`
- [ ] Verify TOML parsing succeeds (no errors)

---

### Local Changes: Enhanced Prompt Files (NOT COMMITTED - GITIGNORED)
**Directory**: `internal/sprints/enhanced_prompts/`
**Status**: New files (directory is gitignored)

#### File 1: BUG-002A Enhanced Prompt
**Path**: `internal/sprints/enhanced_prompts/BUG-002A_ENHANCED_PROMPT.md`
**Size**: 13KB
**Created**: 2025-11-12

**Content Sections**:
1. Header Metadata (with enhanced_prompt and template fields)
2. Task Overview (Current vs Required state comparison)
3. Context Gathered (Git status, related files, workspace structure, patterns)
4. Validation Results (Prerequisites checklist)
5. Implementation Steps (7-step TDD approach with time estimates)
6. Acceptance Criteria Checklist
7. Pre-Flight Checklist (Pattern-VALIDATION-001)
8. Error Handling (4 potential issues with solutions)
9. Estimated Time Breakdown (1-2 hours total)
10. Dependencies (Blocks BUG-002)
11. Success Impact (6 impact statements)
12. Patterns Referenced (4 patterns)
13. Notes (6 contextual reminders)
14. Post-Completion Updates (NEW - agent/skill updates needed)

**Testing**:
- [ ] Open file in VS Code
- [ ] Verify all 14 sections present
- [ ] Verify header includes new fields (Skill, Enhanced Prompt, Template)
- [ ] Verify Post-Completion Updates section exists
- [ ] Verify code examples render correctly
- [ ] Verify TDD steps are clear and actionable
- [ ] Check for typos or formatting issues

#### File 2: MVP-003 Template
**Path**: `internal/sprints/enhanced_prompts/MVP-003-PromptEnhancer-TaskTemplate-v1.0.md`
**Size**: 18KB (updated from original)
**Updated**: 2025-11-12

**Updates Made**:
1. **Section 1**: Added enhanced_prompt and template fields to header
2. **Section 1**: Added "Agent and Skill Usage" explanation
3. **Section 14**: NEW - Post-Completion Updates section
4. **Template Sections Mapping**: Added Post-Completion Updates row
5. **Standard Variables**: Added SKILL_NAME, PATH_TO_THIS_FILE, TEMPLATE_VERSION
6. **Post-Completion Variables**: Added 10 new variables for agent/skill tracking

**Testing**:
- [ ] Open template file in VS Code
- [ ] Verify Section 1 includes agent/skill usage explanation
- [ ] Verify Section 14 (Post-Completion Updates) exists
- [ ] Verify Template Sections Mapping table includes all 14 sections
- [ ] Verify Standard Variables includes 3 new fields
- [ ] Verify Post-Completion Variables section exists (10 variables)
- [ ] Check template is self-consistent (all variables defined)

---

### Local Changes: Consensus Report (NOT COMMITTED - GITIGNORED)
**File**: `internal/sprints/SPRINT_17.1_CONSENSUS_REPORT.md`
**Size**: ~500 lines
**Created**: 2025-11-12

**Purpose**: Documents gap analysis and validates sprint completeness

**Content**:
- 12 identified architecture gaps mapped to sprint tasks
- 3 critical API corrections documented with code examples
- Coverage assessment table
- Final consensus: 95% correct, needs 2 additions (BUG-002B, BUG-002C)

**Testing**:
- [ ] Read consensus report
- [ ] Verify all 12 gaps have task mappings
- [ ] Verify 3 API corrections documented
- [ ] Cross-reference with sprint TOML
- [ ] Confirm BUG-002B and BUG-002C are now in sprint

---

## Test Categories

### Category 1: Extension Functionality
**Priority**: CRITICAL
**Tests**: 15
**Time**: 30 minutes

### Category 2: Sprint Panel UI
**Priority**: HIGH
**Tests**: 12
**Time**: 20 minutes

### Category 3: Enhanced Prompt System
**Priority**: HIGH
**Tests**: 8
**Time**: 15 minutes

### Category 4: TOML Validation
**Priority**: MEDIUM
**Tests**: 6
**Time**: 10 minutes

### Category 5: Regression Testing
**Priority**: HIGH
**Tests**: 10
**Time**: 20 minutes

**Total Tests**: 51
**Total Time**: ~95 minutes (1.5 hours)

---

## Critical Path Testing

### Test 1: Extension Compilation
**Category**: Extension Functionality
**Priority**: CRITICAL
**Commit**: 3f05ea9

**Steps**:
1. Open terminal in workspace root
2. Run: `cd vscode-lumina && npm run compile`
3. Verify output shows "tsc -p ./"
4. Verify no TypeScript errors
5. Check out/ directory updated

**Expected Result**: ✅ Compilation succeeds with no errors

**Actual Result**: _____________________________

**Status**: [ ] PASS [ ] FAIL

---

### Test 2: Extension Activation
**Category**: Extension Functionality
**Priority**: CRITICAL
**Commit**: 67f2d6a, 3f05ea9

**Steps**:
1. Press F5 in VS Code (Extension Development Host)
2. Wait for extension to activate
3. Check OUTPUT panel > ÆtherLight
4. Verify "Extension activated" message
5. Check for any error messages

**Expected Result**: ✅ Extension activates without errors

**Actual Result**: _____________________________

**Status**: [ ] PASS [ ] FAIL

---

### Test 3: Sprint Panel Opens
**Category**: Sprint Panel UI
**Priority**: CRITICAL
**Commit**: 3f05ea9

**Steps**:
1. Click ÆtherLight icon in Activity Bar (left sidebar)
2. Wait for Sprint Panel to load
3. Verify sprint tasks display
4. Check for JavaScript errors in console (Ctrl+Shift+I on webview)

**Expected Result**: ✅ Sprint Panel opens and displays tasks

**Actual Result**: _____________________________

**Status**: [ ] PASS [ ] FAIL

---

### Test 4: BUG-001 Fix (Missing Config Safety Check)
**Category**: Extension Functionality
**Priority**: CRITICAL
**Commit**: 67f2d6a

**Steps**:
1. Create new test workspace (no .aetherlight/ directory)
2. Open Extension Development Host
3. Install extension in test workspace
4. Click "Code Analyzer" button
5. Verify modal opens (no crash)

**Expected Result**: ✅ Modal opens successfully, no "Cannot read properties of undefined" error

**Actual Result**: _____________________________

**Status**: [ ] PASS [ ] FAIL

---

### Test 5: Enhanced Prompt Display in Task Details
**Category**: Enhanced Prompt System
**Priority**: HIGH
**Commit**: 3f05ea9

**Steps**:
1. Open Sprint Panel
2. Find BUG-002A task
3. Click "View Details"
4. Scroll to "Enhanced Prompt" section
5. Verify section exists with:
   - 📋 header
   - File path: `internal/sprints/enhanced_prompts/BUG-002A_ENHANCED_PROMPT.md`
   - Template: `MVP-003-PromptEnhancer-TaskTemplate-v1.0`
   - Description text
   - "Open Enhanced Prompt" button

**Expected Result**: ✅ Enhanced Prompt section displays correctly

**Actual Result**: _____________________________

**Status**: [ ] PASS [ ] FAIL

---

### Test 6: Open Enhanced Prompt Button
**Category**: Enhanced Prompt System
**Priority**: HIGH
**Commit**: 3f05ea9

**Steps**:
1. In BUG-002A task details
2. Click "Open Enhanced Prompt" button
3. Verify new editor tab opens beside current tab
4. Verify file content loads (13KB file)
5. Verify success notification appears

**Expected Result**: ✅ File opens in new tab with success notification

**Actual Result**: _____________________________

**Status**: [ ] PASS [ ] FAIL

---

### Test 7: Enhanced Prompt Content Validation
**Category**: Enhanced Prompt System
**Priority**: HIGH
**Commit**: Local changes (gitignored)

**Steps**:
1. Open `internal/sprints/enhanced_prompts/BUG-002A_ENHANCED_PROMPT.md`
2. Verify header includes:
   - Generated date
   - Sprint name
   - Task ID, Status, Agent
   - **NEW**: Skill field
   - **NEW**: Enhanced Prompt path
   - **NEW**: Template version
3. Scroll to bottom
4. Verify "Post-Completion Updates" section exists
5. Check all 14 sections present

**Expected Result**: ✅ All header fields present, all 14 sections exist

**Actual Result**: _____________________________

**Status**: [ ] PASS [ ] FAIL

---

### Test 8: Template Updates Validation
**Category**: Enhanced Prompt System
**Priority**: MEDIUM
**Commit**: Local changes (gitignored)

**Steps**:
1. Open `internal/sprints/enhanced_prompts/MVP-003-PromptEnhancer-TaskTemplate-v1.0.md`
2. Verify Section 1 includes "Agent and Skill Usage" explanation
3. Verify Section 14 "Post-Completion Updates" exists
4. Check Template Sections Mapping table includes row 14
5. Verify Standard Variables includes SKILL_NAME, PATH_TO_THIS_FILE, TEMPLATE_VERSION
6. Verify Post-Completion Variables section exists

**Expected Result**: ✅ All template updates present and correct

**Actual Result**: _____________________________

**Status**: [ ] PASS [ ] FAIL

---

### Test 9: Sprint TOML Enhanced Prompt Field
**Category**: TOML Validation
**Priority**: HIGH
**Commit**: Local changes (gitignored)

**Steps**:
1. Open `internal/sprints/ACTIVE_SPRINT_17.1_BUGS.toml`
2. Navigate to `[tasks.BUG-002A]` (around line 316)
3. Verify fields exist:
   ```toml
   enhanced_prompt = "internal/sprints/enhanced_prompts/BUG-002A_ENHANCED_PROMPT.md"
   template = "MVP-003-PromptEnhancer-TaskTemplate-v1.0"
   ```
4. Verify fields are after `agent` and before `why`

**Expected Result**: ✅ Enhanced prompt fields present in correct location

**Actual Result**: _____________________________

**Status**: [ ] PASS [ ] FAIL

---

### Test 10: Sprint TOML Validation
**Category**: TOML Validation
**Priority**: CRITICAL
**Commit**: Local changes (gitignored)

**Steps**:
1. Open terminal in workspace root
2. Run: `node scripts/validate-sprint-schema.js`
3. Verify output shows "✅ Sprint TOML is valid"
4. Check for any validation errors
5. Verify total_tasks = 18

**Expected Result**: ✅ TOML validation passes, 18 tasks

**Actual Result**: _____________________________

**Status**: [ ] PASS [ ] FAIL

---

## Enhanced Prompt System Testing

### Test 11: SprintTask Interface Update
**Category**: Extension Functionality
**Priority**: HIGH
**Commit**: 3f05ea9

**Steps**:
1. Open `vscode-lumina/src/commands/SprintLoader.ts`
2. Navigate to SprintTask interface (lines 45-76)
3. Verify lines 71-72 contain:
   ```typescript
   enhanced_prompt?: string;  // MVP-003
   template?: string;  // MVP-003
   ```
4. Check comments explain MVP-003 system

**Expected Result**: ✅ Interface includes new optional fields

**Actual Result**: _____________________________

**Status**: [ ] PASS [ ] FAIL

---

### Test 12: SprintRenderer Enhanced Prompt Section
**Category**: Sprint Panel UI
**Priority**: HIGH
**Commit**: 3f05ea9

**Steps**:
1. Open `vscode-lumina/src/commands/SprintRenderer.ts`
2. Navigate to lines 423-446
3. Verify enhanced prompt section exists:
   - Conditional rendering: `${task.enhanced_prompt ? ...}`
   - H3 header with 📋 emoji
   - File path display
   - Template info
   - Description text
   - Button with onclick handler
4. Check button calls `openEnhancedPrompt('${task.enhanced_prompt}')`

**Expected Result**: ✅ Rendering code present and correct

**Actual Result**: _____________________________

**Status**: [ ] PASS [ ] FAIL

---

### Test 13: voicePanel Message Handler
**Category**: Extension Functionality
**Priority**: HIGH
**Commit**: 3f05ea9

**Steps**:
1. Open `vscode-lumina/src/commands/voicePanel.ts`
2. Navigate to lines 864-895
3. Verify case statement: `case 'openEnhancedPrompt':`
4. Check handler:
   - Gets promptPath from message
   - Resolves path relative to workspace
   - Opens file with vscode.workspace.openTextDocument
   - Shows success notification
5. Verify error handling present

**Expected Result**: ✅ Message handler implemented correctly

**Actual Result**: _____________________________

**Status**: [ ] PASS [ ] FAIL

---

### Test 14: voicePanel JavaScript Function
**Category**: Sprint Panel UI
**Priority**: HIGH
**Commit**: 3f05ea9

**Steps**:
1. Open `vscode-lumina/src/commands/voicePanel.ts`
2. Navigate to lines 1724-1726
3. Verify function definition:
   ```javascript
   window.openEnhancedPrompt = function(promptPath) {
       vscode.postMessage({ type: 'openEnhancedPrompt', promptPath });
   };
   ```
4. Check comment: "MVP-003: Open Enhanced Prompt file"

**Expected Result**: ✅ JavaScript function defined correctly

**Actual Result**: _____________________________

**Status**: [ ] PASS [ ] FAIL

---

### Test 15: Enhanced Prompt Opens from Different Tasks
**Category**: Sprint Panel UI
**Priority**: MEDIUM
**Commit**: 3f05ea9

**Steps**:
1. Open Sprint Panel
2. View task details for multiple tasks (if they have enhanced prompts)
3. For each task with enhanced_prompt field:
   - Click "Open Enhanced Prompt" button
   - Verify correct file opens
   - Verify file path matches task definition
4. Test with BUG-002A specifically

**Expected Result**: ✅ Correct enhanced prompt opens for each task

**Actual Result**: _____________________________

**Status**: [ ] PASS [ ] FAIL

---

### Test 16: Enhanced Prompt Button Not Shown When Field Missing
**Category**: Sprint Panel UI
**Priority**: LOW
**Commit**: 3f05ea9

**Steps**:
1. Open Sprint Panel
2. View details for tasks WITHOUT enhanced_prompt field
3. Verify "Enhanced Prompt" section does NOT appear
4. Test with multiple tasks (BUG-004, BUG-005, etc.)

**Expected Result**: ✅ Section hidden when field not present

**Actual Result**: _____________________________

**Status**: [ ] PASS [ ] FAIL

---

### Test 17: WebView Console Errors
**Category**: Sprint Panel UI
**Priority**: HIGH
**Commit**: 3f05ea9

**Steps**:
1. Open Sprint Panel
2. Press Ctrl+Shift+I (open webview console)
3. View BUG-002A task details
4. Click "Open Enhanced Prompt" button
5. Check console for JavaScript errors
6. Verify no "undefined" or "null" errors

**Expected Result**: ✅ No console errors

**Actual Result**: _____________________________

**Status**: [ ] PASS [ ] FAIL

---

### Test 18: Enhanced Prompt File Exists
**Category**: Enhanced Prompt System
**Priority**: CRITICAL
**Commit**: Local changes (gitignored)

**Steps**:
1. Navigate to `internal/sprints/enhanced_prompts/`
2. Verify directory exists
3. List files: `ls -lh`
4. Verify files present:
   - `BUG-002A_ENHANCED_PROMPT.md` (~13KB)
   - `MVP-003-PromptEnhancer-TaskTemplate-v1.0.md` (~18KB)
5. Check file permissions (should be readable)

**Expected Result**: ✅ Both files exist and are readable

**Actual Result**: _____________________________

**Status**: [ ] PASS [ ] FAIL

---

## Sprint TOML Updates Testing

### Test 19: BUG-002B Task Added
**Category**: TOML Validation
**Priority**: HIGH
**Commit**: Local changes (gitignored)

**Steps**:
1. Open `internal/sprints/ACTIVE_SPRINT_17.1_BUGS.toml`
2. Navigate to lines 467-589
3. Verify `[tasks.BUG-002B]` section exists
4. Check fields:
   - name: "Update token balance API to use Bearer authentication"
   - estimated_time: "30 minutes"
   - dependencies: [] (empty - parallel)
   - why: Contains "CRITICAL CORRECTION #2"
5. Verify Bearer authentication explanation present

**Expected Result**: ✅ BUG-002B task complete and correct

**Actual Result**: _____________________________

**Status**: [ ] PASS [ ] FAIL

---

### Test 20: BUG-002C Task Added
**Category**: TOML Validation
**Priority**: HIGH
**Commit**: Local changes (gitignored)

**Steps**:
1. Open `internal/sprints/ACTIVE_SPRINT_17.1_BUGS.toml`
2. Navigate to lines 591-725
3. Verify `[tasks.BUG-002C]` section exists
4. Check fields:
   - name: "Update license key format validation"
   - estimated_time: "15 minutes"
   - dependencies: [] (empty - parallel)
   - why: Contains "CRITICAL CORRECTION #3"
5. Verify license key format explanation (XXXX-XXXX-XXXX-XXXX)

**Expected Result**: ✅ BUG-002C task complete and correct

**Actual Result**: _____________________________

**Status**: [ ] PASS [ ] FAIL

---

### Test 21: BUG-002 Dependencies Fixed
**Category**: TOML Validation
**Priority**: CRITICAL
**Commit**: Local changes (gitignored)

**Steps**:
1. Open `internal/sprints/ACTIVE_SPRINT_17.1_BUGS.toml`
2. Navigate to `[tasks.BUG-002]` (around line 180)
3. Find dependencies field (line 310)
4. Verify array contains:
   ```toml
   dependencies = ["BUG-002A", "BUG-002B", "BUG-002C", "BUG-003"]
   ```
5. Verify all 4 dependencies present (was missing BUG-003)

**Expected Result**: ✅ BUG-002 dependencies complete

**Actual Result**: _____________________________

**Status**: [ ] PASS [ ] FAIL

---

### Test 22: BUG-003 Dependencies Fixed
**Category**: TOML Validation
**Priority**: HIGH
**Commit**: Local changes (gitignored)

**Steps**:
1. Open `internal/sprints/ACTIVE_SPRINT_17.1_BUGS.toml`
2. Navigate to `[tasks.BUG-003]` (around line 750)
3. Find dependencies field (line 825)
4. Verify array contains:
   ```toml
   dependencies = ["BUG-002A", "BUG-002B", "BUG-002C"]
   ```
5. Verify all 3 corrections present

**Expected Result**: ✅ BUG-003 dependencies complete

**Actual Result**: _____________________________

**Status**: [ ] PASS [ ] FAIL

---

### Test 23: ENHANCE-001 Contradiction Fixed
**Category**: TOML Validation
**Priority**: HIGH
**Commit**: Local changes (gitignored)

**Steps**:
1. Open `internal/sprints/ACTIVE_SPRINT_17.1_BUGS.toml`
2. Navigate to `[tasks.ENHANCE-001]` (around line 2127)
3. Read success_impact field
4. Verify says "PromptEnhancer is central intelligence hub"
5. Verify does NOT say "TaskAnalyzer is central hub"
6. Check files_to_modify focuses on PromptEnhancer
7. Check test_files includes promptEnhancer.test.ts

**Expected Result**: ✅ ENHANCE-001 consistently says PromptEnhancer

**Actual Result**: _____________________________

**Status**: [ ] PASS [ ] FAIL

---

### Test 24: Progress Tracking Updated
**Category**: TOML Validation
**Priority**: MEDIUM
**Commit**: Local changes (gitignored)

**Steps**:
1. Open `internal/sprints/ACTIVE_SPRINT_17.1_BUGS.toml`
2. Navigate to `[progress]` section (around line 2601)
3. Verify fields:
   - total_tasks = 18
   - completed_tasks = 1 (BUG-001)
   - completion_percentage = 6
4. Calculate: (1 / 18) * 100 = 5.55% → rounds to 6%

**Expected Result**: ✅ Progress tracking correct

**Actual Result**: _____________________________

**Status**: [ ] PASS [ ] FAIL

---

## Regression Testing

### Test 25: Existing Tasks Still Load
**Category**: Sprint Panel UI
**Priority**: HIGH
**Commit**: 3f05ea9

**Steps**:
1. Open Sprint Panel
2. Verify all 18 tasks display
3. Check tasks without enhanced_prompt field still show
4. Click "View Details" on tasks: BUG-003, BUG-004, BUG-005
5. Verify details panel loads correctly

**Expected Result**: ✅ All tasks display and load correctly

**Actual Result**: _____________________________

**Status**: [ ] PASS [ ] FAIL

---

### Test 26: Voice Recording Still Works
**Category**: Extension Functionality
**Priority**: HIGH
**Commit**: N/A (no changes to voice)

**Steps**:
1. Open ÆtherLight sidebar
2. Go to Voice tab
3. Click "Start Recording" button
4. Speak test phrase: "This is a test"
5. Stop recording
6. Verify transcription appears

**Expected Result**: ✅ Voice recording works normally

**Actual Result**: _____________________________

**Status**: [ ] PASS [ ] FAIL

---

### Test 27: Start Next Task Still Works
**Category**: Extension Functionality
**Priority**: HIGH
**Commit**: N/A (no changes to Start Next Task)

**Steps**:
1. Open Sprint Panel
2. Click "Start Next Task" button
3. Verify enhanced prompt generates
4. Verify prompt loads into Voice text area
5. Check for errors

**Expected Result**: ✅ Start Next Task works normally

**Actual Result**: _____________________________

**Status**: [ ] PASS [ ] FAIL

---

### Test 28: Code Analyzer Still Works (BUG-001 Fix)
**Category**: Extension Functionality
**Priority**: CRITICAL
**Commit**: 67f2d6a

**Steps**:
1. Open Code Analyzer
2. Select a codebase file
3. Click "Analyze" button
4. Verify analysis modal opens
5. Check for config.agents errors
6. Test in both new workspace and existing workspace

**Expected Result**: ✅ Code Analyzer works in all scenarios

**Actual Result**: _____________________________

**Status**: [ ] PASS [ ] FAIL

---

### Test 29: Sprint Planner Still Works
**Category**: Extension Functionality
**Priority**: HIGH
**Commit**: N/A (no changes to Sprint Planner)

**Steps**:
1. Open Sprint Planner
2. Verify sprint planning modal loads
3. Check for config.agents errors
4. Test basic planning flow

**Expected Result**: ✅ Sprint Planner works normally

**Actual Result**: _____________________________

**Status**: [ ] PASS [ ] FAIL

---

### Test 30: Task Status Changes Still Work
**Category**: Sprint Panel UI
**Priority**: HIGH
**Commit**: N/A (no changes to status)

**Steps**:
1. Open Sprint Panel
2. Find a pending task
3. Click "Start Task" button
4. Verify status changes to in_progress
5. Click "Mark Complete"
6. Verify status changes to completed

**Expected Result**: ✅ Task status changes work normally

**Actual Result**: _____________________________

**Status**: [ ] PASS [ ] FAIL

---

### Test 31: Sprint Filtering Still Works
**Category**: Sprint Panel UI
**Priority**: MEDIUM
**Commit**: N/A (no changes to filtering)

**Steps**:
1. Open Sprint Panel
2. Toggle "Show Completed" checkbox
3. Verify BUG-001 appears/disappears
4. Test phase filter dropdown
5. Test engineer filter dropdown
6. Test "Group By" dropdown

**Expected Result**: ✅ All filters work normally

**Actual Result**: _____________________________

**Status**: [ ] PASS [ ] FAIL

---

### Test 32: Terminal Selection Still Works
**Category**: Extension Functionality
**Priority**: HIGH
**Commit**: N/A (no changes to terminals)

**Steps**:
1. Open Voice tab
2. Click terminal dropdown
3. Verify terminals list populates
4. Select a terminal
5. Enter text in voice area
6. Click "Send"
7. Verify text appears in selected terminal

**Expected Result**: ✅ Terminal selection works normally

**Actual Result**: _____________________________

**Status**: [ ] PASS [ ] FAIL

---

### Test 33: Pattern Library Still Accessible
**Category**: Extension Functionality
**Priority**: LOW
**Commit**: N/A (no changes to patterns)

**Steps**:
1. Open ÆtherLight sidebar
2. Go to Patterns tab (if exists)
3. Verify patterns load
4. Test pattern search/filtering

**Expected Result**: ✅ Pattern library accessible

**Actual Result**: _____________________________

**Status**: [ ] PASS [ ] FAIL

---

### Test 34: Settings Still Work
**Category**: Extension Functionality
**Priority**: MEDIUM
**Commit**: N/A (no changes to settings)

**Steps**:
1. Open VS Code Settings
2. Search for "ÆtherLight"
3. Verify extension settings appear
4. Try changing a setting
5. Verify change persists

**Expected Result**: ✅ Settings work normally

**Actual Result**: _____________________________

**Status**: [ ] PASS [ ] FAIL

---

## Test Credentials

### Website API (for future BUG-002A/B/C testing)
- **Base URL**: `https://aetherlight.ai` (production) or test environment
- **Test License Keys**:
  - Free Tier: `CD7W-AJDK-RLQT-LUFA`
  - Pro Tier: `W7HD-X79Q-CQJ9-XW13`
- **API Endpoints**:
  - License Validation: `POST /api/license/validate`
  - Token Balance: `GET /api/tokens/balance` (Authorization: Bearer {key})
  - Transcription: `POST /api/desktop/transcribe` (Authorization: Bearer {key})

**Note**: These credentials are for testing the FIXES (BUG-002A/B/C), not part of v0.17.2 testing.

---

## Test Checklist

### Pre-Testing Setup
- [ ] Pull latest changes from feature/v0.17.2-bug-fixes branch
- [ ] Run `npm install` in vscode-lumina directory
- [ ] Run `npm run compile` to ensure compilation succeeds
- [ ] Verify enhanced prompt files exist locally
- [ ] Read this testing document completely

### Critical Path Tests (Must Pass)
- [ ] Test 1: Extension Compilation
- [ ] Test 2: Extension Activation
- [ ] Test 3: Sprint Panel Opens
- [ ] Test 4: BUG-001 Fix (Missing Config Safety Check)
- [ ] Test 5: Enhanced Prompt Display in Task Details
- [ ] Test 6: Open Enhanced Prompt Button
- [ ] Test 10: Sprint TOML Validation

### Enhanced Prompt System Tests (High Priority)
- [ ] Test 7: Enhanced Prompt Content Validation
- [ ] Test 8: Template Updates Validation
- [ ] Test 11: SprintTask Interface Update
- [ ] Test 12: SprintRenderer Enhanced Prompt Section
- [ ] Test 13: voicePanel Message Handler
- [ ] Test 14: voicePanel JavaScript Function
- [ ] Test 15: Enhanced Prompt Opens from Different Tasks
- [ ] Test 18: Enhanced Prompt File Exists

### Sprint TOML Tests (High Priority)
- [ ] Test 9: Sprint TOML Enhanced Prompt Field
- [ ] Test 19: BUG-002B Task Added
- [ ] Test 20: BUG-002C Task Added
- [ ] Test 21: BUG-002 Dependencies Fixed
- [ ] Test 22: BUG-003 Dependencies Fixed
- [ ] Test 23: ENHANCE-001 Contradiction Fixed
- [ ] Test 24: Progress Tracking Updated

### Regression Tests (Must Pass)
- [ ] Test 25: Existing Tasks Still Load
- [ ] Test 26: Voice Recording Still Works
- [ ] Test 27: Start Next Task Still Works
- [ ] Test 28: Code Analyzer Still Works (BUG-001 Fix)
- [ ] Test 30: Task Status Changes Still Work

### Optional Tests (Nice to Have)
- [ ] Test 16: Enhanced Prompt Button Not Shown When Field Missing
- [ ] Test 17: WebView Console Errors
- [ ] Test 29: Sprint Planner Still Works
- [ ] Test 31: Sprint Filtering Still Works
- [ ] Test 32: Terminal Selection Still Works
- [ ] Test 33: Pattern Library Still Accessible
- [ ] Test 34: Settings Still Work

---

## Test Results Summary

**Tester**: _____________________________

**Date**: _____________________________

**Environment**:
- OS: _____________________________
- VS Code Version: _____________________________
- Node Version: _____________________________
- Extension Version: 0.17.2

**Results**:
- Total Tests Run: _____ / 34
- Tests Passed: _____
- Tests Failed: _____
- Tests Skipped: _____

**Critical Tests Status**:
- [ ] All Critical Path tests passed
- [ ] All Enhanced Prompt System tests passed
- [ ] All Sprint TOML tests passed
- [ ] All Regression tests passed

**Blockers Found**: _____________________________

**Notes**: _____________________________

---

## Sign-Off

- [ ] **Developer**: Changes implemented and self-tested
- [ ] **QA**: All tests executed and documented
- [ ] **Product Owner**: Acceptance criteria met

**Ready for Release**: [ ] YES [ ] NO

**Concerns/Notes**: _____________________________

---

**Document Version**: 1.0
**Last Updated**: 2025-11-12
**Next Update**: After testing completion
