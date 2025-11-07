import * as assert from 'assert';
import * as vscode from 'vscode';
import { TaskQuestionModal } from '../../src/webview/TaskQuestionModal';
import { Question } from '../../src/services/TaskAnalyzer';

/**
 * TaskQuestionModal Test Suite
 *
 * TDD RED Phase - Tests written before implementation
 * Pattern: Pattern-TDD-001 (RED-GREEN-REFACTOR)
 *
 * Tests cover:
 * - Modal creation and initialization
 * - Question rendering (all types)
 * - Wizard navigation
 * - Answer collection
 * - Message protocol
 * - Criticality styling
 */

suite('TaskQuestionModal Test Suite', () => {
    let modal: TaskQuestionModal;
    const mockContext = {
        extensionUri: vscode.Uri.file('/mock/path'),
        subscriptions: []
    } as any;

    teardown(() => {
        // Cleanup: Dispose modal if created
        if (modal) {
            modal.dispose();
        }
    });

    suite('Modal Creation', () => {
        test('should create modal with questions', () => {
            const mockQuestions: Question[] = [
                {
                    id: 'q1',
                    question: 'Test question?',
                    type: 'text',
                    required: true
                }
            ];

            modal = new TaskQuestionModal(mockContext, mockQuestions, 'TEST-001');
            assert.ok(modal, 'Modal should be created');
        });

        test('should throw error if no questions provided', () => {
            assert.throws(() => {
                modal = new TaskQuestionModal(mockContext, [], 'TEST-001');
            }, /No questions provided/);
        });

        test('should initialize with first question visible', () => {
            const mockQuestions: Question[] = [
                { id: 'q1', question: 'Question 1?', type: 'text', required: true },
                { id: 'q2', question: 'Question 2?', type: 'choice', required: false, choices: ['A', 'B'] }
            ];

            modal = new TaskQuestionModal(mockContext, mockQuestions, 'TEST-001');
            assert.strictEqual(modal.getCurrentQuestionIndex(), 0, 'Should start at first question');
        });
    });

    suite('Question Types', () => {
        test('should handle text input questions', () => {
            const mockQuestions: Question[] = [
                {
                    id: 'q1',
                    question: 'Enter text:',
                    type: 'text',
                    required: true,
                    helpText: 'Provide details'
                }
            ];

            modal = new TaskQuestionModal(mockContext, mockQuestions, 'TEST-001');
            const html = modal.getHtmlForWebview();

            assert.ok(html.includes('Enter text:'), 'Should render question text');
            assert.ok(html.includes('Provide details'), 'Should render help text');
            assert.ok(html.includes('type="text"'), 'Should render text input');
        });

        test('should handle choice questions', () => {
            const mockQuestions: Question[] = [
                {
                    id: 'q1',
                    question: 'Select option:',
                    type: 'choice',
                    required: true,
                    choices: ['Option A', 'Option B', 'Option C']
                }
            ];

            modal = new TaskQuestionModal(mockContext, mockQuestions, 'TEST-001');
            const html = modal.getHtmlForWebview();

            assert.ok(html.includes('Select option:'), 'Should render question');
            assert.ok(html.includes('Option A'), 'Should render choice A');
            assert.ok(html.includes('Option B'), 'Should render choice B');
            assert.ok(html.includes('Option C'), 'Should render choice C');
        });

        test('should handle boolean questions', () => {
            const mockQuestions: Question[] = [
                {
                    id: 'q1',
                    question: 'Is this correct?',
                    type: 'boolean',
                    required: true
                }
            ];

            modal = new TaskQuestionModal(mockContext, mockQuestions, 'TEST-001');
            const html = modal.getHtmlForWebview();

            assert.ok(html.includes('Is this correct?'), 'Should render question');
            assert.ok(html.includes('Yes') || html.includes('No'), 'Should render Yes/No options');
        });
    });

    suite('Wizard Navigation', () => {
        test('should navigate to next question', () => {
            const mockQuestions: Question[] = [
                { id: 'q1', question: 'Question 1?', type: 'text', required: true },
                { id: 'q2', question: 'Question 2?', type: 'text', required: true }
            ];

            modal = new TaskQuestionModal(mockContext, mockQuestions, 'TEST-001');
            assert.strictEqual(modal.getCurrentQuestionIndex(), 0);

            modal.nextQuestion();
            assert.strictEqual(modal.getCurrentQuestionIndex(), 1, 'Should advance to question 2');
        });

        test('should navigate back to previous question', () => {
            const mockQuestions: Question[] = [
                { id: 'q1', question: 'Question 1?', type: 'text', required: true },
                { id: 'q2', question: 'Question 2?', type: 'text', required: true }
            ];

            modal = new TaskQuestionModal(mockContext, mockQuestions, 'TEST-001');
            modal.nextQuestion(); // Move to Q2
            assert.strictEqual(modal.getCurrentQuestionIndex(), 1);

            modal.previousQuestion();
            assert.strictEqual(modal.getCurrentQuestionIndex(), 0, 'Should go back to question 1');
        });

        test('should not navigate before first question', () => {
            const mockQuestions: Question[] = [
                { id: 'q1', question: 'Question 1?', type: 'text', required: true }
            ];

            modal = new TaskQuestionModal(mockContext, mockQuestions, 'TEST-001');
            modal.previousQuestion(); // Try to go back from Q1
            assert.strictEqual(modal.getCurrentQuestionIndex(), 0, 'Should stay at question 1');
        });

        test('should not navigate past last question', () => {
            const mockQuestions: Question[] = [
                { id: 'q1', question: 'Question 1?', type: 'text', required: true }
            ];

            modal = new TaskQuestionModal(mockContext, mockQuestions, 'TEST-001');
            modal.nextQuestion(); // Try to advance past last
            assert.strictEqual(modal.getCurrentQuestionIndex(), 0, 'Should stay at last question');
        });
    });

    suite('Answer Collection', () => {
        test('should store answer for current question', () => {
            const mockQuestions: Question[] = [
                { id: 'q1', question: 'Question 1?', type: 'text', required: true }
            ];

            modal = new TaskQuestionModal(mockContext, mockQuestions, 'TEST-001');
            modal.setAnswer('q1', 'My answer');

            const answers = modal.getAnswers();
            assert.strictEqual(answers['q1'], 'My answer', 'Should store answer');
        });

        test('should collect multiple answers', () => {
            const mockQuestions: Question[] = [
                { id: 'q1', question: 'Question 1?', type: 'text', required: true },
                { id: 'q2', question: 'Question 2?', type: 'choice', required: true, choices: ['A', 'B'] }
            ];

            modal = new TaskQuestionModal(mockContext, mockQuestions, 'TEST-001');
            modal.setAnswer('q1', 'Answer 1');
            modal.setAnswer('q2', 'A');

            const answers = modal.getAnswers();
            assert.strictEqual(answers['q1'], 'Answer 1');
            assert.strictEqual(answers['q2'], 'A');
        });

        test('should validate required questions', () => {
            const mockQuestions: Question[] = [
                { id: 'q1', question: 'Question 1?', type: 'text', required: true }
            ];

            modal = new TaskQuestionModal(mockContext, mockQuestions, 'TEST-001');

            assert.strictEqual(modal.isComplete(), false, 'Should not be complete without required answers');

            modal.setAnswer('q1', 'My answer');
            assert.strictEqual(modal.isComplete(), true, 'Should be complete with required answers');
        });

        test('should allow skipping optional questions', () => {
            const mockQuestions: Question[] = [
                { id: 'q1', question: 'Question 1?', type: 'text', required: false }
            ];

            modal = new TaskQuestionModal(mockContext, mockQuestions, 'TEST-001');
            assert.strictEqual(modal.isComplete(), true, 'Should be complete without optional answers');
        });
    });

    suite('Criticality Styling', () => {
        test('should identify blocking questions', () => {
            const mockQuestions: Question[] = [
                { id: 'q1', question: 'Blocker?', type: 'text', required: true }
            ];

            modal = new TaskQuestionModal(mockContext, mockQuestions, 'TEST-001');
            const html = modal.getHtmlForWebview();

            // Check for blocking indicator (implementation will use CSS class)
            assert.ok(html.includes('🚫') || html.includes('blocker'), 'Should show blocking indicator');
        });

        test('should identify optional questions', () => {
            const mockQuestions: Question[] = [
                { id: 'q1', question: 'Optional?', type: 'text', required: false }
            ];

            modal = new TaskQuestionModal(mockContext, mockQuestions, 'TEST-001');
            const html = modal.getHtmlForWebview();

            assert.ok(html.includes('💡') || html.includes('optional'), 'Should show optional indicator');
        });
    });

    suite('Performance', () => {
        test('should render modal in <200ms', () => {
            const mockQuestions: Question[] = [
                { id: 'q1', question: 'Question 1?', type: 'text', required: true },
                { id: 'q2', question: 'Question 2?', type: 'choice', required: true, choices: ['A', 'B', 'C'] },
                { id: 'q3', question: 'Question 3?', type: 'boolean', required: false }
            ];

            const startTime = Date.now();
            modal = new TaskQuestionModal(mockContext, mockQuestions, 'TEST-001');
            const html = modal.getHtmlForWebview();
            const duration = Date.now() - startTime;

            assert.ok(duration < 200, `Modal should render in <200ms (took ${duration}ms)`);
        });
    });
});
