#!/usr/bin/env node

/**
 * @aetherlight/analyzer CLI entry point
 *
 * DESIGN DECISION: Use Commander.js for CLI framework
 * WHY: Industry standard, supports subcommands, auto-generated help, validation
 *
 * REASONING CHAIN:
 * 1. Need user-friendly CLI for code analysis workflow
 * 2. Commander.js provides subcommand structure (init, analyze, generate, execute)
 * 3. Inquirer.js for interactive prompts (target directory, options)
 * 4. Ora for progress spinners (parsing, analyzing, generating)
 * 5. Chalk for colored output (errors red, success green)
 * 6. Result: Professional CLI matching npm/git UX standards
 *
 * PATTERN: Pattern-ANALYZER-001 (AST-Based Code Analysis)
 * RELATED: PHASE_0_CODE_ANALYZER.md (Task C-001)
 * COMMANDS:
 *   - init <path>: Initialize ÆtherLight analysis in directory
 *   - analyze: Run code analysis (parsers + analyzers)
 *   - generate-sprints: Generate Phase A/B/C sprint plans
 *   - execute-sprint <phase>: Execute sprint autonomously
 */

import { Command } from 'commander';
import chalk from 'chalk';
import * as path from 'path';
import * as fs from 'fs';

const program = new Command();

program
  .name('aetherlight-analyzer')
  .description('Code analysis tool to generate ÆtherLight sprint plans from any codebase')
  .version('0.1.0');

/**
 * Command: init
 *
 * DESIGN DECISION: Initialize .aetherlight/ directory with config and templates
 * WHY: Keeps analysis artifacts separate from source code, enables customization
 */
program
  .command('init')
  .description('Initialize ÆtherLight analysis in current directory')
  .argument('[path]', 'Target directory', '.')
  .action(async (targetPath: string) => {
    const { initCommand } = await import('./commands/init');
    await initCommand(path.resolve(targetPath));
  });

/**
 * Command: analyze
 *
 * DESIGN DECISION: Parse + analyze in single command for simplicity
 * WHY: Users want results fast, don't care about internal stages
 */
program
  .command('analyze')
  .description('Analyze codebase (parse + analyze architecture/complexity/debt)')
  .option('-l, --languages <langs>', 'Languages to parse (ts,js,rust)', 'ts,js')
  .option('-o, --output <file>', 'Output file for results', '.aetherlight/analysis.json')
  .option('--verbose', 'Show detailed progress', false)
  .action(async (options) => {
    const { analyzeCommand } = await import('./commands/analyze');
    await analyzeCommand(process.cwd(), options);
  });

/**
 * Command: generate-sprints
 *
 * DESIGN DECISION: Generate all 3 sprint plans in single command
 * WHY: Incremental approach (Enhancement → Retrofit → Dogfood) always generated together
 */
program
  .command('generate-sprints')
  .description('Generate Phase A/B/C sprint plans from analysis')
  .option('-i, --input <file>', 'Analysis results file', '.aetherlight/analysis.json')
  .option('-o, --output <dir>', 'Output directory for sprints', './')
  .option('--min-tasks <n>', 'Minimum tasks per sprint', '5')
  .option('--max-tasks <n>', 'Maximum tasks per sprint', '15')
  .action(async (options) => {
    const { generateCommand } = await import('./commands/generate');
    await generateCommand(options);
  });

/**
 * Command: extract-patterns
 *
 * DESIGN DECISION: Extract reusable patterns from analysis results
 * WHY: Discovery #9 - Pattern extraction not integrated into workflow
 *
 * REASONING CHAIN:
 * 1. Load analysis.json (architecture, complexity, debt)
 * 2. Use PatternExtractor to identify high-quality patterns
 * 3. Generate Pattern-TARGETAPP-XXX.md files with Chain of Thought
 * 4. Compare to existing patterns in docs/patterns/
 * 5. Result: Reusable patterns ready for Supabase ingestion
 *
 * PATTERN: Pattern-ANALYZER-014 (Pattern Extraction Integration)
 * DOGFOODING: Discovery #9 fix
 */
program
  .command('extract-patterns')
  .description('Extract reusable patterns from analysis results')
  .option('-i, --input <file>', 'Analysis results file', '.aetherlight/analysis.json')
  .option('-o, --output <dir>', 'Output directory for patterns', './patterns')
  .option('--min-quality <n>', 'Minimum quality score (0.0-1.0)', '0.7')
  .option('--max-complexity <n>', 'Maximum complexity threshold', '20')
  .option('--max-patterns <n>', 'Maximum patterns to extract', '30')
  .action(async (options) => {
    const { extractPatternsCommand } = await import('./commands/extract-patterns');
    await extractPatternsCommand(options);
  });

/**
 * Command: execute-sprint
 *
 * DESIGN DECISION: Integrate with Phase 4 SprintOrchestrator
 * WHY: Reuse autonomous execution infrastructure from Phase 4
 */
program
  .command('execute-sprint')
  .description('Execute sprint autonomously (requires Phase 4)')
  .argument('<phase>', 'Sprint phase to execute (A, B, or C)')
  .option('--dry-run', 'Show what would be executed without running', false)
  .action(async (phase: string, options) => {
    const { executeCommand } = await import('./commands/execute');
    await executeCommand(phase, options);
  });

/**
 * Command: report
 *
 * DESIGN DECISION: Generate summary report from analysis results
 * WHY: Executives need high-level overview (not raw JSON)
 */
program
  .command('report')
  .description('Generate summary report from analysis')
  .option('-i, --input <file>', 'Analysis results file', '.aetherlight/analysis.json')
  .option('-o, --output <file>', 'Output report file', 'ANALYSIS_REPORT.md')
  .option('--format <type>', 'Report format (md, html, json)', 'md')
  .action(async (options) => {
    const { reportCommand } = await import('./commands/report');
    await reportCommand(options);
  });

// Error handling
program.exitOverride((err) => {
  if (err.code === 'commander.unknownCommand') {
    console.error(chalk.red(`\n❌ Unknown command: ${err.message}`));
    console.log(chalk.yellow('\nRun `aetherlight-analyzer --help` for available commands\n'));
  } else if (err.code === 'commander.missingArgument') {
    console.error(chalk.red(`\n❌ Missing argument: ${err.message}`));
  } else {
    console.error(chalk.red(`\n❌ Error: ${err.message}\n`));
  }
  process.exit(1);
});

// Parse arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
