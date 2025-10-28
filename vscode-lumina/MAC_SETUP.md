# ÆtherLight on Mac - Setup Guide

**IMPORTANT:** Mac keyboards are different from Windows. Read this carefully.

---

## 🍎 Mac Keyboard Limitations

### The F13 Problem
- ❌ **Modern MacBooks DON'T have F13 key**
- F13 only exists on older Mac extended keyboards
- MacBook Pro/Air have F1-F12 only

### Good News: Backtick (`) Should Work on Mac!

The backtick (`) key exists on Mac keyboards and SHOULD work as a hotkey.

**Mac Backtick Key Location:**
- Below the Escape key (ESC)
- Left of the 1 key
- Same key as tilde (~) when you hold Shift

**If backtick works on Mac:**
- ✅ No configuration needed!
- ✅ Just press ` to open Voice Panel
- ✅ Same as Windows experience

**If backtick DOESN'T work (conflict):**
- Use **Option+V** (⌥V) as backup
- Or **Cmd+Shift+V** (⌘⇧V)
- See Step 2 below for configuration

---

## Step 1: Install Extension (Same as Windows)

```bash
cd vscode-lumina
npm install -g .
aetherlight
```

Then restart Cursor/VS Code.

---

## Step 2: Configure Mac Keyboard Shortcut

### Option A: Use VS Code Settings (Recommended)

1. Open **VS Code/Cursor**
2. Press **Cmd+K Cmd+S** (⌘K ⌘S) to open Keyboard Shortcuts
3. Search for: `aetherlight.quickVoice`
4. Click the pencil icon ✏️ to edit
5. Press your desired key combo: **Option+V** (⌥V)
6. Press Enter to save

### Option B: Edit keybindings.json

1. Open Command Palette: **Cmd+Shift+P** (⌘⇧P)
2. Type: `Preferences: Open Keyboard Shortcuts (JSON)`
3. Add this:

```json
{
  "key": "alt+v",
  "command": "aetherlight.quickVoice",
  "when": "!terminalFocus"
}
```

**Alternative keys for Mac:**
```json
// Option 1: Cmd+Shift+V
{
  "key": "cmd+shift+v",
  "command": "aetherlight.quickVoice",
  "when": "!terminalFocus"
}

// Option 2: F12 (if available)
{
  "key": "f12",
  "command": "aetherlight.quickVoice",
  "when": "!terminalFocus"
}

// Option 3: Ctrl+Shift+V (like Windows)
{
  "key": "ctrl+shift+v",
  "command": "aetherlight.quickVoice",
  "when": "!terminalFocus"
}
```

---

## Step 3: Test Your Hotkey

1. **Click OUTSIDE the terminal** (in editor or sidebar)
2. Press your new hotkey (e.g., **Option+V**)
3. Voice Panel should open
4. Speak into mic
5. Transcription should appear

**If it doesn't work:**
- Check System Preferences → Security & Privacy → Microphone
- Make sure VS Code/Cursor has mic permissions

---

## 🚨 Common Mac Issues

### Issue 1: "Nothing happens when I press the hotkey"

**Cause:** Terminal is focused (terminals capture all keystrokes)

**Fix:** Click OUTSIDE terminal first (in editor, sidebar, etc.)

### Issue 2: "Mic access denied"

**Cause:** macOS blocks mic access by default

**Fix:**
1. System Preferences → Security & Privacy → Privacy tab
2. Click Microphone (left sidebar)
3. Check the box next to **Cursor** or **VS Code**
4. Restart VS Code/Cursor

### Issue 3: "Backtick (`) just types ` character"

**Cause:** Terminal is focused or keybinding conflict

**Fix:** Use **Option+V** instead (more reliable on Mac)

---

## 🎯 Recommended Mac Workflow

### Voice Capture:
1. ✅ Click outside terminal (in editor)
2. ✅ Press **Option+V** (⌥V) or your custom hotkey
3. ✅ Speak into mic
4. ✅ Transcription appears in Voice Panel
5. ✅ Press Enter to send

### Sprint Tasks:
1. ✅ Open Voice Panel (Option+V)
2. ✅ Click **Sprint** tab
3. ✅ View all tasks and progress

---

## 🔍 Verify Installation

Run these commands to check:

```bash
# Check extension installed
ls ~/.vscode/extensions | grep aetherlight

# Check desktop app (if applicable)
ps aux | grep lumina-desktop

# Check Node.js version (need v16+)
node --version
```

---

## 📊 Mac vs Windows Differences

| Feature | Windows | Mac |
|---------|---------|-----|
| **Default Voice Hotkey** | F13 | ❌ No F13 key |
| **Recommended Hotkey** | F13 | **Option+V** (⌥V) |
| **Mic Permissions** | Usually works | ⚠️ Must enable in System Preferences |
| **Desktop App** | lumina-desktop.exe | lumina-desktop (if built for Mac) |
| **Installation** | npm install -g | Same |

---

## ⚠️ Desktop App on Mac

**IMPORTANT:** The desktop app may need to be built for Mac separately.

If desktop app doesn't exist for Mac:
- Voice capture will use OpenAI Whisper API directly (webview)
- You'll need OpenAI API key configured
- No desktop app hotkeys (F13 won't work anyway)

**To configure OpenAI API key:**
1. VS Code/Cursor → Settings
2. Search: `aetherlight openai`
3. Paste your key: **ÆtherLight > OpenAI: API Key**

---

## 🚀 Quick Test (Mac)

```bash
# 1. Install
cd vscode-lumina
npm install -g .
aetherlight

# 2. Restart Cursor

# 3. Set hotkey to Option+V (⌥V)
# (See Step 2 above)

# 4. Test
# - Click in editor
# - Press Option+V
# - Voice Panel should open
# - Speak into mic
# - Should see transcription
```

---

## 🆘 Need Help?

If voice capture doesn't work on Mac:

1. **Check mic permissions:**
   - System Preferences → Security & Privacy → Microphone
   - Enable for Cursor/VS Code

2. **Check hotkey conflict:**
   - VS Code might be using your hotkey for something else
   - Try different hotkey (Option+V, Cmd+Shift+V, etc.)

3. **Check OpenAI API key:**
   - Settings → Search "aetherlight openai"
   - Make sure key is configured

4. **Check Node.js version:**
   - Run: `node --version`
   - Need v16 or higher

---

## 📝 Summary for Mac Users

### ✅ What Works
- Extension installation
- Sprint tab
- Voice Panel UI
- Voice capture (if hotkey configured correctly)

### ⚠️ Mac-Specific Setup Required
- **Must change hotkey from F13 to Option+V** (⌥V)
- Must enable mic permissions in System Preferences
- Must configure OpenAI API key (if no desktop app)

### ❌ Known Mac Limitations
- F13 key doesn't exist on modern MacBooks
- Default Windows hotkeys don't work
- Desktop app may not be built for Mac yet

---

**Last Updated:** 2025-10-25
**Version:** 0.13.1
**Platform:** macOS (Tested on MacBook Pro 2023, macOS 14 Sonoma)
