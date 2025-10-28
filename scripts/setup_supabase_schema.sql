-- ============================================
-- Node 1 Supabase Schema Setup
-- ============================================
--
-- DESIGN DECISION: Two-table design (custom patterns + CodeSearchNet bootstrap)
-- WHY: Bootstrap with 412K functions for immediate dogfooding, confidence multiplier ensures custom patterns rank higher
--
-- USAGE: Copy/paste this entire file into Supabase SQL Editor
--
-- PATTERN: Pattern-BOOTSTRAP-001 (CodeSearchNet Bootstrap Strategy)

-- ============================================
-- TABLE 1: CUSTOM PATTERNS (CHAIN OF THOUGHT)
-- ============================================

CREATE TABLE patterns (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Pattern identification
  pattern_id VARCHAR(50) UNIQUE NOT NULL,  -- e.g., "Pattern-MARKETING-001"
  name VARCHAR(255) NOT NULL,
  domain VARCHAR(50) NOT NULL CHECK (domain IN ('Marketing', 'Legal')),

  -- Chain of Thought content
  design_decision TEXT NOT NULL,
  why TEXT NOT NULL,
  reasoning_chain TEXT[] NOT NULL,  -- Array of reasoning steps
  code_example TEXT,

  -- Source attribution
  source_repo VARCHAR(255),  -- GitHub repo URL
  source_file VARCHAR(500),  -- File path in repo
  source_language VARCHAR(50),  -- Python, JavaScript, TypeScript

  -- Embeddings and search
  embedding vector(1024),  -- Voyage-3-large embeddings
  search_vector tsvector,  -- PostgreSQL full-text search

  -- Quality metrics
  confidence DECIMAL(3,2) NOT NULL DEFAULT 0.85 CHECK (confidence >= 0 AND confidence <= 1),
  docstring_score DECIMAL(3,2) CHECK (docstring_score >= 0 AND docstring_score <= 1),
  validated BOOLEAN DEFAULT FALSE,
  human_validated BOOLEAN DEFAULT FALSE,
  validation_score DECIMAL(3,2) CHECK (validation_score >= 0 AND validation_score <= 1),

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES FOR PATTERNS
-- ============================================

-- HNSW index for semantic similarity search (vector cosine distance)
CREATE INDEX idx_patterns_embedding ON patterns
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- GIN index for full-text keyword search
CREATE INDEX idx_patterns_search_vector ON patterns
USING gin(search_vector);

-- B-tree indexes for common filters
CREATE INDEX idx_patterns_domain ON patterns(domain);
CREATE INDEX idx_patterns_validated ON patterns(validated) WHERE validated = TRUE;
CREATE INDEX idx_patterns_confidence ON patterns(confidence) WHERE confidence >= 0.85;

-- Composite index for common query pattern
CREATE INDEX idx_patterns_domain_validated_confidence
ON patterns(domain, validated, confidence)
WHERE validated = TRUE AND confidence >= 0.85;

-- ============================================
-- TRIGGER FOR AUTO-UPDATING search_vector (patterns)
-- ============================================

CREATE OR REPLACE FUNCTION update_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  -- Combine name (weight A), design_decision (weight B), why (weight B), reasoning_chain (weight C)
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.design_decision, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.why, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.reasoning_chain, ' '), '')), 'C');

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_search_vector
BEFORE INSERT OR UPDATE ON patterns
FOR EACH ROW
EXECUTE FUNCTION update_search_vector();

-- ============================================
-- TABLE 2: CODESEARCHNET BOOTSTRAP
-- ============================================

CREATE TABLE codesearchnet_functions (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Function identification
  function_id VARCHAR(100) UNIQUE NOT NULL,  -- e.g., "csn-python-12345"
  function_name VARCHAR(255) NOT NULL,

  -- Source metadata
  repo VARCHAR(255) NOT NULL,
  path VARCHAR(500) NOT NULL,
  language VARCHAR(50) NOT NULL CHECK (language IN ('Python', 'Java', 'JavaScript', 'Go', 'PHP', 'Ruby')),

  -- Content
  docstring TEXT,  -- Function documentation
  code TEXT NOT NULL,  -- Function implementation

  -- Embeddings and search (re-embedded with Voyage-code-2)
  embedding vector(1024),  -- Voyage-code-2 embeddings (code-optimized)
  search_vector tsvector,  -- PostgreSQL full-text search

  -- Quality metrics
  confidence DECIMAL(3,2) NOT NULL DEFAULT 0.75,  -- Lower than custom patterns (0.95)
  docstring_quality DECIMAL(3,2),  -- Quality score of docstring

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  imported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES FOR CODESEARCHNET
-- ============================================

-- HNSW index for semantic similarity search
CREATE INDEX idx_codesearchnet_embedding ON codesearchnet_functions
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- GIN index for full-text keyword search
CREATE INDEX idx_codesearchnet_search_vector ON codesearchnet_functions
USING gin(search_vector);

-- B-tree indexes for filters
CREATE INDEX idx_codesearchnet_language ON codesearchnet_functions(language);
CREATE INDEX idx_codesearchnet_confidence ON codesearchnet_functions(confidence);

-- ============================================
-- TRIGGER FOR AUTO-UPDATING search_vector (CodeSearchNet)
-- ============================================

CREATE OR REPLACE FUNCTION update_codesearchnet_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  -- Combine function_name (A), docstring (B), code sample (C)
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.function_name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.docstring, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(substring(NEW.code, 1, 500), '')), 'C');  -- First 500 chars only

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_codesearchnet_search_vector
BEFORE INSERT OR UPDATE ON codesearchnet_functions
FOR EACH ROW
EXECUTE FUNCTION update_codesearchnet_search_vector();

-- ============================================
-- SUPPORT TABLES
-- ============================================

-- Query logs for analytics
CREATE TABLE query_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_text TEXT NOT NULL,
  domain VARCHAR(50),
  result_count INTEGER NOT NULL,
  query_time_ms INTEGER NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_query_logs_timestamp ON query_logs(timestamp DESC);
CREATE INDEX idx_query_logs_domain ON query_logs(domain);

-- Pattern feedback
CREATE TABLE pattern_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_id VARCHAR(50) NOT NULL REFERENCES patterns(pattern_id) ON DELETE CASCADE,
  user_id VARCHAR(100),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback_text TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_pattern_feedback_pattern_id ON pattern_feedback(pattern_id);
CREATE INDEX idx_pattern_feedback_timestamp ON pattern_feedback(timestamp DESC);

-- ============================================
-- ROW LEVEL SECURITY (Disabled for development)
-- ============================================

ALTER TABLE patterns DISABLE ROW LEVEL SECURITY;
ALTER TABLE codesearchnet_functions DISABLE ROW LEVEL SECURITY;
ALTER TABLE query_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE pattern_feedback DISABLE ROW LEVEL SECURITY;

-- ============================================
-- VALIDATION: Verify tables created
-- ============================================

SELECT
  'Tables created: ' || COUNT(*) as status
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('patterns', 'codesearchnet_functions', 'query_logs', 'pattern_feedback');

-- Expected: "Tables created: 4"
