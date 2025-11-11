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
