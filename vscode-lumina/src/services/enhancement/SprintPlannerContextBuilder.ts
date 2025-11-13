/**
 * SprintPlannerContextBuilder
 *
 * DESIGN DECISION: Most complex context builder - orchestrates 5 systems
 * WHY: Sprint planning requires comprehensive context from multiple sources
 *
 * REASONING CHAIN:
 * 1. Sprint Planner enhancement needs to know existing sprints (avoid duplication)
 * 2. Must inject 27 normalized tasks from SPRINT_TEMPLATE.toml (Pattern-SPRINT-TEMPLATE-001)
 * 3. Must assign agents based on expertise (not random)
 * 4. Must respect test coverage requirements per agent
 * 5. Must detect git branch (feature vs. main affects sprint scope)
 * 6. Must find sprint planning patterns (Pattern-SPRINT-PLAN-001)
 * 7. Result: Orchestrate 5 components into single EnhancementContext
 *
 * PATTERN: Pattern-ORCHESTRATION-001 (Multi-Source Data Orchestration)
 * ARCHITECTURE: v3.0 Context Builder Pattern
 * RELATED: IContextBuilder.ts, EnhancementContext.ts, SprintManager.ts
 *
 * PERFORMANCE:
 * - Parallel file loading (Promise.all for 5 components)
 * - Target: < 2 seconds for complete context building
 * - Graceful degradation: if component fails, provide partial context
 */

import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import * as TOML from '@iarna/toml';
import { promisify } from 'util';
import { exec as execCallback } from 'child_process';
import { IContextBuilder } from '../../interfaces/IContextBuilder';
import { EnhancementContext, EnhancementType } from '../../types/EnhancementContext';
import { TemplateTask } from '../TemplateTaskBuilder';

const exec = promisify(execCallback);

// ============================================================================
// Type Definitions
// ============================================================================

interface SprintPlannerInput {
    sprintGoal: string;         // User's sprint objective
    duration: string;           // e.g., "2 weeks", "1 week"
    priorities: string[];       // e.g., ["bug-fixes", "new-features"]
    includeRetro: boolean;      // Include retrospective tasks?
}

interface SprintMetadata {
    id: string;           // e.g., "17.1-BUGS"
    name: string;         // e.g., "Bug Fixes & Polish"
    status: string;       // e.g., "active", "completed"
    taskCount: number;    // Number of tasks in sprint
    filePath: string;     // Absolute path to TOML file
}

interface SprintTemplateData {
    required: TemplateTask[];        // 14 tasks (MUST inject)
    suggested: TemplateTask[];       // 4 tasks (can skip with justification)
    conditional: TemplateTask[];     // 8 tasks (inject if conditions met)
    retrospective: TemplateTask[];   // 2 tasks (MUST inject at end)
    totalTasks: number;              // 19-27 tasks
}

interface AgentCapability {
    name: string;               // e.g., "developer-agent"
    expertise: string[];        // e.g., ["TypeScript", "Node.js", "Testing"]
    testCoverage: number;       // e.g., 90 (percentage)
    filePath: string;           // Absolute path to agent file
}

interface GitBranchInfo {
    name: string;               // e.g., "feature/v0.17.2-bug-fixes"
    isFeature: boolean;         // true if feature/ or feat/ prefix
    isMain: boolean;            // true if master or main
    type: 'feature' | 'main' | 'other';
}

// ============================================================================
// SprintPlannerContextBuilder Implementation
// ============================================================================

export class SprintPlannerContextBuilder implements IContextBuilder {
    private workspaceRoot: string;

    constructor() {
        this.workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || process.cwd();
    }

    /**
     * Build comprehensive sprint planning context
     *
     * Orchestrates 5 parallel components:
     * 1. Load existing sprints (prevent duplication)
     * 2. Load sprint template (27 normalized tasks)
     * 3. Load agent capabilities (expertise + test coverage)
     * 4. Analyze git branch (feature vs. main)
     * 5. Search sprint planning patterns
     *
     * Performance: < 2 seconds via Promise.all
     * Error handling: Graceful degradation (partial context on failure)
     */
    async build(input: SprintPlannerInput): Promise<EnhancementContext> {
        try {
            // Parallel component loading for performance
            const [
                existingSprints,
                sprintTemplate,
                agentCapabilities,
                gitBranch,
                patterns
            ] = await Promise.all([
                this.loadExistingSprints(),
                this.loadSprintTemplate(),
                this.loadAgentCapabilities(),
                this.analyzeGitBranch(),
                this.searchSprintPatterns()
            ]);

            // Calculate confidence based on data quality
            const confidence = this.calculateConfidence(
                existingSprints,
                sprintTemplate,
                agentCapabilities
            );

            // Assemble EnhancementContext
            return {
                type: 'sprint_planner' as EnhancementType,
                template: this.buildTemplate(input),
                metadata: {
                    buttonType: 'sprint_planner',
                    confidence: confidence,
                    patterns: patterns,
                    agent: 'sprint-planner-agent',
                    validation: {
                        filesExist: true,           // No files to validate for sprint planning
                        dependenciesMet: true,      // No dependencies
                        taskDataCurrent: true       // Data just gathered
                    }
                },
                workspaceContext: await this.buildWorkspaceContext(),
                specificContext: {
                    // Component 1: Existing sprints
                    existingSprints: existingSprints,

                    // Component 2: Sprint template
                    sprintTemplate: sprintTemplate,

                    // Component 3: Agent capabilities
                    agentCapabilities: agentCapabilities,

                    // Component 4: Git branch
                    gitBranch: gitBranch.name,
                    gitBranchType: gitBranch.type,

                    // User input
                    sprintGoal: input.sprintGoal,
                    duration: input.duration,
                    priorities: input.priorities,
                    includeRetro: input.includeRetro
                }
            };

        } catch (error) {
            console.error('[SprintPlannerContextBuilder] Context building failed:', error);

            // Fallback: minimal context
            return this.buildMinimalContext(input);
        }
    }

    // ========================================================================
    // Component 1: Existing Sprints Loader
    // ========================================================================

    private async loadExistingSprints(): Promise<SprintMetadata[]> {
        try {
            const sprintsDir = path.join(this.workspaceRoot, 'internal', 'sprints');
            const pattern = 'ACTIVE_SPRINT_*.toml';

            // Use vscode.workspace.findFiles instead of glob
            const files = await vscode.workspace.findFiles(
                `internal/sprints/${pattern}`,
                '**/node_modules/**',
                100
            );

            if (files.length === 0) {
                console.log('[SprintPlannerContextBuilder] No existing sprints found (first sprint)');
                return [];
            }

            // Parse each sprint file in parallel
            const sprints = await Promise.all(
                files.map(async (fileUri) => {
                    try {
                        const content = await fs.promises.readFile(fileUri.fsPath, 'utf-8');
                        const parsed = TOML.parse(content) as any;

                        return {
                            id: path.basename(fileUri.fsPath, '.toml').replace('ACTIVE_SPRINT_', ''),
                            name: parsed.metadata?.name || 'Unknown Sprint',
                            status: parsed.metadata?.status || 'unknown',
                            taskCount: Object.keys(parsed.tasks || {}).length,
                            filePath: fileUri.fsPath
                        };
                    } catch (error) {
                        console.warn(`[SprintPlannerContextBuilder] Failed to parse sprint ${fileUri.fsPath}:`, error);
                        return null;
                    }
                })
            );

            // Filter out failed parses
            return sprints.filter((s): s is SprintMetadata => s !== null);

        } catch (error) {
            console.warn('[SprintPlannerContextBuilder] Failed to load existing sprints:', error);
            return [];
        }
    }

    // ========================================================================
    // Component 2: Sprint Template Loader
    // ========================================================================

    private async loadSprintTemplate(): Promise<SprintTemplateData> {
        try {
            const templatePath = path.join(this.workspaceRoot, 'internal', 'sprints', 'SPRINT_TEMPLATE.toml');
            const content = await fs.promises.readFile(templatePath, 'utf-8');
            const parsed = TOML.parse(content) as any;

            // Extract 4 task categories
            const required = this.extractTemplateTasks(parsed, 'required');
            const suggested = this.extractTemplateTasks(parsed, 'suggested');
            const conditional = this.extractTemplateTasks(parsed, 'conditional');
            const retrospective = this.extractTemplateTasks(parsed, 'retrospective');

            return {
                required: required,
                suggested: suggested,
                conditional: conditional,
                retrospective: retrospective,
                totalTasks: required.length + suggested.length + conditional.length + retrospective.length
            };

        } catch (error) {
            console.warn('[SprintPlannerContextBuilder] Failed to load sprint template:', error);

            // Fallback: empty template
            return {
                required: [],
                suggested: [],
                conditional: [],
                retrospective: [],
                totalTasks: 0
            };
        }
    }

    private extractTemplateTasks(parsed: any, category: string): TemplateTask[] {
        try {
            const tasks = parsed.template?.[category] || {};

            return Object.entries(tasks).map(([key, task]: [string, any]) => ({
                id: task.id || key,
                name: task.name || 'Unnamed Task',
                status: 'pending',
                phase: task.phase || category,
                agent: task.agent || 'developer-agent',
                description: task.description || '',
                dependencies: task.dependencies || [],
                files_to_modify: task.files_to_modify || [],
                files_to_create: task.files_to_create || [],
                deliverables: task.deliverables || [],
                patterns: task.patterns || [],
                estimated_time: task.estimated_time || '1 hour',
                estimated_lines: task.estimated_lines || 0,
                assigned_engineer: task.assigned_engineer || 'engineer_1',
                required_expertise: task.required_expertise || [],
                variables: {
                    category: category,
                    workspace_root: this.workspaceRoot
                }
            }));

        } catch (error) {
            console.warn(`[SprintPlannerContextBuilder] Failed to extract ${category} tasks:`, error);
            return [];
        }
    }

    // ========================================================================
    // Component 3: Agent Capabilities Loader
    // ========================================================================

    private async loadAgentCapabilities(): Promise<AgentCapability[]> {
        try {
            // Use vscode.workspace.findFiles instead of glob
            const files = await vscode.workspace.findFiles(
                'internal/agents/*.md',
                '**/node_modules/**',
                50
            );

            if (files.length === 0) {
                console.warn('[SprintPlannerContextBuilder] No agent context files found');
                return [];
            }

            // Parse each agent file in parallel
            const agents = await Promise.all(
                files.map(async (fileUri) => {
                    try {
                        const content = await fs.promises.readFile(fileUri.fsPath, 'utf-8');

                        return {
                            name: this.extractAgentName(fileUri.fsPath, content),
                            expertise: this.extractExpertise(content),
                            testCoverage: this.extractTestCoverage(content),
                            filePath: fileUri.fsPath
                        };
                    } catch (error) {
                        console.warn(`[SprintPlannerContextBuilder] Failed to parse agent ${fileUri.fsPath}:`, error);
                        return null;
                    }
                })
            );

            // Filter out failed parses
            return agents.filter((a): a is AgentCapability => a !== null);

        } catch (error) {
            console.warn('[SprintPlannerContextBuilder] Failed to load agent capabilities:', error);
            return [];
        }
    }

    private extractAgentName(filePath: string, content: string): string {
        // Try to extract from filename first
        const basename = path.basename(filePath, '.md');

        // Try to extract from Markdown header
        const headerMatch = content.match(/^#\s+(.+)$/m);
        if (headerMatch) {
            return headerMatch[1].trim();
        }

        return basename;
    }

    private extractExpertise(content: string): string[] {
        // Search for "Expertise:" or "Responsibilities:" section
        const expertiseMatch = content.match(/(?:Expertise|Responsibilities):\s*\n((?:[-*]\s*.+\n?)+)/i);
        if (expertiseMatch) {
            return expertiseMatch[1]
                .split('\n')
                .map(line => line.replace(/^[-*]\s*/, '').trim())
                .filter(Boolean);
        }

        // Fallback: search for bullet points in first 30 lines
        const lines = content.split('\n').slice(0, 30);
        const bullets = lines.filter(line => /^[-*]\s+/.test(line.trim()));
        if (bullets.length > 0) {
            return bullets.map(line => line.replace(/^[-*]\s*/, '').trim());
        }

        return [];
    }

    private extractTestCoverage(content: string): number {
        // Search for test coverage requirement
        const coverageMatch = content.match(/(?:Test\s+)?Coverage:\s*(\d+)%/i);
        if (coverageMatch) {
            return parseInt(coverageMatch[1]);
        }

        // Search for "Infrastructure task = 90% coverage" pattern
        const taskCoverageMatch = content.match(/Infrastructure\s+task\s*=\s*(\d+)%\s+coverage/i);
        if (taskCoverageMatch) {
            return parseInt(taskCoverageMatch[1]);
        }

        // Default based on agent type
        if (content.toLowerCase().includes('infrastructure')) return 90;
        if (content.toLowerCase().includes('api')) return 85;
        if (content.toLowerCase().includes('ui')) return 70;

        return 80; // Default
    }

    // ========================================================================
    // Component 4: Git Branch Analyzer
    // ========================================================================

    private async analyzeGitBranch(): Promise<GitBranchInfo> {
        try {
            const result = await exec('git rev-parse --abbrev-ref HEAD', {
                cwd: this.workspaceRoot
            });
            const branch = result.stdout.trim();

            const isFeature = branch.startsWith('feature/') || branch.startsWith('feat/');
            const isMain = ['master', 'main'].includes(branch);

            return {
                name: branch,
                isFeature: isFeature,
                isMain: isMain,
                type: isFeature ? 'feature' : isMain ? 'main' : 'other'
            };

        } catch (error) {
            console.warn('[SprintPlannerContextBuilder] Git branch analysis failed:', error);

            return {
                name: 'unknown',
                isFeature: false,
                isMain: false,
                type: 'other'
            };
        }
    }

    // ========================================================================
    // Component 5: Pattern Search
    // ========================================================================

    private async searchSprintPatterns(): Promise<string[]> {
        // Sprint planning patterns (hardcoded for now)
        return [
            'Pattern-SPRINT-PLAN-001',
            'Pattern-SPRINT-TEMPLATE-001',
            'Pattern-GIT-001',
            'Pattern-TASK-ANALYSIS-001',
            'Pattern-CODE-001',
            'Pattern-TDD-001'
        ];

        // TODO: Integrate with PatternLibrary service for dynamic pattern search
    }

    // ========================================================================
    // Helper Methods
    // ========================================================================

    private calculateConfidence(
        sprints: SprintMetadata[],
        template: SprintTemplateData,
        agents: AgentCapability[]
    ): { score: number; level: 'high' | 'medium' | 'low' } {
        let score = 50; // Base score

        // Bonus for existing sprints (context from history)
        if (sprints.length > 0) score += 15;

        // Bonus for template loaded (normalized task injection)
        if (template.totalTasks >= 19) score += 20;

        // Bonus for agent capabilities (smart agent assignment)
        if (agents.length >= 5) score += 15;

        // Cap at 100
        score = Math.min(score, 100);

        const level = score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low';

        return { score, level };
    }

    private buildTemplate(input: SprintPlannerInput): TemplateTask {
        return {
            id: 'SPRINT_PLAN',
            name: 'Sprint Planning',
            status: 'pending',
            phase: 'sprint-planning',
            agent: 'sprint-planner-agent',
            description: input.sprintGoal,
            dependencies: [],
            files_to_modify: [],
            files_to_create: [],
            deliverables: [
                'Sprint TOML file created',
                'All 19-27 normalized tasks injected',
                'Agents assigned based on expertise',
                'Test coverage requirements specified',
                'Retrospective tasks included'
            ],
            patterns: ['Pattern-SPRINT-PLAN-001', 'Pattern-SPRINT-TEMPLATE-001'],
            estimated_time: input.duration,
            estimated_lines: 0,
            assigned_engineer: 'engineer_1',
            required_expertise: ['sprint-planning'],
            variables: {
                sprintGoal: input.sprintGoal,
                duration: input.duration,
                priorities: input.priorities,
                workspace_root: this.workspaceRoot
            }
        };
    }

    private async buildWorkspaceContext(): Promise<any> {
        // TODO: Implement full workspace context gathering
        // For now, return minimal context
        return {
            rootPath: this.workspaceRoot,
            languages: ['TypeScript', 'JavaScript'],
            frameworks: ['VS Code Extension', 'Node.js'],
            filesFound: [],
            gitCommits: [],
            sops: {
                claudeMd: await this.findSOP('.claude/CLAUDE.md'),
                aetherlightMd: await this.findSOP('.vscode/aetherlight.md')
            }
        };
    }

    private async findSOP(relativePath: string): Promise<string | undefined> {
        try {
            const sopPath = path.join(this.workspaceRoot, relativePath);
            const content = await fs.promises.readFile(sopPath, 'utf-8');
            return content;
        } catch {
            return undefined;
        }
    }

    private buildMinimalContext(input: SprintPlannerInput): EnhancementContext {
        // Fallback context when orchestration fails
        return {
            type: 'sprint_planner' as EnhancementType,
            template: this.buildTemplate(input),
            metadata: {
                buttonType: 'sprint_planner',
                confidence: { score: 30, level: 'low' },
                patterns: ['Pattern-SPRINT-PLAN-001'],
                agent: 'sprint-planner-agent',
                validation: {
                    filesExist: true,
                    dependenciesMet: true,
                    taskDataCurrent: false  // Data gathering failed
                }
            },
            workspaceContext: {
                rootPath: this.workspaceRoot,
                languages: [],
                frameworks: [],
                filesFound: [],
                gitCommits: [],
                sops: {}
            },
            specificContext: {
                existingSprints: [],
                sprintTemplate: { required: [], suggested: [], conditional: [], retrospective: [], totalTasks: 0 },
                agentCapabilities: [],
                gitBranch: 'unknown',
                sprintGoal: input.sprintGoal,
                duration: input.duration,
                priorities: input.priorities
            }
        };
    }
}
