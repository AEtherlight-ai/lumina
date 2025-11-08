/**
 * BackupManager Tests
 *
 * PATTERN: Pattern-TDD-001 (90% coverage for infrastructure code)
 * COVERAGE TARGET: 90% (Infrastructure service)
 * TEST STRATEGY: Test backup creation, rollback, cleanup, checksum validation
 */

import * as assert from 'assert';
import * as sinon from 'sinon';
import * as fs from 'fs';
import * as path from 'path';
import { BackupManager, BackupInfo, BackupMetadata } from '../../src/services/BackupManager';

suite('BackupManager Tests', () => {
    let manager: BackupManager;
    let sandbox: sinon.SinonSandbox;
    let tempDir: string;

    setup(() => {
        sandbox = sinon.createSandbox();
        tempDir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'lumina-test-'));
        manager = new BackupManager();
    });

    teardown(() => {
        sandbox.restore();
        // Clean up temp directory
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });

    // ==========================================================================
    // TEST SUITE 1: Backup Creation
    // ==========================================================================

    suite('backup()', () => {
        test('should create backup directory with timestamped name', async () => {
            // Setup: Create .aetherlight directory with files
            const aetherlightDir = path.join(tempDir, '.aetherlight');
            fs.mkdirSync(aetherlightDir, { recursive: true });
            fs.writeFileSync(path.join(aetherlightDir, 'project-config.json'), JSON.stringify({ test: 'data' }));
            fs.writeFileSync(path.join(aetherlightDir, 'version.json'), JSON.stringify({ version: '1.0.0' }));

            // Create backup
            const backupName = 'pre-upgrade-v2.0.0';
            const backupPath = await manager.backup(tempDir, backupName, 'Testing backup');

            // Verify backup directory created
            assert.ok(fs.existsSync(backupPath));
            assert.ok(fs.statSync(backupPath).isDirectory());

            // Verify backup in correct location
            const expectedPath = path.join(tempDir, '.aetherlight', 'backups', backupName);
            assert.strictEqual(backupPath, expectedPath);
        });

        test('should copy project-config.json to backup', async () => {
            // Setup
            const aetherlightDir = path.join(tempDir, '.aetherlight');
            fs.mkdirSync(aetherlightDir, { recursive: true });
            const configData = { project_name: 'test', language: 'typescript' };
            fs.writeFileSync(path.join(aetherlightDir, 'project-config.json'), JSON.stringify(configData, null, 2));

            // Create backup
            const backupPath = await manager.backup(tempDir, 'pre-upgrade-v2.0.0', 'Testing');

            // Verify file copied
            const backupConfigPath = path.join(backupPath, 'project-config.json');
            assert.ok(fs.existsSync(backupConfigPath));

            // Verify content matches
            const backupConfig = JSON.parse(fs.readFileSync(backupConfigPath, 'utf-8'));
            assert.deepStrictEqual(backupConfig, configData);
        });

        test('should copy version.json to backup', async () => {
            // Setup
            const aetherlightDir = path.join(tempDir, '.aetherlight');
            fs.mkdirSync(aetherlightDir, { recursive: true });
            const versionData = { version: '1.0.0', installed_at: '2025-01-01T00:00:00Z' };
            fs.writeFileSync(path.join(aetherlightDir, 'version.json'), JSON.stringify(versionData, null, 2));

            // Create backup
            const backupPath = await manager.backup(tempDir, 'pre-upgrade-v2.0.0', 'Testing');

            // Verify file copied
            const backupVersionPath = path.join(backupPath, 'version.json');
            assert.ok(fs.existsSync(backupVersionPath));

            // Verify content matches
            const backupVersion = JSON.parse(fs.readFileSync(backupVersionPath, 'utf-8'));
            assert.deepStrictEqual(backupVersion, versionData);
        });

        test('should generate checksums.json for validation', async () => {
            // Setup
            const aetherlightDir = path.join(tempDir, '.aetherlight');
            fs.mkdirSync(aetherlightDir, { recursive: true });
            fs.writeFileSync(path.join(aetherlightDir, 'project-config.json'), JSON.stringify({ test: 'data' }));
            fs.writeFileSync(path.join(aetherlightDir, 'version.json'), JSON.stringify({ version: '1.0.0' }));

            // Create backup
            const backupPath = await manager.backup(tempDir, 'pre-upgrade-v2.0.0', 'Testing');

            // Verify checksums.json created
            const checksumsPath = path.join(backupPath, 'checksums.json');
            assert.ok(fs.existsSync(checksumsPath));

            // Verify checksums structure
            const checksums = JSON.parse(fs.readFileSync(checksumsPath, 'utf-8'));
            assert.ok(checksums['project-config.json']);
            assert.ok(checksums['version.json']);
            assert.strictEqual(typeof checksums['project-config.json'], 'string');
        });

        test('should write metadata.json with backup info', async () => {
            // Setup
            const aetherlightDir = path.join(tempDir, '.aetherlight');
            fs.mkdirSync(aetherlightDir, { recursive: true });
            fs.writeFileSync(path.join(aetherlightDir, 'project-config.json'), JSON.stringify({ test: 'data' }));

            // Create backup
            const backupName = 'pre-upgrade-v2.0.0';
            const reason = 'Testing backup';
            const backupPath = await manager.backup(tempDir, backupName, reason);

            // Verify metadata.json created
            const metadataPath = path.join(backupPath, 'metadata.json');
            assert.ok(fs.existsSync(metadataPath));

            // Verify metadata structure
            const metadata: BackupMetadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
            assert.strictEqual(metadata.backupName, backupName);
            assert.strictEqual(metadata.reason, reason);
            assert.ok(metadata.timestamp);
            assert.ok(metadata.files);
            assert.strictEqual(typeof metadata.files, 'object');
        });

        test('should handle missing .aetherlight directory', async () => {
            // Empty project (no .aetherlight directory)
            await assert.rejects(
                async () => await manager.backup(tempDir, 'pre-upgrade-v2.0.0', 'Testing'),
                /\.aetherlight directory not found/
            );
        });

        test('should handle file system errors during backup', async () => {
            // Setup
            const aetherlightDir = path.join(tempDir, '.aetherlight');
            fs.mkdirSync(aetherlightDir, { recursive: true });
            fs.writeFileSync(path.join(aetherlightDir, 'project-config.json'), JSON.stringify({ test: 'data' }));

            // Mock file system error
            const originalMkdir = fs.mkdirSync;
            sandbox.stub(fs, 'mkdirSync').callsFake((path: any, options: any) => {
                if (path.includes('backups')) {
                    throw new Error('Disk full');
                }
                return originalMkdir(path, options);
            });

            await assert.rejects(
                async () => await manager.backup(tempDir, 'pre-upgrade-v2.0.0', 'Testing'),
                /Failed to create backup/
            );
        });
    });

    // ==========================================================================
    // TEST SUITE 2: Rollback Mechanism
    // ==========================================================================

    suite('rollback()', () => {
        test('should restore files from backup', async () => {
            // Setup: Create backup
            const aetherlightDir = path.join(tempDir, '.aetherlight');
            fs.mkdirSync(aetherlightDir, { recursive: true });
            const originalConfig = { project_name: 'original', language: 'typescript' };
            fs.writeFileSync(path.join(aetherlightDir, 'project-config.json'), JSON.stringify(originalConfig, null, 2));

            const backupPath = await manager.backup(tempDir, 'pre-upgrade-v2.0.0', 'Testing');

            // Modify current config (simulate failed upgrade)
            const corruptedConfig = { project_name: 'corrupted' };
            fs.writeFileSync(path.join(aetherlightDir, 'project-config.json'), JSON.stringify(corruptedConfig, null, 2));

            // Rollback
            await manager.rollback(tempDir, 'pre-upgrade-v2.0.0');

            // Verify original config restored
            const restoredConfig = JSON.parse(fs.readFileSync(path.join(aetherlightDir, 'project-config.json'), 'utf-8'));
            assert.deepStrictEqual(restoredConfig, originalConfig);
        });

        test('should verify backup integrity before rollback', async () => {
            // Setup: Create backup
            const aetherlightDir = path.join(tempDir, '.aetherlight');
            fs.mkdirSync(aetherlightDir, { recursive: true });
            fs.writeFileSync(path.join(aetherlightDir, 'project-config.json'), JSON.stringify({ test: 'data' }));

            const backupPath = await manager.backup(tempDir, 'pre-upgrade-v2.0.0', 'Testing');

            // Corrupt backup (modify file without updating checksums)
            const backupConfigPath = path.join(backupPath, 'project-config.json');
            fs.writeFileSync(backupConfigPath, JSON.stringify({ corrupted: 'data' }));

            // Rollback should fail (checksum mismatch)
            await assert.rejects(
                async () => await manager.rollback(tempDir, 'pre-upgrade-v2.0.0'),
                /Backup verification failed/
            );
        });

        test('should handle missing backup directory', async () => {
            // Try to rollback non-existent backup
            await assert.rejects(
                async () => await manager.rollback(tempDir, 'non-existent-backup'),
                /Backup not found/
            );
        });

        test('should restore multiple files during rollback', async () => {
            // Setup: Create backup with multiple files
            const aetherlightDir = path.join(tempDir, '.aetherlight');
            fs.mkdirSync(aetherlightDir, { recursive: true });
            const configData = { project_name: 'test' };
            const versionData = { version: '1.0.0' };
            fs.writeFileSync(path.join(aetherlightDir, 'project-config.json'), JSON.stringify(configData, null, 2));
            fs.writeFileSync(path.join(aetherlightDir, 'version.json'), JSON.stringify(versionData, null, 2));

            const backupPath = await manager.backup(tempDir, 'pre-upgrade-v2.0.0', 'Testing');

            // Corrupt both files
            fs.writeFileSync(path.join(aetherlightDir, 'project-config.json'), 'corrupted');
            fs.writeFileSync(path.join(aetherlightDir, 'version.json'), 'corrupted');

            // Rollback
            await manager.rollback(tempDir, 'pre-upgrade-v2.0.0');

            // Verify both files restored
            const restoredConfig = JSON.parse(fs.readFileSync(path.join(aetherlightDir, 'project-config.json'), 'utf-8'));
            const restoredVersion = JSON.parse(fs.readFileSync(path.join(aetherlightDir, 'version.json'), 'utf-8'));
            assert.deepStrictEqual(restoredConfig, configData);
            assert.deepStrictEqual(restoredVersion, versionData);
        });
    });

    // ==========================================================================
    // TEST SUITE 3: Backup Listing
    // ==========================================================================

    suite('listBackups()', () => {
        test('should list all backups sorted by timestamp (newest first)', async () => {
            // Setup: Create multiple backups
            const aetherlightDir = path.join(tempDir, '.aetherlight');
            fs.mkdirSync(aetherlightDir, { recursive: true });
            fs.writeFileSync(path.join(aetherlightDir, 'project-config.json'), JSON.stringify({ test: 'data' }));

            // Create 3 backups with delays to ensure different timestamps
            await manager.backup(tempDir, 'pre-upgrade-v1.0.0', 'First backup');
            await new Promise(resolve => setTimeout(resolve, 10)); // Small delay
            await manager.backup(tempDir, 'pre-upgrade-v2.0.0', 'Second backup');
            await new Promise(resolve => setTimeout(resolve, 10));
            await manager.backup(tempDir, 'pre-upgrade-v3.0.0', 'Third backup');

            // List backups
            const backups = await manager.listBackups(tempDir);

            // Verify 3 backups returned
            assert.strictEqual(backups.length, 3);

            // Verify sorted by timestamp (newest first)
            assert.strictEqual(backups[0].backupName, 'pre-upgrade-v3.0.0');
            assert.strictEqual(backups[1].backupName, 'pre-upgrade-v2.0.0');
            assert.strictEqual(backups[2].backupName, 'pre-upgrade-v1.0.0');

            // Verify each backup has metadata
            backups.forEach(backup => {
                assert.ok(backup.timestamp);
                assert.ok(backup.backupName);
                assert.ok(backup.backupPath);
            });
        });

        test('should return empty array if no backups exist', async () => {
            // Empty project (no backups)
            const backups = await manager.listBackups(tempDir);

            assert.strictEqual(backups.length, 0);
        });

        test('should handle missing backups directory', async () => {
            // Project with .aetherlight but no backups directory
            const aetherlightDir = path.join(tempDir, '.aetherlight');
            fs.mkdirSync(aetherlightDir, { recursive: true });

            const backups = await manager.listBackups(tempDir);

            assert.strictEqual(backups.length, 0);
        });
    });

    // ==========================================================================
    // TEST SUITE 4: Automatic Cleanup
    // ==========================================================================

    suite('cleanupOldBackups()', () => {
        test('should keep last 5 backups and delete oldest', async () => {
            // Setup: Create 6 backups
            const aetherlightDir = path.join(tempDir, '.aetherlight');
            fs.mkdirSync(aetherlightDir, { recursive: true });
            fs.writeFileSync(path.join(aetherlightDir, 'project-config.json'), JSON.stringify({ test: 'data' }));

            const backupNames = [
                'pre-upgrade-v1.0.0',
                'pre-upgrade-v2.0.0',
                'pre-upgrade-v3.0.0',
                'pre-upgrade-v4.0.0',
                'pre-upgrade-v5.0.0',
                'pre-upgrade-v6.0.0'
            ];

            for (const name of backupNames) {
                await manager.backup(tempDir, name, 'Testing');
                await new Promise(resolve => setTimeout(resolve, 10)); // Small delay
            }

            // Verify 6 backups created
            let backups = await manager.listBackups(tempDir);
            assert.strictEqual(backups.length, 6);

            // Run cleanup (should keep last 5)
            await manager.cleanupOldBackups(tempDir, 5);

            // Verify only 5 backups remain
            backups = await manager.listBackups(tempDir);
            assert.strictEqual(backups.length, 5);

            // Verify oldest backup deleted (v1.0.0)
            const oldestBackupPath = path.join(tempDir, '.aetherlight', 'backups', 'pre-upgrade-v1.0.0');
            assert.ok(!fs.existsSync(oldestBackupPath));

            // Verify newest 5 backups remain
            const remainingNames = backups.map(b => b.backupName);
            assert.ok(remainingNames.includes('pre-upgrade-v2.0.0'));
            assert.ok(remainingNames.includes('pre-upgrade-v6.0.0'));
        });

        test('should not delete if 5 or fewer backups', async () => {
            // Setup: Create 3 backups
            const aetherlightDir = path.join(tempDir, '.aetherlight');
            fs.mkdirSync(aetherlightDir, { recursive: true });
            fs.writeFileSync(path.join(aetherlightDir, 'project-config.json'), JSON.stringify({ test: 'data' }));

            await manager.backup(tempDir, 'pre-upgrade-v1.0.0', 'Testing');
            await manager.backup(tempDir, 'pre-upgrade-v2.0.0', 'Testing');
            await manager.backup(tempDir, 'pre-upgrade-v3.0.0', 'Testing');

            // Run cleanup
            await manager.cleanupOldBackups(tempDir, 5);

            // Verify all 3 backups still exist
            const backups = await manager.listBackups(tempDir);
            assert.strictEqual(backups.length, 3);
        });

        test('should handle file system errors during cleanup', async () => {
            // Setup: Create 6 backups
            const aetherlightDir = path.join(tempDir, '.aetherlight');
            fs.mkdirSync(aetherlightDir, { recursive: true });
            fs.writeFileSync(path.join(aetherlightDir, 'project-config.json'), JSON.stringify({ test: 'data' }));

            for (let i = 1; i <= 6; i++) {
                await manager.backup(tempDir, `pre-upgrade-v${i}.0.0`, 'Testing');
                await new Promise(resolve => setTimeout(resolve, 10));
            }

            // Mock file system error
            sandbox.stub(fs, 'rmSync').throws(new Error('Permission denied'));

            // Cleanup should not throw, but log error
            await assert.doesNotReject(
                async () => await manager.cleanupOldBackups(tempDir, 5)
            );
        });
    });

    // ==========================================================================
    // TEST SUITE 5: Backup Verification
    // ==========================================================================

    suite('verifyBackup()', () => {
        test('should verify backup integrity using checksums', async () => {
            // Setup: Create backup
            const aetherlightDir = path.join(tempDir, '.aetherlight');
            fs.mkdirSync(aetherlightDir, { recursive: true });
            fs.writeFileSync(path.join(aetherlightDir, 'project-config.json'), JSON.stringify({ test: 'data' }));

            const backupPath = await manager.backup(tempDir, 'pre-upgrade-v2.0.0', 'Testing');

            // Verify backup (should pass)
            const result = await manager.verifyBackup(tempDir, 'pre-upgrade-v2.0.0');

            assert.strictEqual(result.valid, true);
            assert.strictEqual(result.errors.length, 0);
        });

        test('should detect corrupted backup files', async () => {
            // Setup: Create backup
            const aetherlightDir = path.join(tempDir, '.aetherlight');
            fs.mkdirSync(aetherlightDir, { recursive: true });
            fs.writeFileSync(path.join(aetherlightDir, 'project-config.json'), JSON.stringify({ test: 'data' }));

            const backupPath = await manager.backup(tempDir, 'pre-upgrade-v2.0.0', 'Testing');

            // Corrupt backup file (modify without updating checksum)
            const backupConfigPath = path.join(backupPath, 'project-config.json');
            fs.writeFileSync(backupConfigPath, JSON.stringify({ corrupted: 'data' }));

            // Verify backup (should fail)
            const result = await manager.verifyBackup(tempDir, 'pre-upgrade-v2.0.0');

            assert.strictEqual(result.valid, false);
            assert.ok(result.errors.length > 0);
            assert.ok(result.errors[0].includes('checksum mismatch'));
        });

        test('should detect missing checksum file', async () => {
            // Setup: Create backup
            const aetherlightDir = path.join(tempDir, '.aetherlight');
            fs.mkdirSync(aetherlightDir, { recursive: true });
            fs.writeFileSync(path.join(aetherlightDir, 'project-config.json'), JSON.stringify({ test: 'data' }));

            const backupPath = await manager.backup(tempDir, 'pre-upgrade-v2.0.0', 'Testing');

            // Delete checksums.json
            const checksumsPath = path.join(backupPath, 'checksums.json');
            fs.unlinkSync(checksumsPath);

            // Verify backup (should fail)
            const result = await manager.verifyBackup(tempDir, 'pre-upgrade-v2.0.0');

            assert.strictEqual(result.valid, false);
            assert.ok(result.errors[0].includes('checksums.json not found'));
        });

        test('should detect missing backup files', async () => {
            // Setup: Create backup
            const aetherlightDir = path.join(tempDir, '.aetherlight');
            fs.mkdirSync(aetherlightDir, { recursive: true });
            fs.writeFileSync(path.join(aetherlightDir, 'project-config.json'), JSON.stringify({ test: 'data' }));

            const backupPath = await manager.backup(tempDir, 'pre-upgrade-v2.0.0', 'Testing');

            // Delete a backup file
            const backupConfigPath = path.join(backupPath, 'project-config.json');
            fs.unlinkSync(backupConfigPath);

            // Verify backup (should fail)
            const result = await manager.verifyBackup(tempDir, 'pre-upgrade-v2.0.0');

            assert.strictEqual(result.valid, false);
            assert.ok(result.errors[0].includes('file missing'));
        });
    });

    // ==========================================================================
    // TEST SUITE 6: Integration with ConfigMigration
    // ==========================================================================

    suite('Integration Tests', () => {
        test('should create backup before migration', async () => {
            // Setup: Create old config
            const aetherlightDir = path.join(tempDir, '.aetherlight');
            fs.mkdirSync(aetherlightDir, { recursive: true });
            const oldConfig = { version: 1, project_name: 'old' };
            fs.writeFileSync(path.join(aetherlightDir, 'project-config.json'), JSON.stringify(oldConfig, null, 2));

            // Create backup
            await manager.backup(tempDir, 'pre-migration-v1', 'Before migration');

            // Verify backup created
            const backups = await manager.listBackups(tempDir);
            assert.strictEqual(backups.length, 1);
            assert.strictEqual(backups[0].backupName, 'pre-migration-v1');

            // Verify old config in backup
            const backupConfigPath = path.join(backups[0].backupPath, 'project-config.json');
            const backupConfig = JSON.parse(fs.readFileSync(backupConfigPath, 'utf-8'));
            assert.deepStrictEqual(backupConfig, oldConfig);
        });

        test('should rollback if migration fails', async () => {
            // Setup: Create config
            const aetherlightDir = path.join(tempDir, '.aetherlight');
            fs.mkdirSync(aetherlightDir, { recursive: true });
            const validConfig = { project_name: 'test', language: 'typescript' };
            fs.writeFileSync(path.join(aetherlightDir, 'project-config.json'), JSON.stringify(validConfig, null, 2));

            // Create backup
            await manager.backup(tempDir, 'pre-migration-v1', 'Before migration');

            // Simulate failed migration (corrupt config)
            const corruptedConfig = { invalid: 'config' };
            fs.writeFileSync(path.join(aetherlightDir, 'project-config.json'), JSON.stringify(corruptedConfig, null, 2));

            // Rollback
            await manager.rollback(tempDir, 'pre-migration-v1');

            // Verify original config restored
            const restoredConfig = JSON.parse(fs.readFileSync(path.join(aetherlightDir, 'project-config.json'), 'utf-8'));
            assert.deepStrictEqual(restoredConfig, validConfig);
        });
    });

    // ==========================================================================
    // TEST SUITE 7: Performance
    // ==========================================================================

    suite('Performance', () => {
        test('should create backup in < 200ms', async () => {
            // Setup
            const aetherlightDir = path.join(tempDir, '.aetherlight');
            fs.mkdirSync(aetherlightDir, { recursive: true });
            fs.writeFileSync(path.join(aetherlightDir, 'project-config.json'), JSON.stringify({ test: 'data' }));
            fs.writeFileSync(path.join(aetherlightDir, 'version.json'), JSON.stringify({ version: '1.0.0' }));

            // Benchmark
            const startTime = Date.now();
            await manager.backup(tempDir, 'pre-upgrade-v2.0.0', 'Performance test');
            const duration = Date.now() - startTime;

            assert.ok(duration < 200, `Backup creation took ${duration}ms (target: < 200ms)`);
        });

        test('should rollback in < 200ms', async () => {
            // Setup: Create backup
            const aetherlightDir = path.join(tempDir, '.aetherlight');
            fs.mkdirSync(aetherlightDir, { recursive: true });
            fs.writeFileSync(path.join(aetherlightDir, 'project-config.json'), JSON.stringify({ test: 'data' }));

            await manager.backup(tempDir, 'pre-upgrade-v2.0.0', 'Testing');

            // Modify config
            fs.writeFileSync(path.join(aetherlightDir, 'project-config.json'), JSON.stringify({ corrupted: 'data' }));

            // Benchmark rollback
            const startTime = Date.now();
            await manager.rollback(tempDir, 'pre-upgrade-v2.0.0');
            const duration = Date.now() - startTime;

            assert.ok(duration < 200, `Rollback took ${duration}ms (target: < 200ms)`);
        });

        test('should verify backup in < 100ms', async () => {
            // Setup: Create backup
            const aetherlightDir = path.join(tempDir, '.aetherlight');
            fs.mkdirSync(aetherlightDir, { recursive: true });
            fs.writeFileSync(path.join(aetherlightDir, 'project-config.json'), JSON.stringify({ test: 'data' }));

            await manager.backup(tempDir, 'pre-upgrade-v2.0.0', 'Testing');

            // Benchmark verification
            const startTime = Date.now();
            await manager.verifyBackup(tempDir, 'pre-upgrade-v2.0.0');
            const duration = Date.now() - startTime;

            assert.ok(duration < 100, `Verification took ${duration}ms (target: < 100ms)`);
        });
    });
});
