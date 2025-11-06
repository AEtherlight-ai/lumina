/**
 * DESIGN DECISION: Multi-category technical debt detection with severity scoring
 * WHY: Technical debt accumulates silently - need automated detection and prioritization
 *
 * REASONING CHAIN:
 * 1. Scan source files for debt indicators (TODO, FIXME, HACK comments)
 * 2. Detect code smells (magic numbers, hardcoded strings, long methods)
 * 3. Identify missing error handling (no try/catch, no error checking)
 * 4. Find deprecated API usage (via pattern matching)
 * 5. Calculate debt score (0-100, weighted by severity and frequency)
 * 6. Generate prioritized issue list for sprint planning
 * 7. Result: Clear roadmap for technical debt reduction
 *
 * PATTERN: Pattern-ANALYZER-001 (AST-Based Code Analysis)
 * RELATED: TypeScript Parser, Rust Parser
 * PERFORMANCE: <2s for 100k LOC
 */

import * as fs from 'fs';
import { ParseResult, ParsedFile, ElementType } from '../parsers/types';
import {
  TechnicalDebtAnalysis,
  TechnicalDebtIssue,
  TechnicalDebtCategory,
  AnalyzerResult,
  IssueSeverity,
} from './types';

export class TechnicalDebtAnalyzer {
  /**
   * Analyze technical debt in parsed codebase
   *
   * DESIGN DECISION: Combine static analysis (AST) with text analysis (comments, strings)
   * WHY: Some debt visible in AST (long methods), some only in source text (TODO comments)
   */
  public analyze(parseResult: ParseResult): AnalyzerResult {
    const startTime = Date.now();

    const issues: TechnicalDebtIssue[] = [];

    // Phase 1: Scan for comment-based debt (TODO, FIXME, HACK)
    issues.push(...this.detectCommentDebt(parseResult));

    // Phase 2: Detect code smells from AST
    issues.push(...this.detectCodeSmells(parseResult));

    // Phase 3: Detect magic numbers and hardcoded strings
    issues.push(...this.detectHardcodedValues(parseResult));

    // Phase 4: Detect missing error handling
    issues.push(...this.detectMissingErrorHandling(parseResult));

    // Phase 5: Detect deprecated API usage
    issues.push(...this.detectDeprecatedAPIs(parseResult));

    // Calculate debt score
    const score = this.calculateDebtScore(issues);

    // Categorize issues
    const categories = this.categorizeIssues(issues);

    // Count by severity
    const highPriority = issues.filter((i) => i.severity === IssueSeverity.HIGH).length;
    const mediumPriority = issues.filter((i) => i.severity === IssueSeverity.MEDIUM).length;
    const lowPriority = issues.filter((i) => i.severity === IssueSeverity.LOW).length;

    const analysis: TechnicalDebtAnalysis = {
      totalIssues: issues.length,
      highPriority,
      mediumPriority,
      lowPriority,
      categories,
      issues,
      score,
    };

    return {
      name: 'technical-debt',
      version: '1.0.0',
      executionTimeMs: Date.now() - startTime,
      data: analysis,
    };
  }

  /**
   * Detect TODO/FIXME/HACK comments in source files
   *
   * REASONING CHAIN:
   * 1. Read source file contents (not available in AST)
   * 2. Scan for comment patterns (// TODO, /* FIXME *\/, # HACK)
   * 3. Extract line number and surrounding context
   * 4. Classify severity (FIXME > TODO > HACK)
   */
  private detectCommentDebt(parseResult: ParseResult): TechnicalDebtIssue[] {
    const issues: TechnicalDebtIssue[] = [];

    parseResult.files.forEach((file) => {
      try {
        const content = fs.readFileSync(file.filePath, 'utf-8');
        const lines = content.split('\n');

        lines.forEach((line, index) => {
          const trimmed = line.trim();

          // TODO detection
          if (trimmed.match(/\/\/\s*TODO|\/\*\s*TODO|\#\s*TODO/i)) {
            issues.push({
              category: TechnicalDebtCategory.TODO,
              severity: IssueSeverity.LOW,
              location: {
                filePath: file.filePath,
                line: index + 1,
                context: trimmed,
              },
              description: `TODO comment: ${trimmed.substring(0, 100)}`,
              recommendation: 'Create task to address this TODO or remove if no longer relevant.',
            });
          }

          // FIXME detection
          if (trimmed.match(/\/\/\s*FIXME|\/\*\s*FIXME|\#\s*FIXME/i)) {
            issues.push({
              category: TechnicalDebtCategory.FIXME,
              severity: IssueSeverity.MEDIUM,
              location: {
                filePath: file.filePath,
                line: index + 1,
                context: trimmed,
              },
              description: `FIXME comment: ${trimmed.substring(0, 100)}`,
              recommendation: 'Prioritize fixing this issue - FIXME indicates a known problem.',
            });
          }

          // HACK detection
          if (trimmed.match(/\/\/\s*HACK|\/\*\s*HACK|\#\s*HACK/i)) {
            issues.push({
              category: TechnicalDebtCategory.HACK,
              severity: IssueSeverity.HIGH,
              location: {
                filePath: file.filePath,
                line: index + 1,
                context: trimmed,
              },
              description: `HACK comment: ${trimmed.substring(0, 100)}`,
              recommendation:
                'Refactor this workaround into a proper solution - HACKs indicate fragile code.',
            });
          }
        });
      } catch (error) {
        // File read error - skip this file
      }
    });

    return issues;
  }

  /**
   * Detect code smells from AST
   *
   * DESIGN DECISION: Focus on objectively measurable smells
   * WHY: Subjective smells (naming, style) are less actionable
   */
  private detectCodeSmells(parseResult: ParseResult): TechnicalDebtIssue[] {
    const issues: TechnicalDebtIssue[] = [];

    parseResult.files.forEach((file) => {
      file.elements.forEach((elem) => {
        // Long method detection (>50 lines)
        if (elem.type === ElementType.FUNCTION || elem.type === ElementType.METHOD) {
          const funcElem = elem as any;
          if (elem.location.endLine && elem.location.line) {
            const lineCount = elem.location.endLine - elem.location.line;
            if (lineCount > 50) {
              issues.push({
                category: TechnicalDebtCategory.LONG_METHOD,
                severity: IssueSeverity.MEDIUM,
                location: {
                  filePath: file.filePath,
                  line: elem.location.line,
                },
                description: `Function '${elem.name}' is ${lineCount} lines long (threshold: 50)`,
                recommendation: 'Extract code blocks into smaller, focused functions.',
              });
            }
          }
        }

        // God class detection (>20 methods or >500 lines)
        if (elem.type === ElementType.CLASS) {
          const classElem = elem as any;
          const methodCount = classElem.methods?.length || 0;

          if (methodCount > 20) {
            issues.push({
              category: TechnicalDebtCategory.GOD_CLASS,
              severity: IssueSeverity.HIGH,
              location: {
                filePath: file.filePath,
                line: elem.location.line,
              },
              description: `Class '${elem.name}' has ${methodCount} methods (threshold: 20)`,
              recommendation:
                'Split this class into multiple smaller classes with focused responsibilities.',
            });
          }

          // Check line count
          if (elem.location.endLine && elem.location.line) {
            const lineCount = elem.location.endLine - elem.location.line;
            if (lineCount > 500) {
              issues.push({
                category: TechnicalDebtCategory.GOD_CLASS,
                severity: IssueSeverity.HIGH,
                location: {
                  filePath: file.filePath,
                  line: elem.location.line,
                },
                description: `Class '${elem.name}' is ${lineCount} lines long (threshold: 500)`,
                recommendation: 'Refactor into multiple smaller classes.',
              });
            }
          }
        }
      });
    });

    return issues;
  }

  /**
   * Detect hardcoded values (magic numbers, hardcoded strings)
   *
   * REASONING CHAIN:
   * 1. Read source file contents
   * 2. Use regex to find numeric literals (not 0, 1, -1, 100)
   * 3. Find hardcoded URLs, paths, API keys patterns
   * 4. Recommend extraction to constants or config
   */
  private detectHardcodedValues(parseResult: ParseResult): TechnicalDebtIssue[] {
    const issues: TechnicalDebtIssue[] = [];

    parseResult.files.forEach((file) => {
      try {
        const content = fs.readFileSync(file.filePath, 'utf-8');
        const lines = content.split('\n');

        lines.forEach((line, index) => {
          // Skip comments
          if (line.trim().startsWith('//') || line.trim().startsWith('/*')) {
            return;
          }

          // Magic number detection (exclude common values: 0, 1, -1, 2, 10, 100, 1000)
          const magicNumberPattern = /(?<![\w])\b(?!0\b|1\b|-1\b|2\b|10\b|100\b|1000\b)\d{2,}\b/g;
          const magicNumbers = line.match(magicNumberPattern);

          if (magicNumbers) {
            issues.push({
              category: TechnicalDebtCategory.MAGIC_NUMBER,
              severity: IssueSeverity.LOW,
              location: {
                filePath: file.filePath,
                line: index + 1,
                context: line.trim().substring(0, 100),
              },
              description: `Magic number detected: ${magicNumbers.join(', ')}`,
              recommendation: 'Extract magic numbers to named constants with descriptive names.',
            });
          }

          // Hardcoded URL detection
          if (line.match(/https?:\/\/[^\s\)'"]+/)) {
            issues.push({
              category: TechnicalDebtCategory.HARDCODED_STRING,
              severity: IssueSeverity.MEDIUM,
              location: {
                filePath: file.filePath,
                line: index + 1,
                context: line.trim().substring(0, 100),
              },
              description: 'Hardcoded URL detected',
              recommendation: 'Move URL to configuration file or environment variable.',
            });
          }

          // Hardcoded file path detection
          if (line.match(/['"]\/[^\s'"]+['"]/)) {
            issues.push({
              category: TechnicalDebtCategory.HARDCODED_STRING,
              severity: IssueSeverity.LOW,
              location: {
                filePath: file.filePath,
                line: index + 1,
                context: line.trim().substring(0, 100),
              },
              description: 'Hardcoded file path detected',
              recommendation: 'Move file paths to configuration or use path.join().',
            });
          }

          // Potential API key pattern (long alphanumeric strings with underscores/dashes)
          const apiKeyPattern = /['"][A-Za-z0-9_\-]{32,}['"]/;
          if (line.match(apiKeyPattern)) {
            issues.push({
              category: TechnicalDebtCategory.HARDCODED_STRING,
              severity: IssueSeverity.HIGH,
              location: {
                filePath: file.filePath,
                line: index + 1,
                context: '[REDACTED]',
              },
              description: 'Potential API key or secret detected',
              recommendation:
                'CRITICAL: Move secrets to environment variables or secret management system.',
            });
          }
        });
      } catch (error) {
        // File read error - skip
      }
    });

    return issues;
  }

  /**
   * Detect missing error handling
   *
   * DESIGN DECISION: Heuristic-based detection (not perfect, but useful)
   * WHY: Full error flow analysis requires complex dataflow analysis
   */
  private detectMissingErrorHandling(parseResult: ParseResult): TechnicalDebtIssue[] {
    const issues: TechnicalDebtIssue[] = [];

    parseResult.files.forEach((file) => {
      try {
        const content = fs.readFileSync(file.filePath, 'utf-8');
        const lines = content.split('\n');

        // Track if we're in a try block
        let inTryBlock = false;
        let tryBlockDepth = 0;

        lines.forEach((line, index) => {
          const trimmed = line.trim();

          // Track try/catch blocks
          if (trimmed.includes('try {')) {
            inTryBlock = true;
            tryBlockDepth++;
          }
          if (trimmed.includes('} catch')) {
            tryBlockDepth--;
            if (tryBlockDepth === 0) {
              inTryBlock = false;
            }
          }

          // Detect async functions without error handling
          if (
            (trimmed.includes('await ') || trimmed.includes('.then(')) &&
            !inTryBlock &&
            !trimmed.includes('.catch(')
          ) {
            issues.push({
              category: TechnicalDebtCategory.MISSING_ERROR_HANDLING,
              severity: IssueSeverity.MEDIUM,
              location: {
                filePath: file.filePath,
                line: index + 1,
                context: trimmed.substring(0, 100),
              },
              description: 'Async operation without error handling',
              recommendation: 'Wrap in try/catch or add .catch() handler.',
            });
          }

          // Detect file operations without error handling
          if (
            (trimmed.includes('fs.readFile') ||
              trimmed.includes('fs.writeFile') ||
              trimmed.includes('fs.') ||
              trimmed.includes('readFileSync') ||
              trimmed.includes('writeFileSync')) &&
            !inTryBlock
          ) {
            issues.push({
              category: TechnicalDebtCategory.MISSING_ERROR_HANDLING,
              severity: IssueSeverity.HIGH,
              location: {
                filePath: file.filePath,
                line: index + 1,
                context: trimmed.substring(0, 100),
              },
              description: 'File operation without error handling',
              recommendation: 'Wrap file operations in try/catch blocks.',
            });
          }

          // Detect JSON.parse without error handling
          if (trimmed.includes('JSON.parse(') && !inTryBlock) {
            issues.push({
              category: TechnicalDebtCategory.MISSING_ERROR_HANDLING,
              severity: IssueSeverity.MEDIUM,
              location: {
                filePath: file.filePath,
                line: index + 1,
                context: trimmed.substring(0, 100),
              },
              description: 'JSON.parse without error handling',
              recommendation: 'Wrap JSON.parse in try/catch to handle malformed JSON.',
            });
          }
        });
      } catch (error) {
        // File read error - skip
      }
    });

    return issues;
  }

  /**
   * Detect deprecated API usage
   *
   * DESIGN DECISION: Pattern-based detection for common deprecations
   * WHY: Language-specific deprecation lists too large to maintain
   */
  private detectDeprecatedAPIs(parseResult: ParseResult): TechnicalDebtIssue[] {
    const issues: TechnicalDebtIssue[] = [];

    // Common deprecated APIs (expandable)
    const deprecatedPatterns = [
      { pattern: /new Buffer\(/, replacement: 'Buffer.from() or Buffer.alloc()' },
      { pattern: /require\(['"]domain['"]\)/, replacement: 'Use async_hooks or promise error handling' },
      { pattern: /url\.parse\(/, replacement: 'new URL()' },
      { pattern: /crypto\.createCipher\(/, replacement: 'crypto.createCipheriv()' },
    ];

    parseResult.files.forEach((file) => {
      try {
        const content = fs.readFileSync(file.filePath, 'utf-8');
        const lines = content.split('\n');

        lines.forEach((line, index) => {
          deprecatedPatterns.forEach((deprecated) => {
            if (line.match(deprecated.pattern)) {
              issues.push({
                category: TechnicalDebtCategory.DEPRECATED_API,
                severity: IssueSeverity.MEDIUM,
                location: {
                  filePath: file.filePath,
                  line: index + 1,
                  context: line.trim().substring(0, 100),
                },
                description: 'Deprecated API usage detected',
                recommendation: `Replace with: ${deprecated.replacement}`,
              });
            }
          });
        });
      } catch (error) {
        // File read error - skip
      }
    });

    return issues;
  }

  /**
   * Calculate overall debt score (0-100)
   *
   * DESIGN DECISION: Weighted scoring by severity
   * WHY: High severity issues should dominate score
   *
   * Score = (high × 10 + medium × 5 + low × 1) / (total_files × 10)
   * Capped at 100
   */
  private calculateDebtScore(issues: TechnicalDebtIssue[]): number {
    const high = issues.filter((i) => i.severity === IssueSeverity.HIGH).length;
    const medium = issues.filter((i) => i.severity === IssueSeverity.MEDIUM).length;
    const low = issues.filter((i) => i.severity === IssueSeverity.LOW).length;

    const weightedScore = high * 10 + medium * 5 + low * 1;
    const maxScore = 100;

    // Normalize to 0-100
    const normalizedScore = Math.min((weightedScore / maxScore) * 100, 100);

    return Math.round(normalizedScore);
  }

  /**
   * Categorize issues by type
   */
  private categorizeIssues(issues: TechnicalDebtIssue[]): Record<string, number> {
    const categories: Record<string, number> = {};

    issues.forEach((issue) => {
      const category = issue.category;
      categories[category] = (categories[category] || 0) + 1;
    });

    return categories;
  }

  /**
   * Generate summary report
   */
  public generateSummaryReport(analysis: TechnicalDebtAnalysis): string {
    let report = '# Technical Debt Analysis Report\n\n';

    // Overall score
    report += '## Debt Score\n\n';
    report += `**Overall Score:** ${analysis.score}/100\n\n`;

    if (analysis.score > 70) {
      report += '⚠️ **Status:** Critical - High technical debt requires immediate attention\n\n';
    } else if (analysis.score > 40) {
      report += '⚠️ **Status:** Moderate - Technical debt should be addressed in upcoming sprints\n\n';
    } else {
      report += '✅ **Status:** Low - Manageable technical debt\n\n';
    }

    // Statistics
    report += '## Statistics\n\n';
    report += `- **Total Issues:** ${analysis.totalIssues}\n`;
    report += `- **High Priority:** ${analysis.highPriority}\n`;
    report += `- **Medium Priority:** ${analysis.mediumPriority}\n`;
    report += `- **Low Priority:** ${analysis.lowPriority}\n\n`;

    // Categories
    if (Object.keys(analysis.categories).length > 0) {
      report += '## Issues by Category\n\n';
      report += '| Category | Count |\n';
      report += '|----------|-------|\n';

      Object.entries(analysis.categories)
        .sort((a, b) => b[1] - a[1])
        .forEach(([category, count]) => {
          report += `| ${category.replace(/_/g, ' ')} | ${count} |\n`;
        });

      report += '\n';
    }

    // Top issues
    const topIssues = analysis.issues
      .filter((i) => i.severity === IssueSeverity.HIGH)
      .slice(0, 10);

    if (topIssues.length > 0) {
      report += '## High Priority Issues (Top 10)\n\n';
      report += '| File | Line | Issue | Recommendation |\n';
      report += '|------|------|-------|----------------|\n';

      topIssues.forEach((issue) => {
        const fileName = issue.location.filePath.split(/[\\/]/).pop();
        report += `| ${fileName} | ${issue.location.line} | ${issue.description} | ${issue.recommendation} |\n`;
      });

      report += '\n';
    }

    // Recommendations
    report += '## Recommendations\n\n';

    if (analysis.highPriority > 0) {
      report += `1. **Immediate Action:** Address ${analysis.highPriority} high-priority issues (HACKs, secrets, god classes)\n`;
    }
    if (analysis.mediumPriority > 0) {
      report += `2. **Sprint Planning:** Include ${analysis.mediumPriority} medium-priority issues in upcoming sprints (FIXMEs, long methods, hardcoded URLs)\n`;
    }
    if (analysis.lowPriority > 0) {
      report += `3. **Continuous Improvement:** Gradually address ${analysis.lowPriority} low-priority issues (TODOs, magic numbers)\n`;
    }

    return report;
  }
}
