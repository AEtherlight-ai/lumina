#!/usr/bin/env node

/**
 * DESIGN DECISION: Upload existing patterns from docs/patterns/ to Supabase
 * WHY: Populate pattern library with high-quality seed data
 *
 * REASONING CHAIN:
 * 1. Read all Pattern-*.md files from docs/patterns/
 * 2. Parse markdown to extract metadata and Chain of Thought fields
 * 3. Generate temporary embeddings (will be replaced with Voyage AI later)
 * 4. Upload to Supabase via REST API
 * 5. Validate uploads and report results
 *
 * PATTERN: Pattern-META-001 (Documentation as training data)
 * RELATED: Pattern-EMBEDDING-001, Pattern-HYBRID-SEARCH-001
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Supabase configuration
const SUPABASE_URL = 'https://jxqudhureuzweenjlguz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4cXVkaHVyZXV6d2VlbmpsZ3V6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3MjE2OTAsImV4cCI6MjA3NTI5NzY5MH0.KZ4vAwZxfCYIu8IczizvRGDF217nvECwFd-r8HLp3qM';

// Paths
const PATTERNS_DIR = path.join(__dirname, '..', 'docs', 'patterns');

/**
 * Parse a pattern markdown file
 */
function parsePattern(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const filename = path.basename(filePath);

  // Extract pattern ID from filename
  const patternIdMatch = filename.match(/Pattern-([A-Z0-9-]+)\.md/);
  if (!patternIdMatch) {
    console.warn(`⚠️  Skipping ${filename} - invalid pattern ID format`);
    return null;
  }

  const patternId = `Pattern-${patternIdMatch[1]}`;

  // Extract pattern name (first # heading)
  const nameMatch = content.match(/^#\s+(.+)$/m);
  const name = nameMatch ? nameMatch[1].replace(/^Pattern-[A-Z0-9-]+:\s*/, '') : patternId;

  // Extract metadata fields
  const categoryMatch = content.match(/\*\*CATEGORY:\*\*\s+(.+)/i);
  const statusMatch = content.match(/\*\*STATUS:\*\*\s+(.+)/i);

  // Extract Chain of Thought from code block
  const designDecisionMatch = content.match(/DESIGN DECISION:\s*(.+?)(?:\n|WHY:)/s);
  const whyMatch = content.match(/WHY:\s*(.+?)(?:\n|REASONING CHAIN:)/s);
  const reasoningChainMatch = content.match(/REASONING CHAIN:\s*\n((?:\s*[\*\d]+\.?.+\n)+)/);
  const alternativesMatch = content.match(/ALTERNATIVES:\s*\n((?:\s*[-\*\d]+\.?.+\n)+)/);

  // Extract reasoning chain as array
  let reasoningChain = [];
  if (reasoningChainMatch) {
    reasoningChain = reasoningChainMatch[1]
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && /^[\*\d]+\.?\s/.test(line))
      .map(line => line.replace(/^[\*\d]+\.?\s*/, ''));
  }

  // Extract alternatives as array
  let alternatives = [];
  if (alternativesMatch) {
    alternatives = alternativesMatch[1]
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && /^[-\*\d]+\.?\s/.test(line))
      .map(line => line.replace(/^[-\*\d]+\.?\s*/, ''));
  }

  // Extract code example (first code block after Chain of Thought)
  const codeBlockMatch = content.match(/```(?:\w+)?\n([\s\S]+?)```/);
  const codeExample = codeBlockMatch ? codeBlockMatch[1].trim() : null;

  // Extract keywords from content (simple approach - top words)
  const keywords = extractKeywords(content);

  // Extract related patterns
  const relatedPatterns = [];
  const relatedMatches = content.matchAll(/Pattern-([A-Z0-9-]+)/g);
  for (const match of relatedMatches) {
    const related = `Pattern-${match[1]}`;
    if (related !== patternId && !relatedPatterns.includes(related)) {
      relatedPatterns.push(related);
    }
  }

  // Determine domain from pattern ID or category
  let domain = 'general';
  if (patternIdMatch[1].includes('BUSINESS')) domain = 'business';
  else if (patternIdMatch[1].includes('STORAGE') || patternIdMatch[1].includes('MESH')) domain = 'infrastructure';
  else if (patternIdMatch[1].includes('DOMAIN')) domain = 'intelligence';
  else if (patternIdMatch[1].includes('LEGAL')) domain = 'legal';
  else if (patternIdMatch[1].includes('EMBEDDING') || patternIdMatch[1].includes('HYBRID')) domain = 'search';
  else if (patternIdMatch[1].includes('RUST') || patternIdMatch[1].includes('NAPI')) domain = 'engineering';

  // Calculate confidence based on completeness
  let confidence = 0.70; // Base confidence
  if (designDecisionMatch) confidence += 0.10;
  if (whyMatch) confidence += 0.10;
  if (reasoningChain.length >= 3) confidence += 0.10;

  return {
    pattern_id: patternId,
    name: name,
    domain: domain,
    category: categoryMatch ? categoryMatch[1].trim() : 'Uncategorized',
    subcategory: null,
    design_decision: designDecisionMatch ? designDecisionMatch[1].trim() : 'See pattern document',
    why: whyMatch ? whyMatch[1].trim() : 'See pattern document',
    reasoning_chain: reasoningChain.length > 0 ? reasoningChain : ['See pattern document for full reasoning'],
    alternatives: alternatives.length > 0 ? alternatives : null,
    code_example: codeExample,
    source_repo: null,
    source_file: `docs/patterns/${filename}`,
    source_lines: null,
    confidence: Math.min(confidence, 1.0),
    quality_score: confidence, // Same as confidence for seed data
    stars: null,
    validated: true, // All manually created patterns are validated
    keywords: keywords,
    related_patterns: relatedPatterns,
    performance: null,
    metadata: {
      status: statusMatch ? statusMatch[1].trim() : 'Active',
      file_path: filePath,
      parsed_at: new Date().toISOString()
    }
  };
}

/**
 * Extract top keywords from text
 */
function extractKeywords(text) {
  // Remove code blocks and special chars
  const cleanText = text
    .replace(/```[\s\S]+?```/g, '')
    .replace(/[^a-zA-Z\s]/g, ' ')
    .toLowerCase();

  // Common words to ignore
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'be', 'been', 'this', 'that', 'these', 'those', 'it', 'its', 'has', 'have', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could', 'can', 'may', 'must', 'not', 'no', 'yes', 'if', 'then', 'else', 'when', 'where', 'why', 'how', 'all', 'any', 'each', 'every', 'some', 'such', 'very', 'just', 'more', 'than', 'also', 'only', 'other', 'into', 'out', 'up', 'down']);

  // Count word frequency
  const words = cleanText.split(/\s+/).filter(w => w.length > 3 && !stopWords.has(w));
  const wordFreq = {};
  words.forEach(word => {
    wordFreq[word] = (wordFreq[word] || 0) + 1;
  });

  // Get top 10 keywords
  return Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
}

/**
 * Generate placeholder embedding (will be replaced with Voyage AI)
 */
function generatePlaceholderEmbedding(text) {
  // For now, generate a deterministic 1024-dim vector from text hash
  // This will be replaced with actual Voyage AI embeddings later
  const hash = text.split('').reduce((acc, char) => {
    return ((acc << 5) - acc) + char.charCodeAt(0);
  }, 0);

  const embedding = [];
  for (let i = 0; i < 1024; i++) {
    // Generate pseudo-random values between -1 and 1
    const seed = hash + i;
    const value = (Math.sin(seed) * Math.cos(seed * 1.5)) / 2;
    embedding.push(value);
  }

  return embedding;
}

/**
 * Upload pattern to Supabase
 */
async function uploadPattern(pattern) {
  // Generate embedding from pattern content
  const embeddingText = `${pattern.name} ${pattern.design_decision} ${pattern.why} ${pattern.reasoning_chain.join(' ')}`;
  const embedding = generatePlaceholderEmbedding(embeddingText);

  const payload = {
    ...pattern,
    embedding: `[${embedding.join(',')}]` // pgvector format
  };

  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);

    const options = {
      hostname: 'jxqudhureuzweenjlguz.supabase.co',
      path: '/rest/v1/patterns',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Prefer': 'return=representation'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 201) {
          resolve(JSON.parse(body)[0]);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 ÆtherLight Pattern Upload Script');
  console.log('=====================================\n');

  // Read all pattern files
  const files = fs.readdirSync(PATTERNS_DIR)
    .filter(f => f.startsWith('Pattern-') && f.endsWith('.md'));

  console.log(`📁 Found ${files.length} pattern files\n`);

  const results = {
    total: files.length,
    parsed: 0,
    uploaded: 0,
    failed: 0,
    errors: []
  };

  for (const file of files) {
    const filePath = path.join(PATTERNS_DIR, file);

    try {
      // Parse pattern
      const pattern = parsePattern(filePath);
      if (!pattern) {
        results.failed++;
        continue;
      }
      results.parsed++;

      // Upload to Supabase
      console.log(`📤 Uploading ${pattern.pattern_id}...`);
      const uploaded = await uploadPattern(pattern);
      results.uploaded++;
      console.log(`   ✅ Success (confidence: ${(pattern.confidence * 100).toFixed(0)}%)\n`);

    } catch (error) {
      results.failed++;
      results.errors.push({ file, error: error.message });
      console.log(`   ❌ Failed: ${error.message}\n`);
    }
  }

  // Summary
  console.log('\n=====================================');
  console.log('📊 Upload Summary');
  console.log('=====================================');
  console.log(`Total files:     ${results.total}`);
  console.log(`Parsed:          ${results.parsed}`);
  console.log(`Uploaded:        ${results.uploaded} ✅`);
  console.log(`Failed:          ${results.failed} ❌`);

  if (results.errors.length > 0) {
    console.log('\n❌ Errors:');
    results.errors.forEach(({ file, error }) => {
      console.log(`   ${file}: ${error}`);
    });
  }

  console.log('\n✨ Upload complete!');
  console.log('\n📝 Note: Placeholder embeddings used (replace with Voyage AI later)');
}

// Run main
main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
