/**
 * Analyze Command - Run code analysis
 *
 * DESIGN DECISION: Orchestrate parsers → analyzers → save results
 * WHY: Users want single command to get complete analysis
 *
 * REASONING CHAIN:
 * 1. Load config from .aetherlight/config.json
 * 2. Run parsers (TypeScript, Rust) in parallel
 * 3. Run analyzers (Architecture, Complexity, Debt) on parsed results
 * 4. Save combined results to .aetherlight/analysis/results.json
 * 5. Generate summary report to .aetherlight/analysis/REPORT.md
 * 6. Result: Complete analysis ready for sprint generation
 *
 * PATTERN: Pattern-ANALYZER-001
 */

import chalk from 'chalk';
import ora, { Ora } from 'ora';
import * as fs from 'fs';
import * as path from 'path';
import { TypeScriptParser } from '../../parsers/typescript-parser';
import { ParseResult } from '../../parsers/types';
import { ArchitectureAnalyzer } from '../../analyzers/architecture-analyzer';
import { ComplexityAnalyzer } from '../../analyzers/complexity-analyzer';
import { TechnicalDebtAnalyzer } from '../../analyzers/technical-debt-analyzer';
import { AnalysisResult, ArchitectureAnalysis, ComplexityAnalysis, TechnicalDebtAnalysis } from '../../analyzers/types';

interface AnalyzeOptions {
  languages: string;
  output: string;
  verbose: boolean;
}

export async function analyzeCommand(
  targetPath: string,
  options: AnalyzeOptions
): Promise<void> {
  console.log(chalk.blue('\n🔍 Analyzing codebase\n'));

  const config = loadConfig(targetPath);
  const languages = options.languages.split(',');

  /**
   * DESIGN DECISION: Use config.project.root if available, otherwise use targetPath
   * WHY: Allows running analyzer from subdirectories (e.g., .aetherlight-dogfooding)
   *
   * REASONING CHAIN:
   * 1. User runs: cd .aetherlight-dogfooding && aetherlight-analyzer analyze
   * 2. loadConfig finds config.json with project.root = "../"
   * 3. Use project.root for analysis, not process.cwd()
   * 4. Result: Analyzer works from any directory with proper config
   *
   * PATTERN: Pattern-ANALYZER-009 (Config-Driven Project Root)
   * DOGFOODING: Discovery #1 - Config.json root field ignored
   */
  const analysisRoot = config.project?.root || targetPath;

  if (options.verbose && analysisRoot !== targetPath) {
    console.log(chalk.gray(`  Using project root from config: ${analysisRoot}`));
  }

  let spinner: Ora | null = null;

  try {
    // Step 1: Parse codebase
    spinner = ora('Parsing codebase...').start();

    const startTime = Date.now();
    const parseResults: ParseResult[] = [];

    if (languages.includes('ts') || languages.includes('js')) {
      spinner.text = 'Parsing TypeScript/JavaScript files...';
      const tsParser = new TypeScriptParser();

      // Progress callback for streaming parser (batch updates)
      const tsResult = await tsParser.parse(
        analysisRoot,
        ['.ts', '.tsx', '.js', '.jsx'],
        50, // batchSize
        (current, total) => {
          spinner!.text = `Parsing TypeScript/JavaScript files (${current}/${total})...`;
        }
      );
      parseResults.push(tsResult);

      if (options.verbose) {
        spinner.info(
          chalk.gray(
            `  Parsed ${tsResult.totalFiles} TS/JS files (${tsResult.totalLinesOfCode} LOC) in ${tsResult.parseDurationMs}ms`
          )
        );
        spinner = ora().start();
      }
    }

    // Calculate aggregate stats
    const totalFiles = parseResults.reduce((sum, r) => sum + r.totalFiles, 0);
    const totalLOC = parseResults.reduce((sum, r) => sum + r.totalLinesOfCode, 0);
    const parseDuration = Date.now() - startTime;

    spinner.succeed(
      chalk.green(`✅ Parsed ${totalFiles} files (${totalLOC.toLocaleString()} LOC) in ${parseDuration}ms`)
    );

    // Combine parse results
    const combinedParseResult: ParseResult = {
      files: parseResults.flatMap((r) => r.files),
      totalFiles,
      totalLinesOfCode: totalLOC,
      parseErrors: parseResults.flatMap((r) => r.parseErrors),
      parseDurationMs: parseDuration,
    };

    // Step 2: Architecture Analysis
    spinner = ora('Analyzing architecture...').start();
    const archAnalyzer = new ArchitectureAnalyzer();
    const archAnalyzerResult = archAnalyzer.analyze(combinedParseResult);
    const archResult = archAnalyzerResult.data as ArchitectureAnalysis;

    spinner.succeed(
      chalk.green(`✅ Architecture: ${archResult.pattern} (confidence: ${(archResult.confidence * 100).toFixed(0)}%)`)
    );

    // Step 3: Complexity Analysis
    spinner = ora('Analyzing complexity...').start();
    const complexityAnalyzer = new ComplexityAnalyzer();
    const complexityAnalyzerResult = complexityAnalyzer.analyze(combinedParseResult);
    const complexityResult = complexityAnalyzerResult.data as ComplexityAnalysis;

    const highComplexityCount = complexityResult.functionsOverThreshold.length;
    spinner.succeed(
      chalk.green(
        `✅ Complexity: avg ${complexityResult.averageComplexity.toFixed(1)}, ${highComplexityCount} functions need refactoring`
      )
    );

    // Step 4: Technical Debt Analysis
    spinner = ora('Analyzing technical debt...').start();
    const debtAnalyzer = new TechnicalDebtAnalyzer();
    const debtAnalyzerResult = debtAnalyzer.analyze(combinedParseResult);
    const debtResult = debtAnalyzerResult.data as TechnicalDebtAnalysis;

    const debtScore = debtResult.score;
    const debtColor = debtScore < 30 ? chalk.green : debtScore < 60 ? chalk.yellow : chalk.red;
    spinner.succeed(
      debtColor(`✅ Technical Debt: score ${debtScore}/100, ${debtResult.totalIssues} issues`)
    );

    // Step 5: Save results
    spinner = ora('Saving results...').start();

    const results: AnalysisResult & { project?: { name: string; path: string } } = {
      timestamp: new Date().toISOString(),
      project: {
        name: config.project.name,
        path: analysisRoot,
      },
      summary: {
        totalFiles,
        totalLinesOfCode: totalLOC,
        languages: {
          typescript: parseResults[0]?.totalFiles || 0,
        },
        parseErrors: parseResults.reduce((sum, r) => sum + r.parseErrors.length, 0),
        analysisErrors: 0,
      },
      analyzers: [
        archAnalyzerResult,
        complexityAnalyzerResult,
        debtAnalyzerResult,
      ],
      issues: [],
      metrics: {},
      recommendations: [],
    };

    const outputPath = path.resolve(analysisRoot, options.output);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));

    spinner.succeed(chalk.green(`✅ Results saved to ${path.relative(analysisRoot, outputPath)}`));

    // Summary
    console.log(chalk.blue('\n📊 Analysis Summary:\n'));
    console.log(chalk.white(`  Files analyzed: ${totalFiles}`));
    console.log(chalk.white(`  Lines of code: ${totalLOC.toLocaleString()}`));
    console.log(chalk.white(`  Architecture: ${archResult.pattern}`));
    console.log(chalk.white(`  Avg complexity: ${complexityResult.averageComplexity.toFixed(1)}`));
    console.log(debtColor(`  Debt score: ${debtScore}/100`));

    console.log(chalk.blue('\n📝 Next step:'));
    console.log(chalk.white('  Generate sprints: ' + chalk.cyan('aetherlight-analyzer generate-sprints')));
    console.log('');
  } catch (error) {
    if (spinner) {
      spinner.fail(chalk.red('❌ Analysis failed'));
    }
    console.error(chalk.red(`\nError: ${(error as Error).message}\n`));
    if (options.verbose) {
      console.error(chalk.gray((error as Error).stack));
    }
    process.exit(1);
  }
}

function loadConfig(targetPath: string): any {
  const configPath = path.join(targetPath, '.aetherlight', 'config.json');

  if (!fs.existsSync(configPath)) {
    console.error(chalk.red('\n❌ .aetherlight/config.json not found'));
    console.log(chalk.yellow('Run ' + chalk.cyan('aetherlight-analyzer init') + ' first\n'));
    process.exit(1);
  }

  return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
}
