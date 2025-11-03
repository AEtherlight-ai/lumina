/**
 * TestCoverageValidator Test Suite (TDD RED Phase)
 *
 * DESIGN DECISION: Write tests FIRST following TDD protocol
 * WHY: Creates "ratchet" enforcing test coverage requirements
 *
 * PATTERN: Pattern-TDD-001 (Test-Driven Development)
 * RELATED: VAL-005, Pattern-VALIDATION-001
 */

import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import { TestCoverageValidator } from '../../services/TestCoverageValidator';

suite('TestCoverageValidator Test Suite', () => {
	let validator: TestCoverageValidator;
	let tempDir: string;

	setup(() => {
		validator = new TestCoverageValidator();
		tempDir = path.join(__dirname, '../../../temp-test-coverage');
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

	suite('Coverage Validation', () => {
		test('should pass for coverage ≥80%', () => {
			// Arrange: Create coverage report with 85% coverage
			const coverageDir = path.join(tempDir, 'coverage');
			fs.mkdirSync(coverageDir, { recursive: true });

			const coverageReport = {
				total: {
					lines: { total: 100, covered: 85, skipped: 0, pct: 85 },
					statements: { total: 100, covered: 85, skipped: 0, pct: 85 },
					functions: { total: 20, covered: 17, skipped: 0, pct: 85 },
					branches: { total: 40, covered: 34, skipped: 0, pct: 85 }
				}
			};

			fs.writeFileSync(
				path.join(coverageDir, 'coverage-summary.json'),
				JSON.stringify(coverageReport, null, 2)
			);

			// Act
			const result = validator.validate(tempDir);

			// Assert
			assert.strictEqual(result.valid, true, 'Should be valid');
			assert.strictEqual(result.issues.length, 0, 'Should have no issues');
			assert.strictEqual(result.coveragePercent, 85, 'Should report 85% coverage');
		});

		test('should fail for coverage <80%', () => {
			// Arrange: Create coverage report with 75% coverage
			const coverageDir = path.join(tempDir, 'coverage');
			fs.mkdirSync(coverageDir, { recursive: true });

			const coverageReport = {
				total: {
					lines: { total: 100, covered: 75, skipped: 0, pct: 75 },
					statements: { total: 100, covered: 75, skipped: 0, pct: 75 },
					functions: { total: 20, covered: 15, skipped: 0, pct: 75 },
					branches: { total: 40, covered: 30, skipped: 0, pct: 75 }
				}
			};

			fs.writeFileSync(
				path.join(coverageDir, 'coverage-summary.json'),
				JSON.stringify(coverageReport, null, 2)
			);

			// Act
			const result = validator.validate(tempDir);

			// Assert
			assert.strictEqual(result.valid, false, 'Should be invalid');
			assert.ok(result.issues.length > 0, 'Should have issues');
			assert.strictEqual(result.coveragePercent, 75, 'Should report 75% coverage');
			const issue = result.issues[0];
			assert.ok(issue.message.includes('75'), 'Should mention coverage percentage');
			assert.ok(issue.message.includes('80'), 'Should mention minimum threshold');
		});

		test('should use custom minimum coverage threshold', () => {
			// Arrange: Create coverage report with 88% coverage
			const coverageDir = path.join(tempDir, 'coverage');
			fs.mkdirSync(coverageDir, { recursive: true });

			const coverageReport = {
				total: {
					lines: { total: 100, covered: 88, skipped: 0, pct: 88 }
				}
			};

			fs.writeFileSync(
				path.join(coverageDir, 'coverage-summary.json'),
				JSON.stringify(coverageReport, null, 2)
			);

			// Act: Validate with 90% minimum
			const result = validator.validate(tempDir, { minimumCoverage: 90 });

			// Assert
			assert.strictEqual(result.valid, false, 'Should be invalid (88% < 90%)');
			assert.ok(result.issues[0].message.includes('90'), 'Should mention 90% threshold');
		});

		test('should pass for coverage exactly at threshold', () => {
			// Arrange: Create coverage report with exactly 80% coverage
			const coverageDir = path.join(tempDir, 'coverage');
			fs.mkdirSync(coverageDir, { recursive: true });

			const coverageReport = {
				total: {
					lines: { total: 100, covered: 80, skipped: 0, pct: 80 }
				}
			};

			fs.writeFileSync(
				path.join(coverageDir, 'coverage-summary.json'),
				JSON.stringify(coverageReport, null, 2)
			);

			// Act
			const result = validator.validate(tempDir);

			// Assert
			assert.strictEqual(result.valid, true, 'Should be valid (80% >= 80%)');
			assert.strictEqual(result.coveragePercent, 80, 'Should report 80% coverage');
		});
	});

	suite('Missing/Invalid Coverage Report', () => {
		test('should handle missing coverage report', () => {
			// Arrange: No coverage directory

			// Act
			const result = validator.validate(tempDir);

			// Assert
			assert.strictEqual(result.valid, false, 'Should be invalid');
			assert.ok(result.issues.length > 0, 'Should have issues');
			const issue = result.issues.find(i => i.type === 'missing_coverage');
			assert.ok(issue, 'Should detect missing coverage report');
			assert.ok(issue!.message.includes('not found'), 'Should mention file not found');
		});

		test('should handle invalid JSON in coverage report', () => {
			// Arrange: Create invalid coverage report
			const coverageDir = path.join(tempDir, 'coverage');
			fs.mkdirSync(coverageDir, { recursive: true });

			fs.writeFileSync(
				path.join(coverageDir, 'coverage-summary.json'),
				'{invalid json}'
			);

			// Act
			const result = validator.validate(tempDir);

			// Assert
			assert.strictEqual(result.valid, false, 'Should be invalid');
			const issue = result.issues.find(i => i.type === 'parse_error');
			assert.ok(issue, 'Should detect parse error');
		});

		test('should handle missing total field in coverage report', () => {
			// Arrange: Create coverage report without total field
			const coverageDir = path.join(tempDir, 'coverage');
			fs.mkdirSync(coverageDir, { recursive: true });

			const coverageReport = {
				'src/file1.ts': {
					lines: { pct: 90 }
				}
			};

			fs.writeFileSync(
				path.join(coverageDir, 'coverage-summary.json'),
				JSON.stringify(coverageReport, null, 2)
			);

			// Act
			const result = validator.validate(tempDir);

			// Assert
			assert.strictEqual(result.valid, false, 'Should be invalid');
			const issue = result.issues.find(i => i.type === 'invalid_format');
			assert.ok(issue, 'Should detect invalid format');
		});
	});

	suite('Coverage Metrics', () => {
		test('should report all coverage metrics', () => {
			// Arrange: Create coverage report with all metrics
			const coverageDir = path.join(tempDir, 'coverage');
			fs.mkdirSync(coverageDir, { recursive: true });

			const coverageReport = {
				total: {
					lines: { total: 100, covered: 90, pct: 90 },
					statements: { total: 120, covered: 108, pct: 90 },
					functions: { total: 20, covered: 18, pct: 90 },
					branches: { total: 40, covered: 36, pct: 90 }
				}
			};

			fs.writeFileSync(
				path.join(coverageDir, 'coverage-summary.json'),
				JSON.stringify(coverageReport, null, 2)
			);

			// Act
			const result = validator.validate(tempDir);

			// Assert
			assert.ok(result.metrics, 'Should have metrics');
			assert.strictEqual(result.metrics?.lines, 90, 'Should report lines coverage');
			assert.strictEqual(result.metrics?.statements, 90, 'Should report statements coverage');
			assert.strictEqual(result.metrics?.functions, 90, 'Should report functions coverage');
			assert.strictEqual(result.metrics?.branches, 90, 'Should report branches coverage');
		});

		test('should use line coverage as primary metric', () => {
			// Arrange: Different coverage for different metrics
			const coverageDir = path.join(tempDir, 'coverage');
			fs.mkdirSync(coverageDir, { recursive: true });

			const coverageReport = {
				total: {
					lines: { pct: 85 },
					statements: { pct: 90 },
					functions: { pct: 80 },
					branches: { pct: 75 }
				}
			};

			fs.writeFileSync(
				path.join(coverageDir, 'coverage-summary.json'),
				JSON.stringify(coverageReport, null, 2)
			);

			// Act
			const result = validator.validate(tempDir);

			// Assert
			assert.strictEqual(result.coveragePercent, 85, 'Should use line coverage as primary');
		});
	});

	suite('Uncovered Files Detection', () => {
		test('should list uncovered files when coverage < threshold', () => {
			// Arrange: Coverage report with per-file details
			const coverageDir = path.join(tempDir, 'coverage');
			fs.mkdirSync(coverageDir, { recursive: true });

			const coverageReport = {
				total: {
					lines: { pct: 75 }
				},
				'src/file1.ts': {
					lines: { pct: 90 }
				},
				'src/file2.ts': {
					lines: { pct: 50 }
				},
				'src/file3.ts': {
					lines: { pct: 30 }
				}
			};

			fs.writeFileSync(
				path.join(coverageDir, 'coverage-summary.json'),
				JSON.stringify(coverageReport, null, 2)
			);

			// Act
			const result = validator.validate(tempDir);

			// Assert
			assert.strictEqual(result.valid, false, 'Should be invalid');
			assert.ok(result.uncoveredFiles, 'Should have uncoveredFiles list');
			assert.ok(result.uncoveredFiles!.length > 0, 'Should list uncovered files');
		});
	});

	suite('Performance', () => {
		test('should validate in <3s', () => {
			// Arrange: Simple coverage report
			const coverageDir = path.join(tempDir, 'coverage');
			fs.mkdirSync(coverageDir, { recursive: true });

			const coverageReport = {
				total: {
					lines: { pct: 85 }
				}
			};

			fs.writeFileSync(
				path.join(coverageDir, 'coverage-summary.json'),
				JSON.stringify(coverageReport, null, 2)
			);

			// Act
			const startTime = Date.now();
			validator.validate(tempDir);
			const elapsedTime = Date.now() - startTime;

			// Assert
			assert.ok(elapsedTime < 3000, `Should complete in <3s, took ${elapsedTime}ms`);
		});
	});

	suite('Edge Cases', () => {
		test('should handle 0% coverage', () => {
			// Arrange: Coverage report with 0% coverage
			const coverageDir = path.join(tempDir, 'coverage');
			fs.mkdirSync(coverageDir, { recursive: true });

			const coverageReport = {
				total: {
					lines: { total: 100, covered: 0, pct: 0 }
				}
			};

			fs.writeFileSync(
				path.join(coverageDir, 'coverage-summary.json'),
				JSON.stringify(coverageReport, null, 2)
			);

			// Act
			const result = validator.validate(tempDir);

			// Assert
			assert.strictEqual(result.valid, false, 'Should be invalid');
			assert.strictEqual(result.coveragePercent, 0, 'Should report 0% coverage');
		});

		test('should handle 100% coverage', () => {
			// Arrange: Coverage report with 100% coverage
			const coverageDir = path.join(tempDir, 'coverage');
			fs.mkdirSync(coverageDir, { recursive: true });

			const coverageReport = {
				total: {
					lines: { total: 100, covered: 100, pct: 100 }
				}
			};

			fs.writeFileSync(
				path.join(coverageDir, 'coverage-summary.json'),
				JSON.stringify(coverageReport, null, 2)
			);

			// Act
			const result = validator.validate(tempDir);

			// Assert
			assert.strictEqual(result.valid, true, 'Should be valid');
			assert.strictEqual(result.coveragePercent, 100, 'Should report 100% coverage');
		});
	});
});
