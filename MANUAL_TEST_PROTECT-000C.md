# MANUAL_TEST_PROTECT-000C: Start This Task with Prompt Generation

**Task:** PROTECT-000C - Implement 'Start This Task' with prompt generation
**Version:** v0.16.15
**Date:** 2025-11-07
**Agent:** infrastructure-agent
**Pattern:** Pattern-CODE-001

---

## Purpose

Verify that task-level "Start" button (▶️ icon) generates AI-enhanced prompts:
- Button triggers prompt generation (not just TOML update)
- Same flow as "Start Next Task" (consistency)
- TaskAnalyzer integration works (gap detection)
- Q&A modal appears when gaps detected
- Final prompt populates text area
- Performance: Full flow <5s

---

## Prerequisites

1. ✅ PROTECT-000A completed (TaskAnalyzer)
2. ✅ PROTECT-000D completed (Q&A Modal)
3. ✅ PROTECT-000C implementation verified (voicePanel.ts lines 724-790)
4. ✅ TypeScript compiled successfully

---

## Test Section 1: Basic Functionality

### Test 1.1: Start button generates prompt (not just TOML update)

**Setup:**
1. Open VS Code Extension Development Host (F5)
2. Create sprint with pending task:
```toml
[tasks.TEST-START-001]
id = "TEST-START-001"
name = "Test Task"
phase = "phase-1-foundation"
status = "pending"
agent = "documentation-agent"
files_to_modify = ["vscode-lumina/src/extension.ts"]  # exists, no gaps
dependencies = []
estimated_time = "1 hour"
```
3. Open ÆtherLight Voice Panel
4. Find TEST-START-001 in task list
5. Click the ▶️ "Start" button on that task row

**Expected Result:**
- ✅ Notification: "⏳ Generating AI-enhanced prompt for TEST-START-001..."
- ✅ AI-enhanced prompt appears in Voice text area
- ✅ Notification: "✅ AI-enhanced prompt for TEST-START-001 loaded - review in text area and click Send"
- ✅ Task does NOT auto-start (status remains "pending")
- ✅ User can review/edit prompt before sending

**Actual Result:** ___________

**Status:** ⬜ PASS | ⬜ FAIL

---

### Test 1.2: Consistent with "Start Next Task" flow

**Setup:**
1. Create two identical tasks (same files, no gaps):
```toml
[tasks.TASK-A]
id = "TASK-A"
phase = "phase-1-foundation"
status = "pending"
agent = "documentation-agent"
files_to_modify = ["vscode-lumina/src/extension.ts"]
dependencies = []
estimated_time = "1 hour"

[tasks.TASK-B]
id = "TASK-B"
phase = "phase-1-foundation"
status = "pending"
agent = "documentation-agent"
files_to_modify = ["vscode-lumina/src/extension.ts"]
dependencies = []
estimated_time = "1 hour"
```
2. Test "Start Next Task" button → observe prompt
3. Test "Start" button on TASK-B → observe prompt

**Expected Result:**
- ✅ Both prompts have same format
- ✅ Both include: Task metadata, description, reasoning chain, validation criteria, etc.
- ✅ Same sections present in both prompts
- ✅ Consistent UX (spinner, notifications, text area insertion)

**Actual Result:** ___________

**Status:** ⬜ PASS | ⬜ FAIL

---

## Test Section 2: Integration with TaskAnalyzer

### Test 2.1: No gaps - Prompt directly populates text area

**Setup:**
1. Create valid task with no gaps:
```toml
[tasks.VALID-TASK]
id = "VALID-TASK"
name = "Valid Task No Gaps"
phase = "phase-1-foundation"
status = "pending"
agent = "documentation-agent"
files_to_modify = ["vscode-lumina/src/extension.ts"]  # exists
dependencies = []
estimated_time = "1 hour"
```
2. Click ▶️ "Start" on VALID-TASK

**Expected Result:**
- ✅ TaskAnalyzer runs
- ✅ No gaps detected
- ✅ Modal does NOT appear
- ✅ AI-enhanced prompt appears in Voice text area immediately
- ✅ User can review/edit prompt

**Actual Result:** ___________

**Status:** ⬜ PASS | ⬜ FAIL

---

### Test 2.2: Gaps detected - Q&A modal appears

**Setup:**
1. Create task with gaps (missing file):
```toml
[tasks.GAP-TASK]
id = "GAP-TASK"
name = "Task with Gaps"
phase = "phase-1-foundation"
status = "pending"
agent = "infrastructure-agent"
files_to_modify = ["vscode-lumina/src/services/NonExistentFile.ts"]
dependencies = []
estimated_time = "1 hour"
```
2. Click ▶️ "Start" on GAP-TASK

**Expected Result:**
- ✅ TaskAnalyzer runs
- ✅ Gaps detected (missing file)
- ✅ Q&A modal appears
- ✅ Question visible: "File does not exist. Should this file be created...?"
- ✅ No prompt in text area yet

**Actual Result:** ___________

**Status:** ⬜ PASS | ⬜ FAIL

---

### Test 2.3: After answering questions, prompt populates

**Setup:**
1. Trigger gap detection (as in Test 2.2)
2. Answer questions in modal
3. Click "Generate Prompt"

**Expected Result:**
- ✅ Modal closes
- ✅ Analyzer regenerates prompt
- ✅ Final prompt appears in Voice text area
- ✅ Notification: "✅ AI-enhanced prompt for GAP-TASK loaded..."

**Actual Result:** ___________

**Status:** ⬜ PASS | ⬜ FAIL

---

## Test Section 3: Task Selection vs. User Selection

### Test 3.1: User can start any ready task (not just "next")

**Setup:**
1. Create sprint with multiple ready tasks:
```toml
[tasks.TASK-1]
id = "TASK-1"
phase = "phase-1-foundation"
status = "pending"
agent = "infrastructure-agent"
dependencies = []
estimated_time = "1 hour"

[tasks.TASK-5]
id = "TASK-5"
phase = "phase-3-advanced"
status = "pending"
agent = "infrastructure-agent"
dependencies = []
estimated_time = "1 hour"

[tasks.TASK-10]
id = "TASK-10"
phase = "phase-2-core"
status = "pending"
agent = "infrastructure-agent"
dependencies = []
estimated_time = "1 hour"
```
2. Click ▶️ "Start" on TASK-10 (middle task, not "next" by algorithm)

**Expected Result:**
- ✅ Generates prompt for TASK-10 (user's choice)
- ✅ Does NOT auto-select TASK-1 (which would be "next" by phase order)
- ✅ User controls which task to start

**Actual Result:** ___________

**Status:** ⬜ PASS | ⬜ FAIL

---

### Test 3.2: "Start Next Task" vs. "Start This Task" independence

**Setup:**
1. Create multiple tasks
2. Click "Start Next Task" → observe which task is selected
3. Click ▶️ "Start" on a different task → observe

**Expected Result:**
- ✅ "Start Next Task" uses smart selection algorithm (phase-aware)
- ✅ "Start This Task" respects user's explicit choice
- ✅ Two independent entry points

**Actual Result:** ___________

**Status:** ⬜ PASS | ⬜ FAIL

---

## Test Section 4: Error Handling

### Test 4.1: Task not found error

**Setup:**
1. Manually trigger startTask with invalid taskId (developer console):
```javascript
// In DevTools console
vscode.postMessage({type: 'startTask', taskId: 'INVALID-ID'})
```

**Expected Result:**
- ✅ Error message: "Task INVALID-ID not found"
- ✅ No crash
- ✅ No prompt generated

**Actual Result:** ___________

**Status:** ⬜ PASS | ⬜ FAIL

---

### Test 4.2: Prompt generation failure handling

**Setup:**
1. Create task with configuration that causes analyzer error (e.g., missing config file)
2. Click ▶️ "Start" button

**Expected Result:**
- ✅ Error message: "Failed to generate enhanced prompt: [error details]"
- ✅ No crash
- ✅ User can try again or fix configuration

**Actual Result:** ___________

**Status:** ⬜ PASS | ⬜ FAIL

---

## Test Section 5: Performance

### Test 5.1: Full flow completes in <5s

**Setup:**
1. Create ready task (no gaps)
2. Click ▶️ "Start" button
3. Measure time from click to prompt in text area

**Expected Result:**
- ✅ Full flow (analysis → prompt): <5s
- ✅ Typical: 1-3s

**Actual Result:** ___________ s

**Status:** ⬜ PASS | ⬜ FAIL

---

### Test 5.2: With gaps, flow still reasonable

**Setup:**
1. Create task with gaps
2. Click ▶️ "Start" button
3. Answer questions (measure time to modal)
4. Click "Generate Prompt" (measure total time)

**Expected Result:**
- ✅ Time to modal: <3s
- ✅ Total time (with user answering): reasonable (depends on user)
- ✅ Prompt generation after modal: <3s

**Actual Result:** ___________ s

**Status:** ⬜ PASS | ⬜ FAIL

---

## Test Section 6: Integration with Existing Features

### Test 6.1: Works with task dependency validation

**Setup:**
1. Create task with unmet dependencies:
```toml
[tasks.BLOCKED-TASK]
id = "BLOCKED-TASK"
status = "pending"
agent = "infrastructure-agent"
dependencies = ["UNMET-DEP"]  # Not completed
estimated_time = "1 hour"
```
2. Click ▶️ "Start" on BLOCKED-TASK

**Expected Result:**
- ✅ Dependency validation still works (existing feature)
- ✅ Warning or alternative task suggestion
- ✅ Prompt generation still happens (user can review requirements)

**Actual Result:** ___________

**Status:** ⬜ PASS | ⬜ FAIL

---

### Test 6.2: Multiple tasks can be started sequentially

**Setup:**
1. Create 3 ready tasks
2. Click ▶️ "Start" on Task 1 → review prompt
3. Click ▶️ "Start" on Task 2 → review prompt
4. Click ▶️ "Start" on Task 3 → review prompt

**Expected Result:**
- ✅ Each task generates its own prompt
- ✅ Previous prompt is replaced (text area shows latest)
- ✅ No conflicts or errors
- ✅ User can generate multiple prompts in sequence

**Actual Result:** ___________

**Status:** ⬜ PASS | ⬜ FAIL

---

## Test Section 7: Edge Cases

### Test 7.1: Task with multiple gap types

**Setup:**
1. Create task with multiple gaps:
```toml
[tasks.MULTI-GAP]
id = "MULTI-GAP"
files_to_modify = ["NonExistent1.ts", "NonExistent2.ts", "internal/sprints/ACTIVE_SPRINT.toml"]
description = "No pre-flight mentioned"
deliverables = ["Feature"]  # no tests
dependencies = ["UNMET-DEP"]
agent = "infrastructure-agent"
status = "pending"
estimated_time = "1 hour"
```
2. Click ▶️ "Start" on MULTI-GAP

**Expected Result:**
- ✅ Modal shows all questions (missing files, pre-flight, tests, dependency)
- ✅ All questions can be answered
- ✅ Prompt generates after all answered

**Actual Result:** ___________

**Status:** ⬜ PASS | ⬜ FAIL

---

### Test 7.2: Task with very long description

**Setup:**
1. Create task with 500+ character description
2. Click ▶️ "Start" button

**Expected Result:**
- ✅ Prompt generates successfully
- ✅ All content visible in text area
- ✅ No truncation or errors
- ✅ Reasonable performance

**Actual Result:** ___________

**Status:** ⬜ PASS | ⬜ FAIL

---

## Summary

**Total Tests:** 14
**Passing:** _____ / 14
**Failing:** _____ / 14

**Critical Scenarios (Must Pass):**
- ✅ Test 1.1: Start button generates prompt
- ✅ Test 1.2: Consistent with "Start Next Task"
- ✅ Test 2.1: No gaps - direct prompt
- ✅ Test 2.2: Gaps detected - modal appears
- ✅ Test 3.1: User can start any ready task
- ✅ Test 5.1: Full flow <5s
- ✅ Test 6.2: Multiple tasks sequentially

**Start This Task Status:**
- ⬜ Ready for production
- ⬜ Needs fixes

---

## Notes

Record any observations, issues, or unexpected behavior here:

**Key Difference from "Start Next Task":**
- "Start Next Task" uses smart selection algorithm (phase-aware)
- "Start This Task" respects user's explicit choice (no algorithm)
- Both use same prompt generation flow after task is selected

_______________________________________________
