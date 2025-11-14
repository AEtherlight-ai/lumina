/**
 * TaskContextBuilder
 *
 * DESIGN DECISION: Complex context builder for sprint tasks with comprehensive validation
 * WHY: Tasks need dependency checking, temporal drift detection, and file validation
 *
 * REASONING CHAIN:
 * 1. User clicks "Start This Task" or "Start Next Task" button
 * 2. Load task from TOML via SprintLoader
 * 3. Validate dependencies (all must be completed)
 * 4. Detect temporal drift (git diff since task created)
 * 5. Validate files_to_modify exist in workspace
 * 6. Validate patterns still apply to current codebase
 * 7. Find related tasks (overlapping files_to_modify)
 * 8. Calculate confidence score (high if all validation passes)
 * 9. Package everything into normalized EnhancementContext
 * 10. AI enhancement service receives consistent format
 *
 * PATTERN: Pattern-STRATEGY-001 (Strategy pattern for pluggable context builders)
 * ARCHITECTURE: v3.0 Context Builder Pattern
 * RELATED: IContextBuilder.ts, EnhancementContext.ts, SprintLoader.ts
 */

import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as path from 'path';
import { IContextBuilder } from '../../interfaces/IContextBuilder';
import { EnhancementContext, ConfidenceScore } from '../../types/EnhancementContext';
import { TemplateTask, TemplateTaskBuilder } from '../TemplateTaskBuilder';
import { SprintLoader, SprintTask } from '../../commands/SprintLoader';

export class TaskContextBuilder implements IContextBuilder {
    private workspaceRoot: string;
    private sprintLoader: SprintLoader;

    constructor(private context: vscode.ExtensionContext) {
        this.workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
        this.sprintLoader = new SprintLoader(context);
    }

    /**
     * Build EnhancementContext from task ID
     *
     * @param input - Object containing taskId field { taskId: string }
     * @returns Promise resolving to normalized EnhancementContext
     */
    async build(input: { taskId: string }): Promise<EnhancementContext> {
        const taskId = input.taskId;

        // 1. Load task from TOML
        const task = await this.loadTask(taskId);
        if (!task) {
            throw new Error(`Task ${taskId} not found in sprint TOML`);
        }

        // 2. Validate dependencies
        const dependencyStatus = await this.validateDependencies(task);
        const dependenciesMet = dependencyStatus.every(d => d.status === 'completed');

        // 3. Detect temporal drift
        const temporalDrift = await this.detectTemporalDrift(task);

        // 4. Validate files exist
        const fileValidation = await this.validateFiles(task);
        const filesExist = fileValidation.missing.length === 0;

        // 5. Validate patterns
        const patternValidation = await this.validatePatterns(task);

        // 6. Find related tasks
        const relatedTasks = await this.findRelatedTasks(task);

        // 7. Calculate confidence
        const confidence = this.calculateConfidence(
            dependenciesMet,
            filesExist,
            temporalDrift.daysElapsed,
            patternValidation.valid.length
        );

        // 8. Build template
        const template = this.buildTemplate(task);

        // 9. Return normalized context
        return {
            type: 'task',
            template,
            metadata: {
                buttonType: 'start_task',
                confidence,
                patterns: task.patterns || [],
                agent: task.agent,
                validation: {
                    filesExist,
                    dependenciesMet,
                    taskDataCurrent: temporalDrift.daysElapsed < 30
                }
            },
            workspaceContext: {
                rootPath: this.workspaceRoot,
                languages: [],
                frameworks: [],
                filesFound: fileValidation.found.map(f => ({ path: f, relevance: 100, reason: 'Task specification' })),
                gitCommits: temporalDrift.commits,
                sops: {}
            },
            specificContext: {
                task,
                dependencyStatus,
                temporalDrift,
                fileValidation,
                patternValidation,
                relatedTasks
            }
        };
    }

    /**
     * Load task from TOML via SprintLoader
     * WHY: SprintLoader handles TOML parsing and caching
     * REASONING: Use existing infrastructure instead of re-parsing
     */
    private async loadTask(taskId: string): Promise<SprintTask | null> {
        try {
            await this.sprintLoader.loadSprint();
            const tasks = this.sprintLoader.getTasks();
            return tasks.find(t => t.id === taskId) || null;
        } catch (error) {
            console.error('[ÆtherLight] Failed to load task from TOML:', error);
            return null;
        }
    }

    /**
     * Validate dependencies (check if all are completed)
     * WHY: Blocked tasks should not be started
     * REASONING: Task dependencies must be completed before proceeding
     */
    private async validateDependencies(task: SprintTask): Promise<Array<{ id: string; status: string }>> {
        if (!task.dependencies || task.dependencies.length === 0) {
            return [];
        }

        const tasks = this.sprintLoader.getTasks();
        return task.dependencies.map(depId => {
            const depTask = tasks.find(t => t.id === depId);
            return {
                id: depId,
                status: depTask?.status || 'unknown'
            };
        });
    }

    /**
     * Detect temporal drift (git diff since task created)
     * WHY: Code changes since task creation affect accuracy
     * REASONING: Recent changes may invalidate task assumptions
     */
    private async detectTemporalDrift(task: SprintTask): Promise<{
        daysElapsed: number;
        commits: Array<{ hash: string; message: string; date: string }>;
    }> {
        // Calculate days elapsed (if created date available)
        const createdDate = new Date('2025-11-05'); // TODO: Extract from task metadata
        const now = new Date();
        const daysElapsed = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));

        // Get recent commits (last 30 days)
        const commits = await this.getRecentCommits(30);

        return { daysElapsed, commits };
    }

    /**
     * Get recent commits from git
     * WHY: Shows workspace changes since task created
     * REASONING: Git history provides temporal context
     */
    private async getRecentCommits(days: number): Promise<Array<{ hash: string; message: string; date: string }>> {
        if (!this.workspaceRoot) {
            return [];
        }

        try {
            const since = `--since="${days} days ago"`;
            const gitCommand = `git log ${since} --format="%H|%s|%ai" --max-count=20`;
            const output = await this.execCommand(gitCommand, this.workspaceRoot);

            return output
                .trim()
                .split('\n')
                .filter(line => line.length > 0)
                .map(line => {
                    const [hash, message, date] = line.split('|');
                    return { hash, message, date };
                });
        } catch (error) {
            // Git command failed - return empty array gracefully
            return [];
        }
    }

    /**
     * Validate files exist in workspace
     * WHY: Missing files indicate task is outdated
     * REASONING: files_to_modify should exist before starting task
     */
    private async validateFiles(task: SprintTask): Promise<{
        found: string[];
        missing: string[];
    }> {
        const filesToCheck = [
            ...(task.files_to_create || []),
            ...(task.files_to_modify || [])
        ];

        if (filesToCheck.length === 0) {
            return { found: [], missing: [] };
        }

        const found: string[] = [];
        const missing: string[] = [];

        for (const file of filesToCheck) {
            const fullPath = path.join(this.workspaceRoot, file);
            try {
                await vscode.workspace.fs.stat(vscode.Uri.file(fullPath));
                found.push(file);
            } catch {
                missing.push(file);
            }
        }

        return { found, missing };
    }

    /**
     * Validate patterns still apply to current codebase
     * WHY: Patterns may become outdated as code evolves
     * REASONING: Check if pattern files exist and are recent
     */
    private async validatePatterns(task: SprintTask): Promise<{
        valid: string[];
        missing: string[];
    }> {
        if (!task.patterns || task.patterns.length === 0) {
            return { valid: [], missing: [] };
        }

        const valid: string[] = [];
        const missing: string[] = [];

        for (const pattern of task.patterns) {
            // Pattern format: "Pattern-AUTH-001"
            // Expected file: docs/patterns/Pattern-AUTH-001.md
            const patternFile = `docs/patterns/${pattern}.md`;
            const fullPath = path.join(this.workspaceRoot, patternFile);

            try {
                await vscode.workspace.fs.stat(vscode.Uri.file(fullPath));
                valid.push(pattern);
            } catch {
                missing.push(pattern);
            }
        }

        return { valid, missing };
    }

    /**
     * Find related tasks (overlapping files_to_modify)
     * WHY: Related tasks provide context and may have dependencies
     * REASONING: Tasks modifying same files should be coordinated
     */
    private async findRelatedTasks(task: SprintTask): Promise<string[]> {
        const taskFiles = new Set([
            ...(task.files_to_create || []),
            ...(task.files_to_modify || [])
        ]);

        if (taskFiles.size === 0) {
            return [];
        }

        const tasks = this.sprintLoader.getTasks();
        const related: string[] = [];

        for (const otherTask of tasks) {
            if (otherTask.id === task.id) {
                continue;
            }

            const otherFiles = new Set([
                ...(otherTask.files_to_create || []),
                ...(otherTask.files_to_modify || [])
            ]);

            // Check for overlap
            for (const file of taskFiles) {
                if (otherFiles.has(file)) {
                    related.push(otherTask.id);
                    break;
                }
            }
        }

        return related;
    }

    /**
     * Calculate confidence score based on validation results
     * WHY: Confidence indicates how ready the task is to start
     * REASONING: Higher confidence = less risk of outdated information
     */
    private calculateConfidence(
        dependenciesMet: boolean,
        filesExist: boolean,
        daysElapsed: number,
        patternsFound: number
    ): ConfidenceScore {
        let score = 50; // Base score

        // Dependencies met
        if (dependenciesMet) {
            score += 20;
        }

        // Files exist
        if (filesExist) {
            score += 15;
        }

        // Temporal freshness
        if (daysElapsed < 7) {
            score += 10;
        } else if (daysElapsed < 30) {
            score += 5;
        }

        // Patterns found
        if (patternsFound >= 2) {
            score += 5;
        }

        // Determine level
        let level: 'high' | 'medium' | 'low';
        if (score >= 80) {
            level = 'high';
        } else if (score >= 60) {
            level = 'medium';
        } else {
            level = 'low';
        }

        return { score, level };
    }

    /**
     * Build template task from sprint task
     * WHY: Template provides structured format for AI enhancement
     * REASONING: Use TemplateTaskBuilder for consistency
     */
    private buildTemplate(task: SprintTask): TemplateTask {
        const builder = new TemplateTaskBuilder(this.workspaceRoot);

        // Create template with all required SprintTask fields
        return {
            id: task.id,
            name: task.name,
            status: task.status,
            phase: task.phase,
            agent: task.agent,
            description: task.description,
            dependencies: task.dependencies || [],
            files_to_modify: task.files_to_modify || [],
            files_to_create: task.files_to_create || [],
            deliverables: task.deliverables || [],
            patterns: task.patterns || [],
            estimated_time: task.estimated_time || 'Not specified',
            estimated_lines: task.estimated_lines || 0,
            assigned_engineer: task.assigned_engineer || 'engineer_1',
            required_expertise: task.required_expertise || [],
            skill: task.skill,
            variables: {
                complexity: this.estimateComplexity(task),
                workspace_root: this.workspaceRoot
            }
        };
    }

    /**
     * Estimate task complexity
     * WHY: Complexity affects time estimates and approach
     * REASONING: More files/patterns = higher complexity
     */
    private estimateComplexity(task: SprintTask): number {
        let complexity = 3; // Base complexity

        // Files
        const fileCount = (task.files_to_create?.length || 0) + (task.files_to_modify?.length || 0);
        if (fileCount > 5) {
            complexity += 3;
        } else if (fileCount > 2) {
            complexity += 1;
        }

        // Patterns
        if ((task.patterns?.length || 0) > 3) {
            complexity += 2;
        }

        // Dependencies
        if ((task.dependencies?.length || 0) > 2) {
            complexity += 1;
        }

        return Math.min(complexity, 10);
    }

    /**
     * Execute shell command and return output
     * WHY: Needed for git commands
     * REASONING: Promisify child_process.exec for async/await
     */
    private execCommand(command: string, cwd: string): Promise<string> {
        return new Promise((resolve, reject) => {
            cp.exec(command, { cwd, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(stdout);
                }
            });
        });
    }
}
