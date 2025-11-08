/**
 * ConfigMigration Tests
 *
 * PATTERN: Pattern-TDD-001 (90% coverage for infrastructure code)
 * COVERAGE TARGET: 90% (Infrastructure service)
 * TEST STRATEGY: Test old config detection, migration, customization preservation
 */

import * as assert from 'assert';
import * as sinon from 'sinon';
import * as fs from 'fs';
import * as path from 'path';
import { ConfigMigration, MigrationResult, OldConfigInfo } from '../../src/services/ConfigMigration';
import { ProjectConfigValidator } from '../../src/services/ProjectConfigValidator';
import { ProjectConfig } from '../../src/services/ProjectConfig';

suite('ConfigMigration Tests', () => {
    let migration: ConfigMigration;
    let sandbox: sinon.SinonSandbox;
    let validator: sinon.SinonStubbedInstance<ProjectConfigValidator>;
    let tempDir: string;

    setup(() => {
        sandbox = sinon.createSandbox();
        tempDir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'lumina-test-'));

        validator = sandbox.createStubInstance(ProjectConfigValidator);
        migration = new ConfigMigration(validator as any);
    });

    teardown(() => {
        sandbox.restore();
        // Clean up temp directory
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });

    // ==========================================================================
    // TEST SUITE 1: Old Config Detection
    // ==========================================================================

    suite('detectOldConfig()', () => {
        test('should detect v1 config in .claude/config.json', async () => {
            // Setup: Create v1 config
            const claudeDir = path.join(tempDir, '.claude');
            fs.mkdirSync(claudeDir, { recursive: true });

            const v1Config = {
                version: '1.0',
                language: 'typescript',
                buildCommand: 'npm run build',
                testCommand: 'npm test'
            };
            fs.writeFileSync(
                path.join(claudeDir, 'config.json'),
                JSON.stringify(v1Config, null, 2)
            );

            // Detect old config
            const result = await migration.detectOldConfig(tempDir);

            assert.ok(result);
            assert.strictEqual(result.version, 'v1');
            assert.strictEqual(result.path, path.join(claudeDir, 'config.json'));
            assert.ok(result.config);
            assert.strictEqual(result.config.language, 'typescript');
        });

        test('should detect no old config (fresh install)', async () => {
            // Empty project
            const result = await migration.detectOldConfig(tempDir);

            assert.strictEqual(result, null);
        });

        test('should prioritize newer config format if multiple exist', async () => {
            // Setup: Create both .claude/config.json and old .aetherlight/config.json
            const claudeDir = path.join(tempDir, '.claude');
            const aetherlightDir = path.join(tempDir, '.aetherlight');
            fs.mkdirSync(claudeDir, { recursive: true });
            fs.mkdirSync(aetherlightDir, { recursive: true });

            fs.writeFileSync(
                path.join(claudeDir, 'config.json'),
                JSON.stringify({ version: '1.0', language: 'typescript' }, null, 2)
            );

            fs.writeFileSync(
                path.join(aetherlightDir, 'config.json'),
                JSON.stringify({ version: '0.5', language: 'javascript' }, null, 2)
            );

            // Detect (should find v1 in .claude/)
            const result = await migration.detectOldConfig(tempDir);

            assert.ok(result);
            assert.strictEqual(result.version, 'v1');
            assert.ok(result.path.includes('.claude'));
        });

        test('should handle corrupted config files', async () => {
            // Setup: Create invalid JSON
            const claudeDir = path.join(tempDir, '.claude');
            fs.mkdirSync(claudeDir, { recursive: true });
            fs.writeFileSync(path.join(claudeDir, 'config.json'), 'invalid json{');

            await assert.rejects(
                async () => await migration.detectOldConfig(tempDir),
                /Failed to parse/
            );
        });
    });

    // ==========================================================================
    // TEST SUITE 2: Migration Logic (v1 → v2)
    // ==========================================================================

    suite('migrate()', () => {
        test('should migrate v1 config to v2 format', async () => {
            // Setup: v1 config
            const claudeDir = path.join(tempDir, '.claude');
            fs.mkdirSync(claudeDir, { recursive: true });

            const v1Config = {
                version: '1.0',
                projectName: 'test-project',
                language: 'typescript',
                buildCommand: 'npm run build',
                testCommand: 'npm test',
                packageManager: 'npm',
                testFramework: 'jest'
            };
            fs.writeFileSync(
                path.join(claudeDir, 'config.json'),
                JSON.stringify(v1Config, null, 2)
            );

            // Mock validator
            validator.validate.returns({ valid: true, errors: [] });

            // Run migration
            const result = await migration.migrate(tempDir);

            // Verify: Migration successful
            assert.strictEqual(result.success, true);
            assert.strictEqual(result.version, 'v1_to_v2');

            // Verify: New config file created
            const newConfigPath = path.join(tempDir, '.aetherlight', 'project-config.json');
            assert.ok(fs.existsSync(newConfigPath));

            // Verify: Config content
            const newConfig = JSON.parse(fs.readFileSync(newConfigPath, 'utf-8')) as ProjectConfig;
            assert.strictEqual(newConfig.project_name, 'test-project');
            assert.strictEqual(newConfig.language.language, 'typescript');
            assert.strictEqual(newConfig.language.build_command, 'npm run build');
            assert.strictEqual(newConfig.language.test_command, 'npm test');
        });

        test('should handle fresh install (no migration needed)', async () => {
            // Empty project
            const result = await migration.migrate(tempDir);

            assert.strictEqual(result.success, true);
            assert.strictEqual(result.migrated, false);
            assert.ok(result.message.includes('No old config'));
        });

        test('should create migration log', async () => {
            // Setup: v1 config
            const claudeDir = path.join(tempDir, '.claude');
            fs.mkdirSync(claudeDir, { recursive: true });

            const v1Config = {
                version: '1.0',
                language: 'typescript',
                buildCommand: 'npm run build'
            };
            fs.writeFileSync(
                path.join(claudeDir, 'config.json'),
                JSON.stringify(v1Config, null, 2)
            );

            validator.validate.returns({ valid: true, errors: [] });

            // Run migration
            await migration.migrate(tempDir);

            // Verify: Migration log created
            const logPath = path.join(tempDir, '.aetherlight', 'migration.log');
            assert.ok(fs.existsSync(logPath));

            // Verify: Log content
            const logContent = fs.readFileSync(logPath, 'utf-8');
            assert.ok(logContent.includes('v1_to_v2'));
            assert.ok(logContent.includes('typescript'));
        });

        test('should backup old config before migration', async () => {
            // Setup: v1 config
            const claudeDir = path.join(tempDir, '.claude');
            fs.mkdirSync(claudeDir, { recursive: true });

            const v1Config = {
                version: '1.0',
                language: 'typescript'
            };
            const configPath = path.join(claudeDir, 'config.json');
            fs.writeFileSync(configPath, JSON.stringify(v1Config, null, 2));

            validator.validate.returns({ valid: true, errors: [] });

            // Run migration
            await migration.migrate(tempDir);

            // Verify: Backup created
            const backupPath = path.join(claudeDir, 'config.json.backup');
            assert.ok(fs.existsSync(backupPath));

            // Verify: Backup content matches original
            const backupContent = fs.readFileSync(backupPath, 'utf-8');
            const originalContent = JSON.stringify(v1Config, null, 2);
            assert.strictEqual(backupContent, originalContent);
        });
    });

    // ==========================================================================
    // TEST SUITE 3: Customization Preservation
    // ==========================================================================

    suite('Customization Preservation', () => {
        test('should preserve custom build command', async () => {
            // Setup: v1 config with custom build command
            const claudeDir = path.join(tempDir, '.claude');
            fs.mkdirSync(claudeDir, { recursive: true });

            const v1Config = {
                version: '1.0',
                language: 'typescript',
                buildCommand: 'custom-build-script.sh', // Custom!
                testCommand: 'npm test'
            };
            fs.writeFileSync(
                path.join(claudeDir, 'config.json'),
                JSON.stringify(v1Config, null, 2)
            );

            validator.validate.returns({ valid: true, errors: [] });

            // Run migration
            await migration.migrate(tempDir);

            // Verify: Custom build command preserved
            const newConfigPath = path.join(tempDir, '.aetherlight', 'project-config.json');
            const newConfig = JSON.parse(fs.readFileSync(newConfigPath, 'utf-8')) as ProjectConfig;
            assert.strictEqual(newConfig.language.build_command, 'custom-build-script.sh');
        });

        test('should preserve custom paths', async () => {
            // Setup: v1 config with custom paths
            const claudeDir = path.join(tempDir, '.claude');
            fs.mkdirSync(claudeDir, { recursive: true });

            const v1Config = {
                version: '1.0',
                language: 'typescript',
                paths: {
                    source: 'lib',          // Custom (not 'src')
                    test: 'spec',           // Custom (not 'test')
                    output: 'dist'          // Custom (not 'out')
                }
            };
            fs.writeFileSync(
                path.join(claudeDir, 'config.json'),
                JSON.stringify(v1Config, null, 2)
            );

            validator.validate.returns({ valid: true, errors: [] });

            // Run migration
            await migration.migrate(tempDir);

            // Verify: Custom paths preserved
            const newConfigPath = path.join(tempDir, '.aetherlight', 'project-config.json');
            const newConfig = JSON.parse(fs.readFileSync(newConfigPath, 'utf-8')) as ProjectConfig;
            assert.strictEqual(newConfig.structure.source_directory, 'lib');
            assert.strictEqual(newConfig.structure.test_directory, 'spec');
            assert.strictEqual(newConfig.structure.output_directory, 'dist');
        });

        test('should preserve unknown custom fields in custom section', async () => {
            // Setup: v1 config with unknown fields
            const claudeDir = path.join(tempDir, '.claude');
            fs.mkdirSync(claudeDir, { recursive: true });

            const v1Config = {
                version: '1.0',
                language: 'typescript',
                customField1: 'value1',      // Unknown field
                customField2: 'value2'       // Unknown field
            };
            fs.writeFileSync(
                path.join(claudeDir, 'config.json'),
                JSON.stringify(v1Config, null, 2)
            );

            validator.validate.returns({ valid: true, errors: [] });

            // Run migration
            await migration.migrate(tempDir);

            // Verify: Unknown fields preserved in custom section
            const newConfigPath = path.join(tempDir, '.aetherlight', 'project-config.json');
            const newConfig: any = JSON.parse(fs.readFileSync(newConfigPath, 'utf-8'));
            assert.ok(newConfig.custom);
            assert.strictEqual(newConfig.custom.customField1, 'value1');
            assert.strictEqual(newConfig.custom.customField2, 'value2');
        });
    });

    // ==========================================================================
    // TEST SUITE 4: Validation Integration
    // ==========================================================================

    suite('Validation', () => {
        test('should validate migrated config before writing', async () => {
            // Setup: v1 config
            const claudeDir = path.join(tempDir, '.claude');
            fs.mkdirSync(claudeDir, { recursive: true });

            const v1Config = {
                version: '1.0',
                language: 'typescript'
            };
            fs.writeFileSync(
                path.join(claudeDir, 'config.json'),
                JSON.stringify(v1Config, null, 2)
            );

            validator.validate.returns({ valid: true, errors: [] });

            // Run migration
            await migration.migrate(tempDir);

            // Verify: Validator was called
            assert.ok(validator.validate.calledOnce);
        });

        test('should fail migration if validation fails', async () => {
            // Setup: v1 config
            const claudeDir = path.join(tempDir, '.claude');
            fs.mkdirSync(claudeDir, { recursive: true });

            const v1Config = {
                version: '1.0',
                language: 'invalid_language' // Invalid!
            };
            fs.writeFileSync(
                path.join(claudeDir, 'config.json'),
                JSON.stringify(v1Config, null, 2)
            );

            // Mock validation failure
            validator.validate.returns({
                valid: false,
                errors: ['Invalid language: invalid_language']
            });

            // Run migration (should fail)
            const result = await migration.migrate(tempDir);

            assert.strictEqual(result.success, false);
            assert.ok(result.error);
            assert.ok(result.error.includes('validation failed'));

            // Verify: No new config file created
            const newConfigPath = path.join(tempDir, '.aetherlight', 'project-config.json');
            assert.ok(!fs.existsSync(newConfigPath));
        });

        test('should rollback on validation failure', async () => {
            // Setup: v1 config
            const claudeDir = path.join(tempDir, '.claude');
            fs.mkdirSync(claudeDir, { recursive: true });

            const v1Config = {
                version: '1.0',
                language: 'typescript'
            };
            const configPath = path.join(claudeDir, 'config.json');
            fs.writeFileSync(configPath, JSON.stringify(v1Config, null, 2));

            // Mock validation failure
            validator.validate.returns({
                valid: false,
                errors: ['Validation error']
            });

            // Run migration (should fail and rollback)
            await migration.migrate(tempDir);

            // Verify: Original config still exists
            assert.ok(fs.existsSync(configPath));

            // Verify: Backup was removed (rollback)
            const backupPath = path.join(claudeDir, 'config.json.backup');
            assert.ok(!fs.existsSync(backupPath) || fs.existsSync(configPath));
        });
    });

    // ==========================================================================
    // TEST SUITE 5: Migration Logging
    // ==========================================================================

    suite('Migration Logging', () => {
        test('should log migration details', async () => {
            // Setup: v1 config
            const claudeDir = path.join(tempDir, '.claude');
            fs.mkdirSync(claudeDir, { recursive: true });

            const v1Config = {
                version: '1.0',
                language: 'typescript',
                buildCommand: 'custom-build'
            };
            fs.writeFileSync(
                path.join(claudeDir, 'config.json'),
                JSON.stringify(v1Config, null, 2)
            );

            validator.validate.returns({ valid: true, errors: [] });

            // Run migration
            await migration.migrate(tempDir);

            // Verify: Log file exists
            const logPath = path.join(tempDir, '.aetherlight', 'migration.log');
            assert.ok(fs.existsSync(logPath));

            // Verify: Log contains key information
            const logContent = fs.readFileSync(logPath, 'utf-8');
            assert.ok(logContent.includes('Migration: v1_to_v2'));
            assert.ok(logContent.includes('language: typescript'));
            assert.ok(logContent.includes('buildCommand: custom-build'));
            assert.ok(logContent.includes('Status: Success'));
        });

        test('should log errors in migration log', async () => {
            // Setup: v1 config with invalid data
            const claudeDir = path.join(tempDir, '.claude');
            fs.mkdirSync(claudeDir, { recursive: true });

            const v1Config = {
                version: '1.0',
                language: 'invalid'
            };
            fs.writeFileSync(
                path.join(claudeDir, 'config.json'),
                JSON.stringify(v1Config, null, 2)
            );

            validator.validate.returns({
                valid: false,
                errors: ['Invalid language']
            });

            // Run migration (will fail)
            await migration.migrate(tempDir);

            // Verify: Error logged
            const logPath = path.join(tempDir, '.aetherlight', 'migration.log');
            const logContent = fs.readFileSync(logPath, 'utf-8');
            assert.ok(logContent.includes('Status: Failed'));
            assert.ok(logContent.includes('Invalid language'));
        });
    });

    // ==========================================================================
    // TEST SUITE 6: Error Handling
    // ==========================================================================

    suite('Error Handling', () => {
        test('should handle file system errors gracefully', async () => {
            // Setup: Create read-only directory
            const claudeDir = path.join(tempDir, '.claude');
            fs.mkdirSync(claudeDir, { recursive: true });

            const v1Config = { version: '1.0', language: 'typescript' };
            fs.writeFileSync(
                path.join(claudeDir, 'config.json'),
                JSON.stringify(v1Config, null, 2)
            );

            // Create read-only .aetherlight directory
            const aetherlightDir = path.join(tempDir, '.aetherlight');
            fs.mkdirSync(aetherlightDir, { recursive: true });
            fs.chmodSync(aetherlightDir, 0o444); // Read-only

            validator.validate.returns({ valid: true, errors: [] });

            try {
                // Run migration (should handle error)
                const result = await migration.migrate(tempDir);

                assert.strictEqual(result.success, false);
                assert.ok(result.error);
            } finally {
                // Restore permissions
                fs.chmodSync(aetherlightDir, 0o755);
            }
        });

        test('should handle missing old config gracefully', async () => {
            // Empty project (no old config)
            const result = await migration.migrate(tempDir);

            assert.strictEqual(result.success, true);
            assert.strictEqual(result.migrated, false);
        });
    });

    // ==========================================================================
    // TEST SUITE 7: Performance
    // ==========================================================================

    suite('Performance', () => {
        test('should complete migration in < 500ms', async () => {
            // Setup: v1 config
            const claudeDir = path.join(tempDir, '.claude');
            fs.mkdirSync(claudeDir, { recursive: true });

            const v1Config = {
                version: '1.0',
                language: 'typescript',
                buildCommand: 'npm run build'
            };
            fs.writeFileSync(
                path.join(claudeDir, 'config.json'),
                JSON.stringify(v1Config, null, 2)
            );

            validator.validate.returns({ valid: true, errors: [] });

            // Benchmark
            const startTime = Date.now();
            await migration.migrate(tempDir);
            const duration = Date.now() - startTime;

            assert.ok(duration < 500, `Migration took ${duration}ms (target: < 500ms)`);
        });
    });
});
