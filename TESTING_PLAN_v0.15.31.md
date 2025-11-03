# Testing Plan: v0.15.31
## Phase 0 User Visibility Improvements

**Date:** 2025-11-03
**Target Version:** 0.15.31
**Pre-Release Testing Documentation**

---

## Executive Summary

Comprehensive testing plan covering:
- ✅ Automated unit tests (where applicable)
- ✅ Manual integration tests
- ✅ User experience validation
- ✅ Performance benchmarks
- ✅ Edge case testing

**Status:** READY FOR MANUAL TESTING (automated test suite blocked by path issue)

---

## 1. Automated Testing

### Current Status: ⚠️ BLOCKED

**Issue:** Test suite fails with module resolution error
```
Error: Cannot find module 'c:\Users\Brett\Dropbox\Ferret9'
```

**Root Cause:** Workspace path contains space ("Ferret9 Global"), causing path parsing failure in test framework

**Recommendation:** Either:
1. Fix test configuration to handle paths with spaces
2. Test in workspace with no spaces in path
3. Proceed with manual testing only for v0.15.31

**Impact:** Cannot run automated unit tests before release. Must rely on manual testing.

---

## 2. Manual Integration Testing

### Test Environment Setup

1. **Package Extension:**
   ```bash
   cd vscode-lumina
   npm run compile
   vsce package
   ```

2. **Install Packaged Extension:**
   ```bash
   code --install-extension aetherlight-0.15.31.vsix
   ```

3. **Reload VS Code:**
   - Press Ctrl+R in Extension Development Host
   - OR Close and reopen VS Code

### Critical Path Testing

#### Test 1: Extension Activation
**Purpose:** Verify extension loads without errors

**Steps:**
1. Open VS Code
2. Open View → Output → ÆtherLight
3. Check for activation errors

**Expected Results:**
- ✅ No errors in output channel
- ✅ "Workflow enforcement initialized" message appears
- ✅ Extension commands available in Command Palette

**Pass Criteria:** Extension activates cleanly

---

#### Test 2: MID-021 - Detailed Results Modal
**Purpose:** Verify new results modal displays comprehensive pipeline information

**Steps:**
1. Open a workspace with ACTIVE_SPRINT.toml
2. Run Command: `ÆtherLight: Analyze & Plan`
3. Wait for pipeline to complete
4. Observe QuickPick modal that appears

**Expected Results:**
- ✅ Modal shows pipeline completion summary
- ✅ Confidence distribution displayed (🟢 high / 🟡 medium / 🔴 low counts)
- ✅ Top 3 agent assignments shown with:
  - Task ID and name
  - Assigned agent
  - Match score (0.00-1.00)
  - Match reason (1-2 sentences)
- ✅ Top 3 patterns discovered with relevance scores
- ✅ Files discovered count
- ✅ Validation results summary
- ✅ "Open Sprint File" button works

**Pass Criteria:** All information displays correctly and is actionable

**Performance:** Modal renders in <300ms

---

#### Test 3: MID-022 - Output Channel Logging
**Purpose:** Verify middleware operations are logged for transparency

**Steps:**
1. Open View → Output
2. Select **ÆtherLight - Middleware** from dropdown
3. Run Command: `ÆtherLight: Analyze & Plan`
4. Observe logs during execution

**Expected Results:**
- ✅ Output channel exists and is selectable
- ✅ Logs show operation markers:
  - ▶️ START: [operation name]
  - ✅ END: [operation name] | Duration: [N]ms
  - ❌ FAIL: [operation name] | Error: [details]
- ✅ Timestamps in HH:MM:SS.mmm format
- ✅ Pipeline steps logged in order:
  1. Load Sprint
  2. Load Agents
  3. Score Tasks (confidence scoring)
  4. Assign Agents
  5. Gather Context
  6. Validate Tasks
- ✅ Agent loading details (count, IDs)
- ✅ Confidence scores per task (if verbose)
- ✅ Agent assignment reasoning

**Pass Criteria:** All operations logged with <10ms overhead per operation

**Performance:** Logging adds <50ms total to pipeline execution

---

#### Test 4: MID-023 - Improved Error Messages
**Purpose:** Verify errors provide context and actionable guidance

**Test 4a: No Workspace Open**

**Steps:**
1. Close all workspace folders
2. Run Command: `ÆtherLight: Analyze & Plan`

**Expected Results:**
- ✅ Error message shows:
  - ❌ Title: "No Workspace Folder Open"
  - 📝 "Why this matters" explanation
  - 💡 "What to do" guidance
- ✅ Action buttons:
  - "Open Folder" (opens folder picker)
  - "Learn More" (opens docs)

**Pass Criteria:** User can fix the issue from error message alone

---

**Test 4b: Invalid TOML File**

**Steps:**
1. Open ACTIVE_SPRINT.toml
2. Add syntax error (e.g., unclosed quote)
3. Save file
4. Run Command: `ÆtherLight: Analyze & Plan`

**Expected Results:**
- ✅ Error message shows:
  - ❌ "Failed to Parse Sprint File"
  - 📝 Line number with error
  - 📄 TOML syntax hint
- ✅ Action buttons:
  - "Open File" (jumps to error line)
  - "Validate TOML" (opens online validator)
  - "Learn More"

**Pass Criteria:** User can identify and fix TOML error quickly

---

**Test 4c: Agent Validation Failure**

**Steps:**
1. Open ACTIVE_SPRINT.toml
2. Set `assigned_agent = "non-existent-agent"` on a task
3. Run Command: `ÆtherLight: Analyze & Plan`

**Expected Results:**
- ✅ Error message shows:
  - ❌ "Agent Validation Failed"
  - 📝 Which agent is missing
  - 💡 Suggested actions
- ✅ Action buttons:
  - "Create Agent" (opens agent creation wizard)
  - "View Logs" (opens middleware output channel)
  - "Retry"

**Pass Criteria:** User understands what's wrong and can fix it

---

#### Test 5: MID-024 - Test Status Column
**Purpose:** Verify TreeView shows test coverage per task

**⚠️ LIMITATION:** This test only works when a sprint is actively running via IPC. Without active sprint, TreeView shows empty (expected behavior).

**Prerequisites:**
- Phase 4 autonomous sprint running (future feature)
- OR Mock sprint data in SprintProgressPanel for testing

**Steps:**
1. Open SprintProgressPanel TreeView (sidebar icon)
2. Expand sprint root item
3. Expand agent nodes
4. Observe task items

**Expected Results:**
- ✅ Tasks displayed under each agent
- ✅ Test status indicators shown:
  - 🔴 Red: <70% coverage (or no tests)
  - 🟡 Yellow: 70-79% coverage
  - 🟢 Green: ≥80% coverage
- ✅ Tooltip on hover shows:
  - Coverage percentage
  - Test file paths
  - Status explanation
- ✅ Click task → Opens associated test file

**Pass Criteria:** Test status visible and interactive

**Known Limitation:** Coverage value is currently hard-coded to 75% (documented placeholder - lines 438-443 of SprintProgressPanel.ts)

**Fallback Test (No Sprint Running):**
- TreeView shows empty state or just sprint summary
- No errors in console
- Feature will work when Phase 4 orchestrator is active

---

#### Test 6: MID-026 - File Watcher for Manual Task Detection
**Purpose:** Verify suggestions appear when manually creating tasks

**Steps:**
1. Open ACTIVE_SPRINT.toml
2. Manually add 3 new task sections:
   ```toml
   [[tasks.TEST-001]]
   name = "Test Task 1"
   # ... minimal fields

   [[tasks.TEST-002]]
   name = "Test Task 2"

   [[tasks.TEST-003]]
   name = "Test Task 3"
   ```
3. Wait 3 seconds (debounce delay)

**Expected Results:**
- ✅ Information message appears after 3-second delay
- ✅ Message shows:
  - 💡 "Creating tasks manually?"
  - "You just added 3 tasks"
  - Benefits of "Analyze & Plan" feature
- ✅ Action buttons:
  - "Show Me" (opens documentation)
  - "Continue" (dismisses)
  - "Don't Show Again" (persists preference)

**Pass Criteria:** Suggestion appears exactly once, 3 seconds after last keystroke

**Test 6b: Preference Persistence**

**Steps:**
1. Trigger suggestion (add 3+ tasks)
2. Click "Don't Show Again"
3. Add 3 more tasks

**Expected:** Suggestion does NOT appear again

---

#### Test 7: MID-027 - Proactive Analysis Suggestions
**Purpose:** Verify suggestions when saving analysis documents

**Test 7a: Analysis Document by Filename**

**Steps:**
1. Create file: `PHASE_X_GAP_ANALYSIS.md`
2. Add some content (doesn't matter what)
3. Save file

**Expected Results:**
- ✅ Information message appears immediately on save
- ✅ Message shows:
  - 📋 "Analysis Document Saved"
  - Filename shown
  - "Generate sprint tasks from it automatically?"
- ✅ Action buttons:
  - "Analyze & Plan" (runs command)
  - "Later" (dismisses)
  - "Don't Suggest for This File" (adds to ignore list)

**Pass Criteria:** Suggestion appears for files matching keywords: analysis, gaps, requirements, planning

---

**Test 7b: Analysis Document by Headers**

**Steps:**
1. Create file: `notes.md` (no keyword in filename)
2. Add content:
   ```markdown
   ## Requirements
   - Requirement 1
   - Requirement 2

   ## Tasks
   - Task A
   - Task B
   ```
3. Save file

**Expected:** Same suggestion as Test 7a

**Pass Criteria:** Detection works by content headers: "## Tasks", "## Issues", "## Requirements", "## Problems"

---

**Test 7c: Per-File Ignore List**

**Steps:**
1. Save analysis document
2. Click "Don't Suggest for This File"
3. Modify and save same file again

**Expected:** Suggestion does NOT appear for this file anymore

**Pass Criteria:** Ignore list persists per file path

---

### Integration Testing

#### Test 8: Voice Panel Still Works
**Purpose:** Verify new features don't break existing functionality

**Steps:**
1. Press ` (backtick key)
2. Click record button
3. Record short audio
4. Stop recording
5. Wait for transcription

**Expected:** Voice panel opens, recording works, transcription inserts into editor

**Pass Criteria:** No regressions in existing features

---

#### Test 9: Other Commands Unaffected
**Purpose:** Verify new code doesn't break unrelated features

**Commands to Test:**
- ✅ `ÆtherLight: Create Agent` - Opens agent creation wizard
- ✅ `ÆtherLight: Create Skill` - Opens skill creation wizard
- ✅ `ÆtherLight: Analyze Workspace` - Runs workspace analysis
- ✅ `ÆtherLight: Check for Updates` - Checks npm for updates

**Pass Criteria:** All commands work as before

---

## 3. Performance Testing

### Performance Benchmarks

| Operation | Target | Measurement Method |
|-----------|--------|-------------------|
| Analyze & Plan pipeline | <5 min | End-to-end timing |
| Results modal render | <300ms | User perception |
| Logging overhead per operation | <10ms | Timestamp diffs in logs |
| File watcher debounce | 3s delay | Manual observation |
| Test status lookup | <500ms | TreeView expand timing |
| Output channel creation | <50ms | Extension activation time |

**Test Method:**
1. Run Analyze & Plan on ACTIVE_SPRINT.toml with 20+ tasks
2. Check output channel logs for operation durations
3. Verify total pipeline time <5 minutes
4. Confirm modal renders immediately after pipeline completes

---

## 4. Edge Case Testing

### Edge Case 1: Empty Sprint File
**Steps:** Run Analyze & Plan on empty ACTIVE_SPRINT.toml
**Expected:** Clear error message, not a crash

### Edge Case 2: Sprint with 0 Tasks
**Steps:** Sprint file with metadata but no [[tasks]] sections
**Expected:** Pipeline completes, shows "0 tasks processed"

### Edge Case 3: All Tasks Already Have Agents
**Steps:** Sprint where every task has `assigned_agent` already
**Expected:** Agent assignment step skipped, logged

### Edge Case 4: No Agents Defined
**Steps:** Run Analyze & Plan with empty `internal/agents/` directory
**Expected:** Warning message, suggests creating agents

### Edge Case 5: File Watcher Spam Prevention
**Steps:** Rapidly type 10 new tasks without 3-second pause
**Expected:** Only ONE suggestion after final 3-second pause

### Edge Case 6: Analysis Document False Positive
**Steps:** Save file named `my-analysis-notes.md` with no actual requirements
**Expected:** Suggestion appears (user can click "Don't Suggest")

### Edge Case 7: Markdown File Without Analysis Content
**Steps:** Save regular markdown file (e.g., `README.md`)
**Expected:** NO suggestion (no keywords or headers match)

---

## 5. User Experience Validation

### UX Checklist

#### Information Architecture
- [ ] Error messages explain "why it matters"
- [ ] All errors have actionable buttons
- [ ] Results modal is scannable (not overwhelming)
- [ ] Logs are structured and easy to read
- [ ] Suggestions are timely (not annoying)

#### Discoverability
- [ ] Users can find output channel (View → Output → ÆtherLight - Middleware)
- [ ] Results modal draws attention after pipeline completes
- [ ] Suggestions use familiar VS Code UI patterns

#### Learnability
- [ ] Error messages teach users about features
- [ ] Suggestions explain benefits before asking
- [ ] Modal shows what middleware discovered (learning by example)

#### Efficiency
- [ ] No unnecessary clicks or steps
- [ ] "Don't Show Again" options work permanently
- [ ] Logs don't spam (only important operations)

#### Consistency
- [ ] All messages use same emoji/icon style
- [ ] Button labels are action-oriented
- [ ] Timestamps formatted consistently

---

## 6. Regression Testing

**Purpose:** Ensure new features don't break existing functionality

### Regression Test Suite

1. **Sprint Loading:**
   - [ ] Load ACTIVE_SPRINT.toml without errors
   - [ ] Parse TOML correctly (all fields)

2. **Agent Registry:**
   - [ ] Load agents from `internal/agents/` directory
   - [ ] Parse agent TOML files correctly

3. **Confidence Scoring:**
   - [ ] Score tasks based on completeness
   - [ ] Existing scoring logic unchanged

4. **Skill Orchestration:**
   - [ ] SkillOrchestrator pipeline still works
   - [ ] All stages execute in order

5. **VS Code Integration:**
   - [ ] Commands registered correctly
   - [ ] TreeView still renders
   - [ ] Output channels work
   - [ ] File watchers don't conflict

---

## 7. Known Issues Testing

### Issue 1: Hard-Coded Coverage Value
**File:** SprintProgressPanel.ts:441-443
**Issue:** Test coverage hard-coded to 75% (documented placeholder)
**Test:** Verify tooltip shows 75% for all tasks with test files
**Expected:** Known limitation, works as designed

### Issue 2: TreeView Only Works with Running Sprint
**File:** SprintProgressPanel.ts (entire file)
**Issue:** Task-level items only show when sprint running via IPC
**Test:** Verify empty state when no sprint running
**Expected:** TreeView shows empty or sprint summary only

### Issue 3: Test Suite Path Issue
**File:** Test configuration
**Issue:** Cannot run automated tests due to path with spaces
**Test:** Attempt `npm test` - expect failure
**Expected:** Manual testing required for v0.15.31

---

## 8. Security Testing

**Purpose:** Ensure no security vulnerabilities introduced

### Security Checklist

- [x] No user input used in `eval()` or `exec()`
- [x] No SQL injection vectors (no SQL in this release)
- [x] No XSS vulnerabilities (no HTML rendering from user input)
- [x] File paths validated (VS Code APIs handle this)
- [x] No secrets hard-coded (API keys, tokens, etc.)
- [x] External URLs are legitimate (GitHub, npm, docs)
- [x] Workspace state used correctly (no sensitive data leakage)

**Result:** ✅ No security issues found

---

## 9. Accessibility Testing

### Accessibility Checklist

- [ ] Output channel readable by screen readers
- [ ] Error messages have semantic structure
- [ ] Results modal navigable by keyboard
- [ ] TreeView follows VS Code accessibility guidelines
- [ ] No color-only indicators (use icons + text)

**Note:** VS Code handles most accessibility concerns via native APIs

---

## 10. Cross-Platform Testing

**Target Platforms:**
- Windows (primary development environment)
- macOS
- Linux

### Platform-Specific Tests

**Windows:** ✅ Primary testing environment
**macOS:** ⚠️ Manual testing recommended
**Linux:** ⚠️ Manual testing recommended

**Known Platform Differences:**
- File paths: Windows uses `\`, Unix uses `/` (VS Code normalizes)
- Line endings: CRLF vs LF (not user-facing)

---

## 11. Test Execution Checklist

### Pre-Release Testing Sequence

1. **Code Quality:**
   - [x] TypeScript compiles cleanly
   - [x] No hard-coded placeholders (except documented ones)
   - [x] All TODOs resolved or moved to backlog

2. **Package and Install:**
   - [ ] Run `vsce package`
   - [ ] Install packaged .vsix
   - [ ] Extension activates without errors

3. **Critical Path Tests:**
   - [ ] Test 1: Extension Activation
   - [ ] Test 2: MID-021 - Detailed Results Modal
   - [ ] Test 3: MID-022 - Output Channel Logging
   - [ ] Test 4a-c: MID-023 - Error Messages (all 3 scenarios)
   - [ ] Test 5: MID-024 - Test Status Column (if sprint running)
   - [ ] Test 6: MID-026 - File Watcher
   - [ ] Test 7a-c: MID-027 - Analysis Suggestions

4. **Integration Tests:**
   - [ ] Test 8: Voice Panel Still Works
   - [ ] Test 9: Other Commands Unaffected

5. **Performance Tests:**
   - [ ] Analyze & Plan completes in <5 min
   - [ ] Modal renders in <300ms
   - [ ] Logging overhead <10ms per operation

6. **Edge Case Tests:**
   - [ ] All 7 edge cases validated

7. **Regression Tests:**
   - [ ] All 5 regression tests pass

8. **User Experience:**
   - [ ] All UX checklist items validated

---

## 12. Test Results Summary

### Test Execution Date: _________

**Tester:** _________
**Environment:** _________
**Extension Version:** 0.15.31

| Test Category | Pass | Fail | Blocked | Notes |
|--------------|------|------|---------|-------|
| Extension Activation | ☐ | ☐ | ☐ | |
| MID-021 Results Modal | ☐ | ☐ | ☐ | |
| MID-022 Output Logging | ☐ | ☐ | ☐ | |
| MID-023 Error Messages | ☐ | ☐ | ☐ | |
| MID-024 Test Status | ☐ | ☐ | ☐ | |
| MID-026 File Watcher | ☐ | ☐ | ☐ | |
| MID-027 Proactive Suggestions | ☐ | ☐ | ☐ | |
| Integration Tests | ☐ | ☐ | ☐ | |
| Performance Tests | ☐ | ☐ | ☐ | |
| Edge Cases | ☐ | ☐ | ☐ | |
| Regression Tests | ☐ | ☐ | ☐ | |

**Overall Status:** ☐ PASS ☐ FAIL ☐ PASS WITH KNOWN ISSUES

**Release Decision:** ☐ APPROVED ☐ NEEDS FIXES ☐ BLOCKED

---

## 13. Post-Release Monitoring

After publishing v0.15.31, monitor:

1. **User Feedback:**
   - GitHub issues: https://github.com/anthropics/aetherlight/issues
   - Check for reports of:
     - Error message confusion
     - Performance issues
     - Missing features
     - Unexpected behavior

2. **Telemetry (if available):**
   - Feature usage metrics
   - Error rates
   - Performance metrics

3. **Quick Validation:**
   - Install from npm: `npm install -g aetherlight@0.15.31`
   - Run basic smoke test
   - Verify no immediate issues

---

## 14. Rollback Criteria

**Immediate rollback if:**
- Extension fails to activate on fresh install
- Critical commands crash VS Code
- Data loss or corruption
- Security vulnerability discovered

**Deprecate and fix forward if:**
- Non-critical bugs
- Performance issues (but still usable)
- UI/UX improvements needed

---

## Contact

**Issues:** https://github.com/anthropics/aetherlight/issues
**Docs:** https://docs.aetherlight.dev
**Testing Questions:** Refer to PRE_RELEASE_AUDIT_v0.15.31.md

---

**Last Updated:** 2025-11-03
**Status:** ✅ READY FOR MANUAL TESTING
**Next Step:** Execute tests in sequence, document results

