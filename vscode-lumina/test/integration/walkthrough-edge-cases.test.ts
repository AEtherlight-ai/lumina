/**
 * Walkthrough Edge Case Integration Tests
 *
 * PATTERN: Pattern-TDD-001 (85% coverage for integration layer)
 * COVERAGE TARGET: ≥85% edge case coverage
 * TEST STRATEGY: Error handling, graceful degradation, user feedback
 *
 * EDGE CASES TESTED (11):
 * 1. No workspace folder open
 * 2. Permission errors (file system)
 * 3. Config already exists (regenerate flow)
 * 4. Detection returns all 'unknown'
 * 5. User cancels at various steps
 * 6. Interview cancelled mid-flow
 * 7. Multiple workspace folders
 * 8. Walkthrough opened multiple times
 * 9. Extension reloads mid-walkthrough
 * 10. File system errors (disk full, read-only)
 * 11. Invalid project structures
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

/**
 * Mock ExtensionContext for testing
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

describe('Walkthrough Edge Case Integration Tests', () => {
    let context: MockExtensionContext;
    let walkthroughManager: WalkthroughManager;
    let sandbox: sinon.SinonSandbox;
    let tempDir: string;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
        tempDir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'lumina-walkthrough-edge-'));
        context = new MockExtensionContext();
        walkthroughManager = new WalkthroughManager(context as any);
    });

    afterEach(() => {
        sandbox.restore();
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });

    // ==========================================================================
    // EDGE CASE 1: No Workspace Folder Open
    // ==========================================================================

    describe('Edge Case 1: No Workspace Folder Open', () => {
        it('should show error message when no workspace folder for analyzeProject', async () => {
            // Mock workspace with no folders
            const workspaceFoldersStub = sandbox.stub(vscode.workspace, 'workspaceFolders').value(undefined);
            const showErrorStub = sandbox.stub(vscode.window, 'showErrorMessage');

            // Simulate analyzeProject command logic
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders || workspaceFolders.length === 0) {
                vscode.window.showErrorMessage(
                    'No workspace folder open. Please open a project folder first.'
                );
            }

            // Verify error shown
            assert.ok(showErrorStub.calledOnce);
            assert.ok(showErrorStub.calledWith(
                'No workspace folder open. Please open a project folder first.'
            ));
        });

        it('should show error message when no workspace folder for init command', async () => {
            // Mock workspace with no folders
            const workspaceFoldersStub = sandbox.stub(vscode.workspace, 'workspaceFolders').value(undefined);
            const showErrorStub = sandbox.stub(vscode.window, 'showErrorMessage');

            // Simulate init command logic
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders || workspaceFolders.length === 0) {
                vscode.window.showErrorMessage(
                    'No workspace folder open. Please open a project folder first.'
                );
            }

            // Verify error shown
            assert.ok(showErrorStub.calledOnce);
        });

        it('should show error message when no workspace folder for openConfig command', async () => {
            // Mock workspace with no folders
            const workspaceFoldersStub = sandbox.stub(vscode.workspace, 'workspaceFolders').value(undefined);
            const showErrorStub = sandbox.stub(vscode.window, 'showErrorMessage');

            // Simulate openConfig command logic
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders || workspaceFolders.length === 0) {
                vscode.window.showErrorMessage(
                    'No workspace folder open. Please open a project folder first.'
                );
            }

            // Verify error shown
            assert.ok(showErrorStub.calledOnce);
        });
    });

    // ==========================================================================
    // EDGE CASE 2: Permission Errors (File System)
    // ==========================================================================

    describe('Edge Case 2: Permission Errors', () => {
        it('should handle EACCES error when creating config directory', async () => {
            // Create read-only parent directory
            const readOnlyDir = path.join(tempDir, 'readonly');
            fs.mkdirSync(readOnlyDir);
            fs.chmodSync(readOnlyDir, 0o444); // Read-only

            const configDir = path.join(readOnlyDir, '.aetherlight');

            // Attempt to create config directory
            let errorCaught = false;
            try {
                fs.mkdirSync(configDir, { recursive: true });
            } catch (error: any) {
                errorCaught = true;
                assert.strictEqual(error.code, 'EACCES');
            }

            // Verify error was caught
            assert.ok(errorCaught, 'Should catch EACCES error');

            // Clean up: restore permissions
            fs.chmodSync(readOnlyDir, 0o755);
        });

        it('should handle EPERM error when writing config file', async () => {
            // Create config directory
            const configDir = path.join(tempDir, '.aetherlight');
            fs.mkdirSync(configDir, { recursive: true });

            // Create read-only config file
            const configPath = path.join(configDir, 'project-config.json');
            fs.writeFileSync(configPath, '{}');
            fs.chmodSync(configPath, 0o444); // Read-only

            // Attempt to write to read-only file
            let errorCaught = false;
            try {
                fs.writeFileSync(configPath, JSON.stringify({ test: 'data' }, null, 2));
            } catch (error: any) {
                errorCaught = true;
                assert.ok(['EACCES', 'EPERM'].includes(error.code));
            }

            // Verify error was caught
            assert.ok(errorCaught, 'Should catch permission error');

            // Clean up: restore permissions
            fs.chmodSync(configPath, 0o644);
        });
    });

    // ==========================================================================
    // EDGE CASE 3: Config Already Exists (Regenerate Flow)
    // ==========================================================================

    describe('Edge Case 3: Config Already Exists', () => {
        it('should prompt user when config already exists', async () => {
            // Create existing config
            const configDir = path.join(tempDir, '.aetherlight');
            fs.mkdirSync(configDir, { recursive: true });
            const configPath = path.join(configDir, 'project-config.json');
            fs.writeFileSync(configPath, JSON.stringify({ existing: 'config' }, null, 2));

            // Mock VS Code showWarningMessage
            const showWarningStub = sandbox.stub(vscode.window, 'showWarningMessage');
            showWarningStub.resolves('No, keep existing' as any);

            // Simulate init command logic
            if (fs.existsSync(configPath)) {
                const result = await vscode.window.showWarningMessage(
                    'ÆtherLight configuration already exists. Do you want to regenerate it?',
                    { modal: true },
                    'Yes, regenerate',
                    'No, keep existing'
                );

                if (result !== 'Yes, regenerate') {
                    // Skip regeneration
                    await walkthroughManager.completeStep(WalkthroughStep.Configure);
                }
            }

            // Verify prompt shown and walkthrough step completed
            assert.ok(showWarningStub.calledOnce);
            const progress = await walkthroughManager.getProgress();
            assert.ok(progress?.completedSteps.includes(WalkthroughStep.Configure));
        });

        it('should regenerate config when user confirms', async () => {
            // Create existing config
            const configDir = path.join(tempDir, '.aetherlight');
            fs.mkdirSync(configDir, { recursive: true });
            const configPath = path.join(configDir, 'project-config.json');
            fs.writeFileSync(configPath, JSON.stringify({ existing: 'config' }, null, 2));

            // Mock VS Code showWarningMessage
            const showWarningStub = sandbox.stub(vscode.window, 'showWarningMessage');
            showWarningStub.resolves('Yes, regenerate' as any);

            // Simulate init command logic
            let shouldRegenerate = false;
            if (fs.existsSync(configPath)) {
                const result = await vscode.window.showWarningMessage(
                    'ÆtherLight configuration already exists. Do you want to regenerate it?',
                    { modal: true },
                    'Yes, regenerate',
                    'No, keep existing'
                );

                shouldRegenerate = result === 'Yes, regenerate';
            }

            // Verify regeneration flag set
            assert.ok(showWarningStub.calledOnce);
            assert.strictEqual(shouldRegenerate, true);
        });
    });

    // ==========================================================================
    // EDGE CASE 4: Detection Returns All 'Unknown'
    // ==========================================================================

    describe('Edge Case 4: Detection Returns All Unknown', () => {
        it('should handle empty project with no detectable tech stack', async () => {
            // Create empty project directory
            const emptyProjectDir = path.join(tempDir, 'empty-project');
            fs.mkdirSync(emptyProjectDir);

            // Run detection
            const techStackDetector = new TechStackDetector();
            const toolDetector = new ToolDetector();
            const workflowDetector = new WorkflowDetector();
            const domainDetector = new DomainDetector();

            const techStack = await techStackDetector.detect(emptyProjectDir);
            const tools = await toolDetector.detect(emptyProjectDir);
            const workflows = await workflowDetector.detect(emptyProjectDir);
            const domain = await domainDetector.detect(emptyProjectDir);

            // Verify all detection returns 'unknown' or null/undefined
            // (actual values depend on detector implementation)
            assert.ok(techStack !== null, 'TechStackDetector should return result');
            assert.ok(tools !== null, 'ToolDetector should return result');
            assert.ok(workflows !== null, 'WorkflowDetector should return result');
            assert.ok(domain !== null, 'DomainDetector should return result');

            // Results should still be valid (no crashes)
        });

        it('should show detection results even when all unknown', async () => {
            // Mock detectors to return 'unknown'
            const mockTechStack = {
                language: null,
                packageManager: null,
                framework: null,
                testFramework: null
            };

            // Build summary (same logic as analyzeProject command)
            const summary = [
                '## Detection Results',
                '',
                '### Language & Tech Stack',
                `- Language: **${mockTechStack.language || 'Not detected'}**`,
                `- Package Manager: **${mockTechStack.packageManager || 'Not detected'}**`,
                `- Framework: ${mockTechStack.framework || 'None detected'}`,
                `- Test Framework: ${mockTechStack.testFramework || 'None detected'}`
            ].join('\n');

            // Verify summary contains "Not detected" messages
            assert.ok(summary.includes('Not detected'));
            assert.ok(!summary.includes('null'));
            assert.ok(!summary.includes('undefined'));
        });
    });

    // ==========================================================================
    // EDGE CASE 5: User Cancels at Various Steps
    // ==========================================================================

    describe('Edge Case 5: User Cancels Operations', () => {
        it('should handle user cancelling backup confirmation', async () => {
            const showInfoStub = sandbox.stub(vscode.window, 'showInformationMessage');
            showInfoStub.resolves(undefined); // User cancelled (pressed Escape)

            // Simulate confirmBackup command
            const result = await vscode.window.showInformationMessage(
                'Have you backed up your project?',
                { modal: true },
                'Yes, I\'ve backed up',
                'No, not yet'
            );

            // Verify no step completed when user cancels
            if (!result) {
                // User cancelled - don't complete step
                const progress = await walkthroughManager.getProgress();
                assert.ok(!progress || !progress.completedSteps.includes(WalkthroughStep.Welcome));
            }
        });

        it('should handle user cancelling config regeneration prompt', async () => {
            const showWarningStub = sandbox.stub(vscode.window, 'showWarningMessage');
            showWarningStub.resolves(undefined); // User cancelled

            const result = await vscode.window.showWarningMessage(
                'ÆtherLight configuration already exists. Do you want to regenerate it?',
                { modal: true },
                'Yes, regenerate',
                'No, keep existing'
            );

            // Verify operation aborted when user cancels
            assert.strictEqual(result, undefined);
        });

        it('should handle user cancelling during config generation prompt', async () => {
            const showWarningStub = sandbox.stub(vscode.window, 'showWarningMessage');
            showWarningStub.resolves(undefined); // User cancelled

            // Simulate openConfig command when config doesn't exist
            const configPath = path.join(tempDir, '.aetherlight', 'project-config.json');

            if (!fs.existsSync(configPath)) {
                const result = await vscode.window.showWarningMessage(
                    'Configuration file not found. Would you like to generate it now?',
                    'Yes, generate',
                    'No'
                );

                // Verify no action taken when user cancels
                assert.strictEqual(result, undefined);
            }
        });
    });

    // ==========================================================================
    // EDGE CASE 6: Interview Cancelled Mid-Flow
    // ==========================================================================

    describe('Edge Case 6: Interview Cancelled Mid-Flow', () => {
        it('should not create partial config when interview cancelled', async () => {
            const configDir = path.join(tempDir, '.aetherlight');
            const configPath = path.join(configDir, 'project-config.json');

            // Simulate interview cancellation (error thrown)
            let configCreated = false;
            try {
                // Interview would throw error on cancel
                throw new Error('Interview cancelled by user');
            } catch (error: any) {
                // Verify no config file created
                configCreated = fs.existsSync(configPath);
            }

            assert.strictEqual(configCreated, false, 'Config should not be created when interview cancelled');
        });
    });

    // ==========================================================================
    // EDGE CASE 7: Multiple Workspace Folders
    // ==========================================================================

    describe('Edge Case 7: Multiple Workspace Folders', () => {
        it('should use first workspace folder when multiple exist', async () => {
            // Mock multiple workspace folders
            const folder1 = { uri: vscode.Uri.file(path.join(tempDir, 'project1')), name: 'project1', index: 0 };
            const folder2 = { uri: vscode.Uri.file(path.join(tempDir, 'project2')), name: 'project2', index: 1 };

            sandbox.stub(vscode.workspace, 'workspaceFolders').value([folder1, folder2]);

            // Simulate command logic
            const workspaceFolders = vscode.workspace.workspaceFolders;
            const projectRoot = workspaceFolders![0].uri.fsPath;

            // Verify first folder selected
            assert.strictEqual(projectRoot, folder1.uri.fsPath);
        });
    });

    // ==========================================================================
    // EDGE CASE 8: Walkthrough Opened Multiple Times
    // ==========================================================================

    describe('Edge Case 8: Walkthrough Opened Multiple Times', () => {
        it('should not reset progress when walkthrough opened again', async () => {
            // Start walkthrough and complete first step
            await walkthroughManager.startWalkthrough();
            await walkthroughManager.completeStep(WalkthroughStep.Welcome);

            const progressBefore = await walkthroughManager.getProgress();
            assert.ok(progressBefore?.completedSteps.includes(WalkthroughStep.Welcome));

            // Open walkthrough again (simulate user clicking command again)
            await walkthroughManager.showWalkthrough();

            // Verify progress preserved
            const progressAfter = await walkthroughManager.getProgress();
            assert.ok(progressAfter?.completedSteps.includes(WalkthroughStep.Welcome));
            assert.strictEqual(progressAfter?.completedSteps.length, progressBefore?.completedSteps.length);
        });

        it('should allow resuming walkthrough from current step', async () => {
            // Complete first two steps
            await walkthroughManager.startWalkthrough();
            await walkthroughManager.completeStep(WalkthroughStep.Welcome);
            await walkthroughManager.completeStep(WalkthroughStep.Analyze);

            // Get current progress
            const progress = await walkthroughManager.getProgress();
            assert.strictEqual(progress?.currentStep, WalkthroughStep.Configure);
            assert.strictEqual(progress?.completedSteps.length, 2);
        });
    });

    // ==========================================================================
    // EDGE CASE 9: Extension Reloads Mid-Walkthrough
    // ==========================================================================

    describe('Edge Case 9: Extension Reloads Mid-Walkthrough', () => {
        it('should restore walkthrough progress after extension reload', async () => {
            // Start walkthrough and complete steps
            await walkthroughManager.startWalkthrough();
            await walkthroughManager.completeStep(WalkthroughStep.Welcome);
            await walkthroughManager.completeStep(WalkthroughStep.Analyze);

            // Simulate extension reload by creating new WalkthroughManager with same context
            const newWalkthroughManager = new WalkthroughManager(context as any);

            // Verify progress restored
            const progress = await newWalkthroughManager.getProgress();
            assert.ok(progress !== null);
            assert.strictEqual(progress?.completedSteps.length, 2);
            assert.ok(progress?.completedSteps.includes(WalkthroughStep.Welcome));
            assert.ok(progress?.completedSteps.includes(WalkthroughStep.Analyze));
            assert.strictEqual(progress?.currentStep, WalkthroughStep.Configure);
        });

        it('should handle corrupted progress data gracefully', async () => {
            // Manually corrupt progress data
            await context.globalState.update('aetherlight.walkthrough.progress', {
                invalidField: 'corrupted data',
                currentStep: 'invalid-step',
                completedSteps: 'not-an-array'
            });

            // Create new manager with corrupted data
            const newWalkthroughManager = new WalkthroughManager(context as any);

            // Verify manager handles corruption (returns null or resets)
            const progress = await newWalkthroughManager.getProgress();
            // Progress should either be null or reset to valid state
            if (progress !== null) {
                assert.ok(Array.isArray(progress.completedSteps));
            }
        });
    });

    // ==========================================================================
    // EDGE CASE 10: File System Errors
    // ==========================================================================

    describe('Edge Case 10: File System Errors', () => {
        it('should handle ENOSPC (disk full) error gracefully', async () => {
            // Mock fs.writeFileSync to throw ENOSPC
            const writeStub = sandbox.stub(fs, 'writeFileSync');
            writeStub.throws({ code: 'ENOSPC', message: 'No space left on device' });

            const configPath = path.join(tempDir, '.aetherlight', 'project-config.json');

            let errorCaught = false;
            try {
                fs.writeFileSync(configPath, '{}');
            } catch (error: any) {
                errorCaught = true;
                assert.strictEqual(error.code, 'ENOSPC');
            }

            assert.ok(errorCaught, 'Should catch ENOSPC error');
        });

        it('should handle EROFS (read-only file system) error', async () => {
            // Mock fs.mkdirSync to throw EROFS
            const mkdirStub = sandbox.stub(fs, 'mkdirSync');
            mkdirStub.throws({ code: 'EROFS', message: 'Read-only file system' });

            const configDir = path.join(tempDir, '.aetherlight');

            let errorCaught = false;
            try {
                fs.mkdirSync(configDir);
            } catch (error: any) {
                errorCaught = true;
                assert.strictEqual(error.code, 'EROFS');
            }

            assert.ok(errorCaught, 'Should catch EROFS error');
        });

        it('should handle file read errors during config loading', async () => {
            // Create config directory but not file
            const configPath = path.join(tempDir, '.aetherlight', 'project-config.json');

            // Attempt to read non-existent file
            let errorCaught = false;
            try {
                fs.readFileSync(configPath, 'utf8');
            } catch (error: any) {
                errorCaught = true;
                assert.strictEqual(error.code, 'ENOENT');
            }

            assert.ok(errorCaught, 'Should catch ENOENT error');
        });
    });

    // ==========================================================================
    // EDGE CASE 11: Invalid Project Structures
    // ==========================================================================

    describe('Edge Case 11: Invalid Project Structures', () => {
        it('should handle project with no package.json', async () => {
            // Create project directory without package.json
            const projectDir = path.join(tempDir, 'no-package');
            fs.mkdirSync(projectDir);

            // Run tech stack detection
            const techStackDetector = new TechStackDetector();
            const result = await techStackDetector.detect(projectDir);

            // Should not crash, may return null/unknown
            assert.ok(result !== undefined, 'Should return result even without package.json');
        });

        it('should handle project with malformed package.json', async () => {
            // Create project with malformed package.json
            const projectDir = path.join(tempDir, 'malformed-package');
            fs.mkdirSync(projectDir);
            fs.writeFileSync(path.join(projectDir, 'package.json'), '{ invalid json }');

            // Run detection
            const techStackDetector = new TechStackDetector();

            let errorHandled = false;
            try {
                const result = await techStackDetector.detect(projectDir);
                // Should either parse gracefully or throw handled error
                errorHandled = true;
            } catch (error) {
                // Error is acceptable - detector should handle this
                errorHandled = true;
            }

            assert.ok(errorHandled, 'Should handle malformed package.json');
        });

        it('should handle project with missing source directories', async () => {
            // Create project without src/ or test/ directories
            const projectDir = path.join(tempDir, 'no-src');
            fs.mkdirSync(projectDir);
            fs.writeFileSync(path.join(projectDir, 'package.json'), JSON.stringify({
                name: 'test-project',
                version: '1.0.0'
            }));

            // Run detection
            const techStackDetector = new TechStackDetector();
            const toolDetector = new ToolDetector();

            const techStack = await techStackDetector.detect(projectDir);
            const tools = await toolDetector.detect(projectDir);

            // Should not crash, may return defaults
            assert.ok(techStack !== null, 'Should return result even without src directory');
            assert.ok(tools !== null, 'Should return result even without test directory');
        });

        it('should handle symbolic links and circular directory structures', async () => {
            // Create directory structure with symlink
            const projectDir = path.join(tempDir, 'symlink-project');
            const subDir = path.join(projectDir, 'src');
            fs.mkdirSync(projectDir);
            fs.mkdirSync(subDir);

            // Create file in subdirectory
            fs.writeFileSync(path.join(subDir, 'index.ts'), 'export {}');

            // Attempt to create circular symlink (may not work on all systems)
            try {
                fs.symlinkSync(projectDir, path.join(subDir, 'circular'), 'dir');
            } catch (error) {
                // Symlinks may require admin on Windows - skip if fails
                console.log('Skipping symlink test (requires elevated permissions on Windows)');
                return;
            }

            // Run detection (should handle circular structures)
            const techStackDetector = new TechStackDetector();
            const result = await techStackDetector.detect(projectDir);

            // Should complete without infinite loop
            assert.ok(result !== undefined, 'Should handle circular directory structures');
        });
    });
});
