/**
 * Chain of Thought Documenter Tests
 *
 * Tests for CoT decision extraction and documentation generation
 */

import {
  CoTDocumenter,
  ChainOfThoughtDecision,
  DecisionCategory,
  DecisionImpact,
} from './cot-documenter';
import {
  AnalysisResult,
  ArchitecturePattern,
  ComponentType,
  ArchitectureAnalysis,
  ComplexityAnalysis,
  TechnicalDebtAnalysis,
  TechnicalDebtCategory,
  IssueSeverity,
} from '../analyzers/types';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('CoTDocumenter', () => {
  let documenter: CoTDocumenter;
  let mockAnalysis: AnalysisResult;

  beforeEach(async () => {
    // Ensure test output directory exists
    await fs.mkdir('test-output/chain-of-thought', { recursive: true });

    documenter = new CoTDocumenter({
      outputDir: 'test-output/chain-of-thought',
      minConfidence: 0.7,
      maxDecisions: 50,
    });

    mockAnalysis = createMockAnalysis();
  });

  afterEach(async () => {
    // Clean up test output (only this test suite's directory)
    try {
      await fs.rm('test-output/chain-of-thought', { recursive: true, force: true });
    } catch (error) {
      // Ignore errors
    }
  });

  describe('extractDecisions', () => {
    it('should extract architecture decisions', async () => {
      const decisions = await documenter.extractDecisions(mockAnalysis);

      const archDecisions = decisions.filter(
        (d) => d.category === DecisionCategory.ARCHITECTURE
      );

      expect(archDecisions.length).toBeGreaterThan(0);

      const mainArch = archDecisions.find((d) => d.title.includes('MVC'));
      expect(mainArch).toBeDefined();
      expect(mainArch!.designDecision).toContain('MVC');
      expect(mainArch!.impact).toBe(DecisionImpact.HIGH);
    });

    it('should extract refactoring decisions', async () => {
      const decisions = await documenter.extractDecisions(mockAnalysis);

      const refactoringDecisions = decisions.filter(
        (d) => d.category === DecisionCategory.REFACTORING
      );

      expect(refactoringDecisions.length).toBeGreaterThan(0);
    });

    it('should extract performance decisions', async () => {
      const decisions = await documenter.extractDecisions(mockAnalysis);

      const perfDecisions = decisions.filter(
        (d) => d.category === DecisionCategory.PERFORMANCE
      );

      // Should have performance decision since avgComplexity > 10
      expect(perfDecisions.length).toBeGreaterThan(0);

      const avgComplexityDecision = perfDecisions.find((d) =>
        d.title.includes('Average Code Complexity')
      );
      expect(avgComplexityDecision).toBeDefined();
    });

    it('should include Chain of Thought elements', async () => {
      const decisions = await documenter.extractDecisions(mockAnalysis);

      decisions.forEach((decision) => {
        expect(decision.designDecision).toBeTruthy();
        expect(decision.why).toBeTruthy();
        expect(decision.reasoningChain.length).toBeGreaterThan(0);
        expect(decision.evidence.length).toBeGreaterThan(0);
      });
    });

    it('should include alternatives and trade-offs', async () => {
      const decisions = await documenter.extractDecisions(mockAnalysis);

      const archDecision = decisions.find((d) => d.category === DecisionCategory.ARCHITECTURE);

      if (archDecision) {
        expect(archDecision.alternativesConsidered).toBeDefined();
        expect(archDecision.alternativesConsidered!.length).toBeGreaterThan(0);
        expect(archDecision.tradeOffs).toBeDefined();
        expect(archDecision.tradeOffs!.length).toBeGreaterThan(0);
      }
    });

    it('should sort by impact and confidence', async () => {
      const decisions = await documenter.extractDecisions(mockAnalysis);

      // Verify HIGH impact decisions come first
      const highImpactIndex = decisions.findIndex((d) => d.impact === DecisionImpact.HIGH);
      const lowImpactIndex = decisions.findIndex((d) => d.impact === DecisionImpact.LOW);

      if (highImpactIndex !== -1 && lowImpactIndex !== -1) {
        expect(highImpactIndex).toBeLessThan(lowImpactIndex);
      }
    });

    it('should filter by confidence', async () => {
      const strictDocumenter = new CoTDocumenter({
        minConfidence: 0.85,
      });

      const decisions = await strictDocumenter.extractDecisions(mockAnalysis);

      decisions.forEach((decision) => {
        expect(decision.confidence).toBeGreaterThanOrEqual(0.85);
      });
    });

    it('should limit number of decisions', async () => {
      const limitedDocumenter = new CoTDocumenter({
        maxDecisions: 5,
      });

      const decisions = await limitedDocumenter.extractDecisions(mockAnalysis);

      expect(decisions.length).toBeLessThanOrEqual(5);
    });

    it('should generate unique decision IDs', async () => {
      const decisions = await documenter.extractDecisions(mockAnalysis);

      const ids = new Set(decisions.map((d) => d.id));

      // All IDs should be unique
      expect(ids.size).toBe(decisions.length);
    });

    it('should include code references', async () => {
      const decisions = await documenter.extractDecisions(mockAnalysis);

      const archDecision = decisions.find((d) => d.category === DecisionCategory.ARCHITECTURE);

      expect(archDecision).toBeDefined();
      expect(archDecision!.codeReferences.length).toBeGreaterThan(0);

      archDecision!.codeReferences.forEach((ref) => {
        expect(ref.filePath).toBeTruthy();
        expect(ref.description).toBeTruthy();
      });
    });
  });

  describe('generateDocumentation', () => {
    it('should generate index file', async () => {
      const decisions = await documenter.extractDecisions(mockAnalysis);
      const indexPath = await documenter.generateDocumentation(decisions, 'TestRepo');

      expect(await fileExists(indexPath)).toBe(true);

      const content = await fs.readFile(indexPath, 'utf-8');
      expect(content).toContain('TestRepo');
      expect(content).toContain('Chain of Thought Documentation');
      expect(content).toContain('## Overview');
      expect(content).toContain('## Decision Summary');
    });

    it('should generate individual decision files', async () => {
      const decisions = await documenter.extractDecisions(mockAnalysis);
      await documenter.generateDocumentation(decisions, 'TestRepo');

      // Check that individual files exist
      for (const decision of decisions.slice(0, 3)) {
        // Check first 3
        const filePath = path.join('test-output/chain-of-thought', `${decision.id}.md`);
        expect(await fileExists(filePath)).toBe(true);

        const content = await fs.readFile(filePath, 'utf-8');
        expect(content).toContain(decision.title);
        expect(content).toContain('DESIGN DECISION:');
        expect(content).toContain('WHY:');
        expect(content).toContain('REASONING CHAIN:');
      }
    });

    it('should include category counts in index', async () => {
      const decisions = await documenter.extractDecisions(mockAnalysis);
      const indexPath = await documenter.generateDocumentation(decisions, 'TestRepo');

      const content = await fs.readFile(indexPath, 'utf-8');

      expect(content).toContain('By Category');
      expect(content).toMatch(/Architecture.*\d+ decisions/);
    });

    it('should include impact counts in index', async () => {
      const decisions = await documenter.extractDecisions(mockAnalysis);
      const indexPath = await documenter.generateDocumentation(decisions, 'TestRepo');

      const content = await fs.readFile(indexPath, 'utf-8');

      expect(content).toContain('By Impact');
      expect(content).toMatch(/High.*\d+ decisions/);
    });

    it('should create output directory if missing', async () => {
      const decisions = await documenter.extractDecisions(mockAnalysis);
      await documenter.generateDocumentation(decisions, 'TestRepo');

      const stats = await fs.stat('test-output/chain-of-thought');
      expect(stats.isDirectory()).toBe(true);
    });

    it('should include evidence in decision files', async () => {
      const decisions = await documenter.extractDecisions(mockAnalysis);
      await documenter.generateDocumentation(decisions, 'TestRepo');

      const decision = decisions[0];
      const filePath = path.join('test-output/chain-of-thought', `${decision.id}.md`);
      const content = await fs.readFile(filePath, 'utf-8');

      expect(content).toContain('## Evidence');
      decision.evidence.forEach((evidence) => {
        expect(content).toContain(evidence);
      });
    });

    it('should include code references with line numbers', async () => {
      const decisions = await documenter.extractDecisions(mockAnalysis);
      await documenter.generateDocumentation(decisions, 'TestRepo');

      // Find decision with code references that have line numbers
      const refactoringDecision = decisions.find(
        (d) =>
          d.category === DecisionCategory.REFACTORING &&
          d.codeReferences.some((ref) => ref.lineStart)
      );

      if (refactoringDecision) {
        const filePath = path.join(
          'test-output/chain-of-thought',
          `${refactoringDecision.id}.md`
        );
        const content = await fs.readFile(filePath, 'utf-8');

        expect(content).toContain('## Code References');
        expect(content).toMatch(/:\d+/); // Should have line numbers
      }
    });

    it('should include alternatives if present', async () => {
      const decisions = await documenter.extractDecisions(mockAnalysis);
      await documenter.generateDocumentation(decisions, 'TestRepo');

      const archDecision = decisions.find(
        (d) =>
          d.category === DecisionCategory.ARCHITECTURE &&
          d.alternativesConsidered &&
          d.alternativesConsidered.length > 0
      );

      if (archDecision) {
        const filePath = path.join('test-output/chain-of-thought', `${archDecision.id}.md`);
        const content = await fs.readFile(filePath, 'utf-8');

        expect(content).toContain('## Alternatives Considered');
      }
    });

    it('should include trade-offs if present', async () => {
      const decisions = await documenter.extractDecisions(mockAnalysis);
      await documenter.generateDocumentation(decisions, 'TestRepo');

      const archDecision = decisions.find(
        (d) =>
          d.category === DecisionCategory.ARCHITECTURE &&
          d.tradeOffs &&
          d.tradeOffs.length > 0
      );

      if (archDecision) {
        const filePath = path.join('test-output/chain-of-thought', `${archDecision.id}.md`);
        const content = await fs.readFile(filePath, 'utf-8');

        expect(content).toContain('## Trade-Offs');
      }
    });
  });

  describe('decision extraction logic', () => {
    it('should extract component decisions for top components', async () => {
      const decisions = await documenter.extractDecisions(mockAnalysis);

      const componentDecisions = decisions.filter(
        (d) =>
          d.category === DecisionCategory.ARCHITECTURE &&
          d.title.includes('Component Design')
      );

      // Should have decisions for UserController, UserModel, AuthUtility (up to 5 components)
      expect(componentDecisions.length).toBeGreaterThan(0);
      expect(componentDecisions.length).toBeLessThanOrEqual(5);
    });

    it('should extract high-complexity refactoring decisions', async () => {
      const decisions = await documenter.extractDecisions(mockAnalysis);

      const refactoringDecisions = decisions.filter(
        (d) => d.category === DecisionCategory.REFACTORING && d.title.includes('Refactor')
      );

      expect(refactoringDecisions.length).toBeGreaterThan(0);

      // Should have decision for processUserData (complexity 45)
      const processUserDecision = refactoringDecisions.find((d) =>
        d.title.includes('processUserData')
      );
      expect(processUserDecision).toBeDefined();
      expect(processUserDecision!.title).toContain('Complexity: 45');
    });

    it('should extract technical debt decisions', async () => {
      const decisions = await documenter.extractDecisions(mockAnalysis);

      const debtDecisions = decisions.filter(
        (d) =>
          d.category === DecisionCategory.REFACTORING &&
          d.title.toLowerCase().includes('debt')
      );

      // Should have high-priority debt decision
      expect(debtDecisions.length).toBeGreaterThan(0);

      const highPriorityDebt = debtDecisions.find((d) =>
        d.title.includes('High-Priority Technical Debt')
      );
      expect(highPriorityDebt).toBeDefined();
    });

    it('should set correct impact levels', async () => {
      const decisions = await documenter.extractDecisions(mockAnalysis);

      // Architecture decisions should be HIGH impact
      const archDecision = decisions.find((d) => d.category === DecisionCategory.ARCHITECTURE);
      expect(archDecision!.impact).toBe(DecisionImpact.HIGH);

      // Component decisions should be MEDIUM impact
      const componentDecision = decisions.find((d) =>
        d.title.includes('Component Design')
      );
      if (componentDecision) {
        expect(componentDecision.impact).toBe(DecisionImpact.MEDIUM);
      }
    });
  });

  describe('edge cases', () => {
    it('should handle empty architecture', async () => {
      const emptyAnalysis = createEmptyAnalysis();
      const decisions = await documenter.extractDecisions(emptyAnalysis);

      // Empty architecture may not generate decisions (confidence too low, no components)
      // This is acceptable behavior - just verify it doesn't crash
      expect(decisions).toBeDefined();
      expect(Array.isArray(decisions)).toBe(true);
    });

    it('should handle no high-complexity functions', async () => {
      const cleanAnalysis = createMockAnalysis();
      const complexity = cleanAnalysis.analyzers.find((a) => a.name === 'complexity');
      if (complexity) {
        (complexity.data as ComplexityAnalysis).functionsOverThreshold = [];
      }

      const decisions = await documenter.extractDecisions(cleanAnalysis);

      // Should not crash, still have architecture decisions
      expect(decisions.length).toBeGreaterThan(0);
    });

    it('should handle no technical debt', async () => {
      const cleanAnalysis = createMockAnalysis();
      const debt = cleanAnalysis.analyzers.find((a) => a.name === 'technicalDebt');
      if (debt) {
        (debt.data as TechnicalDebtAnalysis).highPriority = 0;
        (debt.data as TechnicalDebtAnalysis).totalIssues = 0;
      }

      const decisions = await documenter.extractDecisions(cleanAnalysis);

      // Should not crash
      expect(decisions.length).toBeGreaterThan(0);
    });
  });
});

/**
 * Helper functions
 */

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function createMockAnalysis(): AnalysisResult {
  const architecture: ArchitectureAnalysis = {
    pattern: ArchitecturePattern.MVC,
    confidence: 0.92,
    layers: [
      {
        name: 'Controllers',
        files: ['src/controllers/user.ts', 'src/controllers/auth.ts'],
        complexity: 'medium',
        linesOfCode: 100,
        dependencies: [],
      },
      {
        name: 'Models',
        files: ['src/models/user.ts'],
        complexity: 'low',
        linesOfCode: 50,
        dependencies: [],
      },
    ],
    components: [
      {
        name: 'UserController',
        type: ComponentType.CONTROLLER,
        files: ['src/controllers/user.ts'],
        responsibilities: ['Handle user requests', 'User CRUD operations'],
        dependencies: [],
      },
      {
        name: 'UserModel',
        type: ComponentType.MODEL,
        files: ['src/models/user.ts'],
        responsibilities: ['User data structure'],
        dependencies: [],
      },
      {
        name: 'AuthUtility',
        type: ComponentType.UTILITY,
        files: ['src/utils/auth.ts'],
        responsibilities: ['Authentication helpers'],
        dependencies: [],
      },
    ],
    relationships: [],
    diagram: 'graph TD\n  Controllers --> Models',
  };

  const complexity: ComplexityAnalysis = {
    averageComplexity: 12.5,
    medianComplexity: 10,
    maxComplexity: 45,
    functionsOverThreshold: [
      {
        functionName: 'processUserData',
        filePath: 'src/services/user.ts',
        line: 42,
        complexity: 45,
        threshold: 15,
        recommendation: 'Extract major code blocks into separate functions',
      },
      {
        functionName: 'generateReport',
        filePath: 'src/services/reports.ts',
        line: 78,
        complexity: 25,
        threshold: 15,
        recommendation: 'Extract nested conditionals',
      },
    ],
    heatmap: [],
  };

  const technicalDebt: TechnicalDebtAnalysis = {
    totalIssues: 50,
    highPriority: 10,
    mediumPriority: 30,
    lowPriority: 10,
    score: 45,
    categories: {
      [TechnicalDebtCategory.TODO]: 20,
      [TechnicalDebtCategory.FIXME]: 10,
      [TechnicalDebtCategory.HACK]: 5,
      [TechnicalDebtCategory.MAGIC_NUMBER]: 10,
      [TechnicalDebtCategory.HARDCODED_STRING]: 5,
      [TechnicalDebtCategory.MISSING_ERROR_HANDLING]: 0,
    },
    issues: [],
  };

  return {
    analyzers: [
      {
        name: 'architecture',
        version: '1.0.0',
        executionTimeMs: 150,
        data: architecture,
      },
      {
        name: 'complexity',
        version: '1.0.0',
        executionTimeMs: 200,
        data: complexity,
      },
      {
        name: 'technical-debt',
        version: '1.0.0',
        executionTimeMs: 180,
        data: technicalDebt,
      },
    ],
    summary: {
      totalFiles: 50,
      totalLinesOfCode: 5000,
      languages: { TypeScript: 4000, JavaScript: 1000 },
      parseErrors: 0,
      analysisErrors: 0,
    },
    issues: [],
    metrics: {},
    recommendations: [],
    timestamp: new Date().toISOString(),
  };
}

function createEmptyAnalysis(): AnalysisResult {
  const architecture: ArchitectureAnalysis = {
    pattern: ArchitecturePattern.MONOLITH,
    confidence: 0.5,
    layers: [],
    components: [],
    relationships: [],
    diagram: 'graph TD',
  };

  const complexity: ComplexityAnalysis = {
    averageComplexity: 5,
    medianComplexity: 4,
    maxComplexity: 10,
    functionsOverThreshold: [],
    heatmap: [],
  };

  const technicalDebt: TechnicalDebtAnalysis = {
    totalIssues: 0,
    highPriority: 0,
    mediumPriority: 0,
    lowPriority: 0,
    score: 0,
    categories: {
      [TechnicalDebtCategory.TODO]: 0,
      [TechnicalDebtCategory.FIXME]: 0,
      [TechnicalDebtCategory.HACK]: 0,
      [TechnicalDebtCategory.MAGIC_NUMBER]: 0,
      [TechnicalDebtCategory.HARDCODED_STRING]: 0,
      [TechnicalDebtCategory.MISSING_ERROR_HANDLING]: 0,
    },
    issues: [],
  };

  return {
    analyzers: [
      {
        name: 'architecture',
        version: '1.0.0',
        executionTimeMs: 10,
        data: architecture,
      },
      {
        name: 'complexity',
        version: '1.0.0',
        executionTimeMs: 10,
        data: complexity,
      },
      {
        name: 'technical-debt',
        version: '1.0.0',
        executionTimeMs: 10,
        data: technicalDebt,
      },
    ],
    summary: {
      totalFiles: 0,
      totalLinesOfCode: 0,
      languages: {},
      parseErrors: 0,
      analysisErrors: 0,
    },
    issues: [],
    metrics: {},
    recommendations: [],
    timestamp: new Date().toISOString(),
  };
}
