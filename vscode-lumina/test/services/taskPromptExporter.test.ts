import * as assert from 'assert';
import * as vscode from 'vscode';
import { TaskPromptExporter } from '../../src/services/TaskPromptExporter';

describe('TaskPromptExporter', () => {
    let exporter: TaskPromptExporter;

    beforeEach(() => {
        exporter = new TaskPromptExporter();
    });

    describe('findAetherlightTerminal()', () => {
        it('should find active aetherlight terminal', async () => {
            // Mock terminal with 'aetherlight' in name
            const mockTerminal = {
                name: 'ÆtherLight Terminal',
                sendText: () => {},
                show: () => {}
            } as vscode.Terminal;

            // Mock vscode.window.terminals
            const originalTerminals = vscode.window.terminals;
            Object.defineProperty(vscode.window, 'terminals', {
                value: [mockTerminal],
                configurable: true
            });

            const result = await exporter.findAetherlightTerminal();

            assert.strictEqual(result, mockTerminal);

            // Restore
            Object.defineProperty(vscode.window, 'terminals', {
                value: originalTerminals,
                configurable: true
            });
        });

        it('should find active clod terminal', async () => {
            const mockTerminal = {
                name: 'clod - Claude Code',
                sendText: () => {},
                show: () => {}
            } as vscode.Terminal;

            const originalTerminals = vscode.window.terminals;
            Object.defineProperty(vscode.window, 'terminals', {
                value: [mockTerminal],
                configurable: true
            });

            const result = await exporter.findAetherlightTerminal();

            assert.strictEqual(result, mockTerminal);

            Object.defineProperty(vscode.window, 'terminals', {
                value: originalTerminals,
                configurable: true
            });
        });

        it('should return null when no aetherlight/clod terminal exists', async () => {
            const originalTerminals = vscode.window.terminals;
            Object.defineProperty(vscode.window, 'terminals', {
                value: [
                    { name: 'bash', sendText: () => {}, show: () => {} },
                    { name: 'powershell', sendText: () => {}, show: () => {} }
                ],
                configurable: true
            });

            const result = await exporter.findAetherlightTerminal();

            assert.strictEqual(result, null);

            Object.defineProperty(vscode.window, 'terminals', {
                value: originalTerminals,
                configurable: true
            });
        });
    });

    describe('launchNewSession()', () => {
        it('should create new terminal with correct name', async () => {
            let createdTerminal: vscode.Terminal | null = null;
            const originalCreateTerminal = vscode.window.createTerminal;

            // Mock createTerminal
            (vscode.window as any).createTerminal = (name: string) => {
                createdTerminal = {
                    name: name,
                    sendText: () => {},
                    show: () => {},
                    dispose: () => {}
                } as vscode.Terminal;
                return createdTerminal;
            };

            const terminal = await exporter.launchNewSession();

            assert.notStrictEqual(terminal, null);
            assert.strictEqual(terminal?.name, 'ÆtherLight Task Export');

            // Restore
            (vscode.window as any).createTerminal = originalCreateTerminal;
        });

        it('should send aetherlight command', async () => {
            const commands: string[] = [];
            const mockTerminal = {
                name: 'ÆtherLight Task Export',
                sendText: (text: string) => { commands.push(text); },
                show: () => {},
                dispose: () => {}
            } as vscode.Terminal;

            const originalCreateTerminal = vscode.window.createTerminal;
            (vscode.window as any).createTerminal = () => mockTerminal;

            await exporter.launchNewSession();

            assert.ok(commands.includes('aetherlight'));

            (vscode.window as any).createTerminal = originalCreateTerminal;
        });

        it('should send clod command after aetherlight', async () => {
            const commands: string[] = [];
            const mockTerminal = {
                name: 'ÆtherLight Task Export',
                sendText: (text: string) => { commands.push(text); },
                show: () => {},
                dispose: () => {}
            } as vscode.Terminal;

            const originalCreateTerminal = vscode.window.createTerminal;
            (vscode.window as any).createTerminal = () => mockTerminal;

            await exporter.launchNewSession();

            assert.ok(commands.includes('clod'));
            assert.ok(commands.indexOf('aetherlight') < commands.indexOf('clod'));

            (vscode.window as any).createTerminal = originalCreateTerminal;
        });
    });

    describe('captureTerminalOutput()', () => {
        it('should capture output until end marker', async () => {
            const terminalOutput = `
## 📋 Task Prompt for TEST-001

### Task Metadata
- ID: TEST-001

--- END PROMPT ---
            `.trim();

            const mockTerminal = {
                name: 'test',
                sendText: () => {},
                show: () => {}
            } as vscode.Terminal;

            // This will require terminal buffer access implementation
            const result = await exporter.captureTerminalOutput(mockTerminal, 1000);

            // For now, this will fail until we implement buffer reading
            assert.ok(result.includes('Task Prompt for TEST-001'));
            assert.ok(!result.includes('--- END PROMPT ---')); // End marker should be stripped
        });

        it('should timeout if end marker not found', async () => {
            const mockTerminal = {
                name: 'test',
                sendText: () => {},
                show: () => {}
            } as vscode.Terminal;

            // Should timeout after 100ms
            try {
                await exporter.captureTerminalOutput(mockTerminal, 100);
                assert.fail('Should have thrown timeout error');
            } catch (error: any) {
                assert.ok(error.message.includes('timeout'));
            }
        });
    });

    describe('exportTask()', () => {
        it('should use active terminal when available', async () => {
            const mockTerminal = {
                name: 'aetherlight',
                sendText: () => {},
                show: () => {}
            } as vscode.Terminal;

            const originalTerminals = vscode.window.terminals;
            Object.defineProperty(vscode.window, 'terminals', {
                value: [mockTerminal],
                configurable: true
            });

            // Mock captureTerminalOutput to return test prompt
            exporter.captureTerminalOutput = async () => '## Test Prompt';

            const result = await exporter.exportTask('PROTECT-001');

            assert.ok(result.includes('Test Prompt'));

            Object.defineProperty(vscode.window, 'terminals', {
                value: originalTerminals,
                configurable: true
            });
        });

        it('should launch new session when no terminal available', async () => {
            const originalTerminals = vscode.window.terminals;
            Object.defineProperty(vscode.window, 'terminals', {
                value: [],
                configurable: true
            });

            let launchCalled = false;
            exporter.launchNewSession = async () => {
                launchCalled = true;
                return {
                    name: 'new',
                    sendText: () => {},
                    show: () => {}
                } as vscode.Terminal;
            };

            exporter.captureTerminalOutput = async () => '## Test Prompt';

            await exporter.exportTask('PROTECT-001');

            assert.strictEqual(launchCalled, true);

            Object.defineProperty(vscode.window, 'terminals', {
                value: originalTerminals,
                configurable: true
            });
        });

        it('should send correct export command', async () => {
            let sentCommand: string = '';
            const mockTerminal = {
                name: 'aetherlight',
                sendText: (text: string) => { sentCommand = text; },
                show: () => {}
            } as vscode.Terminal;

            const originalTerminals = vscode.window.terminals;
            Object.defineProperty(vscode.window, 'terminals', {
                value: [mockTerminal],
                configurable: true
            });

            exporter.captureTerminalOutput = async () => '## Test Prompt';

            await exporter.exportTask('PROTECT-001');

            assert.strictEqual(sentCommand, 'export prompt for PROTECT-001');

            Object.defineProperty(vscode.window, 'terminals', {
                value: originalTerminals,
                configurable: true
            });
        });
    });

    describe('analyzeProjectState()', () => {
        it('should return git diff since task created', async () => {
            const state = await exporter.analyzeProjectState('PROTECT-001');

            assert.ok(state.hasOwnProperty('gitDiff'));
            assert.ok(typeof state.gitDiff === 'string');
        });

        it('should return completed tasks', async () => {
            const state = await exporter.analyzeProjectState('PROTECT-001');

            assert.ok(state.hasOwnProperty('completedTasks'));
            assert.ok(Array.isArray(state.completedTasks));
        });

        it('should return modified files', async () => {
            const state = await exporter.analyzeProjectState('PROTECT-001');

            assert.ok(state.hasOwnProperty('modifiedFiles'));
            assert.ok(Array.isArray(state.modifiedFiles));
        });
    });
});
