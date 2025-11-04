# Sprint Refactoring Summary - v0.16.0

## Status: PROTO-001 Complete in ACTIVE_SPRINT.toml
**First task fully written with ALL required fields as template**

## Remaining 24 Tasks Structure

### SECTION A: Communication Protocol (5 more tasks)

**PROTO-002: Update CLAUDE.md with Communication Protocol** (2-3 hours)
- Add Code Development Protocol section
- Add Sprint Planning Protocol section
- Add Testing Protocol section
- Add Documentation Protocol section
- Add Git Workflow Integration section
- Add Gap Detection section
- Communication templates for each workflow type
- Edge case guidelines

**PROTO-003: Create Pattern-COMM-001 Document** (2 hours)
- Write docs/patterns/Pattern-COMM-001-Universal-Communication.md
- Document workflow check template format
- Examples for each workflow type
- Integration with existing patterns
- Chain of thought documentation

**PROTO-004: Git Workflow Integration** (3-4 hours)
- Enhance WorkflowCheck with Git status checking
- Show uncommitted files, branch status, merge conflicts
- Detect if on master/main vs feature branch
- Check for unpushed commits
- Integration with ContextGatherer.ts

**PROTO-005: Gap Detection & Self-Improvement** (4-5 hours)
- When Claude detects missing pattern/skill/agent
- Propose creation with time estimate
- Show options: Create now, Workaround, Defer
- Ask user approval with AskUserQuestion
- Track gaps in middleware logger

**PROTO-006: Documentation Philosophy Enforcement** (2-3 hours)
- Rule: Don't create ephemeral markdown summaries
- Only create patterns for reusable knowledge
- Reusability assessment logic
- In-moment explanations in chat only
- Update CLAUDE.md with documentation rules

---

### SECTION B: UI Critical Fixes (4 tasks)

**UI-FIX-001: Enable Sprint Progress Panel** (30 min)
- Uncomment line 42 in extension.ts
- Uncomment line 659 in extension.ts
- Remove misleading comment about NAPI bindings
- Test panel appears in Explorer

**UI-FIX-002: Enable Agent Coordination View** (30 min)
- Uncomment line 43 in extension.ts
- Uncomment line 717 in extension.ts
- Remove misleading comment
- Test Gantt chart displays

**UI-FIX-003: Fix Settings Tab Save Handler** (1 hour)
- Add 'saveGlobalSettings' message handler to voicePanel.ts
- Wire to context.workspaceState.update()
- Attach event listeners to Save/Reset buttons
- Test settings persist across reloads

**UI-FIX-004: Fix Test Compilation** (1 hour)
- Replace glob import with fs.readdirSync() in test/suite/index.ts
- Ensure npm run compile succeeds with 0 errors
- Update tests to use Node.js built-in APIs
- Run tests to verify they pass

---

### SECTION C: UI Architecture Redesign (7 tasks)

**UI-ARCH-001: Remove Voice Tab** (1 hour)
- Voice section always visible (no tab)
- Remove from tab list rendering
- Update CSS for permanent voice section
- Test: Voice always at top

**UI-ARCH-002: Deprecate Unused Tabs** (30 min)
- Comment out Sprint Planner, Patterns, Team tabs
- Keep only Default and Settings tabs
- Add TODO comments for future
- Preserve code for later re-enablement

**UI-ARCH-003: Reorganize Layout** (1-1.5 hours)
- Remove "Command / Transcription:" label
- Move toolbar ABOVE textarea
- Order: Terminal list → Toolbar → Textarea → Tabs → Bug toolbar
- Update CSS for proper spacing

**UI-ARCH-004: Add Workflow Toolbar** (4-5 hours) 🆕
- Add collapsible workflow toolbar between textarea and tabs
- 8 workflow buttons: Sprint, Analyzer, Pattern, Skill, Agent, Tests, Git, Publish
- Collapsible/expandable with ▼/▶ toggle
- Save state in workspace
- Tooltips for each button
- Proper styling and spacing

**UI-ARCH-005: Progressive Disclosure** (2-3 hours) 🆕
- Toolbar starts collapsed
- Context-aware highlighting (tests failing → highlight 🧪)
- Badge counts (e.g., "3 failing tests")
- Keyboard shortcuts (Ctrl+Shift+[1-8])
- Remember expanded/collapsed state

**UI-ARCH-006: Wire Workflow Buttons to Protocol** (5-6 hours) 🆕
- Add message handlers for all 8 buttons
- Each calls WorkflowCheck.checkWorkflow()
- Display workflow check in WorkflowCheckPanel modal
- Show: prerequisites, confidence, gaps, plan
- Approval buttons: [Proceed] [Cancel] [Help]
- Progress feedback during execution
- Success/error notifications

**UI-ARCH-007: Multi-row Terminal List** (1-2 hours)
- Flex-wrap layout (5-6 terminals per row)
- Auto-wrap to second row
- Update CSS for proper spacing
- Test with 10+ terminals

---

## Total Phase 0: 25 Tasks

**Time Estimates:**
- Communication Protocol: 18-22 hours (6 tasks)
- UI Critical Fixes: 3-4 hours (4 tasks)
- UI Architecture: 15-20 hours (7 tasks)
- Middleware (existing pending): 30-35 hours (8 tasks from MID-013 to MID-016 + others)
- **TOTAL: 75-90 hours**

**Timeline:** 5-6 weeks at 15-18 hours/week

---

## Fields Required for Each Task

Following PROTO-001 template, every task needs:

### Required Fields:
- `id`, `name`, `phase`, `assigned_engineer`, `status`
- `description` (multi-line string with context)
- `estimated_lines`, `estimated_time`
- `dependencies` (array of task IDs)
- `agent` (which agent handles this)

### Deliverables Section:
- `deliverables` (array of specific outputs)
- `performance_target` (measurable target)
- `patterns` (array of pattern references)
- `pattern_context` (multi-line explanation)

### Validation Section:
- `files_to_modify` (array of file paths)
- `validation_criteria` (array of acceptance tests)

### Context Section:
- `why` (business justification, multi-line)
- `context` (current state + proposed solution, multi-line)
- `reasoning_chain` (array of step-by-step logic)
- `success_impact` (multi-line, what user gets)
- `error_handling` (array of error scenarios)

### TDD Section (for infrastructure/code tasks):
- `test_requirements` (multi-line TDD workflow)
- `test_files` (array of test file paths)
- `test_coverage_requirement` (0.8-0.9 for infra, 0.7 for UI)

---

## Next Steps

**Option 1:** I continue writing all 24 tasks in full detail (will be ~10,000 lines of TOML)

**Option 2:** You review PROTO-001 structure and approve, then I batch-write remaining tasks

**Option 3:** You want modifications to the structure before I continue

**Your decision?**
