import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as toml from '@iarna/toml';

/**
 * SprintLoader: Loads and parses sprint data from TOML files
 *
 * @protected - Core sprint parsing functionality, refactor only
 * Locked: 2025-11-07 (v0.16.7 manual test PASS)
 * Tests: TOML parsing with rich fields (description, why, context, reasoning_chain)
 * Reference: PROTECT-001 stabilization (phase-1), SprintLoader.ts:504-534 parseTomlTasks
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
    // Enhanced prompt fields (used by SprintRenderer)
    why?: string;
    context?: string;
    reasoning_chain?: string[];
    pattern_context?: string;
    success_impact?: string;
    // Test-related fields (TDD enforcement)
    error_handling?: string;
    test_requirements?: string;
    test_files?: string[];
    test_coverage_requirement?: number;
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
    private lastErrorShown: string = ''; // Prevent error spam
    private lastErrorTime: number = 0;
    private currentSprintPath: string | null = null; // Track resolved sprint file path

    constructor(private readonly context: vscode.ExtensionContext) {}

    /**
     * Load sprint plan from TOML file
     *
     * DESIGN DECISION: Read from sprints/ACTIVE_SPRINT.toml
     * WHY: Single source of truth for autonomous agents + continuous sprint loading
     *
     * REASONING CHAIN:
     * 1. Check if sprints/ACTIVE_SPRINT.toml exists
     * 2. Parse TOML → extract metadata + tasks (< 5ms)
     * 3. Check if sprint completed (100% tasks done)
     * 4. If completed → Archive current → Promote next from backlog
     * 5. FileSystemWatcher detects change → UI auto-refreshes
     * 6. Result: Continuous sprint execution, zero manual intervention
     */
    public async loadSprint(): Promise<{ tasks: SprintTask[], metadata: SprintMetadata | null }> {
        try {
            // 1. Find workspace root
            const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
            if (!workspaceRoot) {
                throw new Error('No workspace open - cannot load sprint plan');
            }

            // 2. Use current sprint path if already set (from dropdown selection or previous load)
            //    Otherwise resolve default sprint file path with fallback logic
            let sprintPath: string | null;
            if (this.currentSprintPath && fs.existsSync(this.currentSprintPath)) {
                sprintPath = this.currentSprintPath;
                console.log(`[ÆtherLight] Reloading selected sprint: ${sprintPath}`);
            } else {
                sprintPath = this.resolveSprintFilePath(workspaceRoot);
                if (!sprintPath) {
                    // Silently return empty state - sprint features are optional
                    console.log('[ÆtherLight] No sprint file found - sprint features disabled');
                    return { tasks: [], metadata: null };
                }
                // Store the resolved path for future reloads
                this.currentSprintPath = sprintPath;
                console.log(`[ÆtherLight] Loading sprint from: ${sprintPath}`);
            }

            // 3. Read and parse TOML file
            const tomlContent = fs.readFileSync(sprintPath, 'utf-8');

            // Try to parse TOML - if it fails, help user fix the syntax error
            let data: any;
            try {
                data = toml.parse(tomlContent) as any;
            } catch (parseError) {
                // IMPORTANT: Don't delete the file! User's work is in there.
                // Show helpful error message and offer to open the file
                const errorMsg = parseError instanceof Error ? parseError.message : 'Unknown parse error';
                console.error('[ÆtherLight] TOML parsing failed:', errorMsg);

                // Throttle error notifications (max once per 30 seconds for same error)
                const now = Date.now();
                const shouldShowError = (
                    this.lastErrorShown !== errorMsg ||
                    (now - this.lastErrorTime) > 30000
                );

                if (shouldShowError) {
                    this.lastErrorShown = errorMsg;
                    this.lastErrorTime = now;

                    vscode.window.showErrorMessage(
                        `Sprint file has syntax error: ${errorMsg}`,
                        'Open Sprint File',
                        'View Docs'
                    ).then(selection => {
                        if (selection === 'Open Sprint File') {
                            vscode.workspace.openTextDocument(sprintPath).then(doc => {
                                vscode.window.showTextDocument(doc);
                            });
                        } else if (selection === 'View Docs') {
                            vscode.env.openExternal(vscode.Uri.parse('https://toml.io/en/v1.0.0'));
                        }
                    });
                }

                // Return empty state but don't delete the file
                return { tasks: [], metadata: null };
            }

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
            // Log error but don't show modal notification (prevents spam)
            console.error('[ÆtherLight] Failed to load sprint plan:', errorMsg);
            return { tasks: [], metadata: null };
        }
    }

    /**
     * Resolve sprint file path with auto-creation
     *
     * DESIGN DECISION: Auto-create sprint file if missing (never fail)
     * WHY: Better UX - extension works out of the box with template sprint
     *
     * DEV MODE (aetherlight.devMode = true):
     * 1. User-configured path from settings (aetherlight.sprintFile)
     * 2. internal/sprints/ACTIVE_SPRINT.toml (dev - not in git)
     * 3. sprints/ACTIVE_SPRINT.toml (fallback)
     * 4. Auto-create internal/sprints/ACTIVE_SPRINT.toml if none exist
     *
     * PRODUCTION MODE (aetherlight.devMode = false):
     * 1. User-configured path from settings (aetherlight.sprintFile)
     * 2. sprints/ACTIVE_SPRINT.toml ONLY (simulates production user experience)
     * 3. Auto-create sprints/ACTIVE_SPRINT.toml if missing
     *
     * This enables dogfooding: develop AetherLight using AetherLight sprints,
     * while testing how production users will experience the extension.
     */
    private resolveSprintFilePath(workspaceRoot: string): string | null {
        const config = vscode.workspace.getConfiguration('aetherlight');
        const devMode = config.get<boolean>('devMode', false);

        // 1. Always check user-configured path first
        const configuredPath = config.get<string>('sprintFile');
        if (configuredPath) {
            const fullPath = path.join(workspaceRoot, configuredPath);
            if (fs.existsSync(fullPath)) {
                console.log(`[ÆtherLight] Using configured sprint file: ${configuredPath}`);
                return fullPath;
            }
            // Create configured path if it doesn't exist
            console.log(`[ÆtherLight] Configured sprint file not found, creating: ${configuredPath}`);
            this.createDefaultSprintFile(fullPath);
            return fullPath;
        }

        if (devMode) {
            // DEV MODE: Check internal/ first, then fall back to sprints/
            const internalPath = path.join(workspaceRoot, 'internal', 'sprints', 'ACTIVE_SPRINT.toml');
            if (fs.existsSync(internalPath)) {
                console.log('[ÆtherLight] DEV MODE: Using internal sprint file');
                return internalPath;
            }

            const productionPath = path.join(workspaceRoot, 'sprints', 'ACTIVE_SPRINT.toml');
            if (fs.existsSync(productionPath)) {
                console.log('[ÆtherLight] DEV MODE: Falling back to production sprint file');
                return productionPath;
            }

            // Auto-create internal sprint file in dev mode
            console.log('[ÆtherLight] DEV MODE: No sprint file found, creating internal sprint');
            this.createDefaultSprintFile(internalPath);
            return internalPath;
        } else {
            // PRODUCTION MODE: Only check sprints/ (simulates production user)
            const productionPath = path.join(workspaceRoot, 'sprints', 'ACTIVE_SPRINT.toml');
            if (fs.existsSync(productionPath)) {
                console.log('[ÆtherLight] PRODUCTION MODE: Using production sprint file');
                return productionPath;
            }

            // Auto-create production sprint file
            console.log('[ÆtherLight] PRODUCTION MODE: No sprint file found, creating template');
            this.createDefaultSprintFile(productionPath);
            return productionPath;
        }
    }

    /**
     * Create default sprint file with template content
     *
     * DESIGN DECISION: Create blank but valid TOML file
     * WHY: Extension works immediately, users can customize later
     */
    private createDefaultSprintFile(filePath: string): void {
        try {
            // Ensure directory exists
            const dir = path.dirname(filePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            // Template sprint content
            const template = `# ÆtherLight Sprint Plan
# Generated automatically by ÆtherLight extension
# Customize this file to manage your project sprints

[meta]
sprint_name = "My First Sprint"
version = "1.0"
total_tasks = 1
estimated_weeks = "1"
priority = "medium"
status = "active"
created = "${new Date().toISOString().split('T')[0]}"
phase = "Planning"

# Example task - customize or delete this
[tasks.TASK-001]
id = "TASK-001"
name = "Get started with ÆtherLight"
phase = "Current Sprint"
description = "Learn how to use ÆtherLight sprint features"
estimated_time = "30 minutes"
estimated_lines = 0
dependencies = []
status = "pending"
agent = "general-purpose"
assigned_engineer = "engineer_1"
required_expertise = []

# Add more tasks as needed:
# [tasks.TASK-002]
# id = "TASK-002"
# name = "Your task name"
# ...
`;

            fs.writeFileSync(filePath, template, 'utf-8');
            console.log(`[ÆtherLight] Created template sprint file: ${filePath}`);

            // Show notification to user
            vscode.window.showInformationMessage(
                `ÆtherLight: Created template sprint file at ${path.basename(path.dirname(filePath))}/${path.basename(filePath)}`,
                'Open Sprint File'
            ).then(selection => {
                if (selection === 'Open Sprint File') {
                    vscode.workspace.openTextDocument(filePath).then(doc => {
                        vscode.window.showTextDocument(doc);
                    });
                }
            });
        } catch (error) {
            console.error('[ÆtherLight] Failed to create default sprint file:', error);
            // Don't throw - just log the error and continue
        }
    }

    /**
     * DEBUG-004: Find all available sprint files in directory
     *
     * DESIGN DECISION: Scan for ACTIVE_SPRINT_*.toml pattern
     * WHY: Users may have multiple sprints (active, backlog, archived)
     *
     * REASONING CHAIN:
     * 1. Resolve sprint directory (internal/sprints or sprints/)
     * 2. Read all files in directory
     * 3. Filter for ACTIVE_SPRINT_*.toml pattern
     * 4. Return array of filenames (not full paths)
     * 5. Result: Dropdown can show all available sprint files
     *
     * @returns Array of sprint filenames (e.g., ["ACTIVE_SPRINT.toml", "ACTIVE_SPRINT_v0.16.0.toml"])
     */
    public findAvailableSprints(): string[] {
        try {
            const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            if (!workspaceRoot) {
                return [];
            }

            const config = vscode.workspace.getConfiguration('aetherlight');
            const devMode = config.get<boolean>('devMode', false);

            // Determine sprint directory based on dev mode
            const sprintDir = devMode
                ? path.join(workspaceRoot, 'internal', 'sprints')
                : path.join(workspaceRoot, 'sprints');

            // Check if directory exists
            if (!fs.existsSync(sprintDir)) {
                console.log(`[ÆtherLight] Sprint directory not found: ${sprintDir}`);
                return [];
            }

            // Scan for all ACTIVE_SPRINT_*.toml files
            const allFiles = fs.readdirSync(sprintDir);
            const sprintFiles = allFiles
                .filter(file => file.startsWith('ACTIVE_SPRINT') && file.endsWith('.toml'))
                .sort(); // Alphabetical order

            console.log(`[ÆtherLight] Found ${sprintFiles.length} sprint files:`, sprintFiles);
            return sprintFiles;
        } catch (error) {
            console.error('[ÆtherLight] Error scanning for sprint files:', error);
            return [];
        }
    }

    /**
     * DEBUG-004: Load specific sprint file by filename
     *
     * DESIGN DECISION: Allow loading any sprint file from dropdown
     * WHY: Users can switch between active, archived, and backlog sprints
     *
     * @param filename - Sprint filename (e.g., "ACTIVE_SPRINT_v0.16.0.toml")
     * @returns Loaded tasks and metadata
     */
    public async loadSprintByFilename(filename: string): Promise<{ tasks: SprintTask[], metadata: SprintMetadata | null }> {
        try {
            const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            if (!workspaceRoot) {
                throw new Error('No workspace open');
            }

            const config = vscode.workspace.getConfiguration('aetherlight');
            const devMode = config.get<boolean>('devMode', false);

            // Construct full path
            const sprintDir = devMode
                ? path.join(workspaceRoot, 'internal', 'sprints')
                : path.join(workspaceRoot, 'sprints');
            const fullPath = path.join(sprintDir, filename);

            if (!fs.existsSync(fullPath)) {
                throw new Error(`Sprint file not found: ${filename}`);
            }

            // Read and parse
            const tomlContent = fs.readFileSync(fullPath, 'utf-8');
            const data = toml.parse(tomlContent) as any;

            // Parse tasks and metadata
            this.tasks = this.parseTomlTasks(data.tasks);
            this.metadata = this.parseTomlMetadata(data.meta || {});
            this.currentSprintPath = fullPath;

            console.log(`[ÆtherLight] Loaded sprint: ${filename} (${this.tasks.length} tasks)`);
            return { tasks: this.tasks, metadata: this.metadata };
        } catch (error) {
            console.error('[ÆtherLight] Failed to load sprint:', error);
            throw error;
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
                // Enhanced prompt fields (rich task display)
                why: task.why,
                context: task.context,
                reasoning_chain: task.reasoning_chain,
                pattern_context: task.pattern_context,
                success_impact: task.success_impact,
                // Test-related fields (TDD enforcement)
                error_handling: task.error_handling,
                test_requirements: task.test_requirements,
                test_files: task.test_files,
                test_coverage_requirement: task.test_coverage_requirement
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
            // Use the resolved sprint path (supports both dev and production modes)
            if (!this.currentSprintPath) {
                console.error('[ÆtherLight] Cannot promote sprint: current sprint path not set');
                return;
            }

            const currentPath = this.currentSprintPath;
            const sprintDir = path.dirname(currentPath);
            const nextSprintPath = path.join(sprintDir, this.metadata!.progression!.next_sprint!);

            if (!fs.existsSync(nextSprintPath)) {
                vscode.window.showWarningMessage(`Next sprint not found: ${this.metadata!.progression!.next_sprint}`);
                return;
            }

            // 1. Archive current sprint
            const archivePath = path.join(
                sprintDir,
                'archive',
                `${this.metadata!.sprint_name.replace(/[^a-zA-Z0-9_-]/g, '_')}_COMPLETE.toml`
            );

            // Ensure archive directory exists
            const archiveDir = path.dirname(archivePath);
            if (!fs.existsSync(archiveDir)) {
                fs.mkdirSync(archiveDir, { recursive: true });
            }

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
            // Use the resolved sprint path (supports both dev and production modes)
            if (!this.currentSprintPath) {
                throw new Error('Sprint not loaded - cannot update task status');
            }

            const sprintPath = this.currentSprintPath;
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

    /**
     * REFACTOR-000-UI: Get current sprint file path
     * WHY: Needed by TaskStarter to update task status in TOML
     */
    public getSprintFilePath(): string {
        if (!this.currentSprintPath) {
            const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            if (!workspaceRoot) {
                throw new Error('No workspace folder open');
            }
            this.currentSprintPath = this.resolveSprintFilePath(workspaceRoot);
        }
        return this.currentSprintPath!;
    }
}
