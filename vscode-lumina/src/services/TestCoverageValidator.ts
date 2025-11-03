/**
 * TestCoverageValidator - Validates test coverage thresholds
 *
 * DESIGN DECISION: Enforce minimum test coverage to prevent regressions
 * WHY: Tests create a "ratchet" - once coverage increases, it shouldn't decrease
 *
 * REASONING CHAIN:
 * 1. Tests prevent bugs by catching regressions early
 * 2. Without enforcement, coverage can gradually decline
 * 3. Declining coverage = higher risk of bugs slipping through
 * 4. Must enforce minimum thresholds BEFORE committing/publishing
 * 5. Result: Coverage ratchets up over time, never down
 *
 * PATTERN: Pattern-VALIDATION-001 (Comprehensive System Validation)
 * PATTERN: Pattern-TDD-001 (Test-Driven Development Ratchet)
 * RELATED: VAL-005
 *
 * PERFORMANCE REQUIREMENT: <3s validation time
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Validation result
 */
export interface ValidationResult {
	valid: boolean;
	coveragePercent: number;
	issues: CoverageIssue[];
	metrics?: CoverageMetrics;
	uncoveredFiles?: UncoveredFile[];
}

/**
 * Coverage issue detected
 */
export interface CoverageIssue {
	type: 'low_coverage' | 'missing_coverage' | 'parse_error' | 'invalid_format';
	message: string;
	suggestion?: string;
}

/**
 * Coverage metrics by category
 */
export interface CoverageMetrics {
	lines: number;
	statements: number;
	functions: number;
	branches: number;
}

/**
 * Uncovered file information
 */
export interface UncoveredFile {
	file: string;
	coverage: number;
}

/**
 * Validation options
 */
export interface ValidationOptions {
	minimumCoverage?: number;  // Default: 80%
	coverageDir?: string;       // Default: coverage/
}

/**
 * Coverage report structure (nyc/istanbul format)
 */
interface CoverageReport {
	total?: {
		lines?: { total?: number; covered?: number; pct?: number };
		statements?: { total?: number; covered?: number; pct?: number };
		functions?: { total?: number; covered?: number; pct?: number };
		branches?: { total?: number; covered?: number; pct?: number };
	};
	[key: string]: any; // Per-file coverage
}

/**
 * TestCoverageValidator
 *
 * DESIGN DECISION: Read nyc/istanbul coverage-summary.json format
 * WHY: Standard format used by most JavaScript/TypeScript projects
 */
export class TestCoverageValidator {
	/**
	 * Default minimum coverage threshold
	 */
	private readonly DEFAULT_MINIMUM_COVERAGE = 80;

	/**
	 * Validate test coverage
	 *
	 * DESIGN DECISION: Read coverage-summary.json from coverage directory
	 * WHY: Standard location for nyc/istanbul coverage reports
	 *
	 * @param projectPath - Absolute path to project directory
	 * @param options - Validation options (minimum coverage, coverage dir)
	 * @returns ValidationResult with coverage information
	 */
	validate(projectPath: string, options: ValidationOptions = {}): ValidationResult {
		const startTime = Date.now();
		const minimumCoverage = options.minimumCoverage ?? this.DEFAULT_MINIMUM_COVERAGE;
		const coverageDir = options.coverageDir ?? 'coverage';

		try {
			// Locate coverage report
			const coverageReportPath = path.join(projectPath, coverageDir, 'coverage-summary.json');

			// Check if coverage report exists
			if (!fs.existsSync(coverageReportPath)) {
				return {
					valid: false,
					coveragePercent: 0,
					issues: [{
						type: 'missing_coverage',
						message: `Coverage report not found: ${coverageReportPath}`,
						suggestion: 'Run tests with coverage: npm run test:coverage'
					}]
				};
			}

			// Read coverage report
			const reportContent = fs.readFileSync(coverageReportPath, 'utf8');

			// Parse JSON
			let report: CoverageReport;
			try {
				report = JSON.parse(reportContent);
			} catch (parseError: any) {
				return {
					valid: false,
					coveragePercent: 0,
					issues: [{
						type: 'parse_error',
						message: `Invalid JSON in coverage report: ${parseError.message}`,
						suggestion: 'Re-run tests with coverage to regenerate report'
					}]
				};
			}

			// Validate report structure
			if (!report.total) {
				return {
					valid: false,
					coveragePercent: 0,
					issues: [{
						type: 'invalid_format',
						message: 'Coverage report missing "total" field',
						suggestion: 'Ensure coverage report is in nyc/istanbul format'
					}]
				};
			}

			// Extract coverage metrics
			const metrics: CoverageMetrics = {
				lines: report.total.lines?.pct ?? 0,
				statements: report.total.statements?.pct ?? 0,
				functions: report.total.functions?.pct ?? 0,
				branches: report.total.branches?.pct ?? 0
			};

			// Use line coverage as primary metric
			const coveragePercent = metrics.lines;

			// Extract uncovered files (files with coverage < threshold)
			const uncoveredFiles = this.extractUncoveredFiles(report, minimumCoverage);

			// Validate against threshold
			if (coveragePercent < minimumCoverage) {
				const gap = minimumCoverage - coveragePercent;

				return {
					valid: false,
					coveragePercent,
					metrics,
					uncoveredFiles,
					issues: [{
						type: 'low_coverage',
						message: `Test coverage ${coveragePercent.toFixed(1)}% is below minimum ${minimumCoverage}% (gap: ${gap.toFixed(1)}%)`,
						suggestion: uncoveredFiles.length > 0
							? `Add tests for ${uncoveredFiles.length} file(s) with low coverage`
							: 'Add more test cases to increase coverage'
					}]
				};
			}

			// Performance check
			const elapsedTime = Date.now() - startTime;
			if (elapsedTime > 3000) {
				console.warn(`[TestCoverageValidator] Validation took ${elapsedTime}ms (target: <3000ms)`);
			}

			// Coverage meets threshold
			return {
				valid: true,
				coveragePercent,
				metrics,
				issues: []
			};

		} catch (error: any) {
			return {
				valid: false,
				coveragePercent: 0,
				issues: [{
					type: 'parse_error',
					message: `Error validating coverage: ${error.message}`,
					suggestion: 'Check coverage report path and format'
				}]
			};
		}
	}

	/**
	 * Extract files with coverage below threshold
	 *
	 * DESIGN DECISION: Identify specific files needing more tests
	 * WHY: Helps developers know exactly where to add tests
	 */
	private extractUncoveredFiles(report: CoverageReport, minimumCoverage: number): UncoveredFile[] {
		const uncoveredFiles: UncoveredFile[] = [];

		// Iterate through all keys except 'total'
		for (const key in report) {
			if (key === 'total') {
				continue;
			}

			const fileData = report[key];
			if (fileData && fileData.lines && typeof fileData.lines.pct === 'number') {
				const fileCoverage = fileData.lines.pct;

				if (fileCoverage < minimumCoverage) {
					uncoveredFiles.push({
						file: key,
						coverage: fileCoverage
					});
				}
			}
		}

		// Sort by coverage (lowest first)
		uncoveredFiles.sort((a, b) => a.coverage - b.coverage);

		return uncoveredFiles;
	}
}
