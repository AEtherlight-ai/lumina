/**
 * Configuration Manager Service
 *
 * DESIGN DECISION: Centralized configuration with layered overrides
 * WHY: Easy to customize, validate, and manage configuration across environments
 *
 * REASONING CHAIN:
 * 1. Configuration layers: Default → Env vars → User settings → Workspace → Runtime
 * 2. Priority order: Runtime overrides take precedence over defaults
 * 3. Validation: Type, range, and enum checking for all values
 * 4. Performance: In-memory cache for <1ms reads
 * 5. Persistence: Save to VS Code workspace settings
 *
 * PATTERN: Pattern-CONFIG-001 (Configuration Management)
 * PATTERN: Pattern-MIDDLEWARE-001 (Service Integration Layer)
 * RELATED: MID-016, MID-014 (MiddlewareLogger), MID-013 (ServiceRegistry)
 *
 * @module services/ConfigurationManager
 */

import * as vscode from 'vscode';
import { MiddlewareLogger } from './MiddlewareLogger';

/**
 * Configuration schema interface
 */
export interface ConfigSchema {
	api: {
		whisperEndpoint: string;
		timeout: number;
		maxRetries: number;
	};
	ui: {
		panelPosition: 'left' | 'right' | 'bottom';
		theme: 'light' | 'dark' | 'auto';
	};
	performance: {
		cacheSize: number;
		workerCount: number;
	};
	privacy: {
		telemetryEnabled: boolean;
		dataRetentionDays: number;
	};
}

/**
 * Configuration Manager Service
 *
 * Provides centralized configuration management with validation and persistence.
 */
export class ConfigurationManager {
	private config: ConfigSchema;
	private defaults: ConfigSchema;
	private logger: MiddlewareLogger;
	private workspaceRoot: string | null = null;

	/**
	 * Constructor
	 *
	 * @param logger - MiddlewareLogger instance for logging config changes
	 * @param workspaceRoot - Optional workspace root for loading workspace settings
	 */
	constructor(logger: MiddlewareLogger, workspaceRoot?: string) {
		this.logger = logger;
		this.workspaceRoot = workspaceRoot || null;
		this.defaults = this.getDefaults();
		this.config = this.loadConfiguration();
	}

	/**
	 * Get configuration value
	 *
	 * DESIGN DECISION: Return entire config section, not individual properties
	 * WHY: Type-safe access, prevents typos, enables IntelliSense
	 *
	 * @param key - Configuration key to retrieve
	 * @returns Configuration value
	 */
	get<K extends keyof ConfigSchema>(key: K): ConfigSchema[K] {
		return this.config[key];
	}

	/**
	 * Set configuration value
	 *
	 * DESIGN DECISION: Validate before setting
	 * WHY: Prevent invalid configuration from breaking the system
	 *
	 * @param key - Configuration key to set
	 * @param value - Configuration value
	 */
	set<K extends keyof ConfigSchema>(key: K, value: ConfigSchema[K]): void {
		// Validate configuration value
		this.validate(key, value);

		// Update in-memory configuration
		this.config[key] = value;

		// Persist to VS Code settings
		this.persist(key, value);

		// Log configuration change
		this.logger.info(`Configuration updated: ${key}`, { value });
	}

	/**
	 * Load configuration from all layers
	 *
	 * DESIGN DECISION: Layer priority: Runtime > Workspace > User > Env > Default
	 * WHY: Runtime overrides are most specific, defaults are fallback
	 *
	 * @returns Merged configuration from all layers
	 */
	private loadConfiguration(): ConfigSchema {
		// Layer 1: Default configuration (lowest priority)
		let config = { ...this.defaults };

		// Layer 2: Environment variables
		config = this.mergeEnvVars(config);

		// Layer 3: User settings (VS Code global settings)
		config = this.mergeUserSettings(config);

		// Layer 4: Workspace settings (.vscode/settings.json)
		if (this.workspaceRoot) {
			config = this.mergeWorkspaceSettings(config);
		}

		// Layer 5: Runtime overrides (in-memory, handled by set())
		// Runtime overrides are applied via set() after initialization

		return config;
	}

	/**
	 * Merge environment variables into configuration
	 *
	 * @param config - Current configuration
	 * @returns Configuration with environment variables merged
	 */
	private mergeEnvVars(config: ConfigSchema): ConfigSchema {
		// Check for environment-specific overrides
		if (process.env.AETHERLIGHT_API_ENDPOINT) {
			config.api.whisperEndpoint = process.env.AETHERLIGHT_API_ENDPOINT;
		}

		if (process.env.AETHERLIGHT_API_TIMEOUT) {
			const timeout = parseInt(process.env.AETHERLIGHT_API_TIMEOUT, 10);
			if (!isNaN(timeout)) {
				config.api.timeout = timeout;
			}
		}

		if (process.env.AETHERLIGHT_TELEMETRY) {
			config.privacy.telemetryEnabled = process.env.AETHERLIGHT_TELEMETRY === 'true';
		}

		return config;
	}

	/**
	 * Merge VS Code user settings (global)
	 *
	 * @param config - Current configuration
	 * @returns Configuration with user settings merged
	 */
	private mergeUserSettings(config: ConfigSchema): ConfigSchema {
		try {
			const userConfig = vscode.workspace.getConfiguration('aetherlight');

			// Merge API settings
			const apiTimeout = userConfig.get<number>('api.timeout');
			if (apiTimeout !== undefined) {
				config.api.timeout = apiTimeout;
			}

			const apiMaxRetries = userConfig.get<number>('api.maxRetries');
			if (apiMaxRetries !== undefined) {
				config.api.maxRetries = apiMaxRetries;
			}

			// Merge UI settings
			const panelPosition = userConfig.get<'left' | 'right' | 'bottom'>('ui.panelPosition');
			if (panelPosition !== undefined) {
				config.ui.panelPosition = panelPosition;
			}

			const theme = userConfig.get<'light' | 'dark' | 'auto'>('ui.theme');
			if (theme !== undefined) {
				config.ui.theme = theme;
			}

			// Merge performance settings
			const cacheSize = userConfig.get<number>('performance.cacheSize');
			if (cacheSize !== undefined) {
				config.performance.cacheSize = cacheSize;
			}

			// Merge privacy settings
			const telemetryEnabled = userConfig.get<boolean>('privacy.telemetryEnabled');
			if (telemetryEnabled !== undefined) {
				config.privacy.telemetryEnabled = telemetryEnabled;
			}
		} catch (error) {
			// VS Code settings not available (e.g., in tests)
			this.logger.warn('Could not load VS Code user settings', { error });
		}

		return config;
	}

	/**
	 * Merge VS Code workspace settings
	 *
	 * @param config - Current configuration
	 * @returns Configuration with workspace settings merged
	 */
	private mergeWorkspaceSettings(config: ConfigSchema): ConfigSchema {
		// Same as mergeUserSettings, but workspace-scoped settings override user settings
		// In VS Code, getConfiguration() returns workspace settings when in a workspace
		return this.mergeUserSettings(config);
	}

	/**
	 * Persist configuration to VS Code settings
	 *
	 * DESIGN DECISION: Save to workspace settings (not user settings)
	 * WHY: Configuration is project-specific
	 *
	 * @param key - Configuration key
	 * @param value - Configuration value
	 */
	private persist<K extends keyof ConfigSchema>(key: K, value: ConfigSchema[K]): void {
		try {
			const config = vscode.workspace.getConfiguration('aetherlight');

			// Persist API settings
			if (key === 'api') {
				const apiValue = value as ConfigSchema['api'];
				config.update('api.timeout', apiValue.timeout, vscode.ConfigurationTarget.Workspace);
				config.update('api.maxRetries', apiValue.maxRetries, vscode.ConfigurationTarget.Workspace);
				config.update('api.whisperEndpoint', apiValue.whisperEndpoint, vscode.ConfigurationTarget.Workspace);
			}

			// Persist UI settings
			if (key === 'ui') {
				const uiValue = value as ConfigSchema['ui'];
				config.update('ui.panelPosition', uiValue.panelPosition, vscode.ConfigurationTarget.Workspace);
				config.update('ui.theme', uiValue.theme, vscode.ConfigurationTarget.Workspace);
			}

			// Persist performance settings
			if (key === 'performance') {
				const perfValue = value as ConfigSchema['performance'];
				config.update('performance.cacheSize', perfValue.cacheSize, vscode.ConfigurationTarget.Workspace);
				config.update('performance.workerCount', perfValue.workerCount, vscode.ConfigurationTarget.Workspace);
			}

			// Persist privacy settings
			if (key === 'privacy') {
				const privacyValue = value as ConfigSchema['privacy'];
				config.update('privacy.telemetryEnabled', privacyValue.telemetryEnabled, vscode.ConfigurationTarget.Workspace);
				config.update('privacy.dataRetentionDays', privacyValue.dataRetentionDays, vscode.ConfigurationTarget.Workspace);
			}
		} catch (error) {
			this.logger.warn('Could not persist configuration to VS Code settings', { key, error });
		}
	}

	/**
	 * Validate configuration value
	 *
	 * DESIGN DECISION: Throw on invalid configuration
	 * WHY: Fail fast, prevent invalid state
	 *
	 * @param key - Configuration key
	 * @param value - Configuration value to validate
	 * @throws Error if validation fails
	 */
	private validate<K extends keyof ConfigSchema>(key: K, value: ConfigSchema[K]): void {
		// Validate API configuration
		if (key === 'api') {
			const apiValue = value as ConfigSchema['api'];

			if (apiValue.timeout < 1000 || apiValue.timeout > 60000) {
				throw new Error('API timeout must be between 1000-60000ms');
			}

			if (apiValue.maxRetries < 0) {
				throw new Error('API max retries must be non-negative');
			}

			if (!apiValue.whisperEndpoint || apiValue.whisperEndpoint.trim() === '') {
				throw new Error('API whisper endpoint must be set');
			}
		}

		// Validate UI configuration
		if (key === 'ui') {
			const uiValue = value as ConfigSchema['ui'];

			if (!['left', 'right', 'bottom'].includes(uiValue.panelPosition)) {
				throw new Error('UI panel position must be one of: left, right, bottom');
			}

			if (!['light', 'dark', 'auto'].includes(uiValue.theme)) {
				throw new Error('UI theme must be one of: light, dark, auto');
			}
		}

		// Validate performance configuration
		if (key === 'performance') {
			const perfValue = value as ConfigSchema['performance'];

			if (perfValue.cacheSize < 0 || perfValue.cacheSize > 1000) {
				throw new Error('Performance cache size must be between 0-1000');
			}

			if (perfValue.workerCount < 1) {
				throw new Error('Performance worker count must be at least 1');
			}
		}

		// Validate privacy configuration
		if (key === 'privacy') {
			const privacyValue = value as ConfigSchema['privacy'];

			if (typeof privacyValue.telemetryEnabled !== 'boolean') {
				throw new Error('Privacy telemetry enabled must be a boolean');
			}

			if (privacyValue.dataRetentionDays <= 0) {
				throw new Error('Privacy data retention days must be positive');
			}
		}
	}

	/**
	 * Get default configuration values
	 *
	 * DESIGN DECISION: Sensible defaults for all settings
	 * WHY: System works out-of-the-box, users can customize as needed
	 *
	 * @returns Default configuration
	 */
	private getDefaults(): ConfigSchema {
		return {
			api: {
				whisperEndpoint: 'https://api.openai.com/v1/audio/transcriptions',
				timeout: 30000, // 30 seconds
				maxRetries: 3
			},
			ui: {
				panelPosition: 'right',
				theme: 'auto'
			},
			performance: {
				cacheSize: 100,
				workerCount: 4
			},
			privacy: {
				telemetryEnabled: false,
				dataRetentionDays: 30
			}
		};
	}

	/**
	 * Load configuration from VS Code settings
	 * (Alias for mergeWorkspaceSettings for testing)
	 */
	private loadFromVSCode(): ConfigSchema {
		return this.mergeWorkspaceSettings(this.defaults);
	}

	/**
	 * Save configuration to VS Code settings
	 * (Alias for persist for testing)
	 */
	private saveToVSCode(): void {
		// Persist all configuration sections
		this.persist('api', this.config.api);
		this.persist('ui', this.config.ui);
		this.persist('performance', this.config.performance);
		this.persist('privacy', this.config.privacy);
	}
}
