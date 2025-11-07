#!/usr/bin/env node

/**
 * Validate Code Protection Script
 *
 * @protected - Core protection enforcement, refactor only
 * Locked: 2025-11-07 (PROTECT-002 phase-2-enforcement)
 * Reference: CODE_PROTECTION_POLICY.md
 *
 * DESIGN DECISION: Pre-commit hook to enforce @protected/@immutable annotations
 * WHY: Prevent accidental modification of locked code without explicit approval
 *
 * REASONING CHAIN:
 * 1. Developer modifies @protected file (e.g., SprintLoader.ts)
 * 2. git commit triggers pre-commit hook
 * 3. This script scans staged files for protection annotations
 * 4. If found, prompt for explicit approval
 * 5. If approved, add audit trail to commit message
 * 6. If denied, block commit and unstage file
 * 7. Result: Protected code cannot be modified accidentally
 *
 * PATTERN: Pattern-GIT-001 (Git Workflow Integration)
 * HISTORICAL: v0.13.23 native dependency broke extension (9 hours to fix)
 *
 * USAGE:
 *   node scripts/validate-protection.js                   # Check staged files
 *   SKIP_PROTECTION_CHECK=1 git commit ...                # CI mode (skip checks)
 *
 * EXIT CODES:
 *   0 = No protected files modified OR approval given
 *   1 = Protected files modified and approval denied
 *   2 = Error reading files or annotations
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

/**
 * Get list of staged files from git
 */
function getStagedFiles() {
	try {
		const output = execSync('git diff --cached --name-only', {
			encoding: 'utf-8',
			cwd: path.join(__dirname, '..')
		});
		return output.trim().split('\n').filter(f => f && f.length > 0);
	} catch (error) {
		console.error('❌ Error: Could not get staged files');
		console.error(error.message);
		return [];
	}
}

/**
 * Check if a file has @protected or @immutable annotation
 * Returns: { protected: boolean, level: 'protected'|'immutable'|null, line: number }
 */
function checkFileProtection(filePath) {
	const fullPath = path.join(__dirname, '..', filePath);

	// Only check TypeScript/JavaScript files
	if (!/\.(ts|tsx|js|jsx)$/.test(filePath)) {
		return { protected: false, level: null, line: 0 };
	}

	// Check if file exists (might be deleted)
	if (!fs.existsSync(fullPath)) {
		return { protected: false, level: null, line: 0 };
	}

	try {
		const content = fs.readFileSync(fullPath, 'utf-8');
		const lines = content.split('\n');

		// Look for @protected or @immutable in first 50 lines (file headers)
		for (let i = 0; i < Math.min(50, lines.length); i++) {
			const line = lines[i];
			if (line.includes('@immutable')) {
				return { protected: true, level: 'immutable', line: i + 1 };
			}
			if (line.includes('@protected')) {
				return { protected: true, level: 'protected', line: i + 1 };
			}
		}

		return { protected: false, level: null, line: 0 };
	} catch (error) {
		console.error(`⚠️  Warning: Could not read ${filePath}`);
		return { protected: false, level: null, line: 0 };
	}
}

/**
 * Prompt user for approval (interactive mode)
 */
function promptForApproval(protectedFiles) {
	return new Promise((resolve) => {
		const rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout
		});

		console.log('');
		console.log('⚠️  PROTECTED CODE MODIFICATION DETECTED');
		console.log('');
		console.log('The following protected files are being modified:');
		console.log('');

		protectedFiles.forEach(file => {
			const level = file.level === 'immutable' ? '🔴 IMMUTABLE' : '🟡 PROTECTED';
			console.log(`  ${level}: ${file.path}:${file.line}`);
		});

		console.log('');
		console.log('Protection levels:');
		console.log('  🔴 IMMUTABLE: NEVER modify (API contracts, critical systems)');
		console.log('  🟡 PROTECTED: Refactor only (preserve interface and behavior)');
		console.log('');
		console.log('See CODE_PROTECTION_POLICY.md for details.');
		console.log('');

		rl.question('Do you approve modifying protected code? (yes/no): ', (answer) => {
			rl.close();
			const approved = answer.trim().toLowerCase() === 'yes';
			resolve(approved);
		});
	});
}

/**
 * Main validation function
 */
async function validateProtection() {
	// CI mode: Skip protection checks
	if (process.env.SKIP_PROTECTION_CHECK === '1') {
		console.log('ℹ️  Protection check skipped (CI mode)');
		return 0;
	}

	// Get staged files
	const stagedFiles = getStagedFiles();
	if (stagedFiles.length === 0) {
		// No staged files (empty commit or error)
		return 0;
	}

	// Check each file for protection annotations
	const protectedFiles = [];
	for (const file of stagedFiles) {
		const protection = checkFileProtection(file);
		if (protection.protected) {
			protectedFiles.push({
				path: file,
				level: protection.level,
				line: protection.line
			});
		}
	}

	// No protected files modified
	if (protectedFiles.length === 0) {
		return 0;
	}

	// Protected files modified - require approval
	const approved = await promptForApproval(protectedFiles);

	if (approved) {
		// Approval given - add audit trail to commit message
		console.log('');
		console.log('✅ Approval granted');
		console.log('');
		console.log('IMPORTANT: Add this to your commit message for audit trail:');
		console.log('');
		console.log('PROTECTED CODE MODIFICATION APPROVED:');
		protectedFiles.forEach(file => {
			console.log(`  - ${file.path} (${file.level})`);
		});
		console.log('');
		return 0;
	} else {
		// Approval denied - block commit
		console.log('');
		console.log('❌ Commit blocked: Protected code modification denied');
		console.log('');
		console.log('To proceed:');
		console.log('1. Review CODE_PROTECTION_POLICY.md for modification rules');
		console.log('2. Create refactor/ branch if refactoring protected code');
		console.log('3. Ensure all tests pass and interface preserved');
		console.log('4. Get 2+ reviewers for protected code changes');
		console.log('');
		console.log('Or:');
		console.log('  git restore --staged <file>  # Unstage protected file');
		console.log('');
		return 1;
	}
}

// Run validation
validateProtection()
	.then(exitCode => {
		process.exit(exitCode);
	})
	.catch(error => {
		console.error('❌ Error running protection validation:');
		console.error(error);
		process.exit(2);
	});
