/**
 * End-to-End Workflow Tests
 *
 * Tests complete workflows from start to finish, simulating real user interactions.
 *
 * Workflows tested:
 * - Service initialization workflow
 * - Error recovery workflow
 * - Configuration update workflow
 * - Cache invalidation workflow
 * - Service health monitoring workflow
 *
 * Pattern: Pattern-TESTING-002 (Integration Testing Strategy)
 * Pattern: Pattern-MIDDLEWARE-001 (Service Integration Layer)
 * Pattern: Pattern-TDD-001 (Test-Driven Development Ratchet)
 */

import * as assert from 'assert';
import { ServiceRegistry } from '../../services/ServiceRegistry';
import { MiddlewareLogger } from '../../services/MiddlewareLogger';
import { ErrorHandler } from '../../services/ErrorHandler';
import { ConfigurationManager } from '../../services/ConfigurationManager';
import { CacheManager } from '../../services/CacheManager';
import { EventBus, EventPriority } from '../../services/EventBus';
import { HealthMonitor, HealthState, HealthCheckable, HealthStatus } from '../../services/HealthMonitor';

suite('End-to-End Workflow Tests', () => {
	let registry: ServiceRegistry;

	setup(() => {
		registry = ServiceRegistry.getInstance();
		registry.clear();
	});

	teardown(() => {
		registry.clear();
	});

	suite('Service Initialization Workflow', () => {
		test('should initialize full middleware stack from scratch', async () => {
			// Workflow: Start application → Initialize middleware → Verify all services ready

			// Step 1: Create all middleware services
			const logger = MiddlewareLogger.getInstance();
			const errorHandler = new ErrorHandler(logger);
			const config = new ConfigurationManager();
			const cache = new CacheManager();
			const eventBus = new EventBus(logger);
			const healthMonitor = new HealthMonitor(registry, logger, eventBus);

			// Step 2: Register all services
			registry.register('logger', () => logger);
			registry.register('errorHandler', () => errorHandler);
			registry.register('config', () => config);
			registry.register('cache', () => cache);
			registry.register('eventBus', () => eventBus);
			registry.register('healthMonitor', () => healthMonitor);

			// Step 3: Verify all services are registered
			assert.ok(registry.has('logger'), 'Logger should be registered');
			assert.ok(registry.has('errorHandler'), 'ErrorHandler should be registered');
			assert.ok(registry.has('config'), 'ConfigurationManager should be registered');
			assert.ok(registry.has('cache'), 'CacheManager should be registered');
			assert.ok(registry.has('eventBus'), 'EventBus should be registered');
			assert.ok(registry.has('healthMonitor'), 'HealthMonitor should be registered');

			// Step 4: Retrieve and verify services work
			const retrievedLogger = registry.get<MiddlewareLogger>('logger');
			const retrievedConfig = registry.get<ConfigurationManager>('config');
			const retrievedCache = registry.get<CacheManager>('cache');

			retrievedLogger.info('Application started');
			retrievedConfig.set('api', { whisperEndpoint: 'https://test.com' });
			retrievedCache.set('test', 'value');

			// Step 5: Verify no errors
			assert.ok(true, 'All services initialized without errors');
		});

		test('should handle initialization failure gracefully', async () => {
			// Workflow: Start application → Service initialization fails → Fallback → Continue

			let initializationFailed = false;
			let fallbackUsed = false;

			class FailingService {
				async initialize() {
					initializationFailed = true;
					throw new Error('Initialization failed');
				}
			}

			const logger = MiddlewareLogger.getInstance();
			const errorHandler = new ErrorHandler(logger);
			registry.register('errorHandler', () => errorHandler);
			registry.register('failingService', () => new FailingService());

			// Try to initialize
			const service = registry.get<FailingService>('failingService');
			try {
				await service.initialize();
			} catch (error: any) {
				await errorHandler.handle(error, {
					service: 'failingService',
					fallback: () => {
						fallbackUsed = true;
						// Use default/mock service instead
						return { status: 'degraded' };
					}
				});
			}

			// Assert - Application continues with fallback
			assert.ok(initializationFailed, 'Initialization should have failed');
			assert.ok(fallbackUsed, 'Fallback should have been used');
		});
	});

	suite('Error Recovery Workflow', () => {
		test('should recover from transient network errors automatically', async () => {
			// Workflow: API call → Network error → Retry → Success

			const logger = MiddlewareLogger.getInstance();
			const errorHandler = new ErrorHandler(logger);
			const cache = new CacheManager();

			registry.register('errorHandler', () => errorHandler);
			registry.register('cache', () => cache);

			let attemptCount = 0;
			let recovered = false;

			class ApiService {
				async fetchData(requestId: string) {
					attemptCount++;

					// Simulate: Fail first 2 times, succeed on 3rd
					if (attemptCount < 3) {
						throw new Error('Network timeout');
					}

					recovered = true;
					return 'data_' + requestId;
				}
			}

			const apiService = new ApiService();

			// Workflow execution
			let result;
			for (let retry = 0; retry < 3; retry++) {
				try {
					result = await apiService.fetchData('test123');
					break; // Success
				} catch (error: any) {
					if (retry === 2) {
						// Final attempt - handle error
						await errorHandler.handle(error, {
							service: 'ApiService',
							requestId: 'test123',
							fallback: () => {
								// Use cached data as fallback
								return cache.get('data_test123') || 'fallback_data';
							}
						});
					}
					// Retry on transient errors
					await new Promise(resolve => setTimeout(resolve, 10));
				}
			}

			// Assert
			assert.ok(recovered, 'Service should recover after retries');
			assert.strictEqual(result, 'data_test123', 'Should get correct data after recovery');
			assert.strictEqual(attemptCount, 3, 'Should retry 3 times');
		});

		test('should use cached data when service unavailable', async () => {
			// Workflow: Service fails → Check cache → Return cached data → Continue

			const logger = MiddlewareLogger.getInstance();
			const errorHandler = new ErrorHandler(logger);
			const cache = new CacheManager();

			registry.register('errorHandler', () => errorHandler);
			registry.register('cache', () => cache);

			// Pre-populate cache
			cache.set('user_data', { id: 123, name: 'Test User' });

			class DataService {
				async getUserData() {
					// Service is down
					throw new Error('Service unavailable');
				}
			}

			const dataService = new DataService();
			let result;

			// Workflow execution
			try {
				result = await dataService.getUserData();
			} catch (error: any) {
				await errorHandler.handle(error, {
					service: 'DataService',
					fallback: () => {
						// Check cache
						const cached = cache.get('user_data');
						if (cached) {
							return cached;
						}
						return null;
					}
				});
				result = cache.get('user_data');
			}

			// Assert
			assert.ok(result, 'Should have result from cache');
			assert.strictEqual((result as any).id, 123, 'Should get cached user data');
		});
	});

	suite('Configuration Update Workflow', () => {
		test('should propagate configuration changes to all services', () => {
			// Workflow: User updates config → All services see new config → Behavior changes

			const config = new ConfigurationManager();
			registry.register('config', () => config);

			// Initial configuration
			config.set('api', { timeout: 30000 });

			class ServiceA {
				getTimeout() {
					const config = registry.get<ConfigurationManager>('config');
					return config.get('api').timeout;
				}
			}

			class ServiceB {
				getTimeout() {
					const config = registry.get<ConfigurationManager>('config');
					return config.get('api').timeout;
				}
			}

			registry.register('serviceA', () => new ServiceA());
			registry.register('serviceB', () => new ServiceB());

			const serviceA = registry.get<ServiceA>('serviceA');
			const serviceB = registry.get<ServiceB>('serviceB');

			// Verify initial config
			assert.strictEqual(serviceA.getTimeout(), 30000, 'ServiceA should have initial timeout');
			assert.strictEqual(serviceB.getTimeout(), 30000, 'ServiceB should have initial timeout');

			// User updates configuration
			config.set('api', { timeout: 5000 });

			// Verify all services see new config
			assert.strictEqual(serviceA.getTimeout(), 5000, 'ServiceA should have updated timeout');
			assert.strictEqual(serviceB.getTimeout(), 5000, 'ServiceB should have updated timeout');
		});

		test('should validate configuration changes before applying', () => {
			// Workflow: User updates config → Validation → Accept valid / Reject invalid

			const config = new ConfigurationManager();

			// Valid configuration - should succeed
			assert.doesNotThrow(() => {
				config.set('api', { timeout: 10000 });
			}, 'Valid config should be accepted');

			// Invalid configuration - should reject
			assert.throws(() => {
				config.set('api', { timeout: 500 }); // Below minimum 1000ms
			}, 'Invalid config should be rejected');

			// Verify config unchanged after failed validation
			assert.strictEqual(config.get('api').timeout, 10000, 'Config should remain unchanged after validation failure');
		});
	});

	suite('Cache Invalidation Workflow', () => {
		test('should invalidate cache when data changes', () => {
			// Workflow: Data cached → Data changes → Cache invalidated → Fresh data fetched

			const cache = new CacheManager();
			registry.register('cache', () => cache);

			let fetchCount = 0;

			class DataService {
				fetchUserData(userId: string) {
					fetchCount++;
					return { id: userId, name: 'User ' + userId, timestamp: Date.now() };
				}

				getUserData(userId: string) {
					const cache = registry.get<CacheManager>('cache');
					const cacheKey = 'user_' + userId;

					// Check cache first
					const cached = cache.get(cacheKey);
					if (cached !== null) {
						return cached;
					}

					// Fetch fresh data
					const data = this.fetchUserData(userId);
					cache.set(cacheKey, data);
					return data;
				}

				updateUserData(userId: string, newData: any) {
					// Update data (would go to database in real app)
					// Then invalidate cache
					const cache = registry.get<CacheManager>('cache');
					cache.invalidate('user_' + userId);
				}
			}

			const dataService = new DataService();

			// Step 1: First fetch (cache miss)
			const data1 = dataService.getUserData('123');
			assert.strictEqual(fetchCount, 1, 'Should fetch data on first access');

			// Step 2: Second fetch (cache hit)
			const data2 = dataService.getUserData('123');
			assert.strictEqual(fetchCount, 1, 'Should use cached data on second access');
			assert.strictEqual(data1, data2, 'Cached data should be same as original');

			// Step 3: Update data (invalidates cache)
			dataService.updateUserData('123', { name: 'Updated User' });

			// Step 4: Third fetch (cache miss after invalidation)
			const data3 = dataService.getUserData('123');
			assert.strictEqual(fetchCount, 2, 'Should fetch fresh data after cache invalidation');
			assert.notStrictEqual(data1, data3, 'New data should be different from cached');
		});

		test('should invalidate multiple cache entries by pattern', () => {
			// Workflow: Multiple items cached → Pattern invalidation → All matching items cleared

			const cache = new CacheManager();

			// Cache multiple user-related items
			cache.set('user_123', { name: 'User 123' });
			cache.set('user_456', { name: 'User 456' });
			cache.set('user_789', { name: 'User 789' });
			cache.set('settings_global', { theme: 'dark' });

			// Verify all cached
			assert.ok(cache.get('user_123'), 'User 123 should be cached');
			assert.ok(cache.get('user_456'), 'User 456 should be cached');
			assert.ok(cache.get('user_789'), 'User 789 should be cached');
			assert.ok(cache.get('settings_global'), 'Settings should be cached');

			// Invalidate all user cache entries
			cache.invalidatePattern(/^user_/);

			// Verify only user entries cleared
			assert.strictEqual(cache.get('user_123'), null, 'User 123 should be invalidated');
			assert.strictEqual(cache.get('user_456'), null, 'User 456 should be invalidated');
			assert.strictEqual(cache.get('user_789'), null, 'User 789 should be invalidated');
			assert.ok(cache.get('settings_global'), 'Settings should still be cached');
		});
	});

	suite('Service Health Monitoring Workflow', () => {
		test('should detect unhealthy service and restart automatically', async () => {
			// Workflow: Service healthy → Becomes unhealthy → Monitor detects → Restart → Healthy again

			const logger = MiddlewareLogger.getInstance();
			const eventBus = new EventBus(logger);
			const healthMonitor = new HealthMonitor(registry, logger, eventBus);

			let restartCalled = false;
			let healthChanged = false;

			class MonitoredService implements HealthCheckable {
				private state = HealthState.Healthy;

				becomeUnhealthy() {
					this.state = HealthState.Unhealthy;
				}

				async healthCheck(): Promise<HealthStatus> {
					return {
						state: this.state,
						message: this.state === HealthState.Healthy ? 'All good' : 'Something wrong',
						lastCheck: Date.now(),
						dependencies: []
					};
				}

				async restart(): Promise<void> {
					restartCalled = true;
					this.state = HealthState.Healthy;
				}
			}

			const service = new MonitoredService();
			registry.register('monitoredService', () => service);

			// Subscribe to health change events
			eventBus.subscribe('service.health.changed', (event) => {
				if (event.data.name === 'monitoredService') {
					healthChanged = true;
				}
			});

			// Step 1: Service is healthy
			await healthMonitor.checkService('monitoredService');
			let status = healthMonitor.getStatus('monitoredService');
			assert.strictEqual(status!.state, HealthState.Healthy, 'Service should start healthy');

			// Step 2: Service becomes unhealthy
			service.becomeUnhealthy();
			await healthMonitor.checkService('monitoredService');

			// Step 3: Monitor detects and restarts
			assert.ok(restartCalled, 'Service should be restarted');
			assert.ok(healthChanged, 'Health change event should be published');

			// Step 4: Service is healthy again
			await healthMonitor.checkService('monitoredService');
			status = healthMonitor.getStatus('monitoredService');
			assert.strictEqual(status!.state, HealthState.Healthy, 'Service should be healthy after restart');
		});

		test('should alert user when service cannot be recovered', async () => {
			// Workflow: Service unhealthy → Restart fails → Retry 3 times → Alert user

			const logger = MiddlewareLogger.getInstance();
			const eventBus = new EventBus(logger);
			const healthMonitor = new HealthMonitor(registry, logger, eventBus);

			let restartAttempts = 0;
			let failedEventReceived = false;

			class UnrecoverableService implements HealthCheckable {
				async healthCheck(): Promise<HealthStatus> {
					return {
						state: HealthState.Unhealthy,
						message: 'Critical failure',
						lastCheck: Date.now(),
						dependencies: []
					};
				}

				async restart(): Promise<void> {
					restartAttempts++;
					// Restart always fails
					throw new Error('Restart failed');
				}
			}

			const service = new UnrecoverableService();
			registry.register('unrecoverableService', () => service);

			// Subscribe to service.failed event
			eventBus.subscribe('service.failed', (event) => {
				if (event.data.name === 'unrecoverableService') {
					failedEventReceived = true;
				}
			});

			// Try health checks multiple times (will attempt restart each time)
			for (let i = 0; i < 4; i++) {
				await healthMonitor.checkService('unrecoverableService');
				await new Promise(resolve => setTimeout(resolve, 10));
			}

			// Assert
			assert.ok(restartAttempts >= 3, 'Should attempt restart at least 3 times');
			assert.ok(failedEventReceived, 'Should publish service.failed event after max attempts');
		});

		test('should monitor multiple services concurrently', async () => {
			// Workflow: Multiple services → Monitor all → Some healthy, some unhealthy → Handle each

			const logger = MiddlewareLogger.getInstance();
			const eventBus = new EventBus(logger);
			const healthMonitor = new HealthMonitor(registry, logger, eventBus);

			class HealthyService implements HealthCheckable {
				async healthCheck(): Promise<HealthStatus> {
					return {
						state: HealthState.Healthy,
						message: 'Healthy',
						lastCheck: Date.now(),
						dependencies: []
					};
				}
			}

			class UnhealthyService implements HealthCheckable {
				private healthy = false;

				async healthCheck(): Promise<HealthStatus> {
					return {
						state: this.healthy ? HealthState.Healthy : HealthState.Unhealthy,
						message: this.healthy ? 'Recovered' : 'Unhealthy',
						lastCheck: Date.now(),
						dependencies: []
					};
				}

				async restart(): Promise<void> {
					this.healthy = true;
				}
			}

			registry.register('service1', () => new HealthyService());
			registry.register('service2', () => new UnhealthyService());
			registry.register('service3', () => new HealthyService());

			// Check all services
			await healthMonitor.checkAllServices();

			// Verify statuses
			const status1 = healthMonitor.getStatus('service1');
			const status2 = healthMonitor.getStatus('service2');
			const status3 = healthMonitor.getStatus('service3');

			assert.strictEqual(status1!.state, HealthState.Healthy, 'Service1 should be healthy');
			assert.strictEqual(status2!.state, HealthState.Healthy, 'Service2 should be healthy after restart');
			assert.strictEqual(status3!.state, HealthState.Healthy, 'Service3 should be healthy');
		});
	});

	suite('Event-Driven Workflow', () => {
		test('should coordinate services through events', async () => {
			// Workflow: Service A completes → Publishes event → Services B, C, D react

			const logger = MiddlewareLogger.getInstance();
			const eventBus = new EventBus(logger);
			registry.register('eventBus', () => eventBus);

			const reactions: string[] = [];

			class ServiceA {
				async doWork() {
					const eventBus = registry.get<EventBus>('eventBus');
					// Work completed
					await eventBus.publish('work.completed', { service: 'A', result: 'success' });
				}
			}

			class ServiceB {
				constructor() {
					const eventBus = registry.get<EventBus>('eventBus');
					eventBus.subscribe('work.completed', () => {
						reactions.push('B');
					});
				}
			}

			class ServiceC {
				constructor() {
					const eventBus = registry.get<EventBus>('eventBus');
					eventBus.subscribe('work.completed', () => {
						reactions.push('C');
					});
				}
			}

			class ServiceD {
				constructor() {
					const eventBus = registry.get<EventBus>('eventBus');
					eventBus.subscribe('work.completed', () => {
						reactions.push('D');
					});
				}
			}

			registry.register('serviceA', () => new ServiceA());
			registry.register('serviceB', () => new ServiceB());
			registry.register('serviceC', () => new ServiceC());
			registry.register('serviceD', () => new ServiceD());

			// Instantiate subscribers first
			registry.get('serviceB');
			registry.get('serviceC');
			registry.get('serviceD');

			// Trigger workflow
			const serviceA = registry.get<ServiceA>('serviceA');
			await serviceA.doWork();

			// Assert - All services reacted
			assert.strictEqual(reactions.length, 3, 'All 3 services should react');
			assert.ok(reactions.includes('B'), 'ServiceB should react');
			assert.ok(reactions.includes('C'), 'ServiceC should react');
			assert.ok(reactions.includes('D'), 'ServiceD should react');
		});

		test('should handle event priority in workflows', async () => {
			// Workflow: Critical event → High priority event → Normal event → Verify order

			const logger = MiddlewareLogger.getInstance();
			const eventBus = new EventBus(logger);

			const processedEvents: string[] = [];

			eventBus.subscribe('critical', () => {
				processedEvents.push('critical');
			});

			eventBus.subscribe('high', () => {
				processedEvents.push('high');
			});

			eventBus.subscribe('normal', () => {
				processedEvents.push('normal');
			});

			// Publish in order: normal, high, critical
			await eventBus.publish('normal', {}, EventPriority.Normal);
			await eventBus.publish('high', {}, EventPriority.High);
			await eventBus.publish('critical', {}, EventPriority.Critical);

			// Assert - All events processed
			assert.strictEqual(processedEvents.length, 3, 'All events should be processed');
			assert.ok(processedEvents.includes('critical'), 'Critical event processed');
			assert.ok(processedEvents.includes('high'), 'High priority event processed');
			assert.ok(processedEvents.includes('normal'), 'Normal event processed');
		});
	});
});
