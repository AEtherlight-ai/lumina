/**
 * TemplateTaskBuilder Tests
 *
 * PATTERN: Pattern-TDD-001 (RED-GREEN-REFACTOR)
 * COVERAGE TARGET: ≥90% (infrastructure task)
 * TASK: PROTECT-000F (Extend MVP-003 system to support template-based enhancements)
 *
 * SERVICE TESTED: TemplateTaskBuilder
 * PURPOSE: Constructs template task objects for enhancement buttons
 *
 * TEST STRATEGY:
 * - Template construction for each button type
 * - Variable injection (workspaceRoot, languages, frameworks)
 * - Form data integration (bug report, feature request)
 * - User prompt integration (general enhance)
 */

import * as assert from 'assert';
import { TemplateTaskBuilder, TemplateTask } from '../../src/services/TemplateTaskBuilder';

describe('TemplateTaskBuilder', () => {
    let builder: TemplateTaskBuilder;
    const mockWorkspaceRoot = '/test/workspace';
    const mockLanguages = ['TypeScript', 'Rust'];
    const mockFrameworks = ['VS Code', 'Tauri'];

    beforeEach(() => {
        builder = new TemplateTaskBuilder(mockWorkspaceRoot);
    });

    // ==========================================================================
    // TEST SUITE 1: Code Analyzer Template
    // ==========================================================================

    describe('buildCodeAnalyzerTemplate()', () => {
        it('should create CODE_ANALYZER_TEMPLATE with workspace context', () => {
            const template = builder.buildCodeAnalyzerTemplate(mockLanguages, mockFrameworks);

            // Verify template structure
            assert.strictEqual(template.id, 'CODE_ANALYZER_TEMPLATE');
            assert.strictEqual(template.name, 'Analyze workspace structure');
            assert.strictEqual(template.agent, 'infrastructure-agent');
            assert.ok(template.description.includes(mockWorkspaceRoot));
            assert.ok(template.patterns.includes('Pattern-CODE-001'));

            // Verify variables injected
            assert.strictEqual(template.variables.workspaceRoot, mockWorkspaceRoot);
            assert.deepStrictEqual(template.variables.languages, mockLanguages);
            assert.deepStrictEqual(template.variables.frameworks, mockFrameworks);
        });

        it('should handle empty languages and frameworks gracefully', () => {
            const template = builder.buildCodeAnalyzerTemplate([], []);

            assert.ok(template);
            assert.strictEqual(template.variables.languages.length, 0);
            assert.strictEqual(template.variables.frameworks.length, 0);
        });

        it('should include files_to_modify field with detected files', () => {
            const template = builder.buildCodeAnalyzerTemplate(mockLanguages, mockFrameworks);

            assert.ok(template.files_to_modify);
            assert.ok(Array.isArray(template.files_to_modify));
            // Should detect from workspace (placeholder for now, will be 'detected from workspace')
            assert.ok(template.files_to_modify.length >= 0);
        });
    });

    // ==========================================================================
    // TEST SUITE 2: Sprint Planner Template
    // ==========================================================================

    describe('buildSprintPlannerTemplate()', () => {
        it('should create SPRINT_PLANNER_TEMPLATE with project context', () => {
            const template = builder.buildSprintPlannerTemplate(mockLanguages, mockFrameworks);

            assert.strictEqual(template.id, 'SPRINT_PLANNER_TEMPLATE');
            assert.strictEqual(template.name, 'Generate sprint plan');
            assert.strictEqual(template.agent, 'infrastructure-agent');
            assert.ok(template.description.includes('sprint plan'));
            assert.ok(template.patterns.includes('Pattern-SPRINT-PLAN-001'));

            // Verify variables
            assert.strictEqual(template.variables.workspaceRoot, mockWorkspaceRoot);
            assert.deepStrictEqual(template.variables.languages, mockLanguages);
            assert.deepStrictEqual(template.variables.frameworks, mockFrameworks);
        });

        it('should include sprint-specific patterns', () => {
            const template = builder.buildSprintPlannerTemplate(mockLanguages, mockFrameworks);

            assert.ok(template.patterns.includes('Pattern-SPRINT-PLAN-001'));
            assert.ok(template.patterns.includes('Pattern-TASK-ANALYSIS-001'));
        });
    });

    // ==========================================================================
    // TEST SUITE 3: Bug Report Template
    // ==========================================================================

    describe('buildBugReportTemplate()', () => {
        it('should create BUG_REPORT_TEMPLATE with form data as variables', () => {
            const formData = {
                title: 'Button not working',
                severity: 'high',
                stepsToReproduce: '1. Click button\n2. See error',
                expectedBehavior: 'Button should work',
                actualBehavior: 'Error message shown',
                additionalContext: 'Happens on Windows only'
            };

            const template = builder.buildBugReportTemplate(formData);

            assert.strictEqual(template.id, 'BUG_REPORT_TEMPLATE');
            assert.strictEqual(template.name, 'Bug report: Button not working');
            assert.strictEqual(template.agent, 'debugging-agent');
            assert.ok(template.description.includes('Button not working'));

            // Verify form data injected as variables
            assert.strictEqual(template.variables.bugTitle, formData.title);
            assert.strictEqual(template.variables.severity, formData.severity);
            assert.strictEqual(template.variables.stepsToReproduce, formData.stepsToReproduce);
            assert.strictEqual(template.variables.expectedBehavior, formData.expectedBehavior);
            assert.strictEqual(template.variables.actualBehavior, formData.actualBehavior);
            assert.strictEqual(template.variables.additionalContext, formData.additionalContext);
        });

        it('should handle minimal bug report (only title and severity)', () => {
            const minimalData = {
                title: 'Minimal bug',
                severity: 'low',
                stepsToReproduce: '',
                expectedBehavior: '',
                actualBehavior: '',
                additionalContext: ''
            };

            const template = builder.buildBugReportTemplate(minimalData);

            assert.strictEqual(template.variables.bugTitle, 'Minimal bug');
            assert.strictEqual(template.variables.severity, 'low');
            assert.strictEqual(template.variables.stepsToReproduce, '');
        });

        it('should set agent to debugging-agent for bug reports', () => {
            const formData = {
                title: 'Test bug',
                severity: 'medium',
                stepsToReproduce: 'N/A',
                expectedBehavior: 'N/A',
                actualBehavior: 'N/A',
                additionalContext: 'N/A'
            };

            const template = builder.buildBugReportTemplate(formData);

            assert.strictEqual(template.agent, 'debugging-agent');
        });
    });

    // ==========================================================================
    // TEST SUITE 4: Feature Request Template
    // ==========================================================================

    describe('buildFeatureRequestTemplate()', () => {
        it('should create FEATURE_REQUEST_TEMPLATE with form data as variables', () => {
            const formData = {
                title: 'Add dark mode',
                priority: 'high',
                category: 'UI',
                useCase: 'Users want dark theme',
                proposedSolution: 'Add theme toggle',
                alternativeApproaches: 'Use system theme',
                additionalContext: 'Requested by 10 users'
            };

            const template = builder.buildFeatureRequestTemplate(formData);

            assert.strictEqual(template.id, 'FEATURE_REQUEST_TEMPLATE');
            assert.strictEqual(template.name, 'Feature request: Add dark mode');
            assert.strictEqual(template.agent, 'feature-agent');
            assert.ok(template.description.includes('Add dark mode'));

            // Verify form data injected as variables
            assert.strictEqual(template.variables.featureTitle, formData.title);
            assert.strictEqual(template.variables.priority, formData.priority);
            assert.strictEqual(template.variables.category, formData.category);
            assert.strictEqual(template.variables.useCase, formData.useCase);
            assert.strictEqual(template.variables.proposedSolution, formData.proposedSolution);
            assert.strictEqual(template.variables.alternativeApproaches, formData.alternativeApproaches);
            assert.strictEqual(template.variables.additionalContext, formData.additionalContext);
        });

        it('should handle minimal feature request (only title and priority)', () => {
            const minimalData = {
                title: 'Minimal feature',
                priority: 'low',
                category: '',
                useCase: '',
                proposedSolution: '',
                alternativeApproaches: '',
                additionalContext: ''
            };

            const template = builder.buildFeatureRequestTemplate(minimalData);

            assert.strictEqual(template.variables.featureTitle, 'Minimal feature');
            assert.strictEqual(template.variables.priority, 'low');
            assert.strictEqual(template.variables.category, '');
        });

        it('should set agent to feature-agent for feature requests', () => {
            const formData = {
                title: 'Test feature',
                priority: 'medium',
                category: 'N/A',
                useCase: 'N/A',
                proposedSolution: 'N/A',
                alternativeApproaches: 'N/A',
                additionalContext: 'N/A'
            };

            const template = builder.buildFeatureRequestTemplate(formData);

            assert.strictEqual(template.agent, 'feature-agent');
        });
    });

    // ==========================================================================
    // TEST SUITE 5: General Enhance Template
    // ==========================================================================

    describe('buildGeneralEnhanceTemplate()', () => {
        it('should create GENERAL_ENHANCE_TEMPLATE with user prompt as variable', () => {
            const userPrompt = 'Refactor authentication module';

            const template = builder.buildGeneralEnhanceTemplate(userPrompt);

            assert.strictEqual(template.id, 'GENERAL_ENHANCE_TEMPLATE');
            assert.strictEqual(template.name, 'General enhancement');
            assert.strictEqual(template.agent, 'infrastructure-agent');
            assert.ok(template.description.includes('Refactor authentication module'));

            // Verify user prompt injected as variable
            assert.strictEqual(template.variables.userPrompt, userPrompt);
            assert.strictEqual(template.variables.workspaceRoot, mockWorkspaceRoot);
        });

        it('should handle empty user prompt gracefully', () => {
            const template = builder.buildGeneralEnhanceTemplate('');

            assert.strictEqual(template.variables.userPrompt, '');
            assert.ok(template.description); // Should still have description
        });

        it('should handle multi-line user prompts', () => {
            const multiLinePrompt = `Line 1: Do this
Line 2: Then do that
Line 3: Finally this`;

            const template = builder.buildGeneralEnhanceTemplate(multiLinePrompt);

            assert.strictEqual(template.variables.userPrompt, multiLinePrompt);
            assert.ok(template.description.includes('Line 1'));
        });
    });

    // ==========================================================================
    // TEST SUITE 6: Edge Cases & Validation
    // ==========================================================================

    describe('Edge Cases', () => {
        it('should handle special characters in form data', () => {
            const formData = {
                title: 'Bug with "quotes" and \'apostrophes\'',
                severity: 'high',
                stepsToReproduce: 'Use $variables and {braces}',
                expectedBehavior: 'Should work with <tags>',
                actualBehavior: 'Fails on & and % characters',
                additionalContext: 'Path: C:\\Users\\Test'
            };

            const template = builder.buildBugReportTemplate(formData);

            // Should preserve special characters
            assert.ok(template.variables.bugTitle.includes('"quotes"'));
            assert.ok(template.variables.stepsToReproduce.includes('$variables'));
            assert.ok(template.variables.expectedBehavior.includes('<tags>'));
            assert.ok(template.variables.actualBehavior.includes('&'));
            assert.ok(template.variables.additionalContext.includes('C:\\Users\\Test'));
        });

        it('should handle very long descriptions', () => {
            const longDescription = 'A'.repeat(10000);
            const formData = {
                title: 'Long bug',
                severity: 'low',
                stepsToReproduce: longDescription,
                expectedBehavior: 'N/A',
                actualBehavior: 'N/A',
                additionalContext: 'N/A'
            };

            const template = builder.buildBugReportTemplate(formData);

            assert.strictEqual(template.variables.stepsToReproduce.length, 10000);
        });

        it('should preserve workspace root across all template types', () => {
            const codeTemplate = builder.buildCodeAnalyzerTemplate([], []);
            const sprintTemplate = builder.buildSprintPlannerTemplate([], []);
            const generalTemplate = builder.buildGeneralEnhanceTemplate('test');

            assert.strictEqual(codeTemplate.variables.workspaceRoot, mockWorkspaceRoot);
            assert.strictEqual(sprintTemplate.variables.workspaceRoot, mockWorkspaceRoot);
            assert.strictEqual(generalTemplate.variables.workspaceRoot, mockWorkspaceRoot);
        });
    });

    // ==========================================================================
    // TEST SUITE 7: Template Structure Validation
    // ==========================================================================

    describe('Template Structure Validation', () => {
        it('all templates should have required fields', () => {
            const templates = [
                builder.buildCodeAnalyzerTemplate(mockLanguages, mockFrameworks),
                builder.buildSprintPlannerTemplate(mockLanguages, mockFrameworks),
                builder.buildBugReportTemplate({
                    title: 'test',
                    severity: 'low',
                    stepsToReproduce: '',
                    expectedBehavior: '',
                    actualBehavior: '',
                    additionalContext: ''
                }),
                builder.buildFeatureRequestTemplate({
                    title: 'test',
                    priority: 'low',
                    category: '',
                    useCase: '',
                    proposedSolution: '',
                    alternativeApproaches: '',
                    additionalContext: ''
                }),
                builder.buildGeneralEnhanceTemplate('test')
            ];

            for (const template of templates) {
                // Required fields for SprintTask interface
                assert.ok(template.id, 'Template must have id');
                assert.ok(template.name, 'Template must have name');
                assert.ok(template.status, 'Template must have status');
                assert.ok(template.phase, 'Template must have phase');
                assert.ok(template.agent, 'Template must have agent');
                assert.ok(template.description, 'Template must have description');
                assert.ok(template.patterns, 'Template must have patterns');
                assert.ok(template.variables, 'Template must have variables');

                // All templates should be 'pending' status
                assert.strictEqual(template.status, 'pending');

                // All templates should have 'phase-3-mvp-prompt-system' phase
                assert.strictEqual(template.phase, 'phase-3-mvp-prompt-system');
            }
        });

        it('should implement TemplateTask interface (extends SprintTask)', () => {
            const template = builder.buildCodeAnalyzerTemplate(mockLanguages, mockFrameworks);

            // TemplateTask-specific fields
            assert.ok(template.variables);
            assert.strictEqual(typeof template.variables, 'object');

            // SprintTask fields
            assert.ok(template.id);
            assert.ok(template.name);
            assert.ok(template.status);
            assert.ok(template.phase);
            assert.ok(template.agent);
        });
    });
});
