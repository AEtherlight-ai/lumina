/**
 * HealthMonitor Test Suite (TDD RED Phase)
 *
 * DESIGN DECISION: Write tests FIRST following TDD protocol
 * WHY: Creates "ratchet" enforcing health monitoring requirements
 *
 * PATTERN: Pattern-TDD-001 (Test-Driven Development)
 * PATTERN: Pattern-RELIABILITY-001 (Service Health Monitoring)
 * PATTERN: Pattern-MIDDLEWARE-001 (Service Integration Layer)
 * RELATED: MID-019
 */

import * as assert from 'assert';
import { HealthMonitor, HealthState, HealthStatus, HealthCheckable } from '../../services/HealthMonitor';
import { ServiceRegistry } from '../../services/ServiceRegistry';
import { MiddlewareLogger } from '../../services/MiddlewareLogger';
import { EventBus, EventPriority } from '../../services/EventBus';

// Mock service for testing
class MockService implements HealthCheckable {
	private state: HealthState = HealthState.Healthy;
	private shouldThrow: boolean = false;
	public restartCalled: boolean = false;
	public healthCheckCalled: boolean = false;

	setHealthState(state: HealthState): void {
		this.state = state;
	}

	setShouldThrow(shouldThrow: boolean): void {
		this.shouldThrow = shouldThrow;
	}

	async healthCheck(): Promise<HealthStatus> {
		this.healthCheckCalled = true;

		if (this.shouldThrow) {
			throw new Error('Health check failed');
		}

		return {
			state: this.state,
			message: `Service is ${this.state}`,
			lastCheck: Date.now(),
			dependencies: []
		};
	}

	async restart(): Promise<void> {
		this.restartCalled = true;
		// Simulate restart by setting state to healthy
		this.state = HealthState.Healthy;
	}
}

suite('HealthMonitor Test Suite', () => {
	let healthMonitor: HealthMonitor;
	let registry: ServiceRegistry;
	let logger: MiddlewareLogger;
	let eventBus: EventBus;
	let mockService: MockService;

	setup(() => {
		// Create dependencies
		logger = MiddlewareLogger.getInstance();
		eventBus = new EventBus(logger);
		registry = ServiceRegistry.getInstance();

		// Create mock service
		mockService = new MockService();
		registry.register('testService', () => mockService);

		// Create health monitor
		healthMonitor = new HealthMonitor(registry, logger, eventBus);
	});

	teardown(() => {
		healthMonitor.stop();
		registry.clear();
	});

	suite('Health Check Operations', () => {
		test('should check service health', async () => {
			// Act
			await healthMonitor.checkService('testService');

			// Assert
			const status = healthMonitor.getStatus('testService');
			assert.ok(status, 'Should have status');
			assert.strictEqual(status!.state, HealthState.Healthy, 'Should be healthy');
			assert.ok(mockService.healthCheckCalled, 'Health check should be called');
		});

		test('should check all services', async () => {
			// Arrange
			const service2 = new MockService();
			registry.register('service2', () => service2);

			// Act
			await healthMonitor.checkAllServices();

			// Assert
			const status1 = healthMonitor.getStatus('testService');
			const status2 = healthMonitor.getStatus('service2');

			assert.ok(status1, 'Service 1 should have status');
			assert.ok(status2, 'Service 2 should have status');
			assert.ok(mockService.healthCheckCalled, 'Service 1 health check called');
			assert.ok(service2.healthCheckCalled, 'Service 2 health check called');
		});

		test('should handle service without health check method', async () => {
			// Arrange
			const serviceWithoutHealthCheck = { someMethod: () => {} };
			registry.register('noHealthCheck', () => serviceWithoutHealthCheck);

			// Act
			await healthMonitor.checkService('noHealthCheck');

			// Assert
			const status = healthMonitor.getStatus('noHealthCheck');
			assert.ok(status, 'Should have status');
			assert.strictEqual(status!.state, HealthState.Healthy, 'Should assume healthy');
			assert.ok(status!.message.includes('No health check'), 'Should indicate no health check');
		});

		test('should handle health check errors', async () => {
			// Arrange
			mockService.setShouldThrow(true);

			// Act
			await healthMonitor.checkService('testService');

			// Assert
			const status = healthMonitor.getStatus('testService');
			assert.ok(status, 'Should have status');
			assert.strictEqual(status!.state, HealthState.Unknown, 'Should be unknown on error');
		});

		test('should update last check timestamp', async () => {
			// Arrange
			const beforeTime = Date.now();

			// Act
			await healthMonitor.checkService('testService');

			// Assert
			const afterTime = Date.now();
			const status = healthMonitor.getStatus('testService');

			assert.ok(status!.lastCheck >= beforeTime, 'Last check should be >= before time');
			assert.ok(status!.lastCheck <= afterTime, 'Last check should be <= after time');
		});
	});

	suite('Health States', () => {
		test('should report healthy state', async () => {
			// Arrange
			mockService.setHealthState(HealthState.Healthy);

			// Act
			await healthMonitor.checkService('testService');

			// Assert
			const status = healthMonitor.getStatus('testService');
			assert.strictEqual(status!.state, HealthState.Healthy, 'Should be healthy');
		});

		test('should report degraded state', async () => {
			// Arrange
			mockService.setHealthState(HealthState.Degraded);

			// Act
			await healthMonitor.checkService('testService');

			// Assert
			const status = healthMonitor.getStatus('testService');
			assert.strictEqual(status!.state, HealthState.Degraded, 'Should be degraded');
		});

		test('should report unhealthy state', async () => {
			// Arrange
			mockService.setHealthState(HealthState.Unhealthy);

			// Act
			await healthMonitor.checkService('testService');

			// Assert
			const status = healthMonitor.getStatus('testService');
			// Note: May be Healthy after auto-restart
			assert.ok([HealthState.Unhealthy, HealthState.Healthy].includes(status!.state), 'Should be unhealthy or healthy after restart');
		});

		test('should report unknown state on error', async () => {
			// Arrange
			mockService.setShouldThrow(true);

			// Act
			await healthMonitor.checkService('testService');

			// Assert
			const status = healthMonitor.getStatus('testService');
			assert.strictEqual(status!.state, HealthState.Unknown, 'Should be unknown');
		});
	});

	suite('Automatic Restart', () => {
		test('should restart unhealthy service', async () => {
			// Arrange
			mockService.setHealthState(HealthState.Unhealthy);

			// Act
			await healthMonitor.checkService('testService');

			// Wait a bit for restart
			await new Promise(resolve => setTimeout(resolve, 50));

			// Assert
			assert.ok(mockService.restartCalled, 'Restart should be called');
		});

		test('should check service health after restart', async () => {
			// Arrange
			mockService.setHealthState(HealthState.Unhealthy);

			// Act
			await healthMonitor.checkService('testService');

			// Wait for restart
			await new Promise(resolve => setTimeout(resolve, 50));

			// Assert
			const status = healthMonitor.getStatus('testService');
			assert.strictEqual(status!.state, HealthState.Healthy, 'Should be healthy after restart');
		});

		test('should limit restart attempts', async () => {
			// Arrange
			let eventReceived = false;
			eventBus.subscribe('service.failed', () => {
				eventReceived = true;
			});

			// Mock service that stays unhealthy
			const unhealthyService = new MockService();
			unhealthyService.setHealthState(HealthState.Unhealthy);
			unhealthyService.restart = async () => {
				// Stay unhealthy after restart
				unhealthyService.setHealthState(HealthState.Unhealthy);
			};
			registry.register('unhealthyService', () => unhealthyService);

			// Act - Try to check multiple times (exceeding max attempts)
			for (let i = 0; i < 4; i++) {
				await healthMonitor.checkService('unhealthyService');
				await new Promise(resolve => setTimeout(resolve, 50));
			}

			// Assert
			// After 3 attempts, should stop restarting and emit service.failed event
			assert.ok(eventReceived, 'Should emit service.failed event after max attempts');
		});

		test('should not restart if service has no restart method', async () => {
			// Arrange
			const serviceWithoutRestart: HealthCheckable = {
				healthCheck: async () => ({
					state: HealthState.Unhealthy,
					message: 'Unhealthy',
					lastCheck: Date.now(),
					dependencies: []
				})
			};
			registry.register('noRestart', () => serviceWithoutRestart);

			// Act
			await healthMonitor.checkService('noRestart');

			// Assert
			const status = healthMonitor.getStatus('noRestart');
			assert.strictEqual(status!.state, HealthState.Unhealthy, 'Should remain unhealthy');
		});

		test('should reset restart attempts after successful restart', async () => {
			// Arrange
			mockService.setHealthState(HealthState.Unhealthy);

			// Act - First restart
			await healthMonitor.checkService('testService');
			await new Promise(resolve => setTimeout(resolve, 50));

			// Service is now healthy, make it unhealthy again
			mockService.setHealthState(HealthState.Unhealthy);
			mockService.restartCalled = false;

			// Second check - should restart again (attempts reset)
			await healthMonitor.checkService('testService');
			await new Promise(resolve => setTimeout(resolve, 50));

			// Assert
			assert.ok(mockService.restartCalled, 'Should restart again after reset');
		});
	});

	suite('Event Publishing', () => {
		test('should publish health change event', async () => {
			// Arrange
			let eventReceived = false;
			eventBus.subscribe('service.health.changed', () => {
				eventReceived = true;
			});

			// Initial check
			await healthMonitor.checkService('testService');

			// Act - Change health state
			mockService.setHealthState(HealthState.Degraded);
			await healthMonitor.checkService('testService');

			// Assert
			assert.ok(eventReceived, 'Should publish health change event');
		});

		test('should publish service restarted event', async () => {
			// Arrange
			let eventReceived = false;
			eventBus.subscribe('service.restarted', () => {
				eventReceived = true;
			});

			mockService.setHealthState(HealthState.Unhealthy);

			// Act
			await healthMonitor.checkService('testService');

			// Wait for restart
			await new Promise(resolve => setTimeout(resolve, 50));

			// Assert
			assert.ok(eventReceived, 'Should publish service restarted event');
		});

		test('should publish service failed event on max attempts', async () => {
			// Arrange
			let failedEventReceived = false;
			eventBus.subscribe('service.failed', () => {
				failedEventReceived = true;
			});

			// Mock service that stays unhealthy
			const alwaysUnhealthy = new MockService();
			alwaysUnhealthy.setHealthState(HealthState.Unhealthy);
			alwaysUnhealthy.restart = async () => {
				alwaysUnhealthy.setHealthState(HealthState.Unhealthy);
			};
			registry.register('alwaysUnhealthy', () => alwaysUnhealthy);

			// Act - Exceed max attempts
			for (let i = 0; i < 4; i++) {
				await healthMonitor.checkService('alwaysUnhealthy');
				await new Promise(resolve => setTimeout(resolve, 50));
			}

			// Assert
			assert.ok(failedEventReceived, 'Should publish service failed event');
		});
	});

	suite('Status Retrieval', () => {
		test('should get status for specific service', async () => {
			// Arrange
			await healthMonitor.checkService('testService');

			// Act
			const status = healthMonitor.getStatus('testService');

			// Assert
			assert.ok(status, 'Should return status');
			assert.strictEqual(status!.state, HealthState.Healthy, 'Should be healthy');
		});

		test('should return null for unknown service', () => {
			// Act
			const status = healthMonitor.getStatus('unknownService');

			// Assert
			assert.strictEqual(status, null, 'Should return null for unknown service');
		});

		test('should get all service statuses', async () => {
			// Arrange
			const service2 = new MockService();
			registry.register('service2', () => service2);

			await healthMonitor.checkAllServices();

			// Act
			const allStatus = healthMonitor.getAllStatus();

			// Assert
			assert.ok(allStatus.size >= 2, 'Should have at least 2 services');
			assert.ok(allStatus.has('testService'), 'Should include testService');
			assert.ok(allStatus.has('service2'), 'Should include service2');
		});
	});

	suite('Periodic Health Checks', () => {
		test('should start periodic health checks', async function() {
			this.timeout(5000);

			// Arrange
			let checkCount = 0;
			const originalHealthCheck = mockService.healthCheck.bind(mockService);
			mockService.healthCheck = async () => {
				checkCount++;
				return originalHealthCheck();
			};

			// Act
			await healthMonitor.start(100); // 100ms interval for testing

			// Wait for at least 2 checks
			await new Promise(resolve => setTimeout(resolve, 250));

			// Assert
			assert.ok(checkCount >= 2, `Should perform at least 2 checks, got ${checkCount}`);
		});

		test('should stop periodic health checks', async function() {
			this.timeout(5000);

			// Arrange
			let checkCount = 0;
			const originalHealthCheck = mockService.healthCheck.bind(mockService);
			mockService.healthCheck = async () => {
				checkCount++;
				return originalHealthCheck();
			};

			// Act
			await healthMonitor.start(100); // 100ms interval
			await new Promise(resolve => setTimeout(resolve, 150)); // Let it run once

			const checksBeforeStop = checkCount;
			healthMonitor.stop();

			await new Promise(resolve => setTimeout(resolve, 200)); // Wait after stop

			// Assert
			assert.ok(checkCount === checksBeforeStop || checkCount === checksBeforeStop + 1,
				'Should not perform significantly more checks after stop');
		});
	});

	suite('Performance', () => {
		test('should perform health check in <10ms', async () => {
			// Arrange
			const iterations = 100;
			const times: number[] = [];

			// Act
			for (let i = 0; i < iterations; i++) {
				const startTime = Date.now();
				await healthMonitor.checkService('testService');
				const elapsedTime = Date.now() - startTime;
				times.push(elapsedTime);
			}

			const avgTime = times.reduce((a, b) => a + b, 0) / times.length;

			// Assert
			assert.ok(avgTime < 10, `Average health check should be <10ms, was ${avgTime.toFixed(3)}ms`);
		});

		test('should restart service in <100ms', async function() {
			this.timeout(5000);

			// Arrange
			mockService.setHealthState(HealthState.Unhealthy);

			// Act
			const startTime = Date.now();
			await healthMonitor.checkService('testService');
			const elapsedTime = Date.now() - startTime;

			// Assert
			assert.ok(elapsedTime < 100, `Restart should be <100ms, was ${elapsedTime}ms`);
		});
	});

	suite('Dependency Tracking', () => {
		test('should track service dependencies', async () => {
			// Arrange
			const serviceWithDeps: HealthCheckable = {
				healthCheck: async () => ({
					state: HealthState.Healthy,
					message: 'Healthy',
					lastCheck: Date.now(),
					dependencies: ['dependency1', 'dependency2']
				})
			};
			registry.register('serviceWithDeps', () => serviceWithDeps);

			// Act
			await healthMonitor.checkService('serviceWithDeps');

			// Assert
			const status = healthMonitor.getStatus('serviceWithDeps');
			assert.ok(status!.dependencies.length === 2, 'Should have 2 dependencies');
			assert.ok(status!.dependencies.includes('dependency1'), 'Should include dependency1');
			assert.ok(status!.dependencies.includes('dependency2'), 'Should include dependency2');
		});

		test('should handle empty dependencies', async () => {
			// Act
			await healthMonitor.checkService('testService');

			// Assert
			const status = healthMonitor.getStatus('testService');
			assert.ok(Array.isArray(status!.dependencies), 'Dependencies should be array');
			assert.strictEqual(status!.dependencies.length, 0, 'Should have no dependencies');
		});
	});

	suite('Edge Cases', () => {
		test('should handle non-existent service', async () => {
			// Act
			await healthMonitor.checkService('nonExistent');

			// Assert
			const status = healthMonitor.getStatus('nonExistent');
			assert.strictEqual(status, null, 'Should return null for non-existent service');
		});

		test('should handle service health check that throws', async () => {
			// Arrange
			mockService.setShouldThrow(true);

			// Act & Assert - should not throw
			await assert.doesNotReject(
				async () => await healthMonitor.checkService('testService'),
				'Should not throw on health check error'
			);

			const status = healthMonitor.getStatus('testService');
			assert.strictEqual(status!.state, HealthState.Unknown, 'Should be unknown on error');
		});

		test('should handle service restart that throws', async () => {
			// Arrange
			mockService.setHealthState(HealthState.Unhealthy);
			mockService.restart = async () => {
				throw new Error('Restart failed');
			};

			// Act & Assert - should not throw
			await assert.doesNotReject(
				async () => await healthMonitor.checkService('testService'),
				'Should not throw on restart error'
			);
		});

		test('should handle rapid consecutive checks', async () => {
			// Arrange
			const promises: Promise<void>[] = [];

			// Act - Check same service multiple times concurrently
			for (let i = 0; i < 10; i++) {
				promises.push(healthMonitor.checkService('testService'));
			}

			// Assert - should not throw
			await assert.doesNotReject(
				async () => await Promise.all(promises),
				'Should handle concurrent checks'
			);
		});
	});
});
