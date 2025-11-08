/**
 * Config Generation Integration Tests
 *
 * PATTERN: Pattern-TDD-001 (90% coverage for infrastructure code)
 * COVERAGE TARGET: 90% (Integration/Infrastructure)
 * TEST STRATEGY: End-to-end testing of full self-configuration pipeline
 */

import * as assert from 'assert';
import * as sinon from 'sinon';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { InitCommand } from '../../src/commands/init';
import { InterviewFlowCommand } from '../../src/commands/interviewFlow';
import { ProjectConfigGenerator, InterviewAnswers } from '../../src/services/ProjectConfigGenerator';
import { ProjectConfig } from '../../src/services/ProjectConfig';

suite('Config Generation Integration Tests', () => {
    let sandbox: sinon.SinonSandbox;
    let initCommand: InitCommand;
    let interviewFlowCommand: sinon.SinonStubbedInstance<InterviewFlowCommand>;
    let projectConfigGenerator: sinon.SinonStubbedInstance<ProjectConfigGenerator>;
    let tempDir: string;

    setup(() => {
        sandbox = sinon.createSandbox();
        tempDir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'lumina-test-'));

        // Create stubbed dependencies
        interviewFlowCommand = sandbox.createStubInstance(InterviewFlowCommand);
        projectConfigGenerator = sandbox.createStubInstance(ProjectConfigGenerator);

        initCommand = new InitCommand(
            interviewFlowCommand as any,
            projectConfigGenerator as any
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
    // TEST SUITE 1: Full Pipeline Integration
    // ==========================================================================

    suite('Full Pipeline: Detection → Interview → Config → File', () => {
        test('should run complete self-configuration flow', async () => {
            // Mock interview flow (detection + interview)
            const mockInterviewAnswers: InterviewAnswers = {
                LANGUAGE: 'typescript',
                PACKAGE_MANAGER: 'npm',
                TEST_FRAMEWORK: 'jest',
                BUILD_COMMAND: 'npm run build',
                DEPLOY_TARGET: 'aws'
            };
            interviewFlowCommand.runInterviewFlow.resolves(mockInterviewAnswers);

            // Mock config generation
            const mockConfig: ProjectConfig = {
                project_name: 'test-project',
                language: {
                    language: 'typescript',
                    file_extensions: ['.ts']
                },
                package_manager: {
                    package_manager: 'npm'
                },
                test_framework: {
                    test_framework: 'jest',
                    test_command: 'npm test'
                },
                paths: {
                    project_root: tempDir,
                    source_directory: 'src',
                    test_directory: 'test',
                    output_directory: 'out'
                },
                coverage_targets: {
                    coverage_infrastructure: 90,
                    coverage_api: 85,
                    coverage_ui: 70
                },
                build: {
                    build_command: 'npm run build'
                }
            };
            projectConfigGenerator.generate.returns(mockConfig);

            // Run full pipeline
            const configPath = await initCommand.run(tempDir);

            // Verify interview flow was called
            assert.ok(interviewFlowCommand.runInterviewFlow.calledOnce);
            const [projectRoot, templatePath] = interviewFlowCommand.runInterviewFlow.getCall(0).args;
            assert.strictEqual(projectRoot, tempDir);
            assert.ok(templatePath.includes('project-initialization.json'));

            // Verify config generation was called
            assert.ok(projectConfigGenerator.generate.calledOnce);

            // Verify config file was written
            assert.ok(fs.existsSync(configPath));
            assert.strictEqual(configPath, path.join(tempDir, '.aetherlight', 'project-config.json'));

            // Verify config content
            const writtenConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
            assert.strictEqual(writtenConfig.project_name, 'test-project');
            assert.strictEqual(writtenConfig.language.language, 'typescript');
        });

        test('should create .aetherlight directory if missing', async () => {
            // Mock interview flow
            const mockInterviewAnswers: InterviewAnswers = {
                LANGUAGE: 'rust',
                PACKAGE_MANAGER: 'cargo',
                TEST_FRAMEWORK: 'cargo-test',
                BUILD_COMMAND: 'cargo build',
                DEPLOY_TARGET: 'docker'
            };
            interviewFlowCommand.runInterviewFlow.resolves(mockInterviewAnswers);

            // Mock config generation
            const mockConfig: ProjectConfig = {
                project_name: 'rust-project',
                language: {
                    language: 'rust',
                    file_extensions: ['.rs']
                },
                package_manager: {
                    package_manager: 'cargo'
                },
                test_framework: {
                    test_framework: 'cargo-test',
                    test_command: 'cargo test'
                },
                paths: {
                    project_root: tempDir,
                    source_directory: 'src',
                    test_directory: 'tests',
                    output_directory: 'target'
                },
                coverage_targets: {
                    coverage_infrastructure: 90,
                    coverage_api: 85,
                    coverage_ui: 70
                },
                build: {
                    build_command: 'cargo build'
                }
            };
            projectConfigGenerator.generate.returns(mockConfig);

            // Verify .aetherlight doesn't exist yet
            const aetherlightDir = path.join(tempDir, '.aetherlight');
            assert.ok(!fs.existsSync(aetherlightDir));

            // Run pipeline
            const configPath = await initCommand.run(tempDir);

            // Verify .aetherlight directory was created
            assert.ok(fs.existsSync(aetherlightDir));
            assert.ok(fs.statSync(aetherlightDir).isDirectory());

            // Verify config file was written
            assert.ok(fs.existsSync(configPath));
        });

        test('should pass interview answers to config generator', async () => {
            // Mock interview flow with specific answers
            const mockInterviewAnswers: InterviewAnswers = {
                LANGUAGE: 'python',
                PACKAGE_MANAGER: 'pip',
                TEST_FRAMEWORK: 'pytest',
                BUILD_COMMAND: 'python setup.py build',
                DEPLOY_TARGET: 'heroku',
                project_name: 'my-python-app'
            };
            interviewFlowCommand.runInterviewFlow.resolves(mockInterviewAnswers);

            // Mock config generation
            const mockConfig: ProjectConfig = {
                project_name: 'my-python-app',
                language: {
                    language: 'python',
                    file_extensions: ['.py']
                },
                package_manager: {
                    package_manager: 'pip'
                },
                test_framework: {
                    test_framework: 'pytest',
                    test_command: 'pytest'
                },
                paths: {
                    project_root: tempDir,
                    source_directory: 'src',
                    test_directory: 'tests',
                    output_directory: 'dist'
                },
                coverage_targets: {
                    coverage_infrastructure: 90,
                    coverage_api: 85,
                    coverage_ui: 70
                },
                build: {
                    build_command: 'python setup.py build'
                }
            };
            projectConfigGenerator.generate.returns(mockConfig);

            // Run pipeline
            await initCommand.run(tempDir);

            // Verify config generator received correct answers
            const generateCall = projectConfigGenerator.generate.getCall(0);
            assert.ok(generateCall);

            // First arg should be detection results (from interview flow)
            // Second arg should be interview answers
            const [detection, interview] = generateCall.args;

            // Interview answers should be passed through
            assert.strictEqual(interview.LANGUAGE, 'python');
            assert.strictEqual(interview.PACKAGE_MANAGER, 'pip');
            assert.strictEqual(interview.project_name, 'my-python-app');
        });
    });

    // ==========================================================================
    // TEST SUITE 2: Interview Override Detection
    // ==========================================================================

    suite('Interview Overrides Detection', () => {
        test('should use interview answer when it overrides detection', async () => {
            // Mock interview flow returns user override
            const mockInterviewAnswers: InterviewAnswers = {
                LANGUAGE: 'rust', // User changed from detected TypeScript
                PACKAGE_MANAGER: 'cargo',
                TEST_FRAMEWORK: 'cargo-test',
                BUILD_COMMAND: 'cargo build',
                DEPLOY_TARGET: 'docker'
            };
            interviewFlowCommand.runInterviewFlow.resolves(mockInterviewAnswers);

            // Mock config generation
            const mockConfig: ProjectConfig = {
                project_name: 'test-project',
                language: {
                    language: 'rust', // Interview answer used
                    file_extensions: ['.rs']
                },
                package_manager: {
                    package_manager: 'cargo'
                },
                test_framework: {
                    test_framework: 'cargo-test',
                    test_command: 'cargo test'
                },
                paths: {
                    project_root: tempDir,
                    source_directory: 'src',
                    test_directory: 'tests',
                    output_directory: 'target'
                },
                coverage_targets: {
                    coverage_infrastructure: 90,
                    coverage_api: 85,
                    coverage_ui: 70
                },
                build: {
                    build_command: 'cargo build'
                }
            };
            projectConfigGenerator.generate.returns(mockConfig);

            // Run pipeline
            const configPath = await initCommand.run(tempDir);

            // Verify config used interview answer
            const writtenConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
            assert.strictEqual(writtenConfig.language.language, 'rust');
        });
    });

    // ==========================================================================
    // TEST SUITE 3: Error Handling
    // ==========================================================================

    suite('Error Handling', () => {
        test('should throw error if interview flow fails', async () => {
            // Mock interview flow failure
            interviewFlowCommand.runInterviewFlow.rejects(new Error('Interview cancelled by user'));

            // Run pipeline should throw
            await assert.rejects(
                async () => await initCommand.run(tempDir),
                /Interview cancelled by user/
            );
        });

        test('should throw error if config generation fails', async () => {
            // Mock interview flow success
            const mockInterviewAnswers: InterviewAnswers = {
                LANGUAGE: 'typescript',
                PACKAGE_MANAGER: 'npm'
            };
            interviewFlowCommand.runInterviewFlow.resolves(mockInterviewAnswers);

            // Mock config generation failure
            projectConfigGenerator.generate.throws(new Error('Invalid configuration: missing required field'));

            // Run pipeline should throw
            await assert.rejects(
                async () => await initCommand.run(tempDir),
                /Invalid configuration/
            );
        });

        test('should handle file write errors gracefully', async () => {
            // Mock interview flow
            const mockInterviewAnswers: InterviewAnswers = {
                LANGUAGE: 'typescript',
                PACKAGE_MANAGER: 'npm'
            };
            interviewFlowCommand.runInterviewFlow.resolves(mockInterviewAnswers);

            // Mock config generation
            const mockConfig: ProjectConfig = {
                project_name: 'test-project',
                language: {
                    language: 'typescript',
                    file_extensions: ['.ts']
                },
                package_manager: {
                    package_manager: 'npm'
                },
                test_framework: {
                    test_framework: 'jest',
                    test_command: 'npm test'
                },
                paths: {
                    project_root: tempDir,
                    source_directory: 'src',
                    test_directory: 'test',
                    output_directory: 'out'
                },
                coverage_targets: {
                    coverage_infrastructure: 90,
                    coverage_api: 85,
                    coverage_ui: 70
                },
                build: {
                    build_command: 'npm run build'
                }
            };
            projectConfigGenerator.generate.returns(mockConfig);

            // Create read-only .aetherlight directory to simulate write error
            const aetherlightDir = path.join(tempDir, '.aetherlight');
            fs.mkdirSync(aetherlightDir);
            fs.chmodSync(aetherlightDir, 0o444); // Read-only

            // Run pipeline should throw
            try {
                await assert.rejects(
                    async () => await initCommand.run(tempDir),
                    /Failed to write config file/
                );
            } finally {
                // Clean up: restore permissions
                fs.chmodSync(aetherlightDir, 0o755);
            }
        });
    });

    // ==========================================================================
    // TEST SUITE 4: Performance
    // ==========================================================================

    suite('Performance', () => {
        test('should complete full flow in < 5 seconds (excluding user interaction)', async () => {
            // Mock interview flow (instant - no user interaction)
            const mockInterviewAnswers: InterviewAnswers = {
                LANGUAGE: 'typescript',
                PACKAGE_MANAGER: 'npm',
                TEST_FRAMEWORK: 'jest',
                BUILD_COMMAND: 'npm run build',
                DEPLOY_TARGET: 'aws'
            };
            interviewFlowCommand.runInterviewFlow.resolves(mockInterviewAnswers);

            // Mock config generation
            const mockConfig: ProjectConfig = {
                project_name: 'test-project',
                language: {
                    language: 'typescript',
                    file_extensions: ['.ts']
                },
                package_manager: {
                    package_manager: 'npm'
                },
                test_framework: {
                    test_framework: 'jest',
                    test_command: 'npm test'
                },
                paths: {
                    project_root: tempDir,
                    source_directory: 'src',
                    test_directory: 'test',
                    output_directory: 'out'
                },
                coverage_targets: {
                    coverage_infrastructure: 90,
                    coverage_api: 85,
                    coverage_ui: 70
                },
                build: {
                    build_command: 'npm run build'
                }
            };
            projectConfigGenerator.generate.returns(mockConfig);

            // Measure performance
            const startTime = Date.now();
            await initCommand.run(tempDir);
            const duration = Date.now() - startTime;

            assert.ok(duration < 5000, `Init flow took ${duration}ms (target: < 5000ms)`);
        });
    });

    // ==========================================================================
    // TEST SUITE 5: Config File Content Validation
    // ==========================================================================

    suite('Config File Content', () => {
        test('should write valid JSON config file', async () => {
            // Mock interview flow
            const mockInterviewAnswers: InterviewAnswers = {
                LANGUAGE: 'typescript',
                PACKAGE_MANAGER: 'npm'
            };
            interviewFlowCommand.runInterviewFlow.resolves(mockInterviewAnswers);

            // Mock config generation
            const mockConfig: ProjectConfig = {
                project_name: 'test-project',
                language: {
                    language: 'typescript',
                    file_extensions: ['.ts', '.tsx']
                },
                package_manager: {
                    package_manager: 'npm'
                },
                test_framework: {
                    test_framework: 'jest',
                    test_command: 'npm test'
                },
                paths: {
                    project_root: tempDir,
                    source_directory: 'src',
                    test_directory: 'test',
                    output_directory: 'out'
                },
                coverage_targets: {
                    coverage_infrastructure: 90,
                    coverage_api: 85,
                    coverage_ui: 70
                },
                build: {
                    build_command: 'npm run build'
                }
            };
            projectConfigGenerator.generate.returns(mockConfig);

            // Run pipeline
            const configPath = await initCommand.run(tempDir);

            // Read and parse config file
            const fileContent = fs.readFileSync(configPath, 'utf-8');
            const config = JSON.parse(fileContent); // Should not throw

            // Verify structure
            assert.ok(config.project_name);
            assert.ok(config.language);
            assert.ok(config.package_manager);
            assert.ok(config.paths);
            assert.ok(config.coverage_targets);
        });

        test('should write config with correct indentation (2 spaces)', async () => {
            // Mock interview flow
            const mockInterviewAnswers: InterviewAnswers = {
                LANGUAGE: 'typescript',
                PACKAGE_MANAGER: 'npm'
            };
            interviewFlowCommand.runInterviewFlow.resolves(mockInterviewAnswers);

            // Mock config generation
            const mockConfig: ProjectConfig = {
                project_name: 'test-project',
                language: {
                    language: 'typescript',
                    file_extensions: ['.ts']
                },
                package_manager: {
                    package_manager: 'npm'
                },
                test_framework: {
                    test_framework: 'jest',
                    test_command: 'npm test'
                },
                paths: {
                    project_root: tempDir,
                    source_directory: 'src',
                    test_directory: 'test',
                    output_directory: 'out'
                },
                coverage_targets: {
                    coverage_infrastructure: 90,
                    coverage_api: 85,
                    coverage_ui: 70
                },
                build: {
                    build_command: 'npm run build'
                }
            };
            projectConfigGenerator.generate.returns(mockConfig);

            // Run pipeline
            const configPath = await initCommand.run(tempDir);

            // Read file content
            const fileContent = fs.readFileSync(configPath, 'utf-8');

            // Verify indentation (2 spaces)
            assert.ok(fileContent.includes('  "project_name"'));
            assert.ok(fileContent.includes('  "language"'));
        });
    });
});
