/**
 * TestContextGatherer - Find existing tests, identify gaps, calculate coverage
 *
 * DESIGN DECISION: Scan workspace for test files and execution results
 * WHY: Need to validate tests exist, pass, and have adequate coverage
 *
 * REASONING CHAIN:
 * 1. Task says "tests required" but are they actually there?
 * 2. Tests exist but do they pass? (run npm test)
 * 3. Tests pass but do they cover the code? (parse coverage reports)
 * 4. Scan workspace → find test files → validate execution → calculate coverage
 * 5. Result: Comprehensive test status for each task
 *
 * PATTERN: Pattern-TDD-001 (Test-Driven Development Ratchet)
 * RELATED: MID-012 (TDD Enforcement), TestValidator
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface TestContext {
    taskId: string;
    testFilesExpected: string[];
    testFilesFound: string[];
    testFilesMissing: string[];
    testsPassing: boolean;
    testOutput?: string;
    coverage?: CoverageInfo;
    status: 'none' | 'partial' | 'complete';
}

export interface CoverageInfo {
    statements: number; // 0.0-1.0
    branches: number;   // 0.0-1.0
    functions: number;  // 0.0-1.0
    lines: number;      // 0.0-1.0
    overall: number;    // 0.0-1.0 (average)
}

export class TestContextGatherer {
    private workspaceRoot: string;

    constructor(workspaceRoot?: string) {
        this.workspaceRoot = workspaceRoot || vscode.workspace.workspaceFolders?.[0].uri.fsPath || process.cwd();
    }

    /**
     * Gather complete test context for a task
     */
    async gather(taskId: string, expectedTestFiles: string[]): Promise<TestContext> {
        const testFilesFound = await this.findExistingTests(expectedTestFiles);
        const testFilesMissing = expectedTestFiles.filter(f => !testFilesFound.includes(f));

        // Determine status
        let status: 'none' | 'partial' | 'complete' = 'none';
        if (testFilesFound.length === 0) {
            status = 'none';
        } else if (testFilesFound.length < expectedTestFiles.length) {
            status = 'partial';
        } else {
            status = 'complete';
        }

        // Try to get test execution results
        let testsPassing = false;
        let testOutput: string | undefined;
        let coverage: CoverageInfo | undefined;

        if (testFilesFound.length > 0) {
            try {
                const result = await this.runTests(testFilesFound);
                testsPassing = result.passing;
                testOutput = result.output;
                coverage = await this.getCoverage();
            } catch (error) {
                testsPassing = false;
                testOutput = error instanceof Error ? error.message : String(error);
            }
        }

        return {
            taskId,
            testFilesExpected: expectedTestFiles,
            testFilesFound,
            testFilesMissing,
            testsPassing,
            testOutput,
            coverage,
            status
        };
    }

    /**
     * Find existing test files in workspace
     */
    private async findExistingTests(expectedFiles: string[]): Promise<string[]> {
        const found: string[] = [];

        for (const testFile of expectedFiles) {
            const fullPath = path.join(this.workspaceRoot, testFile);
            if (fs.existsSync(fullPath)) {
                found.push(testFile);
            }
        }

        return found;
    }

    /**
     * Run tests and return results
     */
    private async runTests(testFiles: string[]): Promise<{ passing: boolean; output: string }> {
        try {
            // Run npm test in the appropriate directory
            const testDir = testFiles[0].includes('vscode-lumina') ? 'vscode-lumina' : '.';
            const cwd = path.join(this.workspaceRoot, testDir);

            // Run tests with timeout
            const { stdout, stderr } = await execAsync('npm test', {
                cwd,
                timeout: 120000, // 2 minute timeout
                maxBuffer: 10 * 1024 * 1024 // 10MB buffer
            });

            const output = stdout + stderr;
            const passing = !output.includes('FAIL') && !output.includes('failed') && output.includes('passing');

            return { passing, output };
        } catch (error) {
            // npm test exits with non-zero code if tests fail
            const output = error instanceof Error && 'stdout' in error
                ? (error as any).stdout + (error as any).stderr
                : String(error);

            return { passing: false, output };
        }
    }

    /**
     * Get test coverage from coverage reports
     */
    private async getCoverage(): Promise<CoverageInfo | undefined> {
        try {
            // Look for coverage report (Istanbul/NYC format)
            const coveragePath = path.join(this.workspaceRoot, 'vscode-lumina', 'coverage', 'coverage-summary.json');

            if (!fs.existsSync(coveragePath)) {
                return undefined;
            }

            const coverageData = JSON.parse(fs.readFileSync(coveragePath, 'utf-8'));
            const total = coverageData.total;

            if (!total) {
                return undefined;
            }

            return {
                statements: total.statements?.pct / 100 || 0,
                branches: total.branches?.pct / 100 || 0,
                functions: total.functions?.pct / 100 || 0,
                lines: total.lines?.pct / 100 || 0,
                overall: (
                    (total.statements?.pct || 0) +
                    (total.branches?.pct || 0) +
                    (total.functions?.pct || 0) +
                    (total.lines?.pct || 0)
                ) / 400 // Average of 4 metrics (each out of 100)
            };
        } catch (error) {
            console.error('Failed to read coverage report:', error);
            return undefined;
        }
    }

    /**
     * Find all test files in workspace (for discovery)
     */
    async findAllTests(): Promise<string[]> {
        const testFiles: string[] = [];
        const testDirs = [
            path.join(this.workspaceRoot, 'vscode-lumina', 'test'),
            path.join(this.workspaceRoot, 'test'),
            path.join(this.workspaceRoot, 'tests'),
            path.join(this.workspaceRoot, '__tests__')
        ];

        for (const testDir of testDirs) {
            if (!fs.existsSync(testDir)) {
                continue;
            }

            const files = this.walkDirectory(testDir);
            const tests = files.filter(f => f.endsWith('.test.ts') || f.endsWith('.spec.ts'));
            testFiles.push(...tests.map(f => path.relative(this.workspaceRoot, f)));
        }

        return testFiles;
    }

    /**
     * Recursively walk directory to find files
     */
    private walkDirectory(dir: string): string[] {
        const files: string[] = [];

        if (!fs.existsSync(dir)) {
            return files;
        }

        const entries = fs.readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);

            if (entry.isDirectory()) {
                // Skip node_modules, .git, etc.
                if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
                    files.push(...this.walkDirectory(fullPath));
                }
            } else if (entry.isFile()) {
                files.push(fullPath);
            }
        }

        return files;
    }

    /**
     * Calculate gap score (0.0 = all missing, 1.0 = all present)
     */
    static calculateGapScore(context: TestContext): number {
        const { testFilesExpected, testFilesFound, testsPassing, coverage } = context;

        if (testFilesExpected.length === 0) {
            return 1.0; // No tests expected = no gap
        }

        let score = 0.0;

        // 40% for test files existing
        const filesScore = testFilesFound.length / testFilesExpected.length;
        score += filesScore * 0.4;

        // 30% for tests passing
        if (testsPassing) {
            score += 0.3;
        }

        // 30% for coverage
        if (coverage) {
            score += coverage.overall * 0.3;
        }

        return Math.min(score, 1.0);
    }

    /**
     * Generate human-readable status message
     */
    static getStatusMessage(context: TestContext): string {
        const { status, testFilesFound, testFilesMissing, testsPassing, coverage } = context;

        if (status === 'none') {
            return `🔴 No tests (missing: ${testFilesMissing.join(', ')})`;
        }

        if (status === 'partial') {
            return `🟡 Partial tests (${testFilesFound.length}/${testFilesFound.length + testFilesMissing.length} files, missing: ${testFilesMissing.join(', ')})`;
        }

        if (!testsPassing) {
            return `🔴 Tests failing (${testFilesFound.length} files)`;
        }

        if (coverage) {
            const pct = Math.round(coverage.overall * 100);
            if (pct >= 80) {
                return `🟢 Tests passing (${pct}% coverage)`;
            } else {
                return `🟡 Tests passing (${pct}% coverage, target: 80%)`;
            }
        }

        return `🟢 Tests passing (${testFilesFound.length} files)`;
    }

    /**
     * Get emoji indicator for test status
     */
    static getStatusEmoji(context: TestContext): string {
        if (context.status === 'none') {
            return '🔴';
        }

        if (context.status === 'partial' || !context.testsPassing) {
            return '🟡';
        }

        if (context.coverage && context.coverage.overall >= 0.8) {
            return '🟢';
        }

        return '🟡';
    }
}
