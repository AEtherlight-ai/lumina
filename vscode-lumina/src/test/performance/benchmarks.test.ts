/**
 * Performance Benchmark Tests
 *
 * Verifies that all middleware services meet performance targets.
 *
 * Performance targets:
 * - ServiceRegistry.get(): <1ms
 * - MiddlewareLogger.log(): <5ms
 * - ErrorHandler.handle(): <2ms
 * - CacheManager.get(): <0.1ms (hit), <1ms (miss)
 * - EventBus.publish(): <1ms
 * - ConfigurationManager.get(): <1ms
 * - HealthMonitor.checkService(): <10ms
 *
 * Pattern: Pattern-TESTING-002 (Integration Testing Strategy)
 * Pattern: Pattern-PERFORMANCE-001 (Performance Optimization)
 */

import * as assert from 'assert';
import { ServiceRegistry } from '../../services/ServiceRegistry';
import { MiddlewareLogger } from '../../services/MiddlewareLogger';
import { ErrorHandler } from '../../services/ErrorHandler';
import { ConfigurationManager } from '../../services/ConfigurationManager';
import { CacheManager } from '../../services/CacheManager';
import { EventBus, EventPriority } from '../../services/EventBus';
import { HealthMonitor, HealthState, HealthCheckable, HealthStatus } from '../../services/HealthMonitor';

/**
 * Helper function to measure execution time
 */
function benchmark(fn: () => any | Promise<any>, iterations: number = 1000): number {
	const start = Date.now();
	for (let i = 0; i < iterations; i++) {
		fn();
	}
	const end = Date.now();
	return (end - start) / iterations; // Average time per iteration in ms
}

/**
 * Helper function to measure async execution time
 */
async function benchmarkAsync(fn: () => Promise<any>, iterations: number = 1000): Promise<number> {
	const start = Date.now();
	for (let i = 0; i < iterations; i++) {
		await fn();
	}
	const end = Date.now();
	return (end - start) / iterations; // Average time per iteration in ms
}

suite('Performance Benchmark Tests', () => {
	let registry: ServiceRegistry;

	setup(() => {
		registry = ServiceRegistry.getInstance();
		registry.clear();
	});

	teardown(() => {
		registry.clear();
	});

	suite('ServiceRegistry Performance', () => {
		test('should get service in <1ms', () => {
			// Setup
			class TestService {
				doWork() {
					return 'work done';
				}
			}

			registry.register('testService', () => new TestService());

			// Warm up (first call instantiates service)
			registry.get('testService');

			// Benchmark
			const avgTime = benchmark(() => {
				registry.get('testService');
			}, 10000);

			// Assert
			assert.ok(avgTime < 1, `ServiceRegistry.get() should be <1ms (actual: ${avgTime.toFixed(3)}ms)`);
		});

		test('should register service in <1ms', () => {
			// Benchmark
			let counter = 0;
			const avgTime = benchmark(() => {
				registry.register('service_' + counter++, () => ({ value: counter }));
			}, 1000);

			// Assert
			assert.ok(avgTime < 1, `ServiceRegistry.register() should be <1ms (actual: ${avgTime.toFixed(3)}ms)`);
		});

		test('should check service existence in <0.1ms', () => {
			// Setup
			registry.register('testService', () => ({ value: 'test' }));

			// Benchmark
			const avgTime = benchmark(() => {
				registry.has('testService');
			}, 10000);

			// Assert
			assert.ok(avgTime < 0.1, `ServiceRegistry.has() should be <0.1ms (actual: ${avgTime.toFixed(3)}ms)`);
		});

		test('should get all service names in <1ms', () => {
			// Setup - Register 100 services
			for (let i = 0; i < 100; i++) {
				registry.register('service_' + i, () => ({ id: i }));
			}

			// Benchmark
			const avgTime = benchmark(() => {
				registry.getAllServiceNames();
			}, 1000);

			// Assert
			assert.ok(avgTime < 1, `ServiceRegistry.getAllServiceNames() should be <1ms (actual: ${avgTime.toFixed(3)}ms)`);
		});
	});

	suite('MiddlewareLogger Performance', () => {
		test('should log message in <5ms', () => {
			// Setup
			const logger = MiddlewareLogger.getInstance();

			// Benchmark
			const avgTime = benchmark(() => {
				logger.info('Test message', { data: 'test' });
			}, 1000);

			// Assert
			assert.ok(avgTime < 5, `MiddlewareLogger.log() should be <5ms (actual: ${avgTime.toFixed(3)}ms)`);
		});

		test('should log with different levels in <5ms', () => {
			// Setup
			const logger = MiddlewareLogger.getInstance();

			// Benchmark
			const avgTime = benchmark(() => {
				logger.debug('Debug message');
				logger.info('Info message');
				logger.warn('Warning message');
				logger.error('Error message');
			}, 250); // 250 iterations * 4 logs = 1000 logs

			// Assert
			assert.ok(avgTime < 5, `MiddlewareLogger with all levels should be <5ms (actual: ${avgTime.toFixed(3)}ms)`);
		});
	});

	suite('ErrorHandler Performance', () => {
		test('should handle error in <2ms', async () => {
			// Setup
			const logger = MiddlewareLogger.getInstance();
			const errorHandler = new ErrorHandler(logger);

			// Benchmark
			const avgTime = await benchmarkAsync(async () => {
				await errorHandler.handle(async () => { throw new Error('Test error'); }, { operationName: 'test', context: { test: true } });
			}, 1000);

			// Assert
			assert.ok(avgTime < 2, `ErrorHandler.handle() should be <2ms (actual: ${avgTime.toFixed(3)}ms)`);
		});

		test('should handle error with fallback in <5ms', async () => {
			// Setup
			const logger = MiddlewareLogger.getInstance();
			const errorHandler = new ErrorHandler(logger);

			// Benchmark
			const avgTime = await benchmarkAsync(async () => {
				await errorHandler.handle(async () => { throw new Error('Test error'); }, {
					operationName: 'test',
					context: { test: true },
					fallback: () => 'fallback_value'
				});
			}, 1000);

			// Assert
			assert.ok(avgTime < 5, `ErrorHandler.handle() with fallback should be <5ms (actual: ${avgTime.toFixed(3)}ms)`);
		});
	});

	suite('CacheManager Performance', () => {
		test('should get cached value in <0.1ms (cache hit)', () => {
			// Setup
			const logger = MiddlewareLogger.getInstance();
			const cache = new CacheManager(logger);
			cache.set('test_key', 'test_value');

			// Benchmark
			const avgTime = benchmark(() => {
				cache.get('test_key');
			}, 10000);

			// Assert
			assert.ok(avgTime < 0.1, `CacheManager.get() (hit) should be <0.1ms (actual: ${avgTime.toFixed(4)}ms)`);
		});

		test('should get null for missing value in <1ms (cache miss)', () => {
			// Setup
			const logger = MiddlewareLogger.getInstance();
			const cache = new CacheManager(logger);

			// Benchmark
			const avgTime = benchmark(() => {
				cache.get('nonexistent_key');
			}, 10000);

			// Assert
			assert.ok(avgTime < 1, `CacheManager.get() (miss) should be <1ms (actual: ${avgTime.toFixed(3)}ms)`);
		});

		test('should set value in <1ms', () => {
			// Setup
			const logger = MiddlewareLogger.getInstance();
			const cache = new CacheManager(logger);

			// Benchmark
			let counter = 0;
			const avgTime = benchmark(() => {
				cache.set('key_' + counter++, 'value_' + counter);
			}, 1000);

			// Assert
			assert.ok(avgTime < 1, `CacheManager.set() should be <1ms (actual: ${avgTime.toFixed(3)}ms)`);
		});

		test('should invalidate in <1ms', () => {
			// Setup
			const logger = MiddlewareLogger.getInstance();
			const cache = new CacheManager(logger);
			for (let i = 0; i < 100; i++) {
				cache.set('key_' + i, 'value_' + i);
			}

			// Benchmark
			let counter = 0;
			const avgTime = benchmark(() => {
				cache.invalidate('key_' + counter++);
			}, 100);

			// Assert
			assert.ok(avgTime < 1, `CacheManager.invalidate() should be <1ms (actual: ${avgTime.toFixed(3)}ms)`);
		});

		test('should get statistics in <1ms', () => {
			// Setup
			const logger = MiddlewareLogger.getInstance();
			const cache = new CacheManager(logger);
			cache.set('test', 'value');
			cache.get('test'); // Hit
			cache.get('missing'); // Miss

			// Benchmark
			const avgTime = benchmark(() => {
				cache.getStats();
			}, 10000);

			// Assert
			assert.ok(avgTime < 1, `CacheManager.getStats() should be <1ms (actual: ${avgTime.toFixed(3)}ms)`);
		});
	});

	suite('EventBus Performance', () => {
		test('should publish event in <1ms (no subscribers)', async () => {
			// Setup
			const logger = MiddlewareLogger.getInstance();
			const eventBus = new EventBus(logger);

			// Benchmark
			const avgTime = await benchmarkAsync(async () => {
				await eventBus.publish('test.event', { data: 'test' });
			}, 1000);

			// Assert
			assert.ok(avgTime < 1, `EventBus.publish() (no subscribers) should be <1ms (actual: ${avgTime.toFixed(3)}ms)`);
		});

		test('should publish event in <5ms (10 subscribers)', async () => {
			// Setup
			const logger = MiddlewareLogger.getInstance();
			const eventBus = new EventBus(logger);

			// Add 10 subscribers
			for (let i = 0; i < 10; i++) {
				eventBus.subscribe('test.event', () => {
					// Simple handler
				});
			}

			// Benchmark
			const avgTime = await benchmarkAsync(async () => {
				await eventBus.publish('test.event', { data: 'test' });
			}, 1000);

			// Assert
			assert.ok(avgTime < 5, `EventBus.publish() (10 subscribers) should be <5ms (actual: ${avgTime.toFixed(3)}ms)`);
		});

		test('should subscribe in <0.1ms', () => {
			// Setup
			const logger = MiddlewareLogger.getInstance();
			const eventBus = new EventBus(logger);

			// Benchmark
			let counter = 0;
			const avgTime = benchmark(() => {
				eventBus.subscribe('event_' + counter++, () => {});
			}, 1000);

			// Assert
			assert.ok(avgTime < 0.1, `EventBus.subscribe() should be <0.1ms (actual: ${avgTime.toFixed(4)}ms)`);
		});

		test('should get event history in <1ms', () => {
			// Setup
			const logger = MiddlewareLogger.getInstance();
			const eventBus = new EventBus(logger);

			// Benchmark
			const avgTime = benchmark(() => {
				eventBus.getHistory();
			}, 10000);

			// Assert
			assert.ok(avgTime < 1, `EventBus.getHistory() should be <1ms (actual: ${avgTime.toFixed(3)}ms)`);
		});
	});

	suite('ConfigurationManager Performance', () => {
		test('should get configuration in <1ms', () => {
			// Setup
			const logger = MiddlewareLogger.getInstance();
			const config = new ConfigurationManager(logger);

			// Benchmark
			const avgTime = benchmark(() => {
				config.get('api');
			}, 10000);

			// Assert
			assert.ok(avgTime < 1, `ConfigurationManager.get() should be <1ms (actual: ${avgTime.toFixed(3)}ms)`);
		});

		test('should set configuration in <100ms', () => {
			// Setup
			const logger = MiddlewareLogger.getInstance();
			const config = new ConfigurationManager(logger);

			// Benchmark (fewer iterations due to validation overhead)
			const avgTime = benchmark(() => {
				config.set('api', { whisperEndpoint: 'https://test.example.com', timeout: 10000, maxRetries: 3 });
			}, 100);

			// Assert
			assert.ok(avgTime < 100, `ConfigurationManager.set() should be <100ms (actual: ${avgTime.toFixed(3)}ms)`);
		});
	});

	suite('HealthMonitor Performance', () => {
		test('should check service health in <10ms', async () => {
			// Setup
			const logger = MiddlewareLogger.getInstance();
			const eventBus = new EventBus(logger);
			const healthMonitor = new HealthMonitor(registry, logger, eventBus);

			class MockService implements HealthCheckable {
				async healthCheck(): Promise<HealthStatus> {
					return {
						state: HealthState.Healthy,
						message: 'Healthy',
						lastCheck: Date.now(),
						dependencies: []
					};
				}
			}

			registry.register('testService', () => new MockService());

			// Benchmark
			const avgTime = await benchmarkAsync(async () => {
				await healthMonitor.checkService('testService');
			}, 1000);

			// Assert
			assert.ok(avgTime < 10, `HealthMonitor.checkService() should be <10ms (actual: ${avgTime.toFixed(3)}ms)`);
		});

		test('should check all services in <200ms (10 services)', async () => {
			// Setup
			const logger = MiddlewareLogger.getInstance();
			const eventBus = new EventBus(logger);
			const healthMonitor = new HealthMonitor(registry, logger, eventBus);

			class MockService implements HealthCheckable {
				async healthCheck(): Promise<HealthStatus> {
					return {
						state: HealthState.Healthy,
						message: 'Healthy',
						lastCheck: Date.now(),
						dependencies: []
					};
				}
			}

			// Register 10 services
			for (let i = 0; i < 10; i++) {
				registry.register('service_' + i, () => new MockService());
			}

			// Benchmark (fewer iterations due to multiple services)
			const avgTime = await benchmarkAsync(async () => {
				await healthMonitor.checkAllServices();
			}, 100);

			// Assert
			assert.ok(avgTime < 200, `HealthMonitor.checkAllServices() (10 services) should be <200ms (actual: ${avgTime.toFixed(3)}ms)`);
		});

		test('should get health status in <1ms', async () => {
			// Setup
			const logger = MiddlewareLogger.getInstance();
			const eventBus = new EventBus(logger);
			const healthMonitor = new HealthMonitor(registry, logger, eventBus);

			class MockService implements HealthCheckable {
				async healthCheck(): Promise<HealthStatus> {
					return {
						state: HealthState.Healthy,
						message: 'Healthy',
						lastCheck: Date.now(),
						dependencies: []
					};
				}
			}

			registry.register('testService', () => new MockService());
			await healthMonitor.checkService('testService');

			// Benchmark
			const avgTime = benchmark(() => {
				healthMonitor.getStatus('testService');
			}, 10000);

			// Assert
			assert.ok(avgTime < 1, `HealthMonitor.getStatus() should be <1ms (actual: ${avgTime.toFixed(3)}ms)`);
		});
	});

	suite('End-to-End Performance', () => {
		test('should complete full middleware workflow in <30ms', async () => {
			// Setup - Full middleware stack
			const logger = MiddlewareLogger.getInstance();
			const errorHandler = new ErrorHandler(logger);
			const config = new ConfigurationManager(logger);
			const cache = new CacheManager(logger);
			const eventBus = new EventBus(logger);
			const healthMonitor = new HealthMonitor(registry, logger, eventBus);

			registry.register('logger', () => logger);
			registry.register('errorHandler', () => errorHandler);
			registry.register('config', () => config);
			registry.register('cache', () => cache);
			registry.register('eventBus', () => eventBus);
			registry.register('healthMonitor', () => healthMonitor);

			// Application service that uses all middleware
			class ApplicationService {
				async processRequest(requestId: string) {
					// 1. Log
					const logger = registry.get<MiddlewareLogger>('logger');
					logger.info('Processing', { requestId });

					// 2. Check cache
					const cache = registry.get<CacheManager>('cache');
					const cached = cache.get('req_' + requestId);
					if (cached !== null) {
						return cached;
					}

					// 3. Get config
					const config = registry.get<ConfigurationManager>('config');
					const timeout = config.get('api').timeout;

					// 4. Process
					const result = 'result_' + requestId;

					// 5. Cache
					cache.set('req_' + requestId, result, timeout);

					// 6. Publish event
					const eventBus = registry.get<EventBus>('eventBus');
					await eventBus.publish('request.completed', { requestId });

					return result;
				}
			}

			const appService = new ApplicationService();

			// Benchmark (fewer iterations for full workflow)
			const avgTime = await benchmarkAsync(async () => {
				await appService.processRequest('test_' + Math.random());
			}, 100);

			// Assert
			assert.ok(avgTime < 30, `Full middleware workflow should be <30ms (actual: ${avgTime.toFixed(3)}ms)`);
		});

		test('should handle 100 concurrent requests in <5s', async () => {
			// Setup
			const logger = MiddlewareLogger.getInstance();
			const cache = new CacheManager(logger);
			const eventBus = new EventBus(logger);

			registry.register('logger', () => logger);
			registry.register('cache', () => cache);
			registry.register('eventBus', () => eventBus);

			class RequestHandler {
				async handleRequest(id: number) {
					const logger = registry.get<MiddlewareLogger>('logger');
					const cache = registry.get<CacheManager>('cache');
					const eventBus = registry.get<EventBus>('eventBus');

					logger.info('Request', { id });
					cache.set('req_' + id, 'result_' + id);
					await eventBus.publish('request.handled', { id });
				}
			}

			const handler = new RequestHandler();

			// Benchmark
			const start = Date.now();
			const promises: Promise<void>[] = [];
			for (let i = 0; i < 100; i++) {
				promises.push(handler.handleRequest(i));
			}
			await Promise.all(promises);
			const totalTime = Date.now() - start;

			// Assert
			assert.ok(totalTime < 5000, `100 concurrent requests should complete in <5s (actual: ${totalTime}ms)`);
		});

		test('should maintain <1ms response time under load', async () => {
			// Setup
			const logger = MiddlewareLogger.getInstance();
			const cache = new CacheManager(logger);

			// Pre-populate cache with 1000 entries
			for (let i = 0; i < 1000; i++) {
				cache.set('key_' + i, 'value_' + i);
			}

			// Benchmark - Random access pattern
			const avgTime = benchmark(() => {
				const randomKey = 'key_' + Math.floor(Math.random() * 1000);
				cache.get(randomKey);
			}, 10000);

			// Assert
			assert.ok(avgTime < 1, `Cache access under load should be <1ms (actual: ${avgTime.toFixed(3)}ms)`);
		});
	});
});
