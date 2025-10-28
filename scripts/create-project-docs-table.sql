-- Project Documentation Table Schema
-- Stores chunked project docs (CLAUDE_FULL.md, PROCESS.md, etc.) with embeddings

CREATE TABLE IF NOT EXISTS project_docs (
  id BIGSERIAL PRIMARY KEY,
  doc_id TEXT NOT NULL UNIQUE,
  doc_type TEXT NOT NULL CHECK (doc_type IN ('CLAUDE_FULL', 'PROCESS', 'ROADMAP', 'PHASE', 'PATTERN')),
  title TEXT NOT NULL,
  section TEXT,
  content TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  total_chunks INTEGER NOT NULL,
  embedding vector(1024),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create HNSW index for fast semantic search
-- m=16, ef_construction=64 (optimized for 1024-dim Voyage-3-large)
CREATE INDEX IF NOT EXISTS idx_project_docs_embedding
ON project_docs
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Create index on doc_type for filtering
CREATE INDEX IF NOT EXISTS idx_project_docs_type ON project_docs(doc_type);

-- Create index on title for keyword search
CREATE INDEX IF NOT EXISTS idx_project_docs_title ON project_docs(title);

-- Create full-text search index
CREATE INDEX IF NOT EXISTS idx_project_docs_content_fts
ON project_docs
USING gin(to_tsvector('english', content));

-- Search function: Hybrid semantic + keyword search
CREATE OR REPLACE FUNCTION search_project_docs(
  query_embedding vector(1024),
  query_text TEXT,
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  doc_id TEXT,
  doc_type TEXT,
  title TEXT,
  section TEXT,
  content TEXT,
  chunk_index INTEGER,
  similarity FLOAT,
  relevance_score FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH semantic_search AS (
    SELECT
      pd.doc_id,
      pd.doc_type,
      pd.title,
      pd.section,
      pd.content,
      pd.chunk_index,
      1 - (pd.embedding <=> query_embedding) AS similarity
    FROM project_docs pd
    WHERE 1 - (pd.embedding <=> query_embedding) > match_threshold
    ORDER BY pd.embedding <=> query_embedding
    LIMIT match_count * 2
  ),
  keyword_search AS (
    SELECT
      pd.doc_id,
      ts_rank(to_tsvector('english', pd.content), plainto_tsquery('english', query_text)) AS keyword_rank
    FROM project_docs pd
    WHERE to_tsvector('english', pd.content) @@ plainto_tsquery('english', query_text)
  )
  SELECT
    ss.doc_id,
    ss.doc_type,
    ss.title,
    ss.section,
    ss.content,
    ss.chunk_index,
    ss.similarity,
    -- Hybrid score: 60% semantic + 40% keyword
    (ss.similarity * 0.6 + COALESCE(ks.keyword_rank, 0) * 0.4) AS relevance_score
  FROM semantic_search ss
  LEFT JOIN keyword_search ks ON ss.doc_id = ks.doc_id
  ORDER BY relevance_score DESC
  LIMIT match_count;
END;
$$;

-- Example usage:
-- SELECT * FROM search_project_docs(
--   '[0.1, 0.2, ...]'::vector(1024),  -- Query embedding
--   'pattern matching confidence',      -- Query text
--   0.7,                                 -- Match threshold
--   5                                    -- Max results
-- );

COMMENT ON TABLE project_docs IS 'Chunked project documentation with embeddings for semantic search';
COMMENT ON FUNCTION search_project_docs IS 'Hybrid semantic + keyword search over project docs (60/40 weighting)';
