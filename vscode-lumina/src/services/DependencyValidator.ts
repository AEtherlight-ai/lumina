/**
 * DependencyValidator - Validates package.json dependencies
 *
 * DESIGN DECISION: Prevent native and runtime npm dependencies in VS Code extensions
 * WHY: `vsce package --no-dependencies` excludes ALL node_modules from .vsix
 *
 * REASONING CHAIN:
 * 1. VS Code extension packaged with `vsce package --no-dependencies`
 * 2. ALL node_modules excluded from .vsix (including production deps)
 * 3. Native deps require compilation (NAPI, node-gyp) → won't work
 * 4. Runtime npm deps (glob, lodash) → excluded from package → activation fails
 * 5. Result: Must use Node.js built-ins only
 *
 * PATTERN: Pattern-PUBLISH-003 (Avoid Runtime npm Dependencies)
 * RELATED: VAL-002, v0.13.23 bug (@nut-tree-fork/nut-js), v0.15.31-32 bug (glob)
 *
 * HISTORICAL BUGS PREVENTED:
 * - v0.13.23: @nut-tree-fork/nut-js (native) → Extension activation failed (9 hours to fix)
 * - v0.15.31-32: glob (runtime npm) → Extension activation failed (2 hours to fix)
 *
 * PERFORMANCE REQUIREMENT: <50ms validation time
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Validation result
 */
export interface ValidationResult {
	valid: boolean;
	issues: DependencyIssue[];
}

/**
 * Dependency issue detected
 */
export interface DependencyIssue {
	type: 'native_dependency' | 'runtime_npm_dependency' | 'file_error' | 'parse_error';
	package: string;
	message: string;
	suggestion: string;
}

/**
 * Package.json structure (minimal)
 */
interface PackageJson {
	name?: string;
	version?: string;
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
}

/**
 * DependencyValidator
 *
 * DESIGN DECISION: Use pattern matching to detect forbidden dependencies
 * WHY: Fast (<50ms), reliable, catches all known problematic patterns
 */
export class DependencyValidator {
	/**
	 * Native dependency patterns
	 *
	 * DESIGN DECISION: List all known native dependency packages
	 * WHY: Native deps require C++ compilation, won't work in packaged extensions
	 */
	private nativeDependencyPatterns: string[] = [
		'@nut-tree-fork/nut-js',  // v0.13.23 bug - keyboard/mouse automation
		'robotjs',                // Desktop automation
		'node-hid',               // USB device access
		'serialport',             // Serial port access
		'usb',                    // USB access
		'ffi-napi',               // Native library bindings
		'ref-napi',               // Native library bindings
		'node-gyp',               // C++ addon build tool
		'bindings',               // Native addon loader
		'prebuild',               // Precompiled native addon loader
		'napi',                   // N-API native addons
		'.node'                   // Native addon file extension pattern
	];

	/**
	 * Runtime npm dependency patterns
	 *
	 * DESIGN DECISION: List all common utility libraries that should be avoided
	 * WHY: These get excluded by --no-dependencies, causing activation failures
	 */
	private runtimeNpmDependencyPatterns: string[] = [
		'glob',         // v0.15.31-32 bug - file globbing
		'fast-glob',    // Alternative globbing library
		'lodash',       // Utility library (use native JS instead)
		'underscore',   // Utility library (use native JS instead)
		'moment',       // Date library (use native Date instead)
		'date-fns',     // Date library (use native Date instead)
		'axios',        // HTTP client (use node-fetch or https built-in)
		'got',          // HTTP client (use node-fetch or https built-in)
		'chalk',        // Terminal colors (use VS Code output channel)
		'colors'        // Terminal colors (use VS Code output channel)
	];

	/**
	 * Allowed dependencies (whitelist)
	 *
	 * DESIGN DECISION: Allow specific dependencies that are known to work
	 * WHY: These are either sub-packages or minimal pure-JS libraries needed for core functionality
	 */
	private allowedDependencies: string[] = [
		'@iarna/toml',           // TOML parser (pure JS)
		'node-fetch',            // HTTP client (whitelisted)
		'ws',                    // WebSocket client (whitelisted)
		'form-data',             // HTTP multipart (whitelisted)
		'aetherlight-analyzer',  // Sub-package
		'aetherlight-sdk',       // Sub-package
		'aetherlight-node'       // Sub-package
	];

	/**
	 * Safe alternatives for common dependencies
	 */
	private safeAlternatives: Record<string, string> = {
		'glob': 'fs.readdirSync() + .filter()',
		'fast-glob': 'fs.readdirSync() + .filter()',
		'lodash': 'Native JS array methods (map, filter, reduce)',
		'underscore': 'Native JS array methods (map, filter, reduce)',
		'moment': 'Native Date() or inline utilities',
		'date-fns': 'Native Date() or inline utilities',
		'axios': 'node-fetch (whitelisted) or https built-in',
		'got': 'node-fetch (whitelisted) or https built-in',
		'chalk': 'VS Code output channel styling',
		'colors': 'VS Code output channel styling',
		'@nut-tree-fork/nut-js': 'VS Code APIs (editor.edit(), terminal.sendText())',
		'robotjs': 'VS Code APIs (editor.edit(), terminal.sendText())',
		'node-hid': 'Move to desktop app (Tauri) or remove feature',
		'serialport': 'Move to desktop app (Tauri) or remove feature',
		'usb': 'Move to desktop app (Tauri) or remove feature',
		'ffi-napi': 'Move to desktop app (Tauri) or remove feature',
		'ref-napi': 'Move to desktop app (Tauri) or remove feature'
	};

	/**
	 * Validate package.json dependencies
	 *
	 * DESIGN DECISION: Check only production dependencies (not devDependencies)
	 * WHY: devDependencies are only used during development, not packaged
	 *
	 * @param packageJsonPath - Absolute path to package.json
	 * @returns ValidationResult with issues found
	 */
	validate(packageJsonPath: string): ValidationResult {
		const startTime = Date.now();
		const issues: DependencyIssue[] = [];

		try {
			// Read package.json
			if (!fs.existsSync(packageJsonPath)) {
				return {
					valid: false,
					issues: [{
						type: 'file_error',
						package: 'package.json',
						message: 'package.json not found',
						suggestion: `Check path: ${packageJsonPath}`
					}]
				};
			}

			const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf-8');
			let packageJson: PackageJson;

			try {
				packageJson = JSON.parse(packageJsonContent);
			} catch (parseError: any) {
				return {
					valid: false,
					issues: [{
						type: 'parse_error',
						package: 'package.json',
						message: 'Invalid JSON in package.json',
						suggestion: `Fix JSON syntax: ${parseError.message}`
					}]
				};
			}

			// Get production dependencies
			const dependencies = packageJson.dependencies || {};

			// Check each dependency
			for (const [packageName, version] of Object.entries(dependencies)) {
				// Skip whitelisted dependencies
				if (this.allowedDependencies.includes(packageName)) {
					continue;
				}

				// Check for native dependencies
				if (this.isNativeDependency(packageName)) {
					issues.push({
						type: 'native_dependency',
						package: packageName,
						message: `Native dependency detected: ${packageName} (requires C++ compilation)`,
						suggestion: this.getSafeAlternative(packageName)
					});
					continue;
				}

				// Check for runtime npm dependencies
				if (this.isRuntimeNpmDependency(packageName)) {
					issues.push({
						type: 'runtime_npm_dependency',
						package: packageName,
						message: `Runtime npm dependency detected: ${packageName} (excluded by --no-dependencies)`,
						suggestion: this.getSafeAlternative(packageName)
					});
					continue;
				}
			}

			// Performance check
			const elapsedTime = Date.now() - startTime;
			if (elapsedTime > 50) {
				console.warn(`[DependencyValidator] Validation took ${elapsedTime}ms (target: <50ms)`);
			}

			return {
				valid: issues.length === 0,
				issues
			};

		} catch (error: any) {
			return {
				valid: false,
				issues: [{
					type: 'file_error',
					package: 'package.json',
					message: `Error reading package.json: ${error.message}`,
					suggestion: 'Check file permissions and path'
				}]
			};
		}
	}

	/**
	 * Check if package is a native dependency
	 *
	 * DESIGN DECISION: Pattern matching on package name
	 * WHY: Fast, reliable, catches all known patterns
	 */
	private isNativeDependency(packageName: string): boolean {
		return this.nativeDependencyPatterns.some(pattern =>
			packageName.includes(pattern) || packageName === pattern
		);
	}

	/**
	 * Check if package is a runtime npm dependency
	 *
	 * DESIGN DECISION: Pattern matching on package name
	 * WHY: Fast, reliable, catches all known problematic packages
	 */
	private isRuntimeNpmDependency(packageName: string): boolean {
		return this.runtimeNpmDependencyPatterns.some(pattern =>
			packageName === pattern
		);
	}

	/**
	 * Get safe alternative for a forbidden dependency
	 *
	 * DESIGN DECISION: Provide actionable suggestions for each dependency
	 * WHY: Helps developers quickly find safe alternatives
	 */
	private getSafeAlternative(packageName: string): string {
		return this.safeAlternatives[packageName] ||
			'Use Node.js built-in modules (fs, path, util) or VS Code APIs';
	}
}
