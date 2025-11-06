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
