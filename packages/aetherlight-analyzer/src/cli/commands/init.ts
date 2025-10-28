/**
 * Init Command - Initialize ÆtherLight analysis
 *
 * DESIGN DECISION: Create .aetherlight/ directory with config and templates
 * WHY: Keeps artifacts separate, enables customization, follows .git pattern
 *
 * REASONING CHAIN:
 * 1. Create .aetherlight/ directory (like .git)
 * 2. Copy config template (aetherlight.json)
 * 3. Create subdirectories (analysis/, sprints/, patterns/)
 * 4. Write README with next steps
 * 5. Result: User has initialized project, ready for analysis
 *
 * PATTERN: Pattern-ANALYZER-001
 */

import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import * as fs from 'fs';
import * as path from 'path';

export async function initCommand(targetPath: string): Promise<void> {
  console.log(chalk.blue('\n🚀 Initializing ÆtherLight Analyzer\n'));

  // Check if already initialized
  const aetherlightDir = path.join(targetPath, '.aetherlight');
  if (fs.existsSync(aetherlightDir)) {
    const { overwrite } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'overwrite',
        message: chalk.yellow('.aetherlight/ already exists. Overwrite?'),
        default: false,
      },
    ]);

    if (!overwrite) {
      console.log(chalk.yellow('\n⚠️  Initialization cancelled\n'));
      return;
    }
  }

  const spinner = ora('Creating .aetherlight/ directory').start();

  try {
    // Create directory structure
    fs.mkdirSync(aetherlightDir, { recursive: true });
    fs.mkdirSync(path.join(aetherlightDir, 'analysis'), { recursive: true });
    fs.mkdirSync(path.join(aetherlightDir, 'sprints'), { recursive: true });
    fs.mkdirSync(path.join(aetherlightDir, 'patterns'), { recursive: true });

    spinner.text = 'Writing configuration file';

    // Create config file
    const config = {
      version: '1.0',
      project: {
        name: path.basename(targetPath),
        root: targetPath,
      },
      analysis: {
        languages: ['typescript', 'javascript'],
        exclude: ['node_modules', 'dist', 'build', '.git'],
        complexity_threshold: 15,
        debt_threshold: 80,
      },
      sprint_generation: {
        min_tasks: 5,
        max_tasks: 15,
        task_duration_hours: [2, 8],
        include_tests: true,
        include_docs: true,
      },
    };

    fs.writeFileSync(
      path.join(aetherlightDir, 'config.json'),
      JSON.stringify(config, null, 2)
    );

    // Create README
    const readme = `# ÆtherLight Analyzer

This directory contains analysis artifacts for your codebase.

## Directory Structure

- \`analysis/\` - Analysis results (JSON + reports)
- \`sprints/\` - Generated sprint plans (PHASE_A/B/C.md)
- \`patterns/\` - Extracted patterns (Pattern-*.md)
- \`config.json\` - Configuration file

## Next Steps

1. **Analyze codebase:**
   \`\`\`bash
   aetherlight-analyzer analyze
   \`\`\`

2. **Generate sprint plans:**
   \`\`\`bash
   aetherlight-analyzer generate-sprints
   \`\`\`

3. **Review generated plans:**
   - \`PHASE_A_ENHANCEMENT.md\` - Add new features
   - \`PHASE_B_RETROFIT.md\` - Refactor existing code
   - \`PHASE_C_DOGFOOD.md\` - Integrate ÆtherLight SDK

4. **Execute sprint (optional):**
   \`\`\`bash
   aetherlight-analyzer execute-sprint A
   \`\`\`

## Configuration

Edit \`config.json\` to customize analysis settings:
- \`languages\`: Languages to parse
- \`exclude\`: Directories to skip
- \`complexity_threshold\`: Functions above this need refactoring
- \`debt_threshold\`: Debt score threshold (0-100)

---

**Built with Chain of Thought methodology**
`;

    fs.writeFileSync(path.join(aetherlightDir, 'README.md'), readme);

    spinner.succeed(chalk.green('✅ Initialization complete'));

    // Show next steps
    console.log(chalk.blue('\n📂 Created structure:'));
    console.log(chalk.gray('  .aetherlight/'));
    console.log(chalk.gray('  ├── config.json'));
    console.log(chalk.gray('  ├── README.md'));
    console.log(chalk.gray('  ├── analysis/'));
    console.log(chalk.gray('  ├── sprints/'));
    console.log(chalk.gray('  └── patterns/'));

    console.log(chalk.blue('\n📝 Next steps:'));
    console.log(chalk.white('  1. Review config: ' + chalk.cyan('.aetherlight/config.json')));
    console.log(chalk.white('  2. Run analysis: ' + chalk.cyan('aetherlight-analyzer analyze')));
    console.log(chalk.white('  3. Generate sprints: ' + chalk.cyan('aetherlight-analyzer generate-sprints')));
    console.log('');
  } catch (error) {
    spinner.fail(chalk.red('❌ Initialization failed'));
    console.error(chalk.red(`\nError: ${(error as Error).message}\n`));
    process.exit(1);
  }
}
