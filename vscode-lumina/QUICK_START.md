# ÆtherLight Quick Start - 2 Minutes to Voice-Enhanced Claude Code

**One command. Voice + typing intelligence. Zero desktop app required.**

---

## Step 1: Install (30 seconds)

```bash
npm install -g ./vscode-lumina
aetherlight
```

**What happens:**
- Installs ÆtherLight extension in Cursor
- Creates ÆtherLight Claude terminal profile
- Ready to use!

**Then:** Restart Cursor

---

## Step 2: Setup OpenAI API Key (1 minute)

**Required for voice capture (backtick `):**

1. Get API key from https://platform.openai.com/api-keys
2. In Cursor: **File > Preferences > Settings**
3. Search: `aetherlight openai`
4. Paste your key in **"ÆtherLight > OpenAI: API Key"**

**Cost:** ~$0.006 per minute of voice recording

**Note:** Shift+` hotkey has been deprecated and removed

---

## Step 3: Create Terminal (10 seconds)

1. Open terminal: **Ctrl+`**
2. Click dropdown arrow (**▼**)
3. Select **"ÆtherLight Claude"**
4. Terminal launches with Claude Code ready!

---

## Step 4: Use It (2 ways)

### Option A: Voice Capture (Backtick `)

**IMPORTANT: Click OUTSIDE the terminal first (in editor, sidebar, etc.)**

```bash
1. Click in your code editor
2. Press ` (backtick)
3. Speak: "Add user authentication to my Express.js app"
4. See live transcription typed in real-time
5. Press Enter when done (or edit first)
6. Enhanced prompt auto-sends to Claude Code
```

**What voice capture does:**
- Records audio using webview + browser MediaRecorder API
- Transcribes via OpenAI Whisper API in real-time
- Types transcription into input box using robotjs
- Allows editing before sending
- Auto-enhances with project context

**Result:** Claude gets full context + your voice intent

---

### Option B: Type + Enhance (manual entry)

**IMPORTANT: Click OUTSIDE the terminal first (in editor, sidebar, etc.)**

```bash
1. Click in your code editor
2. Press backtick (`)
3. Type: "add user authentication"
4. Press Enter
5. Enhanced prompt auto-sends to Claude Code
```

**Enhancement adds:**
```
add user authentication

CONTEXT: ÆtherLight Pattern-Enhanced Request
================================================================================
Project: my-app
Framework: Express.js
Workspace: /path/to/my-app

INSTRUCTIONS:
- Use ÆtherLight Chain of Thought documentation standards
- Include DESIGN DECISION, WHY, and REASONING CHAIN in comments
- Reference relevant patterns from library
- Ensure code is production-ready with error handling
```

---

## What You Get

### Without ÆtherLight (Manual)
```bash
You: "add auth"
Claude: "Sure, here's a basic authentication example..."
You: "No, I mean OAuth2 with Google, for Express.js"
Claude: "Oh, let me revise that..."
You: "And make sure it follows our coding standards"
```
**Time:** 10-15 minutes, 3-4 iterations

---

### With ÆtherLight (Automatic)
```bash
You: Press ` → Type "add auth" → Press Enter
Claude: Receives enhanced prompt with project context
Claude: Implements OAuth2 correctly first try ✅
```
**Time:** 2-3 minutes, 1 iteration

---

## 🚨 Critical Usage Rules

### ⚠️ Hotkeys ONLY Work Outside Terminal

**Backtick (`) will NOT work if you're clicked inside the ÆtherLight terminal.**

**Why:** Terminal captures keystrokes directly, preventing VS Code from seeing the hotkey.

**Solution:** Always click outside the terminal first:
- ✅ Click in your code editor
- ✅ Click in the sidebar (file explorer)
- ✅ Click in another terminal tab
- ❌ Do NOT be clicked inside ÆtherLight Claude terminal

**What happens if you forget:**
- Backtick (`) in terminal = Types backtick character

**Correct workflow:**
```
1. Click in editor (outside terminal)    ← CRITICAL STEP
2. Press ` (backtick) hotkey
3. Hotkey triggers correctly
4. Enhanced text automatically sent to terminal
```

**Note:** Shift+` hotkey has been deprecated and removed

---

## Troubleshooting (2 Common Issues)

### Issue 1: "Backtick just types ` in the terminal"
**Fix:** Click OUTSIDE the terminal (in editor) before pressing `

### Issue 2: "Voice capture says 'OpenAI API key not configured'"
**Fix:** Add your OpenAI API key in Settings (see Step 2 above)

**Note:** Shift+backtick has been deprecated and removed

---

## Commands Reference

| Hotkey | Where to Click | What It Does |
|--------|---------------|--------------|
| **` (backtick)** | Outside terminal (in editor) | Record voice with live transcription via OpenAI |
| **Shift+`** | ❌ Deprecated | Removed (conflicted with backtick-only approach) |

---

## Current Features

- ✅ Voice capture with live transcription via OpenAI Whisper API (backtick)
- ✅ Framework detection (React, Express, Next.js, etc.)
- ✅ Chain of Thought documentation standards
- ✅ ÆtherLight Claude terminal wrapper
- ⏳ Pattern matching (Supabase integration TODO)

---

## What ÆtherLight Does NOT Do (Yet)

- ❌ Automatic terminal command interception (you must use hotkeys)
- ❌ Pattern matching from Supabase (TODO: Phase 3 integration)
- ❌ Confidence scoring (TODO: Multi-dimensional matching)
- ❌ WebSocket IPC to desktop app (uses OpenAI API directly)

---

## Documentation

- [README.md](README.md) - Complete feature documentation
- [HOW_TO_USE_IN_CURSOR.md](HOW_TO_USE_IN_CURSOR.md) - Detailed Cursor setup
- [CHANGE_HOTKEY.md](CHANGE_HOTKEY.md) - Customize keyboard shortcuts

---

## Current Status (v0.13.1)

### ✅ What Works
- ✅ **Desktop app voice capture** - Works well
- ✅ Sprint tab shows all tasks
- ✅ 6 tabs (Voice, Sprint, Planning, Patterns, Activity, Settings)
- ✅ Fast startup (<2s, BUG-011 fixed)
- ✅ Desktop app auto-connects
- **Note:** F13 hotkey has been removed (not available on modern keyboards)

### ❌ Known Issues (see [KNOWN_ISSUES.md](KNOWN_ISSUES.md))
- ❌ Webview Record button doesn't work (use desktop app instead)
- ❌ Shift+` enhance button doesn't work yet (BUG-007)
- ❌ Terminal rename pencil icon (BUG-010, will be removed)

**Ready for feedback!** Core workflow (desktop app voice → Sprint tab) works great 🚀

---

**Last Updated:** 2025-10-25
**Extension Version:** 0.13.1
