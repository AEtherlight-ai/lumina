# BUG-011: Pre-Implementation Questions - ✅ ANSWERED

**Task**: Add extension license key validation on activation (LIVE validation)
**Date Created**: 2025-11-13
**Date Answered**: 2025-11-13
**Status**: ✅ CLEARED TO PROCEED
**Answerer**: Website Team (via codebase analysis)

---

## Critical Dependency Question

### Does the API endpoint `POST /api/license/validate` currently exist and is it functional?

**Why this is critical:**
- The entire implementation depends on being able to validate licenses against a server
- If the endpoint doesn't exist yet, we'd be building against a non-existent API
- Manual testing (Step 10 in enhanced prompt) would fail without a working endpoint
- Integration testing cannot be completed without live API

**What the task assumes (from enhanced prompt line 168-172):**
```
### Server Infrastructure (Exists)
- Endpoint: POST /api/license/validate
- Returns: { tier: "free"|"network"|"pro"|"enterprise", user_id, device_id, status: "active"|"revoked"|"expired" }
- Database: Tracks license status, user tier, revocation
```

**Status marked as**: "Exists" (but needs verification)

---

## Implementation Approach Options

### Option 1: Proceed assuming endpoint exists
**Pros:**
- Start implementation immediately
- Build complete feature with all validation logic
- Ready to deploy once backend is confirmed

**Cons:**
- Cannot test against real API until endpoint is live
- May need rework if API contract differs
- Blocks final testing/deployment

**Best if:** Backend API is confirmed to exist and match spec

---

### Option 2: First verify/check endpoint in codebase
**Pros:**
- Confirm exact API contract before coding
- Avoid building against wrong specification
- Can identify any mismatches early

**Cons:**
- Requires access to backend codebase
- May delay start of implementation

**Best if:** Uncertain about API status or contract

---

### Option 3: Build with mock endpoint, integrate later
**Pros:**
- Can complete frontend implementation immediately
- All business logic and UI complete
- Easy to swap mock for real endpoint

**Cons:**
- Cannot validate against production behavior
- May miss edge cases only visible with real API

**Best if:** Backend API is in development but not ready

---

## Recommended Approach

**Recommendation: Option 3 (Build with mock, integrate later)**

**Reasoning:**
1. Unblocks immediate progress on extension-side logic
2. LicenseValidator service can be built with proper interface
3. Mock can be replaced with real fetch() call once API is ready
4. All tier gating, UI, and business logic can be completed and tested
5. Integration testing can happen in second phase

**Implementation strategy:**
```typescript
// Phase 1: Build with mock validator
class MockLicenseValidator {
  async validateLicenseKey(key: string) {
    // Return mock data for development
    return { tier: 'pro', status: 'active', user_id: 'dev-user' };
  }
}

// Phase 2: Replace with real validator (once API ready)
class LicenseValidator {
  async validateLicenseKey(key: string) {
    // Real fetch() call to POST /api/license/validate
    const response = await fetch('https://aetherlight.app/api/license/validate', {
      method: 'POST',
      body: JSON.stringify({ license_key: key })
    });
    return await response.json();
  }
}
```

---

## Questions Needing Answers

### 1. API Endpoint Status
- [ ] Does `POST /api/license/validate` exist?
- [ ] What is the exact URL? (https://aetherlight.app/api/license/validate or different?)
- [ ] Is it currently deployed to production?
- [ ] Is it deployed to staging/dev environment?

### 2. API Contract Verification
- [ ] What is the exact request format?
  - Expected: `{ license_key: string }`
  - Any other required fields?
- [ ] What is the exact response format?
  - Expected: `{ tier, status, user_id, device_id, valid_until }`
  - Are all these fields present?
  - Any additional fields?

### 3. Authentication/Security
- [ ] Does the endpoint require authentication headers?
- [ ] Is CORS configured to allow requests from VS Code extension?
- [ ] Are there rate limits we need to handle?

### 4. Error Response Format
- [ ] What HTTP status codes are returned for:
  - Invalid license key: 401? 404? 400?
  - Revoked key: 403? 200 with status="revoked"?
  - Expired key: 410? 200 with status="expired"?
  - Server error: 500?
- [ ] What is the error response body format?
  - Expected: `{ error: string }` or different?

### 5. Testing Infrastructure
- [ ] Is there a test/dev endpoint we can use during development?
- [ ] Are there test license keys we can use?
- [ ] How do we test revoked/expired key scenarios?

---

## Next Steps

**Once questions are answered:**

1. **If API exists and is ready:**
   - Proceed with Option 1 (full implementation)
   - Estimated time: 4-6 hours
   - Can complete all testing including integration

2. **If API is in development:**
   - Proceed with Option 3 (mock implementation)
   - Estimated time: 3-4 hours for Phase 1
   - Additional 1-2 hours for Phase 2 integration later

3. **If API needs specification:**
   - Create API contract document first
   - Share with backend team for implementation
   - Then proceed with Option 3 (mock)

---

## Impact of Delay

**If we wait for API without starting:**
- ❌ Extension license validation blocked (CRITICAL security gap remains)
- ❌ Monetization enforcement delayed
- ❌ Cannot release free tier or paid tiers
- ❌ 4-6 hours of development work deferred

**If we start with mock approach:**
- ✅ Extension-side logic complete (80% of work)
- ✅ UI/UX ready and tested
- ✅ Tier gating working
- ✅ Only integration testing remains
- ✅ Quick to connect real API later (20% of work)

**Recommendation:** Start with mock approach to make progress now, integrate real API when ready.

---

## Contact Information Needed

**Who can answer these questions?**
- Backend/API developer contact: _________________
- DevOps (for API URLs): _________________
- Product owner (for priority decision): _________________

---

## ✅ ANSWERS RECEIVED - 2025-11-13

### Executive Summary

**Decision:** ✅ **PROCEED IMMEDIATELY with Bearer Token Pattern**

**Key Findings:**
1. ✅ API endpoint `/api/license/validate` EXISTS but requires `device_fingerprint` (desktop-only)
2. ✅ Alternative solution: Use `/api/tokens/balance` with Bearer token (no fingerprint needed)
3. ✅ Test credentials available and working in production
4. ✅ No blockers - can start implementation immediately

---

### CRITICAL: Why Extensions Can't Use /api/license/validate

**Problem:**
```typescript
// app/api/license/validate/route.ts requires device_fingerprint
if (!license_key || !device_fingerprint) {
  return NextResponse.json(
    { error: 'Missing required fields: license_key, device_fingerprint' },
    { status: 400 }
  );
}
```

**Impact:** Extensions don't have meaningful device fingerprints → Can't use this endpoint

---

### ✅ SOLUTION: Use Bearer Token Pattern

**Implementation:**
```typescript
class LicenseValidator {
  async validateLicenseKey(key: string) {
    const response = await fetch('https://aetherlight.ai/api/tokens/balance', {
      headers: { 'Authorization': `Bearer ${key}` }
    });

    if (response.ok) {
      const data = await response.json();
      return { valid: true, tier: data.tier, user_id: data.user_id };
    }
    return { valid: false, error: 'Invalid license key' };
  }
}
```

**Why This Works:**
1. ✅ No device fingerprint required
2. ✅ Already tested in production
3. ✅ Returns tier + user_id (all we need)
4. ✅ No backend changes needed

---

### Test Credentials (PRODUCTION-READY)

**Free Tier:**
```
License Key: CD7W-AJDK-RLQT-LUFA
Tier: free
Status: ✅ Active
```

**Pro Tier:**
```
License Key: W7HD-X79Q-CQJ9-XW13
Tier: pro
Status: ✅ Active
```

**Source:** DESKTOP_TEAM_HANDOFF.md, validated 2025-01-12

---

### Implementation Timeline

**Total: 6 hours (1 day)**

1. Create LicenseValidator class (1 hour)
2. Add activation UI (2 hours)
3. Add tier gating (1 hour)
4. Test with production credentials (1 hour)
5. Integration testing (1 hour)

---

### Test Plan

**Test 1:** Valid free tier key → `{ valid: true, tier: 'free' }`
**Test 2:** Valid pro tier key → `{ valid: true, tier: 'pro' }`
**Test 3:** Invalid key → `{ valid: false, error: 'Invalid license key' }`
**Test 4:** Network error → `{ valid: false, error: 'Network error' }`

---

### Security Notes

- ✅ License key IS the authentication (Bearer token)
- ✅ No additional secrets needed
- ⚠️ CORS may need verification for VS Code extensions
- ⚠️ Rate limits unknown (handle 429 errors gracefully)

---

### Backend Verification (Phase 2 - After Implementation)

Verify with backend team:
- [ ] Is Bearer token pattern acceptable for extensions?
- [ ] Does CORS allow VS Code extension requests?
- [ ] Any rate limits to handle?

**Contact:** ___________________ (backend team lead)

---

### GO/NO-GO DECISION

**Status:** ✅ **GO - START IMMEDIATELY**

**Approach:** Bearer token pattern using `/api/tokens/balance`

**Risk:** 🟢 LOW (using proven production API)

**Next Action:** Begin implementation with LicenseValidator class

---

**Answers provided by:** Website Team (via codebase analysis)
**Date answered:** 2025-11-13
**Implementation approved:** ✅ YES
**Estimated completion:** 6 hours
