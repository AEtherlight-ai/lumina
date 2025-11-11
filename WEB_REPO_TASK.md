# Tasks for Lumina Web App

## Context
The Supabase database migration 007 (credit tracking system) has been successfully applied. All database tables, columns, and functions are now live in production.

## Immediate Action Required

### 1. Add OpenAI API Key (BLOCKING - Required Now)

**File:** `.env.local`

**Add this line:**
```bash
OPENAI_API_KEY=sk-proj-YOUR_OPENAI_KEY_HERE
```

**Where to get the key:**
- Go to: https://platform.openai.com/api-keys
- Create new key or use existing
- Copy the key (starts with `sk-proj-` or `sk-`)

**Why this is needed:**
- The `/api/desktop/transcribe` endpoint is already implemented
- It calls OpenAI Whisper API using this environment variable
- Without this key, desktop app transcription won't work

---

## Database Migration Status

✅ **Already Applied to Supabase:**

**Migration 001:** Initial schema (profiles, subscriptions, devices, invitations, knowledge_pools)
**Migration 002:** License system
**Migration 003:** Usage events tracking
**Migration 004:** Patterns metadata
**Migration 005:** Feedback system
**Migration 006:** Realtime connection status
**Migration 007:** Credit tracking system (NEW)

**Migration 007 added:**
- Table: `credit_transactions` (audit log of all credit changes)
- Columns on `profiles`: `credits_balance_usd`, `monthly_usage_minutes`, `last_usage_reset_at`, `monthly_limit_minutes`, `feature_flags`
- Columns on `usage_events`: `cost_usd`, `duration_seconds`
- Functions: `record_credit_transaction()`, `check_sufficient_credits()`, `calculate_whisper_cost()`
- **All existing users received $5 free credit**

---

## What's Already Implemented (No Code Changes Needed)

✅ Credit checking endpoint: `/api/desktop/transcribe`
  - File: `app/api/desktop/transcribe/route.ts`
  - Lines 134-161: Credit balance check
  - Lines 268-355: Credit deduction using `record_credit_transaction()`
  - Returns: `{ text, cost_usd, balance_remaining_usd, duration_seconds }`

---

## What Might Be Missing (Check and Implement if Needed)

### UI/UX Components:

1. **User Dashboard - Credits Display**
   - Show current `credits_balance_usd`
   - Show `monthly_usage_minutes` (if applicable)
   - "Buy More Credits" button

2. **Transaction History Page**
   - Query `credit_transactions` table
   - Display: date, type (usage/purchase/bonus), amount, balance after
   - Filter by date range

3. **Low Balance Warning**
   - Show warning when `credits_balance_usd < $1.00`
   - Prompt user to purchase more credits

4. **Stripe Integration - Top-Up Flow** (if not already done)
   - API endpoint: `/api/credits/purchase`
   - Products: $10 (1,666 minutes), $20 (3,333 minutes)
   - On successful payment: call `record_credit_transaction(p_transaction_type: 'purchase')`

5. **Admin Panel** (optional)
   - View all users' credit balances
   - Manually adjust credits (using `record_credit_transaction` with type='adjustment')

---

## How to Check What's Missing

Run these searches in your codebase:

```bash
# Check for credit dashboard UI
grep -r "credits_balance" app/

# Check for Stripe integration
grep -r "stripe" app/api/

# Check for transaction history page
grep -r "credit_transactions" app/
```

---

## Architecture Flow (For Reference)

```
Desktop App (VS Code Extension)
    ↓
    POST /api/desktop/transcribe
    Authorization: Bearer {license_key}
    Body: FormData with audio file
    ↓
Web App API (app/api/desktop/transcribe/route.ts)
    1. Validate license_key → Get user_id
    2. Check credits_balance_usd >= estimated_cost
    3. Call OpenAI Whisper API (using OPENAI_API_KEY env var)
    4. Deduct credits: record_credit_transaction(amount: -cost)
    5. Update monthly_usage_minutes
    6. Return transcription + cost + balance
    ↓
Desktop App receives transcription
```

---

## Next Steps

1. **Immediate:** Add `OPENAI_API_KEY` to `.env.local`
2. **Verify:** Test the transcription endpoint works
3. **Check:** Search codebase for missing UI components listed above
4. **Implement:** Any missing credit-related UI/UX features
5. **Optional:** Add Stripe top-up flow if not already done

---

## Questions?

- Is there a Stripe integration already set up for credit purchases?
- Are there designs/mockups for the credit dashboard UI?
- Should users be able to see transaction history?
- What's the priority: just get transcription working, or build full credit management UI?
