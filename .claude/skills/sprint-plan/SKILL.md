---
name: sprint-plan
description: Create structured sprint plans with automated Git workflow. Generates TOML sprints, creates feature branches, and enforces proper development workflow.
---

# Sprint Planning Skill

## What This Skill Does

Automates sprint planning with Git workflow enforcement:
- Analyzes user requirements and generates sprint structure
- Creates TOML sprint definitions with phases and tasks
- Automatically creates Git branches for features/epics
- Enforces proper branch naming and workflow
- Integrates user context with standardized processes

## When Claude Should Use This

Use this skill when the user:
- Says "plan a sprint" or "create a sprint"
- Wants to organize development work
- Needs to break down features into tasks
- Mentions sprint planning or agile development

## Workflow Process

### 1. Gather Requirements
```
Ask the user:
1. Sprint duration? (1 week, 2 weeks, etc.)
2. Main features/goals?
3. Team size and roles?
4. Priority order?
```

### 2. Analyze and Structure
The skill will:
- Parse user requirements
- Identify epics and features
- Break down into phases
- Create task dependencies
- Assign complexity estimates
- **CRITICAL: Add error handling requirements for EVERY task**
  - Identify potential failure points
  - Require try-catch for all parsing/IO operations
  - Add validation criteria for error boundaries
  - Include error recovery strategies

### 3. Git Workflow Setup

#### For Each Epic/Feature:
```bash
# Create feature branch from master
git checkout master
git pull origin master
git checkout -b feature/[epic-name]

# Create sub-branches for phases
git checkout -b feature/[epic-name]/phase-1
```

#### Branch Naming Convention:
- `feature/[epic-name]` - Main feature branch
- `feature/[epic-name]/phase-[n]` - Phase branches
- `fix/[issue-name]` - Bug fix branches
- `refactor/[component-name]` - Refactoring branches

### 4. Generate Sprint Files

**CRITICAL: Sprint File Naming Convention**

Sprint files MUST follow this pattern to appear in the Sprint dropdown:

**Format:** `ACTIVE_SPRINT_[DESCRIPTOR].toml`

**Examples:**
- `ACTIVE_SPRINT_v0.15.4_UI_REFACTOR.toml` ✓ (version-based)
- `ACTIVE_SPRINT_2025-10-31.toml` ✓ (date-based)
- `ACTIVE_SPRINT_PHASE_1.toml` ✓ (phase-based)
- `ACTIVE_SPRINT_AUTH_FEATURE.toml` ✓ (feature-based)
- `ACTIVE_SPRINT.toml` ✓ (legacy format, still works)
- `sprint.toml` ✗ (won't appear in dropdown)

**Why:** The `ACTIVE_SPRINT` prefix is the identifier that makes it discoverable.
The descriptor after the underscore helps users identify which sprint is which.

**Location:** Place in `internal/sprints/` (ÆtherLight dev) or `sprints/` (user projects)

Create `sprints/ACTIVE_SPRINT_[DESCRIPTOR].toml`:
```toml
[meta]
sprint_name = "Sprint [Number]"
version = "[version]"
created = "YYYY-MM-DD"
status = "active"

[epic.authentication]
branch = "feature/authentication"
status = "in_progress"

[[epic.authentication.tasks]]
id = "AUTH-001"
title = "Implement JWT tokens"
assignee = "engineer-1"
phase = 1
branch = "feature/authentication/phase-1"
error_handling = """
- Wrap JWT parsing in try-catch
- Handle expired token errors gracefully
- Validate token format before parsing
- Return clear error messages to user
"""
validation_criteria = [
    "All token operations have error boundaries",
    "Invalid tokens don't crash the app",
    "Clear error messages for auth failures"
]
```

### 5. Enforce Workflow Rules

#### Development Flow:
1. **Work in feature branch** (never in master)
2. **Commit frequently** with semantic messages
3. **Create PR** when phase complete
4. **Review required** before merge
5. **Merge to master** only after approval
6. **Tag releases** after sprint completion

### 6. Integration with User Context

The skill combines:
- **User Intent**: What they describe wanting
- **Codebase Analysis**: Current state and patterns
- **Best Practices**: Enforced workflows
- **Team Context**: Roles and capabilities

## Command Execution

```bash
# 1. Initialize sprint structure
mkdir -p sprints
cd sprints

# 2. Create sprint file
cat > SPRINT_$(date +%Y%m%d).toml << 'EOF'
[Generated TOML content]
EOF

# 3. Create Git branches
git checkout -b feature/[epic-name]
git push -u origin feature/[epic-name]

# 4. Create phase branches
for phase in 1 2 3; do
  git checkout -b feature/[epic-name]/phase-$phase
  git push -u origin feature/[epic-name]/phase-$phase
done

# 5. Switch back to first phase
git checkout feature/[epic-name]/phase-1
```

## Sprint Lifecycle

### Phase 1: Planning (This Skill)
- Requirements gathering
- Sprint file generation
- Branch creation
- Task assignment

### Phase 2: Development
- Work in phase branches
- Regular commits
- Progress tracking

### Phase 3: Review
- PR creation
- Code review
- Testing

### Phase 4: Merge
- Merge to feature branch
- Integration testing
- Merge to master

### Phase 5: Release
- Use `/publish` skill
- Tag release
- Deploy

## Protection Rules

### What Can Be Modified:
- **New files** in feature branches
- **New functions** in existing files
- **Tests** for new features
- **Documentation** updates

### What Cannot Be Modified (in master):
- **Existing function signatures**
- **Core algorithms**
- **API contracts**
- **Database schemas**

### Refactoring Rules:
- Must create `refactor/[name]` branch
- Must maintain existing interfaces
- Must pass all existing tests
- Must be reviewed before merge

## Example Usage

User: "Plan a 2-week sprint for adding voice commands to our app"

Claude:
1. Creates `SPRINT_20251030.toml` with voice feature epic
2. Creates branches:
   - `feature/voice-commands`
   - `feature/voice-commands/phase-1` (setup)
   - `feature/voice-commands/phase-2` (implementation)
   - `feature/voice-commands/phase-3` (testing)
3. Generates tasks with assignments
4. Sets up PR templates
5. Configures branch protection

## Integration Points

- **Code Analyzer**: Runs on each PR
- **Initialize**: Sets up new repos
- **Publish**: Releases completed sprints
- **Voice Panel**: Captures requirements

## Success Criteria

Sprint planning succeeds when:
- [ ] Sprint file created with clear structure
- [ ] All branches created and pushed
- [ ] Tasks assigned with estimates
- [ ] Workflow documented
- [ ] Team understands process
- [ ] **ERROR HANDLING VERIFIED:**
  - [ ] Every task includes error_handling section
  - [ ] All parsing operations have try-catch requirements
  - [ ] File operations have error boundaries defined
  - [ ] API calls have timeout and retry logic
  - [ ] User-facing errors have clear messages
  - [ ] No task can crash the entire application

## Error Handling Template for Tasks

Every task in sprint MUST include:
```toml
[tasks.TASK-ID]
id = "TASK-ID"
name = "Task Name"
# ... other fields ...

error_handling = """
REQUIRED for ALL tasks:
1. Identify failure points:
   - [ ] List all parsing operations
   - [ ] List all file I/O operations
   - [ ] List all API/network calls
   - [ ] List all user input validations

2. Implement error boundaries:
   - [ ] Wrap in try-catch blocks
   - [ ] Log errors appropriately
   - [ ] Show user-friendly messages
   - [ ] Provide recovery options

3. Prevent cascade failures:
   - [ ] Errors isolated to component
   - [ ] Application continues functioning
   - [ ] No corruption of state
"""

validation_criteria = [
    "No unhandled exceptions possible",
    "All errors logged with context",
    "User sees actionable error messages",
    "Application remains stable after errors"
]
```

## Reference: BUG-012 Incident

**NEVER AGAIN:** A simple duplicate ID crashed entire VS Code for 9+ hours.

Requirements added after BUG-012:
- Every TOML parse MUST have try-catch
- Every file read MUST handle missing files
- Every JSON parse MUST validate structure
- Extension MUST work without config files
- Errors MUST NOT propagate to VS Code core