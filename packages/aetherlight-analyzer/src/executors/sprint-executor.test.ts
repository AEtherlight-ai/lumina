/**
 * Sprint Executor Tests
 *
 * Tests for autonomous sprint execution functionality
 *
 * DESIGN DECISION: Test execution logic without spawning real agents
 * WHY: Fast tests, no external dependencies, focus on orchestration logic
 */

import { SprintExecutor, SprintTask, SprintPlan } from './sprint-executor';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('SprintExecutor', () => {
  const testSprintDir = path.join(__dirname, '__test-sprint__');
  const testSprintFile = path.join(testSprintDir, 'PHASE_A_ENHANCEMENT.md');

  beforeAll(async () => {
    // Create test sprint file
    await fs.mkdir(testSprintDir, { recursive: true });

    const mockSprintPlan = `# Phase A: Enhancement - Add �therLight Features

**DESIGN DECISION:** Add voice capture and pattern matching to existing application
**WHY:** Current platform lacks AI-powered features

**REASONING CHAIN:**
1. Analyzed existing architecture
2. Identified 3 integration points
3. Proposed incremental enhancement
4. Result: 5 tasks over 1 week

**Estimated Duration:** 1 week

---

## Task A-001: Setup Voice Capture Infrastructure

**Agent:** infrastructure-agent
**Duration:** 4 hours
**Dependencies:** None

**Implementation:**
- Install Whisper.cpp dependencies
- Configure audio input pipeline
- Setup transcription service

**Validation Criteria:**
- [ ] Dependencies installed
- [ ] Audio pipeline configured
- [ ] Transcription service running

---

## Task A-002: Add Voice Capture API Endpoint

**Agent:** api-agent
**Duration:** 4 hours
**Dependencies:** A-001

**Implementation:**
- Create POST /api/voice/capture endpoint
- Accept multipart/form-data
- Return transcription + confidence

**Validation Criteria:**
- [ ] Endpoint created
- [ ] Accepts audio files
- [ ] Returns JSON response

---

## Task A-003: Integrate Pattern Matching Engine

**Agent:** api-agent
**Duration:** 6 hours
**Dependencies:** A-002

**Implementation:**
- Install @aetherlight/sdk
- Connect to pattern library
- Add pattern matching to voice endpoint

**Validation Criteria:**
- [ ] SDK installed
- [ ] Pattern library connected
- [ ] Matching integrated

---

## Task A-004: Build Voice Capture UI

**Agent:** ui-agent
**Duration:** 6 hours
**Dependencies:** A-002

**Implementation:**
- Create React component for voice capture
- Add microphone permission flow
- Display transcription + patterns

**Validation Criteria:**
- [ ] UI component created
- [ ] Microphone permissions work
- [ ] Results displayed

---

## Task A-005: Add End-to-End Tests

**Agent:** test-agent
**Duration:** 4 hours
**Dependencies:** A-003, A-004

**Implementation:**
- Create E2E test suite
- Test voice capture flow
- Validate pattern matching

**Validation Criteria:**
- [ ] E2E tests created
- [ ] Voice capture tested
- [ ] Pattern matching validated

---

**STATUS:** Ready for execution
`;

    await fs.writeFile(testSprintFile, mockSprintPlan);
  });

  afterAll(async () => {
    // Clean up test files
    try {
      await fs.rm(testSprintDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore errors
    }
  });

  describe('SprintExecutor initialization', () => {
    it('should create executor with default options', () => {
      const executor = new SprintExecutor();
      expect(executor).toBeDefined();
    });

    it('should create executor with custom options', () => {
      const executor = new SprintExecutor({
        maxParallelAgents: 5,
        verbose: true,
        dryRun: true,
        stopOnError: false,
      });
      expect(executor).toBeDefined();
    });
  });

  describe('loadSprintPlan', () => {
    it('should load sprint plan from markdown', async () => {
      const executor = new SprintExecutor();

      // Use any to access private method for testing
      const sprintPlan = await (executor as any).loadSprintPlan(testSprintFile);

      expect(sprintPlan.phase).toBe('A');
      expect(sprintPlan.title).toContain('Phase A');
      expect(sprintPlan.tasks.length).toBe(5);
      expect(sprintPlan.estimatedDuration).toBe('1 week');
    });

    it('should parse task metadata correctly', async () => {
      const executor = new SprintExecutor();
      const sprintPlan = await (executor as any).loadSprintPlan(testSprintFile);

      const task1 = sprintPlan.tasks.find((t: SprintTask) => t.id === 'A-001');
      expect(task1).toBeDefined();
      expect(task1.title).toContain('Setup Voice Capture');
      expect(task1.agent).toBe('infrastructure-agent');
      expect(task1.duration).toBe('4 hours');
      expect(task1.dependencies).toEqual([]);
      expect(task1.validationCriteria.length).toBe(3);
    });

    it('should parse task dependencies correctly', async () => {
      const executor = new SprintExecutor();
      const sprintPlan = await (executor as any).loadSprintPlan(testSprintFile);

      const task2 = sprintPlan.tasks.find((t: SprintTask) => t.id === 'A-002');
      expect(task2.dependencies).toEqual(['A-001']);

      const task5 = sprintPlan.tasks.find((t: SprintTask) => t.id === 'A-005');
      expect(task5.dependencies).toEqual(['A-003', 'A-004']);
    });
  });

  describe('validateDependencies', () => {
    it('should validate correct dependencies', () => {
      const executor = new SprintExecutor();

      const tasks: SprintTask[] = [
        {
          id: 'A-001',
          title: 'Task 1',
          description: '',
          agent: 'test-agent',
          duration: '1 hour',
          dependencies: [],
          validationCriteria: [],
          completed: false,
        },
        {
          id: 'A-002',
          title: 'Task 2',
          description: '',
          agent: 'test-agent',
          duration: '1 hour',
          dependencies: ['A-001'],
          validationCriteria: [],
          completed: false,
        },
      ];

      expect(() => (executor as any).validateDependencies(tasks)).not.toThrow();
    });

    it('should detect missing dependencies', () => {
      const executor = new SprintExecutor();

      const tasks: SprintTask[] = [
        {
          id: 'A-001',
          title: 'Task 1',
          description: '',
          agent: 'test-agent',
          duration: '1 hour',
          dependencies: ['A-999'], // Non-existent
          validationCriteria: [],
          completed: false,
        },
      ];

      expect(() => (executor as any).validateDependencies(tasks)).toThrow(
        /depends on non-existent task/
      );
    });

    it('should detect circular dependencies', () => {
      const executor = new SprintExecutor();

      const tasks: SprintTask[] = [
        {
          id: 'A-001',
          title: 'Task 1',
          description: '',
          agent: 'test-agent',
          duration: '1 hour',
          dependencies: ['A-002'],
          validationCriteria: [],
          completed: false,
        },
        {
          id: 'A-002',
          title: 'Task 2',
          description: '',
          agent: 'test-agent',
          duration: '1 hour',
          dependencies: ['A-001'],
          validationCriteria: [],
          completed: false,
        },
      ];

      expect(() => (executor as any).validateDependencies(tasks)).toThrow(
        /Circular dependency detected/
      );
    });
  });

  describe('buildExecutionOrder', () => {
    it('should build correct execution order', () => {
      const executor = new SprintExecutor();

      const tasks: SprintTask[] = [
        {
          id: 'A-001',
          title: 'Task 1',
          description: '',
          agent: 'test-agent',
          duration: '1 hour',
          dependencies: [],
          validationCriteria: [],
          completed: false,
        },
        {
          id: 'A-002',
          title: 'Task 2',
          description: '',
          agent: 'test-agent',
          duration: '1 hour',
          dependencies: ['A-001'],
          validationCriteria: [],
          completed: false,
        },
        {
          id: 'A-003',
          title: 'Task 3',
          description: '',
          agent: 'test-agent',
          duration: '1 hour',
          dependencies: ['A-002'],
          validationCriteria: [],
          completed: false,
        },
      ];

      const order = (executor as any).buildExecutionOrder(tasks);

      expect(order).toEqual(['A-001', 'A-002', 'A-003']);
    });

    it('should handle parallel execution order', () => {
      const executor = new SprintExecutor();

      const tasks: SprintTask[] = [
        {
          id: 'A-001',
          title: 'Task 1',
          description: '',
          agent: 'test-agent',
          duration: '1 hour',
          dependencies: [],
          validationCriteria: [],
          completed: false,
        },
        {
          id: 'A-002',
          title: 'Task 2',
          description: '',
          agent: 'test-agent',
          duration: '1 hour',
          dependencies: [],
          validationCriteria: [],
          completed: false,
        },
        {
          id: 'A-003',
          title: 'Task 3',
          description: '',
          agent: 'test-agent',
          duration: '1 hour',
          dependencies: ['A-001', 'A-002'],
          validationCriteria: [],
          completed: false,
        },
      ];

      const order = (executor as any).buildExecutionOrder(tasks);

      // A-001 and A-002 can be parallel, A-003 must be last
      expect(order.indexOf('A-003')).toBe(2);
      expect(order.indexOf('A-001')).toBeLessThan(2);
      expect(order.indexOf('A-002')).toBeLessThan(2);
    });
  });

  describe('groupIntoWaves', () => {
    it('should group tasks into waves', () => {
      const executor = new SprintExecutor();

      const tasks: SprintTask[] = [
        {
          id: 'A-001',
          title: 'Task 1',
          description: '',
          agent: 'test-agent',
          duration: '1 hour',
          dependencies: [],
          validationCriteria: [],
          completed: false,
        },
        {
          id: 'A-002',
          title: 'Task 2',
          description: '',
          agent: 'test-agent',
          duration: '1 hour',
          dependencies: [],
          validationCriteria: [],
          completed: false,
        },
        {
          id: 'A-003',
          title: 'Task 3',
          description: '',
          agent: 'test-agent',
          duration: '1 hour',
          dependencies: ['A-001', 'A-002'],
          validationCriteria: [],
          completed: false,
        },
      ];

      const executionOrder = ['A-001', 'A-002', 'A-003'];
      const waves = (executor as any).groupIntoWaves(tasks, executionOrder);

      expect(waves.length).toBe(2);
      expect(waves[0]).toEqual(['A-001', 'A-002']);
      expect(waves[1]).toEqual(['A-003']);
    });

    it('should handle complex dependency graph', () => {
      const executor = new SprintExecutor();

      const tasks: SprintTask[] = [
        {
          id: 'A-001',
          title: 'Task 1',
          description: '',
          agent: 'test-agent',
          duration: '1 hour',
          dependencies: [],
          validationCriteria: [],
          completed: false,
        },
        {
          id: 'A-002',
          title: 'Task 2',
          description: '',
          agent: 'test-agent',
          duration: '1 hour',
          dependencies: ['A-001'],
          validationCriteria: [],
          completed: false,
        },
        {
          id: 'A-003',
          title: 'Task 3',
          description: '',
          agent: 'test-agent',
          duration: '1 hour',
          dependencies: ['A-001'],
          validationCriteria: [],
          completed: false,
        },
        {
          id: 'A-004',
          title: 'Task 4',
          description: '',
          agent: 'test-agent',
          duration: '1 hour',
          dependencies: ['A-002', 'A-003'],
          validationCriteria: [],
          completed: false,
        },
      ];

      const executionOrder = ['A-001', 'A-002', 'A-003', 'A-004'];
      const waves = (executor as any).groupIntoWaves(tasks, executionOrder);

      expect(waves.length).toBe(3);
      expect(waves[0]).toEqual(['A-001']);
      expect(waves[1]).toEqual(['A-002', 'A-003']);
      expect(waves[2]).toEqual(['A-004']);
    });
  });

  describe('parseDuration', () => {
    it('should parse hour duration', () => {
      const executor = new SprintExecutor();

      const ms = (executor as any).parseDuration('4 hours');
      expect(ms).toBe(40); // 4 hours = 40ms in simulation
    });

    it('should parse day duration', () => {
      const executor = new SprintExecutor();

      const ms = (executor as any).parseDuration('2 days');
      expect(ms).toBe(200); // 2 days = 200ms in simulation
    });

    it('should parse minute duration', () => {
      const executor = new SprintExecutor();

      const ms = (executor as any).parseDuration('30 minutes');
      expect(ms).toBe(30); // 30 minutes = 30ms in simulation
    });

    it('should handle singular units', () => {
      const executor = new SprintExecutor();

      const ms = (executor as any).parseDuration('1 hour');
      expect(ms).toBe(10); // 1 hour = 10ms in simulation
    });
  });

  describe('executeSprint', () => {
    it('should execute sprint in dry-run mode', async () => {
      const executor = new SprintExecutor({ dryRun: true });

      // Should not throw in dry-run mode
      await expect(executor.executeSprint(testSprintFile)).resolves.not.toThrow();
    });

    it('should execute sprint with simulated tasks', async () => {
      const executor = new SprintExecutor({ verbose: false });

      // Track progress events
      const events: string[] = [];
      executor.on('progress', (event) => {
        events.push(event.type);
      });

      await executor.executeSprint(testSprintFile);

      // Should have task-started and task-completed events
      expect(events).toContain('task-started');
      expect(events).toContain('task-completed');
      expect(events).toContain('sprint-completed');
    }, 3000); // 3s timeout for simulation

    it('should execute tasks in correct order', async () => {
      const executor = new SprintExecutor({ verbose: false });

      const taskOrder: string[] = [];
      executor.on('progress', (event) => {
        if (event.type === 'task-started' && event.taskId) {
          taskOrder.push(event.taskId);
        }
      });

      await executor.executeSprint(testSprintFile);

      // A-001 should be first (no dependencies)
      expect(taskOrder[0]).toBe('A-001');

      // A-002 should come after A-001
      expect(taskOrder.indexOf('A-002')).toBeGreaterThan(taskOrder.indexOf('A-001'));

      // A-003 should come after A-002
      expect(taskOrder.indexOf('A-003')).toBeGreaterThan(taskOrder.indexOf('A-002'));

      // A-005 should be last (depends on A-003 and A-004)
      expect(taskOrder[taskOrder.length - 1]).toBe('A-005');
    }, 3000); // 3s timeout for simulation
  });

  describe('getExecutionSummary', () => {
    it('should return execution summary', () => {
      const executor = new SprintExecutor();

      const summary = executor.getExecutionSummary();

      expect(summary).toHaveProperty('totalTasks');
      expect(summary).toHaveProperty('completedTasks');
      expect(summary).toHaveProperty('failedTasks');
      expect(summary).toHaveProperty('runningTasks');
    });
  });

  describe('progress events', () => {
    it('should emit task-started events', async () => {
      const executor = new SprintExecutor({ verbose: false });

      let startedCount = 0;
      executor.on('progress', (event) => {
        if (event.type === 'task-started') {
          startedCount++;
        }
      });

      await executor.executeSprint(testSprintFile);

      expect(startedCount).toBe(5); // 5 tasks in test sprint
    }, 3000);

    it('should emit task-completed events', async () => {
      const executor = new SprintExecutor({ verbose: false });

      let completedCount = 0;
      executor.on('progress', (event) => {
        if (event.type === 'task-completed') {
          completedCount++;
        }
      });

      await executor.executeSprint(testSprintFile);

      expect(completedCount).toBe(5); // 5 tasks in test sprint
    }, 3000);

    it('should emit sprint-completed event', async () => {
      const executor = new SprintExecutor({ verbose: false });

      let sprintCompleted = false;
      executor.on('progress', (event) => {
        if (event.type === 'sprint-completed') {
          sprintCompleted = true;
        }
      });

      await executor.executeSprint(testSprintFile);

      expect(sprintCompleted).toBe(true);
    }, 3000);
  });

  describe('error handling', () => {
    it('should handle invalid sprint file', async () => {
      const executor = new SprintExecutor();

      const invalidFile = path.join(testSprintDir, 'non-existent.md');

      await expect(executor.executeSprint(invalidFile)).rejects.toThrow();
    });

    it('should validate dependencies before execution', async () => {
      const executor = new SprintExecutor();

      // Create sprint with invalid dependencies
      const invalidSprintFile = path.join(testSprintDir, 'PHASE_INVALID.md');
      await fs.writeFile(
        invalidSprintFile,
        `# Invalid Sprint

## Task A-001: Task 1
**Agent:** test-agent
**Duration:** 1 hour
**Dependencies:** A-999

**Validation Criteria:**
- [ ] Criteria 1
`
      );

      await expect(executor.executeSprint(invalidSprintFile)).rejects.toThrow(
        /depends on non-existent task/
      );

      // Clean up
      await fs.rm(invalidSprintFile);
    });
  });
});
