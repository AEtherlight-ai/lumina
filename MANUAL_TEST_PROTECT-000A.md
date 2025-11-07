# MANUAL_TEST_PROTECT-000A: Variable-Driven Task Analyzer

**Task:** PROTECT-000A - Build variable-driven task analyzer (MVP)
**Version:** v0.16.15
**Date:** 2025-11-07
**Agent:** infrastructure-agent
**Pattern:** Pattern-CODE-001, Pattern-TDD-001

---

## Purpose

Verify that TaskAnalyzer service works correctly:
- Loads .aetherlight/config.json successfully
- Detects gaps (missing files, unmet dependencies, missing tests, preflight violations)
- Generates questions from gaps
- Returns ready status when no gaps
- Uses config variables (not hard-coded)
- Performs analysis <2 seconds

---

## Prerequisites

1. ✅ PROTECT-000A code committed
2. ✅ TaskAnalyzer.ts implemented (~350 lines)
3. ✅ .aetherlight/config.json created
4. ✅ TypeScript compiled successfully

---

## Test Section 1: Load Configuration

### Test 1.1: Load config.json successfully

**Steps:**
1. Open VS Code Extension Development Host (F5)
2. Open Developer Tools Console (Help > Toggle Developer Tools)
3. In console, run:
```javascript
const TaskAnalyzer = require('./out/services/TaskAnalyzer').TaskAnalyzer;
const analyzer = new TaskAnalyzer('C:\\Users\\Brett\\Dropbox\\Ferret9 Global\\lumina-clean');
const config = await analyzer.loadConfig();
console.log(config);
```

**Expected Result:**
- ✅ Config loaded successfully
- ✅ config.structure.sprintDir === "internal/sprints"
- ✅ config.testing.framework === "mocha"
- ✅ No errors

**Actual Result:** ___________

**Status:** ⬜ PASS | ⬜ FAIL

---

### Test 1.2: Config cached after first load

**Steps:**
1. Run loadConfig() twice
2. Verify second call uses cache (faster)

**Expected Result:**
- ✅ First call: reads file
- ✅ Second call: returns cached value
- ✅ Performance: <10ms for cached call

**Actual Result:** ___________

**Status:** ⬜ PASS | ⬜ FAIL

---

## Test Section 2: Gap Detection - Missing Files

### Test 2.1: Detect missing file from task.files_to_modify

**Steps:**
1. Create mock task:
```javascript
const mockTask = {
    id: 'TEST-001',
    name: 'Test Task',
    files_to_modify: ['vscode-lumina/src/services/NonExistentFile.ts'],
    status: 'pending',
    phase: 'phase-1',
    agent: 'infrastructure-agent',
    dependencies: []
};
const result = await analyzer.analyzeTask(mockTask);
console.log(result);
```

**Expected Result:**
- ✅ result.status === 'needs_clarification'
- ✅ result.gaps.length > 0
- ✅ Gap type: 'missing_file'
- ✅ Gap message includes 'NonExistentFile.ts'

**Actual Result:** ___________

**Status:** ⬜ PASS | ⬜ FAIL

---

### Test 2.2: No gap for existing file

**Steps:**
1. Create mock task with existing file:
```javascript
const mockTask = {
    id: 'TEST-002',
    files_to_modify: ['vscode-lumina/src/extension.ts'], // exists
    status: 'pending',
    agent: 'infrastructure-agent'
};
const result = await analyzer.analyzeTask(mockTask);
```

**Expected Result:**
- ✅ No 'missing_file' gaps
- ✅ result.gaps filtered for missing_file === []

**Actual Result:** ___________

**Status:** ⬜ PASS | ⬜ FAIL

---

## Test Section 3: Gap Detection - Unmet Dependencies

### Test 3.1: Detect unmet dependency

**Steps:**
1. Create mock task with dependencies:
```javascript
const mockTask = {
    id: 'TEST-003',
    dependencies: ['PROTECT-999'], // doesn't exist
    status: 'pending',
    agent: 'infrastructure-agent'
};
const mockCompletedTasks = [
    { id: 'PROTECT-001', status: 'completed' }
];
const result = await analyzer.analyzeTask(mockTask, mockCompletedTasks);
```

**Expected Result:**
- ✅ result.status === 'needs_clarification'
- ✅ Gap type: 'unmet_dependency'
- ✅ Gap severity: 'blocking'
- ✅ Gap message includes 'PROTECT-999'

**Actual Result:** ___________

**Status:** ⬜ PASS | ⬜ FAIL

---

### Test 3.2: No gap when all dependencies completed

**Steps:**
1. Create mock task with completed dependencies:
```javascript
const mockTask = {
    id: 'TEST-004',
    dependencies: ['PROTECT-001', 'PROTECT-002', 'PROTECT-003'],
    status: 'pending',
    agent: 'infrastructure-agent'
};
const mockCompletedTasks = [
    { id: 'PROTECT-001', status: 'completed' },
    { id: 'PROTECT-002', status: 'completed' },
    { id: 'PROTECT-003', status: 'completed' }
];
const result = await analyzer.analyzeTask(mockTask, mockCompletedTasks);
```

**Expected Result:**
- ✅ No 'unmet_dependency' gaps
- ✅ result.status could be 'ready' (if no other gaps)

**Actual Result:** ___________

**Status:** ⬜ PASS | ⬜ FAIL

---

## Test Section 4: Gap Detection - Missing Test Strategy

### Test 4.1: Detect missing tests for infrastructure-agent

**Steps:**
1. Create mock task without test deliverables:
```javascript
const mockTask = {
    id: 'TEST-005',
    agent: 'infrastructure-agent',
    deliverables: ['Feature A', 'Feature B'], // no test mention
    status: 'pending'
};
const result = await analyzer.analyzeTask(mockTask);
```

**Expected Result:**
- ✅ Gap type: 'missing_tests'
- ✅ Gap message includes 'test strategy'
- ✅ Gap suggestion includes '90%' (infrastructure coverage)

**Actual Result:** ___________

**Status:** ⬜ PASS | ⬜ FAIL

---

### Test 4.2: No gap when tests mentioned

**Steps:**
1. Create mock task with test deliverables:
```javascript
const mockTask = {
    id: 'TEST-006',
    agent: 'infrastructure-agent',
    deliverables: ['Feature A', 'Unit tests (90% coverage)'],
    status: 'pending'
};
const result = await analyzer.analyzeTask(mockTask);
```

**Expected Result:**
- ✅ No 'missing_tests' gaps

**Actual Result:** ___________

**Status:** ⬜ PASS | ⬜ FAIL

---

## Test Section 5: Gap Detection - Pre-Flight Violations

### Test 5.1: Detect TOML editing without pre-flight

**Steps:**
1. Create mock task modifying TOML:
```javascript
const mockTask = {
    id: 'TEST-007',
    files_to_modify: ['internal/sprints/ACTIVE_SPRINT.toml'],
    description: 'Modify sprint file', // no pre-flight mention
    status: 'pending',
    agent: 'infrastructure-agent'
};
const result = await analyzer.analyzeTask(mockTask);
```

**Expected Result:**
- ✅ Gap type: 'preflight_violation'
- ✅ Gap severity: 'blocking'
- ✅ Gap message includes 'pre-flight checklist'

**Actual Result:** ___________

**Status:** ⬜ PASS | ⬜ FAIL

---

### Test 5.2: No gap when pre-flight mentioned

**Steps:**
1. Create mock task with pre-flight reference:
```javascript
const mockTask = {
    id: 'TEST-008',
    files_to_modify: ['internal/sprints/ACTIVE_SPRINT.toml'],
    description: 'Modify sprint file. Pre-flight checklist: read SprintLoader.ts first.',
    status: 'pending',
    agent: 'infrastructure-agent'
};
const result = await analyzer.analyzeTask(mockTask);
```

**Expected Result:**
- ✅ No 'preflight_violation' gaps

**Actual Result:** ___________

**Status:** ⬜ PASS | ⬜ FAIL

---

## Test Section 6: Question Generation

### Test 6.1: Generate questions from gaps

**Steps:**
1. Create task with multiple gaps:
```javascript
const mockTask = {
    id: 'TEST-009',
    files_to_modify: ['NonExistent.ts', 'internal/sprints/ACTIVE_SPRINT.toml'],
    dependencies: ['UNMET-DEP'],
    description: 'No pre-flight mentioned',
    agent: 'infrastructure-agent',
    status: 'pending'
};
const result = await analyzer.analyzeTask(mockTask);
console.log(result.questions);
```

**Expected Result:**
- ✅ result.status === 'needs_clarification'
- ✅ result.questions.length > 0
- ✅ Each question has: id, question, type, required
- ✅ Question types: 'text', 'boolean', 'choice'

**Actual Result:** ___________

**Status:** ⬜ PASS | ⬜ FAIL

---

### Test 6.2: Ready status when no gaps

**Steps:**
1. Create perfect task (no gaps):
```javascript
const mockTask = {
    id: 'TEST-010',
    files_to_modify: ['vscode-lumina/src/extension.ts'], // exists
    dependencies: [], // no deps
    agent: 'documentation-agent', // no test requirement
    status: 'pending'
};
const result = await analyzer.analyzeTask(mockTask);
```

**Expected Result:**
- ✅ result.status === 'ready'
- ✅ result.context exists
- ✅ result.gaps === []
- ✅ result.context.task === mockTask
- ✅ result.context.config exists

**Actual Result:** ___________

**Status:** ⬜ PASS | ⬜ FAIL

---

## Test Section 7: Performance

### Test 7.1: Analysis completes <2 seconds

**Steps:**
1. Create typical task:
```javascript
const start = Date.now();
const mockTask = {
    id: 'TEST-011',
    files_to_modify: ['vscode-lumina/src/extension.ts'],
    dependencies: [],
    agent: 'infrastructure-agent',
    status: 'pending'
};
const result = await analyzer.analyzeTask(mockTask);
const duration = Date.now() - start;
console.log(`Analysis time: ${duration}ms`);
```

**Expected Result:**
- ✅ duration < 2000ms
- ✅ Typical: 50-200ms

**Actual Result:** ___________ ms

**Status:** ⬜ PASS | ⬜ FAIL

---

## Test Section 8: Config Variable Usage

### Test 8.1: Uses config.structure.sprintDir

**Steps:**
1. Check sprint path:
```javascript
const sprintPath = analyzer.getSprintPath();
console.log(sprintPath);
```

**Expected Result:**
- ✅ Path includes config.structure.sprintDir value
- ✅ Not hard-coded to "internal/sprints"

**Actual Result:** ___________

**Status:** ⬜ PASS | ⬜ FAIL

---

### Test 8.2: Works with different project configs

**Steps:**
1. Modify .aetherlight/config.json:
   - Change sprintDir to "sprints"
   - Change testing.framework to "jest"
2. Reload config
3. Verify analyzer uses new values

**Expected Result:**
- ✅ Analyzer adapts to new config
- ✅ Not hard-coded to ÆtherLight specifics
- ✅ Generic design confirmed

**Actual Result:** ___________

**Status:** ⬜ PASS | ⬜ FAIL

---

## Summary

**Total Tests:** 16
**Passing:** _____ / 16
**Failing:** _____ / 16

**Critical Scenarios (Must Pass):**
- ✅ Test 1.1: Load config successfully
- ✅ Test 2.1: Detect missing files
- ✅ Test 3.1: Detect unmet dependencies
- ✅ Test 4.1: Detect missing test strategy
- ✅ Test 5.1: Detect pre-flight violations
- ✅ Test 6.1: Generate questions from gaps
- ✅ Test 7.1: Performance <2s
- ✅ Test 8.1: Uses config variables

**TaskAnalyzer Status:**
- ⬜ Ready for integration with TaskPromptExporter
- ⬜ Needs fixes

---

## Notes

Record any observations, issues, or unexpected behavior here:

_______________________________________________
