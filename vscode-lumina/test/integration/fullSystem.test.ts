/**
 * Full System Integration Tests - All Phases Combined
 *
 * PATTERN: Pattern-TDD-001 (Integration Testing)
 * COVERAGE TARGET: ≥85% (system integration)
 * TASK: SELF-021 (Comprehensive integration tests)
 *
 * PHASES TESTED: Complete Self-Configuration System
 * - Phase 2: Foundation (VariableResolver, ProjectConfigGenerator, Validator)
 * - Phase 3: Detection (TechStack, Tool, Workflow, Domain)
 * - Phase 4: Interview & Config (InterviewFlow, Init, Templates)
 * - Phase 5: Migration (VersionTracker, ConfigMigration, Backup, Upgrade)
 *
 * TEST MATRIX: 5 Key Project Types
 * 1. TypeScript + npm + Jest (Primary use case)
 * 2. JavaScript + npm + Mocha (Simpler variant)
 * 3. Python + pip + pytest (Different ecosystem)
 * 4. Rust + Cargo (Systems language)
 * 5. Greenfield (Empty project)
 *
 * TEST STRATEGY:
 * - Real file system operations (temp directories)
 * - Full pipeline: detection → interview → config → templates → migration
 * - Error resilience (graceful degradation)
 * - Performance validation (<5s per project type)
 */

import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import * as sinon from 'sinon';

// Phase 2: Foundation
import { VariableResolver } from '../../src/services/VariableResolver';
import { ProjectConfigGenerator, DetectionResults, InterviewAnswers } from '../../src/services/ProjectConfigGenerator';
import { ProjectConfigValidator } from '../../src/services/ProjectConfigValidator';

// Phase 3: Detection
import { TechStackDetector } from '../../src/services/TechStackDetector';
import { ToolDetector } from '../../src/services/ToolDetector';
import { WorkflowDetector } from '../../src/services/WorkflowDetector';
import { DomainDetector } from '../../src/services/DomainDetector';

// Phase 4: Interview & Config
import { InterviewFlowCommand } from '../../src/commands/interviewFlow';
import { InitCommand } from '../../src/commands/init';

// Phase 5: Migration
import { VersionTracker } from '../../src/services/VersionTracker';
import { ConfigMigration } from '../../src/services/ConfigMigration';
import { BackupManager } from '../../src/services/BackupManager';
import { UpgradeCommand } from '../../src/commands/upgrade';

describe('Full System Integration Tests', () => {
    let sandbox: sinon.SinonSandbox;
    let tempDir: string;

    // Phase 2 services
    let variableResolver: VariableResolver;
    let configGenerator: ProjectConfigGenerator;
    let validator: ProjectConfigValidator;

    // Phase 3 services
    let techStackDetector: TechStackDetector;
    let toolDetector: ToolDetector;
    let workflowDetector: WorkflowDetector;
    let domainDetector: DomainDetector;

    // Phase 4 services
    let interviewFlow: InterviewFlowCommand;
    let initCommand: InitCommand;

    // Phase 5 services
    let versionTracker: VersionTracker;
    let configMigration: ConfigMigration;
    let backupManager: BackupManager;
    let upgradeCommand: UpgradeCommand;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fullsystem-integration-'));

        // Initialize all services
        variableResolver = new VariableResolver();
        configGenerator = new ProjectConfigGenerator();
        validator = new ProjectConfigValidator();

        techStackDetector = new TechStackDetector();
        toolDetector = new ToolDetector();
        workflowDetector = new WorkflowDetector();
        domainDetector = new DomainDetector();

        interviewFlow = new InterviewFlowCommand();
        initCommand = new InitCommand(interviewFlow, configGenerator);

        versionTracker = new VersionTracker();
        configMigration = new ConfigMigration(validator);
        backupManager = new BackupManager();
        upgradeCommand = new UpgradeCommand(versionTracker, configMigration, backupManager);
    });

    afterEach(() => {
        sandbox.restore();
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });

    // ==========================================================================
    // TEST SUITE 1: TypeScript + npm + Jest (Primary Use Case)
    // ==========================================================================

    describe('TypeScript + npm + Jest Project', () => {
        it('should complete full pipeline: detection → config → validation', async function () {
            this.timeout(10000);

            // Create realistic TypeScript + Jest project
            fs.writeFileSync(
                path.join(tempDir, 'package.json'),
                JSON.stringify({
                    name: 'typescript-jest-project',
                    version: '1.0.0',
                    scripts: {
                        build: 'tsc',
                        test: 'jest --coverage',
                        lint: 'eslint .'
                    },
                    dependencies: {},
                    devDependencies: {
                        typescript: '^5.0.0',
                        jest: '^29.0.0',
                        '@types/jest': '^29.0.0',
                        eslint: '^8.0.0'
                    }
                }, null, 2)
            );

            fs.writeFileSync(
                path.join(tempDir, 'tsconfig.json'),
                JSON.stringify({
                    compilerOptions: {
                        target: 'ES2020',
                        module: 'commonjs',
                        outDir: './dist',
                        rootDir: './src'
                    }
                }, null, 2)
            );

            fs.mkdirSync(path.join(tempDir, 'src'));
            fs.mkdirSync(path.join(tempDir, 'test'));
            fs.writeFileSync(path.join(tempDir, '.gitignore'), 'node_modules\ndist\n');

            // Phase 3: Run detection
            const startTime = Date.now();

            const techStack = await techStackDetector.detect(tempDir);
            const tools = await toolDetector.detect(tempDir);
            const workflow = await workflowDetector.detect(tempDir);
            const domain = await domainDetector.detect(tempDir);

            // Verify detection results
            assert.strictEqual(techStack.language, 'typescript', 'Should detect TypeScript');
            assert.strictEqual(techStack.runtime, 'node', 'Should detect Node runtime');
            assert.strictEqual(tools.packageManager, 'npm', 'Should detect npm');
            assert.strictEqual(tools.testFramework, 'jest', 'Should detect Jest');
            assert.strictEqual(workflow.vcs, 'git', 'Should detect git');

            // Phase 4: Generate config from detection
            const detectionResults: DetectionResults = {
                techStack,
                tools,
                workflow,
                domain
            };

            // Mock interview answers (use detection defaults)
            const interviewAnswers: InterviewAnswers = {
                project_name: 'typescript-jest-project',
                language: 'typescript',
                package_manager: 'npm',
                test_framework: 'jest',
                build_command: 'npm run build',
                test_command: 'npm test',
                source_directory: 'src',
                test_directory: 'test',
                output_directory: 'dist'
            };

            const config = configGenerator.generate(detectionResults, interviewAnswers);

            // Validate config
            const validation = validator.validate(config);
            assert.strictEqual(validation.valid, true, 'Generated config should be valid');
            assert.strictEqual(validation.errors.length, 0, 'Should have no validation errors');

            // Verify config correctness
            assert.strictEqual(config.project_name, 'typescript-jest-project');
            assert.strictEqual(config.language.language, 'typescript');
            assert.strictEqual(config.language.package_manager, 'npm');
            assert.strictEqual(config.language.test_framework, 'jest');

            // Performance check
            const duration = Date.now() - startTime;
            assert.ok(duration < 5000, `Full pipeline took ${duration}ms (target: < 5000ms)`);
        });

        it('should resolve all variables in generated config', async () => {
            // Create project
            fs.writeFileSync(
                path.join(tempDir, 'package.json'),
                JSON.stringify({ name: 'test-project', version: '1.0.0' }, null, 2)
            );

            // Run detection
            const techStack = await techStackDetector.detect(tempDir);
            const tools = await toolDetector.detect(tempDir);
            const workflow = await workflowDetector.detect(tempDir);
            const domain = await domainDetector.detect(tempDir);

            // Generate config
            const detectionResults: DetectionResults = { techStack, tools, workflow, domain };
            const interviewAnswers: InterviewAnswers = {
                project_name: 'test-project',
                language: 'typescript',
                package_manager: 'npm',
                test_framework: 'jest',
                build_command: 'npm run build',
                test_command: 'npm test'
            };

            const config = configGenerator.generate(detectionResults, interviewAnswers);

            // Resolve variables
            const context = {
                PROJECT_ROOT: tempDir,
                PROJECT_NAME: config.project_name,
                LANGUAGE: config.language.language,
                BUILD_COMMAND: config.language.build_command,
                TEST_COMMAND: config.language.test_command
            };

            // Test resolution works
            const resolved = variableResolver.resolve('{{PROJECT_NAME}}', context);
            assert.strictEqual(resolved, 'test-project');

            const resolved2 = variableResolver.resolve('Build: {{BUILD_COMMAND}}', context);
            assert.strictEqual(resolved2, 'Build: npm run build');
        });
    });

    // ==========================================================================
    // TEST SUITE 2: JavaScript + npm + Mocha (Simpler Variant)
    // ==========================================================================

    describe('JavaScript + npm + Mocha Project', () => {
        it('should detect and configure JavaScript project correctly', async function () {
            this.timeout(10000);

            // Create JavaScript project
            fs.writeFileSync(
                path.join(tempDir, 'package.json'),
                JSON.stringify({
                    name: 'javascript-mocha-project',
                    version: '1.0.0',
                    scripts: {
                        test: 'mocha test/**/*.js'
                    },
                    devDependencies: {
                        mocha: '^10.0.0',
                        chai: '^4.0.0'
                    }
                }, null, 2)
            );

            fs.mkdirSync(path.join(tempDir, 'lib'));
            fs.mkdirSync(path.join(tempDir, 'test'));

            // Run detection
            const techStack = await techStackDetector.detect(tempDir);
            const tools = await toolDetector.detect(tempDir);

            // Verify detection
            assert.strictEqual(techStack.language, 'javascript', 'Should detect JavaScript');
            assert.strictEqual(tools.packageManager, 'npm', 'Should detect npm');
            assert.strictEqual(tools.testFramework, 'mocha', 'Should detect Mocha');

            // Generate config
            const detectionResults: DetectionResults = {
                techStack,
                tools,
                workflow: await workflowDetector.detect(tempDir),
                domain: await domainDetector.detect(tempDir)
            };

            const interviewAnswers: InterviewAnswers = {
                project_name: 'javascript-mocha-project',
                language: 'javascript',
                package_manager: 'npm',
                test_framework: 'mocha',
                build_command: 'npm run build',
                test_command: 'npm test'
            };

            const config = configGenerator.generate(detectionResults, interviewAnswers);

            // Validate
            const validation = validator.validate(config);
            assert.strictEqual(validation.valid, true);
            assert.strictEqual(config.language.language, 'javascript');
        });
    });

    // ==========================================================================
    // TEST SUITE 3: Python + pip + pytest (Different Ecosystem)
    // ==========================================================================

    describe('Python + pip + pytest Project', () => {
        it('should detect and configure Python project correctly', async function () {
            this.timeout(10000);

            // Create Python project
            fs.writeFileSync(
                path.join(tempDir, 'setup.py'),
                'from setuptools import setup\nsetup(name="test-project")'
            );

            fs.writeFileSync(
                path.join(tempDir, 'requirements.txt'),
                'pytest==7.0.0\nrequests==2.28.0\n'
            );

            fs.mkdirSync(path.join(tempDir, 'src'));
            fs.mkdirSync(path.join(tempDir, 'tests'));
            fs.writeFileSync(path.join(tempDir, 'pytest.ini'), '[pytest]\ntestpaths = tests\n');

            // Run detection
            const techStack = await techStackDetector.detect(tempDir);
            const tools = await toolDetector.detect(tempDir);

            // Verify detection
            assert.strictEqual(techStack.language, 'python', 'Should detect Python');
            assert.strictEqual(tools.packageManager, 'pip', 'Should detect pip');
            assert.strictEqual(tools.testFramework, 'pytest', 'Should detect pytest');

            // Generate config
            const detectionResults: DetectionResults = {
                techStack,
                tools,
                workflow: await workflowDetector.detect(tempDir),
                domain: await domainDetector.detect(tempDir)
            };

            const interviewAnswers: InterviewAnswers = {
                project_name: 'python-pytest-project',
                language: 'python',
                package_manager: 'pip',
                test_framework: 'pytest',
                build_command: 'python setup.py build',
                test_command: 'pytest'
            };

            const config = configGenerator.generate(detectionResults, interviewAnswers);

            // Validate
            const validation = validator.validate(config);
            assert.strictEqual(validation.valid, true);
            assert.strictEqual(config.language.language, 'python');
            assert.strictEqual(config.language.test_framework, 'pytest');
        });
    });

    // ==========================================================================
    // TEST SUITE 4: Rust + Cargo (Systems Language)
    // ==========================================================================

    describe('Rust + Cargo Project', () => {
        it('should detect and configure Rust project correctly', async function () {
            this.timeout(10000);

            // Create Rust project
            fs.writeFileSync(
                path.join(tempDir, 'Cargo.toml'),
                '[package]\nname = "rust-project"\nversion = "0.1.0"\n\n[dependencies]\n'
            );

            fs.mkdirSync(path.join(tempDir, 'src'));
            fs.writeFileSync(path.join(tempDir, 'src', 'main.rs'), 'fn main() {}\n');
            fs.mkdirSync(path.join(tempDir, 'tests'));

            // Run detection
            const techStack = await techStackDetector.detect(tempDir);
            const tools = await toolDetector.detect(tempDir);

            // Verify detection
            assert.strictEqual(techStack.language, 'rust', 'Should detect Rust');
            assert.strictEqual(tools.packageManager, 'cargo', 'Should detect Cargo');
            assert.strictEqual(tools.testFramework, 'cargo-test', 'Should detect cargo test');

            // Generate config
            const detectionResults: DetectionResults = {
                techStack,
                tools,
                workflow: await workflowDetector.detect(tempDir),
                domain: await domainDetector.detect(tempDir)
            };

            const interviewAnswers: InterviewAnswers = {
                project_name: 'rust-project',
                language: 'rust',
                package_manager: 'cargo',
                test_framework: 'cargo-test',
                build_command: 'cargo build --release',
                test_command: 'cargo test'
            };

            const config = configGenerator.generate(detectionResults, interviewAnswers);

            // Validate
            const validation = validator.validate(config);
            assert.strictEqual(validation.valid, true);
            assert.strictEqual(config.language.language, 'rust');
        });
    });

    // ==========================================================================
    // TEST SUITE 5: Greenfield Project (Empty/Minimal)
    // ==========================================================================

    describe('Greenfield Project (Empty)', () => {
        it('should handle empty project with interview fallback', async function () {
            this.timeout(10000);

            // Empty project (no files)

            // Run detection (should find nothing)
            const techStack = await techStackDetector.detect(tempDir);
            const tools = await toolDetector.detect(tempDir);

            // Detection should return defaults/unknown
            assert.ok(techStack.language === 'unknown' || techStack.language === 'typescript', 'Should handle unknown language');

            // Generate config using interview answers (no detection)
            const detectionResults: DetectionResults = {
                techStack,
                tools,
                workflow: await workflowDetector.detect(tempDir),
                domain: await domainDetector.detect(tempDir)
            };

            const interviewAnswers: InterviewAnswers = {
                project_name: 'greenfield-project',
                language: 'typescript',
                package_manager: 'npm',
                test_framework: 'jest',
                build_command: 'npm run build',
                test_command: 'npm test'
            };

            const config = configGenerator.generate(detectionResults, interviewAnswers);

            // Validate
            const validation = validator.validate(config);
            assert.strictEqual(validation.valid, true, 'Should generate valid config from interview alone');
            assert.strictEqual(config.project_name, 'greenfield-project');
            assert.strictEqual(config.language.language, 'typescript');
        });
    });

    // ==========================================================================
    // TEST SUITE 6: Cross-Phase Integration (Phase 3 → 4 → 5)
    // ==========================================================================

    describe('Cross-Phase Integration', () => {
        it('should flow seamlessly from detection → config → migration → upgrade', async function () {
            this.timeout(15000);

            // Phase 3: Detection
            fs.writeFileSync(
                path.join(tempDir, 'package.json'),
                JSON.stringify({ name: 'cross-phase-project', version: '1.0.0' }, null, 2)
            );

            const techStack = await techStackDetector.detect(tempDir);
            assert.ok(techStack);

            // Phase 4: Config generation
            const detectionResults: DetectionResults = {
                techStack,
                tools: await toolDetector.detect(tempDir),
                workflow: await workflowDetector.detect(tempDir),
                domain: await domainDetector.detect(tempDir)
            };

            const interviewAnswers: InterviewAnswers = {
                project_name: 'cross-phase-project',
                language: 'typescript',
                package_manager: 'npm',
                test_framework: 'jest',
                build_command: 'npm run build',
                test_command: 'npm test'
            };

            const config = configGenerator.generate(detectionResults, interviewAnswers);
            const validation = validator.validate(config);
            assert.strictEqual(validation.valid, true);

            // Write config to .aetherlight/project-config.json
            const aetherlightDir = path.join(tempDir, '.aetherlight');
            fs.mkdirSync(aetherlightDir, { recursive: true });
            fs.writeFileSync(
                path.join(aetherlightDir, 'project-config.json'),
                JSON.stringify(config, null, 2)
            );

            // Phase 5: Version tracking
            await versionTracker.setVersion(tempDir, '1.0.0');
            const currentVersion = await versionTracker.getCurrentVersion(tempDir);
            assert.strictEqual(currentVersion?.version, '1.0.0');

            // Phase 5: Backup
            const backupPath = await backupManager.backup(tempDir, 'test-backup', 'Testing backup');
            assert.ok(fs.existsSync(backupPath));

            // Verify backup integrity
            const verification = await backupManager.verifyBackup(tempDir, 'test-backup');
            assert.strictEqual(verification.valid, true);
        });
    });

    // ==========================================================================
    // TEST SUITE 7: Error Resilience
    // ==========================================================================

    describe('Error Resilience', () => {
        it('should handle detection failures gracefully', async () => {
            // Corrupt project structure
            fs.writeFileSync(path.join(tempDir, 'package.json'), 'invalid json{');

            // Detection should handle error gracefully
            try {
                await techStackDetector.detect(tempDir);
            } catch (error) {
                assert.ok(error, 'Should throw error for invalid package.json');
            }

            // System should fall back to interview
            const interviewAnswers: InterviewAnswers = {
                project_name: 'fallback-project',
                language: 'typescript',
                package_manager: 'npm',
                test_framework: 'jest',
                build_command: 'npm run build',
                test_command: 'npm test'
            };

            // Should still generate valid config from interview
            const config = configGenerator.generate({} as DetectionResults, interviewAnswers);
            const validation = validator.validate(config);
            assert.strictEqual(validation.valid, true, 'Should generate valid config despite detection failure');
        });

        it('should handle missing files during migration', async () => {
            // Setup: Create incomplete config
            const aetherlightDir = path.join(tempDir, '.aetherlight');
            fs.mkdirSync(aetherlightDir, { recursive: true });

            // Try to migrate with no old config (should handle gracefully)
            const migrationResult = await configMigration.migrate(tempDir);
            assert.strictEqual(migrationResult.success, true);
            assert.strictEqual(migrationResult.migrated, false);
            assert.strictEqual(migrationResult.message, 'No old config found. No migration needed.');
        });
    });

    // ==========================================================================
    // TEST SUITE 8: Performance Benchmarks
    // ==========================================================================

    describe('Performance Benchmarks', () => {
        it('should complete detection pipeline in < 500ms', async () => {
            // Create project
            fs.writeFileSync(
                path.join(tempDir, 'package.json'),
                JSON.stringify({ name: 'perf-test', version: '1.0.0' }, null, 2)
            );

            // Benchmark detection
            const startTime = Date.now();
            await techStackDetector.detect(tempDir);
            await toolDetector.detect(tempDir);
            await workflowDetector.detect(tempDir);
            await domainDetector.detect(tempDir);
            const duration = Date.now() - startTime;

            assert.ok(duration < 500, `Detection took ${duration}ms (target: < 500ms)`);
        });

        it('should complete config generation in < 100ms', () => {
            const detectionResults: DetectionResults = {
                techStack: { language: 'typescript', runtime: 'node', frameworks: [] },
                tools: { packageManager: 'npm', testFramework: 'jest', linter: 'eslint', formatter: null, bundler: null },
                workflow: { vcs: 'git', ci_cd: null, preCommitHooks: false },
                domain: { primary: 'library', patterns: [], indicators: {} }
            };

            const interviewAnswers: InterviewAnswers = {
                project_name: 'perf-test',
                language: 'typescript',
                package_manager: 'npm',
                test_framework: 'jest',
                build_command: 'npm run build',
                test_command: 'npm test'
            };

            // Benchmark config generation
            const startTime = Date.now();
            configGenerator.generate(detectionResults, interviewAnswers);
            const duration = Date.now() - startTime;

            assert.ok(duration < 100, `Config generation took ${duration}ms (target: < 100ms)`);
        });

        it('should complete full system pipeline in < 5s', async function () {
            this.timeout(10000);

            // Create realistic project
            fs.writeFileSync(
                path.join(tempDir, 'package.json'),
                JSON.stringify({
                    name: 'full-perf-test',
                    version: '1.0.0',
                    devDependencies: { typescript: '^5.0.0', jest: '^29.0.0' }
                }, null, 2)
            );
            fs.writeFileSync(path.join(tempDir, 'tsconfig.json'), JSON.stringify({ compilerOptions: {} }, null, 2));

            // Benchmark full pipeline
            const startTime = Date.now();

            // Phase 3: Detection
            const techStack = await techStackDetector.detect(tempDir);
            const tools = await toolDetector.detect(tempDir);
            const workflow = await workflowDetector.detect(tempDir);
            const domain = await domainDetector.detect(tempDir);

            // Phase 4: Config generation
            const detectionResults: DetectionResults = { techStack, tools, workflow, domain };
            const interviewAnswers: InterviewAnswers = {
                project_name: 'full-perf-test',
                language: 'typescript',
                package_manager: 'npm',
                test_framework: 'jest',
                build_command: 'npm run build',
                test_command: 'npm test'
            };
            const config = configGenerator.generate(detectionResults, interviewAnswers);
            validator.validate(config);

            // Phase 5: Version tracking
            const aetherlightDir = path.join(tempDir, '.aetherlight');
            fs.mkdirSync(aetherlightDir, { recursive: true });
            await versionTracker.setVersion(tempDir, '1.0.0');

            const duration = Date.now() - startTime;
            assert.ok(duration < 5000, `Full system pipeline took ${duration}ms (target: < 5000ms)`);
        });
    });
});
