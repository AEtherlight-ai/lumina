/**
 * User Choice Prompt Utility (MID-025)
 *
 * DESIGN DECISION: When system has medium confidence (60-80%), ask user for decision
 * WHY: User has control over decisions, not black box automation
 *
 * REASONING CHAIN:
 * 1. System detects medium-confidence decision (e.g., agent assignment with multiple matches)
 * 2. Instead of auto-selecting, present user with 3-4 options
 * 3. Each option has: label + description (explaining why recommended)
 * 4. User selects or provides custom input ("Other")
 * 5. Log choice for learning (improve future confidence scoring)
 * 6. Result: Transparent, user-controlled automation
 *
 * PATTERN: Pattern-USER-FEEDBACK-001 (User Choice System)
 * PATTERN: Pattern-CONFIDENCE-SCORING-001 (Medium Confidence Threshold)
 * RELATED: MID-025 (User Choice System sprint task)
 *
 * @module utils/UserChoicePrompt
 */

import * as vscode from 'vscode';

/**
 * Choice option presented to user
 */
export interface ChoiceOption {
	label: string;           // Short label (e.g., "Recommended: api-agent")
	description: string;     // Explanation (e.g., "Matches 'API' category, 3 pattern overlaps")
	value: string;           // Value to return if selected (e.g., "api-agent")
	isRecommended?: boolean; // Highlight as recommended option
}

/**
 * User choice result
 */
export interface UserChoiceResult {
	selected: string | null; // Selected value (null if cancelled)
	customInput?: string;    // Custom input if "Other" selected
	timestamp: number;       // When choice was made (for logging/learning)
}

/**
 * User choice context (for logging and learning)
 */
export interface UserChoiceContext {
	decisionType: string;    // e.g., "agent_assignment", "pattern_selection", "skill_creation"
	confidence: number;      // 0.0-1.0 confidence score
	taskId?: string;         // Task ID if applicable
	metadata?: Record<string, any>; // Additional context
}

/**
 * Show user choice prompt with multiple options
 *
 * DESIGN DECISION: Use vscode.window.showQuickPick for multi-choice
 * WHY: Native VS Code UI, keyboard navigation, search filtering
 *
 * TDD WORKFLOW (MID-025):
 * - RED: Test written first (test/utils/userChoicePrompt.test.ts)
 * - GREEN: This implementation makes test pass
 * - REFACTOR: Integration into services
 *
 * @param title - Prompt title (e.g., "Multiple agents match this task")
 * @param message - Detailed message explaining the situation
 * @param options - 2-3 choice options + "Other" (added automatically)
 * @param context - Context for logging and learning
 * @returns UserChoiceResult with selection or null if cancelled
 */
export async function showUserChoicePrompt(
	title: string,
	message: string,
	options: ChoiceOption[],
	context: UserChoiceContext
): Promise<UserChoiceResult> {
	// Build QuickPick items
	const items: vscode.QuickPickItem[] = options.map(opt => ({
		label: opt.isRecommended ? `⭐ ${opt.label}` : opt.label,
		description: opt.description,
		detail: opt.value
	}));

	// Add "Other" option for custom input
	items.push({
		label: '✏️ Other (custom input)',
		description: 'Provide your own value',
		detail: 'custom'
	});

	// Add "Skip" option
	items.push({
		label: '⏭️ Skip / Manual',
		description: 'I\'ll handle this manually',
		detail: 'skip'
	});

	// Show QuickPick
	const selected = await vscode.window.showQuickPick(items, {
		title: `${title} (Confidence: ${Math.round(context.confidence * 100)}%)`,
		placeHolder: message,
		canPickMany: false,
		ignoreFocusOut: true // Don't close if user clicks elsewhere
	});

	if (!selected) {
		// User cancelled (ESC key or clicked away)
		return {
			selected: null,
			timestamp: Date.now()
		};
	}

	// Handle selection
	if (selected.detail === 'custom') {
		// User chose "Other" - prompt for custom input
		const customInput = await vscode.window.showInputBox({
			title: 'Custom Input',
			prompt: 'Enter your custom value:',
			placeHolder: 'e.g., my-custom-agent',
			validateInput: (value) => {
				if (!value || value.trim() === '') {
					return 'Value cannot be empty';
				}
				return null;
			}
		});

		if (!customInput) {
			// User cancelled custom input
			return {
				selected: null,
				timestamp: Date.now()
			};
		}

		// Log custom input for learning
		logUserChoice(context, 'custom', customInput);

		return {
			selected: 'custom',
			customInput,
			timestamp: Date.now()
		};
	} else if (selected.detail === 'skip') {
		// User chose to skip
		logUserChoice(context, 'skip', null);

		return {
			selected: 'skip',
			timestamp: Date.now()
		};
	} else {
		// User chose one of the options
		const selectedOption = options.find(opt => opt.value === selected.detail);
		if (!selectedOption) {
			// Shouldn't happen, but handle gracefully
			return {
				selected: null,
				timestamp: Date.now()
			};
		}

		// Log selection for learning
		logUserChoice(context, selectedOption.value, null);

		return {
			selected: selectedOption.value,
			timestamp: Date.now()
		};
	}
}

/**
 * Log user choice for learning and analytics
 *
 * DESIGN DECISION: Log to output channel for debugging + future ML training
 * WHY: User choices improve future confidence scoring and recommendations
 *
 * @param context - Decision context
 * @param selected - Selected value
 * @param customInput - Custom input if applicable
 */
function logUserChoice(
	context: UserChoiceContext,
	selected: string,
	customInput: string | null
): void {
	const logEntry = {
		timestamp: new Date().toISOString(),
		decisionType: context.decisionType,
		confidence: context.confidence,
		taskId: context.taskId,
		selected,
		customInput,
		metadata: context.metadata
	};

	console.log('[UserChoicePrompt] User choice logged:', logEntry);

	// TODO: Store in workspace state for ML training
	// Can be analyzed later to improve confidence scoring algorithms
}
