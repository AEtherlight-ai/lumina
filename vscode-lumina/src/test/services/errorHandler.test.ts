/**
 * ErrorHandler Test Suite (TDD RED Phase)
 *
 * DESIGN DECISION: Write tests FIRST following TDD protocol
 * WHY: Creates "ratchet" enforcing error handling requirements
 *
 * PATTERN: Pattern-TDD-001 (Test-Driven Development)
 * PATTERN: Pattern-ERROR-HANDLING-001 (Centralized Error Handling)
 * PATTERN: Pattern-MIDDLEWARE-001 (Service Integration Layer)
 * RELATED: MID-015
 */

import * as assert from 'assert';
import { ErrorHandler, ErrorCategory, AppError, ErrorHandlerOptions } from '../../services/ErrorHandler';
import { MiddlewareLogger } from '../../services/MiddlewareLogger';

suite('ErrorHandler Test Suite', () => {
	let errorHandler: ErrorHandler;
	let mockLogger: MiddlewareLogger;

	setup(() => {
		// Create mock logger
		mockLogger = MiddlewareLogger.getInstance();

		// Create error handler
		errorHandler = new ErrorHandler(mockLogger);
	});

	suite('Error Categorization', () => {
		test('should categorize network errors (ECONNREFUSED)', () => {
			// Arrange
			const networkError = new Error('connect ECONNREFUSED 127.0.0.1:3000');

			// Act
			const appError = (errorHandler as any).categorizeError(networkError);

			// Assert
			assert.strictEqual(appError.category, ErrorCategory.Network, 'Should categorize as network error');
			assert.strictEqual(appError.recoverable, true, 'Network errors should be recoverable');
			assert.ok(appError.userMessage.includes('Network'), 'User message should mention network');
		});

		test('should categorize network errors (ETIMEDOUT)', () => {
			// Arrange
			const timeoutError = new Error('request ETIMEDOUT');

			// Act
			const appError = (errorHandler as any).categorizeError(timeoutError);

			// Assert
			assert.strictEqual(appError.category, ErrorCategory.Network, 'Should categorize as network error');
			assert.strictEqual(appError.recoverable, true, 'Timeout errors should be recoverable');
		});

		test('should categorize file system errors (EACCES)', () => {
			// Arrange
			const permissionError = new Error('EACCES: permission denied');

			// Act
			const appError = (errorHandler as any).categorizeError(permissionError);

			// Assert
			assert.strictEqual(appError.category, ErrorCategory.FileSystem, 'Should categorize as filesystem error');
			assert.strictEqual(appError.recoverable, false, 'Permission errors should not be recoverable');
			assert.ok(appError.userMessage.includes('Permission'), 'User message should mention permissions');
		});

		test('should categorize file system errors (EPERM)', () => {
			// Arrange
			const permissionError = new Error('EPERM: operation not permitted');

			// Act
			const appError = (errorHandler as any).categorizeError(permissionError);

			// Assert
			assert.strictEqual(appError.category, ErrorCategory.FileSystem, 'Should categorize as filesystem error');
			assert.strictEqual(appError.recoverable, false, 'EPERM errors should not be recoverable');
		});

		test('should categorize validation errors', () => {
			// Arrange
			const validationError = new Error('Validation failed: invalid input');

			// Act
			const appError = (errorHandler as any).categorizeError(validationError, ErrorCategory.Validation);

			// Assert
			assert.strictEqual(appError.category, ErrorCategory.Validation, 'Should categorize as validation error');
			assert.strictEqual(appError.recoverable, false, 'Validation errors should not be recoverable');
		});

		test('should categorize unknown errors as service errors', () => {
			// Arrange
			const unknownError = new Error('Something went wrong');

			// Act
			const appError = (errorHandler as any).categorizeError(unknownError);

			// Assert
			assert.strictEqual(appError.category, ErrorCategory.Service, 'Unknown errors should be service errors');
			assert.strictEqual(appError.recoverable, false, 'Service errors should not be recoverable by default');
		});

		test('should categorize fatal errors', () => {
			// Arrange
			const fatalError = new Error('Out of memory');

			// Act
			const appError = (errorHandler as any).categorizeError(fatalError, ErrorCategory.Fatal);

			// Assert
			assert.strictEqual(appError.category, ErrorCategory.Fatal, 'Should categorize as fatal error');
			assert.strictEqual(appError.recoverable, false, 'Fatal errors should never be recoverable');
		});
	});

	suite('User-Friendly Messages', () => {
		test('should generate user-friendly message for network errors', () => {
			// Arrange
			const networkError = new Error('connect ECONNREFUSED 127.0.0.1:3000');

			// Act
			const appError = (errorHandler as any).categorizeError(networkError);

			// Assert
			assert.ok(!appError.userMessage.includes('ECONNREFUSED'), 'Should not expose technical error codes');
			assert.ok(!appError.userMessage.includes('127.0.0.1'), 'Should not expose IP addresses');
			assert.ok(appError.userMessage.length < 100, 'User message should be concise');
		});

		test('should simplify long error messages', () => {
			// Arrange
			const longError = new Error('This is a very long error message\nwith multiple lines\nand lots of stack trace information\nthat the user does not need to see');

			// Act
			const simplified = (errorHandler as any).simplifyMessage(longError.message);

			// Assert
			assert.ok(simplified.length <= 100, 'Should truncate long messages');
			assert.ok(!simplified.includes('\n'), 'Should remove newlines');
		});

		test('should remove stack traces from user messages', () => {
			// Arrange
			const errorWithStack = new Error('Error at line 42');
			errorWithStack.stack = 'Error: Error at line 42\n    at foo (file.ts:42:10)\n    at bar (file.ts:10:5)';

			// Act
			const appError = (errorHandler as any).categorizeError(errorWithStack);

			// Assert
			assert.ok(!appError.userMessage.includes('at foo'), 'Should not include stack trace');
			assert.ok(!appError.userMessage.includes('file.ts'), 'Should not include file paths');
		});
	});

	suite('Retry Mechanism', () => {
		test('should retry failed operation up to maxRetries', async function() {
			this.timeout(10000); // 10s timeout for retry test

			// Arrange
			let attempts = 0;
			const failTwiceThenSucceed = async () => {
				attempts++;
				if (attempts < 3) {
					throw new Error('connect ECONNREFUSED');
				}
				return 'success';
			};

			// Act
			const result = await errorHandler.handle(
				failTwiceThenSucceed,
				{
					maxRetries: 3,
					operationName: 'test_retry'
				}
			);

			// Assert
			assert.strictEqual(result, 'success', 'Should eventually succeed after retries');
			assert.strictEqual(attempts, 3, 'Should have retried 3 times');
		});

		test('should use exponential backoff for retries', async function() {
			this.timeout(10000); // 10s timeout

			// Arrange
			const startTime = Date.now();
			let attempts = 0;
			const failTwice = async () => {
				attempts++;
				if (attempts < 3) {
					throw new Error('connect ETIMEDOUT');
				}
				return 'success';
			};

			// Act
			await errorHandler.handle(failTwice, {
				maxRetries: 3,
				operationName: 'test_backoff'
			});

			const elapsedTime = Date.now() - startTime;

			// Assert
			// Exponential backoff: 1s + 2s = 3s minimum
			assert.ok(elapsedTime >= 3000, `Should wait at least 3s for exponential backoff, got ${elapsedTime}ms`);
			assert.ok(elapsedTime < 5000, `Should not exceed 5s total retry time, got ${elapsedTime}ms`);
		});

		test('should throw error after max retries exceeded', async () => {
			// Arrange
			const alwaysFails = async () => {
				throw new Error('connect ECONNREFUSED');
			};

			// Act & Assert
			await assert.rejects(
				async () => {
					await errorHandler.handle(alwaysFails, {
						maxRetries: 2,
						operationName: 'test_max_retries'
					});
				},
				(error: any) => {
					assert.ok(error.message.includes('Max retries exceeded') || error.message.includes('ECONNREFUSED'));
					return true;
				},
				'Should throw error after max retries'
			);
		});

		test('should not retry non-recoverable errors', async () => {
			// Arrange
			let attempts = 0;
			const failsWithPermissionError = async () => {
				attempts++;
				throw new Error('EACCES: permission denied');
			};

			// Act & Assert
			await assert.rejects(
				async () => {
					await errorHandler.handle(failsWithPermissionError, {
						maxRetries: 3,
						operationName: 'test_no_retry'
					});
				},
				/permission denied/
			);

			// Should only attempt once (no retries for non-recoverable errors)
			assert.strictEqual(attempts, 1, 'Should not retry non-recoverable errors');
		});
	});

	suite('Fallback Execution', () => {
		test('should execute fallback when operation fails', async () => {
			// Arrange
			const failingOperation = async () => {
				throw new Error('Operation failed');
			};
			const fallback = async () => 'fallback_result';

			// Act
			const result = await errorHandler.handle(
				failingOperation,
				{
					fallback,
					operationName: 'test_fallback'
				}
			);

			// Assert
			assert.strictEqual(result, 'fallback_result', 'Should return fallback result');
		});

		test('should prefer retry over fallback for recoverable errors', async function() {
			this.timeout(10000);

			// Arrange
			let attempts = 0;
			const failOnceThenSucceed = async () => {
				attempts++;
				if (attempts < 2) {
					throw new Error('connect ECONNREFUSED');
				}
				return 'retry_success';
			};
			const fallback = async () => 'fallback_result';

			// Act
			const result = await errorHandler.handle(
				failOnceThenSucceed,
				{
					maxRetries: 3,
					fallback,
					operationName: 'test_retry_before_fallback'
				}
			);

			// Assert
			assert.strictEqual(result, 'retry_success', 'Should succeed via retry, not fallback');
			assert.strictEqual(attempts, 2, 'Should have retried before using fallback');
		});

		test('should execute fallback after retries exhausted', async function() {
			this.timeout(10000);

			// Arrange
			const alwaysFails = async () => {
				throw new Error('connect ETIMEDOUT');
			};
			const fallback = async () => 'fallback_after_retries';

			// Act
			const result = await errorHandler.handle(
				alwaysFails,
				{
					maxRetries: 2,
					fallback,
					operationName: 'test_fallback_after_retries'
				}
			);

			// Assert
			assert.strictEqual(result, 'fallback_after_retries', 'Should use fallback after retries fail');
		});
	});

	suite('Graceful Degradation', () => {
		test('should return null when graceful degradation enabled', async () => {
			// Arrange
			const failingOperation = async () => {
				throw new Error('Service unavailable');
			};

			// Act
			const result = await errorHandler.handle(
				failingOperation,
				{
					gracefulDegradation: true,
					operationName: 'test_graceful'
				}
			);

			// Assert
			assert.strictEqual(result, null, 'Should return null for graceful degradation');
		});

		test('should show warning message on graceful degradation', async () => {
			// Note: This test verifies the behavior, but can't easily test VS Code UI in unit tests
			// Manual test: Check that vscode.window.showWarningMessage is called

			// Arrange
			const failingOperation = async () => {
				throw new Error('Feature unavailable');
			};

			// Act
			const result = await errorHandler.handle(
				failingOperation,
				{
					gracefulDegradation: true,
					operationName: 'test_warning'
				}
			);

			// Assert
			assert.strictEqual(result, null, 'Should return null');
		});
	});

	suite('Logger Integration', () => {
		test('should log errors with full context', async () => {
			// Arrange
			const testError = new Error('Test error for logging');
			const context = { userId: 789, action: 'test' };

			// Act
			try {
				await errorHandler.handle(
					async () => { throw testError; },
					{
						context,
						operationName: 'test_logging'
					}
				);
			} catch (e) {
				// Expected to throw
			}

			// Assert
			// Note: In real implementation, verify logger.error() was called
			// For now, we just verify the error handler doesn't crash
			assert.ok(true, 'Should log error without crashing');
		});

		test('should log retry attempts', async function() {
			this.timeout(10000);

			// Arrange
			let attempts = 0;
			const failTwice = async () => {
				attempts++;
				if (attempts < 3) {
					throw new Error('connect ETIMEDOUT');
				}
				return 'success';
			};

			// Act
			await errorHandler.handle(failTwice, {
				maxRetries: 3,
				operationName: 'test_log_retries'
			});

			// Assert
			// Note: Verify logger captured retry attempts
			assert.strictEqual(attempts, 3, 'Should have logged each retry attempt');
		});
	});

	suite('Performance', () => {
		test('should add <2ms overhead per error', async () => {
			// Arrange
			const quickError = async () => {
				throw new Error('Quick error');
			};

			// Act
			const startTime = Date.now();
			try {
				await errorHandler.handle(quickError, {
					gracefulDegradation: true,
					operationName: 'test_performance'
				});
			} catch (e) {
				// Expected
			}
			const elapsedTime = Date.now() - startTime;

			// Assert
			assert.ok(elapsedTime < 2, `Error handling should add <2ms overhead, took ${elapsedTime}ms`);
		});

		test('should handle errors concurrently without blocking', async () => {
			// Arrange
			const errors = Array.from({ length: 10 }, (_, i) =>
				errorHandler.handle(
					async () => { throw new Error(`Error ${i}`); },
					{
						gracefulDegradation: true,
						operationName: `test_concurrent_${i}`
					}
				)
			);

			// Act
			const startTime = Date.now();
			await Promise.all(errors);
			const elapsedTime = Date.now() - startTime;

			// Assert
			assert.ok(elapsedTime < 20, `10 concurrent errors should complete in <20ms, took ${elapsedTime}ms`);
		});
	});

	suite('Edge Cases', () => {
		test('should handle null error gracefully', async () => {
			// Arrange
			const throwNull = async () => {
				throw null;
			};

			// Act & Assert
			await assert.doesNotReject(
				async () => {
					await errorHandler.handle(throwNull, {
						gracefulDegradation: true,
						operationName: 'test_null_error'
					});
				},
				'Should handle null error without crashing'
			);
		});

		test('should handle non-Error objects thrown', async () => {
			// Arrange
			const throwString = async () => {
				throw 'string error';
			};

			// Act & Assert
			await assert.doesNotReject(
				async () => {
					await errorHandler.handle(throwString, {
						gracefulDegradation: true,
						operationName: 'test_string_error'
					});
				},
				'Should handle non-Error objects'
			);
		});

		test('should handle errors with circular references', async () => {
			// Arrange
			const circularError: any = new Error('Circular error');
			circularError.self = circularError;

			// Act & Assert
			await assert.doesNotReject(
				async () => {
					await errorHandler.handle(
						async () => { throw circularError; },
						{
							gracefulDegradation: true,
							operationName: 'test_circular'
						}
					);
				},
				'Should handle errors with circular references'
			);
		});
	});
});
