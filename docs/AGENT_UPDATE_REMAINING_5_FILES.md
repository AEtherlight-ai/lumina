# Remaining Agent Context File Updates

**Date**: 2025-01-12
**Status**: 5/10 agent files updated, 5 remaining
**Task**: Add Sprint Task Lifecycle Protocol section to remaining agent files

---

## Completed (5/10)

✅ infrastructure-agent-context.md (v2.3)
✅ api-agent-context.md (v1.2)
✅ commit-agent-context.md (v1.1)
✅ database-agent-context.md (v1.1)
✅ docs-agent-context.md (v1.1)
✅ planning-agent-context.md (v1.1)

---

## Remaining (5/10)

⏸️ review-agent-context.md
⏸️ test-agent-context.md
⏸️ ui-agent-context.md
⏸️ documentation-agent-context.md
⏸️ project-manager-context.md

---

## What to Add

Add this section after "Your Workflow" section (or before final "You are now ready..." statement):

```markdown
---

## Sprint Task Lifecycle Protocol (Pattern-TRACKING-001)

**Added:** 2025-01-12 (v1.1 - Sprint TOML automation)

### Before Starting ANY Task

**Update Sprint TOML status to "in_progress"**:

**Option 1 - Automated (Preferred)**:
```bash
/sprint-task-lifecycle start {TASK-ID}
```

**Option 2 - Manual (if skill unavailable)**:
1. Find task: `grep -n "^\[tasks.{TASK-ID}\]" internal/sprints/ACTIVE_SPRINT.toml`
2. Read task section (use Read tool)
3. Edit: `status = "pending"` → `status = "in_progress"`
4. Validate: `grep -A 1 "^\[tasks.{TASK-ID}\]" ... | grep status`

**Integration with TodoWrite**:
- Add Sprint TOML update as first TodoWrite item (Step 0A)
- Mark in_progress AFTER Sprint TOML updated
- Ensures Sprint Panel UI reflects current work

---

### After Completing ANY Task

**Update Sprint TOML status to "completed"**:

**Option 1 - Automated (Preferred)**:
```bash
/sprint-task-lifecycle complete {TASK-ID}
```

**Option 2 - Manual (if skill unavailable)**:
1. Read task section
2. Edit:
   ```
   old_string: status = "in_progress"
   new_string: status = "completed"
   completed_date = "2025-01-12"
   ```
3. Validate: Check both status and completed_date present

**Integration with TodoWrite**:
- Add Sprint TOML update as final TodoWrite item (Step N)
- Mark completed AFTER Sprint TOML updated
- Ensures Sprint Panel UI reflects task completion

---

### If Blocked/Deferred

**Update Sprint TOML status to "deferred"**:

**Option 1 - Automated (Preferred)**:
```bash
/sprint-task-lifecycle defer {TASK-ID} "Reason for deferral"
```

**Option 2 - Manual (if skill unavailable)**:
1. Edit:
   ```
   old_string: status = "in_progress"
   new_string: status = "deferred"
   deferred_reason = "{REASON}"
   ```
2. Document blocker, notify user, move to next task

---

**Full Protocol**: See Pattern-TRACKING-001 (Sprint TOML Lifecycle Management section)

**Validation**: Pre-commit hook runs `validate-sprint-schema.js` automatically

---
```

---

## Update Instructions

For each remaining file:

1. Open file in editor
2. Find "Your Workflow" section (or similar)
3. Find the `---` separator after the workflow section
4. Add the Sprint Task Lifecycle Protocol section
5. Update VERSION field in header (increment minor version, e.g., 1.0 → 1.1)
6. Save file

---

## Estimated Time

- ~5-10 minutes per file
- ~25-50 minutes total for 5 files

---

## Validation

After updating all files, verify:

```bash
# Count files with Sprint Task Lifecycle Protocol section
cd internal/agents && grep -l "Sprint Task Lifecycle Protocol" *.md | wc -l
# Expected: 11 (all agent files except test-agent-complete backup)

# Verify format consistency
cd internal/agents && grep "Pattern-TRACKING-001" *.md
# Should show all 11 files with consistent pattern reference
```

---

## Why This Update Matters

**Before**: Agents didn't know about Sprint TOML lifecycle management
- No standardized process for updating task status
- Sprint Panel UI out of sync with actual work
- No integration with TodoWrite tracking

**After**: All agents follow consistent protocol
- ✅ Update status to "in_progress" before starting ANY task
- ✅ Update status to "completed" after finishing ANY task
- ✅ Integration with TodoWrite (explicit steps)
- ✅ Sprint Panel UI stays in sync
- ✅ Dependency management works correctly
- ✅ Retrospective data complete (completion dates tracked)

---

## Commit Strategy

**Option 1** - Commit current progress (6 agents done):
```bash
git add internal/agents/infrastructure-agent-context.md
git add internal/agents/api-agent-context.md
git add internal/agents/commit-agent-context.md
git add internal/agents/database-agent-context.md
git add internal/agents/docs-agent-context.md
git add internal/agents/planning-agent-context.md
git commit -m "chore(agents): Add Sprint Task Lifecycle Protocol to 6 agents"
```

**Option 2** - Finish remaining 5 files, then commit all 11:
```bash
# After completing remaining 5 files
git add internal/agents/*.md
git commit -m "chore(agents): Add Sprint Task Lifecycle Protocol to all 11 agents"
```

---

**Status**: Document complete. Ready for manual completion of remaining 5 files.
