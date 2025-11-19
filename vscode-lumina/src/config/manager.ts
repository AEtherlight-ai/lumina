/**
 * Configuration Manager
 *
 * DESIGN DECISION: VS Code settings integration with Rust config loader
 * WHY: Users expect VS Code native settings UI, but need Rust config power
 *
 * REASONING CHAIN:
 * 1. VS Code provides settings UI (JSON-based, autocomplete, validation)
 * 2. Rust provides 4-tier hierarchy (System → Team → Project → User)
 * 3. Merge both: VS Code settings = User level, Rust handles rest
 * 4. ConfigManager bridges gap: VS Code ↔ Rust config loader
 * 5. Result: Best of both worlds (native UI + powerful config)
 *
 * PATTERN: Pattern-CONFIG-001 (Hierarchical Configuration)
 * RELATED: crates/aetherlight-core/src/config/loader.rs
 * PERFORMANCE: <50ms load, <100ms save
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import {
    AetherlightConfig,
    ConfigLevel,
    TerminalConfig,
    DEFAULT_CONFIG,
    ValidationResult
} from './types';

/**
 * Configuration Manager
 *
 * Manages configuration with VS Code settings integration
 */
export class ConfigManager {
    private static instance: ConfigManager;
    private config: AetherlightConfig;
    private configChangeEmitter: vscode.EventEmitter<AetherlightConfig>;

    /**
     * Configuration changed event
     */
    public readonly onDidChangeConfiguration: vscode.Event<AetherlightConfig>;

    private constructor() {
        this.config = DEFAULT_CONFIG;
        this.configChangeEmitter = new vscode.EventEmitter<AetherlightConfig>();
        this.onDidChangeConfiguration = this.configChangeEmitter.event;

        // Load initial configuration
        this.loadConfiguration();

        // Watch for VS Code settings changes
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('aetherlight')) {
                this.loadConfiguration();
            }
        });
    }

    /**
     * Get singleton instance
     */
    public static getInstance(): ConfigManager {
        if (!ConfigManager.instance) {
            ConfigManager.instance = new ConfigManager();
        }
        return ConfigManager.instance;
    }

    /**
     * Load configuration from VS Code settings
     *
     * DESIGN DECISION: VS Code settings = User level only
     * WHY: System/Team/Project levels handled by Rust config loader
     */
    private loadConfiguration(): void {
        const vsConfig = vscode.workspace.getConfiguration('aetherlight');

        // Load terminal configuration
        const terminal: TerminalConfig = {
            enabled: vsConfig.get('terminal.enabled', DEFAULT_CONFIG.terminal.enabled),
            voice: {
                enabled: vsConfig.get('terminal.voice.enabled', DEFAULT_CONFIG.terminal.voice.enabled),
                hotkey: vsConfig.get('terminal.voice.hotkey', DEFAULT_CONFIG.terminal.voice.hotkey),
                auto_transcribe: vsConfig.get('terminal.voice.autoTranscribe', DEFAULT_CONFIG.terminal.voice.auto_transcribe),
                openai_model: vsConfig.get('terminal.voice.openaiModel', DEFAULT_CONFIG.terminal.voice.openai_model),
                language: vsConfig.get('terminal.voice.language', DEFAULT_CONFIG.terminal.voice.language)
            },
            typing: {
                auto_enhance: vsConfig.get('terminal.typing.autoEnhance', DEFAULT_CONFIG.terminal.typing.auto_enhance),
                show_preview: vsConfig.get('terminal.typing.showPreview', DEFAULT_CONFIG.terminal.typing.show_preview),
                preview_delay_ms: vsConfig.get('terminal.typing.previewDelayMs', DEFAULT_CONFIG.terminal.typing.preview_delay_ms)
            },
            enhancement: {
                include_patterns: vsConfig.get('terminal.enhancement.includePatterns', DEFAULT_CONFIG.terminal.enhancement.include_patterns),
                include_file_context: vsConfig.get('terminal.enhancement.includeFileContext', DEFAULT_CONFIG.terminal.enhancement.include_file_context),
                include_project_state: vsConfig.get('terminal.enhancement.includeProjectState', DEFAULT_CONFIG.terminal.enhancement.include_project_state),
                include_error_context: vsConfig.get('terminal.enhancement.includeErrorContext', DEFAULT_CONFIG.terminal.enhancement.include_error_context),
                include_history: vsConfig.get('terminal.enhancement.includeHistory', DEFAULT_CONFIG.terminal.enhancement.include_history),
                confidence_threshold: vsConfig.get('terminal.enhancement.confidenceThreshold', DEFAULT_CONFIG.terminal.enhancement.confidence_threshold),
                max_context_tokens: vsConfig.get('terminal.enhancement.maxContextTokens', DEFAULT_CONFIG.terminal.enhancement.max_context_tokens),
                max_history_messages: vsConfig.get('terminal.enhancement.maxHistoryMessages', DEFAULT_CONFIG.terminal.enhancement.max_history_messages)
            },
            patterns: {
                show_inline: vsConfig.get('terminal.patterns.showInline', DEFAULT_CONFIG.terminal.patterns.show_inline),
                show_sidebar: vsConfig.get('terminal.patterns.showSidebar', DEFAULT_CONFIG.terminal.patterns.show_sidebar),
                confidence_threshold: vsConfig.get('terminal.patterns.confidenceThreshold', DEFAULT_CONFIG.terminal.patterns.confidence_threshold),
                max_patterns_shown: vsConfig.get('terminal.patterns.maxPatternsShown', DEFAULT_CONFIG.terminal.patterns.max_patterns_shown)
            },
            performance: {
                max_enhancement_time_ms: vsConfig.get('terminal.performance.maxEnhancementTimeMs', DEFAULT_CONFIG.terminal.performance.max_enhancement_time_ms),
                cache_enabled: vsConfig.get('terminal.performance.cacheEnabled', DEFAULT_CONFIG.terminal.performance.cache_enabled)
            }
        };

        // Update configuration
        const oldConfig = this.config;
        this.config = {
            terminal,
            level: ConfigLevel.User
        };

        // Notify listeners if changed
        if (JSON.stringify(oldConfig) !== JSON.stringify(this.config)) {
            this.configChangeEmitter.fire(this.config);
        }
    }

    /**
     * Get current configuration
     */
    public getConfig(): AetherlightConfig {
        return { ...this.config };
    }

    /**
     * Get terminal configuration
     */
    public getTerminalConfig(): TerminalConfig {
        return { ...this.config.terminal };
    }

    /**
     * Update terminal configuration
     */
    public async updateTerminalConfig(updates: Partial<TerminalConfig>): Promise<void> {
        const vsConfig = vscode.workspace.getConfiguration('aetherlight.terminal');

        for (const [key, value] of Object.entries(updates)) {
            if (typeof value === 'object' && value !== null) {
                // Nested object - update each field
                for (const [subKey, subValue] of Object.entries(value)) {
                    await vsConfig.update(
                        `${this.toVSCodeKey(key)}.${this.toVSCodeKey(subKey)}`,
                        subValue,
                        vscode.ConfigurationTarget.Global
                    );
                }
            } else {
                await vsConfig.update(this.toVSCodeKey(key), value, vscode.ConfigurationTarget.Global);
            }
        }

        // Reload configuration
        this.loadConfiguration();
    }

    /**
     * Validate configuration
     */
    public validate(): ValidationResult {
        const errors: string[] = [];

        // Validate terminal config
        if (this.config.terminal.patterns.confidence_threshold < 0 ||
            this.config.terminal.patterns.confidence_threshold > 1) {
            errors.push('Pattern confidence threshold must be between 0 and 1');
        }

        if (this.config.terminal.patterns.max_patterns_shown < 1 ||
            this.config.terminal.patterns.max_patterns_shown > 10) {
            errors.push('Max patterns shown must be between 1 and 10');
        }

        if (this.config.terminal.enhancement.max_history_messages < 1 ||
            this.config.terminal.enhancement.max_history_messages > 20) {
            errors.push('Max history messages must be between 1 and 20');
        }

        if (this.config.terminal.performance.max_enhancement_time_ms < 100 ||
            this.config.terminal.performance.max_enhancement_time_ms > 10000) {
            errors.push('Max enhancement time must be between 100ms and 10000ms');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Reset configuration to defaults
     */
    public async reset(): Promise<void> {
        // Reset all aetherlight settings to undefined (removes them, triggers defaults)
        const vsConfig = vscode.workspace.getConfiguration('aetherlight');
        const keys = [
            'terminal', 'terminal.enabled', 'terminal.voice', 'terminal.voice.enabled',
            'terminal.voice.hotkey', 'terminal.voice.autoTranscribe', 'terminal.voice.whisperModel',
            'terminal.voice.language', 'terminal.typing', 'terminal.typing.autoEnhance',
            'terminal.typing.showPreview', 'terminal.typing.previewDelayMs',
            'terminal.enhancement', 'terminal.patterns', 'terminal.performance'
        ];

        for (const key of keys) {
            await vsConfig.update(key, undefined, vscode.ConfigurationTarget.Global);
        }

        this.loadConfiguration();
    }

    /**
     * Export configuration to file
     */
    public async exportToFile(filePath: string): Promise<void> {
        const content = JSON.stringify(this.config, null, 2);
        await fs.promises.writeFile(filePath, content, 'utf-8');
    }

    /**
     * Import configuration from file
     */
    public async importFromFile(filePath: string): Promise<void> {
        const content = await fs.promises.readFile(filePath, 'utf-8');
        const imported = JSON.parse(content) as AetherlightConfig;

        // Update terminal config
        if (imported.terminal) {
            await this.updateTerminalConfig(imported.terminal);
        }
    }

    /**
     * Convert snake_case to camelCase for VS Code settings
     */
    private toVSCodeKey(key: string): string {
        return key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    }

    /**
     * Dispose resources
     */
    public dispose(): void {
        this.configChangeEmitter.dispose();
    }
}
