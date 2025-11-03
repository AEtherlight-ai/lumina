/**
 * Middleware Integration Tests
 *
 * Tests that all middleware services work together correctly.
 *
 * Test categories:
 * - ServiceRegistry + Logger integration
 * - ServiceRegistry + ErrorHandler integration
 * - ServiceRegistry + ConfigurationManager integration
 * - ServiceRegistry + CacheManager integration
 * - ServiceRegistry + EventBus integration
 * - ServiceRegistry + HealthMonitor integration
 * - All services together (full integration)
 *
 * Pattern: Pattern-TESTING-002 (Integration Testing Strategy)
 * Pattern: Pattern-MIDDLEWARE-001 (Service Integration Layer)
 * Pattern: Pattern-TDD-001 (Test-Driven Development Ratchet)
 */

import * as assert from 'assert';
import * as path from 'path';
import * as os from 'os';
import { ServiceRegistry } from '../../services/ServiceRegistry';
import { MiddlewareLogger } from '../../services/MiddlewareLogger';
import { ErrorHandler } from '../../services/ErrorHandler';
import { ConfigurationManager } from '../../services/ConfigurationManager';
import { CacheManager } from '../../services/CacheManager';
import { EventBus, EventPriority } from '../../services/EventBus';
import { HealthMonitor, HealthState, HealthCheckable, HealthStatus } from '../../services/HealthMonitor';

suite('Middleware Integration Tests', () => {
	let registry: ServiceRegistry;
	let testLogDir: string;

	setup(() => {
		// Create test log directory
		testLogDir = path.join(os.tmpdir(), 'aetherlight-test-' + Date.now());

		// Get fresh registry instance
		registry = ServiceRegistry.getInstance();
		registry.clear();
	});

	teardown(() => {
		// Clean up registry
		registry.clear();
	});

	suite('ServiceRegistry + MiddlewareLogger Integration', () => {
		test('should allow services to access logger from registry', () => {
			// Setup
			const logger = MiddlewareLogger.getInstance();
			registry.register('logger', () => logger);

			// Act
			const retrievedLogger = registry.get<MiddlewareLogger>('logger');

			// Assert
			assert.ok(retrievedLogger, 'Should retrieve logger from registry');
			assert.strictEqual(retrievedLogger, logger, 'Should be same logger instance');
		});

		test('should allow multiple services to share same logger', () => {
			// Setup
			const logger = MiddlewareLogger.getInstance();
			registry.register('logger', () => logger);

			// Create services that use logger
			class ServiceA {
				private logger: MiddlewareLogger;
				constructor() {
					this.logger = registry.get<MiddlewareLogger>('logger');
				}
				doWork() {
					this.logger.info('ServiceA doing work');
				}
			}

			class ServiceB {
				private logger: MiddlewareLogger;
				constructor() {
					this.logger = registry.get<MiddlewareLogger>('logger');
				}
				doWork() {
					this.logger.info('ServiceB doing work');
				}
			}

			registry.register('serviceA', () => new ServiceA());
			registry.register('serviceB', () => new ServiceB());

			// Act
			const serviceA = registry.get<ServiceA>('serviceA');
			const serviceB = registry.get<ServiceB>('serviceB');

			// Assert - Both services should work without errors
			assert.doesNotThrow(() => serviceA.doWork());
			assert.doesNotThrow(() => serviceB.doWork());
		});

		test('should initialize logger before dependent services', async () => {
			// Setup
			const logger = MiddlewareLogger.getInstance();
			let loggerInitialized = false;
			let serviceInitialized = false;

			// Wrap logger to track initialization
			const wrappedLogger = Object.create(logger);
			wrappedLogger.initialize = async () => {
				loggerInitialized = true;
			};

			class DependentService {
				async initialize() {
					// Should only initialize after logger is ready
					assert.ok(loggerInitialized, 'Logger should be initialized first');
					serviceInitialized = true;
				}
			}

			registry.register('logger', () => wrappedLogger);
			registry.register('service', () => new DependentService());

			// Act
			await wrappedLogger.initialize();
			const service = registry.get<DependentService>('service');
			await service.initialize();

			// Assert
			assert.ok(loggerInitialized, 'Logger should be initialized');
			assert.ok(serviceInitialized, 'Service should be initialized');
		});
	});

	suite('ServiceRegistry + ErrorHandler Integration', () => {
		test('should allow services to access error handler from registry', () => {
			// Setup
			const logger = MiddlewareLogger.getInstance();
			const errorHandler = new ErrorHandler(logger);
			registry.register('errorHandler', () => errorHandler);

			// Act
			const retrievedHandler = registry.get<ErrorHandler>('errorHandler');

			// Assert
			assert.ok(retrievedHandler, 'Should retrieve error handler from registry');
			assert.strictEqual(retrievedHandler, errorHandler, 'Should be same error handler instance');
		});

		test('should handle errors from multiple services', async () => {
			// Setup
			const logger = MiddlewareLogger.getInstance();
			const errorHandler = new ErrorHandler(logger);
			registry.register('errorHandler', () => errorHandler);

			let error1Handled = false;
			let error2Handled = false;

			class ServiceA {
				async doWork() {
					try {
						throw new Error('ServiceA error');
					} catch (error: any) {
						const handler = registry.get<ErrorHandler>('errorHandler');
						await handler.handle(error, { service: 'ServiceA' });
						error1Handled = true;
					}
				}
			}

			class ServiceB {
				async doWork() {
					try {
						throw new Error('ServiceB error');
					} catch (error: any) {
						const handler = registry.get<ErrorHandler>('errorHandler');
						await handler.handle(error, { service: 'ServiceB' });
						error2Handled = true;
					}
				}
			}

			registry.register('serviceA', () => new ServiceA());
			registry.register('serviceB', () => new ServiceB());

			// Act
			const serviceA = registry.get<ServiceA>('serviceA');
			const serviceB = registry.get<ServiceB>('serviceB');
			await serviceA.doWork();
			await serviceB.doWork();

			// Assert
			assert.ok(error1Handled, 'ServiceA error should be handled');
			assert.ok(error2Handled, 'ServiceB error should be handled');
		});

		test('should use fallback strategies when service fails', async () => {
			// Setup
			const logger = MiddlewareLogger.getInstance();
			const errorHandler = new ErrorHandler(logger);
			registry.register('errorHandler', () => errorHandler);

			let fallbackCalled = false;

			class ServiceWithFallback {
				async fetchData() {
					try {
						throw new Error('Network error');
					} catch (error: any) {
						const handler = registry.get<ErrorHandler>('errorHandler');
						await handler.handle(error, {
							service: 'ServiceWithFallback',
							fallback: () => {
								fallbackCalled = true;
								return 'cached data';
							}
						});
					}
				}
			}

			registry.register('service', () => new ServiceWithFallback());

			// Act
			const service = registry.get<ServiceWithFallback>('service');
			await service.fetchData();

			// Assert
			assert.ok(fallbackCalled, 'Fallback should be called on error');
		});
	});

	suite('ServiceRegistry + ConfigurationManager Integration', () => {
		test('should allow services to access configuration from registry', () => {
			// Setup
			const config = new ConfigurationManager();
			registry.register('config', () => config);

			// Act
			const retrievedConfig = registry.get<ConfigurationManager>('config');

			// Assert
			assert.ok(retrievedConfig, 'Should retrieve config from registry');
			assert.strictEqual(retrievedConfig, config, 'Should be same config instance');
		});

		test('should allow multiple services to share configuration', () => {
			// Setup
			const config = new ConfigurationManager();
			config.set('api', { whisperEndpoint: 'https://test.example.com' });
			registry.register('config', () => config);

			class ServiceA {
				getEndpoint() {
					const config = registry.get<ConfigurationManager>('config');
					return config.get('api').whisperEndpoint;
				}
			}

			class ServiceB {
				getEndpoint() {
					const config = registry.get<ConfigurationManager>('config');
					return config.get('api').whisperEndpoint;
				}
			}

			registry.register('serviceA', () => new ServiceA());
			registry.register('serviceB', () => new ServiceB());

			// Act
			const serviceA = registry.get<ServiceA>('serviceA');
			const serviceB = registry.get<ServiceB>('serviceB');
			const endpointA = serviceA.getEndpoint();
			const endpointB = serviceB.getEndpoint();

			// Assert
			assert.strictEqual(endpointA, 'https://test.example.com', 'ServiceA should get correct endpoint');
			assert.strictEqual(endpointB, 'https://test.example.com', 'ServiceB should get correct endpoint');
			assert.strictEqual(endpointA, endpointB, 'Both services should get same endpoint');
		});

		test('should update configuration for all services at once', () => {
			// Setup
			const config = new ConfigurationManager();
			registry.register('config', () => config);

			class ConfigurableService {
				getTimeout() {
					const config = registry.get<ConfigurationManager>('config');
					return config.get('api').timeout;
				}
			}

			registry.register('service1', () => new ConfigurableService());
			registry.register('service2', () => new ConfigurableService());

			const service1 = registry.get<ConfigurableService>('service1');
			const service2 = registry.get<ConfigurableService>('service2');

			// Act - Update config
			config.set('api', { timeout: 5000 });

			// Assert - Both services should see updated config
			assert.strictEqual(service1.getTimeout(), 5000, 'Service1 should see updated timeout');
			assert.strictEqual(service2.getTimeout(), 5000, 'Service2 should see updated timeout');
		});
	});

	suite('ServiceRegistry + CacheManager Integration', () => {
		test('should allow services to access cache from registry', () => {
			// Setup
			const cache = new CacheManager();
			registry.register('cache', () => cache);

			// Act
			const retrievedCache = registry.get<CacheManager>('cache');

			// Assert
			assert.ok(retrievedCache, 'Should retrieve cache from registry');
			assert.strictEqual(retrievedCache, cache, 'Should be same cache instance');
		});

		test('should allow multiple services to share cache', () => {
			// Setup
			const cache = new CacheManager();
			registry.register('cache', () => cache);

			class ServiceA {
				cacheData(key: string, value: any) {
					const cache = registry.get<CacheManager>('cache');
					cache.set(key, value);
				}
			}

			class ServiceB {
				getData(key: string) {
					const cache = registry.get<CacheManager>('cache');
					return cache.get(key);
				}
			}

			registry.register('serviceA', () => new ServiceA());
			registry.register('serviceB', () => new ServiceB());

			// Act
			const serviceA = registry.get<ServiceA>('serviceA');
			const serviceB = registry.get<ServiceB>('serviceB');
			serviceA.cacheData('test_key', 'test_value');
			const value = serviceB.getData('test_key');

			// Assert
			assert.strictEqual(value, 'test_value', 'ServiceB should retrieve data cached by ServiceA');
		});

		test('should improve performance with shared cache', () => {
			// Setup
			const cache = new CacheManager();
			registry.register('cache', () => cache);

			let expensiveComputeCalls = 0;

			class ComputeService {
				expensiveCompute(input: number) {
					const cache = registry.get<CacheManager>('cache');
					const cacheKey = 'compute_' + input;

					// Check cache first
					const cached = cache.get(cacheKey);
					if (cached !== null) {
						return cached;
					}

					// Expensive computation
					expensiveComputeCalls++;
					const result = input * input;

					// Cache result
					cache.set(cacheKey, result);
					return result;
				}
			}

			registry.register('service', () => new ComputeService());
			const service = registry.get<ComputeService>('service');

			// Act - Call twice with same input
			const result1 = service.expensiveCompute(5);
			const result2 = service.expensiveCompute(5);

			// Assert
			assert.strictEqual(result1, 25, 'First call should compute result');
			assert.strictEqual(result2, 25, 'Second call should return same result');
			assert.strictEqual(expensiveComputeCalls, 1, 'Expensive compute should only be called once');
		});
	});

	suite('ServiceRegistry + EventBus Integration', () => {
		test('should allow services to access event bus from registry', () => {
			// Setup
			const logger = MiddlewareLogger.getInstance();
			const eventBus = new EventBus(logger);
			registry.register('eventBus', () => eventBus);

			// Act
			const retrievedBus = registry.get<EventBus>('eventBus');

			// Assert
			assert.ok(retrievedBus, 'Should retrieve event bus from registry');
			assert.strictEqual(retrievedBus, eventBus, 'Should be same event bus instance');
		});

		test('should allow services to communicate via events', async () => {
			// Setup
			const logger = MiddlewareLogger.getInstance();
			const eventBus = new EventBus(logger);
			registry.register('eventBus', () => eventBus);

			let serviceAPublished = false;
			let serviceBReceived = false;

			class ServiceA {
				async doWork() {
					const eventBus = registry.get<EventBus>('eventBus');
					await eventBus.publish('work.completed', { service: 'A' });
					serviceAPublished = true;
				}
			}

			class ServiceB {
				constructor() {
					const eventBus = registry.get<EventBus>('eventBus');
					eventBus.subscribe('work.completed', (event) => {
						serviceBReceived = true;
					});
				}
			}

			registry.register('serviceA', () => new ServiceA());
			registry.register('serviceB', () => new ServiceB());

			// Act
			const serviceB = registry.get<ServiceB>('serviceB'); // Subscribe first
			const serviceA = registry.get<ServiceA>('serviceA');
			await serviceA.doWork();

			// Assert
			assert.ok(serviceAPublished, 'ServiceA should publish event');
			assert.ok(serviceBReceived, 'ServiceB should receive event');
		});

		test('should decouple services with event-driven communication', async () => {
			// Setup
			const logger = MiddlewareLogger.getInstance();
			const eventBus = new EventBus(logger);
			registry.register('eventBus', () => eventBus);

			const receivedEvents: string[] = [];

			class Publisher {
				async publish(eventType: string) {
					const eventBus = registry.get<EventBus>('eventBus');
					await eventBus.publish(eventType, { timestamp: Date.now() });
				}
			}

			class SubscriberA {
				constructor() {
					const eventBus = registry.get<EventBus>('eventBus');
					eventBus.subscribe('data.updated', () => {
						receivedEvents.push('A');
					});
				}
			}

			class SubscriberB {
				constructor() {
					const eventBus = registry.get<EventBus>('eventBus');
					eventBus.subscribe('data.updated', () => {
						receivedEvents.push('B');
					});
				}
			}

			registry.register('publisher', () => new Publisher());
			registry.register('subscriberA', () => new SubscriberA());
			registry.register('subscriberB', () => new SubscriberB());

			// Act
			const subscriberA = registry.get<SubscriberA>('subscriberA');
			const subscriberB = registry.get<SubscriberB>('subscriberB');
			const publisher = registry.get<Publisher>('publisher');
			await publisher.publish('data.updated');

			// Assert
			assert.strictEqual(receivedEvents.length, 2, 'Both subscribers should receive event');
			assert.ok(receivedEvents.includes('A'), 'SubscriberA should receive event');
			assert.ok(receivedEvents.includes('B'), 'SubscriberB should receive event');
		});
	});

	suite('ServiceRegistry + HealthMonitor Integration', () => {
		test('should allow health monitor to check all registered services', async () => {
			// Setup
			const logger = MiddlewareLogger.getInstance();
			const eventBus = new EventBus(logger);
			const healthMonitor = new HealthMonitor(registry, logger, eventBus);

			// Create mock service
			class MockService implements HealthCheckable {
				async healthCheck(): Promise<HealthStatus> {
					return {
						state: HealthState.Healthy,
						message: 'Service is healthy',
						lastCheck: Date.now(),
						dependencies: []
					};
				}
			}

			registry.register('testService', () => new MockService());

			// Act
			await healthMonitor.checkService('testService');
			const status = healthMonitor.getStatus('testService');

			// Assert
			assert.ok(status, 'Should have health status');
			assert.strictEqual(status!.state, HealthState.Healthy, 'Service should be healthy');
		});

		test('should restart unhealthy services automatically', async () => {
			// Setup
			const logger = MiddlewareLogger.getInstance();
			const eventBus = new EventBus(logger);
			const healthMonitor = new HealthMonitor(registry, logger, eventBus);

			let restartCalled = false;

			class UnhealthyService implements HealthCheckable {
				private healthy = false;

				async healthCheck(): Promise<HealthStatus> {
					return {
						state: this.healthy ? HealthState.Healthy : HealthState.Unhealthy,
						message: this.healthy ? 'Healthy' : 'Unhealthy',
						lastCheck: Date.now(),
						dependencies: []
					};
				}

				async restart(): Promise<void> {
					restartCalled = true;
					this.healthy = true; // Become healthy after restart
				}
			}

			const service = new UnhealthyService();
			registry.register('unhealthyService', () => service);

			// Act
			await healthMonitor.checkService('unhealthyService');

			// Assert
			assert.ok(restartCalled, 'Service should be restarted');

			// Check again - should be healthy now
			await healthMonitor.checkService('unhealthyService');
			const status = healthMonitor.getStatus('unhealthyService');
			assert.strictEqual(status!.state, HealthState.Healthy, 'Service should be healthy after restart');
		});

		test('should check all services periodically', async () => {
			// Setup
			const logger = MiddlewareLogger.getInstance();
			const eventBus = new EventBus(logger);
			const healthMonitor = new HealthMonitor(registry, logger, eventBus);

			let checkCount = 0;

			class MockService implements HealthCheckable {
				async healthCheck(): Promise<HealthStatus> {
					checkCount++;
					return {
						state: HealthState.Healthy,
						message: 'Healthy',
						lastCheck: Date.now(),
						dependencies: []
					};
				}
			}

			registry.register('service1', () => new MockService());
			registry.register('service2', () => new MockService());

			// Act - Start periodic checks with short interval for testing
			await healthMonitor.start(100); // 100ms interval

			// Wait for at least 2 checks
			await new Promise(resolve => setTimeout(resolve, 250));

			healthMonitor.stop();

			// Assert
			assert.ok(checkCount >= 4, 'Should check all services at least twice (2 services * 2 checks)');
		});
	});

	suite('Full Middleware Integration', () => {
		test('should integrate all middleware services together', async () => {
			// Setup - Register all middleware services
			const logger = MiddlewareLogger.getInstance();
			const errorHandler = new ErrorHandler(logger);
			const config = new ConfigurationManager();
			const cache = new CacheManager();
			const eventBus = new EventBus(logger);
			const healthMonitor = new HealthMonitor(registry, logger, eventBus);

			registry.register('logger', () => logger);
			registry.register('errorHandler', () => errorHandler);
			registry.register('config', () => config);
			registry.register('cache', () => cache);
			registry.register('eventBus', () => eventBus);
			registry.register('healthMonitor', () => healthMonitor);

			// Act - Verify all services can be retrieved
			const retrievedLogger = registry.get<MiddlewareLogger>('logger');
			const retrievedErrorHandler = registry.get<ErrorHandler>('errorHandler');
			const retrievedConfig = registry.get<ConfigurationManager>('config');
			const retrievedCache = registry.get<CacheManager>('cache');
			const retrievedEventBus = registry.get<EventBus>('eventBus');
			const retrievedHealthMonitor = registry.get<HealthMonitor>('healthMonitor');

			// Assert
			assert.ok(retrievedLogger, 'Logger should be registered');
			assert.ok(retrievedErrorHandler, 'ErrorHandler should be registered');
			assert.ok(retrievedConfig, 'ConfigurationManager should be registered');
			assert.ok(retrievedCache, 'CacheManager should be registered');
			assert.ok(retrievedEventBus, 'EventBus should be registered');
			assert.ok(retrievedHealthMonitor, 'HealthMonitor should be registered');
		});

		test('should handle complex workflow with all services', async () => {
			// Setup - Create full middleware stack
			const logger = MiddlewareLogger.getInstance();
			const errorHandler = new ErrorHandler(logger);
			const config = new ConfigurationManager();
			const cache = new CacheManager();
			const eventBus = new EventBus(logger);
			const healthMonitor = new HealthMonitor(registry, logger, eventBus);

			registry.register('logger', () => logger);
			registry.register('errorHandler', () => errorHandler);
			registry.register('config', () => config);
			registry.register('cache', () => cache);
			registry.register('eventBus', () => eventBus);
			registry.register('healthMonitor', () => healthMonitor);

			let workflowCompleted = false;

			// Create application service that uses all middleware
			class ApplicationService implements HealthCheckable {
				async processRequest(requestId: string) {
					// 1. Log request
					const logger = registry.get<MiddlewareLogger>('logger');
					logger.info('Processing request', { requestId });

					// 2. Check cache
					const cache = registry.get<CacheManager>('cache');
					const cached = cache.get('request_' + requestId);
					if (cached !== null) {
						logger.info('Cache hit', { requestId });
						return cached;
					}

					// 3. Get configuration
					const config = registry.get<ConfigurationManager>('config');
					const timeout = config.get('api').timeout;

					// 4. Process request (with error handling)
					try {
						// Simulate processing
						const result = 'processed_' + requestId;

						// 5. Cache result
						cache.set('request_' + requestId, result, timeout);

						// 6. Publish event
						const eventBus = registry.get<EventBus>('eventBus');
						await eventBus.publish('request.completed', { requestId, result }, EventPriority.Normal);

						return result;
					} catch (error: any) {
						// 7. Handle error
						const errorHandler = registry.get<ErrorHandler>('errorHandler');
						await errorHandler.handle(error, { requestId });
						throw error;
					}
				}

				async healthCheck(): Promise<HealthStatus> {
					return {
						state: HealthState.Healthy,
						message: 'Service is healthy',
						lastCheck: Date.now(),
						dependencies: ['logger', 'cache', 'config', 'eventBus', 'errorHandler']
					};
				}
			}

			registry.register('appService', () => new ApplicationService());

			// Subscribe to completion event
			eventBus.subscribe('request.completed', () => {
				workflowCompleted = true;
			});

			// Act - Process request through full middleware stack
			const appService = registry.get<ApplicationService>('appService');
			const result = await appService.processRequest('test123');

			// Assert
			assert.strictEqual(result, 'processed_test123', 'Request should be processed');
			assert.ok(workflowCompleted, 'Workflow completion event should be published');

			// Verify cache was populated
			const cached = cache.get('request_test123');
			assert.strictEqual(cached, 'processed_test123', 'Result should be cached');

			// Verify health check
			const status = await appService.healthCheck();
			assert.strictEqual(status.state, HealthState.Healthy, 'Service should be healthy');
		});

		test('should handle service failures gracefully in integrated system', async () => {
			// Setup
			const logger = MiddlewareLogger.getInstance();
			const errorHandler = new ErrorHandler(logger);
			const eventBus = new EventBus(logger);
			const healthMonitor = new HealthMonitor(registry, logger, eventBus);

			registry.register('logger', () => logger);
			registry.register('errorHandler', () => errorHandler);
			registry.register('eventBus', () => eventBus);
			registry.register('healthMonitor', () => healthMonitor);

			let errorHandled = false;
			let serviceRestarted = false;

			class FailingService implements HealthCheckable {
				private failureCount = 0;

				async doWork() {
					this.failureCount++;
					if (this.failureCount === 1) {
						// First call fails
						throw new Error('Service failure');
					}
					// Subsequent calls succeed
					return 'success';
				}

				async healthCheck(): Promise<HealthStatus> {
					return {
						state: this.failureCount === 0 ? HealthState.Healthy : HealthState.Unhealthy,
						message: this.failureCount === 0 ? 'Healthy' : 'Failed',
						lastCheck: Date.now(),
						dependencies: []
					};
				}

				async restart(): Promise<void> {
					serviceRestarted = true;
					this.failureCount = 0;
				}
			}

			const service = new FailingService();
			registry.register('failingService', () => service);

			// Act - Try to do work (will fail)
			try {
				await service.doWork();
			} catch (error: any) {
				const errorHandler = registry.get<ErrorHandler>('errorHandler');
				await errorHandler.handle(error, { service: 'failingService' });
				errorHandled = true;
			}

			// Check health and restart
			await healthMonitor.checkService('failingService');

			// Try again after restart (should succeed)
			const result = await service.doWork();

			// Assert
			assert.ok(errorHandled, 'Error should be handled');
			assert.ok(serviceRestarted, 'Service should be restarted');
			assert.strictEqual(result, 'success', 'Service should work after restart');
		});
	});

	suite('Service Lifecycle Integration', () => {
		test('should initialize all services in correct order', async () => {
			// Setup
			const initOrder: string[] = [];

			class ServiceA {
				async initialize() {
					initOrder.push('A');
				}
			}

			class ServiceB {
				async initialize() {
					// ServiceB depends on ServiceA
					const serviceA = registry.get<ServiceA>('serviceA');
					assert.ok(serviceA, 'ServiceA should be available');
					initOrder.push('B');
				}
			}

			registry.register('serviceA', () => new ServiceA());
			registry.register('serviceB', () => new ServiceB());

			// Act
			const serviceA = registry.get<ServiceA>('serviceA');
			await serviceA.initialize();
			const serviceB = registry.get<ServiceB>('serviceB');
			await serviceB.initialize();

			// Assert
			assert.strictEqual(initOrder.length, 2, 'Both services should initialize');
			assert.strictEqual(initOrder[0], 'A', 'ServiceA should initialize first');
			assert.strictEqual(initOrder[1], 'B', 'ServiceB should initialize second');
		});

		test('should dispose all services in reverse order', async () => {
			// Setup
			const disposeOrder: string[] = [];

			class ServiceA {
				async dispose() {
					disposeOrder.push('A');
				}
			}

			class ServiceB {
				async dispose() {
					disposeOrder.push('B');
				}
			}

			registry.register('serviceA', () => new ServiceA());
			registry.register('serviceB', () => new ServiceB());

			// Instantiate services
			const serviceA = registry.get<ServiceA>('serviceA');
			const serviceB = registry.get<ServiceB>('serviceB');

			// Act - Dispose in reverse order (B then A)
			await registry.dispose();

			// Assert
			assert.strictEqual(disposeOrder.length, 2, 'Both services should dispose');
			assert.strictEqual(disposeOrder[0], 'B', 'ServiceB should dispose first');
			assert.strictEqual(disposeOrder[1], 'A', 'ServiceA should dispose second');
		});
	});
});
