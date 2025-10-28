# Lumina Extension Testing Guide

**Version:** 1.0
**Date:** 2025-10-27
**Extension Version:** 0.1.0
**Keybinding:** Backtick (`) for voice capture

---

## ✅ Prerequisites Verified

- [x] Extension installed: `aetherlight.lumina-vscode`
- [x] Keybinding: Backtick (`) for voice capture
- [x] Extension rebuilt and reinstalled
- [x] Tutorial documentation updated

---

## 🎤 Test 1: Voice Capture (Backtick `)

### **Test Steps:**

1. **Open any file in VS Code** (or create a new file)
   - Press `Ctrl+N` to create new file
   - Or open existing .ts/.js file

2. **Activate voice capture:**
   - Press and hold backtick (`)
   - **Expected:** Microphone activates, visual indicator appears
   - **Fallback if nothing happens:**
     - Press `Ctrl+Shift+P` (Command Palette)
     - Type: "Lumina: Capture Voice"
     - Press Enter

3. **Speak test phrase:**
   - Say: "Show me how to implement user authentication with JWT tokens"
   - **Duration:** 3-5 seconds
   - **Expected:** Audio waveform animation while recording

4. **Release backtick (`)** (or wait 30 seconds for auto-stop)
   - **Expected:** "Transcribing..." spinner appears
   - **Expected:** Transcription completes in 2-5 seconds

5. **Check Output Panel for logs:**
   - Press `Ctrl+Shift+U` (Output Panel)
   - Select **"Lumina"** from dropdown
   - **Expected logs:**
     ```
     [Lumina] Voice capture started
     [Lumina] Audio recorded: 3.2s
     [Lumina] Transcription: "Show me how to implement user authentication with JWT tokens"
     ```

### **Expected Results:**

✅ **Success Criteria:**
- Microphone activates on backtick (`) press
- Audio waveform visible during recording
- Transcription appears after release
- Transcription accuracy >85%
- Output panel shows logs

❌ **Failure Indicators:**
- No microphone activation
- No visual feedback
- No transcription appears
- Error in Output panel

### **Troubleshooting:**

**Problem: Backtick (`) doesn't activate microphone**

**Solution 1: Check keyboard binding**
- Press `Ctrl+K Ctrl+S` (Keyboard Shortcuts)
- Search for "lumina.captureVoice"
- Verify binding is backtick (`)

**Solution 2: Check microphone permissions**
- Windows Settings → Privacy & Security → Microphone
- Verify VS Code has microphone access

**Solution 3: Use Command Palette**
- Press `Ctrl+Shift+P`
- Type "Lumina: Capture Voice"
- If this works, keybinding issue; if not, extension issue

**Solution 4: Reload VS Code window**
- Press `Ctrl+Shift+P`
- Type "Reload Window"
- Try backtick (`) again

---

## 🧩 Test 2: Pattern Matching

### **Prerequisites:**

Before testing pattern matching, you need:
1. Supabase configuration (URL + service key)
2. Voyage AI API key
3. Pattern ingestion script run

### **Configuration Steps:**

1. **Set environment variables:**
   ```powershell
   $env:SUPABASE_URL = "https://xxxxx.supabase.co"
   $env:SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   $env:VOYAGE_API_KEY = "pa-xxxxxxxxxxxxxxxxxxxx"
   ```

2. **Verify variables set:**
   ```powershell
   echo $env:SUPABASE_URL
   echo $env:SUPABASE_SERVICE_KEY
   echo $env:VOYAGE_API_KEY
   ```

3. **Run pattern ingestion:**
   ```powershell
   cd scripts
   bash run-pattern-ingestion.sh
   ```

### **Test Steps:**

1. **Test Query 1: "implement REST API endpoints"**
   - Press backtick (`)
   - Say: "implement REST API endpoints"
   - Release
   - **Expected:** Matches API design patterns, Express.js handlers

2. **Test Query 2: "fix authentication bug"**
   - Press backtick (`)
   - Say: "fix authentication bug"
   - Release
   - **Expected:** Matches auth debugging patterns, JWT verification

3. **Test Query 3: "add database migration"**
   - Press backtick (`)
   - Say: "add database migration"
   - Release
   - **Expected:** Matches database schema patterns, migration scripts

### **Expected Results:**

✅ **Success Criteria:**
- Each query returns 1-3 matched patterns
- Confidence scores shown (e.g., "OAuth2-JWT-001: 96%")
- Pattern descriptions displayed
- Transcription accuracy >85%

❌ **No Patterns Matched (Normal If):**
- Pattern library is empty (ingestion not run)
- Query too specific (try broader terms)
- Supabase connection not configured

---

## 🌐 Test 3: Real-Time Sync (WebSocket)

### **Prerequisites:**

1. WebSocket server running on port 43216
2. Two VS Code windows open

### **Setup Steps:**

1. **Start WebSocket server:**
   ```powershell
   cd crates/aetherlight-core
   cargo run --bin websocket-server
   ```
   **Expected output:**
   ```
   [WebSocket Server] Starting on ws://localhost:43216
   [WebSocket Server] ✅ Listening on port 43216
   ```

2. **Verify server running:**
   ```powershell
   netstat -ano | findstr :43216
   ```
   **Expected:** `TCP    127.0.0.1:43216    LISTENING`

3. **Open second VS Code window:**
   ```powershell
   # From repository root
   code .
   ```

### **Test Steps:**

1. **In Window 1: Make a change**
   - Add a comment to any file:
     ```javascript
     // DESIGN DECISION: Use JWT for authentication
     // WHY: Stateless, scalable, industry standard
     ```
   - Save file (`Ctrl+S`)

2. **In Window 2: Check Activity Feed**
   - Look for Activity Feed panel in sidebar
   - **Expected:** Shows "Design Decision: Use JWT for authentication"
   - **Expected latency:** <100ms

### **Expected Results:**

✅ **Success Criteria:**
- Activity Feed visible in Window 2
- Events sync between windows
- Latency <100ms
- No connection errors

❌ **No Activity Feed Visible:**
- Extension may not be active in Window 2
- Check: `code --list-extensions | grep lumina` in Window 2 terminal

❌ **No Events Received:**
- WebSocket server not running
- Check: `netstat -ano | findstr :43216`

---

## 📊 Test Results Template

### **Test 1: Voice Capture**
- [ ] Backtick (`) activates microphone: **YES / NO**
- [ ] Audio waveform visible: **YES / NO**
- [ ] Transcription appears: **YES / NO**
- [ ] Transcription accuracy: **___%**
- [ ] Output panel shows logs: **YES / NO**
- **Notes:** _____________________

### **Test 2: Pattern Matching**
- [ ] Pattern ingestion complete: **YES / NO**
- [ ] Query 1 matches: **___ patterns**
- [ ] Query 2 matches: **___ patterns**
- [ ] Query 3 matches: **___ patterns**
- [ ] Confidence scores shown: **YES / NO**
- **Notes:** _____________________

### **Test 3: WebSocket Sync**
- [ ] Server starts successfully: **YES / NO**
- [ ] Activity Feed visible: **YES / NO**
- [ ] Events sync between windows: **YES / NO**
- [ ] Latency <100ms: **YES / NO**
- **Notes:** _____________________

---

## 🐛 Issue Reporting Template

If you encounter issues, document them using this template:

```markdown
## Issue: [Brief description]

**Test:** [Test 1, 2, or 3]
**Expected:** [What should happen]
**Actual:** [What actually happened]

**Steps to Reproduce:**
1. Step 1
2. Step 2
3. Step 3

**Error Messages:**
```
[Paste error from Output panel]
```

**Screenshots:** [If applicable]

**Environment:**
- VS Code Version: [Press Ctrl+Shift+P → "About"]
- Extension Version: 0.1.0
- OS: Windows [version]
```

---

## ✅ Success Checklist

After completing all tests, you should have:

- [x] Backtick (`) activates microphone
- [x] Voice transcription works (Whisper.cpp)
- [ ] Pattern matching returns results (if library populated)
- [ ] Quick Send buttons work (ChatGPT, Claude, Cursor)
- [ ] WebSocket server running (real-time sync)
- [ ] 2 VS Code windows syncing events (<100ms)
- [ ] Output Panel shows logs (no errors)
- [ ] Performance targets met (<100ms pattern search)

**If ANY item is ❌, document in TESTING_ISSUES.md**

---

## 🚀 Next Steps

**Immediate:**
1. Complete Test 1 (Voice Capture)
2. Document results in TESTING_ISSUES.md
3. If successful, proceed to Test 2 (Pattern Matching)

**Short-Term:**
1. Ingest CodeSearchNet patterns (412K Python functions)
2. Deploy to team (share .vsix file)
3. Gather feedback (what works, what doesn't)

**Long-Term:**
1. Publish to VS Code Marketplace (after beta testing)
2. Add keyboard capture (Phase 3.10 Terminal Middleware)
3. Mobile app (Phase 5)

---

**Tutorial Version:** 1.0
**Last Updated:** 2025-10-18
**Status:** Ready for testing
**Extension Version:** 0.1.0

---

**Now follow this testing guide step-by-step and let me know what works and what doesn't!** 🎤✨
