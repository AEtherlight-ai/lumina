/**
 * Sprint Executor
 *
 * DESIGN DECISION: Coordinate autonomous sprint execution with Claude Code agents
 * WHY: Manual sprint execution is slow - automate with multi-agent system
 *
 * REASONING CHAIN:
 * 1. Read generated sprint plan (PHASE_A/B/C.md)
 * 2. Parse tasks with dependencies
 * 3. Spawn Claude Code agents per task (parallel where possible)
 * 4. Track progress with TodoWrite integration
 * 5. Generate git commits with Chain of Thought
 * 6. Result: Autonomous sprint completion in hours (not days)
 *
 * ARCHITECTURE:
 * - SprintExecutor: Main orchestrator
 * - TaskQueue: Manages task execution order (topological sort)
 * - AgentPool: Spawns and monitors Claude Code agents
 * - ProgressTracker: Real-time progress updates
 * - CommitGenerator: Creates git commits with CoT
 *
 * PATTERN: Pattern-EXECUTOR-001 (Autonomous Sprint Execution)
 * RELATED: Task C-002 (Sprint Executor), Phase 4 (Autonomous Sprints)
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { execSync, spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';

/**
 * Sprint task representation
 */
export interface SprintTask {
  id: string; // A-001, B-002, C-003
  title: string;
  description: string;
  agent: string; // database-agent, api-agent, ui-agent, etc.
  duration: string; // "4 hours", "2 days"
  dependencies: string[]; // Task IDs this depends on
  validationCriteria: string[];
  completed: boolean;
  startTime?: Date;
  endTime?: Date;
  error?: string;
}

/**
 * Sprint plan representation
 */
export interface SprintPlan {
  phase: 'A' | 'B' | 'C';
  title: string;
  description: string;
  tasks: SprintTask[];
  estimatedDuration: string;
}

/**
 * Execution options
 */
export interface ExecutionOptions {
  maxParallelAgents?: number; // Default: 3
  verbose?: boolean;
  dryRun?: boolean; // Preview only, don't execute
  stopOnError?: boolean; // Default: true
}

/**
 * Execution progress event
 */
export interface ProgressEvent {
  type: 'task-started' | 'task-completed' | 'task-failed' | 'sprint-completed' | 'sprint-failed';
  taskId?: string;
  message: string;
  timestamp: Date;
}

/**
 * Sprint Executor
 *
 * Coordinates autonomous sprint execution with multi-agent system
 */
export class SprintExecutor extends EventEmitter {
  private options: Required<ExecutionOptions>;
  private runningAgents: Map<string, ChildProcess>;
  private completedTasks: Set<string>;

  constructor(options: ExecutionOptions = {}) {
    super();

    this.options = {
      maxParallelAgents: options.maxParallelAgents ?? 3,
      verbose: options.verbose ?? false,
      dryRun: options.dryRun ?? false,
      stopOnError: options.stopOnError ?? true,
    };

    this.runningAgents = new Map();
    this.completedTasks = new Set();
  }

  /**
   * Execute sprint plan
   *
   * DESIGN DECISION: Topological execution with parallel agents
   * WHY: Maximize throughput while respecting dependencies
   *
   * REASONING CHAIN:
   * 1. Load sprint plan from markdown file
   * 2. Parse tasks and dependencies
   * 3. Build execution graph (topological sort)
   * 4. Execute tasks in waves (parallel where possible)
   * 5. Track progress and handle errors
   * 6. Generate final report
   */
  async executeSprint(sprintFilePath: string): Promise<void> {
    this.emit('progress', {
      type: 'sprint-started',
      message: `Starting sprint execution: ${sprintFilePath}`,
      timestamp: new Date(),
    });

    // Stage 1: Load sprint plan
    const sprintPlan = await this.loadSprintPlan(sprintFilePath);

    if (this.options.verbose) {
      console.log(`\n=� Sprint Plan: ${sprintPlan.title}`);
      console.log(`Tasks: ${sprintPlan.tasks.length}`);
      console.log(`Estimated Duration: ${sprintPlan.estimatedDuration}\n`);
    }

    // Stage 2: Validate dependencies
    this.validateDependencies(sprintPlan.tasks);

    // Stage 3: Build execution order
    const executionOrder = this.buildExecutionOrder(sprintPlan.tasks);

    if (this.options.dryRun) {
      console.log('\nDRY RUN - Execution Order:');
      executionOrder.forEach((taskId, index) => {
        const task = sprintPlan.tasks.find((t) => t.id === taskId)!;
        console.log(`  ${index + 1}. ${task.id}: ${task.title} (${task.duration})`);
      });
      return;
    }

    // Stage 4: Execute tasks
    try {
      await this.executeTasks(sprintPlan.tasks, executionOrder);

      this.emit('progress', {
        type: 'sprint-completed',
        message: `Sprint completed successfully: ${sprintPlan.tasks.length} tasks`,
        timestamp: new Date(),
      });
    } catch (error) {
      this.emit('progress', {
        type: 'sprint-failed',
        message: `Sprint failed: ${error}`,
        timestamp: new Date(),
      });
      throw error;
    }
  }

  /**
   * Load sprint plan from markdown file
   *
   * DESIGN DECISION: Parse markdown to extract task structure
   * WHY: Sprint plans are markdown - need structured representation
   */
  private async loadSprintPlan(filePath: string): Promise<SprintPlan> {
    const content = await fs.readFile(filePath, 'utf-8');

    // Extract phase from filename (PHASE_A_ENHANCEMENT.md � A)
    const fileName = path.basename(filePath);
    const phaseMatch = fileName.match(/PHASE_([ABC])_/);
    const phase = phaseMatch ? (phaseMatch[1] as 'A' | 'B' | 'C') : 'A';

    // Parse title (first h1)
    const titleMatch = content.match(/^# (.+)$/m);
    const title = titleMatch ? titleMatch[1] : 'Sprint Plan';

    // Parse description (content between title and first task)
    const descMatch = content.match(/^# .+$\n\n(.+?)(?=\n## Task)/ms);
    const description = descMatch ? descMatch[1].trim() : '';

    // Parse estimated duration
    const durationMatch = content.match(/\*\*Estimated Duration:\*\* (.+)/);
    const estimatedDuration = durationMatch ? durationMatch[1] : 'Unknown';

    // Parse tasks
    const tasks = this.parseTasks(content, phase);

    return {
      phase,
      title,
      description,
      tasks,
      estimatedDuration,
    };
  }

  /**
   * Parse tasks from markdown content
   */
  private parseTasks(content: string, phase: 'A' | 'B' | 'C'): SprintTask[] {
    const tasks: SprintTask[] = [];

    // Match task sections: ## Task A-001: Title (capture entire section until next task or end)
    const taskRegex = /## Task ([ABC]-\d{3}): (.+?)(?=\n## Task|\n---\n\n\*\*STATUS|$)/gs;
    let match;

    while ((match = taskRegex.exec(content)) !== null) {
      const taskId = match[1];
      const taskTitle = match[2].trim();
      const taskContent = match[0];

      // Extract agent
      const agentMatch = taskContent.match(/\*\*Agent:\*\* (.+?)(?:\n|$)/);
      const agent = agentMatch ? agentMatch[1].trim() : 'general-agent';

      // Extract duration
      const durationMatch = taskContent.match(/\*\*Duration:\*\* (.+?)(?:\n|$)/);
      const duration = durationMatch ? durationMatch[1].trim() : 'Unknown';

      // Extract dependencies
      const depsMatch = taskContent.match(/\*\*Dependencies:\*\* (.+?)(?:\n|$)/);
      const dependencies: string[] = [];
      if (depsMatch) {
        const depsStr = depsMatch[1].trim();
        if (depsStr !== 'None' && depsStr !== '') {
          dependencies.push(...depsStr.split(',').map((d) => d.trim()));
        }
      }

      // Extract validation criteria
      const validationCriteria: string[] = [];
      const criteriaRegex = /- \[ \] (.+)/g;
      let criteriaMatch;
      while ((criteriaMatch = criteriaRegex.exec(taskContent)) !== null) {
        validationCriteria.push(criteriaMatch[1].trim());
      }

      // Extract description (content between title line and first **Field:** marker)
      const descMatch = taskContent.match(/## Task [ABC]-\d{3}: .+?\n\n(.+?)(?=\n\*\*[A-Z]|$)/s);
      const description = descMatch ? descMatch[1].trim() : '';

      tasks.push({
        id: taskId,
        title: taskTitle,
        description,
        agent,
        duration,
        dependencies,
        validationCriteria,
        completed: false,
      });
    }

    return tasks;
  }

  /**
   * Validate dependencies
   *
   * DESIGN DECISION: Fail fast if dependencies are invalid
   * WHY: Circular dependencies or missing tasks = unexecutable sprint
   */
  private validateDependencies(tasks: SprintTask[]): void {
    const taskIds = new Set(tasks.map((t) => t.id));

    // Check for missing dependencies
    for (const task of tasks) {
      for (const dep of task.dependencies) {
        if (!taskIds.has(dep)) {
          throw new Error(
            `Task ${task.id} depends on non-existent task ${dep}`
          );
        }
      }
    }

    // Check for circular dependencies (DFS)
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (taskId: string): boolean => {
      visited.add(taskId);
      recursionStack.add(taskId);

      const task = tasks.find((t) => t.id === taskId);
      if (!task) return false;

      for (const dep of task.dependencies) {
        if (!visited.has(dep)) {
          if (hasCycle(dep)) return true;
        } else if (recursionStack.has(dep)) {
          return true;
        }
      }

      recursionStack.delete(taskId);
      return false;
    };

    for (const task of tasks) {
      if (!visited.has(task.id)) {
        if (hasCycle(task.id)) {
          throw new Error(`Circular dependency detected involving task ${task.id}`);
        }
      }
    }
  }

  /**
   * Build execution order using topological sort
   *
   * DESIGN DECISION: Kahn's algorithm for topological sort
   * WHY: Proven algorithm, O(V+E) complexity, handles dependencies correctly
   */
  private buildExecutionOrder(tasks: SprintTask[]): string[] {
    const graph = new Map<string, string[]>();
    const inDegree = new Map<string, number>();

    // Build dependency graph
    for (const task of tasks) {
      graph.set(task.id, task.dependencies);
      inDegree.set(task.id, task.dependencies.length);
    }

    // Kahn's algorithm
    const queue: string[] = [];
    const sorted: string[] = [];

    // Find tasks with no dependencies
    inDegree.forEach((degree, taskId) => {
      if (degree === 0) {
        queue.push(taskId);
      }
    });

    while (queue.length > 0) {
      const taskId = queue.shift()!;
      sorted.push(taskId);

      // For each task that depends on this completed task
      tasks.forEach((task) => {
        if (task.dependencies.includes(taskId)) {
          const degree = inDegree.get(task.id)! - 1;
          inDegree.set(task.id, degree);

          if (degree === 0) {
            queue.push(task.id);
          }
        }
      });
    }

    if (sorted.length !== tasks.length) {
      throw new Error('Topological sort failed - circular dependency detected');
    }

    return sorted;
  }

  /**
   * Execute tasks in order
   *
   * DESIGN DECISION: Wave-based execution with parallel agents
   * WHY: Maximize throughput while respecting dependencies
   *
   * REASONING CHAIN:
   * 1. Group tasks into waves (tasks with same dependency depth)
   * 2. Execute each wave in parallel (up to maxParallelAgents)
   * 3. Wait for wave to complete before starting next
   * 4. Track progress and handle errors
   * 5. Result: Optimal execution time with correct ordering
   */
  private async executeTasks(
    tasks: SprintTask[],
    executionOrder: string[]
  ): Promise<void> {
    // Group tasks into waves
    const waves = this.groupIntoWaves(tasks, executionOrder);

    if (this.options.verbose) {
      console.log(`\nExecution waves: ${waves.length}`);
      waves.forEach((wave, index) => {
        console.log(`  Wave ${index + 1}: ${wave.length} tasks`);
      });
      console.log('');
    }

    // Execute each wave
    for (let waveIndex = 0; waveIndex < waves.length; waveIndex++) {
      const wave = waves[waveIndex];

      if (this.options.verbose) {
        console.log(`\nWave ${waveIndex + 1}/${waves.length}: ${wave.length} tasks`);
      }

      await this.executeWave(tasks, wave);
    }
  }

  /**
   * Group tasks into waves based on dependencies
   */
  private groupIntoWaves(tasks: SprintTask[], executionOrder: string[]): string[][] {
    const waves: string[][] = [];
    const taskDepth = new Map<string, number>();

    // Calculate depth for each task (max depth of dependencies + 1)
    const calculateDepth = (taskId: string): number => {
      if (taskDepth.has(taskId)) {
        return taskDepth.get(taskId)!;
      }

      const task = tasks.find((t) => t.id === taskId)!;
      if (task.dependencies.length === 0) {
        taskDepth.set(taskId, 0);
        return 0;
      }

      const maxDepDep = Math.max(...task.dependencies.map(calculateDepth));
      const depth = maxDepDep + 1;
      taskDepth.set(taskId, depth);
      return depth;
    };

    // Calculate depths
    for (const taskId of executionOrder) {
      calculateDepth(taskId);
    }

    // Group by depth
    const maxDepth = Math.max(...Array.from(taskDepth.values()));
    for (let depth = 0; depth <= maxDepth; depth++) {
      const wave = executionOrder.filter((taskId) => taskDepth.get(taskId) === depth);
      if (wave.length > 0) {
        waves.push(wave);
      }
    }

    return waves;
  }

  /**
   * Execute a wave of tasks in parallel
   */
  private async executeWave(tasks: SprintTask[], wave: string[]): Promise<void> {
    const promises: Promise<void>[] = [];

    for (const taskId of wave) {
      const task = tasks.find((t) => t.id === taskId)!;

      // Wait if too many agents running
      while (this.runningAgents.size >= this.options.maxParallelAgents) {
        await this.delay(1000);
      }

      promises.push(this.executeTask(task));
    }

    // Wait for all tasks in wave to complete
    await Promise.all(promises);
  }

  /**
   * Execute a single task
   *
   * DESIGN DECISION: Spawn Claude Code agent as subprocess
   * WHY: Isolated execution, real-time monitoring, graceful failure handling
   */
  private async executeTask(task: SprintTask): Promise<void> {
    this.emit('progress', {
      type: 'task-started',
      taskId: task.id,
      message: `Starting task ${task.id}: ${task.title}`,
      timestamp: new Date(),
    });

    task.startTime = new Date();

    try {
      // In production, this would spawn actual Claude Code agent
      // For now, simulate execution with delay
      if (this.options.verbose) {
        console.log(`  �  ${task.id}: ${task.title} (${task.agent})`);
      }

      // Simulate task execution (in production: spawn Claude Code subprocess)
      await this.simulateTaskExecution(task);

      task.completed = true;
      task.endTime = new Date();
      this.completedTasks.add(task.id);

      this.emit('progress', {
        type: 'task-completed',
        taskId: task.id,
        message: `Completed task ${task.id}: ${task.title}`,
        timestamp: new Date(),
      });

      if (this.options.verbose) {
        const duration = task.endTime.getTime() - task.startTime.getTime();
        console.log(`   ${task.id}: Completed in ${(duration / 1000).toFixed(1)}s`);
      }
    } catch (error) {
      task.error = String(error);
      task.endTime = new Date();

      this.emit('progress', {
        type: 'task-failed',
        taskId: task.id,
        message: `Failed task ${task.id}: ${error}`,
        timestamp: new Date(),
      });

      if (this.options.verbose) {
        console.error(`  L ${task.id}: Failed - ${error}`);
      }

      if (this.options.stopOnError) {
        throw new Error(`Task ${task.id} failed: ${error}`);
      }
    }
  }

  /**
   * Simulate task execution (placeholder for actual Claude Code agent spawn)
   */
  private async simulateTaskExecution(task: SprintTask): Promise<void> {
    // Parse duration to milliseconds
    const durationMs = this.parseDuration(task.duration);

    // Simulate work with delay
    await this.delay(durationMs);

    // Note: Random failures removed for deterministic tests
    // In production, actual task failures would be caught from subprocess
  }

  /**
   * Parse duration string to milliseconds
   */
  private parseDuration(duration: string): number {
    const match = duration.match(/(\d+)\s*(hour|day|minute)s?/);
    if (!match) return 10; // Default: 10ms

    const value = parseInt(match[1], 10);
    const unit = match[2];

    // For simulation, scale down dramatically for fast tests
    switch (unit) {
      case 'minute':
        return value * 1; // 1 minute = 1ms
      case 'hour':
        return value * 10; // 1 hour = 10ms
      case 'day':
        return value * 100; // 1 day = 100ms
      default:
        return 10;
    }
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get execution summary
   */
  getExecutionSummary(): {
    totalTasks: number;
    completedTasks: number;
    failedTasks: number;
    runningTasks: number;
  } {
    return {
      totalTasks: this.completedTasks.size + this.runningAgents.size,
      completedTasks: this.completedTasks.size,
      failedTasks: 0, // Would track failed tasks in production
      runningTasks: this.runningAgents.size,
    };
  }
}
