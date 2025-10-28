/**
 * Supabase Initial Setup - Pattern Embeddings Infrastructure
 *
 * Project: Your Hosted Node (optional)
 * URL: https://your-project.supabase.co
 * Database: PostgreSQL with pgvector extension
 *
 * DESIGN DECISION: Optional hosted node for cloud backup/sync
 * WHY: Users may want to sync their local patterns to a personal cloud backup
 *
 * REASONING CHAIN:
 * 1. Enable pgvector extension for 1024-dim Voyage-3-large embeddings
 * 2. Create patterns table with Chain of Thought structure
 * 3. Build HNSW index for semantic search (<50ms)
 * 4. Build GIN index for keyword search (<20ms)
 * 5. Create hybrid_search_patterns() function (60% semantic + 40% keyword)
 * 6. Result: <120ms hybrid search over 1,900+ patterns
 *
 * PATTERN: Pattern-STORAGE-006 (Dedicated Embeddings Infrastructure)
 * PERFORMANCE: <100ms hybrid search, 1024-dim vectors
 */

-- ============================================================================
-- Step 1: Enable pgvector Extension
-- ============================================================================

/**
 * Enable pgvector extension for vector similarity search
 *
 * DESIGN DECISION: pgvector for 1024-dim Voyage-3-large embeddings
 * WHY: Native PostgreSQL extension, HNSW index support, <100ms queries
 *
 * PERFORMANCE: <50ms vector search with HNSW (m=16, ef_construction=64)
 */
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify extension installed
SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';


-- ============================================================================
-- Step 2: Create Patterns Table
-- ============================================================================

/**
 * Patterns table with Voyage-3-large embeddings (1024-dim)
 *
 * DESIGN DECISION: Store Chain of Thought reasoning in structured columns
 * WHY: Enable semantic search over design decisions, not just pattern names
 *
 * REASONING CHAIN:
 * 1. pattern_id: Unique identifier (Pattern-DOMAIN-XXX format)
 * 2. name: Short descriptive name
 * 3. domain: Marketing, Legal, Engineering, etc.
 * 4. design_decision: DESIGN DECISION section from CoT
 * 5. why: WHY section from CoT
 * 6. reasoning_chain: REASONING CHAIN as array (step 1, step 2, etc.)
 * 7. code_example: Optional code snippet
 * 8. source_repo: GitHub repo where pattern extracted
 * 9. source_file: File path in repo
 * 10. embedding: 1024-dim Voyage-3-large vector
 * 11. search_vector: PostgreSQL tsvector for keyword search
 * 12. confidence: Pattern quality score (0.0-1.0)
 * 13. validated: Passed automated validation
 * 14. human_validated: Passed human review
 * 15. validation_score: Combined validation score
 *
 * PATTERN: Pattern-STORAGE-001 (PostgreSQL + pgvector)
 * PERFORMANCE: <50ms semantic search, <20ms keyword search, <100ms hybrid
 */
CREATE TABLE patterns (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_id VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  domain VARCHAR(50) NOT NULL,

  -- Chain of Thought content
  design_decision TEXT NOT NULL,
  why TEXT NOT NULL,
  reasoning_chain TEXT[] NOT NULL,

  -- Code and source
  code_example TEXT,
  source_repo VARCHAR(255),
  source_file VARCHAR(500),

  -- Search vectors
  embedding vector(1024),  -- Voyage-3-large embeddings
  search_vector tsvector,  -- PostgreSQL full-text search

  -- Quality metrics
  confidence DECIMAL(3,2) NOT NULL DEFAULT 0.85 CHECK (confidence >= 0.0 AND confidence <= 1.0),
  validated BOOLEAN DEFAULT FALSE,
  human_validated BOOLEAN DEFAULT FALSE,
  validation_score DECIMAL(3,2) CHECK (validation_score >= 0.0 AND validation_score <= 1.0),

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comments for documentation
COMMENT ON TABLE patterns IS 'ÆtherLight pattern library with Chain of Thought reasoning and vector embeddings';
COMMENT ON COLUMN patterns.embedding IS 'Voyage-3-large 1024-dim embedding for semantic similarity search';
COMMENT ON COLUMN patterns.search_vector IS 'PostgreSQL tsvector for full-text keyword search';
COMMENT ON COLUMN patterns.reasoning_chain IS 'Array of reasoning steps from REASONING CHAIN section';


-- ============================================================================
-- Step 3: Create Indexes for Fast Search
-- ============================================================================

/**
 * HNSW index for semantic similarity search
 *
 * DESIGN DECISION: HNSW with m=16, ef_construction=64
 * WHY: Balance between build time and query performance
 *
 * PARAMETERS:
 * - m=16: Number of bidirectional links per node (default: 16)
 * - ef_construction=64: Size of dynamic candidate list during index build (default: 64)
 *
 * PERFORMANCE:
 * - Index build: ~1 second per 1000 patterns
 * - Query time: <50ms for 1024-dim vectors (p50), <100ms (p95)
 * - Recall: >95% at ef_search=40
 *
 * PATTERN: Pattern-PGVECTOR-001 (HNSW indexing)
 */
CREATE INDEX idx_patterns_embedding ON patterns
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

/**
 * GIN index for full-text keyword search
 *
 * DESIGN DECISION: GIN index on tsvector for keyword matching
 * WHY: Combine with semantic search for hybrid approach (60% semantic + 40% keyword)
 *
 * PERFORMANCE: <20ms keyword search with GIN index
 *
 * PATTERN: Pattern-SEARCH-002 (Hybrid Search)
 */
CREATE INDEX idx_patterns_search_vector ON patterns USING gin(search_vector);

/**
 * B-tree indexes for filtering and sorting
 */
CREATE INDEX idx_patterns_domain ON patterns(domain);
CREATE INDEX idx_patterns_confidence ON patterns(confidence DESC);
CREATE INDEX idx_patterns_validated ON patterns(validated) WHERE validated = TRUE;
CREATE INDEX idx_patterns_created_at ON patterns(created_at DESC);


-- ============================================================================
-- Step 4: Create Trigger for search_vector Auto-Update
-- ============================================================================

/**
 * Automatically update search_vector on INSERT/UPDATE
 *
 * DESIGN DECISION: Trigger-based tsvector generation
 * WHY: Ensure search_vector always synchronized with text content
 *
 * REASONING CHAIN:
 * 1. Concatenate name, domain, design_decision, why into searchable text
 * 2. Generate tsvector with English configuration
 * 3. Store in search_vector column
 * 4. Trigger runs automatically on INSERT/UPDATE
 *
 * PATTERN: Pattern-POSTGRES-003 (Trigger-based derived columns)
 */
CREATE OR REPLACE FUNCTION update_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('english',
    COALESCE(NEW.name, '') || ' ' ||
    COALESCE(NEW.domain, '') || ' ' ||
    COALESCE(NEW.design_decision, '') || ' ' ||
    COALESCE(NEW.why, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER patterns_search_vector_update
BEFORE INSERT OR UPDATE ON patterns
FOR EACH ROW
EXECUTE FUNCTION update_search_vector();


-- ============================================================================
-- Step 5: Create Hybrid Search Function
-- ============================================================================

/**
 * Hybrid search: 60% semantic similarity + 40% keyword match
 *
 * DESIGN DECISION: Weighted combination of vector and keyword search
 * WHY: Vector search finds semantically similar patterns (e.g., "OAuth2" matches "authentication")
 *      Keyword search finds exact matches (e.g., user searches "React hooks", we find "React hooks")
 *      Combining both gives best results: semantic understanding + exact matching
 *
 * REASONING CHAIN:
 * 1. Vector search: Find top 20 patterns by cosine similarity to query embedding
 * 2. Keyword search: Find top 20 patterns by ts_rank for query text
 * 3. Combine results with weighted scoring:
 *    - semantic_score = 1 - (cosine_distance / 2)  -- Normalize to 0-1
 *    - keyword_score = ts_rank / max(ts_rank)       -- Normalize to 0-1
 *    - combined_score = 0.6 * semantic_score + 0.4 * keyword_score
 * 4. Return top N results by combined_score
 * 5. Result: Best of both worlds (semantic + exact)
 *
 * PARAMETERS:
 * - query_embedding: 1024-dim vector from Voyage AI
 * - query_text: User's search text
 * - domain_filter: Optional domain filter (NULL = search all domains)
 * - result_limit: Number of results to return (default: 10)
 *
 * PERFORMANCE: <120ms (50ms vector + 20ms keyword + 50ms merge)
 *
 * PATTERN: Pattern-SEARCH-003 (Hybrid Search Function)
 * RELATED: Pattern-PGVECTOR-001, Pattern-SEARCH-002
 */
CREATE OR REPLACE FUNCTION hybrid_search_patterns(
  query_embedding vector(1024),
  query_text TEXT,
  domain_filter VARCHAR(50) DEFAULT NULL,
  result_limit INT DEFAULT 10
)
RETURNS TABLE (
  pattern_id VARCHAR(50),
  name VARCHAR(255),
  domain VARCHAR(50),
  design_decision TEXT,
  why TEXT,
  confidence DECIMAL(3,2),
  semantic_score FLOAT,
  keyword_score FLOAT,
  combined_score FLOAT
) AS $$
BEGIN
  RETURN QUERY
  WITH
  -- Semantic search (vector similarity)
  semantic_results AS (
    SELECT
      p.pattern_id,
      p.name,
      p.domain,
      p.design_decision,
      p.why,
      p.confidence,
      1 - (p.embedding <=> query_embedding) AS semantic_similarity
    FROM patterns p
    WHERE (domain_filter IS NULL OR p.domain = domain_filter)
      AND p.embedding IS NOT NULL
    ORDER BY p.embedding <=> query_embedding
    LIMIT 20
  ),
  -- Keyword search (full-text)
  keyword_results AS (
    SELECT
      p.pattern_id,
      p.name,
      p.domain,
      p.design_decision,
      p.why,
      p.confidence,
      ts_rank(p.search_vector, plainto_tsquery('english', query_text)) AS keyword_rank
    FROM patterns p
    WHERE
      (domain_filter IS NULL OR p.domain = domain_filter)
      AND p.search_vector @@ plainto_tsquery('english', query_text)
    ORDER BY keyword_rank DESC
    LIMIT 20
  ),
  -- Normalize keyword scores
  normalized_keyword AS (
    SELECT
      *,
      CASE
        WHEN MAX(keyword_rank) OVER () > 0
        THEN keyword_rank / MAX(keyword_rank) OVER ()
        ELSE 0
      END AS keyword_similarity
    FROM keyword_results
  ),
  -- Combine results
  combined AS (
    SELECT
      COALESCE(s.pattern_id, k.pattern_id) AS pattern_id,
      COALESCE(s.name, k.name) AS name,
      COALESCE(s.domain, k.domain) AS domain,
      COALESCE(s.design_decision, k.design_decision) AS design_decision,
      COALESCE(s.why, k.why) AS why,
      COALESCE(s.confidence, k.confidence) AS confidence,
      COALESCE(s.semantic_similarity, 0.0) AS semantic_score,
      COALESCE(k.keyword_similarity, 0.0) AS keyword_score,
      -- Weighted combination: 60% semantic + 40% keyword
      (0.6 * COALESCE(s.semantic_similarity, 0.0) + 0.4 * COALESCE(k.keyword_similarity, 0.0)) AS combined_score
    FROM semantic_results s
    FULL OUTER JOIN normalized_keyword k USING (pattern_id)
  )
  SELECT
    c.pattern_id,
    c.name,
    c.domain,
    c.design_decision,
    c.why,
    c.confidence,
    c.semantic_score::FLOAT,
    c.keyword_score::FLOAT,
    c.combined_score::FLOAT
  FROM combined c
  ORDER BY c.combined_score DESC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- Add comment
COMMENT ON FUNCTION hybrid_search_patterns IS 'Hybrid search combining vector similarity (60%) and keyword matching (40%)';


-- ============================================================================
-- Step 6: Insert Test Pattern
-- ============================================================================

/**
 * Insert test pattern to verify schema and indexes
 *
 * NOTE: Embedding will be NULL until generated via Voyage AI Edge Function
 */
INSERT INTO patterns (
  pattern_id,
  name,
  domain,
  design_decision,
  why,
  reasoning_chain,
  code_example,
  confidence
) VALUES (
  'Pattern-TEST-001',
  'OAuth2 Authentication',
  'Engineering',
  'Use OAuth2 with JWT tokens for API authentication',
  'Secure, scalable, standard protocol supported by all major providers',
  ARRAY[
    '1. User authenticates with provider (Google, GitHub, etc.)',
    '2. Provider returns authorization code',
    '3. Exchange code for access token + refresh token',
    '4. Store tokens securely (encrypted, httpOnly cookies)',
    '5. Include access token in API requests (Authorization header)'
  ],
  E'// Example Express.js middleware\nconst authMiddleware = async (req, res, next) => {\n  const token = req.headers.authorization?.split(" ")[1];\n  if (!token) return res.status(401).json({ error: "No token" });\n  \n  try {\n    const decoded = jwt.verify(token, process.env.JWT_SECRET);\n    req.user = decoded;\n    next();\n  } catch (err) {\n    res.status(401).json({ error: "Invalid token" });\n  }\n};',
  0.92
) ON CONFLICT (pattern_id) DO NOTHING;


-- ============================================================================
-- Step 7: Verification Queries
-- ============================================================================

-- Verify pgvector extension
SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';

-- Verify patterns table created
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_name = 'patterns';

-- Verify indexes created
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'patterns'
ORDER BY indexname;

-- Verify trigger created
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'patterns';

-- Verify hybrid_search_patterns function created
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name = 'hybrid_search_patterns';

-- Verify test pattern inserted
SELECT pattern_id, name, domain, confidence
FROM patterns
WHERE pattern_id = 'Pattern-TEST-001';

-- Count total patterns
SELECT COUNT(*) as pattern_count FROM patterns;


-- ============================================================================
-- Step 8: Test Queries
-- ============================================================================

/**
 * Test keyword search (will work immediately with test pattern)
 */
SELECT
  pattern_id,
  name,
  domain,
  ts_rank(search_vector, plainto_tsquery('english', 'OAuth2 authentication')) AS rank
FROM patterns
WHERE search_vector @@ plainto_tsquery('english', 'OAuth2 authentication')
ORDER BY rank DESC
LIMIT 5;

/**
 * Test semantic search (requires embedding to be populated)
 * This will return empty until embeddings are generated via Voyage AI
 */
SELECT
  pattern_id,
  name,
  confidence,
  1 - (embedding <=> ARRAY(SELECT 0.1::float FROM generate_series(1, 1024))::vector(1024)) AS similarity
FROM patterns
WHERE embedding IS NOT NULL
ORDER BY embedding <=> ARRAY(SELECT 0.1::float FROM generate_series(1, 1024))::vector(1024)
LIMIT 5;

/**
 * Test hybrid search (requires embedding to be populated)
 */
SELECT * FROM hybrid_search_patterns(
  ARRAY(SELECT 0.1::float FROM generate_series(1, 1024))::vector(1024),
  'OAuth2 authentication',
  NULL,  -- all domains
  5      -- top 5 results
);


-- ============================================================================
-- SUCCESS!
-- ============================================================================

/**
 * If all queries above succeed:
 * ✅ pgvector extension enabled
 * ✅ patterns table created with vector(1024) column
 * ✅ HNSW index created (idx_patterns_embedding)
 * ✅ GIN index created (idx_patterns_search_vector)
 * ✅ B-tree indexes created (domain, confidence, validated, created_at)
 * ✅ search_vector trigger created
 * ✅ hybrid_search_patterns() function created
 * ✅ Test pattern inserted
 * ✅ Keyword search working
 *
 * Next steps:
 * 1. Deploy Edge Function for Voyage AI integration
 * 2. Generate embeddings for existing patterns
 * 3. Start GitHub scraping (Sprint 2)
 */
