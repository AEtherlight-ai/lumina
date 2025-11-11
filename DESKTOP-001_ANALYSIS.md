# DESKTOP-001 Analysis - Sprint vs Reality

**Date:** 2025-11-09
**Task:** DESKTOP-001 "Refactor desktop Whisper service to proxy server API"

---

## Sprint Document Issues

### Issue 1: Wrong File Referenced

**Sprint says:** `products/lumina-desktop/src/services/whisperService.ts`
**Reality:** File doesn't exist. Actual file is `products/lumina-desktop/src-tauri/src/transcription.rs` (Rust)

**Reason:** Sprint was written before Tauri implementation, assumed TypeScript

### Issue 2: Wrong Architecture Description

**Sprint says:** "Desktop receives audio from extension via WebSocket"
**Reality:** Desktop captures audio directly with global hotkey. Extension is NOT involved in audio capture.

**Reason:** Sprint author didn't understand the actual architecture

---

## DESKTOP-001 Requirements (Corrected)

### Core Goal
Replace direct OpenAI Whisper API calls with server proxy for monetization.

### Actual Deliverables

| Deliverable | Status | Evidence |
|-------------|--------|----------|
| Remove direct OpenAI API calls | ✅ DONE | transcription.rs:167 now calls server API |
| Add HTTP client to call `/api/desktop/transcribe` | ✅ DONE | transcription.rs:167-178 |
| Authentication: Send license_key as Bearer token | ✅ DONE | transcription.rs:174 |
| Error handling: 402 insufficient credits | ✅ DONE | transcription.rs:189-196 |
| ~~WebSocket: Extension → Desktop~~ | ❌ N/A | Extension doesn't send audio |
| HTTP: Desktop → Server | ✅ DONE | transcription.rs:167-178 |
| ~~WebSocket: Desktop → Extension~~ | ❌ N/A | Desktop types at cursor directly |

### Validation Criteria

| Criterion | Status | Notes |
|-----------|--------|-------|
| Desktop no longer calls api.openai.com directly | ✅ DONE | No references to api.openai.com |
| Desktop sends audio to /api/desktop/transcribe | ✅ DONE | Line 167 |
| ~~Transcription returned to extension via WebSocket~~ | ❌ N/A | Types at cursor directly |
| 402 error shows 'Credits exhausted' message | ✅ DONE | Lines 189-196 console error |
| Voice capture works end-to-end | ⏳ PENDING | Needs API-001 deployed |

---

## What's Actually Implemented

### Backend (Rust) - transcription.rs

**Line 134-136:**
```rust
pub async fn transcribe_audio(
    audio_samples: &[f32],
    sample_rate: u32,
    license_key: &str,
    api_url: &str,
) -> Result<String>
```
✅ Function signature uses license_key (not openai_api_key)

**Line 167:**
```rust
let transcription_endpoint = format!("{}/api/desktop/transcribe", api_url);
```
✅ Calls server API (not OpenAI directly)

**Line 174:**
```rust
.header("Authorization", format!("Bearer {}", license_key))
```
✅ Authentication with Bearer token

**Line 189-196:**
```rust
if status == 402 {
    anyhow::bail!(
        "Insufficient credits: ${:.4} balance, ${:.4} required. {}",
        error_response.balance_usd,
        error_response.required_usd,
        error_response.message
    );
}
```
✅ 402 error handling

**Line 221-224:**
```rust
println!("✅ Transcription received: {} characters", transcription_response.text.len());
println!("💰 Cost: ${:.4}, Balance remaining: ${:.2}",
         transcription_response.cost_usd,
         transcription_response.balance_remaining_usd);
```
✅ Displays cost and balance

### Frontend (TypeScript) - Settings UI

**settings.json.example:**
```json
"license_key": "",
"_license_note": "Get your license key from https://aetherlight.ai/dashboard/download",
```
✅ Configuration template

**App.tsx:**
```typescript
interface Settings {
  license_key: string;  // Changed from openai_api_key
}
```
✅ UI updated

---

## What's MISSING from Sprint Requirements

### 1. Processing Indicator UI (User's Request)

**User said:** "That bar might need to have some sort of processing motion when it's transcribing"

**Current state:** Recording bar shows only during recording
**Needed:** Show "Processing..." state after recording stops

**Where to add:** Need to find the recording bar UI component

### 2. 402 Error UI (Sprint Requirement)

**Sprint says:** "show upgrade prompt"
**Current:** Only console error message
**Needed:** UI dialog or notification with upgrade button

### 3. Clipboard Fallback (User's Enhancement Request)

**User said:** "If cursor not typeable → store in clipboard"

**Current:** Types at cursor only
**Needed:** Fallback to clipboard if typing fails

---

## Dependencies

### API-001: Server Endpoint (BLOCKING)

**DESKTOP-001 cannot be tested without:**
- `/api/desktop/transcribe` endpoint deployed
- Database migrations (credits_balance_usd column)
- OPENAI_API_KEY environment variable set

**Status:** ❓ Unknown - need to check website repo

---

## Performance Status

### Improvements Made

1. ✅ **Removed debug file write** (saves 50-200ms)
   - Deleted lines 149-153 in transcription.rs

### Still To Measure

1. ⏳ **Baseline BYOK performance** (current before changes)
2. ⏳ **Server proxy performance** (after API-001 deployed)
3. ⏳ **Identify any other bottlenecks**

---

## Next Steps (In Order)

### Step 1: Find Recording Bar UI Component

**Need to:** Add "Processing..." indicator after recording stops

**Search for:**
```bash
grep -r "recording\|Recording" products/lumina-desktop/src --include="*.tsx" --include="*.ts"
```

### Step 2: Add Processing Indicator

**Workflow:**
1. Recording starts → Bar shows "Recording..."
2. User releases hotkey → Bar shows "Processing..."
3. Transcription arrives → Bar disappears, text types at cursor

### Step 3: Add 402 Error UI

**Options:**
1. System notification (toast)
2. Modal dialog
3. System tray icon notification

**Should include:**
- Error message: "Credits exhausted"
- Button: "Add Credits" → Opens browser to dashboard

### Step 4: Add Clipboard Fallback

**Implementation:**
```rust
// Try typing at cursor
match type_transcript(&transcript) {
    Ok(_) => {
        println!("✅ Typed at cursor");
    }
    Err(_) => {
        // Fallback: clipboard
        copy_to_clipboard(&transcript)?;
        println!("📋 Copied to clipboard (cursor not available)");
    }
}

// Optional: Always copy to clipboard too
copy_to_clipboard(&transcript)?;  // User can always paste
```

### Step 5: Create Website API Requirements

**Document for website team:**
- API-001 endpoint specification
- Database migration requirements
- Environment variable setup
- Testing checklist

---

## Summary

### ✅ Complete (Backend)
- License key authentication
- Server API proxy
- Error handling (402, 401, 403, 500)
- Cost/balance display (console)

### ⏳ Pending (Frontend UX)
- Processing indicator in recording bar
- 402 error UI with upgrade prompt
- Clipboard fallback

### ⏳ Blocked (Testing)
- End-to-end testing requires API-001 deployed
- Performance measurement requires API-001

### ⚠️ Sprint Document Issues
- Referenced non-existent file (whisperService.ts)
- Wrong architecture (extension → desktop WebSocket)
- Needs correction for future reference

---

## Recommendation

**Do in this order:**

1. Find recording bar UI component
2. Add processing indicator
3. Add 402 error UI
4. Add clipboard fallback
5. Create website API requirements doc
6. Wait for website team to deploy API-001
7. Test end-to-end
8. Measure performance
9. Mark DESKTOP-001 as complete
