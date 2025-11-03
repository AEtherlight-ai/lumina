/**
 * ServiceRegistry - Centralized service management with dependency injection
 *
 * DESIGN DECISION: Singleton pattern with lazy loading
 * WHY: Single source of truth for all services, prevents circular dependencies
 *
 * REASONING CHAIN:
 * 1. Current architecture: Services create dependencies directly (tight coupling)
 * 2. Problem: Circular dependencies, hard to test, unclear lifecycle
 * 3. Solution: ServiceRegistry with dependency injection
 * 4. Services register via factory functions (lazy loading)
 * 5. Services request dependencies from registry (not create)
 * 6. Registry manages lifecycle (initialize, dispose)
 * 7. Result: Loose coupling, testable, maintainable, scalable
 *
 * PATTERN: Pattern-MIDDLEWARE-001 (Service Integration Layer)
 * PATTERN: Pattern-DEPENDENCY-INJECTION-001 (Dependency Injection)
 * RELATED: MID-013
 *
 * PERFORMANCE REQUIREMENT: Registration <10ms, lookup <1ms
 */

/**
 * Service factory function type
 */
export type ServiceFactory<T> = () => T;

/**
 * Service with optional lifecycle methods
 */
export interface Service {
	initialize?(): Promise<void>;
	dispose?(): Promise<void>;
	isHealthy?(): boolean;
}

/**
 * ServiceRegistry
 *
 * DESIGN DECISION: Singleton pattern ensures single source of truth
 * WHY: All services registered in one place, easy to manage and test
 */
export class ServiceRegistry {
	/**
	 * Singleton instance
	 */
	private static instance: ServiceRegistry;

	/**
	 * Map of service factories (name → factory function)
	 * Factories are registered but not yet instantiated (lazy loading)
	 */
	private factories: Map<string, ServiceFactory<any>> = new Map();

	/**
	 * Map of instantiated services (name → instance)
	 * Services are created on first get() call
	 */
	private services: Map<string, any> = new Map();

	/**
	 * Private constructor (singleton pattern)
	 */
	private constructor() {}

	/**
	 * Get singleton instance
	 *
	 * DESIGN DECISION: Singleton ensures single service registry
	 * WHY: Prevents multiple registries with different service instances
	 *
	 * @returns ServiceRegistry singleton instance
	 */
	public static getInstance(): ServiceRegistry {
		if (!ServiceRegistry.instance) {
			ServiceRegistry.instance = new ServiceRegistry();
		}
		return ServiceRegistry.instance;
	}

	/**
	 * Register service with factory function
	 *
	 * DESIGN DECISION: Factory functions enable lazy loading
	 * WHY: Services only created when needed, reduces startup time
	 *
	 * @param name - Service name (unique identifier)
	 * @param factory - Factory function that creates service instance
	 * @throws Error if name is empty or factory is null
	 */
	public register<T>(name: string, factory: ServiceFactory<T>): void {
		// Validate inputs
		if (!name || name.trim().length === 0) {
			throw new Error('Service name cannot be empty');
		}

		if (!factory) {
			throw new Error('Service factory cannot be null or undefined');
		}

		// Register factory (overwrites existing if present)
		this.factories.set(name, factory);

		// If service was previously instantiated, remove old instance
		// (next get() will create new instance with new factory)
		if (this.services.has(name)) {
			this.services.delete(name);
		}
	}

	/**
	 * Get service instance
	 *
	 * DESIGN DECISION: Lazy loading - create service on first get()
	 * WHY: Services only created when needed, reduces memory usage
	 *
	 * @param name - Service name
	 * @returns Service instance (T)
	 * @throws Error if service not registered
	 */
	public get<T>(name: string): T {
		// Check if already instantiated (singleton per service)
		if (this.services.has(name)) {
			return this.services.get(name) as T;
		}

		// Check if factory registered
		if (!this.factories.has(name)) {
			throw new Error(`Service not registered: ${name}`);
		}

		// Lazy instantiate using factory
		try {
			const factory = this.factories.get(name)!;
			const instance = factory();
			this.services.set(name, instance);
			return instance as T;
		} catch (error: any) {
			// Re-throw factory errors with context
			throw new Error(`Failed to create service '${name}': ${error.message}`);
		}
	}

	/**
	 * Check if service is registered
	 *
	 * DESIGN DECISION: Check factory registration, not instantiation
	 * WHY: Service may be registered but not yet instantiated (lazy loading)
	 *
	 * @param name - Service name
	 * @returns true if service registered, false otherwise
	 */
	public has(name: string): boolean {
		return this.factories.has(name);
	}

	/**
	 * Get all registered service names
	 *
	 * @returns Array of service names
	 */
	public getAllServiceNames(): string[] {
		return Array.from(this.factories.keys());
	}

	/**
	 * Clear all registered services
	 *
	 * DESIGN DECISION: Clear both factories and instances
	 * WHY: Enables clean slate for testing
	 */
	public clear(): void {
		this.services.clear();
		this.factories.clear();
	}

	/**
	 * Initialize all instantiated services
	 *
	 * DESIGN DECISION: Only initialize services that have been instantiated
	 * WHY: Lazy loading means not all registered services are created yet
	 *
	 * @returns Promise that resolves when all services initialized
	 */
	public async initialize(): Promise<void> {
		const initPromises: Promise<void>[] = [];

		for (const [name, instance] of this.services.entries()) {
			// Check if service has initialize method
			if (instance && typeof instance.initialize === 'function') {
				// Wrap in error handler to prevent one failure from blocking others
				const initPromise = (async () => {
					try {
						await instance.initialize();
					} catch (error: any) {
						console.error(`[ServiceRegistry] Failed to initialize service '${name}': ${error.message}`);
						// Continue with other services
					}
				})();

				initPromises.push(initPromise);
			}
		}

		// Wait for all initializations to complete
		await Promise.all(initPromises);
	}

	/**
	 * Dispose all instantiated services
	 *
	 * DESIGN DECISION: Dispose in reverse order of instantiation
	 * WHY: Services created later may depend on earlier services
	 *
	 * @returns Promise that resolves when all services disposed
	 */
	public async dispose(): Promise<void> {
		// Get services in reverse order (LIFO - Last In First Out)
		const entries = Array.from(this.services.entries()).reverse();

		for (const [name, instance] of entries) {
			// Check if service has dispose method
			if (instance && typeof instance.dispose === 'function') {
				try {
					await instance.dispose();
				} catch (error: any) {
					console.warn(`[ServiceRegistry] Failed to dispose service '${name}': ${error.message}`);
					// Continue with other services
				}
			}
		}

		// Clear all services after disposal
		this.services.clear();
	}

	/**
	 * Get health status of all services
	 *
	 * DESIGN DECISION: Check isHealthy() method on each service
	 * WHY: Enables health monitoring and diagnostics
	 *
	 * @returns Map of service name → health status
	 */
	public getHealthStatus(): Map<string, boolean> {
		const healthMap = new Map<string, boolean>();

		for (const [name, instance] of this.services.entries()) {
			if (instance && typeof instance.isHealthy === 'function') {
				try {
					healthMap.set(name, instance.isHealthy());
				} catch (error) {
					// If health check fails, consider unhealthy
					healthMap.set(name, false);
				}
			} else {
				// No health check method = assume healthy
				healthMap.set(name, true);
			}
		}

		return healthMap;
	}

	/**
	 * Get list of all registered service names
	 *
	 * @returns Array of service names
	 */
	public getRegisteredServices(): string[] {
		return Array.from(this.factories.keys());
	}

	/**
	 * Get list of all instantiated service names
	 *
	 * @returns Array of service names
	 */
	public getInstantiatedServices(): string[] {
		return Array.from(this.services.keys());
	}

	/**
	 * Get count of registered services
	 *
	 * @returns Number of registered services
	 */
	public getServiceCount(): number {
		return this.factories.size;
	}

	/**
	 * Get count of instantiated services
	 *
	 * @returns Number of instantiated services
	 */
	public getInstantiatedCount(): number {
		return this.services.size;
	}
}
