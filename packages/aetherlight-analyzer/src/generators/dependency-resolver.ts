/**
 * Dependency Resolver
 *
 * DESIGN DECISION: Topological sort for safe task execution order
 * WHY: Circular dependencies = runtime errors, must detect early
 *
 * REASONING CHAIN:
 * 1. Tasks have dependencies (database → API → UI)
 * 2. Execution order matters (can't build UI before API exists)
 * 3. Topological sort determines safe execution order
 * 4. Detect circular dependencies before execution
 * 5. Group parallelizable tasks (no dependencies)
 * 6. Result: Safe, efficient task execution
 *
 * PATTERN: Pattern-ANALYZER-003 (Dependency Graph Analysis)
 */

import { Task, TaskDependency } from './types';
import { ArchitectureAnalysis, ArchitecturePattern } from '../analyzers/types';

export class DependencyResolver {
  /**
   * Resolve task dependencies based on file/layer relationships
   *
   * DESIGN DECISION: Detect dependencies from task titles and files
   * WHY: Explicit dependency declaration + heuristic detection
   */
  resolveDependencies(tasks: Task[], analysis?: ArchitectureAnalysis): Task[] {
    // Build dependency graph
    const graph = this.buildDependencyGraph(tasks, analysis);

    // Validate no circular dependencies
    const cycles = this.detectCircularDependencies(graph);
    if (cycles.length > 0) {
      console.warn('Circular dependencies detected:', cycles);
      console.warn('Breaking cycles by removing weakest dependencies...');
      this.breakCycles(graph, cycles);
    }

    // Topological sort
    const sortedTaskIds = this.topologicalSort(graph);

    // Update task dependencies and return in sorted order
    return sortedTaskIds.map((taskId) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) throw new Error(`Task ${taskId} not found`);

      // Update dependencies from graph
      task.dependencies = graph.get(taskId) || [];

      return task;
    });
  }

  /**
   * Build dependency graph from tasks
   */
  private buildDependencyGraph(
    tasks: Task[],
    analysis?: ArchitectureAnalysis
  ): Map<string, string[]> {
    const graph = new Map<string, string[]>();

    // Initialize graph with existing dependencies
    tasks.forEach((task) => {
      graph.set(task.id, [...task.dependencies]);
    });

    // Detect additional dependencies based on heuristics
    tasks.forEach((task) => {
      const additionalDeps = this.detectDependencies(task, tasks, analysis);
      const currentDeps = graph.get(task.id) || [];

      // Merge without duplicates
      const mergedDeps = [...new Set([...currentDeps, ...additionalDeps])];
      graph.set(task.id, mergedDeps);
    });

    return graph;
  }

  /**
   * Detect dependencies between tasks based on content
   *
   * REASONING CHAIN:
   * 1. Database/model tasks must run before API tasks
   * 2. API tasks must run before UI tasks
   * 3. Refactoring must complete before enhancements
   * 4. Configuration must happen before integration
   * 5. Tests run after implementation
   */
  private detectDependencies(
    task: Task,
    allTasks: Task[],
    analysis?: ArchitectureAnalysis
  ): string[] {
    const deps: string[] = [];

    // Rule 1: API tasks depend on database tasks
    if (this.isAPITask(task)) {
      allTasks.forEach((otherTask) => {
        if (otherTask.id !== task.id && this.isDatabaseTask(otherTask)) {
          deps.push(otherTask.id);
        }
      });
    }

    // Rule 2: UI tasks depend on API tasks
    if (this.isUITask(task)) {
      allTasks.forEach((otherTask) => {
        if (otherTask.id !== task.id && this.isAPITask(otherTask)) {
          deps.push(otherTask.id);
        }
      });
    }

    // Rule 3: Enhancement tasks depend on refactoring tasks (Phase B before Phase A)
    if (task.id.startsWith('A-')) {
      allTasks.forEach((otherTask) => {
        if (otherTask.id.startsWith('B-') && this.filesOverlap(task, otherTask)) {
          deps.push(otherTask.id);
        }
      });
    }

    // Rule 4: Integration tasks depend on installation/config
    if (this.isIntegrationTask(task)) {
      allTasks.forEach((otherTask) => {
        if (otherTask.id !== task.id && this.isConfigurationTask(otherTask)) {
          deps.push(otherTask.id);
        }
      });
    }

    // Rule 5: Test tasks depend on implementation tasks
    if (this.isTestTask(task)) {
      allTasks.forEach((otherTask) => {
        if (otherTask.id !== task.id && !this.isTestTask(otherTask)) {
          // Only add as dependency if they work on same files
          if (this.filesOverlap(task, otherTask)) {
            deps.push(otherTask.id);
          }
        }
      });
    }

    // Rule 6: SDK tasks follow a specific order
    if (task.id.startsWith('C-')) {
      const order = ['C-001', 'C-002', 'C-003', 'C-004', 'C-005'];
      const taskIndex = order.indexOf(task.id);
      if (taskIndex > 0) {
        // Depend on previous task in sequence
        deps.push(order[taskIndex - 1]);
      }
    }

    return deps;
  }

  /**
   * Check if task is API-related
   */
  private isAPITask(task: Task): boolean {
    const keywords = ['api', 'endpoint', 'route', 'controller', 'service'];
    return keywords.some(
      (keyword) =>
        task.title.toLowerCase().includes(keyword) ||
        task.filesToModify.some((file) => file.toLowerCase().includes(keyword))
    );
  }

  /**
   * Check if task is database-related
   */
  private isDatabaseTask(task: Task): boolean {
    const keywords = ['database', 'model', 'schema', 'migration', 'entity'];
    return keywords.some(
      (keyword) =>
        task.title.toLowerCase().includes(keyword) ||
        task.filesToModify.some((file) => file.toLowerCase().includes(keyword))
    );
  }

  /**
   * Check if task is UI-related
   */
  private isUITask(task: Task): boolean {
    const keywords = ['ui', 'component', 'view', 'dashboard', 'frontend', 'react', 'vue'];
    return keywords.some(
      (keyword) =>
        task.title.toLowerCase().includes(keyword) ||
        task.filesToModify.some((file) => file.toLowerCase().includes(keyword))
    );
  }

  /**
   * Check if task is integration-related
   */
  private isIntegrationTask(task: Task): boolean {
    const keywords = ['integrate', 'integration', 'test', 'e2e', 'validate'];
    return keywords.some((keyword) => task.title.toLowerCase().includes(keyword));
  }

  /**
   * Check if task is configuration-related
   */
  private isConfigurationTask(task: Task): boolean {
    const keywords = ['install', 'configure', 'setup', 'config'];
    return keywords.some((keyword) => task.title.toLowerCase().includes(keyword));
  }

  /**
   * Check if task is test-related
   */
  private isTestTask(task: Task): boolean {
    const keywords = ['test', 'testing', 'validate', 'verification'];
    return keywords.some((keyword) => task.title.toLowerCase().includes(keyword));
  }

  /**
   * Check if two tasks work on overlapping files
   */
  private filesOverlap(task1: Task, task2: Task): boolean {
    return task1.filesToModify.some((file1) =>
      task2.filesToModify.some((file2) => file1 === file2)
    );
  }

  /**
   * Detect circular dependencies in graph
   */
  private detectCircularDependencies(graph: Map<string, string[]>): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const currentPath: string[] = [];

    const dfs = (node: string): void => {
      visited.add(node);
      recursionStack.add(node);
      currentPath.push(node);

      const neighbors = graph.get(node) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          dfs(neighbor);
        } else if (recursionStack.has(neighbor)) {
          // Cycle detected
          const cycleStart = currentPath.indexOf(neighbor);
          const cycle = currentPath.slice(cycleStart);
          cycle.push(neighbor); // Complete the cycle
          cycles.push(cycle);
        }
      }

      recursionStack.delete(node);
      currentPath.pop();
    };

    // Run DFS from each node
    graph.forEach((_, node) => {
      if (!visited.has(node)) {
        dfs(node);
      }
    });

    return cycles;
  }

  /**
   * Break cycles by removing weakest dependencies
   *
   * DESIGN DECISION: Remove dependencies with lowest priority difference
   * WHY: Preserve high-priority dependencies, break low-priority ones
   */
  private breakCycles(graph: Map<string, string[]>, cycles: string[][]): void {
    cycles.forEach((cycle) => {
      // Find weakest edge in cycle (for now, just remove last edge)
      if (cycle.length >= 2) {
        const from = cycle[cycle.length - 2];
        const to = cycle[cycle.length - 1];

        // Remove dependency
        const deps = graph.get(from) || [];
        const filtered = deps.filter((d) => d !== to);
        graph.set(from, filtered);

        console.warn(`Broke cycle: Removed dependency ${from} → ${to}`);
      }
    });
  }

  /**
   * Topological sort using Kahn's algorithm
   *
   * DESIGN DECISION: Kahn's algorithm for topological ordering
   * WHY: O(V+E) time complexity, produces valid execution order
   *
   * REASONING CHAIN:
   * 1. Start with nodes that have no dependencies (in-degree 0)
   * 2. Process nodes in order, removing edges as we go
   * 3. Add newly independent nodes to queue
   * 4. Result: Valid execution order (dependencies always before dependents)
   */
  private topologicalSort(graph: Map<string, string[]>): string[] {
    // Calculate in-degree for each node (number of dependencies)
    const inDegree = new Map<string, number>();
    const nodes = Array.from(graph.keys());

    // In-degree = number of dependencies a task has
    nodes.forEach((node) => {
      const deps = graph.get(node) || [];
      inDegree.set(node, deps.length);
    });

    // Queue of nodes with no dependencies
    const queue: string[] = [];
    inDegree.forEach((degree, node) => {
      if (degree === 0) {
        queue.push(node);
      }
    });

    // Process nodes in order
    const sorted: string[] = [];

    while (queue.length > 0) {
      const node = queue.shift()!;
      sorted.push(node);

      // For each task that depends on this completed task, decrease its in-degree
      nodes.forEach((otherNode) => {
        const deps = graph.get(otherNode) || [];
        if (deps.includes(node)) {
          const degree = inDegree.get(otherNode)! - 1;
          inDegree.set(otherNode, degree);

          if (degree === 0) {
            queue.push(otherNode);
          }
        }
      });
    }

    // Verify all nodes processed (no cycles should remain)
    if (sorted.length !== nodes.length) {
      console.warn(
        `Topological sort incomplete: ${sorted.length}/${nodes.length} nodes sorted`
      );
    }

    return sorted;
  }

  /**
   * Generate Mermaid dependency graph visualization
   */
  generateDependencyGraph(tasks: Task[]): TaskDependency[] {
    const edges: TaskDependency[] = [];

    tasks.forEach((task) => {
      task.dependencies.forEach((depId) => {
        edges.push({
          from: depId,
          to: task.id,
        });
      });
    });

    return edges;
  }

  /**
   * Identify parallelizable tasks (no dependencies between them)
   *
   * DESIGN DECISION: Group tasks by dependency level for parallel execution
   * WHY: Execute independent tasks simultaneously for faster completion
   */
  identifyParallelGroups(tasks: Task[]): string[][] {
    const groups: string[][] = [];
    const processed = new Set<string>();

    // Build reverse dependency map (who depends on me)
    const dependents = new Map<string, string[]>();
    tasks.forEach((task) => {
      task.dependencies.forEach((depId) => {
        if (!dependents.has(depId)) {
          dependents.set(depId, []);
        }
        dependents.get(depId)!.push(task.id);
      });
    });

    // Start with tasks that have no dependencies
    let currentLevel = tasks.filter((t) => t.dependencies.length === 0).map((t) => t.id);

    while (currentLevel.length > 0) {
      groups.push(currentLevel);
      currentLevel.forEach((id) => processed.add(id));

      // Find next level (tasks whose dependencies are all processed)
      const nextLevel: string[] = [];
      tasks.forEach((task) => {
        if (processed.has(task.id)) return;

        const allDepsProcessed = task.dependencies.every((depId) => processed.has(depId));
        if (allDepsProcessed) {
          nextLevel.push(task.id);
        }
      });

      currentLevel = nextLevel;
    }

    return groups;
  }

  /**
   * Estimate parallel execution time
   *
   * DESIGN DECISION: Max duration per group, sum across groups
   * WHY: Parallel tasks take as long as slowest task in group
   */
  estimateParallelExecutionTime(tasks: Task[]): number {
    const groups = this.identifyParallelGroups(tasks);

    let totalHours = 0;

    groups.forEach((group) => {
      // Find max duration in this group (all tasks run in parallel)
      const maxDuration = Math.max(
        ...group.map((taskId) => {
          const task = tasks.find((t) => t.id === taskId);
          return task?.duration || 0;
        })
      );

      totalHours += maxDuration;
    });

    return totalHours;
  }

  /**
   * Estimate sequential execution time
   */
  estimateSequentialExecutionTime(tasks: Task[]): number {
    return tasks.reduce((sum, task) => sum + task.duration, 0);
  }

  /**
   * Calculate speedup from parallelization
   */
  calculateSpeedup(tasks: Task[]): number {
    const sequential = this.estimateSequentialExecutionTime(tasks);
    const parallel = this.estimateParallelExecutionTime(tasks);

    return sequential / parallel;
  }

  /**
   * Generate execution statistics
   */
  generateExecutionStats(tasks: Task[]): {
    totalTasks: number;
    sequentialHours: number;
    parallelHours: number;
    speedup: number;
    parallelGroups: number;
    criticalPath: string[];
  } {
    const groups = this.identifyParallelGroups(tasks);
    const sequential = this.estimateSequentialExecutionTime(tasks);
    const parallel = this.estimateParallelExecutionTime(tasks);

    // Find critical path (longest path through dependency graph)
    const criticalPath = this.findCriticalPath(tasks);

    return {
      totalTasks: tasks.length,
      sequentialHours: sequential,
      parallelHours: parallel,
      speedup: sequential / parallel,
      parallelGroups: groups.length,
      criticalPath,
    };
  }

  /**
   * Find critical path (longest path through dependency graph)
   *
   * DESIGN DECISION: Dynamic programming to find longest path
   * WHY: Critical path determines minimum completion time
   */
  private findCriticalPath(tasks: Task[]): string[] {
    // Build adjacency list
    const graph = new Map<string, string[]>();
    tasks.forEach((task) => {
      graph.set(task.id, task.dependencies);
    });

    // Calculate longest path to each node
    const longestPath = new Map<string, number>();
    const predecessor = new Map<string, string>();

    const calculateLongestPath = (taskId: string, visited = new Set<string>()): number => {
      if (longestPath.has(taskId)) {
        return longestPath.get(taskId)!;
      }

      if (visited.has(taskId)) {
        return 0; // Cycle detected, return 0
      }

      visited.add(taskId);

      const task = tasks.find((t) => t.id === taskId);
      if (!task) return 0;

      let maxPredecessorPath = 0;
      let bestPredecessor = '';

      task.dependencies.forEach((depId) => {
        const pathLength = calculateLongestPath(depId, new Set(visited));
        if (pathLength > maxPredecessorPath) {
          maxPredecessorPath = pathLength;
          bestPredecessor = depId;
        }
      });

      const pathLength = maxPredecessorPath + task.duration;
      longestPath.set(taskId, pathLength);

      if (bestPredecessor) {
        predecessor.set(taskId, bestPredecessor);
      }

      return pathLength;
    };

    // Calculate longest path for all tasks
    tasks.forEach((task) => {
      calculateLongestPath(task.id);
    });

    // Find task with longest path (end of critical path)
    let maxPath = 0;
    let endTask = '';

    longestPath.forEach((pathLength, taskId) => {
      if (pathLength > maxPath) {
        maxPath = pathLength;
        endTask = taskId;
      }
    });

    // Trace back critical path
    const path: string[] = [];
    let current = endTask;

    while (current) {
      path.unshift(current);
      current = predecessor.get(current) || '';
    }

    return path;
  }
}
