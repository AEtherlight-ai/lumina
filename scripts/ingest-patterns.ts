#!/usr/bin/env ts-node
/**
 * Pattern Ingestion Script - Load docs/patterns/ into Supabase
 *
 * DESIGN DECISION: Parse markdown → Extract Chain of Thought → Generate Voyage AI embeddings → Insert to Supabase
 * WHY: Centralize pattern storage, enable semantic search, ready for Phase 4 autonomous sprints
 *
 * REASONING CHAIN:
 * 1. Read all Pattern-*.md files from docs/patterns/
 * 2. Parse each file to extract: name, domain, design_decision, why, reasoning_chain, code_example
 * 3. Generate 1024-dim Voyage AI embedding for each pattern
 * 4. Insert to Supabase patterns table
 * 5. Result: 47 patterns ready for semantic search
 *
 * PATTERN: Pattern-EMBEDDING-001 (Voyage AI Integration)
 * RELATED: Phase 3 AI-005 (Pattern Index), Node 1 Deployment
 * PERFORMANCE: <30 seconds for 47 patterns (rate limited to 100/min)
 *
 * USAGE:
 * ```bash
 * # IMPORTANT: Use Node 1 Supabase (pattern network), NOT project Supabase
 * export SUPABASE_URL="https://node1-project.supabase.co"
 * export SUPABASE_SERVICE_KEY="node1-service-role-key"
 * export VOYAGE_API_KEY="your-voyage-key"
 * ts-node scripts/ingest-patterns.ts
 * ```
 *
 * ARCHITECTURE:
 * - Project Supabase: Application data (users, sessions, app state)
 * - Node 1 Supabase: Pattern network (patterns + CodeSearchNet) ← USE THIS
 */

import * as fs from 'fs';
import * as path from 'path';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

interface ParsedPattern {
  pattern_id: string;
  name: string;
  domain: string;
  design_decision: string;
  why: string;
  reasoning_chain: string[];
  code_example?: string;
  source_language?: string;
  confidence: number;
}

/**
 * Parse pattern markdown file
 *
 * DESIGN DECISION: Extract structured data from markdown sections
 * WHY: Semantic search needs clean text (not markdown syntax)
 */
function parsePattern(filePath: string): ParsedPattern | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const filename = path.basename(filePath, '.md');

    // Extract pattern ID from filename
    const pattern_id = filename;

    // Extract category and infer domain
    const categoryMatch = pattern_id.match(/Pattern-([A-Z-]+)-\d+/);
    const category = categoryMatch ? categoryMatch[1] : 'UNKNOWN';

    // Map category to domain (Marketing or Legal)
    // For now, we'll use a simple heuristic - later can be refined
    const domain = inferDomain(category, content);

    // Extract pattern name (first # heading)
    const nameMatch = content.match(/^#\s+(.+)$/m);
    const name = nameMatch ? nameMatch[1] : pattern_id;

    // EDGE CASE HANDLING: Extract Chain of Thought from multiple locations
    // Format 1: **DESIGN DECISION:** (inline bold - older patterns)
    // Format 2: ## Design Decision heading (newer patterns from Phase 3.5/3.6)

    // Extract "DESIGN DECISION" section
    let designMatchOutside = content.match(/\*\*DESIGN DECISION:\*\*\s*(.+?)(?:\n\n|\n\*\*|$)/s);
    let designMatchInside = content.match(/```[\w]*\r?\n[\s\S]*?\*\s*DESIGN DECISION:\s*(.+?)(?:\r?\n|\*)/);
    // Also check for multi-line comment blocks (/** ... */) inside code fences (Windows CRLF support)
    let designMatchComment = content.match(/```[\w]*\r?\n\/\*\*[\s\S]*?DESIGN DECISION:\s*(.+?)(?:\r?\n)/);
    let designMatch = designMatchOutside || designMatchInside || designMatchComment;

    // Format 2 fallback: ## Design Decision heading (extract content after heading until next ## or ---)
    if (!designMatch) {
      const sectionMatch = content.match(/##\s+Design Decision\s*\n+([\s\S]+?)(?:\n##|\n---|$)/);
      if (sectionMatch) {
        // Extract first paragraph (before double newline or sub-heading)
        const firstPara = sectionMatch[1].split('\n\n')[0].trim();
        if (firstPara) designMatch = ['', firstPara] as RegExpMatchArray; // Simulate match array
      }
    }

    // Format 3 fallback: ## Problem Statement (FAILURE patterns use this instead of Design Decision)
    if (!designMatch) {
      const problemMatch = content.match(/##\s+Problem Statement\s*\n+([\s\S]+?)(?:\n##|\n---|$)/);
      if (problemMatch) {
        // Extract problem statement as design decision
        const problemContent = problemMatch[1].trim();
        if (problemContent) designMatch = ['', problemContent] as RegExpMatchArray;
      }
    }

    // Format 4 fallback: ## Problem (singular, Pattern-FAILURE-006 uses this)
    if (!designMatch) {
      const problemSingularMatch = content.match(/##\s+Problem\s*\n+([\s\S]+?)(?:\n##|\n---|$)/);
      if (problemSingularMatch) {
        const problemContent = problemSingularMatch[1].trim();
        if (problemContent) designMatch = ['', problemContent] as RegExpMatchArray;
      }
    }

    const design_decision = designMatch ? designMatch[1].trim() : '';

    if (!design_decision) {
      console.warn(`⚠️  ${pattern_id}: No DESIGN DECISION found (checked markdown and code blocks)`);
      return null;
    }

    // Extract "WHY" section
    let whyMatchOutside = content.match(/\*\*WHY:\*\*\s*(.+?)(?:\n\n|\n\*\*|$)/s);
    let whyMatchInside = content.match(/```[\w]*\r?\n[\s\S]*?\*\s*WHY:\s*(.+?)(?:\r?\n|\*)/);
    // Also check for multi-line comment blocks (/** ... */) inside code fences (Windows CRLF support)
    let whyMatchComment = content.match(/```[\w]*\r?\n\/\*\*[\s\S]*?WHY:\s*(.+?)(?:\r?\n)/);
    let whyMatch = whyMatchOutside || whyMatchInside || whyMatchComment;

    // Format 2 fallback: ## Why heading (extract content after heading until next ## or ---)
    if (!whyMatch) {
      const sectionMatch = content.match(/##\s+Why\s*\n+([\s\S]+?)(?:\n##|\n---|$)/);
      if (sectionMatch) {
        // Extract all content until next section (may include **PRINCIPLE:** or bullet points)
        const whyContent = sectionMatch[1].trim();
        if (whyContent) whyMatch = ['', whyContent] as RegExpMatchArray; // Simulate match array
      }
    }

    // Format 3 fallback: ## Domain Expertise (agent implementation patterns use this instead of Why)
    if (!whyMatch) {
      const domainMatch = content.match(/##\s+Domain Expertise\s*\n+([\s\S]+?)(?:\n##|\n---|$)/);
      if (domainMatch) {
        // Extract expertise description as WHY rationale
        const expertiseContent = domainMatch[1].trim();
        if (expertiseContent) whyMatch = ['', expertiseContent] as RegExpMatchArray;
      }
    }

    // Format 4 fallback: ## Root Causes (FAILURE patterns use this instead of Why)
    if (!whyMatch) {
      const rootCausesMatch = content.match(/##\s+Root Causes\s*\n+([\s\S]+?)(?:\n##|\n---|$)/);
      if (rootCausesMatch) {
        // Extract root causes as WHY rationale
        const rootCausesContent = rootCausesMatch[1].trim();
        if (rootCausesContent) whyMatch = ['', rootCausesContent] as RegExpMatchArray;
      }
    }

    // Format 5 fallback: ## Root Cause (singular, Pattern-FAILURE-006 uses this)
    if (!whyMatch) {
      const rootCauseSingularMatch = content.match(/##\s+Root Cause\s*\n+([\s\S]+?)(?:\n##|\n---|$)/);
      if (rootCauseSingularMatch) {
        const rootCauseContent = rootCauseSingularMatch[1].trim();
        if (rootCauseContent) whyMatch = ['', rootCauseContent] as RegExpMatchArray;
      }
    }

    const why = whyMatch ? whyMatch[1].trim() : '';

    if (!why) {
      console.warn(`⚠️  ${pattern_id}: No WHY found (checked markdown and code blocks)`);
      return null;
    }

    // Extract "REASONING CHAIN" section
    let reasoningMatchOutside = content.match(/\*\*REASONING CHAIN:\*\*\s*\n((?:\d+\..+\n?)+)/);
    let reasoningMatchInside = content.match(/```[\w]*\r?\n[\s\S]*?\*\s*REASONING CHAIN:\s*\r?\n((?:\s*\*\s*\d+\..+[\r\n]?)+)/);
    // Also check for multi-line comment blocks (/** ... */) inside code fences (Windows CRLF support)
    let reasoningMatchComment = content.match(/```[\w]*\r?\n\/\*\*[\s\S]*?REASONING CHAIN:\s*\r?\n((?:\s*\*\s*\d+\..+[\r\n]?)+)/);
    let reasoningMatch = reasoningMatchOutside || reasoningMatchInside || reasoningMatchComment;

    let reasoning_chain: string[] = [];

    if (reasoningMatch) {
      reasoning_chain = reasoningMatch[1]
        .split('\n')
        .filter(line => line.trim() && line.match(/\d+\./))
        .map(line => line.replace(/^\s*\*?\s*\d+\.\s*/, '').trim());
    }

    // Format 2 fallback: For patterns without explicit "REASONING CHAIN" section,
    // extract implementation details from ## Implementation or similar sections
    let implMatch: RegExpMatchArray | null = null;
    if (reasoning_chain.length === 0) {
      // Try to find ## Implementation, ## Implementation Highlights, ## Key Implementation Details
      implMatch = content.match(/##\s+(Implementation|Implementation Highlights|Escalation Logic|Core Types|Key Implementation Details)\s*\n+([\s\S]+?)(?:\n##|\n---|$)/);
      if (implMatch) {
        // Extract bullet points or numbered items from implementation section
        const implContent = implMatch[2];
        const bullets = implContent.split('\n').filter(line => {
          const trimmed = line.trim();
          return trimmed.match(/^[-*]\s+/) || trimmed.match(/^\d+\.\s+/) || trimmed.startsWith('**');
        });

        if (bullets.length > 0) {
          reasoning_chain = bullets
            .map(line => line.replace(/^[-*]\s*/, '').replace(/^\d+\.\s*/, '').replace(/^\*\*(.+?)\*\*:?/, '$1').trim())
            .filter(line => line.length > 10); // Skip very short lines
        }
      }

      // Still empty? Extract ### headings as reasoning steps (lowered threshold to 1+)
      if (reasoning_chain.length === 0) {
        const headings = content.match(/###\s+(.+)/g);
        if (headings && headings.length >= 1) {
          reasoning_chain = headings
            .map(h => h.replace(/^###\s+/, '').trim())
            .slice(0, 5); // Take first 5 headings as reasoning steps
        }
      }

      // FINAL FALLBACK: If Implementation section has prose but no bullets/numbers,
      // extract sentences or paragraphs as reasoning steps
      if (reasoning_chain.length === 0 && implMatch) {
        const implContent = implMatch[2];
        // Remove code blocks first
        const withoutCode = implContent.replace(/```[\s\S]*?```/g, '');
        // Split by double newlines (paragraphs) or single newlines (sentences)
        const paragraphs = withoutCode
          .split(/\n\n+/)
          .map(p => p.trim())
          .filter(p => p.length > 20 && !p.startsWith('##') && !p.startsWith('**')); // Skip headings

        if (paragraphs.length > 0) {
          reasoning_chain = paragraphs.slice(0, 5); // Take first 5 paragraphs
        }
      }
    }

    if (reasoning_chain.length === 0) {
      console.warn(`⚠️  ${pattern_id}: No REASONING CHAIN found (checked markdown, code blocks, implementation sections, headings, and paragraphs)`);
      return null;
    }

    // Extract code example (first ```...``` block)
    const codeMatch = content.match(/```([\w]*)\n(.+?)\n```/s);
    const code_example = codeMatch ? codeMatch[2] : undefined;
    const source_language = codeMatch ? codeMatch[1] || 'unknown' : undefined;

    // Extract confidence from PERFORMANCE section (if available)
    const perfMatch = content.match(/PERFORMANCE:.*?(\d+)%/);
    const confidence = perfMatch ? Math.min(parseFloat(perfMatch[1]) / 100, 1.0) : 0.85;

    return {
      pattern_id,
      name,
      domain,
      design_decision,
      why,
      reasoning_chain,
      code_example,
      source_language,
      confidence
    };
  } catch (error) {
    console.error(`Error parsing ${filePath}:`, error);
    return null;
  }
}

/**
 * Infer domain from category and content
 *
 * DESIGN DECISION: Simple heuristic for now (Marketing vs Legal)
 * WHY: Need to categorize patterns, can refine later with ML
 */
function inferDomain(category: string, content: string): string {
  const lowerContent = content.toLowerCase();

  // Legal indicators
  if (
    lowerContent.includes('legal') ||
    lowerContent.includes('case') ||
    lowerContent.includes('attorney') ||
    lowerContent.includes('litigation') ||
    category.includes('LEGAL')
  ) {
    return 'Legal';
  }

  // Marketing indicators
  if (
    lowerContent.includes('marketing') ||
    lowerContent.includes('customer') ||
    lowerContent.includes('campaign') ||
    lowerContent.includes('segment') ||
    category.includes('MARKETING')
  ) {
    return 'Marketing';
  }

  // Default to Marketing for technical patterns (they're generally applicable)
  return 'Marketing';
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
 * Ingest all patterns
 */
async function ingestPatterns() {
  console.log('🚀 Pattern Ingestion Started\n');

  // Validate environment variables
  if (!process.env.SUPABASE_URL) {
    throw new Error('SUPABASE_URL environment variable not set');
  }
  if (!process.env.SUPABASE_SERVICE_KEY) {
    throw new Error('SUPABASE_SERVICE_KEY environment variable not set');
  }
  if (!process.env.VOYAGE_API_KEY) {
    throw new Error('VOYAGE_API_KEY environment variable not set');
  }

  // Initialize Supabase client
  const supabase: SupabaseClient = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  // Get all pattern files
  const patternsDir = path.join(__dirname, '../docs/patterns');
  const files = fs
    .readdirSync(patternsDir)
    .filter(file => file.endsWith('.md') && file.startsWith('Pattern-'))
    .sort();

  console.log(`Found ${files.length} pattern files\n`);

  let inserted = 0;
  let skipped = 0;
  let errors = 0;

  for (const file of files) {
    const filePath = path.join(patternsDir, file);

    try {
      // Parse pattern
      const pattern = parsePattern(filePath);

      if (!pattern) {
        console.log(`⏭️  Skipped ${file} (incomplete Chain of Thought)`);
        skipped++;
        continue;
      }

      console.log(`📄 Processing ${pattern.pattern_id}...`);

      // Generate embedding text (combine key fields)
      const embeddingText = [
        pattern.name,
        pattern.design_decision,
        pattern.why,
        ...pattern.reasoning_chain
      ].join(' ');

      // Generate embedding
      console.log(`   ⏳ Generating embedding...`);
      const embedding = await generateEmbedding(embeddingText);

      // Insert to Supabase
      console.log(`   ⏳ Inserting to Supabase...`);

      // Build insert object with only required + available optional fields
      const insertData: any = {
        pattern_id: pattern.pattern_id,
        name: pattern.name,
        domain: pattern.domain,
        design_decision: pattern.design_decision,
        why: pattern.why,
        reasoning_chain: pattern.reasoning_chain,
        embedding: embedding,
        confidence: pattern.confidence,
        validated: true
      };

      // Only include code_example if it exists and column exists in schema
      if (pattern.code_example) {
        insertData.code_example = pattern.code_example;
      }

      const { error } = await supabase.from('patterns').insert(insertData);

      if (error) {
        if (error.code === '23505') {
          // Duplicate key - pattern already exists
          console.log(`   ⏭️  Already exists, skipping`);
          skipped++;
        } else {
          console.error(`   ❌ Error: ${error.message}`);
          errors++;
        }
      } else {
        console.log(`   ✅ Inserted successfully`);
        inserted++;
      }

      // Rate limiting (Voyage AI: 100 requests/min)
      await new Promise(resolve => setTimeout(resolve, 600)); // 600ms = 100/min

    } catch (error: any) {
      console.error(`   ❌ Error processing ${file}:`, error.message);
      errors++;
    }

    console.log(''); // Empty line for readability
  }

  // Summary
  console.log('━'.repeat(60));
  console.log('📊 INGESTION SUMMARY\n');
  console.log(`Total files:    ${files.length}`);
  console.log(`✅ Inserted:    ${inserted}`);
  console.log(`⏭️  Skipped:     ${skipped}`);
  console.log(`❌ Errors:      ${errors}`);
  console.log('━'.repeat(60));

  if (inserted > 0) {
    console.log('\n🎉 Pattern ingestion complete! Patterns are now searchable in Supabase.');
  }

  if (errors > 0) {
    console.log('\n⚠️  Some patterns failed to ingest. Check error messages above.');
    process.exit(1);
  }
}

// Run ingestion
ingestPatterns().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
