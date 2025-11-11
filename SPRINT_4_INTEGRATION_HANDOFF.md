# Sprint 4 Integration Handoff - Coordination Document

**Date:** 2025-11-11
**Status:** 🟡 Awaiting Website Response → Desktop Integration
**Sprint Progress:** 11/43 tasks complete (26%)

---

## 🎯 Current State

### ✅ What's Complete (Desktop Side)
- Token balance API client (check_token_balance in transcription.rs)
- Pre-flight balance checks (blocks recording if < 375 tokens)
- Token balance UI display (shows tokens + tier)
- Insufficient tokens modal with upgrade button
- Toast warnings at 80%/90%/95% thresholds (CLIENT-SIDE calculated)
- Background polling every 5 minutes
- License key activation in installation wizard
- BYOK OpenAI code removed from extension

### ✅ What's Complete (Website Side)
- GET /api/tokens/balance (returns balance, tier, minutes)
- POST /api/desktop/transcribe (transcription + token deduction)
- POST /api/tokens/consume (manual token deduction)
- POST /api/stripe/create-checkout (Stripe payment flow)
- POST /api/webhooks/stripe (fulfillment)
- Database schema with tokens_balance, credit_transactions
- RPC functions: record_token_transaction, check_sufficient_tokens

### ⚠️ What's Incomplete
- **Warning system:** Desktop calculates warnings CLIENT-SIDE (needs server-side)
- **API-003:** No server endpoint returning warnings array
- **Monthly refresh:** No cron job calling refresh_monthly_tokens()
- **Test keys:** Need verified license keys for E2E testing

---

## 📋 Action Items

### For Website AI Agent (Priority: HIGH)

**Prompt Location:** See "PROMPT FOR WEBSITE REPO AI AGENT" section above

**Tasks:**
1. ✅ Add `warnings` array to GET /api/tokens/balance response
2. ✅ Create POST /api/debug/set-balance endpoint (dev only)
3. ✅ Run scripts/setup-test-data.ts to create test users
4. ✅ Test all 4 scenarios and report results
5. ✅ Provide two test license keys (free + pro tier)

**Deliverables:**
- Updated `app/api/tokens/balance/route.ts` with warnings calculation
- New `app/api/debug/set-balance/route.ts` for testing
- Test results document with request/response examples
- Two working license keys for desktop testing

**Estimated Time:** 2-3 hours

**Status:** 🔴 **NOT STARTED** - Waiting for website AI agent to begin

---

### For Desktop AI Agent (Priority: BLOCKED)

**Prompt Location:** See "Prompt for Desktop Repo AI Agent" section above

**Prerequisites:**
- ✅ Website completes Task 1 (warnings API)
- ✅ Website provides test license keys

**Tasks:**
1. Update BalanceResponse struct to include `warnings: Vec<Warning>`
2. Remove client-side warning calculation logic
3. Update UI to display server warnings
4. Test with provided license key (CD7W-AJDK-RLQT-LUFA or updated)
5. Verify 402 error handling works

**Deliverables:**
- Updated Rust structs for new API response
- Removed client-side calculate_warnings() function
- UI displays warnings from server
- Test results using real license keys

**Estimated Time:** 1-2 hours

**Status:** 🟡 **BLOCKED** - Waiting for website test keys

---

## 🔑 Test Credentials (From Website)

### Free Tier Test Account
```
Email: test-free@aetherlight.dev
Password: test-password-123
License Key: CD7W-AJDK-RLQT-LUFA
Balance: 250,000 tokens (~666 minutes)
Tier: free
```

### Pro Tier Test Account
```
Email: test-pro@aetherlight.dev
Password: test-password-456
License Key: W7HD-X79Q-CQJ9-XW13
Balance: 250,000 tokens (needs manual upgrade to pro)
Tier: free (should be 'pro' with 1M tokens)
```

**⚠️ Note:** Pro user exists but not upgraded yet. Website AI needs to fix this.

---

## 🧪 Testing Flow

### Phase 1: Website Completes API Enhancement (2-3 hours)
1. Website AI adds warnings to balance endpoint
2. Website AI creates debug endpoint
3. Website AI runs test suite and provides results
4. Website AI confirms license keys work

### Phase 2: Desktop Integrates Warnings (1-2 hours)
1. Desktop AI updates response structs
2. Desktop AI removes client-side warning logic
3. Desktop AI updates UI to show server warnings
4. Desktop AI tests with license keys from Phase 1

### Phase 3: E2E Manual Testing (4-6 hours)
1. User tests full flow with real license keys
2. User verifies warnings appear at correct thresholds
3. User tests 402 error handling
4. User tests token deduction accuracy
5. User completes SPRINT_4_MANUAL_TEST_PLAN.md Phase 2-4

---

## 📊 Dependencies Graph

```
Website Tasks (API-003)
    ↓
Website Provides Test Keys
    ↓
Desktop Updates Structs
    ↓
Desktop Removes Client Logic
    ↓
Desktop Tests with Keys
    ↓
Manual E2E Testing
    ↓
Sprint 4 Complete
```

**Current Bottleneck:** Website API-003 task (warnings endpoint)

---

## 🚨 Critical Issues to Resolve

### Issue 1: Pricing Discrepancy
**Problem:** Code says $12/month, docs say $29.99/month
**Document:** PRICING_DISCREPANCY_ISSUE.md
**Decision Needed:** User must choose which price to use
**Recommendation:** Keep $12/month, update docs
**Impact:** Blocks marketing/release announcements

### Issue 2: No Monthly Token Refresh
**Problem:** Pro users won't auto-refresh to 1M tokens on 1st of month
**Temporary Fix:** Manual SQL query
**Permanent Fix:** Set up Vercel Cron or Edge Function
**Impact:** Pro users will run out of tokens and complain

### Issue 3: Warning System Not Server-Side
**Problem:** Desktop calculates warnings locally (duplicate logic)
**Solution:** Website AI Task 1 (add warnings to API response)
**Impact:** Blocks consistent warning UX across clients

---

## 📞 Communication Protocol

### When Website AI Completes Tasks:
User should provide response with:
1. ✅ Confirmation: "Task 1-4 complete"
2. 📄 Test results document
3. 🔑 Two working license keys (copy/paste ready)
4. 🔗 Links to modified files (for verification)

### When Desktop AI Completes Tasks:
Desktop AI should report:
1. ✅ Confirmation: "Integration complete"
2. 📸 Screenshots of warnings in UI
3. 🧪 Test results using provided license keys
4. ⚠️ Any issues encountered

---

## 📚 Reference Documents

### In This Repo:
- **SPRINT_4_MANUAL_TEST_PLAN.md** - Manual testing checklist
- **API_ENDPOINTS_v0.17.0.md** - API specifications
- **PRICING_DISCREPANCY_ISSUE.md** - Pricing issue analysis
- **internal/sprints/ACTIVE_SPRINT_KEY_AUTHORIZATION.toml** - Sprint tasks

### Expected from Website Repo:
- **DESKTOP_INTEGRATION_HANDOFF.md** - Complete guide (provided above)
- **API_TESTING_RESULTS.md** - Test results with examples
- **scripts/setup-test-data.ts** - Test user creation script
- **app/api/tokens/balance/route.ts** - Updated with warnings
- **app/api/debug/set-balance/route.ts** - Debug endpoint

---

## ✅ Acceptance Criteria

### Website Tasks Complete When:
- [ ] GET /api/tokens/balance returns `warnings` array
- [ ] POST /api/debug/set-balance works locally
- [ ] Test users exist with working license keys
- [ ] All 4 test scenarios pass (documented)
- [ ] Desktop team has verified license keys

### Desktop Tasks Complete When:
- [ ] Structs updated to parse `warnings` array
- [ ] Client-side warning calculation removed
- [ ] UI displays warnings from server
- [ ] Works with provided license keys
- [ ] 402 error handling verified

### Sprint 4 Complete When:
- [ ] All 11/43 tasks verified complete
- [ ] Manual testing Phase 2-4 passed
- [ ] Pricing discrepancy resolved
- [ ] Documentation updated
- [ ] No critical bugs blocking release

---

## 🎯 Next Steps (Immediate)

1. **User:** Copy website prompt to website AI agent
2. **Website AI:** Complete 4 tasks (2-3 hours)
3. **Website AI:** Reply with test results + license keys
4. **User:** Forward license keys to desktop AI agent
5. **Desktop AI:** Complete integration (1-2 hours)
6. **User:** Run manual E2E tests

---

**Current Status:** 🔴 Waiting for website AI to start Task 1-4

**Blocker:** None - Website has all information needed to proceed

**ETA:** Website 2-3 hours → Desktop 1-2 hours → Testing 4-6 hours = **8-11 hours total**

---

**Last Updated:** 2025-11-11
**Coordinator:** Sprint 4 Integration Team
**Contact:** See user for questions/clarifications
