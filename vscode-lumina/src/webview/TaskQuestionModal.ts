import * as vscode from 'vscode';
import { Question } from '../services/TaskAnalyzer';

/**
 * TaskQuestionModal - Wizard-style modal for answering task clarification questions
 *
 * @maintainable
 * Created: 2025-11-07 (PROTECT-000D - phase-3-mvp-prompt-system)
 * Test: test/webview/taskQuestionModal.test.ts
 * Pattern: Pattern-CODE-001, Pattern-TDD-001
 *
 * DESIGN DECISION: Wizard-style progressive disclosure (one question at a time)
 * WHY: Reduces cognitive load compared to wall of text
 *
 * REASONING CHAIN:
 * 1. TaskAnalyzer detects gaps → generates questions
 * 2. voicePanel creates TaskQuestionModal with questions
 * 3. Modal shows first question with appropriate input type
 * 4. User answers → Next question
 * 5. After all required answered → "Generate Prompt" button enabled
 * 6. Modal sends answers back to voicePanel
 * 7. voicePanel calls analyzer again with answers
 * 8. Analyzer generates final prompt → Insert to Voice text area
 * 9. Result: User validates understanding before execution
 *
 * PERFORMANCE: Modal renders < 200ms (lightweight HTML)
 * PATTERN: Reuses voicePanel webview pattern
 * RELATED: TaskAnalyzer.ts, voicePanel.ts, TaskPromptExporter.ts
 */

export class TaskQuestionModal {
    private panel: vscode.WebviewPanel | undefined;
    private questions: Question[];
    private taskId: string;
    private currentQuestionIndex: number = 0;
    private answers: Map<string, any> = new Map();
    private onAnswersCompleteCallback?: (taskId: string, answers: Record<string, any>) => void;

    constructor(
        private context: vscode.ExtensionContext,
        questions: Question[],
        taskId: string
    ) {
        if (!questions || questions.length === 0) {
            throw new Error('No questions provided');
        }

        this.questions = questions;
        this.taskId = taskId;
    }

    /**
     * Show the modal panel
     */
    public show(onAnswersComplete?: (taskId: string, answers: Record<string, any>) => void): void {
        this.onAnswersCompleteCallback = onAnswersComplete;

        // Create webview panel
        this.panel = vscode.window.createWebviewPanel(
            'aetherlightTaskQuestions',
            `Task Questions: ${this.taskId}`,
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [this.context.extensionUri]
            }
        );

        // Set HTML content
        this.panel.webview.html = this.getHtmlForWebview();

        // Handle messages from webview
        this.panel.webview.onDidReceiveMessage(message => {
            this.handleMessage(message);
        });

        // Cleanup on dispose
        this.panel.onDidDispose(() => {
            this.panel = undefined;
        });
    }

    /**
     * Handle messages from webview
     */
    private handleMessage(message: any): void {
        switch (message.type) {
            case 'setAnswer':
                this.setAnswer(message.questionId, message.answer);
                break;

            case 'next':
                this.nextQuestion();
                this.refreshWebview();
                break;

            case 'previous':
                this.previousQuestion();
                this.refreshWebview();
                break;

            case 'skip':
                // Skip current question (only allowed for optional)
                const currentQuestion = this.questions[this.currentQuestionIndex];
                if (!currentQuestion.required) {
                    this.nextQuestion();
                    this.refreshWebview();
                }
                break;

            case 'generatePrompt':
                if (this.isComplete()) {
                    const answersObj = this.getAnswersObject();
                    if (this.onAnswersCompleteCallback) {
                        this.onAnswersCompleteCallback(this.taskId, answersObj);
                    }
                    this.dispose();
                } else {
                    vscode.window.showWarningMessage('Please answer all required questions before generating prompt');
                }
                break;

            case 'cancel':
                this.dispose();
                break;
        }
    }

    /**
     * Navigate to next question
     */
    public nextQuestion(): void {
        if (this.currentQuestionIndex < this.questions.length - 1) {
            this.currentQuestionIndex++;
        }
    }

    /**
     * Navigate to previous question
     */
    public previousQuestion(): void {
        if (this.currentQuestionIndex > 0) {
            this.currentQuestionIndex--;
        }
    }

    /**
     * Set answer for a question
     */
    public setAnswer(questionId: string, answer: any): void {
        this.answers.set(questionId, answer);
    }

    /**
     * Get current question index
     */
    public getCurrentQuestionIndex(): number {
        return this.currentQuestionIndex;
    }

    /**
     * Get all answers as object
     */
    public getAnswers(): Record<string, any> {
        return this.getAnswersObject();
    }

    private getAnswersObject(): Record<string, any> {
        const obj: Record<string, any> = {};
        this.answers.forEach((value, key) => {
            obj[key] = value;
        });
        return obj;
    }

    /**
     * Check if all required questions are answered
     */
    public isComplete(): boolean {
        for (const question of this.questions) {
            if (question.required && !this.answers.has(question.id)) {
                return false;
            }
        }
        return true;
    }

    /**
     * Refresh webview with updated content
     */
    private refreshWebview(): void {
        if (this.panel) {
            this.panel.webview.html = this.getHtmlForWebview();
        }
    }

    /**
     * Dispose the modal
     */
    public dispose(): void {
        if (this.panel) {
            this.panel.dispose();
            this.panel = undefined;
        }
    }

    /**
     * Generate HTML for webview
     */
    public getHtmlForWebview(): string {
        const currentQuestion = this.questions[this.currentQuestionIndex];
        const progress = this.currentQuestionIndex + 1;
        const total = this.questions.length;
        const isFirst = this.currentQuestionIndex === 0;
        const isLast = this.currentQuestionIndex === this.questions.length - 1;

        // Determine criticality
        const criticality = currentQuestion.required ? 'blocker' : 'optional';
        const criticalityIcon = currentQuestion.required ? '🚫' : '💡';
        const criticalityLabel = currentQuestion.required ? 'Required' : 'Optional';
        const criticalityColor = currentQuestion.required ? '#e74c3c' : '#95a5a6';

        // Get current answer if exists
        const currentAnswer = this.answers.get(currentQuestion.id) || '';

        // Render input based on question type
        let inputHtml = '';
        switch (currentQuestion.type) {
            case 'text':
                inputHtml = `
                    <textarea
                        id="answer-input"
                        rows="4"
                        placeholder="Enter your answer..."
                        style="width: 100%; padding: 8px; font-size: 14px; border: 1px solid var(--vscode-input-border); background: var(--vscode-input-background); color: var(--vscode-input-foreground); border-radius: 4px;"
                    >${currentAnswer}</textarea>
                `;
                break;

            case 'choice':
                inputHtml = '<div style="margin-top: 10px;">';
                for (const choice of currentQuestion.choices || []) {
                    const checked = currentAnswer === choice ? 'checked' : '';
                    inputHtml += `
                        <label style="display: block; margin-bottom: 8px; cursor: pointer;">
                            <input type="radio" name="choice" value="${choice}" ${checked}
                                   onchange="setAnswer('${currentQuestion.id}', '${choice}')"
                                   style="margin-right: 8px;">
                            ${choice}
                        </label>
                    `;
                }
                inputHtml += '</div>';
                break;

            case 'boolean':
                inputHtml = `
                    <div style="margin-top: 10px;">
                        <button onclick="setAnswer('${currentQuestion.id}', true)"
                                style="padding: 8px 16px; margin-right: 10px; ${currentAnswer === true ? 'background: var(--vscode-button-background); color: var(--vscode-button-foreground);' : 'background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground);'} border: none; border-radius: 4px; cursor: pointer;">
                            Yes
                        </button>
                        <button onclick="setAnswer('${currentQuestion.id}', false)"
                                style="padding: 8px 16px; ${currentAnswer === false ? 'background: var(--vscode-button-background); color: var(--vscode-button-foreground);' : 'background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground);'} border: none; border-radius: 4px; cursor: pointer;">
                            No
                        </button>
                    </div>
                `;
                break;

            default:
                inputHtml = `<p style="color: #e74c3c;">Unknown question type: ${currentQuestion.type}</p>`;
        }

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Task Questions</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 20px;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
        }
        .header {
            margin-bottom: 20px;
            border-bottom: 1px solid var(--vscode-panel-border);
            padding-bottom: 10px;
        }
        .progress {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
        }
        .criticality {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: bold;
            margin-left: 10px;
        }
        .question-card {
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
        }
        .question-text {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 10px;
        }
        .help-text {
            font-size: 13px;
            color: var(--vscode-descriptionForeground);
            margin-bottom: 15px;
            font-style: italic;
        }
        .navigation {
            display: flex;
            justify-content: space-between;
            margin-top: 20px;
        }
        .nav-button {
            padding: 8px 16px;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
        }
        .nav-button:hover {
            background: var(--vscode-button-hoverBackground);
        }
        .nav-button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        .secondary-button {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }
        .secondary-button:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }
        .generate-button {
            background: #27ae60;
            color: white;
            font-weight: bold;
        }
        .generate-button:hover {
            background: #229954;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="progress">
                Question ${progress} of ${total}
                <span class="criticality" style="background: ${criticalityColor}; color: white;">
                    ${criticalityIcon} ${criticalityLabel}
                </span>
            </div>
        </div>

        <div class="question-card">
            <div class="question-text">${currentQuestion.question}</div>
            ${currentQuestion.helpText ? `<div class="help-text">${currentQuestion.helpText}</div>` : ''}
            ${inputHtml}
        </div>

        <div class="navigation">
            <div>
                <button class="nav-button secondary-button" onclick="previous()" ${isFirst ? 'disabled' : ''}>
                    ← Back
                </button>
                ${!currentQuestion.required ? `
                    <button class="nav-button secondary-button" onclick="skip()" ${isLast ? 'disabled' : ''}>
                        Skip
                    </button>
                ` : ''}
            </div>
            <div>
                ${isLast ? `
                    <button class="nav-button generate-button" onclick="generatePrompt()">
                        ✨ Generate Prompt
                    </button>
                ` : `
                    <button class="nav-button" onclick="next()">
                        Next →
                    </button>
                `}
                <button class="nav-button secondary-button" onclick="cancel()" style="margin-left: 10px;">
                    Cancel
                </button>
            </div>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        function setAnswer(questionId, answer) {
            vscode.postMessage({
                type: 'setAnswer',
                questionId: questionId,
                answer: answer
            });
        }

        function next() {
            // Get current answer from input
            const input = document.getElementById('answer-input');
            if (input) {
                vscode.postMessage({
                    type: 'setAnswer',
                    questionId: '${currentQuestion.id}',
                    answer: input.value
                });
            }

            vscode.postMessage({ type: 'next' });
        }

        function previous() {
            // Save current answer before going back
            const input = document.getElementById('answer-input');
            if (input) {
                vscode.postMessage({
                    type: 'setAnswer',
                    questionId: '${currentQuestion.id}',
                    answer: input.value
                });
            }

            vscode.postMessage({ type: 'previous' });
        }

        function skip() {
            vscode.postMessage({ type: 'skip' });
        }

        function generatePrompt() {
            // Save current answer before generating
            const input = document.getElementById('answer-input');
            if (input) {
                vscode.postMessage({
                    type: 'setAnswer',
                    questionId: '${currentQuestion.id}',
                    answer: input.value
                });
            }

            vscode.postMessage({ type: 'generatePrompt' });
        }

        function cancel() {
            vscode.postMessage({ type: 'cancel' });
        }

        // Auto-save textarea input
        const textarea = document.getElementById('answer-input');
        if (textarea) {
            textarea.addEventListener('blur', () => {
                vscode.postMessage({
                    type: 'setAnswer',
                    questionId: '${currentQuestion.id}',
                    answer: textarea.value
                });
            });
        }
    </script>
</body>
</html>`;
    }
}
