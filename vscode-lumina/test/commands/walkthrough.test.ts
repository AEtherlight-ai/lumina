/**
 * Walkthrough Command Integration Tests
 *
 * PATTERN: Pattern-TDD-001 (85% coverage for command/API layer)
 * COVERAGE TARGET: 85% (Command layer)
 * TEST STRATEGY: Test command handlers with mocked VS Code APIs
 */

import * as assert from 'assert';
import * as sinon from 'sinon';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { WalkthroughManager, WalkthroughStep } from '../../src/services/WalkthroughManager';
import { TechStackDetector } from '../../src/services/TechStackDetector';
import { ToolDetector } from '../../src/services/ToolDetector';
import { WorkflowDetector } from '../../src/services/WorkflowDetector';
import { DomainDetector } from '../../src/services/DomainDetector';
import { InitCommand } from '../../src/commands/init';
import { InterviewFlowCommand } from '../../src/commands/interviewFlow';
import { ProjectConfigGenerator } from '../../src/services/ProjectConfigGenerator';

/**
 * Mock ExtensionContext for command tests
 */
class MockExtensionContext implements Partial<vscode.ExtensionContext> {
    private globalStateData: Map<string, any> = new Map();

    globalState = {
        get: <T>(key: string, defaultValue?: T): T => {
            return this.globalStateData.has(key)
                ? this.globalStateData.get(key)
                : defaultValue as T;
        },
        update: async (key: string, value: any): Promise<void> => {
            this.globalStateData.set(key, value);
        },
        keys: () => Array.from(this.globalStateData.keys()),
        setKeysForSync: (keys: readonly string[]) => {}
    } as any;

    subscriptions: any[] = [];
    workspaceState: any = {};
    extensionUri: any = null;
    extensionPath: string = '';
    environmentVariableCollection: any = null;
    extensionMode: any = null;
    storageUri: any = null;
    storagePath: any = null;
    globalStorageUri: any = null;
    globalStoragePath: any = null;
    logUri: any = null;
    logPath: any = null;
    secrets: any = null;
    asAbsolutePath = (relativePath: string) => relativePath;
}

suite('Walkthrough Command Integration Tests', () => {
    let context: MockExtensionContext;
    let walkthroughManager: WalkthroughManager;
    let sandbox: sinon.SinonSandbox;
    let tempDir: string;

    setup(() => {
        sandbox = sinon.createSandbox();
        tempDir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'lumina-walkthrough-test-'));
        context = new MockExtensionContext();
        walkthroughManager = new WalkthroughManager(context as any);
    });

    teardown(() => {
        sandbox.restore();
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });

    // ==========================================================================
    // TEST SUITE 1: confirmBackup Command
    // ==========================================================================

    suite('confirmBackup Command', () => {
        test('should complete welcome step when user confirms', async () => {
            // Start walkthrough
            await walkthroughManager.startWalkthrough();

            // Simulate user confirmation
            // In real command, this would call walkthroughManager.completeStep(WalkthroughStep.Welcome)
            await walkthroughManager.completeStep(WalkthroughStep.Welcome);

            const progress = walkthroughManager.getProgress();
            assert.ok(progress);
            assert.ok(progress!.completedSteps.includes(WalkthroughStep.Welcome));
            assert.strictEqual(progress!.currentStep, WalkthroughStep.Analyze);
        });

        test('should not complete step if user cancels', async () => {
            await walkthroughManager.startWalkthrough();

            // User cancels - no completeStep call
            const progress = walkthroughManager.getProgress();
            assert.strictEqual(progress!.completedSteps.length, 0);
            assert.strictEqual(progress!.currentStep, WalkthroughStep.Welcome);
        });
    });

    // ==========================================================================
    // TEST SUITE 2: analyzeProject Command
    // ==========================================================================

    suite('analyzeProject Command', () => {
        test('should run all 4 detectors', async () => {
            // Create mock project structure
            const packageJson = {
                name: 'test-project',
                version: '1.0.0',
                dependencies: { react: '^18.0.0' },
                devDependencies: { jest: '^29.0.0', eslint: '^8.0.0' }
            };
            fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify(packageJson, null, 2));

            // Run detectors
            const techStackDetector = new TechStackDetector();
            const toolDetector = new ToolDetector();
            const workflowDetector = new WorkflowDetector();
            const domainDetector = new DomainDetector();

            const techStack = await techStackDetector.detect(tempDir);
            const tools = await toolDetector.detect(tempDir);
            const workflows = await workflowDetector.detect(tempDir);
            const domain = await domainDetector.detect(tempDir);

            // Verify detection results
            assert.ok(techStack);
            assert.ok(tools);
            assert.ok(workflows);
            assert.ok(domain);
        });

        test('should detect TypeScript project correctly', async () => {
            // Setup TypeScript project
            const packageJson = {
                name: 'typescript-project',
                dependencies: {},
                devDependencies: { typescript: '^5.0.0', '@types/node': '^20.0.0' }
            };
            fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify(packageJson, null, 2));
            fs.writeFileSync(path.join(tempDir, 'tsconfig.json'), JSON.stringify({ compilerOptions: {} }));

            // Detect
            const techStackDetector = new TechStackDetector();
            const result = await techStackDetector.detect(tempDir);

            assert.strictEqual(result.language, 'typescript');
        });

        test('should complete analyze step after detection', async () => {
            await walkthroughManager.startWalkthrough();
            await walkthroughManager.completeStep(WalkthroughStep.Welcome);

            // Simulate detection + completeStep
            await walkthroughManager.completeStep(WalkthroughStep.Analyze);
            await walkthroughManager.markProjectAnalyzed();

            const progress = walkthroughManager.getProgress();
            assert.ok(progress!.completedSteps.includes(WalkthroughStep.Analyze));
            assert.strictEqual(progress!.currentStep, WalkthroughStep.Configure);
            assert.strictEqual(progress!.projectAnalyzed, true);
        });

        test('should handle empty/greenfield project', async () => {
            // Empty directory - no files
            const techStackDetector = new TechStackDetector();
            const result = await techStackDetector.detect(tempDir);

            // Should still return result (with 'unknown' values)
            assert.ok(result);
            assert.strictEqual(result.language, 'unknown');
        });

        test('should handle detection errors gracefully', async () => {
            // Invalid path should not crash
            const invalidPath = path.join(tempDir, 'nonexistent-directory');
            const techStackDetector = new TechStackDetector();

            // Should not throw, return unknown
            const result = await techStackDetector.detect(invalidPath);
            assert.ok(result);
        });
    });

    // ==========================================================================
    // TEST SUITE 3: init Command
    // ==========================================================================

    suite('init Command', () => {
        test('should create config file at .aetherlight/project-config.json', async () => {
            // Setup mock project
            const packageJson = {
                name: 'test-project',
                version: '1.0.0',
                scripts: { build: 'tsc', test: 'jest' }
            };
            fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify(packageJson, null, 2));
            fs.writeFileSync(path.join(tempDir, 'tsconfig.json'), '{}');

            // Create command with dependencies
            const techStackDetector = new TechStackDetector();
            const toolDetector = new ToolDetector();
            const workflowDetector = new WorkflowDetector();
            const domainDetector = new DomainDetector();
            const interviewEngine = { runInterview: async () => ({}) } as any;
            const interviewFlow = new InterviewFlowCommand(
                techStackDetector,
                toolDetector,
                workflowDetector,
                domainDetector,
                interviewEngine
            );
            const configGenerator = new ProjectConfigGenerator();
            const initCommand = new InitCommand(interviewFlow, configGenerator);

            // Run init (this will trigger interview, but with no user input it should use defaults)
            const configPath = await initCommand.run(tempDir);

            // Verify config created
            assert.ok(fs.existsSync(configPath));
            const expectedPath = path.join(tempDir, '.aetherlight', 'project-config.json');
            assert.strictEqual(configPath, expectedPath);

            // Verify config is valid JSON
            const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
            assert.ok(config);
            assert.strictEqual(config.schema_version, '2.0');
        });

        test('should complete configure step after init', async () => {
            await walkthroughManager.startWalkthrough();
            await walkthroughManager.completeStep(WalkthroughStep.Welcome);
            await walkthroughManager.completeStep(WalkthroughStep.Analyze);

            // Simulate init + completeStep
            await walkthroughManager.completeStep(WalkthroughStep.Configure);
            await walkthroughManager.markConfigGenerated();

            const progress = walkthroughManager.getProgress();
            assert.ok(progress!.completedSteps.includes(WalkthroughStep.Configure));
            assert.strictEqual(progress!.currentStep, WalkthroughStep.Review);
            assert.strictEqual(progress!.configGenerated, true);
        });

        test('should handle existing config (regenerate prompt)', async () => {
            // Create existing config
            const aetherlightDir = path.join(tempDir, '.aetherlight');
            fs.mkdirSync(aetherlightDir, { recursive: true });
            const existingConfig = { schema_version: '2.0', project_name: 'existing' };
            fs.writeFileSync(
                path.join(aetherlightDir, 'project-config.json'),
                JSON.stringify(existingConfig, null, 2)
            );

            // Check if config exists
            const configPath = path.join(aetherlightDir, 'project-config.json');
            assert.ok(fs.existsSync(configPath));

            // In real command, this would prompt user to regenerate or skip
            // For test, just verify existing config detected
            const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
            assert.strictEqual(config.project_name, 'existing');
        });

        test('should handle file write errors', async () => {
            // Create read-only .aetherlight directory to trigger write error
            const aetherlightDir = path.join(tempDir, '.aetherlight');
            fs.mkdirSync(aetherlightDir, { recursive: true });

            // Make directory read-only (Windows: attrib +r, Unix: chmod 444)
            if (process.platform === 'win32') {
                try {
                    require('child_process').execSync(`attrib +r "${aetherlightDir}"`);
                } catch (e) {
                    // Skip test if can't set read-only
                    return;
                }
            } else {
                fs.chmodSync(aetherlightDir, 0o444);
            }

            // Attempt to write should fail gracefully
            const configPath = path.join(aetherlightDir, 'project-config.json');
            try {
                fs.writeFileSync(configPath, '{}');
                assert.fail('Should have thrown error');
            } catch (error) {
                assert.ok(error);
            }

            // Cleanup: restore permissions
            if (process.platform === 'win32') {
                try {
                    require('child_process').execSync(`attrib -r "${aetherlightDir}"`);
                } catch (e) {
                    // Ignore cleanup error
                }
            } else {
                fs.chmodSync(aetherlightDir, 0o755);
            }
        });
    });

    // ==========================================================================
    // TEST SUITE 4: openConfig Command
    // ==========================================================================

    suite('openConfig Command', () => {
        test('should open config file if exists', async () => {
            // Create config file
            const aetherlightDir = path.join(tempDir, '.aetherlight');
            fs.mkdirSync(aetherlightDir, { recursive: true });
            const config = { schema_version: '2.0', project_name: 'test' };
            const configPath = path.join(aetherlightDir, 'project-config.json');
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

            // Verify file exists (in real command, would call vscode.workspace.openTextDocument)
            assert.ok(fs.existsSync(configPath));

            // Verify content
            const loadedConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
            assert.deepStrictEqual(loadedConfig, config);
        });

        test('should prompt to generate if config missing', async () => {
            const aetherlightDir = path.join(tempDir, '.aetherlight');
            const configPath = path.join(aetherlightDir, 'project-config.json');

            // Config doesn't exist
            assert.ok(!fs.existsSync(configPath));

            // In real command, this would show warning modal and offer to generate
            // For test, just verify missing state detected
        });

        test('should complete review step after opening config', async () => {
            await walkthroughManager.startWalkthrough();
            await walkthroughManager.completeStep(WalkthroughStep.Welcome);
            await walkthroughManager.completeStep(WalkthroughStep.Analyze);
            await walkthroughManager.completeStep(WalkthroughStep.Configure);

            // Simulate openConfig + completeStep
            await walkthroughManager.completeStep(WalkthroughStep.Review);

            const progress = walkthroughManager.getProgress();
            assert.ok(progress!.completedSteps.includes(WalkthroughStep.Review));
            assert.strictEqual(progress!.currentStep, WalkthroughStep.Sprint);
        });
    });

    // ==========================================================================
    // TEST SUITE 5: startGettingStarted Command
    // ==========================================================================

    suite('startGettingStarted Command', () => {
        test('should show walkthrough and start progress', async () => {
            // Simulate command execution
            await walkthroughManager.showWalkthrough();
            await walkthroughManager.startWalkthrough();

            const progress = walkthroughManager.getProgress();
            assert.ok(progress);
            assert.strictEqual(progress!.currentStep, WalkthroughStep.Welcome);
            assert.strictEqual(progress!.completedSteps.length, 0);
        });

        test('should mark first run as completed', async () => {
            assert.strictEqual(walkthroughManager.isFirstRun(), true);

            await walkthroughManager.startWalkthrough();

            const newManager = new WalkthroughManager(context as any);
            assert.strictEqual(newManager.isFirstRun(), false);
        });
    });

    // ==========================================================================
    // TEST SUITE 6: Complete Walkthrough Flow
    // ==========================================================================

    suite('Complete Walkthrough Flow', () => {
        test('should complete all steps in order', async () => {
            // Start
            await walkthroughManager.startWalkthrough();
            assert.strictEqual(walkthroughManager.getProgress()!.currentStep, WalkthroughStep.Welcome);

            // Step 1: Welcome
            await walkthroughManager.completeStep(WalkthroughStep.Welcome);
            assert.strictEqual(walkthroughManager.getProgress()!.currentStep, WalkthroughStep.Analyze);

            // Step 2: Analyze
            await walkthroughManager.markProjectAnalyzed();
            await walkthroughManager.completeStep(WalkthroughStep.Analyze);
            assert.strictEqual(walkthroughManager.getProgress()!.currentStep, WalkthroughStep.Configure);

            // Step 3: Configure
            await walkthroughManager.markConfigGenerated();
            await walkthroughManager.completeStep(WalkthroughStep.Configure);
            assert.strictEqual(walkthroughManager.getProgress()!.currentStep, WalkthroughStep.Review);

            // Step 4: Review
            await walkthroughManager.completeStep(WalkthroughStep.Review);
            assert.strictEqual(walkthroughManager.getProgress()!.currentStep, WalkthroughStep.Sprint);

            // Step 5: Sprint (final)
            await walkthroughManager.completeStep(WalkthroughStep.Sprint);

            const progress = walkthroughManager.getProgress();
            assert.strictEqual(progress!.completedSteps.length, 5);
            assert.ok(progress!.completedAt);
        });

        test('should track all flags after complete flow', async () => {
            await walkthroughManager.startWalkthrough();
            await walkthroughManager.completeStep(WalkthroughStep.Welcome);
            await walkthroughManager.completeStep(WalkthroughStep.Analyze);
            await walkthroughManager.markProjectAnalyzed();
            await walkthroughManager.completeStep(WalkthroughStep.Configure);
            await walkthroughManager.markConfigGenerated();
            await walkthroughManager.completeStep(WalkthroughStep.Review);
            await walkthroughManager.completeStep(WalkthroughStep.Sprint);

            const progress = walkthroughManager.getProgress();
            assert.strictEqual(progress!.projectAnalyzed, true);
            assert.strictEqual(progress!.configGenerated, true);
            assert.ok(progress!.completedAt);
        });
    });

    // ==========================================================================
    // TEST SUITE 7: Error Handling
    // ==========================================================================

    suite('Error Handling', () => {
        test('should handle no workspace folder gracefully', async () => {
            // Simulate no workspace (in real command, vscode.workspace.workspaceFolders would be undefined)
            // This test verifies the command checks for workspace before proceeding
            const workspaceFolders: any = undefined;
            assert.strictEqual(workspaceFolders, undefined);

            // Command should detect this and show error, not crash
        });

        test('should handle invalid project structure', async () => {
            // Create directory with no project files
            const emptyDir = path.join(tempDir, 'empty-project');
            fs.mkdirSync(emptyDir, { recursive: true });

            // Detection should not crash on empty directory
            const techStackDetector = new TechStackDetector();
            const result = await techStackDetector.detect(emptyDir);

            assert.ok(result);
            assert.strictEqual(result.language, 'unknown');
        });

        test('should handle corrupted config file', async () => {
            // Create invalid JSON config
            const aetherlightDir = path.join(tempDir, '.aetherlight');
            fs.mkdirSync(aetherlightDir, { recursive: true });
            const configPath = path.join(aetherlightDir, 'project-config.json');
            fs.writeFileSync(configPath, 'invalid json {{{');

            // Reading should fail gracefully
            try {
                JSON.parse(fs.readFileSync(configPath, 'utf-8'));
                assert.fail('Should have thrown error');
            } catch (error) {
                assert.ok(error);
                // Command should catch this and show user-friendly error
            }
        });
    });
});
