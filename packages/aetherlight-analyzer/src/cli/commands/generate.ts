/**
 * Generate Command - Generate sprint plans from analysis
 *
 * DESIGN DECISION: Use SprintGenerator to create Phase A/B/C plans
 * WHY: Reuse Week 2 generator infrastructure
 */

import chalk from 'chalk';
import ora from 'ora';
import * as fs from 'fs';
import * as path from 'path';
import { SprintGenerator } from '../../generators/sprint-generator';
import { SprintGeneratorOptions } from '../../generators/types';
import { AnalysisResult } from '../../analyzers/types';

interface GenerateOptions {
  input: string;
  output: string;
  minTasks: string;
  maxTasks: string;
}

export async function generateCommand(options: GenerateOptions): Promise<void> {
  console.log(chalk.blue('\n📋 Generating sprint plans\n'));

  const spinner = ora('Loading analysis results...').start();

  try {
    // Load analysis results
    const inputPath = path.resolve(options.input);
    if (!fs.existsSync(inputPath)) {
      throw new Error(`Analysis file not found: ${inputPath}`);
    }

    const analysisResults: AnalysisResult & { project?: { name: string; path: string } } = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
    spinner.succeed(chalk.green('✅ Analysis loaded'));

    // Generate sprints
    spinner.start('Generating Phase A (Enhancement)...');

    const generatorOptions: SprintGeneratorOptions = {
      repositoryName: analysisResults.project?.name || 'TargetApp',
      repositoryPath: analysisResults.project?.path || process.cwd(),
      owner: 'Core Team',
      estimatedStartDate: new Date(),
    };

    const generator = new SprintGenerator(generatorOptions);

    const outputDir = path.resolve(options.output);
    const sprints = await generator.generateAllSprints(analysisResults, outputDir);

    spinner.succeed(chalk.green('✅ All sprint plans generated'));

    // Summary
    console.log(chalk.blue('\n📂 Generated files:\n'));
    sprints.forEach((sprint) => {
      console.log(chalk.white(`  ✓ ${path.basename(sprint.filePath)} (${sprint.taskCount} tasks, ${sprint.estimatedDuration} weeks)`));
    });

    console.log(chalk.blue('\n📝 Next steps:'));
    console.log(chalk.white('  1. Review sprint plans'));
    console.log(chalk.white('  2. Execute: ' + chalk.cyan('aetherlight-analyzer execute-sprint A')));
    console.log('');
  } catch (error) {
    spinner.fail(chalk.red('❌ Generation failed'));
    console.error(chalk.red(`\nError: ${(error as Error).message}\n`));
    process.exit(1);
  }
}
