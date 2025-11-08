/**
 * ConfigMigration: Service for migrating old ÆtherLight configurations to new format
 *
 * DESIGN DECISION: Automated migration with rollback for safe upgrades
 * WHY: Existing users need smooth upgrade path without losing customizations
 *
 * REASONING CHAIN:
 * 1. Problem: Old config formats incompatible with self-configuration system
 * 2. Problem: Users have customizations (build commands, paths) that must be preserved
 * 3. Solution: Automated migration v1 → v2 with customization preservation
 * 4. Solution: Backup + rollback for safety
 * 5. Result: Existing users can upgrade without manual config editing
 *
 * MIGRATION PATHS:
 * - v0 (no config) → v2 (run detection + interview)
 * - v1 (.claude/config.json) → v2 (.aetherlight/project-config.json)
 *
 * WORKFLOW:
 * 1. detectOldConfig() → Find old config format
 * 2. backupOldConfig() → Create .backup file
 * 3. migrateV1ToV2() → Transform to new schema
 * 4. validate() → Ensure valid output
 * 5. write() → Save to .aetherlight/project-config.json
 * 6. writeMigrationLog() → Document changes
 * 7. On error: rollback() → Restore from backup
 *
 * PATTERN: Pattern-TDD-001 (90% coverage for infrastructure)
 * RELATED: SELF-017 (VersionTracker), SELF-016 (Upgrade command)
 */

import * as fs from 'fs';
import * as path from 'path';
import { ProjectConfig, DEFAULT_CONFIG } from './ProjectConfig';
import { ProjectConfigValidator } from './ProjectConfigValidator';
import { MiddlewareLogger } from './MiddlewareLogger';

/**
 * Old config information
 */
export interface OldConfigInfo {
    /** Config version (v1, v0) */
    version: 'v1' | 'v0';

    /** Path to old config file */
    path: string;

    /** Parsed config content */
    config: any;
}

/**
 * Migration result
 */
export interface MigrationResult {
    /** Success flag */
    success: boolean;

    /** Migration performed flag */
    migrated: boolean;

    /** Migration version (e.g., "v1_to_v2") */
    version?: string;

    /** Result message */
    message: string;

    /** Error message (if failed) */
    error?: string;

    /** Path to new config file */
    newConfigPath?: string;
}

/**
 * ConfigMigration: Service for migrating old configs to new self-config format
 *
 * DESIGN DECISION: Pure service with dependency injection
 * WHY: Testable (inject mocked validator), single responsibility
 */
export class ConfigMigration {
    private logger: MiddlewareLogger;

    constructor(private validator: ProjectConfigValidator) {
        this.logger = MiddlewareLogger.getInstance();
    }

    /**
     * Detect old configuration format in project
     *
     * @param projectRoot - Absolute path to project root
     * @returns Old config info or null if not found
     *
     * ALGORITHM:
     * 1. Check .claude/config.json (v1)
     * 2. Check .aetherlight/config.json (v0 legacy)
     * 3. Return newest format found
     *
     * PERFORMANCE TARGET: <50ms (local file reads)
     */
    public async detectOldConfig(projectRoot: string): Promise<OldConfigInfo | null> {
        const startTime = this.logger.startOperation('ConfigMigration.detectOldConfig', {
            projectRoot
        });

        try {
            // Check for v1 config (.claude/config.json)
            const v1Path = path.join(projectRoot, '.claude', 'config.json');
            if (fs.existsSync(v1Path)) {
                try {
                    const content = fs.readFileSync(v1Path, 'utf-8');
                    const config = JSON.parse(content);

                    this.logger.endOperation('ConfigMigration.detectOldConfig', startTime, {
                        version: 'v1',
                        path: v1Path
                    });

                    return {
                        version: 'v1',
                        path: v1Path,
                        config
                    };
                } catch (parseError) {
                    throw new Error(`Failed to parse old config at ${v1Path}: ${(parseError as Error).message}`);
                }
            }

            // Check for v0 legacy config (.aetherlight/config.json)
            const v0Path = path.join(projectRoot, '.aetherlight', 'config.json');
            if (fs.existsSync(v0Path)) {
                try {
                    const content = fs.readFileSync(v0Path, 'utf-8');
                    const config = JSON.parse(content);

                    this.logger.endOperation('ConfigMigration.detectOldConfig', startTime, {
                        version: 'v0',
                        path: v0Path
                    });

                    return {
                        version: 'v0',
                        path: v0Path,
                        config
                    };
                } catch (parseError) {
                    throw new Error(`Failed to parse old config at ${v0Path}: ${(parseError as Error).message}`);
                }
            }

            // No old config found
            this.logger.endOperation('ConfigMigration.detectOldConfig', startTime, {
                result: 'none'
            });

            return null;
        } catch (error) {
            this.logger.failOperation('ConfigMigration.detectOldConfig', startTime, error);
            throw error;
        }
    }

    /**
     * Migrate old configuration to new self-config format
     *
     * @param projectRoot - Absolute path to project root
     * @returns Migration result
     *
     * ALGORITHM:
     * 1. Detect old config
     * 2. If no old config → return "no migration needed"
     * 3. Backup old config
     * 4. Migrate to new format
     * 5. Validate migrated config
     * 6. Write new config
     * 7. Write migration log
     * 8. On error: rollback
     *
     * PERFORMANCE TARGET: <500ms (includes validation)
     */
    public async migrate(projectRoot: string): Promise<MigrationResult> {
        const startTime = this.logger.startOperation('ConfigMigration.migrate', {
            projectRoot
        });

        try {
            // Step 1: Detect old config
            const oldConfig = await this.detectOldConfig(projectRoot);

            if (!oldConfig) {
                // No migration needed
                this.logger.endOperation('ConfigMigration.migrate', startTime, {
                    result: 'no_migration_needed'
                });

                return {
                    success: true,
                    migrated: false,
                    message: 'No old config found. No migration needed.'
                };
            }

            this.logger.info('Migrating config', {
                version: oldConfig.version,
                path: oldConfig.path
            });

            // Step 2: Backup old config
            await this.backupOldConfig(oldConfig.path);

            // Step 3: Migrate to new format
            let newConfig: ProjectConfig;
            try {
                if (oldConfig.version === 'v1') {
                    newConfig = this.migrateV1ToV2(oldConfig.config, projectRoot);
                } else {
                    // v0 → v2
                    newConfig = this.migrateV0ToV2(oldConfig.config, projectRoot);
                }
            } catch (migrationError) {
                // Rollback on migration error
                await this.rollback(oldConfig.path);
                throw migrationError;
            }

            // Step 4: Validate migrated config
            const validation = this.validator.validate(newConfig);
            if (!validation.valid) {
                // Rollback on validation failure
                await this.rollback(oldConfig.path);

                const result: MigrationResult = {
                    success: false,
                    migrated: false,
                    message: 'Migration validation failed',
                    error: `Config validation failed: ${validation.errors.join(', ')}`
                };

                // Log failure
                await this.writeMigrationLog(projectRoot, oldConfig, newConfig, result);

                return result;
            }

            // Step 5: Write new config
            const newConfigPath = path.join(projectRoot, '.aetherlight', 'project-config.json');
            const aetherlightDir = path.dirname(newConfigPath);

            if (!fs.existsSync(aetherlightDir)) {
                fs.mkdirSync(aetherlightDir, { recursive: true });
            }

            try {
                fs.writeFileSync(newConfigPath, JSON.stringify(newConfig, null, 2), 'utf-8');
            } catch (writeError) {
                // Rollback on write error
                await this.rollback(oldConfig.path);
                throw new Error(`Failed to write new config: ${(writeError as Error).message}`);
            }

            // Step 6: Write migration log
            const result: MigrationResult = {
                success: true,
                migrated: true,
                version: `${oldConfig.version}_to_v2`,
                message: `Successfully migrated config from ${oldConfig.version} to v2`,
                newConfigPath
            };

            await this.writeMigrationLog(projectRoot, oldConfig, newConfig, result);

            this.logger.endOperation('ConfigMigration.migrate', startTime, {
                version: result.version,
                newConfigPath
            });

            return result;
        } catch (error) {
            this.logger.failOperation('ConfigMigration.migrate', startTime, error);

            return {
                success: false,
                migrated: false,
                message: 'Migration failed',
                error: (error as Error).message
            };
        }
    }

    /**
     * Migrate v1 config to v2 format
     *
     * @param v1Config - Old v1 config
     * @param projectRoot - Project root path
     * @returns New v2 config
     *
     * ALGORITHM:
     * 1. Start with DEFAULT_CONFIG as base
     * 2. Map v1 fields to v2 schema
     * 3. Preserve customizations
     * 4. Store unknown fields in custom section
     */
    private migrateV1ToV2(v1Config: any, projectRoot: string): ProjectConfig {
        // Extract values from v1 config
        const projectName = v1Config.projectName || v1Config.name || 'project';
        const language = v1Config.language || 'typescript';
        const buildCommand = v1Config.buildCommand || 'npm run build';
        const testCommand = v1Config.testCommand || 'npm test';
        const packageManager = v1Config.packageManager || 'npm';
        const testFramework = v1Config.testFramework || 'jest';

        // Map paths
        const sourceDir = v1Config.paths?.source || v1Config.sourceDirectory || 'src';
        const testDir = v1Config.paths?.test || v1Config.testDirectory || 'test';
        const outputDir = v1Config.paths?.output || v1Config.outputDirectory || 'out';
        const docsDir = v1Config.paths?.docs || v1Config.docsDirectory || 'docs';
        const scriptsDir = v1Config.paths?.scripts || v1Config.scriptsDirectory || 'scripts';

        // File extensions based on language
        const fileExtensions = this.getDefaultFileExtensions(language);

        // Start with DEFAULT_CONFIG and override with migrated values
        const newConfig: ProjectConfig = {
            ...DEFAULT_CONFIG,
            project_name: projectName,
            language: {
                ...DEFAULT_CONFIG.language,
                language: language as any,
                file_extensions: fileExtensions,
                build_command: buildCommand,
                test_command: testCommand,
                package_manager: packageManager as any,
                test_framework: testFramework as any
            },
            structure: {
                ...DEFAULT_CONFIG.structure,
                root_directory: projectRoot,
                source_directory: sourceDir,
                test_directory: testDir,
                output_directory: outputDir,
                docs_directory: docsDir,
                scripts_directory: scriptsDir
            },
            testing: {
                ...DEFAULT_CONFIG.testing,
                coverage_infrastructure: v1Config.coverageTargets?.infrastructure || 90,
                coverage_api: v1Config.coverageTargets?.api || 85,
                coverage_ui: v1Config.coverageTargets?.ui || 70,
                coverage_command: v1Config.coverageCommand || 'npm run coverage'
            }
        };

        // Preserve unknown custom fields
        const knownFields = [
            'version', 'projectName', 'name', 'language', 'buildCommand', 'testCommand',
            'packageManager', 'testFramework', 'paths', 'sourceDirectory', 'testDirectory',
            'outputDirectory', 'docsDirectory', 'scriptsDirectory', 'coverageTargets', 'coverageCommand'
        ];

        const customFields: any = {};
        for (const [key, value] of Object.entries(v1Config)) {
            if (!knownFields.includes(key)) {
                customFields[key] = value;
            }
        }

        if (Object.keys(customFields).length > 0) {
            (newConfig as any).custom = customFields;
        }

        return newConfig;
    }

    /**
     * Migrate v0 config to v2 format (legacy)
     *
     * @param v0Config - Old v0 config
     * @param projectRoot - Project root path
     * @returns New v2 config
     */
    private migrateV0ToV2(v0Config: any, projectRoot: string): ProjectConfig {
        // v0 format is very basic, mostly hardcoded
        return this.migrateV1ToV2(v0Config, projectRoot);
    }

    /**
     * Backup old config before migration
     *
     * @param oldConfigPath - Path to old config file
     */
    private async backupOldConfig(oldConfigPath: string): Promise<void> {
        const backupPath = oldConfigPath + '.backup';

        try {
            const content = fs.readFileSync(oldConfigPath, 'utf-8');
            fs.writeFileSync(backupPath, content, 'utf-8');

            this.logger.info('Config backed up', { backupPath });
        } catch (error) {
            throw new Error(`Failed to backup old config: ${(error as Error).message}`);
        }
    }

    /**
     * Rollback migration on error
     *
     * @param oldConfigPath - Path to old config file
     */
    private async rollback(oldConfigPath: string): Promise<void> {
        const backupPath = oldConfigPath + '.backup';

        if (fs.existsSync(backupPath)) {
            try {
                // Restore from backup
                const backupContent = fs.readFileSync(backupPath, 'utf-8');
                fs.writeFileSync(oldConfigPath, backupContent, 'utf-8');

                // Remove backup
                fs.unlinkSync(backupPath);

                this.logger.info('Migration rolled back', { oldConfigPath });
            } catch (error) {
                this.logger.error('Rollback failed', error);
            }
        }
    }

    /**
     * Write migration log
     *
     * @param projectRoot - Project root directory
     * @param oldConfig - Old config info
     * @param newConfig - New config
     * @param result - Migration result
     */
    private async writeMigrationLog(
        projectRoot: string,
        oldConfig: OldConfigInfo,
        newConfig: ProjectConfig,
        result: MigrationResult
    ): Promise<void> {
        const logPath = path.join(projectRoot, '.aetherlight', 'migration.log');
        const aetherlightDir = path.dirname(logPath);

        if (!fs.existsSync(aetherlightDir)) {
            fs.mkdirSync(aetherlightDir, { recursive: true });
        }

        const logEntry = `
===========================================
Migration Log
===========================================
Date: ${new Date().toISOString()}
Migration: ${oldConfig.version}_to_v2
Status: ${result.success ? 'Success' : 'Failed'}

Old Config Path: ${oldConfig.path}
Old Config Version: ${oldConfig.version}

Old Config Content:
${JSON.stringify(oldConfig.config, null, 2)}

New Config Content:
${JSON.stringify(newConfig, null, 2)}

${result.error ? `Error: ${result.error}` : ''}

Message: ${result.message}
===========================================
`;

        try {
            // Append to log file
            fs.appendFileSync(logPath, logEntry, 'utf-8');
            this.logger.info('Migration log written', { logPath });
        } catch (error) {
            this.logger.error('Failed to write migration log', error);
        }
    }

    /**
     * Get default file extensions for language
     *
     * @param language - Programming language
     * @returns Array of file extensions
     */
    private getDefaultFileExtensions(language: string): string[] {
        const extensionMap: Record<string, string[]> = {
            typescript: ['.ts', '.tsx'],
            javascript: ['.js', '.jsx'],
            rust: ['.rs'],
            go: ['.go'],
            python: ['.py'],
            java: ['.java'],
            csharp: ['.cs'],
            cpp: ['.cpp', '.hpp', '.cc', '.h'],
            ruby: ['.rb'],
            php: ['.php']
        };

        return extensionMap[language] || ['.ts'];
    }
}
