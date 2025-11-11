# Sprint 4 (v0.17.0) Pre-Release Checklist

**Version:** 0.17.0
**Release Name:** Key Authorization & Monetization
**Date:** 2025-11-11
**Status:** 🟡 33% Complete (14/43 tasks)

---

## 🎯 Release Scope

### Major Features:
1. ✅ Server-side OpenAI key management (Pattern-MONETIZATION-001)
2. ✅ Token-based pricing system (375 tokens/minute)
3. ✅ Credit tracking and usage limits
4. ✅ Desktop app token integration
5. ✅ BYOK removal from extension
6. ⬜ Website dashboard UI (pending)
7. ⬜ Documentation updates (pending)

### Breaking Changes:
- Extension v0.17.0 requires desktop app v0.17.0
- BYOK model removed (users must use server key)
- OpenAI API key settings deprecated

---

## ✅ PHASE 1: Backend & API (100% COMPLETE)

### Database Schema
- [x] **DB-001:** Credit tracking columns added to profiles table
- [x] **DB-002:** credit_transactions table created
- [x] Migration 007_credit_system.sql deployed
- [x] Migration 008_token_system.sql deployed
- [x] RPC functions: record_token_transaction, check_sufficient_tokens, refresh_monthly_tokens

### API Endpoints
- [x] **API-001:** POST /api/desktop/transcribe (transcription + token deduction)
- [x] **API-001b:** GET /api/tokens/balance (balance check)
- [x] **API-001c:** POST /api/tokens/consume (manual token deduction)
- [x] **API-002:** POST /api/stripe/create-checkout (Stripe integration)
- [x] **API-003:** GET /api/tokens/balance with warnings array
- [x] POST /api/webhooks/stripe (fulfillment)

### Testing
- [x] All endpoints tested with curl
- [x] Test license keys created (CD7W-AJDK-RLQT-LUFA, W7HD-X79Q-CQJ9-XW13)
- [x] Production deployment verified
- [x] RLS policies fixed and tested

**Phase 1 Status:** ✅ **COMPLETE**

---

## ✅ PHASE 2: Desktop App (100% COMPLETE)

### Token Integration
- [x] **DESKTOP-001:** Whisper service proxies through server API
- [x] **DESKTOP-002:** Token balance UI with polling
- [x] **DESKTOP-002b:** License key activation in installation wizard
- [x] **DESKTOP-003:** Credit limit enforcement (pre-flight checks)
- [x] **API-003 Desktop:** Warnings API integration (server-driven)

### Files Modified:
- [x] products/lumina-desktop/src-tauri/src/transcription.rs (+67 lines, warnings structs added)
- [x] products/lumina-desktop/src-tauri/src/main.rs (+49 lines)
- [x] products/lumina-desktop/src/components/VoiceCapture.tsx (+74 lines, warnings UI)
- [x] products/lumina-desktop/src/components/InstallationWizard.tsx (+163 lines)

### Testing Status:
- [x] Compiles without errors (cargo check passed)
- [ ] **MANUAL TEST REQUIRED:** Run desktop app with CD7W-AJDK-RLQT-LUFA
- [ ] **MANUAL TEST REQUIRED:** Verify balance display
- [ ] **MANUAL TEST REQUIRED:** Test transcription + token deduction
- [ ] **MANUAL TEST REQUIRED:** Test warning toasts

**Phase 2 Status:** ✅ **CODE COMPLETE** (Manual testing pending)

---

## ✅ PHASE 3: Extension (100% COMPLETE)

### BYOK Removal
- [x] **EXT-001:** OpenAI API code removed from extension
- [x] transcribeAudioWithWhisper() deleted from voicePanel.ts
- [x] transcribeAudio() deleted from voiceRecorder.ts
- [x] transcribe() deleted from voice-capture.ts
- [x] api.openai.com removed from CSP header

### Settings Deprecation
- [x] aetherlight.openaiApiKey marked [DEPRECATED Sprint 4]
- [x] aetherlight.terminal.voice.autoTranscribe deprecated
- [x] aetherlight.terminal.voice.openaiModel deprecated
- [x] aetherlight.openai.apiKey deprecated
- [x] aetherlight.desktop.whisperModel deprecated
- [x] aetherlight.desktop.offlineMode deprecated

### Compilation
- [x] npm run compile passes (no errors)
- [ ] **MANUAL TEST REQUIRED:** F5 launch in Extension Development Host
- [ ] **MANUAL TEST REQUIRED:** Verify no OpenAI API calls
- [ ] **MANUAL TEST REQUIRED:** Test voice capture (should use desktop app)

**Phase 3 Status:** ✅ **CODE COMPLETE** (Manual testing pending)

---

## ✅ PHASE 4: Website Dashboard (100% COMPLETE)

### UI Components
- [x] **WEB-001:** Credit balance widget on dashboard ✅ DEPLOYED (commit a2576f16)
- [x] **WEB-002:** /dashboard/credits functionality (exists on main dashboard via "Buy Tokens" button)
- [x] Stripe payment form integration (Stripe Checkout Session)
- [x] Transaction history UI (credit_transactions table)
- [x] Usage stats display (tokens balance, usage, tier)

**Phase 4 Status:** ✅ **COMPLETE** (Deployed to production)

**Verification:**
- Production URL: https://aetherlight.dev/dashboard
- Dashboard widget shows: Token balance, usage, tier, minutes remaining
- "Buy Tokens" button opens https://aetherlight.dev/pricing
- Stripe integration working (Checkout Session flow)
- Tested with license key: CD7W-AJDK-RLQT-LUFA

---

## ⬜ PHASE 5: Testing (14% COMPLETE)

### Manual Testing
- [ ] **TEST-001:** End-to-end flow (free tier → paid tier)
  - [ ] Test case 1: New user signs up → $5 credit
  - [ ] Test case 2: User records 833 minutes → $0 balance
  - [ ] Test case 3: Voice disabled at $0 → text input works
  - [ ] Test case 4: User purchases $10 top-up → balance = $10
  - [ ] Test case 5: User upgrades to $24.99/month → 2,083 min/month
  - [ ] Test case 6: Paid user records 2,083 minutes → warnings at 80%, 90%, 95%
  - [ ] Test case 7: Paid user hits 2,083 limit → voice disabled until next month
  - [ ] Test case 8: Monthly reset works (1st of month → usage resets to 0)

### Automated Testing
- [ ] **TEST-002:** Automated API tests for /api/desktop/transcribe
  - [ ] Test: POST without auth → 401
  - [ ] Test: POST with invalid license → 401
  - [ ] Test: POST with $0 credits → 402
  - [ ] Test: POST with valid audio → 200 + transcription
  - [ ] Test: Cost deduction accurate (5 min audio → $0.03 charge)
  - [ ] Test: usage_events logged correctly
  - [ ] Test: credit_transactions logged correctly
  - [ ] Test: OpenAI API error → 500 with clear message
  - [ ] Test: Concurrent requests don't cause race conditions

**Phase 5 Status:** ⬜ **MANUAL TESTING PENDING**

---

## ⬜ PHASE 6: Documentation & Release (0% COMPLETE)

### Documentation Tasks
- [ ] **DOC-001:** Update CHANGELOG.md with v0.17.0 changes
- [ ] **DOC-002:** Update README.md (remove BYOK instructions)
- [ ] **DOC-003:** Create Pattern-MONETIZATION-001.md
- [ ] **DOC-004:** Update agent context files
- [ ] **DOC-005:** Context optimization and refactoring
- [ ] **RELEASE-001:** Create migration guide for existing users

### Quality Assurance
- [ ] **QA-001:** Run ripple analysis for breaking changes
- [ ] **QA-002:** Test coverage audit (85%+ for APIs)
- [ ] **QA-003:** Dependency security audit (npm audit)
- [ ] **QA-004:** Cross-platform testing (Windows/macOS/Linux)

### Agent Synchronization
- [ ] **AGENT-001:** Sync api-agent context with new endpoints
- [ ] **AGENT-002:** Sync infrastructure-agent context with credit system

### Infrastructure
- [ ] **INFRA-001:** Add OPENAI_API_KEY to Vercel environment
- [ ] **INFRA-002:** Validate sprint schema (TOML parsable)

### Configuration
- [ ] **CONFIG-001:** Update extension configuration schema (remove openaiApiKey)

### Publishing
- [ ] **PUB-001:** Pre-publish validation checklist
- [ ] **PUB-002:** Build release artifacts (VSIX, desktop binaries)
- [ ] **PUB-003:** Publish to npm and VS Code Marketplace
- [ ] **PUB-004:** Create GitHub release with release notes
- [ ] **PUB-005:** Deploy website to Vercel

### Retrospective
- [ ] **RETRO-001:** Sprint retrospective
- [ ] **RETRO-002:** Pattern extraction

**Phase 6 Status:** ⬜ **NOT STARTED**

---

## 🚨 Critical Blockers (Must Fix Before Release)

### Blocker 1: Pricing Discrepancy
**Issue:** Code says $12/month, docs say $29.99/month
**File:** PRICING_DISCREPANCY_ISSUE.md
**Status:** ⚠️ **DECISION REQUIRED**
**Options:**
- Option 1: Keep $12/month, update all docs
- Option 2: Change to $24.99/month, update code + notify users
- Option 3: Change to $19.99/month (compromise)

**Recommendation:** Keep $12/month (already deployed, users already paying)
**Action:** Update sprint TOML metadata, API docs, manual test plan

---

### Blocker 2: No Monthly Token Refresh Cron
**Issue:** Pro users won't auto-refresh to 1M tokens monthly
**Workaround:** Manual SQL: `SELECT refresh_monthly_tokens();`
**Permanent Fix:** Set up Vercel Cron or GitHub Actions cron
**Status:** ⚠️ **NOT IMPLEMENTED**
**Impact:** Pro users will run out of tokens and complain

**Action Required:** Create cron job before launch or document manual process

---

### Blocker 3: Manual Testing Not Complete
**Issue:** 25/29 tests in SPRINT_4_MANUAL_TEST_PLAN.md are pending
**Status:** ⚠️ **TESTING INCOMPLETE**
**Impact:** Unknown bugs may exist in production

**Action Required:** Complete manual testing before publishing

---

## 📋 Pre-Release Checklist (Final Steps)

### Code Quality
- [x] Desktop app compiles (0 errors)
- [x] Extension compiles (0 errors)
- [ ] All tests passing (automated tests not written yet)
- [ ] No native dependencies (Pattern-PUBLISH-003 compliant)
- [ ] No runtime npm dependencies (Pattern-PUBLISH-003 compliant)

### Version Sync
- [ ] All 4 packages have same version (0.17.0)
  - [ ] vscode-lumina/package.json
  - [ ] packages/aetherlight-sdk/package.json
  - [ ] packages/aetherlight-analyzer/package.json
  - [ ] packages/aetherlight-node/package.json

### Documentation
- [ ] CHANGELOG.md updated
- [ ] README.md updated (no BYOK instructions)
- [ ] Migration guide created
- [ ] Pattern-MONETIZATION-001 documented

### Security
- [ ] npm audit 0 critical vulnerabilities
- [ ] No secrets in code
- [ ] Environment variables properly configured

### Deployment
- [ ] Website APIs deployed to production ✅
- [ ] Desktop app built for all platforms (Windows, macOS, Linux)
- [ ] Extension VSIX generated
- [ ] GitHub release created

---

## 📊 Release Readiness Score

| Phase | Progress | Blocking? | Status |
|-------|----------|-----------|--------|
| Phase 1: Backend & API | 100% (6/6) | ✅ No | ✅ COMPLETE |
| Phase 2: Desktop App | 100% (4/4) | ⚠️ Testing | ✅ CODE COMPLETE |
| Phase 3: Extension | 100% (1/1) | ⚠️ Testing | ✅ CODE COMPLETE |
| Phase 4: Website UI | 100% (2/2) | ✅ No | ✅ COMPLETE |
| Phase 5: Testing | 14% (4/29) | ✅ **YES** | ⬜ INCOMPLETE |
| Phase 6: Documentation | 0% (0/19) | ✅ **YES** | ⬜ NOT STARTED |

**Overall Progress:** 33% (14/43 tasks)

**Blocking Issues:**
1. 🔴 **CRITICAL:** Documentation not started (CHANGELOG, README, migration guide) - 2.5 hours

**✅ Resolved by Website Team (2025-11-11):**
2. ✅ **RESOLVED:** Monthly token refresh cron - Vercel cron deployed (commit 52cbbd29)
3. ✅ **RESOLVED:** RLS blocking license keys - Service role key fix deployed (commit 29c379e7)
4. ✅ **RESOLVED:** Pricing discrepancy - Code comment updated to $29.99 (commit 8b3c9795)

**Website Team Fixes:**
- ✅ Vercel cron job: `/api/cron/refresh-tokens` (runs 1st of each month)
- ✅ RLS bypass: API now uses service role key for license authentication
- ✅ Pricing docs: Code comment corrected to match production ($29.99/month)
- ✅ All APIs tested and working in production

**Desktop Team Impact:** ✅ NONE - API contract unchanged, existing integration valid

**Estimated Time to Release:**
- ~~Fix pricing code comment~~ ✅ DONE (website team)
- ~~Monthly refresh cron~~ ✅ DONE (website team)
- ~~Fix RLS issues~~ ✅ DONE (website team)
- Documentation: 2.5 hours ⚠️ REQUIRED
- Publishing process: 2-3 hours
- **Total: 4.5-6 hours of work remaining** (was 8-12 hours)

---

## 🎯 Recommended Next Steps

### Immediate (Before Any Release):
1. **Resolve pricing discrepancy** - Update docs to match $12/month code
2. **Complete manual testing** - Run through SPRINT_4_MANUAL_TEST_PLAN.md Phase 2-7
3. **Update CHANGELOG.md** - Document all Sprint 4 changes
4. **Update README.md** - Remove BYOK instructions, add new pricing info
5. **Create migration guide** - Help existing users transition

### Before Public Release:
6. **Set up monthly token refresh cron** - Pro users need auto-refresh
7. **Run security audit** - npm audit, dependency check
8. **Build release artifacts** - Desktop binaries, extension VSIX
9. **Create GitHub release** - v0.17.0 with release notes
10. **Publish to VS Code Marketplace** - After all testing complete

---

## ✅ Definition of Done

v0.17.0 is ready to release when:
- [ ] All Phase 1-3 manual tests pass (29/29)
- [ ] CHANGELOG.md updated
- [ ] README.md updated
- [ ] Migration guide created
- [ ] Pricing discrepancy resolved
- [ ] No critical npm vulnerabilities
- [ ] All 4 packages version-synced
- [ ] Desktop binaries built for Windows/macOS/Linux
- [ ] Extension VSIX generated and tested
- [ ] GitHub release created

**Current Status:** ⬜ **NOT READY** - 8-12 hours of work remaining

**Phase Completion Summary:**
- ✅ Phase 1-4: All code complete and deployed to production
- ⬜ Phase 5: Manual testing pending (can be done post-release)
- ⬜ Phase 6: Documentation not started (BLOCKER)
- 🚨 Monthly refresh cron: Critical blocker (MUST FIX)

---

**Last Updated:** 2025-11-11
**Next Review:** After manual testing complete
**Release Target:** TBD (after all blockers resolved)
