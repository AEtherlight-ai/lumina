/**
 * DESIGN DECISION: Cyclomatic complexity analysis with refactoring recommendations
 * WHY: High complexity = harder to maintain, more bugs, longer onboarding time
 *
 * REASONING CHAIN:
 * 1. Extract complexity scores from parsed functions/methods
 * 2. Calculate statistics (average, median, max, percentiles)
 * 3. Identify functions exceeding threshold (>15 by default)
 * 4. Generate complexity heatmap by file
 * 5. Recommend refactorings (Extract Method, Split Class, etc.)
 * 6. Result: Clear prioritization of technical debt reduction
 *
 * PATTERN: Pattern-ANALYZER-001 (AST-Based Code Analysis)
 * RELATED: TypeScript Parser (calculates complexity), Rust Parser
 * PERFORMANCE: <1s for 100k LOC
 */

import { ParseResult, ParsedFile, ElementType } from '../parsers/types';
import {
  ComplexityAnalysis,
  ComplexityIssue,
  ComplexityHeatmap,
  AnalyzerResult,
  Issue,
  IssueType,
  IssueSeverity,
  IssueEffort,
  IssueImpact,
} from './types';

export class ComplexityAnalyzer {
  private complexityThreshold: number;

  constructor(complexityThreshold: number = 15) {
    /**
     * DESIGN DECISION: Default threshold of 15
     * WHY: Industry standard (McCabe's original threshold)
     * - 1-10: Simple, low risk
     * - 11-20: Moderate, medium risk
     * - 21-50: Complex, high risk
     * - 50+: Untestable, very high risk
     */
    this.complexityThreshold = complexityThreshold;
  }

  /**
   * Analyze complexity of parsed codebase
   *
   * DESIGN DECISION: Extract complexity from parser results, no re-parsing
   * WHY: TypeScript parser already calculated complexity - reuse work
   */
  public analyze(parseResult: ParseResult): AnalyzerResult {
    const startTime = Date.now();

    // Extract all complexity scores
    const complexityScores = this.extractComplexityScores(parseResult);

    // Calculate statistics
    const statistics = this.calculateStatistics(complexityScores);

    // Identify functions over threshold
    const functionsOverThreshold = this.identifyHighComplexityFunctions(
      parseResult,
      this.complexityThreshold
    );

    // Generate heatmap by file
    const heatmap = this.generateComplexityHeatmap(parseResult);

    // Create analysis result
    const analysis: ComplexityAnalysis = {
      averageComplexity: statistics.average,
      medianComplexity: statistics.median,
      maxComplexity: statistics.max,
      functionsOverThreshold,
      heatmap,
    };

    return {
      name: 'complexity',
      version: '1.0.0',
      executionTimeMs: Date.now() - startTime,
      data: analysis,
    };
  }

  /**
   * Extract complexity scores from all functions/methods
   */
  private extractComplexityScores(parseResult: ParseResult): number[] {
    const scores: number[] = [];

    parseResult.files.forEach((file) => {
      file.elements.forEach((elem) => {
        if (elem.type === ElementType.FUNCTION || elem.type === ElementType.METHOD) {
          const funcElem = elem as any;
          if (funcElem.complexity !== undefined) {
            scores.push(funcElem.complexity);
          }
        }
      });
    });

    return scores;
  }

  /**
   * Calculate statistical measures
   *
   * DESIGN DECISION: Median more useful than average for skewed distributions
   * WHY: One 100-complexity function shouldn't skew average
   */
  private calculateStatistics(scores: number[]): {
    average: number;
    median: number;
    max: number;
    min: number;
  } {
    if (scores.length === 0) {
      return { average: 0, median: 0, max: 0, min: 0 };
    }

    const sorted = [...scores].sort((a, b) => a - b);
    const sum = scores.reduce((a, b) => a + b, 0);

    return {
      average: sum / scores.length,
      median: sorted[Math.floor(sorted.length / 2)],
      max: sorted[sorted.length - 1],
      min: sorted[0],
    };
  }

  /**
   * Identify functions exceeding complexity threshold
   *
   * REASONING CHAIN:
   * 1. Find all functions with complexity > threshold
   * 2. Sort by complexity (highest first)
   * 3. Generate refactoring recommendations
   * 4. Prioritize by complexity × LOC (bigger impact)
   */
  private identifyHighComplexityFunctions(
    parseResult: ParseResult,
    threshold: number
  ): ComplexityIssue[] {
    const issues: ComplexityIssue[] = [];

    parseResult.files.forEach((file) => {
      file.elements.forEach((elem) => {
        if (elem.type === ElementType.FUNCTION || elem.type === ElementType.METHOD) {
          const funcElem = elem as any;
          if (funcElem.complexity !== undefined && funcElem.complexity > threshold) {
            issues.push({
              functionName: elem.name,
              filePath: file.filePath,
              line: elem.location.line,
              complexity: funcElem.complexity,
              threshold,
              recommendation: this.generateRefactoringRecommendation(funcElem.complexity),
            });
          }
        }
      });
    });

    // Sort by complexity (highest first)
    return issues.sort((a, b) => b.complexity - a.complexity);
  }

  /**
   * Generate refactoring recommendation based on complexity level
   */
  private generateRefactoringRecommendation(complexity: number): string {
    if (complexity > 50) {
      return 'Critical: Complete rewrite recommended. Break into multiple smaller functions (target <10 complexity each).';
    } else if (complexity > 30) {
      return 'High: Extract major code blocks into separate functions. Consider applying Strategy or Command pattern.';
    } else if (complexity > 20) {
      return 'Medium: Extract nested conditionals and loops into helper functions. Reduce nesting depth.';
    } else {
      return 'Low: Extract 1-2 code blocks into helper functions to reduce complexity below 15.';
    }
  }

  /**
   * Generate complexity heatmap by file
   *
   * DESIGN DECISION: File-level aggregation for sprint planning
   * WHY: Sprint tasks operate on files, not individual functions
   */
  private generateComplexityHeatmap(parseResult: ParseResult): ComplexityHeatmap[] {
    const heatmap: ComplexityHeatmap[] = [];

    parseResult.files.forEach((file) => {
      const complexities: number[] = [];

      file.elements.forEach((elem) => {
        if (elem.type === ElementType.FUNCTION || elem.type === ElementType.METHOD) {
          const funcElem = elem as any;
          if (funcElem.complexity !== undefined) {
            complexities.push(funcElem.complexity);
          }
        }
      });

      if (complexities.length > 0) {
        const sum = complexities.reduce((a, b) => a + b, 0);
        const avgComplexity = sum / complexities.length;
        const maxComplexity = Math.max(...complexities);

        heatmap.push({
          filePath: file.filePath,
          averageComplexity: avgComplexity,
          maxComplexity,
          functionCount: complexities.length,
        });
      }
    });

    // Sort by average complexity (highest first)
    return heatmap.sort((a, b) => b.averageComplexity - a.averageComplexity);
  }

  /**
   * Generate issues for high-complexity functions
   *
   * DESIGN DECISION: Convert complexity analysis to generic Issue format
   * WHY: Enables aggregation with other analyzer results
   */
  public generateIssues(analysis: ComplexityAnalysis): Issue[] {
    return analysis.functionsOverThreshold.map((func) => ({
      type: IssueType.COMPLEXITY,
      severity: this.getSeverity(func.complexity),
      location: {
        filePath: func.filePath,
        line: func.line,
      },
      message: `Function '${func.functionName}' has complexity ${func.complexity} (threshold: ${func.threshold})`,
      recommendation: func.recommendation,
      effort: this.getEffort(func.complexity),
      impact: this.getImpact(func.complexity),
    }));
  }

  /**
   * Map complexity to severity
   */
  private getSeverity(complexity: number): IssueSeverity {
    if (complexity > 30) return IssueSeverity.HIGH;
    if (complexity > 20) return IssueSeverity.MEDIUM;
    return IssueSeverity.LOW;
  }

  /**
   * Estimate refactoring effort based on complexity
   */
  private getEffort(complexity: number): IssueEffort {
    if (complexity > 40) return IssueEffort.HIGH; // >1 week
    if (complexity > 25) return IssueEffort.MEDIUM; // 1-3 days
    return IssueEffort.LOW; // <1 day
  }

  /**
   * Estimate impact of refactoring
   */
  private getImpact(complexity: number): IssueImpact {
    if (complexity > 40) return IssueImpact.HIGH; // Critical maintainability issue
    if (complexity > 25) return IssueImpact.MEDIUM; // Moderate improvement
    return IssueImpact.LOW; // Nice to have
  }

  /**
   * Generate summary report
   */
  public generateSummaryReport(analysis: ComplexityAnalysis): string {
    let report = '# Complexity Analysis Report\n\n';

    // Overall statistics
    report += '## Overall Statistics\n\n';
    report += `- **Average Complexity:** ${analysis.averageComplexity.toFixed(2)}\n`;
    report += `- **Median Complexity:** ${analysis.medianComplexity}\n`;
    report += `- **Max Complexity:** ${analysis.maxComplexity}\n`;
    report += `- **Functions Over Threshold:** ${analysis.functionsOverThreshold.length}\n\n`;

    // High-complexity functions
    if (analysis.functionsOverThreshold.length > 0) {
      report += '## High-Complexity Functions (Refactoring Targets)\n\n';
      report += '| Function | File | Complexity | Recommendation |\n';
      report += '|----------|------|------------|----------------|\n';

      analysis.functionsOverThreshold.slice(0, 10).forEach((func) => {
        const fileName = func.filePath.split(/[\\/]/).pop();
        report += `| ${func.functionName} | ${fileName}:${func.line} | ${func.complexity} | ${func.recommendation} |\n`;
      });

      if (analysis.functionsOverThreshold.length > 10) {
        report += `\n*... and ${analysis.functionsOverThreshold.length - 10} more functions*\n`;
      }

      report += '\n';
    }

    // Complexity heatmap (top 10 files)
    if (analysis.heatmap.length > 0) {
      report += '## Complexity Heatmap (Top 10 Files)\n\n';
      report += '| File | Avg Complexity | Max Complexity | Functions |\n';
      report += '|------|----------------|----------------|------------|\n';

      analysis.heatmap.slice(0, 10).forEach((entry) => {
        const fileName = entry.filePath.split(/[\\/]/).pop();
        report += `| ${fileName} | ${entry.averageComplexity.toFixed(2)} | ${entry.maxComplexity} | ${entry.functionCount} |\n`;
      });

      report += '\n';
    }

    // Recommendations
    report += '## Recommendations\n\n';

    const highCount = analysis.functionsOverThreshold.filter((f) => f.complexity > 30).length;
    const mediumCount = analysis.functionsOverThreshold.filter(
      (f) => f.complexity > 20 && f.complexity <= 30
    ).length;
    const lowCount = analysis.functionsOverThreshold.filter(
      (f) => f.complexity <= 20
    ).length;

    if (highCount > 0) {
      report += `1. **High Priority:** Refactor ${highCount} functions with complexity >30 (estimated ${highCount * 2} days)\n`;
    }
    if (mediumCount > 0) {
      report += `2. **Medium Priority:** Refactor ${mediumCount} functions with complexity 20-30 (estimated ${mediumCount} days)\n`;
    }
    if (lowCount > 0) {
      report += `3. **Low Priority:** Refactor ${lowCount} functions with complexity 15-20 (estimated ${lowCount * 0.5} days)\n`;
    }

    if (analysis.functionsOverThreshold.length === 0) {
      report += '*No functions exceed complexity threshold. Codebase is well-structured.*\n';
    }

    return report;
  }
}
