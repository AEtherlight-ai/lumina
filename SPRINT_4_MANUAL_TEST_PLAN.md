# Sprint 4 Manual Test Plan - Key Authorization & Monetization (v0.17.0)

**Sprint:** Sprint 4 Key Authorization & Monetization
**Version:** v0.17.0
**Branch:** feature/key-authorization
**Test Date:** 2025-11-11
**Status:** 🟡 In Progress (4/29 tests complete)
**Sprint Progress:** 11/43 tasks complete (26%)
**Tester:** [Your Name]

**API Endpoints Deployed:**
- ✅ GET /api/tokens/balance (API-001b)
- ✅ POST /api/desktop/transcribe (API-001)
- ✅ POST /api/tokens/consume (API-001c)
- ✅ POST /api/stripe/create-checkout (API-002 - Stripe Checkout flow)
- ✅ POST /api/webhooks/stripe (API-002 - fulfillment)
- ⬜ GET /api/tokens/status (API-003 - warning system NOT implemented)

**Base URL:** https://aetherlight-aelors-projects.vercel.app

---

## Test Environment

**Prerequisites:**
- [ ] Website APIs deployed (https://aetherlight-aelors-projects.vercel.app)
- [ ] Desktop app compiled
- [ ] Extension compiled (`npm run compile`)
- [ ] Test license keys available (free + pro tier)

**Test Accounts:**
- Free tier: [INSERT LICENSE KEY]
- Pro tier: [INSERT LICENSE KEY]

---

## Phase 1: API Tests (BLOCKING)

### Test 1.1: Token Balance API - Invalid Key
**Task:** API-001
**Status:** ✅ PASS (2025-11-11)

```bash
$ curl -X GET "https://aetherlight-aelors-projects.vercel.app/api/tokens/balance" \
  -H "Authorization: Bearer test-invalid-key"
HTTP 401: {"error":"Invalid license key"}
```

### Test 1.2: Token Balance API - Valid Key
**Task:** API-001
**Status:** ⬜ Pending (requires valid license key)

**Steps:**
1. Get valid license key
2. Run: `curl -X GET "https://aetherlight-aelors-projects.vercel.app/api/tokens/balance" -H "Authorization: Bearer [KEY]"`

**Expected:** HTTP 200, returns `{tokens_balance, tokens_used_this_month, subscription_tier, minutes_remaining}`

### Test 1.3: Transcribe API - Endpoint Exists
**Task:** API-001
**Status:** ✅ PASS (2025-11-11)

```bash
$ curl https://aetherlight-aelors-projects.vercel.app/api/desktop/transcribe
HTTP 200: Returns pricing metadata (tokens_per_minute: 375, limits, formats)
```

### Test 1.4: Transcribe API - Valid Audio
**Task:** API-001
**Status:** ⬜ Pending (requires valid license key + audio file)

**Steps:**
1. Create test audio (10 sec WAV)
2. POST to `/api/desktop/transcribe` with license key
3. Verify response: `{text, cost_usd, balance_remaining_usd}`
4. Verify tokens deducted (~62 tokens for 10 sec)

---

## Phase 2: Desktop App Tests

### Test 2.1: Installation Wizard - License Activation Step
**Task:** DESKTOP-002b
**Status:** ⬜ Pending

**Steps:**
1. Delete settings: `rm settings.json`
2. Launch desktop app
3. Go through wizard

**Expected:**
- [ ] "Activate Your Device" step appears
- [ ] Sign Up button → https://aetherlight.dev/signup
- [ ] Sign In button → https://aetherlight.dev/signin
- [ ] License key input + validation
- [ ] Invalid key shows error
- [ ] Valid key proceeds to next step

### Test 2.2: Token Balance Display
**Task:** DESKTOP-002
**Status:** ⬜ Pending

**Expected:**
- [ ] Balance shows after activation (e.g., "5,000 tokens")
- [ ] NO minutes display (tokens only)
- [ ] Balance loads on startup
- [ ] Balance updates every 5 minutes (background poll)

### Test 2.3: Pre-Flight Balance Check
**Task:** DESKTOP-001
**Status:** ⬜ Pending

**Steps:**
1. Set balance < 375 tokens
2. Press Shift+~ to record

**Expected:**
- [ ] Recording does NOT start
- [ ] Modal: "Insufficient tokens"
- [ ] Shows current balance, minimum required (375)
- [ ] "Get More Tokens" button present

### Test 2.4: Transcription + Token Deduction
**Task:** DESKTOP-001
**Status:** ⬜ Pending

**Steps:**
1. Note starting balance
2. Record 10 sec audio (Shift+~)
3. Check balance after transcription

**Expected:**
- [ ] Transcription completes
- [ ] Text typed at cursor
- [ ] Balance decreased ~62 tokens (10 sec * 6 tokens/sec)
- [ ] Console: "Cost: X tokens, Balance: Y tokens"
- [ ] UI balance updates immediately

### Test 2.5: Background Polling (5 min)
**Task:** DESKTOP-002
**Status:** ⬜ Pending

**Steps:**
1. Open desktop app
2. Wait 5 minutes
3. Check console logs

**Expected:**
- [ ] Log every 5 min: "📊 Checking token balance..."
- [ ] Log: "✅ Balance: X tokens"
- [ ] UI updates automatically
- [ ] No errors if API unreachable

### Test 2.6: Low Balance Warnings
**Task:** DESKTOP-002c
**Status:** ⬜ Pending

**Free tier (5000 starting):**
- 80%: 1000 remaining → Yellow toast
- 90%: 500 remaining → Orange toast
- 95%: 250 remaining → Red toast

**Steps:**
1. Set balance to 1000 tokens
2. Reload app

**Expected 80%:**
- [ ] Yellow toast (#fbbf24)
- [ ] Message: "⚠️ Low balance: Only 1,000 tokens left (~2 minutes)"
- [ ] Auto-dismiss after 10 sec

**Expected 90%:**
- [ ] Orange toast (#f59e0b)
- [ ] Message: "⚠️ Very low balance: Only 500 tokens left (~1 minute)"

**Expected 95%:**
- [ ] Red toast (#dc2626)
- [ ] Message: "⚠️ Critical: Only 250 tokens left!"

**Threshold tracking:**
- [ ] Only ONE warning per threshold (no duplicates)
- [ ] After 80% warning dismissed, 90% can still appear

### Test 2.7: Insufficient Tokens Modal
**Task:** DESKTOP-001
**Status:** ⬜ Pending

**Steps:**
1. Set balance to 0
2. Press Shift+~ to record

**Expected:**
- [ ] Recording blocked
- [ ] Modal: "Insufficient Tokens"
- [ ] Message: "Need 375 tokens (1 minute) to record"
- [ ] Shows current balance: "0 tokens"
- [ ] "Get More Tokens" button → https://aetherlight.dev/pricing

---

## Phase 3: Extension Tests

### Test 3.1: Extension Compiles
**Task:** EXT-001
**Status:** ✅ PASS (2025-11-11)

```bash
$ cd vscode-lumina && npm run compile
✅ No TypeScript errors
```

### Test 3.2: No OpenAI API Calls
**Task:** EXT-001
**Status:** ⬜ Pending (requires VS Code runtime)

**Steps:**
1. Open VS Code with extension
2. Open DevTools → Network tab
3. Attempt voice features

**Expected:**
- [ ] NO requests to api.openai.com
- [ ] All transcription via desktop app
- [ ] Deprecated functions throw clear errors

### Test 3.3: Deprecated Settings Show Warnings
**Task:** EXT-001
**Status:** ⬜ Pending

**Steps:**
1. Open VS Code Settings (Ctrl+,)
2. Search: `aetherlight.openaiApiKey`

**Expected:**
- [ ] Shows `[DEPRECATED Sprint 4]` in description
- [ ] Deprecation message: "Use desktop app for transcription"
- [ ] Settings: openaiApiKey, terminal.voice.autoTranscribe, openai.apiKey, desktop.whisperModel, desktop.offlineMode

---

## Phase 4: E2E Tests

### Test 4.1: New User Onboarding (Free Tier)
**Status:** ⬜ Pending

**Steps:**
1. Sign up at https://aetherlight.dev/signup
2. Get license key
3. Install desktop app
4. Activate device
5. Record first transcription

**Expected:**
- [ ] Signup successful
- [ ] License key generated
- [ ] Wizard activation works
- [ ] Free tier: 5000 tokens granted
- [ ] First transcription succeeds
- [ ] Tokens deducted correctly
- [ ] Balance updates in UI

### Test 4.2: Credit Exhaustion
**Status:** ⬜ Pending

**Steps:**
1. Account with ~400 tokens
2. Try 2-minute recording (750 tokens needed)

**Expected:**
- [ ] Pre-flight check blocks recording
- [ ] Modal: "Insufficient tokens"
- [ ] Error: "Need 750 tokens, you have 400"
- [ ] "Get More Tokens" button
- [ ] Text input still works (fallback)

### Test 4.3: Pro Tier Usage
**Status:** ⬜ Pending

**Steps:**
1. Upgrade to Pro (**$12/month** per code, ~~$24.99~~ per docs - see PRICING_DISCREPANCY_ISSUE.md)
2. Check balance
3. Record transcription

**Expected:**
- [ ] Pro tier: 1,000,000 tokens (~2667 minutes)
- [ ] subscription_tier: "pro"
- [ ] Transcriptions deduct correctly
- [ ] Monthly reset behavior works

**⚠️ PRICING NOTE:** Production Stripe uses $12/month, not $24.99. User decision required.

---

## Phase 5: Error Handling

### Test 5.1: Invalid License Key
**Status:** ⬜ Pending

**Expected:**
- [ ] Activation fails
- [ ] Error: "Invalid license key"
- [ ] Can retry without restart
- [ ] API returns 401

### Test 5.2: API Offline
**Status:** ⬜ Pending

**Steps:**
1. Disconnect internet
2. Try recording

**Expected:**
- [ ] Error: "Failed to check balance: Network error"
- [ ] No crash
- [ ] Can retry when connected
- [ ] Cached balance shown (if available)

### Test 5.3: OpenAI API Error
**Status:** ⬜ Pending (server-side test)

**Expected:**
- [ ] Error shown to user
- [ ] NO token deduction (rollback)
- [ ] Error logged server-side
- [ ] Can retry

---

## Phase 6: Performance

### Test 6.1: Balance Check Latency
**Status:** ⬜ Pending

**Expected:**
- [ ] Initial load: < 2 sec
- [ ] Background poll: < 1 sec
- [ ] No UI freeze

### Test 6.2: Toast Visibility
**Status:** ⬜ Pending

**Expected:**
- [ ] Toast in top-right
- [ ] Colors clear (Yellow/Orange/Red)
- [ ] Text readable
- [ ] Doesn't block UI
- [ ] Auto-dismiss works
- [ ] Dismiss button (×) works

### Test 6.3: Real-Time Balance Updates
**Status:** ⬜ Pending

**Expected:**
- [ ] Balance updates < 1 sec after transcription
- [ ] No refresh needed
- [ ] Change visually obvious

---

## Phase 7: Regression

### Test 7.1: Desktop Features Still Work
**Task:** Regression
**Status:** ✅ PASS (2025-11-11)

```bash
$ cd products/lumina-desktop/src-tauri && cargo check
Finished (29 warnings, 0 errors)
```

**Runtime tests pending:**
- [ ] Settings panel works
- [ ] Installation wizard (non-license steps)
- [ ] System tray
- [ ] Window minimize/restore

### Test 7.2: Extension Features Still Work
**Status:** ⬜ Pending

**Expected:**
- [ ] Sprint Panel works
- [ ] Pattern matching works
- [ ] Command palette works
- [ ] Settings work

---

## Test Summary

**Total:** 29 tests
**Passed:** 4 (API endpoints, compilation)
**Failed:** 0
**Pending:** 25 (require running desktop app / manual verification)

**Completion:** 14% (4/29)

---

## Critical Issues

| # | Test | Severity | Description | Status |
|---|------|----------|-------------|--------|
| - | -    | -        | -           | -      |

---

## Tester Sign-Off

**Tester:** _____________________
**Date:** _____________________
**Approved:** ⬜ Yes / ⬜ No

---

## Pattern References

- Pattern-MONETIZATION-001: Server-Side Key Management
- Pattern-TDD-001: Test-Driven Development Ratchet
- Pattern-UX-001: Real-Time Feedback (<100ms)
