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
