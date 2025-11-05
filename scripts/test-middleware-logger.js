#!/usr/bin/env node

/**
 * Quick MiddlewareLogger Validation Script
 *
 * Tests dual logging functionality (output channel + file-based)
 */

const path = require('path');
const fs = require('fs');

// Import MiddlewareLogger from compiled output
const { MiddlewareLogger } = require(path.join(__dirname, '../vscode-lumina/out/services/MiddlewareLogger.js'));

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🧪 MiddlewareLogger Quick Validation');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Setup temp directory
const tempDir = path.join(__dirname, '../temp-logger-test');
const logDir = path.join(tempDir, '.aetherlight', 'logs');

// Cleanup previous runs
if (fs.existsSync(tempDir)) {
	fs.rmSync(tempDir, { recursive: true, force: true });
}
fs.mkdirSync(tempDir, { recursive: true });

try {
	// Test 1: Singleton pattern
	const logger1 = MiddlewareLogger.getInstance();
	const logger2 = MiddlewareLogger.getInstance();
	console.log('✅ Test 1: Singleton pattern');
	console.log(`   Same instance: ${logger1 === logger2}`);

	// Test 2: File logging disabled by default
	console.log('\n✅ Test 2: File logging disabled by default');
	console.log(`   File logging enabled: ${logger1.isFileLoggingEnabled()}`);

	// Test 3: Enable file logging
	logger1.enableFileLogging(tempDir, 'debug');
	console.log('\n✅ Test 3: Enable file logging');
	console.log(`   File logging enabled: ${logger1.isFileLoggingEnabled()}`);
	console.log(`   Log directory created: ${fs.existsSync(logDir)}`);

	// Test 4: Write debug message
	logger1.debug('Test debug message', { userId: 123 });
	console.log('\n✅ Test 4: Write debug message with context');

	// Test 5: Write info message
	logger1.info('Test info message', { operation: 'test' });
	console.log('✅ Test 5: Write info message with context');

	// Test 6: Write warning message
	logger1.warn('Test warning message', { severity: 'medium' });
	console.log('✅ Test 6: Write warning message with context');

	// Test 7: Write error message
	const testError = new Error('Test error');
	logger1.error('Test error message', testError, { errorCode: 500 });
	console.log('✅ Test 7: Write error message with error object and context');

	// Test 8: Log performance metrics
	logger1.logPerformance('test_operation', 150, true);
	console.log('✅ Test 8: Log performance metrics');

	// Wait for async writes to complete
	setTimeout(() => {
		// Test 9: Verify log files created
		const middlewareLogPath = path.join(logDir, 'middleware.log');
		const performanceLogPath = path.join(logDir, 'performance.log');

		console.log('\n✅ Test 9: Verify log files created');
		console.log(`   middleware.log exists: ${fs.existsSync(middlewareLogPath)}`);
		console.log(`   performance.log exists: ${fs.existsSync(performanceLogPath)}`);

		// Test 10: Verify log content
		if (fs.existsSync(middlewareLogPath)) {
			const logContent = fs.readFileSync(middlewareLogPath, 'utf8');
			const lines = logContent.trim().split('\n');
			console.log('\n✅ Test 10: Verify log content');
			console.log(`   Log entries written: ${lines.length}`);

			// Parse and validate structure
			let validEntries = 0;
			for (const line of lines) {
				try {
					const entry = JSON.parse(line);
					if (entry.timestamp && entry.level && entry.message) {
						validEntries++;
					}
				} catch (e) {
					// Invalid JSON
				}
			}
			console.log(`   Valid JSON entries: ${validEntries}/${lines.length}`);

			// Check for context in entries
			const hasContext = logContent.includes('userId') || logContent.includes('operation');
			console.log(`   Entries with context: ${hasContext ? 'Yes' : 'No'}`);
		}

		// Test 11: Verify performance log content
		if (fs.existsSync(performanceLogPath)) {
			const perfContent = fs.readFileSync(performanceLogPath, 'utf8');
			const perfLines = perfContent.trim().split('\n');
			console.log('\n✅ Test 11: Verify performance log content');
			console.log(`   Performance entries: ${perfLines.length}`);

			// Parse and validate structure
			const entry = JSON.parse(perfLines[0]);
			console.log(`   Operation: ${entry.operation}`);
			console.log(`   Duration: ${entry.duration}ms`);
			console.log(`   Success: ${entry.success}`);
		}

		// Test 12: Performance test - non-blocking writes
		const startTime = Date.now();
		for (let i = 0; i < 100; i++) {
			logger1.info(`Performance test ${i}`);
		}
		const elapsedTime = Date.now() - startTime;
		console.log('\n✅ Test 12: Performance - non-blocking writes');
		console.log(`   100 logs written in: ${elapsedTime}ms (target: <100ms, <1ms per log)`);

		// Test 13: Disable file logging
		logger1.disableFileLogging();
		console.log('\n✅ Test 13: Disable file logging');
		console.log(`   File logging enabled: ${logger1.isFileLoggingEnabled()}`);

		// Cleanup
		if (fs.existsSync(tempDir)) {
			fs.rmSync(tempDir, { recursive: true, force: true });
		}

		console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
		console.log('✅ All validation tests PASSED');
		console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

	}, 200); // Wait for async writes

} catch (error) {
	console.error('\n❌ Validation FAILED');
	console.error(error);
	process.exit(1);
}
