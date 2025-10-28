#!/usr/bin/env ts-node
/**
 * Query-Based Context Loader - Load only relevant docs based on semantic search
 *
 * DESIGN DECISION: Local Postgres first, Supabase optional (true dogfooding)
 * WHY: Matches our product philosophy - local-first, cloud opt-in (Pattern-060)
 *
 * REASONING CHAIN:
 * 1. User sends query/task to Claude Code
 * 2. Extract query intent (e.g., "implement OAuth2 authentication")
 * 3. Generate Voyage AI embedding for query
 * 4. Semantic search against project_docs table (local Postgres or Supabase)
 * 5. Load only top 3-5 matched chunks (not all docs)
 * 6. Provide to Claude Code as context
 * 7. Result: Load 200-500 tokens (vs 750 tokens from CLAUDE.md alone)
 *
 * PATTERN: Pattern-DOGFOOD-001 (Semantic Search on Own Documentation)
 * RELATED: Pattern-CONTEXT-002, Pattern-060, scripts/ingest-project-docs.ts
 * PERFORMANCE: <200ms total (50ms embedding + 100ms search + 50ms load)
 *
 * USAGE:
 * ```bash
 * # Local Postgres (default)
 * export AETHERLIGHT_DB_URL="postgresql://localhost:5432/aetherlight_local"
 * export VOYAGE_API_KEY="your-voyage-key"
 * ts-node scripts/query-context-loader.ts "implement OAuth2 authentication"
 *
 * # Or Supabase (optional)
 * export SUPABASE_URL="https://your-project.supabase.co"
 * export SUPABASE_SERVICE_KEY="your-service-role-key"
 * export VOYAGE_API_KEY="your-voyage-key"
 * ts-node scripts/query-context-loader.ts "implement OAuth2 authentication"
 * ```
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Client } from 'pg';

interface DocChunk {
  doc_id: string;
  doc_type: string;
  title: string;
  section?: string;
  content: string;
  chunk_index: number;
  similarity: number;
  relevance_score: number;
}

interface ContextLoaderResult {
  chunks: DocChunk[];
  totalTokens: number;
  loadTime: number;
}

/**
 * Generate Voyage AI embedding for query
 *
 * DESIGN DECISION: Use Voyage-3-large with 1024 dimensions
 * WHY: Same model as ingestion, ensures semantic consistency
 */
async function generateQueryEmbedding(query: string): Promise<number[]> {
  const response = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.VOYAGE_API_KEY}`
    },
    body: JSON.stringify({
      input: query,
      model: 'voyage-3-code'
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Voyage AI error: ${response.status} ${error}`);
  }

  const data = await response.json() as { data: Array<{ embedding: number[] }> };
  return data.data[0].embedding;
}

/**
 * Estimate token count (rough: 1 token ≈ 4 chars)
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Detect database type (local Postgres or Supabase)
 */
function detectDatabaseType(): 'local' | 'supabase' {
  if (process.env.AETHERLIGHT_DB_URL || process.env.AETHERLIGHT_USE_LOCAL === 'true') {
    return 'local';
  }
  if (process.env.SUPABASE_URL) {
    return 'supabase';
  }
  // Default to local (dogfooding)
  return 'local';
}

/**
 * Query-based context loader
 *
 * @param query User's query or task description
 * @param matchCount Number of chunks to return (default: 5)
 * @param matchThreshold Similarity threshold 0-1 (default: 0.7)
 * @returns Relevant doc chunks with metadata
 */
export async function queryContextLoader(
  query: string,
  matchCount: number = 5,
  matchThreshold: number = 0.7
): Promise<ContextLoaderResult> {
  const startTime = Date.now();

  const dbType = detectDatabaseType();

  // Validate environment variables
  if (!process.env.VOYAGE_API_KEY) {
    throw new Error('VOYAGE_API_KEY environment variable not set');
  }

  let client: any;
  let useSupabase = false;

  if (dbType === 'supabase') {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY required for Supabase mode');
    }
    client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    useSupabase = true;
  } else {
    // Local Postgres
    const dbUrl = process.env.AETHERLIGHT_DB_URL || 'postgresql://localhost:5432/aetherlight_local';
    client = new Client({ connectionString: dbUrl });
    await client.connect();
    useSupabase = false;
  }

  // Generate query embedding
  console.log('⏳ Generating query embedding...');
  const queryEmbedding = await generateQueryEmbedding(query);

  // Search project_docs
  console.log('🔍 Searching project docs...');

  let chunks: DocChunk[] = [];

  if (useSupabase) {
    // Supabase RPC call
    const { data, error } = await client.rpc('search_project_docs', {
      query_embedding: queryEmbedding,
      query_text: query,
      match_threshold: matchThreshold,
      match_count: matchCount
    });

    if (error) {
      throw new Error(`Supabase error: ${error.message}`);
    }

    chunks = data || [];
  } else {
    // Local Postgres query
    const embeddingStr = `[${queryEmbedding.join(',')}]`;
    const result = await client.query(
      `SELECT * FROM search_project_docs($1::vector, $2, $3, $4)`,
      [embeddingStr, query, matchThreshold, matchCount]
    );
    chunks = result.rows;
  }

  // Cleanup
  if (!useSupabase) {
    await client.end();
  }

  // Calculate total tokens
  const totalTokens = chunks.reduce((sum, chunk) => {
    return sum + estimateTokens(chunk.content);
  }, 0);

  const loadTime = Date.now() - startTime;

  console.log(`✅ Found ${chunks.length} relevant chunks (${totalTokens} tokens) in ${loadTime}ms`);

  return {
    chunks,
    totalTokens,
    loadTime
  };
}

/**
 * Format chunks for Claude Code context
 *
 * @param result Context loader result
 * @returns Formatted markdown for context
 */
export function formatContextForClaudeCode(result: ContextLoaderResult): string {
  let markdown = '# Query-Based Context (Semantic Search)\n\n';
  markdown += `**Loaded:** ${result.chunks.length} chunks (${result.totalTokens} tokens) in ${result.loadTime}ms\n\n`;
  markdown += '---\n\n';

  for (const chunk of result.chunks) {
    markdown += `## ${chunk.title}`;
    if (chunk.section) {
      markdown += ` - ${chunk.section}`;
    }
    markdown += '\n\n';
    markdown += `**Source:** ${chunk.doc_type} (chunk ${chunk.chunk_index})\n`;
    markdown += `**Relevance:** ${(chunk.relevance_score * 100).toFixed(1)}%\n\n`;
    markdown += chunk.content;
    markdown += '\n\n---\n\n';
  }

  return markdown;
}

// CLI usage
if (require.main === module) {
  const query = process.argv[2] || 'pattern matching confidence scoring';

  console.log(`\n🚀 Query-Based Context Loader\n`);
  console.log(`Query: "${query}"\n`);

  queryContextLoader(query)
    .then(result => {
      console.log('\n📄 Results:\n');
      result.chunks.forEach((chunk, i) => {
        console.log(`${i + 1}. [${chunk.doc_type}] ${chunk.title}${chunk.section ? ' - ' + chunk.section : ''}`);
        console.log(`   Relevance: ${(chunk.relevance_score * 100).toFixed(1)}% | Tokens: ~${estimateTokens(chunk.content)}`);
      });

      console.log('\n' + '━'.repeat(60));
      console.log('📊 Summary\n');
      console.log(`Total chunks:  ${result.chunks.length}`);
      console.log(`Total tokens:  ${result.totalTokens}`);
      console.log(`Load time:     ${result.loadTime}ms`);
      console.log('━'.repeat(60));

      // Output formatted context
      const formattedContext = formatContextForClaudeCode(result);
      console.log('\n💬 Formatted Context for Claude Code:\n');
      console.log(formattedContext.substring(0, 500) + '...\n');
    })
    .catch(error => {
      console.error('Error:', error.message);
      process.exit(1);
    });
}
