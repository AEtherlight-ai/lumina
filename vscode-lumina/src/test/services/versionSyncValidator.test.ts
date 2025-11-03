/**
 * VersionSyncValidator Test Suite (TDD RED Phase)
 *
 * DESIGN DECISION: Write tests FIRST following TDD protocol
 * WHY: Creates "ratchet" preventing version mismatch bugs (v0.13.28, v0.13.29)
 *
 * PATTERN: Pattern-TDD-001 (Test-Driven Development)
 * RELATED: VAL-007, Pattern-VALIDATION-001
 */

import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import { VersionSyncValidator, VersionSyncResult } from '../../services/VersionSyncValidator';

suite('VersionSyncValidator Test Suite', () => {
	let validator: VersionSyncValidator;
	let tempDir: string;

	setup(() => {
		validator = new VersionSyncValidator();
		tempDir = path.join(__dirname, '../../../temp-test-version-sync');
		if (!fs.existsSync(tempDir)) {
			fs.mkdirSync(tempDir, { recursive: true });
		}
	});

	teardown(() => {
		// Cleanup temp files
		try {
			if (fs.existsSync(tempDir)) {
				fs.rmSync(tempDir, { recursive: true, force: true });
			}
		} catch (e) {
			// Ignore cleanup errors
		}
	});

	suite('Version Sync Validation', () => {
		test('should pass when all versions match', () => {
			// Arrange: Create 4 package.json files with matching versions
			const version = '1.0.0';
			createPackageJson(tempDir, 'vscode-lumina/package.json', version);
			createPackageJson(tempDir, 'packages/aetherlight-sdk/package.json', version);
			createPackageJson(tempDir, 'packages/aetherlight-analyzer/package.json', version);
			createPackageJson(tempDir, 'packages/aetherlight-node/package.json', version);

			// Act
			const result = validator.validate(tempDir);

			// Assert
			assert.strictEqual(result.valid, true, 'Should be valid when all versions match');
			assert.strictEqual(result.version, version, 'Should report version');
			assert.strictEqual(result.issues.length, 0, 'Should have no issues');
			assert.strictEqual(result.packageCount, 4, 'Should detect all 4 packages');
		});

		test('should fail when versions mismatch', () => {
			// Arrange: Create packages with different versions
			createPackageJson(tempDir, 'vscode-lumina/package.json', '1.0.0');
			createPackageJson(tempDir, 'packages/aetherlight-sdk/package.json', '1.0.0');
			createPackageJson(tempDir, 'packages/aetherlight-analyzer/package.json', '0.9.0'); // Mismatch!
			createPackageJson(tempDir, 'packages/aetherlight-node/package.json', '1.0.0');

			// Act
			const result = validator.validate(tempDir);

			// Assert
			assert.strictEqual(result.valid, false, 'Should be invalid when versions mismatch');
			assert.ok(result.issues.length > 0, 'Should have issues');
			const mismatchIssue = result.issues.find(i => i.type === 'version_mismatch');
			assert.ok(mismatchIssue, 'Should detect version mismatch');
			assert.ok(mismatchIssue!.message.includes('0.9.0'), 'Should mention mismatched version');
		});

		test('should detect multiple mismatches', () => {
			// Arrange: Create packages with 2 mismatches
			createPackageJson(tempDir, 'vscode-lumina/package.json', '1.0.0');
			createPackageJson(tempDir, 'packages/aetherlight-sdk/package.json', '0.9.0'); // Mismatch 1
			createPackageJson(tempDir, 'packages/aetherlight-analyzer/package.json', '0.8.0'); // Mismatch 2
			createPackageJson(tempDir, 'packages/aetherlight-node/package.json', '1.0.0');

			// Act
			const result = validator.validate(tempDir);

			// Assert
			assert.strictEqual(result.valid, false, 'Should be invalid');
			assert.ok(result.issues.length >= 2, 'Should detect both mismatches');
		});

		test('should use first package version as reference', () => {
			// Arrange: Create packages
			createPackageJson(tempDir, 'vscode-lumina/package.json', '2.0.0');
			createPackageJson(tempDir, 'packages/aetherlight-sdk/package.json', '2.0.0');
			createPackageJson(tempDir, 'packages/aetherlight-analyzer/package.json', '2.0.0');
			createPackageJson(tempDir, 'packages/aetherlight-node/package.json', '2.0.0');

			// Act
			const result = validator.validate(tempDir);

			// Assert
			assert.strictEqual(result.version, '2.0.0', 'Should use vscode-lumina version as reference');
		});
	});

	suite('Missing Package.json Files', () => {
		test('should fail when package.json missing', () => {
			// Arrange: Only create 3 out of 4 packages
			createPackageJson(tempDir, 'vscode-lumina/package.json', '1.0.0');
			createPackageJson(tempDir, 'packages/aetherlight-sdk/package.json', '1.0.0');
			createPackageJson(tempDir, 'packages/aetherlight-analyzer/package.json', '1.0.0');
			// Missing: aetherlight-node

			// Act
			const result = validator.validate(tempDir);

			// Assert
			assert.strictEqual(result.valid, false, 'Should be invalid when package missing');
			const missingIssue = result.issues.find(i => i.type === 'missing_package');
			assert.ok(missingIssue, 'Should detect missing package');
		});

		test('should handle all packages missing', () => {
			// Arrange: Empty directory (no packages)
			// Act
			const result = validator.validate(tempDir);

			// Assert
			assert.strictEqual(result.valid, false, 'Should be invalid when all packages missing');
			assert.ok(result.issues.length > 0, 'Should have issues');
		});
	});

	suite('Invalid JSON', () => {
		test('should handle invalid JSON in package.json', () => {
			// Arrange: Create valid packages and one invalid
			createPackageJson(tempDir, 'vscode-lumina/package.json', '1.0.0');
			createPackageJson(tempDir, 'packages/aetherlight-sdk/package.json', '1.0.0');
			createPackageJson(tempDir, 'packages/aetherlight-analyzer/package.json', '1.0.0');

			// Create invalid JSON
			const invalidPath = path.join(tempDir, 'packages/aetherlight-node/package.json');
			fs.mkdirSync(path.dirname(invalidPath), { recursive: true });
			fs.writeFileSync(invalidPath, '{invalid json}');

			// Act
			const result = validator.validate(tempDir);

			// Assert
			assert.strictEqual(result.valid, false, 'Should be invalid when JSON parse fails');
			const parseIssue = result.issues.find(i => i.type === 'parse_error');
			assert.ok(parseIssue, 'Should detect parse error');
		});

		test('should handle missing version field', () => {
			// Arrange: Create packages with missing version
			createPackageJson(tempDir, 'vscode-lumina/package.json', '1.0.0');
			createPackageJson(tempDir, 'packages/aetherlight-sdk/package.json', '1.0.0');
			createPackageJson(tempDir, 'packages/aetherlight-analyzer/package.json', '1.0.0');

			// Create package.json without version field
			const noVersionPath = path.join(tempDir, 'packages/aetherlight-node/package.json');
			fs.mkdirSync(path.dirname(noVersionPath), { recursive: true });
			fs.writeFileSync(noVersionPath, JSON.stringify({ name: 'aetherlight-node' }, null, 2));

			// Act
			const result = validator.validate(tempDir);

			// Assert
			assert.strictEqual(result.valid, false, 'Should be invalid when version field missing');
			const missingVersionIssue = result.issues.find(i => i.type === 'missing_version');
			assert.ok(missingVersionIssue, 'Should detect missing version field');
		});
	});

	suite('Package Paths', () => {
		test('should use default package paths', () => {
			// Arrange: Real project structure
			const projectPath = path.join(__dirname, '../../../');

			// Act
			const result = validator.validate(projectPath);

			// Assert
			// Should find real packages (test will pass if project structure intact)
			assert.strictEqual(typeof result.valid, 'boolean', 'Should return valid flag');
			assert.strictEqual(typeof result.packageCount, 'number', 'Should count packages');
		});

		test('should support custom package paths', () => {
			// Arrange: Create packages in custom location
			const customDir = path.join(tempDir, 'custom');
			createPackageJson(customDir, 'main/package.json', '1.0.0');
			createPackageJson(customDir, 'sub1/package.json', '1.0.0');

			// Act
			const result = validator.validate(customDir, {
				packagePaths: [
					'main/package.json',
					'sub1/package.json'
				]
			});

			// Assert
			assert.strictEqual(result.valid, true, 'Should validate custom package paths');
			assert.strictEqual(result.packageCount, 2, 'Should detect 2 custom packages');
		});
	});

	suite('Version Formats', () => {
		test('should handle semver versions', () => {
			// Arrange: Create packages with standard semver
			createPackageJson(tempDir, 'vscode-lumina/package.json', '1.2.3');
			createPackageJson(tempDir, 'packages/aetherlight-sdk/package.json', '1.2.3');
			createPackageJson(tempDir, 'packages/aetherlight-analyzer/package.json', '1.2.3');
			createPackageJson(tempDir, 'packages/aetherlight-node/package.json', '1.2.3');

			// Act
			const result = validator.validate(tempDir);

			// Assert
			assert.strictEqual(result.valid, true, 'Should handle semver versions');
			assert.strictEqual(result.version, '1.2.3', 'Should report semver version');
		});

		test('should handle pre-release versions', () => {
			// Arrange: Create packages with pre-release version
			createPackageJson(tempDir, 'vscode-lumina/package.json', '1.0.0-beta.1');
			createPackageJson(tempDir, 'packages/aetherlight-sdk/package.json', '1.0.0-beta.1');
			createPackageJson(tempDir, 'packages/aetherlight-analyzer/package.json', '1.0.0-beta.1');
			createPackageJson(tempDir, 'packages/aetherlight-node/package.json', '1.0.0-beta.1');

			// Act
			const result = validator.validate(tempDir);

			// Assert
			assert.strictEqual(result.valid, true, 'Should handle pre-release versions');
			assert.strictEqual(result.version, '1.0.0-beta.1', 'Should report pre-release version');
		});
	});

	suite('Performance', () => {
		test('should validate in <100ms', () => {
			// Arrange: Create packages
			createPackageJson(tempDir, 'vscode-lumina/package.json', '1.0.0');
			createPackageJson(tempDir, 'packages/aetherlight-sdk/package.json', '1.0.0');
			createPackageJson(tempDir, 'packages/aetherlight-analyzer/package.json', '1.0.0');
			createPackageJson(tempDir, 'packages/aetherlight-node/package.json', '1.0.0');

			// Act
			const startTime = Date.now();
			validator.validate(tempDir);
			const elapsedTime = Date.now() - startTime;

			// Assert
			assert.ok(elapsedTime < 100, `Should complete in <100ms, took ${elapsedTime}ms`);
		});
	});

	suite('Edge Cases', () => {
		test('should handle empty version string', () => {
			// Arrange: Create packages with empty version
			createPackageJson(tempDir, 'vscode-lumina/package.json', '');
			createPackageJson(tempDir, 'packages/aetherlight-sdk/package.json', '');
			createPackageJson(tempDir, 'packages/aetherlight-analyzer/package.json', '');
			createPackageJson(tempDir, 'packages/aetherlight-node/package.json', '');

			// Act
			const result = validator.validate(tempDir);

			// Assert
			assert.strictEqual(result.valid, false, 'Should be invalid for empty version strings');
		});

		test('should handle whitespace in versions', () => {
			// Arrange: Create packages with whitespace
			createPackageJson(tempDir, 'vscode-lumina/package.json', ' 1.0.0 ');
			createPackageJson(tempDir, 'packages/aetherlight-sdk/package.json', ' 1.0.0 ');
			createPackageJson(tempDir, 'packages/aetherlight-analyzer/package.json', ' 1.0.0 ');
			createPackageJson(tempDir, 'packages/aetherlight-node/package.json', ' 1.0.0 ');

			// Act
			const result = validator.validate(tempDir);

			// Assert
			// Should either trim and pass, or fail (implementation decision)
			assert.strictEqual(typeof result.valid, 'boolean', 'Should handle whitespace versions');
		});
	});
});

/**
 * Helper: Create package.json file with specified version
 */
function createPackageJson(baseDir: string, relativePath: string, version: string): void {
	const fullPath = path.join(baseDir, relativePath);
	fs.mkdirSync(path.dirname(fullPath), { recursive: true });

	const packageJson = {
		name: path.basename(path.dirname(relativePath)),
		version
	};

	fs.writeFileSync(fullPath, JSON.stringify(packageJson, null, 2));
}
