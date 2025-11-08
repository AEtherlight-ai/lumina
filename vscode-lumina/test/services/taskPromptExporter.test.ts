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

    describe('generateEnhancedPromptFromTemplate() - PROTECT-000F', () => {
        // Test 1: Happy path - Template with all variables generates enhanced prompt
        it('should generate enhanced prompt from template task object', async () => {
            const templateTask = {
                id: 'CODE-ANALYZER-TEMPLATE',
                name: 'Analyze workspace structure',
                description: 'Analyze workspace for patterns and recommendations',
                agent: 'infrastructure-agent',
                patterns: ['Pattern-CODE-001'],
                variables: {
                    workspaceRoot: '/test/workspace',
                    languages: 'TypeScript, Rust',
                    frameworks: 'VS Code, Tauri'
                }
            };

            const prompt = await exporter.generateEnhancedPromptFromTemplate(templateTask);

            // Should include task metadata
            assert.ok(prompt.includes('CODE-ANALYZER-TEMPLATE'));
            assert.ok(prompt.includes('Analyze workspace structure'));

            // Should include variables
            assert.ok(prompt.includes('TypeScript, Rust') || prompt.includes('languages'));
            assert.ok(prompt.includes('VS Code, Tauri') || prompt.includes('frameworks'));
        });

        // Test 2: Template with gaps triggers question flow
        it('should return questions when gaps detected in template', async () => {
            const templateTask = {
                id: 'BUG-REPORT-TEMPLATE',
                name: 'Report bug',
                description: 'Report a bug with steps to reproduce',
                agent: 'infrastructure-agent',
                // Missing files_to_modify - should trigger gap detection
                variables: {
                    title: 'Button not working'
                }
            };

            const result = await exporter.generateEnhancedPromptFromTemplate(templateTask);

            // Should contain question markers if gaps found
            // TaskAnalyzer returns questions format when gaps detected
            assert.ok(result.includes('Gap') || result.includes('question') || result.includes('?'));
        });

        // Test 3: Template with answers fills gaps and generates prompt
        it('should fill gaps with answers and generate prompt', async () => {
            const templateTask = {
                id: 'FEATURE-REQUEST-TEMPLATE',
                name: 'Request new feature',
                description: 'Request a new feature for the project',
                agent: 'infrastructure-agent',
                patterns: ['Pattern-CODE-001'],
                variables: {
                    feature: 'Dark mode toggle',
                    priority: 'high'
                },
                answers: {
                    'files_to_modify': ['src/theme.ts', 'src/config.ts']
                }
            };

            const prompt = await exporter.generateEnhancedPromptFromTemplate(templateTask);

            // Should include feature details
            assert.ok(prompt.includes('Dark mode toggle'));
            assert.ok(prompt.includes('FEATURE-REQUEST-TEMPLATE'));
        });

        // Test 4: Invalid template throws error
        it('should throw error for invalid template (missing required fields)', async () => {
            const invalidTemplate = {
                // Missing id, name, description
                agent: 'infrastructure-agent'
            };

            try {
                await exporter.generateEnhancedPromptFromTemplate(invalidTemplate as any);
                assert.fail('Should have thrown error for invalid template');
            } catch (error: any) {
                assert.ok(error.message.includes('invalid') || error.message.includes('required'));
            }
        });

        // Test 5: Template uses TaskAnalyzer for gap detection
        it('should call TaskAnalyzer.analyzeTask() with template task', async () => {
            const templateTask = {
                id: 'SPRINT-PLANNER-TEMPLATE',
                name: 'Plan sprint',
                description: 'Create sprint plan for next iteration',
                agent: 'planning-agent',
                patterns: ['Pattern-SPRINT-PLAN-001'],
                variables: {
                    sprint_goals: 'Complete Phase 3',
                    duration: '2 weeks'
                }
            };

            // Mock TaskAnalyzer to track calls
            let analyzeTaskCalled = false;
            const originalAnalyzeTask = exporter['analyzer'].analyzeTask;
            exporter['analyzer'].analyzeTask = async (task: any) => {
                analyzeTaskCalled = true;
                assert.strictEqual(task.id, 'SPRINT-PLANNER-TEMPLATE');
                return { status: 'ready', confidence: 0.9 };
            };

            await exporter.generateEnhancedPromptFromTemplate(templateTask);

            assert.strictEqual(analyzeTaskCalled, true, 'TaskAnalyzer.analyzeTask should be called');

            // Restore
            exporter['analyzer'].analyzeTask = originalAnalyzeTask;
        });

        // Test 6: Template with form data (Bug Report)
        it('should handle template with form data as variables', async () => {
            const formData = {
                title: 'Extension crashes on startup',
                steps: '1. Open VS Code\n2. Activate extension\n3. Crashes',
                expected: 'Extension should load',
                actual: 'Extension crashes',
                severity: 'high'
            };

            const templateTask = {
                id: 'BUG-REPORT-TEMPLATE',
                name: 'Bug Report',
                description: 'Report bug: ${title}',
                agent: 'infrastructure-agent',
                variables: formData
            };

            const prompt = await exporter.generateEnhancedPromptFromTemplate(templateTask);

            // Should include form data
            assert.ok(prompt.includes('Extension crashes on startup'));
            assert.ok(prompt.includes('high') || prompt.includes('severity'));
        });

        // Test 7: Template with user prompt (General Enhance)
        it('should handle template with user prompt as variable', async () => {
            const userPrompt = 'Optimize the database query performance';

            const templateTask = {
                id: 'GENERAL-ENHANCE-TEMPLATE',
                name: 'General Enhancement',
                description: 'Enhance: ${userPrompt}',
                agent: 'infrastructure-agent',
                variables: {
                    userPrompt: userPrompt
                }
            };

            const prompt = await exporter.generateEnhancedPromptFromTemplate(templateTask);

            // Should include user prompt
            assert.ok(prompt.includes('Optimize the database query performance'));
        });

        // Test 8: Template uses existing prompt formatting
        it('should use existing prompt formatting methods', async () => {
            const templateTask = {
                id: 'CODE-ANALYZER-TEMPLATE',
                name: 'Analyze codebase',
                description: 'Analyze codebase for improvements',
                agent: 'infrastructure-agent',
                estimated_time: '2-4 hours',
                patterns: ['Pattern-CODE-001'],
                variables: {}
            };

            const prompt = await exporter.generateEnhancedPromptFromTemplate(templateTask);

            // Should have standard prompt structure
            assert.ok(prompt.includes('#') || prompt.includes('Task') || prompt.includes('CODE-ANALYZER-TEMPLATE'));
            // Should include timestamp
            assert.ok(prompt.length > 100, 'Prompt should be substantive');
        });

        // Test 9: Performance - should complete within 3s target
        it('should generate prompt within 3s performance target', async function() {
            this.timeout(3500); // Allow 3.5s (3s target + 500ms buffer)

            const templateTask = {
                id: 'PERFORMANCE-TEST-TEMPLATE',
                name: 'Performance test',
                description: 'Test prompt generation performance',
                agent: 'infrastructure-agent',
                variables: {}
            };

            const startTime = Date.now();
            await exporter.generateEnhancedPromptFromTemplate(templateTask);
            const duration = Date.now() - startTime;

            assert.ok(duration < 3000, `Prompt generation took ${duration}ms, should be <3000ms`);
        });

        // Test 10: Error handling - graceful degradation
        it('should handle DiscoveryService failure gracefully', async () => {
            const templateTask = {
                id: 'DISCOVERY-FAIL-TEMPLATE',
                name: 'Test discovery failure',
                description: 'Template when discovery fails',
                agent: 'infrastructure-agent',
                variables: {
                    // Missing data that would normally come from DiscoveryService
                }
            };

            // Should not throw, should use defaults or ask questions
            const prompt = await exporter.generateEnhancedPromptFromTemplate(templateTask);
            assert.ok(typeof prompt === 'string');
            assert.ok(prompt.length > 0);
        });
    });
});
