/**
 * ValidationConfigGenerator Tests
 *
 * TDD: These tests are written FIRST (RED phase)
 * Then implementation (GREEN phase)
 *
 * DESIGN DECISION: Test auto-detection and config generation with realistic project structures
 * WHY: Ensure validator config is accurate, flexible, and user-friendly
 *
 * REASONING CHAIN:
 * 1. Detect project type (VS Code extension, library, monorepo)
 * 2. Detect package structure (single, monorepo, packages/apps)
 * 3. Detect potential issues (native deps, large bundles, missing tests)
 * 4. Generate intelligent defaults based on detection
 * 5. Allow user confirmation before saving
 * 6. Result: Accurate, configurable validation config
 *
 * Pattern: Pattern-ANALYZER-001 (Auto-Configuration)
 * Related: VAL-002, VAL-007, ANALYZER-001
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ValidationConfigGenerator } from './ValidationConfigGenerator';

describe('ValidationConfigGenerator', () => {
    let tempDir: string;
    let generator: ValidationConfigGenerator;

    beforeEach(() => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'validation-config-test-'));
        generator = new ValidationConfigGenerator();
    });

    afterEach(() => {
        // Clean up temp directory
        fs.rmSync(tempDir, { recursive: true, force: true });
    });

    describe('Project Type Detection', () => {
        test('should detect VS Code extension', () => {
            // Arrange: Create package.json with vscode engine
            const packageJson = {
                name: 'test-extension',
                version: '1.0.0',
                engines: {
                    vscode: '^1.80.0'
                },
                contributes: {
                    commands: []
                }
            };
            fs.writeFileSync(
                path.join(tempDir, 'package.json'),
                JSON.stringify(packageJson, null, 2)
            );

            // Act
            const projectType = generator.detectProjectType(tempDir);

            // Assert
            expect(projectType).toBe('vscode-extension');
        });

        test('should detect monorepo with multiple packages', () => {
            // Arrange: Create packages directory with multiple packages
            fs.mkdirSync(path.join(tempDir, 'packages', 'pkg1'), { recursive: true });
            fs.mkdirSync(path.join(tempDir, 'packages', 'pkg2'), { recursive: true });
            fs.writeFileSync(
                path.join(tempDir, 'packages', 'pkg1', 'package.json'),
                JSON.stringify({ name: 'pkg1', version: '1.0.0' }, null, 2)
            );
            fs.writeFileSync(
                path.join(tempDir, 'packages', 'pkg2', 'package.json'),
                JSON.stringify({ name: 'pkg2', version: '1.0.0' }, null, 2)
            );

            // Act
            const projectType = generator.detectProjectType(tempDir);

            // Assert
            expect(projectType).toBe('monorepo');
        });

        test('should detect library project', () => {
            // Arrange: Create package.json with library-like structure
            const packageJson = {
                name: 'test-library',
                version: '1.0.0',
                main: 'dist/index.js',
                types: 'dist/index.d.ts'
            };
            fs.writeFileSync(
                path.join(tempDir, 'package.json'),
                JSON.stringify(packageJson, null, 2)
            );

            // Act
            const projectType = generator.detectProjectType(tempDir);

            // Assert
            expect(projectType).toBe('library');
        });

        test('should detect application project', () => {
            // Arrange: Create package.json with app-like structure
            const packageJson = {
                name: 'test-app',
                version: '1.0.0',
                scripts: {
                    start: 'node index.js'
                }
            };
            fs.writeFileSync(
                path.join(tempDir, 'package.json'),
                JSON.stringify(packageJson, null, 2)
            );

            // Act
            const projectType = generator.detectProjectType(tempDir);

            // Assert
            expect(projectType).toBe('application');
        });
    });

    describe('Package Structure Detection', () => {
        test('should detect monorepo packages in packages/ directory', () => {
            // Arrange
            fs.mkdirSync(path.join(tempDir, 'packages', 'analyzer'), { recursive: true });
            fs.mkdirSync(path.join(tempDir, 'packages', 'sdk'), { recursive: true });
            fs.writeFileSync(
                path.join(tempDir, 'packages', 'analyzer', 'package.json'),
                JSON.stringify({ name: 'aetherlight-analyzer', version: '0.15.34' }, null, 2)
            );
            fs.writeFileSync(
                path.join(tempDir, 'packages', 'sdk', 'package.json'),
                JSON.stringify({ name: 'aetherlight-sdk', version: '0.15.34' }, null, 2)
            );

            // Act
            const structure = generator.detectPackageStructure(tempDir);

            // Assert
            expect(structure.type).toBe('monorepo');
            expect(structure.packages).toHaveLength(2);
            expect(structure.packages).toContain('packages/analyzer');
            expect(structure.packages).toContain('packages/sdk');
        });

        test('should detect single package project', () => {
            // Arrange
            fs.writeFileSync(
                path.join(tempDir, 'package.json'),
                JSON.stringify({ name: 'single-package', version: '1.0.0' }, null, 2)
            );

            // Act
            const structure = generator.detectPackageStructure(tempDir);

            // Assert
            expect(structure.type).toBe('single');
            expect(structure.packages).toHaveLength(1);
            expect(structure.packages[0]).toBe('.');
        });

        test('should detect apps/ directory in monorepo', () => {
            // Arrange
            fs.mkdirSync(path.join(tempDir, 'apps', 'web'), { recursive: true });
            fs.mkdirSync(path.join(tempDir, 'apps', 'desktop'), { recursive: true });
            fs.writeFileSync(
                path.join(tempDir, 'apps', 'web', 'package.json'),
                JSON.stringify({ name: 'web-app', version: '1.0.0' }, null, 2)
            );
            fs.writeFileSync(
                path.join(tempDir, 'apps', 'desktop', 'package.json'),
                JSON.stringify({ name: 'desktop-app', version: '1.0.0' }, null, 2)
            );

            // Act
            const structure = generator.detectPackageStructure(tempDir);

            // Assert
            expect(structure.type).toBe('monorepo');
            expect(structure.packages).toHaveLength(2);
            expect(structure.packages).toContain('apps/web');
            expect(structure.packages).toContain('apps/desktop');
        });
    });

    describe('Potential Issues Detection', () => {
        test('should detect native dependencies', () => {
            // Arrange: Create package.json with native dependency
            const packageJson = {
                name: 'test-project',
                version: '1.0.0',
                dependencies: {
                    '@nut-tree-fork/nut-js': '^3.0.0',
                    'robotjs': '^0.6.0'
                }
            };
            fs.writeFileSync(
                path.join(tempDir, 'package.json'),
                JSON.stringify(packageJson, null, 2)
            );

            // Act
            const issues = generator.detectPotentialIssues(tempDir);

            // Assert
            const nativeDepIssue = issues.find((i: any) => i.type === 'native_dependencies');
            expect(nativeDepIssue).toBeDefined();
            expect(nativeDepIssue?.packages).toContain('@nut-tree-fork/nut-js');
            expect(nativeDepIssue?.packages).toContain('robotjs');
            expect(nativeDepIssue?.severity).toBe('critical');
        });

        test('should detect runtime npm dependencies in VS Code extension', () => {
            // Arrange: Create VS Code extension with runtime npm deps
            const packageJson = {
                name: 'test-extension',
                version: '1.0.0',
                engines: {
                    vscode: '^1.80.0'
                },
                dependencies: {
                    'glob': '^11.0.0',
                    'lodash': '^4.17.21'
                }
            };
            fs.writeFileSync(
                path.join(tempDir, 'package.json'),
                JSON.stringify(packageJson, null, 2)
            );

            // Act
            const issues = generator.detectPotentialIssues(tempDir);

            // Assert
            const runtimeDepIssue = issues.find((i: any) => i.type === 'runtime_npm_dependencies');
            expect(runtimeDepIssue).toBeDefined();
            expect(runtimeDepIssue?.packages).toContain('glob');
            expect(runtimeDepIssue?.packages).toContain('lodash');
            expect(runtimeDepIssue?.severity).toBe('critical');
        });

        test('should detect large bundle size', () => {
            // Arrange: Create package.json with many dependencies
            const dependencies: Record<string, string> = {};
            for (let i = 0; i < 50; i++) {
                dependencies[`package-${i}`] = '^1.0.0';
            }
            const packageJson = {
                name: 'test-project',
                version: '1.0.0',
                dependencies
            };
            fs.writeFileSync(
                path.join(tempDir, 'package.json'),
                JSON.stringify(packageJson, null, 2)
            );

            // Act
            const issues = generator.detectPotentialIssues(tempDir);

            // Assert
            const bundleSizeIssue = issues.find((i: any) => i.type === 'large_bundle');
            expect(bundleSizeIssue).toBeDefined();
            expect(bundleSizeIssue?.severity).toBe('warning');
        });

        test('should detect missing test directory', () => {
            // Arrange: Create project without tests
            fs.writeFileSync(
                path.join(tempDir, 'package.json'),
                JSON.stringify({ name: 'test-project', version: '1.0.0' }, null, 2)
            );

            // Act
            const issues = generator.detectPotentialIssues(tempDir);

            // Assert
            const missingTestsIssue = issues.find((i: any) => i.type === 'missing_tests');
            expect(missingTestsIssue).toBeDefined();
            expect(missingTestsIssue?.severity).toBe('warning');
        });

        test('should detect version mismatch in monorepo', () => {
            // Arrange: Create monorepo with mismatched versions
            fs.mkdirSync(path.join(tempDir, 'packages', 'pkg1'), { recursive: true });
            fs.mkdirSync(path.join(tempDir, 'packages', 'pkg2'), { recursive: true });
            fs.writeFileSync(
                path.join(tempDir, 'packages', 'pkg1', 'package.json'),
                JSON.stringify({ name: 'pkg1', version: '1.0.0' }, null, 2)
            );
            fs.writeFileSync(
                path.join(tempDir, 'packages', 'pkg2', 'package.json'),
                JSON.stringify({ name: 'pkg2', version: '1.0.1' }, null, 2)
            );

            // Act
            const issues = generator.detectPotentialIssues(tempDir);

            // Assert
            const versionMismatchIssue = issues.find((i: any) => i.type === 'version_mismatch');
            expect(versionMismatchIssue).toBeDefined();
            expect(versionMismatchIssue?.severity).toBe('critical');
        });
    });

    describe('Config Generation', () => {
        test('should generate config for VS Code extension', () => {
            // Arrange: Create VS Code extension structure
            const packageJson = {
                name: 'test-extension',
                version: '1.0.0',
                engines: {
                    vscode: '^1.80.0'
                },
                dependencies: {
                    '@iarna/toml': '^2.2.5',
                    'node-fetch': '^3.3.0'
                }
            };
            fs.writeFileSync(
                path.join(tempDir, 'package.json'),
                JSON.stringify(packageJson, null, 2)
            );

            // Act
            const config = generator.generateConfig(tempDir);

            // Assert
            expect(config.validation.enabled).toBe(true);
            expect(config.validation.dependencies.allow_native_dependencies).toBe(false);
            expect(config.validation.dependencies.allow_runtime_npm_dependencies).toBe(false);
            expect(config.validation.dependencies.allowed_exceptions).toContain('@iarna/toml');
            expect(config.validation.dependencies.allowed_exceptions).toContain('node-fetch');
        });

        test('should generate config for monorepo', () => {
            // Arrange: Create monorepo structure
            fs.mkdirSync(path.join(tempDir, 'packages', 'analyzer'), { recursive: true });
            fs.mkdirSync(path.join(tempDir, 'packages', 'sdk'), { recursive: true });
            fs.writeFileSync(
                path.join(tempDir, 'packages', 'analyzer', 'package.json'),
                JSON.stringify({ name: 'aetherlight-analyzer', version: '0.15.34' }, null, 2)
            );
            fs.writeFileSync(
                path.join(tempDir, 'packages', 'sdk', 'package.json'),
                JSON.stringify({ name: 'aetherlight-sdk', version: '0.15.34' }, null, 2)
            );

            // Act
            const config = generator.generateConfig(tempDir);

            // Assert
            expect(config.validation.version_sync).toBeDefined();
            expect(config.validation.version_sync?.mode).toBe('auto-discover');
            expect(config.validation.version_sync?.packages).toHaveLength(2);
            expect(config.validation.version_sync?.packages).toContain('packages/analyzer');
            expect(config.validation.version_sync?.packages).toContain('packages/sdk');
            expect(config.validation.version_sync?.require_exact_match).toBe(true);
        });

        test('should generate config with test coverage requirements', () => {
            // Arrange: Create project structure
            fs.writeFileSync(
                path.join(tempDir, 'package.json'),
                JSON.stringify({ name: 'test-project', version: '1.0.0' }, null, 2)
            );

            // Act
            const config = generator.generateConfig(tempDir);

            // Assert
            expect(config.validation.test_coverage).toBeDefined();
            expect(config.validation.test_coverage?.infrastructure_min).toBe(0.90);
            expect(config.validation.test_coverage?.api_min).toBe(0.85);
            expect(config.validation.test_coverage?.ui_min).toBe(0.70);
        });

        test('should generate config with package size limits', () => {
            // Arrange: Create VS Code extension
            const packageJson = {
                name: 'test-extension',
                version: '1.0.0',
                engines: {
                    vscode: '^1.80.0'
                }
            };
            fs.writeFileSync(
                path.join(tempDir, 'package.json'),
                JSON.stringify(packageJson, null, 2)
            );

            // Act
            const config = generator.generateConfig(tempDir);

            // Assert
            expect(config.validation.package_size).toBeDefined();
            expect(config.validation.package_size?.max_size_mb).toBe(5);
            expect(config.validation.package_size?.warn_size_mb).toBe(2);
        });
    });

    describe('Config File Operations', () => {
        test('should save config to .aetherlight/validation.toml', async () => {
            // Arrange
            const config = {
                validation: {
                    enabled: true,
                    dependencies: {
                        allow_native_dependencies: false,
                        allow_runtime_npm_dependencies: false,
                        allowed_exceptions: ['@iarna/toml']
                    }
                }
            };

            // Act
            await generator.saveConfig(tempDir, config);

            // Assert
            const configPath = path.join(tempDir, '.aetherlight', 'validation.toml');
            expect(fs.existsSync(configPath)).toBe(true);
            const savedContent = fs.readFileSync(configPath, 'utf-8');
            expect(savedContent).toContain('[validation]');
            expect(savedContent).toContain('enabled = true');
            expect(savedContent).toContain('[validation.dependencies]');
        });

        test('should create .aetherlight directory if missing', async () => {
            // Arrange
            const config = {
                validation: {
                    enabled: true,
                    dependencies: {
                        allow_native_dependencies: false,
                        allow_runtime_npm_dependencies: false,
                        allowed_exceptions: []
                    }
                }
            };

            // Act
            await generator.saveConfig(tempDir, config);

            // Assert
            const aetherlightDir = path.join(tempDir, '.aetherlight');
            expect(fs.existsSync(aetherlightDir)).toBe(true);
        });

        test('should not overwrite existing config without confirmation', async () => {
            // Arrange: Create existing config
            const aetherlightDir = path.join(tempDir, '.aetherlight');
            fs.mkdirSync(aetherlightDir, { recursive: true });
            const configPath = path.join(aetherlightDir, 'validation.toml');
            fs.writeFileSync(configPath, '# Existing config\n[validation]\nenabled = false');

            const newConfig = {
                validation: {
                    enabled: true,
                    dependencies: {
                        allow_native_dependencies: false,
                        allow_runtime_npm_dependencies: false,
                        allowed_exceptions: []
                    }
                }
            };

            // Act & Assert
            await expect(
                generator.saveConfig(tempDir, newConfig, { force: false })
            ).rejects.toThrow('Config already exists');
        });

        test('should overwrite existing config with force flag', async () => {
            // Arrange: Create existing config
            const aetherlightDir = path.join(tempDir, '.aetherlight');
            fs.mkdirSync(aetherlightDir, { recursive: true });
            const configPath = path.join(aetherlightDir, 'validation.toml');
            fs.writeFileSync(configPath, '# Existing config\n[validation]\nenabled = false');

            const newConfig = {
                validation: {
                    enabled: true,
                    dependencies: {
                        allow_native_dependencies: false,
                        allow_runtime_npm_dependencies: false,
                        allowed_exceptions: []
                    }
                }
            };

            // Act
            await generator.saveConfig(tempDir, newConfig, { force: true });

            // Assert
            const savedContent = fs.readFileSync(configPath, 'utf-8');
            expect(savedContent).toContain('enabled = true');
        });
    });

    describe('Full Workflow Integration', () => {
        test('should analyze and generate config end-to-end', async () => {
            // Arrange: Create realistic VS Code extension
            const packageJson = {
                name: 'vscode-lumina',
                version: '0.15.34',
                engines: {
                    vscode: '^1.80.0'
                },
                dependencies: {
                    '@iarna/toml': '^2.2.5',
                    'node-fetch': '^3.3.0',
                    'ws': '^8.14.2',
                    'form-data': '^4.0.0'
                }
            };
            fs.writeFileSync(
                path.join(tempDir, 'package.json'),
                JSON.stringify(packageJson, null, 2)
            );

            fs.mkdirSync(path.join(tempDir, 'packages', 'analyzer'), { recursive: true });
            fs.mkdirSync(path.join(tempDir, 'packages', 'sdk'), { recursive: true });
            fs.writeFileSync(
                path.join(tempDir, 'packages', 'analyzer', 'package.json'),
                JSON.stringify({ name: 'aetherlight-analyzer', version: '0.15.34' }, null, 2)
            );
            fs.writeFileSync(
                path.join(tempDir, 'packages', 'sdk', 'package.json'),
                JSON.stringify({ name: 'aetherlight-sdk', version: '0.15.34' }, null, 2)
            );

            // Act
            const result = await generator.analyzeAndGenerateConfig(tempDir, { autoSave: true });

            // Assert
            // NOTE: Monorepo detection takes precedence over VS Code extension
            // when packages/ directory exists with sub-packages
            expect(result.projectType).toBe('monorepo');
            expect(result.packageStructure.type).toBe('monorepo');
            expect(result.issues).toBeDefined();
            expect(result.config).toBeDefined();
            expect(result.configSaved).toBe(true);

            // Verify saved file
            const configPath = path.join(tempDir, '.aetherlight', 'validation.toml');
            expect(fs.existsSync(configPath)).toBe(true);
        });
    });
});
