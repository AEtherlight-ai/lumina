/**
 * ConfigurationManager Test Suite (TDD RED Phase)
 *
 * DESIGN DECISION: Write tests FIRST following TDD protocol
 * WHY: Creates "ratchet" enforcing configuration management requirements
 *
 * PATTERN: Pattern-TDD-001 (Test-Driven Development)
 * PATTERN: Pattern-CONFIG-001 (Configuration Management)
 * PATTERN: Pattern-MIDDLEWARE-001 (Service Integration Layer)
 * RELATED: MID-016
 */

import * as assert from 'assert';
import { ConfigurationManager, ConfigSchema } from '../../services/ConfigurationManager';
import { MiddlewareLogger } from '../../services/MiddlewareLogger';

suite('ConfigurationManager Test Suite', () => {
	let configManager: ConfigurationManager;
	let mockLogger: MiddlewareLogger;

	setup(() => {
		// Create mock logger
		mockLogger = MiddlewareLogger.getInstance();

		// Create configuration manager
		configManager = new ConfigurationManager(mockLogger);
	});

	suite('Default Configuration', () => {
		test('should load default configuration values', () => {
			// Act
			const apiConfig = configManager.get('api');
			const uiConfig = configManager.get('ui');
			const performanceConfig = configManager.get('performance');
			const privacyConfig = configManager.get('privacy');

			// Assert
			assert.ok(apiConfig.whisperEndpoint, 'API endpoint should be set');
			assert.ok(apiConfig.timeout > 0, 'API timeout should be positive');
			assert.ok(apiConfig.maxRetries >= 0, 'API max retries should be non-negative');

			assert.ok(['left', 'right', 'bottom'].includes(uiConfig.panelPosition), 'Panel position should be valid');
			assert.ok(['light', 'dark', 'auto'].includes(uiConfig.theme), 'Theme should be valid');

			assert.ok(performanceConfig.cacheSize >= 0, 'Cache size should be non-negative');
			assert.ok(performanceConfig.workerCount > 0, 'Worker count should be positive');

			assert.strictEqual(typeof privacyConfig.telemetryEnabled, 'boolean', 'Telemetry should be boolean');
			assert.ok(privacyConfig.dataRetentionDays > 0, 'Data retention should be positive');
		});

		test('should have sensible default values', () => {
			// Act
			const apiConfig = configManager.get('api');
			const performanceConfig = configManager.get('performance');
			const privacyConfig = configManager.get('privacy');

			// Assert
			assert.ok(apiConfig.timeout >= 1000 && apiConfig.timeout <= 60000, 'Default timeout should be reasonable');
			assert.strictEqual(apiConfig.maxRetries, 3, 'Default max retries should be 3');
			assert.ok(performanceConfig.cacheSize <= 1000, 'Default cache size should be reasonable');
			assert.strictEqual(privacyConfig.telemetryEnabled, false, 'Telemetry should be disabled by default');
		});
	});

	suite('Get Configuration', () => {
		test('should get API configuration', () => {
			// Act
			const apiConfig = configManager.get('api');

			// Assert
			assert.ok(apiConfig, 'Should return API config');
			assert.ok(apiConfig.whisperEndpoint, 'Should have whisper endpoint');
			assert.ok(apiConfig.timeout, 'Should have timeout');
			assert.ok(typeof apiConfig.maxRetries === 'number', 'Should have max retries');
		});

		test('should get UI configuration', () => {
			// Act
			const uiConfig = configManager.get('ui');

			// Assert
			assert.ok(uiConfig, 'Should return UI config');
			assert.ok(uiConfig.panelPosition, 'Should have panel position');
			assert.ok(uiConfig.theme, 'Should have theme');
		});

		test('should get performance configuration', () => {
			// Act
			const perfConfig = configManager.get('performance');

			// Assert
			assert.ok(perfConfig, 'Should return performance config');
			assert.ok(typeof perfConfig.cacheSize === 'number', 'Should have cache size');
			assert.ok(typeof perfConfig.workerCount === 'number', 'Should have worker count');
		});

		test('should get privacy configuration', () => {
			// Act
			const privacyConfig = configManager.get('privacy');

			// Assert
			assert.ok(privacyConfig, 'Should return privacy config');
			assert.ok(typeof privacyConfig.telemetryEnabled === 'boolean', 'Should have telemetry flag');
			assert.ok(typeof privacyConfig.dataRetentionDays === 'number', 'Should have retention days');
		});

		test('should read configuration in <1ms', () => {
			// Arrange
			const iterations = 1000;

			// Act
			const startTime = Date.now();
			for (let i = 0; i < iterations; i++) {
				configManager.get('api');
			}
			const totalTime = Date.now() - startTime;
			const avgTime = totalTime / iterations;

			// Assert
			assert.ok(avgTime < 1, `Configuration reads should be <1ms, was ${avgTime.toFixed(3)}ms`);
		});
	});

	suite('Set Configuration', () => {
		test('should set API configuration', () => {
			// Arrange
			const newApiConfig = {
				whisperEndpoint: 'https://test.example.com/api',
				timeout: 15000,
				maxRetries: 5
			};

			// Act
			configManager.set('api', newApiConfig);
			const result = configManager.get('api');

			// Assert
			assert.strictEqual(result.whisperEndpoint, newApiConfig.whisperEndpoint);
			assert.strictEqual(result.timeout, newApiConfig.timeout);
			assert.strictEqual(result.maxRetries, newApiConfig.maxRetries);
		});

		test('should set UI configuration', () => {
			// Arrange
			const newUiConfig = {
				panelPosition: 'left' as const,
				theme: 'dark' as const
			};

			// Act
			configManager.set('ui', newUiConfig);
			const result = configManager.get('ui');

			// Assert
			assert.strictEqual(result.panelPosition, 'left');
			assert.strictEqual(result.theme, 'dark');
		});

		test('should set performance configuration', () => {
			// Arrange
			const newPerfConfig = {
				cacheSize: 200,
				workerCount: 8
			};

			// Act
			configManager.set('performance', newPerfConfig);
			const result = configManager.get('performance');

			// Assert
			assert.strictEqual(result.cacheSize, 200);
			assert.strictEqual(result.workerCount, 8);
		});

		test('should set privacy configuration', () => {
			// Arrange
			const newPrivacyConfig = {
				telemetryEnabled: true,
				dataRetentionDays: 90
			};

			// Act
			configManager.set('privacy', newPrivacyConfig);
			const result = configManager.get('privacy');

			// Assert
			assert.strictEqual(result.telemetryEnabled, true);
			assert.strictEqual(result.dataRetentionDays, 90);
		});
	});

	suite('Configuration Validation', () => {
		test('should reject API timeout below minimum', () => {
			// Arrange
			const invalidConfig = {
				whisperEndpoint: 'https://test.com',
				timeout: 500, // Below 1000ms minimum
				maxRetries: 3
			};

			// Act & Assert
			assert.throws(
				() => configManager.set('api', invalidConfig),
				/timeout must be between 1000-60000ms/,
				'Should reject timeout below minimum'
			);
		});

		test('should reject API timeout above maximum', () => {
			// Arrange
			const invalidConfig = {
				whisperEndpoint: 'https://test.com',
				timeout: 70000, // Above 60000ms maximum
				maxRetries: 3
			};

			// Act & Assert
			assert.throws(
				() => configManager.set('api', invalidConfig),
				/timeout must be between 1000-60000ms/,
				'Should reject timeout above maximum'
			);
		});

		test('should reject negative cache size', () => {
			// Arrange
			const invalidConfig = {
				cacheSize: -10,
				workerCount: 4
			};

			// Act & Assert
			assert.throws(
				() => configManager.set('performance', invalidConfig),
				/cache size must be between 0-1000/i,
				'Should reject negative cache size'
			);
		});

		test('should reject cache size above maximum', () => {
			// Arrange
			const invalidConfig = {
				cacheSize: 2000, // Above 1000 maximum
				workerCount: 4
			};

			// Act & Assert
			assert.throws(
				() => configManager.set('performance', invalidConfig),
				/cache size must be between 0-1000/i,
				'Should reject cache size above maximum'
			);
		});

		test('should reject invalid panel position', () => {
			// Arrange
			const invalidConfig = {
				panelPosition: 'top' as any, // Invalid position
				theme: 'auto' as const
			};

			// Act & Assert
			assert.throws(
				() => configManager.set('ui', invalidConfig),
				/panel position must be.*left.*right.*bottom/i,
				'Should reject invalid panel position'
			);
		});

		test('should reject invalid theme', () => {
			// Arrange
			const invalidConfig = {
				panelPosition: 'right' as const,
				theme: 'purple' as any // Invalid theme
			};

			// Act & Assert
			assert.throws(
				() => configManager.set('ui', invalidConfig),
				/theme must be.*light.*dark.*auto/i,
				'Should reject invalid theme'
			);
		});

		test('should reject negative max retries', () => {
			// Arrange
			const invalidConfig = {
				whisperEndpoint: 'https://test.com',
				timeout: 30000,
				maxRetries: -1 // Negative retries
			};

			// Act & Assert
			assert.throws(
				() => configManager.set('api', invalidConfig),
				/max retries must be non-negative/i,
				'Should reject negative max retries'
			);
		});

		test('should reject negative data retention days', () => {
			// Arrange
			const invalidConfig = {
				telemetryEnabled: false,
				dataRetentionDays: -5 // Negative days
			};

			// Act & Assert
			assert.throws(
				() => configManager.set('privacy', invalidConfig),
				/data retention.*must be positive/i,
				'Should reject negative retention days'
			);
		});

		test('should accept valid configuration values', () => {
			// Arrange
			const validApiConfig = {
				whisperEndpoint: 'https://valid.com/api',
				timeout: 30000,
				maxRetries: 3
			};

			const validPerfConfig = {
				cacheSize: 500,
				workerCount: 4
			};

			// Act & Assert - should not throw
			assert.doesNotThrow(() => configManager.set('api', validApiConfig));
			assert.doesNotThrow(() => configManager.set('performance', validPerfConfig));
		});
	});

	suite('Configuration Layers & Priority', () => {
		test('should merge default and runtime configuration', () => {
			// Arrange
			const runtimeOverride = {
				whisperEndpoint: 'https://runtime.com/api',
				timeout: 20000,
				maxRetries: 5
			};

			// Act
			configManager.set('api', runtimeOverride);
			const result = configManager.get('api');

			// Assert
			assert.strictEqual(result.whisperEndpoint, runtimeOverride.whisperEndpoint);
			assert.strictEqual(result.timeout, runtimeOverride.timeout);
		});

		test('should support environment-specific configuration', () => {
			// Note: This test assumes environment variables can be set
			// In real implementation, check process.env

			// Act
			const apiConfig = configManager.get('api');

			// Assert
			assert.ok(apiConfig.whisperEndpoint, 'Should have endpoint (from default or env)');
		});

		test('should load configuration in correct priority order', () => {
			// This test verifies that runtime overrides have highest priority

			// Arrange
			const defaultTimeout = configManager.get('api').timeout;
			const newTimeout = defaultTimeout + 5000;

			// Act
			configManager.set('api', {
				whisperEndpoint: 'https://test.com',
				timeout: newTimeout,
				maxRetries: 3
			});

			// Assert
			const result = configManager.get('api');
			assert.strictEqual(result.timeout, newTimeout, 'Runtime override should take priority');
		});
	});

	suite('Configuration Persistence', () => {
		test('should persist configuration updates', () => {
			// Arrange
			const newConfig = {
				whisperEndpoint: 'https://persist.com/api',
				timeout: 25000,
				maxRetries: 4
			};

			// Act
			configManager.set('api', newConfig);

			// Assert - configuration should be retrievable after set
			const result = configManager.get('api');
			assert.strictEqual(result.whisperEndpoint, newConfig.whisperEndpoint);
		});

		test('should complete updates within 100ms', () => {
			// Arrange
			const newConfig = {
				cacheSize: 150,
				workerCount: 6
			};

			// Act
			const startTime = Date.now();
			configManager.set('performance', newConfig);
			const elapsedTime = Date.now() - startTime;

			// Assert
			assert.ok(elapsedTime < 100, `Updates should complete in <100ms, took ${elapsedTime}ms`);
		});
	});

	suite('VS Code Settings Integration', () => {
		test('should have method to load from VS Code workspace settings', () => {
			// Assert
			assert.ok(
				typeof (configManager as any).loadFromVSCode === 'function' ||
				typeof (configManager as any).mergeWorkspaceSettings === 'function',
				'Should have method to load VS Code settings'
			);
		});

		test('should have method to save to VS Code workspace settings', () => {
			// Assert
			assert.ok(
				typeof (configManager as any).saveToVSCode === 'function' ||
				typeof (configManager as any).persist === 'function',
				'Should have method to save to VS Code settings'
			);
		});
	});

	suite('Performance', () => {
		test('should handle concurrent configuration reads', () => {
			// Arrange
			const iterations = 100;
			const promises = [];

			// Act
			const startTime = Date.now();
			for (let i = 0; i < iterations; i++) {
				promises.push(Promise.resolve(configManager.get('api')));
			}

			return Promise.all(promises).then(() => {
				const elapsedTime = Date.now() - startTime;

				// Assert
				assert.ok(elapsedTime < 100, `100 concurrent reads should complete in <100ms, took ${elapsedTime}ms`);
			});
		});

		test('should handle concurrent configuration updates', () => {
			// Arrange
			const iterations = 10;
			const updates = [];

			// Act
			const startTime = Date.now();
			for (let i = 0; i < iterations; i++) {
				const config = {
					cacheSize: 100 + i,
					workerCount: 4
				};
				updates.push(Promise.resolve(configManager.set('performance', config)));
			}

			return Promise.all(updates).then(() => {
				const elapsedTime = Date.now() - startTime;

				// Assert
				assert.ok(elapsedTime < 1000, `10 concurrent updates should complete in <1s, took ${elapsedTime}ms`);
			});
		});
	});

	suite('Edge Cases', () => {
		test('should handle missing configuration keys gracefully', () => {
			// Act & Assert - should not throw, should return default
			assert.doesNotThrow(() => {
				const config = configManager.get('api');
				assert.ok(config, 'Should return default configuration');
			});
		});

		test('should handle partial configuration updates', () => {
			// Arrange - Get current config
			const currentApi = configManager.get('api');

			// Act - Update only timeout
			const newApiConfig = {
				...currentApi,
				timeout: 45000
			};
			configManager.set('api', newApiConfig);

			// Assert - Other fields should remain unchanged
			const result = configManager.get('api');
			assert.strictEqual(result.timeout, 45000);
			assert.strictEqual(result.whisperEndpoint, currentApi.whisperEndpoint);
			assert.strictEqual(result.maxRetries, currentApi.maxRetries);
		});

		test('should handle rapid configuration changes', () => {
			// Arrange
			const iterations = 50;

			// Act & Assert - should not throw
			assert.doesNotThrow(() => {
				for (let i = 0; i < iterations; i++) {
					configManager.set('performance', {
						cacheSize: 100 + i,
						workerCount: 4
					});
				}
			});

			// Final value should be the last set value
			const result = configManager.get('performance');
			assert.strictEqual(result.cacheSize, 100 + iterations - 1);
		});
	});
});
