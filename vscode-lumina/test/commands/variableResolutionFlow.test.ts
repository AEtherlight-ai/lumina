/**
 * VariableResolutionFlow Command Tests
 *
 * PATTERN: Pattern-TDD-001 (85% coverage for API code)
 * COVERAGE TARGET: 85% (API command)
 * TEST STRATEGY: Mock TemplateCustomizer, InterviewEngine, test resolution flow
 */

import * as assert from 'assert';
import * as sinon from 'sinon';
import * as fs from 'fs';
import * as path from 'path';
import { VariableResolutionFlowCommand } from '../../src/commands/variableResolutionFlow';
import { TemplateCustomizer, TemplateCustomizationError } from '../../src/services/TemplateCustomizer';
import { VariableResolver, VariableNotFoundError } from '../../src/services/VariableResolver';
import { InterviewEngine, InterviewTemplate } from '../../src/services/InterviewEngine';
import { ProjectConfig } from '../../src/services/ProjectConfig';
import { ProjectConfigValidator } from '../../src/services/ProjectConfigValidator';
import { InterviewAnswers } from '../../src/services/ProjectConfigGenerator';

suite('VariableResolutionFlow Command Tests', () => {
    let command: VariableResolutionFlowCommand;
    let sandbox: sinon.SinonSandbox;
    let templateCustomizer: sinon.SinonStubbedInstance<TemplateCustomizer>;
    let variableResolver: sinon.SinonStubbedInstance<VariableResolver>;
    let interviewEngine: sinon.SinonStubbedInstance<InterviewEngine>;
    let configValidator: sinon.SinonStubbedInstance<ProjectConfigValidator>;
    let tempDir: string;

    setup(() => {
        sandbox = sinon.createSandbox();
        tempDir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'lumina-test-'));

        // Create stubbed instances
        templateCustomizer = sandbox.createStubInstance(TemplateCustomizer);
        variableResolver = sandbox.createStubInstance(VariableResolver);
        interviewEngine = sandbox.createStubInstance(InterviewEngine);
        configValidator = sandbox.createStubInstance(ProjectConfigValidator);

        command = new VariableResolutionFlowCommand(
            templateCustomizer as any,
            variableResolver as any,
            interviewEngine as any,
            configValidator as any
        );
    });

    teardown(() => {
        sandbox.restore();
        // Clean up temp directory
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });

    // ==========================================================================
    // TEST SUITE 1: Missing Variable Detection
    // ==========================================================================

    suite('detectMissingVariables()', () => {
        test('should detect missing variables during template customization', async () => {
            const templatePath = path.join(tempDir, 'test.template');
            const outputPath = path.join(tempDir, 'output.md');
            const configPath = path.join(tempDir, 'config.json');

            // Mock config
            const mockConfig: ProjectConfig = {
                project_name: 'test-project',
                language: {
                    language: 'typescript',
                    file_extensions: ['.ts'],
                    build_command: 'npm run build',
                    test_command: 'npm test',
                    package_manager: 'npm',
                    test_framework: 'jest'
                },
                structure: {
                    root_directory: tempDir,
                    source_directory: 'src',
                    test_directory: 'test',
                    output_directory: 'out',
                    docs_directory: 'docs',
                    scripts_directory: 'scripts'
                },
                testing: {
                    coverage_infrastructure: 90,
                    coverage_api: 85,
                    coverage_ui: 70,
                    coverage_command: 'npm run coverage'
                }
            };
            fs.writeFileSync(configPath, JSON.stringify(mockConfig, null, 2));

            // Mock template customization failure (missing variable)
            templateCustomizer.customizeTemplate.rejects(
                new TemplateCustomizationError('Variable resolution failed in template test.template: Variable not found: DEPLOY_TARGET')
            );

            // Detect missing variables
            const missingVars = await command.detectMissingVariables(templatePath, outputPath, configPath);

            assert.strictEqual(missingVars.length, 1);
            assert.strictEqual(missingVars[0], 'DEPLOY_TARGET');
        });

        test('should handle multiple missing variables', async () => {
            const templatePath = path.join(tempDir, 'test.template');
            const outputPath = path.join(tempDir, 'output.md');
            const configPath = path.join(tempDir, 'config.json');

            // Mock config
            const mockConfig: ProjectConfig = {
                project_name: 'test-project',
                language: {
                    language: 'typescript',
                    file_extensions: ['.ts'],
                    build_command: 'npm run build',
                    test_command: 'npm test',
                    package_manager: 'npm',
                    test_framework: 'jest'
                },
                structure: {
                    root_directory: tempDir,
                    source_directory: 'src',
                    test_directory: 'test',
                    output_directory: 'out',
                    docs_directory: 'docs',
                    scripts_directory: 'scripts'
                },
                testing: {
                    coverage_infrastructure: 90,
                    coverage_api: 85,
                    coverage_ui: 70,
                    coverage_command: 'npm run coverage'
                }
            };
            fs.writeFileSync(configPath, JSON.stringify(mockConfig, null, 2));

            // First call: missing DEPLOY_TARGET
            // Second call: missing API_KEY
            templateCustomizer.customizeTemplate
                .onFirstCall().rejects(new TemplateCustomizationError('Variable not found: DEPLOY_TARGET'))
                .onSecondCall().rejects(new TemplateCustomizationError('Variable not found: API_KEY'))
                .onThirdCall().resolves(); // Success after both resolved

            // Detect missing variables (should retry until all resolved)
            const missingVars = await command.detectMissingVariables(templatePath, outputPath, configPath);

            assert.strictEqual(missingVars.length, 2);
            assert.ok(missingVars.includes('DEPLOY_TARGET'));
            assert.ok(missingVars.includes('API_KEY'));
        });

        test('should return empty array if no missing variables', async () => {
            const templatePath = path.join(tempDir, 'test.template');
            const outputPath = path.join(tempDir, 'output.md');
            const configPath = path.join(tempDir, 'config.json');

            // Mock config
            const mockConfig: ProjectConfig = {
                project_name: 'test-project',
                language: {
                    language: 'typescript',
                    file_extensions: ['.ts'],
                    build_command: 'npm run build',
                    test_command: 'npm test',
                    package_manager: 'npm',
                    test_framework: 'jest'
                },
                structure: {
                    root_directory: tempDir,
                    source_directory: 'src',
                    test_directory: 'test',
                    output_directory: 'out',
                    docs_directory: 'docs',
                    scripts_directory: 'scripts'
                },
                testing: {
                    coverage_infrastructure: 90,
                    coverage_api: 85,
                    coverage_ui: 70,
                    coverage_command: 'npm run coverage'
                }
            };
            fs.writeFileSync(configPath, JSON.stringify(mockConfig, null, 2));

            // Template customization succeeds (no missing variables)
            templateCustomizer.customizeTemplate.resolves();

            const missingVars = await command.detectMissingVariables(templatePath, outputPath, configPath);

            assert.strictEqual(missingVars.length, 0);
        });
    });

    // ==========================================================================
    // TEST SUITE 2: Dynamic Question Generation
    // ==========================================================================

    suite('generateQuestionsForVariables()', () => {
        test('should generate questions for missing variables', () => {
            const missingVars = ['DEPLOY_TARGET', 'API_KEY'];

            const questions = command.generateQuestionsForVariables(missingVars);

            assert.strictEqual(questions.length, 2);

            // Check DEPLOY_TARGET question
            const deployQuestion = questions.find(q => q.name === 'DEPLOY_TARGET');
            assert.ok(deployQuestion);
            assert.strictEqual(deployQuestion.type, 'list');
            assert.ok(deployQuestion.message.toLowerCase().includes('deploy'));
            assert.ok(deployQuestion.choices);
            assert.ok(deployQuestion.choices.includes('aws'));

            // Check API_KEY question
            const apiKeyQuestion = questions.find(q => q.name === 'API_KEY');
            assert.ok(apiKeyQuestion);
            assert.strictEqual(apiKeyQuestion.type, 'input');
            assert.ok(apiKeyQuestion.message.toLowerCase().includes('api'));
        });

        test('should infer question type from variable name', () => {
            const missingVars = [
                'DEPLOY_TARGET',    // list (has "TARGET")
                'API_URL',          // input (has "URL")
                'DATABASE_HOST',    // input (has "HOST")
                'USE_CACHE',        // confirm (has "USE_")
                'ENABLE_LOGGING'    // confirm (has "ENABLE_")
            ];

            const questions = command.generateQuestionsForVariables(missingVars);

            assert.strictEqual(questions.length, 5);

            const deployQ = questions.find(q => q.name === 'DEPLOY_TARGET');
            assert.strictEqual(deployQ?.type, 'list');

            const urlQ = questions.find(q => q.name === 'API_URL');
            assert.strictEqual(urlQ?.type, 'input');

            const cacheQ = questions.find(q => q.name === 'USE_CACHE');
            assert.strictEqual(cacheQ?.type, 'confirm');

            const logQ = questions.find(q => q.name === 'ENABLE_LOGGING');
            assert.strictEqual(logQ?.type, 'confirm');
        });

        test('should generate human-readable messages from variable names', () => {
            const missingVars = ['DEPLOY_TARGET', 'API_KEY', 'DATABASE_URL'];

            const questions = command.generateQuestionsForVariables(missingVars);

            // Check message formatting (DEPLOY_TARGET → "Where will you deploy?")
            const deployQ = questions.find(q => q.name === 'DEPLOY_TARGET');
            assert.ok(deployQ?.message.match(/[Dd]eploy/));

            const apiKeyQ = questions.find(q => q.name === 'API_KEY');
            assert.ok(apiKeyQ?.message.match(/[Aa][Pp][Ii]/));

            const dbUrlQ = questions.find(q => q.name === 'DATABASE_URL');
            assert.ok(dbUrlQ?.message.match(/[Dd]atabase/));
        });
    });

    // ==========================================================================
    // TEST SUITE 3: Interview Execution
    // ==========================================================================

    suite('runResolutionInterview()', () => {
        test('should run interview with generated questions', async () => {
            const missingVars = ['DEPLOY_TARGET'];

            // Mock interview template
            const mockTemplate: InterviewTemplate = {
                name: 'variable-resolution',
                questions: []
            };
            interviewEngine.loadTemplate.resolves(mockTemplate);

            // Mock interview answers
            const mockAnswers: InterviewAnswers = {
                DEPLOY_TARGET: 'aws'
            };
            interviewEngine.runInterview.resolves(mockAnswers);

            const answers = await command.runResolutionInterview(missingVars);

            assert.ok(interviewEngine.runInterview.calledOnce);
            assert.strictEqual(answers.DEPLOY_TARGET, 'aws');
        });

        test('should handle user cancellation', async () => {
            const missingVars = ['DEPLOY_TARGET'];

            const mockTemplate: InterviewTemplate = {
                name: 'variable-resolution',
                questions: []
            };
            interviewEngine.loadTemplate.resolves(mockTemplate);

            // User cancels interview (returns undefined)
            interviewEngine.runInterview.resolves(undefined as any);

            await assert.rejects(
                async () => await command.runResolutionInterview(missingVars),
                /cancelled/i
            );
        });
    });

    // ==========================================================================
    // TEST SUITE 4: Config Update
    // ==========================================================================

    suite('updateProjectConfig()', () => {
        test('should merge resolved values into existing config', async () => {
            const configPath = path.join(tempDir, 'config.json');

            // Mock existing config
            const existingConfig: ProjectConfig = {
                project_name: 'test-project',
                language: {
                    language: 'typescript',
                    file_extensions: ['.ts'],
                    build_command: 'npm run build',
                    test_command: 'npm test',
                    package_manager: 'npm',
                    test_framework: 'jest'
                },
                structure: {
                    root_directory: tempDir,
                    source_directory: 'src',
                    test_directory: 'test',
                    output_directory: 'out',
                    docs_directory: 'docs',
                    scripts_directory: 'scripts'
                },
                testing: {
                    coverage_infrastructure: 90,
                    coverage_api: 85,
                    coverage_ui: 70,
                    coverage_command: 'npm run coverage'
                }
            };
            fs.writeFileSync(configPath, JSON.stringify(existingConfig, null, 2));

            // Resolved values
            const resolvedValues: InterviewAnswers = {
                DEPLOY_TARGET: 'aws',
                API_KEY: 'secret123'
            };

            // Mock validator
            configValidator.validate.returns({ valid: true, errors: [] });

            // Update config
            await command.updateProjectConfig(configPath, resolvedValues);

            // Verify config was updated
            const updatedConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
            assert.strictEqual(updatedConfig.project_name, 'test-project'); // Existing preserved
            assert.strictEqual(updatedConfig.deployment?.deploy_target, 'aws'); // New added
            assert.strictEqual(updatedConfig.api?.api_key, 'secret123'); // New added
        });

        test('should validate config before writing', async () => {
            const configPath = path.join(tempDir, 'config.json');

            const existingConfig: ProjectConfig = {
                project_name: 'test-project',
                language: {
                    language: 'typescript',
                    file_extensions: ['.ts'],
                    build_command: 'npm run build',
                    test_command: 'npm test',
                    package_manager: 'npm',
                    test_framework: 'jest'
                },
                structure: {
                    root_directory: tempDir,
                    source_directory: 'src',
                    test_directory: 'test',
                    output_directory: 'out',
                    docs_directory: 'docs',
                    scripts_directory: 'scripts'
                },
                testing: {
                    coverage_infrastructure: 90,
                    coverage_api: 85,
                    coverage_ui: 70,
                    coverage_command: 'npm run coverage'
                }
            };
            fs.writeFileSync(configPath, JSON.stringify(existingConfig, null, 2));

            const resolvedValues: InterviewAnswers = {
                DEPLOY_TARGET: 'invalid'
            };

            // Mock validation failure
            configValidator.validate.returns({
                valid: false,
                errors: ['Invalid deploy target']
            });

            await assert.rejects(
                async () => await command.updateProjectConfig(configPath, resolvedValues),
                /validation failed/i
            );

            // Verify config was NOT updated
            const unchangedConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
            assert.strictEqual(unchangedConfig.project_name, 'test-project');
            assert.strictEqual(unchangedConfig.deployment, undefined);
        });
    });

    // ==========================================================================
    // TEST SUITE 5: Full Resolution Flow
    // ==========================================================================

    suite('runFullResolutionFlow()', () => {
        test('should run complete flow: detect → interview → update → retry', async () => {
            const templatePath = path.join(tempDir, 'test.template');
            const outputPath = path.join(tempDir, 'output.md');
            const configPath = path.join(tempDir, 'config.json');

            // Mock config
            const mockConfig: ProjectConfig = {
                project_name: 'test-project',
                language: {
                    language: 'typescript',
                    file_extensions: ['.ts'],
                    build_command: 'npm run build',
                    test_command: 'npm test',
                    package_manager: 'npm',
                    test_framework: 'jest'
                },
                structure: {
                    root_directory: tempDir,
                    source_directory: 'src',
                    test_directory: 'test',
                    output_directory: 'out',
                    docs_directory: 'docs',
                    scripts_directory: 'scripts'
                },
                testing: {
                    coverage_infrastructure: 90,
                    coverage_api: 85,
                    coverage_ui: 70,
                    coverage_command: 'npm run coverage'
                }
            };
            fs.writeFileSync(configPath, JSON.stringify(mockConfig, null, 2));

            // Step 1: First customization fails (missing variable)
            // Step 2: Second customization succeeds (after resolution)
            templateCustomizer.customizeTemplate
                .onFirstCall().rejects(new TemplateCustomizationError('Variable not found: DEPLOY_TARGET'))
                .onSecondCall().resolves(); // Success after resolution

            // Step 3: Interview returns resolved values
            const mockTemplate: InterviewTemplate = {
                name: 'variable-resolution',
                questions: []
            };
            interviewEngine.loadTemplate.resolves(mockTemplate);
            interviewEngine.runInterview.resolves({ DEPLOY_TARGET: 'aws' });

            // Step 4: Validation passes
            configValidator.validate.returns({ valid: true, errors: [] });

            // Run full flow
            const result = await command.runFullResolutionFlow(templatePath, outputPath, configPath);

            assert.ok(result.success);
            assert.strictEqual(result.resolvedVariables.length, 1);
            assert.ok(result.resolvedVariables.includes('DEPLOY_TARGET'));
        });

        test('should handle infinite loop prevention (max retries)', async () => {
            const templatePath = path.join(tempDir, 'test.template');
            const outputPath = path.join(tempDir, 'output.md');
            const configPath = path.join(tempDir, 'config.json');

            // Mock config
            const mockConfig: ProjectConfig = {
                project_name: 'test-project',
                language: {
                    language: 'typescript',
                    file_extensions: ['.ts'],
                    build_command: 'npm run build',
                    test_command: 'npm test',
                    package_manager: 'npm',
                    test_framework: 'jest'
                },
                structure: {
                    root_directory: tempDir,
                    source_directory: 'src',
                    test_directory: 'test',
                    output_directory: 'out',
                    docs_directory: 'docs',
                    scripts_directory: 'scripts'
                },
                testing: {
                    coverage_infrastructure: 90,
                    coverage_api: 85,
                    coverage_ui: 70,
                    coverage_command: 'npm run coverage'
                }
            };
            fs.writeFileSync(configPath, JSON.stringify(mockConfig, null, 2));

            // Always fails (never resolves)
            templateCustomizer.customizeTemplate.rejects(
                new TemplateCustomizationError('Variable not found: DEPLOY_TARGET')
            );

            const mockTemplate: InterviewTemplate = {
                name: 'variable-resolution',
                questions: []
            };
            interviewEngine.loadTemplate.resolves(mockTemplate);
            interviewEngine.runInterview.resolves({ DEPLOY_TARGET: 'aws' });
            configValidator.validate.returns({ valid: true, errors: [] });

            await assert.rejects(
                async () => await command.runFullResolutionFlow(templatePath, outputPath, configPath),
                /maximum retries/i
            );
        });
    });

    // ==========================================================================
    // TEST SUITE 6: Performance
    // ==========================================================================

    suite('Performance', () => {
        test('should generate questions in < 100ms', () => {
            const missingVars = ['DEPLOY_TARGET', 'API_KEY', 'DATABASE_URL', 'CACHE_HOST', 'LOG_LEVEL'];

            const startTime = Date.now();
            const questions = command.generateQuestionsForVariables(missingVars);
            const duration = Date.now() - startTime;

            assert.ok(duration < 100, `Question generation took ${duration}ms (target: < 100ms)`);
            assert.strictEqual(questions.length, 5);
        });
    });
});
