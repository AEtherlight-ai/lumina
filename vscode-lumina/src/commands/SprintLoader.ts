import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as toml from '@iarna/toml';

/**
 * SprintLoader: Loads and parses sprint data from TOML files
 *
 * DESIGN DECISION: Read directly from TOML files (not Markdown)
 * WHY: TOML enables autonomous agent execution + continuous sprint loading
 *
 * REASONING CHAIN:
 * 1. Autonomous agents (Phase 4) require structured metadata (dependencies, validation criteria)
 * 2. TOML provides machine-readable types (arrays, strings, numbers, booleans)
 * 3. Parsing performance: TOML <5ms vs Markdown ~50ms (10-20× faster)
 * 4. Continuous sprints: completed → archive → auto-promote next from backlog
 * 5. FileSystemWatcher monitors sprints/ACTIVE_SPRINT.toml for changes
 * 6. Result: Zero duplication, single source of truth, autonomous execution ready
 *
 * PATTERN: Pattern-SPRINT-001 (Sprint System with TOML Source of Truth)
 * RELATED: sprints/ACTIVE_SPRINT.toml, .aetherlight/docs/decisions/SPRINT_SYSTEM_TOML_DECISION.md
 * PERFORMANCE: <5ms TOML parsing (vs ~50ms Markdown)
 */

export type TaskStatus = 'pending' | 'in_progress' | 'completed';

export interface Engineer {
    id: string;
    name: string;
    expertise: string[];
    available_agents: string[];
    max_parallel_tasks: number;
    daily_capacity_hours: number;
}

export interface SprintTask {
    id: string;
    name: string;
    phase: string;
    description: string;
    estimated_time: string;
    estimated_lines: number;
    dependencies: string[];
    status: TaskStatus;
    agent: string;
    assigned_engineer: string;
    required_expertise: string[];
    performance_target?: string;
    patterns?: string[];
    deliverables?: string[];
    completed_date?: string;
    files_to_create?: string[];
    files_to_modify?: string[];
    validation_criteria?: string[];

    // Chain of Thought fields (Pattern-SPRINT-001, ENORM-010)
    why?: string;                    // Business justification - why this task matters
    context?: string;                // Strategic alignment & documentation links
    reasoning_chain?: string[];      // Step-by-step logical progression
    success_impact?: string;         // Concrete outcomes when task completed
    notes?: string;                  // Additional context, warnings, or meta-information
}

export interface SprintMetadata {
    sprint_name: string;
    version: string;
    total_tasks: number;
    estimated_weeks: string;
    priority: string;
    status?: string;  // active | completed | archived
    created?: string;
    phase?: string;
    design_doc?: string;
    progression?: {
        previous_sprint?: string;
        next_sprint?: string;
        backlog?: string[];
    };
}

export class SprintLoader {
    private tasks: SprintTask[] = [];
    private metadata: SprintMetadata | null = null;
    private engineers: Engineer[] = [];
    private teamSize: number = 1;
    private currentEngineer: string = '';

    constructor(private readonly context: vscode.ExtensionContext) {}

    /**
     * Find sprint file by checking multiple locations
     *
     * DESIGN DECISION: Check user config → internal/ → sprints/ → root
     * WHY: Support both ÆtherLight development and user projects
     */
    private async findSprintFile(workspaceRoot: string): Promise<string | null> {
        // Check user-configured path first
        const config = vscode.workspace.getConfiguration('aetherlight');
        const userPath = config.get<string>('sprint.filePath');
        if (userPath) {
            const fullPath = path.join(workspaceRoot, userPath);
            if (fs.existsSync(fullPath)) {
                return fullPath;
            }
        }

        // Check common locations
        const locations = [
            'internal/sprints/ACTIVE_SPRINT.toml',  // ÆtherLight development
            'sprints/ACTIVE_SPRINT.toml',           // User projects
            'ACTIVE_SPRINT.toml'                    // Root level
        ];

        for (const loc of locations) {
            const fullPath = path.join(workspaceRoot, loc);
            if (fs.existsSync(fullPath)) {
                // Save this path for future use
                await config.update('sprint.filePath', loc, vscode.ConfigurationTarget.Workspace);
                return fullPath;
            }
        }

        return null;
    }

    /**
     * Get the relative path to the sprint file (for display in UI)
     */
    public getSprintFilePath(): string {
        const config = vscode.workspace.getConfiguration('aetherlight');
        return config.get<string>('sprint.filePath') || 'sprints/ACTIVE_SPRINT.toml';
    }

    /**
     * Set the sprint file path (for switching between sprint files)
     */
    public async setSprintFilePath(relativePath: string): Promise<void> {
        const config = vscode.workspace.getConfiguration('aetherlight');
        await config.update('sprint.filePath', relativePath, vscode.ConfigurationTarget.Workspace);
    }

    /**
     * Discover all ACTIVE_SPRINT*.toml files in workspace
     */
    public async discoverAllSprintFiles(workspaceRoot: string): Promise<string[]> {
        const glob = require('glob');
        const sprintFiles: string[] = [];

        // Search for all ACTIVE_SPRINT*.toml files (including ACTIVE_SPRINT.toml and ACTIVE_SPRINT_*.toml)
        const pattern = '**/ACTIVE_SPRINT*.toml';
        const options = {
            cwd: workspaceRoot,
            ignore: ['**/node_modules/**', '**/.git/**'],
            nodir: true
        };

        return new Promise((resolve, reject) => {
            glob(pattern, options, (err: Error | null, files: string[]) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(files);
                }
            });
        });
    }

    /**
     * Load sprint plan from TOML file
     *
     * DESIGN DECISION: Check multiple locations for ACTIVE_SPRINT.toml + allow user configuration
     * WHY: Support both internal/ (ÆtherLight development) and root-level sprints/ (user projects)
     *
     * REASONING CHAIN:
     * 1. Check user-configured path first (workspaceState: aetherlight.sprint.path)
     * 2. Fallback: Check internal/sprints/ACTIVE_SPRINT.toml (ÆtherLight dev)
     * 3. Fallback: Check sprints/ACTIVE_SPRINT.toml (user projects)
     * 4. Fallback: Check ACTIVE_SPRINT.toml (root level)
     * 5. Parse TOML → extract metadata + tasks (< 5ms)
     * 6. Check if sprint completed (100% tasks done)
     * 7. If completed → Archive current → Promote next from backlog
     * 8. FileSystemWatcher detects change → UI auto-refreshes
     * 9. Result: Flexible file location, continuous sprint execution
     */
    public async loadSprint(): Promise<{ tasks: SprintTask[], metadata: SprintMetadata | null }> {
        try {
            // 1. Find workspace root
            const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
            if (!workspaceRoot) {
                throw new Error('No workspace open - cannot load sprint plan');
            }

            // 2. Find sprint file (check multiple locations)
            const sprintPath = await this.findSprintFile(workspaceRoot);
            if (!sprintPath) {
                const locations = [
                    'internal/sprints/ACTIVE_SPRINT.toml',
                    'sprints/ACTIVE_SPRINT.toml',
                    'ACTIVE_SPRINT.toml'
                ];
                throw new Error(
                    `Sprint file not found. Checked:\n${locations.map(l => `  - ${l}`).join('\n')}\n\n` +
                    `Configure location in Settings: aetherlight.sprint.filePath`
                );
            }

            // 3. Read and parse TOML file
            const tomlContent = fs.readFileSync(sprintPath, 'utf-8');
            const data = toml.parse(tomlContent) as any;

            // 4. Extract metadata
            this.metadata = this.parseTomlMetadata(data.meta);

            // 5. Extract engineers (if present)
            if (data.meta?.team?.engineers) {
                this.engineers = data.meta.team.engineers;
                this.teamSize = this.engineers.length;
                this.currentEngineer = this.engineers[0]?.id || 'unknown';
            } else {
                // Fallback: Create default engineer
                this.currentEngineer = 'engineer_1';
                this.engineers = [{
                    id: 'engineer_1',
                    name: 'Primary Engineer',
                    expertise: ['full-stack', 'rust', 'typescript'],
                    available_agents: ['rust-core-dev', 'tauri-desktop-dev', 'documentation-enforcer', 'commit-enforcer'],
                    max_parallel_tasks: 3,
                    daily_capacity_hours: 6
                }];
                this.teamSize = 1;
            }

            // 6. Extract tasks
            this.tasks = this.parseTomlTasks(data.tasks);

            // 7. Update total_tasks in metadata
            if (this.metadata) {
                this.metadata.total_tasks = this.tasks.length;
            }

            // 8. Check if sprint completed → Auto-promote next
            if (this.isSprintCompleted() && this.metadata?.progression?.next_sprint) {
                await this.promoteNextSprint(workspaceRoot);
            }

            return { tasks: this.tasks, metadata: this.metadata };
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            vscode.window.showErrorMessage(`Failed to load sprint plan: ${errorMsg}`);
            return { tasks: [], metadata: null };
        }
    }

    /**
     * Parse metadata from TOML [meta] section
     */
    private parseTomlMetadata(meta: any): SprintMetadata | null {
        if (!meta) {
            return null;
        }

        return {
            sprint_name: meta.sprint_name || 'Unknown Sprint',
            version: meta.version || '1.0',
            total_tasks: meta.total_tasks || 0,
            estimated_weeks: meta.estimated_weeks || 'Unknown',
            priority: meta.priority || 'medium',
            status: meta.status || 'active',
            created: meta.created,
            phase: meta.phase,
            design_doc: meta.design_doc,
            progression: meta.progression
        };
    }

    /**
     * Parse tasks from TOML [tasks.*] sections
     *
     * Example TOML:
     * [tasks.A-001]
     * id = "A-001"
     * name = "Create TabManager Class"
     * status = "completed"
     * dependencies = ["A-002"]
     * ...
     */
    private parseTomlTasks(tasksObj: any): SprintTask[] {
        if (!tasksObj) {
            return [];
        }

        const tasks: SprintTask[] = [];

        for (const [taskKey, taskData] of Object.entries(tasksObj)) {
            const task = taskData as any;

            tasks.push({
                id: task.id || taskKey,
                name: task.name || 'Unnamed Task',
                phase: task.phase || 'Current Sprint',
                description: task.description || '',
                estimated_time: task.estimated_time || 'Not specified',
                estimated_lines: task.estimated_lines || 0,
                dependencies: task.dependencies || [],
                status: task.status || 'pending',
                agent: task.agent || 'general-purpose',
                assigned_engineer: task.assigned_engineer || this.currentEngineer,
                required_expertise: task.required_expertise || [],
                performance_target: task.performance_target,
                patterns: task.patterns,
                deliverables: task.deliverables,
                completed_date: task.completed_date,
                files_to_create: task.files_to_create,
                files_to_modify: task.files_to_modify,
                validation_criteria: task.validation_criteria,

                // Chain of Thought fields (Pattern-SPRINT-001, ENORM-010)
                why: task.why,
                context: task.context,
                reasoning_chain: task.reasoning_chain,
                success_impact: task.success_impact,
                notes: task.notes
            });
        }

        return tasks;
    }

    /**
     * Check if sprint is 100% completed
     *
     * DESIGN DECISION: Sprint complete when all tasks status = "completed"
     * WHY: Enables automatic promotion to next sprint
     */
    private isSprintCompleted(): boolean {
        if (this.tasks.length === 0) {
            return false;
        }

        const completedTasks = this.tasks.filter(t => t.status === 'completed').length;
        return completedTasks === this.tasks.length;
    }

    /**
     * Auto-promote next sprint from backlog
     *
     * DESIGN DECISION: Move completed → archive, promote backlog → active
     * WHY: Continuous sprint execution without manual intervention
     *
     * REASONING CHAIN:
     * 1. Sprint completed (100% tasks done)
     * 2. Archive ACTIVE_SPRINT.toml → archive/PHASE_X_COMPLETE.toml
     * 3. Copy BACKLOG_PHASE_Y.toml → ACTIVE_SPRINT.toml
     * 4. FileSystemWatcher detects change → UI auto-refreshes
     * 5. Show success notification to user
     * 6. Result: Next sprint loaded automatically (zero downtime)
     *
     * PATTERN: Pattern-SPRINT-003 (Phase Completion Gates)
     * PERFORMANCE: File operations <50ms, UI refresh <500ms
     */
    private async promoteNextSprint(workspaceRoot: string): Promise<void> {
        try {
            const currentPath = path.join(workspaceRoot, 'sprints', 'ACTIVE_SPRINT.toml');
            const nextSprintPath = path.join(workspaceRoot, 'sprints', this.metadata!.progression!.next_sprint!);

            if (!fs.existsSync(nextSprintPath)) {
                vscode.window.showWarningMessage(`Next sprint not found: ${this.metadata!.progression!.next_sprint}`);
                return;
            }

            // 1. Archive current sprint
            const archivePath = path.join(
                workspaceRoot,
                'sprints',
                'archive',
                `${this.metadata!.sprint_name.replace(/[^a-zA-Z0-9_-]/g, '_')}_COMPLETE.toml`
            );

            fs.renameSync(currentPath, archivePath);
            console.log(`[ÆtherLight] Archived sprint: ${archivePath}`);

            // 2. Promote next sprint to active
            fs.copyFileSync(nextSprintPath, currentPath);
            console.log(`[ÆtherLight] Promoted next sprint: ${this.metadata!.progression!.next_sprint}`);

            // 3. Show success notification
            vscode.window.showInformationMessage(
                `🎉 Sprint completed! Next sprint loaded: ${this.metadata!.progression!.next_sprint}`,
                'View Sprint'
            ).then(selection => {
                if (selection === 'View Sprint') {
                    vscode.commands.executeCommand('aetherlight.showVoicePanel');
                }
            });

            // 4. FileSystemWatcher will trigger UI refresh automatically
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            vscode.window.showErrorMessage(`Failed to promote next sprint: ${errorMsg}`);
        }
    }

    /**
     * Update task status in TOML file
     *
     * DESIGN DECISION: Write directly to TOML file, not workspace state
     * WHY: TOML is single source of truth, workspace state is deprecated
     *
     * REASONING CHAIN:
     * 1. Agent completes task → calls updateTaskStatus("A-001", "completed")
     * 2. Load TOML → Parse → Update task status → Stringify → Write
     * 3. FileSystemWatcher detects change → UI auto-refreshes (500ms)
     * 4. Git commit captures status change (task traceability)
     * 5. Result: Status always synced across UI + file system + git
     *
     * PATTERN: Pattern-SPRINT-002 (Git-Sprint Synchronization)
     * PERFORMANCE: Read + parse + write <50ms
     */
    public async updateTaskStatus(taskId: string, newStatus: TaskStatus): Promise<void> {
        try {
            const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
            if (!workspaceRoot) {
                throw new Error('No workspace open');
            }

            const sprintPath = path.join(workspaceRoot, 'sprints', 'ACTIVE_SPRINT.toml');
            const tomlContent = fs.readFileSync(sprintPath, 'utf-8');
            const data = toml.parse(tomlContent) as any;

            // Find task in TOML
            if (!data.tasks || !data.tasks[taskId]) {
                throw new Error(`Task ${taskId} not found in ACTIVE_SPRINT.toml`);
            }

            // Update status
            data.tasks[taskId].status = newStatus;

            // Add completion date if completed
            if (newStatus === 'completed' && !data.tasks[taskId].completed_date) {
                data.tasks[taskId].completed_date = new Date().toISOString().split('T')[0];
            }

            // Write back to TOML
            const updatedToml = toml.stringify(data as toml.JsonMap);
            fs.writeFileSync(sprintPath, updatedToml, 'utf-8');

            console.log(`[ÆtherLight] Updated task ${taskId} status: ${newStatus}`);

            // Update in-memory task list
            const task = this.tasks.find(t => t.id === taskId);
            if (task) {
                task.status = newStatus;
                if (newStatus === 'completed' && !task.completed_date) {
                    task.completed_date = new Date().toISOString().split('T')[0];
                }
            }

            // FileSystemWatcher will trigger UI refresh automatically
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            vscode.window.showErrorMessage(`Failed to update task status: ${errorMsg}`);
        }
    }

    /**
     * Save task statuses (DEPRECATED - now writes to TOML directly)
     *
     * Kept for backwards compatibility but no longer used.
     * Use updateTaskStatus() instead.
     */
    public async saveTaskStatuses(tasks: SprintTask[]): Promise<void> {
        // No-op: TOML is now source of truth, workspace state is deprecated
        console.warn('[ÆtherLight] saveTaskStatuses() is deprecated. Use updateTaskStatus() instead.');
    }

    /**
     * Toggle task status: pending → in_progress → completed → pending
     */
    public async toggleTaskStatus(task: SprintTask): Promise<void> {
        let newStatus: TaskStatus;

        switch (task.status) {
            case 'pending':
                newStatus = 'in_progress';
                break;
            case 'in_progress':
                newStatus = 'completed';
                break;
            case 'completed':
                newStatus = 'pending';
                break;
            default:
                newStatus = 'pending';
        }

        await this.updateTaskStatus(task.id, newStatus);
    }

    /**
     * Get task by ID
     */
    public getTask(taskId: string): SprintTask | undefined {
        return this.tasks.find(t => t.id === taskId);
    }

    /**
     * Get all tasks
     */
    public getTasks(): SprintTask[] {
        return this.tasks;
    }

    /**
     * Get tasks grouped by phase
     */
    public getTasksByPhase(): Map<string, SprintTask[]> {
        const phases = new Map<string, SprintTask[]>();

        for (const task of this.tasks) {
            if (!phases.has(task.phase)) {
                phases.set(task.phase, []);
            }
            phases.get(task.phase)!.push(task);
        }

        return phases;
    }

    /**
     * Get overall progress statistics
     */
    public getProgressStats(): { completed: number, inProgress: number, pending: number, total: number, percentage: number } {
        const completed = this.tasks.filter(t => t.status === 'completed').length;
        const inProgress = this.tasks.filter(t => t.status === 'in_progress').length;
        const pending = this.tasks.filter(t => t.status === 'pending').length;
        const total = this.tasks.length;
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

        return { completed, inProgress, pending, total, percentage };
    }

    /**
     * Get all engineers
     */
    public getEngineers(): Engineer[] {
        return this.engineers;
    }

    /**
     * Get engineer profile by ID
     */
    public getEngineerProfile(id: string): Engineer | undefined {
        return this.engineers.find(e => e.id === id);
    }

    /**
     * Get tasks assigned to a specific engineer
     */
    public getTasksByEngineer(engineerId: string): SprintTask[] {
        return this.tasks.filter(t => t.assigned_engineer === engineerId);
    }

    /**
     * Get team size (number of engineers)
     */
    public getTeamSize(): number {
        return this.teamSize;
    }

    /**
     * Get current engineer ID
     */
    public getCurrentEngineer(): string {
        return this.currentEngineer;
    }

    /**
     * Get metadata
     */
    public getMetadata(): SprintMetadata | null {
        return this.metadata;
    }
}
