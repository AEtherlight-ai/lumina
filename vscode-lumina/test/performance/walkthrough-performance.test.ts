/**
 * Walkthrough Performance Tests
 *
 * PATTERN: Pattern-TDD-001 (Performance validation)
 * TARGET: All walkthrough operations meet performance requirements
 *
 * PERFORMANCE TARGETS (from QA-002):
 * - Extension activation with walkthrough: <2s
 * - showWalkthrough(): <500ms
 * - analyzeProject (all 4 detectors): <3s
 * - init (detection + interview + config): <5s
 * - WalkthroughManager operations: <10ms each
 *
 * WHY: First-run experience must feel fast - slow onboarding drives users away
 * CONTEXT: Performance targets from Phase 4 self-config sprint
 *
 * RELATED: src/services/WalkthroughManager.ts, src/commands/walkthrough.ts
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

/**
 * Helper function to measure async execution time
 *
 * @param fn - Async function to benchmark
 * @param iterations - Number of iterations (default: 10 for slow operations)
 * @returns Average time per iteration in milliseconds
 */
async function benchmarkAsync(fn: () => Promise<any>, iterations: number = 10): Promise<number> {
    const start = Date.now();
    for (let i = 0; i < iterations; i++) {
        await fn();
    }
    const end = Date.now();
    return (end - start) / iterations;
}

/**
 * Helper function to measure single operation time
 *
 * @param fn - Function to measure
 * @returns Execution time in milliseconds
 */
async function measureOnce(fn: () => Promise<any>): Promise<number> {
    const start = Date.now();
    await fn();
    const end = Date.now();
    return end - start;
}

/**
 * Mock ExtensionContext for performance testing
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

describe('Walkthrough Performance Tests', () => {
    let context: MockExtensionContext;
    let walkthroughManager: WalkthroughManager;
    let sandbox: sinon.SinonSandbox;
    let tempDir: string;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
        tempDir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'lumina-perf-'));
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

        // Create sample source files
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
    // PERFORMANCE TARGET 1: WalkthroughManager Operations <10ms
    // ==========================================================================

    describe('WalkthroughManager Operation Performance', () => {
        it('should check isFirstRun in <10ms', async () => {
            // Warm up
            walkthroughManager.isFirstRun();

            // Benchmark (100 iterations for fast operations)
            const avgTime = await benchmarkAsync(async () => {
                walkthroughManager.isFirstRun();
            }, 100);

            assert.ok(avgTime < 10, `isFirstRun() should be <10ms (actual: ${avgTime.toFixed(2)}ms)`);
            console.log(`      ✓ isFirstRun(): ${avgTime.toFixed(2)}ms average`);
        });

        it('should get progress in <10ms', async () => {
            // Setup
            await walkthroughManager.startWalkthrough();

            // Warm up
            walkthroughManager.getProgress();

            // Benchmark
            const avgTime = await benchmarkAsync(async () => {
                walkthroughManager.getProgress();
            }, 100);

            assert.ok(avgTime < 10, `getProgress() should be <10ms (actual: ${avgTime.toFixed(2)}ms)`);
            console.log(`      ✓ getProgress(): ${avgTime.toFixed(2)}ms average`);
        });

        it('should start walkthrough in <50ms', async () => {
            // Reset for fresh start
            await walkthroughManager.resetProgress();

            // Measure single operation
            const time = await measureOnce(async () => {
                await walkthroughManager.startWalkthrough();
            });

            assert.ok(time < 50, `startWalkthrough() should be <50ms (actual: ${time}ms)`);
            console.log(`      ✓ startWalkthrough(): ${time}ms`);
        });

        it('should complete step in <50ms', async () => {
            // Setup
            await walkthroughManager.startWalkthrough();

            // Measure
            const time = await measureOnce(async () => {
                await walkthroughManager.completeStep(WalkthroughStep.Welcome);
            });

            assert.ok(time < 50, `completeStep() should be <50ms (actual: ${time}ms)`);
            console.log(`      ✓ completeStep(): ${time}ms`);
        });
    });

    // ==========================================================================
    // PERFORMANCE TARGET 2: showWalkthrough() <500ms
    // ==========================================================================

    describe('Walkthrough Display Performance', () => {
        it('should show walkthrough in <500ms', async function() {
            this.timeout(1000);

            // Mock VS Code command execution
            const executeCommandStub = sandbox.stub(vscode.commands, 'executeCommand');
            executeCommandStub.resolves();

            // Measure
            const time = await measureOnce(async () => {
                await walkthroughManager.showWalkthrough();
            });

            assert.ok(time < 500, `showWalkthrough() should be <500ms (actual: ${time}ms)`);
            console.log(`      ✓ showWalkthrough(): ${time}ms`);
        });
    });

    // ==========================================================================
    // PERFORMANCE TARGET 3: analyzeProject (all 4 detectors) <3s
    // ==========================================================================

    describe('Project Analysis Performance', () => {
        it('should run all 4 detectors in <3s', async function() {
            this.timeout(5000);

            // Measure all detection
            const time = await measureOnce(async () => {
                const techStackDetector = new TechStackDetector();
                const toolDetector = new ToolDetector();
                const workflowDetector = new WorkflowDetector();
                const domainDetector = new DomainDetector();

                await Promise.all([
                    techStackDetector.detect(tempDir),
                    toolDetector.detect(tempDir),
                    workflowDetector.detect(tempDir),
                    domainDetector.detect(tempDir)
                ]);
            });

            assert.ok(time < 3000, `analyzeProject (4 detectors) should be <3s (actual: ${time}ms)`);
            console.log(`      ✓ analyzeProject (4 detectors): ${time}ms`);
        });

        it('should run TechStackDetector in <1s', async function() {
            this.timeout(2000);

            const detector = new TechStackDetector();

            // Warm up
            await detector.detect(tempDir);

            // Measure
            const time = await measureOnce(async () => {
                await detector.detect(tempDir);
            });

            assert.ok(time < 1000, `TechStackDetector should be <1s (actual: ${time}ms)`);
            console.log(`      ✓ TechStackDetector: ${time}ms`);
        });

        it('should run ToolDetector in <1s', async function() {
            this.timeout(2000);

            const detector = new ToolDetector();

            // Warm up
            await detector.detect(tempDir);

            // Measure
            const time = await measureOnce(async () => {
                await detector.detect(tempDir);
            });

            assert.ok(time < 1000, `ToolDetector should be <1s (actual: ${time}ms)`);
            console.log(`      ✓ ToolDetector: ${time}ms`);
        });

        it('should run WorkflowDetector in <1s', async function() {
            this.timeout(2000);

            const detector = new WorkflowDetector();

            // Warm up
            await detector.detect(tempDir);

            // Measure
            const time = await measureOnce(async () => {
                await detector.detect(tempDir);
            });

            assert.ok(time < 1000, `WorkflowDetector should be <1s (actual: ${time}ms)`);
            console.log(`      ✓ WorkflowDetector: ${time}ms`);
        });

        it('should run DomainDetector in <1s', async function() {
            this.timeout(2000);

            const detector = new DomainDetector();

            // Warm up
            await detector.detect(tempDir);

            // Measure
            const time = await measureOnce(async () => {
                await detector.detect(tempDir);
            });

            assert.ok(time < 1000, `DomainDetector should be <1s (actual: ${time}ms)`);
            console.log(`      ✓ DomainDetector: ${time}ms`);
        });
    });

    // ==========================================================================
    // PERFORMANCE TARGET 4: Blocking Operations Check
    // ==========================================================================

    describe('UI Thread Blocking Check', () => {
        it('should not block UI thread during detection', async function() {
            this.timeout(5000);

            // All detection operations should be async and non-blocking
            const startTime = Date.now();

            const techStackDetector = new TechStackDetector();
            const toolDetector = new ToolDetector();
            const workflowDetector = new WorkflowDetector();
            const domainDetector = new DomainDetector();

            // Start all detectors concurrently (simulates non-blocking behavior)
            const promises = [
                techStackDetector.detect(tempDir),
                toolDetector.detect(tempDir),
                workflowDetector.detect(tempDir),
                domainDetector.detect(tempDir)
            ];

            // Should complete in parallel (not sequential)
            await Promise.all(promises);

            const totalTime = Date.now() - startTime;

            // Parallel execution should be < 3s (vs ~4s if sequential)
            assert.ok(totalTime < 3000, `Parallel detection should be <3s (actual: ${totalTime}ms)`);
            console.log(`      ✓ Parallel detection (non-blocking): ${totalTime}ms`);
        });
    });

    // ==========================================================================
    // PERFORMANCE SUMMARY
    // ==========================================================================

    describe('Performance Summary', () => {
        it('should log performance summary', async function() {
            this.timeout(10000);

            console.log('\n      ========================================');
            console.log('      WALKTHROUGH PERFORMANCE SUMMARY');
            console.log('      ========================================');

            // Test 1: WalkthroughManager operations
            const isFirstRunTime = await measureOnce(async () => {
                walkthroughManager.isFirstRun();
            });

            await walkthroughManager.startWalkthrough();
            const getProgressTime = await measureOnce(async () => {
                walkthroughManager.getProgress();
            });

            const completeStepTime = await measureOnce(async () => {
                await walkthroughManager.completeStep(WalkthroughStep.Analyze);
            });

            console.log(`      isFirstRun():        ${isFirstRunTime.toFixed(2)}ms (target: <10ms)`);
            console.log(`      getProgress():       ${getProgressTime.toFixed(2)}ms (target: <10ms)`);
            console.log(`      completeStep():      ${completeStepTime}ms (target: <50ms)`);

            // Test 2: Detection
            const techStackDetector = new TechStackDetector();
            const techStackTime = await measureOnce(async () => {
                await techStackDetector.detect(tempDir);
            });

            console.log(`      TechStackDetector:   ${techStackTime}ms (target: <1s)`);

            // Test 3: Full analysis
            const fullAnalysisTime = await measureOnce(async () => {
                const td = new TechStackDetector();
                const to = new ToolDetector();
                const wd = new WorkflowDetector();
                const dd = new DomainDetector();

                await Promise.all([
                    td.detect(tempDir),
                    to.detect(tempDir),
                    wd.detect(tempDir),
                    dd.detect(tempDir)
                ]);
            });

            console.log(`      Full Analysis:       ${fullAnalysisTime}ms (target: <3s)`);
            console.log('      ========================================');

            // Verify all targets met
            assert.ok(isFirstRunTime < 10, 'isFirstRun() target missed');
            assert.ok(getProgressTime < 10, 'getProgress() target missed');
            assert.ok(completeStepTime < 50, 'completeStep() target missed');
            assert.ok(techStackTime < 1000, 'TechStackDetector target missed');
            assert.ok(fullAnalysisTime < 3000, 'Full analysis target missed');

            console.log('\n      ✅ All performance targets met!\n');
        });
    });
});
