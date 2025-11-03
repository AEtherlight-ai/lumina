/**
 * VersionSyncValidator - Validates version consistency across monorepo packages
 *
 * DESIGN DECISION: Enforce version sync to prevent publish failures
 * WHY: Historical bugs (v0.13.28, v0.13.29) caused user install failures
 *
 * REASONING CHAIN:
 * 1. Monorepo has 4 packages that must stay in sync
 * 2. v0.13.29: Sub-packages not published → user installs failed
 * 3. Without validation, version mismatches slip through
 * 4. Must validate BEFORE publishing
 * 5. Result: All packages always in sync, no user install failures
 *
 * PATTERN: Pattern-VALIDATION-001 (Comprehensive System Validation)
 * RELATED: VAL-007
 *
 * PERFORMANCE REQUIREMENT: <100ms validation time
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Validation result
 */
export interface VersionSyncResult {
	valid: boolean;
	version: string; // Reference version (from first package)
	packageCount: number;
	issues: VersionSyncIssue[];
	packages?: PackageInfo[]; // Details of all packages checked
}

/**
 * Version sync issue detected
 */
export interface VersionSyncIssue {
	type: 'version_mismatch' | 'missing_package' | 'parse_error' | 'missing_version' | 'invalid_version';
	severity: 'error';
	message: string;
	packagePath?: string;
	expectedVersion?: string;
	actualVersion?: string;
	suggestion?: string;
}

/**
 * Package information
 */
export interface PackageInfo {
	path: string;
	name: string;
	version: string;
}

/**
 * Validation options
 */
export interface ValidationOptions {
	packagePaths?: string[]; // Custom package paths (relative to project root)
}

/**
 * VersionSyncValidator
 *
 * DESIGN DECISION: Check all package.json files in monorepo
 * WHY: Ensures version consistency before publishing
 */
export class VersionSyncValidator {
	/**
	 * Default package paths (relative to project root)
	 */
	private readonly DEFAULT_PACKAGE_PATHS = [
		'vscode-lumina/package.json',
		'packages/aetherlight-sdk/package.json',
		'packages/aetherlight-analyzer/package.json',
		'packages/aetherlight-node/package.json'
	];

	/**
	 * Validate version sync across all packages
	 *
	 * DESIGN DECISION: Read all package.json files and compare versions
	 * WHY: Simple and fast (<100ms)
	 *
	 * @param projectPath - Absolute path to project root directory
	 * @param options - Validation options (custom package paths)
	 * @returns VersionSyncResult with validation status
	 */
	validate(projectPath: string, options: ValidationOptions = {}): VersionSyncResult {
		const startTime = Date.now();
		const issues: VersionSyncIssue[] = [];
		const packages: PackageInfo[] = [];

		const packagePaths = options.packagePaths ?? this.DEFAULT_PACKAGE_PATHS;

		// 1. Read all package.json files
		let referenceVersion: string | null = null;

		for (const relativePath of packagePaths) {
			const fullPath = path.join(projectPath, relativePath);

			// Check if package.json exists
			if (!fs.existsSync(fullPath)) {
				issues.push({
					type: 'missing_package',
					severity: 'error',
					message: `Package not found: ${relativePath}`,
					packagePath: relativePath,
					suggestion: 'Ensure all packages exist before publishing'
				});
				continue;
			}

			// Read and parse package.json
			let packageJson: any;
			try {
				const content = fs.readFileSync(fullPath, 'utf8');
				packageJson = JSON.parse(content);
			} catch (error: any) {
				issues.push({
					type: 'parse_error',
					severity: 'error',
					message: `Failed to parse package.json: ${relativePath} - ${error.message}`,
					packagePath: relativePath,
					suggestion: 'Fix JSON syntax errors'
				});
				continue;
			}

			// Check if version field exists
			if (!packageJson.version) {
				issues.push({
					type: 'missing_version',
					severity: 'error',
					message: `Missing version field in package.json: ${relativePath}`,
					packagePath: relativePath,
					suggestion: 'Add version field to package.json'
				});
				continue;
			}

			const version = packageJson.version.trim();

			// Check for empty version
			if (version.length === 0) {
				issues.push({
					type: 'invalid_version',
					severity: 'error',
					message: `Empty version string in package.json: ${relativePath}`,
					packagePath: relativePath,
					suggestion: 'Provide valid semver version (e.g., 1.0.0)'
				});
				continue;
			}

			// Store package info
			packages.push({
				path: relativePath,
				name: packageJson.name || path.basename(path.dirname(relativePath)),
				version
			});

			// Set reference version from first package
			if (referenceVersion === null) {
				referenceVersion = version;
			} else if (version !== referenceVersion) {
				// Version mismatch detected
				issues.push({
					type: 'version_mismatch',
					severity: 'error',
					message: `Version mismatch in ${relativePath}: expected ${referenceVersion}, got ${version}`,
					packagePath: relativePath,
					expectedVersion: referenceVersion,
					actualVersion: version,
					suggestion: `Update version to ${referenceVersion} in ${relativePath}`
				});
			}
		}

		// Performance check
		const elapsedTime = Date.now() - startTime;
		if (elapsedTime > 100) {
			console.warn(`[VersionSyncValidator] Validation took ${elapsedTime}ms (target: <100ms)`);
		}

		// Determine if valid
		const valid = issues.length === 0;

		return {
			valid,
			version: referenceVersion || 'unknown',
			packageCount: packages.length,
			issues,
			packages
		};
	}

	/**
	 * Get list of mismatched packages
	 *
	 * DESIGN DECISION: Provide detailed mismatch information
	 * WHY: Helps developers fix issues quickly
	 *
	 * @param result - Validation result
	 * @returns Array of packages with version mismatches
	 */
	getMismatchedPackages(result: VersionSyncResult): PackageInfo[] {
		if (!result.packages) {
			return [];
		}

		const referenceVersion = result.version;
		return result.packages.filter(pkg => pkg.version !== referenceVersion);
	}
}
