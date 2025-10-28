-- ============================================
-- Unified Hybrid Search Function
-- ============================================
--
-- DESIGN DECISION: Unified search across custom patterns + CodeSearchNet with confidence multiplier
-- WHY: Custom patterns (0.95 confidence) rank higher than bootstrap (0.75 confidence) automatically
--
-- USAGE: Copy/paste this into Supabase SQL Editor AFTER running setup_supabase_schema.sql
--
-- PATTERN: Pattern-UNIFIED-SEARCH-001 (Multi-Source Hybrid Search)
-- PERFORMANCE: <120ms (p50), <200ms (p95)

CREATE OR REPLACE FUNCTION unified_hybrid_search(
  query_text TEXT,
  query_embedding vector(1024),
  query_language VARCHAR(50) DEFAULT NULL,  -- Filter CodeSearchNet by language
  semantic_weight DECIMAL(3,2) DEFAULT 0.6,  -- 60% semantic, 40% keyword
  result_limit INTEGER DEFAULT 5,
  min_confidence DECIMAL(3,2) DEFAULT 0.70  -- Lower threshold to include CodeSearchNet (0.75)
)
RETURNS TABLE (
  result_id VARCHAR(100),
  result_name VARCHAR(255),
  source VARCHAR(50),  -- 'custom' or 'codesearchnet'
  language VARCHAR(50),
  content TEXT,  -- design_decision (custom) or docstring (CodeSearchNet)
  code_example TEXT,
  semantic_score DECIMAL(5,4),
  keyword_score REAL,
  combined_score DECIMAL(5,4),
  confidence DECIMAL(3,2),
  final_score DECIMAL(5,4)  -- combined_score * confidence (for ranking)
) AS $$
BEGIN
  RETURN QUERY
  WITH custom_semantic AS (
    -- Custom patterns: semantic similarity
    SELECT
      p.pattern_id AS id,
      p.name,
      'custom'::VARCHAR(50) AS source,
      p.source_language AS language,
      p.design_decision AS content,
      p.code_example,
      p.confidence,
      (1 - (p.embedding <=> query_embedding))::DECIMAL(5,4) AS score
    FROM patterns p
    WHERE p.validated = TRUE
      AND p.confidence >= min_confidence
      AND p.embedding IS NOT NULL
  ),
  custom_keyword AS (
    -- Custom patterns: keyword search
    SELECT
      p.pattern_id AS id,
      ts_rank(p.search_vector, plainto_tsquery('english', query_text)) AS score
    FROM patterns p
    WHERE p.search_vector @@ plainto_tsquery('english', query_text)
      AND p.validated = TRUE
      AND p.confidence >= min_confidence
  ),
  codesearchnet_semantic AS (
    -- CodeSearchNet: semantic similarity
    SELECT
      c.function_id AS id,
      c.function_name AS name,
      'codesearchnet'::VARCHAR(50) AS source,
      c.language,
      c.docstring AS content,
      c.code AS code_example,
      c.confidence,
      (1 - (c.embedding <=> query_embedding))::DECIMAL(5,4) AS score
    FROM codesearchnet_functions c
    WHERE c.embedding IS NOT NULL
      AND c.confidence >= min_confidence
      AND (query_language IS NULL OR c.language = query_language)
  ),
  codesearchnet_keyword AS (
    -- CodeSearchNet: keyword search
    SELECT
      c.function_id AS id,
      ts_rank(c.search_vector, plainto_tsquery('english', query_text)) AS score
    FROM codesearchnet_functions c
    WHERE c.search_vector @@ plainto_tsquery('english', query_text)
      AND c.confidence >= min_confidence
      AND (query_language IS NULL OR c.language = query_language)
  ),
  unified_results AS (
    -- Combine custom patterns
    SELECT
      cs.id,
      cs.name,
      cs.source,
      cs.language,
      cs.content,
      cs.code_example,
      cs.score AS semantic_score,
      COALESCE(ck.score, 0) AS keyword_score,
      (semantic_weight * cs.score + (1 - semantic_weight) * COALESCE(ck.score, 0))::DECIMAL(5,4) AS combined_score,
      cs.confidence
    FROM custom_semantic cs
    LEFT JOIN custom_keyword ck ON cs.id = ck.id

    UNION ALL

    -- Combine CodeSearchNet functions
    SELECT
      csn.id,
      csn.name,
      csn.source,
      csn.language,
      csn.content,
      csn.code_example,
      csn.score AS semantic_score,
      COALESCE(csnk.score, 0) AS keyword_score,
      (semantic_weight * csn.score + (1 - semantic_weight) * COALESCE(csnk.score, 0))::DECIMAL(5,4) AS combined_score,
      csn.confidence
    FROM codesearchnet_semantic csn
    LEFT JOIN codesearchnet_keyword csnk ON csn.id = csnk.id
  )
  -- Return unified results with confidence multiplier for ranking
  SELECT
    ur.id AS result_id,
    ur.name AS result_name,
    ur.source,
    ur.language,
    ur.content,
    ur.code_example,
    ur.semantic_score,
    ur.keyword_score,
    ur.combined_score,
    ur.confidence,
    (ur.combined_score * ur.confidence)::DECIMAL(5,4) AS final_score
  FROM unified_results ur
  ORDER BY final_score DESC  -- Key: confidence multiplier boosts custom patterns
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VALIDATION: Test function
-- ============================================

-- Verify function created
SELECT proname, pronargs
FROM pg_proc
WHERE proname = 'unified_hybrid_search';

-- Expected output:
-- proname: unified_hybrid_search
-- pronargs: 6
