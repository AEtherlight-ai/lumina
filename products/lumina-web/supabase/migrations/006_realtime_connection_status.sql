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
