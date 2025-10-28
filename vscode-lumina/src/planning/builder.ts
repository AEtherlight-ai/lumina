/**
 * Interactive Sprint Builder - Visual sprint plan editor
 *
 * DESIGN DECISION: Form-based UI for task creation/editing
 * WHY: Users need to modify AI-generated plans, forms easier than YAML editing
 *
 * REASONING CHAIN:
 * 1. User reviews AI-generated plan
 * 2. Wants to change DB-001 duration from 2h to 3h
 * 3. Opens builder UI (form with task fields)
 * 4. Edits duration field: "3 hours"
 * 5. Clicks Save → Plan updated
 * 6. Result: Easy editing without YAML syntax knowledge
 *
 * PATTERN: Pattern-UI-004 (Form-Based Sprint Builder)
 * RELATED: AS-019 (Interactive Sprint Builder)
 */

import { SprintPlan, Task, TaskId, AgentType, ApprovalGate } from '../sprint_parser/types';

/**
 * Sprint builder (manages sprint plan editing)
 */
export class SprintBuilder {
    private plan: SprintPlan;

    constructor(plan: SprintPlan) {
        this.plan = JSON.parse(JSON.stringify(plan));  // Deep copy
    }

    /**
     * Get sprint plan
     */
    getPlan(): SprintPlan {
        return JSON.parse(JSON.stringify(this.plan));
    }

    /**
     * Update sprint metadata
     */
    updateMetadata(updates: Partial<SprintPlan['metadata']>): void {
        this.plan.metadata = {
            ...this.plan.metadata,
            ...updates,
        };
    }

    /**
     * Add task
     */
    addTask(task: Task): void {
        // Validate task ID unique
        if (this.plan.tasks.some(t => t.id === task.id)) {
            throw new Error(`Task ID ${task.id} already exists`);
        }

        this.plan.tasks.push(task);
    }

    /**
     * Update task
     */
    updateTask(taskId: TaskId, updates: Partial<Task>): void {
        const index = this.plan.tasks.findIndex(t => t.id === taskId);
        if (index === -1) {
            throw new Error(`Task ${taskId} not found`);
        }

        this.plan.tasks[index] = {
            ...this.plan.tasks[index],
            ...updates,
        };
    }

    /**
     * Remove task
     */
    removeTask(taskId: TaskId): void {
        const index = this.plan.tasks.findIndex(t => t.id === taskId);
        if (index === -1) {
            throw new Error(`Task ${taskId} not found`);
        }

        // Remove task
        this.plan.tasks.splice(index, 1);

        // Remove from dependencies
        this.plan.tasks.forEach(task => {
            task.dependencies = task.dependencies.filter(dep => dep !== taskId);
        });
    }

    /**
     * Add dependency
     */
    addDependency(taskId: TaskId, dependsOn: TaskId): void {
        const task = this.plan.tasks.find(t => t.id === taskId);
        if (!task) {
            throw new Error(`Task ${taskId} not found`);
        }

        // Check dependency exists
        if (!this.plan.tasks.some(t => t.id === dependsOn)) {
            throw new Error(`Dependency ${dependsOn} not found`);
        }

        // Check not already added
        if (task.dependencies.includes(dependsOn)) {
            return;
        }

        // Check won't create cycle
        if (this.wouldCreateCycle(taskId, dependsOn)) {
            throw new Error(`Adding dependency would create cycle: ${taskId} → ${dependsOn}`);
        }

        task.dependencies.push(dependsOn);
    }

    /**
     * Remove dependency
     */
    removeDependency(taskId: TaskId, dependsOn: TaskId): void {
        const task = this.plan.tasks.find(t => t.id === taskId);
        if (!task) {
            throw new Error(`Task ${taskId} not found`);
        }

        task.dependencies = task.dependencies.filter(dep => dep !== dependsOn);
    }

    /**
     * Check if adding dependency would create cycle
     *
     * DESIGN DECISION: DFS cycle detection
     * WHY: Prevent invalid DAG structures
     */
    private wouldCreateCycle(taskId: TaskId, dependsOn: TaskId): boolean {
        const visited = new Set<TaskId>();
        const stack = [dependsOn];

        while (stack.length > 0) {
            const current = stack.pop()!;

            if (current === taskId) {
                return true;  // Cycle detected
            }

            if (visited.has(current)) {
                continue;
            }

            visited.add(current);

            // Add dependencies to stack
            const task = this.plan.tasks.find(t => t.id === current);
            if (task) {
                stack.push(...task.dependencies);
            }
        }

        return false;
    }

    /**
     * Add approval gate
     */
    addApprovalGate(gate: ApprovalGate): void {
        if (!this.plan.approvalGates) {
            this.plan.approvalGates = [];
        }

        this.plan.approvalGates.push(gate);
    }

    /**
     * Remove approval gate
     */
    removeApprovalGate(index: number): void {
        if (this.plan.approvalGates && index >= 0 && index < this.plan.approvalGates.length) {
            this.plan.approvalGates.splice(index, 1);
        }
    }

    /**
     * Validate sprint plan
     *
     * DESIGN DECISION: Validate before saving
     * WHY: Catch errors early (invalid dependencies, cycles, etc.)
     */
    validate(): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        // Check at least one task
        if (this.plan.tasks.length === 0) {
            errors.push('Sprint must have at least one task');
        }

        // Check all task IDs unique
        const ids = new Set<TaskId>();
        this.plan.tasks.forEach(task => {
            if (ids.has(task.id)) {
                errors.push(`Duplicate task ID: ${task.id}`);
            }
            ids.add(task.id);
        });

        // Check all dependencies exist
        this.plan.tasks.forEach(task => {
            task.dependencies.forEach(dep => {
                if (!ids.has(dep)) {
                    errors.push(`Task ${task.id} depends on non-existent task: ${dep}`);
                }
            });
        });

        // Check no cycles
        if (this.hasCycle()) {
            errors.push('Sprint plan contains dependency cycle');
        }

        return {
            valid: errors.length === 0,
            errors,
        };
    }

    /**
     * Check if plan has cycle
     */
    private hasCycle(): boolean {
        const visited = new Set<TaskId>();
        const stack = new Set<TaskId>();

        const dfs = (taskId: TaskId): boolean => {
            if (stack.has(taskId)) {
                return true;  // Cycle found
            }

            if (visited.has(taskId)) {
                return false;
            }

            visited.add(taskId);
            stack.add(taskId);

            const task = this.plan.tasks.find(t => t.id === taskId);
            if (task) {
                for (const dep of task.dependencies) {
                    if (dfs(dep)) {
                        return true;
                    }
                }
            }

            stack.delete(taskId);
            return false;
        };

        for (const task of this.plan.tasks) {
            if (dfs(task.id)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Export to YAML string
     *
     * DESIGN DECISION: Generate YAML from plan object
     * WHY: Users can copy/paste to file, version control
     */
    toYAML(): string {
        const metadata = this.plan.metadata || {};
        let yaml = `name: ${metadata.name || 'Unnamed Sprint'}\n`;
        yaml += `description: ${metadata.description || 'No description'}\n`;
        yaml += `version: ${metadata.version || '1.0'}\n`;
        yaml += `author: ${metadata.author || 'Unknown'}\n\n`;

        yaml += `tasks:\n`;
        this.plan.tasks.forEach(task => {
            yaml += `  - id: ${task.id}\n`;
            yaml += `    agent: ${task.agent}\n`;
            yaml += `    description: ${task.description}\n`;
            yaml += `    estimatedDuration: ${task.estimatedDuration}\n`;

            if (task.dependencies.length > 0) {
                yaml += `    dependencies:\n`;
                task.dependencies.forEach(dep => {
                    yaml += `      - ${dep}\n`;
                });
            }

            yaml += `\n`;
        });

        if (this.plan.approvalGates && this.plan.approvalGates.length > 0) {
            yaml += `approvalGates:\n`;
            this.plan.approvalGates.forEach(gate => {
                yaml += `  - task_id: ${gate.task_id}\n`;
                yaml += `    gate_type: ${gate.gate_type}\n`;
                yaml += `    description: ${gate.description}\n\n`;
            });
        }

        return yaml;
    }
}
