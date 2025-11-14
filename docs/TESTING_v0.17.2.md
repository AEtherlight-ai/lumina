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
3. **BUG-002 License Validation** - Complete authentication system for desktop app
4. **Template System Updates** - Enhanced template with agent/skill tracking
5. **UI-001 Sprint Panel Enhancements** - Display enhanced TOML metadata fields in UI
6. **INFRA-003 Document Linking System** - Automated task document linking enforcement

**Goals**:
- Verify enhanced prompt system displays correctly in Sprint Panel
- Validate sprint TOML updates (BUG-002A/B/C additions)
- Test license validation backend and frontend (BUG-002)
- Verify desktop app authentication integration is complete
- Confirm template improvements for future task generation
- Test UI-001 metadata display (completion_notes, questions_doc, test_plan, design_doc, pattern_reference)
- Verify INFRA-003 document linking enforcement (pre-commit hooks)
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

### Commit 3: License Validation Flow Implementation (BUG-002)
**Commit**: `92289e6`
**Date**: 2025-01-13
**Branch**: feature/v0.17.2-bug-fixes
**Message**: `feat(desktop): Implement license validation flow on first launch (BUG-002)`

**Changes**:

#### Backend (Rust):
1. **New File**: `products/lumina-desktop/src-tauri/src/auth.rs` (260 lines)
   - `generate_device_fingerprint()`: SHA-256 hash of OS + CPU + MAC address
   - `validate_license_key()`: POST /api/license/validate with error handling
   - `LicenseValidationResponse` struct
   - 5 unit tests + 2 integration tests

2. **Modified**: `products/lumina-desktop/src-tauri/src/main.rs`
   - Added `mod auth;` declaration (line 48)
   - Added `activate_license()` Tauri command (lines 740-799)
   - Registered command in invoke_handler (line 1959)
   - Added first-launch detection (lines 1955-1967)

3. **Modified**: `products/lumina-desktop/src-tauri/Cargo.toml`
   - Added `sha2 = "0.10"` (SHA-256 hashing)
   - Added `mac_address = "1.1"` (MAC address retrieval)
   - Added `tempfile = "3.8"` (dev-dependency for tests)

#### Frontend (React/TypeScript):
1. **New File**: `products/lumina-desktop/src/components/LicenseActivationDialog.tsx` (240 lines)
   - Blocking modal dialog (dark theme)
   - License key input with validation
   - Error display with detailed messages
   - Loading states
   - Help section with dashboard link

**Testing**: See Tests 36-40 (BUG-002)
- [ ] Test 36: License Validation Backend Module
- [ ] Test 37: License Validation Tauri Command
- [ ] Test 38: License Activation Dialog Component
- [ ] Test 39: Cargo.toml Dependencies
- [ ] Test 40: Integration Test with Live API (Optional)

---

### Commit 4: Sprint TOML Update (BUG-002)
**Commit**: `75843dd`
**Date**: 2025-01-13
**Branch**: feature/v0.17.2-bug-fixes
**Message**: `chore(sprint): Mark BUG-002 as completed in Sprint TOML`

**Changes**:
- **Modified**: `internal/sprints/ACTIVE_SPRINT_17.1_BUGS.toml`
  - Changed status from `pending` to `completed`
  - Added `completed_date = "2025-01-13"`
  - Added `commit_hash = "92289e6"`
  - Added comprehensive `completion_notes` (110 lines)
    - Implementation summary
    - Backend/frontend implementation details
    - API integration details
    - Testing results (5 unit tests passing)
    - Device fingerprint details
    - User flow documentation
    - Next steps
    - Pattern compliance checklist

**Testing**: See Test 41 (BUG-002 Sprint TOML)
- [ ] Test 41: BUG-002 Sprint TOML Completion Status

---

### Commit 5: Extension License Key Validation (BUG-011)
**Commit**: `38766e4`
**Date**: 2025-11-13
**Branch**: feature/v0.17.2-bug-fixes
**Message**: `feat(extension): Add license key validation with Bearer token pattern (BUG-011)`

**Changes**:

#### Files Created (TDD Approach):
1. **`vscode-lumina/src/auth/licenseValidator.ts`** (~200 lines)
   - Bearer token authentication with `GET /api/tokens/balance`
   - 24-hour caching for API efficiency
   - 2-second timeout with graceful offline mode
   - Comprehensive error handling (401, 429, network errors)

2. **`vscode-lumina/src/auth/tierGate.ts`** (~130 lines)
   - Feature access control based on subscription tier
   - Free tier: All features EXCEPT voice capture
   - Paid tiers (network/pro/enterprise): All features enabled
   - Offline mode: Same as free tier

3. **`vscode-lumina/src/test/auth/licenseValidator.test.ts`** (10 tests)
   - Valid free/pro tier license keys
   - Invalid key handling (401)
   - Network error handling with offline fallback
   - Timeout handling
   - 24-hour caching validation
   - Rate limiting (429)

4. **`vscode-lumina/src/test/auth/tierGate.test.ts`** (9 tests)
   - Free tier blocks voice capture
   - Paid tiers allow voice capture
   - Offline mode blocks voice capture
   - Feature gate validation for all tiers

#### Files Modified:
1. **`vscode-lumina/package.json`** (configuration properties)
   - Added `aetherlight.licenseKey` setting
   - Added `aetherlight.userTier` setting (enum: free/network/pro/enterprise/offline)

2. **`vscode-lumina/src/extension.ts`** (lines 36-37, 267-394, 615-690)
   - License validation flow on every activation
   - First-time activation prompt ("Enter License Key" / "Get Free Tier")
   - Tier status bar display (icon + tier name + tooltip)
   - TierGate storage in context for command access

3. **`vscode-lumina/src/commands/captureVoice.ts`** (lines 81-108)
   - Tier gate check before voice capture
   - Upgrade prompts for free tier users

4. **`vscode-lumina/src/commands/captureVoiceGlobal.ts`** (lines 28-55)
   - Tier gate check for global voice capture
   - Consistent gating logic with captureVoice

5. **`vscode-lumina/src/commands/voicePanel.ts`** (bug fix at 4946-4952)
   - Fixed orphaned methods outside class (compilation error)

**Test Credentials**:
- Free tier: `CD7W-AJDK-RLQT-LUFA`
- Pro tier: `W7HD-X79Q-CQJ9-XW13`

**Patterns**:
- Pattern-AUTH-001 (Bearer token authentication)
- Pattern-FEATURE-GATING-001 (Tier-based feature access)
- Pattern-UI-004 (Tier status bar indicator)
- Pattern-CODE-001 (Code workflow)
- Pattern-TDD-001 (Test-driven development)

**Testing**: See Tests 48-56 (BUG-011 License Validation)
- [ ] Test 48: Extension First-Time Activation Prompt
- [ ] Test 49: License Key Validation (Free Tier)
- [ ] Test 50: License Key Validation (Pro Tier)
- [ ] Test 51: Invalid License Key Handling
- [ ] Test 52: Tier Status Bar Display
- [ ] Test 53: Voice Capture Gating (Free Tier Blocked)
- [ ] Test 54: Voice Capture Gating (Pro Tier Allowed)
- [ ] Test 55: Offline Mode Graceful Degradation
- [ ] Test 56: BUG-011 Sprint TOML Completion Status

---

### Commit 6: BUG-011 Code Audit Report
**Commit**: `281ec53`
**Date**: 2025-11-13
**Branch**: feature/v0.17.2-bug-fixes
**Message**: `docs(audit): Add BUG-011 code audit report - PASSED with zero issues`

**Changes**:
- **Created**: `internal/sprints/audits/BUG-011_AUDIT.md` (477 lines)
  - Comprehensive audit of all BUG-011 implementation
  - Validated: Zero merge conflicts, zero errors
  - Status: PASSED - Approved for production
- **Modified**: `internal/sprints/ACTIVE_SPRINT_17.1_BUGS.toml`
  - Added `audit_report_doc` link
  - Added `audit_status = "PASSED"`
  - Added `audit_date = "2025-11-13"`

**Testing**: Audit validated all code - no additional testing required

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

### Category 6: Desktop App Functionality
**Priority**: CRITICAL
**Tests**: 13 (Tests 35-47 - BUG-002A, BUG-002, BUG-008, BUG-009, BUG-010)
**Time**: 50 minutes

**Total Tests**: 47
**Total Time**: ~135 minutes (2.25 hours)

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

### Test 35: BUG-002A - TranscriptionResponse Struct Migration
**Category**: Desktop App Functionality
**Priority**: CRITICAL
**Commit**: 835ba2d

**Steps**:
1. Navigate to `products/lumina-desktop/src-tauri/src/transcription.rs`
2. Verify TranscriptionResponse struct (lines 33-41) contains:
   - `success: bool`
   - `text: String`
   - `duration_seconds: u64`
   - `tokens_used: u64`
   - `tokens_balance: u64`
   - `transaction_id: String`
3. Run unit tests: `cd products/lumina-desktop/src-tauri && cargo test transcription`
4. Verify both tests pass:
   - `test_transcription_response_deserialization_success`
   - `test_transcription_response_deserialization_failure`
5. Check test code (lines 382-424) matches API contract
6. Verify struct comments reference API endpoint (website/app/api/desktop/transcribe/route.ts:338-345)

**Expected Result**: ✅ Struct uses token-based fields (NOT USD), all tests pass

**Actual Result**: _____________________________

**Status**: [ ] PASS [ ] FAIL

---

### Test 36: BUG-002 - License Validation Backend Module
**Category**: Desktop App Functionality
**Priority**: CRITICAL
**Commit**: 92289e6

**Steps**:
1. Navigate to `products/lumina-desktop/src-tauri/src/auth.rs`
2. Verify file exists (260 lines)
3. Check function signatures:
   - `generate_device_fingerprint() -> Result<String>`
   - `validate_license_key(license_key: &str, api_url: &str) -> Result<LicenseValidationResponse>`
4. Verify LicenseValidationResponse struct fields (lines 91-99):
   - `valid: bool`
   - `user_id: String`
   - `device_id: String`
   - `tier: String`
   - `storage_limit_mb: u64`
   - `user_name: String`
   - `message: String`
5. Run unit tests: `cd products/lumina-desktop/src-tauri && cargo test auth`
6. Verify 5 unit tests pass:
   - `test_fingerprint_consistency` ✅
   - `test_fingerprint_length` ✅
   - `test_fingerprint_not_empty` ✅
   - `test_empty_license_key` ✅
   - `test_whitespace_license_key` ✅
7. Verify 2 integration tests are marked #[ignore]:
   - `test_valid_license_key_free_tier`
   - `test_invalid_license_key`
8. Check comments explain device fingerprint approach (OS + CPU + MAC → SHA-256)

**Expected Result**: ✅ auth.rs module exists, all unit tests pass (5/5), integration tests present

**Actual Result**: _____________________________

**Status**: [ ] PASS [ ] FAIL

---

### Test 37: BUG-002 - License Validation Tauri Command
**Category**: Desktop App Functionality
**Priority**: CRITICAL
**Commit**: 92289e6

**Steps**:
1. Navigate to `products/lumina-desktop/src-tauri/src/main.rs`
2. Verify `mod auth;` declaration exists (line 48)
3. Verify `activate_license()` Tauri command exists (lines 740-799):
   - Signature: `async fn activate_license(license_key: String) -> Result<String, String>`
   - Uses `auth::validate_license_key()` function
   - Saves settings on success (license_key, user_id, device_id, tier)
   - Returns success message with user name and tier
4. Verify command registration in invoke_handler (line 1959):
   ```rust
   .invoke_handler(tauri::generate_handler![
       ...
       activate_license,  // BUG-002
       ...
   ])
   ```
5. Verify first-launch detection logic (lines 1955-1967):
   - Checks if `settings.license_key.is_empty()`
   - Logs warning with dashboard link
6. Run `cargo check` to verify compilation: `cd products/lumina-desktop/src-tauri && cargo check`

**Expected Result**: ✅ activate_license command exists, registered, first-launch detection added, cargo check succeeds

**Actual Result**: _____________________________

**Status**: [ ] PASS [ ] FAIL

---

### Test 38: BUG-002 - License Activation Dialog Component
**Category**: Desktop App Functionality
**Priority**: CRITICAL
**Commit**: 92289e6

**Steps**:
1. Navigate to `products/lumina-desktop/src/components/LicenseActivationDialog.tsx`
2. Verify file exists (240 lines)
3. Check component interface:
   - Accepts `onActivated: () => void` callback
   - Uses React hooks: `useState` for licenseKey, error, isActivating
4. Verify UI elements exist:
   - Header: "Activate ÆtherLight Desktop"
   - Input field with placeholder "XXXX-XXXX-XXXX-XXXX"
   - Error display (conditional rendering based on error state)
   - "Activate Device" button (disabled when empty or activating)
   - Help section with dashboard link (https://aetherlight.ai/dashboard)
5. Check activation logic (handleActivate function):
   - Validates input (not empty)
   - Calls `invoke<string>('activate_license', { licenseKey })`
   - Shows success alert on completion
   - Calls `onActivated()` callback
   - Handles errors and displays error message
6. Verify styling:
   - Dark theme (#1e1e1e background)
   - Monospace font for license key input
   - Red error borders/backgrounds
7. Check Enter key support (handleKeyPress function)

**Expected Result**: ✅ Component exists, has all UI elements, proper error handling, dark theme styling

**Actual Result**: _____________________________

**Status**: [ ] PASS [ ] FAIL

---

### Test 39: BUG-002 - Cargo.toml Dependencies
**Category**: Desktop App Functionality
**Priority**: HIGH
**Commit**: 92289e6

**Steps**:
1. Navigate to `products/lumina-desktop/src-tauri/Cargo.toml`
2. Verify license validation dependencies added (lines 39-41):
   ```toml
   # License validation (BUG-002)
   sha2 = "0.10"  # SHA-256 hashing for device fingerprint
   mac_address = "1.1"  # MAC address retrieval for device fingerprint
   ```
3. Verify dev-dependencies section added (lines 67-68):
   ```toml
   [dev-dependencies]
   tempfile = "3.8"  # Temporary directories for tests
   ```
4. Check comments explain purpose of each dependency
5. Run `cargo build` to verify dependencies resolve: `cd products/lumina-desktop/src-tauri && cargo build`

**Expected Result**: ✅ Dependencies added with comments, cargo build succeeds

**Actual Result**: _____________________________

**Status**: [ ] PASS [ ] FAIL

---

### Test 40: BUG-002 - Integration Test with Live API (Optional)
**Category**: Desktop App Functionality
**Priority**: LOW (Optional)
**Commit**: 92289e6

**Prerequisites**:
- Internet connection required
- Test license key: `CD7W-AJDK-RLQT-LUFA` (free tier)
- API endpoint: `POST https://aetherlight.ai/api/license/validate`

**Steps**:
1. Run integration tests: `cd products/lumina-desktop/src-tauri && cargo test -- --ignored`
2. This will run:
   - `test_valid_license_key_free_tier` - Validates with CD7W-AJDK-RLQT-LUFA
   - `test_invalid_license_key` - Validates with fake key (expects 404)
3. Verify test results:
   - Valid key test: PASS or expected 403 (already activated)
   - Invalid key test: PASS (expects error)

**Expected Result**: ✅ Integration tests run (may fail if already activated - that's expected)

**Actual Result**: _____________________________

**Status**: [ ] PASS [ ] FAIL [ ] SKIPPED (No internet/API unavailable)

**Notes**: This test may fail with 403 "Already activated" if the test license key is already in use. This is expected behavior and validates that the API integration works correctly.

---

### Test 41: BUG-002 - Sprint TOML Completion Status
**Category**: Sprint TOML Updates
**Priority**: HIGH
**Commit**: 75843dd

**Steps**:
1. Navigate to `internal/sprints/ACTIVE_SPRINT_17.1_BUGS.toml`
2. Find `[tasks.BUG-002]` section (line 158)
3. Verify status updated:
   - `status = "completed"` (was "pending")
   - `completed_date = "2025-01-13"`
   - `commit_hash = "92289e6"`
4. Verify completion_notes section exists (lines 320-432):
   - Implementation summary
   - Backend implementation details
   - Frontend implementation details
   - API integration details
   - Testing results (5 unit tests passing)
   - Device fingerprint details
   - User flow documentation
   - Next steps
   - Pattern compliance checklist
5. Check completion_notes mentions all deliverables:
   - auth.rs module (260 lines)
   - activate_license() command
   - LicenseActivationDialog component (240 lines)
   - Dependencies added (sha2, mac_address, tempfile)
   - 5 unit tests + 2 integration tests

**Expected Result**: ✅ BUG-002 marked completed with comprehensive completion_notes

**Actual Result**: _____________________________

**Status**: [ ] PASS [ ] FAIL

---

### Test 42: BUG-008 - Code Analyzer Modal (Verification - BUG-010)
**Category**: Desktop App Functionality
**Priority**: CRITICAL
**Commit**: adbf0cf
**Dependencies**: BUG-001 (TaskAnalyzer safety check)

**Steps**:
1. Launch Extension Development Host (F5 in VS Code)
2. Open Voice Panel (click ÆtherLight icon in sidebar)
3. Click "Code Analyzer" button (left toolbar)
4. Verify modal opens with Q&A form
5. Fill form fields:
   - Languages: TypeScript, JavaScript (multi-select with Ctrl/Cmd)
   - Frameworks: React
   - Focus Area: Architecture Review
   - Complexity: Moderate
   - Concerns: (leave blank or add text)
6. Click "✨ Enhance" button
7. Verify modal closes
8. Verify enhanced code analysis prompt appears in main text area
9. Open browser console (Ctrl+Shift+I in webview)
10. Verify no console errors

**Test Workspace 1: No config.json**
- [ ] Modal opens (no crash, no TypeError)
- [ ] Form fields visible and functional
- [ ] Multi-select works (Ctrl/Cmd + click)
- [ ] Enhance button works
- [ ] Modal closes after enhance
- [ ] Enhanced prompt appears in text area
- [ ] No console errors

**Test Workspace 2: With config.json**
- Create `.aetherlight/config.json` with:
  ```json
  {
    "agents": {
      "infrastructure-agent": {
        "name": "Infrastructure Agent",
        "focus": "Infrastructure, CI/CD"
      }
    }
  }
  ```
- [ ] Modal opens successfully
- [ ] Q&A flow works
- [ ] Enhanced prompt generated
- [ ] No console errors

**Expected Result**: ✅ Code Analyzer modal works in all scenarios, no crashes

**Actual Result**: _____________________________

**Status**: [ ] PASS [ ] FAIL

---

### Test 43: BUG-009 - Sprint Planner Modal (Verification - BUG-010)
**Category**: Desktop App Functionality
**Priority**: CRITICAL
**Commit**: 229c172
**Dependencies**: BUG-001 (TaskAnalyzer safety check)

**Steps**:
1. Launch Extension Development Host (F5 in VS Code)
2. Open Voice Panel
3. Click "Sprint Planner" button (left toolbar)
4. Verify modal opens with Q&A form
5. Fill form fields:
   - Sprint Duration: 2 Weeks (dropdown)
   - Team Size: 5 (number input)
   - Sprint Goals: "Implement authentication and fix installation UX" (textarea)
   - Priorities: New Features, Bug Fixes (multi-select with Ctrl/Cmd)
   - Additional Context: "Sprint 17.1, focus on desktop app stability" (optional)
6. Click "✨ Enhance" button
7. Verify modal closes
8. Verify enhanced sprint plan appears in main text area
9. Check console for errors

**Test Workspace 1: No config.json**
- [ ] Modal opens (no crash, no TypeError)
- [ ] Form fields visible and functional
- [ ] Multi-select priorities works (Ctrl/Cmd + click)
- [ ] Enhance button works
- [ ] Modal closes after enhance
- [ ] Enhanced sprint plan appears in text area
- [ ] No console errors

**Test Workspace 2: With config.json**
- Use same config.json from Test 42
- [ ] Modal opens successfully
- [ ] Q&A flow works
- [ ] Enhanced plan generated
- [ ] No console errors

**Expected Result**: ✅ Sprint Planner modal works in all scenarios, no crashes

**Actual Result**: _____________________________

**Status**: [ ] PASS [ ] FAIL

---

### Test 44: BUG-010 - Edge Case: Empty config.json
**Category**: Desktop App Functionality
**Priority**: HIGH
**Commit**: BUG-010 verification
**Dependencies**: BUG-001, BUG-008, BUG-009

**Steps**:
1. Create new test workspace: `test-workspace-empty-config`
2. Create `.aetherlight/config.json` with content: `{}`
3. Open Voice Panel
4. Click "Code Analyzer" button
5. Verify modal opens (should not crash)
6. Click "Sprint Planner" button
7. Verify modal opens (should not crash)
8. Check console for errors

**Expected Results**:
- [ ] Code Analyzer modal opens (no crash)
- [ ] Sprint Planner modal opens (no crash)
- [ ] No console errors related to missing agents
- [ ] Graceful degradation (modals work without agents config)

**Actual Result**: _____________________________

**Status**: [ ] PASS [ ] FAIL

---

### Test 45: BUG-010 - Edge Case: Malformed config.json
**Category**: Desktop App Functionality
**Priority**: HIGH
**Commit**: BUG-010 verification
**Dependencies**: BUG-001, BUG-008, BUG-009

**Steps**:
1. Create new test workspace: `test-workspace-malformed-config`
2. Create `.aetherlight/config.json` with invalid JSON: `{ "agents": { "foo": }`
3. Open Voice Panel
4. Click "Code Analyzer" button
5. Verify modal opens (graceful error handling)
6. Check console for parse error (expected)
7. Verify modal still functions despite parse error

**Expected Results**:
- [ ] Modal opens (graceful degradation)
- [ ] Parse error logged to console (but no crash)
- [ ] Q&A flow completes successfully
- [ ] Enhanced prompt generated

**Actual Result**: _____________________________

**Status**: [ ] PASS [ ] FAIL

---

### Test 46: BUG-010 - Edge Case: Multiple Rapid Modal Opens
**Category**: Desktop App Functionality
**Priority**: MEDIUM
**Commit**: BUG-010 verification
**Dependencies**: BUG-001, BUG-008, BUG-009

**Steps**:
1. Open Voice Panel in test workspace (no config.json)
2. Click "Code Analyzer" button 3 times rapidly (as fast as possible)
3. Verify only one modal visible at a time
4. Close modal
5. Click "Sprint Planner" button 3 times rapidly
6. Verify no race conditions or duplicate modals
7. Check console for errors

**Expected Results**:
- [ ] Only one modal visible at a time
- [ ] No race conditions
- [ ] No duplicate modals
- [ ] No console errors

**Actual Result**: _____________________________

**Status**: [ ] PASS [ ] FAIL

---

### Test 47: BUG-010 - Modal Form Validation
**Category**: Desktop App Functionality
**Priority**: HIGH
**Commit**: BUG-010 verification
**Dependencies**: BUG-008, BUG-009

**Steps**:
1. Open Code Analyzer modal
2. Leave all fields empty (don't select any languages)
3. Click "✨ Enhance" button
4. Verify error message appears: "⚠️ Please select at least one programming language"
5. Verify modal stays open (doesn't close)
6. Close modal
7. Open Sprint Planner modal
8. Leave "Sprint Duration" empty
9. Click "✨ Enhance" button
10. Verify error message appears: "⚠️ Please select a sprint duration"
11. Fill duration but leave "Sprint Goals" empty
12. Click "✨ Enhance" button
13. Verify error message appears: "⚠️ Please enter sprint goals"
14. Enter team size = 0
15. Click "✨ Enhance" button
16. Verify error message appears: "⚠️ Team size must be at least 1"

**Expected Results**:
- [ ] Code Analyzer validates at least one language required
- [ ] Sprint Planner validates duration required
- [ ] Sprint Planner validates goals required
- [ ] Sprint Planner validates positive team size
- [ ] All error messages display correctly
- [ ] Modal stays open on validation failure

**Actual Result**: _____________________________

**Status**: [ ] PASS [ ] FAIL

---

### Test 48: BUG-011 - Extension First-Time Activation Prompt
**Category**: Extension Functionality
**Priority**: CRITICAL
**Commit**: 38766e4
**Dependencies**: None

**Steps**:
1. Clear extension settings: Run command palette → "Preferences: Open User Settings (JSON)"
2. Remove any existing `aetherlight.licenseKey` and `aetherlight.userTier` entries
3. Reload VS Code window (Cmd/Ctrl+R)
4. Observe extension activation
5. Verify prompt appears: "Welcome to ÆtherLight! Please enter your license key to continue."
6. Verify two buttons: "Enter License Key" and "Get Free Tier"
7. Click "Get Free Tier"
8. Verify message: "ÆtherLight activated with Free tier. Voice capture disabled. Upgrade at aetherlight.ai"

**Expected Results**:
- [ ] First-time prompt appears on activation
- [ ] Two options presented: Enter License Key / Get Free Tier
- [ ] "Get Free Tier" activates extension with free tier
- [ ] Tier set to 'free' in settings
- [ ] Status bar shows "🛡️ Free"

**Actual Result**: _____________________________

**Status**: [ ] PASS [ ] FAIL

---

### Test 49: BUG-011 - License Key Validation (Free Tier)
**Category**: Extension Functionality
**Priority**: CRITICAL
**Commit**: 38766e4
**Test Credential**: `CD7W-AJDK-RLQT-LUFA` (Free tier)

**Steps**:
1. Clear extension settings (remove licenseKey and userTier)
2. Reload VS Code window
3. When prompt appears, click "Enter License Key"
4. Enter free tier key: `CD7W-AJDK-RLQT-LUFA`
5. Press Enter
6. Wait for validation (2 seconds max)
7. Check status bar for tier display
8. Verify tooltip shows "ÆtherLight Tier: free" and "Voice Capture: ❌ Disabled (Upgrade Required)"
9. Check settings: Verify `aetherlight.licenseKey` = entered key
10. Check settings: Verify `aetherlight.userTier` = "free"

**Expected Results**:
- [ ] License key accepted and validated
- [ ] Status bar shows "🛡️ Free"
- [ ] Tooltip shows tier = free and voice capture disabled
- [ ] Settings updated with license key and tier
- [ ] No error messages shown
- [ ] Validation completes in < 2 seconds

**Actual Result**: _____________________________

**Status**: [ ] PASS [ ] FAIL

---

### Test 50: BUG-011 - License Key Validation (Pro Tier)
**Category**: Extension Functionality
**Priority**: CRITICAL
**Commit**: 38766e4
**Test Credential**: `W7HD-X79Q-CQJ9-XW13` (Pro tier)

**Steps**:
1. Open settings JSON: Command palette → "Preferences: Open User Settings (JSON)"
2. Update license key: `"aetherlight.licenseKey": "W7HD-X79Q-CQJ9-XW13"`
3. Save settings and reload VS Code window
4. Check status bar after activation
5. Verify tier shows "⭐ Pro" (green color)
6. Hover over status bar item
7. Verify tooltip: "ÆtherLight Tier: pro" and "Voice Capture: ✅ Enabled"
8. Check settings: Verify `aetherlight.userTier` = "pro"

**Expected Results**:
- [ ] Pro tier license validated successfully
- [ ] Status bar shows "⭐ Pro" with green color
- [ ] Tooltip shows tier = pro and voice capture enabled
- [ ] Settings updated with tier = "pro"
- [ ] No error messages shown

**Actual Result**: _____________________________

**Status**: [ ] PASS [ ] FAIL

---

### Test 51: BUG-011 - Invalid License Key Handling
**Category**: Extension Functionality
**Priority**: HIGH
**Commit**: 38766e4

**Steps**:
1. Open settings JSON
2. Set invalid license key: `"aetherlight.licenseKey": "INVALID-KEY-1234-5678"`
3. Save settings and reload VS Code window
4. Observe activation
5. Verify error message appears with details about invalid key
6. Check status bar
7. Verify tier falls back to "🛡️ Free" (graceful degradation)
8. Check OUTPUT panel > ÆtherLight for error logs
9. Verify settings updated with tier = "free"

**Expected Results**:
- [ ] Error message shown: "ÆtherLight: License validation failed. Invalid license key: ..."
- [ ] Extension falls back to free tier (graceful degradation)
- [ ] Status bar shows "🛡️ Free"
- [ ] Extension remains functional (doesn't crash)
- [ ] Error logged to OUTPUT panel

**Actual Result**: _____________________________

**Status**: [ ] PASS [ ] FAIL

---

### Test 52: BUG-011 - Tier Status Bar Display
**Category**: Extension Functionality
**Priority**: HIGH
**Commit**: 38766e4

**Steps**:
1. Ensure free tier is active (from Test 49 or 51)
2. Locate status bar in bottom right of VS Code window
3. Verify tier status bar item appears (should be leftmost in right section, priority 100)
4. Check icon: Should show "🛡️" for free tier
5. Check text: Should show "Free"
6. Check color: Should be gray (#888888)
7. Hover over status bar item
8. Verify tooltip displays:
   - Line 1: "ÆtherLight Tier: free"
   - Line 2: "Voice Capture: ❌ Disabled (Upgrade Required)"
9. Click status bar item
10. Verify browser opens to https://aetherlight.ai/upgrade

**Expected Results**:
- [ ] Status bar item visible in bottom right
- [ ] Correct icon for tier (🛡️ = free, ⭐ = pro, ✓ = network, 🏢 = enterprise, ⚠️ = offline)
- [ ] Correct color (gray for free, green for paid, yellow for offline)
- [ ] Tooltip shows tier name and voice capture status
- [ ] Click opens upgrade page for free/offline tier
- [ ] Click opens settings for paid tier

**Actual Result**: _____________________________

**Status**: [ ] PASS [ ] FAIL

---

### Test 53: BUG-011 - Voice Capture Gating (Free Tier Blocked)
**Category**: Extension Functionality
**Priority**: CRITICAL
**Commit**: 38766e4

**Pre-condition**: Free tier active (from Test 49 or 51)

**Steps**:
1. Verify free tier is active (status bar shows "🛡️ Free")
2. Try to trigger voice capture via command palette: "ÆtherLight: Capture Voice"
3. Verify warning message appears: "Voice capture requires a paid subscription (uses OpenAI Whisper API)."
4. Verify two buttons: "Upgrade Now" and "Learn More"
5. Click "Upgrade Now" → Verify browser opens to https://aetherlight.ai/upgrade
6. Close browser and try again
7. This time click "Learn More" → Verify browser opens to https://aetherlight.ai/features
8. Try hotkey: Press backtick (`) to open voice panel
9. Verify same warning message appears
10. Try command: "ÆtherLight: Capture Voice Global"
11. Verify same warning message appears

**Expected Results**:
- [ ] All 3 voice capture entry points blocked for free tier
- [ ] Warning message shows clearly why (OpenAI API costs)
- [ ] Upgrade prompts offer two actions: Upgrade Now / Learn More
- [ ] Extension doesn't crash or hang
- [ ] Upgrade links work correctly

**Actual Result**: _____________________________

**Status**: [ ] PASS [ ] FAIL

---

### Test 54: BUG-011 - Voice Capture Gating (Pro Tier Allowed)
**Category**: Extension Functionality
**Priority**: CRITICAL
**Commit**: 38766e4

**Pre-condition**: Pro tier active (from Test 50)

**Steps**:
1. Verify pro tier is active (status bar shows "⭐ Pro")
2. Try command: "ÆtherLight: Capture Voice"
3. Verify NO warning message appears
4. Verify command attempts to execute (may fail if desktop app not running - that's OK)
5. Try hotkey: Press backtick (`)
6. Verify NO warning message appears
7. Verify voice panel opens or attempts to connect
8. Try command: "ÆtherLight: Capture Voice Global"
9. Verify NO warning message appears

**Expected Results**:
- [ ] All 3 voice capture entry points work for pro tier
- [ ] NO tier gate warning shown
- [ ] Commands execute (may show IPC connection errors - that's expected)
- [ ] No upgrade prompts appear

**Actual Result**: _____________________________

**Status**: [ ] PASS [ ] FAIL

---

### Test 55: BUG-011 - Offline Mode Graceful Degradation
**Category**: Extension Functionality
**Priority**: MEDIUM
**Commit**: 38766e4

**Steps**:
1. Disconnect from internet (disable Wi-Fi or use airplane mode)
2. Open settings JSON
3. Set a valid-looking license key: `"aetherlight.licenseKey": "TEST-OFFLINE-MODE-KEY"`
4. Save settings and reload VS Code window
5. Wait for activation (should timeout after 2 seconds)
6. Observe warning message (should mention offline mode)
7. Check status bar
8. Verify tier shows "⚠️ Offline" with yellow color (#ffaa00)
9. Hover over status bar
10. Verify tooltip shows "ÆtherLight Tier: offline" and "Voice Capture: ❌ Disabled"
11. Try voice capture command
12. Verify blocked (offline mode = same as free tier)
13. Reconnect to internet
14. Reload VS Code window
15. Verify tier updates based on license validation

**Expected Results**:
- [ ] Network failure handled gracefully (no crash)
- [ ] Timeout after 2 seconds
- [ ] Warning message shown about offline mode
- [ ] Status bar shows "⚠️ Offline" (yellow)
- [ ] Voice capture blocked in offline mode
- [ ] Extension remains functional
- [ ] Reconnecting internet allows validation to work

**Actual Result**: _____________________________

**Status**: [ ] PASS [ ] FAIL

---

### Test 56: BUG-011 - Sprint TOML Completion Status
**Category**: Sprint Panel UI
**Priority**: MEDIUM
**Commit**: 38766e4, 281ec53

**Steps**:
1. Open Sprint Panel (ÆtherLight icon in Activity Bar)
2. Locate BUG-011 task in task list
3. Verify status shows "✅ completed"
4. Click on BUG-011 task to expand details
5. Verify completion_date shows "2025-11-13"
6. Verify completion_notes_doc link exists: `internal/sprints/completion/BUG-011_COMPLETION.md`
7. Verify audit_report_doc link exists: `internal/sprints/audits/BUG-011_AUDIT.md`
8. Verify audit_status shows "PASSED"
9. Verify completion_summary shows brief description of implementation
10. Verify patterns list includes: Pattern-CODE-001, Pattern-TDD-001, Pattern-FEATURE-GATING-001, Pattern-UI-004, Pattern-AUTH-001

**Expected Results**:
- [ ] BUG-011 marked as completed in Sprint TOML
- [ ] Completion date = 2025-11-13
- [ ] Completion notes document linked
- [ ] Audit report document linked
- [ ] Audit status = PASSED
- [ ] All 5 patterns documented
- [ ] Sprint Panel displays status correctly

**Actual Result**: _____________________________

**Status**: [ ] PASS [ ] FAIL

---

### Test 57: BUG-012 - Link/Unlink Toggle for Pop-Out Sprint Views
**Category**: Sprint Panel UI
**Priority**: HIGH
**Commit**: TBD
**Dependencies**: None

**Steps**:
1. Launch Extension Development Host (F5 in VS Code)
2. Open Sprint Panel (click ÆtherLight icon in sidebar)
3. Verify sprint panel displays correctly
4. Click 🔄 "Pop Out Sprint" button to create a pop-out panel
5. Verify pop-out panel opens in new window
6. Verify toggle button appears at top of pop-out panel (NOT in main panel)
7. Verify toggle button shows "🔗 Linked" by default
8. Verify description text: "Sprint selection syncs with main panel"

**Test Linked Behavior (Default)**:
9. In main panel, select a different sprint from dropdown (e.g., switch to archived sprint)
10. Verify pop-out panel automatically syncs to the same sprint
11. In main panel, switch back to ACTIVE_SPRINT.toml
12. Verify pop-out panel syncs again

**Test Unlinked Behavior**:
13. In pop-out panel, click toggle button
14. Verify button changes to "🔓 Unlinked"
15. Verify description changes to: "Independent sprint selection enabled"
16. Verify notification appears: "🔓 Panel unlinked - independent sprint selection enabled"
17. In main panel, select a different sprint from dropdown
18. Verify pop-out panel does NOT sync (maintains independent sprint)
19. In pop-out panel, select a different sprint from dropdown
20. Verify main panel does NOT sync (independent selection working)

**Test Re-linking**:
21. In pop-out panel, click toggle button again
22. Verify button changes back to "🔗 Linked"
23. Verify notification appears: "🔗 Panel linked - sprint selection will sync with main panel"
24. In main panel, select a different sprint from dropdown
25. Verify pop-out panel syncs again (re-linking successful)

**Test Multiple Pop-Out Panels**:
26. Create a second pop-out panel (click 🔄 button again)
27. Verify second panel initializes as "🔗 Linked"
28. Unlink first pop-out panel (click toggle)
29. Keep second pop-out panel linked
30. Change sprint in main panel
31. Verify first pop-out panel does NOT sync (unlinked)
32. Verify second pop-out panel DOES sync (linked)

**Test FileSystemWatcher Auto-Refresh**:
33. Keep one panel linked and one unlinked
34. Externally modify ACTIVE_SPRINT.toml (e.g., change a task status)
35. Verify linked panels refresh automatically
36. Verify unlinked panels do NOT refresh (maintain independent state)

**Expected Results**:
- [ ] Toggle button only appears in pop-out panels (NOT main panel)
- [ ] Toggle button shows correct initial state (🔗 Linked)
- [ ] Linked panels sync sprint selection with main panel
- [ ] Unlinked panels maintain independent sprint selection
- [ ] Re-linking restores sync behavior
- [ ] Multiple panels can have different link states simultaneously
- [ ] FileSystemWatcher respects link state (only refreshes linked panels)
- [ ] Notifications appear when toggling (🔗/🔓 icons)
- [ ] UI updates correctly (button text, icon, description)
- [ ] No console errors in webview (Ctrl+Shift+I)
- [ ] TypeScript compilation succeeds
- [ ] Backward compatible: Panels default to linked (existing behavior preserved)

**Actual Result**: _____________________________

**Status**: [ ] PASS [ ] FAIL

---

### Test 58: UI-001 - Display Enhanced TOML Fields in Sprint Panel UI
**Category**: Sprint Panel UI
**Priority**: HIGH
**Commit**: TBD
**Dependencies**: INFRA-003

**Context**: Adds UI support for new sprint metadata fields (completion_notes, questions_doc, test_plan, design_doc, pattern_reference) to SprintRenderer task detail view.

**Steps**:
1. Launch Extension Development Host (F5 in VS Code)
2. Open Sprint Panel (click ÆtherLight icon in sidebar)
3. Navigate to ACTIVE_SPRINT_17.1_BUGS.toml using dropdown
4. Find a completed task with enhanced metadata (e.g., INFRA-003)
5. Click "View Details" on the task

**Test Documents Section**:
6. Verify "📄 Documents" section appears in task details
7. For tasks with enhanced_prompt, verify:
   - File icon (codicon-file-text)
   - Label: "Enhanced Prompt:"
   - Clickable filename button (shows filename only, not full path)
   - Template badge displayed inline (e.g., "MVP-003-PromptEnhancer-TaskTemplate-v1.4.3")
8. For tasks with questions_doc, verify:
   - Question icon (codicon-question)
   - Label: "Questions Document:"
   - Clickable filename button
9. For tasks with test_plan, verify:
   - Beaker icon (codicon-beaker)
   - Label: "Test Plan:"
   - Clickable filename button
10. For tasks with design_doc, verify:
   - Structure icon (codicon-symbol-structure)
   - Label: "Design Document:"
   - Clickable filename button
11. Click any document link and verify file opens in VS Code editor

**Test Completion Notes Section**:
12. Find a completed task (status = "completed")
13. Scroll to completion notes section
14. Verify "✅ Completion Notes" heading exists
15. Verify HTML <details>/<summary> expandable element
16. Verify "Show Details" summary text
17. Click to expand completion notes
18. Verify pre-formatted text displays correctly (formatting preserved)
19. Verify notes content matches TOML completion_notes field

**Test Pattern Reference Section**:
20. Find a task with pattern_reference field
21. Verify "🔗 Pattern Reference" section appears
22. Verify library icon (codicon-library)
23. Verify clickable filename button
24. Verify full path displayed below button (as <code> element)
25. Click pattern reference link and verify file opens

**Test Graceful Degradation**:
26. View details for tasks WITHOUT enhanced metadata fields
27. Verify no Documents section appears (hidden gracefully)
28. Verify no Completion Notes section appears for non-completed tasks
29. Verify no Pattern Reference section for tasks without pattern_reference
30. Verify no JavaScript errors in browser console (Ctrl+Shift+I in webview)

**Test Multiple Tasks**:
31. View UI-001 task details (should have enhanced_prompt)
32. View INFRA-003 task details (should have completion_notes)
33. View BUG-011 task details (should have enhanced_prompt, questions_doc, test_plan)
34. Verify each task displays appropriate sections

**Expected Results**:
- [ ] Documents section displays all available document links
- [ ] Template badge appears inline with enhanced_prompt
- [ ] All document links are clickable and open correct files
- [ ] Completion notes section only appears for completed tasks
- [ ] Completion notes are expandable with <details>/<summary>
- [ ] Completion notes formatting preserved (use <pre> tag)
- [ ] Pattern reference displays as clickable link with full path
- [ ] Missing fields gracefully hidden (no empty sections)
- [ ] Icon-based UI using VS Code codicons
- [ ] No console errors in webview
- [ ] Files open correctly when links clicked
- [ ] TypeScript compilation succeeds
- [ ] No regression in existing UI elements

**Files Modified**:
- `vscode-lumina/src/commands/SprintLoader.ts` (5 new interface fields)
- `vscode-lumina/src/commands/SprintRenderer.ts` (72 lines of UI code added)
- `vscode-lumina/src/test/commands/SprintRenderer.test.ts` (CREATED - 400 lines, 11 tests)
- `internal/sprints/ACTIVE_SPRINT_17.1_BUGS.toml` (UI-001 marked completed)

**Test Implementation**:
- Unit tests written (11 test cases covering all scenarios)
- Tests compile successfully with TypeScript
- TDD approach followed (tests written first)

**Actual Result**: _____________________________

**Status**: [ ] PASS [ ] FAIL

---

### Test 59: BUG-013 - "Start This Task" Uses Selected Sprint File
**Category**: Sprint Panel Core Functionality
**Priority**: CRITICAL
**Commit**: 4ee4925
**Dependencies**: Sprint Panel with dropdown selector

**Context**: This is the REAL fix for BUG-013. The initial fix (commit 28a9309) changed config.json, which was a workaround that made the dropdown useless. The real bug was TaskPromptExporter hardcoding the sprint path instead of reading from the UI-selected sprint file.

**Steps**:
1. Launch Extension Development Host (F5 in VS Code)
2. Open Sprint Panel (click ÆtherLight icon in sidebar)
3. Verify sprint dropdown is visible at top of panel
4. Note which sprint file is currently selected (default: ACTIVE_SPRINT.toml)
5. Verify tasks from that sprint are displayed

**Test Sprint Dropdown Selection**:
6. Click sprint dropdown at top of panel
7. Verify dropdown shows available sprint files:
   - ACTIVE_SPRINT.toml (Sprint 3)
   - ACTIVE_SPRINT_17.1_BUGS.toml (Bug Sprint)
   - Any other ACTIVE_SPRINT_*.toml files
8. Select "ACTIVE_SPRINT_17.1_BUGS.toml" from dropdown
9. Verify UI refreshes and shows bug tasks (BUG-001 through BUG-013)

**Test "Start This Task" - Bug Sprint**:
10. Find BUG-002 task in the list
11. Verify "Start This Task" button is visible on the task
12. Click "Start This Task" button on BUG-002
13. Verify notification appears: "⏳ Generating AI-enhanced prompt for BUG-002..."
14. Wait for enhanced prompt generation (should take < 2 seconds)
15. Verify NO error appears (no "Task BUG-002 not found in sprint TOML")
16. Verify enhanced prompt is generated and displayed
17. Verify prompt contains BUG-002 task details from ACTIVE_SPRINT_17.1_BUGS.toml

**Test "Start This Task" - Different Sprint**:
18. Use dropdown to switch to "ACTIVE_SPRINT.toml" (Sprint 3)
19. Verify UI shows Sprint 3 tasks (PROTECT-*, CONFIG-*, etc.)
20. Find any Sprint 3 task (e.g., CONFIG-001)
21. Click "Start This Task" on that task
22. Verify enhanced prompt generated from ACTIVE_SPRINT.toml (not bug sprint)

**Test Sprint Switching**:
23. Switch back to "ACTIVE_SPRINT_17.1_BUGS.toml" using dropdown
24. Click "Start This Task" on BUG-003
25. Verify enhanced prompt generated from bug sprint file
26. Switch to ACTIVE_SPRINT.toml
27. Click "Start This Task" on a Sprint 3 task
28. Verify enhanced prompt generated from Sprint 3 file

**Test Error Handling**:
29. Manually try to trigger enhanced prompt for invalid task ID (if possible via dev tools)
30. Verify error message shows which sprint file was searched
31. Verify error message lists available sprint files
32. Verify error message suggests updating config if needed

**Expected Results**:
- [ ] Sprint dropdown shows all ACTIVE_SPRINT_*.toml files
- [ ] Selecting sprint from dropdown refreshes UI with correct tasks
- [ ] "Start This Task" reads from currently selected sprint file
- [ ] BUG-002 enhanced prompt generated when bug sprint selected
- [ ] Sprint 3 task prompts generated when Sprint 3 selected
- [ ] Switching sprints works correctly (no stale data)
- [ ] No "Task not found" errors when clicking "Start This Task"
- [ ] Enhanced prompts contain correct task data from selected sprint
- [ ] Error messages show which sprint file was searched
- [ ] Error messages list available sprint files
- [ ] TypeScript compilation succeeds
- [ ] No console errors in Extension Host

**Previous Bug (Commit 28a9309)**:
- ❌ Changed config.json to hardcode bug sprint
- ❌ Made dropdown useless (always read from config, not dropdown)
- ❌ Required config change every time user switches sprints

**Real Fix (Commit 4ee4925)**:
- ✅ TaskPromptExporter accepts sprint path parameter
- ✅ voicePanel passes selected sprint path from SprintLoader
- ✅ Dropdown controls which sprint is active (as intended)
- ✅ Config only sets default/initial sprint

**Actual Result**: _____________________________

**Status**: [ ] PASS [ ] FAIL

---

### Test 60: Desktop App First-Time Activation (End-to-End)
**Category**: Integration Tests - QA-002
**Priority**: HIGH
**Dependencies**: BUG-002, BUG-003, BUG-005

**Test Scenario**: Fresh installation with no existing settings

**Setup**:
1. Uninstall desktop app (if installed)
2. Delete settings: `%APPDATA%\lumina-desktop\settings.json` (Windows) or `~/Library/Application Support/lumina-desktop/settings.json` (macOS)
3. Install v0.17.2 desktop app
4. Launch app

**Steps**:
1. Verify license activation dialog appears on first launch
2. Verify dialog has license key input field and "Activate" button
3. Enter invalid license key: "INVALID-KEY-12345"
4. Click Activate
5. Verify error message: "Invalid license key format"
6. Enter valid license key from dashboard
7. Click Activate
8. Verify API call to POST /api/license/validate
9. Verify progress indicator shown (should complete < 3 seconds)
10. Verify success message: "License activated successfully"
11. Verify dialog closes and main app window opens
12. Check settings.json file
13. Verify fields populated: license_key, user_id, device_id, tier
14. Verify device fingerprint generated (non-empty SHA-256 hash)

**Expected Results**:
- [ ] Activation dialog appears on first launch
- [ ] Invalid key shows error message
- [ ] Valid key activates successfully
- [ ] settings.json created with all required fields
- [ ] Device fingerprint generated (< 100ms)
- [ ] License validation completes (< 3 seconds)
- [ ] No console errors during activation

**Actual Result**: _____________________________

**Status**: [ ] PASS [ ] FAIL

---

### Test 61: Desktop App Upgrade Scenario (v0.17.1 → v0.17.2)
**Category**: Integration Tests - QA-002
**Priority**: HIGH
**Dependencies**: BUG-002, BUG-003

**Test Scenario**: Existing user upgrades from v0.17.1 to v0.17.2

**Setup**:
1. Create settings.json with existing license_key only:
   ```json
   {
     "license_key": "AL-XXXX-XXXX-XXXX-XXXX"
   }
   ```
2. Launch v0.17.2 desktop app

**Steps**:
1. Verify license activation dialog is SKIPPED
2. Verify main app window opens immediately
3. Verify no re-validation required
4. Check settings.json file
5. Verify new fields added automatically: user_id, device_id, tier
6. Verify old license_key preserved
7. Verify no data loss

**Expected Results**:
- [ ] Activation dialog skipped (license_key exists)
- [ ] App launches immediately (< 2 seconds)
- [ ] settings.json migrated with new fields
- [ ] Old license_key preserved
- [ ] No data loss during upgrade
- [ ] No console errors during migration

**Actual Result**: _____________________________

**Status**: [ ] PASS [ ] FAIL

---

### Test 62: Voice Transcription Complete Workflow
**Category**: Integration Tests - QA-002
**Priority**: CRITICAL
**Dependencies**: BUG-002A, BUG-004

**Test Scenario**: End-to-end voice recording and transcription

**Setup**:
1. Ensure desktop app activated with valid license
2. Verify token balance > 375 tokens
3. Ensure microphone access granted

**Steps**:
1. Open desktop app
2. Press recording hotkey (Ctrl+Shift+Space or configured)
3. Verify recording indicator appears
4. Verify audio waveform displayed
5. Speak for 1 minute: "This is a test transcription for v0.17.2 integration testing."
6. Verify waveform shows audio input
7. Verify recording duration counter increments
8. Press hotkey again to stop recording
9. Verify "Transcribing..." progress indicator shown
10. Verify API call to POST /api/desktop/transcribe
11. Verify response format includes: text, tokens_remaining
12. Verify token balance updated in UI (decremented by 375)
13. Verify transcription text displayed
14. Verify text copied to clipboard (if enabled)

**Performance Metrics**:
- Recording start latency: _______ ms (target: < 500ms)
- Transcription API call: _______ ms (target: < 5000ms for 1-min audio)
- Total workflow time: _______ ms

**Expected Results**:
- [ ] Recording starts immediately (< 500ms)
- [ ] Audio waveform displayed correctly
- [ ] Recording duration counter accurate
- [ ] Transcription completes (< 5 seconds for 1-min audio)
- [ ] API response format correct (tokens_remaining field)
- [ ] Token balance decremented by 375
- [ ] Transcription text accurate
- [ ] No console errors during workflow

**Actual Result**: _____________________________

**Status**: [ ] PASS [ ] FAIL

---

### Test 63: Transcription Error Handling (401/402/500)
**Category**: Integration Tests - QA-002
**Priority**: HIGH
**Dependencies**: BUG-004

**Test Scenario**: Error handling for various API failure scenarios

**Test 1: Insufficient Tokens (402)**
1. Simulate user with < 375 tokens
2. Press hotkey to start recording
3. Verify pre-flight check fails
4. Verify error message: "Insufficient tokens. You need at least 375 tokens."
5. Verify recording does NOT start

**Test 2: Authentication Error (401)**
1. Simulate invalid license key in settings
2. Press hotkey to start recording
3. Verify API returns 401 Unauthorized
4. Verify error message: "Authentication failed. Please check your license key."
5. Verify user can update license key

**Test 3: Server Error (500)**
1. Simulate server returning 500 Internal Server Error
2. Press hotkey to start recording
3. Verify error message: "Transcription failed. Please try again."
4. Verify user can retry

**Expected Results**:
- [ ] Insufficient tokens shows error before recording
- [ ] 401 error shows authentication message
- [ ] 500 error shows retry message
- [ ] All error messages user-friendly
- [ ] User can recover from errors
- [ ] No crashes during error scenarios

**Actual Result**: _____________________________

**Status**: [ ] PASS [ ] FAIL

---

### Test 64: Performance Validation (License/Fingerprint/Transcription)
**Category**: Integration Tests - QA-002
**Priority**: MEDIUM
**Dependencies**: BUG-002, BUG-002A

**Test Scenario**: Validate performance targets are met

**Performance Targets**:
1. **License Validation**: < 3 seconds
2. **Device Fingerprint Generation**: < 100ms
3. **Recording Start Latency**: < 500ms
4. **Transcription API Call**: < 5 seconds (1-minute audio)
5. **Dialog Open → Success**: < 4 seconds total

**Measurement Steps**:
1. Activate license and measure validation time
2. Generate device fingerprint and measure time
3. Start recording and measure latency
4. Complete transcription and measure API call time
5. Measure total activation workflow time

**Expected Results**:
- [ ] License validation: _______ ms (< 3000ms)
- [ ] Device fingerprint: _______ ms (< 100ms)
- [ ] Recording start: _______ ms (< 500ms)
- [ ] Transcription API: _______ ms (< 5000ms)
- [ ] Total activation: _______ ms (< 4000ms)
- [ ] All targets met

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

### Desktop App Functionality Tests (Critical)
- [ ] Test 35: BUG-002A - TranscriptionResponse Struct Migration
- [ ] Test 36: BUG-002 - License Validation Backend Module
- [ ] Test 37: BUG-002 - License Validation Tauri Command
- [ ] Test 38: BUG-002 - License Activation Dialog Component
- [ ] Test 39: BUG-002 - Cargo.toml Dependencies
- [ ] Test 41: BUG-002 - Sprint TOML Completion Status
- [ ] Test 42: BUG-008 - Code Analyzer Modal (Verification - BUG-010)
- [ ] Test 43: BUG-009 - Sprint Planner Modal (Verification - BUG-010)
- [ ] Test 44: BUG-010 - Edge Case: Empty config.json
- [ ] Test 45: BUG-010 - Edge Case: Malformed config.json
- [ ] Test 46: BUG-010 - Edge Case: Multiple Rapid Modal Opens
- [ ] Test 47: BUG-010 - Modal Form Validation

### License Validation Tests (Critical)
- [ ] Test 48: BUG-011 - Extension First-Time Activation Prompt
- [ ] Test 49: BUG-011 - License Key Validation (Free Tier)
- [ ] Test 50: BUG-011 - License Key Validation (Pro Tier)
- [ ] Test 51: BUG-011 - Invalid License Key Handling
- [ ] Test 52: BUG-011 - Tier Status Bar Display
- [ ] Test 53: BUG-011 - Voice Capture Gating (Free Tier Blocked)
- [ ] Test 54: BUG-011 - Voice Capture Gating (Pro Tier Allowed)
- [ ] Test 55: BUG-011 - Offline Mode Graceful Degradation
- [ ] Test 56: BUG-011 - Sprint TOML Completion Status

### Sprint Panel UX Tests (High Priority)
- [ ] Test 57: BUG-012 - Link/Unlink Toggle for Pop-Out Sprint Views

### Sprint Panel UI Enhancement Tests (HIGH)
- [ ] Test 58: UI-001 - Display Enhanced TOML Fields in Sprint Panel UI

### Sprint Panel Core Functionality Tests (CRITICAL)
- [ ] Test 59: BUG-013 - "Start This Task" Uses Selected Sprint File

### Integration Tests - End-to-End Workflows (QA-002)
- [ ] Test 60: Desktop App First-Time Activation (End-to-End)
- [ ] Test 61: Desktop App Upgrade Scenario (v0.17.1 → v0.17.2)
- [ ] Test 62: Voice Transcription Complete Workflow
- [ ] Test 63: Transcription Error Handling (401/402/500)
- [ ] Test 64: Performance Validation (License/Fingerprint/Transcription)

### Optional Tests (Nice to Have)
- [ ] Test 40: BUG-002 - Integration Test with Live API (Optional)
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
- Total Tests Run: _____ / 64
- Tests Passed: _____
- Tests Failed: _____
- Tests Skipped: _____

**Critical Tests Status**:
- [ ] All Critical Path tests passed
- [ ] All Enhanced Prompt System tests passed
- [ ] All Sprint TOML tests passed
- [ ] All Regression tests passed
- [ ] All Desktop App Functionality tests passed

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

**Document Version**: 1.2
**Last Updated**: 2025-01-13 (Added UI-001 test coverage)
**Next Update**: After testing completion
