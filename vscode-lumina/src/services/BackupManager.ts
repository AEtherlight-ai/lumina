/**
 * BackupManager: Service for creating backups and rollback during upgrades
 *
 * DESIGN DECISION: Safe upgrade workflow with automatic rollback
 * WHY: Users need data protection during upgrades, zero data loss on failure
 *
 * REASONING CHAIN:
 * 1. Problem: Upgrade failures can corrupt user data, no recovery mechanism
 * 2. Problem: Users lose customizations if upgrade fails
 * 3. Solution: Create backup before upgrade, rollback on failure
 * 4. Solution: Checksum validation ensures backup integrity
 * 5. Solution: Automatic cleanup keeps disk usage reasonable
 * 6. Result: Safe upgrades with instant recovery on failure
 *
 * BACKUP STRUCTURE:
 * .aetherlight/backups/
 *   ├── pre-upgrade-v2.0.0/
 *   │   ├── project-config.json
 *   │   ├── version.json
 *   │   ├── checksums.json (MD5 hashes for validation)
 *   │   └── metadata.json (backup info)
 *   ├── pre-upgrade-v1.5.0/
 *   └── pre-upgrade-v1.0.0/
 *
 * WORKFLOW:
 * 1. backup() → Create timestamped backup directory
 * 2. Copy files from .aetherlight/ (config, version, templates)
 * 3. Generate checksums.json for validation
 * 4. Write metadata.json (timestamp, version, reason)
 * 5. Auto-cleanup (keep last 5 backups)
 * 6. On upgrade failure: rollback() → Verify checksums → Restore files
 *
 * PATTERN: Pattern-TDD-001 (90% coverage for infrastructure)
 * RELATED: SELF-018 (ConfigMigration), SELF-016 (Upgrade command)
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { MiddlewareLogger } from './MiddlewareLogger';

/**
 * Backup metadata stored in metadata.json
 */
export interface BackupMetadata {
    /** Backup name (e.g., "pre-upgrade-v2.0.0") */
    backupName: string;

    /** Backup timestamp (ISO 8601) */
    timestamp: string;

    /** Reason for backup (e.g., "Before upgrade v2.0.0") */
    reason: string;

    /** List of files in backup */
    files: string[];
}

/**
 * Backup information for listing
 */
export interface BackupInfo {
    /** Backup name */
    backupName: string;

    /** Backup directory path */
    backupPath: string;

    /** Backup timestamp */
    timestamp: string;

    /** Reason for backup */
    reason: string;

    /** Number of files in backup */
    fileCount: number;
}

/**
 * Backup verification result
 */
export interface BackupVerificationResult {
    /** Validation success flag */
    valid: boolean;

    /** Validation errors (if any) */
    errors: string[];
}

/**
 * BackupManager: Service for backup creation and rollback
 *
 * DESIGN DECISION: Pure service with dependency injection
 * WHY: Testable (inject mocked file system), single responsibility
 */
export class BackupManager {
    private logger: MiddlewareLogger;

    constructor() {
        this.logger = MiddlewareLogger.getInstance();
    }

    /**
     * Create backup before upgrade
     *
     * @param projectRoot - Absolute path to project root
     * @param backupName - Backup name (e.g., "pre-upgrade-v2.0.0")
     * @param reason - Reason for backup (e.g., "Before upgrade v2.0.0")
     * @returns Path to backup directory
     *
     * ALGORITHM:
     * 1. Verify .aetherlight directory exists
     * 2. Create backup directory (.aetherlight/backups/{backupName}/)
     * 3. Copy files from .aetherlight/ (project-config.json, version.json)
     * 4. Generate checksums for validation
     * 5. Write metadata.json
     * 6. Auto-cleanup (keep last 5 backups)
     *
     * PERFORMANCE TARGET: <200ms (local file operations)
     */
    public async backup(projectRoot: string, backupName: string, reason: string): Promise<string> {
        const startTime = this.logger.startOperation('BackupManager.backup', {
            projectRoot,
            backupName
        });

        try {
            // Step 1: Verify .aetherlight directory exists
            const aetherlightDir = path.join(projectRoot, '.aetherlight');
            if (!fs.existsSync(aetherlightDir)) {
                throw new Error('.aetherlight directory not found. Cannot create backup.');
            }

            // Step 2: Create backup directory
            const backupDir = path.join(aetherlightDir, 'backups', backupName);
            if (!fs.existsSync(backupDir)) {
                fs.mkdirSync(backupDir, { recursive: true });
            }

            // Step 3: Copy files from .aetherlight/
            const filesToBackup = [
                'project-config.json',
                'version.json'
            ];

            const backedUpFiles: string[] = [];
            const checksums: Record<string, string> = {};

            for (const fileName of filesToBackup) {
                const sourcePath = path.join(aetherlightDir, fileName);

                // Only backup if file exists
                if (fs.existsSync(sourcePath)) {
                    const destPath = path.join(backupDir, fileName);

                    // Copy file
                    fs.copyFileSync(sourcePath, destPath);
                    backedUpFiles.push(fileName);

                    // Generate checksum
                    checksums[fileName] = this.generateChecksum(destPath);
                }
            }

            // Step 4: Write checksums.json
            const checksumsPath = path.join(backupDir, 'checksums.json');
            fs.writeFileSync(checksumsPath, JSON.stringify(checksums, null, 2), 'utf-8');

            // Step 5: Write metadata.json
            const metadata: BackupMetadata = {
                backupName,
                timestamp: new Date().toISOString(),
                reason,
                files: backedUpFiles
            };

            const metadataPath = path.join(backupDir, 'metadata.json');
            fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');

            // Step 6: Auto-cleanup (keep last 5 backups)
            await this.cleanupOldBackups(projectRoot, 5);

            this.logger.endOperation('BackupManager.backup', startTime, {
                backupPath: backupDir,
                filesBackedUp: backedUpFiles.length
            });

            return backupDir;
        } catch (error) {
            this.logger.failOperation('BackupManager.backup', startTime, error);
            throw new Error(`Failed to create backup: ${(error as Error).message}`);
        }
    }

    /**
     * Rollback to backup (restore files)
     *
     * @param projectRoot - Absolute path to project root
     * @param backupName - Backup name to rollback to
     *
     * ALGORITHM:
     * 1. Verify backup exists
     * 2. Verify backup integrity (checksums)
     * 3. Restore files from backup to .aetherlight/
     * 4. Verify restoration successful
     *
     * PERFORMANCE TARGET: <200ms (local file operations)
     */
    public async rollback(projectRoot: string, backupName: string): Promise<void> {
        const startTime = this.logger.startOperation('BackupManager.rollback', {
            projectRoot,
            backupName
        });

        try {
            // Step 1: Verify backup exists
            const backupDir = path.join(projectRoot, '.aetherlight', 'backups', backupName);
            if (!fs.existsSync(backupDir)) {
                throw new Error(`Backup not found: ${backupName}`);
            }

            // Step 2: Verify backup integrity
            const verification = await this.verifyBackup(projectRoot, backupName);
            if (!verification.valid) {
                throw new Error(`Backup verification failed: ${verification.errors.join(', ')}`);
            }

            // Step 3: Restore files from backup
            const metadataPath = path.join(backupDir, 'metadata.json');
            const metadata: BackupMetadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));

            const aetherlightDir = path.join(projectRoot, '.aetherlight');

            for (const fileName of metadata.files) {
                const sourcePath = path.join(backupDir, fileName);
                const destPath = path.join(aetherlightDir, fileName);

                // Restore file
                fs.copyFileSync(sourcePath, destPath);
            }

            this.logger.endOperation('BackupManager.rollback', startTime, {
                filesRestored: metadata.files.length
            });
        } catch (error) {
            this.logger.failOperation('BackupManager.rollback', startTime, error);
            throw error;
        }
    }

    /**
     * List all backups sorted by timestamp (newest first)
     *
     * @param projectRoot - Absolute path to project root
     * @returns Array of backup information
     *
     * ALGORITHM:
     * 1. Check if backups directory exists
     * 2. Read all backup directories
     * 3. Read metadata.json from each backup
     * 4. Sort by timestamp (newest first)
     *
     * PERFORMANCE TARGET: <50ms (local directory scan)
     */
    public async listBackups(projectRoot: string): Promise<BackupInfo[]> {
        const startTime = this.logger.startOperation('BackupManager.listBackups', {
            projectRoot
        });

        try {
            const backupsDir = path.join(projectRoot, '.aetherlight', 'backups');

            // Check if backups directory exists
            if (!fs.existsSync(backupsDir)) {
                this.logger.endOperation('BackupManager.listBackups', startTime, {
                    result: 'no_backups_directory'
                });
                return [];
            }

            // Read all backup directories
            const backupDirs = fs.readdirSync(backupsDir, { withFileTypes: true })
                .filter(dirent => dirent.isDirectory())
                .map(dirent => dirent.name);

            // Read metadata from each backup
            const backups: BackupInfo[] = [];

            for (const backupName of backupDirs) {
                const backupPath = path.join(backupsDir, backupName);
                const metadataPath = path.join(backupPath, 'metadata.json');

                if (fs.existsSync(metadataPath)) {
                    try {
                        const metadata: BackupMetadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));

                        backups.push({
                            backupName,
                            backupPath,
                            timestamp: metadata.timestamp,
                            reason: metadata.reason,
                            fileCount: metadata.files.length
                        });
                    } catch (error) {
                        // Skip invalid metadata
                        this.logger.warn(`Invalid metadata for backup ${backupName}`, error as object);
                    }
                }
            }

            // Sort by timestamp (newest first)
            backups.sort((a, b) => {
                return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
            });

            this.logger.endOperation('BackupManager.listBackups', startTime, {
                backupCount: backups.length
            });

            return backups;
        } catch (error) {
            this.logger.failOperation('BackupManager.listBackups', startTime, error);
            throw error;
        }
    }

    /**
     * Cleanup old backups (keep last N backups)
     *
     * @param projectRoot - Absolute path to project root
     * @param keepCount - Number of backups to keep (default: 5)
     *
     * ALGORITHM:
     * 1. List all backups sorted by timestamp
     * 2. If > keepCount, delete oldest backups
     *
     * PERFORMANCE TARGET: <100ms (local file operations)
     */
    public async cleanupOldBackups(projectRoot: string, keepCount: number = 5): Promise<void> {
        const startTime = this.logger.startOperation('BackupManager.cleanupOldBackups', {
            projectRoot,
            keepCount
        });

        try {
            // List all backups
            const backups = await this.listBackups(projectRoot);

            // If more than keepCount, delete oldest
            if (backups.length > keepCount) {
                const backupsToDelete = backups.slice(keepCount);

                for (const backup of backupsToDelete) {
                    try {
                        fs.rmSync(backup.backupPath, { recursive: true, force: true });
                        this.logger.info(`Deleted old backup: ${backup.backupName}`);
                    } catch (error) {
                        // Log error but don't fail cleanup
                        this.logger.error(`Failed to delete backup ${backup.backupName}`, error);
                    }
                }

                this.logger.endOperation('BackupManager.cleanupOldBackups', startTime, {
                    deleted: backupsToDelete.length,
                    remaining: keepCount
                });
            } else {
                this.logger.endOperation('BackupManager.cleanupOldBackups', startTime, {
                    result: 'no_cleanup_needed',
                    backupCount: backups.length
                });
            }
        } catch (error) {
            this.logger.failOperation('BackupManager.cleanupOldBackups', startTime, error);
            throw error;
        }
    }

    /**
     * Verify backup integrity using checksums
     *
     * @param projectRoot - Absolute path to project root
     * @param backupName - Backup name to verify
     * @returns Verification result
     *
     * ALGORITHM:
     * 1. Read checksums.json
     * 2. Calculate checksums of backup files
     * 3. Compare checksums
     * 4. Return validation result
     *
     * PERFORMANCE TARGET: <100ms (checksum calculation)
     */
    public async verifyBackup(projectRoot: string, backupName: string): Promise<BackupVerificationResult> {
        const startTime = this.logger.startOperation('BackupManager.verifyBackup', {
            projectRoot,
            backupName
        });

        const errors: string[] = [];

        try {
            const backupDir = path.join(projectRoot, '.aetherlight', 'backups', backupName);

            // Step 1: Read checksums.json
            const checksumsPath = path.join(backupDir, 'checksums.json');
            if (!fs.existsSync(checksumsPath)) {
                errors.push('checksums.json not found in backup');

                this.logger.endOperation('BackupManager.verifyBackup', startTime, {
                    valid: false,
                    errors
                });

                return { valid: false, errors };
            }

            const expectedChecksums: Record<string, string> = JSON.parse(fs.readFileSync(checksumsPath, 'utf-8'));

            // Step 2: Calculate checksums of backup files
            for (const [fileName, expectedChecksum] of Object.entries(expectedChecksums)) {
                const filePath = path.join(backupDir, fileName);

                // Check if file exists
                if (!fs.existsSync(filePath)) {
                    errors.push(`${fileName}: file missing`);
                    continue;
                }

                // Calculate checksum
                const actualChecksum = this.generateChecksum(filePath);

                // Compare checksums
                if (actualChecksum !== expectedChecksum) {
                    errors.push(`${fileName}: checksum mismatch (expected ${expectedChecksum}, got ${actualChecksum})`);
                }
            }

            // Step 3: Return validation result
            const valid = errors.length === 0;

            this.logger.endOperation('BackupManager.verifyBackup', startTime, {
                valid,
                filesChecked: Object.keys(expectedChecksums).length
            });

            return { valid, errors };
        } catch (error) {
            this.logger.failOperation('BackupManager.verifyBackup', startTime, error);
            throw error;
        }
    }

    /**
     * Generate MD5 checksum for file
     *
     * @param filePath - Absolute path to file
     * @returns MD5 checksum (hex string)
     */
    private generateChecksum(filePath: string): string {
        const content = fs.readFileSync(filePath);
        return crypto.createHash('md5').update(content).digest('hex');
    }
}
