# Ready to Sprint! 🚀

Congratulations! Your project is now configured with ÆtherLight. You're ready to start tracking work with sprints.

## What Are Sprints in ÆtherLight?

Sprints are time-boxed work cycles that help you:

- **Break down large projects** into manageable tasks
- **Track progress** with real-time status updates
- **Coordinate with AI agents** (assign tasks to specialized agents)
- **Prevent scope creep** with defined phases and dependencies
- **Reflect and improve** with retrospectives

## Sprint Structure

Each sprint contains:

### 📋 Metadata
- Sprint name and goal
- Start/end dates
- Team members (or AI agents)

### 🎯 Epics & Tasks
- **Epics**: Large features or themes
- **Tasks**: Specific work items with:
  - Status (pending, in_progress, completed)
  - Phase (e.g., Phase 1, Phase 2, etc.)
  - Agent assignment (e.g., senior-dev, tdd-engineer)
  - Time estimates
  - Dependencies (task ordering)

### 📊 Progress Tracking
- Real-time task status
- Burndown charts
- Blockers and risks

### 🔄 Workflows
- Pre-commit validation
- Pattern enforcement
- Automated testing triggers

## How to Create Your First Sprint

You have several options:

### Option 1: Use the Sprint Planning Skill (Recommended)

The `/sprint-plan` skill guides you through:
1. Analyzing your backlog
2. Breaking down work into tasks
3. Assigning agents
4. Setting up workflows

Run this command in Claude Code:
```
/sprint-plan
```

### Option 2: Manual Sprint File

Create `sprints/ACTIVE_SPRINT.toml` with this structure:

```toml
[sprint]
name = "My First Sprint"
goal = "Ship v1.0"
start_date = "2025-11-08"
end_date = "2025-11-22"

[epic.auth]
name = "User Authentication"
description = "Add login/signup flow"

[tasks.AUTH-001]
id = "AUTH-001"
name = "Create login form"
epic = "auth"
status = "pending"
phase = "Phase 1"
agent = "frontend-dev"
estimated_time = "4 hours"
dependencies = []
```

### Option 3: Import Existing Sprint

If you have a sprint TOML file, copy it to:
- **Development**: `internal/sprints/ACTIVE_SPRINT.toml`
- **Production**: `sprints/ACTIVE_SPRINT.toml`

## Sprint Panel in VS Code

Once you have an active sprint, you'll see:

- **Sprint Progress** panel in the Explorer sidebar
  - Task list with status indicators
  - Burndown chart
  - Quick task updates (mark complete, move to in_progress, etc.)

- **Agent Coordination** panel
  - See which agents are working on what
  - Assign new tasks
  - Monitor agent progress

## Sprint Workflows

ÆtherLight enforces best practices:

### Pre-Commit Validation
- Tasks must be marked complete before merging
- Prevents incomplete work from reaching production

### Pattern Matching
- Detect when you're deviating from established patterns
- Get warnings before breaking conventions

### Automated Testing
- Tests run automatically when task status changes
- Ensures quality gates are met

## Next Steps

1. **Create your first sprint** using one of the methods above
2. **Open the Sprint Progress panel** (View → Open View → Sprint Progress)
3. **Start tracking work** by updating task statuses
4. **Review your progress** daily/weekly

## Learn More

- **Sprint Templates**: See `internal/SPRINT_TEMPLATE_GUIDE.md` for 27 normalized tasks
- **Pattern Library**: See `docs/patterns/Pattern-SPRINT-PLAN-001.md` for sprint planning workflow
- **Agent System**: See `internal/agents/` for available AI agents

## Need Help?

- **Command Palette**: Type "ÆtherLight" to see all available commands
- **Documentation**: See `.aetherlight/README.md` in your project
- **GitHub**: https://github.com/AEtherlight-ai/lumina

## You're All Set! 🎉

You've completed the getting started walkthrough. ÆtherLight is now configured for your project and ready to help you work faster.

Try these next:

- Press **`** (backtick) to open the Voice Panel
- Press **Ctrl+Shift+V** to capture voice directly
- Open Command Palette → "ÆtherLight: Analyze Workspace"
- Create your first sprint with `/sprint-plan`

Happy coding! ⚡
