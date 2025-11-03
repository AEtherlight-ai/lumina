/**
 * TypeScriptValidator Test Suite (TDD RED Phase)
 *
 * DESIGN DECISION: Write tests FIRST following TDD protocol
 * WHY: Creates "ratchet" preventing TypeScript errors in production
 *
 * PATTERN: Pattern-TDD-001 (Test-Driven Development)
 * RELATED: VAL-004, Pattern-VALIDATION-001
 */

import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import { TypeScriptValidator } from '../../services/TypeScriptValidator';

suite('TypeScriptValidator Test Suite', () => {
	let validator: TypeScriptValidator;
	let tempDir: string;

	setup(() => {
		validator = new TypeScriptValidator();
		tempDir = path.join(__dirname, '../../../temp-test-ts');
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

	suite('TypeScript Compilation Validation', () => {
		test('should pass for project with zero TypeScript errors', () => {
			// Arrange: Create simple valid TypeScript project
			const tsConfigPath = path.join(tempDir, 'tsconfig.json');
			const tsConfig = {
				compilerOptions: {
					target: 'ES2020',
					module: 'commonjs',
					strict: true,
					noEmit: true
				},
				include: ['src/**/*']
			};
			fs.writeFileSync(tsConfigPath, JSON.stringify(tsConfig, null, 2));

			const srcDir = path.join(tempDir, 'src');
			fs.mkdirSync(srcDir, { recursive: true });

			const validTsFile = path.join(srcDir, 'valid.ts');
			fs.writeFileSync(validTsFile, `
				function add(a: number, b: number): number {
					return a + b;
				}
				const result = add(1, 2);
			`);

			// Act
			const result = validator.validate(tempDir);

			// Assert
			assert.strictEqual(result.valid, true, 'Should be valid');
			assert.strictEqual(result.issues.length, 0, 'Should have no issues');
			assert.strictEqual(result.errorCount, 0, 'Should have 0 errors');
		});

		test('should fail for project with TypeScript type errors', () => {
			// Arrange: Create TypeScript project with type error
			const tsConfigPath = path.join(tempDir, 'tsconfig.json');
			const tsConfig = {
				compilerOptions: {
					target: 'ES2020',
					module: 'commonjs',
					strict: true,
					noEmit: true
				},
				include: ['src/**/*']
			};
			fs.writeFileSync(tsConfigPath, JSON.stringify(tsConfig, null, 2));

			const srcDir = path.join(tempDir, 'src');
			fs.mkdirSync(srcDir, { recursive: true });

			const invalidTsFile = path.join(srcDir, 'invalid.ts');
			fs.writeFileSync(invalidTsFile, `
				function add(a: number, b: number): number {
					return a + b;
				}
				const result = add('string', 2); // Type error: string instead of number
			`);

			// Act
			const result = validator.validate(tempDir);

			// Assert
			assert.strictEqual(result.valid, false, 'Should be invalid');
			assert.ok(result.issues.length > 0, 'Should have issues');
			assert.ok(result.errorCount > 0, 'Should have errors');
			assert.ok(result.issues[0].message.includes('Type'), 'Should mention type error');
		});

		test('should report error count correctly', () => {
			// Arrange: Create project with multiple type errors
			const tsConfigPath = path.join(tempDir, 'tsconfig.json');
			const tsConfig = {
				compilerOptions: {
					target: 'ES2020',
					module: 'commonjs',
					strict: true,
					noEmit: true
				},
				include: ['src/**/*']
			};
			fs.writeFileSync(tsConfigPath, JSON.stringify(tsConfig, null, 2));

			const srcDir = path.join(tempDir, 'src');
			fs.mkdirSync(srcDir, { recursive: true });

			const multiErrorFile = path.join(srcDir, 'errors.ts');
			fs.writeFileSync(multiErrorFile, `
				const x: number = 'string'; // Error 1
				const y: string = 123; // Error 2
				function test(a: boolean): void {
					return 'invalid'; // Error 3
				}
			`);

			// Act
			const result = validator.validate(tempDir);

			// Assert
			assert.strictEqual(result.valid, false, 'Should be invalid');
			assert.ok(result.errorCount >= 3, `Should have at least 3 errors, got ${result.errorCount}`);
		});
	});

	suite('Missing/Invalid Configuration', () => {
		test('should handle missing tsconfig.json', () => {
			// Arrange: Empty directory (no tsconfig.json)

			// Act
			const result = validator.validate(tempDir);

			// Assert
			assert.strictEqual(result.valid, false, 'Should be invalid');
			assert.ok(result.issues.length > 0, 'Should have issues');
			const issue = result.issues.find(i => i.type === 'missing_config');
			assert.ok(issue, 'Should detect missing tsconfig.json');
		});

		test('should handle invalid tsconfig.json', () => {
			// Arrange: Create invalid tsconfig.json
			const tsConfigPath = path.join(tempDir, 'tsconfig.json');
			fs.writeFileSync(tsConfigPath, '{invalid json}');

			// Act
			const result = validator.validate(tempDir);

			// Assert
			assert.strictEqual(result.valid, false, 'Should be invalid');
			assert.ok(result.issues.length > 0, 'Should have issues');
		});

		test('should handle missing tsc command', () => {
			// Arrange: Valid tsconfig but tsc not in PATH (simulated)
			const tsConfigPath = path.join(tempDir, 'tsconfig.json');
			const tsConfig = { compilerOptions: { noEmit: true } };
			fs.writeFileSync(tsConfigPath, JSON.stringify(tsConfig));

			// Note: This test may pass if tsc IS available
			// The validator should gracefully handle when tsc is missing

			// Act
			const result = validator.validate(tempDir);

			// Assert: Either valid (tsc available) or error (tsc missing)
			assert.ok(result, 'Should return result');
			if (!result.valid && result.issues.length > 0) {
				const issue = result.issues.find(i => i.type === 'command_error');
				// If command_error exists, it should mention tsc
				if (issue) {
					assert.ok(issue.message.toLowerCase().includes('tsc'), 'Should mention tsc command');
				}
			}
		});
	});

	suite('Performance', () => {
		test('should validate in <5s', () => {
			// Arrange: Simple valid project
			const tsConfigPath = path.join(tempDir, 'tsconfig.json');
			const tsConfig = {
				compilerOptions: {
					target: 'ES2020',
					module: 'commonjs',
					noEmit: true
				},
				include: ['src/**/*']
			};
			fs.writeFileSync(tsConfigPath, JSON.stringify(tsConfig, null, 2));

			const srcDir = path.join(tempDir, 'src');
			fs.mkdirSync(srcDir, { recursive: true });

			const tsFile = path.join(srcDir, 'test.ts');
			fs.writeFileSync(tsFile, 'const x: number = 1;');

			// Act
			const startTime = Date.now();
			validator.validate(tempDir);
			const elapsedTime = Date.now() - startTime;

			// Assert
			assert.ok(elapsedTime < 5000, `Should complete in <5s, took ${elapsedTime}ms`);
		});
	});

	suite('Error Output Parsing', () => {
		test('should parse tsc error output correctly', () => {
			// Arrange: Project with type error
			const tsConfigPath = path.join(tempDir, 'tsconfig.json');
			const tsConfig = {
				compilerOptions: {
					target: 'ES2020',
					module: 'commonjs',
					strict: true,
					noEmit: true
				},
				include: ['src/**/*']
			};
			fs.writeFileSync(tsConfigPath, JSON.stringify(tsConfig, null, 2));

			const srcDir = path.join(tempDir, 'src');
			fs.mkdirSync(srcDir, { recursive: true });

			const tsFile = path.join(srcDir, 'error.ts');
			fs.writeFileSync(tsFile, 'const x: number = "string";');

			// Act
			const result = validator.validate(tempDir);

			// Assert
			assert.strictEqual(result.valid, false, 'Should be invalid');
			if (result.issues.length > 0) {
				const issue = result.issues[0];
				// Should have file path and line/column info
				assert.ok(issue.file, 'Should have file path');
				assert.ok(issue.line !== undefined, 'Should have line number');
				assert.ok(issue.message, 'Should have error message');
			}
		});

		test('should extract file paths from errors', () => {
			// Arrange: Project with error
			const tsConfigPath = path.join(tempDir, 'tsconfig.json');
			const tsConfig = {
				compilerOptions: {
					noEmit: true
				},
				include: ['src/**/*']
			};
			fs.writeFileSync(tsConfigPath, JSON.stringify(tsConfig, null, 2));

			const srcDir = path.join(tempDir, 'src');
			fs.mkdirSync(srcDir, { recursive: true });

			const tsFile = path.join(srcDir, 'test.ts');
			fs.writeFileSync(tsFile, 'const x: number = "invalid";');

			// Act
			const result = validator.validate(tempDir);

			// Assert
			if (!result.valid && result.issues.length > 0) {
				const hasFileInfo = result.issues.some(i => i.file && i.file.length > 0);
				assert.ok(hasFileInfo, 'Should extract file paths from errors');
			}
		});
	});

	suite('Edge Cases', () => {
		test('should handle empty project (no source files)', () => {
			// Arrange: Valid tsconfig but no source files
			const tsConfigPath = path.join(tempDir, 'tsconfig.json');
			const tsConfig = {
				compilerOptions: {
					noEmit: true
				},
				include: ['src/**/*']
			};
			fs.writeFileSync(tsConfigPath, JSON.stringify(tsConfig, null, 2));

			const srcDir = path.join(tempDir, 'src');
			fs.mkdirSync(srcDir, { recursive: true });
			// No files created

			// Act
			const result = validator.validate(tempDir);

			// Assert: Empty project should be valid (no errors)
			assert.strictEqual(result.valid, true, 'Empty project should be valid');
			assert.strictEqual(result.errorCount, 0, 'Should have 0 errors');
		});

		test('should handle invalid project path', () => {
			// Arrange
			const invalidPath = path.join(tempDir, 'nonexistent-directory');

			// Act
			const result = validator.validate(invalidPath);

			// Assert
			assert.strictEqual(result.valid, false, 'Should be invalid');
			assert.ok(result.issues.length > 0, 'Should have issues');
			const issue = result.issues.find(i => i.type === 'file_error' || i.type === 'missing_config');
			assert.ok(issue, 'Should detect invalid path or missing config');
		});
	});
});
