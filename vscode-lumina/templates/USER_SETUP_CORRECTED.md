# ÆtherLight User Guide

**Welcome to ÆtherLight!** This extension enhances your development workflow with sprint management and voice capture.

**CRITICAL:** This documentation MUST be read and followed by Claude Code. If Claude skips this or ignores enforcement rules, the system fails.

---

## 🚀 Quick Start (5 Minutes)

### 1. Install Desktop App (REQUIRED for Voice)

**Voice features require the ÆtherLight desktop app running in the background.**

1. Download desktop app from [GitHub Releases](https://github.com/F9-Global/Aetherlight_lumina/releases)
2. Install and launch (runs in system tray)
3. Desktop app provides:
   - Native microphone access
   - OpenAI Whisper integration
   - IPC server (ws://localhost:43215)

**Without desktop app:** Sprint Tab works, but voice features show error "Desktop app not connected"

### 2. Configure OpenAI API Key

Voice transcription requires OpenAI API key:

1. Open VS Code Settings (Ctrl+,)
2. Search for "aetherlight.openai.apiKey"
3. Enter your OpenAI API key
4. Key is synced to desktop app automatically

**Without API key:** Voice recording will prompt you to configure settings

### 3. Create Your First Sprint

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
2. Press backtick (`) to start voice recording
3. Verify Voice Panel opens and recording starts
4. Check Sprint Tab shows this task

Success criteria:
- Desktop app running in system tray
- OpenAI API key configured
- Voice recording works when backtick pressed
- Sprint Tab shows this task (TASK-001)
"""
status = "in_progress"
priority = "high"
estimated_hours = 0.5
dependencies = []
```

**Refresh Sprint Tab** → Your task appears!

---

## ⌨️ Keyboard Shortcuts

### Working Hotkeys:

| Hotkey | Action | Requirements |
|--------|--------|--------------|
| **\`** (backtick) | Start voice recording in Voice Panel | Desktop app + OpenAI API key |

**That's it!** Only ONE hotkey is currently functional.

### How Backtick Works:

1. Press **\`** (backtick key)
2. Voice Panel opens in sidebar
3. Recording starts automatically (desktop app)
4. Speak your prompt
5. Press **\`** again to stop
6. Transcription appears in Voice Panel input field
7. Edit if needed, press Enter to use

**Requirements:**
- ✅ Desktop app must be running (check system tray)
- ✅ OpenAI API key configured in settings
- ✅ Microphone permissions enabled

### Hotkeys NOT Working:

| Hotkey | Status | Reason |
|--------|--------|--------|
| F13 | ❌ Removed | Key doesn't exist on modern keyboards |
| Shift+\` | ❌ Not implemented | Work in progress |
| Ctrl+\` | ❌ Not bound | Future feature |

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

## 🎙️ Voice Capture

### Prerequisites (REQUIRED):

1. **Desktop app installed and running**
   - Download from GitHub releases
   - Check system tray icon (Æ symbol)
   - Desktop app must be active for voice to work

2. **OpenAI API key configured**
   - VS Code Settings → "aetherlight.openai.apiKey"
   - Get key from https://platform.openai.com/api-keys
   - Extension syncs key to desktop app automatically

### Using Voice Capture:

1. Press **\`** (backtick)
2. Voice Panel opens in sidebar
3. Recording starts (mic indicator shows)
4. Speak your prompt clearly
5. Press **\`** again to stop
6. Wait for transcription (~2-5 seconds)
7. Transcription appears in input field
8. Edit if needed, press Enter to use

### Troubleshooting Voice:

**Problem:** "Desktop app not connected" error

**Solutions:**
1. Check system tray - is desktop app running?
2. Restart desktop app from Start menu/Applications
3. Check firewall - allow ws://localhost:43215
4. Reinstall desktop app if connection fails

**Problem:** "OpenAI API key required" error

**Solutions:**
1. Open Settings (Ctrl+,)
2. Search "aetherlight.openai.apiKey"
3. Paste your OpenAI API key
4. Restart VS Code to sync to desktop app

**Problem:** Recording starts but no transcription

**Solutions:**
1. Check microphone permissions (System Settings → Privacy)
2. Verify OpenAI API key is valid (test at platform.openai.com)
3. Check desktop app logs for errors
4. Ensure internet connection (Whisper API requires network)

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
  "aetherlight.enforcementEnabled": true,
  "aetherlight.openai.apiKey": "sk-..."  // Your OpenAI API key
}
```

### Optional: Create .vscode/aetherlight-config.toml

```toml
[voice]
enabled = true
whisper_model = "base.en"          # Or: tiny, base, small, medium, large

[sprint]
enabled = true
auto_update = true
default_file = "sprints/ACTIVE_SPRINT.toml"
enforce_prompt_field = true         # Fail if task missing prompt

[patterns]
enabled = true
confidence_threshold = 0.75
```

---

## 🐛 Known Issues

### Issue 1: Record Button in Webview Doesn't Work

**Problem:** Clicking 🎤 in webview shows "mic access denied"
**Workaround:** Use \` hotkey instead (requires desktop app)
**Root Cause:** VS Code webviews block microphone via Permissions-Policy
**Permanent Fix:** Desktop app provides native mic access via IPC

### Issue 2: Voice Panel Not Rendering

**Problem:** Panel opens but content doesn't show
**Status:** Under investigation
**Workaround:** Reload VS Code window (Ctrl+R)

### Issue 3: Sprint Tab Empty

**Problem:** No tasks showing
**Solution:** Create `sprints/ACTIVE_SPRINT.toml` with at least one task (with `prompt` field!)

### Issue 4: Desktop App Won't Connect

**Problem:** "Desktop app not connected" error persists
**Solution:**
- Check desktop app is running (system tray)
- Verify port 43215 not blocked by firewall
- Restart both VS Code and desktop app
- Check desktop app logs for errors

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
- OpenAI API key configured in settings
- Mic permissions enabled (System Settings → Privacy)
- Try \` hotkey (not webview Record button)

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
- **Desktop App:** https://github.com/F9-Global/Aetherlight_lumina/releases (download latest)

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
2. **Install Desktop App:** Download from GitHub releases (REQUIRED for voice)
3. **Configure API Key:** OpenAI API key in settings (REQUIRED for voice)
4. **Create Sprint:** Add tasks to `sprints/ACTIVE_SPRINT.toml`
5. **Write Prompts:** Include complete context in each task's `prompt` field
6. **Let Claude Work:** Claude reads prompts, executes tasks, updates status
7. **Monitor Progress:** Check Sprint Tab in Voice Panel

---

## System Requirements

### Required:
- VS Code 1.80.0 or higher
- Internet connection (for OpenAI Whisper API)

### Required for Voice Features:
- ÆtherLight Desktop App (from GitHub releases)
- OpenAI API key (get from platform.openai.com)
- Microphone with system permissions enabled

### Optional:
- Git (for version control of sprint files)
- TOML validator extension (for editing ACTIVE_SPRINT.toml)

---

**STATUS:** Auto-generated by ÆtherLight v0.13.4
**LAST UPDATED:** 2025-10-27
**CRITICAL:** Claude Code must read and follow this operational structure

🚀 **Ready to build with ÆtherLight!**
