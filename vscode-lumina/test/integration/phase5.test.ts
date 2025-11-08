/**
 * Phase 5 Migration Integration Tests
 *
 * PATTERN: Pattern-TDD-001 (Integration Testing)
 * COVERAGE TARGET: ≥85% (integration code)
 * TASK: SELF-020 (Phase 5 integration tests)
 *
 * SERVICES TESTED: Full Phase 5 Migration Pipeline
 * - VersionTracker (SELF-017) - Version detection, comparison
 * - ConfigMigration (SELF-018) - Config format migration
 * - BackupManager (SELF-019) - Backup/rollback safety
 * - UpgradeCommand (SELF-016) - Orchestration
 *
 * TEST STRATEGY:
 * - Real file system operations (temp directories)
 * - Full upgrade workflow (all 4 services integrated)
 * - Success and failure scenarios
 * - User confirmation handling
 * - Performance validation (<10s for full upgrade)
 */

import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import * as sinon from 'sinon';
import { VersionTracker } from '../../src/services/VersionTracker';
import { ConfigMigration } from '../../src/services/ConfigMigration';
import { BackupManager } from '../../src/services/BackupManager';
import { ProjectConfigValidator } from '../../src/services/ProjectConfigValidator';
import { UpgradeCommand } from '../../src/commands/upgrade';
import { DEFAULT_CONFIG } from '../../src/services/ProjectConfig';

describe('Phase 5 Migration Integration Tests', () => {
    let versionTracker: VersionTracker;
    let configMigration: ConfigMigration;
    let backupManager: BackupManager;
    let validator: ProjectConfigValidator;
    let upgradeCommand: UpgradeCommand;
    let tempDir: string;
    let sandbox: sinon.SinonSandbox;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'phase5-integration-'));

        // Create service instances
        validator = new ProjectConfigValidator();
        versionTracker = new VersionTracker();
        configMigration = new ConfigMigration(validator);
        backupManager = new BackupManager();
        upgradeCommand = new UpgradeCommand(versionTracker, configMigration, backupManager);
    });

    afterEach(() => {
        sandbox.restore();
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });

    // ==========================================================================
    // TEST SUITE 1: Successful Upgrade Flow (v1 → v2)
    // ==========================================================================

    describe('Successful Upgrade Flow (v1 → v2)', () => {
        it('should complete full upgrade workflow: backup → migrate → update version', async () => {
            // Setup: Create v1 project structure
            const aetherlightDir = path.join(tempDir, '.aetherlight');
            fs.mkdirSync(aetherlightDir, { recursive: true });

            // Old v1 config format (.claude/config.json style)
            const v1Config = {
                projectName: 'test-project',
                language: 'typescript',
                buildCommand: 'npm run build',
                testCommand: 'npm test',
                packageManager: 'npm'
            };

            // Write old config to .aetherlight (simulating v1)
            fs.writeFileSync(
                path.join(aetherlightDir, 'project-config.json'),
                JSON.stringify(v1Config, null, 2)
            );

            // Write version.json (v1.0.0)
            fs.writeFileSync(
                path.join(aetherlightDir, 'version.json'),
                JSON.stringify({ version: '1.0.0', installed_at: '2025-01-01T00:00:00Z' }, null, 2)
            );

            // Mock npm registry (latest version = 2.0.0)
            sandbox.stub(versionTracker, 'getLatestVersion').resolves({
                version: '2.0.0',
                published_at: '2025-02-01T12:00:00Z'
            });

            // Mock user confirmation (auto-confirm)
            sandbox.stub(upgradeCommand as any, 'promptUserConfirmation').resolves(true);

            // Run upgrade
            const result = await upgradeCommand.run(tempDir);

            // Verify upgrade succeeded
            assert.strictEqual(result.success, true);
            assert.strictEqual(result.upgraded, true);
            assert.strictEqual(result.targetVersion, '2.0.0');

            // Verify backup created
            const backupDir = path.join(aetherlightDir, 'backups', 'pre-upgrade-v2.0.0');
            assert.ok(fs.existsSync(backupDir), 'Backup directory should exist');
            assert.ok(fs.existsSync(path.join(backupDir, 'project-config.json')), 'Backup should contain project-config.json');
            assert.ok(fs.existsSync(path.join(backupDir, 'version.json')), 'Backup should contain version.json');
            assert.ok(fs.existsSync(path.join(backupDir, 'checksums.json')), 'Backup should contain checksums.json');
            assert.ok(fs.existsSync(path.join(backupDir, 'metadata.json')), 'Backup should contain metadata.json');

            // Verify config migrated to v2 format
            const newConfigPath = path.join(aetherlightDir, 'project-config.json');
            assert.ok(fs.existsSync(newConfigPath), 'New config should exist');

            const newConfig = JSON.parse(fs.readFileSync(newConfigPath, 'utf-8'));
            assert.strictEqual(newConfig.schema_version, '2.0', 'Should have v2 schema');
            assert.strictEqual(newConfig.project_name, 'test-project', 'Project name preserved');
            assert.strictEqual(newConfig.language.language, 'typescript', 'Language preserved');
            assert.strictEqual(newConfig.language.build_command, 'npm run build', 'Build command preserved');

            // Verify version updated
            const versionPath = path.join(aetherlightDir, 'version.json');
            const versionData = JSON.parse(fs.readFileSync(versionPath, 'utf-8'));
            assert.strictEqual(versionData.version, '2.0.0', 'Version should be updated to 2.0.0');
        });

        it('should preserve user customizations during migration', async () => {
            // Setup: v1 config with custom values
            const aetherlightDir = path.join(tempDir, '.aetherlight');
            fs.mkdirSync(aetherlightDir, { recursive: true });

            const v1Config = {
                projectName: 'my-custom-project',
                language: 'typescript',
                buildCommand: 'npm run build:prod', // Custom build command
                testCommand: 'npm run test:unit', // Custom test command
                packageManager: 'npm',
                paths: {
                    source: 'custom-src', // Custom source directory
                    test: 'custom-test', // Custom test directory
                    output: 'custom-dist' // Custom output directory
                }
            };

            fs.writeFileSync(
                path.join(aetherlightDir, 'project-config.json'),
                JSON.stringify(v1Config, null, 2)
            );
            fs.writeFileSync(
                path.join(aetherlightDir, 'version.json'),
                JSON.stringify({ version: '1.0.0' }, null, 2)
            );

            // Mock services
            sandbox.stub(versionTracker, 'getLatestVersion').resolves({ version: '2.0.0', published_at: '2025-02-01T12:00:00Z' });
            sandbox.stub(upgradeCommand as any, 'promptUserConfirmation').resolves(true);

            // Run upgrade
            await upgradeCommand.run(tempDir);

            // Verify customizations preserved
            const newConfig = JSON.parse(fs.readFileSync(path.join(aetherlightDir, 'project-config.json'), 'utf-8'));
            assert.strictEqual(newConfig.project_name, 'my-custom-project', 'Custom project name preserved');
            assert.strictEqual(newConfig.language.build_command, 'npm run build:prod', 'Custom build command preserved');
            assert.strictEqual(newConfig.language.test_command, 'npm run test:unit', 'Custom test command preserved');
            assert.strictEqual(newConfig.structure.source_directory, 'custom-src', 'Custom source directory preserved');
            assert.strictEqual(newConfig.structure.test_directory, 'custom-test', 'Custom test directory preserved');
            assert.strictEqual(newConfig.structure.output_directory, 'custom-dist', 'Custom output directory preserved');
        });

        it('should create migration log documenting changes', async () => {
            // Setup
            const aetherlightDir = path.join(tempDir, '.aetherlight');
            fs.mkdirSync(aetherlightDir, { recursive: true });
            fs.writeFileSync(
                path.join(aetherlightDir, 'project-config.json'),
                JSON.stringify({ projectName: 'test' }, null, 2)
            );
            fs.writeFileSync(path.join(aetherlightDir, 'version.json'), JSON.stringify({ version: '1.0.0' }, null, 2));

            // Mock services
            sandbox.stub(versionTracker, 'getLatestVersion').resolves({ version: '2.0.0', published_at: '2025-02-01T12:00:00Z' });
            sandbox.stub(upgradeCommand as any, 'promptUserConfirmation').resolves(true);

            // Run upgrade
            await upgradeCommand.run(tempDir);

            // Verify migration log created
            const migrationLogPath = path.join(aetherlightDir, 'migration.log');
            assert.ok(fs.existsSync(migrationLogPath), 'Migration log should exist');

            const logContent = fs.readFileSync(migrationLogPath, 'utf-8');
            assert.ok(logContent.includes('Migration Log'), 'Log should have header');
            assert.ok(logContent.includes('v1_to_v2') || logContent.includes('v0_to_v2'), 'Log should document migration path');
            assert.ok(logContent.includes('Old Config Content'), 'Log should include old config');
            assert.ok(logContent.includes('New Config Content'), 'Log should include new config');
        });
    });

    // ==========================================================================
    // TEST SUITE 2: Rollback on Migration Failure
    // ==========================================================================

    describe('Rollback on Migration Failure', () => {
        it('should rollback to backup if migration fails', async () => {
            // Setup: Create v1 config
            const aetherlightDir = path.join(tempDir, '.aetherlight');
            fs.mkdirSync(aetherlightDir, { recursive: true });

            const originalConfig = {
                projectName: 'original-project',
                language: 'typescript',
                buildCommand: 'npm run build'
            };

            fs.writeFileSync(
                path.join(aetherlightDir, 'project-config.json'),
                JSON.stringify(originalConfig, null, 2)
            );
            fs.writeFileSync(path.join(aetherlightDir, 'version.json'), JSON.stringify({ version: '1.0.0' }, null, 2));

            // Mock services
            sandbox.stub(versionTracker, 'getLatestVersion').resolves({ version: '2.0.0', published_at: '2025-02-01T12:00:00Z' });
            sandbox.stub(upgradeCommand as any, 'promptUserConfirmation').resolves(true);

            // Mock migration failure
            sandbox.stub(configMigration, 'migrate').resolves({
                success: false,
                migrated: false,
                message: 'Migration failed',
                error: 'Invalid config format'
            });

            // Run upgrade (should fail and rollback)
            const result = await upgradeCommand.run(tempDir);

            // Verify upgrade failed
            assert.strictEqual(result.success, false);
            assert.strictEqual(result.upgraded, false);
            assert.ok(result.error?.includes('Migration failed') || result.error?.includes('Migration error'));

            // Verify original config restored
            const currentConfig = JSON.parse(fs.readFileSync(path.join(aetherlightDir, 'project-config.json'), 'utf-8'));
            assert.strictEqual(currentConfig.projectName, 'original-project', 'Original config should be restored');
            assert.strictEqual(currentConfig.buildCommand, 'npm run build', 'Original build command restored');

            // Verify version unchanged
            const versionData = JSON.parse(fs.readFileSync(path.join(aetherlightDir, 'version.json'), 'utf-8'));
            assert.strictEqual(versionData.version, '1.0.0', 'Version should remain 1.0.0 after rollback');
        });

        it('should rollback if version update fails', async () => {
            // Setup
            const aetherlightDir = path.join(tempDir, '.aetherlight');
            fs.mkdirSync(aetherlightDir, { recursive: true });

            const originalConfig = { projectName: 'test', language: 'typescript' };
            fs.writeFileSync(path.join(aetherlightDir, 'project-config.json'), JSON.stringify(originalConfig, null, 2));
            fs.writeFileSync(path.join(aetherlightDir, 'version.json'), JSON.stringify({ version: '1.0.0' }, null, 2));

            // Mock services
            sandbox.stub(versionTracker, 'getLatestVersion').resolves({ version: '2.0.0', published_at: '2025-02-01T12:00:00Z' });
            sandbox.stub(upgradeCommand as any, 'promptUserConfirmation').resolves(true);

            // Migration succeeds but version update fails
            const setVersionStub = sandbox.stub(versionTracker, 'setVersion').rejects(new Error('Cannot write version.json'));

            // Run upgrade (should fail and rollback)
            const result = await upgradeCommand.run(tempDir);

            // Verify upgrade failed
            assert.strictEqual(result.success, false);
            assert.strictEqual(result.upgraded, false);

            // Verify rollback was attempted
            const versionData = JSON.parse(fs.readFileSync(path.join(aetherlightDir, 'version.json'), 'utf-8'));
            assert.strictEqual(versionData.version, '1.0.0', 'Version should remain 1.0.0 after rollback');
        });

        it('should maintain backup integrity after rollback', async () => {
            // Setup
            const aetherlightDir = path.join(tempDir, '.aetherlight');
            fs.mkdirSync(aetherlightDir, { recursive: true });
            fs.writeFileSync(path.join(aetherlightDir, 'project-config.json'), JSON.stringify({ test: 'data' }, null, 2));
            fs.writeFileSync(path.join(aetherlightDir, 'version.json'), JSON.stringify({ version: '1.0.0' }, null, 2));

            // Mock services
            sandbox.stub(versionTracker, 'getLatestVersion').resolves({ version: '2.0.0', published_at: '2025-02-01T12:00:00Z' });
            sandbox.stub(upgradeCommand as any, 'promptUserConfirmation').resolves(true);
            sandbox.stub(configMigration, 'migrate').resolves({ success: false, migrated: false, message: 'Failed', error: 'Error' });

            // Run upgrade (will fail and rollback)
            await upgradeCommand.run(tempDir);

            // Verify backup still exists and is valid
            const backups = await backupManager.listBackups(tempDir);
            assert.strictEqual(backups.length, 1, 'Backup should still exist after rollback');

            const verification = await backupManager.verifyBackup(tempDir, 'pre-upgrade-v2.0.0');
            assert.strictEqual(verification.valid, true, 'Backup should remain valid after rollback');
        });
    });

    // ==========================================================================
    // TEST SUITE 3: User Cancels Upgrade
    // ==========================================================================

    describe('User Cancels Upgrade', () => {
        it('should exit gracefully when user cancels at confirmation', async () => {
            // Setup
            const aetherlightDir = path.join(tempDir, '.aetherlight');
            fs.mkdirSync(aetherlightDir, { recursive: true });

            const originalConfig = { projectName: 'test', language: 'typescript' };
            fs.writeFileSync(path.join(aetherlightDir, 'project-config.json'), JSON.stringify(originalConfig, null, 2));
            fs.writeFileSync(path.join(aetherlightDir, 'version.json'), JSON.stringify({ version: '1.0.0' }, null, 2));

            // Mock services
            sandbox.stub(versionTracker, 'getLatestVersion').resolves({ version: '2.0.0', published_at: '2025-02-01T12:00:00Z' });
            sandbox.stub(upgradeCommand as any, 'promptUserConfirmation').resolves(false); // User cancels

            // Run upgrade
            const result = await upgradeCommand.run(tempDir);

            // Verify cancellation
            assert.strictEqual(result.success, true, 'Should succeed (graceful exit)');
            assert.strictEqual(result.upgraded, false, 'Should not upgrade');
            assert.strictEqual(result.message, 'Upgrade cancelled by user');

            // Verify no changes made
            const currentConfig = JSON.parse(fs.readFileSync(path.join(aetherlightDir, 'project-config.json'), 'utf-8'));
            assert.deepStrictEqual(currentConfig, originalConfig, 'Config should be unchanged');

            const versionData = JSON.parse(fs.readFileSync(path.join(aetherlightDir, 'version.json'), 'utf-8'));
            assert.strictEqual(versionData.version, '1.0.0', 'Version should be unchanged');

            // Verify no backup created
            const backupDir = path.join(aetherlightDir, 'backups');
            const backupExists = fs.existsSync(backupDir);
            if (backupExists) {
                const backups = fs.readdirSync(backupDir);
                assert.strictEqual(backups.length, 0, 'No backups should be created when user cancels');
            }
        });

        it('should not call backup or migration when user cancels', async () => {
            // Setup
            const aetherlightDir = path.join(tempDir, '.aetherlight');
            fs.mkdirSync(aetherlightDir, { recursive: true });
            fs.writeFileSync(path.join(aetherlightDir, 'version.json'), JSON.stringify({ version: '1.0.0' }, null, 2));

            // Mock services
            sandbox.stub(versionTracker, 'getLatestVersion').resolves({ version: '2.0.0', published_at: '2025-02-01T12:00:00Z' });
            sandbox.stub(upgradeCommand as any, 'promptUserConfirmation').resolves(false); // User cancels

            // Spy on services that should not be called
            const backupSpy = sandbox.spy(backupManager, 'backup');
            const migrationSpy = sandbox.spy(configMigration, 'migrate');
            const setVersionSpy = sandbox.spy(versionTracker, 'setVersion');

            // Run upgrade
            await upgradeCommand.run(tempDir);

            // Verify services not called
            assert.ok(!backupSpy.called, 'Backup should not be called when user cancels');
            assert.ok(!migrationSpy.called, 'Migration should not be called when user cancels');
            assert.ok(!setVersionSpy.called, 'setVersion should not be called when user cancels');
        });
    });

    // ==========================================================================
    // TEST SUITE 4: No Upgrade Available
    // ==========================================================================

    describe('No Upgrade Available', () => {
        it('should exit gracefully when already on latest version', async () => {
            // Setup: Already on latest version (2.0.0)
            const aetherlightDir = path.join(tempDir, '.aetherlight');
            fs.mkdirSync(aetherlightDir, { recursive: true });
            fs.writeFileSync(path.join(aetherlightDir, 'version.json'), JSON.stringify({ version: '2.0.0' }, null, 2));

            // Mock npm registry (latest = 2.0.0)
            sandbox.stub(versionTracker, 'getLatestVersion').resolves({ version: '2.0.0', published_at: '2025-02-01T12:00:00Z' });

            // Run upgrade
            const result = await upgradeCommand.run(tempDir);

            // Verify no upgrade
            assert.strictEqual(result.success, true);
            assert.strictEqual(result.upgraded, false);
            assert.strictEqual(result.message, 'Already on latest version');
        });

        it('should not prompt user when no upgrade available', async () => {
            // Setup
            const aetherlightDir = path.join(tempDir, '.aetherlight');
            fs.mkdirSync(aetherlightDir, { recursive: true });
            fs.writeFileSync(path.join(aetherlightDir, 'version.json'), JSON.stringify({ version: '2.0.0' }, null, 2));

            // Mock services
            sandbox.stub(versionTracker, 'getLatestVersion').resolves({ version: '2.0.0', published_at: '2025-02-01T12:00:00Z' });

            // Spy on confirmation prompt (should not be called)
            const confirmSpy = sandbox.spy(upgradeCommand as any, 'promptUserConfirmation');

            // Run upgrade
            await upgradeCommand.run(tempDir);

            // Verify prompt not called
            assert.ok(!confirmSpy.called, 'User confirmation should not be requested when no upgrade available');
        });
    });

    // ==========================================================================
    // TEST SUITE 5: Performance
    // ==========================================================================

    describe('Performance', () => {
        it('should complete full upgrade in < 10s', async function () {
            this.timeout(15000); // Allow 15s for test (target <10s)

            // Setup
            const aetherlightDir = path.join(tempDir, '.aetherlight');
            fs.mkdirSync(aetherlightDir, { recursive: true });
            fs.writeFileSync(
                path.join(aetherlightDir, 'project-config.json'),
                JSON.stringify({ projectName: 'perf-test', language: 'typescript' }, null, 2)
            );
            fs.writeFileSync(path.join(aetherlightDir, 'version.json'), JSON.stringify({ version: '1.0.0' }, null, 2));

            // Mock services
            sandbox.stub(versionTracker, 'getLatestVersion').resolves({ version: '2.0.0', published_at: '2025-02-01T12:00:00Z' });
            sandbox.stub(upgradeCommand as any, 'promptUserConfirmation').resolves(true);

            // Benchmark
            const startTime = Date.now();
            await upgradeCommand.run(tempDir);
            const duration = Date.now() - startTime;

            assert.ok(duration < 10000, `Full upgrade took ${duration}ms (target: < 10000ms)`);
        });

        it('should check for upgrade in < 200ms', async () => {
            // Setup
            const aetherlightDir = path.join(tempDir, '.aetherlight');
            fs.mkdirSync(aetherlightDir, { recursive: true });
            fs.writeFileSync(path.join(aetherlightDir, 'version.json'), JSON.stringify({ version: '1.0.0' }, null, 2));

            // Mock fast response
            sandbox.stub(versionTracker, 'getLatestVersion').resolves({ version: '2.0.0', published_at: '2025-02-01T12:00:00Z' });

            // Benchmark
            const startTime = Date.now();
            await upgradeCommand.checkForUpgrade(tempDir);
            const duration = Date.now() - startTime;

            assert.ok(duration < 200, `Upgrade check took ${duration}ms (target: < 200ms)`);
        });
    });

    // ==========================================================================
    // TEST SUITE 6: Version Tracking Integration
    // ==========================================================================

    describe('Version Tracking Integration', () => {
        it('should detect current version from version.json', async () => {
            // Setup
            const aetherlightDir = path.join(tempDir, '.aetherlight');
            fs.mkdirSync(aetherlightDir, { recursive: true });
            fs.writeFileSync(
                path.join(aetherlightDir, 'version.json'),
                JSON.stringify({ version: '1.5.0', installed_at: '2025-01-15T10:00:00Z' }, null, 2)
            );

            // Get current version
            const current = await versionTracker.getCurrentVersion(tempDir);

            assert.ok(current);
            assert.strictEqual(current.version, '1.5.0');
            assert.strictEqual(current.installed_at, '2025-01-15T10:00:00Z');
        });

        it('should compare semantic versions correctly', () => {
            // Test major version upgrade
            const result1 = versionTracker.compareVersions('1.0.0', '2.0.0');
            assert.strictEqual(result1.updateAvailable, true);
            assert.strictEqual(result1.changeType, 'major');

            // Test minor version upgrade
            const result2 = versionTracker.compareVersions('1.0.0', '1.1.0');
            assert.strictEqual(result2.updateAvailable, true);
            assert.strictEqual(result2.changeType, 'minor');

            // Test patch version upgrade
            const result3 = versionTracker.compareVersions('1.0.0', '1.0.1');
            assert.strictEqual(result3.updateAvailable, true);
            assert.strictEqual(result3.changeType, 'patch');

            // Test no update
            const result4 = versionTracker.compareVersions('2.0.0', '2.0.0');
            assert.strictEqual(result4.updateAvailable, false);
            assert.strictEqual(result4.changeType, 'none');
        });
    });
});
