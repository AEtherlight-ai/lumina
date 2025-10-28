/**
 * Sprint Generator Tests
 *
 * DESIGN DECISION: Test sprint generation with realistic mock data
 * WHY: Ensure generated sprints are valid and contain all required elements
 *
 * REASONING CHAIN:
 * 1. Create mock analysis results (architecture, complexity, debt)
 * 2. Generate all 3 sprint plans (A, B, C)
 * 3. Validate structure, tasks, dependencies
 * 4. Verify Chain of Thought completeness
 * 5. Check performance (<2s generation)
 * 6. Result: Reliable sprint generation validated
 *
 * PATTERN: Pattern-TEST-001 (Unit Testing Strategy)
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { SprintGenerator } from './sprint-generator';
import { TaskGenerator } from './task-generator';
import { DependencyResolver } from './dependency-resolver';
import {
  AnalysisResult,
  ArchitecturePattern,
  ArchitectureAnalysis,
  ComplexityAnalysis,
  TechnicalDebtAnalysis,
  TechnicalDebtCategory,
  IssueSeverity,
  ComponentType,
} from '../analyzers/types';

describe('SprintGenerator', () => {
  let tempDir: string;
  let mockAnalysis: AnalysisResult;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sprint-gen-test-'));

    // Create comprehensive mock analysis
    mockAnalysis = createMockAnalysis();
  });

  afterEach(() => {
    // Clean up temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('Sprint generation', () => {
    it('should generate all 3 sprint plans', async () => {
      const generator = new SprintGenerator({
        repositoryName: 'test-repo',
        repositoryPath: '/path/to/test-repo',
        owner: 'Test Team',
      });

      const sprints = await generator.generateAllSprints(mockAnalysis, tempDir);

      expect(sprints).toHaveLength(3);
      expect(sprints[0].phase).toBe('A');
      expect(sprints[1].phase).toBe('B');
      expect(sprints[2].phase).toBe('C');
    });

    it('should generate sprints in <2 seconds', async () => {
      const generator = new SprintGenerator({
        repositoryName: 'test-repo',
        repositoryPath: '/path/to/test-repo',
      });

      const startTime = Date.now();
      await generator.generateAllSprints(mockAnalysis, tempDir);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(2000);
    });

    it('should write sprint files to disk', async () => {
      const generator = new SprintGenerator({
        repositoryName: 'test-repo',
        repositoryPath: '/path/to/test-repo',
      });

      await generator.generateAllSprints(mockAnalysis, tempDir);

      expect(fs.existsSync(path.join(tempDir, 'PHASE_A_ENHANCEMENT.md'))).toBe(true);
      expect(fs.existsSync(path.join(tempDir, 'PHASE_B_RETROFIT.md'))).toBe(true);
      expect(fs.existsSync(path.join(tempDir, 'PHASE_C_DOGFOOD.md'))).toBe(true);
      expect(fs.existsSync(path.join(tempDir, 'SPRINT_SUMMARY.md'))).toBe(true);
    });
  });

  describe('Phase A generation', () => {
    it('should generate enhancement tasks', async () => {
      const generator = new SprintGenerator({
        repositoryName: 'test-repo',
        repositoryPath: '/path/to/test-repo',
      });

      const sprints = await generator.generateAllSprints(mockAnalysis, tempDir);
      const phaseA = sprints.find((s) => s.phase === 'A');

      expect(phaseA).toBeDefined();
      expect(phaseA!.taskCount).toBeGreaterThanOrEqual(5);
      expect(phaseA!.estimatedDuration).toBeGreaterThan(0);
    });

    it('should include Chain of Thought in content', async () => {
      const generator = new SprintGenerator({
        repositoryName: 'test-repo',
        repositoryPath: '/path/to/test-repo',
      });

      const sprints = await generator.generateAllSprints(mockAnalysis, tempDir);
      const phaseA = sprints.find((s) => s.phase === 'A');

      expect(phaseA!.content).toContain('DESIGN DECISION:');
      expect(phaseA!.content).toContain('WHY:');
      expect(phaseA!.content).toContain('REASONING CHAIN:');
      expect(phaseA!.content).toContain('PATTERN:');
    });

    it('should include task dependencies', async () => {
      const generator = new SprintGenerator({
        repositoryName: 'test-repo',
        repositoryPath: '/path/to/test-repo',
      });

      const sprints = await generator.generateAllSprints(mockAnalysis, tempDir);
      const phaseA = sprints.find((s) => s.phase === 'A');

      expect(phaseA!.content).toContain('Dependencies:');
      expect(phaseA!.content).toContain('Task A-');
    });

    it('should include validation criteria', async () => {
      const generator = new SprintGenerator({
        repositoryName: 'test-repo',
        repositoryPath: '/path/to/test-repo',
      });

      const sprints = await generator.generateAllSprints(mockAnalysis, tempDir);
      const phaseA = sprints.find((s) => s.phase === 'A');

      expect(phaseA!.content).toContain('Validation Criteria:');
      expect(phaseA!.content).toContain('[ ]');
    });

    it('should include Mermaid dependency graph', async () => {
      const generator = new SprintGenerator({
        repositoryName: 'test-repo',
        repositoryPath: '/path/to/test-repo',
      });

      const sprints = await generator.generateAllSprints(mockAnalysis, tempDir);
      const phaseA = sprints.find((s) => s.phase === 'A');

      expect(phaseA!.content).toContain('```mermaid');
      expect(phaseA!.content).toContain('graph TD');
    });
  });

  describe('Phase B generation', () => {
    it('should generate refactoring tasks from complexity analysis', async () => {
      const generator = new SprintGenerator({
        repositoryName: 'test-repo',
        repositoryPath: '/path/to/test-repo',
      });

      const sprints = await generator.generateAllSprints(mockAnalysis, tempDir);
      const phaseB = sprints.find((s) => s.phase === 'B');

      expect(phaseB).toBeDefined();
      expect(phaseB!.taskCount).toBeGreaterThan(0);
      expect(phaseB!.content).toContain('Refactor');
    });

    it('should include complexity metrics', async () => {
      const generator = new SprintGenerator({
        repositoryName: 'test-repo',
        repositoryPath: '/path/to/test-repo',
      });

      const sprints = await generator.generateAllSprints(mockAnalysis, tempDir);
      const phaseB = sprints.find((s) => s.phase === 'B');

      expect(phaseB!.content).toContain('Average Complexity:');
      expect(phaseB!.content).toContain('Total Debt Score:');
    });

    it('should include debt cleanup tasks', async () => {
      const generator = new SprintGenerator({
        repositoryName: 'test-repo',
        repositoryPath: '/path/to/test-repo',
      });

      const sprints = await generator.generateAllSprints(mockAnalysis, tempDir);
      const phaseB = sprints.find((s) => s.phase === 'B');

      expect(phaseB!.content).toContain('Clean up');
      expect(phaseB!.content).toContain('issues');
    });

    it('should include before/after complexity targets', async () => {
      const generator = new SprintGenerator({
        repositoryName: 'test-repo',
        repositoryPath: '/path/to/test-repo',
      });

      const sprints = await generator.generateAllSprints(mockAnalysis, tempDir);
      const phaseB = sprints.find((s) => s.phase === 'B');

      expect(phaseB!.content).toContain('Before Complexity:');
      expect(phaseB!.content).toContain('Target Complexity:');
    });
  });

  describe('Phase C generation', () => {
    it('should generate SDK integration tasks', async () => {
      const generator = new SprintGenerator({
        repositoryName: 'test-repo',
        repositoryPath: '/path/to/test-repo',
      });

      const sprints = await generator.generateAllSprints(mockAnalysis, tempDir);
      const phaseC = sprints.find((s) => s.phase === 'C');

      expect(phaseC).toBeDefined();
      expect(phaseC!.taskCount).toBeGreaterThanOrEqual(5);
      expect(phaseC!.content).toContain('@aetherlight/sdk');
    });

    it('should include SDK configuration', async () => {
      const generator = new SprintGenerator({
        repositoryName: 'test-repo',
        repositoryPath: '/path/to/test-repo',
      });

      const sprints = await generator.generateAllSprints(mockAnalysis, tempDir);
      const phaseC = sprints.find((s) => s.phase === 'C');

      expect(phaseC!.content).toContain('localFirst');
      expect(phaseC!.content).toContain('confidenceThreshold');
    });

    it('should include integration tests', async () => {
      const generator = new SprintGenerator({
        repositoryName: 'test-repo',
        repositoryPath: '/path/to/test-repo',
      });

      const sprints = await generator.generateAllSprints(mockAnalysis, tempDir);
      const phaseC = sprints.find((s) => s.phase === 'C');

      expect(phaseC!.content).toContain('Integration Testing:');
      expect(phaseC!.content).toContain('End-to-End Testing:');
    });
  });

  describe('Summary report generation', () => {
    it('should generate summary report', async () => {
      const generator = new SprintGenerator({
        repositoryName: 'test-repo',
        repositoryPath: '/path/to/test-repo',
      });

      await generator.generateAllSprints(mockAnalysis, tempDir);

      const summaryPath = path.join(tempDir, 'SPRINT_SUMMARY.md');
      expect(fs.existsSync(summaryPath)).toBe(true);

      const summary = fs.readFileSync(summaryPath, 'utf-8');
      expect(summary).toContain('Sprint Generation Summary');
      expect(summary).toContain('Phase A: Enhancement');
      expect(summary).toContain('Phase B: Retrofit');
      expect(summary).toContain('Phase C: Dogfood');
    });

    it('should include total task count and duration', async () => {
      const generator = new SprintGenerator({
        repositoryName: 'test-repo',
        repositoryPath: '/path/to/test-repo',
      });

      await generator.generateAllSprints(mockAnalysis, tempDir);

      const summaryPath = path.join(tempDir, 'SPRINT_SUMMARY.md');
      const summary = fs.readFileSync(summaryPath, 'utf-8');

      expect(summary).toContain('total tasks');
      expect(summary).toContain('weeks');
    });
  });
});

describe('TaskGenerator', () => {
  let taskGenerator: TaskGenerator;
  let mockAnalysis: AnalysisResult;

  beforeEach(() => {
    taskGenerator = new TaskGenerator();
    mockAnalysis = createMockAnalysis();
  });

  describe('Phase A task generation', () => {
    it('should generate 5 enhancement tasks', () => {
      const tasks = taskGenerator.generatePhaseATasks(mockAnalysis, 'test-repo');

      expect(tasks.length).toBeGreaterThanOrEqual(5);
    });

    it('should include voice capture task', () => {
      const tasks = taskGenerator.generatePhaseATasks(mockAnalysis, 'test-repo');

      const voiceTask = tasks.find((t) => t.title.includes('voice'));
      expect(voiceTask).toBeDefined();
      expect(voiceTask!.id).toBe('A-001');
    });

    it('should include pattern matching task', () => {
      const tasks = taskGenerator.generatePhaseATasks(mockAnalysis, 'test-repo');

      const patternTask = tasks.find((t) => t.title.includes('pattern'));
      expect(patternTask).toBeDefined();
    });

    it('should have Chain of Thought for all tasks', () => {
      const tasks = taskGenerator.generatePhaseATasks(mockAnalysis, 'test-repo');

      tasks.forEach((task) => {
        expect(task.designDecision).toBeTruthy();
        expect(task.why).toBeTruthy();
        expect(task.reasoningChain.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Phase B task generation', () => {
    it('should generate refactoring tasks', () => {
      const tasks = taskGenerator.generatePhaseBTasks(mockAnalysis);

      const refactoringTasks = tasks.filter((t) => t.title.includes('Refactor'));
      expect(refactoringTasks.length).toBeGreaterThan(0);
    });

    it('should generate debt cleanup tasks', () => {
      const tasks = taskGenerator.generatePhaseBTasks(mockAnalysis);

      const debtTasks = tasks.filter((t) => t.title.includes('Clean up'));
      expect(debtTasks.length).toBeGreaterThan(0);
    });

    it('should estimate duration based on complexity', () => {
      const tasks = taskGenerator.generatePhaseBTasks(mockAnalysis);

      // High complexity functions should have longer duration
      const highComplexityTask = tasks.find((t) => t.title.includes('complexity: 45'));
      if (highComplexityTask) {
        expect(highComplexityTask.duration).toBeGreaterThanOrEqual(4);
      }
    });
  });

  describe('Phase C task generation', () => {
    it('should generate 5 SDK integration tasks', () => {
      const tasks = taskGenerator.generatePhaseCTasks('test-repo');

      expect(tasks.length).toBe(5);
    });

    it('should have proper task ordering', () => {
      const tasks = taskGenerator.generatePhaseCTasks('test-repo');

      expect(tasks[0].id).toBe('C-001'); // Install
      expect(tasks[1].id).toBe('C-002'); // Configure
      expect(tasks[2].id).toBe('C-003'); // Test
    });
  });
});

describe('DependencyResolver', () => {
  let resolver: DependencyResolver;

  beforeEach(() => {
    resolver = new DependencyResolver();
  });

  describe('Dependency detection', () => {
    it('should detect API depends on database', () => {
      const tasks = [
        {
          id: 'A-001',
          title: 'Create database schema',
          filesToModify: ['src/models/user.ts'],
          dependencies: [],
        } as any,
        {
          id: 'A-002',
          title: 'Create API endpoint',
          filesToModify: ['src/routes/api.ts'],
          dependencies: [],
        } as any,
      ];

      const resolved = resolver.resolveDependencies(tasks);

      const apiTask = resolved.find((t) => t.id === 'A-002');
      expect(apiTask!.dependencies).toContain('A-001');
    });

    it('should detect UI depends on API', () => {
      const tasks = [
        {
          id: 'A-001',
          title: 'Create API endpoint',
          filesToModify: ['src/routes/api.ts'],
          dependencies: [],
        } as any,
        {
          id: 'A-002',
          title: 'Create UI component',
          filesToModify: ['src/components/Dashboard.tsx'],
          dependencies: [],
        } as any,
      ];

      const resolved = resolver.resolveDependencies(tasks);

      const uiTask = resolved.find((t) => t.id === 'A-002');
      expect(uiTask!.dependencies).toContain('A-001');
    });
  });

  describe('Circular dependency detection', () => {
    it('should detect and break circular dependencies', () => {
      const tasks = [
        {
          id: 'A-001',
          title: 'Task 1',
          filesToModify: [],
          dependencies: ['A-002'],
        } as any,
        {
          id: 'A-002',
          title: 'Task 2',
          filesToModify: [],
          dependencies: ['A-001'],
        } as any,
      ];

      // Should not throw, should break cycle
      const resolved = resolver.resolveDependencies(tasks);

      // At least one dependency should be removed
      const task1Deps = resolved.find((t) => t.id === 'A-001')!.dependencies;
      const task2Deps = resolved.find((t) => t.id === 'A-002')!.dependencies;

      expect(task1Deps.includes('A-002') && task2Deps.includes('A-001')).toBe(false);
    });
  });

  describe('Topological sort', () => {
    it('should sort tasks in dependency order', () => {
      const tasks = [
        {
          id: 'A-003',
          title: 'Task 3',
          filesToModify: [],
          dependencies: ['A-001', 'A-002'],
        } as any,
        {
          id: 'A-001',
          title: 'Task 1',
          filesToModify: [],
          dependencies: [],
        } as any,
        {
          id: 'A-002',
          title: 'Task 2',
          filesToModify: [],
          dependencies: ['A-001'],
        } as any,
      ];

      const resolved = resolver.resolveDependencies(tasks);

      // Should be sorted: A-001, A-002, A-003
      expect(resolved[0].id).toBe('A-001');
      expect(resolved[1].id).toBe('A-002');
      expect(resolved[2].id).toBe('A-003');
    });
  });

  describe('Parallel execution analysis', () => {
    it('should identify parallelizable tasks', () => {
      const tasks = [
        {
          id: 'A-001',
          title: 'Task 1',
          duration: 4,
          dependencies: [],
        } as any,
        {
          id: 'A-002',
          title: 'Task 2',
          duration: 4,
          dependencies: [],
        } as any,
        {
          id: 'A-003',
          title: 'Task 3',
          duration: 4,
          dependencies: ['A-001', 'A-002'],
        } as any,
      ];

      const groups = resolver.identifyParallelGroups(tasks);

      // First group: A-001 and A-002 (parallel)
      // Second group: A-003 (depends on first group)
      expect(groups.length).toBe(2);
      expect(groups[0]).toContain('A-001');
      expect(groups[0]).toContain('A-002');
      expect(groups[1]).toContain('A-003');
    });

    it('should calculate speedup from parallelization', () => {
      const tasks = [
        {
          id: 'A-001',
          title: 'Task 1',
          duration: 4,
          dependencies: [],
        } as any,
        {
          id: 'A-002',
          title: 'Task 2',
          duration: 4,
          dependencies: [],
        } as any,
      ];

      const speedup = resolver.calculateSpeedup(tasks);

      // Sequential: 8 hours, Parallel: 4 hours, Speedup: 2x
      expect(speedup).toBe(2);
    });
  });

  describe('Critical path analysis', () => {
    it('should calculate execution statistics', () => {
      const tasks = [
        {
          id: 'A-001',
          title: 'Task 1',
          duration: 2,
          dependencies: [],
        } as any,
        {
          id: 'A-002',
          title: 'Task 2',
          duration: 4,
          dependencies: ['A-001'],
        } as any,
        {
          id: 'A-003',
          title: 'Task 3',
          duration: 3,
          dependencies: ['A-002'],
        } as any,
      ];

      const stats = resolver.generateExecutionStats(tasks);

      expect(stats.totalTasks).toBe(3);
      expect(stats.sequentialHours).toBe(9); // 2+4+3
      expect(stats.parallelHours).toBe(9); // No parallelism (all sequential)
      expect(stats.criticalPath).toEqual(['A-001', 'A-002', 'A-003']);
    });
  });
});

// Helper function to create mock analysis
function createMockAnalysis(): AnalysisResult {
  const architecture: ArchitectureAnalysis = {
    pattern: ArchitecturePattern.MVC,
    confidence: 0.92,
    layers: [
      { name: 'Controllers', files: ['src/controllers/user.ts'], complexity: 'medium', linesOfCode: 100, dependencies: [] },
      { name: 'Models', files: ['src/models/user.ts'], complexity: 'low', linesOfCode: 50, dependencies: [] },
      { name: 'Views', files: ['src/views/user.tsx'], complexity: 'medium', linesOfCode: 150, dependencies: [] },
    ],
    components: [
      { name: 'UserController', type: ComponentType.CONTROLLER, files: ['src/controllers/user.ts'], responsibilities: ['Handle user requests'], dependencies: [] },
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
    totalIssues: 127,
    highPriority: 23,
    mediumPriority: 68,
    lowPriority: 36,
    score: 45,
    categories: {
      [TechnicalDebtCategory.TODO]: 32,
      [TechnicalDebtCategory.FIXME]: 15,
      [TechnicalDebtCategory.HACK]: 8,
      [TechnicalDebtCategory.MAGIC_NUMBER]: 38,
      [TechnicalDebtCategory.HARDCODED_STRING]: 12,
      [TechnicalDebtCategory.MISSING_ERROR_HANDLING]: 22,
    },
    issues: [
      {
        category: TechnicalDebtCategory.HACK,
        severity: IssueSeverity.HIGH,
        location: { filePath: 'src/utils/helpers.ts', line: 45, context: '// HACK: ...' },
        description: 'Temporary workaround',
        recommendation: 'Refactor properly',
      },
    ],
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
        name: 'technicalDebt',
        version: '1.0.0',
        executionTimeMs: 180,
        data: technicalDebt,
      },
    ],
    summary: {
      totalFiles: 100,
      totalLinesOfCode: 10000,
      languages: { TypeScript: 8000, JavaScript: 2000 },
      parseErrors: 0,
      analysisErrors: 0,
    },
    issues: [],
    metrics: {},
    recommendations: [],
    timestamp: new Date().toISOString(),
  };
}
