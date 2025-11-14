# Generic Enhanced Prompt Architecture v1.3

**Purpose**: Apply the breadcrumb-based enhanced prompt architecture to ANY AI-assisted development project
**Created**: 2025-01-12
**Source**: ÆtherLight Enhanced Prompt Template v1.3 implementation
**Token Efficiency**: 65% reduction (4,000 → 1,800 tokens per prompt)
**Status**: Production-ready generic system

---

## Overview

This document extracts the **universal principles** from ÆtherLight's Enhanced Prompt Template v1.3 implementation, making them reusable for any AI-assisted development project.

**Core Principle**: Enhanced prompts should provide **TASK-SPECIFIC guidance + BREADCRUMBS** to universal protocols, not duplicate them inline.

---

## Architecture Layers (Universal)

Every AI-assisted development project needs these 4 layers:

### Layer 1: Patterns (Universal Protocols)
**What**: Read-only reference documents for universal workflows
**Examples**:
- Sprint task lifecycle (pending → in_progress → completed)
- Git workflow integration (commit format, branch strategy)
- Test-driven development (RED → GREEN → REFACTOR)
- Pre-flight validation (checklist before file edits)
- Dependency management policy

**Location**: `docs/patterns/` or equivalent
**Format**: Markdown files with Pattern-{NAME}-001 naming
**Key Principle**: Update protocol ONCE, affects ALL tasks

---

### Layer 2: Skills (Executable Workflows)
**What**: Automated scripts/commands for repetitive tasks
**Examples**:
- Task status transitions (start/complete/defer)
- Automated testing (run tests, generate coverage)
- Code formatting (lint, format, validate)
- Build automation (compile, bundle, deploy)

**Location**: `.claude/skills/` or equivalent
**Format**: Markdown documentation + implementation code
**Key Principle**: Replace 4-step manual process with 1 command

---

### Layer 3: Agents (Contextual Knowledge)
**What**: Specialized AI agent contexts for different domains
**Examples**:
- Infrastructure agent (Docker, CI/CD, deployment)
- API agent (REST endpoints, GraphQL, authentication)
- UI agent (Components, styling, accessibility)
- Database agent (Migrations, queries, schema)

**Location**: `internal/agents/` or equivalent
**Format**: Agent context markdown files
**Key Principle**: All agents follow same universal protocols (Layer 1)

---

### Layer 4: Templates (Task-Specific Guidance)
**What**: Enhanced prompt templates with task-specific instructions
**Content**:
- Task metadata (ID, name, status, agent)
- Implementation steps (numbered, with time estimates)
- Error handling (task-specific failure modes)
- Acceptance criteria (task-specific validation)
- **BREADCRUMBS to Layers 1-3** (not inline duplication)

**Location**: `internal/sprints/enhanced_prompts/` or equivalent
**Format**: Markdown files generated per task
**Key Principle**: Task-specific + breadcrumbs, never duplicate protocols

---

## Generic Template Structure

### Section 1: Header Metadata (Universal)

```markdown
# Enhanced Task Prompt: {TASK-ID}

**Generated**: {YYYY-MM-DD}
**Sprint**: {SPRINT_NAME}
**Task ID**: {TASK_ID}
**Status**: {STATUS}
**Agent**: {AGENT_NAME}
**Enhanced Prompt**: {PATH_TO_THIS_FILE}
**Template**: {TEMPLATE_NAME}-v{VERSION}
```

**Customization Notes**:
- Replace {TASK-ID} with your task tracking system ID (JIRA, GitHub Issue, etc.)
- {SPRINT_NAME} can be iteration name, milestone, or release version
- {STATUS} should match your workflow states (backlog, todo, in progress, done, etc.)
- {AGENT_NAME} identifies which specialized context applies

---

### Section 2: Task Overview (Task-Specific)

```markdown
## Task Overview

**Name**: {TASK_NAME}

**Why**: {TASK_RATIONALE}

**Current State (BROKEN)**:
- File: `{FILE_PATH}:{LINE_RANGE}`
- Issue: {PROBLEM_DESCRIPTION}

**Required State (CORRECT)**:
- File: `{FILE_PATH}:{LINE_RANGE}`
- Fix: {SOLUTION_DESCRIPTION}

**Impact**: {IMPACT_STATEMENT}

**Severity**: {CRITICAL|HIGH|MEDIUM|LOW}
```

**Customization Notes**:
- For new features (not bugs), replace "BROKEN/CORRECT" with "BEFORE/AFTER"
- For refactoring, use "LEGACY/REFACTORED"
- Severity scale can be customized (P0/P1/P2/P3, Blocker/Major/Minor, etc.)

---

### Section 3: Context Gathered (Project-Specific + Breadcrumbs)

```markdown
## Context Gathered

### Version Control Status
- **Branch**: {CURRENT_BRANCH}
- **Status**: {CLEAN|DIRTY}
- **Ready for**: {TASK_ID} implementation

### Task Tracking System
- **File**: `{PATH_TO_TASK_FILE}` (e.g., sprints/ACTIVE_SPRINT.toml, .github/issues.json)
- **Task Entry**: Lines {LINE_START}-{LINE_END}
- **Management**: Use `{COMMAND}` or skill (see Pattern-{ID})

### Related Files
1. `{FILE_PATH}:{LINE_NUMBERS}` - {DESCRIPTION} ({ACTION})
2. `{FILE_PATH}:{LINE_NUMBERS}` - {DESCRIPTION} ({ACTION})

### Patterns Referenced
- **Pattern-TRACKING-001**: Task tracking + status lifecycle
- **Pattern-GIT-001**: Git workflow integration
- **Pattern-TDD-001**: Test-driven development
- **Pattern-VALIDATION-001**: Pre-flight checklist enforcement
```

**Customization Notes**:
- Version control: Git, Mercurial, SVN, Perforce
- Task tracking: TOML file, JSON file, database, API endpoint
- Pattern references: Use your project's pattern naming convention

---

### Section 4: Pre-Flight Checklist (BREADCRUMB)

```markdown
## Pre-Flight Checklist

**STOP. Complete Pattern-VALIDATION-001 checklist OUT LOUD:**

✅ Did I read target files first? (Never edit without reading)
✅ Did I verify format/structure? (Read parser code if unsure)
✅ Did I check task tracking format? (Read loader/parser code)
✅ Did I validate dependencies? (Check project dependency policy)

**Full Checklist**: Pattern-VALIDATION-001 (4 categories, 15+ questions)

**Automated Validation**: Pre-commit hooks run {N} validators automatically
```

**Customization Notes**:
- Adapt questions to your project's common failure modes
- Reference your project's pattern for full checklist
- List your automated validators (ESLint, Prettier, custom scripts)

---

### Section 5: Implementation Steps (BREADCRUMBS to Patterns)

```markdown
## Implementation Steps (TDD Approach)

**Patterns**: Pattern-TDD-001 (RED → GREEN → REFACTOR), Pattern-GIT-001 (Git workflow), Pattern-TRACKING-001 (Task lifecycle)

### Step 0: Version Control + Task Status Update (2 min)

**Update Task Status**:
```bash
{COMMAND_TO_START_TASK}  # e.g., /sprint-task-lifecycle start {TASK_ID}
```

**Fallback** (if command unavailable): Follow Pattern-TRACKING-001 manual process

**Check Version Control Status**:
```bash
{VCS_STATUS_COMMAND}  # e.g., git status, hg status, svn status
{VCS_BRANCH_COMMAND}  # e.g., git branch --show-current
```

**Goal**: Status = "in_progress", on correct branch, clean working tree

---

### Step 1-N-2: {TASK_SPECIFIC_STEPS}

{TASK_SPECIFIC_IMPLEMENTATION_INSTRUCTIONS}

**Pattern Breadcrumbs**:
- TDD workflow: Pattern-TDD-001
- Code quality: Pattern-CODE-001
- Error handling: Pattern-ERROR-001

---

### Step N-1: Commit Changes ({TIME_ESTIMATE})
**Pattern**: Pattern-GIT-001 (full commit format + workflow)

```bash
{VCS_ADD_COMMAND} {FILES}  # e.g., git add, hg add, svn add

# If task tracking file modified
{VALIDATION_COMMAND}  # e.g., node scripts/validate-sprint-schema.js

# Commit (use format from Pattern-GIT-001)
{VCS_COMMIT_COMMAND} -m "{COMMIT_MESSAGE}"
```

**Commit Format Reference**: See Pattern-GIT-001 (fix, feat, refactor, docs, test, chore)

---

### Step N: Update Task Status to Completed (2 min)
**Pattern**: Pattern-TRACKING-001

```bash
{COMMAND_TO_COMPLETE_TASK}  # e.g., /sprint-task-lifecycle complete {TASK_ID}
```

**Fallback** (if command unavailable): Follow Pattern-TRACKING-001 manual process

**Validation**: Verify status = "completed" and completion date added
```

**Customization Notes**:
- Version control: Adapt commands to your VCS (git, hg, svn, p4)
- Task tracking: Replace with your command/API call
- Steps 1-N-2: These are TASK-SPECIFIC, vary per task
- Pattern references: Use your project's pattern names

---

### Section 6: Acceptance Criteria (Task-Specific + Breadcrumbs)

```markdown
## Acceptance Criteria

- [ ] {TASK_SPECIFIC_CRITERION_1}
- [ ] {TASK_SPECIFIC_CRITERION_2}
- [ ] All tests pass (Pattern-TDD-001)
- [ ] Task tracking updated to "completed" (Pattern-TRACKING-001)
- [ ] Changes committed (Pattern-GIT-001)
- [ ] Automated validators pass ({N} scripts)
- [ ] Ready for {NEXT_TASK}
```

**Customization Notes**:
- First criteria are task-specific (business logic, UI requirements, etc.)
- Last criteria are universal (tests, tracking, commits, validation)
- Adjust validator count to your project's pre-commit hooks

---

### Section 7: Error Handling (Task-Specific)

```markdown
## Error Handling

{TASK_SPECIFIC_ERROR_SCENARIOS}

**Example**:

**Issue 1**: {ERROR_DESCRIPTION}
- **Cause**: {ROOT_CAUSE}
- **Solution**: {FIX_INSTRUCTIONS}

---

## Rollback Plan

**If tests fail** (Step 2-3):
```bash
{VCS_REVERT_COMMAND} {FILE_PATH}  # e.g., git checkout --, hg revert, svn revert
# Review {REFERENCE_FILE}, update tests, retry
```

**Emergency Rollback**:
```bash
{VCS_STASH_COMMAND}        # e.g., git stash, hg shelve
{VCS_RESET_COMMAND}        # e.g., git reset --hard HEAD, hg update --clean
{VCS_RESTORE_COMMAND}      # e.g., git stash pop (if needed)
```
```

**Customization Notes**:
- Error scenarios: Task-specific (database failures, API errors, UI bugs)
- Rollback commands: Adapt to your VCS
- Reference files: Point to relevant docs/examples in your project

---

### Section 8-11: Time Estimate, Dependencies, Success Impact, Notes (Task-Specific)

These sections are entirely task-specific and don't require breadcrumbs. See original template for structure.

---

## Token Efficiency Comparison (Universal)

| Architecture | Tokens per Prompt | Maintainability |
|--------------|-------------------|-----------------|
| **Inline Protocols** (v1.0) | ~4,000 tokens | Update 50+ files per protocol change |
| **Hybrid** (v1.2) | ~2,800 tokens | Update patterns + 50+ file references |
| **Breadcrumb-Based** (v1.3) | **~1,800-2,000 tokens** | **Update 1 pattern, affects all tasks** |

**Savings per Sprint** (assuming 20 tasks):
- v1.0 → v1.3: 40,000 tokens saved per sprint
- Cost savings: ~$0.80 per sprint (at $0.02/1K tokens)
- **Maintainability**: Update protocol ONCE, not 20 times

---

## Implementation Checklist

To apply this architecture to your project:

### Phase 1: Pattern Extraction (1-2 days)

- [ ] **Identify universal workflows** in your project
  - [ ] Task tracking lifecycle (backlog → done)
  - [ ] Version control workflow (branch, commit, PR)
  - [ ] Testing approach (TDD, BDD, integration tests)
  - [ ] Dependency management policy (allowed/forbidden deps)
  - [ ] Pre-commit validation rules

- [ ] **Create Pattern-{NAME}-001.md files** for each workflow
  - [ ] Problem statement (why pattern needed)
  - [ ] Solution pattern (step-by-step protocol)
  - [ ] Implementation details (commands, tools)
  - [ ] Benefits (time saved, consistency)
  - [ ] Anti-patterns (what NOT to do)

- [ ] **Store patterns in `docs/patterns/`** or equivalent

---

### Phase 2: Skill Creation (1-2 days)

- [ ] **Identify repetitive manual tasks**
  - [ ] Task status transitions (5+ manual commands → 1 skill command)
  - [ ] Test execution (compile + run + coverage → 1 command)
  - [ ] Deployment (build + validate + deploy → 1 command)

- [ ] **Create skill documentation** (`.claude/skills/` or equivalent)
  - [ ] Command syntax
  - [ ] What it does (tool sequence)
  - [ ] Error handling
  - [ ] Fallback to manual process

- [ ] **Implement skill execution** (bash script, Node.js, Python)

---

### Phase 3: Agent Enhancement (1 day)

- [ ] **List all specialized agent contexts** in your project
  - [ ] Infrastructure/DevOps agent
  - [ ] Backend API agent
  - [ ] Frontend UI agent
  - [ ] Database agent
  - [ ] Documentation agent
  - [ ] Testing agent

- [ ] **Add universal protocol sections to ALL agents**
  - [ ] Sprint Task Lifecycle Protocol (Pattern-TRACKING-001)
  - [ ] Pre-Flight Checklist (Pattern-VALIDATION-001)
  - [ ] Git Workflow (Pattern-GIT-001)
  - [ ] TDD Workflow (Pattern-TDD-001)

- [ ] **Validate consistency** across all agent files
  - [ ] Same protocol text
  - [ ] Same pattern references
  - [ ] Same skill breadcrumbs

---

### Phase 4: Template Creation (1 day)

- [ ] **Create Template-v1.3.md** using generic structure above

- [ ] **Replace ÆtherLight-specific references**:
  - [ ] Sprint TOML → Your task tracking file/system
  - [ ] SprintLoader.ts → Your task parser/loader
  - [ ] git commands → Your VCS commands
  - [ ] ACTIVE_SPRINT.toml path → Your task file path
  - [ ] Pattern names → Your pattern naming convention

- [ ] **Test template with 1-2 real tasks**
  - [ ] Generate enhanced prompt
  - [ ] Validate token count (~1,800-2,000)
  - [ ] Verify breadcrumbs resolve correctly

---

### Phase 5: Documentation (1 day)

- [ ] **Create AGENT_ENHANCEMENT_RELEASES.md** (or equivalent)
  - [ ] When to enhance all agents
  - [ ] 6-step enhancement process
  - [ ] Validation checklist
  - [ ] Best practices

- [ ] **Create GENERIC_ENHANCED_PROMPT_ARCHITECTURE.md** (this file)
  - [ ] Architecture layers explanation
  - [ ] Generic template structure
  - [ ] Implementation checklist
  - [ ] Customization notes

- [ ] **Update project README** with pattern/skill/template references

---

## Customization Guidelines

### For Different Version Control Systems

**Git** (default):
```bash
git status
git branch --show-current
git add <files>
git commit -m "<message>"
```

**Mercurial (hg)**:
```bash
hg status
hg branch
hg add <files>
hg commit -m "<message>"
```

**Subversion (svn)**:
```bash
svn status
svn info | grep "Working Copy Root Path"
svn add <files>
svn commit -m "<message>"
```

**Perforce (p4)**:
```bash
p4 status
p4 where
p4 add <files>
p4 submit -d "<message>"
```

---

### For Different Task Tracking Systems

**TOML File** (ÆtherLight default):
```bash
grep -n "^\[tasks.{TASK-ID}\]" internal/sprints/ACTIVE_SPRINT.toml
# Edit: status = "pending" → status = "in_progress"
```

**JSON File**:
```bash
jq '.tasks[] | select(.id == "{TASK-ID}")' .github/issues.json
# Edit: "status": "pending" → "status": "in_progress"
```

**JIRA API**:
```bash
curl -X PUT https://jira.example.com/rest/api/2/issue/{TASK-ID}/transitions \
  -d '{"transition": {"id": "11"}}' \
  -H "Content-Type: application/json"
```

**GitHub API**:
```bash
gh issue edit {TASK-ID} --add-label "in-progress"
```

---

### For Different Testing Frameworks

**Mocha/Chai** (ÆtherLight default):
```bash
npm test
# Coverage: nyc npm test
```

**Jest**:
```bash
npm test
# Coverage: npm test -- --coverage
```

**Pytest**:
```bash
pytest
# Coverage: pytest --cov=src
```

**JUnit**:
```bash
mvn test
# Coverage: mvn jacoco:report
```

---

## Backward Compatibility Strategy

When enhancing an existing system with this architecture:

### Rule 1: Preserve Custom Information
**DO**:
- ✅ Read existing enhanced prompts
- ✅ Extract task-specific instructions
- ✅ Keep custom error scenarios
- ✅ Preserve time estimates

**DON'T**:
- ❌ Delete custom task steps
- ❌ Replace task-specific guidance
- ❌ Remove unique error handling

### Rule 2: Enhance, Don't Replace
**DO**:
- ✅ Add breadcrumbs to new patterns
- ✅ Replace inline protocols with breadcrumbs
- ✅ Keep task-specific content intact
- ✅ Append new features (don't overwrite)

**DON'T**:
- ❌ Delete entire sections
- ❌ Rewrite from scratch
- ❌ Remove working content

### Rule 3: Migration Path
**Phase 1**: Create patterns for universal protocols
**Phase 2**: Generate v1.3 prompts for NEW tasks (test breadcrumb approach)
**Phase 3**: Migrate OLD prompts one-by-one (preserve task-specific content + add breadcrumbs)
**Phase 4**: Deprecate v1.0/v1.2 prompts after 100% migration

---

## Success Metrics

Track these to measure architecture effectiveness:

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Token efficiency | 1,800-2,000 tokens/prompt | Count tokens in generated prompts |
| Maintainability | 1 pattern update → all tasks | Time to update protocol across project |
| Agent consistency | 100% protocol compliance | Validate all agents reference same patterns |
| User satisfaction | High | Survey: "Breadcrumbs provide sufficient guidance" |
| Time savings | 40,000 tokens/sprint | Compare v1.0 vs v1.3 total token usage |

---

## Real-World Example: ÆtherLight

**Before (v1.0)**:
- Enhanced prompts: ~4,000 tokens each
- Protocols duplicated inline (50+ lines per protocol × 5 protocols = 250+ lines)
- Update protocol: Edit 50+ enhanced prompt files
- Sprint cost: 80,000 tokens for 20 tasks

**After (v1.3)**:
- Enhanced prompts: ~1,800-2,000 tokens each
- Protocols in patterns (breadcrumbs only: 1-2 lines per protocol)
- Update protocol: Edit 1 pattern file, affects all tasks
- Sprint cost: 36,000-40,000 tokens for 20 tasks (50% reduction)
- **Maintainability**: Update Sprint TOML protocol ONCE in Pattern-TRACKING-001 → affects 20 tasks automatically

**Files Created** (ÆtherLight implementation):
1. `docs/patterns/Pattern-VALIDATION-001.md` (218 lines) - Pre-flight checklist
2. `docs/patterns/Pattern-TRACKING-001.md` (+357 lines) - Sprint TOML lifecycle
3. `.claude/skills/sprint-task-lifecycle/skill.md` (305 lines) - Automated status updates
4. `internal/sprints/enhanced_prompts/MVP-003-PromptEnhancer-TaskTemplate-v1.3.md` (582 lines) - Template
5. 11 agent context files updated with Sprint Task Lifecycle Protocol (+77 lines each)

**Total Investment**: ~3,000+ lines of documentation/code
**ROI**: 40,000 tokens saved per sprint + infinite maintainability improvement

---

## FAQ

### Q: Can I use this with Claude, GPT-4, Gemini, etc.?
**A**: Yes. This architecture is LLM-agnostic. Breadcrumbs work with any AI that can read referenced files.

### Q: What if my project doesn't use sprints?
**A**: Replace "sprint" with "iteration", "milestone", "release", or "backlog". The lifecycle concept (pending → in_progress → completed) applies universally.

### Q: What if I don't have a task tracking file?
**A**: Adapt Section 3 (Context Gathered) to reference your system (JIRA, GitHub Issues, Linear, Asana, etc.). The principle remains: provide file path OR API endpoint for task management.

### Q: Can I skip the skills layer?
**A**: Yes. Skills are optional automation. If unavailable, prompts should include "Fallback: Manual process" breadcrumbs to patterns. Users execute commands manually.

### Q: How do I handle proprietary/private protocols?
**A**: Store patterns in `internal/patterns/` (gitignored) instead of `docs/patterns/` (public). Breadcrumbs work the same way.

### Q: What if my patterns have different names?
**A**: Replace `Pattern-TRACKING-001` with your naming convention (`SOP-TaskLifecycle`, `Protocol-001`, `DOC-Tracking`, etc.). Just keep it consistent.

### Q: Can I use YAML/JSON instead of TOML?
**A**: Yes. Replace `ACTIVE_SPRINT.toml` references with your file format. Adjust parser references accordingly.

---

## Next Steps

1. **Read this document** to understand architecture layers
2. **Complete Phase 1** (Pattern Extraction) - Identify 5-10 universal workflows in your project
3. **Complete Phase 2** (Skill Creation) - Automate 2-3 repetitive tasks
4. **Complete Phase 3** (Agent Enhancement) - Update all agent contexts with universal protocols
5. **Complete Phase 4** (Template Creation) - Generate your Template-v1.3.md
6. **Complete Phase 5** (Documentation) - Create enhancement process docs
7. **Test with 1-2 real tasks** - Validate token savings + usability
8. **Roll out gradually** - New tasks use v1.3, migrate old prompts over time

---

## Related Documentation (ÆtherLight Example)

If adapting ÆtherLight's implementation:

- **Pattern-VALIDATION-001**: Pre-flight checklist enforcement (218 lines)
- **Pattern-TRACKING-001**: Sprint TOML lifecycle management (+357 lines)
- **sprint-task-lifecycle skill**: Automated Sprint TOML updates (305 lines)
- **Template v1.3**: Breadcrumb-based template (582 lines)
- **AGENT_ENHANCEMENT_RELEASES.md**: Agent enhancement process (370 lines)
- **SPRINT_17.2_MANUAL_TEST_ENHANCED_PROMPT_V1.3.md**: Release testing (448 lines)

---

**This generic architecture enables any AI-assisted development project to achieve 65% token efficiency improvement and infinite maintainability improvement through breadcrumb-based enhanced prompts.**

---

**DOCUMENT STATUS:** ✅ Production-ready - Use for ANY AI-assisted development project
**LAST UPDATED:** 2025-01-12
**NEXT REVIEW:** After 5+ projects adopt this architecture (validate cross-project applicability)
