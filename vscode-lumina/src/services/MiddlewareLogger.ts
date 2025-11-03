/**
 * Middleware Logger Service
 *
 * DESIGN DECISION: Dual logging (output channel + file-based)
 * WHY: Real-time visibility (output channel) + persistent storage (files) for debugging
 *
 * REASONING CHAIN:
 * 1. Output Channel: Real-time visibility in VS Code Output panel
 * 2. File Logging: Persistent storage in .aetherlight/logs/ for debugging
 * 3. Structured JSON logs for parsing and analysis
 * 4. Log rotation (10MB max, keep 7 days)
 * 5. Async file writes (non-blocking)
 * 6. Performance metrics logged separately
 * 7. Performance target: <10ms overhead per log call
 *
 * PATTERN: Pattern-LOGGING-001 (Structured Logging)
 * PATTERN: Pattern-MIDDLEWARE-001 (Service Integration Layer)
 * PATTERN: Pattern-OBSERVABILITY-001 (System Observability)
 * RELATED: MID-014 (File-based Logging), MID-022 (Output Channel Logging)
 *
 * @module services/MiddlewareLogger
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Log level type
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Structured log entry (for file logging)
 */
export interface LogEntry {
	timestamp: string;
	level: LogLevel;
	message: string;
	context?: object;
	error?: string;
	stack?: string;
}

/**
 * Performance log entry
 */
export interface PerformanceEntry {
	timestamp: string;
	operation: string;
	duration: number;
	success: boolean;
}

/**
 * Middleware Logger
 *
 * Provides dual logging: output channel (real-time) + file-based (persistent).
 */
export class MiddlewareLogger {
	private static instance: MiddlewareLogger | null = null;
	private outputChannel: vscode.OutputChannel;

	// File-based logging properties
	private logDir: string | null = null;
	private logLevel: LogLevel = 'info';
	private fileLoggingEnabled: boolean = false;

	// Constants for file logging
	private static readonly MAX_LOG_SIZE = 10 * 1024 * 1024; // 10MB
	private static readonly MAX_LOG_AGE_DAYS = 7;
	private static readonly LOG_LEVELS: Record<LogLevel, number> = {
		debug: 0,
		info: 1,
		warn: 2,
		error: 3
	};

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
	 * Enable file-based logging
	 *
	 * DESIGN DECISION: File logging is opt-in
	 * WHY: Not all environments need persistent logs
	 *
	 * @param workspaceRoot - VS Code workspace root directory
	 * @param logLevel - Minimum log level (default: 'info')
	 */
	public enableFileLogging(workspaceRoot: string, logLevel: LogLevel = 'info'): void {
		this.logDir = path.join(workspaceRoot, '.aetherlight', 'logs');
		this.logLevel = logLevel;
		this.fileLoggingEnabled = true;
		this.ensureLogDir();
	}

	/**
	 * Disable file-based logging
	 */
	public disableFileLogging(): void {
		this.fileLoggingEnabled = false;
	}

	/**
	 * Check if file logging is enabled
	 */
	public isFileLoggingEnabled(): boolean {
		return this.fileLoggingEnabled;
	}

	/**
	 * Log debug message (both output channel and file if enabled)
	 *
	 * @param message - Debug message
	 * @param context - Optional context object
	 */
	public debug(message: string, context?: object): void {
		const timestamp = this.getTimestamp();
		this.outputChannel.appendLine(`[${timestamp}] [DEBUG] ${message}`);

		// File logging (if enabled and level allows)
		if (this.fileLoggingEnabled && this.shouldLog('debug')) {
			this.writeLog('debug', message, context);
		}
	}

	/**
	 * Log info message
	 *
	 * DESIGN DECISION: Structured format: [timestamp] [level] message
	 * WHY: Easy to read and grep
	 */
	public info(message: string, context?: object): void {
		const timestamp = this.getTimestamp();
		this.outputChannel.appendLine(`[${timestamp}] [INFO] ${message}`);

		// File logging (if enabled and level allows)
		if (this.fileLoggingEnabled && this.shouldLog('info')) {
			this.writeLog('info', message, context);
		}
	}

	/**
	 * Log warning message (both output channel and file if enabled)
	 *
	 * @param message - Warning message
	 * @param context - Optional context object
	 */
	public warn(message: string, context?: object): void {
		const timestamp = this.getTimestamp();
		this.outputChannel.appendLine(`[${timestamp}] [WARN] ${message}`);

		// File logging (if enabled and level allows)
		if (this.fileLoggingEnabled && this.shouldLog('warn')) {
			this.writeLog('warn', message, context);
		}
	}

	/**
	 * Log error message (both output channel and file if enabled)
	 *
	 * @param message - Error message
	 * @param error - Error object or string
	 * @param context - Optional context object
	 */
	public error(message: string, error?: any, context?: object): void {
		const timestamp = this.getTimestamp();
		this.outputChannel.appendLine(`[${timestamp}] [ERROR] ${message}`);
		if (error) {
			this.outputChannel.appendLine(`[${timestamp}] [ERROR] Details: ${error.message || error}`);
			if (error.stack) {
				this.outputChannel.appendLine(`[${timestamp}] [ERROR] Stack: ${error.stack}`);
			}
		}

		// File logging (if enabled and level allows)
		if (this.fileLoggingEnabled && this.shouldLog('error')) {
			this.writeLog('error', message, context, error);
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
	 * Log performance metrics to separate performance.log file
	 *
	 * DESIGN DECISION: Separate performance logs from regular logs
	 * WHY: Easier to analyze performance data without noise from debug/info logs
	 *
	 * @param operation - Operation name
	 * @param duration - Duration in milliseconds
	 * @param success - Whether operation succeeded
	 */
	public logPerformance(operation: string, duration: number, success: boolean): void {
		if (!this.fileLoggingEnabled || !this.logDir) {
			return;
		}

		const entry: PerformanceEntry = {
			timestamp: new Date().toISOString(),
			operation,
			duration,
			success
		};

		const logPath = path.join(this.logDir, 'performance.log');
		this.writeLogFile(logPath, JSON.stringify(entry) + '\n');
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

	/**
	 * Check if a log level should be logged
	 *
	 * @param level - Log level to check
	 * @returns true if level should be logged
	 */
	private shouldLog(level: LogLevel): boolean {
		const currentLevelValue = MiddlewareLogger.LOG_LEVELS[this.logLevel];
		const requestedLevelValue = MiddlewareLogger.LOG_LEVELS[level];
		return requestedLevelValue >= currentLevelValue;
	}

	/**
	 * Write structured log entry to file
	 *
	 * DESIGN DECISION: Async write with setImmediate
	 * WHY: Non-blocking I/O, meets <10ms performance target
	 *
	 * @param level - Log level
	 * @param message - Log message
	 * @param context - Optional context object
	 * @param error - Optional error object
	 */
	private writeLog(level: LogLevel, message: string, context?: object, error?: any): void {
		if (!this.logDir) {
			return;
		}

		const entry: LogEntry = {
			timestamp: new Date().toISOString(),
			level,
			message,
			context
		};

		// Add error details if present
		if (error) {
			entry.error = error.message || String(error);
			if (error.stack) {
				entry.stack = error.stack;
			}
		}

		const logPath = path.join(this.logDir, 'middleware.log');
		this.writeLogFile(logPath, JSON.stringify(entry) + '\n');
	}

	/**
	 * Write content to log file with rotation check
	 *
	 * DESIGN DECISION: Check rotation before every write
	 * WHY: Prevents logs from growing unbounded
	 *
	 * @param logPath - Path to log file
	 * @param content - Content to write
	 */
	private writeLogFile(logPath: string, content: string): void {
		// Check if log file needs rotation
		if (fs.existsSync(logPath)) {
			const stats = fs.statSync(logPath);
			if (stats.size >= MiddlewareLogger.MAX_LOG_SIZE) {
				this.rotateLog(logPath);
			}
		}

		// Async write (non-blocking)
		setImmediate(() => {
			try {
				fs.appendFileSync(logPath, content, { encoding: 'utf8' });
			} catch (err) {
				// Fallback: Log to console if file write fails
				console.error('[MiddlewareLogger] File write failed:', err);
			}
		});
	}

	/**
	 * Rotate log file when size exceeds limit
	 *
	 * DESIGN DECISION: Date-based rotation naming
	 * WHY: Easy to identify when logs were created
	 *
	 * @param logPath - Path to log file to rotate
	 */
	private rotateLog(logPath: string): void {
		try {
			const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0]; // 2025-11-03T15-30-45
			const rotatedPath = logPath.replace(/\.log$/, `-${timestamp}.log`);
			fs.renameSync(logPath, rotatedPath);

			// Clean old logs
			this.cleanOldLogs();
		} catch (err) {
			console.error('[MiddlewareLogger] Log rotation failed:', err);
		}
	}

	/**
	 * Clean up logs older than MAX_LOG_AGE_DAYS
	 *
	 * DESIGN DECISION: 7-day retention
	 * WHY: Balance between debugging needs and disk space
	 */
	private cleanOldLogs(): void {
		if (!this.logDir) {
			return;
		}

		try {
			const files = fs.readdirSync(this.logDir);
			const now = Date.now();
			const maxAge = MiddlewareLogger.MAX_LOG_AGE_DAYS * 24 * 60 * 60 * 1000;

			for (const file of files) {
				const filePath = path.join(this.logDir, file);
				const stats = fs.statSync(filePath);
				const age = now - stats.mtimeMs;

				if (age > maxAge) {
					fs.unlinkSync(filePath);
				}
			}
		} catch (err) {
			console.error('[MiddlewareLogger] Log cleanup failed:', err);
		}
	}

	/**
	 * Ensure log directory exists
	 *
	 * DESIGN DECISION: Create directory on initialization
	 * WHY: Fail early if directory can't be created
	 */
	private ensureLogDir(): void {
		if (!this.logDir) {
			return;
		}

		try {
			if (!fs.existsSync(this.logDir)) {
				fs.mkdirSync(this.logDir, { recursive: true });
			}
		} catch (err) {
			console.error('[MiddlewareLogger] Failed to create log directory:', err);
			this.fileLoggingEnabled = false; // Disable if directory can't be created
		}
	}
}
