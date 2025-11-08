/**
 * Phase 4 End-to-End Integration Tests
 *
 * PATTERN: Pattern-TDD-001 (85% coverage for infrastructure code)
 * COVERAGE TARGET: 85% (E2E/Infrastructure)
 * TEST STRATEGY: Full pipeline integration with real services, minimal mocking
 *
 * SCOPE:
 * - InitCommand (SELF-012) orchestration
 * - InterviewFlowCommand (SELF-011) detection + interview
 * - TemplateCustomizer (SELF-013) template customization
 * - VariableResolutionFlow (SELF-014) dynamic variable resolution
 * - ProjectConfigGenerator (SELF-002) config generation
 * - All detection services (SELF-006 through SELF-009)
 *
 * PHILOSOPHY:
 * - Use REAL services (not stubs) for true E2E testing
 * - Only mock external dependencies (VS Code UI, file system for fixtures)
 * - Test realistic scenarios (greenfield, existing projects, error cases)
 */

import * as assert from 'assert';
import * as sinon from 'sinon';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { InitCommand } from '../../src/commands/init';
import { InterviewFlowCommand } from '../../src/commands/interviewFlow';
import { VariableResolutionFlowCommand } from '../../src/commands/variableResolutionFlow';
import { TechStackDetector } from '../../src/services/TechStackDetector';
import { ToolDetector } from '../../src/services/ToolDetector';
import { WorkflowDetector } from '../../src/services/WorkflowDetector';
import { DomainDetector } from '../../src/services/DomainDetector';
import { InterviewEngine } from '../../src/services/InterviewEngine';
import { ProjectConfigGenerator } from '../../src/services/ProjectConfigGenerator';
import { ProjectConfigValidator } from '../../src/services/ProjectConfigValidator';
import { TemplateCustomizer } from '../../src/services/TemplateCustomizer';
import { VariableResolver } from '../../src/services/VariableResolver';
import { ProjectConfig } from '../../src/services/ProjectConfig';

suite('Phase 4 E2E Integration Tests', () => {
    let sandbox: sinon.SinonSandbox;
    let tempDir: string;
    let vscodeMocks: any;

    setup(() => {
        sandbox = sinon.createSandbox();
        tempDir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'lumina-e2e-'));

        // Mock VS Code UI interactions (only external dependency we mock)
        vscodeMocks = {
            showInputBox: sandbox.stub(vscode.window, 'showInputBox'),
            showQuickPick: sandbox.stub(vscode.window, 'showQuickPick')
        };
    });

    teardown(() => {
        sandbox.restore();
        // Clean up temp directory
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });

    // ==========================================================================
    // TEST SUITE 1: Greenfield Project (Empty Workspace → Full Config)
    // ==========================================================================

    suite('Greenfield Project Flow', () => {
        test('should initialize empty TypeScript project from scratch', async () => {
            // Setup: Create empty TypeScript project structure
            fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
            fs.mkdirSync(path.join(tempDir, 'test'), { recursive: true });
            fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({
                name: 'test-project',
                version: '1.0.0',
                scripts: {
                    build: 'tsc',
                    test: 'mocha'
                },
                devDependencies: {
                    'typescript': '^5.0.0',
                    'mocha': '^10.0.0'
                }
            }, null, 2));
            fs.writeFileSync(path.join(tempDir, 'tsconfig.json'), JSON.stringify({
                compilerOptions: {
                    target: 'ES2020',
                    module: 'commonjs'
                }
            }, null, 2));

            // Mock interview answers (user confirms detected values)
            vscodeMocks.showQuickPick
                .withArgs(sinon.match.array, sinon.match({ title: sinon.match(/language/i) }))
                .resolves({ label: 'typescript', description: '' });

            vscodeMocks.showQuickPick
                .withArgs(sinon.match.array, sinon.match({ title: sinon.match(/package manager/i) }))
                .resolves({ label: 'npm', description: '' });

            vscodeMocks.showQuickPick
                .withArgs(sinon.match.array, sinon.match({ title: sinon.match(/test framework/i) }))
                .resolves({ label: 'mocha', description: '' });

            vscodeMocks.showInputBox
                .withArgs(sinon.match({ prompt: sinon.match(/build command/i) }))
                .resolves('tsc');

            vscodeMocks.showQuickPick
                .withArgs(sinon.match.array, sinon.match({ title: sinon.match(/deploy/i) }))
                .resolves({ label: 'local', description: '' });

            // Create real service instances (E2E - no mocking!)
            const techStackDetector = new TechStackDetector();
            const toolDetector = new ToolDetector();
            const workflowDetector = new WorkflowDetector();
            const domainDetector = new DomainDetector();
            const interviewEngine = new InterviewEngine();
            const projectConfigGenerator = new ProjectConfigGenerator();
            const interviewFlowCommand = new InterviewFlowCommand(
                techStackDetector,
                toolDetector,
                workflowDetector,
                domainDetector,
                interviewEngine
            );
            const initCommand = new InitCommand(
                interviewFlowCommand,
                projectConfigGenerator
            );

            // Run full init flow
            const startTime = Date.now();
            const configPath = await initCommand.run(tempDir);
            const duration = Date.now() - startTime;

            // Verify: Config file created
            assert.ok(fs.existsSync(configPath), 'Config file should exist');
            assert.strictEqual(configPath, path.join(tempDir, '.aetherlight', 'project-config.json'));

            // Verify: Config content
            const config = JSON.parse(fs.readFileSync(configPath, 'utf-8')) as ProjectConfig;
            assert.strictEqual(config.language.language, 'typescript');
            assert.strictEqual(config.language.package_manager, 'npm');
            assert.strictEqual(config.language.test_framework, 'mocha');
            assert.strictEqual(config.language.build_command, 'tsc');
            assert.ok(config.structure.source_directory);
            assert.ok(config.structure.test_directory);

            // Verify: Performance (<5s)
            assert.ok(duration < 5000, `Init flow took ${duration}ms (target: < 5000ms)`);
        });

        test('should initialize empty Rust project from scratch', async () => {
            // Setup: Create empty Rust project structure
            fs.writeFileSync(path.join(tempDir, 'Cargo.toml'), `
[package]
name = "test-project"
version = "0.1.0"
edition = "2021"
            `);
            fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
            fs.writeFileSync(path.join(tempDir, 'src', 'main.rs'), 'fn main() {}');

            // Mock interview answers
            vscodeMocks.showQuickPick.resolves({ label: 'rust', description: '' });
            vscodeMocks.showInputBox.resolves('cargo build');

            // Create real service instances
            const techStackDetector = new TechStackDetector();
            const toolDetector = new ToolDetector();
            const workflowDetector = new WorkflowDetector();
            const domainDetector = new DomainDetector();
            const interviewEngine = new InterviewEngine();
            const projectConfigGenerator = new ProjectConfigGenerator();
            const interviewFlowCommand = new InterviewFlowCommand(
                techStackDetector,
                toolDetector,
                workflowDetector,
                domainDetector,
                interviewEngine
            );
            const initCommand = new InitCommand(
                interviewFlowCommand,
                projectConfigGenerator
            );

            // Run full init flow
            const configPath = await initCommand.run(tempDir);

            // Verify: Rust config detected
            const config = JSON.parse(fs.readFileSync(configPath, 'utf-8')) as ProjectConfig;
            assert.strictEqual(config.language.language, 'rust');
            assert.strictEqual(config.language.package_manager, 'cargo');
            assert.ok(config.language.file_extensions.includes('.rs'));
        });
    });

    // ==========================================================================
    // TEST SUITE 2: Existing Project (Partial Config → Complete Config)
    // ==========================================================================

    suite('Existing Project Upgrade Flow', () => {
        test('should upgrade partial config without losing custom values', async () => {
            // Setup: Create project with partial config
            const aetherlightDir = path.join(tempDir, '.aetherlight');
            fs.mkdirSync(aetherlightDir, { recursive: true });

            const partialConfig: Partial<ProjectConfig> = {
                project_name: 'my-custom-project',
                language: {
                    language: 'typescript',
                    file_extensions: ['.ts'],
                    build_command: 'custom-build-script',
                    test_command: 'npm test',
                    package_manager: 'npm',
                    test_framework: 'jest'
                },
                structure: {
                    root_directory: tempDir,
                    source_directory: 'src',
                    test_directory: 'test',
                    output_directory: 'dist', // Custom output dir
                    docs_directory: 'documentation', // Custom docs dir
                    scripts_directory: 'scripts'
                }
                // Missing: testing, performance, git_workflow, etc.
            };
            fs.writeFileSync(
                path.join(aetherlightDir, 'project-config.json'),
                JSON.stringify(partialConfig, null, 2)
            );

            // Create package.json
            fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({
                name: 'my-custom-project',
                scripts: { build: 'custom-build-script' }
            }, null, 2));

            // Mock interview (skip already-configured values)
            vscodeMocks.showQuickPick.resolves({ label: 'local', description: '' });

            // Create real services
            const techStackDetector = new TechStackDetector();
            const toolDetector = new ToolDetector();
            const workflowDetector = new WorkflowDetector();
            const domainDetector = new DomainDetector();
            const interviewEngine = new InterviewEngine();
            const projectConfigGenerator = new ProjectConfigGenerator();
            const interviewFlowCommand = new InterviewFlowCommand(
                techStackDetector,
                toolDetector,
                workflowDetector,
                domainDetector,
                interviewEngine
            );
            const initCommand = new InitCommand(
                interviewFlowCommand,
                projectConfigGenerator
            );

            // Run init flow (should upgrade partial config)
            const configPath = await initCommand.run(tempDir);

            // Verify: Existing values preserved
            const config = JSON.parse(fs.readFileSync(configPath, 'utf-8')) as ProjectConfig;
            assert.strictEqual(config.project_name, 'my-custom-project'); // Preserved
            assert.strictEqual(config.language.build_command, 'custom-build-script'); // Preserved
            assert.strictEqual(config.structure.output_directory, 'dist'); // Preserved
            assert.strictEqual(config.structure.docs_directory, 'documentation'); // Preserved

            // Verify: Missing sections added
            assert.ok(config.testing); // Added
            assert.ok(config.testing.coverage_infrastructure); // Added
        });
    });

    // ==========================================================================
    // TEST SUITE 3: Template Customization Integration
    // ==========================================================================

    suite('Template Customization Flow', () => {
        test('should customize templates after config generation', async () => {
            // Setup: Create project + template
            fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
            fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({
                name: 'test-project',
                scripts: { build: 'npm run build', test: 'npm test' }
            }, null, 2));

            const aetherlightDir = path.join(tempDir, '.aetherlight');
            const templatesDir = path.join(aetherlightDir, 'templates');
            fs.mkdirSync(templatesDir, { recursive: true });

            // Create test template
            const templateContent = `# {{PROJECT_NAME}}

Build Command: {{BUILD_COMMAND}}
Test Command: {{TEST_COMMAND}}
Language: {{LANGUAGE}}
`;
            fs.writeFileSync(path.join(templatesDir, 'README.md.template'), templateContent);

            // Mock interview
            vscodeMocks.showQuickPick.resolves({ label: 'typescript', description: '' });
            vscodeMocks.showInputBox.resolves('npm run build');

            // Create real services
            const techStackDetector = new TechStackDetector();
            const toolDetector = new ToolDetector();
            const workflowDetector = new WorkflowDetector();
            const domainDetector = new DomainDetector();
            const interviewEngine = new InterviewEngine();
            const projectConfigGenerator = new ProjectConfigGenerator();
            const interviewFlowCommand = new InterviewFlowCommand(
                techStackDetector,
                toolDetector,
                workflowDetector,
                domainDetector,
                interviewEngine
            );
            const initCommand = new InitCommand(
                interviewFlowCommand,
                projectConfigGenerator
            );

            // Run init flow
            const configPath = await initCommand.run(tempDir);

            // Load config
            const config = JSON.parse(fs.readFileSync(configPath, 'utf-8')) as ProjectConfig;

            // Now test template customization
            const variableResolver = new VariableResolver();
            const templateCustomizer = new TemplateCustomizer(variableResolver);

            const outputPath = path.join(tempDir, 'README.md');
            await templateCustomizer.customizeTemplate(
                path.join(templatesDir, 'README.md.template'),
                outputPath,
                config
            );

            // Verify: Template customized
            assert.ok(fs.existsSync(outputPath));
            const customized = fs.readFileSync(outputPath, 'utf-8');
            assert.ok(customized.includes('# test-project')); // {{PROJECT_NAME}} replaced
            assert.ok(customized.includes('Build Command: npm run build')); // {{BUILD_COMMAND}} replaced
            assert.ok(customized.includes('Language: typescript')); // {{LANGUAGE}} replaced
            assert.ok(!customized.includes('{{')); // No unresolved variables
        });
    });

    // ==========================================================================
    // TEST SUITE 4: Variable Resolution Integration
    // ==========================================================================

    suite('Variable Resolution Flow', () => {
        test('should trigger dynamic interview for missing template variables', async () => {
            // Setup: Create config + template with missing variable
            const aetherlightDir = path.join(tempDir, '.aetherlight');
            fs.mkdirSync(aetherlightDir, { recursive: true });

            const config: ProjectConfig = {
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
            const configPath = path.join(aetherlightDir, 'project-config.json');
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

            // Create template with missing variable (DEPLOY_TARGET not in config)
            const templatesDir = path.join(aetherlightDir, 'templates');
            fs.mkdirSync(templatesDir, { recursive: true });
            const templateContent = `Project: {{PROJECT_NAME}}
Deploy to: {{DEPLOY_TARGET}}
`;
            const templatePath = path.join(templatesDir, 'deploy.md.template');
            fs.writeFileSync(templatePath, templateContent);

            // Mock variable resolution interview (user provides DEPLOY_TARGET)
            vscodeMocks.showQuickPick
                .withArgs(sinon.match.array, sinon.match({ title: sinon.match(/deploy/i) }))
                .resolves({ label: 'aws', description: '' });

            // Create real services
            const variableResolver = new VariableResolver();
            const templateCustomizer = new TemplateCustomizer(variableResolver);
            const interviewEngine = new InterviewEngine();
            const configValidator = new ProjectConfigValidator();
            const variableResolutionFlow = new VariableResolutionFlowCommand(
                templateCustomizer,
                variableResolver,
                interviewEngine,
                configValidator
            );

            // Run variable resolution flow
            const outputPath = path.join(tempDir, 'deploy.md');
            const result = await variableResolutionFlow.runFullResolutionFlow(
                templatePath,
                outputPath,
                configPath
            );

            // Verify: Resolution succeeded
            assert.ok(result.success);
            assert.strictEqual(result.resolvedVariables.length, 1);
            assert.strictEqual(result.resolvedVariables[0], 'DEPLOY_TARGET');

            // Verify: Config updated
            const updatedConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
            assert.ok(updatedConfig.deployment || updatedConfig.custom);

            // Verify: Template customized
            assert.ok(fs.existsSync(outputPath));
            const customized = fs.readFileSync(outputPath, 'utf-8');
            assert.ok(customized.includes('Deploy to: aws'));
        });

        test('should handle multiple missing variables in sequence', async () => {
            // Setup: Config + template with TWO missing variables
            const aetherlightDir = path.join(tempDir, '.aetherlight');
            fs.mkdirSync(aetherlightDir, { recursive: true });

            const config: ProjectConfig = {
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
            const configPath = path.join(aetherlightDir, 'project-config.json');
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

            // Template with two missing variables
            const templatesDir = path.join(aetherlightDir, 'templates');
            fs.mkdirSync(templatesDir, { recursive: true });
            const templateContent = `Project: {{PROJECT_NAME}}
API: {{API_URL}}
Database: {{DATABASE_URL}}
`;
            const templatePath = path.join(templatesDir, 'config.md.template');
            fs.writeFileSync(templatePath, templateContent);

            // Mock resolution interview (two variables)
            vscodeMocks.showInputBox
                .withArgs(sinon.match({ prompt: sinon.match(/api/i) }))
                .resolves('https://api.example.com');

            vscodeMocks.showInputBox
                .withArgs(sinon.match({ prompt: sinon.match(/database/i) }))
                .resolves('postgresql://localhost:5432/db');

            // Create real services
            const variableResolver = new VariableResolver();
            const templateCustomizer = new TemplateCustomizer(variableResolver);
            const interviewEngine = new InterviewEngine();
            const configValidator = new ProjectConfigValidator();
            const variableResolutionFlow = new VariableResolutionFlowCommand(
                templateCustomizer,
                variableResolver,
                interviewEngine,
                configValidator
            );

            // Run resolution flow
            const outputPath = path.join(tempDir, 'config.md');
            const result = await variableResolutionFlow.runFullResolutionFlow(
                templatePath,
                outputPath,
                configPath
            );

            // Verify: Both variables resolved
            assert.ok(result.success);
            assert.ok(result.resolvedVariables.length >= 2);
            assert.ok(result.resolvedVariables.includes('API_URL'));
            assert.ok(result.resolvedVariables.includes('DATABASE_URL'));
        });
    });

    // ==========================================================================
    // TEST SUITE 5: Error Handling
    // ==========================================================================

    suite('Error Cases', () => {
        test('should handle interview cancellation gracefully', async () => {
            // Setup: Empty project
            fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
            fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({
                name: 'test-project'
            }, null, 2));

            // Mock interview cancellation (user presses Escape)
            vscodeMocks.showQuickPick.resolves(undefined); // Cancelled

            // Create real services
            const techStackDetector = new TechStackDetector();
            const toolDetector = new ToolDetector();
            const workflowDetector = new WorkflowDetector();
            const domainDetector = new DomainDetector();
            const interviewEngine = new InterviewEngine();
            const projectConfigGenerator = new ProjectConfigGenerator();
            const interviewFlowCommand = new InterviewFlowCommand(
                techStackDetector,
                toolDetector,
                workflowDetector,
                domainDetector,
                interviewEngine
            );
            const initCommand = new InitCommand(
                interviewFlowCommand,
                projectConfigGenerator
            );

            // Run init flow (should throw on cancellation)
            await assert.rejects(
                async () => await initCommand.run(tempDir),
                /cancelled/i
            );

            // Verify: No config file created
            const configPath = path.join(tempDir, '.aetherlight', 'project-config.json');
            assert.ok(!fs.existsSync(configPath));
        });

        test('should handle invalid project structure gracefully', async () => {
            // Setup: Invalid project (no identifiable structure)
            // Empty directory with no files

            // Mock interview
            vscodeMocks.showQuickPick.resolves({ label: 'typescript', description: '' });
            vscodeMocks.showInputBox.resolves('npm run build');

            // Create real services
            const techStackDetector = new TechStackDetector();
            const toolDetector = new ToolDetector();
            const workflowDetector = new WorkflowDetector();
            const domainDetector = new DomainDetector();
            const interviewEngine = new InterviewEngine();
            const projectConfigGenerator = new ProjectConfigGenerator();
            const interviewFlowCommand = new InterviewFlowCommand(
                techStackDetector,
                toolDetector,
                workflowDetector,
                domainDetector,
                interviewEngine
            );
            const initCommand = new InitCommand(
                interviewFlowCommand,
                projectConfigGenerator
            );

            // Run init flow (should still work, detection returns low confidence)
            const configPath = await initCommand.run(tempDir);

            // Verify: Config created with user-provided values
            assert.ok(fs.existsSync(configPath));
            const config = JSON.parse(fs.readFileSync(configPath, 'utf-8')) as ProjectConfig;
            assert.ok(config.language); // Created from interview answers
        });
    });

    // ==========================================================================
    // TEST SUITE 6: Performance Benchmarks
    // ==========================================================================

    suite('Performance Benchmarks', () => {
        test('should complete greenfield init in < 5 seconds', async () => {
            // Setup: TypeScript project
            fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
            fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({
                name: 'perf-test',
                scripts: { build: 'tsc', test: 'jest' }
            }, null, 2));
            fs.writeFileSync(path.join(tempDir, 'tsconfig.json'), '{}');

            // Mock interview (instant responses)
            vscodeMocks.showQuickPick.resolves({ label: 'typescript', description: '' });
            vscodeMocks.showInputBox.resolves('tsc');

            // Create real services
            const techStackDetector = new TechStackDetector();
            const toolDetector = new ToolDetector();
            const workflowDetector = new WorkflowDetector();
            const domainDetector = new DomainDetector();
            const interviewEngine = new InterviewEngine();
            const projectConfigGenerator = new ProjectConfigGenerator();
            const interviewFlowCommand = new InterviewFlowCommand(
                techStackDetector,
                toolDetector,
                workflowDetector,
                domainDetector,
                interviewEngine
            );
            const initCommand = new InitCommand(
                interviewFlowCommand,
                projectConfigGenerator
            );

            // Benchmark: Full init flow
            const startTime = Date.now();
            await initCommand.run(tempDir);
            const duration = Date.now() - startTime;

            assert.ok(duration < 5000, `Init flow took ${duration}ms (target: < 5000ms)`);
        });

        test('should complete variable resolution in < 1 second', async () => {
            // Setup: Config + template
            const aetherlightDir = path.join(tempDir, '.aetherlight');
            fs.mkdirSync(aetherlightDir, { recursive: true });

            const config: ProjectConfig = {
                project_name: 'perf-test',
                language: {
                    language: 'typescript',
                    file_extensions: ['.ts'],
                    build_command: 'tsc',
                    test_command: 'jest',
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
            fs.writeFileSync(
                path.join(aetherlightDir, 'project-config.json'),
                JSON.stringify(config, null, 2)
            );

            // Template with missing variable
            const templatesDir = path.join(aetherlightDir, 'templates');
            fs.mkdirSync(templatesDir, { recursive: true });
            fs.writeFileSync(
                path.join(templatesDir, 'test.template'),
                'Deploy: {{DEPLOY_TARGET}}'
            );

            // Mock resolution (instant)
            vscodeMocks.showQuickPick.resolves({ label: 'aws', description: '' });

            // Create real services
            const variableResolver = new VariableResolver();
            const templateCustomizer = new TemplateCustomizer(variableResolver);
            const interviewEngine = new InterviewEngine();
            const configValidator = new ProjectConfigValidator();
            const variableResolutionFlow = new VariableResolutionFlowCommand(
                templateCustomizer,
                variableResolver,
                interviewEngine,
                configValidator
            );

            // Benchmark: Variable resolution flow
            const startTime = Date.now();
            await variableResolutionFlow.runFullResolutionFlow(
                path.join(templatesDir, 'test.template'),
                path.join(tempDir, 'test.md'),
                path.join(aetherlightDir, 'project-config.json')
            );
            const duration = Date.now() - startTime;

            assert.ok(duration < 1000, `Variable resolution took ${duration}ms (target: < 1000ms)`);
        });
    });
});
