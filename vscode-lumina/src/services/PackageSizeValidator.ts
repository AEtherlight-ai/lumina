/**
 * PackageSizeValidator - Validates VS Code extension package size
 *
 * DESIGN DECISION: Prevent VS Code marketplace rejection due to oversized packages
 * WHY: Marketplace has 50MB limit - packages over limit get rejected
 *
 * REASONING CHAIN:
 * 1. VS Code marketplace enforces <50MB limit for extensions
 * 2. Publishing oversized package causes immediate rejection
 * 3. Large packages often contain unnecessary files (tests, source maps, etc.)
 * 4. Need to validate BEFORE publishing to prevent wasted time
 * 5. Result: Catch size issues early with actionable suggestions
 *
 * PATTERN: Pattern-VALIDATION-001 (Comprehensive System Validation)
 * RELATED: VAL-003
 *
 * PERFORMANCE REQUIREMENT: <200ms validation time
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Validation result
 */
export interface ValidationResult {
	valid: boolean;
	sizeInMB: number;
	issues: PackageSizeIssue[];
	suggestions?: string[];
}

/**
 * Package size issue detected
 */
export interface PackageSizeIssue {
	type: 'oversized_package' | 'file_error' | 'invalid_path';
	message: string;
	suggestion: string;
}

/**
 * PackageSizeValidator
 *
 * DESIGN DECISION: Simple file size check for .vsix packages
 * WHY: Fast (<200ms), reliable, catches marketplace rejection issues
 */
export class PackageSizeValidator {
	/**
	 * VS Code marketplace size limit (in bytes)
	 *
	 * DESIGN DECISION: 50MB limit (VS Code marketplace enforces this)
	 * WHY: Any package >=50MB gets rejected by marketplace
	 */
	private readonly MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

	/**
	 * Validate .vsix package size
	 *
	 * DESIGN DECISION: Check file size only (no .vsix inspection)
	 * WHY: Fast, simple, catches marketplace limit violations
	 *
	 * @param vsixPath - Absolute path to .vsix package file
	 * @returns ValidationResult with size and issues
	 */
	validate(vsixPath: string): ValidationResult {
		const startTime = Date.now();

		try {
			// Validate path
			if (!vsixPath || vsixPath.trim() === '') {
				return {
					valid: false,
					sizeInMB: 0,
					issues: [{
						type: 'invalid_path',
						message: 'Empty or invalid .vsix path provided',
						suggestion: 'Provide absolute path to .vsix package file'
					}]
				};
			}

			// Check file exists
			if (!fs.existsSync(vsixPath)) {
				return {
					valid: false,
					sizeInMB: 0,
					issues: [{
						type: 'file_error',
						message: `.vsix package not found: ${path.basename(vsixPath)}`,
						suggestion: `Check path: ${vsixPath}`
					}]
				};
			}

			// Get file size
			const stats = fs.statSync(vsixPath);
			const sizeInBytes = stats.size;
			const sizeInMB = sizeInBytes / (1024 * 1024);

			// Check against marketplace limit
			if (sizeInBytes >= this.MAX_SIZE_BYTES) {
				return {
					valid: false,
					sizeInMB: parseFloat(sizeInMB.toFixed(2)),
					issues: [{
						type: 'oversized_package',
						message: `Package size ${sizeInMB.toFixed(2)}MB exceeds VS Code marketplace limit of 50MB`,
						suggestion: this.getSizeSuggestions(sizeInMB)
					}],
					suggestions: this.getVscodeignoreSuggestions()
				};
			}

			// Performance check
			const elapsedTime = Date.now() - startTime;
			if (elapsedTime > 200) {
				console.warn(`[PackageSizeValidator] Validation took ${elapsedTime}ms (target: <200ms)`);
			}

			// Valid package
			return {
				valid: true,
				sizeInMB: parseFloat(sizeInMB.toFixed(2)),
				issues: []
			};

		} catch (error: any) {
			return {
				valid: false,
				sizeInMB: 0,
				issues: [{
					type: 'file_error',
					message: `Error reading .vsix package: ${error.message}`,
					suggestion: 'Check file permissions and path'
				}]
			};
		}
	}

	/**
	 * Get size reduction suggestions
	 *
	 * DESIGN DECISION: Provide actionable advice based on package size
	 * WHY: Helps developer quickly identify solutions
	 */
	private getSizeSuggestions(sizeInMB: number): string {
		if (sizeInMB > 100) {
			return 'CRITICAL: Package is extremely large. Check for accidentally included large files (videos, images, datasets). Review .vscodeignore file.';
		} else if (sizeInMB > 75) {
			return 'Package is very large. Exclude test files, source maps, and node_modules from package. Add to .vscodeignore.';
		} else if (sizeInMB >= 50) {
			return 'Package exceeds marketplace limit. Exclude unnecessary files via .vscodeignore (tests, docs, examples).';
		}
		return 'Reduce package size by excluding unnecessary files.';
	}

	/**
	 * Get .vscodeignore suggestions
	 *
	 * DESIGN DECISION: Suggest common files to exclude
	 * WHY: Most extensions can safely exclude these to reduce size
	 */
	private getVscodeignoreSuggestions(): string[] {
		return [
			'.vscode/**',
			'.vscode-test/**',
			'src/**',           // Source TypeScript files (only out/ needed)
			'**/*.ts',          // TypeScript source files
			'**/*.map',         // Source maps
			'test/**',          // Test files
			'tests/**',         // Test files (alternative naming)
			'**/.eslintrc.json',
			'**/.prettierrc',
			'**/tsconfig.json',
			'**/*.md',          // Markdown docs (except README.md)
			'!README.md',       // Keep README.md
			'**/node_modules/**/test/**',  // Test files in dependencies
			'**/node_modules/**/tests/**', // Test files in dependencies
			'**/.DS_Store'      // Mac OS files
		];
	}

	/**
	 * Format bytes to human-readable size
	 *
	 * DESIGN DECISION: Helper for displaying sizes
	 * WHY: Makes logs and error messages more readable
	 */
	formatSize(bytes: number): string {
		const units = ['B', 'KB', 'MB', 'GB'];
		let size = bytes;
		let unitIndex = 0;

		while (size >= 1024 && unitIndex < units.length - 1) {
			size /= 1024;
			unitIndex++;
		}

		return `${size.toFixed(2)} ${units[unitIndex]}`;
	}
}
