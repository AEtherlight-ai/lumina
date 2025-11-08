/**
 * InterviewEngine Tests
 *
 * PATTERN: Pattern-TDD-001 (85% coverage for API code)
 * COVERAGE TARGET: 85% (API service)
 * TEST STRATEGY: Mock VS Code APIs, test question types, conditionals, validation
 */

import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import * as fs from 'fs/promises';
import * as path from 'path';
import { InterviewEngine, InterviewTemplate, InterviewQuestion, QuestionType } from '../../src/services/InterviewEngine';
import { InterviewAnswers } from '../../src/services/ProjectConfigGenerator';

suite('InterviewEngine Tests', () => {
    let engine: InterviewEngine;
    let sandbox: sinon.SinonSandbox;

    setup(() => {
        engine = new InterviewEngine();
        sandbox = sinon.createSandbox();
    });

    teardown(() => {
        sandbox.restore();
    });

    // ==========================================================================
    // TEST SUITE 1: Template Loading
    // ==========================================================================

    suite('loadTemplate()', () => {
        test('should load valid JSON template', async () => {
            const templatePath = path.join(__dirname, '../fixtures/test-interview.json');
            const templateData: InterviewTemplate = {
                name: 'test-interview',
                description: 'Test interview',
                questions: [
                    {
                        name: 'language',
                        type: 'list',
                        message: 'Select language',
                        choices: ['typescript', 'javascript']
                    }
                ]
            };

            sandbox.stub(fs, 'readFile').resolves(JSON.stringify(templateData));

            const result = await engine.loadTemplate(templatePath);

            assert.strictEqual(result.name, 'test-interview');
            assert.strictEqual(result.questions.length, 1);
            assert.strictEqual(result.questions[0].name, 'language');
        });

        test('should throw error for invalid JSON', async () => {
            const templatePath = path.join(__dirname, '../fixtures/invalid.json');
            sandbox.stub(fs, 'readFile').resolves('{ invalid json }');

            await assert.rejects(
                async () => await engine.loadTemplate(templatePath),
                /Unexpected token/
            );
        });

        test('should throw error for missing questions array', async () => {
            const templatePath = path.join(__dirname, '../fixtures/no-questions.json');
            const templateData = {
                name: 'test-interview',
                description: 'Test interview'
                // Missing questions array
            };

            sandbox.stub(fs, 'readFile').resolves(JSON.stringify(templateData));

            await assert.rejects(
                async () => await engine.loadTemplate(templatePath),
                /Invalid template: missing questions array/
            );
        });

        test('should throw error for non-array questions', async () => {
            const templatePath = path.join(__dirname, '../fixtures/bad-questions.json');
            const templateData = {
                name: 'test-interview',
                questions: 'not-an-array'
            };

            sandbox.stub(fs, 'readFile').resolves(JSON.stringify(templateData));

            await assert.rejects(
                async () => await engine.loadTemplate(templatePath),
                /Invalid template: missing questions array/
            );
        });
    });

    // ==========================================================================
    // TEST SUITE 2: Input Questions
    // ==========================================================================

    suite('runInterview() - input questions', () => {
        test('should ask input question and return answer', async () => {
            const template: InterviewTemplate = {
                name: 'test',
                questions: [
                    {
                        name: 'project_name',
                        type: 'input',
                        message: 'Enter project name'
                    }
                ]
            };

            const showInputBoxStub = sandbox.stub(vscode.window, 'showInputBox').resolves('my-project');

            const answers = await engine.runInterview(template);

            assert.strictEqual(answers.project_name, 'my-project');
            assert.ok(showInputBoxStub.calledOnce);
        });

        test('should use default value for input question', async () => {
            const template: InterviewTemplate = {
                name: 'test',
                questions: [
                    {
                        name: 'project_name',
                        type: 'input',
                        message: 'Enter project name',
                        default: 'default-project'
                    }
                ]
            };

            const showInputBoxStub = sandbox.stub(vscode.window, 'showInputBox').resolves('default-project');

            const answers = await engine.runInterview(template);

            assert.strictEqual(answers.project_name, 'default-project');
            assert.ok(showInputBoxStub.calledOnce);

            const callArgs = showInputBoxStub.getCall(0).args[0];
            assert.strictEqual(callArgs?.value, 'default-project');
        });

        test('should skip input question if user cancels', async () => {
            const template: InterviewTemplate = {
                name: 'test',
                questions: [
                    {
                        name: 'project_name',
                        type: 'input',
                        message: 'Enter project name'
                    }
                ]
            };

            sandbox.stub(vscode.window, 'showInputBox').resolves(undefined);

            const answers = await engine.runInterview(template);

            assert.strictEqual(answers.project_name, undefined);
        });
    });

    // ==========================================================================
    // TEST SUITE 3: List Questions (Single Select)
    // ==========================================================================

    suite('runInterview() - list questions', () => {
        test('should ask list question and return selected choice', async () => {
            const template: InterviewTemplate = {
                name: 'test',
                questions: [
                    {
                        name: 'language',
                        type: 'list',
                        message: 'Select language',
                        choices: ['typescript', 'javascript', 'python']
                    }
                ]
            };

            const showQuickPickStub = sandbox.stub(vscode.window, 'showQuickPick')
                .onCall(0).resolves('typescript' as any);

            const answers = await engine.runInterview(template);

            assert.strictEqual(answers.language, 'typescript');
            assert.ok(showQuickPickStub.calledOnce);
        });

        test('should throw error if list question has no choices', async () => {
            const template: InterviewTemplate = {
                name: 'test',
                questions: [
                    {
                        name: 'language',
                        type: 'list',
                        message: 'Select language',
                        choices: []
                    }
                ]
            };

            await assert.rejects(
                async () => await engine.runInterview(template),
                /List question "language" has no choices/
            );
        });

        test('should skip list question if user cancels', async () => {
            const template: InterviewTemplate = {
                name: 'test',
                questions: [
                    {
                        name: 'language',
                        type: 'list',
                        message: 'Select language',
                        choices: ['typescript', 'javascript']
                    }
                ]
            };

            sandbox.stub(vscode.window, 'showQuickPick').resolves(undefined);

            const answers = await engine.runInterview(template);

            assert.strictEqual(answers.language, undefined);
        });
    });

    // ==========================================================================
    // TEST SUITE 4: Checkbox Questions (Multi-Select)
    // ==========================================================================

    suite('runInterview() - checkbox questions', () => {
        test('should ask checkbox question and return selected choices', async () => {
            const template: InterviewTemplate = {
                name: 'test',
                questions: [
                    {
                        name: 'features',
                        type: 'checkbox',
                        message: 'Select features',
                        choices: ['linting', 'testing', 'documentation']
                    }
                ]
            };

            const selectedItems = [
                { label: 'linting', picked: true },
                { label: 'testing', picked: true }
            ];

            const showQuickPickStub = sandbox.stub(vscode.window, 'showQuickPick')
                .onCall(0).resolves(selectedItems as any);

            const answers = await engine.runInterview(template);

            assert.deepStrictEqual(answers.features, ['linting', 'testing']);
            assert.ok(showQuickPickStub.calledOnce);
        });

        test('should throw error if checkbox question has no choices', async () => {
            const template: InterviewTemplate = {
                name: 'test',
                questions: [
                    {
                        name: 'features',
                        type: 'checkbox',
                        message: 'Select features',
                        choices: []
                    }
                ]
            };

            await assert.rejects(
                async () => await engine.runInterview(template),
                /Checkbox question "features" has no choices/
            );
        });

        test('should return empty array if user selects no choices', async () => {
            const template: InterviewTemplate = {
                name: 'test',
                questions: [
                    {
                        name: 'features',
                        type: 'checkbox',
                        message: 'Select features',
                        choices: ['linting', 'testing']
                    }
                ]
            };

            sandbox.stub(vscode.window, 'showQuickPick').resolves([] as any);

            const answers = await engine.runInterview(template);

            assert.deepStrictEqual(answers.features, []);
        });

        test('should skip checkbox question if user cancels', async () => {
            const template: InterviewTemplate = {
                name: 'test',
                questions: [
                    {
                        name: 'features',
                        type: 'checkbox',
                        message: 'Select features',
                        choices: ['linting', 'testing']
                    }
                ]
            };

            sandbox.stub(vscode.window, 'showQuickPick').resolves(undefined);

            const answers = await engine.runInterview(template);

            assert.strictEqual(answers.features, undefined);
        });
    });

    // ==========================================================================
    // TEST SUITE 5: Confirm Questions (Yes/No)
    // ==========================================================================

    suite('runInterview() - confirm questions', () => {
        test('should ask confirm question and return true for "Yes"', async () => {
            const template: InterviewTemplate = {
                name: 'test',
                questions: [
                    {
                        name: 'use_typescript',
                        type: 'confirm',
                        message: 'Use TypeScript?'
                    }
                ]
            };

            const showQuickPickStub = sandbox.stub(vscode.window, 'showQuickPick')
                .onCall(0).resolves('Yes' as any);

            const answers = await engine.runInterview(template);

            assert.strictEqual(answers.use_typescript, true);
            assert.ok(showQuickPickStub.calledOnce);
        });

        test('should ask confirm question and return false for "No"', async () => {
            const template: InterviewTemplate = {
                name: 'test',
                questions: [
                    {
                        name: 'use_typescript',
                        type: 'confirm',
                        message: 'Use TypeScript?'
                    }
                ]
            };

            const showQuickPickStub = sandbox.stub(vscode.window, 'showQuickPick')
                .onCall(0).resolves('No' as any);

            const answers = await engine.runInterview(template);

            assert.strictEqual(answers.use_typescript, false);
            assert.ok(showQuickPickStub.calledOnce);
        });

        test('should skip confirm question if user cancels', async () => {
            const template: InterviewTemplate = {
                name: 'test',
                questions: [
                    {
                        name: 'use_typescript',
                        type: 'confirm',
                        message: 'Use TypeScript?'
                    }
                ]
            };

            sandbox.stub(vscode.window, 'showQuickPick').resolves(undefined);

            const answers = await engine.runInterview(template);

            assert.strictEqual(answers.use_typescript, undefined);
        });
    });

    // ==========================================================================
    // TEST SUITE 6: Conditional Questions (when)
    // ==========================================================================

    suite('runInterview() - conditional questions', () => {
        test('should skip question when condition is false', async () => {
            const template: InterviewTemplate = {
                name: 'test',
                questions: [
                    {
                        name: 'language',
                        type: 'list',
                        message: 'Select language',
                        choices: ['typescript', 'javascript']
                    },
                    {
                        name: 'tsconfig',
                        type: 'input',
                        message: 'Path to tsconfig.json',
                        when: 'answers.language === "typescript"'
                    }
                ]
            };

            sandbox.stub(vscode.window, 'showQuickPick').resolves('javascript' as any);

            const answers = await engine.runInterview(template);

            assert.strictEqual(answers.language, 'javascript');
            assert.strictEqual(answers.tsconfig, undefined);
        });

        test('should ask question when condition is true', async () => {
            const template: InterviewTemplate = {
                name: 'test',
                questions: [
                    {
                        name: 'language',
                        type: 'list',
                        message: 'Select language',
                        choices: ['typescript', 'javascript']
                    },
                    {
                        name: 'tsconfig',
                        type: 'input',
                        message: 'Path to tsconfig.json',
                        when: 'answers.language === "typescript"'
                    }
                ]
            };

            const showQuickPickStub = sandbox.stub(vscode.window, 'showQuickPick')
                .onCall(0).resolves('typescript' as any);
            const showInputBoxStub = sandbox.stub(vscode.window, 'showInputBox')
                .onCall(0).resolves('tsconfig.json');

            const answers = await engine.runInterview(template);

            assert.strictEqual(answers.language, 'typescript');
            assert.strictEqual(answers.tsconfig, 'tsconfig.json');
            assert.ok(showQuickPickStub.calledOnce);
            assert.ok(showInputBoxStub.calledOnce);
        });

        test('should default to showing question if condition evaluation fails', async () => {
            const template: InterviewTemplate = {
                name: 'test',
                questions: [
                    {
                        name: 'project_name',
                        type: 'input',
                        message: 'Enter project name',
                        when: 'invalid.javascript.syntax'
                    }
                ]
            };

            const showInputBoxStub = sandbox.stub(vscode.window, 'showInputBox')
                .resolves('my-project');

            const answers = await engine.runInterview(template);

            assert.strictEqual(answers.project_name, 'my-project');
            assert.ok(showInputBoxStub.calledOnce);
        });
    });

    // ==========================================================================
    // TEST SUITE 7: Answer Validation
    // ==========================================================================

    suite('runInterview() - answer validation', () => {
        test('should throw error for invalid answer', async () => {
            const template: InterviewTemplate = {
                name: 'test',
                questions: [
                    {
                        name: 'project_name',
                        type: 'input',
                        message: 'Enter project name',
                        validate: 'value.length > 0'
                    }
                ]
            };

            sandbox.stub(vscode.window, 'showInputBox').resolves('');

            await assert.rejects(
                async () => await engine.runInterview(template),
                /Invalid answer for question "project_name"/
            );
        });

        test('should accept valid answer', async () => {
            const template: InterviewTemplate = {
                name: 'test',
                questions: [
                    {
                        name: 'project_name',
                        type: 'input',
                        message: 'Enter project name',
                        validate: 'value.length > 0'
                    }
                ]
            };

            sandbox.stub(vscode.window, 'showInputBox').resolves('my-project');

            const answers = await engine.runInterview(template);

            assert.strictEqual(answers.project_name, 'my-project');
        });

        test('should default to accepting answer if validation fails', async () => {
            const template: InterviewTemplate = {
                name: 'test',
                questions: [
                    {
                        name: 'project_name',
                        type: 'input',
                        message: 'Enter project name',
                        validate: 'invalid.javascript.syntax'
                    }
                ]
            };

            sandbox.stub(vscode.window, 'showInputBox').resolves('my-project');

            const answers = await engine.runInterview(template);

            assert.strictEqual(answers.project_name, 'my-project');
        });

        test('should skip validation if answer is undefined', async () => {
            const template: InterviewTemplate = {
                name: 'test',
                questions: [
                    {
                        name: 'project_name',
                        type: 'input',
                        message: 'Enter project name',
                        validate: 'value.length > 0'
                    }
                ]
            };

            sandbox.stub(vscode.window, 'showInputBox').resolves(undefined);

            const answers = await engine.runInterview(template);

            assert.strictEqual(answers.project_name, undefined);
        });
    });

    // ==========================================================================
    // TEST SUITE 8: Default Value Resolution
    // ==========================================================================

    suite('runInterview() - default value resolution', () => {
        test('should resolve {{variable}} substitution in defaults', async () => {
            const template: InterviewTemplate = {
                name: 'test',
                questions: [
                    {
                        name: 'language',
                        type: 'input',
                        message: 'Enter language'
                    },
                    {
                        name: 'project_name',
                        type: 'input',
                        message: 'Enter project name',
                        default: '{{language}}-project'
                    }
                ]
            };

            const showInputBoxStub = sandbox.stub(vscode.window, 'showInputBox');
            showInputBoxStub.onCall(0).resolves('typescript');
            showInputBoxStub.onCall(1).resolves('typescript-project');

            const answers = await engine.runInterview(template);

            assert.strictEqual(answers.language, 'typescript');
            assert.strictEqual(answers.project_name, 'typescript-project');

            const secondCallArgs = showInputBoxStub.getCall(1).args[0];
            assert.strictEqual(secondCallArgs?.value, 'typescript-project');
        });

        test('should keep {{variable}} if variable not in answers', async () => {
            const template: InterviewTemplate = {
                name: 'test',
                questions: [
                    {
                        name: 'project_name',
                        type: 'input',
                        message: 'Enter project name',
                        default: '{{language}}-project'
                    }
                ]
            };

            const showInputBoxStub = sandbox.stub(vscode.window, 'showInputBox')
                .resolves('{{language}}-project');

            const answers = await engine.runInterview(template);

            assert.strictEqual(answers.project_name, '{{language}}-project');

            const callArgs = showInputBoxStub.getCall(0).args[0];
            assert.strictEqual(callArgs?.value, '{{language}}-project');
        });
    });

    // ==========================================================================
    // TEST SUITE 9: Initial Answers
    // ==========================================================================

    suite('runInterview() - initial answers', () => {
        test('should use initial answers as base', async () => {
            const template: InterviewTemplate = {
                name: 'test',
                questions: [
                    {
                        name: 'project_name',
                        type: 'input',
                        message: 'Enter project name'
                    }
                ]
            };

            const initialAnswers: Partial<InterviewAnswers> = {
                language: 'typescript',
                package_manager: 'npm'
            };

            sandbox.stub(vscode.window, 'showInputBox').resolves('my-project');

            const answers = await engine.runInterview(template, initialAnswers);

            assert.strictEqual(answers.project_name, 'my-project');
            assert.strictEqual(answers.language, 'typescript');
            assert.strictEqual(answers.package_manager, 'npm');
        });

        test('should allow interview to override initial answers', async () => {
            const template: InterviewTemplate = {
                name: 'test',
                questions: [
                    {
                        name: 'language',
                        type: 'list',
                        message: 'Select language',
                        choices: ['typescript', 'javascript']
                    }
                ]
            };

            const initialAnswers: Partial<InterviewAnswers> = {
                language: 'python'
            };

            sandbox.stub(vscode.window, 'showQuickPick').resolves('typescript' as any);

            const answers = await engine.runInterview(template, initialAnswers);

            assert.strictEqual(answers.language, 'typescript');
        });
    });

    // ==========================================================================
    // TEST SUITE 10: Complex Interview Flow
    // ==========================================================================

    suite('runInterview() - complex flow', () => {
        test('should execute multi-question interview with conditionals and validation', async () => {
            const template: InterviewTemplate = {
                name: 'project-setup',
                questions: [
                    {
                        name: 'project_name',
                        type: 'input',
                        message: 'Enter project name',
                        validate: 'value.length > 0'
                    },
                    {
                        name: 'language',
                        type: 'list',
                        message: 'Select language',
                        choices: ['typescript', 'javascript', 'python']
                    },
                    {
                        name: 'package_manager',
                        type: 'list',
                        message: 'Select package manager',
                        choices: ['npm', 'yarn', 'pnpm'],
                        when: 'answers.language === "typescript" || answers.language === "javascript"'
                    },
                    {
                        name: 'use_testing',
                        type: 'confirm',
                        message: 'Include testing framework?'
                    },
                    {
                        name: 'test_framework',
                        type: 'list',
                        message: 'Select test framework',
                        choices: ['mocha', 'jest', 'vitest'],
                        when: 'answers.use_testing === true'
                    }
                ]
            };

            const showInputBoxStub = sandbox.stub(vscode.window, 'showInputBox');
            showInputBoxStub.onCall(0).resolves('my-project');

            const showQuickPickStub = sandbox.stub(vscode.window, 'showQuickPick');
            showQuickPickStub.onCall(0).resolves('typescript' as any);
            showQuickPickStub.onCall(1).resolves('npm' as any);
            showQuickPickStub.onCall(2).resolves('Yes' as any);
            showQuickPickStub.onCall(3).resolves('mocha' as any);

            const answers = await engine.runInterview(template);

            assert.strictEqual(answers.project_name, 'my-project');
            assert.strictEqual(answers.language, 'typescript');
            assert.strictEqual(answers.package_manager, 'npm');
            assert.strictEqual(answers.use_testing, true);
            assert.strictEqual(answers.test_framework, 'mocha');

            assert.strictEqual(showInputBoxStub.callCount, 1);
            assert.strictEqual(showQuickPickStub.callCount, 4);
        });
    });
});
