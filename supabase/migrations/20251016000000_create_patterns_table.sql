-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Patterns table with Chain of Thought structure
CREATE TABLE IF NOT EXISTS patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_id VARCHAR(50) UNIQUE NOT NULL,  -- Pattern-MARKETING-001-TAXONOMY
  name VARCHAR(255) NOT NULL,
  domain VARCHAR(50) NOT NULL,  -- marketing, legal
  category VARCHAR(100),  -- Data Structures, NLP, AI Content, etc.
  subcategory VARCHAR(100),  -- Hierarchical Classification, Keyword Extraction, etc.

  -- Chain of Thought components
  design_decision TEXT NOT NULL,
  why TEXT NOT NULL,
  reasoning_chain TEXT[] NOT NULL,  -- Array of reasoning steps
  alternatives TEXT[],  -- Alternative approaches considered

  -- Code and examples
  code_example TEXT,
  source_repo VARCHAR(255),
  source_file VARCHAR(500),
  source_lines VARCHAR(50),  -- e.g., "45-120"

  -- Quality metrics
  confidence DECIMAL(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),  -- 0.00 to 1.00
  quality_score DECIMAL(3,2) CHECK (quality_score >= 0 AND quality_score <= 1),
  stars INTEGER,  -- Source repo stars
  validated BOOLEAN DEFAULT FALSE,

  -- Pattern metadata
  keywords TEXT[],  -- For keyword search
  related_patterns TEXT[],  -- Pattern-XXX-YYY references
  performance TEXT,  -- Performance characteristics

  -- Embeddings (Voyage-3-large, 1024 dimensions - optimal for accuracy and performance)
  embedding vector(1024),

  -- Flexible metadata storage
  metadata JSONB,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for fast queries

-- Domain + confidence filtering
CREATE INDEX idx_patterns_domain ON patterns(domain);
CREATE INDEX idx_patterns_confidence ON patterns(confidence);
CREATE INDEX idx_patterns_validated ON patterns(validated);

-- Category browsing
CREATE INDEX idx_patterns_category ON patterns(category);
CREATE INDEX idx_patterns_subcategory ON patterns(subcategory);

-- Vector similarity index (HNSW for high-dimensional vectors)
-- HNSW supports >2000 dimensions (IVFFlat limited to 2000)
-- m=16: number of connections per node (balance between speed and accuracy)
-- ef_construction=64: quality of index during build (higher = better but slower)
CREATE INDEX idx_patterns_embedding ON patterns
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Full-text search index (for keyword fallback in hybrid search)
CREATE INDEX idx_patterns_fts ON patterns
USING gin(to_tsvector('english',
  name || ' ' || design_decision || ' ' || why || ' ' || COALESCE(code_example, '')));

-- Composite index for common query pattern (domain + validated + confidence)
CREATE INDEX idx_patterns_query ON patterns(domain, validated, confidence DESC)
WHERE validated = TRUE AND confidence >= 0.85;

-- Function: Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Auto-update updated_at on pattern modifications
CREATE TRIGGER update_patterns_updated_at
BEFORE UPDATE ON patterns
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Function: Semantic pattern search
CREATE OR REPLACE FUNCTION search_patterns(
  query_embedding vector(1024),
  query_domain VARCHAR(50) DEFAULT NULL,
  min_confidence DECIMAL(3,2) DEFAULT 0.85,
  result_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  pattern_id VARCHAR(50),
  name VARCHAR(255),
  domain VARCHAR(50),
  category VARCHAR(100),
  design_decision TEXT,
  why TEXT,
  reasoning_chain TEXT[],
  code_example TEXT,
  confidence DECIMAL(3,2),
  similarity DECIMAL(5,4)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.pattern_id,
    p.name,
    p.domain,
    p.category,
    p.design_decision,
    p.why,
    p.reasoning_chain,
    p.code_example,
    p.confidence,
    (1 - (p.embedding <=> query_embedding))::DECIMAL(5,4) AS similarity
  FROM patterns p
  WHERE
    (query_domain IS NULL OR p.domain = query_domain)
    AND p.confidence >= min_confidence
    AND p.validated = TRUE
  ORDER BY p.embedding <=> query_embedding  -- Cosine distance (lower is better)
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql;

-- Function: Hybrid search (semantic + keyword, weighted combination)
CREATE OR REPLACE FUNCTION hybrid_search_patterns(
  query_text TEXT,
  query_embedding vector(1024),
  query_domain VARCHAR(50) DEFAULT NULL,
  min_confidence DECIMAL(3,2) DEFAULT 0.85,
  semantic_weight DECIMAL(3,2) DEFAULT 0.6,
  result_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  pattern_id VARCHAR(50),
  name VARCHAR(255),
  domain VARCHAR(50),
  category VARCHAR(100),
  design_decision TEXT,
  why TEXT,
  reasoning_chain TEXT[],
  code_example TEXT,
  confidence DECIMAL(3,2),
  similarity DECIMAL(5,4),
  keyword_rank REAL,
  combined_score DECIMAL(5,4)
) AS $$
BEGIN
  RETURN QUERY
  WITH semantic_results AS (
    SELECT
      p.pattern_id,
      p.name,
      p.domain,
      p.category,
      p.design_decision,
      p.why,
      p.reasoning_chain,
      p.code_example,
      p.confidence,
      (1 - (p.embedding <=> query_embedding))::DECIMAL(5,4) AS similarity
    FROM patterns p
    WHERE
      (query_domain IS NULL OR p.domain = query_domain)
      AND p.confidence >= min_confidence
      AND p.validated = TRUE
  ),
  keyword_results AS (
    SELECT
      p.pattern_id,
      ts_rank(
        to_tsvector('english', p.name || ' ' || p.design_decision || ' ' || p.why || ' ' || COALESCE(p.code_example, '')),
        plainto_tsquery('english', query_text)
      ) AS rank
    FROM patterns p
    WHERE
      (query_domain IS NULL OR p.domain = query_domain)
      AND p.confidence >= min_confidence
      AND p.validated = TRUE
      AND to_tsvector('english', p.name || ' ' || p.design_decision || ' ' || p.why || ' ' || COALESCE(p.code_example, '')) @@
          plainto_tsquery('english', query_text)
  )
  SELECT
    s.pattern_id,
    s.name,
    s.domain,
    s.category,
    s.design_decision,
    s.why,
    s.reasoning_chain,
    s.code_example,
    s.confidence,
    s.similarity,
    COALESCE(k.rank, 0) AS keyword_rank,
    (semantic_weight * s.similarity +
     (1 - semantic_weight) * COALESCE(k.rank, 0))::DECIMAL(5,4) AS combined_score
  FROM semantic_results s
  LEFT JOIN keyword_results k ON s.pattern_id = k.pattern_id
  ORDER BY combined_score DESC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql;

-- Comment on table and key columns
COMMENT ON TABLE patterns IS 'ÆtherLight pattern library with Chain of Thought reasoning and vector embeddings';
COMMENT ON COLUMN patterns.pattern_id IS 'Unique pattern identifier (Pattern-DOMAIN-XXX-TYPE)';
COMMENT ON COLUMN patterns.embedding IS 'Voyage-3-large (1024 dimensions)';
COMMENT ON COLUMN patterns.reasoning_chain IS 'Array of reasoning steps from Chain of Thought';
COMMENT ON COLUMN patterns.confidence IS 'Pattern quality confidence score (0.00-1.00)';
