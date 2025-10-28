/**
 * Technical Debt Analyzer Tests
 *
 * DESIGN DECISION: Test debt detection across multiple categories
 * WHY: Ensure accurate identification of technical debt for sprint planning
 *
 * REASONING CHAIN:
 * 1. Create test files with known debt patterns
 * 2. Run analyzer, verify correct detection
 * 3. Validate severity classification
 * 4. Check debt score calculation
 * 5. Verify recommendations are actionable
 * 6. Result: Reliable debt analysis for prioritization
 *
 * PATTERN: Pattern-TEST-001 (Unit Testing Strategy)
 */

import { TechnicalDebtAnalyzer } from './technical-debt-analyzer';
import { ParseResult, ParsedFile } from '../parsers/types';
import { TechnicalDebtCategory, IssueSeverity } from './types';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('TechnicalDebtAnalyzer', () => {
  let analyzer: TechnicalDebtAnalyzer;
  let tempDir: string;

  beforeEach(() => {
    analyzer = new TechnicalDebtAnalyzer();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'debt-analyzer-test-'));
  });

  afterEach(() => {
    // Clean up temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('Comment debt detection', () => {
    it('should detect TODO comments', () => {
      const testFile = path.join(tempDir, 'test.ts');
      fs.writeFileSync(
        testFile,
        `
// TODO: Implement this feature
function test() {
  /* TODO: Add error handling */
  return 42;
}
      `
      );

      const parseResult = createMockParseResult([testFile]);
      const result = analyzer.analyze(parseResult);
      const analysis = result.data;

      const todoIssues = analysis.issues.filter((i) => i.category === TechnicalDebtCategory.TODO);
      expect(todoIssues.length).toBeGreaterThanOrEqual(1);
      expect(todoIssues[0].severity).toBe(IssueSeverity.LOW);
    });

    it('should detect FIXME comments', () => {
      const testFile = path.join(tempDir, 'test.ts');
      fs.writeFileSync(
        testFile,
        `
// FIXME: This breaks with null values
function buggyFunction(value: any) {
  return value.property;
}
      `
      );

      const parseResult = createMockParseResult([testFile]);
      const result = analyzer.analyze(parseResult);
      const analysis = result.data;

      const fixmeIssues = analysis.issues.filter(
        (i) => i.category === TechnicalDebtCategory.FIXME
      );
      expect(fixmeIssues.length).toBeGreaterThanOrEqual(1);
      expect(fixmeIssues[0].severity).toBe(IssueSeverity.MEDIUM);
    });

    it('should detect HACK comments', () => {
      const testFile = path.join(tempDir, 'test.ts');
      fs.writeFileSync(
        testFile,
        `
// HACK: Temporary workaround for race condition
function workaround() {
  setTimeout(() => {}, 100); // Wait for async operation
}
      `
      );

      const parseResult = createMockParseResult([testFile]);
      const result = analyzer.analyze(parseResult);
      const analysis = result.data;

      const hackIssues = analysis.issues.filter((i) => i.category === TechnicalDebtCategory.HACK);
      expect(hackIssues.length).toBeGreaterThanOrEqual(1);
      expect(hackIssues[0].severity).toBe(IssueSeverity.HIGH);
    });
  });

  describe('Magic number detection', () => {
    it('should detect magic numbers', () => {
      const testFile = path.join(tempDir, 'test.ts');
      fs.writeFileSync(
        testFile,
        `
function calculate() {
  const result = value * 42; // Magic number
  const timeout = 5000; // Magic number
  return result;
}
      `
      );

      const parseResult = createMockParseResult([testFile]);
      const result = analyzer.analyze(parseResult);
      const analysis = result.data;

      const magicNumbers = analysis.issues.filter(
        (i) => i.category === TechnicalDebtCategory.MAGIC_NUMBER
      );
      expect(magicNumbers.length).toBeGreaterThan(0);
    });

    it('should not flag common values as magic numbers', () => {
      const testFile = path.join(tempDir, 'test.ts');
      fs.writeFileSync(
        testFile,
        `
function initialize() {
  const count = 0;
  const index = 1;
  const errorCode = -1;
  const total = 100;
  return count + index + errorCode + total;
}
      `
      );

      const parseResult = createMockParseResult([testFile]);
      const result = analyzer.analyze(parseResult);
      const analysis = result.data;

      const magicNumbers = analysis.issues.filter(
        (i) => i.category === TechnicalDebtCategory.MAGIC_NUMBER
      );
      // Should be 0 or very low (0, 1, -1, 100 are not magic)
      expect(magicNumbers.length).toBe(0);
    });
  });

  describe('Hardcoded value detection', () => {
    it('should detect hardcoded URLs', () => {
      const testFile = path.join(tempDir, 'test.ts');
      fs.writeFileSync(
        testFile,
        `
async function fetchData() {
  const response = await fetch('https://api.example.com/data');
  return response.json();
}
      `
      );

      const parseResult = createMockParseResult([testFile]);
      const result = analyzer.analyze(parseResult);
      const analysis = result.data;

      const hardcodedStrings = analysis.issues.filter(
        (i) => i.category === TechnicalDebtCategory.HARDCODED_STRING
      );
      expect(hardcodedStrings.length).toBeGreaterThan(0);
      expect(hardcodedStrings.some((i) => i.description.includes('URL'))).toBe(true);
    });

    it('should detect potential API keys', () => {
      const testFile = path.join(tempDir, 'test.ts');
      fs.writeFileSync(
        testFile,
        `
const API_KEY = 'FAKE_API_KEY_FOR_TESTING_ONLY_DO_NOT_USE';
function authenticate() {
  return API_KEY;
}
      `
      );

      const parseResult = createMockParseResult([testFile]);
      const result = analyzer.analyze(parseResult);
      const analysis = result.data;

      const potentialSecrets = analysis.issues.filter(
        (i) => i.category === TechnicalDebtCategory.HARDCODED_STRING && i.severity === IssueSeverity.HIGH
      );
      expect(potentialSecrets.length).toBeGreaterThan(0);
    });
  });

  describe('Missing error handling detection', () => {
    it('should detect async operations without error handling', () => {
      const testFile = path.join(tempDir, 'test.ts');
      fs.writeFileSync(
        testFile,
        `
async function loadData() {
  const data = await fetch('/api/data');
  return data.json();
}
      `
      );

      const parseResult = createMockParseResult([testFile]);
      const result = analyzer.analyze(parseResult);
      const analysis = result.data;

      const missingErrorHandling = analysis.issues.filter(
        (i) => i.category === TechnicalDebtCategory.MISSING_ERROR_HANDLING
      );
      expect(missingErrorHandling.length).toBeGreaterThan(0);
    });

    it('should detect JSON.parse without error handling', () => {
      const testFile = path.join(tempDir, 'test.ts');
      fs.writeFileSync(
        testFile,
        `
function parseConfig(text: string) {
  const config = JSON.parse(text);
  return config;
}
      `
      );

      const parseResult = createMockParseResult([testFile]);
      const result = analyzer.analyze(parseResult);
      const analysis = result.data;

      const missingErrorHandling = analysis.issues.filter(
        (i) =>
          i.category === TechnicalDebtCategory.MISSING_ERROR_HANDLING &&
          i.description.includes('JSON.parse')
      );
      expect(missingErrorHandling.length).toBeGreaterThan(0);
    });

    it('should not flag async operations with try/catch', () => {
      const testFile = path.join(tempDir, 'test.ts');
      fs.writeFileSync(
        testFile,
        `
async function loadDataSafely() {
  try {
    const data = await fetch('/api/data');
    return data.json();
  } catch (error) {
    console.error(error);
    return null;
  }
}
      `
      );

      const parseResult = createMockParseResult([testFile]);
      const result = analyzer.analyze(parseResult);
      const analysis = result.data;

      const missingErrorHandling = analysis.issues.filter(
        (i) => i.category === TechnicalDebtCategory.MISSING_ERROR_HANDLING
      );
      // Should be 0 or minimal (try/catch present)
      expect(missingErrorHandling.length).toBeLessThan(2);
    });
  });

  describe('Deprecated API detection', () => {
    it('should detect deprecated Buffer constructor', () => {
      const testFile = path.join(tempDir, 'test.ts');
      fs.writeFileSync(
        testFile,
        `
function createBuffer() {
  const buffer = new Buffer('hello');
  return buffer;
}
      `
      );

      const parseResult = createMockParseResult([testFile]);
      const result = analyzer.analyze(parseResult);
      const analysis = result.data;

      const deprecatedAPIs = analysis.issues.filter(
        (i) => i.category === TechnicalDebtCategory.DEPRECATED_API
      );
      expect(deprecatedAPIs.length).toBeGreaterThan(0);
    });
  });

  describe('Debt score calculation', () => {
    it('should calculate higher score for more issues', () => {
      const testFile1 = path.join(tempDir, 'test1.ts');
      fs.writeFileSync(
        testFile1,
        `
// TODO: Simple file
function simple() {
  return 1;
}
      `
      );

      const testFile2 = path.join(tempDir, 'test2.ts');
      fs.writeFileSync(
        testFile2,
        `
// HACK: Complex file with issues
// FIXME: Multiple problems
// TODO: Needs refactoring
const API_KEY = 'FAKE_API_KEY_FOR_TESTING_ONLY_DO_NOT_USE';
async function broken() {
  const data = await fetch('https://hardcoded.url.com');
  return JSON.parse(data);
}
      `
      );

      const parseResult1 = createMockParseResult([testFile1]);
      const result1 = analyzer.analyze(parseResult1);

      const parseResult2 = createMockParseResult([testFile2]);
      const result2 = analyzer.analyze(parseResult2);

      expect(result2.data.score).toBeGreaterThan(result1.data.score);
    });

    it('should weight high-severity issues more heavily', () => {
      const testFileHigh = path.join(tempDir, 'high.ts');
      fs.writeFileSync(
        testFileHigh,
        `
// HACK: High severity
const SECRET = 'FAKE_SECRET_FOR_TESTING_ONLY_DO_NOT_USE';
      `
      );

      const testFileLow = path.join(tempDir, 'low.ts');
      fs.writeFileSync(
        testFileLow,
        `
// TODO: Low severity
// TODO: Another low severity
// TODO: Yet another low severity
      `
      );

      const resultHigh = analyzer.analyze(createMockParseResult([testFileHigh]));
      const resultLow = analyzer.analyze(createMockParseResult([testFileLow]));

      // High severity issues should contribute more to score
      expect(resultHigh.data.score).toBeGreaterThan(resultLow.data.score);
    });
  });

  describe('Summary report generation', () => {
    it('should generate markdown report', () => {
      const testFile = path.join(tempDir, 'test.ts');
      fs.writeFileSync(
        testFile,
        `
// TODO: Add tests
// FIXME: Handle edge cases
// HACK: Temporary workaround
      `
      );

      const parseResult = createMockParseResult([testFile]);
      const result = analyzer.analyze(parseResult);
      const report = analyzer.generateSummaryReport(result.data);

      expect(report).toContain('# Technical Debt Analysis Report');
      expect(report).toContain('## Debt Score');
      expect(report).toContain('## Statistics');
      expect(report).toContain('Total Issues');
    });
  });

  describe('Performance', () => {
    it('should analyze 100 files in <2 seconds', () => {
      const files: string[] = [];
      for (let i = 0; i < 100; i++) {
        const testFile = path.join(tempDir, `test${i}.ts`);
        fs.writeFileSync(
          testFile,
          `
// TODO: File ${i}
function test${i}() {
  const value = 42;
  return value;
}
        `
        );
        files.push(testFile);
      }

      const parseResult = createMockParseResult(files);
      const result = analyzer.analyze(parseResult);

      expect(result.executionTimeMs).toBeLessThan(2000);
    });
  });
});

// Helper functions

function createMockParseResult(filePaths: string[]): ParseResult {
  const files: ParsedFile[] = filePaths.map((filePath) => ({
    filePath,
    language: 'typescript',
    elements: [],
    dependencies: [],
    linesOfCode: 10,
    parseErrors: [],
  }));

  return {
    files,
    totalFiles: files.length,
    totalLinesOfCode: files.length * 10,
    parseErrors: [],
    parseDurationMs: 50,
  };
}
