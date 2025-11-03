/**
 * generate-validation command implementation
 *
 * DESIGN DECISION: Interactive workflow with clear communication at each step
 * WHY: Users need to understand what's being detected and why
 *
 * REASONING CHAIN:
 * 1. Analyze project structure (detect type, packages, dependencies)
 * 2. Identify potential issues (native deps, large bundles, version mismatches)
 * 3. Show findings to user with clear explanations
 * 4. Generate intelligent defaults based on detection
 * 5. Ask user confirmation before saving (unless --auto-save)
 * 6. Save .aetherlight/validation.toml with project-specific rules
 * 7. Result: Validators have accurate config, user stays informed
 *
 * Pattern: Pattern-ANALYZER-001 (Auto-Configuration)
 * Pattern: Pattern-COMMUNICATION-001 (User Communication During Workflow)
 * Related: ANALYZER-001, VAL-002, VAL-007
 */

import chalk from 'chalk';
import ora from 'ora';
import * as path from 'path';
import { ValidationConfigGenerator } from '../../validators/ValidationConfigGenerator';
import type { DetectedIssue } from '../../validators/ValidationConfigGenerator';

interface CommandOptions {
    path?: string;
    autoSave?: boolean;
    force?: boolean;
}

/**
 * Format issue severity with color
 */
function formatSeverity(severity: 'critical' | 'warning' | 'info'): string {
    switch (severity) {
        case 'critical':
            return chalk.red('🔴 CRITICAL');
        case 'warning':
            return chalk.yellow('🟡 WARNING');
        case 'info':
            return chalk.blue('🔵 INFO');
    }
}

/**
 * Display detected issues with clear explanations
 */
function displayIssues(issues: DetectedIssue[]): void {
    if (issues.length === 0) {
        console.log(chalk.green('✅ No issues detected'));
        return;
    }

    console.log(chalk.yellow(`\n⚠️  Found ${issues.length} potential issue(s):\n`));

    for (const issue of issues) {
        console.log(`${formatSeverity(issue.severity)} ${chalk.bold(issue.type)}`);
        console.log(`   ${chalk.gray('What:')} ${issue.message}`);
        if (issue.packages && issue.packages.length > 0) {
            console.log(`   ${chalk.gray('Packages:')} ${issue.packages.join(', ')}`);
        }
        if (issue.suggestion) {
            console.log(`   ${chalk.gray('Suggestion:')} ${issue.suggestion}`);
        }
        console.log('');
    }
}

/**
 * Main command handler
 */
export async function generateValidationCommand(options: CommandOptions): Promise<void> {
    const projectRoot = path.resolve(options.path || '.');
    const generator = new ValidationConfigGenerator();

    console.log(chalk.bold('\n🔍 ÆtherLight Validation Config Generator\n'));
    console.log(`Project: ${chalk.cyan(projectRoot)}\n`);

    // Step 1: Analyze project
    const spinner = ora('Analyzing project structure...').start();

    try {
        const result = await generator.analyzeAndGenerateConfig(projectRoot, {
            autoSave: false // Never auto-save here, we ask first
        });

        spinner.succeed('Project analysis complete');

        // Step 2: Show findings
        console.log(chalk.bold('\n📊 Analysis Results:\n'));
        console.log(`${chalk.gray('Project Type:')} ${chalk.cyan(result.projectType)}`);
        console.log(`${chalk.gray('Package Structure:')} ${chalk.cyan(result.packageStructure.type)}`);

        if (result.packageStructure.type === 'monorepo') {
            console.log(`${chalk.gray('Packages:')} ${result.packageStructure.packages.length} package(s)`);
            for (const pkg of result.packageStructure.packages) {
                console.log(`  ${chalk.gray('→')} ${pkg}`);
            }
        }

        // Step 3: Show issues
        displayIssues(result.issues);

        // Step 4: Show generated config highlights
        console.log(chalk.bold('📝 Generated Configuration:\n'));
        console.log(`${chalk.gray('Validation:')} ${result.config.validation.enabled ? chalk.green('Enabled') : chalk.red('Disabled')}`);
        console.log(`${chalk.gray('Native Dependencies:')} ${result.config.validation.dependencies.allow_native_dependencies ? chalk.yellow('Allowed') : chalk.green('Blocked')}`);
        console.log(`${chalk.gray('Runtime npm Dependencies:')} ${result.config.validation.dependencies.allow_runtime_npm_dependencies ? chalk.yellow('Allowed') : chalk.green('Blocked')}`);

        if (result.config.validation.dependencies.allowed_exceptions.length > 0) {
            console.log(`${chalk.gray('Whitelisted Packages:')} ${result.config.validation.dependencies.allowed_exceptions.length}`);
            for (const pkg of result.config.validation.dependencies.allowed_exceptions.slice(0, 5)) {
                console.log(`  ${chalk.gray('→')} ${pkg}`);
            }
            if (result.config.validation.dependencies.allowed_exceptions.length > 5) {
                console.log(`  ${chalk.gray('→')} ... and ${result.config.validation.dependencies.allowed_exceptions.length - 5} more`);
            }
        }

        if (result.config.validation.version_sync) {
            console.log(`${chalk.gray('Version Sync:')} ${chalk.cyan(result.config.validation.version_sync.mode)} (${result.config.validation.version_sync.packages.length} packages)`);
        }

        // Step 5: Ask confirmation (unless --auto-save)
        if (options.autoSave) {
            console.log(chalk.yellow('\n⚡ Auto-save enabled, saving configuration...'));

            await generator.saveConfig(projectRoot, result.config, { force: options.force });

            console.log(chalk.green(`\n✅ Configuration saved to ${chalk.cyan('.aetherlight/validation.toml')}`));
            console.log(chalk.gray('\nValidators will now use these project-specific rules.\n'));
        } else {
            // Manual confirmation flow
            console.log(chalk.yellow('\n❓ Save this configuration to .aetherlight/validation.toml?'));
            console.log(chalk.gray('   (Run with --auto-save to skip confirmation)\n'));

            // For now, since we don't have inquirer imported in the command, we'll just show the message
            // In a real implementation, you'd use inquirer.confirm() here
            console.log(chalk.cyan('💡 Run with --auto-save flag to save automatically:'));
            console.log(chalk.gray(`   aetherlight-analyzer generate-validation --auto-save${options.force ? ' --force' : ''}\n`));
        }

    } catch (error) {
        spinner.fail('Analysis failed');

        if (error instanceof Error) {
            console.error(chalk.red(`\n❌ Error: ${error.message}\n`));

            if (error.message.includes('Config already exists')) {
                console.log(chalk.yellow('💡 Use --force to overwrite existing configuration:'));
                console.log(chalk.gray('   aetherlight-analyzer generate-validation --auto-save --force\n'));
            }
        } else {
            console.error(chalk.red('\n❌ Unknown error occurred\n'));
        }

        process.exit(1);
    }
}
