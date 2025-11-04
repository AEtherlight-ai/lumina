#!/usr/bin/env node

/**
 * Validate TypeScript Compilation Script
 *
 * DESIGN DECISION: Automated pre-commit/pre-publish TypeScript validation
 * WHY: Prevent type errors from reaching production
 *
 * REASONING CHAIN:
 * 1. TypeScript catches bugs at compile time through type checking
 * 2. Without validation, developers might commit code with type errors
 * 3. Type errors cause runtime failures that could have been prevented
 * 4. Must validate BEFORE committing/publishing
 * 5. Result: Zero type errors reach production
 *
 * PATTERN: Pattern-VALIDATION-001 (Comprehensive System Validation)
 * RELATED: VAL-004
 *
 * USAGE:
 *   node scripts/validate-typescript.js                    # Validate vscode-lumina
 *   node scripts/validate-typescript.js path/to/project    # Validate specific project
 *
 * EXIT CODES:
 *   0 = Validation passed (zero type errors)
 *   1 = Validation failed (type errors found)
 */

const fs = require('fs');
const path = require('path');

// Import TypeScriptValidator from compiled output
const validatorPath = path.join(__dirname, '../vscode-lumina/out/services/TypeScriptValidator.js');
if (!fs.existsSync(validatorPath)) {
	console.error('❌ Error: TypeScriptValidator not compiled');
	console.error('   Run: cd vscode-lumina && npm run compile');
	process.exit(1);
}

const { TypeScriptValidator } = require(validatorPath);

/**
 * Main validation function
 */
function validateTypeScript(projectPath) {
	console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
	console.log('🔧 TypeScript Compilation Validation');
	console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
	console.log(`\n🔍 Validating: ${path.relative(process.cwd(), projectPath)}`);

	const validator = new TypeScriptValidator();
	const result = validator.validate(projectPath);

	if (result.valid) {
		console.log('✅ TypeScript compilation validation PASSED');
		console.log(`   Zero type errors found`);
		console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
		return true;
	} else {
		console.log(`\n❌ TypeScript compilation validation FAILED`);
		console.log(`   Found ${result.errorCount} error(s)\n`);

		// Group errors by file
		const errorsByFile = new Map();
		for (const issue of result.issues) {
			const file = issue.file || 'unknown';
			if (!errorsByFile.has(file)) {
				errorsByFile.set(file, []);
			}
			errorsByFile.get(file).push(issue);
		}

		// Display errors by file
		for (const [file, issues] of errorsByFile.entries()) {
			if (file === 'unknown') {
				// General errors (not file-specific)
				for (const issue of issues) {
					const icon = issue.type === 'command_error' ? '⚠️' :
								 issue.type === 'missing_config' ? '📄' : '❌';
					console.log(`${icon} ${issue.type.toUpperCase()}`);
					console.log(`   ${issue.message}\n`);
				}
			} else {
				// File-specific errors
				const relFile = path.relative(projectPath, file);
				console.log(`📄 ${relFile}`);

				for (const issue of issues) {
					if (issue.line && issue.column) {
						console.log(`   Line ${issue.line}, Column ${issue.column}: ${issue.message}`);
						if (issue.code) {
							console.log(`   Error code: ${issue.code}`);
						}
					} else {
						console.log(`   ${issue.message}`);
					}
				}
				console.log('');
			}
		}

		console.log('💡 How to fix:');
		console.log('   1. Review type errors above');
		console.log('   2. Fix type mismatches in source files');
		console.log('   3. Run: npm run compile (to verify fixes)');
		console.log('   4. Run this script again to validate');
		console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
		return false;
	}
}

/**
 * Main entry point
 */
function main() {
	const args = process.argv.slice(2);
	let projectPath;

	if (args.length > 0) {
		// Specific project path provided
		projectPath = path.resolve(args[0]);
	} else {
		// Default: Validate vscode-lumina extension
		projectPath = path.join(__dirname, '../vscode-lumina');
	}

	// Verify project path exists
	if (!fs.existsSync(projectPath)) {
		console.error(`❌ Error: Project directory not found: ${projectPath}`);
		process.exit(1);
	}

	// Verify tsconfig.json exists
	const tsconfigPath = path.join(projectPath, 'tsconfig.json');
	if (!fs.existsSync(tsconfigPath)) {
		console.error(`❌ Error: tsconfig.json not found in: ${projectPath}`);
		console.error('   This project does not appear to be a TypeScript project');
		process.exit(1);
	}

	const isValid = validateTypeScript(projectPath);
	process.exit(isValid ? 0 : 1);
}

// Run if called directly
if (require.main === module) {
	main();
}

module.exports = { validateTypeScript };
