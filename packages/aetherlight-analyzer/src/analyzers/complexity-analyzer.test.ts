/**
 * Complexity Analyzer Tests
 *
 * DESIGN DECISION: Test complexity scoring and refactoring recommendations
 * WHY: Ensure accurate identification of high-complexity functions
 *
 * REASONING CHAIN:
 * 1. Create mock ParseResult with functions of varying complexity
 * 2. Run analyzer, verify statistics calculated correctly
 * 3. Validate threshold detection (functions >15 complexity)
 * 4. Check heatmap generation (file-level aggregation)
 * 5. Verify refactoring recommendations match severity
 * 6. Result: Accurate complexity analysis for sprint planning
 *
 * PATTERN: Pattern-TEST-001 (Unit Testing Strategy)
 */

import { ComplexityAnalyzer } from './complexity-analyzer';
import { ParseResult, ParsedFile, ElementType } from '../parsers/types';
import { IssueSeverity, IssueEffort, IssueImpact } from './types';

describe('ComplexityAnalyzer', () => {
  let analyzer: ComplexityAnalyzer;

  beforeEach(() => {
    analyzer = new ComplexityAnalyzer(15); // Default threshold
  });

  describe('Statistics calculation', () => {
    it('should calculate average complexity correctly', () => {
      const parseResult = createMockParseResult([
        { name: 'func1', complexity: 5 },
        { name: 'func2', complexity: 10 },
        { name: 'func3', complexity: 15 },
        { name: 'func4', complexity: 20 },
      ]);

      const result = analyzer.analyze(parseResult);
      const analysis = result.data;

      expect(analysis.averageComplexity).toBeCloseTo(12.5, 1);
    });

    it('should calculate median complexity correctly', () => {
      const parseResult = createMockParseResult([
        { name: 'func1', complexity: 5 },
        { name: 'func2', complexity: 10 },
        { name: 'func3', complexity: 15 },
        { name: 'func4', complexity: 100 }, // Outlier
      ]);

      const result = analyzer.analyze(parseResult);
      const analysis = result.data;

      // Median should be 10 or 15 (not affected by outlier)
      expect(analysis.medianComplexity).toBeGreaterThanOrEqual(10);
      expect(analysis.medianComplexity).toBeLessThanOrEqual(15);
    });

    it('should identify max complexity', () => {
      const parseResult = createMockParseResult([
        { name: 'func1', complexity: 5 },
        { name: 'func2', complexity: 42 },
        { name: 'func3', complexity: 15 },
      ]);

      const result = analyzer.analyze(parseResult);
      const analysis = result.data;

      expect(analysis.maxComplexity).toBe(42);
    });
  });

  describe('High-complexity function detection', () => {
    it('should identify functions over threshold', () => {
      const parseResult = createMockParseResult([
        { name: 'simpleFunc', complexity: 5 },
        { name: 'moderateFunc', complexity: 12 },
        { name: 'complexFunc', complexity: 18 },
        { name: 'veryComplexFunc', complexity: 35 },
      ]);

      const result = analyzer.analyze(parseResult);
      const analysis = result.data;

      expect(analysis.functionsOverThreshold).toHaveLength(2);
      expect(analysis.functionsOverThreshold[0].functionName).toBe('veryComplexFunc');
      expect(analysis.functionsOverThreshold[1].functionName).toBe('complexFunc');
    });

    it('should sort by complexity (highest first)', () => {
      const parseResult = createMockParseResult([
        { name: 'func1', complexity: 20 },
        { name: 'func2', complexity: 50 },
        { name: 'func3', complexity: 30 },
      ]);

      const result = analyzer.analyze(parseResult);
      const analysis = result.data;

      expect(analysis.functionsOverThreshold[0].complexity).toBe(50);
      expect(analysis.functionsOverThreshold[1].complexity).toBe(30);
      expect(analysis.functionsOverThreshold[2].complexity).toBe(20);
    });
  });

  describe('Refactoring recommendations', () => {
    it('should recommend complete rewrite for complexity >50', () => {
      const parseResult = createMockParseResult([{ name: 'monsterFunc', complexity: 75 }]);

      const result = analyzer.analyze(parseResult);
      const analysis = result.data;

      const issue = analysis.functionsOverThreshold[0];
      expect(issue.recommendation).toContain('Complete rewrite');
    });

    it('should recommend extraction for complexity 30-50', () => {
      const parseResult = createMockParseResult([{ name: 'complexFunc', complexity: 40 }]);

      const result = analyzer.analyze(parseResult);
      const analysis = result.data;

      const issue = analysis.functionsOverThreshold[0];
      expect(issue.recommendation).toContain('Extract major code blocks');
    });

    it('should recommend helper functions for complexity 15-20', () => {
      const parseResult = createMockParseResult([{ name: 'moderateFunc', complexity: 18 }]);

      const result = analyzer.analyze(parseResult);
      const analysis = result.data;

      const issue = analysis.functionsOverThreshold[0];
      expect(issue.recommendation).toContain('Extract 1-2 code blocks');
    });
  });

  describe('Complexity heatmap', () => {
    it('should generate file-level heatmap', () => {
      const parseResult: ParseResult = {
        files: [
          createMockFile('file1.ts', [
            createMockFunction('func1', 10),
            createMockFunction('func2', 20),
          ]),
          createMockFile('file2.ts', [
            createMockFunction('func3', 5),
            createMockFunction('func4', 15),
          ]),
        ],
        totalFiles: 2,
        totalLinesOfCode: 200,
        parseErrors: [],
        parseDurationMs: 50,
      };

      const result = analyzer.analyze(parseResult);
      const analysis = result.data;

      expect(analysis.heatmap).toHaveLength(2);
      expect(analysis.heatmap[0].filePath).toBe('file1.ts');
      expect(analysis.heatmap[0].averageComplexity).toBe(15); // (10+20)/2
      expect(analysis.heatmap[0].maxComplexity).toBe(20);
      expect(analysis.heatmap[0].functionCount).toBe(2);
    });

    it('should sort heatmap by average complexity', () => {
      const parseResult: ParseResult = {
        files: [
          createMockFile('lowComplexity.ts', [createMockFunction('func1', 5)]),
          createMockFile('highComplexity.ts', [createMockFunction('func2', 30)]),
          createMockFile('mediumComplexity.ts', [createMockFunction('func3', 15)]),
        ],
        totalFiles: 3,
        totalLinesOfCode: 300,
        parseErrors: [],
        parseDurationMs: 50,
      };

      const result = analyzer.analyze(parseResult);
      const analysis = result.data;

      expect(analysis.heatmap[0].filePath).toBe('highComplexity.ts');
      expect(analysis.heatmap[1].filePath).toBe('mediumComplexity.ts');
      expect(analysis.heatmap[2].filePath).toBe('lowComplexity.ts');
    });
  });

  describe('Issue generation', () => {
    it('should convert complexity analysis to issues', () => {
      const parseResult = createMockParseResult([
        { name: 'simpleFunc', complexity: 5 },
        { name: 'complexFunc', complexity: 35 },
      ]);

      const result = analyzer.analyze(parseResult);
      const analysis = result.data;
      const issues = analyzer.generateIssues(analysis);

      expect(issues).toHaveLength(1);
      expect(issues[0].message).toContain('complexFunc');
      expect(issues[0].severity).toBe(IssueSeverity.HIGH);
    });

    it('should map complexity to correct severity', () => {
      const parseResult = createMockParseResult([
        { name: 'func1', complexity: 18 }, // Low
        { name: 'func2', complexity: 25 }, // Medium
        { name: 'func3', complexity: 35 }, // High
      ]);

      const result = analyzer.analyze(parseResult);
      const analysis = result.data;
      const issues = analyzer.generateIssues(analysis);

      const lowIssue = issues.find((i) => i.message.includes('func1'));
      const mediumIssue = issues.find((i) => i.message.includes('func2'));
      const highIssue = issues.find((i) => i.message.includes('func3'));

      expect(lowIssue?.severity).toBe(IssueSeverity.LOW);
      expect(mediumIssue?.severity).toBe(IssueSeverity.MEDIUM);
      expect(highIssue?.severity).toBe(IssueSeverity.HIGH);
    });

    it('should estimate effort correctly', () => {
      const parseResult = createMockParseResult([
        { name: 'func1', complexity: 18 }, // Low effort
        { name: 'func2', complexity: 30 }, // Medium effort
        { name: 'func3', complexity: 45 }, // High effort
      ]);

      const result = analyzer.analyze(parseResult);
      const analysis = result.data;
      const issues = analyzer.generateIssues(analysis);

      const lowEffort = issues.find((i) => i.message.includes('func1'));
      const mediumEffort = issues.find((i) => i.message.includes('func2'));
      const highEffort = issues.find((i) => i.message.includes('func3'));

      expect(lowEffort?.effort).toBe(IssueEffort.LOW);
      expect(mediumEffort?.effort).toBe(IssueEffort.MEDIUM);
      expect(highEffort?.effort).toBe(IssueEffort.HIGH);
    });
  });

  describe('Summary report generation', () => {
    it('should generate markdown report', () => {
      const parseResult = createMockParseResult([
        { name: 'func1', complexity: 5 },
        { name: 'func2', complexity: 18 },
        { name: 'func3', complexity: 35 },
      ]);

      const result = analyzer.analyze(parseResult);
      const analysis = result.data;
      const report = analyzer.generateSummaryReport(analysis);

      expect(report).toContain('# Complexity Analysis Report');
      expect(report).toContain('## Overall Statistics');
      expect(report).toContain('## High-Complexity Functions');
      expect(report).toContain('func3');
      expect(report).toContain('func2');
    });
  });

  describe('Performance', () => {
    it('should analyze 1000 functions in <1 second', () => {
      const functions = [];
      for (let i = 0; i < 1000; i++) {
        functions.push({ name: `func${i}`, complexity: Math.floor(Math.random() * 30) });
      }

      const parseResult = createMockParseResult(functions);

      const result = analyzer.analyze(parseResult);

      expect(result.executionTimeMs).toBeLessThan(1000);
    });
  });
});

// Helper functions

function createMockParseResult(functions: { name: string; complexity: number }[]): ParseResult {
  const file = createMockFile(
    'test.ts',
    functions.map((f) => createMockFunction(f.name, f.complexity))
  );

  return {
    files: [file],
    totalFiles: 1,
    totalLinesOfCode: functions.length * 10,
    parseErrors: [],
    parseDurationMs: 50,
  };
}

function createMockFile(filePath: string, elements: any[]): ParsedFile {
  return {
    filePath,
    language: 'typescript',
    elements,
    dependencies: [],
    linesOfCode: elements.length * 10,
    parseErrors: [],
  };
}

function createMockFunction(name: string, complexity: number): any {
  return {
    type: ElementType.FUNCTION,
    name,
    location: { filePath: 'test.ts', line: 1, column: 1 },
    documentation: `Function ${name}`,
    metadata: {},
    parameters: [],
    returnType: 'void',
    isAsync: false,
    isExported: true,
    complexity,
  };
}
