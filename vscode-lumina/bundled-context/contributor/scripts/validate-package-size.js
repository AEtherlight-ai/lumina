#!/usr/bin/env node

/**
 * Validate Package Size Script
 *
 * DESIGN DECISION: Automated pre-publish package size validation
 * WHY: Prevent VS Code marketplace rejection due to oversized packages
 *
 * REASONING CHAIN:
 * 1. VS Code marketplace enforces <50MB limit for extensions
 * 2. Publishing oversized package causes immediate rejection
 * 3. Must catch size issues BEFORE publishing
 * 4. Provide clear guidance on reducing package size
 * 5. Result: Never waste time with marketplace rejections
 *
 * PATTERN: Pattern-VALIDATION-001 (Comprehensive System Validation)
 * RELATED: VAL-003
 *
 * USAGE:
 *   node scripts/validate-package-size.js                    # Auto-detect latest .vsix
 *   node scripts/validate-package-size.js path/to/file.vsix  # Validate specific .vsix
 *
 * EXIT CODES:
 *   0 = Validation passed
 *   1 = Validation failed (oversized or error)
 */

const fs = require('fs');
const path = require('path');

// Import PackageSizeValidator from compiled output
const validatorPath = path.join(__dirname, '../vscode-lumina/out/services/PackageSizeValidator.js');
if (!fs.existsSync(validatorPath)) {
	console.error('❌ Error: PackageSizeValidator not compiled');
	console.error('   Run: cd vscode-lumina && npm run compile');
	process.exit(1);
}

const { PackageSizeValidator } = require(validatorPath);

/**
 * Find latest .vsix file in vscode-lumina directory
 */
function findLatestVsix(dir) {
	try {
		const files = fs.readdirSync(dir)
			.filter(file => file.endsWith('.vsix'))
			.map(file => ({
				name: file,
				path: path.join(dir, file),
				mtime: fs.statSync(path.join(dir, file)).mtime
			}))
			.sort((a, b) => b.mtime - a.mtime);

		return files.length > 0 ? files[0].path : null;
	} catch (error) {
		return null;
	}
}

/**
 * Main validation function
 */
function validatePackageSize(vsixPath) {
	console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
	console.log('📦 Package Size Validation (VS Code Marketplace)');
	console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
	console.log(`\n🔍 Validating: ${path.basename(vsixPath)}`);

	const validator = new PackageSizeValidator();
	const result = validator.validate(vsixPath);

	console.log(`   Size: ${result.sizeInMB}MB`);
	console.log(`   Limit: 50MB (VS Code marketplace)`);

	if (result.valid) {
		const percentageUsed = (result.sizeInMB / 50 * 100).toFixed(1);
		console.log(`   Usage: ${percentageUsed}% of limit`);
		console.log('\n✅ Package size validation PASSED');

		if (result.sizeInMB > 40) {
			console.log('\n⚠️  Warning: Package is getting large (>40MB)');
			console.log('   Consider excluding unnecessary files to reduce size.');
		}

		console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
		return true;
	} else {
		console.log('\n❌ Package size validation FAILED\n');

		for (const issue of result.issues) {
			const icon = issue.type === 'oversized_package' ? '🔴' :
						 issue.type === 'file_error' ? '⚠️' : '⚠️';

			console.log(`${icon} ${issue.type.toUpperCase()}`);
			console.log(`   ${issue.message}`);
			console.log(`   💡 ${issue.suggestion}\n`);
		}

		if (result.suggestions && result.suggestions.length > 0) {
			console.log('📝 Add these patterns to .vscodeignore:\n');
			for (const suggestion of result.suggestions) {
				console.log(`   ${suggestion}`);
			}
			console.log('');
		}

		console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
		return false;
	}
}

/**
 * Main entry point
 */
function main() {
	const args = process.argv.slice(2);
	let vsixPath;

	if (args.length > 0) {
		// Specific .vsix path provided
		vsixPath = path.resolve(args[0]);
	} else {
		// Auto-detect latest .vsix in vscode-lumina/
		const vscodeLuminaDir = path.join(__dirname, '../vscode-lumina');
		vsixPath = findLatestVsix(vscodeLuminaDir);

		if (!vsixPath) {
			console.error('❌ Error: No .vsix package found in vscode-lumina/');
			console.error('   Run: cd vscode-lumina && npm run package');
			process.exit(1);
		}
	}

	if (!fs.existsSync(vsixPath)) {
		console.error(`❌ Error: Package not found: ${vsixPath}`);
		console.error('   Check the path and try again');
		process.exit(1);
	}

	const isValid = validatePackageSize(vsixPath);
	process.exit(isValid ? 0 : 1);
}

// Run if called directly
if (require.main === module) {
	main();
}

module.exports = { validatePackageSize, findLatestVsix };
