/**
 * WalkthroughManager: Coordinates the ÆtherLight getting started walkthrough
 *
 * DESIGN DECISION: Action-oriented walkthrough that configures actual project
 * WHY: Users learn by doing, not by watching demonstrations
 *
 * REASONING CHAIN:
 * 1. Problem: Users need to understand what ÆtherLight can do
 * 2. Problem: Traditional demos don't engage users
 * 3. Solution: Walkthrough that actually configures THEIR project
 * 4. Solution: Use Phase 3-5 detection/interview system AS the walkthrough
 * 5. Result: Users see value immediately, configuration is done as side effect
 *
 * WALKTHROUGH FLOW (5 steps):
 * 1. Welcome & Safety → Warn about backup, explain what will happen
 * 2. Analyze Project → Run detection on their actual workspace
 * 3. Configure Gaps → Interview for missing configuration
 * 4. Review Config → Show generated .aetherlight/project-config.json
 * 5. Ready to Sprint → Explain sprints, next steps
 *
 * PATTERN: Pattern-TDD-001 (90% coverage for infrastructure)
 * RELATED: Phase 3 (Detection), Phase 4 (Interview), Phase 5 (Migration)
 */

import * as vscode from 'vscode';
import { MiddlewareLogger } from './MiddlewareLogger';

/**
 * Walkthrough step identifiers
 */
export enum WalkthroughStep {
    Welcome = 'welcome',
    Analyze = 'analyze',
    Configure = 'configure',
    Review = 'review',
    Sprint = 'sprint'
}

/**
 * Walkthrough progress tracking
 */
export interface WalkthroughProgress {
    /** Steps completed */
    completedSteps: WalkthroughStep[];

    /** Current step */
    currentStep: WalkthroughStep;

    /** Walkthrough started timestamp */
    startedAt: Date;

    /** Walkthrough completed timestamp */
    completedAt?: Date;

    /** Project analyzed flag */
    projectAnalyzed: boolean;

    /** Configuration generated flag */
    configGenerated: boolean;
}

/**
 * WalkthroughManager: Coordinates getting started walkthrough
 *
 * DESIGN DECISION: Stateful service with VS Code ExtensionContext storage
 * WHY: Persist progress across sessions, detect first-run
 */
export class WalkthroughManager {
    private logger: MiddlewareLogger;
    private static readonly STORAGE_KEY = 'aetherlight.walkthrough.progress';
    private static readonly FIRST_RUN_KEY = 'aetherlight.walkthrough.firstRun';

    constructor(private context: vscode.ExtensionContext) {
        this.logger = MiddlewareLogger.getInstance();
    }

    /**
     * Check if this is first run (walkthrough never started)
     *
     * @returns True if first run
     *
     * ALGORITHM:
     * 1. Check global state for first run flag
     * 2. If flag doesn't exist → First run
     * 3. If flag is true → Not first run
     * 4. Return result
     */
    public isFirstRun(): boolean {
        const startTime = this.logger.startOperation('WalkthroughManager.isFirstRun', {});

        try {
            // Check if first run flag exists
            const firstRunFlag = this.context.globalState.get<boolean>(
                WalkthroughManager.FIRST_RUN_KEY,
                true // Default to true (first run)
            );

            this.logger.endOperation('WalkthroughManager.isFirstRun', startTime, {
                isFirstRun: firstRunFlag
            });

            return firstRunFlag;
        } catch (error) {
            this.logger.failOperation('WalkthroughManager.isFirstRun', startTime, error);
            return false; // Safe default (don't show walkthrough on error)
        }
    }

    /**
     * Mark first run as completed
     *
     * @returns Promise<void>
     *
     * ALGORITHM:
     * 1. Set first run flag to false in global state
     * 2. Log the update
     */
    public async markFirstRunCompleted(): Promise<void> {
        const startTime = this.logger.startOperation('WalkthroughManager.markFirstRunCompleted', {});

        try {
            await this.context.globalState.update(WalkthroughManager.FIRST_RUN_KEY, false);

            this.logger.endOperation('WalkthroughManager.markFirstRunCompleted', startTime, {});
        } catch (error) {
            this.logger.failOperation('WalkthroughManager.markFirstRunCompleted', startTime, error);
            throw error;
        }
    }

    /**
     * Get walkthrough progress
     *
     * @returns Walkthrough progress or null if never started
     *
     * ALGORITHM:
     * 1. Read progress from global state
     * 2. If no progress → Return null
     * 3. Parse and return progress
     */
    public getProgress(): WalkthroughProgress | null {
        const startTime = this.logger.startOperation('WalkthroughManager.getProgress', {});

        try {
            const progressData = this.context.globalState.get<WalkthroughProgress>(
                WalkthroughManager.STORAGE_KEY
            );

            this.logger.endOperation('WalkthroughManager.getProgress', startTime, {
                hasProgress: !!progressData
            });

            return progressData || null;
        } catch (error) {
            this.logger.failOperation('WalkthroughManager.getProgress', startTime, error);
            return null;
        }
    }

    /**
     * Start walkthrough (initialize progress)
     *
     * @returns Promise<WalkthroughProgress> - Initial progress
     *
     * ALGORITHM:
     * 1. Create initial progress object
     * 2. Save to global state
     * 3. Mark first run as completed
     * 4. Return progress
     */
    public async startWalkthrough(): Promise<WalkthroughProgress> {
        const startTime = this.logger.startOperation('WalkthroughManager.startWalkthrough', {});

        try {
            const progress: WalkthroughProgress = {
                completedSteps: [],
                currentStep: WalkthroughStep.Welcome,
                startedAt: new Date(),
                projectAnalyzed: false,
                configGenerated: false
            };

            await this.context.globalState.update(WalkthroughManager.STORAGE_KEY, progress);
            await this.markFirstRunCompleted();

            this.logger.endOperation('WalkthroughManager.startWalkthrough', startTime, {});

            return progress;
        } catch (error) {
            this.logger.failOperation('WalkthroughManager.startWalkthrough', startTime, error);
            throw error;
        }
    }

    /**
     * Mark step as completed
     *
     * @param step - Step to mark complete
     * @returns Promise<void>
     *
     * ALGORITHM:
     * 1. Get current progress
     * 2. If no progress → Start walkthrough first
     * 3. Add step to completed steps (if not already there)
     * 4. Update current step to next step
     * 5. Save updated progress
     */
    public async completeStep(step: WalkthroughStep): Promise<void> {
        const startTime = this.logger.startOperation('WalkthroughManager.completeStep', {
            step
        });

        try {
            let progress = this.getProgress();

            // If no progress, start walkthrough
            if (!progress) {
                progress = await this.startWalkthrough();
            }

            // Add step to completed steps (avoid duplicates)
            if (!progress.completedSteps.includes(step)) {
                progress.completedSteps.push(step);
            }

            // Update current step to next step
            const nextStep = this.getNextStep(step);
            if (nextStep) {
                progress.currentStep = nextStep;
            } else {
                // All steps completed
                progress.completedAt = new Date();
            }

            // Save updated progress
            await this.context.globalState.update(WalkthroughManager.STORAGE_KEY, progress);

            this.logger.endOperation('WalkthroughManager.completeStep', startTime, {
                completedSteps: progress.completedSteps.length,
                currentStep: progress.currentStep
            });
        } catch (error) {
            this.logger.failOperation('WalkthroughManager.completeStep', startTime, error);
            throw error;
        }
    }

    /**
     * Mark project as analyzed
     *
     * @returns Promise<void>
     *
     * ALGORITHM:
     * 1. Get current progress
     * 2. Set projectAnalyzed flag to true
     * 3. Save updated progress
     */
    public async markProjectAnalyzed(): Promise<void> {
        const startTime = this.logger.startOperation('WalkthroughManager.markProjectAnalyzed', {});

        try {
            let progress = this.getProgress();

            // If no progress, start walkthrough
            if (!progress) {
                progress = await this.startWalkthrough();
            }

            progress.projectAnalyzed = true;

            await this.context.globalState.update(WalkthroughManager.STORAGE_KEY, progress);

            this.logger.endOperation('WalkthroughManager.markProjectAnalyzed', startTime, {});
        } catch (error) {
            this.logger.failOperation('WalkthroughManager.markProjectAnalyzed', startTime, error);
            throw error;
        }
    }

    /**
     * Mark configuration as generated
     *
     * @returns Promise<void>
     *
     * ALGORITHM:
     * 1. Get current progress
     * 2. Set configGenerated flag to true
     * 3. Save updated progress
     */
    public async markConfigGenerated(): Promise<void> {
        const startTime = this.logger.startOperation('WalkthroughManager.markConfigGenerated', {});

        try {
            let progress = this.getProgress();

            // If no progress, start walkthrough
            if (!progress) {
                progress = await this.startWalkthrough();
            }

            progress.configGenerated = true;

            await this.context.globalState.update(WalkthroughManager.STORAGE_KEY, progress);

            this.logger.endOperation('WalkthroughManager.markConfigGenerated', startTime, {});
        } catch (error) {
            this.logger.failOperation('WalkthroughManager.markConfigGenerated', startTime, error);
            throw error;
        }
    }

    /**
     * Reset walkthrough progress (for testing or restart)
     *
     * @returns Promise<void>
     *
     * ALGORITHM:
     * 1. Delete progress from global state
     * 2. Reset first run flag
     */
    public async resetProgress(): Promise<void> {
        const startTime = this.logger.startOperation('WalkthroughManager.resetProgress', {});

        try {
            await this.context.globalState.update(WalkthroughManager.STORAGE_KEY, undefined);
            await this.context.globalState.update(WalkthroughManager.FIRST_RUN_KEY, true);

            this.logger.endOperation('WalkthroughManager.resetProgress', startTime, {});
        } catch (error) {
            this.logger.failOperation('WalkthroughManager.resetProgress', startTime, error);
            throw error;
        }
    }

    /**
     * Show walkthrough in VS Code
     *
     * @returns Promise<void>
     *
     * ALGORITHM:
     * 1. Use VS Code commands API to open walkthrough
     * 2. Pass walkthrough ID from package.json
     */
    public async showWalkthrough(): Promise<void> {
        const startTime = this.logger.startOperation('WalkthroughManager.showWalkthrough', {});

        try {
            // Open walkthrough using VS Code commands API
            await vscode.commands.executeCommand(
                'workbench.action.openWalkthrough',
                'aetherlight.aetherlight#aetherlight.setup',
                false
            );

            this.logger.endOperation('WalkthroughManager.showWalkthrough', startTime, {});
        } catch (error) {
            this.logger.failOperation('WalkthroughManager.showWalkthrough', startTime, error);
            // Don't throw - failing to show walkthrough is not critical
            this.logger.warn('Failed to show walkthrough', { error });
        }
    }

    /**
     * Get next step after given step
     *
     * @param currentStep - Current step
     * @returns Next step or null if at end
     *
     * ALGORITHM:
     * 1. Map steps in order
     * 2. Find current step index
     * 3. Return next step or null
     */
    private getNextStep(currentStep: WalkthroughStep): WalkthroughStep | null {
        const stepOrder: WalkthroughStep[] = [
            WalkthroughStep.Welcome,
            WalkthroughStep.Analyze,
            WalkthroughStep.Configure,
            WalkthroughStep.Review,
            WalkthroughStep.Sprint
        ];

        const currentIndex = stepOrder.indexOf(currentStep);
        if (currentIndex === -1 || currentIndex === stepOrder.length - 1) {
            return null; // Invalid or last step
        }

        return stepOrder[currentIndex + 1];
    }
}
