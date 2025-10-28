#!/usr/bin/env node

/**
 * Manual Pattern Extraction Script
 *
 * DESIGN DECISION: Extract patterns from ÆtherLight codebase and compare to existing patterns
 * WHY: Discovery #9 - Pattern extraction not integrated into CLI yet, need manual extraction for dogfooding
 *
 * REASONING CHAIN:
 * 1. Load analysis results from .aetherlight-dogfooding/
 * 2. Use PatternExtractor to extract patterns
 * 3. Generate Pattern-AETHERLIGHT-XXX.md files
 * 4. Compare to existing 61 patterns in docs/patterns/
 * 5. Document findings
 */

const { PatternExtractor } = require('./dist/generators/pattern-extractor');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

async function main() {
  console.log(chalk.blue('\n🔍 Manual Pattern Extraction\n'));

  // Step 1: Check if analysis results exist
  const analysisPath = path.resolve('../../.aetherlight-dogfooding/analysis.json');

  if (!fs.existsSync(analysisPath)) {
    console.error(chalk.red('❌ Analysis file not found at:'), analysisPath);
    console.log(chalk.yellow('\nRun analyzer first:'));
    console.log(chalk.white('  cd ../.. && node packages/aetherlight-analyzer/dist/cli/index.js analyze\n'));
    process.exit(1);
  }

  console.log(chalk.green('✓ Analysis file found'));

  // Step 2: Load analysis
  const analysis = JSON.parse(fs.readFileSync(analysisPath, 'utf-8'));
  console.log(chalk.green(`✓ Analysis loaded (${analysis.analyzers?.length || 0} analyzers)`));

  // Step 3: Extract patterns
  console.log(chalk.blue('\n📊 Extracting patterns...\n'));

  const extractor = new PatternExtractor({
    minQualityScore: 0.7, // Lower threshold for dogfooding (was 0.8)
    maxComplexity: 20,     // Allow slightly more complex patterns
    maxPatterns: 30,       // Extract more patterns
    outputDir: '../../.aetherlight-dogfooding/extracted-patterns',
  });

  const patterns = await extractor.extractPatterns(analysis);

  console.log(chalk.green(`✓ Extracted ${patterns.length} patterns`));

  // Step 4: Generate pattern files
  console.log(chalk.blue('\n📝 Generating pattern files...\n'));

  const filePaths = await extractor.generatePatternFiles(patterns, 'ÆtherLight');

  console.log(chalk.green(`✓ Generated ${filePaths.length} pattern files`));

  // Step 5: Show summary
  console.log(chalk.blue('\n📋 Pattern Summary:\n'));

  patterns.slice(0, 10).forEach((pattern, i) => {
    console.log(chalk.white(`  ${i + 1}. ${pattern.name}`));
    console.log(chalk.gray(`     Category: ${pattern.category}, Quality: ${(pattern.qualityScore * 100).toFixed(0)}%`));
  });

  if (patterns.length > 10) {
    console.log(chalk.gray(`  ... and ${patterns.length - 10} more patterns`));
  }

  // Step 6: Compare to existing patterns
  console.log(chalk.blue('\n🔍 Comparing to existing patterns...\n'));

  const existingPatternsDir = '../../docs/patterns';
  const existingPatterns = fs.readdirSync(existingPatternsDir)
    .filter(f => f.startsWith('Pattern-') && f.endsWith('.md'));

  console.log(chalk.white(`  Existing patterns: ${existingPatterns.length}`));
  console.log(chalk.white(`  Extracted patterns: ${patterns.length}`));

  console.log(chalk.blue('\n✅ Pattern extraction complete!\n'));
  console.log(chalk.white('Output directory:'), chalk.cyan('../../.aetherlight-dogfooding/extracted-patterns/'));
  console.log(chalk.white('Next step:'), chalk.yellow('Compare extracted patterns to docs/patterns/ manually'));
  console.log('');
}

main().catch(error => {
  console.error(chalk.red('\n❌ Error:'), error.message);
  console.error(error.stack);
  process.exit(1);
});
