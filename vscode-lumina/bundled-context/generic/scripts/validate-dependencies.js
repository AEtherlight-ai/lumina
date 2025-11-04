#!/usr/bin/env node

/**
 * Validate Dependencies Script
 *
 * DESIGN DECISION: Automated pre-publish dependency validation
 * WHY: Prevent Pattern-PUBLISH-003 violations (native/runtime npm deps)
 *
 * REASONING CHAIN:
 * 1. VS Code extensions packaged with `vsce package --no-dependencies`
 * 2. ALL node_modules excluded from .vsix (including production deps)
 * 3. Native deps (NAPI, node-gyp) won't work → activation fails
 * 4. Runtime npm deps (glob, lodash) excluded → activation fails
 * 5. Must catch these BEFORE publishing to prevent broken releases
 * 6. Result: Automated validation saves 2-9 hours debugging per bug
 *
 * PATTERN: Pattern-PUBLISH-003 (Avoid Runtime npm Dependencies)
 * RELATED: VAL-002, v0.13.23 bug, v0.15.31-32 bug
 *
 * USAGE:
 *   node scripts/validate-dependencies.js          # Validate vscode-lumina package.json
 *   node scripts/validate-dependencies.js --all    # Validate all package.json files
 *
 * EXIT CODES:
 *   0 = All validations passed
 *   1 = Validation failures detected
 */

const fs = require('fs');
const path = require('path');

// Import DependencyValidator from compiled output
const validatorPath = path.join(__dirname, '../vscode-lumina/out/services/DependencyValidator.js');
if (!fs.existsSync(validatorPath)) {
	console.error('❌ Error: DependencyValidator not compiled');
	console.error('   Run: cd vscode-lumina && npm run compile');
	process.exit(1);
}

const { DependencyValidator } = require(validatorPath);

/**
 * Main validation function
 */
function validateDependencies(packageJsonPath, verbose = true) {
	if (verbose) {
		console.log(`\n🔍 Validating: ${path.relative(process.cwd(), packageJsonPath)}`);
	}

	const validator = new DependencyValidator();
	const result = validator.validate(packageJsonPath);

	if (result.valid) {
		if (verbose) {
			console.log('✅ All dependencies valid');
		}
		return true;
	} else {
		console.log(`\n❌ Dependency validation FAILED: ${path.relative(process.cwd(), packageJsonPath)}`);
		console.log(`   Found ${result.issues.length} issue(s):\n`);

		for (const issue of result.issues) {
			const icon = issue.type === 'native_dependency' ? '🔴' :
						 issue.type === 'runtime_npm_dependency' ? '🟡' :
						 '⚠️';

			console.log(`${icon} ${issue.type.toUpperCase()}: ${issue.package}`);
			console.log(`   ${issue.message}`);
			console.log(`   💡 Suggestion: ${issue.suggestion}\n`);
		}

		return false;
	}
}

/**
 * Find all package.json files in the project
 */
function findPackageJsonFiles(rootDir) {
	const packageFiles = [];

	function searchDir(dir) {
		// Skip node_modules and hidden directories
		const basename = path.basename(dir);
		if (basename === 'node_modules' || basename.startsWith('.')) {
			return;
		}

		try {
			const entries = fs.readdirSync(dir, { withFileTypes: true });

			for (const entry of entries) {
				const fullPath = path.join(dir, entry.name);

				if (entry.isDirectory()) {
					searchDir(fullPath);
				} else if (entry.name === 'package.json') {
					packageFiles.push(fullPath);
				}
			}
		} catch (error) {
			// Ignore permission errors
		}
	}

	searchDir(rootDir);
	return packageFiles;
}

/**
 * Main entry point
 */
function main() {
	const args = process.argv.slice(2);
	const validateAll = args.includes('--all');

	console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
	console.log('🔧 Dependency Validation (Pattern-PUBLISH-003)');
	console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

	const rootDir = path.join(__dirname, '..');
	let packageJsonPaths = [];

	if (validateAll) {
		console.log('📦 Scanning for all package.json files...');
		packageJsonPaths = findPackageJsonFiles(rootDir);
		console.log(`   Found ${packageJsonPaths.length} package.json files`);
	} else {
		// Default: Validate only vscode-lumina (the extension package)
		console.log('📦 Validating VS Code extension package only');
		console.log('   (use --all to validate all packages)');
		packageJsonPaths = [path.join(rootDir, 'vscode-lumina/package.json')];
	}

	let allValid = true;

	for (const packageJsonPath of packageJsonPaths) {
		if (!fs.existsSync(packageJsonPath)) {
			console.log(`⚠️  Skipping: ${path.relative(rootDir, packageJsonPath)} (not found)`);
			continue;
		}

		const isValid = validateDependencies(packageJsonPath, validateAll);
		if (!isValid) {
			allValid = false;
		}
	}

	console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

	if (allValid) {
		console.log('✅ All dependency validations PASSED');
		console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
		process.exit(0);
	} else {
		console.log('❌ Dependency validation FAILED');
		console.log('\n💡 How to fix:');
		console.log('   1. Remove forbidden dependencies from package.json');
		console.log('   2. Use Node.js built-in modules (fs, path, util)');
		console.log('   3. Use VS Code APIs when available');
		console.log('   4. See: Pattern-PUBLISH-003 in CLAUDE.md');
		console.log('\n📚 Historical bugs prevented:');
		console.log('   • v0.13.23: @nut-tree-fork/nut-js (native) → 9 hours to fix');
		console.log('   • v0.15.31-32: glob (runtime npm) → 2 hours to fix');
		console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
		process.exit(1);
	}
}

// Run if called directly
if (require.main === module) {
	main();
}

module.exports = { validateDependencies, findPackageJsonFiles };
