#!/usr/bin/env ts-node
/**
 * Project Documentation Ingestion Script - Load project docs into LOCAL Postgres (or Supabase)
 *
 * DESIGN DECISION: Local Postgres first, Supabase optional (true dogfooding)
 * WHY: Matches our product philosophy - local-first, cloud opt-in (Pattern-060)
 *
 * REASONING CHAIN:
 * 1. User insight: "logical postgres database to start then user can also add supabase"
 * 2. Our product: Local-first, works offline, privacy-first, cloud opt-in
 * 3. Dogfooding means: Use local Postgres like our users do
 * 4. Store embeddings locally: postgresql://localhost:5432/aetherlight_local
 * 5. Query-based loading: Analyze user query → Semantic search → Load top 3-5 chunks
 * 6. Optional: Sync to Supabase later (Node 1 global sync)
 * 7. Result: True dogfooding - works offline, zero cloud dependencies
 *
 * PATTERN: Pattern-DOGFOOD-001 (Semantic Search on Own Documentation)
 * RELATED: Pattern-CONTEXT-002, Pattern-060 (Local-First with Optional Cloud)
 * PERFORMANCE: <2 minutes for full project docs
 *
 * USAGE:
 * ```bash
 * # Local Postgres (default)
 * export AETHERLIGHT_DB_URL="postgresql://localhost:5432/aetherlight_local"
 * export VOYAGE_API_KEY="your-voyage-key"
 * ts-node scripts/ingest-project-docs.ts
 *
 * # Or Supabase (optional)
 * export SUPABASE_URL="https://your-project.supabase.co"
 * export SUPABASE_SERVICE_KEY="your-service-role-key"
 * export VOYAGE_API_KEY="your-voyage-key"
 * ts-node scripts/ingest-project-docs.ts
 * ```
 */

import * as fs from 'fs';
import * as path from 'path';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Client } from 'pg';

interface ProjectDoc {
  doc_id: string;
  doc_type: 'CLAUDE_FULL' | 'PROCESS' | 'ROADMAP' | 'PHASE' | 'PATTERN';
  title: string;
  section?: string;
  content: string;
  chunk_index: number;
  total_chunks: number;
}

/**
 * Chunk large documents into semantic sections
 *
 * DESIGN DECISION: Chunk by markdown sections (## headers), max 2000 chars per chunk
 * WHY: Semantic chunking better than arbitrary splits, preserves context
 */
function chunkDocument(content: string, docId: string, docType: ProjectDoc['doc_type']): ProjectDoc[] {
  const chunks: ProjectDoc[] = [];

  // Split by ## headers
  const sections = content.split(/^##\s+/m).filter(s => s.trim());

  let chunkIndex = 0;

  for (const section of sections) {
    const lines = section.split('\n');
    const title = lines[0].trim();
    const sectionContent = lines.slice(1).join('\n').trim();

    // If section is small enough, add as single chunk
    if (sectionContent.length <= 2000) {
      chunks.push({
        doc_id: `${docId}-${chunkIndex}`,
        doc_type: docType,
        title: title,
        section: title,
        content: sectionContent,
        chunk_index: chunkIndex,
        total_chunks: -1 // Will update after all chunks created
      });
      chunkIndex++;
    } else {
      // Split large sections into 2000-char chunks
      const words = sectionContent.split(' ');
      let currentChunk = '';
      let subChunkIndex = 0;

      for (const word of words) {
        if ((currentChunk + ' ' + word).length > 2000) {
          chunks.push({
            doc_id: `${docId}-${chunkIndex}`,
            doc_type: docType,
            title: title,
            section: `${title} (part ${subChunkIndex + 1})`,
            content: currentChunk.trim(),
            chunk_index: chunkIndex,
            total_chunks: -1
          });
          chunkIndex++;
          subChunkIndex++;
          currentChunk = word;
        } else {
          currentChunk += ' ' + word;
        }
      }

      // Add remaining chunk
      if (currentChunk.trim()) {
        chunks.push({
          doc_id: `${docId}-${chunkIndex}`,
          doc_type: docType,
          title: title,
          section: `${title} (part ${subChunkIndex + 1})`,
          content: currentChunk.trim(),
          chunk_index: chunkIndex,
          total_chunks: -1
        });
        chunkIndex++;
      }
    }
  }

  // Update total_chunks for all chunks
  const totalChunks = chunks.length;
  chunks.forEach(chunk => chunk.total_chunks = totalChunks);

  return chunks;
}

/**
 * Generate Voyage AI embedding
 *
 * DESIGN DECISION: Use Voyage-3-large with 1024 dimensions
 * WHY: 97%+ accuracy, 3× faster than OpenAI, $0.06/1M tokens
 */
async function generateEmbedding(text: string): Promise<number[]> {
  const response = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.VOYAGE_API_KEY}`
    },
    body: JSON.stringify({
      input: text,
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
 * Ingest all project documentation
 */
async function ingestProjectDocs() {
  console.log('🚀 Project Documentation Ingestion Started\n');

  const dbType = detectDatabaseType();
  console.log(`📍 Database: ${dbType === 'local' ? 'Local PostgreSQL (dogfooding)' : 'Supabase (cloud sync)'}\n`);

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
    console.log(`🔌 Connecting to: ${dbUrl}\n`);
    client = new Client({ connectionString: dbUrl });
    await client.connect();
    useSupabase = false;
  }

  // Documents to ingest
  const documents = [
    { path: 'CLAUDE_FULL.md', type: 'CLAUDE_FULL' as const },
    { path: 'PROCESS.md', type: 'PROCESS' as const },
    { path: 'ROADMAP.md', type: 'ROADMAP' as const },
    { path: 'PHASE_0_CODE_ANALYZER.md', type: 'PHASE' as const },
    { path: 'PHASE_1_IMPLEMENTATION.md', type: 'PHASE' as const },
    { path: 'PHASE_2_IMPLEMENTATION.md', type: 'PHASE' as const },
    { path: 'PHASE_3_IMPLEMENTATION.md', type: 'PHASE' as const },
  ];

  let totalChunks = 0;
  let inserted = 0;
  let skipped = 0;
  let errors = 0;

  for (const doc of documents) {
    const filePath = path.join(__dirname, '..', doc.path);

    if (!fs.existsSync(filePath)) {
      console.log(`⏭️  Skipped ${doc.path} (file not found)`);
      skipped++;
      continue;
    }

    console.log(`\n📄 Processing ${doc.path}...`);

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const chunks = chunkDocument(content, doc.path.replace('.md', ''), doc.type);

      console.log(`   Found ${chunks.length} chunks`);
      totalChunks += chunks.length;

      for (const chunk of chunks) {
        try {
          console.log(`   ⏳ Chunk ${chunk.chunk_index + 1}/${chunk.total_chunks}: ${chunk.section?.substring(0, 50)}...`);

          // Generate embedding
          const embeddingText = `${chunk.title}\n${chunk.content}`;
          const embedding = await generateEmbedding(embeddingText);

          // Insert to database (local Postgres or Supabase)
          if (useSupabase) {
            // Supabase insert
            const { error } = await client.from('project_docs').insert({
              doc_id: chunk.doc_id,
              doc_type: chunk.doc_type,
              title: chunk.title,
              section: chunk.section,
              content: chunk.content,
              chunk_index: chunk.chunk_index,
              total_chunks: chunk.total_chunks,
              embedding: embedding
            });

            if (error) {
              if (error.code === '23505') {
                console.log(`      ⏭️  Already exists, skipping`);
                skipped++;
              } else {
                console.error(`      ❌ Error: ${error.message}`);
                errors++;
              }
            } else {
              console.log(`      ✅ Inserted`);
              inserted++;
            }
          } else {
            // Local Postgres insert
            const embeddingStr = `[${embedding.join(',')}]`;
            const query = `
              INSERT INTO project_docs (doc_id, doc_type, title, section, content, chunk_index, total_chunks, embedding)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8::vector)
              ON CONFLICT (doc_id) DO NOTHING
            `;
            const values = [
              chunk.doc_id,
              chunk.doc_type,
              chunk.title,
              chunk.section,
              chunk.content,
              chunk.chunk_index,
              chunk.total_chunks,
              embeddingStr
            ];

            try {
              const result = await client.query(query, values);
              if (result.rowCount === 0) {
                console.log(`      ⏭️  Already exists, skipping`);
                skipped++;
              } else {
                console.log(`      ✅ Inserted`);
                inserted++;
              }
            } catch (error: any) {
              console.error(`      ❌ Error: ${error.message}`);
              errors++;
            }
          }

          // Rate limiting (Voyage AI: 100 requests/min)
          await new Promise(resolve => setTimeout(resolve, 600));

        } catch (error: any) {
          console.error(`      ❌ Error: ${error.message}`);
          errors++;
        }
      }

    } catch (error: any) {
      console.error(`   ❌ Error processing ${doc.path}:`, error.message);
      errors++;
    }
  }

  // Cleanup
  if (!useSupabase) {
    await client.end();
    console.log('\n🔌 Database connection closed');
  }

  // Summary
  console.log('\n' + '━'.repeat(60));
  console.log('📊 INGESTION SUMMARY\n');
  console.log(`Database:        ${dbType === 'local' ? 'Local PostgreSQL' : 'Supabase'}`);
  console.log(`Total documents: ${documents.length}`);
  console.log(`Total chunks:    ${totalChunks}`);
  console.log(`✅ Inserted:     ${inserted}`);
  console.log(`⏭️  Skipped:      ${skipped}`);
  console.log(`❌ Errors:       ${errors}`);
  console.log('━'.repeat(60));

  if (inserted > 0) {
    const dbName = dbType === 'local' ? 'local PostgreSQL' : 'Supabase';
    console.log(`\n🎉 Project docs ingestion complete! Docs are now searchable in ${dbName}.`);
    console.log('\nNext: Use query-based context loader to load only relevant docs per task.');
  }

  if (errors > 0) {
    console.log('\n⚠️  Some chunks failed to ingest. Check error messages above.');
    process.exit(1);
  }
}

// Run ingestion
ingestProjectDocs().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
