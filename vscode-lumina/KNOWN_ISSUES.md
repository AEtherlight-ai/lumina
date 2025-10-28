# ÆtherLight v0.13.1 - Known Issues

**Last Updated:** 2025-10-25
**Version:** 0.13.1

---

## ✅ What Works Great

### Voice Capture
- ✅ **Desktop App Voice Hotkeys Work Perfectly**
  - F13 key captures voice via desktop app
  - Transcription via OpenAI Whisper works
  - Transcription appears in terminal
  - **This is the recommended way to use voice**

### UI & Navigation
- ✅ Voice Panel opens with 6 tabs
- ✅ Tab switching is fast (<50ms)
- ✅ Sprint tab shows all tasks
- ✅ Desktop app connects automatically

### Performance
- ✅ Extension loads fast (<2s startup)
- ✅ No more 9.5s delay on startup (BUG-011 fixed)

---

## ❌ Known Issues (Non-Critical)

### Issue 1: Record Button in Webview (Low Priority)

**Problem:** Clicking the 🎤 Record button in Voice Panel shows "mic access denied"

**Workaround:** **Use F13 hotkey instead** (desktop app voice capture)
- This works perfectly and is actually faster
- F13 → speak → transcription appears immediately

**Why:** Browser MediaRecorder API requires HTTPS, webviews can't access mic reliably

**Status:** Low priority - F13 desktop hotkey works great

**Recommended:** Just use F13, ignore the webview Record button

---

### Issue 2: Enhance Button Doesn't Work (Shift+`)

**Problem:** Pressing Shift+` (tilde) does nothing - no enhanced prompt appears

**Impact:** Moderate - can't auto-enhance typed prompts with project context

**Workaround:** Manually add context to your prompts for now

**Status:** BUG-007 - Under investigation

**Expected Fix:** v0.13.2 or v0.14.0

---

### Issue 3: Terminal Rename Pencil Icon (Will Be Removed)

**Problem:** Pencil icon (✏️) next to terminals allows renaming, but the custom name only shows in Voice Panel list, NOT in the actual VS Code terminal tab

**Why:** VS Code API doesn't support programmatic terminal renaming

**Status:** BUG-010 - Pencil icon will be removed in next update

**Impact:** Low - feature is cosmetic and doesn't work end-to-end

---

## 🎯 Recommended Usage (What Actually Works)

### For Voice Capture:
1. ✅ **Use F13 hotkey** (desktop app) - works perfectly
2. ❌ Don't use webview Record button - doesn't work reliably

### For Enhanced Prompts:
1. ⏳ Manual context for now (Shift+` not working yet)
2. ✅ Sprint tab shows all tasks clearly

### For Terminal Management:
1. ✅ Terminal list in Voice Panel shows all terminals
2. ❌ Ignore pencil icons - rename doesn't work end-to-end

---

## 📊 Feature Status Summary

| Feature | Status | Recommendation |
|---------|--------|----------------|
| **F13 Voice Capture** | ✅ Works great | Use this! |
| **Webview Record Button** | ❌ Broken | Ignore it, use F13 |
| **Shift+` Enhance** | ❌ Broken | Manual context for now |
| **Sprint Tab** | ✅ Works great | Use it! |
| **Tab Switching** | ✅ Fast | Works perfectly |
| **Desktop App Connection** | ✅ Reliable | Auto-connects |
| **Startup Performance** | ✅ Fixed | <2s load time |

---

## 🍎 Mac-Specific Issues (CRITICAL)

### Issue 4: F13 Key Doesn't Exist on Modern Macs

**Problem:** Default voice hotkey is F13, but MacBooks only have F1-F12

**Impact:** CRITICAL - Voice capture won't work with default hotkey

**Workaround:** **Change hotkey to Option+V** (⌥V) or **Cmd+Shift+V**

**Instructions:** See [MAC_SETUP.md](MAC_SETUP.md) for complete Mac setup

**Status:** Affects ALL Mac users with modern keyboards

---

### Issue 5: Backtick (`) Hotkey May Conflict on Mac

**Problem:** Backtick keybinding might conflict with VS Code/Terminal on Mac

**Impact:** High - Primary hotkey might not work

**Workaround:** Use **Option+V** (⌥V) instead - more reliable on Mac

**Instructions:** Configure in VS Code Keyboard Shortcuts (Cmd+K Cmd+S)

---

### Issue 6: Desktop App May Not Be Built for Mac

**Problem:** Desktop app binary might only exist for Windows (.exe)

**Impact:** High - Desktop app hotkeys won't work on Mac

**Workaround:** Extension falls back to OpenAI Whisper API directly
- Requires OpenAI API key configured in Settings
- Voice capture still works, just through webview instead of desktop app

**Status:** Need to verify if Mac binary exists

---

## 🚀 Bottom Line

**Ready for User Feedback?**
- **Windows:** ✅ **YES** - Core features work well
- **Mac:** ⚠️ **NEEDS MAC-SPECIFIC SETUP** - See [MAC_SETUP.md](MAC_SETUP.md)

**Primary workflow works:**
1. Press F13 → speak → get transcription ✅
2. View sprint tasks in Sprint tab ✅
3. Navigate between tabs ✅

**Things that don't work yet:**
1. Webview Record button (use F13 instead)
2. Shift+` enhance button (manual context for now)
3. Terminal rename (cosmetic only)

**Recommendation:** Ship v0.13.1 for feedback with clear docs about what works (F13) and what doesn't (webview button, enhance)

---

## 📞 User Feedback Needed

We need users to test:
1. **Does F13 voice capture work reliably for you?**
2. **Is Sprint tab useful for tracking tasks?**
3. **Are the 6 tabs discoverable and intuitive?**
4. **How important is Shift+` enhance to your workflow?**
5. **Any other blockers or confusion points?**

---

**Version:** 0.13.1
**Date:** 2025-10-25
**Status:** Beta - Ready for user feedback with known limitations documented
