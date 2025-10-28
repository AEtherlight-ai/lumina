/**
 * Chain of Thought Documenter
 *
 * DESIGN DECISION: Extract and document analysis decisions with full reasoning
 * WHY: Chain of Thought documentation enables AI understanding and knowledge transfer
 *
 * REASONING CHAIN:
 * 1. Analyze code analysis results for key decisions
 * 2. Extract design patterns, architecture choices, refactoring decisions
 * 3. Generate DESIGN DECISION, WHY, REASONING CHAIN for each
 * 4. Create comprehensive CoT documentation with code references
 * 5. Include evidence, alternatives considered, trade-offs
 * 6. Result: Complete Chain of Thought documentation for target application
 *
 * PATTERN: Pattern-ANALYZER-005 (Chain of Thought Documentation Generation)
 */

import {
  AnalysisResult,
  ArchitectureAnalysis,
  ComplexityAnalysis,
  TechnicalDebtAnalysis,
  ArchitecturePattern,
  ComponentType,
  TechnicalDebtCategory,
  ComplexityIssue,
  TechnicalDebtIssue,
} from '../analyzers/types';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Chain of Thought decision
 */
export interface ChainOfThoughtDecision {
  id: string; // CoT-001
  title: string;
  category: DecisionCategory;
  designDecision: string;
  why: string;
  reasoningChain: string[];
  evidence: string[];
  alternativesConsidered?: string[];
  tradeOffs?: string[];
  impact: DecisionImpact;
  confidence: number; // 0.0 to 1.0
  codeReferences: CodeReference[];
  relatedDecisions: string[];
}

/**
 * Decision categories
 */
export enum DecisionCategory {
  ARCHITECTURE = 'Architecture',
  REFACTORING = 'Refactoring',
  PERFORMANCE = 'Performance',
  SECURITY = 'Security',
  TESTING = 'Testing',
  DATA_MODEL = 'Data Model',
  API_DESIGN = 'API Design',
  ERROR_HANDLING = 'Error Handling',
}

/**
 * Decision impact
 */
export enum DecisionImpact {
  HIGH = 'High',
  MEDIUM = 'Medium',
  LOW = 'Low',
}

/**
 * Code reference
 */
export interface CodeReference {
  filePath: string;
  lineStart?: number;
  lineEnd?: number;
  snippet?: string;
  description: string;
}

/**
 * CoT documentation options
 */
export interface CoTDocumenterOptions {
  outputDir?: string; // Default: docs/chain-of-thought
  includeCodeSnippets?: boolean; // Default: true
  minConfidence?: number; // Default: 0.7
  maxDecisions?: number; // Default: 50
}

export class CoTDocumenter {
  private options: Required<CoTDocumenterOptions>;
  private decisionCounter: number = 1;

  constructor(options: CoTDocumenterOptions = {}) {
    this.options = {
      outputDir: options.outputDir ?? 'docs/chain-of-thought',
      includeCodeSnippets: options.includeCodeSnippets ?? true,
      minConfidence: options.minConfidence ?? 0.7,
      maxDecisions: options.maxDecisions ?? 50,
    };
  }

  /**
   * Extract Chain of Thought decisions from analysis
   *
   * DESIGN DECISION: Extract decisions from multiple analysis dimensions
   * WHY: Complete understanding requires architecture, complexity, and debt analysis
   */
  async extractDecisions(analysis: AnalysisResult): Promise<ChainOfThoughtDecision[]> {
    const architecture = this.getArchitecture(analysis);
    const complexity = this.getComplexity(analysis);
    const technicalDebt = this.getTechnicalDebt(analysis);

    const decisions: ChainOfThoughtDecision[] = [];

    // Extract architecture decisions
    const archDecisions = this.extractArchitectureDecisions(architecture, analysis);
    decisions.push(...archDecisions);

    // Extract refactoring decisions
    const refactoringDecisions = this.extractRefactoringDecisions(
      complexity,
      technicalDebt,
      analysis
    );
    decisions.push(...refactoringDecisions);

    // Extract performance decisions
    const perfDecisions = this.extractPerformanceDecisions(complexity, analysis);
    decisions.push(...perfDecisions);

    // Extract technical debt decisions
    const debtDecisions = this.extractDebtDecisions(technicalDebt, analysis);
    decisions.push(...debtDecisions);

    // Sort by confidence and impact
    decisions.sort((a, b) => {
      // Sort by impact first (HIGH > MEDIUM > LOW)
      const impactOrder = { High: 3, Medium: 2, Low: 1 };
      const impactDiff = impactOrder[b.impact] - impactOrder[a.impact];
      if (impactDiff !== 0) return impactDiff;

      // Then by confidence
      return b.confidence - a.confidence;
    });

    // Filter by confidence and limit
    const filtered = decisions
      .filter((d) => d.confidence >= this.options.minConfidence)
      .slice(0, this.options.maxDecisions);

    return filtered;
  }

  /**
   * Generate comprehensive Chain of Thought documentation
   */
  async generateDocumentation(
    decisions: ChainOfThoughtDecision[],
    repositoryName: string
  ): Promise<string> {
    const outputDir = this.options.outputDir;
    await fs.mkdir(outputDir, { recursive: true });

    // Generate main index file
    const indexPath = path.join(outputDir, 'README.md');
    const indexContent = this.generateIndexMarkdown(decisions, repositoryName);
    await fs.writeFile(indexPath, indexContent, 'utf-8');

    // Generate individual decision files
    for (const decision of decisions) {
      const fileName = `${decision.id}.md`;
      const filePath = path.join(outputDir, fileName);
      const content = this.generateDecisionMarkdown(decision, repositoryName);
      await fs.writeFile(filePath, content, 'utf-8');
    }

    return indexPath;
  }

  /**
   * Extract architecture decisions
   */
  private extractArchitectureDecisions(
    architecture: ArchitectureAnalysis,
    analysis: AnalysisResult
  ): ChainOfThoughtDecision[] {
    const decisions: ChainOfThoughtDecision[] = [];

    // Main architecture pattern decision
    const archDecision: ChainOfThoughtDecision = {
      id: this.generateDecisionId(),
      title: `Use ${this.getPatternName(architecture.pattern)} Architecture`,
      category: DecisionCategory.ARCHITECTURE,
      designDecision: `Implement ${this.getPatternName(architecture.pattern)} architectural pattern`,
      why: `Detected with ${(architecture.confidence * 100).toFixed(1)}% confidence based on code structure`,
      reasoningChain: [
        `Analyzed codebase structure and component relationships`,
        `Identified ${architecture.layers.length} distinct layers`,
        `Found ${architecture.components.length} components`,
        `Detected ${architecture.relationships.length} relationships between components`,
        `Pattern confidence: ${(architecture.confidence * 100).toFixed(1)}%`,
      ],
      evidence: [
        `${architecture.layers.length} layers detected: ${architecture.layers.map((l) => l.name).join(', ')}`,
        `${architecture.components.length} components analyzed`,
        `${architecture.relationships.length} component relationships mapped`,
      ],
      alternativesConsidered: this.getArchitectureAlternatives(architecture.pattern),
      tradeOffs: this.getArchitectureTradeOffs(architecture.pattern),
      impact: DecisionImpact.HIGH,
      confidence: architecture.confidence,
      codeReferences: architecture.layers.map((layer) => ({
        filePath: layer.files[0] || 'unknown',
        description: `${layer.name} layer (${layer.files.length} files)`,
      })),
      relatedDecisions: [],
    };

    decisions.push(archDecision);

    // Component organization decisions
    architecture.components.forEach((component, index) => {
      if (index < 5) {
        // Limit to top 5 components
        const componentDecision: ChainOfThoughtDecision = {
          id: this.generateDecisionId(),
          title: `${component.name} Component Design`,
          category: DecisionCategory.ARCHITECTURE,
          designDecision: `Implement ${component.name} as ${component.type}`,
          why: `Separates ${component.responsibilities.join(', ')} concerns`,
          reasoningChain: [
            `Component type: ${component.type}`,
            `Responsibilities: ${component.responsibilities.join(', ')}`,
            `Dependencies: ${component.dependencies.length} dependencies`,
            `Files: ${component.files.length} files`,
          ],
          evidence: component.files.map((file) => `Implemented in ${file}`),
          impact: DecisionImpact.MEDIUM,
          confidence: 0.8,
          codeReferences: component.files.map((file) => ({
            filePath: file,
            description: `${component.name} implementation`,
          })),
          relatedDecisions: [archDecision.id],
        };

        decisions.push(componentDecision);
      }
    });

    return decisions;
  }

  /**
   * Extract refactoring decisions
   */
  private extractRefactoringDecisions(
    complexity: ComplexityAnalysis,
    technicalDebt: TechnicalDebtAnalysis,
    analysis: AnalysisResult
  ): ChainOfThoughtDecision[] {
    const decisions: ChainOfThoughtDecision[] = [];

    // High complexity refactoring
    complexity.functionsOverThreshold.forEach((func, index) => {
      if (index < 5) {
        // Top 5 refactoring targets
        const decision: ChainOfThoughtDecision = {
          id: this.generateDecisionId(),
          title: `Refactor ${func.functionName} (Complexity: ${func.complexity})`,
          category: DecisionCategory.REFACTORING,
          designDecision: func.recommendation,
          why: `Reduce complexity from ${func.complexity} to below threshold (${func.threshold})`,
          reasoningChain: [
            `Current complexity: ${func.complexity} (threshold: ${func.threshold})`,
            `Complexity ratio: ${(func.complexity / func.threshold).toFixed(1)}x over threshold`,
            `Refactoring will improve maintainability and testability`,
            `Recommendation: ${func.recommendation}`,
          ],
          evidence: [`Function ${func.functionName} at ${func.filePath}:${func.line}`],
          alternativesConsidered: [
            'Leave as-is (technical debt accumulates)',
            'Rewrite entirely (high risk, high cost)',
            'Extract sub-functions (recommended)',
          ],
          tradeOffs: [
            'Refactoring time vs. future maintenance cost',
            'Code clarity vs. execution performance',
          ],
          impact: func.complexity > func.threshold * 2 ? DecisionImpact.HIGH : DecisionImpact.MEDIUM,
          confidence: 0.85,
          codeReferences: [
            {
              filePath: func.filePath,
              lineStart: func.line,
              description: `${func.functionName} - Complexity: ${func.complexity}`,
            },
          ],
          relatedDecisions: [],
        };

        decisions.push(decision);
      }
    });

    return decisions;
  }

  /**
   * Extract performance decisions
   */
  private extractPerformanceDecisions(
    complexity: ComplexityAnalysis,
    analysis: AnalysisResult
  ): ChainOfThoughtDecision[] {
    const decisions: ChainOfThoughtDecision[] = [];

    // Average complexity decision
    if (complexity.averageComplexity > 10) {
      const decision: ChainOfThoughtDecision = {
        id: this.generateDecisionId(),
        title: 'Reduce Average Code Complexity',
        category: DecisionCategory.PERFORMANCE,
        designDecision: `Target average complexity reduction from ${complexity.averageComplexity.toFixed(1)} to <10`,
        why: 'Lower complexity improves performance, maintainability, and reduces bugs',
        reasoningChain: [
          `Current average complexity: ${complexity.averageComplexity.toFixed(1)}`,
          `Median complexity: ${complexity.medianComplexity}`,
          `Max complexity: ${complexity.maxComplexity}`,
          `${complexity.functionsOverThreshold.length} functions over threshold`,
          'Target: Reduce average below 10',
        ],
        evidence: [
          `${complexity.functionsOverThreshold.length} high-complexity functions identified`,
          `Average: ${complexity.averageComplexity.toFixed(1)}`,
        ],
        impact: DecisionImpact.HIGH,
        confidence: 0.9,
        codeReferences: [],
        relatedDecisions: [],
      };

      decisions.push(decision);
    }

    return decisions;
  }

  /**
   * Extract technical debt decisions
   */
  private extractDebtDecisions(
    technicalDebt: TechnicalDebtAnalysis,
    analysis: AnalysisResult
  ): ChainOfThoughtDecision[] {
    const decisions: ChainOfThoughtDecision[] = [];

    // High-priority debt
    if (technicalDebt.highPriority > 0) {
      const decision: ChainOfThoughtDecision = {
        id: this.generateDecisionId(),
        title: `Address ${technicalDebt.highPriority} High-Priority Technical Debt Items`,
        category: DecisionCategory.REFACTORING,
        designDecision: 'Prioritize high-priority technical debt resolution',
        why: `${technicalDebt.highPriority} critical issues identified (debt score: ${technicalDebt.score})`,
        reasoningChain: [
          `Total technical debt: ${technicalDebt.totalIssues} issues`,
          `High priority: ${technicalDebt.highPriority} issues`,
          `Medium priority: ${technicalDebt.mediumPriority} issues`,
          `Low priority: ${technicalDebt.lowPriority} issues`,
          `Debt score: ${technicalDebt.score}/100`,
        ],
        evidence: this.getDebtCategoryBreakdown(technicalDebt),
        impact: DecisionImpact.HIGH,
        confidence: 0.9,
        codeReferences: [],
        relatedDecisions: [],
      };

      decisions.push(decision);
    }

    // Category-specific decisions
    Object.entries(technicalDebt.categories).forEach(([category, count]) => {
      if (count > 10) {
        // Focus on categories with >10 issues
        const decision: ChainOfThoughtDecision = {
          id: this.generateDecisionId(),
          title: `Address ${count} ${category} Issues`,
          category: DecisionCategory.REFACTORING,
          designDecision: `Systematically resolve ${category} technical debt`,
          why: `${count} instances detected - pattern indicates systemic issue`,
          reasoningChain: [
            `${count} ${category} issues identified`,
            `Represents ${((count / technicalDebt.totalIssues) * 100).toFixed(1)}% of total debt`,
            'Systematic resolution more efficient than ad-hoc fixes',
          ],
          evidence: [`${count} instances of ${category} in codebase`],
          impact: count > 20 ? DecisionImpact.HIGH : DecisionImpact.MEDIUM,
          confidence: 0.8,
          codeReferences: [],
          relatedDecisions: [],
        };

        decisions.push(decision);
      }
    });

    return decisions;
  }

  /**
   * Generate index markdown
   */
  private generateIndexMarkdown(
    decisions: ChainOfThoughtDecision[],
    repositoryName: string
  ): string {
    const categoryCounts = this.getCategoryCounts(decisions);
    const impactCounts = this.getImpactCounts(decisions);

    return `# ${repositoryName} - Chain of Thought Documentation

**Generated:** ${new Date().toISOString()}
**Total Decisions:** ${decisions.length}

---

## Overview

This documentation captures key architectural, refactoring, and design decisions made during code analysis of ${repositoryName}. Each decision includes:

- **DESIGN DECISION:** What approach was taken
- **WHY:** Reasoning behind the decision
- **REASONING CHAIN:** Step-by-step analysis
- **EVIDENCE:** Supporting data from code analysis
- **ALTERNATIVES CONSIDERED:** Other options evaluated
- **TRADE-OFFS:** Costs and benefits

---

## Decision Summary

### By Category

${Object.entries(categoryCounts)
  .sort((a, b) => b[1] - a[1])
  .map(([category, count]) => `- **${category}:** ${count} decisions`)
  .join('\n')}

### By Impact

${Object.entries(impactCounts)
  .map(([impact, count]) => `- **${impact}:** ${count} decisions`)
  .join('\n')}

---

## Decisions

${decisions
  .map(
    (decision) => `### ${decision.id}: ${decision.title}

**Category:** ${decision.category}
**Impact:** ${decision.impact}
**Confidence:** ${(decision.confidence * 100).toFixed(1)}%

${decision.designDecision}

[Read full decision →](./${decision.id}.md)

---
`
  )
  .join('\n')}

## Related Documents

- Architecture Analysis
- Complexity Analysis
- Technical Debt Analysis
- Pattern Library

---

**Generated with ÆtherLight Code Analyzer**
`;
  }

  /**
   * Generate decision markdown
   */
  private generateDecisionMarkdown(
    decision: ChainOfThoughtDecision,
    repositoryName: string
  ): string {
    return `# ${decision.title}

**ID:** ${decision.id}
**Category:** ${decision.category}
**Impact:** ${decision.impact}
**Confidence:** ${(decision.confidence * 100).toFixed(1)}%

---

## Chain of Thought

**DESIGN DECISION:** ${decision.designDecision}

**WHY:** ${decision.why}

**REASONING CHAIN:**
${decision.reasoningChain.map((step, i) => `${i + 1}. ${step}`).join('\n')}

---

## Evidence

${decision.evidence.map((e) => `- ${e}`).join('\n')}

---

${decision.alternativesConsidered && decision.alternativesConsidered.length > 0 ? `## Alternatives Considered\n\n${decision.alternativesConsidered.map((alt) => `- ${alt}`).join('\n')}\n\n---\n\n` : ''}${decision.tradeOffs && decision.tradeOffs.length > 0 ? `## Trade-Offs\n\n${decision.tradeOffs.map((tradeoff) => `- ${tradeoff}`).join('\n')}\n\n---\n\n` : ''}## Code References

${decision.codeReferences.length > 0 ? decision.codeReferences.map((ref) => `- **${ref.filePath}**${ref.lineStart ? `:${ref.lineStart}` : ''} - ${ref.description}`).join('\n') : 'No specific code references'}

---

${decision.relatedDecisions.length > 0 ? `## Related Decisions\n\n${decision.relatedDecisions.map((id) => `- [${id}](./${id}.md)`).join('\n')}\n\n---\n\n` : ''}## Metadata

- **Repository:** ${repositoryName}
- **Impact:** ${decision.impact}
- **Confidence:** ${(decision.confidence * 100).toFixed(1)}%
- **Category:** ${decision.category}

---

**Generated with ÆtherLight Code Analyzer**
`;
  }

  /**
   * Helper methods
   */

  private generateDecisionId(): string {
    const id = `CoT-${String(this.decisionCounter).padStart(3, '0')}`;
    this.decisionCounter++;
    return id;
  }

  private getPatternName(pattern: ArchitecturePattern): string {
    const names: Record<ArchitecturePattern, string> = {
      [ArchitecturePattern.MVC]: 'MVC',
      [ArchitecturePattern.MVVM]: 'MVVM',
      [ArchitecturePattern.CLEAN]: 'Clean Architecture',
      [ArchitecturePattern.LAYERED]: 'Layered Architecture',
      [ArchitecturePattern.HEXAGONAL]: 'Hexagonal Architecture',
      [ArchitecturePattern.MICROSERVICES]: 'Microservices',
      [ArchitecturePattern.MONOLITH]: 'Monolith',
      [ArchitecturePattern.UNKNOWN]: 'Unknown',
    };

    return names[pattern] || 'Unknown';
  }

  private getArchitectureAlternatives(pattern: ArchitecturePattern): string[] {
    const alternatives: Record<ArchitecturePattern, string[]> = {
      [ArchitecturePattern.MVC]: [
        'MVVM (Model-View-ViewModel)',
        'Clean Architecture',
        'Layered Architecture',
      ],
      [ArchitecturePattern.MVVM]: ['MVC', 'Clean Architecture'],
      [ArchitecturePattern.CLEAN]: ['Hexagonal Architecture', 'Layered Architecture'],
      [ArchitecturePattern.HEXAGONAL]: ['Clean Architecture', 'Layered Architecture'],
      [ArchitecturePattern.LAYERED]: ['Clean Architecture', 'MVC'],
      [ArchitecturePattern.MICROSERVICES]: ['Monolith', 'Modular Monolith'],
      [ArchitecturePattern.MONOLITH]: ['Microservices', 'Modular Monolith'],
      [ArchitecturePattern.UNKNOWN]: [],
    };

    return alternatives[pattern] || [];
  }

  private getArchitectureTradeOffs(pattern: ArchitecturePattern): string[] {
    const tradeoffs: Record<ArchitecturePattern, string[]> = {
      [ArchitecturePattern.MVC]: [
        'Simplicity vs. Scalability',
        'Tight coupling vs. Clear separation',
      ],
      [ArchitecturePattern.MVVM]: ['Complexity vs. Testability', 'Learning curve vs. Benefits'],
      [ArchitecturePattern.CLEAN]: [
        'Boilerplate vs. Maintainability',
        'Initial effort vs. Long-term benefits',
      ],
      [ArchitecturePattern.HEXAGONAL]: [
        'Abstraction overhead vs. Flexibility',
        'More files vs. Better testability',
      ],
      [ArchitecturePattern.LAYERED]: [
        'Layer overhead vs. Separation of concerns',
        'Performance vs. Maintainability',
      ],
      [ArchitecturePattern.MICROSERVICES]: [
        'Distributed complexity vs. Scalability',
        'Operational overhead vs. Independence',
      ],
      [ArchitecturePattern.MONOLITH]: [
        'Simplicity vs. Scalability limits',
        'Deployment ease vs. Team coordination',
      ],
      [ArchitecturePattern.UNKNOWN]: [],
    };

    return tradeoffs[pattern] || [];
  }

  private getDebtCategoryBreakdown(debt: TechnicalDebtAnalysis): string[] {
    return Object.entries(debt.categories)
      .filter(([_, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([category, count]) => `${count} ${category} issues`);
  }

  private getCategoryCounts(decisions: ChainOfThoughtDecision[]): Record<string, number> {
    const counts: Record<string, number> = {};

    decisions.forEach((decision) => {
      counts[decision.category] = (counts[decision.category] || 0) + 1;
    });

    return counts;
  }

  private getImpactCounts(decisions: ChainOfThoughtDecision[]): Record<string, number> {
    const counts: Record<string, number> = {};

    decisions.forEach((decision) => {
      counts[decision.impact] = (counts[decision.impact] || 0) + 1;
    });

    return counts;
  }

  private getArchitecture(analysis: AnalysisResult): ArchitectureAnalysis {
    const analyzer = analysis.analyzers.find((a) => a.name === 'architecture');
    return analyzer?.data as ArchitectureAnalysis;
  }

  private getComplexity(analysis: AnalysisResult): ComplexityAnalysis {
    const analyzer = analysis.analyzers.find((a) => a.name === 'complexity');
    return analyzer?.data as ComplexityAnalysis;
  }

  private getTechnicalDebt(analysis: AnalysisResult): TechnicalDebtAnalysis {
    const analyzer = analysis.analyzers.find((a) => a.name === 'technicalDebt');
    return analyzer?.data as TechnicalDebtAnalysis;
  }
}
