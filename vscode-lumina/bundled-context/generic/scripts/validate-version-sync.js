#!/usr/bin/env node

/**
 * Validate Version Sync Script
 *
 * DESIGN DECISION: Automated pre-publish version sync validation
 * WHY: Prevents version mismatches that broke v0.13.28, v0.13.29
 *
 * REASONING CHAIN:
 * 1. Monorepo has 4 packages that must stay in sync
 * 2. v0.13.29: Sub-packages not published → users couldn't install
 * 3. Manual version checking is error-prone
 * 4. Must validate BEFORE publishing
 * 5. Result: Automatic version sync enforcement
 *
 * PATTERN: Pattern-VALIDATION-001 (Comprehensive System Validation)
 * RELATED: VAL-007
 *
 * USAGE:
 *   node scripts/validate-version-sync.js                 # Validate current directory
 *   node scripts/validate-version-sync.js path/to/project # Validate specific project
 *
 * EXIT CODES:
 *   0 = Validation passed (all versions in sync)
 *   1 = Validation failed (version mismatches detected)
 */

const fs = require('fs');
const path = require('path');

// Import VersionSyncValidator from compiled output
const validatorPath = path.join(__dirname, '../vscode-lumina/out/services/VersionSyncValidator.js');
if (!fs.existsSync(validatorPath)) {
	console.error('❌ Error: VersionSyncValidator not compiled');
	console.error('   Run: cd vscode-lumina && npm run compile');
	process.exit(1);
}

const { VersionSyncValidator } = require(validatorPath);

/**
 * Parse command-line arguments
 */
function parseArgs() {
	const args = process.argv.slice(2);
	let projectPath = null;

	for (let i = 0; i < args.length; i++) {
		if (!args[i].startsWith('--')) {
			projectPath = args[i];
		}
	}

	return { projectPath };
}

/**
 * Main validation function
 */
function validateVersionSync(projectPath) {
	console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
	console.log('🔧 Version Sync Validation (Pattern-VALIDATION-001)');
	console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
	console.log(`\n🔍 Validating: ${path.relative(process.cwd(), projectPath)}`);

	const validator = new VersionSyncValidator();
	const result = validator.validate(projectPath);

	// Display version info
	console.log(`\n📊 Version Sync Status:`);
	console.log(`   Reference version: ${result.version}`);
	console.log(`   Packages checked: ${result.packageCount}`);
	console.log(`   All versions match: ${result.valid ? '✅ Yes' : '❌ No'}`);

	// Display package details
	if (result.packages && result.packages.length > 0) {
		console.log(`\n📦 Package Versions:`);
		for (const pkg of result.packages) {
			const icon = pkg.version === result.version ? '✅' : '❌';
			console.log(`   ${icon} ${pkg.path}: ${pkg.version}`);
		}
	}

	// Display issues
	if (result.issues.length > 0) {
		console.log(`\n❌ Issues Detected:`);

		for (const issue of result.issues) {
			console.log(`\n❌ ${issue.type.toUpperCase()}`);
			console.log(`   ${issue.message}`);
			if (issue.expectedVersion && issue.actualVersion) {
				console.log(`   Expected: ${issue.expectedVersion}`);
				console.log(`   Actual: ${issue.actualVersion}`);
			}
			if (issue.suggestion) {
				console.log(`   💡 ${issue.suggestion}`);
			}
		}

		// Display fix instructions
		console.log(`\n💡 How to fix:`);
		console.log(`   1. Update all package.json versions to match: ${result.version}`);
		console.log(`   2. Or run: node scripts/bump-version.js [patch|minor|major]`);
		console.log(`   3. Run this script again to verify`);
	}

	if (result.valid) {
		console.log(`\n✅ Version sync validation PASSED`);
		console.log(`   All ${result.packageCount} packages at version ${result.version}`);
		console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
		return true;
	} else {
		console.log(`\n❌ Version sync validation FAILED`);
		console.log(`   Fix version mismatches before publishing`);
		console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
		return false;
	}
}

/**
 * Main entry point
 */
function main() {
	const { projectPath: argProjectPath } = parseArgs();
	let projectPath;

	if (argProjectPath) {
		// Specific project path provided
		projectPath = path.resolve(argProjectPath);
	} else {
		// Default: Validate current directory (project root)
		projectPath = path.join(__dirname, '..');
	}

	// Verify project path exists
	if (!fs.existsSync(projectPath)) {
		console.error(`❌ Error: Project directory not found: ${projectPath}`);
		process.exit(1);
	}

	const isValid = validateVersionSync(projectPath);
	process.exit(isValid ? 0 : 1);
}

// Run if called directly
if (require.main === module) {
	main();
}

module.exports = { validateVersionSync };
