/**
 * Extract Patterns Command
 *
 * DESIGN DECISION: Extract reusable patterns from analysis results
 * WHY: Discovery #9 - Pattern extraction was not integrated into CLI workflow
 *
 * REASONING CHAIN:
 * 1. Load analysis.json (architecture + complexity + debt)
 * 2. Use PatternExtractor with quality filters
 * 3. Generate Pattern-TARGETAPP-XXX.md files
 * 4. Show comparison to existing patterns in docs/patterns/
 * 5. Result: High-quality patterns ready for Supabase ingestion
 *
 * PATTERN: Pattern-ANALYZER-014 (Pattern Extraction Integration)
 * DOGFOODING: Discovery #9 fix
 * RELATED: src/generators/pattern-extractor.ts, DOGFOODING_DISCOVERIES_2025-10-16.md
 */

import chalk from 'chalk';
import ora, { Ora } from 'ora';
import * as fs from 'fs';
import * as path from 'path';
import { PatternExtractor } from '../../generators/pattern-extractor';
import { AnalysisResult } from '../../analyzers/types';

interface ExtractPatternsOptions {
  input: string;
  output: string;
  minQuality: string;
  maxComplexity: string;
  maxPatterns: string;
}

export async function extractPatternsCommand(options: ExtractPatternsOptions): Promise<void> {
  console.log(chalk.blue('\n🔍 Extracting patterns from analysis\n'));

  let spinner: Ora | null = null;

  try {
    // Step 1: Load analysis results
    spinner = ora('Loading analysis results...').start();

    const inputPath = path.resolve(options.input);
    if (!fs.existsSync(inputPath)) {
      throw new Error(`Analysis file not found: ${inputPath}\nRun 'aetherlight-analyzer analyze' first`);
    }

    const analysis: AnalysisResult & { project?: { name: string; path: string } } = JSON.parse(
      fs.readFileSync(inputPath, 'utf-8')
    );

    const projectName = analysis.project?.name || 'TargetApp';
    const filesAnalyzed = analysis.summary?.totalFiles || 0;
    const linesOfCode = analysis.summary?.totalLinesOfCode || 0;

    spinner.succeed(
      chalk.green(`✅ Analysis loaded (${filesAnalyzed} files, ${linesOfCode.toLocaleString()} LOC)`)
    );

    // Step 2: Extract patterns
    spinner = ora('Extracting high-quality patterns...').start();

    const extractor = new PatternExtractor({
      minQualityScore: parseFloat(options.minQuality),
      maxComplexity: parseInt(options.maxComplexity),
      maxPatterns: parseInt(options.maxPatterns),
      outputDir: path.resolve(options.output),
    });

    const patterns = await extractor.extractPatterns(analysis);

    spinner.succeed(chalk.green(`✅ Extracted ${patterns.length} patterns`));

    // Step 3: Generate pattern files
    spinner = ora('Generating pattern markdown files...').start();

    const filePaths = await extractor.generatePatternFiles(patterns, projectName);

    spinner.succeed(chalk.green(`✅ Generated ${filePaths.length} pattern files`));

    // Step 4: Show pattern summary
    console.log(chalk.blue('\n📋 Pattern Summary:\n'));

    const patternsByCategory: Record<string, number> = {};
    patterns.forEach((p) => {
      patternsByCategory[p.category] = (patternsByCategory[p.category] || 0) + 1;
    });

    Object.entries(patternsByCategory)
      .sort((a, b) => b[1] - a[1])
      .forEach(([category, count]) => {
        console.log(chalk.white(`  ${category}: ${count} patterns`));
      });

    console.log(chalk.blue('\n📝 Top 5 Patterns:\n'));
    patterns.slice(0, 5).forEach((pattern, i) => {
      console.log(chalk.white(`  ${i + 1}. ${pattern.name}`));
      console.log(chalk.gray(`     Category: ${pattern.category}, Quality: ${(pattern.qualityScore * 100).toFixed(0)}%`));
    });

    // Step 5: Compare to existing patterns
    const existingPatternsDir = path.resolve('docs/patterns');
    if (fs.existsSync(existingPatternsDir)) {
      const existingPatterns = fs
        .readdirSync(existingPatternsDir)
        .filter((f) => f.startsWith('Pattern-') && f.endsWith('.md'));

      console.log(chalk.blue('\n🔍 Comparison to Existing Patterns:\n'));
      console.log(chalk.white(`  Existing patterns: ${existingPatterns.length}`));
      console.log(chalk.white(`  Extracted patterns: ${patterns.length}`));
      console.log(chalk.white(`  Output directory: ${chalk.cyan(path.relative(process.cwd(), options.output))}`));
    }

    console.log(chalk.blue('\n📝 Next step:'));
    console.log(chalk.white('  Compare patterns manually, then ingest to Supabase'));
    console.log('');
  } catch (error) {
    if (spinner) {
      spinner.fail(chalk.red('❌ Pattern extraction failed'));
    }
    console.error(chalk.red(`\nError: ${(error as Error).message}\n`));
    process.exit(1);
  }
}
