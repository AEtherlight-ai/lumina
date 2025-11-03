/**
 * TypeScriptValidator - Validates TypeScript compilation
 *
 * DESIGN DECISION: Prevent TypeScript errors from reaching production
 * WHY: Type errors cause runtime bugs that could have been caught at compile time
 *
 * REASONING CHAIN:
 * 1. TypeScript catches bugs at compile time through type checking
 * 2. Without automated validation, developers might commit type errors
 * 3. Type errors in production cause unexpected runtime failures
 * 4. Must validate BEFORE committing/publishing
 * 5. Result: Zero type errors reach production
 *
 * PATTERN: Pattern-VALIDATION-001 (Comprehensive System Validation)
 * RELATED: VAL-004
 *
 * PERFORMANCE REQUIREMENT: <5s validation time
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Validation result
 */
export interface ValidationResult {
	valid: boolean;
	errorCount: number;
	issues: TypeScriptIssue[];
}

/**
 * TypeScript issue detected
 */
export interface TypeScriptIssue {
	type: 'type_error' | 'command_error' | 'missing_config' | 'file_error';
	file?: string;
	line?: number;
	column?: number;
	message: string;
	code?: string;
}

/**
 * TypeScriptValidator
 *
 * DESIGN DECISION: Use `tsc --noEmit` to check for type errors
 * WHY: Fast, reliable, official TypeScript compiler validation
 */
export class TypeScriptValidator {
	/**
	 * Validate TypeScript compilation
	 *
	 * DESIGN DECISION: Run `tsc --noEmit` in project directory
	 * WHY: Checks all TypeScript files without generating output files
	 *
	 * @param projectPath - Absolute path to project directory (must contain tsconfig.json)
	 * @returns ValidationResult with errors found
	 */
	validate(projectPath: string): ValidationResult {
		const startTime = Date.now();

		try {
			// Check if tsconfig.json exists
			const tsconfigPath = path.join(projectPath, 'tsconfig.json');
			if (!fs.existsSync(tsconfigPath)) {
				return {
					valid: false,
					errorCount: 1,
					issues: [{
						type: 'missing_config',
						message: 'tsconfig.json not found in project directory',
						file: projectPath
					}]
				};
			}

			// Check if project path is valid
			if (!fs.existsSync(projectPath)) {
				return {
					valid: false,
					errorCount: 1,
					issues: [{
						type: 'file_error',
						message: `Project directory not found: ${projectPath}`,
						file: projectPath
					}]
				};
			}

			// Run TypeScript compiler with --noEmit
			// This checks for type errors without generating output files
			// Use npx to run locally installed tsc
			try {
				execSync('npx tsc --noEmit', {
					cwd: projectPath,
					encoding: 'utf8',
					stdio: 'pipe' // Capture stderr for error parsing
				});

				// No errors - compilation successful
				const elapsedTime = Date.now() - startTime;
				if (elapsedTime > 5000) {
					console.warn(`[TypeScriptValidator] Validation took ${elapsedTime}ms (target: <5000ms)`);
				}

				return {
					valid: true,
					errorCount: 0,
					issues: []
				};

			} catch (error: any) {
				// tsc failed - parse error output
				const errorOutput = error.stderr || error.stdout || error.message || '';

				// Parse TypeScript errors from output
				const issues = this.parseTscErrors(errorOutput);

				// If no parsed errors but command failed, it might be a command error
				if (issues.length === 0 && error.message) {
					// Check if it's a "tsc not found" error
					if (error.message.includes('tsc') && (error.message.includes('not found') || error.message.includes('not recognized'))) {
						return {
							valid: false,
							errorCount: 1,
							issues: [{
								type: 'command_error',
								message: 'TypeScript compiler (tsc) not found. Install TypeScript: npm install -D typescript',
							}]
						};
					}

					// Generic command error
					return {
						valid: false,
						errorCount: 1,
						issues: [{
							type: 'command_error',
							message: `TypeScript validation failed: ${error.message}`
						}]
					};
				}

				return {
					valid: false,
					errorCount: issues.length,
					issues
				};
			}

		} catch (error: any) {
			return {
				valid: false,
				errorCount: 1,
				issues: [{
					type: 'file_error',
					message: `Error validating TypeScript: ${error.message}`
				}]
			};
		}
	}

	/**
	 * Parse TypeScript compiler error output
	 *
	 * DESIGN DECISION: Parse tsc error format to extract structured information
	 * WHY: Provides file, line, column, and error message for each error
	 *
	 * TypeScript error format:
	 * src/file.ts(10,5): error TS2322: Type 'string' is not assignable to type 'number'.
	 */
	private parseTscErrors(output: string): TypeScriptIssue[] {
		const issues: TypeScriptIssue[] = [];
		const lines = output.split('\n');

		for (const line of lines) {
			// Match TypeScript error format: file.ts(line,col): error TSxxxx: message
			const errorMatch = line.match(/^(.+?)\((\d+),(\d+)\):\s*(error|warning)\s+(TS\d+):\s*(.+)$/);

			if (errorMatch) {
				const [, file, lineNum, colNum, severity, code, message] = errorMatch;

				issues.push({
					type: 'type_error',
					file: file.trim(),
					line: parseInt(lineNum, 10),
					column: parseInt(colNum, 10),
					code: code,
					message: message.trim()
				});
			} else if (line.includes('error TS')) {
				// Fallback: If line contains "error TS" but doesn't match the pattern,
				// still capture it as an error
				issues.push({
					type: 'type_error',
					message: line.trim()
				});
			}
		}

		return issues;
	}
}
