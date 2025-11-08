/**
 * TemplateTaskBuilder - Constructs template task objects for enhancement buttons
 *
 * @maintainable
 * Created: 2025-11-07 (PROTECT-000F - phase-3-mvp-prompt-system)
 * Test: test/services/templateTaskBuilder.test.ts
 * Status: NEW - MVP implementation
 *
 * Builds template task objects (not TOML tasks) for enhancement buttons.
 * These templates are passed to TaskPromptExporter.generateEnhancedPromptFromTemplate()
 * for MVP-003 intelligence (gap detection + question modals).
 *
 * DESIGN DECISION: Template tasks implement SprintTask interface
 * WHY: Enables TaskAnalyzer to work with template tasks (no special handling)
 *
 * REASONING CHAIN:
 * 1. User clicks enhancement button (Code Analyzer, Sprint Planner, etc.)
 * 2. Button calls TemplateTaskBuilder to construct template task
 * 3. Template task includes workspace context as variables
 * 4. TaskPromptExporter.generateEnhancedPromptFromTemplate(template) processes it
 * 5. TaskAnalyzer runs gap detection (same as TOML tasks)
 * 6. Enhanced prompt generated with project state
 * 7. Result: All enhancement buttons get MVP-003 intelligence
 *
 * PATTERN: Pattern-CODE-001, Pattern-IMPROVEMENT-001 (universal enhancement engine)
 * PERFORMANCE: Template construction <10ms (no I/O operations)
 * RELATED: TaskPromptExporter.ts (PROTECT-000F), TaskAnalyzer.ts (PROTECT-000A)
 */

import { SprintTask } from './TaskAnalyzer';

/**
 * TemplateTask interface - extends SprintTask with variables field
 * Variables: Key-value pairs injected from workspace context or form data
 */
export interface TemplateTask extends SprintTask {
    variables: {
        [key: string]: any;
    };
}

/**
 * Bug report form data structure
 */
export interface BugReportFormData {
    title: string;
    severity: string;
    stepsToReproduce: string;
    expectedBehavior: string;
    actualBehavior: string;
    additionalContext: string;
}

/**
 * Feature request form data structure
 */
export interface FeatureRequestFormData {
    title: string;
    priority: string;
    category: string;
    useCase: string;
    proposedSolution: string;
    alternativeApproaches: string;
    additionalContext: string;
}

/**
 * TemplateTaskBuilder - Constructs template tasks for each enhancement button type
 */
export class TemplateTaskBuilder {
    private workspaceRoot: string;

    constructor(workspaceRoot: string) {
        this.workspaceRoot = workspaceRoot;
    }

    /**
     * Build Code Analyzer template
     * Button: Code Analyzer (🔍)
     * Purpose: Analyze workspace structure, patterns, and recommendations
     */
    public buildCodeAnalyzerTemplate(languages: string[], frameworks: string[]): TemplateTask {
        return {
            id: 'CODE_ANALYZER_TEMPLATE',
            name: 'Analyze workspace structure',
            description: `Analyze ${this.workspaceRoot} for patterns, issues, and improvement recommendations. Focus on code quality, architecture, and best practices.`,
            status: 'pending',
            phase: 'phase-3-mvp-prompt-system',
            agent: 'infrastructure-agent',
            estimated_time: '30-60 minutes',
            estimated_lines: 0, // Template tasks don't modify code directly
            dependencies: [],
            assigned_engineer: 'aetherlight-ai',
            required_expertise: ['TypeScript', 'VS Code', 'Code Analysis'],
            patterns: [
                'Pattern-CODE-001',
                'Pattern-IMPROVEMENT-001'
            ],
            files_to_modify: [], // Detected from workspace during analysis
            variables: {
                workspaceRoot: this.workspaceRoot,
                languages: languages,
                frameworks: frameworks
            }
        };
    }

    /**
     * Build Sprint Planner template
     * Button: Sprint Planner (📋)
     * Purpose: Generate comprehensive sprint plan with 27 normalized tasks
     */
    public buildSprintPlannerTemplate(languages: string[], frameworks: string[]): TemplateTask {
        return {
            id: 'SPRINT_PLANNER_TEMPLATE',
            name: 'Generate sprint plan',
            description: `Create comprehensive sprint plan for ${this.workspaceRoot}. Include 27 normalized tasks (REQUIRED, SUGGESTED, CONDITIONAL, RETROSPECTIVE). Follow Pattern-SPRINT-PLAN-001.`,
            status: 'pending',
            phase: 'phase-3-mvp-prompt-system',
            agent: 'infrastructure-agent',
            estimated_time: '1-2 hours',
            estimated_lines: 0, // Template tasks don't modify code directly
            dependencies: [],
            assigned_engineer: 'aetherlight-ai',
            required_expertise: ['Sprint Planning', 'Project Management', 'TOML'],
            patterns: [
                'Pattern-SPRINT-PLAN-001',
                'Pattern-TASK-ANALYSIS-001',
                'Pattern-CODE-001'
            ],
            files_to_modify: [], // Sprint TOML file will be created
            variables: {
                workspaceRoot: this.workspaceRoot,
                languages: languages,
                frameworks: frameworks
            }
        };
    }

    /**
     * Build Bug Report template
     * Button: Bug Report (🐛)
     * Purpose: Report bug with structured form data
     */
    public buildBugReportTemplate(formData: BugReportFormData): TemplateTask {
        return {
            id: 'BUG_REPORT_TEMPLATE',
            name: `Bug report: ${formData.title}`,
            description: `Report bug: ${formData.title}. Severity: ${formData.severity}. Analyze root cause, suggest fixes, and validate with tests.`,
            status: 'pending',
            phase: 'phase-3-mvp-prompt-system',
            agent: 'debugging-agent',
            estimated_time: '1-3 hours',
            estimated_lines: 50,
            dependencies: [],
            assigned_engineer: 'aetherlight-ai',
            required_expertise: ['Debugging', 'TypeScript', 'Testing'],
            patterns: [
                'Pattern-CODE-001',
                'Pattern-TDD-001'
            ],
            files_to_modify: [], // Will be detected during analysis
            variables: {
                bugTitle: formData.title,
                severity: formData.severity,
                stepsToReproduce: formData.stepsToReproduce,
                expectedBehavior: formData.expectedBehavior,
                actualBehavior: formData.actualBehavior,
                additionalContext: formData.additionalContext,
                workspaceRoot: this.workspaceRoot
            }
        };
    }

    /**
     * Build Feature Request template
     * Button: Feature Request (🔧)
     * Purpose: Request new feature with structured form data
     */
    public buildFeatureRequestTemplate(formData: FeatureRequestFormData): TemplateTask {
        return {
            id: 'FEATURE_REQUEST_TEMPLATE',
            name: `Feature request: ${formData.title}`,
            description: `Feature request: ${formData.title}. Priority: ${formData.priority}. Category: ${formData.category}. Design, implement, and test new feature following TDD workflow.`,
            status: 'pending',
            phase: 'phase-3-mvp-prompt-system',
            agent: 'feature-agent',
            estimated_time: '2-4 hours',
            estimated_lines: 100,
            dependencies: [],
            assigned_engineer: 'aetherlight-ai',
            required_expertise: ['Feature Development', 'TypeScript', 'Testing'],
            patterns: [
                'Pattern-CODE-001',
                'Pattern-TDD-001',
                'Pattern-TASK-ANALYSIS-001'
            ],
            files_to_modify: [], // Will be detected during analysis
            variables: {
                featureTitle: formData.title,
                priority: formData.priority,
                category: formData.category,
                useCase: formData.useCase,
                proposedSolution: formData.proposedSolution,
                alternativeApproaches: formData.alternativeApproaches,
                additionalContext: formData.additionalContext,
                workspaceRoot: this.workspaceRoot
            }
        };
    }

    /**
     * Build General Enhance template
     * Button: General Enhance (✨) - User provides custom prompt
     * Purpose: General enhancement based on user's free-form prompt
     */
    public buildGeneralEnhanceTemplate(userPrompt: string): TemplateTask {
        return {
            id: 'GENERAL_ENHANCE_TEMPLATE',
            name: 'General enhancement',
            description: `General enhancement request: ${userPrompt}. Analyze context, suggest approach, and implement following best practices.`,
            status: 'pending',
            phase: 'phase-3-mvp-prompt-system',
            agent: 'infrastructure-agent',
            estimated_time: '1-3 hours',
            estimated_lines: 75,
            dependencies: [],
            assigned_engineer: 'aetherlight-ai',
            required_expertise: ['TypeScript', 'VS Code', 'Software Design'],
            patterns: [
                'Pattern-CODE-001',
                'Pattern-TASK-ANALYSIS-001'
            ],
            files_to_modify: [], // Will be detected during analysis
            variables: {
                userPrompt: userPrompt,
                workspaceRoot: this.workspaceRoot
            }
        };
    }
}
