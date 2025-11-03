#!/usr/bin/env node

/**
 * Validate Git Workflow Script
 *
 * DESIGN DECISION: Automated pre-commit/pre-publish git state validation
 * WHY: Prevent accidental commits to main, detect conflicts early
 *
 * REASONING CHAIN:
 * 1. Uncommitted changes can cause issues during publish
 * 2. Publishing from main branch is dangerous
 * 3. Merge conflicts must be resolved before proceeding
 * 4. Must validate BEFORE committing/publishing
 * 5. Result: Git workflow validated before critical operations
 *
 * PATTERN: Pattern-VALIDATION-001 (Comprehensive System Validation)
 * RELATED: VAL-006
 *
 * USAGE:
 *   node scripts/validate-git-state.js                       # Validate current directory
 *   node scripts/validate-git-state.js path/to/project       # Validate specific project
 *   node scripts/validate-git-state.js --strict              # Treat warnings as errors
 *
 * EXIT CODES:
 *   0 = Validation passed (clean git state)
 *   1 = Validation failed (merge conflicts or git errors)
 *   2 = Warnings present (uncommitted changes, on main branch) - unless --strict
 */

const fs = require('fs');
const path = require('path');

// Import GitWorkflowValidator from compiled output
const validatorPath = path.join(__dirname, '../vscode-lumina/out/services/GitWorkflowValidator.js');
if (!fs.existsSync(validatorPath)) {
	console.error('❌ Error: GitWorkflowValidator not compiled');
	console.error('   Run: cd vscode-lumina && npm run compile');
	process.exit(1);
}

const { GitWorkflowValidator } = require(validatorPath);

/**
 * Parse command-line arguments
 */
function parseArgs() {
	const args = process.argv.slice(2);
	let projectPath = null;
	let strict = false;

	for (let i = 0; i < args.length; i++) {
		if (args[i] === '--strict' || args[i] === '-s') {
			strict = true;
		} else if (!args[i].startsWith('--')) {
			projectPath = args[i];
		}
	}

	return { projectPath, strict };
}

/**
 * Main validation function
 */
function validateGitWorkflow(projectPath, strict) {
	console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
	console.log('🔧 Git Workflow Validation (Pattern-VALIDATION-001)');
	console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
	console.log(`\n🔍 Validating: ${path.relative(process.cwd(), projectPath)}`);
	if (strict) {
		console.log('   Mode: --strict (warnings treated as errors)');
	}

	const validator = new GitWorkflowValidator();
	const result = validator.validate(projectPath);

	// Display git state
	console.log(`\n📊 Git State:`);
	console.log(`   Current branch: ${result.currentBranch}`);
	console.log(`   Uncommitted changes: ${result.hasUncommittedChanges ? '⚠️  Yes' : '✅ No'}`);
	console.log(`   Merge conflicts: ${result.hasMergeConflicts ? '❌ Yes' : '✅ No'}`);
	console.log(`   Unpushed commits: ${result.unpushedCommitsCount}`);

	// Display issues
	if (result.issues.length > 0) {
		console.log(`\n⚠️  Issues Detected:`);

		for (const issue of result.issues) {
			const icon = issue.severity === 'error' ? '❌' :
						 issue.severity === 'critical' ? '⚠️' : '💡';

			console.log(`\n${icon} ${issue.type.toUpperCase()} (${issue.severity})`);
			console.log(`   ${issue.message}`);
			if (issue.suggestion) {
				console.log(`   💡 ${issue.suggestion}`);
			}
		}
	}

	// Determine exit code
	const hasErrors = result.issues.some(issue => issue.severity === 'error');
	const hasWarnings = result.issues.some(issue => issue.severity === 'warning' || issue.severity === 'critical');

	if (hasErrors) {
		console.log(`\n❌ Git workflow validation FAILED (errors present)`);
		console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
		return 1;
	} else if (hasWarnings && strict) {
		console.log(`\n⚠️  Git workflow validation FAILED (warnings present, --strict mode)`);
		console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
		return 2;
	} else if (hasWarnings) {
		console.log(`\n⚠️  Git workflow validation PASSED (warnings present, but not blocking)`);
		console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
		return 0; // Exit 0 even with warnings (non-strict mode)
	} else {
		console.log(`\n✅ Git workflow validation PASSED (clean git state)`);
		console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
		return 0;
	}
}

/**
 * Main entry point
 */
function main() {
	const { projectPath: argProjectPath, strict } = parseArgs();
	let projectPath;

	if (argProjectPath) {
		// Specific project path provided
		projectPath = path.resolve(argProjectPath);
	} else {
		// Default: Validate current directory
		projectPath = process.cwd();
	}

	// Verify project path exists
	if (!fs.existsSync(projectPath)) {
		console.error(`❌ Error: Project directory not found: ${projectPath}`);
		process.exit(1);
	}

	const exitCode = validateGitWorkflow(projectPath, strict);
	process.exit(exitCode);
}

// Run if called directly
if (require.main === module) {
	main();
}

module.exports = { validateGitWorkflow };
