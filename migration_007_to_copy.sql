/**
 * DESIGN DECISION: Credit tracking system for OpenAI usage monetization
 * WHY: Enable server-side key management with usage limits and billing
 *
 * REASONING CHAIN:
 * 1. Users no longer provide their own OpenAI keys (remove BYOK)
 * 2. Server holds OpenAI key, proxies Whisper API calls
 * 3. Need to track credits and usage to enable monetization
 * 4. Free tier: $5 credit (833 minutes one-time)
 * 5. Paid tier: $24.99/month (2,083 minutes/month, 50% margin)
 * 6. Top-ups: $10 for 833 min, $20 for 1,666 min
 * 7. Hard stop at limit (voice disabled, text input remains functional)
 *
 * PATTERN: Pattern-MONETIZATION-001 (Server-Side Key Management)
 * RELATED: Pattern-AUTH-DUAL-SYNC-001 (Dual-system architecture)
 */

-- =====================================================
-- 1. ADD CREDIT TRACKING COLUMNS TO PROFILES TABLE
-- =====================================================

-- DESIGN DECISION: Add columns to existing profiles table (not new table)
-- WHY: Credits are user-level attribute, belongs with user profile data

ALTER TABLE public.profiles
  ADD COLUMN credits_balance_usd DECIMAL(10, 2) DEFAULT 5.00,
  ADD COLUMN monthly_usage_minutes INTEGER DEFAULT 0,
  ADD COLUMN last_usage_reset_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN monthly_limit_minutes INTEGER DEFAULT 0, -- 0 = pay-as-you-go (free tier)
  ADD COLUMN feature_flags JSONB DEFAULT '{
    "cloud_sync": false,
    "knowledge_pools": 0,
    "team_collaboration": false,
    "api_access": false,
    "custom_workflows": false,
    "sso_enabled": false
  }'::jsonb;

-- Add comments for documentation
COMMENT ON COLUMN public.profiles.credits_balance_usd IS 'Current credit balance in USD. Free tier starts with $5.00. Decremented on each Whisper API call.';
COMMENT ON COLUMN public.profiles.monthly_usage_minutes IS 'Total minutes used this month. Resets on subscription renewal or 1st of month for free tier.';
COMMENT ON COLUMN public.profiles.last_usage_reset_at IS 'Timestamp of last monthly usage reset. Used to determine when to reset monthly_usage_minutes.';
COMMENT ON COLUMN public.profiles.monthly_limit_minutes IS 'Monthly usage limit in minutes. 0 = pay-as-you-go (free tier). 2083 = paid tier ($24.99/month).';
COMMENT ON COLUMN public.profiles.feature_flags IS 'JSONB flags for tier-based features. Enables infrastructure-ready tier expansion.';

-- Create index for credit balance queries (frequently checked)
CREATE INDEX idx_profiles_credits_balance ON public.profiles(credits_balance_usd);

-- =====================================================
-- 2. CREATE CREDIT_TRANSACTIONS TABLE
-- =====================================================

-- DESIGN DECISION: Separate transactions table for audit trail
-- WHY: Need immutable history of all credit changes (usage, purchases, refunds)

CREATE TABLE public.credit_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,

  -- Transaction details
  amount_usd DECIMAL(10, 2) NOT NULL, -- Negative for usage, positive for purchases
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('usage', 'purchase', 'refund', 'bonus', 'adjustment')),
  description TEXT, -- e.g., "Transcription: 5.2 minutes", "Top-up purchase: $10"

  -- Balance snapshot (helps with auditing)
  balance_after_usd DECIMAL(10, 2) NOT NULL, -- Snapshot of credits_balance_usd after this transaction

  -- Related entities (optional)
  usage_event_id UUID REFERENCES public.usage_events(id) ON DELETE SET NULL, -- Link to usage_events if type='usage'
  stripe_payment_intent_id TEXT, -- Stripe payment intent ID if type='purchase'

  -- Metadata
  metadata JSONB DEFAULT '{}', -- Additional data (duration_seconds, cost_per_minute, etc.)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX idx_credit_transactions_user_id ON public.credit_transactions(user_id);
CREATE INDEX idx_credit_transactions_created_at ON public.credit_transactions(created_at DESC);
CREATE INDEX idx_credit_transactions_type ON public.credit_transactions(transaction_type);
CREATE INDEX idx_credit_transactions_user_date ON public.credit_transactions(user_id, created_at DESC);

-- Row Level Security
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view their own transactions
CREATE POLICY "Users can view own credit transactions"
  ON public.credit_transactions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own transactions (via API)
-- NOTE: In production, only backend (service role) should insert. This policy is for development.
CREATE POLICY "Service role can insert credit transactions"
  ON public.credit_transactions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Add comments for documentation
COMMENT ON TABLE public.credit_transactions IS 'Immutable audit log of all credit changes (usage, purchases, refunds, bonuses). Enables dispute resolution and usage analytics.';
COMMENT ON COLUMN public.credit_transactions.amount_usd IS 'Transaction amount in USD. Negative for deductions (usage), positive for additions (purchase).';
COMMENT ON COLUMN public.credit_transactions.transaction_type IS 'Type: usage (Whisper call), purchase (top-up), refund, bonus (promotional), adjustment (manual fix).';
COMMENT ON COLUMN public.credit_transactions.balance_after_usd IS 'Snapshot of user credits_balance_usd after this transaction. Used for audit reconciliation.';

-- =====================================================
-- 3. UPDATE USAGE_EVENTS TABLE
-- =====================================================

-- DESIGN DECISION: Add cost tracking to existing usage_events table
-- WHY: Link usage events to financial transactions (cost transparency)

ALTER TABLE public.usage_events
  ADD COLUMN cost_usd DECIMAL(10, 4), -- Exact cost for this event (e.g., 0.0300 for 5 minutes)
  ADD COLUMN duration_seconds INTEGER; -- Duration in seconds (for Whisper calls)

-- Add comments
COMMENT ON COLUMN public.usage_events.cost_usd IS 'Actual cost in USD for this event. Calculated as duration_seconds / 60 * $0.006 for Whisper calls.';
COMMENT ON COLUMN public.usage_events.duration_seconds IS 'Duration in seconds. For voice_capture events, this is audio length. Used to calculate cost.';

-- =====================================================
-- 4. HELPER FUNCTIONS
-- =====================================================

-- Function: Record credit transaction and update balance atomically
CREATE OR REPLACE FUNCTION public.record_credit_transaction(
  p_user_id UUID,
  p_amount_usd DECIMAL(10, 2),
  p_transaction_type TEXT,
  p_description TEXT,
  p_usage_event_id UUID DEFAULT NULL,
  p_stripe_payment_intent_id TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
  v_new_balance DECIMAL(10, 2);
  v_transaction_id UUID;
BEGIN
  -- Update user balance atomically (prevent race conditions)
  UPDATE public.profiles
  SET credits_balance_usd = credits_balance_usd + p_amount_usd,
      updated_at = NOW()
  WHERE id = p_user_id
  RETURNING credits_balance_usd INTO v_new_balance;

  -- Check if balance went negative (insufficient credits)
  IF v_new_balance < 0 THEN
    RAISE EXCEPTION 'Insufficient credits. Balance would be: $%', v_new_balance;
  END IF;

  -- Insert transaction record
  INSERT INTO public.credit_transactions (
    user_id,
    amount_usd,
    transaction_type,
    description,
    balance_after_usd,
    usage_event_id,
    stripe_payment_intent_id,
    metadata
  ) VALUES (
    p_user_id,
    p_amount_usd,
    p_transaction_type,
    p_description,
    v_new_balance,
    p_usage_event_id,
    p_stripe_payment_intent_id,
    p_metadata
  )
  RETURNING id INTO v_transaction_id;

  RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.record_credit_transaction IS 'Atomically updates user credit balance and records transaction. Prevents race conditions and ensures balance never goes negative.';

-- Function: Check if user has sufficient credits
CREATE OR REPLACE FUNCTION public.check_sufficient_credits(
  p_user_id UUID,
  p_required_amount_usd DECIMAL(10, 2)
) RETURNS BOOLEAN AS $$
DECLARE
  v_balance DECIMAL(10, 2);
BEGIN
  SELECT credits_balance_usd INTO v_balance
  FROM public.profiles
  WHERE id = p_user_id;

  RETURN v_balance >= p_required_amount_usd;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.check_sufficient_credits IS 'Check if user has sufficient credits before processing Whisper API call. Returns true if credits_balance_usd >= required_amount.';

-- Function: Calculate Whisper API cost
CREATE OR REPLACE FUNCTION public.calculate_whisper_cost(
  p_duration_seconds INTEGER
) RETURNS DECIMAL(10, 4) AS $$
BEGIN
  -- OpenAI Whisper pricing: $0.006 per minute
  -- Formula: (seconds / 60) * 0.006
  RETURN ROUND((p_duration_seconds::DECIMAL / 60.0) * 0.006, 4);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION public.calculate_whisper_cost IS 'Calculate Whisper API cost based on duration. OpenAI charges $0.006 per minute. Returns cost in USD (rounded to 4 decimal places).';

-- =====================================================
-- 5. MIGRATION DATA
-- =====================================================

-- DESIGN DECISION: Backfill existing users with $5 free credit
-- WHY: Reward early adopters, allow existing users to try new system

UPDATE public.profiles
SET
  credits_balance_usd = 5.00,
  monthly_usage_minutes = 0,
  last_usage_reset_at = NOW(),
  monthly_limit_minutes = 0, -- Free tier (pay-as-you-go)
  updated_at = NOW()
WHERE credits_balance_usd IS NULL; -- Only update rows that don't have credits set

-- Log the backfill as bonus transactions (for transparency)
INSERT INTO public.credit_transactions (user_id, amount_usd, transaction_type, description, balance_after_usd, metadata)
SELECT
  id AS user_id,
  5.00 AS amount_usd,
  'bonus' AS transaction_type,
  'Free credit for early adopter (v0.17.0 migration)' AS description,
  5.00 AS balance_after_usd,
  '{"migration": "v0.17.0", "reason": "early_adopter_bonus"}'::jsonb AS metadata
FROM public.profiles
WHERE credits_balance_usd = 5.00; -- Users who just got backfilled

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
