import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import { ConfigGenerator } from '../../src/services/ConfigGenerator';

/**
 * PROTECT-000E: ConfigGenerator Tests (TDD RED Phase)
 *
 * DESIGN DECISION: Test config generation and auto-detection before implementation
 * WHY: TDD ensures correct config generation from the start
 *
 * Test Coverage: 8 tests for config generator
 * Expected: ALL TESTS FAIL until implementation exists
 */

suite('ConfigGenerator Tests', () => {
    let configGenerator: ConfigGenerator;
    let mockWorkspaceRoot: string;

    setup(() => {
        // Use test fixtures directory as mock workspace
        mockWorkspaceRoot = path.join(__dirname, '..', 'fixtures', 'mock-workspace');
        configGenerator = new ConfigGenerator(mockWorkspaceRoot);
    });

    test('detectProjectType() identifies VS Code extension', async () => {
        // Mock package.json with VS Code extension markers
        const mockPackageJson = {
            name: 'test-extension',
            version: '1.0.0',
            engines: { vscode: '^1.80.0' },
            contributes: {}
        };

        const projectType = await configGenerator.detectProjectType(mockPackageJson);

        assert.strictEqual(projectType, 'vscode-extension', 'Should detect VS Code extension');
    });

    test('detectProjectType() identifies web app', async () => {
        const mockPackageJson = {
            name: 'web-app',
            version: '1.0.0',
            dependencies: {
                react: '^18.0.0',
                'react-dom': '^18.0.0'
            }
        };

        const projectType = await configGenerator.detectProjectType(mockPackageJson);

        assert.strictEqual(projectType, 'web-app', 'Should detect web app (React/Vue/etc)');
    });

    test('detectProjectType() identifies CLI tool', async () => {
        const mockPackageJson = {
            name: 'cli-tool',
            version: '1.0.0',
            bin: {
                'cli-tool': './bin/cli.js'
            }
        };

        const projectType = await configGenerator.detectProjectType(mockPackageJson);

        assert.strictEqual(projectType, 'cli-tool', 'Should detect CLI tool (has bin field)');
    });

    test('detectProjectType() identifies library', async () => {
        const mockPackageJson = {
            name: 'my-library',
            version: '1.0.0',
            main: 'dist/index.js',
            types: 'dist/index.d.ts'
        };

        const projectType = await configGenerator.detectProjectType(mockPackageJson);

        assert.strictEqual(projectType, 'library', 'Should detect library (main/types fields)');
    });

    test('detectTestingFramework() identifies mocha', async () => {
        const mockPackageJson = {
            devDependencies: {
                mocha: '^10.0.0',
                '@types/mocha': '^10.0.0'
            },
            scripts: {
                test: 'mocha'
            }
        };

        const framework = await configGenerator.detectTestingFramework(mockPackageJson, mockWorkspaceRoot);

        assert.strictEqual(framework.framework, 'mocha', 'Should detect mocha framework');
        assert.ok(framework.runner.includes('mocha'), 'Runner should include mocha command');
    });

    test('detectTestingFramework() identifies jest', async () => {
        const mockPackageJson = {
            devDependencies: {
                jest: '^29.0.0',
                '@types/jest': '^29.0.0'
            },
            scripts: {
                test: 'jest'
            }
        };

        const framework = await configGenerator.detectTestingFramework(mockPackageJson, mockWorkspaceRoot);

        assert.strictEqual(framework.framework, 'jest', 'Should detect jest framework');
        assert.ok(framework.runner.includes('jest'), 'Runner should include jest command');
    });

    test('detectFileStructure() finds standard directories', async () => {
        const structure = await configGenerator.detectFileStructure(mockWorkspaceRoot);

        assert.ok(structure.sourceDir, 'Should detect source directory');
        assert.ok(structure.testsDir, 'Should detect tests directory');
        // docsDir is optional
    });

    test('generateConfig() creates valid config with defaults', async () => {
        const config = await configGenerator.generateConfig({
            projectType: 'vscode-extension',
            framework: 'mocha',
            sourceDir: 'src',
            testsDir: 'test',
            coverageTargets: 'default',
            requireTDD: true,
            sprintDir: 'internal/sprints'
        });

        // Validate structure
        assert.ok(config.project, 'Config should have project section');
        assert.strictEqual(config.project.type, 'vscode-extension', 'Project type should match');

        assert.ok(config.structure, 'Config should have structure section');
        assert.strictEqual(config.structure.sourceDir, 'src', 'Source dir should match');

        assert.ok(config.testing, 'Config should have testing section');
        assert.strictEqual(config.testing.framework, 'mocha', 'Framework should match');

        assert.ok(config.testing.coverage, 'Config should have coverage targets');
        assert.strictEqual(config.testing.coverage.infrastructure, 90, 'Default infrastructure coverage');

        assert.ok(config.workflows, 'Config should have workflows section');
        assert.ok(config.git, 'Config should have git section');
    });

    /**
     * PROTECT-000E: Integration Tests
     */
    suite('PROTECT-000E: Config Generation Integration', () => {
        test('Full workflow: detect + generate + validate', async () => {
            // This test simulates full config generation workflow
            const mockPackageJson = {
                name: 'test-project',
                version: '1.0.0',
                engines: { vscode: '^1.80.0' },
                devDependencies: {
                    mocha: '^10.0.0'
                },
                scripts: {
                    test: 'mocha'
                }
            };

            // Step 1: Detect project type
            const projectType = await configGenerator.detectProjectType(mockPackageJson);
            assert.strictEqual(projectType, 'vscode-extension');

            // Step 2: Detect testing framework
            const framework = await configGenerator.detectTestingFramework(mockPackageJson, mockWorkspaceRoot);
            assert.strictEqual(framework.framework, 'mocha');

            // Step 3: Detect file structure
            const structure = await configGenerator.detectFileStructure(mockWorkspaceRoot);
            assert.ok(structure.sourceDir);

            // Step 4: Generate config
            const config = await configGenerator.generateConfig({
                projectType,
                framework: framework.framework,
                sourceDir: structure.sourceDir,
                testsDir: structure.testsDir || 'test',
                coverageTargets: 'default',
                requireTDD: true,
                sprintDir: 'sprints'
            });

            // Step 5: Validate config
            assert.ok(config.project);
            assert.ok(config.structure);
            assert.ok(config.testing);
            assert.ok(config.workflows);
        });

        test('Custom coverage targets override defaults', async () => {
            const config = await configGenerator.generateConfig({
                projectType: 'web-app',
                framework: 'jest',
                sourceDir: 'src',
                testsDir: 'test',
                coverageTargets: 'custom',
                customCoverage: {
                    infrastructure: 95,
                    api: 90,
                    ui: 80
                },
                requireTDD: false,
                sprintDir: 'sprints'
            });

            assert.strictEqual(config.testing.coverage.infrastructure, 95, 'Should use custom coverage');
            assert.strictEqual(config.testing.coverage.api, 90, 'Should use custom coverage');
            assert.strictEqual(config.testing.coverage.ui, 80, 'Should use custom coverage');
        });
    });
});
