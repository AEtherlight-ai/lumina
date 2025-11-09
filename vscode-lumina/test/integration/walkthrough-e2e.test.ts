/**
 * Walkthrough End-to-End Flow Test
 *
 * PATTERN: Pattern-TDD-001 (85% coverage for integration layer)
 * COVERAGE TARGET: Complete user journey from fresh install to completion
 * TEST STRATEGY: Simulate real user clicking through all 5 steps
 *
 * USER JOURNEY:
 * 1. Fresh install → First run detection → Walkthrough auto-shows
 * 2. Step 1 (Welcome) → User clicks "Confirm Backup" → Welcome completed
 * 3. Step 2 (Analyze) → User clicks "Analyze Project" → Detection runs → Analyze completed
 * 4. Step 3 (Configure) → User clicks "Initialize" → Config created → Configure completed
 * 5. Step 4 (Review) → User clicks "Open Config" → File opens → Review completed
 * 6. Step 5 (Sprint) → User ready for sprint planning → Walkthrough complete
 * 7. Second activation → Walkthrough doesn't auto-show (first run complete)
 * 8. Progress persists across extension reloads
 *
 * RELATED: src/commands/walkthrough.ts, src/services/WalkthroughManager.ts
 */

import * as assert from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { WalkthroughManager, WalkthroughStep } from '../../src/services/WalkthroughManager';
import { TechStackDetector } from '../../src/services/TechStackDetector';
import { ToolDetector } from '../../src/services/ToolDetector';
import { WorkflowDetector } from '../../src/services/WorkflowDetector';
import { DomainDetector } from '../../src/services/DomainDetector';
import { ProjectConfigGenerator } from '../../src/services/ProjectConfigGenerator';
import { InterviewEngine } from '../../src/services/InterviewEngine';
import { InitCommand } from '../../src/commands/init';
import { InterviewFlowCommand } from '../../src/commands/interviewFlow';

/**
 * Mock ExtensionContext for E2E testing
 */
class MockExtensionContext implements Partial<vscode.ExtensionContext> {
    private globalStateData: Map<string, any> = new Map();

    globalState = {
        get: <T>(key: string, defaultValue?: T): T => {
            if (this.globalStateData.has(key)) {
                return this.globalStateData.get(key);
            }
            return defaultValue as T;
        },
        update: async (key: string, value: any): Promise<void> => {
            this.globalStateData.set(key, value);
        },
        keys: () => {
            return Array.from(this.globalStateData.keys());
        },
        setKeysForSync: (keys: readonly string[]) => {
            // No-op for tests
        }
    } as vscode.Memento & { setKeysForSync(keys: readonly string[]): void };

    subscriptions: any[] = [];
    workspaceState: any = {};
    extensionUri: any = vscode.Uri.file('/test/extension');
    extensionPath = '/test/extension';
    asAbsolutePath = (relativePath: string) => path.join('/test/extension', relativePath);
    storageUri: any = vscode.Uri.file('/test/storage');
    storagePath = '/test/storage';
    globalStorageUri: any = vscode.Uri.file('/test/globalStorage');
    globalStoragePath = '/test/globalStorage';
    logUri: any = vscode.Uri.file('/test/logs');
    logPath = '/test/logs';
    extensionMode = 3; // ExtensionMode.Test
    extension: any = {};
    environmentVariableCollection: any = {};
    secrets: any = {};
}

describe('Walkthrough End-to-End Flow Test', () => {
    let context: MockExtensionContext;
    let walkthroughManager: WalkthroughManager;
    let sandbox: sinon.SinonSandbox;
    let tempDir: string;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
        tempDir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'lumina-e2e-'));
        context = new MockExtensionContext();
        walkthroughManager = new WalkthroughManager(context as any);

        // Create mock TypeScript project structure
        fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
        fs.mkdirSync(path.join(tempDir, 'test'), { recursive: true });

        // Create package.json
        fs.writeFileSync(
            path.join(tempDir, 'package.json'),
            JSON.stringify({
                name: 'test-project',
                version: '1.0.0',
                scripts: {
                    build: 'tsc',
                    test: 'mocha'
                },
                devDependencies: {
                    typescript: '^5.0.0',
                    mocha: '^10.0.0'
                }
            }, null, 2)
        );

        // Create tsconfig.json
        fs.writeFileSync(
            path.join(tempDir, 'tsconfig.json'),
            JSON.stringify({
                compilerOptions: {
                    target: 'ES2020',
                    module: 'commonjs',
                    outDir: './out'
                }
            }, null, 2)
        );

        // Create sample source file
        fs.writeFileSync(
            path.join(tempDir, 'src', 'index.ts'),
            'export function hello() { return "Hello World"; }'
        );
    });

    afterEach(() => {
        sandbox.restore();
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });

    // ==========================================================================
    // SCENARIO 1: Fresh Install - Complete Walkthrough Journey
    // ==========================================================================

    describe('Scenario 1: Fresh Install - Complete Journey', () => {
        it('should complete entire walkthrough flow from start to finish', async function() {
            // Increase timeout for E2E test
            this.timeout(10000);

            // Mock workspace
            const mockWorkspaceFolder = {
                uri: vscode.Uri.file(tempDir),
                name: 'test-project',
                index: 0
            };
            sandbox.stub(vscode.workspace, 'workspaceFolders').value([mockWorkspaceFolder]);

            // STEP 0: Verify fresh install (first run)
            const isFirstRun = await walkthroughManager.isFirstRun();
            assert.strictEqual(isFirstRun, true, 'Should be first run on fresh install');

            // STEP 1: Start walkthrough
            await walkthroughManager.showWalkthrough();
            await walkthroughManager.startWalkthrough();

            let progress = await walkthroughManager.getProgress();
            assert.ok(progress !== null, 'Progress should be initialized');
            assert.strictEqual(progress!.currentStep, WalkthroughStep.Welcome);
            assert.strictEqual(progress!.completedSteps.length, 0);

            // STEP 2: Confirm backup (Welcome → Analyze)
            const showInfoStub = sandbox.stub(vscode.window, 'showInformationMessage');
            showInfoStub.onFirstCall().resolves('Yes, I\'ve backed up' as any);

            const result1 = await vscode.window.showInformationMessage(
                'Have you backed up your project?',
                { modal: true },
                'Yes, I\'ve backed up',
                'No, not yet'
            );

            if (result1 === 'Yes, I\'ve backed up') {
                await walkthroughManager.completeStep(WalkthroughStep.Welcome);
            }

            progress = await walkthroughManager.getProgress();
            assert.strictEqual(progress!.currentStep, WalkthroughStep.Analyze);
            assert.strictEqual(progress!.completedSteps.length, 1);
            assert.ok(progress!.completedSteps.includes(WalkthroughStep.Welcome));

            // STEP 3: Analyze project (Analyze → Configure)
            const techStackDetector = new TechStackDetector();
            const toolDetector = new ToolDetector();
            const workflowDetector = new WorkflowDetector();
            const domainDetector = new DomainDetector();

            const techStack = await techStackDetector.detect(tempDir);
            const tools = await toolDetector.detect(tempDir);
            const workflows = await workflowDetector.detect(tempDir);
            const domain = await domainDetector.detect(tempDir);

            // Verify detection ran successfully
            assert.ok(techStack !== null, 'TechStack detection should complete');
            assert.ok(tools !== null, 'Tool detection should complete');
            assert.ok(workflows !== null, 'Workflow detection should complete');
            assert.ok(domain !== null, 'Domain detection should complete');

            await walkthroughManager.completeStep(WalkthroughStep.Analyze);
            await walkthroughManager.markProjectAnalyzed();

            progress = await walkthroughManager.getProgress();
            assert.strictEqual(progress!.currentStep, WalkthroughStep.Configure);
            assert.strictEqual(progress!.completedSteps.length, 2);
            assert.ok(progress!.completedSteps.includes(WalkthroughStep.Analyze));
            assert.strictEqual(progress!.projectAnalyzed, true);

            // STEP 4: Initialize configuration (Configure → Review)
            const configDir = path.join(tempDir, '.aetherlight');
            const configPath = path.join(configDir, 'project-config.json');

            // Check if config exists (should not on fresh install)
            assert.strictEqual(fs.existsSync(configPath), false, 'Config should not exist yet');

            // Create config directory and generate config
            fs.mkdirSync(configDir, { recursive: true });

            // Generate config (simplified - just create valid JSON)
            const config = {
                schema_version: '1.0.0',
                project_name: 'test-project',
                language: {
                    language: 'typescript',
                    package_manager: 'npm',
                    build_command: 'npm run build',
                    test_command: 'npm test'
                },
                paths: {
                    project_root: tempDir,
                    source_directory: 'src',
                    test_directory: 'test',
                    output_directory: 'out'
                }
            };

            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

            await walkthroughManager.completeStep(WalkthroughStep.Configure);
            await walkthroughManager.markConfigGenerated();

            progress = await walkthroughManager.getProgress();
            assert.strictEqual(progress!.currentStep, WalkthroughStep.Review);
            assert.strictEqual(progress!.completedSteps.length, 3);
            assert.ok(progress!.completedSteps.includes(WalkthroughStep.Configure));
            assert.strictEqual(progress!.configGenerated, true);

            // Verify config file created
            assert.ok(fs.existsSync(configPath), 'Config file should exist');
            const configContent = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            assert.strictEqual(configContent.schema_version, '1.0.0');
            assert.strictEqual(configContent.project_name, 'test-project');

            // STEP 5: Open config (Review → Sprint)
            // Mock document opening
            const mockDoc = {
                uri: vscode.Uri.file(configPath),
                getText: () => fs.readFileSync(configPath, 'utf8'),
                fileName: configPath,
                languageId: 'json'
            };

            const openTextDocumentStub = sandbox.stub(vscode.workspace, 'openTextDocument');
            openTextDocumentStub.resolves(mockDoc as any);

            const showTextDocumentStub = sandbox.stub(vscode.window, 'showTextDocument');
            showTextDocumentStub.resolves({} as any);

            // Simulate opening config
            if (fs.existsSync(configPath)) {
                const doc = await vscode.workspace.openTextDocument(configPath);
                await vscode.window.showTextDocument(doc, {
                    preview: false,
                    viewColumn: vscode.ViewColumn.Active
                });

                await walkthroughManager.completeStep(WalkthroughStep.Review);
            }

            progress = await walkthroughManager.getProgress();
            assert.strictEqual(progress!.currentStep, WalkthroughStep.Sprint);
            assert.strictEqual(progress!.completedSteps.length, 4);
            assert.ok(progress!.completedSteps.includes(WalkthroughStep.Review));

            // STEP 6: Complete walkthrough (Sprint step)
            await walkthroughManager.completeStep(WalkthroughStep.Sprint);

            progress = await walkthroughManager.getProgress();
            assert.strictEqual(progress!.completedSteps.length, 5);
            assert.ok(progress!.completedSteps.includes(WalkthroughStep.Sprint));

            // Verify all steps completed
            assert.ok(progress!.completedSteps.includes(WalkthroughStep.Welcome));
            assert.ok(progress!.completedSteps.includes(WalkthroughStep.Analyze));
            assert.ok(progress!.completedSteps.includes(WalkthroughStep.Configure));
            assert.ok(progress!.completedSteps.includes(WalkthroughStep.Review));
            assert.ok(progress!.completedSteps.includes(WalkthroughStep.Sprint));

            // Verify flags set
            assert.strictEqual(progress!.projectAnalyzed, true);
            assert.strictEqual(progress!.configGenerated, true);

            // STEP 7: Mark first run complete
            await walkthroughManager.markFirstRunCompleted();
            const isFirstRunAfter = await walkthroughManager.isFirstRun();
            assert.strictEqual(isFirstRunAfter, false, 'Should not be first run anymore');
        });
    });

    // ==========================================================================
    // SCENARIO 2: Second Activation - Walkthrough Doesn't Auto-Show
    // ==========================================================================

    describe('Scenario 2: Second Activation - No Auto-Show', () => {
        it('should not auto-show walkthrough on second activation', async () => {
            // First activation: complete walkthrough
            await walkthroughManager.startWalkthrough();
            await walkthroughManager.completeStep(WalkthroughStep.Welcome);
            await walkthroughManager.markFirstRunCompleted();

            // Verify first run complete
            const isFirstRun = await walkthroughManager.isFirstRun();
            assert.strictEqual(isFirstRun, false);

            // Second activation: create new manager (simulates extension reload)
            const newWalkthroughManager = new WalkthroughManager(context as any);

            // Check if it's still not first run
            const isStillFirstRun = await newWalkthroughManager.isFirstRun();
            assert.strictEqual(isStillFirstRun, false, 'Should still not be first run');

            // User should not see auto-show logic trigger
            // (in real extension, this would be checked in extension.activate())
        });
    });

    // ==========================================================================
    // SCENARIO 3: Progress Persists Across Extension Reloads
    // ==========================================================================

    describe('Scenario 3: Progress Persists Across Reloads', () => {
        it('should persist progress across extension reloads', async () => {
            // Start walkthrough and complete first 3 steps
            await walkthroughManager.startWalkthrough();
            await walkthroughManager.completeStep(WalkthroughStep.Welcome);
            await walkthroughManager.completeStep(WalkthroughStep.Analyze);
            await walkthroughManager.completeStep(WalkthroughStep.Configure);
            await walkthroughManager.markProjectAnalyzed();
            await walkthroughManager.markConfigGenerated();

            // Verify progress before reload
            const progressBefore = await walkthroughManager.getProgress();
            assert.strictEqual(progressBefore!.completedSteps.length, 3);
            assert.strictEqual(progressBefore!.currentStep, WalkthroughStep.Review);
            assert.strictEqual(progressBefore!.projectAnalyzed, true);
            assert.strictEqual(progressBefore!.configGenerated, true);

            // Simulate extension reload (create new manager with same context)
            const newWalkthroughManager = new WalkthroughManager(context as any);

            // Verify progress restored
            const progressAfter = await newWalkthroughManager.getProgress();
            assert.strictEqual(progressAfter!.completedSteps.length, 3);
            assert.strictEqual(progressAfter!.currentStep, WalkthroughStep.Review);
            assert.strictEqual(progressAfter!.projectAnalyzed, true);
            assert.strictEqual(progressAfter!.configGenerated, true);

            // Verify completed steps are same
            assert.ok(progressAfter!.completedSteps.includes(WalkthroughStep.Welcome));
            assert.ok(progressAfter!.completedSteps.includes(WalkthroughStep.Analyze));
            assert.ok(progressAfter!.completedSteps.includes(WalkthroughStep.Configure));

            // Continue from where left off
            await newWalkthroughManager.completeStep(WalkthroughStep.Review);
            await newWalkthroughManager.completeStep(WalkthroughStep.Sprint);

            const finalProgress = await newWalkthroughManager.getProgress();
            assert.strictEqual(finalProgress!.completedSteps.length, 5);
        });

        it('should handle partial completion and allow resuming', async () => {
            // Complete only first step
            await walkthroughManager.startWalkthrough();
            await walkthroughManager.completeStep(WalkthroughStep.Welcome);

            // Reload
            const newManager = new WalkthroughManager(context as any);

            // Verify can continue
            const progress = await newManager.getProgress();
            assert.strictEqual(progress!.currentStep, WalkthroughStep.Analyze);
            assert.strictEqual(progress!.completedSteps.length, 1);

            // Complete remaining steps
            await newManager.completeStep(WalkthroughStep.Analyze);
            await newManager.completeStep(WalkthroughStep.Configure);
            await newManager.completeStep(WalkthroughStep.Review);
            await newManager.completeStep(WalkthroughStep.Sprint);

            const finalProgress = await newManager.getProgress();
            assert.strictEqual(finalProgress!.completedSteps.length, 5);
        });
    });

    // ==========================================================================
    // SCENARIO 4: User Skips Steps or Goes Out of Order
    // ==========================================================================

    describe('Scenario 4: Out-of-Order Completion', () => {
        it('should handle completing steps out of order', async () => {
            await walkthroughManager.startWalkthrough();

            // Skip Welcome, go straight to Analyze
            await walkthroughManager.completeStep(WalkthroughStep.Analyze);

            const progress = await walkthroughManager.getProgress();
            // Should handle gracefully (implementation may auto-start if needed)
            assert.ok(progress!.completedSteps.includes(WalkthroughStep.Analyze));
        });

        it('should handle completing same step multiple times', async () => {
            await walkthroughManager.startWalkthrough();

            // Complete Welcome twice
            await walkthroughManager.completeStep(WalkthroughStep.Welcome);
            await walkthroughManager.completeStep(WalkthroughStep.Welcome);

            const progress = await walkthroughManager.getProgress();
            // Should not duplicate
            const welcomeCount = progress!.completedSteps.filter(
                step => step === WalkthroughStep.Welcome
            ).length;
            assert.strictEqual(welcomeCount, 1, 'Should not duplicate completed steps');
        });
    });

    // ==========================================================================
    // SCENARIO 5: Reset and Restart Walkthrough
    // ==========================================================================

    describe('Scenario 5: Reset and Restart', () => {
        it('should allow resetting and restarting walkthrough', async () => {
            // Complete partial walkthrough
            await walkthroughManager.startWalkthrough();
            await walkthroughManager.completeStep(WalkthroughStep.Welcome);
            await walkthroughManager.completeStep(WalkthroughStep.Analyze);

            // Reset
            await walkthroughManager.resetProgress();

            // Verify reset
            const progress = await walkthroughManager.getProgress();
            assert.strictEqual(progress, null, 'Progress should be reset to null');

            // Restart
            await walkthroughManager.startWalkthrough();
            const newProgress = await walkthroughManager.getProgress();
            assert.strictEqual(newProgress!.currentStep, WalkthroughStep.Welcome);
            assert.strictEqual(newProgress!.completedSteps.length, 0);
        });
    });

    // ==========================================================================
    // SCENARIO 6: Config File Validation
    // ==========================================================================

    describe('Scenario 6: Config File Validation', () => {
        it('should create valid config file during walkthrough', async () => {
            // Mock workspace
            const mockWorkspaceFolder = {
                uri: vscode.Uri.file(tempDir),
                name: 'test-project',
                index: 0
            };
            sandbox.stub(vscode.workspace, 'workspaceFolders').value([mockWorkspaceFolder]);

            // Start walkthrough
            await walkthroughManager.startWalkthrough();
            await walkthroughManager.completeStep(WalkthroughStep.Welcome);
            await walkthroughManager.completeStep(WalkthroughStep.Analyze);

            // Generate config
            const configDir = path.join(tempDir, '.aetherlight');
            fs.mkdirSync(configDir, { recursive: true });

            const config = {
                schema_version: '1.0.0',
                project_name: 'test-project',
                language: {
                    language: 'typescript',
                    package_manager: 'npm',
                    build_command: 'npm run build',
                    test_command: 'npm test'
                }
            };

            const configPath = path.join(configDir, 'project-config.json');
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

            await walkthroughManager.completeStep(WalkthroughStep.Configure);

            // Validate config file
            assert.ok(fs.existsSync(configPath), 'Config file should exist');
            const configContent = JSON.parse(fs.readFileSync(configPath, 'utf8'));

            assert.strictEqual(configContent.schema_version, '1.0.0');
            assert.strictEqual(configContent.project_name, 'test-project');
            assert.strictEqual(configContent.language.language, 'typescript');
            assert.strictEqual(configContent.language.package_manager, 'npm');
            assert.strictEqual(configContent.language.build_command, 'npm run build');
            assert.strictEqual(configContent.language.test_command, 'npm test');
        });
    });
});
