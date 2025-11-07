# MANUAL_TEST_PROTECT-000B: Start Next Task with Smart Selection

**Task:** PROTECT-000B - Implement 'Start Next Task' with smart selection
**Version:** v0.16.15
**Date:** 2025-11-07
**Agent:** infrastructure-agent
**Pattern:** Pattern-CODE-001, Pattern-TDD-001

---

## Purpose

Verify that "Start Next Task" button works with phase-aware smart selection:
- Task selection respects phase order (same phase as last completed → earlier phases)
- Task selection checks dependencies correctly
- Spinner notification shows during analysis
- TaskAnalyzer integration works (gap detection)
- Q&A modal appears when gaps detected
- Final prompt populates text area
- Performance: Selection <100ms, full flow <5s

---

## Prerequisites

1. ✅ PROTECT-000A completed (TaskAnalyzer)
2. ✅ PROTECT-000D completed (Q&A Modal)
3. ✅ PROTECT-000B code committed
4. ✅ TaskStarter.ts enhanced (~240 lines)
5. ✅ Unit tests added (6 new tests)
6. ✅ TypeScript compiled successfully

---

## Test Section 1: Phase-Aware Selection

### Test 1.1: Selects task in same phase as last completed

**Setup:**
1. Open VS Code Extension Development Host (F5)
2. Create sprint with multiple phases:
```toml
[tasks.COMPLETED-PHASE-1]
id = "COMPLETED-PHASE-1"
name = "Completed Phase 1 Task"
phase = "phase-1-foundation"
status = "completed"
completed_date = "2025-11-07"
agent = "infrastructure-agent"
dependencies = []
estimated_time = "1 hour"

[tasks.PENDING-PHASE-1]
id = "PENDING-PHASE-1"
name = "Pending Phase 1 Task"
phase = "phase-1-foundation"
status = "pending"
agent = "infrastructure-agent"
dependencies = []
estimated_time = "1 hour"

[tasks.PENDING-PHASE-2]
id = "PENDING-PHASE-2"
name = "Pending Phase 2 Task"
phase = "phase-2-core"
status = "pending"
agent = "infrastructure-agent"
dependencies = []
estimated_time = "1 hour"
```
3. Open ÆtherLight Voice Panel
4. Click "Start Next Task" button

**Expected Result:**
- ✅ Selects PENDING-PHASE-1 (same phase as last completed)
- ✅ NOT PENDING-PHASE-2 (different phase)
- ✅ Notification: "⏳ Generating AI-enhanced prompt for PENDING-PHASE-1..."

**Actual Result:** ___________

**Status:** ⬜ PASS | ⬜ FAIL

---

### Test 1.2: Selects earliest phase when no completed tasks

**Setup:**
1. Create sprint with only pending tasks (no completed):
```toml
[tasks.PENDING-PHASE-3]
id = "PENDING-PHASE-3"
name = "Phase 3 Task"
phase = "phase-3-advanced"
status = "pending"
agent = "infrastructure-agent"
dependencies = []
estimated_time = "1 hour"

[tasks.PENDING-PHASE-1]
id = "PENDING-PHASE-1"
name = "Phase 1 Task"
phase = "phase-1-foundation"
status = "pending"
agent = "infrastructure-agent"
dependencies = []
estimated_time = "1 hour"
```
2. Click "Start Next Task"

**Expected Result:**
- ✅ Selects PENDING-PHASE-1 (earliest phase)
- ✅ NOT PENDING-PHASE-3 (later phase)

**Actual Result:** ___________

**Status:** ⬜ PASS | ⬜ FAIL

---

### Test 1.3: Priority order: phase → dependencies → time

**Setup:**
1. Create sprint testing full priority order:
```toml
[tasks.COMPLETED-PHASE-1]
id = "COMPLETED-PHASE-1"
phase = "phase-1-foundation"
status = "completed"
completed_date = "2025-11-07"
agent = "infrastructure-agent"
dependencies = []
estimated_time = "1 hour"

[tasks.PENDING-PHASE-1-LONG]
id = "PENDING-PHASE-1-LONG"
name = "Phase 1, 0 deps, 4 hours"
phase = "phase-1-foundation"
status = "pending"
agent = "infrastructure-agent"
dependencies = []
estimated_time = "4 hours"

[tasks.PENDING-PHASE-1-SHORT]
id = "PENDING-PHASE-1-SHORT"
name = "Phase 1, 0 deps, 1 hour"
phase = "phase-1-foundation"
status = "pending"
agent = "infrastructure-agent"
dependencies = []
estimated_time = "1 hour"

[tasks.PENDING-PHASE-1-DEPS]
id = "PENDING-PHASE-1-DEPS"
name = "Phase 1, 1 dep, 30 minutes"
phase = "phase-1-foundation"
status = "pending"
agent = "infrastructure-agent"
dependencies = ["COMPLETED-PHASE-1"]
estimated_time = "30 minutes"

[tasks.PENDING-PHASE-2-QUICK]
id = "PENDING-PHASE-2-QUICK"
name = "Phase 2, 0 deps, 30 minutes"
phase = "phase-2-core"
status = "pending"
agent = "infrastructure-agent"
dependencies = []
estimated_time = "30 minutes"
```
2. Click "Start Next Task"

**Expected Result:**
- ✅ Selects PENDING-PHASE-1-SHORT
- ✅ Reasoning:
  - Same phase as last completed (phase-1) → all phase-1 tasks qualify
  - Fewest dependencies (0 deps) → LONG and SHORT qualify
  - Shortest time (1 hour < 4 hours) → SHORT wins

**Actual Result:** ___________

**Status:** ⬜ PASS | ⬜ FAIL

---

## Test Section 2: Dependency Validation

### Test 2.1: Skips tasks with unmet dependencies

**Setup:**
1. Create sprint with blocked task:
```toml
[tasks.PENDING-DEP]
id = "PENDING-DEP"
name = "Task with Pending Dependency"
phase = "phase-1-foundation"
status = "pending"
agent = "infrastructure-agent"
dependencies = ["UNMET-DEP"]
estimated_time = "1 hour"

[tasks.PENDING-READY]
id = "PENDING-READY"
name = "Ready Task"
phase = "phase-1-foundation"
status = "pending"
agent = "infrastructure-agent"
dependencies = []
estimated_time = "2 hours"
```
2. Click "Start Next Task"

**Expected Result:**
- ✅ Selects PENDING-READY (no dependencies)
- ✅ Skips PENDING-DEP (unmet dependency)

**Actual Result:** ___________

**Status:** ⬜ PASS | ⬜ FAIL

---

### Test 2.2: Shows warning when all tasks blocked

**Setup:**
1. Create sprint where all pending tasks have unmet dependencies
2. Click "Start Next Task"

**Expected Result:**
- ✅ Warning message: "No ready tasks available. All tasks are either completed, in progress, or blocked by dependencies."
- ✅ No prompt generated
- ✅ No modal shown

**Actual Result:** ___________

**Status:** ⬜ PASS | ⬜ FAIL

---

## Test Section 3: Integration with TaskAnalyzer

### Test 3.1: Shows spinner notification during analysis

**Setup:**
1. Create sprint with ready task
2. Click "Start Next Task"
3. Observe notifications

**Expected Result:**
- ✅ First notification: "⏳ Generating AI-enhanced prompt for [TASK-ID]..."
- ✅ Spinner visible during analysis
- ✅ After analysis: "✅ AI-enhanced prompt for [TASK-ID] loaded..."

**Actual Result:** ___________

**Status:** ⬜ PASS | ⬜ FAIL

---

### Test 3.2: No gaps - Prompt directly populates text area

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
2. Click "Start Next Task"

**Expected Result:**
- ✅ TaskAnalyzer runs
- ✅ No gaps detected
- ✅ Modal does NOT appear
- ✅ AI-enhanced prompt appears in Voice text area
- ✅ User can review/edit prompt

**Actual Result:** ___________

**Status:** ⬜ PASS | ⬜ FAIL

---

### Test 3.3: Gaps detected - Q&A modal appears

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
2. Click "Start Next Task"

**Expected Result:**
- ✅ TaskAnalyzer runs
- ✅ Gaps detected (missing file)
- ✅ Q&A modal appears
- ✅ Question visible: "File does not exist. Should this file be created...?"
- ✅ No prompt in text area yet

**Actual Result:** ___________

**Status:** ⬜ PASS | ⬜ FAIL

---

### Test 3.4: After answering questions, prompt populates

**Setup:**
1. Trigger gap detection (as in Test 3.3)
2. Answer questions in modal
3. Click "Generate Prompt"

**Expected Result:**
- ✅ Modal closes
- ✅ Analyzer regenerates prompt
- ✅ Final prompt appears in Voice text area
- ✅ Notification: "✅ AI-enhanced prompt for [TASK-ID] loaded..."

**Actual Result:** ___________

**Status:** ⬜ PASS | ⬜ FAIL

---

## Test Section 4: Performance

### Test 4.1: Task selection completes in <100ms

**Setup:**
1. Create sprint with 20-50 tasks (mix of completed, pending, blocked)
2. Click "Start Next Task"
3. Measure time from click to first notification

**Expected Result:**
- ✅ Task selection: <100ms (imperceptible delay)
- ✅ First notification appears immediately: "⏳ Generating AI-enhanced prompt..."

**Actual Result:** ___________ ms

**Status:** ⬜ PASS | ⬜ FAIL

---

### Test 4.2: Full flow completes in <5s

**Setup:**
1. Create ready task (no gaps)
2. Click "Start Next Task"
3. Measure time from click to prompt in text area

**Expected Result:**
- ✅ Full flow (selection → analysis → prompt): <5s
- ✅ Typical: 1-3s

**Actual Result:** ___________ s

**Status:** ⬜ PASS | ⬜ FAIL

---

## Test Section 5: Edge Cases

### Test 5.1: Handles tasks with unusual phase names

**Setup:**
1. Create tasks with non-standard phase names:
```toml
[tasks.UNUSUAL-PHASE]
id = "UNUSUAL-PHASE"
name = "Unusual Phase Name"
phase = "initialization"  # no "phase-N" format
status = "pending"
agent = "infrastructure-agent"
dependencies = []
estimated_time = "1 hour"

[tasks.STANDARD-PHASE]
id = "STANDARD-PHASE"
name = "Standard Phase"
phase = "phase-1-foundation"
status = "pending"
agent = "infrastructure-agent"
dependencies = []
estimated_time = "2 hours"
```
2. Click "Start Next Task"

**Expected Result:**
- ✅ Selects STANDARD-PHASE (parseable phase number)
- ✅ UNUSUAL-PHASE deprioritized (defaults to phase 99)
- ✅ No errors or crashes

**Actual Result:** ___________

**Status:** ⬜ PASS | ⬜ FAIL

---

### Test 5.2: Handles phase numbers 1-10+ correctly

**Setup:**
1. Create tasks with various phase numbers:
```toml
[tasks.PHASE-10]
phase = "phase-10-final"
status = "pending"
agent = "infrastructure-agent"
dependencies = []
estimated_time = "1 hour"

[tasks.PHASE-2]
phase = "phase-2-core"
status = "pending"
agent = "infrastructure-agent"
dependencies = []
estimated_time = "1 hour"

[tasks.PHASE-1]
phase = "phase-1-foundation"
status = "pending"
agent = "infrastructure-agent"
dependencies = []
estimated_time = "1 hour"
```
2. Click "Start Next Task"

**Expected Result:**
- ✅ Selects PHASE-1 (earliest)
- ✅ Correct numeric sorting: 1 < 2 < 10 (not string sorting: "1" < "10" < "2")

**Actual Result:** ___________

**Status:** ⬜ PASS | ⬜ FAIL

---

### Test 5.3: Last completed task uses completion_date

**Setup:**
1. Create sprint with multiple completed tasks:
```toml
[tasks.COMPLETED-OLD]
id = "COMPLETED-OLD"
phase = "phase-1-foundation"
status = "completed"
completed_date = "2025-11-05"
agent = "infrastructure-agent"
dependencies = []
estimated_time = "1 hour"

[tasks.COMPLETED-RECENT]
id = "COMPLETED-RECENT"
phase = "phase-2-core"
status = "completed"
completed_date = "2025-11-07"  # Most recent
agent = "infrastructure-agent"
dependencies = []
estimated_time = "1 hour"

[tasks.PENDING-PHASE-1]
phase = "phase-1-foundation"
status = "pending"
agent = "infrastructure-agent"
dependencies = []
estimated_time = "1 hour"

[tasks.PENDING-PHASE-2]
phase = "phase-2-core"
status = "pending"
agent = "infrastructure-agent"
dependencies = []
estimated_time = "1 hour"
```
2. Click "Start Next Task"

**Expected Result:**
- ✅ Uses COMPLETED-RECENT's phase (phase-2-core) as reference
- ✅ Selects PENDING-PHASE-2 (same phase as most recent completed)
- ✅ NOT PENDING-PHASE-1 (older completed task's phase)

**Actual Result:** ___________

**Status:** ⬜ PASS | ⬜ FAIL

---

## Summary

**Total Tests:** 14
**Passing:** _____ / 14
**Failing:** _____ / 14

**Critical Scenarios (Must Pass):**
- ✅ Test 1.1: Phase-aware selection (same phase as last completed)
- ✅ Test 1.3: Full priority order (phase → deps → time)
- ✅ Test 2.1: Skips blocked tasks
- ✅ Test 3.2: No gaps - direct prompt
- ✅ Test 3.3: Gaps detected - modal appears
- ✅ Test 3.4: After questions, prompt populates
- ✅ Test 4.1: Selection <100ms
- ✅ Test 4.2: Full flow <5s

**Phase-Aware Smart Selection Status:**
- ⬜ Ready for production
- ⬜ Needs fixes

---

## Notes

Record any observations, issues, or unexpected behavior here:

_______________________________________________
