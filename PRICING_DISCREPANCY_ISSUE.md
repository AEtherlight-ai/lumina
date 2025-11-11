# Pricing Discrepancy Issue - Sprint 4 (v0.17.0)

**Status:** 🔴 CRITICAL - Pricing mismatch between code and documentation
**Discovered:** 2025-11-11 during sprint status audit
**Priority:** HIGH - Must resolve before v0.17.0 release

---

## The Discrepancy

### Code Says:
**Source:** `website/lib/stripe/config.ts:43`
```typescript
export const PRICING = {
  pro: {
    monthly: {
      priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY || '',
      amount: 12.00,  // ← $12/month
      currency: 'usd',
      interval: 'month',
      tokens: 1_000_000
    }
  }
}
```

### Documentation Says:
**Sources:**
- Sprint TOML metadata line 43: `paid_tier_price = 24.99`
- API_ENDPOINTS_v0.17.0.md: "$29.99/month"
- SPRINT_4_MANUAL_TEST_PLAN.md: "$24.99/month" (inconsistent even within docs)

---

## Impact Analysis

### What's Actually Deployed:
- Stripe checkout sessions use **$12/month** (from config.ts)
- Users are being charged **$12/month** in production
- Webhooks fulfill at **$12/month** pricing

### What We're Advertising:
- Documentation claims **$24.99/month** or **$29.99/month**
- Marketing materials likely based on docs
- User expectations set by higher price

### Legal/Financial Risk:
- ✅ **LOW RISK:** We're charging LESS than advertised
- ✅ No refunds needed (users got better deal)
- ⚠️ **But:** Inconsistent pricing confuses users
- ⚠️ **But:** Revenue lower than projected

---

## Which Price is Correct?

### Option 1: Keep $12/month (current code)
**Pros:**
- Already deployed and working
- No code changes needed
- Users already paying this
- Competitive pricing vs alternatives

**Cons:**
- Lower revenue than planned
- Need to update ALL documentation
- Sprint planning based on wrong number

### Option 2: Change to $24.99/month (original plan)
**Pros:**
- Matches documentation
- Higher revenue per user
- Sprint budget projections accurate

**Cons:**
- Requires Stripe price update
- Need to notify existing users
- Possible user backlash (price increase)
- Code changes in config.ts

### Option 3: Split the difference ($19.99/month)
**Pros:**
- Middle ground
- Still competitive
- Better than $12, less jarring than $29.99

**Cons:**
- Still requires code + doc changes
- Still requires user notification

---

## Recommendation

**Decision:** Keep **$12/month** and update documentation

**Reasoning:**
1. Already deployed in production
2. Users already paying $12 (no surprise bills)
3. Competitive advantage (lower price = more signups)
4. Easier fix (docs only, no code changes)
5. Can always raise price later with proper notice

**Action Items:**
1. Update sprint TOML metadata line 43: `paid_tier_price = 12.00`
2. Update API_ENDPOINTS_v0.17.0.md
3. Update SPRINT_4_MANUAL_TEST_PLAN.md
4. Update marketing materials (if any)
5. Update pricing page on website
6. Add pricing to CHANGELOG.md: "Pro tier: $12/month"

---

## Token Purchase Pricing (Separate Issue)

**Current:** $24.99 one-time → 1,000,000 tokens (never expires)

**Question:** Is this intentional that one-time purchase is MORE expensive than monthly subscription?
- Monthly: $12/month = 1M tokens/month = $0.012 per 1k tokens (recurring)
- One-time: $24.99 = 1M tokens = $0.025 per 1k tokens (permanent)

**Analysis:**
- ✅ Makes sense: One-time tokens never expire (premium for permanence)
- ✅ Encourages subscription model (better long-term revenue)
- ✅ Users who want commitment-free pay premium

**Verdict:** Token purchase pricing looks correct

---

## Files to Update (if keeping $12/month)

1. `internal/sprints/ACTIVE_SPRINT_KEY_AUTHORIZATION.toml` - Line 43
2. `docs/API_ENDPOINTS_v0.17.0.md` - All mentions of $29.99 or $24.99
3. `SPRINT_4_MANUAL_TEST_PLAN.md` - Pricing reference table
4. Any marketing materials (not in repo)
5. Website pricing page (if it exists)

---

## Decision Required

**User must decide:**
- [ ] Option 1: Keep $12/month (update docs)
- [ ] Option 2: Change to $24.99/month (update code + notify users)
- [ ] Option 3: Change to $19.99/month (compromise)
- [ ] Option 4: Other price point

**Once decided, assign to appropriate task:**
- If keeping $12: Assign to DOC-001 (documentation update)
- If changing price: Create new task STRIPE-001 (pricing update)

---

**Document Created:** 2025-11-11
**Author:** Sprint 4 Audit Process
**Status:** Awaiting user decision
