# ÆtherLight v0.13.1 - Known Issues

**Last Updated:** 2025-10-25
**Version:** 0.13.1

---

## ✅ What Works Great

### Voice Capture
- ✅ **Desktop App Voice Hotkeys Work Perfectly**
  - Voice capture via desktop app
  - Transcription via OpenAI Whisper works
  - Transcription appears in terminal
  - **Note:** F13 hotkey has been deprecated (not available on modern keyboards)

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

**Workaround:** Use desktop app voice capture or alternative input methods

**Why:** Browser MediaRecorder API requires HTTPS, webviews can't access mic reliably

**Status:** Low priority - desktop app voice capture works well

**Note:** F13 hotkey has been removed (deprecated in favor of modern keyboard shortcuts)

---

### Issue 2: Shift+` Global Voice Typing (Deprecated)

**Status:** **RESOLVED** - Shift+` hotkey has been removed from the extension

**Reason:** Conflicted with backtick-only approach, caused user confusion

**Solution:** Use alternative voice capture methods (desktop app or Voice Panel)

---

### Issue 3: Terminal Rename Pencil Icon (Will Be Removed)

**Problem:** Pencil icon (✏️) next to terminals allows renaming, but the custom name only shows in Voice Panel list, NOT in the actual VS Code terminal tab

**Why:** VS Code API doesn't support programmatic terminal renaming

**Status:** BUG-010 - Pencil icon will be removed in next update

**Impact:** Low - feature is cosmetic and doesn't work end-to-end

---

## 🎯 Recommended Usage (What Actually Works)

### For Voice Capture:
1. ✅ **Use desktop app voice capture** - works well
2. ❌ Don't use webview Record button - doesn't work reliably
3. **Note:** F13 hotkey removed (not available on modern keyboards)

### For Enhanced Prompts:
1. ⏳ Manual context for now (Shift+` has been removed)
2. ✅ Sprint tab shows all tasks clearly
3. **Note:** Shift+` hotkey deprecated (conflicted with backtick-only approach)

### For Terminal Management:
1. ✅ Terminal list in Voice Panel shows all terminals
2. ❌ Ignore pencil icons - rename doesn't work end-to-end

---

## 📊 Feature Status Summary

| Feature | Status | Recommendation |
|---------|--------|----------------|
| **Desktop App Voice Capture** | ✅ Works well | Use this! |
| **Webview Record Button** | ❌ Broken | Use desktop app instead |
| **Shift+` Enhance** | ❌ Deprecated | Removed (use manual context) |
| **Sprint Tab** | ✅ Works great | Use it! |
| **Tab Switching** | ✅ Fast | Works perfectly |
| **Desktop App Connection** | ✅ Reliable | Auto-connects |
| **Startup Performance** | ✅ Fixed | <2s load time |

---

## 🍎 Mac-Specific Issues (CRITICAL)

### Issue 4: F13 Key Removed (Deprecated)

**Status:** **RESOLVED** - F13 hotkey has been removed from the extension

**Reason:** F13 key doesn't exist on modern keyboards (Windows/Mac)

**Solution:** Use alternative voice capture methods available in the desktop app

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
1. Desktop app voice capture → speak → get transcription ✅
2. View sprint tasks in Sprint tab ✅
3. Navigate between tabs ✅

**Things that don't work yet:**
1. Webview Record button (use desktop app instead)
2. Terminal rename (cosmetic only)

**Deprecated:**
- Shift+` enhance button has been removed (conflicted with backtick-only approach)

**Note:** F13 hotkey has been removed (not available on modern keyboards)

---

## 📞 User Feedback Needed

We need users to test:
1. **Does desktop app voice capture work reliably for you?**
2. **Is Sprint tab useful for tracking tasks?**
3. **Are the 6 tabs discoverable and intuitive?**
4. **Any other blockers or confusion points?**

**Note:** F13 and Shift+` hotkeys have been deprecated and removed

---

**Version:** 0.13.1
**Date:** 2025-10-25
**Status:** Beta - Ready for user feedback with known limitations documented
