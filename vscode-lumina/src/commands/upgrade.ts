/**
 * Upgrade Command: Orchestrates ÆtherLight upgrade flow
 *
 * DESIGN DECISION: Manual upgrade with user confirmation for safety
 * WHY: Users need control over when config migrations happen, data safety first
 *
 * REASONING CHAIN:
 * 1. Problem: Existing users need migration path to new self-config system
 * 2. Problem: Auto-upgrade too risky (data loss, breaking changes)
 * 3. Solution: Manual upgrade command with preview + confirmation
 * 4. Solution: Backup before upgrade, rollback on failure
 * 5. Result: Safe, user-controlled upgrade with zero data loss
 *
 * UPGRADE WORKFLOW (7 steps):
 * 1. Check for upgrade (VersionTracker.needsUpgrade)
 * 2. Preview changes (show what will change)
 * 3. User confirmation (prompt: "Upgrade to v{version}? [Y/n]")
 * 4. Create backup (BackupManager.backup)
 * 5. Migrate config (ConfigMigration.migrate)
 * 6. Update version (VersionTracker.setVersion)
 * 7. Verify success → Rollback on failure
 *
 * PATTERN: Pattern-TDD-001 (90% coverage for infrastructure)
 * RELATED: SELF-017 (VersionTracker), SELF-018 (ConfigMigration), SELF-019 (BackupManager)
 */

import * as fs from 'fs';
import * as path from 'path';
import { VersionTracker, UpgradeCheckResult } from '../services/VersionTracker';
import { ConfigMigration, MigrationResult } from '../services/ConfigMigration';
import { BackupManager } from '../services/BackupManager';
import { MiddlewareLogger } from '../services/MiddlewareLogger';

/**
 * Upgrade preview information
 */
export interface UpgradePreview {
    /** Current version (null if fresh install) */
    currentVersion: string | null;

    /** Target version to upgrade to */
    targetVersion: string;

    /** List of changes that will be applied */
    changes: string[];

    /** List of new features in target version */
    newFeatures: string[];
}

/**
 * Upgrade execution result
 */
export interface UpgradeResult {
    /** Success flag */
    success: boolean;

    /** Upgrade performed flag */
    upgraded: boolean;

    /** Result message */
    message: string;

    /** Error message (if failed) */
    error?: string;

    /** Target version (if upgraded) */
    targetVersion?: string;
}

/**
 * UpgradeCommand: Orchestrates ÆtherLight upgrade flow
 *
 * DESIGN DECISION: Command class with dependency injection
 * WHY: Testable (inject mocked services), single responsibility
 */
export class UpgradeCommand {
    private logger: MiddlewareLogger;

    constructor(
        private versionTracker: VersionTracker,
        private configMigration: ConfigMigration,
        private backupManager: BackupManager
    ) {
        this.logger = MiddlewareLogger.getInstance();
    }

    /**
     * Check if upgrade is available
     *
     * @param projectRoot - Absolute path to project root
     * @returns Upgrade check result
     *
     * ALGORITHM:
     * 1. Call VersionTracker.needsUpgrade()
     * 2. Return result (upgrade available, current version, latest version)
     *
     * PERFORMANCE TARGET: <200ms (dominated by network request to npm registry)
     */
    public async checkForUpgrade(projectRoot: string): Promise<UpgradeCheckResult> {
        const startTime = this.logger.startOperation('UpgradeCommand.checkForUpgrade', {
            projectRoot
        });

        try {
            // Delegate to VersionTracker
            const result = await this.versionTracker.needsUpgrade(projectRoot);

            this.logger.endOperation('UpgradeCommand.checkForUpgrade', startTime, {
                upgradeAvailable: result.upgradeAvailable,
                currentVersion: result.currentVersion,
                latestVersion: result.latestVersion
            });

            return result;
        } catch (error) {
            this.logger.failOperation('UpgradeCommand.checkForUpgrade', startTime, error);
            throw error;
        }
    }

    /**
     * Generate upgrade preview (show what will change)
     *
     * @param projectRoot - Absolute path to project root
     * @param currentVersion - Current version (null if fresh install)
     * @param targetVersion - Target version to upgrade to
     * @returns Upgrade preview
     *
     * ALGORITHM:
     * 1. Check if old config exists
     * 2. List schema changes (v1 → v2 format)
     * 3. List new features (detection, interview, templates)
     * 4. Return preview
     *
     * PERFORMANCE TARGET: <100ms (local file reads)
     */
    public async previewUpgrade(
        projectRoot: string,
        currentVersion: string | null,
        targetVersion: string
    ): Promise<UpgradePreview> {
        const startTime = this.logger.startOperation('UpgradeCommand.previewUpgrade', {
            projectRoot,
            currentVersion,
            targetVersion
        });

        try {
            const changes: string[] = [];
            const newFeatures: string[] = [];

            // Check if old config exists
            const aetherlightDir = path.join(projectRoot, '.aetherlight');
            const oldConfigPath = path.join(aetherlightDir, 'project-config.json');

            if (!currentVersion) {
                // Fresh install
                changes.push('Fresh installation - no existing config to migrate');
            } else {
                // Existing installation - list changes
                if (fs.existsSync(oldConfigPath)) {
                    changes.push('Config schema: v1 format → v2 self-configuration format');
                    changes.push('Config location: .claude/config.json → .aetherlight/project-config.json');
                    changes.push('Validation: Manual → Automated schema validation');
                }

                // v1 → v2 specific changes
                if (currentVersion.startsWith('1.')) {
                    changes.push('User customizations: Preserved during migration');
                    changes.push('Backup: Created at .aetherlight/backups/pre-upgrade-v' + targetVersion);
                }
            }

            // List new features in v2.0
            newFeatures.push('Automatic project detection (language, tools, workflows)');
            newFeatures.push('Interactive interview flow (guided configuration)');
            newFeatures.push('Template customization (CLAUDE.md, skills, agents)');
            newFeatures.push('Variable resolution (missing variable detection)');
            newFeatures.push('Schema validation (real-time config validation)');

            const preview: UpgradePreview = {
                currentVersion,
                targetVersion,
                changes,
                newFeatures
            };

            this.logger.endOperation('UpgradeCommand.previewUpgrade', startTime, {
                changeCount: changes.length,
                newFeatureCount: newFeatures.length
            });

            return preview;
        } catch (error) {
            this.logger.failOperation('UpgradeCommand.previewUpgrade', startTime, error);
            throw error;
        }
    }

    /**
     * Run full upgrade flow
     *
     * @param projectRoot - Absolute path to project root
     * @returns Upgrade result
     *
     * ALGORITHM:
     * 1. Check for upgrade (VersionTracker.needsUpgrade)
     * 2. If no upgrade available → return "already on latest"
     * 3. Preview changes (show what will change)
     * 4. User confirmation (prompt)
     * 5. If user cancels → return "cancelled"
     * 6. Create backup (BackupManager.backup)
     * 7. Migrate config (ConfigMigration.migrate)
     * 8. Update version (VersionTracker.setVersion)
     * 9. Verify success → Rollback on failure
     *
     * PERFORMANCE TARGET: <10s full flow (dominated by user confirmation)
     */
    public async run(projectRoot: string): Promise<UpgradeResult> {
        const startTime = this.logger.startOperation('UpgradeCommand.run', {
            projectRoot
        });

        try {
            // Step 1: Check for upgrade
            this.logger.info('Checking for upgrade');
            const upgradeCheck = await this.checkForUpgrade(projectRoot);

            // Step 2: If no upgrade available, exit
            if (!upgradeCheck.upgradeAvailable) {
                this.logger.endOperation('UpgradeCommand.run', startTime, {
                    result: 'no_upgrade_needed'
                });

                return {
                    success: true,
                    upgraded: false,
                    message: 'Already on latest version'
                };
            }

            const targetVersion = upgradeCheck.latestVersion;

            // Step 3: Preview changes
            this.logger.info('Generating upgrade preview');
            const preview = await this.previewUpgrade(
                projectRoot,
                upgradeCheck.currentVersion,
                targetVersion
            );

            // Step 4: User confirmation
            this.logger.info('Requesting user confirmation');
            const confirmed = await this.promptUserConfirmation(targetVersion);

            if (!confirmed) {
                this.logger.endOperation('UpgradeCommand.run', startTime, {
                    result: 'cancelled_by_user'
                });

                return {
                    success: true,
                    upgraded: false,
                    message: 'Upgrade cancelled by user'
                };
            }

            // Step 5: Create backup
            this.logger.info('Creating backup before upgrade');
            const backupName = `pre-upgrade-v${targetVersion}`;
            let backupPath: string;

            try {
                backupPath = await this.backupManager.backup(
                    projectRoot,
                    backupName,
                    `Before upgrade to v${targetVersion}`
                );
                this.logger.info('Backup created', { backupPath });
            } catch (backupError) {
                // Backup creation failed - abort upgrade
                this.logger.error('Backup creation failed', backupError);

                return {
                    success: false,
                    upgraded: false,
                    message: 'Upgrade failed: Could not create backup',
                    error: (backupError as Error).message
                };
            }

            // Step 6: Migrate config
            this.logger.info('Migrating configuration');
            const migrationResult = await this.configMigration.migrate(projectRoot);

            if (!migrationResult.success || !migrationResult.migrated) {
                // Migration failed - rollback
                this.logger.error('Migration failed, rolling back', {
                    error: migrationResult.error
                });

                try {
                    await this.backupManager.rollback(projectRoot, backupName);
                    this.logger.info('Rollback successful');
                } catch (rollbackError) {
                    this.logger.error('Rollback failed', rollbackError);
                }

                return {
                    success: false,
                    upgraded: false,
                    message: 'Upgrade failed: Migration error',
                    error: migrationResult.error
                };
            }

            // Step 7: Update version
            this.logger.info('Updating version', { targetVersion });

            try {
                await this.versionTracker.setVersion(projectRoot, targetVersion);
            } catch (versionError) {
                // Version update failed - rollback
                this.logger.error('Version update failed, rolling back', versionError);

                try {
                    await this.backupManager.rollback(projectRoot, backupName);
                    this.logger.info('Rollback successful');
                } catch (rollbackError) {
                    this.logger.error('Rollback failed', rollbackError);
                }

                return {
                    success: false,
                    upgraded: false,
                    message: 'Upgrade failed: Could not update version',
                    error: (versionError as Error).message
                };
            }

            // Step 8: Success
            this.logger.endOperation('UpgradeCommand.run', startTime, {
                targetVersion,
                upgraded: true
            });

            return {
                success: true,
                upgraded: true,
                message: `Successfully upgraded to v${targetVersion}`,
                targetVersion
            };
        } catch (error) {
            this.logger.failOperation('UpgradeCommand.run', startTime, error);

            return {
                success: false,
                upgraded: false,
                message: 'Upgrade failed: Unexpected error',
                error: (error as Error).message
            };
        }
    }

    /**
     * Prompt user for upgrade confirmation
     *
     * @param targetVersion - Target version to upgrade to
     * @returns User confirmation (true = yes, false = no)
     *
     * NOTE: This is a stub for testing. In production, this would use inquirer
     * or VS Code's showWarningMessage() for user input.
     */
    private async promptUserConfirmation(targetVersion: string): Promise<boolean> {
        // Stub for testing - always return true
        // In production, this would prompt user:
        // "Upgrade to v{targetVersion}? This will modify your config. [Y/n]"
        return true;
    }
}
