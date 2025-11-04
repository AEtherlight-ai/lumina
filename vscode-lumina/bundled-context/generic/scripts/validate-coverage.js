#!/usr/bin/env node

/**
 * Validate Test Coverage Script
 *
 * DESIGN DECISION: Automated pre-commit/pre-publish coverage validation
 * WHY: Enforce minimum test coverage to prevent regressions
 *
 * REASONING CHAIN:
 * 1. Tests create a "ratchet" preventing regressions
 * 2. Without enforcement, coverage can decline over time
 * 3. Declining coverage = higher risk of bugs
 * 4. Must validate BEFORE committing/publishing
 * 5. Result: Coverage maintained at or above minimum threshold
 *
 * PATTERN: Pattern-VALIDATION-001 (Comprehensive System Validation)
 * PATTERN: Pattern-TDD-001 (Test-Driven Development Ratchet)
 * RELATED: VAL-005
 *
 * USAGE:
 *   node scripts/validate-coverage.js                       # Validate vscode-lumina (80% minimum)
 *   node scripts/validate-coverage.js --min 90              # Custom minimum (90%)
 *   node scripts/validate-coverage.js path/to/project       # Validate specific project
 *
 * EXIT CODES:
 *   0 = Validation passed (coverage meets threshold)
 *   1 = Validation failed (coverage below threshold)
 */

const fs = require('fs');
const path = require('path');

// Import TestCoverageValidator from compiled output
const validatorPath = path.join(__dirname, '../vscode-lumina/out/services/TestCoverageValidator.js');
if (!fs.existsSync(validatorPath)) {
	console.error('❌ Error: TestCoverageValidator not compiled');
	console.error('   Run: cd vscode-lumina && npm run compile');
	process.exit(1);
}

const { TestCoverageValidator } = require(validatorPath);

/**
 * Parse command-line arguments
 */
function parseArgs() {
	const args = process.argv.slice(2);
	let projectPath = null;
	let minimumCoverage = 80;

	for (let i = 0; i < args.length; i++) {
		if (args[i] === '--min' || args[i] === '-m') {
			minimumCoverage = parseInt(args[i + 1], 10);
			i++; // Skip next arg
		} else if (!args[i].startsWith('--')) {
			projectPath = args[i];
		}
	}

	return { projectPath, minimumCoverage };
}

/**
 * Main validation function
 */
function validateCoverage(projectPath, minimumCoverage) {
	console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
	console.log('🧪 Test Coverage Validation (Pattern-TDD-001)');
	console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
	console.log(`\n🔍 Validating: ${path.relative(process.cwd(), projectPath)}`);
	console.log(`   Minimum coverage: ${minimumCoverage}%`);

	const validator = new TestCoverageValidator();
	const result = validator.validate(projectPath, { minimumCoverage });

	if (result.valid) {
		console.log(`\n✅ Test coverage validation PASSED`);
		console.log(`   Coverage: ${result.coveragePercent.toFixed(1)}%`);

		if (result.metrics) {
			console.log(`\n📊 Coverage Metrics:`);
			console.log(`   Lines:      ${result.metrics.lines.toFixed(1)}%`);
			console.log(`   Statements: ${result.metrics.statements.toFixed(1)}%`);
			console.log(`   Functions:  ${result.metrics.functions.toFixed(1)}%`);
			console.log(`   Branches:   ${result.metrics.branches.toFixed(1)}%`);
		}

		console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
		return true;
	} else {
		console.log(`\n❌ Test coverage validation FAILED`);
		console.log(`   Coverage: ${result.coveragePercent.toFixed(1)}%`);
		console.log(`   Minimum: ${minimumCoverage}%\n`);

		// Display issues
		for (const issue of result.issues) {
			const icon = issue.type === 'low_coverage' ? '📉' :
						 issue.type === 'missing_coverage' ? '📄' : '⚠️';

			console.log(`${icon} ${issue.type.toUpperCase()}`);
			console.log(`   ${issue.message}`);
			if (issue.suggestion) {
				console.log(`   💡 ${issue.suggestion}`);
			}
			console.log('');
		}

		// Display metrics if available
		if (result.metrics) {
			console.log(`📊 Coverage Metrics:`);
			console.log(`   Lines:      ${result.metrics.lines.toFixed(1)}%`);
			console.log(`   Statements: ${result.metrics.statements.toFixed(1)}%`);
			console.log(`   Functions:  ${result.metrics.functions.toFixed(1)}%`);
			console.log(`   Branches:   ${result.metrics.branches.toFixed(1)}%\n`);
		}

		// Display uncovered files (top 10)
		if (result.uncoveredFiles && result.uncoveredFiles.length > 0) {
			const topFiles = result.uncoveredFiles.slice(0, 10);
			console.log(`📝 Files with low coverage (top ${topFiles.length}):\n`);

			for (const file of topFiles) {
				const relPath = path.relative(projectPath, file.file);
				console.log(`   ${file.coverage.toFixed(1)}%  ${relPath}`);
			}

			if (result.uncoveredFiles.length > 10) {
				console.log(`\n   ... and ${result.uncoveredFiles.length - 10} more files`);
			}
			console.log('');
		}

		console.log('💡 How to fix:');
		console.log('   1. Add tests for files with low coverage');
		console.log('   2. Run: npm run test:coverage (to verify fixes)');
		console.log('   3. Run this script again to validate');
		console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
		return false;
	}
}

/**
 * Main entry point
 */
function main() {
	const { projectPath: argProjectPath, minimumCoverage } = parseArgs();
	let projectPath;

	if (argProjectPath) {
		// Specific project path provided
		projectPath = path.resolve(argProjectPath);
	} else {
		// Default: Validate vscode-lumina extension
		projectPath = path.join(__dirname, '../vscode-lumina');
	}

	// Verify project path exists
	if (!fs.existsSync(projectPath)) {
		console.error(`❌ Error: Project directory not found: ${projectPath}`);
		process.exit(1);
	}

	// Verify coverage directory exists
	const coverageDir = path.join(projectPath, 'coverage');
	if (!fs.existsSync(coverageDir)) {
		console.error(`❌ Error: Coverage directory not found: ${coverageDir}`);
		console.error('   Run tests with coverage first: npm run test:coverage');
		process.exit(1);
	}

	const isValid = validateCoverage(projectPath, minimumCoverage);
	process.exit(isValid ? 0 : 1);
}

// Run if called directly
if (require.main === module) {
	main();
}

module.exports = { validateCoverage };
