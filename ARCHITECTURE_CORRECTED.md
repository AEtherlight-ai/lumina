# Architecture Corrected - ACTUAL Voice Transcription Flow

**Date:** 2025-11-09
**Purpose:** Correct my wrong understanding of the architecture

---

## My Mistake

**What I said:** "VS Code Extension captures voice"
**ACTUAL TRUTH:** Desktop app captures voice, VS Code is just UI/task management

---

## ACTUAL Component Roles

### 1. VS Code Extension (vscode-lumina/)

**What it ACTUALLY does:**
- ✅ User interface (webview panels)
- ✅ Task management (sprint view)
- ✅ Pattern matching
- ✅ Context management
- ✅ Shows where cursor is positioned
- ❌ **Does NOT capture voice** (VS Code blocks this)
- ❌ Does NOT handle audio at all

**Key point:** Extension is the "brain" (logic, UI, patterns), NOT the "ears" (audio capture)

### 2. Desktop App (products/lumina-desktop/)

**What it ACTUALLY does:**
- ✅ **Captures audio** when you press hotkey (backtick)
- ✅ **Transcribes audio** (currently calls OpenAI directly with your API key)
- ✅ **Types text at cursor** using OS-level keyboard simulation (Enigo crate)
- ✅ Works globally (anywhere on your system, not just VS Code)

**Key point:** Desktop app is the "ears" and "hands" (audio capture + typing)

### 3. Communication Between Them

**Current architecture:** They DON'T communicate via WebSocket for audio!

**ACTUAL flow:**
1. Desktop app runs independently
2. Desktop app has global hotkey listener (backtick key)
3. Desktop app captures audio when hotkey pressed
4. Desktop app transcribes via OpenAI
5. Desktop app types text wherever your cursor is (ANY app, not just VS Code)

**They might communicate for:**
- Status updates (is desktop app running?)
- Extension tells desktop app where cursor is?
- But NOT for audio data

---

## CORRECTED Architecture Flow

### Current (v0.16.x - BYOK Model) - ACTUAL

```
User presses backtick key anywhere on system
  ↓
┌──────────────────────────────────────────────┐
│ Desktop App (Tauri/Rust)                    │
│ - Running in system tray                    │
│ - Listening for global hotkey               │
│                                              │
│  1. Hotkey detected (backtick)              │
│  2. Start recording audio (microphone)      │  ~1-2s recording
│  3. Convert to WAV format                   │  ~100ms
│  4. Write debug file to disk               │  ~50-200ms ← YOUR SLOWNESS!
│  5. Send to OpenAI Whisper API            │
│                                              │
└──────────────┬───────────────────────────────┘
               │ HTTPS POST
               │ with your OpenAI API key
               ▼
    ┌────────────────────────┐
    │  OpenAI Whisper API    │
    │  api.openai.com        │
    │                        │  ~1-2s processing
    └────────────────────────┘
               │
               │ Returns transcript
               ▼
┌──────────────────────────────────────────────┐
│ Desktop App                                  │
│                                              │
│  6. Receive transcript text                 │
│  7. Use Enigo to type at cursor            │  ~500ms
│     (works in ANY app - VS Code,           │
│      Chrome, Word, etc.)                    │
│                                              │
└──────────────────────────────────────────────┘

Total latency: ~3-5 seconds
- Recording: ~1-2s (you speak)
- Audio processing: ~100ms
- Debug file write: ~50-200ms ← SLOWDOWN CAUSE
- Network to OpenAI: ~500ms
- OpenAI processing: ~1-2s
- Network back: ~500ms
- Type at cursor: ~500ms
```

**Why it's slow:** That debug file write (transcription.rs:149-153) is UNNECESSARY and slows things down when your disk is under pressure.

---

### Proposed (v0.17.0 - Server Proxy) - CORRECTED

```
User presses backtick key anywhere on system
  ↓
┌──────────────────────────────────────────────┐
│ Desktop App (Tauri/Rust)                    │
│ - Running in system tray                    │
│ - Listening for global hotkey               │
│                                              │
│  1. Hotkey detected (backtick)              │
│  2. Start recording audio (microphone)      │  ~1-2s recording
│  3. Convert to WAV format                   │  ~100ms
│  4. [REMOVE debug file write]              │  Save 50-200ms!
│  5. Send to YOUR server (not OpenAI)      │
│     POST /api/desktop/transcribe            │
│     Authorization: Bearer {license_key}     │
│                                              │
└──────────────┬───────────────────────────────┘
               │ HTTPS POST
               │ ~100-300ms (to Vercel Edge)
               ▼
    ┌────────────────────────────────────┐
    │  Vercel (aetherlight.ai)          │
    │  /api/desktop/transcribe          │
    │                                    │
    │  1. Validate license_key          │  ~50ms (cache: 10ms)
    │  2. Check credits balance         │  ~50ms (cache: 10ms)
    │  3. Forward to OpenAI Whisper ────┼───►
    │  4. (Async) Log usage, deduct     │  ~100ms (non-blocking)
    │  5. Return transcript + cost      │
    │                                    │
    └────────────────────────────────────┘
                                        │
                                        │ ~500ms
                                        ▼
                            ┌─────────────────────┐
                            │  OpenAI Whisper API │
                            │  api.openai.com     │
                            │                     │  ~1-2s processing
                            └─────────────────────┘
                                        │
                                        │ Returns transcript
                                        ▼
                            ┌─────────────────────┐
                            │  Vercel             │
                            │  Returns to desktop │
                            └─────────────────────┘
                                        │
                                        │ ~100-300ms
                                        ▼
┌──────────────────────────────────────────────┐
│ Desktop App                                  │
│                                              │
│  6. Receive transcript + cost + balance     │
│  7. Display balance in console              │
│  8. Use Enigo to type at cursor            │  ~500ms
│     (works in ANY app)                      │
│                                              │
└──────────────────────────────────────────────┘

Total latency (optimized): ~3.5-4.5 seconds
- Recording: ~1-2s (you speak)
- Audio processing: ~100ms
- [Debug write removed]: Save 50-200ms!
- Network to Vercel: ~100-300ms (Edge)
- License check (cached): ~10ms
- Credit check (cached): ~10ms
- Network to OpenAI: ~500ms
- OpenAI processing: ~1-2s
- Network back to Vercel: ~500ms
- Network back to desktop: ~100-300ms
- Type at cursor: ~500ms

Overhead added: ~200-600ms (optimized)
Overhead saved: ~50-200ms (remove debug write)
Net change: +0-400ms vs current
```

---

## Your Bugs/Issues Reported

### 1. Performance: "Takes 3-5 seconds, varies with memory"

**Root cause:** Line 149-153 in transcription.rs writes debug file on EVERY transcription
```rust
// DEBUG: Save WAV file to disk for inspection
let debug_path = std::env::temp_dir().join("lumina_debug.wav");
std::fs::write(&debug_path, &wav_bytes)
    .context("Failed to write debug WAV file")?;
println!("🔍 DEBUG: Saved WAV to {:?}", debug_path);
```

**Why it's slow:**
- Disk I/O blocks the transcription
- If your system is low on memory → disk thrashing → 200ms+ delay
- This is DEBUG CODE that shouldn't be in production

**Fix:** Remove these 4 lines
**Savings:** 50-200ms per transcription

### 2. User Experience: "You don't know it's happening, if it fails you don't know"

**Current UX:**
- Press backtick → nothing visible happens
- Wait 3-5 seconds → text appears (or doesn't)
- No feedback during recording
- No error message if failed

**Proposed fixes:**
1. **Visual feedback:** System tray icon changes when recording
2. **Audio feedback:** Beep when recording starts/stops
3. **Error notifications:** Toast/notification if transcription fails
4. **Progress indicator:** Show "Transcribing..." in system tray

### 3. Enhancement: "Store in clipboard if cursor position invalid"

**Current behavior:**
- Desktop app types at cursor position (wherever it is)
- If cursor is in non-typeable location → text is lost

**Proposed behavior:**
```rust
// After typing attempt
match enigo.type_text(&transcript) {
    Ok(_) => {
        println!("✅ Typed at cursor");
    }
    Err(e) => {
        // Fallback: Copy to clipboard
        clipboard::copy_to_clipboard(&transcript)?;
        println!("⚠️  Cursor not in typeable location. Copied to clipboard.");
        show_notification("Transcription copied to clipboard");
    }
}
```

**Bonus:** Always copy to clipboard in addition to typing
```rust
// Copy to clipboard first
clipboard::copy_to_clipboard(&transcript)?;

// Then type at cursor
enigo.type_text(&transcript)?;

println!("✅ Typed at cursor AND copied to clipboard");
```

---

## VS Code Extension Role (Clarified)

**Extension does NOT handle voice capture. It handles:**

1. **Task Management**
   - Sprint view (shows TOML tasks)
   - Task completion tracking
   - Progress visualization

2. **Pattern Matching**
   - Detects code patterns
   - Suggests improvements
   - Prevents hallucinations

3. **Context Management**
   - Workspace analysis
   - File structure understanding
   - Pattern library access

4. **Maybe:** Communication with desktop app
   - Check if desktop app is running
   - Display credit balance from desktop app
   - But NOT audio capture/transcription

---

## Performance Optimization Plan

### Immediate Wins (Desktop App)

1. **Remove debug file write** (transcription.rs:149-153)
   - Savings: 50-200ms
   - Risk: None (it's debug code)
   - Change: Delete 4 lines

2. **Add user feedback**
   - System tray icon animation during recording
   - Beep on start/stop
   - Toast notification on completion/error

3. **Clipboard fallback**
   - Always copy to clipboard
   - Type at cursor if possible
   - Notify user where text went

### Server Proxy Optimizations (If We Proceed)

1. **Remove debug write** (already covered above)
2. **Vercel Edge Functions** (deploy to 100+ locations)
3. **License/credit caching** (60-second TTL)
4. **Async usage logging** (don't block response)

**Net overhead:** ~200-400ms (vs current BYOK)

---

## Decision Time

Before we proceed with server proxy implementation:

1. **Quick fix first:** Remove debug file write?
   - Takes 30 seconds
   - Saves 50-200ms immediately
   - No downside

2. **Measure baseline:** Test current BYOK performance?
   - Add timing logs to measure each step
   - Identify actual bottleneck
   - Then decide on server proxy

3. **Server proxy decision:**
   - Accept +200-400ms overhead for monetization?
   - Or explore Option 3 (direct OpenAI + async telemetry)?

**What would you like to do first?**
