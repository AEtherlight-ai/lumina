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
