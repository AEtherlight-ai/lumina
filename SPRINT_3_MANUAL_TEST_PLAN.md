# Sprint 3 - Unified v1.0 - Manual Test Plan

**Sprint:** Sprint 3 - Unified v1.0
**Version:** v0.16.15+
**Date Created:** 2025-11-07
**Status:** ⏳ Ready for Testing

---

## Purpose

This is your **one-stop manual test checklist** for Sprint 3. Use this to spot-check the system upon release and provide feedback for the next sprint.

**What's in Sprint 3:**
- **Phase 1:** Template System (TEMPLATE-001 through TEMPLATE-006)
- **Protection System:** Code protection and enforcement (PROTECT-000A through PROTECT-002)
- **Prompt System:** AI-enhanced task prompts with gap detection (PROTECT-000A through PROTECT-000D)

**Total Tests:** 129 tests across 7 feature areas

---

## Quick Test Status

| Feature Area | Tests | Status | Priority |
|-------------|-------|--------|----------|
| **Phase 1: Template System** | 30 | ⏳ Pending | HIGH |
| **PROTECT-000A: Task Analyzer** | 16 | ⏳ Pending | HIGH |
| **PROTECT-000B: Start Next Task** | 14 | ⏳ Pending | HIGH |
| **PROTECT-000C: Start This Task** | 14 | ⏳ Pending | MEDIUM |
| **PROTECT-000D: Q&A Modal** | 22 | ⏳ Pending | HIGH |
| **PROTECT-001: Code Protection** | 20 | ⏳ Pending | HIGH |
| **PROTECT-002: Pre-Commit Hook** | 13 | ⏳ Pending | HIGH |

---

## Testing Instructions

1. **Open Extension Development Host:** Press F5 in VS Code
2. **Open Developer Tools:** Help → Toggle Developer Tools
3. **Run tests in order** (or skip to specific sections)
4. **Mark results:** ✅ PASS | ❌ FAIL | ⏭️ SKIP
5. **Document issues** at the end

---

# Phase 1: Template System (30 Tests)

**Goal:** Sprint template normalization for consistent quality assurance

**Phase Status:** ✅ Implementation Complete | ⏳ Testing Pending

---

## TEMPLATE-001: Create SPRINT_TEMPLATE.toml

### Test 1.1: TOML Parsing Validation
**Status:** ⏳ Not Tested

**Steps:**
1. Run: `node -e "const toml = require('@iarna/toml'); toml.parse(require('fs').readFileSync('internal/sprints/SPRINT_TEMPLATE.toml', 'utf-8'));"`
2. Verify no errors

**Expected:** ✅ TOML parses without errors

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 1.2: Template Structure Validation
**Status:** ⏳ Not Tested

**Steps:**
1. Open `internal/sprints/SPRINT_TEMPLATE.toml`
2. Verify sections:
   - `[template.metadata]`
   - `[template.required]` with 13 tasks
   - `[template.suggested]` with 4 tasks
   - `[template.conditional]` with 8 tasks
   - `[template.retrospective]` with 2 tasks

**Expected:** ✅ All 27 tasks present with correct IDs

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 1.3: Rich Format Validation
**Status:** ⏳ Not Tested

**Steps:**
1. Pick 3 random tasks from template
2. Verify each has: `why`, `context`, `reasoning_chain`, `success_impact`, `deliverables`, `validation_criteria`

**Expected:** ✅ All tasks have complete rich format

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

## TEMPLATE-002: Sprint-plan skill with template injection

### Test 2.1: Feature-Only Sprint Generation
**Status:** ⏳ Not Tested

**Steps:**
1. Run: `/sprint-plan 'build API endpoints for user management'`
2. Verify generated sprint has:
   - Feature tasks (API-001, API-002, etc.)
   - REQUIRED tasks (13): DOC-*, QA-*, AGENT-*, INFRA-*, CONFIG-*
   - SUGGESTED tasks (4): PERF-*, SEC-*, COMPAT-*
   - RETROSPECTIVE tasks (2): RETRO-*
   - NO PUB-* tasks

**Expected:** ✅ ~24-28 total tasks (feature + template), no publishing tasks

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 2.2: Release Sprint Generation
**Status:** ⏳ Not Tested

**Steps:**
1. Run: `/sprint-plan 'release v2.0 with authentication'`
2. Verify generated sprint has:
   - Feature tasks
   - REQUIRED tasks (13)
   - SUGGESTED tasks (4)
   - CONDITIONAL publishing tasks (5): PUB-001 to PUB-005
   - RETROSPECTIVE tasks (2)

**Expected:** ✅ ~27-32 total tasks, publishing tasks present (PUB-*)

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 2.3: User-Facing Sprint Generation
**Status:** ⏳ Not Tested

**Steps:**
1. Run: `/sprint-plan 'redesign dashboard UI'`
2. Verify generated sprint has:
   - UI feature tasks
   - REQUIRED tasks (13)
   - SUGGESTED tasks (4)
   - CONDITIONAL UX tasks (3): UX-001, UX-002, UX-003
   - RETROSPECTIVE tasks (2)

**Expected:** ✅ ~25-30 total tasks, UX tasks present

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 2.4: Task ID Collision Avoidance
**Status:** ⏳ Not Tested

**Steps:**
1. Generate any sprint
2. Verify no duplicate task IDs
3. Verify template prefixes (DOC-*, QA-*, etc.) don't collide with feature prefixes

**Expected:** ✅ All task IDs unique

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

## TEMPLATE-003: SprintSchemaValidator with template validation

### Test 3.1: Missing Required Task Detection
**Status:** ⏳ Not Tested

**Steps:**
1. Create test sprint missing DOC-001
2. Save file (triggers validation)
3. Check VS Code notifications

**Expected:** ✅ Error: "Missing required template task: DOC-001", sprint does NOT load

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 3.2: Publishing Sprint Conditional Validation
**Status:** ⏳ Not Tested

**Steps:**
1. Create sprint with:
   - `sprint_name = "Release v1.0"`
   - All REQUIRED tasks
   - Missing PUB-001
2. Save and check validation

**Expected:** ✅ Error: "Publishing sprint missing conditional task: PUB-001"

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 3.3: Complete Sprint Validation Pass
**Status:** ⏳ Not Tested

**Steps:**
1. Create sprint with all REQUIRED + RETROSPECTIVE tasks
2. Save file

**Expected:** ✅ "Sprint TOML validation passed", sprint loads in panel

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 3.4: Suggested Task Warning
**Status:** ⏳ Not Tested

**Steps:**
1. Create sprint missing PERF-001 with no justification
2. Save file

**Expected:** ⚠️ Warning: "SUGGESTED task PERF-001 skipped without justification", sprint still loads

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 3.5: Suggested Task Skip WITH Justification
**Status:** ⏳ Not Tested

**Steps:**
1. Create sprint missing PERF-001
2. Add:
   ```toml
   [metadata.template_justifications]
   skipped_suggested = ["PERF-001: No performance changes"]
   ```
3. Save file

**Expected:** ✅ No warnings, sprint loads

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

## TEMPLATE-004: Runtime validation in WorkflowCheck

### Test 4.1: All Required Tasks Complete - Bonus Confidence
**Status:** ⏳ Not Tested

**Steps:**
1. Open ACTIVE_SPRINT.toml
2. Verify all REQUIRED tasks (DOC-001 through CONFIG-001) have `status = "completed"`
3. Verify all RETROSPECTIVE tasks (RETRO-001, RETRO-002) have `status = "completed"`
4. In VS Code, attempt to start new sprint via WorkflowCheck

**Expected:** ✅ Template compliance check passes, confidence score >= 0.85 (base 0.85 + 0.10 bonus)

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 4.2: Missing Required Task Blocks Sprint
**Status:** ⏳ Not Tested

**Steps:**
1. Open ACTIVE_SPRINT.toml
2. Change DOC-001 status to `status = "pending"` (or remove the task)
3. In VS Code, attempt to start new sprint via WorkflowCheck
4. Check notification/error message

**Expected:** ❌ Error: "Cannot start new sprint: Complete required template tasks (DOC-001, ...)", sprint creation blocked

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 4.3: Missing Suggested Task Warns (Non-Blocking)
**Status:** ⏳ Not Tested

**Steps:**
1. Open ACTIVE_SPRINT.toml
2. Verify all REQUIRED and RETROSPECTIVE tasks completed
3. Change PERF-001 status to `status = "pending"` (or remove the task)
4. In VS Code, attempt to start new sprint via WorkflowCheck

**Expected:** ⚠️ Warning: "Suggested task PERF-001 incomplete", sprint creation allowed (non-blocking)

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 4.4: Missing Retrospective Task Blocks Sprint
**Status:** ⏳ Not Tested

**Steps:**
1. Open ACTIVE_SPRINT.toml
2. Verify all REQUIRED tasks completed
3. Change RETRO-001 status to `status = "pending"` (or remove the task)
4. In VS Code, attempt to start new sprint via WorkflowCheck

**Expected:** ❌ Error: "Cannot start new sprint: Complete retrospective tasks (RETRO-001)", sprint creation blocked

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 4.5: Publishing Sprint Requires PUB-* Tasks
**Status:** ⏳ Not Tested

**Steps:**
1. Open ACTIVE_SPRINT.toml
2. Verify `sprint_name` contains "release" or "v1.0"
3. Verify all REQUIRED and RETROSPECTIVE tasks completed
4. Change PUB-001 status to `status = "pending"` (or remove all PUB-* tasks)
5. In VS Code, attempt to start new sprint via WorkflowCheck

**Expected:** ❌ Error: "Publishing sprint requires: PUB-001, ... (prevents version mismatch)", sprint creation blocked

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 4.6: Performance Target - Template Check Completes in <100ms
**Status:** ⏳ Not Tested

**Steps:**
1. Open VS Code Developer Tools (Help → Toggle Developer Tools)
2. Go to Console tab
3. Run WorkflowCheck.checkWorkflow('sprint', context) with timer
4. Check execution time logs in MiddlewareLogger output

**Expected:** ✅ checkTemplateCompliance() completes in <100ms, total workflow check remains <500ms

**Result:** [ ] PASS | [ ] FAIL
**Time:** ___________ ms
**Notes:** ___________

---

## TEMPLATE-005: Documentation consolidation

### Test 5.1: SPRINT_TEMPLATE_GUIDE.md Completeness
**Status:** ⏳ Not Tested

**Steps:**
1. Open `internal/SPRINT_TEMPLATE_GUIDE.md`
2. Verify file exists and is readable
3. Check Table of Contents sections: Overview, Why Templates?, Task Categories, Using the Template, Enforcement Mechanisms, Customizing the Template, Troubleshooting, Version History
4. Count total line count

**Expected:** ✅ File exists, all 8 sections present, approximately 600+ lines, task category reference table with all 27 tasks

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 5.2: Task Category Reference Table Accuracy
**Status:** ⏳ Not Tested

**Steps:**
1. Open `internal/SPRINT_TEMPLATE_GUIDE.md`
2. Navigate to "Task Categories" section
3. Verify task category tables:
   - REQUIRED tasks (13): DOC-001 to DOC-004, QA-001 to QA-004, AGENT-001 to AGENT-002, INFRA-001 to INFRA-002, CONFIG-001
   - SUGGESTED tasks (4): PERF-001, SEC-001, COMPAT-001, COMPAT-002
   - CONDITIONAL tasks (8): PUB-001 to PUB-005, UX-001 to UX-003
   - RETROSPECTIVE tasks (2): RETRO-001, RETRO-002
4. Verify counts match SPRINT_TEMPLATE.toml

**Expected:** ✅ All 27 tasks documented, task IDs match, counts: 13 + 4 + 8 + 2 = 27 total

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 5.3: CLAUDE.md Pattern Reference Added
**Status:** ⏳ Not Tested

**Steps:**
1. Open `.claude/CLAUDE.md`
2. Search for "Pattern-SPRINT-TEMPLATE-001"
3. Verify link points to `../internal/SPRINT_TEMPLATE_GUIDE.md`
4. Check Reference Documentation section includes SPRINT_TEMPLATE_GUIDE.md

**Expected:** ✅ Pattern-SPRINT-TEMPLATE-001 in Workflow Protocols table, link to SPRINT_TEMPLATE_GUIDE.md

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 5.4: Enforcement Mechanisms Documentation
**Status:** ⏳ Not Tested

**Steps:**
1. Open `internal/SPRINT_TEMPLATE_GUIDE.md`
2. Navigate to "Enforcement Mechanisms" section
3. Verify all 4 layers documented:
   - Layer 1: Auto-injection (sprint-plan skill)
   - Layer 2: Static validation (SprintSchemaValidator)
   - Layer 3: Runtime enforcement (WorkflowCheck)
   - Layer 4: Retrospective learning (RETRO tasks)
4. Check code examples and file references included

**Expected:** ✅ All 4 enforcement layers documented, file references included, code examples for each layer

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 5.5: Troubleshooting Guide Accuracy
**Status:** ⏳ Not Tested

**Steps:**
1. Open `internal/SPRINT_TEMPLATE_GUIDE.md`
2. Navigate to "Troubleshooting" section
3. Check error scenarios documented:
   - "Missing required template task: DOC-001"
   - "SUGGESTED task SEC-001 skipped without justification"
   - "Publishing sprint missing conditional task: PUB-001"
   - "Cannot start new sprint: Required task DOC-001 incomplete"
4. Verify solutions provided for each error

**Expected:** ✅ All common errors documented, clear solutions provided, example TOML snippets included

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

## TEMPLATE-006: Test template system by generating Phase 7 tasks

### Test 6.1: New Sprint Generation with Template Injection
**Status:** ⏳ Not Tested

**Steps:**
1. Run: `/sprint-plan 'build REST API endpoints for user management'`
2. Wait for sprint generation to complete
3. Check generated sprint TOML file
4. Count total tasks: feature tasks (5+) + template tasks (19) = 24+ total
5. Verify template tasks present: DOC-001 through DOC-004, QA-001 through QA-004, AGENT-001, AGENT-002, INFRA-001, INFRA-002, CONFIG-001, PERF-001, SEC-001, COMPAT-001, COMPAT-002, RETRO-001, RETRO-002

**Expected:** ✅ Sprint generated with 24+ tasks, all 19 non-conditional template tasks present, NO publishing tasks, generation completes in <5 seconds

**Result:** [ ] PASS | [ ] FAIL
**Feature tasks:** ___, **Template tasks:** ___, **Total:** ___, **Time:** ___s
**Notes:** ___________

---

### Test 6.2: Publishing Sprint Template Injection
**Status:** ⏳ Not Tested

**Steps:**
1. Run: `/sprint-plan 'release v2.0 with new authentication system'`
2. Wait for sprint generation to complete
3. Check generated sprint TOML file
4. Verify publishing tasks present: PUB-001 through PUB-005 (5 publishing tasks)
5. Count total: feature tasks + 19 base template + 5 publishing + 2 retro = 26+ total

**Expected:** ✅ Sprint generated with 26+ tasks, all base template tasks present, publishing tasks present (PUB-001 through PUB-005)

**Result:** [ ] PASS | [ ] FAIL
**Publishing tasks present:** ___
**Notes:** ___________

---

### Test 6.3: SprintSchemaValidator with Template Tasks
**Status:** ⏳ Not Tested

**Steps:**
1. Generate sprint with `/sprint-plan` (from Test 6.1)
2. Save the generated sprint TOML file
3. FileSystemWatcher triggers SprintSchemaValidator
4. Check VS Code notifications

**Expected:** ✅ "Sprint TOML validation passed", no errors about missing template tasks, sprint loads in Sprint panel, all tasks visible in webview

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 6.4: Task ID Collision Detection
**Status:** ⏳ Not Tested

**Steps:**
1. Generate sprint with `/sprint-plan` (from Test 6.1)
2. Check all task IDs in generated sprint
3. Verify no duplicate IDs
4. Verify template uses reserved prefixes (DOC-*, QA-*, AGENT-*, etc.)
5. Verify feature tasks use different prefixes (API-*, FEAT-*, etc.)

**Expected:** ✅ All task IDs unique (no duplicates), template tasks use reserved prefixes, feature tasks don't conflict

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 6.5: Existing Sprint Migration Challenge
**Status:** ✅ Documented

**Expected:** ✅ Sprint 3 has conflicts: QA-001, UX-001, UX-003 already exist, migration needed for existing sprints

**Result:** ✅ PASS - Conflicts documented in TEMPLATE_SYSTEM_VALIDATION_FINDINGS.md

---

### Test 6.6: Template System Validation Findings Review
**Status:** ⏳ Not Tested

**Steps:**
1. Open `internal/TEMPLATE_SYSTEM_VALIDATION_FINDINGS.md`
2. Review validation results for all 4 layers
3. Check task inventory (27 tasks)
4. Review migration options for existing sprints
5. Verify template improvements documented

**Expected:** ✅ All 4 layers validated, all 27 tasks inventoried, migration challenge documented with 3 options, template improvements listed, template v1.0.0 marked as VALIDATED

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

# PROTECT-000A: Variable-Driven Task Analyzer (16 Tests)

**Goal:** Build variable-driven task analyzer (MVP) for gap detection

**Agent:** infrastructure-agent
**Pattern:** Pattern-CODE-001, Pattern-TDD-001

---

## Section 1: Load Configuration

### Test 1.1: Load config.json successfully
**Status:** ⏳ Not Tested

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

**Expected:** ✅ Config loaded successfully, config.structure.sprintDir === "internal/sprints", config.testing.framework === "mocha", no errors

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 1.2: Config cached after first load
**Status:** ⏳ Not Tested

**Steps:**
1. Run loadConfig() twice
2. Verify second call uses cache (faster)

**Expected:** ✅ First call reads file, second call returns cached value, performance <10ms for cached call

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

## Section 2: Gap Detection - Missing Files

### Test 2.1: Detect missing file from task.files_to_modify
**Status:** ⏳ Not Tested

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

**Expected:** ✅ result.status === 'needs_clarification', result.gaps.length > 0, gap type: 'missing_file', gap message includes 'NonExistentFile.ts'

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 2.2: No gap for existing file
**Status:** ⏳ Not Tested

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

**Expected:** ✅ No 'missing_file' gaps, result.gaps filtered for missing_file === []

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

## Section 3: Gap Detection - Unmet Dependencies

### Test 3.1: Detect unmet dependency
**Status:** ⏳ Not Tested

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

**Expected:** ✅ result.status === 'needs_clarification', gap type: 'unmet_dependency', gap severity: 'blocking', gap message includes 'PROTECT-999'

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 3.2: No gap when all dependencies completed
**Status:** ⏳ Not Tested

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

**Expected:** ✅ No 'unmet_dependency' gaps, result.status could be 'ready' (if no other gaps)

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

## Section 4: Gap Detection - Missing Test Strategy

### Test 4.1: Detect missing tests for infrastructure-agent
**Status:** ⏳ Not Tested

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

**Expected:** ✅ Gap type: 'missing_tests', gap message includes 'test strategy', gap suggestion includes '90%' (infrastructure coverage)

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 4.2: No gap when tests mentioned
**Status:** ⏳ Not Tested

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

**Expected:** ✅ No 'missing_tests' gaps

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

## Section 5: Gap Detection - Pre-Flight Violations

### Test 5.1: Detect TOML editing without pre-flight
**Status:** ⏳ Not Tested

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

**Expected:** ✅ Gap type: 'preflight_violation', gap severity: 'blocking', gap message includes 'pre-flight checklist'

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 5.2: No gap when pre-flight mentioned
**Status:** ⏳ Not Tested

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

**Expected:** ✅ No 'preflight_violation' gaps

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

## Section 6: Question Generation

### Test 6.1: Generate questions from gaps
**Status:** ⏳ Not Tested

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

**Expected:** ✅ result.status === 'needs_clarification', result.questions.length > 0, each question has: id, question, type, required, question types: 'text', 'boolean', 'choice'

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 6.2: Ready status when no gaps
**Status:** ⏳ Not Tested

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

**Expected:** ✅ result.status === 'ready', result.context exists, result.gaps === [], result.context.task === mockTask, result.context.config exists

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

## Section 7: Performance

### Test 7.1: Analysis completes <2 seconds
**Status:** ⏳ Not Tested

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

**Expected:** ✅ duration < 2000ms, typical: 50-200ms

**Result:** [ ] PASS | [ ] FAIL
**Time:** ___________ ms
**Notes:** ___________

---

## Section 8: Config Variable Usage

### Test 8.1: Uses config.structure.sprintDir
**Status:** ⏳ Not Tested

**Steps:**
1. Check sprint path:
```javascript
const sprintPath = analyzer.getSprintPath();
console.log(sprintPath);
```

**Expected:** ✅ Path includes config.structure.sprintDir value, not hard-coded to "internal/sprints"

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 8.2: Works with different project configs
**Status:** ⏳ Not Tested

**Steps:**
1. Modify .aetherlight/config.json:
   - Change sprintDir to "sprints"
   - Change testing.framework to "jest"
2. Reload config
3. Verify analyzer uses new values

**Expected:** ✅ Analyzer adapts to new config, not hard-coded to ÆtherLight specifics, generic design confirmed

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

# PROTECT-000B: Start Next Task with Smart Selection (14 Tests)

**Goal:** Implement 'Start Next Task' with phase-aware smart selection

**Agent:** infrastructure-agent
**Pattern:** Pattern-CODE-001, Pattern-TDD-001

---

## Section 1: Phase-Aware Selection

### Test 1.1: Selects task in same phase as last completed
**Status:** ⏳ Not Tested

**Setup:** Create sprint with multiple phases, completed phase-1 task, pending phase-1 task, pending phase-2 task

**Steps:**
1. Open ÆtherLight Voice Panel
2. Click "Start Next Task" button

**Expected:** ✅ Selects PENDING-PHASE-1 (same phase as last completed), NOT PENDING-PHASE-2, notification: "⏳ Generating AI-enhanced prompt for PENDING-PHASE-1..."

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 1.2: Selects earliest phase when no completed tasks
**Status:** ⏳ Not Tested

**Setup:** Create sprint with only pending tasks (no completed): phase-3 task, phase-1 task

**Steps:**
1. Click "Start Next Task"

**Expected:** ✅ Selects PENDING-PHASE-1 (earliest phase), NOT PENDING-PHASE-3 (later phase)

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 1.3: Priority order: phase → dependencies → time
**Status:** ⏳ Not Tested

**Setup:** Create sprint with: completed phase-1 task, pending phase-1 tasks with varying dependencies (0 deps) and times (4 hours, 1 hour, 30 minutes with dep), pending phase-2 task (30 minutes, 0 deps)

**Steps:**
1. Click "Start Next Task"

**Expected:** ✅ Selects PENDING-PHASE-1-SHORT (same phase, 0 deps, shortest time 1 hour)

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

## Section 2: Dependency Validation

### Test 2.1: Skips tasks with unmet dependencies
**Status:** ⏳ Not Tested

**Setup:** Create sprint with: pending task with unmet dependency, pending ready task (no deps)

**Steps:**
1. Click "Start Next Task"

**Expected:** ✅ Selects PENDING-READY (no dependencies), skips PENDING-DEP (unmet dependency)

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 2.2: Shows warning when all tasks blocked
**Status:** ⏳ Not Tested

**Setup:** Create sprint where all pending tasks have unmet dependencies

**Steps:**
1. Click "Start Next Task"

**Expected:** ✅ Warning message: "No ready tasks available. All tasks are either completed, in progress, or blocked by dependencies.", no prompt generated, no modal shown

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

## Section 3: Integration with TaskAnalyzer

### Test 3.1: Shows spinner notification during analysis
**Status:** ⏳ Not Tested

**Setup:** Create sprint with ready task

**Steps:**
1. Click "Start Next Task"
2. Observe notifications

**Expected:** ✅ First notification: "⏳ Generating AI-enhanced prompt for [TASK-ID]...", spinner visible during analysis, after analysis: "✅ AI-enhanced prompt for [TASK-ID] loaded..."

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 3.2: No gaps - Prompt directly populates text area
**Status:** ⏳ Not Tested

**Setup:** Create valid task with no gaps (existing file, no deps, documentation-agent)

**Steps:**
1. Click "Start Next Task"

**Expected:** ✅ TaskAnalyzer runs, no gaps detected, modal does NOT appear, AI-enhanced prompt appears in Voice text area, user can review/edit prompt

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 3.3: Gaps detected - Q&A modal appears
**Status:** ⏳ Not Tested

**Setup:** Create task with gaps (missing file)

**Steps:**
1. Click "Start Next Task"

**Expected:** ✅ TaskAnalyzer runs, gaps detected (missing file), Q&A modal appears, question visible: "File does not exist. Should this file be created...?", no prompt in text area yet

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 3.4: After answering questions, prompt populates
**Status:** ⏳ Not Tested

**Setup:** Trigger gap detection (as in Test 3.3)

**Steps:**
1. Answer questions in modal
2. Click "Generate Prompt"

**Expected:** ✅ Modal closes, analyzer regenerates prompt, final prompt appears in Voice text area, notification: "✅ AI-enhanced prompt for [TASK-ID] loaded..."

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

## Section 4: Performance

### Test 4.1: Task selection completes in <100ms
**Status:** ⏳ Not Tested

**Setup:** Create sprint with 20-50 tasks (mix of completed, pending, blocked)

**Steps:**
1. Click "Start Next Task"
2. Measure time from click to first notification

**Expected:** ✅ Task selection: <100ms (imperceptible delay), first notification appears immediately

**Result:** [ ] PASS | [ ] FAIL
**Time:** ___________ ms
**Notes:** ___________

---

### Test 4.2: Full flow completes in <5s
**Status:** ⏳ Not Tested

**Setup:** Create ready task (no gaps)

**Steps:**
1. Click "Start Next Task"
2. Measure time from click to prompt in text area

**Expected:** ✅ Full flow (selection → analysis → prompt): <5s, typical: 1-3s

**Result:** [ ] PASS | [ ] FAIL
**Time:** ___________ s
**Notes:** ___________

---

## Section 5: Edge Cases

### Test 5.1: Handles tasks with unusual phase names
**Status:** ⏳ Not Tested

**Setup:** Create tasks with non-standard phase names (e.g., "initialization" vs "phase-1-foundation")

**Steps:**
1. Click "Start Next Task"

**Expected:** ✅ Selects STANDARD-PHASE (parseable phase number), UNUSUAL-PHASE deprioritized (defaults to phase 99), no errors or crashes

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 5.2: Handles phase numbers 1-10+ correctly
**Status:** ⏳ Not Tested

**Setup:** Create tasks with various phase numbers: phase-10, phase-2, phase-1

**Steps:**
1. Click "Start Next Task"

**Expected:** ✅ Selects PHASE-1 (earliest), correct numeric sorting: 1 < 2 < 10 (not string sorting: "1" < "10" < "2")

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 5.3: Last completed task uses completion_date
**Status:** ⏳ Not Tested

**Setup:** Create sprint with multiple completed tasks with different completion dates

**Steps:**
1. Click "Start Next Task"

**Expected:** ✅ Uses COMPLETED-RECENT's phase (phase-2-core) as reference, selects PENDING-PHASE-2 (same phase as most recent completed), NOT PENDING-PHASE-1 (older completed task's phase)

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

# PROTECT-000C: Start This Task with Prompt Generation (14 Tests)

**Goal:** Implement 'Start This Task' with prompt generation

**Agent:** infrastructure-agent
**Pattern:** Pattern-CODE-001

---

## Section 1: Basic Functionality

### Test 1.1: Start button generates prompt (not just TOML update)
**Status:** ⏳ Not Tested

**Setup:** Create sprint with pending task (existing file, no gaps)

**Steps:**
1. Find TEST-START-001 in task list
2. Click the ▶️ "Start" button on that task row

**Expected:** ✅ Notification: "⏳ Generating AI-enhanced prompt for TEST-START-001...", AI-enhanced prompt appears in Voice text area, notification: "✅ AI-enhanced prompt for TEST-START-001 loaded - review in text area and click Send", task does NOT auto-start (status remains "pending"), user can review/edit prompt before sending

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 1.2: Consistent with "Start Next Task" flow
**Status:** ⏳ Not Tested

**Setup:** Create two identical tasks (same files, no gaps)

**Steps:**
1. Test "Start Next Task" button → observe prompt
2. Test "Start" button on TASK-B → observe prompt

**Expected:** ✅ Both prompts have same format, both include: Task metadata, description, reasoning chain, validation criteria, etc., same sections present in both prompts, consistent UX (spinner, notifications, text area insertion)

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

## Section 2: Integration with TaskAnalyzer

### Test 2.1: No gaps - Prompt directly populates text area
**Status:** ⏳ Not Tested

**Setup:** Create valid task with no gaps

**Steps:**
1. Click ▶️ "Start" on VALID-TASK

**Expected:** ✅ TaskAnalyzer runs, no gaps detected, modal does NOT appear, AI-enhanced prompt appears in Voice text area immediately, user can review/edit prompt

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 2.2: Gaps detected - Q&A modal appears
**Status:** ⏳ Not Tested

**Setup:** Create task with gaps (missing file)

**Steps:**
1. Click ▶️ "Start" on GAP-TASK

**Expected:** ✅ TaskAnalyzer runs, gaps detected (missing file), Q&A modal appears, question visible: "File does not exist. Should this file be created...?", no prompt in text area yet

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 2.3: After answering questions, prompt populates
**Status:** ⏳ Not Tested

**Setup:** Trigger gap detection (as in Test 2.2)

**Steps:**
1. Answer questions in modal
2. Click "Generate Prompt"

**Expected:** ✅ Modal closes, analyzer regenerates prompt, final prompt appears in Voice text area, notification: "✅ AI-enhanced prompt for GAP-TASK loaded..."

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

## Section 3: Task Selection vs. User Selection

### Test 3.1: User can start any ready task (not just "next")
**Status:** ⏳ Not Tested

**Setup:** Create sprint with multiple ready tasks (different phases)

**Steps:**
1. Click ▶️ "Start" on TASK-10 (middle task, not "next" by algorithm)

**Expected:** ✅ Generates prompt for TASK-10 (user's choice), does NOT auto-select TASK-1 (which would be "next" by phase order), user controls which task to start

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 3.2: "Start Next Task" vs. "Start This Task" independence
**Status:** ⏳ Not Tested

**Setup:** Create multiple tasks

**Steps:**
1. Click "Start Next Task" → observe which task is selected
2. Click ▶️ "Start" on a different task → observe

**Expected:** ✅ "Start Next Task" uses smart selection algorithm (phase-aware), "Start This Task" respects user's explicit choice, two independent entry points

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

## Section 4: Error Handling

### Test 4.1: Task not found error
**Status:** ⏳ Not Tested

**Steps:**
1. Manually trigger startTask with invalid taskId (developer console):
```javascript
vscode.postMessage({type: 'startTask', taskId: 'INVALID-ID'})
```

**Expected:** ✅ Error message: "Task INVALID-ID not found", no crash, no prompt generated

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 4.2: Prompt generation failure handling
**Status:** ⏳ Not Tested

**Setup:** Create task with configuration that causes analyzer error

**Steps:**
1. Click ▶️ "Start" button

**Expected:** ✅ Error message: "Failed to generate enhanced prompt: [error details]", no crash, user can try again or fix configuration

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

## Section 5: Performance

### Test 5.1: Full flow completes in <5s
**Status:** ⏳ Not Tested

**Setup:** Create ready task (no gaps)

**Steps:**
1. Click ▶️ "Start" button
2. Measure time from click to prompt in text area

**Expected:** ✅ Full flow (analysis → prompt): <5s, typical: 1-3s

**Result:** [ ] PASS | [ ] FAIL
**Time:** ___________ s
**Notes:** ___________

---

### Test 5.2: With gaps, flow still reasonable
**Status:** ⏳ Not Tested

**Setup:** Create task with gaps

**Steps:**
1. Click ▶️ "Start" button
2. Answer questions (measure time to modal)
3. Click "Generate Prompt" (measure total time)

**Expected:** ✅ Time to modal: <3s, prompt generation after modal: <3s

**Result:** [ ] PASS | [ ] FAIL
**Time:** ___________ s
**Notes:** ___________

---

## Section 6: Integration with Existing Features

### Test 6.1: Works with task dependency validation
**Status:** ⏳ Not Tested

**Setup:** Create task with unmet dependencies

**Steps:**
1. Click ▶️ "Start" on BLOCKED-TASK

**Expected:** ✅ Dependency validation still works (existing feature), warning or alternative task suggestion, prompt generation still happens

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 6.2: Multiple tasks can be started sequentially
**Status:** ⏳ Not Tested

**Setup:** Create 3 ready tasks

**Steps:**
1. Click ▶️ "Start" on Task 1 → review prompt
2. Click ▶️ "Start" on Task 2 → review prompt
3. Click ▶️ "Start" on Task 3 → review prompt

**Expected:** ✅ Each task generates its own prompt, previous prompt is replaced (text area shows latest), no conflicts or errors, user can generate multiple prompts in sequence

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

## Section 7: Edge Cases

### Test 7.1: Task with multiple gap types
**Status:** ⏳ Not Tested

**Setup:** Create task with multiple gaps (missing files, no pre-flight, no tests, unmet dep)

**Steps:**
1. Click ▶️ "Start" on MULTI-GAP

**Expected:** ✅ Modal shows all questions, all questions can be answered, prompt generates after all answered

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 7.2: Task with very long description
**Status:** ⏳ Not Tested

**Setup:** Create task with 500+ character description

**Steps:**
1. Click ▶️ "Start" button

**Expected:** ✅ Prompt generates successfully, all content visible in text area, no truncation or errors, reasonable performance

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

# PROTECT-000D: Q&A Modal UI (Generic Wizard) (22 Tests)

**Goal:** Build Q&A modal UI (generic wizard)

**Agent:** infrastructure-agent
**Pattern:** Pattern-CODE-001, Pattern-TDD-001

---

## Section 1: Modal Creation

### Test 1.1: Modal appears when gaps detected
**Status:** ⏳ Not Tested

**Setup:** Create test task with missing files

**Steps:**
1. Open ÆtherLight Voice Panel
2. Click "Start Next Task" button (or "Start" on TEST-MODAL-001)

**Expected:** ✅ TaskAnalyzer detects missing file gap, TaskQuestionModal appears instead of prompt, modal title shows "Task Questions: TEST-MODAL-001", first question visible

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 1.2: Modal does not appear when no gaps
**Status:** ⏳ Not Tested

**Setup:** Create valid task with no gaps

**Steps:**
1. Click "Start" on TEST-MODAL-002

**Expected:** ✅ No gaps detected, modal does NOT appear, AI-enhanced prompt loaded directly to Voice text area

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

## Section 2: Question Types

### Test 2.1: Text input question renders correctly
**Status:** ⏳ Not Tested

**Setup:** Create task that triggers missing test strategy gap

**Steps:**
1. Start task to trigger modal

**Expected:** ✅ Modal appears, question text: "No test strategy specified. What test approach should be used?", textarea input visible with placeholder, help text shows coverage requirement (90% for infrastructure-agent)

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 2.2: Choice question renders correctly
**Status:** ⏳ Not Tested

**Setup:** Create task with missing file

**Steps:**
1. Start task to trigger modal

**Expected:** ✅ Modal appears, question: "File \"MissingFile.ts\" does not exist. Should this file be created, or is the path incorrect?", radio buttons visible with choices: "Create new file", "Path is incorrect - will fix", "File will be created by another task", only one choice selectable at a time

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 2.3: Boolean question renders correctly
**Status:** ⏳ Not Tested

**Setup:** Create task that modifies TOML without pre-flight mention

**Steps:**
1. Start task to trigger modal

**Expected:** ✅ Modal appears, question: "Pre-flight checklist not referenced. Have you reviewed the pre-flight checklist for modifying \"ACTIVE_SPRINT.toml\"?", two buttons visible: "Yes" and "No", button highlighting on selection

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

## Section 3: Wizard Navigation

### Test 3.1: Navigate forward through questions
**Status:** ⏳ Not Tested

**Setup:** Create task with multiple gaps (missing file + missing tests)

**Steps:**
1. Start task to trigger modal
2. Answer first question
3. Click "Next →" button

**Expected:** ✅ Progress indicator updates: "Question 1 of 3" → "Question 2 of 3", second question appears, first question answer preserved, "Next →" button visible until last question

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 3.2: Navigate backward through questions
**Status:** ⏳ Not Tested

**Setup:** Using multi-question task from Test 3.1

**Steps:**
1. Navigate to Question 2
2. Click "← Back" button

**Expected:** ✅ Returns to Question 1, progress indicator: "Question 2 of 3" → "Question 1 of 3", previous answer still visible/selected, "← Back" button disabled on Question 1

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 3.3: Skip optional questions
**Status:** ⏳ Not Tested

**Setup:** Create task with optional question

**Steps:**
1. Start task (should have 1 required + potentially 1 optional question)

**Expected:** ✅ Optional question shows 💡 indicator, "Skip" button visible for optional questions, "Skip" button NOT visible for required questions, clicking "Skip" advances to next question, skipped question has no answer recorded

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 3.4: Generate Prompt button on last question
**Status:** ⏳ Not Tested

**Setup:** Using multi-question task

**Steps:**
1. Navigate to last question

**Expected:** ✅ "Next →" button replaced with "✨ Generate Prompt" button, button styled in green (#27ae60), button disabled if required questions unanswered, button enabled when all required questions answered

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

## Section 4: Criticality Styling

### Test 4.1: Required questions show blocker indicator
**Status:** ⏳ Not Tested

**Setup:** Trigger modal with required questions (any missing file gap)

**Steps:**
1. Observe question header

**Expected:** ✅ 🚫 icon visible, "Required" badge displayed, badge color: red (#e74c3c), skip button NOT visible

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 4.2: Optional questions show optional indicator
**Status:** ⏳ Not Tested

**Setup:** Trigger modal with optional question

**Steps:**
1. Observe question header

**Expected:** ✅ 💡 icon visible, "Optional" badge displayed, badge color: grey (#95a5a6), skip button visible

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

## Section 5: Answer Collection and Submission

### Test 5.1: Answers are preserved when navigating
**Status:** ⏳ Not Tested

**Setup:** Multi-question modal

**Steps:**
1. Answer Question 1: "Test answer 1"
2. Navigate to Question 2
3. Answer Question 2: "Test answer 2"
4. Navigate back to Question 1

**Expected:** ✅ Question 1 still shows "Test answer 1", navigate to Question 2 → still shows "Test answer 2", all answers preserved throughout navigation

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 5.2: Generate Prompt with all required answers
**Status:** ⏳ Not Tested

**Setup:** Multi-question modal

**Steps:**
1. Answer all required questions
2. Click "✨ Generate Prompt"

**Expected:** ✅ Modal closes, callback fires with answers, analyzer re-runs (TODO: with answers), final enhanced prompt loaded to Voice text area

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 5.3: Cannot generate prompt without required answers
**Status:** ⏳ Not Tested

**Setup:** Multi-question modal with required questions

**Steps:**
1. Leave at least one required question unanswered
2. Navigate to last question
3. Click "✨ Generate Prompt"

**Expected:** ✅ Warning message: "Please answer all required questions before generating prompt", modal does NOT close, user can navigate back and answer questions

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 5.4: Cancel modal closes without generating
**Status:** ⏳ Not Tested

**Setup:** Modal visible with questions

**Steps:**
1. Answer some questions
2. Click "Cancel" button

**Expected:** ✅ Modal closes immediately, no prompt generated, no answers submitted, user returned to Voice Panel

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

## Section 6: Performance

### Test 6.1: Modal renders in <200ms
**Status:** ⏳ Not Tested

**Setup:** Trigger modal with 3-5 questions

**Steps:**
1. Measure time from button click to modal visible

**Expected:** ✅ Modal appears in < 200ms, no lag or delay, smooth rendering

**Result:** [ ] PASS | [ ] FAIL
**Time:** ___________ ms
**Notes:** ___________

---

## Section 7: Integration with voicePanel

### Test 7.1: "Start Next Task" triggers modal when gaps
**Status:** ⏳ Not Tested

**Setup:** Task with gaps is next ready task

**Steps:**
1. Click "Start Next Task" button

**Expected:** ✅ Notification: "⏳ Generating AI-enhanced prompt for [TASK-ID]...", TaskAnalyzer runs, gaps detected, modal appears, no prompt in text area until modal complete

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 7.2: "Start Task" (specific task) triggers modal when gaps
**Status:** ⏳ Not Tested

**Setup:** Click "Start" button on specific task with gaps

**Expected:** ✅ Same flow as Test 7.1, modal appears for specific task, task ID correct in modal title

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 7.3: After answering, final prompt populates text area
**Status:** ⏳ Not Tested

**Setup:** Trigger modal with gaps

**Steps:**
1. Answer all required questions
2. Click "Generate Prompt"

**Expected:** ✅ Modal closes, analyzer re-runs, final AI-enhanced prompt appears in Voice text area, user can review/edit prompt, user can select terminal and send

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

## Section 8: Edge Cases

### Test 8.1: Multiple gap types in one task
**Status:** ⏳ Not Tested

**Setup:** Create task with multiple gap types (missing file, pre-flight, tests, dependency)

**Steps:**
1. Start task

**Expected:** ✅ Modal shows all questions, each question type renders correctly, all questions must be answered

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 8.2: Task with only optional questions
**Status:** ⏳ Not Tested

**Setup:** Create task with only optional gaps

**Steps:**
1. Start task

**Expected:** ✅ Modal appears, all questions show 💡 optional indicator, can skip all questions, "Generate Prompt" enabled immediately

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 8.3: Long question text and help text
**Status:** ⏳ Not Tested

**Setup:** Create task with gap that generates long question/help text

**Steps:**
1. Observe modal rendering

**Expected:** ✅ Long text wraps correctly, modal remains readable, scrolling works if needed, no text overflow or clipping

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

# PROTECT-001: Code Protection Annotations (20 Tests)

**Goal:** Verify @protected annotations are correctly applied and documented

**Version:** v0.16.7+

---

## Section 1: Annotation Existence

### Test 1.1: extension.ts
**Status:** ⏳ Not Tested

**Steps:**
1. Open `vscode-lumina/src/extension.ts`
2. Verify file header contains `@protected`
3. Verify includes lock date: `Locked: 2025-11-07`
4. Verify includes test reference: `Tests: Core Extension activation, command registration`

**Expected:** ✅ Annotation present with all required fields

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 1.2: SprintLoader.ts
**Status:** ⏳ Not Tested

**Steps:**
1. Open `vscode-lumina/src/commands/SprintLoader.ts`
2. Verify file header contains `@protected`
3. Verify includes lock date: `Locked: 2025-11-07`
4. Verify includes test reference: `Tests: TOML parsing with rich fields`

**Expected:** ✅ Annotation present with all required fields

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 1.3: AutoTerminalSelector.ts
**Status:** ⏳ Not Tested

**Steps:**
1. Open `vscode-lumina/src/commands/AutoTerminalSelector.ts`
2. Verify file header contains `@protected`
3. Verify includes lock date: `Locked: 2025-11-07`
4. Verify includes test reference: `Tests: Terminal list/dropdown logic`

**Expected:** ✅ Annotation present with all required fields

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 1.4: TaskDependencyValidator.ts
**Status:** ⏳ Not Tested

**Steps:**
1. Open `vscode-lumina/src/services/TaskDependencyValidator.ts`
2. Verify file header contains `@protected`
3. Verify includes lock date: `Locked: 2025-11-07`
4. Verify includes test reference: `Tests: Dependency blocking functionality`

**Expected:** ✅ Annotation present with all required fields

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 1.5: voicePanel.ts
**Status:** ⏳ Not Tested

**Steps:**
1. Open `vscode-lumina/src/commands/voicePanel.ts`
2. Verify file header contains `@protected - Partial protection`
3. Verify includes lock date: `Locked: 2025-11-07`
4. Verify lists protected sections (terminal list, sprint dropdown, refresh button, skills, settings)

**Expected:** ✅ Annotation present with partial protection note

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

## Section 2: CODE_PROTECTION_POLICY.md Documentation

### Test 2.1: File Existence
**Status:** ⏳ Not Tested

**Steps:**
1. Open `CODE_PROTECTION_POLICY.md`
2. Verify file exists at project root

**Expected:** ✅ File exists

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 2.2: Status Banner
**Status:** ⏳ Not Tested

**Steps:**
1. Check for `✅ ACTIVE` status
2. Check for lock date: `2025-11-07`
3. Check for `PROTECT-001 stabilization` reference

**Expected:** ✅ Active status with correct metadata

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 2.3: Protected Files List
**Status:** ⏳ Not Tested

**Steps:**
1. Verify section "## Protected Files (v0.16.7 Lock-down)" exists
2. Verify all 5 files are listed: extension.ts, SprintLoader.ts, AutoTerminalSelector.ts, TaskDependencyValidator.ts, voicePanel.ts

**Expected:** ✅ All files documented with lock dates and test references

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 2.4: Total Count
**Status:** ⏳ Not Tested

**Steps:**
1. Check documentation states: "**Total:** 5 files locked with @protected annotations"

**Expected:** ✅ Correct count

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

## Section 3: Functional Verification

### Test 3.1: Extension Activation
**Status:** ⏳ Not Tested

**Steps:**
1. Press `` ` `` (backtick) to open voice panel
2. Verify panel opens without errors
3. Check VS Code console for activation errors

**Expected:** ✅ Extension activates, voice panel opens

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 3.2: Sprint Loading
**Status:** ⏳ Not Tested

**Steps:**
1. Open voice panel Sprint section
2. Verify ACTIVE_SPRINT.toml loads
3. Check that tasks display with full metadata
4. Verify no TOML parsing errors

**Expected:** ✅ Sprint loads correctly with rich fields

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 3.3: Terminal Selection
**Status:** ⏳ Not Tested

**Steps:**
1. Create 2 terminals
2. Open voice panel
3. Verify terminal dropdown shows both terminals
4. Select each terminal from dropdown

**Expected:** ✅ Terminal list populates correctly

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 3.4: Dependency Blocking
**Status:** ⏳ Not Tested

**Steps:**
1. Find a task with dependencies in sprint panel
2. Try to start task with unmet dependencies
3. Verify blocking message appears

**Expected:** ✅ Dependency validation works (BRILLIANT!)

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 3.5: Voice Panel Core Features
**Status:** ⏳ Not Tested

**Steps:**
1. Sprint dropdown works
2. Sprint refresh button works
3. Skills browser opens
4. Settings UI opens

**Expected:** ✅ All protected sections function correctly

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

## Section 4: Historical Bug Prevention

### Test 4.1: v0.13.23 Prevention
**Status:** ⏳ Not Tested

**Steps:**
1. Check package.json has no native dependencies (robot js, nut-tree-fork)
2. Verify no new native dependencies added

**Expected:** ✅ No native dependencies (9-hour bug prevented)

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 4.2: v0.15.31-32 Prevention
**Status:** ⏳ Not Tested

**Steps:**
1. Check no runtime npm dependencies added (glob, lodash, etc.)
2. Verify dependencies are dev-only or whitelisted

**Expected:** ✅ No forbidden runtime dependencies (2-hour bug prevented)

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

## Section 5: Documentation Completeness

### Test 5.1: Enforcement Mechanisms Section
**Status:** ⏳ Not Tested

**Steps:**
1. Verify `## Enforcement Mechanisms` section exists
2. Check `Status: ✅ ACTIVE (PROTECT-002 complete - 2025-11-07)` is present
3. Verify pre-commit hook is documented
4. Verify validate-protection.js script is documented

**Expected:** ✅ Enforcement mechanisms documented

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 5.2: Override Process Section
**Status:** ⏳ Not Tested

**Steps:**
1. Verify `## Override Process` section exists
2. Check 3-step approval workflow documented
3. Verify example override commit message provided

**Expected:** ✅ Override process clear and actionable

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 5.3: Audit Trail Section
**Status:** ⏳ Not Tested

**Steps:**
1. Verify `## Audit Trail` section exists
2. Check git log commands provided
3. Verify verification commands listed

**Expected:** ✅ Audit trail commands work

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

# PROTECT-002: Pre-Commit Protection Enforcement (13 Tests)

**Goal:** Verify pre-commit hook enforces protection on @protected files

**Version:** v0.16.7
**Agent:** infrastructure-agent
**Pattern:** Pattern-CODE-PROTECTION-001, Pattern-GIT-001

**Prevention Value:** 13+ hours of historical debugging prevented

---

## Section 1: Protected File Modification Detection

### Test 1.1: Modify @protected file triggers prompt
**Status:** ⏳ Not Tested

**Steps:**
1. Edit `vscode-lumina/src/extension.ts` (add a comment)
2. Stage the file: `git add vscode-lumina/src/extension.ts`
3. Attempt commit: `git commit -m "test: modify protected file"`
4. Observe prompt: "WARNING: You are modifying protected code..."

**Expected:** ✅ Prompt appears listing the protected file(s), prompt asks for approval (y/n)

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 1.2: Answer 'no' blocks commit
**Status:** ⏳ Not Tested

**Steps:**
1. Continue from Test 1.1
2. When prompted, answer: `n` (no)
3. Check git status: `git status`

**Expected:** ✅ Commit blocked (exit code 1), message: "Commit aborted by user", changes remain staged (not committed), git log unchanged

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 1.3: Answer 'yes' allows commit with PROTECTED: prefix
**Status:** ⏳ Not Tested

**Steps:**
1. Attempt commit again: `git commit -m "test: modify protected file"`
2. When prompted, answer: `y` (yes)
3. Check git log: `git log --oneline -1`

**Expected:** ✅ Commit succeeds, commit message prefixed with `PROTECTED: `, full message: "PROTECTED: test: modify protected file", audit trail established in git log

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

## Section 2: Non-Protected File Modification (No Prompt)

### Test 2.1: Modify non-protected file bypasses prompt
**Status:** ⏳ Not Tested

**Steps:**
1. Create a test file: `echo "test" > test-file.txt`
2. Stage the file: `git add test-file.txt`
3. Commit: `git commit -m "test: add non-protected file"`
4. Observe no prompt shown

**Expected:** ✅ No prompt displayed, commit succeeds immediately, message unchanged: "test: add non-protected file", no PROTECTED: prefix added

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 2.2: Modify multiple files (mixed protected and non-protected)
**Status:** ⏳ Not Tested

**Steps:**
1. Edit `vscode-lumina/src/extension.ts` (protected)
2. Edit `test-file.txt` (non-protected)
3. Stage both: `git add .`
4. Commit: `git commit -m "test: mixed changes"`
5. When prompted, answer: `y`

**Expected:** ✅ Prompt shown (because extension.ts is protected), prompt lists only protected file(s), after approval, commit succeeds with PROTECTED: prefix, both files committed

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

## Section 3: CI Mode (Non-Interactive)

### Test 3.1: CI mode bypasses prompts
**Status:** ⏳ Not Tested

**Steps:**
1. Set environment variable: `set SKIP_PROTECTION_CHECK=true` (Windows)
2. Edit `vscode-lumina/src/SprintLoader.ts` (protected)
3. Stage: `git add vscode-lumina/src/SprintLoader.ts`
4. Commit: `git commit -m "test: ci mode commit"`
5. Observe no prompt shown

**Expected:** ✅ No prompt displayed (CI mode active), commit succeeds immediately, message unchanged (no PROTECTED: prefix in CI mode), warning logged: "CI mode: Skipping protection check"

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 3.2: CI mode validation (unset variable)
**Status:** ⏳ Not Tested

**Steps:**
1. Unset environment variable: `set SKIP_PROTECTION_CHECK=` (Windows)
2. Edit `vscode-lumina/src/AutoTerminalSelector.ts` (protected)
3. Stage: `git add vscode-lumina/src/AutoTerminalSelector.ts`
4. Commit: `git commit -m "test: after ci mode"`
5. Observe prompt returns

**Expected:** ✅ Prompt displayed (CI mode disabled), protection enforcement active again, user approval required

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

## Section 4: Performance

### Test 4.1: Protection check completes < 200ms
**Status:** ⏳ Not Tested

**Steps:**
1. Edit all 5 protected files
2. Stage all: `git add vscode-lumina/src/`
3. Time the commit: `time git commit -m "test: performance check"` (or measure manually)
4. Answer `n` to abort commit
5. Measure time taken for protection check

**Expected:** ✅ Protection check completes < 200ms, all 5 protected files detected, prompt shown listing all files

**Result:** [ ] PASS | [ ] FAIL
**Time:** ___________ ms
**Notes:** ___________

---

## Section 5: Audit Trail

### Test 5.1: Git log shows PROTECTED: commits
**Status:** ⏳ Not Tested

**Steps:**
1. Review git log: `git log --all --oneline --grep="PROTECTED:"`
2. Verify all approved protected changes have PROTECTED: prefix

**Expected:** ✅ All approved protected commits visible in log, each has PROTECTED: prefix, audit trail complete and searchable

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 5.2: Rejected commits not in git log
**Status:** ⏳ Not Tested

**Steps:**
1. Verify git log after Test 1.2 (rejected commit)
2. Ensure rejected commit NOT in git log

**Expected:** ✅ Rejected commit not recorded, only approved commits in log, no partial/incomplete commits

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

## Section 6: Edge Cases

### Test 6.1: No staged files
**Status:** ⏳ Not Tested

**Steps:**
1. Ensure no staged changes: `git status`
2. Attempt commit: `git commit -m "test: no changes"`

**Expected:** ✅ Git's default behavior (no protection check needed), message: "nothing to commit, working tree clean"

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 6.2: Invalid annotation format (missing @protected)
**Status:** ⏳ Not Tested

**Steps:**
1. Create a test file with malformed annotation
2. Update CODE_PROTECTION_POLICY.md to include this file
3. Edit the file and commit
4. Observe protection check behavior

**Expected:** ✅ Script handles missing annotations gracefully, file not treated as protected (no prompt) OR warning shown about missing annotation

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

# Test Results Summary

## Overall Status

**Sprint 3 - Unified v1.0**

| Category | Total Tests | Passed | Failed | Skipped | Status |
|----------|-------------|--------|--------|---------|--------|
| **Phase 1: Template System** | 30 | ___ | ___ | ___ | ⏳ Pending |
| **PROTECT-000A: Task Analyzer** | 16 | ___ | ___ | ___ | ⏳ Pending |
| **PROTECT-000B: Start Next Task** | 14 | ___ | ___ | ___ | ⏳ Pending |
| **PROTECT-000C: Start This Task** | 14 | ___ | ___ | ___ | ⏳ Pending |
| **PROTECT-000D: Q&A Modal** | 22 | ___ | ___ | ___ | ⏳ Pending |
| **PROTECT-001: Code Protection** | 20 | ___ | ___ | ___ | ⏳ Pending |
| **PROTECT-002: Pre-Commit Hook** | 13 | ___ | ___ | ___ | ⏳ Pending |
| **TOTAL** | **129** | **___** | **___** | **___** | ⏳ **Pending** |

---

# Phase 4: UX Polish (Phase 0b-ux-polish from Sprint) (140+ Tests)

**Goal:** Universal enhancement pattern, UI improvements, keyboard shortcuts

**Phase Status:** ✅ Implementation Complete (v0.16.15+) | ⏳ Testing Pending

---

## UX-001: Universal Enhancement Pattern - Fix ALL Enhancement Buttons (46 Tests)

**Status:** ✅ Completed (2025-11-07)
**Agent:** ui-agent
**Files Modified:** `vscode-lumina/src/commands/voicePanel.ts:3686-3704,1009-1059,634-651,664-695`

### Implementation Summary
Fixed all 6 enhancement buttons to follow universal pattern:
1. Code Analyzer (🔍 button) - Restored functionality
2. Sprint Planner (📋 button) - Restored functionality
3. Bug Report Enhance - Already working, verified
4. Feature Request Enhance - Already working, verified
5. Start Next Task button - Changed from `insertEnhancedPrompt` to `populateTextArea`
6. Individual task play buttons - Changed from dialog/TOML update to enhancement pattern

**Universal Pattern Applied:**
```
Click → Extract context → Enhance prompt →
webview.postMessage({ type: 'populateTextArea', text: enhancedPrompt }) →
User reviews → User sends (Ctrl+Enter)
```

### Test 1.1: Code Analyzer Button
**Status:** ⏳ Not Tested

**Steps:**
1. Open Voice Panel
2. Click 🔍 Code Analyzer button (left toolbar)

**Expected:**
- ✅ Status shows "🔍 Analyzing workspace..."
- ✅ Enhanced workspace analysis prompt loads into main text area
- ✅ Prompt includes: Workspace structure, languages/frameworks, patterns, analysis approach, success criteria
- ✅ No dialog shown
- ✅ No automatic execution
- ✅ User can review/edit prompt
- ✅ User can select terminal and send with Ctrl+Enter

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 1.2: Sprint Planner Button
**Status:** ⏳ Not Tested

**Steps:**
1. Open Voice Panel
2. Click 📋 Sprint Planner button (left toolbar)

**Expected:**
- ✅ Status shows "📋 Generating sprint plan prompt..."
- ✅ Enhanced sprint planning prompt loads into main text area
- ✅ Prompt includes: Sprint goal, codebase context, existing sprints, structure template, success criteria
- ✅ No dialog shown
- ✅ No automatic execution

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 1.3: Bug Report Enhance
**Status:** ⏳ Not Tested

**Steps:**
1. Open Voice Panel
2. Click Bug Report workflow button
3. Fill form: Title="Test bug", Severity=High, Component="Voice Panel", Description="Test description", Context="Test context"
4. Click "✨ Enhance" button

**Expected:**
- ✅ Enhanced bug report prompt loads into main text area
- ✅ Prompt includes all form fields structured
- ✅ Workflow closes automatically
- ✅ No dialog shown

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 1.4: Feature Request Enhance
**Status:** ⏳ Not Tested

**Steps:**
1. Open Voice Panel
2. Click Feature Request workflow button
3. Fill form: Title="Test feature", Priority=High, Category="UI", Use Case="Test use case", Solution="Test solution"
4. Click "✨ Enhance" button

**Expected:**
- ✅ Enhanced feature request prompt loads into main text area
- ✅ Prompt includes all form fields structured
- ✅ Workflow closes automatically
- ✅ No dialog shown

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 1.5: Start Next Task Button
**Status:** ⏳ Not Tested

**Steps:**
1. Open Sprint Panel
2. Ensure at least one task is pending with no dependencies
3. Click "▶️ Start Next Task" button

**Expected:**
- ✅ Status shows "⏳ Generating AI-enhanced prompt for TASK-ID..."
- ✅ Enhanced task prompt loads into Voice Panel text area
- ✅ Prompt includes: Task metadata, project state, completed tasks, description, reasoning chain, validation criteria, files to modify, deliverables, patterns, TDD requirements
- ✅ Message shows "✅ AI-enhanced prompt for TASK-ID loaded - review in text area and click Send"
- ✅ No dialog shown
- ✅ TOML not updated (task still pending until user sends)

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 1.6: Individual Task Play Button
**Status:** ⏳ Not Tested

**Steps:**
1. Open Sprint Panel
2. Find any pending task in task list
3. Click ▶️ play button next to task

**Expected:**
- ✅ Same behavior as "Start Next Task" button
- ✅ Enhanced task prompt loads into Voice Panel text area
- ✅ No dialog shown
- ✅ No dependency validation dialog
- ✅ TOML not updated

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Edge Case 1.1: Blocked Task (Individual Play Button)
**Status:** ⏳ Not Tested

**Steps:**
1. Find task with unmet dependencies
2. Click play button

**Expected:**
- ✅ Still generates prompt (no dependency blocking)
- ✅ User can review prompt and decide to override

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Edge Case 1.2: Empty Workspace (Code Analyzer)
**Status:** ⏳ Not Tested

**Steps:**
1. Open empty workspace
2. Click Code Analyzer

**Expected:**
- ✅ Prompt generated with warnings about limited context

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Edge Case 1.3: No Sprint File (Sprint Planner)
**Status:** ⏳ Not Tested

**Steps:**
1. Test in workspace without sprint TOML
2. Click Sprint Planner

**Expected:**
- ✅ Prompt generated for new sprint creation

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

## UX-003: Show/Hide Completed Tasks Checkbox (14 Tests)

**Status:** ✅ Completed (2025-11-07)
**Agent:** ui-agent
**Files Modified:** `vscode-lumina/src/commands/voicePanel.ts:2212-2222,1549-1552,622-644,2277-2281`

### Implementation Summary
Added Show/Hide Completed Tasks checkbox to Sprint Panel:
1. Checkbox added after progress statistics
2. Webview function `toggleHideCompleted()`
3. Message handler `toggleHideCompleted`
4. Filter logic in task rendering loop
5. State persists in workspace state (`hideCompletedTasks` boolean)

### Test 3.1: Checkbox Appears and Functions
**Status:** ⏳ Not Tested

**Steps:**
1. Open Voice Panel (Sprint section is at bottom)
2. Locate "Hide completed tasks" checkbox below progress bar

**Expected:**
- ✅ Checkbox visible, unchecked by default
- ✅ Checkbox has label "Hide completed tasks" (12px font)
- ✅ Checkbox is clickable

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 3.2: Hide Completed Tasks
**Status:** ⏳ Not Tested

**Steps:**
1. Count total tasks visible (note completed vs pending/in_progress)
2. Check the "Hide completed tasks" checkbox

**Expected:**
- ✅ All tasks with status "completed" disappear immediately
- ✅ Only pending and in_progress tasks remain visible
- ✅ Phase progress counts still show total (e.g., "Phase 0 (5/10)")
- ✅ Task statistics at top still show total completed count

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 3.3: Show Completed Tasks Again
**Status:** ⏳ Not Tested

**Steps:**
1. With checkbox checked (completed tasks hidden)
2. Uncheck the "Hide completed tasks" checkbox

**Expected:**
- ✅ All completed tasks reappear immediately
- ✅ Task list returns to full view
- ✅ No UI errors or flickering

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 3.4: State Persistence
**Status:** ⏳ Not Tested

**Steps:**
1. Check the "Hide completed tasks" checkbox
2. Verify completed tasks are hidden
3. Reload VS Code window (Ctrl+R or Cmd+R)
4. Reopen Voice Panel

**Expected:**
- ✅ Checkbox is still checked
- ✅ Completed tasks remain hidden after reload
- ✅ Uncheck checkbox, reload again
- ✅ Checkbox unchecked, all tasks visible

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 3.5: Filtering with Engineer Tabs
**Status:** ⏳ Not Tested

**Steps:**
1. If sprint has multiple engineers, select different engineer tabs
2. Check "Hide completed tasks"
3. Switch between engineers

**Expected:**
- ✅ Filter applies to all engineer views
- ✅ Checkbox state persists across engineer switches

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 3.6: Filter with Popped-Out Panel
**Status:** ⏳ Not Tested

**Steps:**
1. Pop out Sprint view (⧉ button)
2. In main panel: Check "Hide completed tasks"

**Expected:**
- ✅ Popped-out panel also hides completed tasks
- ✅ In popped-out panel: Uncheck checkbox
- ✅ Main panel checkbox also unchecks
- ✅ Both panels stay in sync

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Edge Case 3.1: All Tasks Completed
**Status:** ⏳ Not Tested

**Steps:**
1. Check checkbox when ALL tasks are completed

**Expected:**
- ✅ Empty task list (no tasks shown)
- ✅ Phase sections still render with "(X/X)" progress
- ✅ No errors in console

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Edge Case 3.2: No Completed Tasks
**Status:** ⏳ Not Tested

**Steps:**
1. Check checkbox when NO tasks are completed

**Expected:**
- ✅ No visual change (all tasks still visible)
- ✅ Checkbox remains checked

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Edge Case 3.3: Selected Task is Completed
**Status:** ⏳ Not Tested

**Steps:**
1. Select a completed task (view its details)
2. Check "Hide completed tasks"

**Expected:**
- ✅ Task detail panel updates (either clears or shows "no selection")
- ✅ No JavaScript errors

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

## UX-004: Remove Button Text, Keep Icons Only (8 Tests)

**Status:** ✅ Completed (2025-11-07)
**Agent:** ui-agent
**Files Modified:** `vscode-lumina/src/commands/voicePanel.ts:4328,4334`

### Implementation Summary
Removed text labels from Voice toolbar buttons for cleaner UI:
1. Record button: "🎤 Record" → "🎤"
2. Send button: "📤 Send" → "📤"
3. Tooltips remain intact (accessibility preserved)

### Test 4.1: Record Button Appears Icon-Only
**Status:** ⏳ Not Tested

**Steps:**
1. Open Voice Panel
2. Locate Record button in left toolbar

**Expected:**
- ✅ Button shows only 🎤 icon (no "Record" text)
- ✅ Button still clickable
- ✅ Hover shows tooltip "Record Voice (Press backtick key)"

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 4.2: Send Button Appears Icon-Only
**Status:** ⏳ Not Tested

**Steps:**
1. Type text in transcription area
2. Locate Send button in left toolbar

**Expected:**
- ✅ Button shows only 📤 icon (no "Send" text)
- ✅ Button becomes enabled when text is present
- ✅ Hover shows tooltip "Send to Terminal (Ctrl+Enter)"

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 4.3: All Toolbar Buttons Consistent
**Status:** ⏳ Not Tested

**Steps:**
1. Review all toolbar buttons

**Expected:**
- ✅ All buttons show icons only (no text labels)
- ✅ Code Analyzer 🔍, Sprint Planner 📋, Record 🎤, Enhance ✨, Send 📤, Clear 🗑️
- ✅ Consistent button sizing and spacing

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 4.4: Tooltips Work for Accessibility
**Status:** ⏳ Not Tested

**Steps:**
1. Hover over each toolbar button

**Expected:**
- ✅ Tooltip appears for every button
- ✅ Tooltips clearly describe button function
- ✅ No missing or broken tooltips

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Edge Case 4.1: Button States
**Status:** ⏳ Not Tested

**Steps:**
1. Record button when recording active
2. Send button when disabled vs enabled

**Expected:**
- ✅ Button appearance changes (recording state) but remains icon-only
- ✅ Button stays icon-only in both states

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

## UX-005: Move Start Next Task Button to Sprint Header (12 Tests)

**Status:** ✅ Completed (2025-11-07)
**Agent:** infrastructure-agent
**Files Modified:** `vscode-lumina\src\commands\voicePanel.ts:2218-2220,2253-2257`

### Implementation Summary
Moved "Start Next Task" button from dedicated row to sprint header as small icon:
1. Added play icon button (▶️) between sprint dropdown and action buttons
2. Removed old Start Next Task section that took entire row
3. Button uses existing `icon-btn` class for consistency
4. Tooltip remains: "Start the next ready task (with all dependencies met)"

**Layout:** [Sprint Dropdown] [▶️] [🔄 Refresh] [⚙️ Settings] [⧉ Pop Out]

### Test 5.1: Button Appears in Sprint Header
**Status:** ⏳ Not Tested

**Steps:**
1. Open Sprint Panel
2. Locate sprint header (top of panel)

**Expected:**
- ✅ Play icon (▶️) button appears between sprint dropdown and refresh button
- ✅ Button is small icon-only (matches refresh/settings/popout buttons)
- ✅ Layout is: [Sprint Dropdown] [▶️] [🔄] [⚙️] [⧉]

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 5.2: Old Button Section Removed
**Status:** ⏳ Not Tested

**Steps:**
1. Scroll through Sprint Panel

**Expected:**
- ✅ No large "▶️ Start Next Task" button taking up full row
- ✅ Checkbox section flows directly to task list (or engineer tabs)
- ✅ More compact UI (space saved)

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 5.3: Button Functions Correctly
**Status:** ⏳ Not Tested

**Steps:**
1. Click the ▶️ button in header

**Expected:**
- ✅ Next ready task prompt populates Voice text area
- ✅ Voice Panel shows enhanced task prompt
- ✅ No automatic execution (user reviews first)

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 5.4: Tooltip Shows on Hover
**Status:** ⏳ Not Tested

**Steps:**
1. Hover over ▶️ button

**Expected:**
- ✅ Tooltip shows "Start the next ready task (with all dependencies met)"
- ✅ Tooltip text is clear and descriptive

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 5.5: No Ready Tasks Available
**Status:** ⏳ Not Tested

**Steps:**
1. Mark all tasks as completed or in_progress
2. Click ▶️ button

**Expected:**
- ✅ Warning message: "No ready tasks available. All tasks are either completed, in progress, or blocked by dependencies."
- ✅ Voice Panel text area remains unchanged

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 5.6: Multiple Ready Tasks
**Status:** ⏳ Not Tested

**Steps:**
1. Ensure multiple tasks are ready (status=pending, dependencies met)
2. Click ▶️ button

**Expected:**
- ✅ First ready task selected (sorted by phase/priority)
- ✅ Enhanced prompt generated correctly

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Edge Case 5.1: Button Styling Matches Header Icons
**Status:** ⏳ Not Tested

**Steps:**
1. Compare ▶️ button to other header buttons (🔄 ⚙️ ⧉)

**Expected:**
- ✅ Consistent size, spacing, hover effects
- ✅ Uses same `icon-btn` CSS class

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Edge Case 5.2: Popped-Out Sprint Panel
**Status:** ⏳ Not Tested

**Steps:**
1. Click ⧉ to pop out Sprint Panel

**Expected:**
- ✅ ▶️ button appears in popped-out header too
- ✅ Button functions identically in popped-out view

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Edge Case 5.3: Multiple Sprints Loaded
**Status:** ⏳ Not Tested

**Steps:**
1. Switch between different sprint files using dropdown

**Expected:**
- ✅ ▶️ button always present in header
- ✅ Button selects next task from currently displayed sprint

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

## UX-006: Text Area UI Improvements (16 Tests)

**Status:** ✅ Completed (2025-11-07)
**Agent:** infrastructure-agent
**Files Modified:** `vscode-lumina\src\commands\voicePanel.ts:646-653,1930-1951,3278-3344,4360-4365`

### Implementation Summary
Three text area improvements for better UX:
1. **Removed "Command / Transcription:" label** (user said "We don't need that at all")
2. **Added vertical resize handle** (CSS: resize: vertical, min: 60px, max: 400px)
3. **Added resize persistence** (ResizeObserver + debounced save to workspace state)

### Test 6.1: Label Removed
**Status:** ⏳ Not Tested

**Steps:**
1. Open Voice Panel
2. Locate transcription text area

**Expected:**
- ✅ No "Command / Transcription:" label above textarea
- ✅ Text area appears directly below toolbar
- ✅ Cleaner, more compact layout

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 6.2: Manual Resize Handle Works
**Status:** ⏳ Not Tested

**Steps:**
1. Hover over bottom edge of text area
2. Drag bottom edge down to make textarea taller
3. Drag bottom edge up to make textarea shorter

**Expected:**
- ✅ Resize cursor appears (vertical arrows)
- ✅ Textarea smoothly resizes while dragging in both directions

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 6.3: Min/Max Height Constraints
**Status:** ⏳ Not Tested

**Steps:**
1. Drag text area as small as possible
2. Drag text area as large as possible
3. Try to resize beyond limits

**Expected:**
- ✅ Cannot resize below 60px (approximately 3 lines)
- ✅ Cannot resize above 400px (approximately 20 lines)
- ✅ Cursor stops at min/max, no resize beyond constraints

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 6.4: Height Persistence Across Reloads
**Status:** ⏳ Not Tested

**Steps:**
1. Resize text area to specific height (e.g., 150px tall)
2. Wait 1 second (debounce delay)
3. Close and reopen Voice Panel
4. Resize to different height (e.g., 250px)
5. Reload VS Code window (Ctrl+Shift+P → "Reload Window")

**Expected:**
- ✅ Text area reopens at same height (150px) after panel close/reopen
- ✅ Text area reopens at saved height (250px) after VS Code reload

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 6.5: Resize During Transcription
**Status:** ⏳ Not Tested

**Steps:**
1. Start voice recording
2. While transcription is in progress, resize text area
3. Complete transcription

**Expected:**
- ✅ Text area resizes smoothly without interrupting transcription
- ✅ Transcribed text remains visible after resize
- ✅ Full text visible with scrollbar if needed

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 6.6: Resize With Long Text Content
**Status:** ⏳ Not Tested

**Steps:**
1. Type or paste long text (20+ lines) into text area
2. Resize text area taller to reveal more lines
3. Resize text area shorter

**Expected:**
- ✅ Scrollbar appears if content exceeds current height
- ✅ Scrollbar disappears or shrinks as more content visible
- ✅ Scrollbar reappears as content exceeds visible area

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Edge Case 6.1: Resize While Typing
**Status:** ⏳ Not Tested

**Steps:**
1. Start typing in text area
2. While typing, resize text area with mouse

**Expected:**
- ✅ No interruption to typing
- ✅ Cursor position maintained
- ✅ No lost characters or glitches

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Edge Case 6.2: Multiple Rapid Resizes
**Status:** ⏳ Not Tested

**Steps:**
1. Rapidly resize text area up and down multiple times
2. Stop resizing
3. Wait 1 second (debounce delay)

**Expected:**
- ✅ Only final height is saved (debouncing works)
- ✅ No performance issues or lag

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Edge Case 6.3: Resize in Popped-Out Panel
**Status:** ⏳ Not Tested

**Steps:**
1. Open Voice Panel
2. Resize text area to specific height
3. Pop out Voice Panel (if supported)
4. Resize in popped-out panel

**Expected:**
- ✅ Popped-out panel uses same saved height
- ✅ Height saves and persists

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Edge Case 6.4: Default Height for New Users
**Status:** ⏳ Not Tested

**Steps:**
1. Clear workspace state (simulating new user)
2. Open Voice Panel for first time

**Expected:**
- ✅ Text area defaults to 60px (3 lines)
- ✅ Resize handle visible and functional

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

## UX-007: Ctrl+Shift+Enter Send + Submit Hotkey (12 Tests)

**Status:** ✅ Completed (2025-11-07)
**Agent:** infrastructure-agent
**Files Modified:** `vscode-lumina\src\commands\voicePanel.ts:1472-1500,3683-3737,3714-3733`

### Implementation Summary
Added keyboard shortcut for immediate command execution:
- **Ctrl+Enter:** Send text to terminal WITHOUT auto-execute (allows review/editing) [UNCHANGED]
- **Ctrl+Shift+Enter:** Send text to terminal AND auto-execute immediately [NEW]

### Test 7.1: Ctrl+Enter Sends Without Execute
**Status:** ⏳ Not Tested

**Steps:**
1. Open Voice Panel
2. Select a terminal
3. Type command in text area (e.g., "echo test")
4. Press Ctrl+Enter
5. Press Enter manually in terminal

**Expected:**
- ✅ Text appears in terminal but NOT executed
- ✅ Status shows "Sent to {terminal} (review before Enter)"
- ✅ Cursor in terminal ready for editing
- ✅ Command executes after manual Enter

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 7.2: Ctrl+Shift+Enter Sends AND Executes
**Status:** ⏳ Not Tested

**Steps:**
1. Type command in text area (e.g., "echo test2")
2. Press Ctrl+Shift+Enter

**Expected:**
- ✅ Command sent AND executed immediately
- ✅ Status shows "Sent to {terminal} and executed ✓"
- ✅ Command output visible in terminal
- ✅ No manual Enter required

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 7.3: Send Button Matches Ctrl+Enter
**Status:** ⏳ Not Tested

**Steps:**
1. Type command in text area
2. Click Send button (📤)

**Expected:**
- ✅ Behaves same as Ctrl+Enter (send only, no execute)
- ✅ Status shows "Sent to {terminal} (review before Enter)"

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 7.4: Complex Multi-Line Commands
**Status:** ⏳ Not Tested

**Steps:**
1. Type multi-line command (e.g., "echo line1 && echo line2")
2. Press Ctrl+Enter
3. Press Ctrl+Shift+Enter instead

**Expected:**
- ✅ Ctrl+Enter: Full command sent without execution
- ✅ Ctrl+Shift+Enter: Full command sent and executed

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 7.5: No Terminal Selected
**Status:** ⏳ Not Tested

**Steps:**
1. Deselect all terminals
2. Type command
3. Press Ctrl+Enter
4. Press Ctrl+Shift+Enter

**Expected:**
- ✅ Both show error message "Please select a terminal"

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 7.6: Empty Text Area
**Status:** ⏳ Not Tested

**Steps:**
1. Clear text area (empty)
2. Press Ctrl+Enter
3. Press Ctrl+Shift+Enter

**Expected:**
- ✅ Both show error message "Nothing to send"

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Edge Case 7.1: Rapid Shortcut Switching
**Status:** ⏳ Not Tested

**Steps:**
1. Type command
2. Press Ctrl+Enter (send only)
3. Immediately type another command
4. Press Ctrl+Shift+Enter (send and execute)

**Expected:**
- ✅ Both shortcuts work correctly in sequence

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Edge Case 7.2: Terminal Not Ready
**Status:** ⏳ Not Tested

**Steps:**
1. Send command with Ctrl+Shift+Enter while terminal is busy

**Expected:**
- ✅ Command queues or executes when terminal ready
- ✅ No crashes or errors

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Edge Case 7.3: Special Characters
**Status:** ⏳ Not Tested

**Steps:**
1. Type command with special characters (e.g., `ls -la | grep "test"`)
2. Press Ctrl+Enter
3. Press Enter manually

**Expected:**
- ✅ Command sent correctly, special chars preserved
- ✅ Command executes with correct special chars

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Edge Case 7.4: Very Long Commands
**Status:** ⏳ Not Tested

**Steps:**
1. Type command longer than terminal width (300+ chars)
2. Press Ctrl+Shift+Enter

**Expected:**
- ✅ Full command sent and executed
- ✅ No truncation or wrapping issues

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

## UX-008: Remove Terminal Edit Button (10 Tests)

**Status:** ✅ Completed (2025-11-07)
**Agent:** infrastructure-agent
**Files Modified:** `vscode-lumina\src\commands\voicePanel.ts:3510-3531`

### Implementation Summary
Removed pencil/edit button from terminal list UI:
1. Removed edit icon HTML (`✏️`)
2. Removed edit icon event handler (~60 lines)
3. Simplified click handler (no edit icon check needed)

**Reason:** Pencil/edit button serves no purpose - terminal renaming must be done in VS Code terminal tab header.

### Test 8.1: Edit Button Removed
**Status:** ⏳ Not Tested

**Steps:**
1. Open Voice Panel
2. Expand terminal list

**Expected:**
- ✅ No pencil/edit icon (✏️) visible next to terminal names
- ✅ Terminal list shows: checkmark (✓) + terminal name only
- ✅ Executing terminals show: ✓ + name + ⏳

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 8.2: Terminal Selection Still Works
**Status:** ⏳ Not Tested

**Steps:**
1. Click on terminal name
2. Click on different terminal

**Expected:**
- ✅ Terminal gets selected (checkmark appears)
- ✅ Send button enables
- ✅ New terminal selected, previous deselected

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 8.3: No Inline Rename Functionality
**Status:** ⏳ Not Tested

**Steps:**
1. Click on terminal name (where edit icon used to be)

**Expected:**
- ✅ Terminal gets selected (NOT converted to input field)
- ✅ No way to rename terminal from Voice panel
- ✅ Must rename in VS Code terminal tab header

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 8.4: Terminal List Layout Clean
**Status:** ⏳ Not Tested

**Steps:**
1. Review terminal list UI

**Expected:**
- ✅ Compact, clean layout
- ✅ No extra spacing where edit icon used to be
- ✅ Terminals aligned properly

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Edge Case 8.1: Clicking Terminal Name Repeatedly
**Status:** ⏳ Not Tested

**Steps:**
1. Rapidly click terminal name multiple times

**Expected:**
- ✅ Terminal selection toggles or stays selected
- ✅ No input field appears
- ✅ No errors in console

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Edge Case 8.2: Multiple Terminals
**Status:** ⏳ Not Tested

**Steps:**
1. Create 5+ terminals

**Expected:**
- ✅ All terminals show same format (no edit icon)
- ✅ Clicking any terminal selects it
- ✅ Layout consistent across all terminals

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

## UX-010: Text Area Content Persistence in Voice Panel (12 Tests)

**Status:** ✅ Completed (2025-11-08)
**Agent:** ui-agent
**Files Modified:** `vscode-lumina/src/commands/voicePanel.ts:3346-3365,3779-3802,3722,3752,3761`

### Implementation Summary
Added localStorage-based content persistence for Voice Panel text area:
1. Content stored in localStorage on every change (debounced 500ms)
2. Content restored when panel reopens
3. Content cleared only after Send to Terminal or Clear button
4. Prevents data loss when switching tabs or closing panel

**Pattern:** Pattern-STATE-001 (Client-side State Persistence)

### Test 10.1: Content Persists on Tab Switch
**Status:** ⏳ Not Tested

**Steps:**
1. Open Voice Panel
2. Type text into text area (e.g., "Test content for persistence")
3. Wait 1 second (debounce)
4. Switch to Sprint Panel tab
5. Return to Voice Panel tab

**Expected:**
- ✅ Text area content restored: "Test content for persistence"
- ✅ Cursor position preserved (if possible)
- ✅ No data loss

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 10.2: Content Persists on Panel Close/Reopen
**Status:** ⏳ Not Tested

**Steps:**
1. Open Voice Panel
2. Type text into text area
3. Wait 1 second
4. Close Voice Panel (close entire panel, not just switch tabs)
5. Reopen Voice Panel (View → ÆtherLight Voice)

**Expected:**
- ✅ Text area content restored
- ✅ Content persists across panel lifecycle

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 10.3: Content Clears After Send to Terminal
**Status:** ⏳ Not Tested

**Steps:**
1. Type text into text area
2. Select a terminal
3. Press Ctrl+Enter (or click Send button)

**Expected:**
- ✅ Text sent to terminal
- ✅ Text area cleared immediately
- ✅ localStorage cleared (no stale content)

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 10.4: Content Clears After Send and Execute
**Status:** ⏳ Not Tested

**Steps:**
1. Type text into text area
2. Select a terminal
3. Press Ctrl+Shift+Enter

**Expected:**
- ✅ Text sent and executed in terminal
- ✅ Text area cleared immediately
- ✅ localStorage cleared

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 10.5: Content Clears After Clear Button
**Status:** ⏳ Not Tested

**Steps:**
1. Type text into text area
2. Click Clear button (🗑️)

**Expected:**
- ✅ Text area cleared immediately
- ✅ localStorage cleared
- ✅ Content does not restore on tab switch

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 10.6: Debouncing Works (No Excessive Saves)
**Status:** ⏳ Not Tested

**Steps:**
1. Type quickly: "The quick brown fox jumps over the lazy dog"
2. Open browser console (if webview supports it)
3. Check localStorage save frequency

**Expected:**
- ✅ Content saved after 500ms of no typing (debounced)
- ✅ Not saved on every keystroke
- ✅ No performance degradation

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 10.7: Large Content Persistence
**Status:** ⏳ Not Tested

**Steps:**
1. Paste large content (1000+ lines, 50KB+) into text area
2. Wait 1 second
3. Switch to Sprint Panel
4. Return to Voice Panel

**Expected:**
- ✅ Full content restored
- ✅ No truncation
- ✅ No corruption

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 10.8: Paste Event Saves Content
**Status:** ⏳ Not Tested

**Steps:**
1. Paste text into text area (Ctrl+V)
2. Immediately switch to Sprint Panel (don't wait for debounce)
3. Return to Voice Panel

**Expected:**
- ✅ Pasted content restored
- ✅ Blur event saves content immediately (doesn't wait for debounce)

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Edge Case 10.1: Content with Special Characters
**Status:** ⏳ Not Tested

**Steps:**
1. Type text with special characters: `console.log("Hello \"World\""); // Test`
2. Switch tabs
3. Return

**Expected:**
- ✅ Special characters preserved (quotes, backslashes, etc.)
- ✅ No encoding issues

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Edge Case 10.2: Multiple Voice Panels (If Possible)
**Status:** ⏳ Not Tested

**Steps:**
1. Open two VS Code windows with same workspace
2. Type different content in each Voice Panel
3. Close and reopen both panels

**Expected:**
- ✅ Each panel maintains its own content
- ✅ OR shared content if designed that way
- ✅ No content conflict/overwrite

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Edge Case 10.3: Content Restored After Extension Reload
**Status:** ⏳ Not Tested

**Steps:**
1. Type text into text area
2. Wait 1 second
3. Reload VS Code window (Ctrl+R in dev host)
4. Reopen Voice Panel

**Expected:**
- ✅ Content restored after full extension reload
- ✅ localStorage survives extension lifecycle

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Edge Case 10.4: Empty Content Handling
**Status:** ⏳ Not Tested

**Steps:**
1. Leave text area empty
2. Switch tabs
3. Return

**Expected:**
- ✅ Text area remains empty (doesn't show "undefined" or null)
- ✅ No errors in console

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

## UX-012: Auto-Expand Text Area for Pasted/Modal Content (14 Tests)

**Status:** ✅ Completed (2025-11-08)
**Agent:** ui-agent
**Files Modified:** `vscode-lumina/src/commands/voicePanel.ts:3329-3330,3369-3470,3785-3789,3822-3826`

### Implementation Summary
Dual height tracking system for text area:
1. **userPreferredHeight:** User's manual resize preference (persisted in workspaceState)
2. **currentHeight:** Actual height (may be auto-expanded)
3. **Auto-expansion:** On paste/modal content insertion, expand to content height (max 400px)
4. **Auto-restoration:** After Send to Terminal, restore to userPreferredHeight
5. **Manual resize:** During auto-expansion, user resize updates preferred size

**Pattern:** Pattern-STATE-001 (Dual Height Tracking)

### Test 12.1: Auto-Expand on Paste
**Status:** ⏳ Not Tested

**Steps:**
1. Set text area to small size (60px, ~3 lines)
2. Paste large content (20 lines) into text area (Ctrl+V)
3. Observe height change

**Expected:**
- ✅ Text area auto-expands to show full content (up to 400px max)
- ✅ All pasted content visible without manual scrolling
- ✅ Status shows expansion indication (if implemented)

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 12.2: Auto-Restore After Send
**Status:** ⏳ Not Tested

**Steps:**
1. Set text area to 100px (manual resize)
2. Paste large content (auto-expands to 300px)
3. Select terminal
4. Press Ctrl+Enter (Send to Terminal)

**Expected:**
- ✅ Text area restores to 100px (userPreferredHeight)
- ✅ Content cleared
- ✅ Height matches pre-expansion size

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 12.3: Auto-Expand on Modal Content (Sprint Planner)
**Status:** ⏳ Not Tested

**Steps:**
1. Set text area to 60px
2. Click Sprint Planner button (📋)
3. Observe enhanced prompt loaded into text area

**Expected:**
- ✅ Text area auto-expands to show full prompt
- ✅ No manual resize needed to see content

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 12.4: Auto-Expand on Modal Content (Code Analyzer)
**Status:** ⏳ Not Tested

**Steps:**
1. Set text area to 60px
2. Click Code Analyzer button (🔍)
3. Observe enhanced prompt loaded into text area

**Expected:**
- ✅ Text area auto-expands to show full prompt
- ✅ Content fully visible

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 12.5: Auto-Expand on Start Next Task
**Status:** ⏳ Not Tested

**Steps:**
1. Open Sprint Panel
2. Set Voice Panel text area to 60px
3. Click "▶️ Start Next Task" button
4. Observe task prompt loaded into Voice Panel text area

**Expected:**
- ✅ Text area auto-expands to show full task prompt
- ✅ All task metadata visible

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 12.6: Max Height 400px Enforced
**Status:** ⏳ Not Tested

**Steps:**
1. Paste extremely large content (100+ lines, exceeds 400px height)
2. Observe height and scrollbar

**Expected:**
- ✅ Text area clamped to 400px max height
- ✅ Scrollbar appears for excess content
- ✅ No infinite expansion

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 12.7: Manual Resize During Auto-Expansion Updates Preferred Size
**Status:** ⏳ Not Tested

**Steps:**
1. Set userPreferredHeight to 100px
2. Paste large content (auto-expands to 300px)
3. Manually resize to 200px (drag resize handle)
4. Send to terminal (Ctrl+Enter)
5. Paste large content again

**Expected:**
- ✅ After step 4: Restores to 200px (new preferred size, not 100px)
- ✅ After step 5: Auto-expands from 200px base

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 12.8: ResizeObserver Tracks Height Changes
**Status:** ⏳ Not Tested

**Steps:**
1. Manually resize text area from 60px → 150px
2. Switch to Sprint Panel
3. Return to Voice Panel

**Expected:**
- ✅ Text area height persisted: 150px
- ✅ No reset to default 60px

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 12.9: Auto-Restore After Send and Execute
**Status:** ⏳ Not Tested

**Steps:**
1. Set userPreferredHeight to 80px
2. Paste large content (auto-expands to 250px)
3. Press Ctrl+Shift+Enter (Send and Execute)

**Expected:**
- ✅ Text area restores to 80px
- ✅ Same restoration behavior as Ctrl+Enter

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 12.10: Paste Small Content (No Expansion Needed)
**Status:** ⏳ Not Tested

**Steps:**
1. Set text area to 100px
2. Paste small content (2 lines, fits in current height)

**Expected:**
- ✅ Text area stays at 100px (no expansion)
- ✅ Auto-expand only triggers when content exceeds current height

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Edge Case 12.1: Rapid Paste and Send
**Status:** ⏳ Not Tested

**Steps:**
1. Paste large content
2. Immediately press Ctrl+Enter (before auto-expand completes)

**Expected:**
- ✅ Content sends successfully
- ✅ No race condition errors
- ✅ Height restores to preferred size

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Edge Case 12.2: Multiple Pastes in Succession
**Status:** ⏳ Not Tested

**Steps:**
1. Paste content A (10 lines)
2. Immediately paste content B (20 lines)
3. Immediately paste content C (5 lines)

**Expected:**
- ✅ Text area expands to fit final content
- ✅ No flickering or multiple expansions
- ✅ Final height: content C size (smallest)

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Edge Case 12.3: Clear Content After Auto-Expansion
**Status:** ⏳ Not Tested

**Steps:**
1. Set userPreferredHeight to 100px
2. Paste large content (auto-expands to 300px)
3. Click Clear button (🗑️)

**Expected:**
- ✅ Content cleared
- ✅ Height remains at 300px (doesn't auto-restore on Clear, only on Send)
- ✅ User can manually resize back to preferred size

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Edge Case 12.4: Preferred Height Persistence Across Sessions
**Status:** ⏳ Not Tested

**Steps:**
1. Set text area to 150px
2. Reload VS Code window (Ctrl+R in dev host)
3. Reopen Voice Panel

**Expected:**
- ✅ Text area restores to 150px (userPreferredHeight persisted in workspaceState)
- ✅ No reset to default 60px

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

## UX-013: Add Ctrl+` Hotkey to Focus Text Area (10 Tests)

**Status:** ✅ Completed (2025-11-08)
**Agent:** ui-agent
**Files Modified:** `vscode-lumina/src/commands/voicePanel.ts:521-540`, `vscode-lumina/src/extension.ts:496-512`, `vscode-lumina/package.json:120-123,182-186`

### Implementation Summary
Added Ctrl+` (Cmd+` on Mac) hotkey to focus Voice Panel text area:
1. VS Code command: `aetherlight.focusVoiceTextArea`
2. Keybinding: Ctrl+` (Windows/Linux), Cmd+` (Mac)
3. Message handler: `focusTranscriptionBox` in webview
4. Focus moves from anywhere in workspace to Voice Panel text area

**Pattern:** Pattern-KEYBINDING-001 (Global Keyboard Shortcuts)

### Test 13.1: Focus Text Area from Terminal
**Status:** ⏳ Not Tested

**Steps:**
1. Open Voice Panel
2. Send command to terminal (focus moves to terminal)
3. Press Ctrl+` (or Cmd+` on Mac)

**Expected:**
- ✅ Focus returns to Voice Panel text area
- ✅ Cursor visible in text area
- ✅ Can immediately start typing

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 13.2: Focus Text Area from Sprint Panel
**Status:** ⏳ Not Tested

**Steps:**
1. Switch to Sprint Panel tab
2. Press Ctrl+`

**Expected:**
- ✅ Voice Panel tab activates
- ✅ Text area gains focus
- ✅ Ready for input

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 13.3: Focus Text Area from Editor
**Status:** ⏳ Not Tested

**Steps:**
1. Click into code editor window (focus on file)
2. Press Ctrl+`

**Expected:**
- ✅ Voice Panel activates (if already open)
- ✅ Text area gains focus
- ✅ Panel expands if collapsed

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 13.4: Focus Already in Text Area (No-Op)
**Status:** ⏳ Not Tested

**Steps:**
1. Focus already in Voice Panel text area
2. Press Ctrl+`

**Expected:**
- ✅ Focus remains in text area (no change)
- ✅ No errors
- ✅ No unexpected behavior

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 13.5: Voice Panel Closed (No Action)
**Status:** ⏳ Not Tested

**Steps:**
1. Close Voice Panel entirely
2. Press Ctrl+`

**Expected:**
- ✅ No action (panel doesn't auto-open)
- ✅ OR panel opens with text area focused (if designed that way)
- ✅ No errors

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 13.6: Keybinding Doesn't Conflict with VS Code Terminal Toggle
**Status:** ⏳ Not Tested

**Steps:**
1. Close Voice Panel
2. Press Ctrl+` (standard VS Code terminal toggle)

**Expected:**
- ✅ VS Code terminal toggles normally
- ✅ Keybinding only active when Voice Panel is visible

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 13.7: Mac Cmd+` Works
**Status:** ⏳ Not Tested (Mac only)

**Steps:**
1. Test on macOS
2. Open Voice Panel
3. Focus on terminal
4. Press Cmd+`

**Expected:**
- ✅ Focus returns to Voice Panel text area
- ✅ Cmd+` binding works (not just Ctrl+`)

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 13.8: Focus from Terminal List
**Status:** ⏳ Not Tested

**Steps:**
1. Click on terminal in Voice Panel terminal list
2. Press Ctrl+`

**Expected:**
- ✅ Focus moves from terminal list to text area
- ✅ Workflow: Select terminal → Press Ctrl+` → Type command

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Edge Case 13.1: Rapid Repeated Presses
**Status:** ⏳ Not Tested

**Steps:**
1. Rapidly press Ctrl+` 10 times

**Expected:**
- ✅ Focus remains stable in text area
- ✅ No flickering or errors
- ✅ No performance issues

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Edge Case 13.2: Focus During Modal Open
**Status:** ⏳ Not Tested

**Steps:**
1. Open workflow modal (Bug Report, Feature Request, etc.)
2. Press Ctrl+`

**Expected:**
- ✅ No action (modal has priority) OR modal closes and text area gains focus
- ✅ No modal UI corruption

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

## UX-014: Make Ctrl+Enter Work Globally (Not Just in Text Area) (12 Tests)

**Status:** ✅ Completed (2025-11-08)
**Agent:** ui-agent
**Files Modified:** `vscode-lumina/src/commands/voicePanel.ts:3880-3913`

### Implementation Summary
Moved Ctrl+Enter keyboard listener from text area element to document level:
1. Document-level keydown listener intercepts Ctrl+Enter anywhere in Voice Panel
2. Ctrl+Enter: Send to terminal (no execute)
3. Ctrl+Shift+Enter: Send to terminal AND execute
4. Works regardless of focus state (terminal list, buttons, text area, etc.)

**Pattern:** Pattern-KEYBOARD-001 (Global Keyboard Shortcuts)

### Test 14.1: Ctrl+Enter from Terminal List
**Status:** ⏳ Not Tested

**Steps:**
1. Type command in text area
2. Click on terminal in terminal list (focus moves to list)
3. Press Ctrl+Enter

**Expected:**
- ✅ Command sent to terminal (no execute)
- ✅ Status shows "Sent to {terminal} (review before Enter)"
- ✅ Works without clicking back into text area

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 14.2: Ctrl+Enter from Sprint Button
**Status:** ⏳ Not Tested

**Steps:**
1. Type command in text area
2. Click Sprint Panel tab button (focus moves to button)
3. Press Ctrl+Enter

**Expected:**
- ✅ Command sent to terminal (voice panel still visible)
- ✅ Works from any button focus

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 14.3: Ctrl+Enter from Text Area (Still Works)
**Status:** ⏳ Not Tested

**Steps:**
1. Type command in text area (focus in text area)
2. Press Ctrl+Enter

**Expected:**
- ✅ Command sent to terminal (no execute)
- ✅ Original behavior preserved

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 14.4: Ctrl+Shift+Enter from Terminal List
**Status:** ⏳ Not Tested

**Steps:**
1. Type command in text area
2. Click on terminal in terminal list
3. Press Ctrl+Shift+Enter

**Expected:**
- ✅ Command sent AND executed immediately
- ✅ Status shows "Sent to {terminal} and executed ✓"
- ✅ Works without text area focus

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 14.5: Ctrl+Shift+Enter from Text Area
**Status:** ⏳ Not Tested

**Steps:**
1. Type command in text area (focus in text area)
2. Press Ctrl+Shift+Enter

**Expected:**
- ✅ Command sent AND executed immediately
- ✅ Original behavior preserved

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 14.6: No Terminal Selected
**Status:** ⏳ Not Tested

**Steps:**
1. Deselect all terminals
2. Type command in text area
3. Click anywhere (toolbar, etc.)
4. Press Ctrl+Enter

**Expected:**
- ✅ Error/warning: "No terminal selected"
- ✅ Command not sent
- ✅ No crash or silent failure

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 14.7: Empty Text Area
**Status:** ⏳ Not Tested

**Steps:**
1. Clear text area (empty)
2. Click anywhere in Voice Panel
3. Press Ctrl+Enter

**Expected:**
- ✅ No action (nothing to send)
- ✅ No error message needed (graceful no-op)

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 14.8: Multi-Line Command
**Status:** ⏳ Not Tested

**Steps:**
1. Type multi-line command: `echo "line 1" && echo "line 2"`
2. Click on terminal list
3. Press Ctrl+Enter

**Expected:**
- ✅ Full command sent without execution
- ✅ Both lines sent correctly

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 14.9: Special Characters in Command
**Status:** ⏳ Not Tested

**Steps:**
1. Type command with special chars: `ls -la | grep "test"`
2. Click anywhere in Voice Panel
3. Press Ctrl+Enter

**Expected:**
- ✅ Special characters preserved
- ✅ Command sent correctly

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test 14.10: Send Button Still Works
**Status:** ⏳ Not Tested

**Steps:**
1. Type command in text area
2. Click Send button (📤)

**Expected:**
- ✅ Behaves same as Ctrl+Enter (send only, no execute)
- ✅ Button functionality unchanged

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Edge Case 14.1: Ctrl+Enter in Modal Input Field
**Status:** ⏳ Not Tested

**Steps:**
1. Open workflow modal (Bug Report, etc.)
2. Focus in modal input field
3. Press Ctrl+Enter

**Expected:**
- ✅ Modal handles Ctrl+Enter (submits form, etc.)
- ✅ Voice Panel command NOT sent
- ✅ No conflict between modal and document-level listener

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Edge Case 14.2: Rapid Ctrl+Enter Presses
**Status:** ⏳ Not Tested

**Steps:**
1. Type command
2. Press Ctrl+Enter 5 times rapidly

**Expected:**
- ✅ Command sent once (no duplicate sends)
- ✅ OR command sent 5 times if intended
- ✅ No race conditions

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

## BACKLOG-001: Visual Transcription Progress Indicator (10 Tests)

**Status:** ✅ Completed (2025-11-08)
**Agent:** ui-agent
**Files Modified:** `vscode-lumina/src/commands/voicePanel.ts:1799-1830,4390-4418`

### Implementation Summary
Modified `showStatus()` function to persist 'info' type messages:
1. **'info' messages:** Persist until replaced (e.g., "🎤 Transcribing...", "🎵 Processing audio...")
2. **'success'/'error' messages:** Auto-hide after 5 seconds (unchanged)
3. **CSS styling:** Added fadeIn animation, color-coded borders, VS Code theme-aware

**Root Cause Fixed:** Old behavior auto-hid ALL messages after 5 seconds, but transcription takes 10-30 seconds → Users thought it broke.

**Pattern:** Pattern-UX-FEEDBACK (Persistent Progress Indicators)

### Test B1.1: Transcription Progress Message Persists
**Status:** ⏳ Not Tested

**Steps:**
1. Open Voice Panel
2. Click "Start Voice Capture" button
3. Speak into microphone
4. Observe status message: "🎤 Transcribing..."
5. Wait 10+ seconds (don't manually stop)

**Expected:**
- ✅ "🎤 Transcribing..." message visible throughout transcription (10-30 seconds)
- ✅ Message does NOT disappear after 5 seconds
- ✅ Message replaced when transcription completes

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test B1.2: Audio Processing Message Persists
**Status:** ⏳ Not Tested

**Steps:**
1. Start voice capture
2. Observe status message: "🎵 Processing audio..."
3. Wait 5+ seconds

**Expected:**
- ✅ "🎵 Processing audio..." message visible until processing completes
- ✅ Message does NOT auto-hide

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test B1.3: Success Message Auto-Hides
**Status:** ⏳ Not Tested

**Steps:**
1. Complete voice transcription
2. Observe success message: "✅ Transcription complete"
3. Wait 5+ seconds

**Expected:**
- ✅ Success message auto-hides after 5 seconds
- ✅ Status message area clears

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test B1.4: Error Message Auto-Hides
**Status:** ⏳ Not Tested

**Steps:**
1. Trigger transcription error (e.g., no microphone permission)
2. Observe error message
3. Wait 5+ seconds

**Expected:**
- ✅ Error message auto-hides after 5 seconds
- ✅ User has time to read error

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test B1.5: CSS Styling (Info Message)
**Status:** ⏳ Not Tested

**Steps:**
1. Trigger info message: "🎤 Transcribing..."
2. Inspect CSS styling

**Expected:**
- ✅ Blue left border (4px solid var(--vscode-charts-blue))
- ✅ Background color: var(--vscode-inputValidation-infoBorder)
- ✅ FadeIn animation (0.2s ease-in)
- ✅ Padding: 8px 12px
- ✅ Border radius: 4px

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test B1.6: CSS Styling (Success Message)
**Status:** ⏳ Not Tested

**Steps:**
1. Trigger success message
2. Inspect CSS styling

**Expected:**
- ✅ Green left border (4px solid #107c10)
- ✅ Background color: rgba(16, 124, 16, 0.2)
- ✅ FadeIn animation

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test B1.7: CSS Styling (Error Message)
**Status:** ⏳ Not Tested

**Steps:**
1. Trigger error message
2. Inspect CSS styling

**Expected:**
- ✅ Red left border (4px solid var(--vscode-charts-red))
- ✅ Background color: var(--vscode-inputValidation-errorBorder)
- ✅ FadeIn animation

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test B1.8: Message Replacement (Info → Success)
**Status:** ⏳ Not Tested

**Steps:**
1. Start transcription (info message appears)
2. Wait for transcription to complete
3. Observe message transition

**Expected:**
- ✅ "🎤 Transcribing..." replaced by "✅ Transcription complete"
- ✅ No overlap or flickering
- ✅ Smooth transition

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Test B1.9: Multiple Sequential Transcriptions
**Status:** ⏳ Not Tested

**Steps:**
1. Start transcription 1 (info message appears)
2. Wait for completion (success message, then auto-hides)
3. Start transcription 2 (info message reappears)
4. Wait for completion

**Expected:**
- ✅ Each transcription shows fresh info message
- ✅ Messages don't stack or conflict
- ✅ Status message area clears properly between transcriptions

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

### Edge Case B1.1: Very Long Transcription (30+ Seconds)
**Status:** ⏳ Not Tested

**Steps:**
1. Start transcription
2. Speak for 30+ seconds (very long input)
3. Observe status message throughout

**Expected:**
- ✅ "🎤 Transcribing..." message visible for entire duration (30+ seconds)
- ✅ No timeout or auto-hide

**Result:** [ ] PASS | [ ] FAIL
**Notes:** ___________

---

# Updated Test Summary

## Overall Status

**Sprint 3 - Unified v1.0**

| Category | Total Tests | Passed | Failed | Skipped | Status |
|----------|-------------|--------|--------|---------|--------|
| **Phase 1: Template System** | 30 | ___ | ___ | ___ | ⏳ Pending |
| **Phase 4: UX Polish** | 198 | ___ | ___ | ___ | ⏳ Pending |
| **PROTECT-000A: Task Analyzer** | 16 | ___ | ___ | ___ | ⏳ Pending |
| **PROTECT-000B: Start Next Task** | 14 | ___ | ___ | ___ | ⏳ Pending |
| **PROTECT-000C: Start This Task** | 14 | ___ | ___ | ___ | ⏳ Pending |
| **PROTECT-000D: Q&A Modal** | 22 | ___ | ___ | ___ | ⏳ Pending |
| **PROTECT-001: Code Protection** | 20 | ___ | ___ | ___ | ⏳ Pending |
| **PROTECT-002: Pre-Commit Hook** | 13 | ___ | ___ | ___ | ⏳ Pending |
| **TOTAL** | **327** | **___** | **___** | **___** | ⏳ **Pending** |

**Phase 4 UX Polish Breakdown:**
- UX-001: Universal Enhancement Pattern (46 tests)
- UX-003: Show/Hide Completed Tasks (14 tests)
- UX-004: Remove Button Text (8 tests)
- UX-005: Move Start Next Task Button (12 tests)
- UX-006: Text Area UI Improvements (16 tests)
- UX-007: Ctrl+Shift+Enter Hotkey (12 tests)
- UX-008: Remove Terminal Edit Button (10 tests)
- UX-010: Text Area Content Persistence (12 tests) ⭐ NEW
- UX-012: Auto-Expand Text Area (14 tests) ⭐ NEW
- UX-013: Ctrl+` Focus Hotkey (10 tests) ⭐ NEW
- UX-014: Global Ctrl+Enter (12 tests) ⭐ NEW
- BACKLOG-001: Transcription Progress Indicator (10 tests) ⭐ NEW

---

## Critical Issues Found

**Document any critical issues that block release:**

1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

---

## Non-Critical Issues

**Document any issues that don't block release but should be fixed in next sprint:**

1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

---

## Feedback for Next Sprint

**What worked well:**
- _______________________________________________
- _______________________________________________

**What needs improvement:**
- _______________________________________________
- _______________________________________________

**Feature requests:**
- _______________________________________________
- _______________________________________________

---

## Sign-Off

**Tester:** _____________
**Date:** _____________
**Sprint 3 Status:** ☐ APPROVED FOR RELEASE | ☐ NEEDS FIXES | ☐ BLOCKED

**Notes:**
_______________________________________________
_______________________________________________
_______________________________________________

---

## Appendix: Quick Command Reference

**Extension Development:**
- Press F5 to launch Extension Development Host
- Help → Toggle Developer Tools to open console
- Reload window: Ctrl+R (in dev host)

**Git Commands:**
- `git status` - Check staged files
- `git add <file>` - Stage file
- `git commit -m "message"` - Commit with message
- `git log --oneline -5` - View last 5 commits
- `git log --grep="PROTECTED:"` - Find protected commits

**TOML Validation:**
- `node -e "const toml = require('@iarna/toml'); toml.parse(require('fs').readFileSync('internal/sprints/ACTIVE_SPRINT.toml', 'utf-8'));"`
- `node scripts/validate-sprint-schema.js`

**TypeScript Compilation:**
- `cd vscode-lumina && npm run compile`

---

**End of Manual Test Plan**
