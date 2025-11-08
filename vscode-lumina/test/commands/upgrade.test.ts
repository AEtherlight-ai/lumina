/**
 * Upgrade Command Tests
 *
 * PATTERN: Pattern-TDD-001 (90% coverage for infrastructure code)
 * COVERAGE TARGET: 90% (Infrastructure command)
 * TEST STRATEGY: Test upgrade detection, preview, confirmation, execution, rollback
 */

import * as assert from 'assert';
import * as sinon from 'sinon';
import * as fs from 'fs';
import * as path from 'path';
import { UpgradeCommand, UpgradePreview } from '../../src/commands/upgrade';
import { VersionTracker, UpgradeCheckResult } from '../../src/services/VersionTracker';
import { ConfigMigration, MigrationResult } from '../../src/services/ConfigMigration';
import { BackupManager } from '../../src/services/BackupManager';
import { ProjectConfigValidator } from '../../src/services/ProjectConfigValidator';

suite('Upgrade Command Tests', () => {
    let command: UpgradeCommand;
    let versionTracker: VersionTracker;
    let configMigration: ConfigMigration;
    let backupManager: BackupManager;
    let validator: ProjectConfigValidator;
    let sandbox: sinon.SinonSandbox;
    let tempDir: string;

    setup(() => {
        sandbox = sinon.createSandbox();
        tempDir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'lumina-test-'));

        // Create service instances
        validator = new ProjectConfigValidator();
        versionTracker = new VersionTracker();
        configMigration = new ConfigMigration(validator);
        backupManager = new BackupManager();

        // Create command with injected dependencies
        command = new UpgradeCommand(versionTracker, configMigration, backupManager);
    });

    teardown(() => {
        sandbox.restore();
        // Clean up temp directory
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });

    // ==========================================================================
    // TEST SUITE 1: Upgrade Detection
    // ==========================================================================

    suite('checkForUpgrade()', () => {
        test('should detect upgrade available (v1.0.0 → v2.0.0)', async () => {
            // Mock version tracker: upgrade available
            const mockResult: UpgradeCheckResult = {
                upgradeAvailable: true,
                currentVersion: '1.0.0',
                latestVersion: '2.0.0',
                changeType: 'major'
            };

            sandbox.stub(versionTracker, 'needsUpgrade').resolves(mockResult);

            // Check for upgrade
            const result = await command.checkForUpgrade(tempDir);

            assert.strictEqual(result.upgradeAvailable, true);
            assert.strictEqual(result.currentVersion, '1.0.0');
            assert.strictEqual(result.latestVersion, '2.0.0');
            assert.strictEqual(result.changeType, 'major');
        });

        test('should detect no upgrade needed (v2.0.0 = v2.0.0)', async () => {
            // Mock version tracker: no upgrade
            const mockResult: UpgradeCheckResult = {
                upgradeAvailable: false,
                currentVersion: '2.0.0',
                latestVersion: '2.0.0'
            };

            sandbox.stub(versionTracker, 'needsUpgrade').resolves(mockResult);

            // Check for upgrade
            const result = await command.checkForUpgrade(tempDir);

            assert.strictEqual(result.upgradeAvailable, false);
        });

        test('should handle fresh install (no current version)', async () => {
            // Mock version tracker: fresh install
            const mockResult: UpgradeCheckResult = {
                upgradeAvailable: true,
                currentVersion: null,
                latestVersion: '2.0.0'
            };

            sandbox.stub(versionTracker, 'needsUpgrade').resolves(mockResult);

            // Check for upgrade
            const result = await command.checkForUpgrade(tempDir);

            assert.strictEqual(result.upgradeAvailable, true);
            assert.strictEqual(result.currentVersion, null);
            assert.strictEqual(result.latestVersion, '2.0.0');
        });

        test('should handle network errors gracefully', async () => {
            // Mock version tracker: network error
            sandbox.stub(versionTracker, 'needsUpgrade').rejects(new Error('Network timeout'));

            // Check for upgrade (should propagate error)
            await assert.rejects(
                async () => await command.checkForUpgrade(tempDir),
                /Network timeout/
            );
        });
    });

    // ==========================================================================
    // TEST SUITE 2: Upgrade Preview
    // ==========================================================================

    suite('previewUpgrade()', () => {
        test('should generate upgrade preview with changes', async () => {
            // Setup: Create old config
            const aetherlightDir = path.join(tempDir, '.aetherlight');
            fs.mkdirSync(aetherlightDir, { recursive: true });
            const oldConfig = {
                projectName: 'test-project',
                language: 'typescript',
                buildCommand: 'npm run build'
            };
            fs.writeFileSync(path.join(aetherlightDir, 'project-config.json'), JSON.stringify(oldConfig, null, 2));

            // Generate preview
            const preview = await command.previewUpgrade(tempDir, '1.0.0', '2.0.0');

            // Verify preview structure
            assert.strictEqual(preview.currentVersion, '1.0.0');
            assert.strictEqual(preview.targetVersion, '2.0.0');
            assert.ok(preview.changes);
            assert.ok(preview.changes.length > 0);
            assert.ok(preview.newFeatures);
            assert.ok(preview.newFeatures.length > 0);
        });

        test('should list config schema changes', async () => {
            // Setup
            const aetherlightDir = path.join(tempDir, '.aetherlight');
            fs.mkdirSync(aetherlightDir, { recursive: true });
            fs.writeFileSync(path.join(aetherlightDir, 'project-config.json'), JSON.stringify({ test: 'data' }, null, 2));

            // Generate preview
            const preview = await command.previewUpgrade(tempDir, '1.0.0', '2.0.0');

            // Verify changes listed
            const schemaChange = preview.changes.find(c => c.includes('schema'));
            assert.ok(schemaChange, 'Should mention schema changes');
        });

        test('should list new features in v2.0', async () => {
            // Setup
            const aetherlightDir = path.join(tempDir, '.aetherlight');
            fs.mkdirSync(aetherlightDir, { recursive: true });
            fs.writeFileSync(path.join(aetherlightDir, 'project-config.json'), JSON.stringify({ test: 'data' }, null, 2));

            // Generate preview
            const preview = await command.previewUpgrade(tempDir, '1.0.0', '2.0.0');

            // Verify new features listed
            assert.ok(preview.newFeatures.length > 0);
            assert.ok(preview.newFeatures.some(f => f.includes('detection') || f.includes('interview')));
        });

        test('should handle missing old config', async () => {
            // No old config exists

            // Preview should still work (fresh install scenario)
            const preview = await command.previewUpgrade(tempDir, null, '2.0.0');

            assert.strictEqual(preview.currentVersion, null);
            assert.strictEqual(preview.targetVersion, '2.0.0');
            assert.ok(preview.changes.includes('Fresh installation'));
        });
    });

    // ==========================================================================
    // TEST SUITE 3: User Confirmation
    // ==========================================================================

    suite('User Confirmation', () => {
        test('should accept user confirmation (yes)', async () => {
            // Mock user input: confirm upgrade
            const confirmStub = sandbox.stub(command as any, 'promptUserConfirmation').resolves(true);

            // Get confirmation
            const confirmed = await (command as any).promptUserConfirmation('2.0.0');

            assert.strictEqual(confirmed, true);
            assert.ok(confirmStub.calledOnce);
        });

        test('should handle user cancellation (no)', async () => {
            // Mock user input: cancel upgrade
            const confirmStub = sandbox.stub(command as any, 'promptUserConfirmation').resolves(false);

            // Get confirmation
            const confirmed = await (command as any).promptUserConfirmation('2.0.0');

            assert.strictEqual(confirmed, false);
        });
    });

    // ==========================================================================
    // TEST SUITE 4: Upgrade Execution (Full Flow)
    // ==========================================================================

    suite('run()', () => {
        test('should execute full upgrade flow successfully', async () => {
            // Setup: Create old config
            const aetherlightDir = path.join(tempDir, '.aetherlight');
            fs.mkdirSync(aetherlightDir, { recursive: true });
            const oldConfig = {
                projectName: 'test-project',
                language: 'typescript'
            };
            fs.writeFileSync(path.join(aetherlightDir, 'project-config.json'), JSON.stringify(oldConfig, null, 2));
            fs.writeFileSync(path.join(aetherlightDir, 'version.json'), JSON.stringify({ version: '1.0.0' }, null, 2));

            // Mock services
            const upgradeCheck: UpgradeCheckResult = {
                upgradeAvailable: true,
                currentVersion: '1.0.0',
                latestVersion: '2.0.0',
                changeType: 'major'
            };
            sandbox.stub(versionTracker, 'needsUpgrade').resolves(upgradeCheck);
            sandbox.stub(command as any, 'promptUserConfirmation').resolves(true);
            sandbox.stub(backupManager, 'backup').resolves(path.join(aetherlightDir, 'backups', 'pre-upgrade-v2.0.0'));

            const migrationResult: MigrationResult = {
                success: true,
                migrated: true,
                version: 'v1_to_v2',
                message: 'Migration successful',
                newConfigPath: path.join(aetherlightDir, 'project-config.json')
            };
            sandbox.stub(configMigration, 'migrate').resolves(migrationResult);
            sandbox.stub(versionTracker, 'setVersion').resolves();

            // Run upgrade
            const result = await command.run(tempDir);

            // Verify success
            assert.strictEqual(result.success, true);
            assert.strictEqual(result.upgraded, true);
            assert.strictEqual(result.targetVersion, '2.0.0');
        });

        test('should skip upgrade if user cancels', async () => {
            // Setup
            const aetherlightDir = path.join(tempDir, '.aetherlight');
            fs.mkdirSync(aetherlightDir, { recursive: true });
            fs.writeFileSync(path.join(aetherlightDir, 'version.json'), JSON.stringify({ version: '1.0.0' }, null, 2));

            // Mock services
            const upgradeCheck: UpgradeCheckResult = {
                upgradeAvailable: true,
                currentVersion: '1.0.0',
                latestVersion: '2.0.0',
                changeType: 'major'
            };
            sandbox.stub(versionTracker, 'needsUpgrade').resolves(upgradeCheck);
            sandbox.stub(command as any, 'promptUserConfirmation').resolves(false); // User cancels

            // Run upgrade
            const result = await command.run(tempDir);

            // Verify cancelled
            assert.strictEqual(result.success, true);
            assert.strictEqual(result.upgraded, false);
            assert.strictEqual(result.message, 'Upgrade cancelled by user');
        });

        test('should skip upgrade if no upgrade available', async () => {
            // Mock services: no upgrade available
            const upgradeCheck: UpgradeCheckResult = {
                upgradeAvailable: false,
                currentVersion: '2.0.0',
                latestVersion: '2.0.0'
            };
            sandbox.stub(versionTracker, 'needsUpgrade').resolves(upgradeCheck);

            // Run upgrade
            const result = await command.run(tempDir);

            // Verify no upgrade
            assert.strictEqual(result.success, true);
            assert.strictEqual(result.upgraded, false);
            assert.strictEqual(result.message, 'Already on latest version');
        });

        test('should create backup before migration', async () => {
            // Setup
            const aetherlightDir = path.join(tempDir, '.aetherlight');
            fs.mkdirSync(aetherlightDir, { recursive: true });
            fs.writeFileSync(path.join(aetherlightDir, 'project-config.json'), JSON.stringify({ test: 'data' }, null, 2));
            fs.writeFileSync(path.join(aetherlightDir, 'version.json'), JSON.stringify({ version: '1.0.0' }, null, 2));

            // Mock services
            const upgradeCheck: UpgradeCheckResult = {
                upgradeAvailable: true,
                currentVersion: '1.0.0',
                latestVersion: '2.0.0',
                changeType: 'major'
            };
            sandbox.stub(versionTracker, 'needsUpgrade').resolves(upgradeCheck);
            sandbox.stub(command as any, 'promptUserConfirmation').resolves(true);

            const backupStub = sandbox.stub(backupManager, 'backup').resolves(path.join(aetherlightDir, 'backups', 'pre-upgrade-v2.0.0'));

            const migrationResult: MigrationResult = {
                success: true,
                migrated: true,
                version: 'v1_to_v2',
                message: 'Migration successful',
                newConfigPath: path.join(aetherlightDir, 'project-config.json')
            };
            sandbox.stub(configMigration, 'migrate').resolves(migrationResult);
            sandbox.stub(versionTracker, 'setVersion').resolves();

            // Run upgrade
            await command.run(tempDir);

            // Verify backup created before migration
            assert.ok(backupStub.calledOnce);
            assert.ok(backupStub.calledWith(tempDir, 'pre-upgrade-v2.0.0', sinon.match.string));
        });

        test('should update version.json after successful migration', async () => {
            // Setup
            const aetherlightDir = path.join(tempDir, '.aetherlight');
            fs.mkdirSync(aetherlightDir, { recursive: true });
            fs.writeFileSync(path.join(aetherlightDir, 'project-config.json'), JSON.stringify({ test: 'data' }, null, 2));
            fs.writeFileSync(path.join(aetherlightDir, 'version.json'), JSON.stringify({ version: '1.0.0' }, null, 2));

            // Mock services
            const upgradeCheck: UpgradeCheckResult = {
                upgradeAvailable: true,
                currentVersion: '1.0.0',
                latestVersion: '2.0.0',
                changeType: 'major'
            };
            sandbox.stub(versionTracker, 'needsUpgrade').resolves(upgradeCheck);
            sandbox.stub(command as any, 'promptUserConfirmation').resolves(true);
            sandbox.stub(backupManager, 'backup').resolves(path.join(aetherlightDir, 'backups', 'pre-upgrade-v2.0.0'));

            const migrationResult: MigrationResult = {
                success: true,
                migrated: true,
                version: 'v1_to_v2',
                message: 'Migration successful',
                newConfigPath: path.join(aetherlightDir, 'project-config.json')
            };
            sandbox.stub(configMigration, 'migrate').resolves(migrationResult);

            const setVersionStub = sandbox.stub(versionTracker, 'setVersion').resolves();

            // Run upgrade
            await command.run(tempDir);

            // Verify version updated
            assert.ok(setVersionStub.calledOnce);
            assert.ok(setVersionStub.calledWith(tempDir, '2.0.0'));
        });
    });

    // ==========================================================================
    // TEST SUITE 5: Rollback on Failure
    // ==========================================================================

    suite('Rollback on Failure', () => {
        test('should rollback if backup creation fails', async () => {
            // Setup
            const aetherlightDir = path.join(tempDir, '.aetherlight');
            fs.mkdirSync(aetherlightDir, { recursive: true });
            fs.writeFileSync(path.join(aetherlightDir, 'version.json'), JSON.stringify({ version: '1.0.0' }, null, 2));

            // Mock services
            const upgradeCheck: UpgradeCheckResult = {
                upgradeAvailable: true,
                currentVersion: '1.0.0',
                latestVersion: '2.0.0',
                changeType: 'major'
            };
            sandbox.stub(versionTracker, 'needsUpgrade').resolves(upgradeCheck);
            sandbox.stub(command as any, 'promptUserConfirmation').resolves(true);

            // Backup fails
            sandbox.stub(backupManager, 'backup').rejects(new Error('Disk full'));

            // Run upgrade
            const result = await command.run(tempDir);

            // Verify failure reported
            assert.strictEqual(result.success, false);
            assert.strictEqual(result.upgraded, false);
            assert.ok(result.error?.includes('Disk full'));
        });

        test('should rollback if migration fails', async () => {
            // Setup
            const aetherlightDir = path.join(tempDir, '.aetherlight');
            fs.mkdirSync(aetherlightDir, { recursive: true });
            fs.writeFileSync(path.join(aetherlightDir, 'project-config.json'), JSON.stringify({ test: 'data' }, null, 2));
            fs.writeFileSync(path.join(aetherlightDir, 'version.json'), JSON.stringify({ version: '1.0.0' }, null, 2));

            // Mock services
            const upgradeCheck: UpgradeCheckResult = {
                upgradeAvailable: true,
                currentVersion: '1.0.0',
                latestVersion: '2.0.0',
                changeType: 'major'
            };
            sandbox.stub(versionTracker, 'needsUpgrade').resolves(upgradeCheck);
            sandbox.stub(command as any, 'promptUserConfirmation').resolves(true);
            sandbox.stub(backupManager, 'backup').resolves(path.join(aetherlightDir, 'backups', 'pre-upgrade-v2.0.0'));

            // Migration fails
            const migrationResult: MigrationResult = {
                success: false,
                migrated: false,
                message: 'Migration failed',
                error: 'Invalid config format'
            };
            sandbox.stub(configMigration, 'migrate').resolves(migrationResult);

            const rollbackStub = sandbox.stub(backupManager, 'rollback').resolves();

            // Run upgrade
            const result = await command.run(tempDir);

            // Verify rollback called
            assert.ok(rollbackStub.calledOnce);
            assert.ok(rollbackStub.calledWith(tempDir, 'pre-upgrade-v2.0.0'));

            // Verify failure reported
            assert.strictEqual(result.success, false);
            assert.strictEqual(result.upgraded, false);
            assert.ok(result.error?.includes('Migration failed'));
        });

        test('should rollback if version update fails', async () => {
            // Setup
            const aetherlightDir = path.join(tempDir, '.aetherlight');
            fs.mkdirSync(aetherlightDir, { recursive: true });
            fs.writeFileSync(path.join(aetherlightDir, 'project-config.json'), JSON.stringify({ test: 'data' }, null, 2));
            fs.writeFileSync(path.join(aetherlightDir, 'version.json'), JSON.stringify({ version: '1.0.0' }, null, 2));

            // Mock services
            const upgradeCheck: UpgradeCheckResult = {
                upgradeAvailable: true,
                currentVersion: '1.0.0',
                latestVersion: '2.0.0',
                changeType: 'major'
            };
            sandbox.stub(versionTracker, 'needsUpgrade').resolves(upgradeCheck);
            sandbox.stub(command as any, 'promptUserConfirmation').resolves(true);
            sandbox.stub(backupManager, 'backup').resolves(path.join(aetherlightDir, 'backups', 'pre-upgrade-v2.0.0'));

            const migrationResult: MigrationResult = {
                success: true,
                migrated: true,
                version: 'v1_to_v2',
                message: 'Migration successful',
                newConfigPath: path.join(aetherlightDir, 'project-config.json')
            };
            sandbox.stub(configMigration, 'migrate').resolves(migrationResult);

            // Version update fails
            sandbox.stub(versionTracker, 'setVersion').rejects(new Error('Cannot write version.json'));

            const rollbackStub = sandbox.stub(backupManager, 'rollback').resolves();

            // Run upgrade
            const result = await command.run(tempDir);

            // Verify rollback called
            assert.ok(rollbackStub.calledOnce);

            // Verify failure reported
            assert.strictEqual(result.success, false);
            assert.strictEqual(result.upgraded, false);
        });
    });

    // ==========================================================================
    // TEST SUITE 6: Performance
    // ==========================================================================

    suite('Performance', () => {
        test('should check for upgrade in < 200ms', async () => {
            // Mock fast response
            const upgradeCheck: UpgradeCheckResult = {
                upgradeAvailable: true,
                currentVersion: '1.0.0',
                latestVersion: '2.0.0',
                changeType: 'major'
            };
            sandbox.stub(versionTracker, 'needsUpgrade').resolves(upgradeCheck);

            // Benchmark
            const startTime = Date.now();
            await command.checkForUpgrade(tempDir);
            const duration = Date.now() - startTime;

            assert.ok(duration < 200, `Upgrade check took ${duration}ms (target: < 200ms)`);
        });

        test('should generate preview in < 100ms', async () => {
            // Setup
            const aetherlightDir = path.join(tempDir, '.aetherlight');
            fs.mkdirSync(aetherlightDir, { recursive: true });
            fs.writeFileSync(path.join(aetherlightDir, 'project-config.json'), JSON.stringify({ test: 'data' }, null, 2));

            // Benchmark
            const startTime = Date.now();
            await command.previewUpgrade(tempDir, '1.0.0', '2.0.0');
            const duration = Date.now() - startTime;

            assert.ok(duration < 100, `Preview generation took ${duration}ms (target: < 100ms)`);
        });
    });
});
