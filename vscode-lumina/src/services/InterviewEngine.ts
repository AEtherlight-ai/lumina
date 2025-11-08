/**
 * InterviewEngine: Interactive interview system using VS Code APIs
 *
 * DESIGN DECISION: Use VS Code APIs instead of inquirer.js
 * WHY: Pattern-PUBLISH-003 forbids runtime npm dependencies (inquirer.js)
 *
 * REASONING CHAIN:
 * 1. Original plan: Use inquirer.js for CLI prompts
 * 2. Problem: inquirer.js is runtime npm dependency → Pattern-PUBLISH-003 violation
 * 3. Historical: v0.15.31-32 runtime dependencies broke extension activation
 * 4. Solution: Use VS Code native APIs (vscode.window.*)
 * 5. Benefit: Better UX (native VS Code UI), no packaging issues, Pattern-PUBLISH-003 compliant
 *
 * VS CODE API MAPPING:
 * - inquirer.input() → vscode.window.showInputBox()
 * - inquirer.list() → vscode.window.showQuickPick() (single select)
 * - inquirer.checkbox() → vscode.window.showQuickPick() (multi-select)
 * - inquirer.confirm() → vscode.window.showQuickPick() (Yes/No)
 *
 * PATTERN: Pattern-PUBLISH-003 (No runtime npm dependencies)
 * PATTERN: Pattern-TDD-001 (85% coverage for API tasks)
 * RELATED: SELF-002 (ProjectConfigGenerator), SELF-003 (ProjectConfig schema)
 */

import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';
import { InterviewAnswers } from './ProjectConfigGenerator';
import { MiddlewareLogger } from './MiddlewareLogger';

/**
 * Question types supported by InterviewEngine
 */
export type QuestionType = 'input' | 'list' | 'checkbox' | 'confirm';

/**
 * Interview question definition
 *
 * DESIGN DECISION: JSON-based interview templates
 * WHY: Non-developers can create/modify interview questions
 */
export interface InterviewQuestion {
    /** Question identifier (used as key in answers object) */
    name: string;

    /** Question type */
    type: QuestionType;

    /** Question text displayed to user */
    message: string;

    /** Default value (optional) */
    default?: string | boolean;

    /** Choices for list/checkbox questions */
    choices?: string[];

    /** Conditional: only ask if condition is true (optional) */
    when?: string; // JavaScript expression like "answers.language === 'typescript'"

    /** Validation: reject invalid answers (optional) */
    validate?: string; // JavaScript expression like "value.length > 0"
}

/**
 * Interview template loaded from JSON file
 */
export interface InterviewTemplate {
    /** Template name */
    name: string;

    /** Template description */
    description?: string;

    /** Questions in order */
    questions: InterviewQuestion[];
}

/**
 * InterviewEngine: Conducts interactive interviews using VS Code UI
 *
 * DESIGN DECISION: Pure service with no state, uses VS Code APIs
 * WHY: Simple, testable, Pattern-PUBLISH-003 compliant
 */
export class InterviewEngine {
    private logger: MiddlewareLogger;

    constructor() {
        this.logger = MiddlewareLogger.getInstance();
    }

    /**
     * Load interview template from JSON file
     *
     * @param templatePath - Path to template JSON file
     * @returns Parsed interview template
     *
     * DESIGN DECISION: JSON templates for non-developer accessibility
     * WHY: Users/teams can customize interview questions without code changes
     */
    public async loadTemplate(templatePath: string): Promise<InterviewTemplate> {
        const startTime = this.logger.startOperation('InterviewEngine.loadTemplate', {
            templatePath
        });

        try {
            const content = await fs.readFile(templatePath, 'utf-8');
            const template = JSON.parse(content) as InterviewTemplate;

            // Basic validation
            if (!template.questions || !Array.isArray(template.questions)) {
                throw new Error('Invalid template: missing questions array');
            }

            this.logger.endOperation('InterviewEngine.loadTemplate', startTime, {
                questionCount: template.questions.length
            });

            return template;
        } catch (error) {
            this.logger.failOperation('InterviewEngine.loadTemplate', startTime, error);
            throw error;
        }
    }

    /**
     * Run interview with user using VS Code UI
     *
     * @param template - Interview template
     * @param initialAnswers - Initial answers (from detection, optional)
     * @returns Interview answers object
     *
     * ALGORITHM:
     * 1. For each question in template:
     *    a. Evaluate conditional (skip if false)
     *    b. Show appropriate VS Code prompt (input/list/checkbox/confirm)
     *    c. Validate answer
     *    d. Store in answers object
     * 2. Return complete answers
     *
     * PERFORMANCE: User interaction time not counted (<100ms for prompts)
     */
    public async runInterview(
        template: InterviewTemplate,
        initialAnswers: Partial<InterviewAnswers> = {}
    ): Promise<InterviewAnswers> {
        const startTime = this.logger.startOperation('InterviewEngine.runInterview', {
            templateName: template.name,
            questionCount: template.questions.length,
            hasInitialAnswers: Object.keys(initialAnswers).length > 0
        });

        try {
            const answers: InterviewAnswers = { ...initialAnswers };

            for (const question of template.questions) {
                // Check conditional (skip if false)
                if (question.when && !this.evaluateCondition(question.when, answers)) {
                    continue;
                }

                // Ask question based on type
                let answer: string | string[] | boolean | undefined;
                switch (question.type) {
                    case 'input':
                        answer = await this.askInput(question, answers);
                        break;
                    case 'list':
                        answer = await this.askList(question, answers);
                        break;
                    case 'checkbox':
                        answer = await this.askCheckbox(question, answers);
                        break;
                    case 'confirm':
                        answer = await this.askConfirm(question, answers);
                        break;
                }

                // Validate answer
                if (question.validate && answer !== undefined) {
                    const isValid = this.validateAnswer(question.validate, answer, answers);
                    if (!isValid) {
                        throw new Error(`Invalid answer for question "${question.name}": ${answer}`);
                    }
                }

                // Store answer
                if (answer !== undefined) {
                    answers[question.name] = answer;
                }
            }

            this.logger.endOperation('InterviewEngine.runInterview', startTime, {
                answersCount: Object.keys(answers).length
            });

            return answers;
        } catch (error) {
            this.logger.failOperation('InterviewEngine.runInterview', startTime, error);
            throw error;
        }
    }

    /**
     * Ask input question (text input)
     *
     * @param question - Question definition
     * @param answers - Current answers (for default value substitution)
     * @returns User's answer
     */
    private async askInput(
        question: InterviewQuestion,
        answers: InterviewAnswers
    ): Promise<string | undefined> {
        const result = await vscode.window.showInputBox({
            prompt: question.message,
            value: this.resolveDefault(question.default as string | undefined, answers),
            placeHolder: question.default as string | undefined,
            ignoreFocusOut: true // Don't dismiss on focus loss
        });

        return result;
    }

    /**
     * Ask list question (single select)
     *
     * @param question - Question definition
     * @param answers - Current answers
     * @returns Selected choice
     */
    private async askList(
        question: InterviewQuestion,
        answers: InterviewAnswers
    ): Promise<string | undefined> {
        if (!question.choices || question.choices.length === 0) {
            throw new Error(`List question "${question.name}" has no choices`);
        }

        const result = await vscode.window.showQuickPick(question.choices, {
            placeHolder: question.message,
            ignoreFocusOut: true
        });

        return result;
    }

    /**
     * Ask checkbox question (multi-select)
     *
     * @param question - Question definition
     * @param answers - Current answers
     * @returns Selected choices
     */
    private async askCheckbox(
        question: InterviewQuestion,
        answers: InterviewAnswers
    ): Promise<string[] | undefined> {
        if (!question.choices || question.choices.length === 0) {
            throw new Error(`Checkbox question "${question.name}" has no choices`);
        }

        const items = question.choices.map(choice => ({
            label: choice,
            picked: false
        }));

        const result = await vscode.window.showQuickPick(items, {
            placeHolder: question.message,
            canPickMany: true,
            ignoreFocusOut: true
        });

        return result?.map(item => item.label);
    }

    /**
     * Ask confirm question (Yes/No)
     *
     * @param question - Question definition
     * @param answers - Current answers
     * @returns Boolean answer
     */
    private async askConfirm(
        question: InterviewQuestion,
        answers: InterviewAnswers
    ): Promise<boolean | undefined> {
        const result = await vscode.window.showQuickPick(['Yes', 'No'], {
            placeHolder: question.message,
            ignoreFocusOut: true
        });

        if (result === undefined) {
            return undefined;
        }

        return result === 'Yes';
    }

    /**
     * Evaluate conditional expression
     *
     * @param condition - JavaScript expression (e.g., "answers.language === 'typescript'")
     * @param answers - Current answers
     * @returns True if condition passes, false otherwise
     *
     * DESIGN DECISION: Simple eval() with restricted scope
     * WHY: Flexible conditionals, templates control logic
     * SECURITY: Only evaluates user's own template files
     */
    private evaluateCondition(condition: string, answers: InterviewAnswers): boolean {
        try {
            // Create safe evaluation context
            const evalFunc = new Function('answers', `return ${condition}`);
            return evalFunc(answers);
        } catch (error) {
            this.logger.warn(`Failed to evaluate condition: ${condition}`, error as object);
            return true; // Default to showing question if condition evaluation fails
        }
    }

    /**
     * Validate answer against validation expression
     *
     * @param validation - JavaScript expression (e.g., "value.length > 0")
     * @param value - Answer value
     * @param answers - Current answers
     * @returns True if valid, false otherwise
     */
    private validateAnswer(
        validation: string,
        value: any,
        answers: InterviewAnswers
    ): boolean {
        try {
            // Create safe evaluation context
            const evalFunc = new Function('value', 'answers', `return ${validation}`);
            return evalFunc(value, answers);
        } catch (error) {
            this.logger.warn(`Failed to validate answer: ${validation}`, error as object);
            return true; // Default to accepting answer if validation fails
        }
    }

    /**
     * Resolve default value (may contain answer substitutions)
     *
     * @param defaultValue - Default value string
     * @param answers - Current answers
     * @returns Resolved default value
     *
     * DESIGN DECISION: Support {{variable}} substitution in defaults
     * WHY: Defaults can reference previous answers (e.g., "{{language}}-project")
     */
    private resolveDefault(
        defaultValue: string | undefined,
        answers: InterviewAnswers
    ): string | undefined {
        if (!defaultValue) {
            return undefined;
        }

        // Replace {{variable}} with answer values
        return defaultValue.replace(/\{\{(\w+)\}\}/g, (match, key) => {
            return answers[key]?.toString() || match;
        });
    }
}
