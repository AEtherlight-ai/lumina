/**
 * DESIGN DECISION: Direct Supabase upload script using service role key
 * WHY: Bypass CLI authentication issues in non-TTY environment
 *
 * REASONING CHAIN:
 * 1. Read all Pattern-*.md files from docs/patterns/
 * 2. Extract metadata (title, category, quality score) from each file
 * 3. Generate embeddings via Voyage AI (1024 dimensions)
 * 4. Insert patterns into Supabase patterns table
 * 5. Report success/failure for each pattern
 *
 * PATTERN: Pattern-DEPLOYMENT-001 (Automated Pattern Library Deployment)
 * RELATED: Node 1 Deployment, Pattern Library Management
 * PERFORMANCE: <10s for 10 patterns
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../products/lumina-desktop/.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const VOYAGE_API_KEY = process.env.VOYAGE_API_KEY!;

interface PatternMetadata {
  pattern_id: string;
  title: string;
  category: string;
  quality_score: number;
  applicability: string;
  content: string;
  source?: string;
  created?: string;
}

interface VoyageEmbeddingResponse {
  data: Array<{
    embedding: number[];
    index: number;
  }>;
  model: string;
  usage: {
    total_tokens: number;
  };
}

/**
 * Extract metadata from pattern markdown file
 */
function extractMetadata(filePath: string, content: string): PatternMetadata {
  const lines = content.split('\n');

  // Extract pattern ID from filename (e.g., Pattern-EMBEDDING-001.md → Pattern-EMBEDDING-001)
  const filename = path.basename(filePath, '.md');

  // Extract title (first line after # heading)
  const titleMatch = content.match(/^#\s+(.+?)(?:\r?\n|$)/m);
  const title = titleMatch ? titleMatch[1].replace(/^Pattern-[A-Z]+-\d+:\s*/, '') : filename;

  // Extract metadata fields
  const categoryMatch = content.match(/\*\*CATEGORY:\*\*\s*(.+)/i);
  const category = categoryMatch ? categoryMatch[1].trim() : 'General';

  const qualityMatch = content.match(/\*\*QUALITY SCORE:\*\*\s*([\d.]+)/i);
  const quality_score = qualityMatch ? parseFloat(qualityMatch[1]) : 0.85;

  const applicabilityMatch = content.match(/\*\*APPLICABILITY:\*\*\s*(.+)/i);
  const applicability = applicabilityMatch ? applicabilityMatch[1].trim() : '';

  const sourceMatch = content.match(/\*\*SOURCE:\*\*\s*(.+)/i);
  const source = sourceMatch ? sourceMatch[1].trim() : undefined;

  const createdMatch = content.match(/\*\*CREATED:\*\*\s*(.+)/i);
  const created = createdMatch ? createdMatch[1].trim() : undefined;

  return {
    pattern_id: filename,
    title,
    category,
    quality_score,
    applicability,
    content,
    source,
    created
  };
}

/**
 * Generate embedding using Voyage AI
 */
async function generateEmbedding(text: string): Promise<number[]> {
  console.log(`  → Generating embedding (${text.length} chars)...`);

  const response = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${VOYAGE_API_KEY}`
    },
    body: JSON.stringify({
      input: text,
      model: 'voyage-3-code' // 1024 dimensions
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Voyage AI API error: ${response.status} ${error}`);
  }

  const data: VoyageEmbeddingResponse = await response.json();
  console.log(`  ✓ Generated embedding (${data.data[0].embedding.length} dimensions, ${data.usage.total_tokens} tokens)`);

  return data.data[0].embedding;
}

/**
 * Check if patterns table exists, create if needed
 */
async function ensurePatternsTable(supabase: ReturnType<typeof createClient>) {
  console.log('\n📋 Checking patterns table schema...');

  // Check if table exists
  const { data: tables, error: listError } = await supabase
    .from('patterns')
    .select('pattern_id')
    .limit(1);

  if (listError && listError.code === 'PGRST204') {
    console.log('⚠️  Table does not exist, creating...');

    // Create table via SQL
    const { error: createError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS patterns (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          pattern_id VARCHAR(50) UNIQUE NOT NULL,
          title TEXT NOT NULL,
          category VARCHAR(100) NOT NULL,
          quality_score FLOAT NOT NULL,
          applicability TEXT,
          content TEXT NOT NULL,
          source TEXT,
          created VARCHAR(20),
          embedding vector(1024),
          search_vector tsvector,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_patterns_pattern_id ON patterns(pattern_id);
        CREATE INDEX IF NOT EXISTS idx_patterns_category ON patterns(category);
        CREATE INDEX IF NOT EXISTS idx_patterns_quality_score ON patterns(quality_score DESC);
        CREATE INDEX IF NOT EXISTS idx_patterns_embedding ON patterns USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);
        CREATE INDEX IF NOT EXISTS idx_patterns_search_vector ON patterns USING gin(search_vector);

        CREATE OR REPLACE FUNCTION update_pattern_search_vector()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.search_vector := to_tsvector('english', COALESCE(NEW.title, '') || ' ' || COALESCE(NEW.content, ''));
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        DROP TRIGGER IF EXISTS trigger_update_pattern_search_vector ON patterns;
        CREATE TRIGGER trigger_update_pattern_search_vector
        BEFORE INSERT OR UPDATE OF title, content ON patterns
        FOR EACH ROW EXECUTE FUNCTION update_pattern_search_vector();
      `
    });

    if (createError) {
      console.error('❌ Failed to create table:', createError);
      throw createError;
    }

    console.log('✓ Table created successfully');
  } else {
    console.log('✓ Table exists');
  }
}

/**
 * Upload a single pattern to Supabase
 */
async function uploadPattern(
  supabase: ReturnType<typeof createClient>,
  filePath: string
): Promise<void> {
  const filename = path.basename(filePath);
  console.log(`\n📄 Processing ${filename}...`);

  // Read file
  const content = fs.readFileSync(filePath, 'utf-8');

  // Extract metadata
  const metadata = extractMetadata(filePath, content);
  console.log(`  → Pattern ID: ${metadata.pattern_id}`);
  console.log(`  → Title: ${metadata.title}`);
  console.log(`  → Category: ${metadata.category}`);
  console.log(`  → Quality Score: ${metadata.quality_score}`);

  // Generate embedding
  const embedding = await generateEmbedding(metadata.content);

  // Check if pattern already exists
  const { data: existing } = await supabase
    .from('patterns')
    .select('id')
    .eq('pattern_id', metadata.pattern_id)
    .single();

  if (existing) {
    console.log(`  → Pattern exists, updating...`);

    const { error } = await supabase
      .from('patterns')
      .update({
        title: metadata.title,
        category: metadata.category,
        quality_score: metadata.quality_score,
        applicability: metadata.applicability,
        content: metadata.content,
        source: metadata.source,
        created: metadata.created,
        embedding,
        updated_at: new Date().toISOString()
      })
      .eq('pattern_id', metadata.pattern_id);

    if (error) {
      console.error(`  ❌ Update failed:`, error);
      throw error;
    }

    console.log(`  ✓ Updated successfully`);
  } else {
    console.log(`  → Inserting new pattern...`);

    const { error } = await supabase
      .from('patterns')
      .insert({
        pattern_id: metadata.pattern_id,
        title: metadata.title,
        category: metadata.category,
        quality_score: metadata.quality_score,
        applicability: metadata.applicability,
        content: metadata.content,
        source: metadata.source,
        created: metadata.created,
        embedding
      });

    if (error) {
      console.error(`  ❌ Insert failed:`, error);
      throw error;
    }

    console.log(`  ✓ Inserted successfully`);
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 ÆtherLight Pattern Upload Script');
  console.log('=====================================\n');

  // Validate environment variables
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !VOYAGE_API_KEY) {
    throw new Error('Missing required environment variables. Check .env.local file.');
  }

  console.log(`📡 Supabase URL: ${SUPABASE_URL}`);
  console.log(`🔑 Service Role Key: ${SUPABASE_SERVICE_ROLE_KEY.substring(0, 20)}...`);
  console.log(`🚢 Voyage AI Key: ${VOYAGE_API_KEY.substring(0, 20)}...`);

  // Initialize Supabase client
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  // Ensure table exists
  await ensurePatternsTable(supabase);

  // Find all pattern files
  const patternsDir = path.join(__dirname, '../docs/patterns');
  const files = fs.readdirSync(patternsDir)
    .filter(f => f.startsWith('Pattern-') && f.endsWith('.md'))
    .map(f => path.join(patternsDir, f));

  console.log(`\n📚 Found ${files.length} pattern files`);

  // Upload each pattern
  let successCount = 0;
  let failCount = 0;

  for (const file of files) {
    try {
      await uploadPattern(supabase, file);
      successCount++;
    } catch (error) {
      console.error(`\n❌ Failed to upload ${path.basename(file)}:`, error);
      failCount++;
    }
  }

  // Summary
  console.log('\n=====================================');
  console.log('📊 Upload Summary:');
  console.log(`  ✓ Success: ${successCount}`);
  console.log(`  ❌ Failed: ${failCount}`);
  console.log(`  📈 Total: ${files.length}`);
  console.log('\n✨ Done!');
}

// Execute
main().catch(error => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});
