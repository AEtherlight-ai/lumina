/**
 * Error Handler & Recovery Service
 *
 * DESIGN DECISION: Centralized error handling with recovery strategies
 * WHY: Consistent error handling, user-friendly messages, automatic recovery
 *
 * REASONING CHAIN:
 * 1. Error categorization: Network, Validation, FileSystem, Service, Fatal
 * 2. Recovery strategies: Retry (exponential backoff), Fallback, Graceful degradation
 * 3. User-friendly messages: Hide implementation details, guide user action
 * 4. Logger integration: Full error context for debugging
 * 5. Performance: <2ms overhead per error
 *
 * PATTERN: Pattern-ERROR-HANDLING-001 (Centralized Error Handling)
 * PATTERN: Pattern-MIDDLEWARE-001 (Service Integration Layer)
 * PATTERN: Pattern-OBSERVABILITY-001 (System Observability)
 * RELATED: MID-015, MID-014 (MiddlewareLogger), MID-013 (ServiceRegistry)
 *
 * @module services/ErrorHandler
 */

import * as vscode from 'vscode';
import { MiddlewareLogger } from './MiddlewareLogger';

/**
 * Error category types
 */
export enum ErrorCategory {
	Network = 'network',
	Validation = 'validation',
	FileSystem = 'filesystem',
	Service = 'service',
	Fatal = 'fatal'
}

/**
 * Application error interface
 */
export interface AppError extends Error {
	category: ErrorCategory;
	recoverable: boolean;
	userMessage: string;
	context?: object;
	originalError?: Error;
}

/**
 * Error handler options
 */
export interface ErrorHandlerOptions {
	maxRetries?: number;
	fallback?: () => Promise<any> | any;
	gracefulDegradation?: boolean;
	context?: object;
	operationName: string;
}

/**
 * Error Handler Service
 *
 * Provides centralized error handling with automatic recovery strategies.
 */
export class ErrorHandler {
	private logger: MiddlewareLogger;
	private retryAttempts = new Map<string, number>();

	/**
	 * Constructor
	 *
	 * @param logger - MiddlewareLogger instance for error logging
	 */
	constructor(logger: MiddlewareLogger) {
		this.logger = logger;
	}

	/**
	 * Handle operation with error recovery
	 *
	 * DESIGN DECISION: Wrap operations with error handling
	 * WHY: Automatic recovery, consistent error messages, logging
	 *
	 * @param operation - Async operation to execute
	 * @param options - Error handling options
	 * @returns Operation result or recovery result
	 */
	async handle<T>(
		operation: () => Promise<T>,
		options: ErrorHandlerOptions
	): Promise<T | null> {
		try {
			return await operation();
		} catch (error) {
			return await this.handleError<T>(error, operation, options);
		}
	}

	/**
	 * Handle error with recovery strategies
	 *
	 * @param error - Error that occurred
	 * @param operation - Original operation (for retry)
	 * @param options - Error handling options
	 * @returns Recovered result or throws
	 */
	private async handleError<T>(
		error: any,
		operation: () => Promise<T>,
		options: ErrorHandlerOptions
	): Promise<T | null> {
		// Convert to AppError
		const appError = this.categorizeError(error, options.context);

		// Log error with full context
		this.logger.error(
			`Error in ${options.operationName}: ${appError.userMessage}`,
			appError.originalError || appError,
			{
				category: appError.category,
				recoverable: appError.recoverable,
				...options.context
			}
		);

		// Retry strategy: Attempt retry for recoverable errors
		if (appError.recoverable && options.maxRetries && options.maxRetries > 0) {
			try {
				return await this.retry<T>(operation, options, 1);
			} catch (retryError) {
				// Retries exhausted, continue to fallback/degradation
				this.logger.warn(`Retries exhausted for ${options.operationName} after ${options.maxRetries} attempts`);
			}
		}

		// Fallback strategy: Execute fallback if provided
		if (options.fallback) {
			this.logger.info(`Using fallback for ${options.operationName}`);
			return await options.fallback();
		}

		// Graceful degradation: Return null and show warning
		if (options.gracefulDegradation) {
			vscode.window.showWarningMessage(appError.userMessage);
			return null;
		}

		// No recovery possible: Show error and throw
		vscode.window.showErrorMessage(appError.userMessage);
		throw appError;
	}

	/**
	 * Categorize error based on error message/type
	 *
	 * DESIGN DECISION: Pattern matching on error messages
	 * WHY: Node.js errors don't have consistent types, message matching is reliable
	 *
	 * @param error - Error to categorize
	 * @param category - Optional explicit category
	 * @param context - Additional context
	 * @returns AppError with category and user message
	 */
	private categorizeError(
		error: any,
		context?: object,
		category?: ErrorCategory
	): AppError {
		// Handle null/undefined errors
		if (!error) {
			return this.createAppError(
				new Error('Unknown error occurred'),
				ErrorCategory.Service,
				false,
				'An unexpected error occurred. Please try again.',
				context
			);
		}

		// Handle non-Error objects (string, number, etc.)
		if (!(error instanceof Error)) {
			return this.createAppError(
				new Error(String(error)),
				ErrorCategory.Service,
				false,
				`An error occurred: ${String(error).substring(0, 50)}`,
				context
			);
		}

		// Use explicit category if provided
		if (category) {
			return this.createAppError(
				error,
				category,
				this.isRecoverable(category),
				this.getUserMessage(error, category),
				context
			);
		}

		const message = error.message || '';

		// Network errors (recoverable)
		if (
			message.includes('ECONNREFUSED') ||
			message.includes('ETIMEDOUT') ||
			message.includes('ENOTFOUND') ||
			message.includes('ENETUNREACH')
		) {
			return this.createAppError(
				error,
				ErrorCategory.Network,
				true,
				'Network error. Retrying...',
				context
			);
		}

		// File system errors (not recoverable)
		if (
			message.includes('EACCES') ||
			message.includes('EPERM') ||
			message.includes('ENOENT')
		) {
			return this.createAppError(
				error,
				ErrorCategory.FileSystem,
				false,
				this.getFileSystemMessage(message),
				context
			);
		}

		// Validation errors (not recoverable)
		if (
			message.includes('Validation') ||
			message.includes('Invalid') ||
			message.includes('Required')
		) {
			return this.createAppError(
				error,
				ErrorCategory.Validation,
				false,
				this.simplifyMessage(message),
				context
			);
		}

		// Fatal errors (not recoverable)
		if (
			message.includes('Out of memory') ||
			message.includes('FATAL') ||
			message.includes('Cannot recover')
		) {
			return this.createAppError(
				error,
				ErrorCategory.Fatal,
				false,
				'A critical error occurred. Please restart the application.',
				context
			);
		}

		// Default: Service error (not recoverable)
		return this.createAppError(
			error,
			ErrorCategory.Service,
			false,
			`An error occurred: ${this.simplifyMessage(message)}`,
			context
		);
	}

	/**
	 * Create AppError with all fields
	 */
	private createAppError(
		error: Error,
		category: ErrorCategory,
		recoverable: boolean,
		userMessage: string,
		context?: object
	): AppError {
		return {
			...error,
			name: error.name,
			message: error.message,
			stack: error.stack,
			category,
			recoverable,
			userMessage,
			context,
			originalError: error
		};
	}

	/**
	 * Determine if error category is recoverable
	 */
	private isRecoverable(category: ErrorCategory): boolean {
		return category === ErrorCategory.Network;
	}

	/**
	 * Get user-friendly message for error category
	 */
	private getUserMessage(error: Error, category: ErrorCategory): string {
		switch (category) {
			case ErrorCategory.Network:
				return 'Network error. Retrying...';
			case ErrorCategory.Validation:
				return this.simplifyMessage(error.message);
			case ErrorCategory.FileSystem:
				return this.getFileSystemMessage(error.message);
			case ErrorCategory.Fatal:
				return 'A critical error occurred. Please restart the application.';
			default:
				return `An error occurred: ${this.simplifyMessage(error.message)}`;
		}
	}

	/**
	 * Get user-friendly file system error message
	 */
	private getFileSystemMessage(message: string): string {
		if (message.includes('EACCES') || message.includes('EPERM')) {
			return 'Permission denied. Please check file permissions.';
		}
		if (message.includes('ENOENT')) {
			return 'File or directory not found.';
		}
		return 'File system error occurred.';
	}

	/**
	 * Simplify error message for user display
	 *
	 * DESIGN DECISION: Remove technical details from user messages
	 * WHY: Users don't care about stack traces, file paths, error codes
	 *
	 * @param message - Original error message
	 * @returns Simplified message (max 100 chars, no newlines)
	 */
	private simplifyMessage(message: string): string {
		// Take first line only (remove stack trace)
		const firstLine = message.split('\n')[0];

		// Truncate to 100 characters
		return firstLine.length > 100
			? firstLine.substring(0, 97) + '...'
			: firstLine;
	}

	/**
	 * Retry operation with exponential backoff
	 *
	 * DESIGN DECISION: Exponential backoff (1s, 2s, 4s, 8s)
	 * WHY: Prevents overwhelming failing services, gives time to recover
	 *
	 * @param operation - Operation to retry
	 * @param options - Error handler options
	 * @param attempt - Current attempt number (1-indexed)
	 * @returns Operation result
	 * @throws Error after max retries exceeded
	 */
	private async retry<T>(
		operation: () => Promise<T>,
		options: ErrorHandlerOptions,
		attempt: number
	): Promise<T> {
		const maxRetries = options.maxRetries || 3;

		if (attempt > maxRetries) {
			throw new Error('Max retries exceeded');
		}

		// Exponential backoff: 2^(attempt-1) seconds
		// Attempt 1: 1s, Attempt 2: 2s, Attempt 3: 4s
		const delayMs = Math.pow(2, attempt - 1) * 1000;

		this.logger.info(
			`Retrying ${options.operationName} (attempt ${attempt}/${maxRetries}) after ${delayMs}ms`
		);

		// Wait before retry
		await this.sleep(delayMs);

		try {
			return await operation();
		} catch (error) {
			// Retry again
			return await this.retry<T>(operation, options, attempt + 1);
		}
	}

	/**
	 * Sleep for specified milliseconds
	 *
	 * @param ms - Milliseconds to sleep
	 */
	private sleep(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	/**
	 * Reset retry attempts for operation
	 *
	 * @param operationName - Operation name to reset
	 */
	resetRetries(operationName: string): void {
		this.retryAttempts.delete(operationName);
	}

	/**
	 * Clear all retry attempts
	 */
	clearAllRetries(): void {
		this.retryAttempts.clear();
	}
}
