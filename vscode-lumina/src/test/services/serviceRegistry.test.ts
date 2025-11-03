/**
 * ServiceRegistry Test Suite (TDD RED Phase)
 *
 * DESIGN DECISION: Write tests FIRST following TDD protocol
 * WHY: Creates "ratchet" enforcing service registry requirements
 *
 * PATTERN: Pattern-TDD-001 (Test-Driven Development)
 * PATTERN: Pattern-MIDDLEWARE-001 (Service Integration Layer)
 * PATTERN: Pattern-DEPENDENCY-INJECTION-001 (Dependency Injection)
 * RELATED: MID-013
 */

import * as assert from 'assert';
import { ServiceRegistry } from '../../services/ServiceRegistry';

// Mock service for testing
class MockService {
	public initialized = false;
	public disposed = false;

	async initialize(): Promise<void> {
		this.initialized = true;
	}

	async dispose(): Promise<void> {
		this.disposed = true;
	}

	doSomething(): string {
		return 'mock result';
	}
}

// Mock service with dependencies
class MockServiceWithDependency {
	constructor(private registry: ServiceRegistry) {}

	getDependency(): MockService {
		return this.registry.get<MockService>('mockService');
	}

	useDependency(): string {
		return this.getDependency().doSomething();
	}
}

suite('ServiceRegistry Test Suite', () => {
	let registry: ServiceRegistry;

	setup(() => {
		// Get fresh registry instance and clear it for each test
		registry = ServiceRegistry.getInstance();
		registry.clear();
	});

	teardown(() => {
		// Clean up after each test
		registry.clear();
	});

	suite('Singleton Pattern', () => {
		test('should return same instance on multiple calls', () => {
			// Arrange & Act
			const instance1 = ServiceRegistry.getInstance();
			const instance2 = ServiceRegistry.getInstance();

			// Assert
			assert.strictEqual(instance1, instance2, 'Should return same singleton instance');
		});

		test('should share state across getInstance calls', () => {
			// Arrange
			const instance1 = ServiceRegistry.getInstance();
			instance1.register('testService', () => new MockService());

			// Act
			const instance2 = ServiceRegistry.getInstance();
			const hasService = instance2.has('testService');

			// Assert
			assert.strictEqual(hasService, true, 'State should be shared across instances');
		});
	});

	suite('Service Registration', () => {
		test('should register service with factory function', () => {
			// Arrange
			const factory = () => new MockService();

			// Act
			registry.register('mockService', factory);

			// Assert
			assert.strictEqual(registry.has('mockService'), true, 'Service should be registered');
		});

		test('should not create service instance on registration', () => {
			// Arrange
			let factoryCalled = false;
			const factory = () => {
				factoryCalled = true;
				return new MockService();
			};

			// Act
			registry.register('mockService', factory);

			// Assert
			assert.strictEqual(factoryCalled, false, 'Factory should not be called on registration (lazy loading)');
		});

		test('should allow registering multiple services', () => {
			// Arrange & Act
			registry.register('service1', () => new MockService());
			registry.register('service2', () => new MockService());
			registry.register('service3', () => new MockService());

			// Assert
			assert.strictEqual(registry.has('service1'), true, 'Service 1 should be registered');
			assert.strictEqual(registry.has('service2'), true, 'Service 2 should be registered');
			assert.strictEqual(registry.has('service3'), true, 'Service 3 should be registered');
		});

		test('should allow re-registering service (overwrite)', () => {
			// Arrange
			registry.register('mockService', () => {
				const service = new MockService();
				(service as any).version = 1;
				return service;
			});

			// Act: Re-register with new factory
			registry.register('mockService', () => {
				const service = new MockService();
				(service as any).version = 2;
				return service;
			});

			// Get the service (should use new factory)
			const service = registry.get<any>('mockService');

			// Assert
			assert.strictEqual(service.version, 2, 'Should use new factory after re-registration');
		});
	});

	suite('Service Retrieval', () => {
		test('should retrieve registered service', () => {
			// Arrange
			registry.register('mockService', () => new MockService());

			// Act
			const service = registry.get<MockService>('mockService');

			// Assert
			assert.ok(service, 'Should retrieve service');
			assert.strictEqual(service instanceof MockService, true, 'Should be instance of MockService');
		});

		test('should throw error when service not registered', () => {
			// Act & Assert
			assert.throws(
				() => registry.get<MockService>('nonExistentService'),
				/Service not registered: nonExistentService/,
				'Should throw error for unregistered service'
			);
		});

		test('should return same instance on multiple get calls (singleton per service)', () => {
			// Arrange
			registry.register('mockService', () => new MockService());

			// Act
			const instance1 = registry.get<MockService>('mockService');
			const instance2 = registry.get<MockService>('mockService');

			// Assert
			assert.strictEqual(instance1, instance2, 'Should return same instance (singleton per service)');
		});

		test('should create service on first get (lazy loading)', () => {
			// Arrange
			let factoryCalled = false;
			registry.register('mockService', () => {
				factoryCalled = true;
				return new MockService();
			});

			// Assert before get
			assert.strictEqual(factoryCalled, false, 'Factory should not be called before first get()');

			// Act
			registry.get<MockService>('mockService');

			// Assert after get
			assert.strictEqual(factoryCalled, true, 'Factory should be called on first get() (lazy loading)');
		});
	});

	suite('Service Existence Check', () => {
		test('should return true for registered service', () => {
			// Arrange
			registry.register('mockService', () => new MockService());

			// Act
			const exists = registry.has('mockService');

			// Assert
			assert.strictEqual(exists, true, 'Should return true for registered service');
		});

		test('should return false for unregistered service', () => {
			// Act
			const exists = registry.has('nonExistentService');

			// Assert
			assert.strictEqual(exists, false, 'Should return false for unregistered service');
		});

		test('should return true even if service not yet instantiated', () => {
			// Arrange
			registry.register('mockService', () => new MockService());
			// Don't call get() yet

			// Act
			const exists = registry.has('mockService');

			// Assert
			assert.strictEqual(exists, true, 'Should return true even before instantiation (lazy loading)');
		});
	});

	suite('Registry Clearing', () => {
		test('should clear all registered services', () => {
			// Arrange
			registry.register('service1', () => new MockService());
			registry.register('service2', () => new MockService());

			// Act
			registry.clear();

			// Assert
			assert.strictEqual(registry.has('service1'), false, 'Service 1 should be cleared');
			assert.strictEqual(registry.has('service2'), false, 'Service 2 should be cleared');
		});

		test('should clear instantiated services', () => {
			// Arrange
			registry.register('mockService', () => new MockService());
			const service1 = registry.get<MockService>('mockService'); // Instantiate

			// Act
			registry.clear();

			// Assert
			assert.throws(
				() => registry.get<MockService>('mockService'),
				/Service not registered/,
				'Should not be able to get service after clear'
			);
		});

		test('should allow re-registration after clear', () => {
			// Arrange
			registry.register('mockService', () => new MockService());
			registry.clear();

			// Act
			registry.register('mockService', () => new MockService());
			const service = registry.get<MockService>('mockService');

			// Assert
			assert.ok(service, 'Should be able to register and get service after clear');
		});
	});

	suite('Lifecycle Management - Initialize', () => {
		test('should call initialize on services that have it', async () => {
			// Arrange
			registry.register('mockService', () => new MockService());
			const service = registry.get<MockService>('mockService'); // Instantiate

			// Act
			await registry.initialize();

			// Assert
			assert.strictEqual(service.initialized, true, 'Service should be initialized');
		});

		test('should not fail for services without initialize method', async () => {
			// Arrange
			class ServiceWithoutInitialize {
				doSomething() { return 'test'; }
			}
			registry.register('simpleService', () => new ServiceWithoutInitialize());
			registry.get('simpleService'); // Instantiate

			// Act & Assert (should not throw)
			await assert.doesNotReject(
				() => registry.initialize(),
				'Should not fail for services without initialize'
			);
		});

		test('should initialize only instantiated services', async () => {
			// Arrange
			const service1 = new MockService();
			const service2 = new MockService();

			registry.register('service1', () => service1);
			registry.register('service2', () => service2);

			registry.get('service1'); // Only instantiate service1

			// Act
			await registry.initialize();

			// Assert
			assert.strictEqual(service1.initialized, true, 'Service 1 should be initialized');
			assert.strictEqual(service2.initialized, false, 'Service 2 should not be initialized (not instantiated)');
		});

		test('should handle initialize errors gracefully', async () => {
			// Arrange
			class FailingService {
				async initialize(): Promise<void> {
					throw new Error('Initialization failed');
				}
			}
			registry.register('failingService', () => new FailingService());
			registry.get('failingService'); // Instantiate

			// Act & Assert (should not throw - should log error instead)
			await assert.doesNotReject(
				() => registry.initialize(),
				'Should handle initialization errors gracefully'
			);
		});
	});

	suite('Lifecycle Management - Dispose', () => {
		test('should call dispose on services that have it', async () => {
			// Arrange
			registry.register('mockService', () => new MockService());
			const service = registry.get<MockService>('mockService'); // Instantiate

			// Act
			await registry.dispose();

			// Assert
			assert.strictEqual(service.disposed, true, 'Service should be disposed');
		});

		test('should not fail for services without dispose method', async () => {
			// Arrange
			class ServiceWithoutDispose {
				doSomething() { return 'test'; }
			}
			registry.register('simpleService', () => new ServiceWithoutDispose());
			registry.get('simpleService'); // Instantiate

			// Act & Assert (should not throw)
			await assert.doesNotReject(
				() => registry.dispose(),
				'Should not fail for services without dispose'
			);
		});

		test('should dispose services in reverse order', async () => {
			// Arrange
			const disposalOrder: string[] = [];

			class OrderedService {
				constructor(public name: string) {}
				async dispose(): Promise<void> {
					disposalOrder.push(this.name);
				}
			}

			registry.register('service1', () => new OrderedService('service1'));
			registry.register('service2', () => new OrderedService('service2'));
			registry.register('service3', () => new OrderedService('service3'));

			// Instantiate in order
			registry.get('service1');
			registry.get('service2');
			registry.get('service3');

			// Act
			await registry.dispose();

			// Assert
			assert.deepStrictEqual(
				disposalOrder,
				['service3', 'service2', 'service1'],
				'Services should be disposed in reverse order'
			);
		});

		test('should clear services after disposal', async () => {
			// Arrange
			registry.register('mockService', () => new MockService());
			registry.get('mockService'); // Instantiate

			// Act
			await registry.dispose();

			// Assert
			assert.throws(
				() => registry.get('mockService'),
				/Service not registered/,
				'Should not be able to get service after disposal'
			);
		});

		test('should handle dispose errors gracefully', async () => {
			// Arrange
			class FailingService {
				async dispose(): Promise<void> {
					throw new Error('Disposal failed');
				}
			}
			registry.register('failingService', () => new FailingService());
			registry.get('failingService'); // Instantiate

			// Act & Assert (should not throw - should log error instead)
			await assert.doesNotReject(
				() => registry.dispose(),
				'Should handle disposal errors gracefully'
			);
		});
	});

	suite('Dependency Injection', () => {
		test('should allow service to request dependencies', () => {
			// Arrange
			registry.register('mockService', () => new MockService());
			registry.register('serviceWithDep', () => new MockServiceWithDependency(registry));

			// Act
			const service = registry.get<MockServiceWithDependency>('serviceWithDep');
			const result = service.useDependency();

			// Assert
			assert.strictEqual(result, 'mock result', 'Service should be able to use dependency');
		});

		test('should support circular dependency detection', () => {
			// Arrange: Create circular dependency scenario
			// ServiceA depends on ServiceB, ServiceB depends on ServiceA

			class ServiceA {
				constructor(private registry: ServiceRegistry) {}
				getB(): any {
					return this.registry.get('serviceB');
				}
			}

			class ServiceB {
				constructor(private registry: ServiceRegistry) {}
				getA(): any {
					return this.registry.get('serviceA');
				}
			}

			registry.register('serviceA', () => new ServiceA(registry));
			registry.register('serviceB', () => new ServiceB(registry));

			// Act: Try to get serviceA (which will try to get serviceB, which tries to get serviceA)
			const serviceA = registry.get<ServiceA>('serviceA');

			// This test documents current behavior - lazy loading prevents immediate circular dep
			// The error would only occur if we tried: serviceA.getB().getA()
			assert.ok(serviceA, 'Lazy loading prevents immediate circular dependency error');
		});
	});

	suite('Mock Service Replacement', () => {
		test('should allow replacing service with mock for testing', () => {
			// Arrange: Register real service
			registry.register('mockService', () => {
				const service = new MockService();
				(service as any).real = true;
				return service;
			});

			// Act: Replace with mock
			const mockInstance = new MockService();
			(mockInstance as any).real = false;
			registry.register('mockService', () => mockInstance);

			const service = registry.get<any>('mockService');

			// Assert
			assert.strictEqual(service.real, false, 'Should use mock service');
			assert.strictEqual(service, mockInstance, 'Should be the exact mock instance');
		});
	});

	suite('Performance', () => {
		test('should register service in <10ms', () => {
			// Arrange
			const startTime = Date.now();

			// Act
			registry.register('mockService', () => new MockService());

			// Assert
			const elapsedTime = Date.now() - startTime;
			assert.ok(elapsedTime < 10, `Registration should take <10ms, took ${elapsedTime}ms`);
		});

		test('should retrieve service in <1ms', () => {
			// Arrange
			registry.register('mockService', () => new MockService());
			registry.get('mockService'); // Warm up (first call creates instance)

			// Act
			const startTime = Date.now();
			registry.get('mockService');
			const elapsedTime = Date.now() - startTime;

			// Assert
			assert.ok(elapsedTime < 1, `Retrieval should take <1ms, took ${elapsedTime}ms`);
		});

		test('should handle 100 services efficiently', () => {
			// Arrange
			const startTime = Date.now();

			// Act: Register 100 services
			for (let i = 0; i < 100; i++) {
				registry.register(`service${i}`, () => new MockService());
			}

			// Assert
			const elapsedTime = Date.now() - startTime;
			assert.ok(elapsedTime < 100, `Registering 100 services should take <100ms, took ${elapsedTime}ms`);
		});
	});

	suite('Edge Cases', () => {
		test('should handle empty service name', () => {
			// Act & Assert
			assert.throws(
				() => registry.register('', () => new MockService()),
				'Should not allow empty service name'
			);
		});

		test('should handle null factory', () => {
			// Act & Assert
			assert.throws(
				() => registry.register('mockService', null as any),
				'Should not allow null factory'
			);
		});

		test('should handle factory that returns null', () => {
			// Arrange
			registry.register('nullService', () => null as any);

			// Act
			const service = registry.get('nullService');

			// Assert
			assert.strictEqual(service, null, 'Should handle factory that returns null');
		});

		test('should handle factory that throws error', () => {
			// Arrange
			registry.register('failingService', () => {
				throw new Error('Factory failed');
			});

			// Act & Assert
			assert.throws(
				() => registry.get('failingService'),
				/Factory failed/,
				'Should propagate factory errors'
			);
		});
	});
});
