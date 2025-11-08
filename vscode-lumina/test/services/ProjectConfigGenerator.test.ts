/**
 * ProjectConfigGenerator Test Suite (TDD RED Phase)
 *
 * DESIGN DECISION: Test-first development with comprehensive test cases
 * WHY: Infrastructure service requires 90% coverage (Pattern-TDD-001)
 *
 * TEST COVERAGE:
 * 1. Generate config from detection only
 * 2. Generate config from detection + interview
 * 3. Interview overrides detection
 * 4. Defaults applied for missing fields
 * 5. Missing required field throws error
 * 6. Invalid field validation error
 * 7. JSON serialization (pretty-print)
 * 8. File write to .aetherlight/project-config.json
 * 9. Directory creation if missing
 * 10. Performance test (<50ms)
 *
 * PATTERN: Pattern-TDD-001 (RED → GREEN → REFACTOR)
 * PATTERN: Pattern-TASK-ANALYSIS-001 (Infrastructure task = 90% coverage)
 * RELATED: ProjectConfig, ProjectConfigValidator, VariableResolver
 */

import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import { ProjectConfigGenerator, DetectionResults, InterviewAnswers } from '../../src/services/ProjectConfigGenerator';
import { ProjectConfig } from '../../src/services/ProjectConfig';

suite('ProjectConfigGenerator', () => {
    let generator: ProjectConfigGenerator;
    let testOutputDir: string;

    setup(() => {
        generator = new ProjectConfigGenerator();
        testOutputDir = path.join(__dirname, '..', '..', '..', 'test-output');

        // Create test output directory
        if (!fs.existsSync(testOutputDir)) {
            fs.mkdirSync(testOutputDir, { recursive: true });
        }
    });

    teardown(() => {
        // Clean up test output directory
        if (fs.existsSync(testOutputDir)) {
            fs.rmSync(testOutputDir, { recursive: true, force: true });
        }
    });

    /**
     * Test Suite 1: Generate config from detection only
     */
    suite('Test 1: Generate from detection only', () => {
        test('should generate valid TypeScript config from detection', () => {
            const detection: DetectionResults = {
                language: 'typescript',
                package_manager: 'npm',
                test_framework: 'mocha',
                file_extensions: ['.ts', '.tsx'],
                build_command: 'npm run build',
                test_command: 'npm test'
            };

            const config = generator.generate(detection, {});

            assert.strictEqual(config.language.language, 'typescript');
            assert.strictEqual(config.language.package_manager, 'npm');
            assert.strictEqual(config.language.test_framework, 'mocha');
            assert.deepStrictEqual(config.language.file_extensions, ['.ts', '.tsx']);
            assert.strictEqual(config.language.build_command, 'npm run build');
            assert.strictEqual(config.language.test_command, 'npm test');
        });

        test('should generate valid Rust config from detection', () => {
            const detection: DetectionResults = {
                language: 'rust',
                package_manager: 'cargo',
                test_framework: 'cargo-test',
                file_extensions: ['.rs'],
                build_command: 'cargo build',
                test_command: 'cargo test'
            };

            const config = generator.generate(detection, {});

            assert.strictEqual(config.language.language, 'rust');
            assert.strictEqual(config.language.package_manager, 'cargo');
            assert.strictEqual(config.language.test_framework, 'cargo-test');
            assert.deepStrictEqual(config.language.file_extensions, ['.rs']);
        });

        test('should generate valid Python config from detection', () => {
            const detection: DetectionResults = {
                language: 'python',
                package_manager: 'pip',
                test_framework: 'pytest',
                file_extensions: ['.py'],
                build_command: 'python setup.py build',
                test_command: 'pytest'
            };

            const config = generator.generate(detection, {});

            assert.strictEqual(config.language.language, 'python');
            assert.strictEqual(config.language.package_manager, 'pip');
            assert.strictEqual(config.language.test_framework, 'pytest');
        });
    });

    /**
     * Test Suite 2: Generate from detection + interview
     */
    suite('Test 2: Generate from detection + interview', () => {
        test('should merge detection and interview results', () => {
            const detection: DetectionResults = {
                language: 'typescript',
                package_manager: 'npm',
                test_framework: 'jest',
                file_extensions: ['.ts'],
                build_command: 'npm run build',
                test_command: 'npm test'
            };

            const interview: InterviewAnswers = {
                project_name: 'my-awesome-project',
                coverage_infrastructure: 95,
                coverage_api: 90,
                coverage_ui: 75
            };

            const config = generator.generate(detection, interview);

            assert.strictEqual(config.project_name, 'my-awesome-project');
            assert.strictEqual(config.language.language, 'typescript');
            assert.strictEqual(config.testing.coverage_infrastructure, 95);
            assert.strictEqual(config.testing.coverage_api, 90);
            assert.strictEqual(config.testing.coverage_ui, 75);
        });
    });

    /**
     * Test Suite 3: Interview overrides detection
     */
    suite('Test 3: Interview overrides detection', () => {
        test('should prioritize interview over detection', () => {
            const detection: DetectionResults = {
                language: 'typescript',
                package_manager: 'npm',
                test_framework: 'mocha',
                file_extensions: ['.ts'],
                build_command: 'npm run build',
                test_command: 'npm test'
            };

            const interview: InterviewAnswers = {
                build_command: 'npm run build:prod',
                test_command: 'npm run test:ci',
                test_framework: 'jest' // User prefers Jest over Mocha
            };

            const config = generator.generate(detection, interview);

            // Interview values should win
            assert.strictEqual(config.language.build_command, 'npm run build:prod');
            assert.strictEqual(config.language.test_command, 'npm run test:ci');
            assert.strictEqual(config.language.test_framework, 'jest');

            // Detection values without interview override remain
            assert.strictEqual(config.language.language, 'typescript');
            assert.strictEqual(config.language.package_manager, 'npm');
        });

        test('should override multiple fields from interview', () => {
            const detection: DetectionResults = {
                language: 'javascript',
                package_manager: 'npm',
                test_framework: 'mocha',
                file_extensions: ['.js'],
                build_command: 'webpack',
                test_command: 'mocha'
            };

            const interview: InterviewAnswers = {
                package_manager: 'yarn',
                test_framework: 'jest',
                build_command: 'yarn build',
                test_command: 'yarn test'
            };

            const config = generator.generate(detection, interview);

            assert.strictEqual(config.language.package_manager, 'yarn');
            assert.strictEqual(config.language.test_framework, 'jest');
            assert.strictEqual(config.language.build_command, 'yarn build');
            assert.strictEqual(config.language.test_command, 'yarn test');
        });
    });

    /**
     * Test Suite 4: Defaults applied for missing fields
     */
    suite('Test 4: Defaults applied for missing fields', () => {
        test('should apply default values for missing fields', () => {
            const detection: DetectionResults = {
                language: 'typescript',
                package_manager: 'npm',
                test_framework: 'mocha',
                file_extensions: ['.ts'],
                build_command: 'npm run build',
                test_command: 'npm test'
            };

            const config = generator.generate(detection, {});

            // Default structure paths should be applied
            assert.strictEqual(config.structure.root_directory, '.');
            assert.strictEqual(config.structure.source_directory, 'src/');
            assert.strictEqual(config.structure.test_directory, 'test/');
            assert.strictEqual(config.structure.output_directory, 'out/');

            // Default testing config
            assert.strictEqual(config.testing.coverage_infrastructure, 90);
            assert.strictEqual(config.testing.coverage_api, 85);
            assert.strictEqual(config.testing.coverage_ui, 70);

            // Default performance targets
            assert.strictEqual(config.performance.workflow_check_ms, 500);
            assert.strictEqual(config.performance.agent_assignment_ms, 50);
        });

        test('should partially override defaults', () => {
            const detection: DetectionResults = {
                language: 'rust',
                package_manager: 'cargo',
                test_framework: 'cargo-test',
                file_extensions: ['.rs'],
                build_command: 'cargo build',
                test_command: 'cargo test'
            };

            const interview: InterviewAnswers = {
                source_directory: 'lib/', // Override default 'src/'
                coverage_infrastructure: 95 // Override default 90%
            };

            const config = generator.generate(detection, interview);

            // Overridden values
            assert.strictEqual(config.structure.source_directory, 'lib/');
            assert.strictEqual(config.testing.coverage_infrastructure, 95);

            // Non-overridden defaults remain
            assert.strictEqual(config.structure.root_directory, '.');
            assert.strictEqual(config.testing.coverage_api, 85);
        });

        test('should derive project name from detection if not provided', () => {
            const detection: DetectionResults = {
                language: 'typescript',
                package_manager: 'npm',
                test_framework: 'mocha',
                file_extensions: ['.ts'],
                build_command: 'npm run build',
                test_command: 'npm test',
                project_root: '/home/user/my-project'
            };

            const config = generator.generate(detection, {});

            // Should derive project name from path
            assert.strictEqual(config.project_name, 'my-project');
        });
    });

    /**
     * Test Suite 5: Missing required field throws error
     */
    suite('Test 5: Missing required field errors', () => {
        test('should throw error when language is missing', () => {
            const detection: DetectionResults = {
                // Missing language
                package_manager: 'npm',
                test_framework: 'mocha',
                file_extensions: ['.ts'],
                build_command: 'npm run build',
                test_command: 'npm test'
            };

            assert.throws(
                () => generator.generate(detection as any, {}),
                /language.*required/i
            );
        });

        test('should throw error when package_manager is missing', () => {
            const detection: DetectionResults = {
                language: 'typescript',
                // Missing package_manager
                test_framework: 'mocha',
                file_extensions: ['.ts'],
                build_command: 'npm run build',
                test_command: 'npm test'
            };

            assert.throws(
                () => generator.generate(detection as any, {}),
                /package_manager.*required/i
            );
        });

        test('should throw error when build_command is missing', () => {
            const detection: DetectionResults = {
                language: 'typescript',
                package_manager: 'npm',
                test_framework: 'mocha',
                file_extensions: ['.ts'],
                // Missing build_command
                test_command: 'npm test'
            };

            assert.throws(
                () => generator.generate(detection as any, {}),
                /build_command.*required/i
            );
        });
    });

    /**
     * Test Suite 6: Invalid field validation
     */
    suite('Test 6: Invalid field validation', () => {
        test('should throw error for invalid language', () => {
            const detection: DetectionResults = {
                language: 'invalid-language' as any,
                package_manager: 'npm',
                test_framework: 'mocha',
                file_extensions: ['.ts'],
                build_command: 'npm run build',
                test_command: 'npm test'
            };

            assert.throws(
                () => generator.generate(detection, {}),
                /language.*invalid/i
            );
        });

        test('should throw error for invalid package_manager', () => {
            const detection: DetectionResults = {
                language: 'typescript',
                package_manager: 'invalid-pm' as any,
                test_framework: 'mocha',
                file_extensions: ['.ts'],
                build_command: 'npm run build',
                test_command: 'npm test'
            };

            assert.throws(
                () => generator.generate(detection, {}),
                /package_manager.*invalid/i
            );
        });

        test('should throw error for invalid coverage percentage', () => {
            const detection: DetectionResults = {
                language: 'typescript',
                package_manager: 'npm',
                test_framework: 'mocha',
                file_extensions: ['.ts'],
                build_command: 'npm run build',
                test_command: 'npm test'
            };

            const interview: InterviewAnswers = {
                coverage_infrastructure: 150 // Invalid: > 100
            };

            assert.throws(
                () => generator.generate(detection, interview),
                /coverage.*100/i
            );
        });
    });

    /**
     * Test Suite 7: JSON serialization
     */
    suite('Test 7: JSON serialization', () => {
        test('should serialize config to JSON string', () => {
            const detection: DetectionResults = {
                language: 'typescript',
                package_manager: 'npm',
                test_framework: 'mocha',
                file_extensions: ['.ts'],
                build_command: 'npm run build',
                test_command: 'npm test'
            };

            const config = generator.generate(detection, {});
            const json = generator.toJSON(config);

            // Should be valid JSON
            assert.doesNotThrow(() => JSON.parse(json));

            // Should be pretty-printed (2-space indent)
            assert.ok(json.includes('  "schema_version"'));
            assert.ok(json.includes('  "language": {'));
        });

        test('should roundtrip serialize/deserialize', () => {
            const detection: DetectionResults = {
                language: 'rust',
                package_manager: 'cargo',
                test_framework: 'cargo-test',
                file_extensions: ['.rs'],
                build_command: 'cargo build',
                test_command: 'cargo test'
            };

            const config = generator.generate(detection, {});
            const json = generator.toJSON(config);
            const parsed = JSON.parse(json) as ProjectConfig;

            assert.strictEqual(parsed.language.language, 'rust');
            assert.strictEqual(parsed.language.package_manager, 'cargo');
            assert.deepStrictEqual(parsed.language.file_extensions, ['.rs']);
        });
    });

    /**
     * Test Suite 8: File write
     */
    suite('Test 8: File write to .aetherlight/project-config.json', () => {
        test('should write config to file', () => {
            const detection: DetectionResults = {
                language: 'typescript',
                package_manager: 'npm',
                test_framework: 'mocha',
                file_extensions: ['.ts'],
                build_command: 'npm run build',
                test_command: 'npm test'
            };

            const config = generator.generate(detection, {});
            const outputPath = path.join(testOutputDir, '.aetherlight', 'project-config.json');

            generator.writeToFile(config, testOutputDir);

            // File should exist
            assert.ok(fs.existsSync(outputPath));

            // File should be valid JSON
            const fileContent = fs.readFileSync(outputPath, 'utf-8');
            const parsed = JSON.parse(fileContent);

            assert.strictEqual(parsed.language.language, 'typescript');
        });

        test('should overwrite existing config file', () => {
            const detection1: DetectionResults = {
                language: 'javascript',
                package_manager: 'npm',
                test_framework: 'jest',
                file_extensions: ['.js'],
                build_command: 'npm run build',
                test_command: 'npm test'
            };

            const detection2: DetectionResults = {
                language: 'typescript',
                package_manager: 'yarn',
                test_framework: 'mocha',
                file_extensions: ['.ts'],
                build_command: 'yarn build',
                test_command: 'yarn test'
            };

            const outputPath = path.join(testOutputDir, '.aetherlight', 'project-config.json');

            // First write
            const config1 = generator.generate(detection1, {});
            generator.writeToFile(config1, testOutputDir);

            // Second write (should overwrite)
            const config2 = generator.generate(detection2, {});
            generator.writeToFile(config2, testOutputDir);

            // File should have second config
            const fileContent = fs.readFileSync(outputPath, 'utf-8');
            const parsed = JSON.parse(fileContent);

            assert.strictEqual(parsed.language.language, 'typescript');
            assert.strictEqual(parsed.language.package_manager, 'yarn');
        });
    });

    /**
     * Test Suite 9: Directory creation
     */
    suite('Test 9: Directory creation if missing', () => {
        test('should create .aetherlight directory if missing', () => {
            const detection: DetectionResults = {
                language: 'typescript',
                package_manager: 'npm',
                test_framework: 'mocha',
                file_extensions: ['.ts'],
                build_command: 'npm run build',
                test_command: 'npm test'
            };

            const config = generator.generate(detection, {});
            const aetherlightDir = path.join(testOutputDir, '.aetherlight');

            // Ensure directory doesn't exist initially
            if (fs.existsSync(aetherlightDir)) {
                fs.rmSync(aetherlightDir, { recursive: true });
            }

            generator.writeToFile(config, testOutputDir);

            // Directory should now exist
            assert.ok(fs.existsSync(aetherlightDir));
        });
    });

    /**
     * Test Suite 10: Performance test
     */
    suite('Test 10: Performance test', () => {
        test('should generate config in less than 50ms', () => {
            const detection: DetectionResults = {
                language: 'typescript',
                package_manager: 'npm',
                test_framework: 'mocha',
                file_extensions: ['.ts'],
                build_command: 'npm run build',
                test_command: 'npm test'
            };

            const startTime = performance.now();
            const config = generator.generate(detection, {});
            const endTime = performance.now();
            const duration = endTime - startTime;

            // Verify generation succeeded
            assert.strictEqual(config.language.language, 'typescript');

            // Verify performance (<50ms)
            assert.ok(duration < 50, `Expected duration < 50ms, got ${duration}ms`);
        });

        test('should write file in less than 100ms total', () => {
            const detection: DetectionResults = {
                language: 'typescript',
                package_manager: 'npm',
                test_framework: 'mocha',
                file_extensions: ['.ts'],
                build_command: 'npm run build',
                test_command: 'npm test'
            };

            const startTime = performance.now();
            const config = generator.generate(detection, {});
            generator.writeToFile(config, testOutputDir);
            const endTime = performance.now();
            const duration = endTime - startTime;

            // Verify performance (<100ms for generation + write)
            assert.ok(duration < 100, `Expected duration < 100ms, got ${duration}ms`);
        });
    });
});
