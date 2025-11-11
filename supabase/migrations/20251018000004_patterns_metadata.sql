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
