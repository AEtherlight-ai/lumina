# Sprint Task Lifecycle Skill

**Created:** 2025-01-12
**Purpose:** Automate Sprint TOML task status transitions
**Pattern:** Pattern-TRACKING-001 (Sprint TOML Lifecycle Management)
**Version:** 1.0

---

## Overview

This skill automates the repetitive process of updating task status in `internal/sprints/ACTIVE_SPRINT.toml`. Instead of manually running grep/read/edit/validate commands, use this skill for one-command status updates.

---

## Commands

### `/sprint-task-lifecycle start <TASK-ID>`

**Purpose**: Update task status from "pending" to "in_progress"

**When to Use**: Before starting ANY task implementation (Step 0A)

**What It Does**:
1. Finds `ACTIVE_SPRINT.toml` (always `internal/sprints/ACTIVE_SPRINT.toml`)
2. Searches for `[tasks.<TASK-ID>]` using grep
3. Reads current status field
4. Updates `status = "pending"` → `status = "in_progress"` using Edit tool
5. Validates update using grep
6. Returns confirmation message

**Example**:
```bash
/sprint-task-lifecycle start BUG-002A
```

**Expected Output**:
```
✅ Task BUG-002A status updated to "in_progress"
📍 Location: internal/sprints/ACTIVE_SPRINT.toml:1089
🔄 Sprint Panel UI will refresh automatically
```

---

### `/sprint-task-lifecycle complete <TASK-ID>`

**Purpose**: Update task status from "in_progress" to "completed" + add completion date

**When to Use**: After committing task changes (Step N, final step)

**What It Does**:
1. Finds `ACTIVE_SPRINT.toml`
2. Searches for `[tasks.<TASK-ID>]` using grep
3. Reads current status field
4. Updates `status = "in_progress"` → `status = "completed"` using Edit tool
5. Adds `completed_date = "{YYYY-MM-DD}"` field (current date in ISO format)
6. Validates both fields present using grep
7. Returns confirmation message

**Example**:
```bash
/sprint-task-lifecycle complete BUG-002A
```

**Expected Output**:
```
✅ Task BUG-002A marked as completed
📅 Completion date: 2025-01-12
📍 Location: internal/sprints/ACTIVE_SPRINT.toml:1089
🔓 Dependent tasks are now unblocked
```

---

### `/sprint-task-lifecycle defer <TASK-ID> "<REASON>"`

**Purpose**: Update task status from "in_progress" to "deferred" + add deferral reason

**When to Use**: When task is blocked or needs to be postponed

**What It Does**:
1. Finds `ACTIVE_SPRINT.toml`
2. Searches for `[tasks.<TASK-ID>]` using grep
3. Reads current status field
4. Updates `status = "in_progress"` → `status = "deferred"` using Edit tool
5. Adds `deferred_reason = "{REASON}"` field (user-provided reason)
6. Validates both fields present using grep
7. Returns confirmation message

**Example**:
```bash
/sprint-task-lifecycle defer BUG-002A "Blocked by API changes in BUG-001"
```

**Expected Output**:
```
⏸️ Task BUG-002A deferred
📝 Reason: Blocked by API changes in BUG-001
📍 Location: internal/sprints/ACTIVE_SPRINT.toml:1089
💡 Consider updating task dependencies or notifying team
```

---

## Implementation

### Tool Usage Protocol

**This skill uses the following tools in sequence:**

1. **Grep** - Find task location
   ```bash
   grep -n "^\[tasks.<TASK-ID>\]" internal/sprints/ACTIVE_SPRINT.toml
   ```

2. **Read** - Read current task definition (10-20 lines after task header)
   ```markdown
   Read: internal/sprints/ACTIVE_SPRINT.toml
   offset: <line_number>
   limit: 20
   ```

3. **Edit** - Update status field (+ optional completed_date/deferred_reason)
   ```markdown
   Edit: internal/sprints/ACTIVE_SPRINT.toml
   old_string: status = "pending"
   new_string: status = "in_progress"
   ```

4. **Grep** - Validate update succeeded
   ```bash
   grep -A 2 "^\[tasks.<TASK-ID>\]" internal/sprints/ACTIVE_SPRINT.toml | grep -E "status|completed_date|deferred_reason"
   ```

---

### Error Handling

**Error 1: Task not found**

```
❌ Error: Task {TASK-ID} not found in ACTIVE_SPRINT.toml

Possible causes:
- Task ID typo (check spelling/case)
- Task not yet added to sprint file
- Wrong sprint file active

Suggestion: Run `grep "tasks\." internal/sprints/ACTIVE_SPRINT.toml` to list all tasks
```

**Error 2: File not writable**

```
❌ Error: Cannot write to ACTIVE_SPRINT.toml

Possible causes:
- File locked by another process
- Git conflict in progress
- Permissions issue

Suggestion: Run `git status` to check for conflicts
```

**Error 3: Validation failed**

```
❌ Error: Update validation failed for task {TASK-ID}

Expected: status = "in_progress"
Found: status = "pending"

This indicates Edit tool failed silently. Will retry once.
```

**Error 4: Status transition invalid**

```
❌ Error: Invalid status transition for task {TASK-ID}

Current status: completed
Requested transition: start (pending → in_progress)

Cannot transition from "completed" back to "in_progress".
Task is already finished. Create a new task if rework needed.
```

---

### Fallback: Manual Process

**If this skill is unavailable**, follow the manual process documented in **Pattern-TRACKING-001**:

**Start Task (Manual)**:
```bash
1. grep -n "^\[tasks.{TASK-ID}\]" internal/sprints/ACTIVE_SPRINT.toml
2. Read tool: lines found in step 1 (+ 10-20 lines)
3. Edit tool: status = "pending" → status = "in_progress"
4. Validate: grep -A 1 "^\[tasks.{TASK-ID}\]" ... | grep status
```

**Complete Task (Manual)**:
```bash
1. grep -A 10 "^\[tasks.{TASK-ID}\]" internal/sprints/ACTIVE_SPRINT.toml
2. Edit tool:
   old_string: status = "in_progress"
   new_string: status = "completed"\ncompleted_date = "2025-01-12"
3. Validate: grep -A 2 ... | grep -E "status|completed_date"
```

**Defer Task (Manual)**:
```bash
1. grep -A 10 "^\[tasks.{TASK-ID}\]" internal/sprints/ACTIVE_SPRINT.toml
2. Edit tool:
   old_string: status = "in_progress"
   new_string: status = "deferred"\ndeferred_reason = "{REASON}"
3. Validate: grep -A 3 ... | grep -E "status|deferred_reason"
```

---

## Integration Points

### Enhanced Prompt Templates (v1.3)

**Every enhanced prompt includes breadcrumbs to this skill:**

```markdown
## Context Gathered

### Sprint TOML
- **File**: `internal/sprints/ACTIVE_SPRINT.toml`
- **Task Entry**: Lines {LINE_START}-{LINE_END}
- **Management**: Use `/sprint-task-lifecycle` skill (see Pattern-TRACKING-001)

## Implementation Steps

### Step 0A: Update Sprint Status to "in_progress" (2 min)
```bash
/sprint-task-lifecycle start {TASK-ID}
```

### Step N: Update Sprint Status to "completed" (2 min)
```bash
/sprint-task-lifecycle complete {TASK-ID}
```
```

---

### TodoWrite Integration

**Sprint TOML updates should be explicit TodoWrite items:**

```json
[
  {
    "content": "Update Sprint TOML to 'in_progress' (Step 0A)",
    "activeForm": "Updating Sprint TOML status to in_progress",
    "status": "pending"
  },
  {
    "content": "Implement task changes (Steps 1-N-1)",
    "activeForm": "Implementing task changes",
    "status": "pending"
  },
  {
    "content": "Update Sprint TOML to 'completed' (Step N)",
    "activeForm": "Updating Sprint TOML status to completed",
    "status": "pending"
  }
]
```

**Benefits**:
- ✅ User sees Sprint TOML updates as explicit progress
- ✅ Sprint Panel stays in sync with TodoWrite status
- ✅ Never forget to mark task complete

---

### Agent Context Files

**All 13 agent context files reference this skill:**

```markdown
## Sprint Task Lifecycle Protocol

**Before starting ANY task:**
```bash
/sprint-task-lifecycle start {TASK-ID}
```
Fallback: Follow Pattern-TRACKING-001 manual process

**After completing ANY task:**
```bash
/sprint-task-lifecycle complete {TASK-ID}
```
Fallback: Follow Pattern-TRACKING-001 manual process

**Reference**: Pattern-TRACKING-001 for full protocol
```

---

## Benefits

**1. Time Savings**
- Replaces 4 manual steps with 1 command
- Saves ~2 minutes per status update
- ~4 minutes saved per task (start + complete)

**2. Consistency**
- Same process for every task
- No variation between agents
- Standard output format

**3. Error Prevention**
- Automatic validation built-in
- Clear error messages with suggestions
- Prevents invalid status transitions

**4. User Visibility**
- Confirmation messages show update location
- Sprint Panel UI refreshes automatically
- Real-time progress tracking

**5. Automation Foundation**
- Can extend to auto-update on git events
- Can integrate with CI/CD pipeline
- Future: Auto-calculate actual_time from git timestamps

---

## Validation

**How to know this skill is working:**

✅ **Commands execute successfully**
- No grep failures (task found)
- Edit tool succeeds (status updated)
- Validation confirms update (grep shows new status)

✅ **Sprint Panel UI updates**
- Task status changes visible immediately
- Dependent tasks unblock when complete
- Status badges reflect current state

✅ **TOML file remains valid**
- Pre-commit hook passes (`validate-sprint-schema.js`)
- SprintLoader can parse file
- No syntax errors introduced

✅ **Error handling works**
- Task not found → Clear error message
- File not writable → Actionable suggestion
- Invalid transition → Explanation + reason

---

## Metrics

**Track these to measure skill effectiveness:**

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Skill usage rate | >80% | Count skill uses vs manual updates |
| Success rate | >95% | Count successful updates / total attempts |
| Time per update | <30 seconds | Measure from command to validation |
| Error rate | <5% | Count errors / total attempts |
| User satisfaction | High | Survey: "Skill makes Sprint TOML management easier" |

---

## Future Enhancements

**v1.1** (planned):
- Add `status` subcommand to check current task status without updating
- Add `list` subcommand to show all in_progress tasks
- Add `next` subcommand to find next available task (dependencies clear)

**v1.2** (planned):
- Automatic `actual_time` calculation from git timestamps
- Integration with git hooks (auto-update on commit)
- Bulk operations (start/complete multiple tasks)

**v2.0** (future):
- VS Code command palette integration
- Sprint Panel UI buttons (click to start/complete)
- Real-time collaboration (prevent two agents starting same task)

---

## Related Documentation

- **Pattern-TRACKING-001**: Full Sprint TOML lifecycle protocol
- **Pattern-VALIDATION-001**: Pre-flight checklist (validates TOML format)
- **Template v1.3**: Enhanced prompt structure (references this skill)
- **CLAUDE.md**: Project-level Sprint TOML format enforcement

---

## Usage Examples

### Example 1: Starting BUG-002A

**Command**:
```bash
/sprint-task-lifecycle start BUG-002A
```

**Process** (automated by skill):
1. Grep finds task at line 1089
2. Read lines 1089-1109 (current definition)
3. Edit updates `status = "pending"` → `status = "in_progress"`
4. Validate confirms status changed

**Output**:
```
✅ Task BUG-002A status updated to "in_progress"
📍 Location: internal/sprints/ACTIVE_SPRINT.toml:1089
🔄 Sprint Panel UI will refresh automatically
```

**Sprint Panel**: Shows BUG-002A with "In Progress" badge

---

### Example 2: Completing BUG-002A

**Command**:
```bash
/sprint-task-lifecycle complete BUG-002A
```

**Process** (automated by skill):
1. Grep finds task at line 1089
2. Read lines 1089-1109 (current definition)
3. Edit updates:
   - `status = "in_progress"` → `status = "completed"`
   - Adds `completed_date = "2025-01-12"`
4. Validate confirms both fields present

**Output**:
```
✅ Task BUG-002A marked as completed
📅 Completion date: 2025-01-12
📍 Location: internal/sprints/ACTIVE_SPRINT.toml:1089
🔓 Dependent tasks are now unblocked
```

**Sprint Panel**:
- Shows BUG-002A with "Completed" badge
- BUG-002 (depends on BUG-002A) now shows as available

---

### Example 3: Deferring BUG-003

**Command**:
```bash
/sprint-task-lifecycle defer BUG-003 "Blocked by API changes in BUG-001"
```

**Process** (automated by skill):
1. Grep finds task at line 1150
2. Read lines 1150-1170 (current definition)
3. Edit updates:
   - `status = "in_progress"` → `status = "deferred"`
   - Adds `deferred_reason = "Blocked by API changes in BUG-001"`
4. Validate confirms both fields present

**Output**:
```
⏸️ Task BUG-003 deferred
📝 Reason: Blocked by API changes in BUG-001
📍 Location: internal/sprints/ACTIVE_SPRINT.toml:1150
💡 Consider updating task dependencies or notifying team
```

**Sprint Panel**: Shows BUG-003 with "Deferred" badge + reason tooltip

---

## Skill Status

**Status**: ✅ Documented (Implementation pending)
**Priority**: HIGH (blocks enhanced prompt usage)
**Estimated Implementation**: 1-2 hours
**Dependencies**: None (uses existing tools: Grep, Read, Edit)

**Implementation Checklist**:
- [ ] Create skill implementation file (skill.ts or skill.js)
- [ ] Add command parsing logic (start/complete/defer)
- [ ] Implement grep → read → edit → validate flow
- [ ] Add error handling for all failure modes
- [ ] Test with BUG-002A task (validation)
- [ ] Update all 13 agent context files to reference skill
- [ ] Update Enhanced Prompt Template v1.3 with skill breadcrumbs
- [ ] Document in CHANGELOG.md

---

**This skill eliminates manual Sprint TOML management overhead and ensures consistent task tracking across all agents and tasks.**
