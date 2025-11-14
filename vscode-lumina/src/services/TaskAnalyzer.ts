import * as fs from 'fs';
import * as path from 'path';

/**
 * TaskAnalyzer - Generic, Variable-Driven Task Analysis
 *
 * @maintainable
 * Created: 2025-11-07 (PROTECT-000A - phase-3-mvp-prompt-system)
 * Test: test/services/taskAnalyzer.test.ts
 * Status: NEW - MVP implementation
 *
 * Generic task analyzer that works for ANY project (not just ÆtherLight).
 * Reads .aetherlight/config.json for ALL project-specific values.
 *
 * DESIGN DECISION: Variable-driven, not hard-coded
 * WHY: Enables ÆtherLight to work with ANY project type
 *
 * REASONING CHAIN:
 * 1. Load project config (.aetherlight/config.json)
 * 2. Read task from ${config.structure.sprintDir}/ACTIVE_SPRINT.toml
 * 3. Detect gaps (missing files, dependencies, tests, pre-flight)
 * 4. If gaps → generate questions JSON for modal UI
 * 5. If no gaps → return ready status with context
 * 6. Result: Intelligent prompt system that prevents bad prompts
 *
 * PATTERN: Pattern-CODE-001, Pattern-TDD-001
 * PERFORMANCE: <2s (file operations cached)
 * RELATED: TaskPromptExporter.ts, PROTECT-000D (Q&A modal UI)
 */

export interface ProjectConfig {
    project: {
        name: string;
        type: string;
        description: string;
    };
    structure: {
        sprintDir: string;
        activeSprint: string;
        patternsDir: string;
        testsDir: string;
        sourceDir: string;
    };
    testing: {
        framework: string;
        runner: string;
        coverage: {
            infrastructure: number;
            api: number;
            ui: number;
        };
        manualTestingRequired: boolean;
        reason?: string;
    };
    workflows: {
        preFlightChecklistPath: string;
        preFlightSections: string[];
        patternsDir: string;
        requiredPatterns: string[];
    };
    git: {
        mainBranch: string;
        commitMessageFormat: string;
        preCommitHooks: boolean;
    };
    dependencies: {
        whitelist: string[];
        forbidden: {
            native: string[];
            runtime: string[];
        };
    };
    agents: {
        [key: string]: {
            coverage: number;
            patterns: string[];
        };
    };
    performance: {
        initTime: string;
        activationTime: string;
        analysisTime: string;
    };
}

export interface SprintTask {
    id: string;
    name: string;
    status: string;
    phase: string;
    agent: string;
    dependencies?: string[];
    files_to_modify?: string[];
    files_to_create?: string[];
    deliverables?: string[];
    description?: string;
    [key: string]: any;
}

export interface Gap {
    type: 'missing_file' | 'unmet_dependency' | 'missing_tests' | 'preflight_violation';
    severity: 'blocking' | 'warning';
    message: string;
    suggestion?: string;
    relatedTo?: string;
}

export interface Question {
    id: string;
    question: string;
    type: 'text' | 'boolean' | 'choice';
    choices?: string[];
    required: boolean;
    helpText?: string;
}

export interface TaskContext {
    task: SprintTask;
    config: ProjectConfig;
    timestamp: string;
}

export interface AnalysisResult {
    status: 'needs_clarification' | 'ready';
    questions?: Question[];
    context?: TaskContext;
    gaps?: Gap[];
}

export class TaskAnalyzer {
    private workspaceRoot: string;
    private configCache?: ProjectConfig;

    constructor(workspaceRoot: string) {
        this.workspaceRoot = workspaceRoot;
    }

    /**
     * Load project configuration from .aetherlight/config.json
     */
    public async loadConfig(): Promise<ProjectConfig> {
        if (this.configCache) {
            return this.configCache;
        }

        const configPath = path.join(this.workspaceRoot, '.aetherlight', 'config.json');

        if (!fs.existsSync(configPath)) {
            throw new Error(`config.json not found at ${configPath}`);
        }

        try {
            const configContent = fs.readFileSync(configPath, 'utf-8');
            const config = JSON.parse(configContent) as ProjectConfig;
            this.configCache = config;
            return config;
        } catch (error: any) {
            throw new Error(`Failed to parse config.json: ${error.message}`);
        }
    }

    /**
     * Get sprint file path using config.structure.sprintDir
     */
    public getSprintPath(): string {
        if (!this.configCache) {
            throw new Error('Config not loaded. Call loadConfig() first.');
        }
        return path.join(
            this.workspaceRoot,
            this.configCache.structure.sprintDir,
            this.configCache.structure.activeSprint
        );
    }

    /**
     * Analyze task for gaps and generate questions or ready status
     */
    public async analyzeTask(task: SprintTask, completedTasks?: Array<{id: string, status: string}>): Promise<AnalysisResult> {
        const config = await this.loadConfig();
        const gaps: Gap[] = [];

        // Gap Detection 1: Missing Files
        const missingFileGaps = this.detectMissingFiles(task, config);
        gaps.push(...missingFileGaps);

        // Gap Detection 2: Unmet Dependencies
        const dependencyGaps = this.detectUnmetDependencies(task, completedTasks || []);
        gaps.push(...dependencyGaps);

        // Gap Detection 3: Missing Test Strategy
        const testGaps = this.detectMissingTestStrategy(task, config);
        gaps.push(...testGaps);

        // Gap Detection 4: Pre-Flight Violations
        const preflightGaps = this.detectPreFlightViolations(task, config);
        gaps.push(...preflightGaps);

        // Generate result
        if (gaps.length > 0) {
            // Has gaps → generate questions
            const questions = this.generateQuestions(gaps);
            return {
                status: 'needs_clarification',
                questions,
                gaps
            };
        } else {
            // No gaps → ready to generate prompt
            return {
                status: 'ready',
                context: {
                    task,
                    config,
                    timestamp: new Date().toISOString()
                },
                gaps: []
            };
        }
    }

    /**
     * Gap Detection 1: Missing Files
     * Check if task.files_to_modify or task.files_to_create exist
     */
    private detectMissingFiles(task: SprintTask, config: ProjectConfig): Gap[] {
        const gaps: Gap[] = [];
        const filesToCheck = [
            ...(task.files_to_modify || []),
            ...(task.files_to_create || [])
        ];

        for (const file of filesToCheck) {
            const fullPath = path.join(this.workspaceRoot, file);

            if (!fs.existsSync(fullPath)) {
                // File doesn't exist - could be intentional (new file) or gap
                // Only flag as gap if it's in files_to_modify (should exist)
                if (task.files_to_modify?.includes(file)) {
                    gaps.push({
                        type: 'missing_file',
                        severity: 'warning',
                        message: `File does not exist: ${file}`,
                        suggestion: `Create file or verify path is correct`,
                        relatedTo: file
                    });
                }
            }
        }

        return gaps;
    }

    /**
     * Gap Detection 2: Unmet Dependencies
     * Check if task.dependencies are completed
     */
    private detectUnmetDependencies(task: SprintTask, completedTasks: Array<{id: string, status: string}>): Gap[] {
        const gaps: Gap[] = [];

        if (!task.dependencies || task.dependencies.length === 0) {
            return gaps;
        }

        const completedIds = new Set(
            completedTasks.filter(t => t.status === 'completed').map(t => t.id)
        );

        for (const depId of task.dependencies) {
            if (!completedIds.has(depId)) {
                gaps.push({
                    type: 'unmet_dependency',
                    severity: 'blocking',
                    message: `Dependency not completed: ${depId}`,
                    suggestion: `Complete ${depId} before starting this task`,
                    relatedTo: depId
                });
            }
        }

        return gaps;
    }

    /**
     * Gap Detection 3: Missing Test Strategy
     * Check if agent requires tests but none specified
     */
    private detectMissingTestStrategy(task: SprintTask, config: ProjectConfig): Gap[] {
        const gaps: Gap[] = [];

        // Safety check: If no agents config, skip test strategy detection
        if (!config.agents) {
            return gaps;
        }

        const agentConfig = config.agents[task.agent];
        if (!agentConfig || agentConfig.coverage === 0) {
            // Agent doesn't require tests (e.g., documentation-agent)
            return gaps;
        }

        // Check if deliverables mention tests
        const deliverablesText = (task.deliverables || []).join(' ').toLowerCase();
        const hasTestMention = /test|coverage|tdd/i.test(deliverablesText);

        if (!hasTestMention) {
            gaps.push({
                type: 'missing_tests',
                severity: 'warning',
                message: `No test strategy specified for ${task.agent}`,
                suggestion: `Add test deliverable with ${agentConfig.coverage}% coverage requirement`,
                relatedTo: task.agent
            });
        }

        return gaps;
    }

    /**
     * Gap Detection 4: Pre-Flight Violations
     * Check if editing TOML/config without pre-flight checklist mention
     */
    private detectPreFlightViolations(task: SprintTask, config: ProjectConfig): Gap[] {
        const gaps: Gap[] = [];

        const sensitiveFiles = [
            'ACTIVE_SPRINT.toml',
            'package.json',
            'config.json'
        ];

        const filesToModify = task.files_to_modify || [];
        const hasSensitiveFile = filesToModify.some(file =>
            sensitiveFiles.some(sensitive => file.includes(sensitive))
        );

        if (hasSensitiveFile) {
            // Check if description mentions pre-flight checklist
            const descriptionText = (task.description || '').toLowerCase();
            const hasPreflightMention = /pre-flight|checklist|read.*first/i.test(descriptionText);

            if (!hasPreflightMention) {
                gaps.push({
                    type: 'preflight_violation',
                    severity: 'blocking',
                    message: `Modifying sensitive files without pre-flight checklist reference`,
                    suggestion: `Reference pre-flight checklist: ${config.workflows.preFlightChecklistPath}`,
                    relatedTo: filesToModify.find(f => sensitiveFiles.some(s => f.includes(s)))
                });
            }
        }

        return gaps;
    }

    /**
     * Generate questions from gaps
     * Converts Gap[] → Question[] for modal UI
     */
    private generateQuestions(gaps: Gap[]): Question[] {
        const questions: Question[] = [];

        for (const gap of gaps) {
            switch (gap.type) {
                case 'missing_file':
                    questions.push({
                        id: `file-${gap.relatedTo}`,
                        question: `File "${gap.relatedTo}" does not exist. Should this file be created, or is the path incorrect?`,
                        type: 'choice',
                        choices: ['Create new file', 'Path is incorrect - will fix', 'File will be created by another task'],
                        required: true,
                        helpText: gap.suggestion
                    });
                    break;

                case 'unmet_dependency':
                    questions.push({
                        id: `dep-${gap.relatedTo}`,
                        question: `Dependency "${gap.relatedTo}" is not completed. How should this be handled?`,
                        type: 'choice',
                        choices: ['Wait for dependency', 'Remove dependency', 'Override (manual verification)'],
                        required: true,
                        helpText: gap.suggestion
                    });
                    break;

                case 'missing_tests':
                    questions.push({
                        id: `tests-${gap.relatedTo}`,
                        question: `No test strategy specified. What test approach should be used?`,
                        type: 'text',
                        required: true,
                        helpText: gap.suggestion
                    });
                    break;

                case 'preflight_violation':
                    questions.push({
                        id: `preflight-${gap.relatedTo}`,
                        question: `Pre-flight checklist not referenced. Have you reviewed the pre-flight checklist for modifying "${gap.relatedTo}"?`,
                        type: 'boolean',
                        required: true,
                        helpText: gap.suggestion
                    });
                    break;
            }
        }

        return questions;
    }
}
