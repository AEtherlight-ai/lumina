/**
 * Middleware Logger Service
 *
 * DESIGN DECISION: Centralized logging for all middleware operations
 * WHY: Users need visibility into middleware activity for debugging and transparency
 *
 * REASONING CHAIN:
 * 1. Create output channel: 'ÆtherLight - Middleware'
 * 2. Provide logging methods with timestamps
 * 3. Performance target: <10ms overhead per log call
 * 4. Accessible via View → Output → ÆtherLight - Middleware
 * 5. Log levels: info, warn, error
 * 6. Auto-format timestamps, task IDs, operation names
 *
 * PATTERN: Pattern-LOGGING-001 (Structured Logging)
 * RELATED: MID-022 (Output Channel Logging)
 *
 * @module services/MiddlewareLogger
 */

import * as vscode from 'vscode';

/**
 * Middleware Logger
 *
 * Provides structured logging for all middleware operations.
 */
export class MiddlewareLogger {
	private static instance: MiddlewareLogger | null = null;
	private outputChannel: vscode.OutputChannel;

	private constructor() {
		this.outputChannel = vscode.window.createOutputChannel('ÆtherLight - Middleware');
	}

	/**
	 * Get singleton instance
	 *
	 * DESIGN DECISION: Singleton pattern for global logger
	 * WHY: Single output channel shared across all services
	 */
	public static getInstance(): MiddlewareLogger {
		if (!MiddlewareLogger.instance) {
			MiddlewareLogger.instance = new MiddlewareLogger();
		}
		return MiddlewareLogger.instance;
	}

	/**
	 * Format timestamp
	 */
	private getTimestamp(): string {
		const now = new Date();
		return now.toISOString().substring(11, 23); // HH:MM:SS.mmm
	}

	/**
	 * Log info message
	 *
	 * DESIGN DECISION: Structured format: [timestamp] [level] message
	 * WHY: Easy to read and grep
	 */
	public info(message: string): void {
		const timestamp = this.getTimestamp();
		this.outputChannel.appendLine(`[${timestamp}] [INFO] ${message}`);
	}

	/**
	 * Log warning message
	 */
	public warn(message: string): void {
		const timestamp = this.getTimestamp();
		this.outputChannel.appendLine(`[${timestamp}] [WARN] ${message}`);
	}

	/**
	 * Log error message
	 */
	public error(message: string, error?: any): void {
		const timestamp = this.getTimestamp();
		this.outputChannel.appendLine(`[${timestamp}] [ERROR] ${message}`);
		if (error) {
			this.outputChannel.appendLine(`[${timestamp}] [ERROR] Details: ${error.message || error}`);
			if (error.stack) {
				this.outputChannel.appendLine(`[${timestamp}] [ERROR] Stack: ${error.stack}`);
			}
		}
	}

	/**
	 * Log operation start
	 *
	 * DESIGN DECISION: Track operation duration
	 * WHY: Performance monitoring for <10ms target
	 */
	public startOperation(operation: string, context?: any): number {
		const timestamp = Date.now();
		const contextStr = context ? ` | Context: ${JSON.stringify(context)}` : '';
		this.info(`▶️ START: ${operation}${contextStr}`);
		return timestamp;
	}

	/**
	 * Log operation end
	 */
	public endOperation(operation: string, startTime: number, result?: any): void {
		const duration = Date.now() - startTime;
		const resultStr = result ? ` | Result: ${JSON.stringify(result)}` : '';
		this.info(`✅ END: ${operation} | Duration: ${duration}ms${resultStr}`);
	}

	/**
	 * Log operation failure
	 */
	public failOperation(operation: string, startTime: number, error: any): void {
		const duration = Date.now() - startTime;
		this.error(`❌ FAIL: ${operation} | Duration: ${duration}ms`, error);
	}

	/**
	 * Log section header
	 *
	 * DESIGN DECISION: Visual separators for major operations
	 * WHY: Easier to scan logs
	 */
	public section(title: string): void {
		this.outputChannel.appendLine('');
		this.outputChannel.appendLine(`${'='.repeat(80)}`);
		this.outputChannel.appendLine(`  ${title}`);
		this.outputChannel.appendLine(`${'='.repeat(80)}`);
	}

	/**
	 * Show output channel
	 *
	 * DESIGN DECISION: Programmatically show channel on errors
	 * WHY: User doesn't have to manually navigate to View → Output
	 */
	public show(): void {
		this.outputChannel.show(true); // preserveFocus = true
	}

	/**
	 * Clear output channel
	 */
	public clear(): void {
		this.outputChannel.clear();
	}
}
