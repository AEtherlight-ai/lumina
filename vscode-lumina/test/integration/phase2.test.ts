/**
 * Phase 2 Integration Tests
 *
 * PATTERN: Pattern-TDD-001 (90% coverage for infrastructure)
 * COVERAGE TARGET: ≥90% for Phase 2 services
 * TEST STRATEGY: End-to-end workflow, error cases, override behavior, performance
 *
 * SERVICES TESTED:
 * - VariableResolver (SELF-001)
 * - ProjectConfigGenerator (SELF-002)
 * - ProjectConfig schema (SELF-003)
 * - InterviewEngine (SELF-004)
 */

import * as assert from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
    VariableResolver,
    VariableNotFoundError,
    CircularDependencyError
} from '../../src/services/VariableResolver';
import {
    ProjectConfigGenerator,
    DetectionResults,
    InterviewAnswers
} from '../../src/services/ProjectConfigGenerator';
import { ProjectConfig, LanguageType } from '../../src/services/ProjectConfig';
import { InterviewEngine, InterviewTemplate } from '../../src/services/InterviewEngine';
import { ProjectConfigValidator } from '../../src/services/ProjectConfigValidator';

describe('Phase 2 Integration Tests', () => {
    let sandbox: sinon.SinonSandbox;
    let variableResolver: VariableResolver;
    let configGenerator: ProjectConfigGenerator;
    let interviewEngine: InterviewEngine;
    let validator: ProjectConfigValidator;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
        variableResolver = new VariableResolver();
        configGenerator = new ProjectConfigGenerator();
        interviewEngine = new InterviewEngine();
        validator = new ProjectConfigValidator();
    });

    afterEach(() => {
        sandbox.restore();
    });

    // ==========================================================================
    // TEST SUITE 1: Full Workflow (Happy Path)
    // ==========================================================================

    describe('Full Workflow: Detection → Interview → Config → Resolution', () => {
        it('should complete full Phase 2 workflow end-to-end', async () => {
            // STEP 1: Mock detection results (would come from Phase 3 detectors)
            const detectionResults: DetectionResults = {
                language: 'typescript' as LanguageType,
                package_manager: 'npm',
                test_framework: 'mocha',
                file_extensions: ['.ts', '.tsx'],
                build_command: 'npm run build',
                compile_command: 'tsc -p .',
                test_command: 'npm test',
                project_root: '/test/project',
                source_directory: 'src',
                test_directory: 'test',
                output_directory: 'out'
            };

            // STEP 2: Mock interview answers (user overrides)
            const interviewAnswers: InterviewAnswers = {
                project_name: 'my-test-project',
                build_command: 'npm run build:prod', // Override detection
                test_command: 'npm run test:coverage' // Override detection
            };

            // STEP 3: Generate project config (merge detection + interview)
            const config = await configGenerator.generate(detectionResults, interviewAnswers);

            // Verify config generated correctly
            assert.ok(config);
            assert.strictEqual(config.schema_version, '1.0.0');
            assert.strictEqual(config.project_name, 'my-test-project');
            assert.strictEqual(config.language.language, 'typescript');
            assert.strictEqual(config.language.package_manager, 'npm');

            // Verify interview overrides detection
            assert.strictEqual(config.language.build_command, 'npm run build:prod');
            assert.strictEqual(config.language.test_command, 'npm run test:coverage');

            // STEP 4: Validate config against schema
            const validationResult = validator.validate(config);
            assert.strictEqual(validationResult.valid, true);
            assert.strictEqual(validationResult.errors.length, 0);

            // STEP 5: Create variable dictionary from config
            const variables: Record<string, string> = {
                PROJECT_NAME: config.project_name,
                LANGUAGE: config.language.language,
                PACKAGE_MANAGER: config.language.package_manager,
                BUILD_COMMAND: config.language.build_command,
                TEST_COMMAND: config.language.test_command,
                FILE_EXTENSION: config.language.file_extensions[0]
            };

            // STEP 6: Resolve template with variables
            const template = `
Project: {{PROJECT_NAME}}
Language: {{LANGUAGE}}
Build: {{BUILD_COMMAND}}
Test: {{TEST_COMMAND}}
Files: {{FILE_EXTENSION}}
`;

            const resolved = variableResolver.resolve(template, variables);

            // Verify all variables resolved correctly
            assert.ok(resolved.includes('Project: my-test-project'));
            assert.ok(resolved.includes('Language: typescript'));
            assert.ok(resolved.includes('Build: npm run build:prod'));
            assert.ok(resolved.includes('Test: npm run test:coverage'));
            assert.ok(resolved.includes('Files: .ts'));

            // Verify no {{variables}} remain
            assert.ok(!resolved.includes('{{'));
            assert.ok(!resolved.includes('}}'));
        });

        it('should handle minimal detection with defaults', async () => {
            // Minimal detection (language only)
            const minimalDetection: DetectionResults = {
                language: 'rust' as LanguageType
            };

            const interviewAnswers: InterviewAnswers = {
                project_name: 'rust-project'
            };

            const config = await configGenerator.generate(minimalDetection, interviewAnswers);

            // Should fill in defaults
            assert.ok(config);
            assert.strictEqual(config.language.language, 'rust');
            assert.strictEqual(config.project_name, 'rust-project');

            // Defaults should be applied
            assert.ok(config.language.build_command); // Default exists
            assert.ok(config.language.test_command); // Default exists
        });

        it('should handle interview-only workflow (no detection)', async () => {
            // User provides everything via interview
            const noDetection: DetectionResults = {};

            const fullInterview: InterviewAnswers = {
                project_name: 'user-project',
                language: 'python' as LanguageType,
                package_manager: 'pip',
                test_framework: 'pytest',
                build_command: 'python setup.py build',
                test_command: 'pytest'
            };

            const config = await configGenerator.generate(noDetection, fullInterview);

            assert.strictEqual(config.project_name, 'user-project');
            assert.strictEqual(config.language.language, 'python');
            assert.strictEqual(config.language.package_manager, 'pip');
            assert.strictEqual(config.language.test_framework, 'pytest');
        });
    });

    // ==========================================================================
    // TEST SUITE 2: Error Handling
    // ==========================================================================

    describe('Error Handling', () => {
        it('should throw VariableNotFoundError for missing variable', async () => {
            const template = 'Build: {{BUILD_COMMAND}} Test: {{UNKNOWN_VAR}}';
            const variables = {
                BUILD_COMMAND: 'npm run build'
            };

            assert.throws(
                () => variableResolver.resolve(template, variables),
                VariableNotFoundError
            );

            try {
                variableResolver.resolve(template, variables);
                assert.fail('Should have thrown VariableNotFoundError');
            } catch (error) {
                assert.ok(error instanceof VariableNotFoundError);
                assert.ok((error as Error).message.includes('UNKNOWN_VAR'));
            }
        });

        it('should throw CircularDependencyError for circular variables', () => {
            const template = '{{VAR_A}}';
            const variables = {
                VAR_A: '{{VAR_B}}',
                VAR_B: '{{VAR_A}}' // Circular!
            };

            assert.throws(
                () => variableResolver.resolve(template, variables),
                CircularDependencyError
            );
        });

        it('should validate config and reject invalid schema', async () => {
            const invalidConfig = {
                schema_version: '1.0.0',
                // Missing required fields: project_name, language, etc.
                project_name: ''
            } as any;

            const result = validator.validate(invalidConfig);

            assert.strictEqual(result.valid, false);
            assert.ok(result.errors.length > 0);
        });

        it('should handle empty detection and interview gracefully', async () => {
            const emptyDetection: DetectionResults = {};
            const emptyInterview: InterviewAnswers = {};

            // Should apply all defaults
            const config = await configGenerator.generate(emptyDetection, emptyInterview);

            assert.ok(config);
            assert.ok(config.project_name); // Default project name
            assert.ok(config.language.language); // Default language
        });
    });

    // ==========================================================================
    // TEST SUITE 3: Override Behavior (Interview > Detection)
    // ==========================================================================

    describe('Override Behavior: Interview Wins', () => {
        it('should use interview answer over detection for build command', async () => {
            const detection: DetectionResults = {
                language: 'typescript' as LanguageType,
                build_command: 'npm run build' // Detection says this
            };

            const interview: InterviewAnswers = {
                build_command: 'npm run build:prod' // User overrides
            };

            const config = await configGenerator.generate(detection, interview);

            // Interview should win
            assert.strictEqual(config.language.build_command, 'npm run build:prod');
        });

        it('should use interview answer over detection for all overridable fields', async () => {
            const detection: DetectionResults = {
                language: 'javascript' as LanguageType,
                package_manager: 'npm',
                test_framework: 'mocha',
                build_command: 'npm run build',
                test_command: 'npm test'
            };

            const interview: InterviewAnswers = {
                language: 'typescript' as LanguageType, // Override language
                package_manager: 'yarn', // Override package manager
                test_framework: 'jest', // Override test framework
                build_command: 'yarn build', // Override build command
                test_command: 'yarn test' // Override test command
            };

            const config = await configGenerator.generate(detection, interview);

            // All interview answers should win
            assert.strictEqual(config.language.language, 'typescript');
            assert.strictEqual(config.language.package_manager, 'yarn');
            assert.strictEqual(config.language.test_framework, 'jest');
            assert.strictEqual(config.language.build_command, 'yarn build');
            assert.strictEqual(config.language.test_command, 'yarn test');
        });

        it('should use detection when interview does not provide value', async () => {
            const detection: DetectionResults = {
                language: 'rust' as LanguageType,
                build_command: 'cargo build',
                test_command: 'cargo test'
            };

            const interview: InterviewAnswers = {
                // Only override build command, not test command
                build_command: 'cargo build --release'
            };

            const config = await configGenerator.generate(detection, interview);

            // Interview overrides build command
            assert.strictEqual(config.language.build_command, 'cargo build --release');

            // Detection provides test command (no interview override)
            assert.strictEqual(config.language.test_command, 'cargo test');
        });
    });

    // ==========================================================================
    // TEST SUITE 4: Performance Tests
    // ==========================================================================

    describe('Performance Requirements', () => {
        it('should complete full workflow in less than 200ms (average of 100 runs)', async function(this: Mocha.Context) {
            this.timeout(30000); // Allow 30s for 100 iterations

            const detection: DetectionResults = {
                language: 'typescript' as LanguageType,
                package_manager: 'npm',
                build_command: 'npm run build',
                test_command: 'npm test'
            };

            const interview: InterviewAnswers = {
                project_name: 'perf-test',
                build_command: 'npm run build:prod'
            };

            const iterations = 100;
            const times: number[] = [];

            for (let i = 0; i < iterations; i++) {
                const startTime = Date.now();

                // Full workflow
                const config = await configGenerator.generate(detection, interview);
                const variables = {
                    BUILD_COMMAND: config.language.build_command,
                    TEST_COMMAND: config.language.test_command
                };
                const template = 'Build: {{BUILD_COMMAND}}, Test: {{TEST_COMMAND}}';
                variableResolver.resolve(template, variables);

                const duration = Date.now() - startTime;
                times.push(duration);
            }

            const averageTime = times.reduce((a, b) => a + b, 0) / times.length;
            const maxTime = Math.max(...times);

            console.log(`Performance: avg=${averageTime.toFixed(2)}ms, max=${maxTime}ms (${iterations} iterations)`);

            assert.ok(averageTime < 200, `Average time ${averageTime.toFixed(2)}ms exceeds 200ms target`);
        });

        it('should resolve 100 variables in less than 10ms', () => {
            // Create 100 variables
            const variables: Record<string, string> = {};
            let template = '';

            for (let i = 0; i < 100; i++) {
                const varName = `VAR_${i}`;
                variables[varName] = `value_${i}`;
                template += `{{${varName}}} `;
            }

            const startTime = Date.now();
            const resolved = variableResolver.resolve(template, variables);
            const duration = Date.now() - startTime;

            assert.ok(duration < 10, `Variable resolution took ${duration}ms, expected <10ms`);
            assert.ok(!resolved.includes('{{'));
        });
    });

    // ==========================================================================
    // TEST SUITE 5: Edge Cases & Complex Scenarios
    // ==========================================================================

    describe('Edge Cases & Complex Scenarios', () => {
        it('should handle recursive variable resolution', () => {
            const template = '{{FINAL}}';
            const variables = {
                FINAL: 'Result: {{INTERMEDIATE}}',
                INTERMEDIATE: 'Value: {{BASE}}',
                BASE: 'Hello World'
            };

            const resolved = variableResolver.resolve(template, variables);

            assert.strictEqual(resolved, 'Result: Value: Hello World');
        });

        it('should handle multi-language project detection', async () => {
            const multiLanguageDetection: DetectionResults = {
                language: 'typescript' as LanguageType,
                // Secondary languages could be added in future
                file_extensions: ['.ts', '.tsx', '.js', '.jsx']
            };

            const interview: InterviewAnswers = {
                project_name: 'multi-lang-project'
            };

            const config = await configGenerator.generate(multiLanguageDetection, interview);

            assert.strictEqual(config.language.language, 'typescript');
            assert.deepStrictEqual(config.language.file_extensions, ['.ts', '.tsx', '.js', '.jsx']);
        });

        it('should preserve user-provided paths and directories', async () => {
            const detection: DetectionResults = {
                language: 'go' as LanguageType,
                project_root: '/auto/detected/root',
                source_directory: 'src',
                test_directory: 'test'
            };

            const interview: InterviewAnswers = {
                // User overrides directories
                source_directory: 'cmd',
                test_directory: 'tests'
            };

            const config = await configGenerator.generate(detection, interview);

            // Interview overrides should win
            assert.strictEqual(config.structure.source_directory, 'cmd');
            assert.strictEqual(config.structure.test_directory, 'tests');
        });

        it('should handle special characters in variable values', () => {
            const template = 'Command: {{CMD}}';
            const variables = {
                CMD: 'npm run "build:prod" && echo "Done!"'
            };

            const resolved = variableResolver.resolve(template, variables);

            assert.strictEqual(resolved, 'Command: npm run "build:prod" && echo "Done!"');
        });

        it('should handle empty string variable values', () => {
            const template = 'Value: {{EMPTY}} End';
            const variables = {
                EMPTY: ''
            };

            const resolved = variableResolver.resolve(template, variables);

            assert.strictEqual(resolved, 'Value:  End');
        });
    });

    // ==========================================================================
    // TEST SUITE 6: Integration with InterviewEngine
    // ==========================================================================

    describe('Integration with InterviewEngine', () => {
        it('should complete interview workflow and generate config', async () => {
            // Create interview template
            const template: InterviewTemplate = {
                name: 'integration-test',
                questions: [
                    {
                        name: 'project_name',
                        type: 'input',
                        message: 'Project name?'
                    },
                    {
                        name: 'build_command',
                        type: 'input',
                        message: 'Build command?'
                    }
                ]
            };

            // Mock VS Code prompts
            const showInputBoxStub = sandbox.stub(vscode.window, 'showInputBox');
            showInputBoxStub.onCall(0).resolves('test-project');
            showInputBoxStub.onCall(1).resolves('npm run build:test');

            // Run interview
            const interviewAnswers = await interviewEngine.runInterview(template);

            // Generate config from interview
            const detection: DetectionResults = {
                language: 'typescript' as LanguageType
            };

            const config = await configGenerator.generate(detection, interviewAnswers);

            // Verify interview answers used
            assert.strictEqual(config.project_name, 'test-project');
            assert.strictEqual(config.language.build_command, 'npm run build:test');
        });

        it('should handle user cancelling interview gracefully', async () => {
            const template: InterviewTemplate = {
                name: 'cancel-test',
                questions: [
                    {
                        name: 'project_name',
                        type: 'input',
                        message: 'Project name?'
                    }
                ]
            };

            // User cancels (returns undefined)
            sandbox.stub(vscode.window, 'showInputBox').resolves(undefined);

            const interviewAnswers = await interviewEngine.runInterview(template);

            // Should return answers with undefined values
            assert.strictEqual(interviewAnswers.project_name, undefined);

            // Config generation should handle undefined answers
            const detection: DetectionResults = {
                language: 'typescript' as LanguageType
            };

            const config = await configGenerator.generate(detection, interviewAnswers);

            // Should use default project name (undefined interview answer ignored)
            assert.ok(config.project_name);
            assert.notStrictEqual(config.project_name, undefined);
        });
    });
});
