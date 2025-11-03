# ÆtherLight Project - Claude Code Instructions

**Project:** ÆtherLight (Voice-to-intelligence platform for developers)
**Last Updated:** 2025-11-03

---

## ⚠️ PRE-FLIGHT CHECKLIST (MANDATORY - READ BEFORE EVERY EDIT/WRITE)

**CRITICAL: You MUST complete this checklist BEFORE using Edit or Write tools.**

**Pattern-VALIDATION-001 Enforcement: If you skip this checklist, you WILL break the system.**

### Before Modifying ACTIVE_SPRINT.toml:

**STOP. Answer these questions OUT LOUD in your response:**

1. ✅ **Did I read `SprintLoader.ts:292-333` to verify the parser format?**
   - If NO → Read it NOW before proceeding
   - Expected format: `[tasks.TASK-ID]` NOT `[[epic.*.tasks]]`

2. ✅ **Did I check an existing task in ACTIVE_SPRINT.toml for format example?**
   - If NO → Read one task NOW (lines 72-150)
   - Copy the exact structure, don't invent

3. ✅ **Did I validate required fields are present?**
   - Required: id, name, status, phase, agent, estimated_time, dependencies
   - If missing any → Add them before proceeding

4. ✅ **Did I check for template literals in code examples?**
   - Search for: backticks with ${}
   - If found → Replace with string concatenation (+ operator)
   - Example: `` `Error: ${msg}` `` → `'Error: ' + msg`

5. ✅ **Did I validate the TOML will parse?**
   - If NO → Run: `node scripts/validate-sprint-schema.js` BEFORE committing
   - If script doesn't exist yet → Use: `node -e "const toml = require('@iarna/toml'); toml.parse(require('fs').readFileSync('internal/sprints/ACTIVE_SPRINT.toml', 'utf-8'));"`

**If you answered NO to ANY question, STOP and complete it NOW.**

### Before Adding Dependencies to package.json:

**STOP. Answer these questions OUT LOUD in your response:**

1. ✅ **Is this a native dependency?**
   - Check for: node-gyp, napi, bindings, .node, robotjs, @nut-tree-fork
   - If YES → **FORBIDDEN** - Use VS Code APIs instead
   - See: Pattern-PUBLISH-003 in Known Issues section

2. ✅ **Is this a runtime npm dependency?**
   - Check for: glob, lodash, moment, axios, chalk, colors
   - If YES → **FORBIDDEN** - Use Node.js built-ins instead
   - Exception: Whitelisted (@iarna/toml, form-data, node-fetch, ws)

3. ✅ **Did I check the whitelist?**
   - Allowed: aetherlight-analyzer, aetherlight-sdk, aetherlight-node
   - Allowed: @iarna/toml, form-data, node-fetch, ws
   - Everything else → Use built-ins (fs, path, util, crypto, https)

**If you're adding a forbidden dependency, STOP and find an alternative NOW.**

### Before Using Edit/Write Tools:

**STOP. Answer these questions OUT LOUD in your response:**

1. ✅ **Did I read the target file first?**
   - If NO → Read it NOW with Read tool
   - Never edit a file you haven't read in this session

2. ✅ **Did I verify the format/structure I'm following?**
   - If NO → Read the parser/loader code that will read this file
   - Never guess the format

3. ✅ **Am I following an existing pattern?**
   - If NO → Search for similar code and copy the pattern
   - Never invent new patterns without user approval

**If you answered NO to ANY question, STOP and complete it NOW.**

---

## Enforcement Mechanism

**This checklist is NOT optional. It is MANDATORY.**

**Historical bugs caused by skipping this checklist:**
- **2025-11-03:** Used `[[epic.*.tasks]]` instead of `[tasks.ID]` → Sprint panel broken (2 hours debugging)
- **v0.15.31-32:** Added `glob` runtime dependency → Extension activation failed (2 hours debugging)
- **v0.13.23:** Added `@nut-tree-fork/nut-js` native dependency → Extension broken (9 hours debugging)
- **v0.13.28, v0.13.29:** Version mismatch → User installs broken (2 hours debugging)

**Total time wasted: 15+ hours**

**If you skip this checklist, you WILL break something. User WILL be frustrated. Time WILL be wasted.**

**Your commitment: I will answer these questions OUT LOUD in my response BEFORE using Edit/Write tools.**

---

## Sprint Schema Validation (VAL-001)

**Implemented:** 2025-11-03
**Status:** ✅ Active - Real-time validation + Pre-commit hook

### Automatic Validation Layers

The system now has **4-layer validation** to prevent TOML format bugs:

1. **Real-time (FileSystemWatcher)** - Validates on file save
   - Watches `**/ACTIVE_SPRINT.toml`
   - Shows error notification with fix suggestions
   - Blocks sprint panel loading if invalid

2. **Pre-commit (Git Hook)** - Validates before commit
   - Run: `node scripts/validate-sprint-schema.js`
   - Blocks commit if validation fails
   - Prevents broken files reaching repository

3. **Manual Check** - Validate anytime
   - Command: `node scripts/validate-sprint-schema.js`
   - Use when debugging TOML issues

4. **Extension Activation** - Validates on VS Code startup
   - Automatic check when extension loads
   - Logs errors to ÆtherLight output channel

### Validation Rules

The SprintSchemaValidator enforces these rules:

1. ✅ **Tasks must use [tasks.ID] format**
   - ❌ FORBIDDEN: `[[epic.middleware.tasks]]`
   - ✅ CORRECT: `[tasks.MID-015]`
   - Why: SprintLoader expects `data.tasks` flat object

2. ✅ **Required fields must be present**
   - id, name, status, phase, agent
   - Missing fields = validation fails

3. ✅ **Status must be valid**
   - Valid: pending, in_progress, completed
   - Invalid status = validation fails

4. ✅ **No circular dependencies**
   - Dependencies form directed acyclic graph (DAG)
   - Circular deps = validation fails

5. ✅ **ID consistency**
   - Task id field must match section key
   - Example: `[tasks.MID-015]` must have `id = "MID-015"`

### Error Messages

When validation fails, you'll see:
- ❌ Clear error message
- 💡 Fix suggestions
- Line numbers (when available)
- Correct format examples

### Files Added

- `vscode-lumina/src/services/SprintSchemaValidator.ts` - Validation service
- `scripts/validate-sprint-schema.js` - Pre-commit hook script
- `vscode-lumina/src/extension.ts` - FileSystemWatcher integration (lines 891-947)

### Pattern Reference

- Pattern-VALIDATION-001 (Comprehensive System Validation)
- 4-layer defense: Real-time → Pre-commit → CI/CD → Runtime

---

## Project Overview

ÆtherLight is a VS Code extension + desktop app that provides:
- Voice capture and transcription (Whisper API)
- Pattern matching to prevent AI hallucinations
- Real-time context sync
- Sprint management and workspace analysis

**Tech Stack:**
- VS Code Extension: TypeScript
- Desktop App: Tauri (Rust + TypeScript)
- Packages: Node.js, native bindings (NAPI)

---

## Critical Rules

### Publishing & Releases

**ALWAYS use the automated publishing script:**
```bash
node scripts/publish-release.js [patch|minor|major]
```

**NEVER manually run individual publish steps** - this causes version mismatch bugs.

**Why:** The script ensures:
- Everything is compiled before publishing
- All artifacts are verified
- Versions are synced across all packages
- No timing issues or partial deploys

**Related Files:**
- `scripts/publish-release.js` - Automated release pipeline
- `scripts/bump-version.js` - Version synchronization
- `.claude/commands/publish.md` - Publishing command
- `PUBLISHING.md` - Publishing documentation

### Publishing Enforcement (CRITICAL - Pattern-PUBLISH-002)

**MANDATORY: Claude must follow this process when publishing is requested**

**When user requests a publish/release:**

1. **ALWAYS attempt to use the publish skill FIRST:**
   ```
   Use Skill tool with command: "publish"
   ```

2. **IF the skill fails or has an issue (e.g., interactive prompt timeout):**
   - **STOP immediately**
   - **DO NOT run manual commands without permission**
   - **Use AskUserQuestion tool** with this message:

   ```
   The automated publish script encountered an issue: [describe issue]

   I can proceed in two ways:

   Option 1 (RECOMMENDED): Troubleshoot the automation
   - Investigate why the script failed
   - Fix the underlying issue
   - Run the full automated script again

   Option 2 (MANUAL BYPASS - NOT RECOMMENDED): Run manual commands
   - Risk: May miss steps (desktop installers, verification, etc.)
   - Risk: Version mismatch bugs
   - Risk: Incomplete releases
   - Only use if automation is completely broken

   Which approach should I take?
   ```

3. **IF user chooses Manual Bypass:**
   - Document EVERY manual command being run
   - Explain why each command is needed
   - Compare against `scripts/publish-release.js` to ensure no steps are missed
   - Warn user before running ANY npm publish or gh release commands

4. **AFTER manual bypass completes:**
   - Create a task to fix the automation
   - Document what went wrong in CLAUDE.md Known Issues

**Why This Enforcement Exists:**

v0.15.31 release: I bypassed the automation when the interactive prompt timed out, which caused me to:
- ✅ Publish npm packages correctly
- ✅ Create GitHub release
- ❌ **FORGET desktop installers** (had to manually upload after)
- ❌ Skip verification steps

The automation has ALL the logic built-in. Manual bypasses WILL cause bugs.

**Enforcement Mechanism:**
- Pattern-PUBLISH-002 (Publishing Enforcement)
- Git pre-push hook detects manual version changes (`.git/hooks/pre-push`)
- This CLAUDE.md instruction requires asking user before bypassing

**Related Known Issues:**
- v0.13.28: Manual bypass caused version mismatch
- v0.13.29: Manual bypass missed sub-package publish (2-hour fix)
- v0.15.31: Manual bypass forgot desktop installers

### Version Management

All packages MUST stay in sync:
- `vscode-lumina/package.json` (main extension)
- `packages/aetherlight-sdk/package.json`
- `packages/aetherlight-analyzer/package.json`
- `packages/aetherlight-node/package.json`

The bump-version script handles this automatically.

### Code Quality

1. **Always compile TypeScript before testing:**
   ```bash
   cd vscode-lumina && npm run compile
   ```

2. **Pattern for extension code:**
   - Add Chain of Thought comments explaining WHY
   - Reference related files and patterns
   - Document design decisions

3. **Testing:**
   - **TDD REQUIRED (Test-Driven Development)** - See TDD Workflow below
   - Test in VS Code extension host (F5)
   - Verify all commands work

### Test-Driven Development (TDD) - MANDATORY

**CRITICAL: All code changes MUST follow Test-Driven Development**

**Why TDD:** Creates a "ratchet" (floor) preventing subtle breakage. Without tests, bugs slip through and reappear as regressions 4 changes later.

**TDD Workflow (Red-Green-Refactor):**
1. **RED:** Write test FIRST → Run → Test FAILS (expected)
2. **GREEN:** Implement minimum code to pass → Run → Test PASSES
3. **REFACTOR:** Improve code → Run → Test STILL PASSES
4. **COMMIT:** Tests + implementation together

**Claude Code Instructions:**
- **State TDD explicitly:** "We are doing test-driven development. Write tests FIRST, then implementation."
- **Prevent mock implementations:** Tell Claude to run tests and confirm they fail before writing code
- **Do NOT change tests:** Only change implementation to make tests pass

**TDD Enforcement System (MID-012):**

The project has automated TDD enforcement through multiple layers:

1. **TestRequirementGenerator** (`vscode-lumina/src/services/TestRequirementGenerator.ts`)
   - Auto-generates test requirements based on task category
   - Infrastructure tasks → 90% coverage, unit tests
   - API tasks → 85% coverage, integration tests
   - UI tasks → 70% coverage, component tests
   - Documentation tasks → No tests required

2. **TestContextGatherer** (`vscode-lumina/src/services/TestContextGatherer.ts`)
   - Scans workspace for existing test files
   - Runs test suite and captures output
   - Calculates coverage from coverage reports
   - Status: 🔴 None / 🟡 Partial / 🟢 Complete (≥80%)

3. **TestValidator** (`vscode-lumina/src/services/TestValidator.ts`)
   - **BLOCKS** task completion if tests missing or failing
   - Requires execution proof (not just file existence)
   - Detects manual script workarounds (console.log, node test.js)
   - Enforces coverage requirements per task type

4. **ConfidenceScorer** (`vscode-lumina/src/services/ConfidenceScorer.ts`)
   - Updated with test coverage scoring (30% of total score!)
   - test_files: +0.10 (tests exist)
   - test_requirements: +0.05 (TDD requirements defined)
   - passing_tests: +0.15 (highest weight - most critical!)
   - Tasks without passing tests score ≤0.70 (fill_gaps or regenerate)

5. **Git Pre-Commit Hook** (`.git/hooks/pre-commit`)
   - Runs automatically before every commit
   - Blocks commits if tests failing
   - Shows test output and TDD workflow reminder
   - Bypass: `git commit --no-verify` (NOT RECOMMENDED)

**Pre-Publish Checklist:**
- [ ] All tests passing (`npm test`)
- [ ] Test coverage ≥ 80% (check: `npm run coverage`)
- [ ] No skipped tests (`.skip` removed)
- [ ] No TODO tests (`.todo` implemented)
- [ ] TestValidator passes for all tasks
- [ ] No manual script workarounds detected

**Example Task with TDD:**
```toml
[[epic.middleware.tasks]]
id = "MID-002"
name = "Confidence Scorer"

test_requirements = """
TDD Requirements (Infrastructure Task):
1. Write tests FIRST for scoreTask()
2. Test cases:
   - Complete task (all criteria) → score 1.0
   - Partial task (missing agent) → score 0.85
   - Empty task → score 0.0
   - With passing tests → score includes +0.15 bonus
3. Run tests → FAIL (red phase)
4. Implement ConfidenceScorer.scoreTask() → PASS (green phase)
5. Refactor for clarity → STILL PASS
"""

test_files = [
  "vscode-lumina/test/services/confidenceScorer.test.ts"
]

test_coverage_requirement = 0.9  # 90% for core services
```

**Token Impact:**
- WITHOUT TDD: Bug → Undetected → Debug (8k tokens) → Regression (8k tokens) = 21k total
- WITH TDD: Write tests (2k) → Implement (5k) → Test catches bug → Fix (1k) = 9k total (57% savings)

**Enforcement Mechanism Files:**
- `vscode-lumina/src/services/TestRequirementGenerator.ts` - Auto-generate test requirements
- `vscode-lumina/src/services/TestContextGatherer.ts` - Find tests, run suite, check coverage
- `vscode-lumina/src/services/TestValidator.ts` - Block completion without passing tests
- `vscode-lumina/src/services/ConfidenceScorer.ts` - Score tasks with test coverage weight
- `.git/hooks/pre-commit` - Block commits with failing tests
- Pattern: Pattern-TDD-001 (Test-Driven Development Ratchet)

**Resources:**
- Full enforcement guide: `internal/TDD_ENFORCEMENT_MECHANISM.md`
- Sprint task example: `internal/sprints/ACTIVE_SPRINT.toml` (MID-012)
- Pattern: Pattern-TDD-001 (Test-Driven Development Ratchet)

---

### Pre-Task Analysis Protocol (Pattern-TASK-ANALYSIS-001) - MANDATORY

**CRITICAL: Run this analysis BEFORE writing ANY code for ANY task**

**Why This Exists:**
- Prevents rework and costly bugs (2-9 hour fixes for missed issues)
- Ensures best-first-try outcomes through comprehensive context gathering
- Catches known issues before they become bugs (Pattern-PUBLISH-003, native deps)
- Optimizes library selection (Node.js built-ins vs npm packages)
- Designs TDD strategy appropriate for task type
- Makes context-aware decisions about tech stack and integration

**When to Use:**
- Starting ANY task from a sprint
- Before implementing ANY new feature
- When uncertain about implementation approach
- When multiple solution paths exist

**Required Analysis Steps:**

**1. Agent Verification**
   - Read assigned agent context file (`internal/agents/{agent}-context.md`)
   - Verify agent expertise matches task requirements
   - If mismatch: Update agent assignment in sprint TOML
   - If agent context incomplete: Update agent context with new responsibilities

**2. Tech Stack Analysis**
   - TypeScript version: Check `vscode-lumina/package.json` → `"typescript": "^5.x"`
   - VS Code API compatibility: Check `vscode-lumina/package.json` → `engines.vscode`
   - Node.js version: Check `.nvmrc` or package.json `engines.node`
   - Compilation requirements: Does this need special tsconfig settings?

**3. Integration Points**
   - What existing services does this integrate with?
   - Read each integration point's source file to understand:
     - Interface/API surface
     - Error handling patterns
     - Performance characteristics
     - Dependencies and side effects
   - Example: WorkflowCheck integrates with ConfidenceScorer, TestValidator, Git APIs
   - Check for circular dependencies or coupling issues

**4. Known Issues Check**
   - **Pattern-PUBLISH-003**: Will this add runtime npm dependencies? (❌ FORBIDDEN)
   - **Native Dependencies**: Will this require C++ addons? (❌ FORBIDDEN)
   - Check "Known Issues & Fixes" section in this file for past bugs
   - Review agent "Common Pitfalls" section for category-specific issues

**5. Library Selection**
   - **Default:** Use Node.js built-in modules (`fs`, `path`, `child_process`)
   - **VS Code APIs:** Use `vscode.*` APIs when available (text editing, terminal, etc.)
   - **Forbidden:** npm packages at runtime (will be excluded by `vsce package --no-dependencies`)
   - **Exceptions:** Sub-packages (`aetherlight-analyzer`, `aetherlight-sdk`, `aetherlight-node`)
   - Ask: "Can this be done with built-ins?" If yes, use built-ins. If no, reconsider design.

**6. Performance Requirements**
   - Calculate target based on task type:
     - Workflow checks: <500ms (Pattern-COMM-001)
     - Agent assignment: <50ms (caching required)
     - Confidence scoring: <100ms
     - Test validation: <200ms
     - Extension activation: <200ms (VS Code requirement)
   - Design caching strategy if needed (>80% hit rate target)
   - Add timeout protection for operations >1s

**7. TDD Strategy Design**
   - Determine coverage requirement by task category:
     - Infrastructure: 90% coverage (core services, critical paths)
     - API: 85% coverage (all endpoints, error cases)
     - UI: 70% coverage (components, interactions)
     - Documentation: 0% coverage (manual validation)
   - Design test cases BEFORE implementation:
     - Happy path scenarios
     - Error cases and edge cases
     - Integration with other services
     - Performance benchmarks
   - Identify test dependencies (mocks, fixtures, test data)

**8. Clarification Questions**
   - If ANY of the above is unclear or ambiguous: **ASK USER**
   - Use AskUserQuestion tool for:
     - Multiple valid implementation approaches
     - Unclear requirements or acceptance criteria
     - Trade-offs that need user decision
     - Missing information about integration points
   - Do NOT proceed with uncertain assumptions

**Workflow:**

```
┌─────────────────────────────────────┐
│ 1. Read sprint task from TOML      │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ 2. Run Pre-Task Analysis (8 steps) │
│    - Agent verification             │
│    - Tech stack analysis            │
│    - Integration points             │
│    - Known issues check             │
│    - Library selection              │
│    - Performance requirements       │
│    - TDD strategy design            │
│    - Clarification questions        │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ 3. Document analysis results        │
│    (in chat for user visibility)    │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ 4. Update agent/sprint if needed    │
│    - Update agent context           │
│    - Update task in sprint TOML     │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ 5. Proceed to TDD implementation    │
│    - RED: Write tests first         │
│    - GREEN: Implement to pass       │
│    - REFACTOR: Optimize             │
└─────────────────────────────────────┘
```

**Example Pre-Task Analysis Output:**

```
Pre-Task Analysis: PROTO-001 - Universal Workflow Check System
================================================================

1. Agent Verification
   ✅ Assigned: infrastructure-agent
   ✅ Match: Service orchestration, TypeScript services
   ✅ Action: None needed

2. Tech Stack
   ✅ TypeScript: 5.3.3 (vscode-lumina/package.json)
   ✅ VS Code API: ^1.80.0
   ✅ Node.js: >=18.0.0
   ✅ Special config: None needed

3. Integration Points
   ✅ ConfidenceScorer.ts (scoring logic)
   ✅ TestValidator.ts (test validation)
   ✅ Git APIs (child_process.exec)
   ✅ MiddlewareLogger.ts (structured logging)
   Action: Read all 4 files to understand interfaces

4. Known Issues Check
   ✅ Pattern-PUBLISH-003: No runtime npm deps planned
   ✅ Native deps: None required
   ✅ Past bugs: Reviewed - no relevant patterns

5. Library Selection
   ✅ Git operations: child_process.exec() (built-in)
   ✅ File operations: fs, path (built-ins)
   ✅ No npm packages needed ✅

6. Performance Requirements
   ✅ Target: <500ms (workflow check)
   ✅ Caching: Required (>80% hit rate)
   ✅ Timeout: 10s max per check

7. TDD Strategy
   ✅ Category: Infrastructure → 90% coverage required
   ✅ Test cases:
      - checkWorkflow('code') → validates TDD, tests, sprint task
      - checkWorkflow('sprint') → validates workspace, git, skills
      - checkWorkflow('publish') → validates tests, artifacts, git
      - Service integration failures (graceful degradation)
      - Performance benchmarks (<500ms)
   ✅ Test file: vscode-lumina/test/services/workflowCheck.test.ts

8. Clarifications
   ✅ No clarifications needed - requirements clear

Ready to proceed: YES ✅
Estimated time: 4-5 hours
Confidence: HIGH (0.90)
```

**Benefits:**
- **Reduces rework:** 57% token savings vs debugging after implementation
- **Catches issues early:** Known pattern violations detected before coding
- **Optimizes decisions:** Best library/approach chosen with full context
- **Improves outcomes:** Best-first-try through comprehensive analysis
- **Documents decisions:** Clear reasoning for future reference

**Enforcement:**
- Agents document this protocol in workflow section
- Sprint tasks should note which agent was used
- Update agent context if new patterns learned during task
- This protocol becomes part of the development culture

**Pattern Reference:** Pattern-TASK-ANALYSIS-001 (Pre-Task Analysis Protocol)

---

### Code Development Protocol (Pattern-CODE-001) - MANDATORY

**CRITICAL: Run workflow check BEFORE writing ANY production code**

**Why This Exists:**
- Prevents writing code without tests (TDD violations)
- Ensures sprint task tracking (no orphan code)
- Catches low confidence early (missing patterns, agents, context)
- Makes development transparent to user

**When to Use:**
- Before implementing ANY feature
- Before fixing ANY bug (except typos)
- When starting ANY coding session

**Automatic Workflow Check Template:**

```
🔍 Code Workflow Check: [Task ID - Task Name]
================================================================

Prerequisites:
✅ Sprint task: PROTO-001 - Universal Workflow Check System
✅ Tests exist: test/services/workflowCheck.test.ts (15 tests written - TDD RED phase)
✅ Git status: Clean working directory
✅ Confidence: 0.90 (HIGH) - All criteria met

Gaps: None

Critical Junction: NO (high confidence ≥0.80)

Plan:
1. Implement WorkflowCheck.ts service (TDD GREEN phase)
2. Compile TypeScript
3. Run tests - verify they PASS
4. Refactor and optimize (TDD REFACTOR phase)
5. Commit changes

Ready to proceed ✅
```

**Communication Template:**

Before writing code, Claude MUST announce:
1. What task is being worked on (with ID)
2. Prerequisites checked (✅/❌ with details)
3. Confidence score (percentage + HIGH/MEDIUM/LOW)
4. Any gaps identified
5. Whether this is a critical junction (requires approval)
6. Execution plan (step-by-step)

**Edge Case Guidelines:**

1. **Typo Fix (Non-Feature Code)**
   - Typo in comment/documentation → Skip workflow check
   - Typo in variable name → Skip workflow check
   - Typo in string literal → Skip workflow check
   - WHY: Typos don't require tests, sprint tasks, or patterns

2. **Bug Fix (Production Code)**
   - Always run workflow check
   - Always write test first (TDD RED phase) that reproduces bug
   - Then fix bug (TDD GREEN phase)
   - WHY: Bug fixes are production code changes requiring tests

3. **Experimental Code (Spike/POC)**
   - Run workflow check
   - Mark as experimental in commit message
   - Create sprint task or note as "spike"
   - WHY: Even experiments benefit from context tracking

4. **Refactoring (No Behavior Change)**
   - Run workflow check
   - Verify existing tests still pass
   - No new tests needed (behavior unchanged)
   - WHY: Refactoring can introduce subtle bugs

**Integration with TodoWrite:**

After workflow check, Claude MUST use TodoWrite to track:
1. Pre-Task Analysis steps (if not already done)
2. TDD phases (RED, GREEN, REFACTOR)
3. Compilation and testing steps
4. Git commit step

Example:
```
TodoWrite:
- [in_progress] TDD RED: Write tests first
- [pending] TDD GREEN: Implement to pass tests
- [pending] TDD REFACTOR: Optimize code
- [pending] Compile TypeScript
- [pending] Commit changes
```

Mark each step [completed] immediately after finishing.

**Enforcement Mechanism:**

- Self-accountability: Claude follows this protocol voluntarily
- User visibility: User sees workflow check announcement before code
- Pattern reference: This protocol is Pattern-CODE-001
- Audit trail: Workflow checks logged in MiddlewareLogger

**Failure Modes:**

If Claude skips workflow check:
- User doesn't see prerequisites
- No confidence score → blind coding
- Gaps missed → rework later
- No transparency → user distrust

**Example: Full Code Development Flow**

```
User: "Implement PROTO-001 - Universal Workflow Check System"

Claude: "Running Pre-Task Analysis (Pattern-TASK-ANALYSIS-001)..."

[8-step analysis completed]

Claude: "Pre-Task Analysis COMPLETE ✅

Now running Code Workflow Check..."

🔍 Code Workflow Check: PROTO-001 - Universal Workflow Check System
================================================================

Prerequisites:
✅ Sprint task: PROTO-001 assigned to infrastructure-agent
✅ Tests exist: NO - Will write tests first (TDD RED phase)
✅ Git status: Clean working directory
✅ Agent match: infrastructure-agent v2.0 (service orchestration) ✅

Confidence: 0.85 (HIGH)
- Task completeness: 0.85
- Pre-task analysis: COMPLETE
- Known issues reviewed: ✅ Pattern-PUBLISH-003 (no runtime npm deps)

Gaps: None

Critical Junction: NO (high confidence, routine task)

Plan:
1. Write 15 comprehensive tests (TDD RED phase) - 1 hour
2. Implement WorkflowCheck.ts service (TDD GREEN phase) - 2 hours
3. Compile and verify tests pass
4. Refactor for performance (<500ms target)
5. Commit with detailed message

Estimated time: 4-5 hours
Ready to proceed ✅

[Claude proceeds with TodoWrite tracking, then writes tests, then implements]
```

**Pattern Reference:** Pattern-CODE-001 (Code Development Protocol)

---

### Sprint Planning Protocol (Pattern-SPRINT-PLAN-001) - MANDATORY

**CRITICAL: Run workflow check BEFORE creating ANY sprint**

**Why This Exists:**
- Ensures workspace analysis complete (context gathered)
- Verifies git state clean (no uncommitted work blocking)
- Confirms agents available (skills loaded from AgentRegistry)
- Prevents creating sprints without proper foundation

**When to Use:**
- Before creating new sprint TOML file
- Before modifying ACTIVE_SPRINT.toml
- When user requests "create sprint" or "plan sprint"

**Automatic Workflow Check Template:**

```
🔍 Sprint Planning Workflow Check
================================================================

Prerequisites:
✅ Workspace analyzed: Context gathered from codebase
✅ Git status: Clean working directory
✅ Agent Registry: 9 agents loaded from internal/agents/
✅ Patterns available: 15 patterns loaded from docs/patterns/
✅ Skill system: AgentRegistry initialized

Gaps: None

Critical Junction: YES (Always ask user to review sprint plan before creating)

Plan:
1. Analyze user requirements
2. Break down into phases and tasks
3. Assign agents to tasks based on expertise
4. Estimate time and complexity
5. Generate sprint TOML
6. Show plan to user for approval
7. Create feature branch (if approved)
8. Commit sprint file

Ready to proceed (will pause for user approval before creating sprint)
```

**Communication Template:**

Before creating sprint, Claude MUST announce:
1. Workspace analysis status
2. Git repository status
3. Available agents and skills
4. Sprint scope and estimated timeline
5. **ASK USER** to review plan before proceeding

**Prerequisites Checklist:**

1. **Workspace Analyzed** ✅
   - Code structure mapped
   - Dependencies identified
   - Existing patterns cataloged
   - Tech stack confirmed

2. **Git Clean** ✅
   - No uncommitted changes
   - Current branch identified
   - Remote status checked

3. **Agent Registry Loaded** ✅
   - Agents loaded from internal/agents/
   - Agent capabilities mapped to task categories
   - No missing agent definitions

4. **User Requirements Clear** ✅
   - Sprint goal defined
   - Success criteria specified
   - Timeline confirmed

**Critical Junction: ALWAYS ASK USER**

Sprint planning is ALWAYS a critical junction because:
- High-impact operation (affects entire sprint workflow)
- User needs to review and approve plan
- May need adjustments based on priorities

Use `AskUserQuestion` tool:
```
Questions:
- "Review this sprint plan. Does it match your expectations?"
- Options: "Approve and create", "Modify plan", "Cancel"
```

**Pattern Reference:** Pattern-SPRINT-PLAN-001 (Sprint Planning Protocol)

---

### Testing Protocol (Pattern-TEST-001) - MANDATORY

**CRITICAL: TDD workflow MUST be followed for all production code**

**Why This Exists:**
- Pattern-TDD-001 (Test-Driven Development Ratchet)
- Creates "floor" preventing code without tests
- Catches bugs early (before implementation)
- Prevents subtle breakage appearing later

**When to Use:**
- Before implementing ANY feature
- Before fixing ANY bug
- When refactoring production code

**TDD Workflow (RED-GREEN-REFACTOR):**

```
🔍 Testing Workflow Check
================================================================

TDD Phase: RED (Write tests first)

Prerequisites:
✅ Test file created: test/services/myService.test.ts
✅ Test cases designed: 10 tests covering happy path, errors, edge cases
✅ Test framework: Mocha/Chai configured
⏳ Tests run: FAIL (expected - implementation doesn't exist yet)

Next: Implement MyService to make tests pass (GREEN phase)
```

**Test Requirements by Task Category:**

1. **Infrastructure Tasks** (core services, middleware)
   - Coverage: **90% required**
   - Tests: Unit tests for all public methods
   - Mocking: Mock external services (ConfidenceScorer, TestValidator)
   - Performance: Benchmark tests for <500ms requirements

2. **API Tasks** (endpoints, routes, controllers)
   - Coverage: **85% required**
   - Tests: Integration tests for all endpoints
   - Error cases: Test all error scenarios (400, 401, 404, 500)
   - Performance: Test response times

3. **UI Tasks** (components, views, interactions)
   - Coverage: **70% required**
   - Tests: Component tests for rendering and interactions
   - User events: Test clicks, inputs, keyboard navigation
   - Visual: Snapshot tests for UI consistency

4. **Documentation Tasks** (patterns, guides, README)
   - Coverage: **0% required**
   - Validation: Manual review for clarity and accuracy
   - Examples: Verify all code examples work

**TDD Enforcement (MID-012):**

1. **TestRequirementGenerator**
   - Auto-generates test requirements based on task category
   - Calculates coverage requirement
   - Identifies test file locations

2. **TestContextGatherer**
   - Scans workspace for test files
   - Runs test suite and captures output
   - Calculates coverage from reports

3. **TestValidator**
   - **BLOCKS** task completion if tests missing or failing
   - Requires execution proof (not just file existence)
   - Detects manual script workarounds

4. **ConfidenceScorer**
   - Test coverage = 30% of total confidence score
   - passing_tests: +0.15 (highest weight!)
   - Tasks without passing tests score ≤0.70

5. **Git Pre-Commit Hook**
   - Runs automatically before every commit
   - Blocks commits if tests failing
   - Bypass: `git commit --no-verify` (NOT RECOMMENDED)

**Pattern Reference:** Pattern-TEST-001 (Testing Protocol), Pattern-TDD-001 (Test-Driven Development Ratchet)

---

### Documentation Protocol (Pattern-DOCS-001) - MANDATORY

**CRITICAL: Assess reusability BEFORE creating documentation files**

**Why This Exists:**
- Prevents ephemeral markdown summaries (clutter codebase)
- Ensures patterns created for reusable knowledge only
- Keeps documentation focused and valuable

**Reusability Assessment:**

**HIGH Reusability** → Create Pattern Document
- Referenced in 3+ places
- Core architecture or workflow process
- Will be reused across multiple features
- Example: Pattern-COMM-001, Pattern-TDD-001

**MEDIUM Reusability** → Ask User
- Referenced in 2 places
- Specific feature implementation
- May be reused in similar features
- Use `AskUserQuestion`: "Create pattern or explain in chat?"

**LOW Reusability** → Chat Explanation Only
- Single use case
- Specific bug fix
- One-time explanation
- Don't create file

**EPHEMERAL** → Chat Only (FORBIDDEN to create file)
- Status update ("I completed X")
- User question answer ("Here's how Y works")
- Progress report
- One-time summary

**Decision Tree:**

```
Is this reusable knowledge?
├─ Yes, used in 3+ places → HIGH → Create Pattern Document
├─ Maybe, used in 2 places → MEDIUM → Ask User
├─ No, single use case → LOW → Chat explanation only
└─ No, one-time update → EPHEMERAL → Chat only (no file)
```

**Documentation Workflow Check:**

```
🔍 Documentation Workflow Check
================================================================

Reusability Assessment: HIGH

Reasoning:
- Referenced in: WorkflowCheck.ts, CLAUDE.md, agent contexts (3+ places)
- Core workflow process used across all development
- Will be reused by all future agents

Recommendation: Create Pattern Document
  File: docs/patterns/Pattern-COMM-001-Universal-Communication.md
  Sections: Problem, Solution, Implementation, Examples

Alternative: In-chat explanation only (NOT RECOMMENDED for high reusability)

Decision: Create Pattern Document ✅
```

**Pattern vs. Summary:**

| Aspect | Pattern Document | Ephemeral Summary |
|--------|------------------|-------------------|
| Reusability | High/Medium | None |
| References | 2+ places | This conversation only |
| Lifespan | Long-term | Ephemeral |
| Format | Structured (Problem, Solution, Examples) | Freeform chat |
| File created | Yes | NO |

**Enforcement:**

- Claude MUST assess reusability before creating ANY .md file
- Claude MUST explain reasoning (why this qualifies as pattern)
- User can override (always has final say)

**Pattern Reference:** Pattern-DOCS-001 (Documentation Protocol)

---

### Git Workflow Integration Protocol - MANDATORY

**CRITICAL: Check git status BEFORE every workflow**

**Why This Exists:**
- Uncommitted changes block clean workflow
- Branch awareness prevents accidental pushes to main
- Merge conflicts detected early
- Git state visible in all workflow checks

**Git Status Checks:**

Every workflow check MUST include git status:

```
Git Status:
✅ Working directory: Clean (no uncommitted changes)
✅ Current branch: feature/proto-001 (not main/master)
✅ Merge conflicts: None
✅ Unpushed commits: 2 commits ahead of origin/master
```

**Git States:**

1. **Clean Working Directory** ✅
   - Status: No uncommitted changes
   - Action: Proceed with workflow
   - Remediation: N/A

2. **Uncommitted Changes** ⚠️
   - Status: Modified files not staged/committed
   - Action: Warn user (suboptimal but not blocking)
   - Remediation: "Commit changes: git add . && git commit"

3. **On Main Branch** ⚠️
   - Status: Current branch is main/master
   - Action: Critical junction (ask user before push)
   - Remediation: "Consider feature branch: git checkout -b feature/name"

4. **Merge Conflicts** ❌
   - Status: Unresolved merge conflicts
   - Action: Block workflow
   - Remediation: "Resolve conflicts before proceeding"

5. **Git Not Available** ❌
   - Status: Git command failed
   - Action: Warn user (degraded, not blocking)
   - Remediation: "Check git installation and repository status"

**Git Commands Used:**

```bash
# Check status
git status --porcelain

# Check current branch
git rev-parse --abbrev-ref HEAD

# Check unpushed commits
git log origin/HEAD..HEAD --oneline

# Check merge conflicts
git ls-files -u
```

**Integration with WorkflowCheck.ts:**

- `WorkflowCheck.checkGitStatus()` method
- Uses `child_process.exec()` (Node.js built-in)
- Graceful degradation if git fails
- Cached for performance (<50ms on cache hit)

---

### Gap Detection & Self-Improvement Protocol - MANDATORY

**CRITICAL: Propose creating missing patterns/skills/agents instead of working around**

**Why This Exists:**
- System improves itself over time
- Missing patterns get documented
- Missing agents get created
- User has visibility and control

**Gap Types:**

1. **Missing Pattern**
   - Detected: Task references Pattern-XYZ-001 but it doesn't exist
   - Impact: Degraded (can work without pattern, but suboptimal)
   - Proposal: Create pattern document (2 hours)

2. **Missing Skill**
   - Detected: Task requires "publish" skill but not available
   - Impact: Blocking (can't complete task without skill)
   - Proposal: Create skill definition (1 hour)

3. **Missing Agent**
   - Detected: Task assigned to "security-agent" but agent not in registry
   - Impact: Blocking (no agent to handle task)
   - Proposal: Create agent context file (2-3 hours)

4. **Missing Test**
   - Detected: Production code without test file
   - Impact: Blocking (Pattern-TDD-001 enforcement)
   - Proposal: Write tests first (TDD RED phase)

5. **Missing Documentation**
   - Detected: High-reusability knowledge not documented
   - Impact: Suboptimal (knowledge lost if not documented)
   - Proposal: Create pattern or update docs (1-2 hours)

**Gap Detection Workflow:**

```
🔍 Gap Detected: Missing Pattern-GIT-001

Gap Type: Pattern
Impact: Suboptimal (can work without, but less efficient)
Description: Git workflow integration pattern referenced but doesn't exist

Proposal: Create Pattern-GIT-001 document
  File: docs/patterns/Pattern-GIT-001-Git-Workflow.md
  Estimated time: 2 hours
  Benefit: Standardizes git workflow across all agents

Options:
1. Create now (add to current task, extend timeline)
2. Workaround (proceed without pattern, note for future)
3. Defer (create separate task, add to backlog)

Recommendation: Defer (don't block current task)

Awaiting your decision...
```

**User Approval (AskUserQuestion):**

```
Questions:
- "I detected a gap: [Gap description]. How should I proceed?"
- Options:
  1. "Create now" → Add to current task
  2. "Workaround" → Continue with degraded functionality
  3. "Defer" → Create task for later
```

**Gap Tracking:**

- All gaps logged in MiddlewareLogger
- Gap log reviewed during sprint retrospectives
- Patterns emerge (recurring gaps → systematic improvement)

**Self-Improvement Cycle:**

```
Gap Detected → Proposal Generated → User Approval → Gap Filled → System Improved
```

**Enforcement:**

- Claude MUST propose gap filling (not work around silently)
- User ALWAYS has final decision
- Gaps tracked for retrospective analysis

---

### Task Tracking & Pre-Commit Protocol (Pattern-TRACKING-001) - MANDATORY

**CRITICAL: Maintain sprint-level visibility + quality control checkpoints**

**Why This Exists:**
- User needs to see overall sprint progress (strategic view)
- Within-task steps provide execution visibility (tactical view)
- Pre-commit checklist prevents "forgot to test/document" bugs
- Artifact consolidation enables easy breadcrumb navigation
- Quality control checkpoint saves 2-9 hours debugging (10-20x token ROI)

**Two-Level Todo System:**

**Strategic Level** (Sprint Progress):
```
✅ PROTO-001: Universal Workflow Check System - Files: WorkflowCheck.ts, workflowCheck.test.ts
✅ PROTO-002: Update CLAUDE.md with Communication Protocol - Files: CLAUDE.md (+689 lines)
🔄 PROTO-003: Create Pattern-COMM-001 Document - Files: docs/patterns/Pattern-COMM-001.md
⏳ PROTO-004: Git Workflow Integration - Files: WorkflowCheck.ts (git methods)
⏳ PROTO-005: Gap Detection - Files: WorkflowCheck.ts (gap detection)
⏳ PROTO-006: Documentation Philosophy - Files: WorkflowCheck.ts (docs assessment)
```

**Tactical Level** (Within Complex Tasks Only):
```
PROTO-001 Subtasks (for complex >2 hour tasks):
✅ Pre-task analysis (8 steps)
✅ Write 15 tests (TDD RED phase)
✅ Implement WorkflowCheck.ts (TDD GREEN phase)
✅ Compile TypeScript
✅ Commit changes
```

**Rules:**

1. **Always Maintain Strategic List**
   - Shows ALL sprint tasks
   - Updated after EVERY commit
   - Includes artifact links (files created/modified)

2. **Add Tactical Steps Selectively**
   - Complex tasks (>2 hours, 5+ steps)
   - User requests detailed visibility
   - Learning/training scenarios

3. **Artifact Consolidation**
   - List all files associated with task
   - Include file paths (clickable in VS Code)
   - Makes breadcrumb navigation easy
   - Example: `Files: WorkflowCheck.ts, workflowCheck.test.ts, CLAUDE.md`

4. **Update Triggers**
   - Start task → Mark `in_progress`
   - Complete subtask (tactical) → Mark subtask `completed`
   - Commit task → Run Pre-Commit Checklist → Mark task `completed`, next task `in_progress`

**Pre-Commit Quality Control Checklist:**

**MANDATORY: Run this checklist BEFORE committing ANY task**

```
🔍 Pre-Commit Checklist: [TASK-ID]
================================================================

Strategic Todo Review:
□ Current task marked with ✅ status indicators?
□ Artifact links accurate and complete?
□ Next task ready to mark in_progress?

Tactical Todo Review (if applicable):
□ All subtasks marked completed?
  - If YES: ✅ Verify each was actually done (spot check)
  - If NO: ❌ Complete missing subtasks OR explain why skipped

Deliverables Check:
□ All files created/modified as specified?
  - Check sprint TOML deliverables list
  - Verify each deliverable exists and is complete

Quality Check (by task type):
□ Infrastructure tasks:
  - ✅ Tests written and passing? (90% coverage)
  - ✅ TypeScript compiles without errors?
  - ✅ Performance targets met? (<500ms)
□ Documentation tasks:
  - ✅ All sections complete?
  - ✅ Examples provided?
  - ✅ Links/references accurate?
□ API tasks:
  - ✅ Tests written and passing? (85% coverage)
  - ✅ Error cases tested?
□ UI tasks:
  - ✅ Tests written and passing? (70% coverage)
  - ✅ Manual verification done?

Git Workflow:
□ Git status clean or changes intentional?
□ Commit message descriptive and follows convention?
□ All related changes included in commit?

Ready to Commit?
□ ALL checkboxes above checked
□ Task truly complete (not "good enough for now")
□ Confident this passes quality bar

If ANY checkbox is ❌:
- STOP and fix before committing
- Or explicitly note why skipped in commit message
```

**Update Workflow (After Commit):**

1. **Run Pre-Commit Checklist** (above)
2. **Update Strategic Todo**:
   ```
   ✅ [TASK-ID]: Task Name - Files: file1.ts, file2.md
   🔄 [NEXT-TASK-ID]: Next Task Name
   ```
3. **Clear Tactical Todos** (if any - they're task-specific)
4. **Start Next Task** with fresh tactical list if needed

**Example: Complete Workflow**

```
Starting PROTO-003:

Strategic:
✅ PROTO-001: Complete
✅ PROTO-002: Complete
🔄 PROTO-003: Create Pattern-COMM-001 Document - Files: (TBD)
⏳ PROTO-004: Git Workflow Integration

Work... work... work...

Before Committing PROTO-003:
🔍 Pre-Commit Checklist:
✅ Strategic todo has artifact link
✅ Pattern document created: docs/patterns/Pattern-COMM-001-Universal-Communication.md
✅ All 10 sections complete (Problem, Solution, Examples, etc.)
✅ Examples provided for all 5 workflow types
✅ Related patterns listed (4+ patterns)
✅ Git status clean

Ready to commit ✅

After Committing PROTO-003:

Strategic (updated):
✅ PROTO-001: Universal Workflow Check System - Files: WorkflowCheck.ts, workflowCheck.test.ts
✅ PROTO-002: Update CLAUDE.md with Communication Protocol - Files: CLAUDE.md
✅ PROTO-003: Create Pattern-COMM-001 Document - Files: docs/patterns/Pattern-COMM-001-Universal-Communication.md
🔄 PROTO-004: Git Workflow Integration - Files: WorkflowCheck.ts (git methods)
⏳ PROTO-005: Gap Detection
```

**Benefits:**

1. **Sprint Visibility**: User always sees where we are in sprint
2. **Quality Control**: Pre-commit checklist catches forgotten steps
3. **Bug Prevention**: Saves 2-9 hours debugging per caught issue
4. **Breadcrumb Navigation**: Artifact links make it easy to find task files
5. **Accountability**: Clear record of what was done
6. **Token Efficient**: ~100-200 tokens per task (10-20x ROI)

**Enforcement:**

- Self-accountability: Claude follows protocol voluntarily
- User visibility: Can see if tasks truly complete
- Pre-commit hook: Could add automated validation (future)
- Pattern reference: This protocol is Pattern-TRACKING-001

**Pattern Reference:** Pattern-TRACKING-001 (Task Tracking & Pre-Commit Protocol)

---

## Common Tasks

### Publishing a New Version

Use the `/publish` command or:
```bash
node scripts/publish-release.js patch   # Bug fixes (0.13.20 → 0.13.21)
node scripts/publish-release.js minor   # New features (0.13.20 → 0.14.0)
node scripts/publish-release.js major   # Breaking changes (0.13.20 → 1.0.0)
```

### Making Changes to Extension

1. Edit TypeScript files in `vscode-lumina/src/`
2. Compile: `cd vscode-lumina && npm run compile`
3. Test: Press F5 in VS Code to launch Extension Development Host
4. Verify changes work
5. Commit changes
6. Publish using automated script

### Updating Auto-Update System

The update checker is in `vscode-lumina/src/services/updateChecker.ts`

**Important:** Any changes here affect how users receive updates. Test thoroughly.

---

## Project Structure

```
lumina-clean/
├── vscode-lumina/           # Main VS Code extension
│   ├── src/
│   │   ├── extension.ts     # Entry point
│   │   ├── services/
│   │   │   └── updateChecker.ts  # Auto-update system
│   │   └── commands/        # Command handlers
│   ├── out/                 # Compiled JavaScript (git-ignored)
│   └── package.json         # Main package manifest
├── packages/
│   ├── aetherlight-sdk/     # SDK for app integration
│   ├── aetherlight-analyzer/# Workspace analyzer
│   └── aetherlight-node/    # Native Rust bindings
├── scripts/
│   ├── publish-release.js   # Automated publishing (USE THIS!)
│   └── bump-version.js      # Version sync utility
├── .claude/
│   ├── commands/
│   │   └── publish.md       # /publish command
│   └── settings.local.json  # Local settings
├── CLAUDE.md               # This file - project instructions
└── PUBLISHING.md           # Publishing guide
```

---

## Known Issues & Fixes

### Issue: Extension shows old version after update
**Status:** FIXED in 0.13.21
**Cause:** Update command only updated npm, not VS Code extension directory
**Fix:** Updated `updateChecker.ts` to run full install cycle
**Files:** `vscode-lumina/src/services/updateChecker.ts:228`

### Issue: Version mismatches between packages
**Status:** PREVENTED by automated script
**Prevention:** Always use `scripts/publish-release.js`
**Never:** Manually publish individual packages

### Issue: npm published but GitHub release missing (v0.13.20)
**Status:** FIXED in publish script
**Cause:** GitHub release creation was "optional" and could fail silently
**Impact:** Users got v0.13.19 .vsix even though npm showed 0.13.20
**Why Critical:** CLI installer downloads .vsix from GitHub releases, not npm
**Fix:** Made GitHub release mandatory with verification step
**Files:**
- `scripts/publish-release.js:232-297` - Now requires gh CLI auth and verifies release
- `.claude/skills/publish/SKILL.md` - Updated to document new checks
**Prevention:** Script now:
1. Fails if gh CLI not installed (not optional anymore)
2. Fails if not authenticated to GitHub
3. Verifies the .vsix exists in the release after creation
4. All checks happen BEFORE "Release Complete!" message

### Issue: Sub-packages not published, breaking user installs (v0.13.29)
**Status:** FIXED in publish script
**Time to Fix:** 2 hours
**Severity:** CRITICAL - No users could install or update to v0.13.29
**Cause:** Publish script only published main package (`vscode-lumina`), not sub-packages
**Impact:** Users saw "No matching version found for aetherlight-analyzer@^0.13.29" when trying to install
**Why This Happened:**
- Main package (`aetherlight@0.13.29`) depends on:
  - `aetherlight-analyzer@^0.13.29`
  - `aetherlight-sdk@^0.13.29`
  - `aetherlight-node@^0.13.29`
- Publish script only ran `npm publish` in `vscode-lumina` directory
- Sub-packages stayed at 0.13.28 on npm
- npm couldn't resolve dependencies → install failed
**User Experience:**
- Update notification appeared in Cursor ✅
- User clicked "Install and Reload" ✅
- `npm install -g aetherlight@latest` ran ❌ FAILED
- Extension stayed at 0.13.27 (no update)
- No error shown to user (silent failure)
**Root Cause:** Monorepo with multiple npm packages, but only publishing one
**Fix:** Updated publish script to publish ALL packages in order
**Files:**
- `scripts/publish-release.js:270-322` - Now publishes all 4 packages
- Published in order: analyzer → sdk → node → main (dependencies first)
- Verifies ALL packages after publishing
- Fails loudly if any package verification fails
**Prevention:**
1. Publish sub-packages BEFORE main package (dependency order)
2. Verify each package exists on npm at correct version
3. Don't continue if verification fails
4. Clear error messages if any package is missing

### Issue: Extension fails to activate - Cannot find module @nut-tree-fork/nut-js (v0.13.22-0.13.23)
**Status:** FIXED in v0.13.24
**Time to Fix:** 9 hours
**Severity:** CRITICAL - Extension completely non-functional for all users
**Cause:** Native dependency (@nut-tree-fork/nut-js) added to package.json that doesn't package correctly in VS Code extensions
**Impact:** Extension failed to activate on install, showing error: "Cannot find module '@nut-tree-fork/nut-js'"
**Root Cause Analysis:**
- Native Node.js modules (C++ addons via NAPI) require compilation for each platform
- VS Code extension packaging (via vsce) doesn't handle native dependencies reliably
- The dependency was used for `keyboard.type()` to simulate typing transcribed text
- Native binaries weren't included in .vsix package, causing module load failures
**Fix:** Removed native dependency and replaced with VS Code native APIs
**Files Changed:**
- `vscode-lumina/src/commands/voicePanel.ts:278-300` - Replaced keyboard.type() with VS Code APIs
- `vscode-lumina/package.json:592` - Removed @nut-tree-fork/nut-js from dependencies
**Solution Details:**
```typescript
// BEFORE (v0.13.22-0.13.23): Used native keyboard library
await keyboard.type(char); // Native C++ addon - doesn't package

// AFTER (v0.13.24): Use VS Code APIs
const editor = vscode.window.activeTextEditor;
if (editor) {
    await editor.edit(editBuilder => {
        editBuilder.insert(editor.selection.active, text);
    });
}
```
**Why This Took 9 Hours:**
1. Extension loaded fine in development (Extension Development Host) where node_modules exists
2. Only failed in packaged .vsix where native deps weren't included
3. Required testing full package → install → reload cycle to reproduce
4. Initially tried fixing packaging, but proper solution was removing the dependency
**Prevention Rules (CRITICAL - MUST FOLLOW):**
1. **NEVER add native Node.js dependencies to VS Code extensions**
   - No packages with native bindings (NAPI, node-gyp, C++ addons)
   - Common culprits: robotjs, nut-js, keyboard, mouse libraries, native audio/video
2. **Always use VS Code APIs instead:**
   - Text insertion: `editor.edit()` API
   - Terminal: `terminal.sendText()` API
   - Clipboard: `vscode.env.clipboard` API
3. **Test packaged extension before publishing:**
   ```bash
   cd vscode-lumina
   npm run compile
   vsce package
   code --install-extension aetherlight-0.13.24.vsix
   # Reload VS Code and test ALL commands
   ```
4. **Check for native dependencies before publish:**
   - Review package.json dependencies for native modules
   - Run `npm ls` and look for packages with "bindings", "node-gyp", or "prebuild"
5. **Move native functionality to separate processes if needed:**
   - Use desktop app (Tauri) for native OS features
   - Communicate via IPC, WebSocket, or HTTP
   - Keep VS Code extension pure TypeScript/JavaScript

**Red Flags - Dependencies to Avoid:**
- `@nut-tree-fork/nut-js` ❌ (keyboard/mouse automation)
- `robotjs` ❌ (desktop automation)
- `node-hid` ❌ (USB device access)
- `serialport` ❌ (serial port access)
- `usb` ❌ (USB access)
- `ffi-napi`, `ref-napi` ❌ (native library bindings)
- Any package requiring `node-gyp` to install ❌

**Safe Alternatives:**
- VS Code APIs: `vscode.window`, `vscode.workspace`, `vscode.env` ✅
- Pure JavaScript/TypeScript libraries ✅
- Node.js built-in APIs: `fs`, `path`, `util` ✅
- External processes via child_process (if necessary) ✅
- IPC to desktop app for native features ✅

### Issue: Extension fails to activate - Cannot find module 'glob' (v0.15.31-0.15.32)
**Status:** FIXED in v0.15.33
**Time to Fix:** 2 hours (deep investigation approach)
**Severity:** CRITICAL - Extension completely non-functional for all users
**Cause:** Runtime dependency on npm package `glob` that gets excluded by `--no-dependencies` flag
**Impact:** Extension failed to activate on install, showing error: "Cannot find module 'glob'"

**Timeline:**
1. **v0.13.29** (Oct 30, 2025): Added `--no-dependencies` flag to reduce package size from 246MB to 251KB
2. **v0.15.30**: No runtime npm dependencies → extension worked
3. **v0.15.31**: Added `AgentRegistry.ts` (MID-004) which imports and uses `glob` at runtime
4. **v0.15.31**: Extension activation fails - `glob` excluded by `--no-dependencies`
5. **v0.15.32**: Moved `glob` from devDependencies to dependencies (attempted fix) - **STILL BROKEN**
6. **v0.15.33**: Replaced `glob` with Node.js built-in `fs.readdirSync()` - **FIXED**

**Root Cause Analysis:**
- Package script uses `--no-dependencies` flag to reduce package size
- This flag excludes **ALL node_modules** (even production dependencies) from .vsix
- AgentRegistry.ts line 111 called `await glob(pattern)` to find agent files
- `glob` is npm package, gets excluded from packaged extension
- Moving to dependencies didn't help - `--no-dependencies` excludes it anyway

**Why v0.15.32 Failed (User-Requested Deep Dive):**
User requested: "lets do a deep dive. lets look at what was in the new release and what might have broken it. goal is to identify the issue and fix it not react to the problem and try to fix what is broke without fixing what caused it"

Investigation revealed:
- AgentRegistry.ts **did not exist in v0.15.30** (confirmed via git show)
- It was added in v0.15.31 as part of Phase 0 User Visibility improvements
- Initial fix (moving to dependencies) addressed symptom, not cause
- Root cause: runtime npm dependency incompatible with `--no-dependencies` packaging

**Fix:** Replaced npm `glob` with Node.js built-in APIs
**Files Changed:**
- `vscode-lumina/src/services/AgentRegistry.ts:23` - Removed `import { glob } from 'glob'`
- `vscode-lumina/src/services/AgentRegistry.ts:111-114` - Replaced `glob()` with `fs.readdirSync()` + filter
- `vscode-lumina/package.json:643` - Removed `glob` from dependencies
- `vscode-lumina/package.json:647` - Removed `@types/glob` from devDependencies

**Solution Details:**
```typescript
// BEFORE (v0.15.31-0.15.32): Used npm glob package
import { glob } from 'glob';
const agentFiles = await glob(pattern); // Excluded by --no-dependencies

// AFTER (v0.15.33): Use Node.js built-in fs
const allFiles = fs.readdirSync(this.agentsPath);
const agentFiles = allFiles
  .filter(file => file.endsWith('-agent-context.md'))
  .map(file => path.join(this.agentsPath, file));
```

**Prevention Rules (CRITICAL - MUST FOLLOW):**
1. **NEVER add runtime npm dependencies to VS Code extensions**
   - Package script uses `--no-dependencies` to keep extension small
   - ANY npm package used at runtime will cause activation failures
   - Only built-in Node.js modules (`fs`, `path`, etc.) are available at runtime
2. **Use Node.js built-in APIs instead:**
   - File operations: `fs.readdirSync()`, `fs.readFileSync()` ✅
   - Path operations: `path.join()`, `path.basename()` ✅
   - File globbing: `fs.readdirSync()` + `.filter()` ✅
3. **Pre-publish validation:**
   - Check `vscode-lumina/package.json` dependencies section
   - If ANY production dependencies exist, they MUST be bundled differently or removed
   - Current exception: Sub-packages (`aetherlight-analyzer`, `aetherlight-sdk`, `aetherlight-node`)

**Pattern Reference:** Pattern-PUBLISH-003 (Avoid Runtime npm Dependencies)

**Red Flags - Runtime Dependencies to Avoid:**
- `glob`, `fast-glob` ❌ (use `fs.readdirSync()` + filter)
- `lodash`, `underscore` ❌ (use native JS array methods)
- `moment`, `date-fns` ❌ (use native `Date` or inline utilities)
- `axios`, `got` ❌ (use `node-fetch` from dependencies or `https` built-in)
- `chalk`, `colors` ❌ (use VS Code output channel styling)
- Any pure utility library ❌ (inline the code or use built-ins)

---

## Design Patterns

### Pattern-UPDATE-002: VS Code Extension Update Flow
When updating the extension:
1. `npm install -g aetherlight@latest` downloads package
2. `aetherlight` CLI compiles, packages, and installs .vsix
3. VS Code reload picks up new version from extensions directory

### Pattern-PUBLISH-001: Automated Release Pipeline
All releases go through:
1. Prerequisites check (auth, git state)
2. Build and compile
3. Verify artifacts
4. User confirmation
5. Publish to npm
6. Create git tag and GitHub release

### Pattern-PUBLISH-003: Avoid Runtime npm Dependencies
**Problem:** VS Code extensions packaged with `vsce package --no-dependencies` cannot use npm packages at runtime.

**Why:** The `--no-dependencies` flag excludes ALL node_modules (including production dependencies) from the .vsix package to keep it small.

**Rule:** Use Node.js built-in APIs instead of npm packages for runtime code.

**Examples:**
- ❌ `import { glob } from 'glob'` → ✅ `fs.readdirSync()` + `.filter()`
- ❌ `import _ from 'lodash'` → ✅ Native array methods
- ❌ `import moment from 'moment'` → ✅ Native `Date` or inline utilities
- ❌ `import axios from 'axios'` → ✅ `https` built-in or VS Code APIs

**Allowed Dependencies:**
- Node.js built-in modules: `fs`, `path`, `util`, `crypto`, `https`, etc.
- VS Code APIs: `vscode.workspace`, `vscode.window`, etc.
- Project sub-packages: `aetherlight-analyzer`, `aetherlight-sdk`, `aetherlight-node` (these are handled specially)

**Verification:**
Before publishing, check `vscode-lumina/package.json` dependencies. If you see ANY package besides sub-packages, either:
1. Remove it and use built-in APIs
2. Bundle it with webpack/esbuild (advanced, not currently implemented)
3. Move functionality to desktop app (Tauri)

**Related Incidents:**
- v0.13.23: `@nut-tree-fork/nut-js` (native dependency) - 9 hours to fix
- v0.15.31-0.15.32: `glob` (npm package) - 2 hours to fix

---

## Authentication

**npm Publishing:**
- Requires login as `aelor`
- Check: `npm whoami`
- Login: `npm login`

**GitHub:**
- Uses local git credentials
- GitHub CLI (`gh`) optional but recommended for releases

---

## Pre-Publish Checklist

**CRITICAL: Complete ALL steps before publishing to prevent repeat of 9-hour v0.13.23 bug**

### 1. Code Quality Checks
- [ ] Extension compiles without errors: `cd vscode-lumina && npm run compile`
- [ ] No TypeScript errors in output
- [ ] Version numbers are synced (use `node scripts/bump-version.js`)
- [ ] Git working directory is clean
- [ ] Logged in to npm as `aelor` (check: `npm whoami`)

### 2. Native Dependency Check (CRITICAL)
**This prevents the v0.13.23 bug that took 9 hours to fix**

Run these commands and verify NO native dependencies:
```bash
cd vscode-lumina
npm ls | grep -E "(node-gyp|bindings|prebuild|napi|\.node)"
```

Check package.json for red flag dependencies:
- [ ] NO `@nut-tree-fork/nut-js` or similar keyboard/mouse libraries
- [ ] NO `robotjs`, `node-hid`, `serialport`, `usb`
- [ ] NO `ffi-napi`, `ref-napi`, or native binding libraries
- [ ] NO packages requiring C++ compilation

**If ANY native deps found:** Remove them and use VS Code APIs instead

### 2b. Runtime npm Dependency Check (CRITICAL - Pattern-PUBLISH-003)
**This prevents the v0.15.31-0.15.32 bug that took 2 hours to fix**

Check `vscode-lumina/package.json` dependencies section:
```bash
cat vscode-lumina/package.json | grep -A 10 '"dependencies"'
```

Verify ONLY these dependencies exist:
- [ ] `aetherlight-analyzer` ✅ (sub-package)
- [ ] `aetherlight-sdk` ✅ (sub-package)
- [ ] `aetherlight-node` ✅ (sub-package)
- [ ] `@iarna/toml` ✅ (TOML parser)
- [ ] `form-data` ✅ (HTTP multipart)
- [ ] `node-fetch` ✅ (HTTP client)
- [ ] `ws` ✅ (WebSocket)
- [ ] NO `glob`, `lodash`, `moment`, `axios`, or ANY other utility libraries ❌

**If ANY disallowed deps found:** Remove them and use Node.js built-in APIs instead (see Pattern-PUBLISH-003)

### 3. Package and Test (MANDATORY)
**Test the packaged .vsix BEFORE publishing - v0.13.23 worked in dev but failed when packaged**

```bash
cd vscode-lumina
npm run compile
vsce package
code --install-extension aetherlight-[VERSION].vsix
# Reload VS Code (Ctrl+R in Extension Host)
```

Test ALL critical commands in PACKAGED extension:
- [ ] Extension activates without errors (check Output → ÆtherLight)
- [ ] Voice panel opens (backtick key)
- [ ] Voice recording works
- [ ] Transcription inserts into editor
- [ ] Terminal commands work
- [ ] Sprint loader works (if applicable)

### 4. Publish
Only after ALL checks pass:
```bash
node scripts/publish-release.js [patch|minor|major]
```

The automated script checks most items automatically, but YOU must verify native deps manually.

---

## Questions?

- Read `PUBLISHING.md` for publishing process
- Read `UPDATE_FIX_SUMMARY.md` for update system details
- Check `.claude/commands/` for available slash commands
- Review `vscode-lumina/src/extension.ts` for architecture

---

**Remember:** Use the automated publishing script. Don't repeat the version mismatch bug.
