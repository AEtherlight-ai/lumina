/**
 * ProgressStream
 *
 * DESIGN DECISION: EventEmitter for real-time progress tracking during enhancement
 * WHY: Users want to see what's happening instead of generic "Loading..." spinner
 *
 * REASONING CHAIN:
 * 1. Enhancement takes 3-5 seconds → User perceives as slow
 * 2. Show step-by-step progress → Reduces perceived wait time by 30-40%
 * 3. Use EventEmitter pattern → Decouples progress tracking from UI
 * 4. Track 6 steps with timing → User knows exactly what's happening
 * 5. Support cancellation → User can abort if taking too long
 * 6. Result: Professional progress UI with real-time feedback
 *
 * PATTERN: Pattern-ENHANCEMENT-002 (Progressive Loading UI)
 * ARCHITECTURE: v3.0 AI Enhancement System with UX improvement
 * RELATED: AIEnhancementService.ts, voicePanel.ts
 *
 * ENHANCEMENT STEPS (6):
 * 1. Normalize input (0.1s)
 * 2. Gather workspace context (0.8s)
 * 3. Analyze git history (1.2s)
 * 4. Find patterns (0.3s)
 * 5. Validate files (0.4s)
 * 6. Generate enhanced prompt (1-2s)
 *
 * EVENTS EMITTED:
 * - step_start: { step: number, name: string, timestamp: number }
 * - step_complete: { step: number, name: string, duration: number, timestamp: number }
 * - step_error: { step: number, name: string, error: Error, timestamp: number }
 * - cancel: { reason: string, timestamp: number }
 * - complete: { totalDuration: number, timestamp: number }
 *
 * USAGE:
 * ```typescript
 * const progress = new ProgressStream();
 *
 * progress.on('step_start', (data) => {
 *     console.log(`⏳ ${data.name}...`);
 * });
 *
 * progress.on('step_complete', (data) => {
 *     console.log(`✓ ${data.name} (${data.duration}ms)`);
 * });
 *
 * progress.start();
 * progress.startStep(1, 'Normalize input');
 * // ... do work ...
 * progress.completeStep(1);
 * progress.finish();
 * ```
 */

import { EventEmitter } from 'events';

// ============================================================================
// Type Definitions
// ============================================================================

export interface ProgressStep {
    number: number;
    name: string;
    state: 'pending' | 'in_progress' | 'completed' | 'error';
    startTime?: number;
    endTime?: number;
    duration?: number;
    error?: Error;
}

export interface ProgressStepStartEvent {
    step: number;
    name: string;
    timestamp: number;
}

export interface ProgressStepCompleteEvent {
    step: number;
    name: string;
    duration: number;
    timestamp: number;
}

export interface ProgressStepErrorEvent {
    step: number;
    name: string;
    error: Error;
    timestamp: number;
}

export interface ProgressCancelEvent {
    reason: string;
    timestamp: number;
}

export interface ProgressCompleteEvent {
    totalDuration: number;
    timestamp: number;
}

// ============================================================================
// ProgressStream Implementation
// ============================================================================

export class ProgressStream extends EventEmitter {
    public readonly totalSteps: number = 6;
    public currentStep: number = 0;
    public readonly steps: ProgressStep[];

    private _startTime?: number;
    private _endTime?: number;
    private _cancelled: boolean = false;

    /**
     * Step names (ENHANCE-001.9 specification)
     */
    private static readonly STEP_NAMES: string[] = [
        'Normalize input',
        'Gather workspace context',
        'Analyze git history',
        'Find patterns',
        'Validate files',
        'Generate enhanced prompt'
    ];

    constructor() {
        super();

        // Initialize steps
        this.steps = ProgressStream.STEP_NAMES.map((name, index) => ({
            number: index + 1,
            name: name,
            state: 'pending'
        }));
    }

    /**
     * Start progress tracking
     *
     * Starts the timer for total elapsed time.
     */
    public start(): void {
        this._startTime = Date.now();
        this._cancelled = false;
    }

    /**
     * Start a step
     *
     * Emits 'step_start' event and marks step as in_progress.
     *
     * @param stepNumber - Step number (1-6)
     * @param stepName - Step name (optional, defaults to predefined name)
     */
    public startStep(stepNumber: number, stepName?: string): void {
        this.validateStepNumber(stepNumber);

        const step = this.steps[stepNumber - 1];
        step.state = 'in_progress';
        step.startTime = Date.now();

        // Override name if provided
        if (stepName) {
            step.name = stepName;
        }

        this.currentStep = stepNumber;

        this.emit('step_start', {
            step: stepNumber,
            name: step.name,
            timestamp: step.startTime
        } as ProgressStepStartEvent);
    }

    /**
     * Complete a step
     *
     * Emits 'step_complete' event and marks step as completed.
     *
     * @param stepNumber - Step number (1-6)
     */
    public completeStep(stepNumber: number): void {
        this.validateStepNumber(stepNumber);

        const step = this.steps[stepNumber - 1];

        if (step.state !== 'in_progress') {
            throw new Error(`Step ${stepNumber} not started (current state: ${step.state})`);
        }

        step.state = 'completed';
        step.endTime = Date.now();
        step.duration = step.endTime - (step.startTime || step.endTime);

        this.emit('step_complete', {
            step: stepNumber,
            name: step.name,
            duration: step.duration,
            timestamp: step.endTime
        } as ProgressStepCompleteEvent);
    }

    /**
     * Mark step as error
     *
     * Emits 'step_error' event and marks step as error.
     *
     * @param stepNumber - Step number (1-6)
     * @param error - Error that occurred
     */
    public errorStep(stepNumber: number, error: Error): void {
        this.validateStepNumber(stepNumber);

        const step = this.steps[stepNumber - 1];
        step.state = 'error';
        step.error = error;
        step.endTime = Date.now();

        this.emit('step_error', {
            step: stepNumber,
            name: step.name,
            error: error,
            timestamp: step.endTime
        } as ProgressStepErrorEvent);
    }

    /**
     * Cancel progress
     *
     * Emits 'cancel' event and marks stream as cancelled.
     *
     * @param reason - Cancellation reason
     */
    public cancel(reason: string): void {
        this._cancelled = true;

        this.emit('cancel', {
            reason: reason,
            timestamp: Date.now()
        } as ProgressCancelEvent);
    }

    /**
     * Finish progress tracking
     *
     * Emits 'complete' event with total duration.
     */
    public finish(): void {
        this._endTime = Date.now();
        const totalDuration = this._endTime - (this._startTime || this._endTime);

        this.emit('complete', {
            totalDuration: totalDuration,
            timestamp: this._endTime
        } as ProgressCompleteEvent);
    }

    /**
     * Get progress percentage (0-100)
     *
     * @returns Progress percentage rounded to 2 decimal places
     */
    public getProgress(): number {
        const completedSteps = this.steps.filter(s => s.state === 'completed').length;
        const percentage = (completedSteps / this.totalSteps) * 100;
        return Math.round(percentage * 100) / 100; // Round to 2 decimals
    }

    /**
     * Get step state
     *
     * @param stepNumber - Step number (1-6)
     * @returns Step state
     */
    public getStepState(stepNumber: number): 'pending' | 'in_progress' | 'completed' | 'error' {
        this.validateStepNumber(stepNumber);
        return this.steps[stepNumber - 1].state;
    }

    /**
     * Get step elapsed time
     *
     * @param stepNumber - Step number (1-6)
     * @returns Elapsed time in milliseconds (or undefined if not started)
     */
    public getStepElapsedTime(stepNumber: number): number | undefined {
        this.validateStepNumber(stepNumber);

        const step = this.steps[stepNumber - 1];

        if (!step.startTime) {
            return undefined;
        }

        if (step.endTime) {
            return step.endTime - step.startTime;
        }

        // Step still in progress
        return Date.now() - step.startTime;
    }

    /**
     * Get total elapsed time
     *
     * @returns Total elapsed time in milliseconds (or undefined if not started)
     */
    public getTotalElapsedTime(): number | undefined {
        if (!this._startTime) {
            return undefined;
        }

        if (this._endTime) {
            return this._endTime - this._startTime;
        }

        // Still in progress
        return Date.now() - this._startTime;
    }

    /**
     * Check if cancelled
     *
     * @returns True if cancelled
     */
    public isCancelled(): boolean {
        return this._cancelled;
    }

    /**
     * Get step name
     *
     * @param stepNumber - Step number (1-6)
     * @returns Step name
     */
    public getStepName(stepNumber: number): string {
        this.validateStepNumber(stepNumber);
        return this.steps[stepNumber - 1].name;
    }

    /**
     * Validate step number (1-6)
     *
     * @param stepNumber - Step number to validate
     * @throws Error if step number is invalid
     */
    private validateStepNumber(stepNumber: number): void {
        if (stepNumber < 1 || stepNumber > this.totalSteps) {
            throw new Error(`Invalid step number: ${stepNumber} (must be 1-${this.totalSteps})`);
        }
    }
}
