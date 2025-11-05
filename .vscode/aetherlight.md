# ÆtherLight User Guide

**Welcome to ÆtherLight!** This extension enhances your development workflow with sprint management, voice capture, and pattern matching.

**CRITICAL:** This documentation MUST be read and followed by Claude Code. If Claude skips this or ignores enforcement rules, the system fails.

---

## 🚀 Quick Start (5 Minutes)

### 1. Open Voice Panel
Press **\` (backtick)** key → Voice Panel opens in sidebar

**What you'll see:**
- 6 tabs: Voice, Sprint, Chat, History, Patterns, Settings
- Sprint Tab shows your active sprint tasks
- Voice Tab shows transcription history

### 2. Create Your First Sprint
File: `sprints/ACTIVE_SPRINT.toml`

**CRITICAL:** Each task MUST include a `prompt` field with full implementation context.

```toml
sprint_name = "My First Sprint"
start_date = "2025-10-25"
end_date = "2025-11-01"

[tasks.TASK-001]
id = "TASK-001"
name = "Setup ÆtherLight in my project"
prompt = """
Verify ÆtherLight is working correctly in this project.

Steps:
1. Open .vscode/aetherlight.md (this file)
2. Press backtick (`) to open Voice Panel
3. Click Sprint Tab to see this task
4. Verify all 6 tabs are visible

Success criteria:
- Voice Panel opens when backtick pressed
- Sprint Tab shows this task (TASK-001)
- Documentation is clear and readable
"""
status = "in_progress"
priority = "high"
estimated_hours = 0.5
dependencies = []
```

**Refresh Sprint Tab** → Your task appears!

### 3. Voice Capture (Optional - Requires Desktop App)
If you installed the desktop app:
- Press **Ctrl+\`** (Control + backtick) → Start recording
- Speak your prompt
- Press **Ctrl+\`** again → Transcription appears

**No desktop app?** All other features still work!

---

## 📋 Sprint System - THE OPERATIONAL STRUCTURE

### What is ACTIVE_SPRINT.toml?
Your sprint management file. Location: `sprints/ACTIVE_SPRINT.toml`

### CRITICAL REQUIREMENT: The "prompt" Field

**Every task MUST include a `prompt` field with complete implementation context.**

**Why this matters:**
- Good prompt = Claude executes task without questions
- Bad prompt = Claude gets stuck, asks 10 clarifying questions, wastes time
- **The system FAILS if prompts are vague**

**Good Prompt Example:**
```toml
[tasks.AUTH-001]
id = "AUTH-001"
name = "Implement OAuth2 login"
prompt = """
Implement OAuth2 authentication for the login page using Passport.js.

Context:
- Backend: Express.js 4.18
- Frontend: React 18 with Context API
- Database: PostgreSQL with existing users table
- Files to modify: src/routes/auth.js, src/components/Login.jsx

Requirements:
1. Add OAuth2 provider configuration (Google + GitHub)
2. Create /auth/google/callback and /auth/github/callback routes
3. Store tokens in httpOnly cookies (secure, sameSite: strict)
4. Add middleware: requireAuth() to protect /api/* routes
5. Update Login.jsx with OAuth buttons

Success criteria:
- Users can login with Google/GitHub
- Tokens refresh automatically before expiration
- Protected routes redirect to /login
- All auth flows have tests (happy path + error cases)

Tech stack:
- passport v0.6.0
- passport-google-oauth20 v2.0.0
- passport-github2 v0.1.12
- express-session v1.17.3
"""
status = "pending"
priority = "high"
estimated_hours = 4.0
dependencies = []
```

**Bad Prompt Example (DO NOT DO THIS):**
```toml
prompt = "Add authentication"  # ← TOO VAGUE, SYSTEM FAILS
```

### Task Format Reference

```toml
[tasks.TASK-ID]
id = "TASK-ID"                # Unique identifier
name = "Short description"     # One-line summary
prompt = """                   # ← REQUIRED: Full implementation context
Detailed instructions here.

Context: [Tech stack, files, requirements]
Steps: [1, 2, 3...]
Success criteria: [What done looks like]
"""
status = "pending"             # pending, in_progress, completed, blocked
priority = "high"              # high, medium, low
estimated_hours = 2.0          # Time estimate
dependencies = []              # Other task IDs this depends on
```

### Task Execution Workflow

**1. Claude reads Sprint Tab**
- Sees ACTIVE_SPRINT.toml tasks
- Reads task `prompt` field for full context

**2. Claude executes task**
- Uses prompt for implementation details
- Doesn't need to ask clarifying questions (prompt has everything)
- Updates task status: `status = "in_progress"`

**3. Task completes**
- Claude marks: `status = "completed"`
- Adds completion_date automatically
- Moves to next task in dependencies

**ENFORCEMENT RULE:** If Claude asks clarifying questions that are already in the prompt, the prompt failed. Fix the prompt.

---

## ⌨️ Keyboard Shortcuts

| Hotkey | Action | Platform |
|--------|--------|----------|
| **\`** (backtick) | Open Voice Panel | All |
| **Ctrl+\`** | Voice capture (desktop app) | All |
| **Shift+\`** | Enhanced prompts (experimental) | All |

**NOTE:** Ctrl+\` only works if desktop app is running.

---

## 🎙️ Voice Capture

### With Desktop App
1. Install desktop app from GitHub releases
2. Desktop app runs in background (system tray)
3. Press **Ctrl+\`** → Start recording
4. Speak your prompt
5. Press **Ctrl+\`** → Stop recording
6. Transcription appears via OpenAI Whisper
7. Result shows in Voice Panel

### Without Desktop App
- Voice Panel still works for viewing tasks
- Sprint Tab works fine
- No voice capture available (need desktop app)
- All other features operational

---

## 📁 Recommended Folder Structure

```
your-project/
├── .vscode/
│   ├── aetherlight.md        # This file (ÆtherLight documentation)
│   └── settings.json          # References aetherlight.md
├── sprints/
│   └── ACTIVE_SPRINT.toml     # Your sprint tasks (with prompt fields)
├── docs/
│   └── patterns/              # Optional: Your patterns
└── [your code files]
```

---

## 🔧 Configuration

### .vscode/settings.json (Auto-Created)

```json
{
  "aetherlight.documentation": ".vscode/aetherlight.md",
  "aetherlight.sprintFile": "sprints/ACTIVE_SPRINT.toml",
  "aetherlight.enforcementEnabled": true
}
```

### Optional: Create .vscode/aetherlight-config.toml

```toml
[voice]
enabled = true
hotkey = "Ctrl+`"             # Control + backtick
whisper_model = "base.en"

[sprint]
enabled = true
auto_update = true
default_file = "sprints/ACTIVE_SPRINT.toml"
enforce_prompt_field = true    # Fail if task missing prompt

[patterns]
enabled = true
confidence_threshold = 0.75
```

---

## 🐛 Known Issues

### Issue 1: Record Button Doesn't Work
**Problem:** Clicking 🎤 in webview shows "mic access denied"
**Workaround:** Use Ctrl+\` hotkey instead (requires desktop app)

### Issue 2: Shift+\` Enhanced Prompts
**Problem:** Enhanced prompts feature not working yet
**Status:** Under development

### Issue 3: Sprint Tab Empty
**Problem:** No tasks showing
**Solution:** Create `sprints/ACTIVE_SPRINT.toml` with at least one task (with `prompt` field!)

### Issue 4: Voice Not Working
**Problem:** Ctrl+\` doesn't record
**Solution:**
- Desktop app must be running (check system tray)
- Mic permissions enabled (System Preferences → Privacy → Microphone)
- Try restarting desktop app

---

## 💡 Usage Examples

### Example 1: Plan a Feature
```toml
# sprints/ACTIVE_SPRINT.toml
[tasks.FEAT-001]
id = "FEAT-001"
name = "Design user authentication flow"
prompt = """
Design and document the user authentication flow for our application.

Context:
- Application: E-commerce site with customer accounts
- Current state: No authentication system
- Requirements: Email/password + OAuth (Google, GitHub)
- Tech stack: Node.js + Express + PostgreSQL

Steps:
1. Research best practices for authentication (OWASP guidelines)
2. Design database schema (users, sessions, oauth_tokens tables)
3. Create sequence diagram for:
   - Email/password registration flow
   - Email/password login flow
   - OAuth login flow
   - Password reset flow
4. Document security considerations:
   - Password hashing (bcrypt, salt rounds)
   - Session management (httpOnly cookies, CSRF protection)
   - Token storage (refresh tokens in database)
5. Create docs/architecture/AUTH_DESIGN.md with all diagrams

Success criteria:
- AUTH_DESIGN.md exists with complete documentation
- Database schema defined (with migrations)
- Sequence diagrams for all flows
- Security checklist completed

Deliverables:
- docs/architecture/AUTH_DESIGN.md
- migrations/001_create_auth_tables.sql
- diagrams/auth_flow.png
"""
status = "pending"
priority = "high"
estimated_hours = 3.0
dependencies = []
```

Tell Claude: "Work on FEAT-001" → Claude reads prompt, executes with full context

### Example 2: Multi-Task Sprint with Dependencies
```toml
[tasks.API-001]
id = "API-001"
name = "Create API endpoints"
prompt = """..."""
status = "completed"
completed_date = "2025-10-24"

[tasks.API-002]
id = "API-002"
name = "Add authentication middleware"
prompt = """..."""
status = "in_progress"
dependencies = ["API-001"]    # Waits for API-001 to complete

[tasks.API-003]
id = "API-003"
name = "Write API tests"
prompt = """..."""
status = "pending"
dependencies = ["API-002"]    # Waits for API-002 to complete
```

Claude sees dependency chain → Works on tasks in correct order

---

## 🆘 Troubleshooting

### Extension Not Showing
- Check VS Code extensions panel
- Look for "ÆtherLight" in sidebar Activity Bar
- Try reloading window: Cmd+R (Mac) or Ctrl+R (Windows)

### Sprint Tab Empty
- Create `sprints/ACTIVE_SPRINT.toml`
- Add at least one task WITH `prompt` field
- Refresh Sprint Tab (click refresh button)

### Voice Not Working
- Desktop app must be running (check system tray)
- Mic permissions enabled (System Settings → Privacy)
- Try Ctrl+\` hotkey instead of Record button

### Claude Doesn't See Tasks
- Make sure `sprints/ACTIVE_SPRINT.toml` exists
- Check TOML syntax (use TOML validator if needed)
- Open Sprint Tab → Claude can read task list

### Claude Asks Too Many Questions
**Problem:** Claude asks questions already answered in task prompt
**Root Cause:** Prompt field is too vague or missing critical context
**Solution:** Improve task prompt with:
- Complete tech stack details
- File paths to modify
- Step-by-step instructions
- Success criteria
- Example code if helpful

**REMEMBER:** Quality of prompts = Quality of execution

---

## 📚 Advanced Features

### Pattern Matching (Coming Soon)
- Create patterns in `docs/patterns/`
- Pattern confidence scoring
- AI-assisted pattern discovery

### Real-Time Sync (Coming Soon)
- Share sprint status with team
- See teammate progress live
- Conflict prevention

### Autonomous Agents (Future)
- Multi-agent task execution
- Automatic sprint planning
- Quality assurance agents

---

## 🤖 Claude Code Integration - CRITICAL SECTION

**This file is designed to be read by Claude Code!**

### What Claude Should Do When Reading This File

1. **Read ACTIVE_SPRINT.toml**
   - Location: `sprints/ACTIVE_SPRINT.toml`
   - Parse all tasks
   - Note each task's `prompt` field (this is your execution context)

2. **Execute Tasks According to Prompts**
   - Read task `prompt` field completely
   - Use prompt as source of truth for implementation
   - DON'T ask questions already answered in prompt
   - DO ask questions if prompt is unclear or missing critical info

3. **Update Task Status**
   - Mark `status = "in_progress"` when starting
   - Mark `status = "completed"` when done
   - Add `completed_date = "YYYY-MM-DD"` when completing

4. **Follow Dependencies**
   - Check `dependencies = [...]` field
   - Don't start tasks until dependencies completed
   - Work in dependency order

5. **Enforcement Rules**
   - MUST read task `prompt` field before starting
   - MUST NOT execute tasks without prompt field
   - MUST ask user to add prompt if missing
   - MUST follow operational structure in this file

### If Claude Violates These Rules

**The system fails.**

If Claude:
- Skips reading prompts
- Asks questions already in prompt
- Ignores enforcement rules
- Executes tasks without context

Then the system is considered broken and must be fixed.

---

## 🔗 Resources

- **GitHub:** https://github.com/F9-Global/Aetherlight_lumina
- **Issues:** https://github.com/F9-Global/Aetherlight_lumina/issues
- **Releases:** https://github.com/F9-Global/Aetherlight_lumina/releases

---

## 📊 Operational Structure Summary

**For Claude Code:**

1. **Documentation Location:** `.vscode/aetherlight.md` (this file)
2. **Sprint File:** `sprints/ACTIVE_SPRINT.toml`
3. **Critical Field:** Each task must have `prompt` field
4. **Enforcement:** Enabled via `aetherlight.enforcementEnabled: true` in settings.json
5. **Workflow:** Read prompt → Execute → Update status → Move to next task

**For Users:**

1. **Install Extension:** Done ✅
2. **Create Sprint:** Add tasks to `sprints/ACTIVE_SPRINT.toml`
3. **Write Prompts:** Include complete context in each task's `prompt` field
4. **Let Claude Work:** Claude reads prompts, executes tasks, updates status
5. **Monitor Progress:** Check Sprint Tab in Voice Panel

---

**STATUS:** Auto-generated by ÆtherLight v0.13.2
**LAST UPDATED:** 2025-10-25
**CRITICAL:** Claude Code must read and follow this operational structure

🚀 **Ready to build with ÆtherLight!**
