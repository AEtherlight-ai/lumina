/**
 * VersionTracker Tests
 *
 * PATTERN: Pattern-TDD-001 (90% coverage for infrastructure code)
 * COVERAGE TARGET: 90% (Infrastructure service)
 * TEST STRATEGY: Test version.json I/O, npm registry API, semver comparison
 */

import * as assert from 'assert';
import * as sinon from 'sinon';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import { VersionTracker, VersionInfo, VersionComparison } from '../../src/services/VersionTracker';

suite('VersionTracker Tests', () => {
    let tracker: VersionTracker;
    let sandbox: sinon.SinonSandbox;
    let tempDir: string;

    setup(() => {
        sandbox = sinon.createSandbox();
        tempDir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'lumina-test-'));
        tracker = new VersionTracker();
    });

    teardown(() => {
        sandbox.restore();
        // Clean up temp directory
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });

    // ==========================================================================
    // TEST SUITE 1: Current Version Management (version.json I/O)
    // ==========================================================================

    suite('getCurrentVersion()', () => {
        test('should read current version from version.json', async () => {
            // Setup: Create .aetherlight/version.json
            const aetherlightDir = path.join(tempDir, '.aetherlight');
            fs.mkdirSync(aetherlightDir, { recursive: true });

            const versionData: VersionInfo = {
                version: '1.0.0',
                installed_at: '2025-01-15T10:30:00Z',
                last_checked: '2025-01-20T14:45:00Z'
            };
            fs.writeFileSync(
                path.join(aetherlightDir, 'version.json'),
                JSON.stringify(versionData, null, 2)
            );

            // Get current version
            const current = await tracker.getCurrentVersion(tempDir);

            assert.strictEqual(current.version, '1.0.0');
            assert.strictEqual(current.installed_at, '2025-01-15T10:30:00Z');
            assert.strictEqual(current.last_checked, '2025-01-20T14:45:00Z');
        });

        test('should return null if version.json does not exist', async () => {
            // Empty project (no .aetherlight directory)
            const current = await tracker.getCurrentVersion(tempDir);

            assert.strictEqual(current, null);
        });

        test('should handle invalid JSON in version.json', async () => {
            // Setup: Create invalid version.json
            const aetherlightDir = path.join(tempDir, '.aetherlight');
            fs.mkdirSync(aetherlightDir, { recursive: true });
            fs.writeFileSync(path.join(aetherlightDir, 'version.json'), 'invalid json{');

            await assert.rejects(
                async () => await tracker.getCurrentVersion(tempDir),
                /Failed to parse version.json/
            );
        });
    });

    suite('setVersion()', () => {
        test('should create version.json with current version', async () => {
            const version = '2.0.0';

            await tracker.setVersion(tempDir, version);

            // Verify file created
            const versionPath = path.join(tempDir, '.aetherlight', 'version.json');
            assert.ok(fs.existsSync(versionPath));

            // Verify content
            const data = JSON.parse(fs.readFileSync(versionPath, 'utf-8'));
            assert.strictEqual(data.version, '2.0.0');
            assert.ok(data.installed_at); // Timestamp set
            assert.ok(data.last_checked); // Timestamp set
        });

        test('should update existing version.json', async () => {
            // Setup: Create initial version
            const aetherlightDir = path.join(tempDir, '.aetherlight');
            fs.mkdirSync(aetherlightDir, { recursive: true });
            fs.writeFileSync(
                path.join(aetherlightDir, 'version.json'),
                JSON.stringify({ version: '1.0.0', installed_at: '2025-01-01T00:00:00Z' }, null, 2)
            );

            // Update version
            await tracker.setVersion(tempDir, '2.0.0');

            // Verify updated
            const data = JSON.parse(fs.readFileSync(path.join(aetherlightDir, 'version.json'), 'utf-8'));
            assert.strictEqual(data.version, '2.0.0');
            assert.strictEqual(data.installed_at, '2025-01-01T00:00:00Z'); // Preserved
        });

        test('should create .aetherlight directory if missing', async () => {
            // Project root exists but no .aetherlight
            await tracker.setVersion(tempDir, '1.0.0');

            const aetherlightDir = path.join(tempDir, '.aetherlight');
            assert.ok(fs.existsSync(aetherlightDir));
            assert.ok(fs.statSync(aetherlightDir).isDirectory());
        });
    });

    // ==========================================================================
    // TEST SUITE 2: Latest Version Fetching (npm registry API)
    // ==========================================================================

    suite('getLatestVersion()', () => {
        test('should fetch latest version from npm registry', async () => {
            // Mock https.get response
            const mockResponse = {
                statusCode: 200,
                on: (event: string, handler: Function) => {
                    if (event === 'data') {
                        handler(JSON.stringify({
                            'dist-tags': { latest: '2.0.0' },
                            'time': { '2.0.0': '2025-02-01T12:00:00Z' }
                        }));
                    } else if (event === 'end') {
                        handler();
                    }
                }
            };

            const mockRequest = {
                on: (event: string, handler: Function) => {
                    // No error
                },
                end: () => {}
            };

            sandbox.stub(https, 'get').callsFake((url: any, callback: any) => {
                callback(mockResponse);
                return mockRequest as any;
            });

            // Fetch latest version
            const latest = await tracker.getLatestVersion();

            assert.strictEqual(latest.version, '2.0.0');
            assert.strictEqual(latest.published_at, '2025-02-01T12:00:00Z');
        });

        test('should handle npm registry network errors', async () => {
            // Mock network error
            const mockRequest = {
                on: (event: string, handler: Function) => {
                    if (event === 'error') {
                        handler(new Error('Network error'));
                    }
                },
                end: () => {}
            };

            sandbox.stub(https, 'get').callsFake((url: any, callback: any) => {
                return mockRequest as any;
            });

            await assert.rejects(
                async () => await tracker.getLatestVersion(),
                /Failed to fetch latest version/
            );
        });

        test('should handle npm registry timeout (5s)', async () => {
            // Mock timeout (no response within 5s)
            const mockRequest = {
                on: (event: string, handler: Function) => {
                    if (event === 'timeout') {
                        // Timeout after 5s
                        setTimeout(() => handler(), 5100);
                    }
                },
                setTimeout: (timeout: number) => {},
                end: () => {}
            };

            sandbox.stub(https, 'get').callsFake((url: any, callback: any) => {
                return mockRequest as any;
            });

            await assert.rejects(
                async () => await tracker.getLatestVersion(),
                /timeout/i
            );
        });

        test('should handle invalid npm registry response', async () => {
            // Mock invalid JSON response
            const mockResponse = {
                statusCode: 200,
                on: (event: string, handler: Function) => {
                    if (event === 'data') {
                        handler('invalid json{');
                    } else if (event === 'end') {
                        handler();
                    }
                }
            };

            const mockRequest = {
                on: (event: string, handler: Function) => {},
                end: () => {}
            };

            sandbox.stub(https, 'get').callsFake((url: any, callback: any) => {
                callback(mockResponse);
                return mockRequest as any;
            });

            await assert.rejects(
                async () => await tracker.getLatestVersion(),
                /Failed to parse/
            );
        });
    });

    // ==========================================================================
    // TEST SUITE 3: Semantic Version Comparison
    // ==========================================================================

    suite('compareVersions()', () => {
        test('should detect major version upgrade (1.0.0 → 2.0.0)', () => {
            const result = tracker.compareVersions('1.0.0', '2.0.0');

            assert.strictEqual(result.updateAvailable, true);
            assert.strictEqual(result.changeType, 'major');
            assert.strictEqual(result.currentVersion, '1.0.0');
            assert.strictEqual(result.latestVersion, '2.0.0');
        });

        test('should detect minor version upgrade (1.0.0 → 1.1.0)', () => {
            const result = tracker.compareVersions('1.0.0', '1.1.0');

            assert.strictEqual(result.updateAvailable, true);
            assert.strictEqual(result.changeType, 'minor');
        });

        test('should detect patch version upgrade (1.0.0 → 1.0.1)', () => {
            const result = tracker.compareVersions('1.0.0', '1.0.1');

            assert.strictEqual(result.updateAvailable, true);
            assert.strictEqual(result.changeType, 'patch');
        });

        test('should detect no update available (same version)', () => {
            const result = tracker.compareVersions('1.0.0', '1.0.0');

            assert.strictEqual(result.updateAvailable, false);
            assert.strictEqual(result.changeType, 'none');
        });

        test('should detect current > latest (downgrade)', () => {
            const result = tracker.compareVersions('2.0.0', '1.0.0');

            assert.strictEqual(result.updateAvailable, false);
            assert.strictEqual(result.changeType, 'none');
        });

        test('should handle complex version comparisons', () => {
            // 1.2.3 → 2.0.0
            const result1 = tracker.compareVersions('1.2.3', '2.0.0');
            assert.strictEqual(result1.changeType, 'major');

            // 1.2.3 → 1.5.0
            const result2 = tracker.compareVersions('1.2.3', '1.5.0');
            assert.strictEqual(result2.changeType, 'minor');

            // 1.2.3 → 1.2.10
            const result3 = tracker.compareVersions('1.2.3', '1.2.10');
            assert.strictEqual(result3.changeType, 'patch');
        });

        test('should handle invalid version formats', () => {
            assert.throws(
                () => tracker.compareVersions('invalid', '1.0.0'),
                /Invalid version format/
            );

            assert.throws(
                () => tracker.compareVersions('1.0.0', 'invalid'),
                /Invalid version format/
            );
        });
    });

    // ==========================================================================
    // TEST SUITE 4: Upgrade Detection (High-Level API)
    // ==========================================================================

    suite('needsUpgrade()', () => {
        test('should detect upgrade needed (current < latest)', async () => {
            // Setup: Current version = 1.0.0
            const aetherlightDir = path.join(tempDir, '.aetherlight');
            fs.mkdirSync(aetherlightDir, { recursive: true });
            fs.writeFileSync(
                path.join(aetherlightDir, 'version.json'),
                JSON.stringify({ version: '1.0.0' }, null, 2)
            );

            // Mock npm registry: Latest = 2.0.0
            const mockResponse = {
                statusCode: 200,
                on: (event: string, handler: Function) => {
                    if (event === 'data') {
                        handler(JSON.stringify({
                            'dist-tags': { latest: '2.0.0' },
                            'time': { '2.0.0': '2025-02-01T12:00:00Z' }
                        }));
                    } else if (event === 'end') {
                        handler();
                    }
                }
            };

            const mockRequest = {
                on: () => {},
                end: () => {}
            };

            sandbox.stub(https, 'get').callsFake((url: any, callback: any) => {
                callback(mockResponse);
                return mockRequest as any;
            });

            // Check if upgrade needed
            const result = await tracker.needsUpgrade(tempDir);

            assert.strictEqual(result.upgradeAvailable, true);
            assert.strictEqual(result.currentVersion, '1.0.0');
            assert.strictEqual(result.latestVersion, '2.0.0');
            assert.strictEqual(result.changeType, 'major');
        });

        test('should detect no upgrade needed (current = latest)', async () => {
            // Setup: Current version = 2.0.0
            const aetherlightDir = path.join(tempDir, '.aetherlight');
            fs.mkdirSync(aetherlightDir, { recursive: true });
            fs.writeFileSync(
                path.join(aetherlightDir, 'version.json'),
                JSON.stringify({ version: '2.0.0' }, null, 2)
            );

            // Mock npm registry: Latest = 2.0.0
            const mockResponse = {
                statusCode: 200,
                on: (event: string, handler: Function) => {
                    if (event === 'data') {
                        handler(JSON.stringify({
                            'dist-tags': { latest: '2.0.0' },
                            'time': { '2.0.0': '2025-02-01T12:00:00Z' }
                        }));
                    } else if (event === 'end') {
                        handler();
                    }
                }
            };

            const mockRequest = {
                on: () => {},
                end: () => {}
            };

            sandbox.stub(https, 'get').callsFake((url: any, callback: any) => {
                callback(mockResponse);
                return mockRequest as any;
            });

            // Check if upgrade needed
            const result = await tracker.needsUpgrade(tempDir);

            assert.strictEqual(result.upgradeAvailable, false);
        });

        test('should handle missing version.json (fresh install)', async () => {
            // No .aetherlight directory

            // Mock npm registry
            const mockResponse = {
                statusCode: 200,
                on: (event: string, handler: Function) => {
                    if (event === 'data') {
                        handler(JSON.stringify({
                            'dist-tags': { latest: '2.0.0' },
                            'time': { '2.0.0': '2025-02-01T12:00:00Z' }
                        }));
                    } else if (event === 'end') {
                        handler();
                    }
                }
            };

            const mockRequest = {
                on: () => {},
                end: () => {}
            };

            sandbox.stub(https, 'get').callsFake((url: any, callback: any) => {
                callback(mockResponse);
                return mockRequest as any;
            });

            // Check upgrade (should treat as fresh install)
            const result = await tracker.needsUpgrade(tempDir);

            assert.strictEqual(result.upgradeAvailable, true);
            assert.strictEqual(result.currentVersion, null);
            assert.strictEqual(result.latestVersion, '2.0.0');
        });
    });

    // ==========================================================================
    // TEST SUITE 5: Performance
    // ==========================================================================

    suite('Performance', () => {
        test('should read version.json in < 50ms', async () => {
            // Setup
            const aetherlightDir = path.join(tempDir, '.aetherlight');
            fs.mkdirSync(aetherlightDir, { recursive: true });
            fs.writeFileSync(
                path.join(aetherlightDir, 'version.json'),
                JSON.stringify({ version: '1.0.0' }, null, 2)
            );

            // Benchmark
            const startTime = Date.now();
            await tracker.getCurrentVersion(tempDir);
            const duration = Date.now() - startTime;

            assert.ok(duration < 50, `getCurrentVersion took ${duration}ms (target: < 50ms)`);
        });

        test('should fetch from npm registry in < 500ms', async () => {
            // Mock fast response
            const mockResponse = {
                statusCode: 200,
                on: (event: string, handler: Function) => {
                    if (event === 'data') {
                        handler(JSON.stringify({
                            'dist-tags': { latest: '2.0.0' },
                            'time': { '2.0.0': '2025-02-01T12:00:00Z' }
                        }));
                    } else if (event === 'end') {
                        handler();
                    }
                }
            };

            const mockRequest = {
                on: () => {},
                end: () => {}
            };

            sandbox.stub(https, 'get').callsFake((url: any, callback: any) => {
                callback(mockResponse);
                return mockRequest as any;
            });

            // Benchmark
            const startTime = Date.now();
            await tracker.getLatestVersion();
            const duration = Date.now() - startTime;

            assert.ok(duration < 500, `getLatestVersion took ${duration}ms (target: < 500ms)`);
        });

        test('should compare versions in < 1ms', () => {
            const startTime = Date.now();
            tracker.compareVersions('1.0.0', '2.0.0');
            const duration = Date.now() - startTime;

            assert.ok(duration < 1, `compareVersions took ${duration}ms (target: < 1ms)`);
        });
    });
});
