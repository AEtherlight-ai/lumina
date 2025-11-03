/**
 * Health Monitor Service
 *
 * DESIGN DECISION: Periodic health checks with automatic restart on failure
 * WHY: Early failure detection, automatic recovery, improved reliability
 *
 * REASONING CHAIN:
 * 1. Health check types: Liveness (alive), Readiness (ready), Startup (started)
 * 2. Health states: Healthy, Degraded, Unhealthy, Unknown
 * 3. Auto-recovery: Restart unhealthy services (max 3 attempts)
 * 4. Dependency tracking: Mark dependents as degraded when dependency fails
 * 5. Performance: <10ms health checks, <100ms restart
 *
 * PATTERN: Pattern-RELIABILITY-001 (Service Health Monitoring)
 * PATTERN: Pattern-MIDDLEWARE-001 (Service Integration Layer)
 * PATTERN: Pattern-OBSERVABILITY-001 (System Observability)
 * RELATED: MID-019, ServiceRegistry, EventBus
 *
 * @module services/HealthMonitor
 */

import * as vscode from 'vscode';
import { ServiceRegistry } from './ServiceRegistry';
import { MiddlewareLogger } from './MiddlewareLogger';
import { EventBus, EventPriority } from './EventBus';

/**
 * Health state enum
 */
export enum HealthState {
	Healthy = 'healthy',      // Service working normally
	Degraded = 'degraded',    // Service working but slow or limited
	Unhealthy = 'unhealthy',  // Service not working, needs restart
	Unknown = 'unknown'       // Can't determine health (monitor failure)
}

/**
 * Health status structure
 */
export interface HealthStatus {
	state: HealthState;
	message: string;
	lastCheck: number;
	dependencies: string[];
}

/**
 * Interface for services that support health checks
 */
export interface HealthCheckable {
	healthCheck(): Promise<HealthStatus>;
	restart?(): Promise<void>;
}

/**
 * Health Monitor Service
 *
 * Monitors service health, automatically restarts failed services, and alerts on critical failures.
 */
export class HealthMonitor {
	private registry: ServiceRegistry;
	private logger: MiddlewareLogger;
	private eventBus: EventBus;
	private healthStatus = new Map<string, HealthStatus>();
	private checkIntervalMs = 30000; // 30 seconds default
	private intervalHandle: NodeJS.Timeout | null = null;
	private restartAttempts = new Map<string, number>();
	private maxRestartAttempts = 3;

	/**
	 * Constructor
	 *
	 * @param registry - ServiceRegistry instance for accessing services
	 * @param logger - MiddlewareLogger instance for logging
	 * @param eventBus - EventBus instance for publishing events
	 */
	constructor(
		registry: ServiceRegistry,
		logger: MiddlewareLogger,
		eventBus: EventBus
	) {
		this.registry = registry;
		this.logger = logger;
		this.eventBus = eventBus;
	}

	/**
	 * Start periodic health checks
	 *
	 * DESIGN DECISION: Use setInterval for periodic checks
	 * WHY: Simple, reliable, sufficient for 30-second intervals
	 *
	 * @param intervalMs - Check interval in milliseconds (default: 30000)
	 */
	async start(intervalMs: number = 30000): Promise<void> {
		this.checkIntervalMs = intervalMs;

		// Initial health check for all services
		await this.checkAllServices();

		// Start periodic health checks
		this.intervalHandle = setInterval(() => {
			this.checkAllServices().catch(error => {
				this.logger.error('Health check interval error', error);
			});
		}, this.checkIntervalMs);

		this.logger.info('HealthMonitor started', { intervalMs: this.checkIntervalMs });
	}

	/**
	 * Stop periodic health checks
	 */
	stop(): void {
		if (this.intervalHandle) {
			clearInterval(this.intervalHandle);
			this.intervalHandle = null;
			this.logger.info('HealthMonitor stopped');
		}
	}

	/**
	 * Check health of all registered services
	 */
	async checkAllServices(): Promise<void> {
		const serviceNames = this.registry.getAllServiceNames();

		for (const name of serviceNames) {
			await this.checkService(name);
		}
	}

	/**
	 * Check health of specific service
	 *
	 * DESIGN DECISION: Catch errors and set state to Unknown
	 * WHY: One service health check failure shouldn't block others
	 *
	 * @param name - Service name
	 */
	async checkService(name: string): Promise<void> {
		try {
			// Get service from registry
			const service = this.registry.get<HealthCheckable>(name);

			if (!service) {
				// Service not found in registry
				return;
			}

			// Check if service implements health check
			if (!service.healthCheck || typeof service.healthCheck !== 'function') {
				// Service doesn't implement health check, assume healthy
				this.updateStatus(name, {
					state: HealthState.Healthy,
					message: 'No health check implemented',
					lastCheck: Date.now(),
					dependencies: []
				});
				return;
			}

			// Perform health check
			const status = await service.healthCheck();
			this.updateStatus(name, status);

			// Handle unhealthy services
			if (status.state === HealthState.Unhealthy) {
				await this.handleUnhealthyService(name, service);
			}

		} catch (error: any) {
			this.logger.error(`Health check failed: ${name}`, error);
			this.updateStatus(name, {
				state: HealthState.Unknown,
				message: `Health check failed: ${error.message}`,
				lastCheck: Date.now(),
				dependencies: []
			});
		}
	}

	/**
	 * Handle unhealthy service with automatic restart
	 *
	 * DESIGN DECISION: Max 3 restart attempts, then alert user
	 * WHY: Prevent infinite restart loops, manual intervention needed
	 *
	 * @param name - Service name
	 * @param service - Service instance
	 */
	private async handleUnhealthyService(
		name: string,
		service: HealthCheckable
	): Promise<void> {
		const attempts = this.restartAttempts.get(name) || 0;

		if (attempts >= this.maxRestartAttempts) {
			// Max restart attempts reached, alert user
			vscode.window.showErrorMessage(
				`Service '${name}' is unhealthy and cannot be restarted. Manual intervention required.`
			);
			await this.eventBus.publish('service.failed', { name }, EventPriority.Critical);
			return;
		}

		// Try to restart service
		if (service.restart && typeof service.restart === 'function') {
			try {
				this.logger.info(`Restarting service: ${name}`);
				await service.restart();
				this.restartAttempts.set(name, attempts + 1);

				// Check if restart succeeded
				await this.checkService(name);

				const status = this.healthStatus.get(name);
				if (status && status.state === HealthState.Healthy) {
					// Restart succeeded, reset attempts
					this.restartAttempts.delete(name);
					this.logger.info(`Service restarted successfully: ${name}`);
					await this.eventBus.publish('service.restarted', { name }, EventPriority.High);
				}

			} catch (error) {
				this.logger.error(`Service restart failed: ${name}`, error);
			}
		}
	}

	/**
	 * Update service health status
	 *
	 * DESIGN DECISION: Publish event on state change
	 * WHY: Other services can react to health changes (e.g., UI updates)
	 *
	 * @param name - Service name
	 * @param status - Health status
	 */
	private updateStatus(name: string, status: HealthStatus): void {
		const previousStatus = this.healthStatus.get(name);
		this.healthStatus.set(name, status);

		// Log and publish event on state changes
		if (previousStatus && previousStatus.state !== status.state) {
			this.logger.info(`Service health changed: ${name}`, {
				from: previousStatus.state,
				to: status.state
			});

			// Publish health change event
			this.eventBus.publish('service.health.changed', {
				name,
				status
			}, EventPriority.Normal).catch(error => {
				this.logger.error('Failed to publish health change event', error);
			});
		}
	}

	/**
	 * Get health status for specific service
	 *
	 * @param name - Service name
	 * @returns Health status or null if not found
	 */
	getStatus(name: string): HealthStatus | null {
		return this.healthStatus.get(name) || null;
	}

	/**
	 * Get health status for all services
	 *
	 * DESIGN DECISION: Return copy of Map
	 * WHY: Prevent external modification of internal state
	 *
	 * @returns Map of service names to health statuses
	 */
	getAllStatus(): Map<string, HealthStatus> {
		return new Map(this.healthStatus);
	}
}
