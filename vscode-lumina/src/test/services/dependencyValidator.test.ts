/**
 * DependencyValidator Tests
 *
 * TDD: These tests are written FIRST (RED phase)
 * Then implementation (GREEN phase)
 *
 * DESIGN DECISION: Test Pattern-PUBLISH-003 enforcement
 * WHY: Prevent native and runtime npm dependencies that break VS Code extensions
 *
 * REASONING CHAIN:
 * 1. Test detects native dependencies (@nut-tree-fork/nut-js, robotjs, node-gyp)
 * 2. Test detects runtime npm dependencies (glob, lodash, moment, axios)
 * 3. Test allows whitelisted dependencies (@iarna/toml, node-fetch, ws)
 * 4. Test allows sub-packages (aetherlight-analyzer, aetherlight-sdk)
 * 5. Test provides clear error messages with safe alternatives
 * 6. Result: Prevents 9-hour debugging sessions like v0.13.23
 *
 * Pattern: Pattern-PUBLISH-003 (Avoid Runtime npm Dependencies)
 * Related: VAL-002, v0.13.23 bug, v0.15.31-32 bug
 */

import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { DependencyValidator, ValidationResult, DependencyIssue } from '../../services/DependencyValidator';

suite('DependencyValidator Test Suite', () => {
    let tempDir: string;
    let validator: DependencyValidator;

    setup(() => {
        // Create temporary directory for test files
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dependency-validator-test-'));
        validator = new DependencyValidator();
    });

    teardown(() => {
        // Clean up temporary directory
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });

    suite('Native Dependencies Detection', () => {
        test('should detect @nut-tree-fork/nut-js (v0.13.23 bug)', () => {
            // Arrange: Create package.json with native dependency
            const packageJson = {
                name: 'test-extension',
                version: '1.0.0',
                dependencies: {
                    '@nut-tree-fork/nut-js': '^3.0.0'
                }
            };
            const packagePath = path.join(tempDir, 'package.json');
            fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));

            // Act
            const result = validator.validate(packagePath);

            // Assert
            assert.strictEqual(result.valid, false, 'Should be invalid');
            assert.ok(result.issues.length > 0, 'Should have issues');

            const nativeIssue = result.issues.find(i => i.type === 'native_dependency');
            assert.ok(nativeIssue, 'Should detect native dependency');
            assert.ok(nativeIssue!.package.includes('@nut-tree-fork/nut-js'), 'Should identify package');
            assert.ok(nativeIssue!.message.includes('native'), 'Should explain it\'s a native dep');
            assert.ok(nativeIssue!.suggestion, 'Should provide suggestion');
            assert.ok(nativeIssue!.suggestion.includes('VS Code API'), 'Should suggest VS Code APIs');
        });

        test('should detect robotjs', () => {
            // Arrange
            const packageJson = {
                name: 'test-extension',
                version: '1.0.0',
                dependencies: {
                    'robotjs': '^0.6.0'
                }
            };
            const packagePath = path.join(tempDir, 'package.json');
            fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));

            // Act
            const result = validator.validate(packagePath);

            // Assert
            assert.strictEqual(result.valid, false);
            const issue = result.issues.find(i => i.package === 'robotjs');
            assert.ok(issue, 'Should detect robotjs');
            assert.strictEqual(issue!.type, 'native_dependency');
        });

        test('should detect node-gyp pattern', () => {
            // Arrange: Package that requires node-gyp
            const packageJson = {
                name: 'test-extension',
                version: '1.0.0',
                dependencies: {
                    'node-hid': '^2.0.0'
                }
            };
            const packagePath = path.join(tempDir, 'package.json');
            fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));

            // Act
            const result = validator.validate(packagePath);

            // Assert
            assert.strictEqual(result.valid, false);
            const issue = result.issues.find(i => i.package === 'node-hid');
            assert.ok(issue, 'Should detect node-hid');
        });
    });

    suite('Runtime npm Dependencies Detection', () => {
        test('should detect glob (v0.15.31-32 bug)', () => {
            // Arrange
            const packageJson = {
                name: 'test-extension',
                version: '1.0.0',
                dependencies: {
                    'glob': '^11.0.0'
                }
            };
            const packagePath = path.join(tempDir, 'package.json');
            fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));

            // Act
            const result = validator.validate(packagePath);

            // Assert
            assert.strictEqual(result.valid, false);
            const issue = result.issues.find(i => i.package === 'glob');
            assert.ok(issue, 'Should detect glob');
            assert.strictEqual(issue!.type, 'runtime_npm_dependency');
            assert.ok(issue!.suggestion.includes('fs.readdirSync'), 'Should suggest fs.readdirSync()');
        });

        test('should detect lodash', () => {
            // Arrange
            const packageJson = {
                name: 'test-extension',
                version: '1.0.0',
                dependencies: {
                    'lodash': '^4.17.21'
                }
            };
            const packagePath = path.join(tempDir, 'package.json');
            fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));

            // Act
            const result = validator.validate(packagePath);

            // Assert
            assert.strictEqual(result.valid, false);
            const issue = result.issues.find(i => i.package === 'lodash');
            assert.ok(issue, 'Should detect lodash');
            assert.ok(issue!.suggestion.includes('native'), 'Should suggest native alternatives');
        });

        test('should detect moment', () => {
            // Arrange
            const packageJson = {
                name: 'test-extension',
                version: '1.0.0',
                dependencies: {
                    'moment': '^2.29.0'
                }
            };
            const packagePath = path.join(tempDir, 'package.json');
            fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));

            // Act
            const result = validator.validate(packagePath);

            // Assert
            assert.strictEqual(result.valid, false);
            const issue = result.issues.find(i => i.package === 'moment');
            assert.ok(issue, 'Should detect moment');
            assert.ok(issue!.suggestion.includes('Date'), 'Should suggest native Date');
        });

        test('should detect axios', () => {
            // Arrange
            const packageJson = {
                name: 'test-extension',
                version: '1.0.0',
                dependencies: {
                    'axios': '^1.0.0'
                }
            };
            const packagePath = path.join(tempDir, 'package.json');
            fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));

            // Act
            const result = validator.validate(packagePath);

            // Assert
            assert.strictEqual(result.valid, false);
            const issue = result.issues.find(i => i.package === 'axios');
            assert.ok(issue, 'Should detect axios');
            assert.ok(issue!.suggestion.includes('https'), 'Should suggest https module');
        });

        test('should detect chalk/colors', () => {
            // Arrange
            const packageJson = {
                name: 'test-extension',
                version: '1.0.0',
                dependencies: {
                    'chalk': '^5.0.0'
                }
            };
            const packagePath = path.join(tempDir, 'package.json');
            fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));

            // Act
            const result = validator.validate(packagePath);

            // Assert
            assert.strictEqual(result.valid, false);
            const issue = result.issues.find(i => i.package === 'chalk');
            assert.ok(issue, 'Should detect chalk');
        });
    });

    suite('Whitelisted Dependencies', () => {
        test('should allow @iarna/toml', () => {
            // Arrange: Essential TOML parser
            const packageJson = {
                name: 'test-extension',
                version: '1.0.0',
                dependencies: {
                    '@iarna/toml': '^2.2.5'
                }
            };
            const packagePath = path.join(tempDir, 'package.json');
            fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));

            // Act
            const result = validator.validate(packagePath);

            // Assert
            assert.strictEqual(result.valid, true, 'Should be valid');
            assert.strictEqual(result.issues.length, 0, 'Should have no issues');
        });

        test('should allow node-fetch', () => {
            // Arrange
            const packageJson = {
                name: 'test-extension',
                version: '1.0.0',
                dependencies: {
                    'node-fetch': '^2.7.0'
                }
            };
            const packagePath = path.join(tempDir, 'package.json');
            fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));

            // Act
            const result = validator.validate(packagePath);

            // Assert
            assert.strictEqual(result.valid, true);
        });

        test('should allow ws (WebSocket)', () => {
            // Arrange
            const packageJson = {
                name: 'test-extension',
                version: '1.0.0',
                dependencies: {
                    'ws': '^8.14.2'
                }
            };
            const packagePath = path.join(tempDir, 'package.json');
            fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));

            // Act
            const result = validator.validate(packagePath);

            // Assert
            assert.strictEqual(result.valid, true);
        });

        test('should allow form-data', () => {
            // Arrange
            const packageJson = {
                name: 'test-extension',
                version: '1.0.0',
                dependencies: {
                    'form-data': '^4.0.0'
                }
            };
            const packagePath = path.join(tempDir, 'package.json');
            fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));

            // Act
            const result = validator.validate(packagePath);

            // Assert
            assert.strictEqual(result.valid, true);
        });
    });

    suite('Sub-Packages', () => {
        test('should allow aetherlight-analyzer', () => {
            // Arrange: Sub-package is always allowed
            const packageJson = {
                name: 'test-extension',
                version: '1.0.0',
                dependencies: {
                    'aetherlight-analyzer': '^0.15.34'
                }
            };
            const packagePath = path.join(tempDir, 'package.json');
            fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));

            // Act
            const result = validator.validate(packagePath);

            // Assert
            assert.strictEqual(result.valid, true);
        });

        test('should allow aetherlight-sdk', () => {
            // Arrange
            const packageJson = {
                name: 'test-extension',
                version: '1.0.0',
                dependencies: {
                    'aetherlight-sdk': '^0.15.34'
                }
            };
            const packagePath = path.join(tempDir, 'package.json');
            fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));

            // Act
            const result = validator.validate(packagePath);

            // Assert
            assert.strictEqual(result.valid, true);
        });

        test('should allow aetherlight-node', () => {
            // Arrange
            const packageJson = {
                name: 'test-extension',
                version: '1.0.0',
                dependencies: {
                    'aetherlight-node': '^0.15.34'
                }
            };
            const packagePath = path.join(tempDir, 'package.json');
            fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));

            // Act
            const result = validator.validate(packagePath);

            // Assert
            assert.strictEqual(result.valid, true);
        });
    });

    suite('Multiple Issues Detection', () => {
        test('should detect multiple native dependencies', () => {
            // Arrange
            const packageJson = {
                name: 'test-extension',
                version: '1.0.0',
                dependencies: {
                    'robotjs': '^0.6.0',
                    '@nut-tree-fork/nut-js': '^3.0.0',
                    'node-hid': '^2.0.0'
                }
            };
            const packagePath = path.join(tempDir, 'package.json');
            fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));

            // Act
            const result = validator.validate(packagePath);

            // Assert
            assert.strictEqual(result.valid, false);
            assert.strictEqual(result.issues.length, 3, 'Should detect all 3 native deps');
        });

        test('should detect multiple runtime npm dependencies', () => {
            // Arrange
            const packageJson = {
                name: 'test-extension',
                version: '1.0.0',
                dependencies: {
                    'glob': '^11.0.0',
                    'lodash': '^4.17.21',
                    'moment': '^2.29.0'
                }
            };
            const packagePath = path.join(tempDir, 'package.json');
            fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));

            // Act
            const result = validator.validate(packagePath);

            // Assert
            assert.strictEqual(result.valid, false);
            assert.strictEqual(result.issues.length, 3, 'Should detect all 3 runtime deps');
        });

        test('should detect mixed native and runtime dependencies', () => {
            // Arrange
            const packageJson = {
                name: 'test-extension',
                version: '1.0.0',
                dependencies: {
                    'robotjs': '^0.6.0',          // Native
                    'glob': '^11.0.0',            // Runtime npm
                    '@iarna/toml': '^2.2.5',      // Allowed
                    'lodash': '^4.17.21'          // Runtime npm
                }
            };
            const packagePath = path.join(tempDir, 'package.json');
            fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));

            // Act
            const result = validator.validate(packagePath);

            // Assert
            assert.strictEqual(result.valid, false);
            assert.strictEqual(result.issues.length, 3, 'Should detect 3 issues (robotjs, glob, lodash)');

            // Verify allowed dependency is not flagged
            const tomlIssue = result.issues.find(i => i.package.includes('@iarna/toml'));
            assert.strictEqual(tomlIssue, undefined, '@iarna/toml should not be flagged');
        });
    });

    suite('Valid Package.json', () => {
        test('should pass with only allowed dependencies', () => {
            // Arrange: Realistic ÆtherLight package.json
            const packageJson = {
                name: 'aetherlight',
                version: '0.15.34',
                dependencies: {
                    '@iarna/toml': '^2.2.5',
                    'node-fetch': '^2.7.0',
                    'ws': '^8.14.2',
                    'form-data': '^4.0.0',
                    'aetherlight-analyzer': '^0.15.34',
                    'aetherlight-sdk': '^0.15.34',
                    'aetherlight-node': '^0.15.34'
                }
            };
            const packagePath = path.join(tempDir, 'package.json');
            fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));

            // Act
            const result = validator.validate(packagePath);

            // Assert
            assert.strictEqual(result.valid, true, 'Should be valid');
            assert.strictEqual(result.issues.length, 0, 'Should have no issues');
        });

        test('should pass with no dependencies', () => {
            // Arrange
            const packageJson = {
                name: 'test-extension',
                version: '1.0.0',
                dependencies: {}
            };
            const packagePath = path.join(tempDir, 'package.json');
            fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));

            // Act
            const result = validator.validate(packagePath);

            // Assert
            assert.strictEqual(result.valid, true);
            assert.strictEqual(result.issues.length, 0);
        });

        test('should pass with only devDependencies', () => {
            // Arrange: devDependencies are allowed (not bundled)
            const packageJson = {
                name: 'test-extension',
                version: '1.0.0',
                dependencies: {},
                devDependencies: {
                    'glob': '^11.0.0',        // OK in devDependencies
                    'typescript': '^5.3.3',
                    'mocha': '^10.0.0'
                }
            };
            const packagePath = path.join(tempDir, 'package.json');
            fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));

            // Act
            const result = validator.validate(packagePath);

            // Assert
            assert.strictEqual(result.valid, true, 'devDependencies should be ignored');
        });
    });

    suite('Error Handling', () => {
        test('should handle missing package.json', () => {
            // Arrange: Non-existent file
            const packagePath = path.join(tempDir, 'nonexistent.json');

            // Act
            const result = validator.validate(packagePath);

            // Assert
            assert.strictEqual(result.valid, false);
            assert.ok(result.issues.length > 0);
            const issue = result.issues[0];
            assert.strictEqual(issue.type, 'file_error');
            assert.ok(issue.message.includes('not found') || issue.message.includes('exist'));
        });

        test('should handle corrupted package.json', () => {
            // Arrange: Invalid JSON
            const packagePath = path.join(tempDir, 'package.json');
            fs.writeFileSync(packagePath, '{ invalid json }');

            // Act
            const result = validator.validate(packagePath);

            // Assert
            assert.strictEqual(result.valid, false);
            const issue = result.issues.find(i => i.type === 'parse_error');
            assert.ok(issue, 'Should detect parse error');
        });
    });

    suite('Performance', () => {
        test('should validate in <50ms', () => {
            // Arrange: Large package.json with many dependencies
            const dependencies: Record<string, string> = {};
            for (let i = 0; i < 100; i++) {
                dependencies[`allowed-package-${i}`] = '^1.0.0';
            }
            dependencies['@iarna/toml'] = '^2.2.5';  // Mix in allowed
            dependencies['glob'] = '^11.0.0';          // And forbidden

            const packageJson = {
                name: 'test-extension',
                version: '1.0.0',
                dependencies
            };
            const packagePath = path.join(tempDir, 'package.json');
            fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));

            // Act
            const startTime = Date.now();
            const result = validator.validate(packagePath);
            const duration = Date.now() - startTime;

            // Assert
            assert.ok(duration < 50, `Should validate in <50ms, took ${duration}ms`);
            assert.strictEqual(result.valid, false, 'Should detect forbidden deps even with many deps');
        });
    });
});
