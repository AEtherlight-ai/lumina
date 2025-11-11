-- =====================================================
-- Lumina Database Schema - Initial Migration
-- =====================================================
-- DESIGN DECISION: PostgreSQL with Row Level Security
-- WHY: Supabase provides built-in auth + RLS for security
--
-- REASONING CHAIN:
-- 1. Extend auth.users with profiles table (1:1 relationship)
-- 2. Track subscriptions with Stripe integration
-- 3. Multi-device support with storage allocation
-- 4. Viral invite tracking with storage bonuses
-- 5. Knowledge pool management per user
-- =====================================================

-- Enable pgcrypto extension for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- 1. PROFILES TABLE
-- =====================================================
-- DESIGN DECISION: Separate profile table from auth.users
-- WHY: Keep auth separate, easier to manage custom fields

CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,

  -- Subscription Details
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'network', 'pro', 'enterprise')),
  subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'canceled', 'past_due', 'trialing')),
  stripe_customer_id TEXT UNIQUE,

  -- Storage Management
  storage_limit_mb INTEGER DEFAULT 0, -- Base storage limit
  storage_used_mb INTEGER DEFAULT 0,  -- Current usage
  storage_bonus_mb INTEGER DEFAULT 0, -- From invites

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Automatic profile creation on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- 2. SUBSCRIPTIONS TABLE
-- =====================================================
-- DESIGN DECISION: Separate subscriptions for Stripe sync
-- WHY: Track subscription history, handle webhooks

CREATE TABLE public.subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,

  -- Stripe Details
  stripe_subscription_id TEXT UNIQUE,
  stripe_price_id TEXT,
  stripe_product_id TEXT,

  -- Subscription Info
  plan_id TEXT NOT NULL CHECK (plan_id IN ('free', 'network', 'pro', 'enterprise')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'trialing', 'incomplete')),

  -- Billing Cycle
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  canceled_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions"
  ON public.subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

-- =====================================================
-- 3. DEVICES TABLE
-- =====================================================
-- DESIGN DECISION: Multi-device support with per-device allocation
-- WHY: Users have desktop, laptop, mobile with different storage needs

CREATE TABLE public.devices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,

  -- Device Info
  device_name TEXT NOT NULL,
  device_type TEXT NOT NULL CHECK (device_type IN ('desktop', 'laptop', 'tablet', 'mobile')),
  device_id TEXT NOT NULL, -- Unique identifier from device

  -- Storage Allocation
  storage_allocated_mb INTEGER DEFAULT 0,
  storage_used_mb INTEGER DEFAULT 0,

  -- Sync Status
  last_sync_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, device_id)
);

-- Row Level Security
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own devices"
  ON public.devices
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own devices"
  ON public.devices
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own devices"
  ON public.devices
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own devices"
  ON public.devices
  FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- 4. INVITATIONS TABLE
-- =====================================================
-- DESIGN DECISION: Track viral invite system with storage bonuses
-- WHY: +10MB/+20MB/+50MB per accepted invite (tier-dependent)

CREATE TABLE public.invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Inviter (who sent the invite)
  inviter_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,

  -- Invitee (who receives the invite)
  invitee_email TEXT NOT NULL,
  invitee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- NULL until signup

  -- Invite Details
  invite_code TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),

  -- Storage Bonus (calculated based on inviter's tier)
  storage_bonus_mb INTEGER DEFAULT 0,

  -- Timestamps
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),

  UNIQUE(inviter_id, invitee_email)
);

-- Row Level Security
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own invitations"
  ON public.invitations
  FOR SELECT
  USING (auth.uid() = inviter_id OR auth.uid() = invitee_id);

CREATE POLICY "Users can create invitations"
  ON public.invitations
  FOR INSERT
  WITH CHECK (auth.uid() = inviter_id);

-- =====================================================
-- 5. KNOWLEDGE_POOLS TABLE
-- =====================================================
-- DESIGN DECISION: Track knowledge pool subscriptions per user
-- WHY: Free = 0, Network = 1, Pro = 3, Enterprise = unlimited

CREATE TABLE public.knowledge_pools (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,

  -- Pool Info
  pool_name TEXT NOT NULL CHECK (pool_name IN ('legal', 'marketing', 'devops', 'medical', 'finance')),
  is_active BOOLEAN DEFAULT TRUE,

  -- Stats
  pattern_count INTEGER DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW(),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, pool_name)
);

-- Row Level Security
ALTER TABLE public.knowledge_pools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own knowledge pools"
  ON public.knowledge_pools
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own knowledge pools"
  ON public.knowledge_pools
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own knowledge pools"
  ON public.knowledge_pools
  FOR UPDATE
  USING (auth.uid() = user_id);

-- =====================================================
-- 6. HELPER FUNCTIONS
-- =====================================================

-- Calculate total storage for user (base + bonus)
CREATE OR REPLACE FUNCTION public.calculate_total_storage(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  total_mb INTEGER;
BEGIN
  SELECT storage_limit_mb + storage_bonus_mb
  INTO total_mb
  FROM public.profiles
  WHERE id = user_uuid;

  RETURN COALESCE(total_mb, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update storage bonus when invite is accepted
CREATE OR REPLACE FUNCTION public.handle_invite_accepted()
RETURNS TRIGGER AS $$
DECLARE
  inviter_tier TEXT;
  bonus_mb INTEGER;
BEGIN
  -- Get inviter's subscription tier
  SELECT subscription_tier INTO inviter_tier
  FROM public.profiles
  WHERE id = NEW.inviter_id;

  -- Calculate bonus based on tier
  bonus_mb := CASE inviter_tier
    WHEN 'network' THEN 10
    WHEN 'pro' THEN 20
    WHEN 'enterprise' THEN 50
    ELSE 0
  END;

  -- Update invitation with bonus
  NEW.storage_bonus_mb := bonus_mb;

  -- Add bonus to inviter's profile
  UPDATE public.profiles
  SET storage_bonus_mb = storage_bonus_mb + bonus_mb,
      updated_at = NOW()
  WHERE id = NEW.inviter_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_invite_accepted
  BEFORE UPDATE OF status ON public.invitations
  FOR EACH ROW
  WHEN (OLD.status = 'pending' AND NEW.status = 'accepted')
  EXECUTE FUNCTION public.handle_invite_accepted();

-- =====================================================
-- 7. INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_stripe_customer ON public.profiles(stripe_customer_id);
CREATE INDEX idx_subscriptions_user ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_sub ON public.subscriptions(stripe_subscription_id);
CREATE INDEX idx_devices_user ON public.devices(user_id);
CREATE INDEX idx_invitations_inviter ON public.invitations(inviter_id);
CREATE INDEX idx_invitations_code ON public.invitations(invite_code);
CREATE INDEX idx_knowledge_pools_user ON public.knowledge_pools(user_id);

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/jxqudhureuzweenjlguz/editor
-- Migration: Add license system fields to devices table
-- Created: 2025-10-06
-- Purpose: Support license-based device activation for desktop apps

/**
 * DESIGN DECISION: Add license_key, device_fingerprint, activated_at to existing devices table
 * WHY: License-based activation prevents unauthorized device usage
 *
 * REASONING CHAIN:
 * 1. User generates license key in web dashboard
 * 2. License stored in devices table (status=pending)
 * 3. Desktop app calls /api/license/validate with license_key + fingerprint
 * 4. Backend updates device record (status=active, device_fingerprint, activated_at)
 * 5. Desktop app receives user context (user_id, tier, storage limits)
 *
 * PATTERN: Pattern-LICENSE-001 (License Generation and Validation)
 */

-- Add license fields to devices table
ALTER TABLE devices
ADD COLUMN IF NOT EXISTS license_key TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS device_fingerprint TEXT,
ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

-- Create index for fast license lookups
CREATE INDEX IF NOT EXISTS idx_devices_license_key ON devices(license_key);
CREATE INDEX IF NOT EXISTS idx_devices_fingerprint ON devices(device_fingerprint);
CREATE INDEX IF NOT EXISTS idx_devices_last_seen ON devices(user_id, last_seen_at);

-- Add comment for documentation
COMMENT ON COLUMN devices.license_key IS 'Unique 24-character license key for device activation (nanoid)';
COMMENT ON COLUMN devices.device_fingerprint IS 'Device fingerprint hash (OS + CPU + MAC) to prevent license sharing';
COMMENT ON COLUMN devices.activated_at IS 'Timestamp when device was first activated with license key';
COMMENT ON COLUMN devices.last_seen_at IS 'Last heartbeat timestamp from desktop app (for real-time status)';

-- Update RLS policies to allow desktop apps to validate licenses
-- (Desktop apps call API anonymously, so we need a service role policy)
-- Note: Actual validation happens in API route, not via direct Supabase client

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'License system migration complete: license_key, device_fingerprint, activated_at, last_seen_at added to devices table';
END $$;
/**
 * DESIGN DECISION: usage_events table for tracking desktop app activity
 * WHY: Need historical data for analytics dashboard (time saved, success rate, trends)
 *
 * REASONING CHAIN:
 * 1. Desktop app tracks 3 event types: voice_capture, search, pattern_matched
 * 2. Desktop syncs events to web backend via POST /api/events
 * 3. Web stores events in usage_events table
 * 4. Analytics API aggregates by day/week for dashboard charts
 * 5. User sees ROI ("You saved 7.5 hours this week!")
 *
 * PATTERN: Pattern-SCHEMA-002 (Usage Events Table)
 * RELATED: app/api/analytics, app/dashboard/analytics
 */

-- Create usage_events table
CREATE TABLE IF NOT EXISTS usage_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('voice_capture', 'search', 'pattern_matched')),

  -- Event metadata (JSONB for flexibility)
  metadata JSONB DEFAULT '{}',

  -- For pattern_matched events: pattern_id, confidence_score
  -- For search events: query, results_count
  -- For voice_capture events: transcription_length, duration_ms

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_usage_events_user_id ON usage_events(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_events_device_id ON usage_events(device_id);
CREATE INDEX IF NOT EXISTS idx_usage_events_type ON usage_events(event_type);
CREATE INDEX IF NOT EXISTS idx_usage_events_created_at ON usage_events(created_at);

-- Composite index for analytics queries (user + date range)
CREATE INDEX IF NOT EXISTS idx_usage_events_user_date ON usage_events(user_id, created_at DESC);

-- Row Level Security (RLS)
ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own events
CREATE POLICY "Users can view own usage events"
  ON usage_events FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own events (via desktop app)
CREATE POLICY "Users can insert own usage events"
  ON usage_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own events
CREATE POLICY "Users can delete own usage events"
  ON usage_events FOR DELETE
  USING (auth.uid() = user_id);

-- Example event records (for testing)
COMMENT ON TABLE usage_events IS 'Stores usage events from desktop apps for analytics dashboard';
COMMENT ON COLUMN usage_events.event_type IS 'Type: voice_capture, search, or pattern_matched';
COMMENT ON COLUMN usage_events.metadata IS 'Flexible JSON metadata (pattern_id, confidence, query, etc.)';
/**
 * DESIGN DECISION: patterns_metadata table for pattern library browser
 * WHY: Web dashboard needs searchable pattern metadata without exposing full code
 *
 * REASONING CHAIN:
 * 1. Desktop app indexes codebase and extracts patterns (functions, classes, modules)
 * 2. Desktop syncs pattern METADATA to web (name, description, confidence, tags)
 * 3. Full code/implementation stays local (privacy-first, no sensitive code in cloud)
 * 4. Web enables search/browse without seeing actual implementation
 * 5. User can click pattern → see abstracted description, not full source code
 *
 * PATTERN: Pattern-PRIVACY-001 (Pattern abstraction), Pattern-SCHEMA-003 (Metadata table)
 * RELATED: app/api/patterns, app/dashboard/patterns
 */

-- Create patterns_metadata table
CREATE TABLE IF NOT EXISTS patterns_metadata (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id UUID REFERENCES devices(id) ON DELETE SET NULL,

  -- Pattern metadata (no full code, just abstractions)
  pattern_name TEXT NOT NULL,
  pattern_description TEXT,
  confidence_score FLOAT DEFAULT 0.0 CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0),
  domain TEXT NOT NULL, -- 'web', 'mobile', 'backend', 'data', 'devops'
  tags TEXT[] DEFAULT '{}', -- ['react', 'typescript', 'hooks']
  source TEXT DEFAULT 'personal' CHECK (source IN ('personal', 'team', 'community')),
  usage_count INT DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_patterns_user_id ON patterns_metadata(user_id);
CREATE INDEX IF NOT EXISTS idx_patterns_device_id ON patterns_metadata(device_id);
CREATE INDEX IF NOT EXISTS idx_patterns_domain ON patterns_metadata(domain);
CREATE INDEX IF NOT EXISTS idx_patterns_source ON patterns_metadata(source);
CREATE INDEX IF NOT EXISTS idx_patterns_created_at ON patterns_metadata(created_at DESC);

-- Full-text search index (for pattern_name and pattern_description)
CREATE INDEX IF NOT EXISTS idx_patterns_search
  ON patterns_metadata
  USING gin(to_tsvector('english', pattern_name || ' ' || COALESCE(pattern_description, '')));

-- Composite index for common queries (user + domain + source)
CREATE INDEX IF NOT EXISTS idx_patterns_user_domain_source
  ON patterns_metadata(user_id, domain, source);

-- Row Level Security (RLS)
ALTER TABLE patterns_metadata ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view own patterns OR shared team/community patterns
CREATE POLICY "Users can view own patterns"
  ON patterns_metadata FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert own patterns (via desktop sync)
CREATE POLICY "Users can insert own patterns"
  ON patterns_metadata FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update own patterns
CREATE POLICY "Users can update own patterns"
  ON patterns_metadata FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete own patterns
CREATE POLICY "Users can delete own patterns"
  ON patterns_metadata FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_patterns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER patterns_updated_at_trigger
  BEFORE UPDATE ON patterns_metadata
  FOR EACH ROW
  EXECUTE FUNCTION update_patterns_updated_at();

-- Comments
COMMENT ON TABLE patterns_metadata IS 'Stores pattern metadata (no full code) for web dashboard browsing';
COMMENT ON COLUMN patterns_metadata.pattern_name IS 'Pattern name (e.g., "React useAuth Hook")';
COMMENT ON COLUMN patterns_metadata.pattern_description IS 'High-level description, no implementation details';
COMMENT ON COLUMN patterns_metadata.confidence_score IS 'Pattern confidence (0.0-1.0) from Lumina matching engine';
COMMENT ON COLUMN patterns_metadata.domain IS 'Pattern domain: web, mobile, backend, data, devops';
COMMENT ON COLUMN patterns_metadata.tags IS 'Tags for filtering (language, framework, technique)';
COMMENT ON COLUMN patterns_metadata.source IS 'Pattern source: personal (your code), team (shared), community (public)';
COMMENT ON COLUMN patterns_metadata.usage_count IS 'How many times this pattern has been matched/used';
/**
 * DESIGN DECISION: feedback table for user feedback loop
 * WHY: Need to capture thumbs up/down, corrections, and issue reports to improve pattern quality
 *
 * REASONING CHAIN:
 * 1. Users interact with patterns (voice captures, searches, matches)
 * 2. Users provide feedback: thumbs up/down, corrections, or report issues
 * 3. Feedback stored with reference to pattern_id or usage_event_id
 * 4. Admin reviews pending feedback, responds if needed
 * 5. Patterns with negative feedback get flagged for retraining
 * 6. User sees feedback status in dashboard (pending, reviewed, resolved)
 *
 * PATTERN: Pattern-FEEDBACK-001 (User feedback loop design)
 * RELATED: app/api/feedback, app/dashboard/feedback
 */

-- Create feedback table
CREATE TABLE IF NOT EXISTS feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pattern_id UUID REFERENCES patterns_metadata(id) ON DELETE CASCADE,
  usage_event_id UUID REFERENCES usage_events(id) ON DELETE SET NULL,

  -- Feedback details
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('thumbs_up', 'thumbs_down', 'correction', 'report')),
  correction_text TEXT, -- Optional correction or issue description

  -- Moderation workflow
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  admin_response TEXT, -- Optional admin response
  admin_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Admin who reviewed
  reviewed_at TIMESTAMPTZ, -- When admin reviewed

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_pattern_id ON feedback(pattern_id);
CREATE INDEX IF NOT EXISTS idx_feedback_usage_event_id ON feedback(usage_event_id);
CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback(status);
CREATE INDEX IF NOT EXISTS idx_feedback_type ON feedback(feedback_type);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at DESC);

-- Composite index for common queries (user + status)
CREATE INDEX IF NOT EXISTS idx_feedback_user_status ON feedback(user_id, status);

-- Row Level Security (RLS)
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view own feedback
CREATE POLICY "Users can view own feedback"
  ON feedback FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert own feedback
CREATE POLICY "Users can insert own feedback"
  ON feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users cannot update feedback (prevent abuse)
-- Only admins can update feedback via service role

-- Policy: Users cannot delete feedback (audit trail)
-- Only admins can delete feedback via service role

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_feedback_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER feedback_updated_at_trigger
  BEFORE UPDATE ON feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_feedback_updated_at();

-- Unique constraint: Prevent duplicate feedback per pattern per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_feedback_unique_pattern_user
  ON feedback(user_id, pattern_id)
  WHERE pattern_id IS NOT NULL AND status != 'dismissed';

-- Unique constraint: Prevent duplicate feedback per usage event per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_feedback_unique_event_user
  ON feedback(user_id, usage_event_id)
  WHERE usage_event_id IS NOT NULL AND status != 'dismissed';

-- Comments
COMMENT ON TABLE feedback IS 'User feedback on patterns and usage events (thumbs up/down, corrections, reports)';
COMMENT ON COLUMN feedback.feedback_type IS 'Type: thumbs_up, thumbs_down, correction, report';
COMMENT ON COLUMN feedback.correction_text IS 'User-provided correction or issue description (max 1000 chars)';
COMMENT ON COLUMN feedback.status IS 'Status: pending (new), reviewed (admin looked), resolved (fixed), dismissed (invalid)';
COMMENT ON COLUMN feedback.admin_response IS 'Admin response to user feedback (optional)';
/**
 * Migration: Real-Time Connection Status
 *
 * DESIGN DECISION: Add last_seen_at and connection_status columns to devices table
 * WHY: Enable real-time tracking of which devices are currently connected
 *
 * REASONING CHAIN:
 * 1. Desktop apps send heartbeat every 30 seconds
 * 2. Update last_seen_at timestamp on each heartbeat
 * 3. If last_seen_at > 2 minutes ago → mark as offline
 * 4. Supabase Realtime subscriptions notify web dashboard of changes
 * 5. Green dot = online, Gray dot = offline in UI
 *
 * PATTERN: Pattern-REALTIME-001 (Supabase Realtime subscriptions)
 * RELATED: devices table, /api/devices/heartbeat, dashboard connection widget
 */

-- Add last_seen_at and connection_status columns
ALTER TABLE devices
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS connection_status TEXT DEFAULT 'offline' CHECK (connection_status IN ('online', 'offline', 'syncing'));

-- Index for fast queries
CREATE INDEX IF NOT EXISTS idx_devices_last_seen
  ON devices(last_seen_at DESC)
  WHERE last_seen_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_devices_connection_status
  ON devices(connection_status)
  WHERE connection_status = 'online';

-- Function to automatically mark devices as offline after 2 minutes
CREATE OR REPLACE FUNCTION mark_stale_devices_offline()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE devices
  SET connection_status = 'offline'
  WHERE connection_status != 'offline'
    AND last_seen_at < NOW() - INTERVAL '2 minutes';
END;
$$;

-- Schedule function to run every minute (pg_cron extension)
-- NOTE: This requires pg_cron extension to be enabled in Supabase
-- Alternatively, desktop app can mark itself offline on graceful shutdown
-- Or web dashboard can check staleness client-side

COMMENT ON FUNCTION mark_stale_devices_offline() IS 'Automatically marks devices as offline if last_seen_at > 2 minutes ago. Run via pg_cron or client-side logic.';
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
-- Run this in Supabase SQL Editor or via Supabase CLI:
-- supabase migration up
--
-- ROLLBACK (if needed):
-- ALTER TABLE public.profiles DROP COLUMN credits_balance_usd;
-- ALTER TABLE public.profiles DROP COLUMN monthly_usage_minutes;
-- ALTER TABLE public.profiles DROP COLUMN last_usage_reset_at;
-- ALTER TABLE public.profiles DROP COLUMN monthly_limit_minutes;
-- ALTER TABLE public.profiles DROP COLUMN feature_flags;
-- DROP TABLE public.credit_transactions;
-- ALTER TABLE public.usage_events DROP COLUMN cost_usd;
-- ALTER TABLE public.usage_events DROP COLUMN duration_seconds;
-- DROP FUNCTION public.record_credit_transaction;
-- DROP FUNCTION public.check_sufficient_credits;
-- DROP FUNCTION public.calculate_whisper_cost;
