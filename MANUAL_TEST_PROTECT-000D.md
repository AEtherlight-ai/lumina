# MANUAL_TEST_PROTECT-000D: Q&A Modal UI (Generic Wizard)

**Task:** PROTECT-000D - Build Q&A modal UI (generic wizard)
**Version:** v0.16.15
**Date:** 2025-11-07
**Agent:** infrastructure-agent
**Pattern:** Pattern-CODE-001, Pattern-TDD-001

---

## Purpose

Verify that TaskQuestionModal works correctly:
- Modal appears when gaps detected by TaskAnalyzer
- All question types render correctly (text, choice, boolean)
- Wizard navigation works (Back/Next/Skip/Generate Prompt)
- Criticality styling visible (🚫 blocker, 💡 optional)
- Answers collected and submitted correctly
- Modal closes after prompt generated
- Integration with voicePanel message handlers works
- Performance target: Modal renders < 200ms

---

## Prerequisites

1. ✅ PROTECT-000A completed (TaskAnalyzer implemented)
2. ✅ PROTECT-000D code committed
3. ✅ TaskQuestionModal.ts implemented (~400 lines)
4. ✅ voicePanel.ts integration complete
5. ✅ TypeScript compiled successfully

---

## Test Section 1: Modal Creation

### Test 1.1: Modal appears when gaps detected

**Setup:**
1. Open VS Code Extension Development Host (F5)
2. Create a test task in ACTIVE_SPRINT.toml with missing files:
```toml
[tasks.TEST-MODAL-001]
id = "TEST-MODAL-001"
name = "Test Modal Task"
phase = "phase-3-mvp-prompt-system"
status = "pending"
agent = "infrastructure-agent"
files_to_modify = ["vscode-lumina/src/services/NonExistentFile.ts"]
dependencies = []
estimated_time = "1 hour"
```
3. Open ÆtherLight Voice Panel
4. Click "Start Next Task" button (or "Start" on TEST-MODAL-001)

**Expected Result:**
- ✅ TaskAnalyzer detects missing file gap
- ✅ TaskQuestionModal appears instead of prompt
- ✅ Modal title shows "Task Questions: TEST-MODAL-001"
- ✅ First question visible

**Actual Result:** ___________

**Status:** ⬜ PASS | ⬜ FAIL

---

### Test 1.2: Modal does not appear when no gaps

**Setup:**
1. Create a valid task with no gaps:
```toml
[tasks.TEST-MODAL-002]
id = "TEST-MODAL-002"
name = "Valid Task"
phase = "phase-3-mvp-prompt-system"
status = "pending"
agent = "documentation-agent"
files_to_modify = ["vscode-lumina/src/extension.ts"]  # exists
dependencies = []
estimated_time = "1 hour"
```
2. Click "Start" on TEST-MODAL-002

**Expected Result:**
- ✅ No gaps detected
- ✅ Modal does NOT appear
- ✅ AI-enhanced prompt loaded directly to Voice text area
- ✅ Notification: "✅ AI-enhanced prompt for TEST-MODAL-002 loaded..."

**Actual Result:** ___________

**Status:** ⬜ PASS | ⬜ FAIL

---

## Test Section 2: Question Types

### Test 2.1: Text input question renders correctly

**Setup:**
1. Create task that triggers missing test strategy gap (no test deliverables):
```toml
[tasks.TEST-MODAL-003]
id = "TEST-MODAL-003"
name = "Test Text Question"
phase = "phase-3-mvp-prompt-system"
status = "pending"
agent = "infrastructure-agent"
deliverables = ["Feature A", "Feature B"]  # no tests mentioned
dependencies = []
estimated_time = "1 hour"
```
2. Start task to trigger modal

**Expected Result:**
- ✅ Modal appears
- ✅ Question text: "No test strategy specified. What test approach should be used?"
- ✅ Textarea input visible with placeholder
- ✅ Help text shows coverage requirement (90% for infrastructure-agent)

**Actual Result:** ___________

**Status:** ⬜ PASS | ⬜ FAIL

---

### Test 2.2: Choice question renders correctly

**Setup:**
1. Create task with missing file:
```toml
[tasks.TEST-MODAL-004]
id = "TEST-MODAL-004"
files_to_modify = ["vscode-lumina/src/services/MissingFile.ts"]
agent = "infrastructure-agent"
status = "pending"
dependencies = []
```
2. Start task to trigger modal

**Expected Result:**
- ✅ Modal appears
- ✅ Question: "File \"MissingFile.ts\" does not exist. Should this file be created, or is the path incorrect?"
- ✅ Radio buttons visible with choices:
  - "Create new file"
  - "Path is incorrect - will fix"
  - "File will be created by another task"
- ✅ Only one choice selectable at a time

**Actual Result:** ___________

**Status:** ⬜ PASS | ⬜ FAIL

---

### Test 2.3: Boolean question renders correctly

**Setup:**
1. Create task that modifies TOML without pre-flight mention:
```toml
[tasks.TEST-MODAL-005]
id = "TEST-MODAL-005"
files_to_modify = ["internal/sprints/ACTIVE_SPRINT.toml"]
description = "Modify sprint file"  # no pre-flight mention
agent = "infrastructure-agent"
status = "pending"
dependencies = []
```
2. Start task to trigger modal

**Expected Result:**
- ✅ Modal appears
- ✅ Question: "Pre-flight checklist not referenced. Have you reviewed the pre-flight checklist for modifying \"ACTIVE_SPRINT.toml\"?"
- ✅ Two buttons visible: "Yes" and "No"
- ✅ Button highlighting on selection

**Actual Result:** ___________

**Status:** ⬜ PASS | ⬜ FAIL

---

## Test Section 3: Wizard Navigation

### Test 3.1: Navigate forward through questions

**Setup:**
1. Create task with multiple gaps (missing file + missing tests):
```toml
[tasks.TEST-MODAL-006]
id = "TEST-MODAL-006"
files_to_modify = ["vscode-lumina/src/services/MissingFileA.ts", "vscode-lumina/src/services/MissingFileB.ts"]
deliverables = ["Feature X"]  # no tests
agent = "infrastructure-agent"
status = "pending"
dependencies = []
```
2. Start task to trigger modal
3. Answer first question
4. Click "Next →" button

**Expected Result:**
- ✅ Progress indicator updates: "Question 1 of 3" → "Question 2 of 3"
- ✅ Second question appears
- ✅ First question answer preserved (verify by going back)
- ✅ "Next →" button visible until last question

**Actual Result:** ___________

**Status:** ⬜ PASS | ⬜ FAIL

---

### Test 3.2: Navigate backward through questions

**Setup:**
1. Using multi-question task from Test 3.1
2. Navigate to Question 2
3. Click "← Back" button

**Expected Result:**
- ✅ Returns to Question 1
- ✅ Progress indicator: "Question 2 of 3" → "Question 1 of 3"
- ✅ Previous answer still visible/selected
- ✅ "← Back" button disabled on Question 1

**Actual Result:** ___________

**Status:** ⬜ PASS | ⬜ FAIL

---

### Test 3.3: Skip optional questions

**Setup:**
1. Create task with optional question (e.g., missing tests for documentation-agent):
```toml
[tasks.TEST-MODAL-007]
id = "TEST-MODAL-007"
files_to_modify = ["vscode-lumina/src/services/MissingFileC.ts"]
agent = "documentation-agent"  # 0% coverage requirement
status = "pending"
dependencies = []
```
2. Start task (should have 1 required + potentially 1 optional question)

**Expected Result:**
- ✅ Optional question shows 💡 indicator
- ✅ "Skip" button visible for optional questions
- ✅ "Skip" button NOT visible for required questions
- ✅ Clicking "Skip" advances to next question
- ✅ Skipped question has no answer recorded

**Actual Result:** ___________

**Status:** ⬜ PASS | ⬜ FAIL

---

### Test 3.4: Generate Prompt button on last question

**Setup:**
1. Using multi-question task
2. Navigate to last question

**Expected Result:**
- ✅ "Next →" button replaced with "✨ Generate Prompt" button
- ✅ Button styled in green (#27ae60)
- ✅ Button disabled if required questions unanswered
- ✅ Button enabled when all required questions answered

**Actual Result:** ___________

**Status:** ⬜ PASS | ⬜ FAIL

---

## Test Section 4: Criticality Styling

### Test 4.1: Required questions show blocker indicator

**Setup:**
1. Trigger modal with required questions (any missing file gap)
2. Observe question header

**Expected Result:**
- ✅ 🚫 icon visible
- ✅ "Required" badge displayed
- ✅ Badge color: red (#e74c3c)
- ✅ Skip button NOT visible

**Actual Result:** ___________

**Status:** ⬜ PASS | ⬜ FAIL

---

### Test 4.2: Optional questions show optional indicator

**Setup:**
1. Trigger modal with optional question
2. Observe question header

**Expected Result:**
- ✅ 💡 icon visible
- ✅ "Optional" badge displayed
- ✅ Badge color: grey (#95a5a6)
- ✅ Skip button visible

**Actual Result:** ___________

**Status:** ⬜ PASS | ⬜ FAIL

---

## Test Section 5: Answer Collection and Submission

### Test 5.1: Answers are preserved when navigating

**Setup:**
1. Multi-question modal
2. Answer Question 1: "Test answer 1"
3. Navigate to Question 2
4. Answer Question 2: "Test answer 2"
5. Navigate back to Question 1

**Expected Result:**
- ✅ Question 1 still shows "Test answer 1"
- ✅ Navigate to Question 2 → still shows "Test answer 2"
- ✅ All answers preserved throughout navigation

**Actual Result:** ___________

**Status:** ⬜ PASS | ⬜ FAIL

---

### Test 5.2: Generate Prompt with all required answers

**Setup:**
1. Multi-question modal
2. Answer all required questions
3. Click "✨ Generate Prompt"

**Expected Result:**
- ✅ Modal closes
- ✅ Callback fires with answers
- ✅ Analyzer re-runs (TODO: with answers)
- ✅ Final enhanced prompt loaded to Voice text area
- ✅ Notification: "✅ AI-enhanced prompt for [TASK-ID] loaded..."

**Actual Result:** ___________

**Status:** ⬜ PASS | ⬜ FAIL

---

### Test 5.3: Cannot generate prompt without required answers

**Setup:**
1. Multi-question modal with required questions
2. Leave at least one required question unanswered
3. Navigate to last question
4. Click "✨ Generate Prompt"

**Expected Result:**
- ✅ Warning message: "Please answer all required questions before generating prompt"
- ✅ Modal does NOT close
- ✅ User can navigate back and answer questions

**Actual Result:** ___________

**Status:** ⬜ PASS | ⬜ FAIL

---

### Test 5.4: Cancel modal closes without generating

**Setup:**
1. Modal visible with questions
2. Answer some questions
3. Click "Cancel" button

**Expected Result:**
- ✅ Modal closes immediately
- ✅ No prompt generated
- ✅ No answers submitted
- ✅ User returned to Voice Panel

**Actual Result:** ___________

**Status:** ⬜ PASS | ⬜ FAIL

---

## Test Section 6: Performance

### Test 6.1: Modal renders in <200ms

**Setup:**
1. Trigger modal with 3-5 questions
2. Measure time from button click to modal visible

**Expected Result:**
- ✅ Modal appears in < 200ms
- ✅ No lag or delay
- ✅ Smooth rendering

**Actual Result:** ___________ ms

**Status:** ⬜ PASS | ⬜ FAIL

---

## Test Section 7: Integration with voicePanel

### Test 7.1: "Start Next Task" triggers modal when gaps

**Setup:**
1. Task with gaps is next ready task
2. Click "Start Next Task" button

**Expected Result:**
- ✅ Notification: "⏳ Generating AI-enhanced prompt for [TASK-ID]..."
- ✅ TaskAnalyzer runs
- ✅ Gaps detected
- ✅ Modal appears
- ✅ No prompt in text area until modal complete

**Actual Result:** ___________

**Status:** ⬜ PASS | ⬜ FAIL

---

### Test 7.2: "Start Task" (specific task) triggers modal when gaps

**Setup:**
1. Click "Start" button on specific task with gaps

**Expected Result:**
- ✅ Same flow as Test 7.1
- ✅ Modal appears for specific task
- ✅ Task ID correct in modal title

**Actual Result:** ___________

**Status:** ⬜ PASS | ⬜ FAIL

---

### Test 7.3: After answering, final prompt populates text area

**Setup:**
1. Trigger modal with gaps
2. Answer all required questions
3. Click "Generate Prompt"

**Expected Result:**
- ✅ Modal closes
- ✅ Analyzer re-runs
- ✅ Final AI-enhanced prompt appears in Voice text area
- ✅ User can review/edit prompt
- ✅ User can select terminal and send

**Actual Result:** ___________

**Status:** ⬜ PASS | ⬜ FAIL

---

## Test Section 8: Edge Cases

### Test 8.1: Multiple gap types in one task

**Setup:**
1. Create task with multiple gap types:
```toml
[tasks.TEST-MODAL-008]
id = "TEST-MODAL-008"
files_to_modify = ["vscode-lumina/src/services/Missing1.ts", "internal/sprints/ACTIVE_SPRINT.toml"]
description = "No pre-flight mentioned"
deliverables = ["Feature"]  # no tests
dependencies = ["UNMET-DEP"]
agent = "infrastructure-agent"
status = "pending"
```
2. Start task

**Expected Result:**
- ✅ Modal shows all questions (missing file, pre-flight, tests, dependency)
- ✅ Each question type renders correctly
- ✅ All questions must be answered

**Actual Result:** ___________

**Status:** ⬜ PASS | ⬜ FAIL

---

### Test 8.2: Task with only optional questions

**Setup:**
1. Create task with only optional gaps
2. Start task

**Expected Result:**
- ✅ Modal appears
- ✅ All questions show 💡 optional indicator
- ✅ Can skip all questions
- ✅ "Generate Prompt" enabled immediately

**Actual Result:** ___________

**Status:** ⬜ PASS | ⬜ FAIL

---

### Test 8.3: Long question text and help text

**Setup:**
1. Create task with gap that generates long question/help text
2. Observe modal rendering

**Expected Result:**
- ✅ Long text wraps correctly
- ✅ Modal remains readable
- ✅ Scrolling works if needed
- ✅ No text overflow or clipping

**Actual Result:** ___________

**Status:** ⬜ PASS | ⬜ FAIL

---

## Summary

**Total Tests:** 22
**Passing:** _____ / 22
**Failing:** _____ / 22

**Critical Scenarios (Must Pass):**
- ✅ Test 1.1: Modal appears when gaps detected
- ✅ Test 2.1: Text input renders
- ✅ Test 2.2: Choice input renders
- ✅ Test 2.3: Boolean input renders
- ✅ Test 3.1: Forward navigation works
- ✅ Test 3.2: Backward navigation works
- ✅ Test 4.1: Blocker styling visible
- ✅ Test 5.2: Generate prompt with answers
- ✅ Test 6.1: Performance <200ms
- ✅ Test 7.1: Integration with "Start Next Task"

**TaskQuestionModal Status:**
- ⬜ Ready for production
- ⬜ Needs fixes

---

## Notes

Record any observations, issues, or unexpected behavior here:

_______________________________________________
