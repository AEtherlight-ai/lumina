/**
 * ProjectConfigValidator Test Suite (TDD RED Phase)
 *
 * DESIGN DECISION: Test-first development with comprehensive test cases
 * WHY: Infrastructure service requires 95% coverage (Pattern-TDD-001)
 *
 * TEST COVERAGE:
 * 1. Valid configuration passes validation
 * 2. Missing required fields cause errors
 * 3. Invalid enum values rejected
 * 4. Invalid number ranges rejected
 * 5. Invalid paths rejected
 * 6. Cross-field validation works
 * 7. Optional fields can be omitted
 * 8. Edge cases (null, undefined, empty arrays)
 *
 * PATTERN: Pattern-TDD-001 (RED → GREEN → REFACTOR)
 * PATTERN: Pattern-TASK-ANALYSIS-001 (Infrastructure task = 95% coverage)
 * RELATED: ProjectConfig, ProjectConfigValidator, VariableResolver.test.ts
 */

import * as assert from 'assert';
import { ProjectConfigValidator } from '../../src/services/ProjectConfigValidator';
import { ProjectConfig, DEFAULT_CONFIG } from '../../src/services/ProjectConfig';

suite('ProjectConfigValidator', () => {
    let validator: ProjectConfigValidator;

    setup(() => {
        validator = new ProjectConfigValidator();
    });

    /**
     * Test Suite 1: Valid Configuration
     */
    suite('Test 1: Valid configuration', () => {
        test('should accept default configuration', () => {
            const result = validator.validate(DEFAULT_CONFIG);
            assert.strictEqual(result.valid, true, 'Default config should be valid');
            assert.strictEqual(result.errors.length, 0, 'No errors for default config');
        });

        test('should accept minimal Rust configuration', () => {
            const config: ProjectConfig = {
                schema_version: '1.0.0',
                project_name: 'my-rust-project',
                language: {
                    language: 'rust',
                    file_extensions: ['.rs'],
                    build_command: 'cargo build',
                    test_command: 'cargo test',
                    package_manager: 'cargo',
                    test_framework: 'cargo-test'
                },
                structure: {
                    root_directory: '.',
                    source_directory: 'src/',
                    test_directory: 'tests/',
                    output_directory: 'target/',
                    docs_directory: 'docs/',
                    scripts_directory: 'scripts/'
                },
                ignore: {
                    ignore_patterns: ['target', '.git'],
                    search_file_patterns: ['**/*.rs']
                },
                testing: {
                    coverage_infrastructure: 90,
                    coverage_api: 85,
                    coverage_ui: 70,
                    coverage_command: 'cargo tarpaulin'
                },
                performance: {
                    workflow_check_ms: 500,
                    agent_assignment_ms: 50,
                    confidence_scoring_ms: 100,
                    test_validation_ms: 200,
                    compile_time_s: 10
                },
                publishing: {
                    package_registry: 'crates.io',
                    package_names: ['my-rust-project'],
                    version_format: 'semver',
                    publish_command: 'cargo publish'
                },
                git_workflow: {
                    main_branch: 'main',
                    commit_format: 'conventional',
                    enforce_tests_on_commit: true,
                    enforce_compile_on_commit: true
                },
                aetherlight: {
                    agents_directory: 'internal/agents',
                    sprints_directory: 'internal/sprints',
                    patterns_directory: 'docs/patterns',
                    skills_directory: '.claude/skills',
                    claude_config_path: '.claude/CLAUDE.md'
                },
                documentation: {
                    changelog_path: 'CHANGELOG.md',
                    readme_path: 'README.md',
                    api_docs_command: 'cargo doc',
                    api_docs_output: 'target/doc'
                }
            };

            const result = validator.validate(config);
            assert.strictEqual(result.valid, true, 'Rust config should be valid');
            assert.strictEqual(result.errors.length, 0, 'No errors for Rust config');
        });

        test('should accept configuration with optional framework field', () => {
            const config = {
                ...DEFAULT_CONFIG,
                framework: {
                    framework_type: 'vscode-extension',
                    vscode_api_version: '^1.80.0',
                    nodejs_version: '>=18.0.0'
                }
            };

            const result = validator.validate(config);
            assert.strictEqual(result.valid, true, 'Config with framework should be valid');
            assert.strictEqual(result.errors.length, 0);
        });
    });

    /**
     * Test Suite 2: Schema Version Validation
     */
    suite('Test 2: Schema version validation', () => {
        test('should reject missing schema_version', () => {
            const config = { ...DEFAULT_CONFIG };
            delete (config as any).schema_version;

            const result = validator.validate(config);
            assert.strictEqual(result.valid, false);
            assert.ok(result.errors.some(e => e.field === 'schema_version'), 'Should have schema_version error');
        });

        test('should reject invalid schema_version format', () => {
            const config = {
                ...DEFAULT_CONFIG,
                schema_version: 'invalid'
            };

            const result = validator.validate(config);
            assert.strictEqual(result.valid, false);
            assert.ok(result.errors.some(e => e.field === 'schema_version' && e.message.includes('semver')));
        });

        test('should accept valid semver schema_version', () => {
            const config = {
                ...DEFAULT_CONFIG,
                schema_version: '2.1.0'
            };

            const result = validator.validate(config);
            // Should be valid (no schema_version error)
            const schemaError = result.errors.find(e => e.field === 'schema_version');
            assert.strictEqual(schemaError, undefined, 'No schema_version error for valid semver');
        });
    });

    /**
     * Test Suite 3: Project Name Validation
     */
    suite('Test 3: Project name validation', () => {
        test('should reject missing project_name', () => {
            const config = { ...DEFAULT_CONFIG };
            delete (config as any).project_name;

            const result = validator.validate(config);
            assert.strictEqual(result.valid, false);
            assert.ok(result.errors.some(e => e.field === 'project_name'));
        });

        test('should reject empty project_name', () => {
            const config = {
                ...DEFAULT_CONFIG,
                project_name: '   '
            };

            const result = validator.validate(config);
            assert.strictEqual(result.valid, false);
            assert.ok(result.errors.some(e => e.field === 'project_name' && e.message.includes('empty')));
        });
    });

    /**
     * Test Suite 4: Language Config Validation
     */
    suite('Test 4: Language configuration validation', () => {
        test('should reject invalid language type', () => {
            const config = {
                ...DEFAULT_CONFIG,
                language: {
                    ...DEFAULT_CONFIG.language,
                    language: 'invalid' as any
                }
            };

            const result = validator.validate(config);
            assert.strictEqual(result.valid, false);
            assert.ok(result.errors.some(e => e.field === 'language.language'));
        });

        test('should reject empty file_extensions array', () => {
            const config = {
                ...DEFAULT_CONFIG,
                language: {
                    ...DEFAULT_CONFIG.language,
                    file_extensions: []
                }
            };

            const result = validator.validate(config);
            assert.strictEqual(result.valid, false);
            assert.ok(result.errors.some(e => e.field === 'language.file_extensions'));
        });

        test('should reject file extension without leading dot', () => {
            const config = {
                ...DEFAULT_CONFIG,
                language: {
                    ...DEFAULT_CONFIG.language,
                    file_extensions: ['ts', 'js'] // Missing dots
                }
            };

            const result = validator.validate(config);
            assert.strictEqual(result.valid, false);
            assert.ok(result.errors.some(e => e.field.startsWith('language.file_extensions[')));
        });

        test('should reject empty build_command', () => {
            const config = {
                ...DEFAULT_CONFIG,
                language: {
                    ...DEFAULT_CONFIG.language,
                    build_command: ''
                }
            };

            const result = validator.validate(config);
            assert.strictEqual(result.valid, false);
            assert.ok(result.errors.some(e => e.field === 'language.build_command'));
        });

        test('should reject invalid package_manager', () => {
            const config = {
                ...DEFAULT_CONFIG,
                language: {
                    ...DEFAULT_CONFIG.language,
                    package_manager: 'invalid' as any
                }
            };

            const result = validator.validate(config);
            assert.strictEqual(result.valid, false);
            assert.ok(result.errors.some(e => e.field === 'language.package_manager'));
        });

        test('should reject invalid test_framework', () => {
            const config = {
                ...DEFAULT_CONFIG,
                language: {
                    ...DEFAULT_CONFIG.language,
                    test_framework: 'invalid' as any
                }
            };

            const result = validator.validate(config);
            assert.strictEqual(result.valid, false);
            assert.ok(result.errors.some(e => e.field === 'language.test_framework'));
        });
    });

    /**
     * Test Suite 5: Project Structure Validation
     */
    suite('Test 5: Project structure validation', () => {
        test('should reject missing structure object', () => {
            const config = { ...DEFAULT_CONFIG };
            delete (config as any).structure;

            const result = validator.validate(config);
            assert.strictEqual(result.valid, false);
            assert.ok(result.errors.some(e => e.field === 'structure'));
        });

        test('should reject missing required paths', () => {
            const config = {
                ...DEFAULT_CONFIG,
                structure: {
                    ...DEFAULT_CONFIG.structure,
                    source_directory: ''
                }
            };

            const result = validator.validate(config);
            assert.strictEqual(result.valid, false);
            assert.ok(result.errors.some(e => e.field === 'structure.source_directory'));
        });

        test('should reject paths with double slashes', () => {
            const config = {
                ...DEFAULT_CONFIG,
                structure: {
                    ...DEFAULT_CONFIG.structure,
                    source_directory: 'src//code/'
                }
            };

            const result = validator.validate(config);
            assert.strictEqual(result.valid, false);
            assert.ok(result.errors.some(e => e.field === 'structure.source_directory' && e.message.includes('double slashes')));
        });

        test('should allow optional packages_directory to be omitted', () => {
            const config = {
                ...DEFAULT_CONFIG,
                structure: {
                    ...DEFAULT_CONFIG.structure
                }
            };
            delete config.structure.packages_directory;

            const result = validator.validate(config);
            // Should not have error for missing packages_directory (it's optional)
            const packagesError = result.errors.find(e => e.field === 'structure.packages_directory');
            assert.strictEqual(packagesError, undefined, 'Optional packages_directory should not cause error');
        });
    });

    /**
     * Test Suite 6: Testing Config Validation
     */
    suite('Test 6: Testing configuration validation', () => {
        test('should reject coverage percentage > 100', () => {
            const config = {
                ...DEFAULT_CONFIG,
                testing: {
                    ...DEFAULT_CONFIG.testing,
                    coverage_infrastructure: 150
                }
            };

            const result = validator.validate(config);
            assert.strictEqual(result.valid, false);
            assert.ok(result.errors.some(e => e.field === 'testing.coverage_infrastructure' && e.message.includes('0 and 100')));
        });

        test('should reject negative coverage percentage', () => {
            const config = {
                ...DEFAULT_CONFIG,
                testing: {
                    ...DEFAULT_CONFIG.testing,
                    coverage_api: -10
                }
            };

            const result = validator.validate(config);
            assert.strictEqual(result.valid, false);
            assert.ok(result.errors.some(e => e.field === 'testing.coverage_api'));
        });

        test('should accept coverage values 0-100', () => {
            const config = {
                ...DEFAULT_CONFIG,
                testing: {
                    ...DEFAULT_CONFIG.testing,
                    coverage_infrastructure: 95,
                    coverage_api: 80,
                    coverage_ui: 0 // Edge case: 0% coverage
                }
            };

            const result = validator.validate(config);
            const coverageErrors = result.errors.filter(e => e.field.startsWith('testing.coverage_'));
            assert.strictEqual(coverageErrors.length, 0, 'Valid coverage values should not cause errors');
        });
    });

    /**
     * Test Suite 7: Performance Config Validation
     */
    suite('Test 7: Performance configuration validation', () => {
        test('should reject negative performance targets', () => {
            const config = {
                ...DEFAULT_CONFIG,
                performance: {
                    ...DEFAULT_CONFIG.performance,
                    workflow_check_ms: -100
                }
            };

            const result = validator.validate(config);
            assert.strictEqual(result.valid, false);
            assert.ok(result.errors.some(e => e.field === 'performance.workflow_check_ms' && e.message.includes('positive')));
        });

        test('should reject zero performance targets', () => {
            const config = {
                ...DEFAULT_CONFIG,
                performance: {
                    ...DEFAULT_CONFIG.performance,
                    compile_time_s: 0
                }
            };

            const result = validator.validate(config);
            assert.strictEqual(result.valid, false);
            assert.ok(result.errors.some(e => e.field === 'performance.compile_time_s'));
        });

        test('should accept positive performance targets', () => {
            const config = {
                ...DEFAULT_CONFIG,
                performance: {
                    workflow_check_ms: 1000,
                    agent_assignment_ms: 100,
                    confidence_scoring_ms: 200,
                    test_validation_ms: 300,
                    extension_activation_ms: 500,
                    compile_time_s: 20
                }
            };

            const result = validator.validate(config);
            const perfErrors = result.errors.filter(e => e.field.startsWith('performance.'));
            assert.strictEqual(perfErrors.length, 0, 'Valid performance values should not cause errors');
        });
    });

    /**
     * Test Suite 8: Publishing Config Validation
     */
    suite('Test 8: Publishing configuration validation', () => {
        test('should reject invalid package_registry', () => {
            const config = {
                ...DEFAULT_CONFIG,
                publishing: {
                    ...DEFAULT_CONFIG.publishing,
                    package_registry: 'invalid' as any
                }
            };

            const result = validator.validate(config);
            assert.strictEqual(result.valid, false);
            assert.ok(result.errors.some(e => e.field === 'publishing.package_registry'));
        });

        test('should reject invalid version_format', () => {
            const config = {
                ...DEFAULT_CONFIG,
                publishing: {
                    ...DEFAULT_CONFIG.publishing,
                    version_format: 'invalid' as any
                }
            };

            const result = validator.validate(config);
            assert.strictEqual(result.valid, false);
            assert.ok(result.errors.some(e => e.field === 'publishing.version_format'));
        });

        test('should accept empty package_names array', () => {
            const config = {
                ...DEFAULT_CONFIG,
                publishing: {
                    ...DEFAULT_CONFIG.publishing,
                    package_names: []
                }
            };

            const result = validator.validate(config);
            const packageNamesError = result.errors.find(e => e.field === 'publishing.package_names' && e.message.includes('non-empty'));
            assert.strictEqual(packageNamesError, undefined, 'Empty package_names should be allowed');
        });
    });

    /**
     * Test Suite 9: Git Workflow Config Validation
     */
    suite('Test 9: Git workflow configuration validation', () => {
        test('should reject empty main_branch', () => {
            const config = {
                ...DEFAULT_CONFIG,
                git_workflow: {
                    ...DEFAULT_CONFIG.git_workflow,
                    main_branch: ''
                }
            };

            const result = validator.validate(config);
            assert.strictEqual(result.valid, false);
            assert.ok(result.errors.some(e => e.field === 'git_workflow.main_branch'));
        });

        test('should reject invalid commit_format', () => {
            const config = {
                ...DEFAULT_CONFIG,
                git_workflow: {
                    ...DEFAULT_CONFIG.git_workflow,
                    commit_format: 'invalid' as any
                }
            };

            const result = validator.validate(config);
            assert.strictEqual(result.valid, false);
            assert.ok(result.errors.some(e => e.field === 'git_workflow.commit_format'));
        });

        test('should reject non-boolean enforce flags', () => {
            const config = {
                ...DEFAULT_CONFIG,
                git_workflow: {
                    ...DEFAULT_CONFIG.git_workflow,
                    enforce_tests_on_commit: 'yes' as any
                }
            };

            const result = validator.validate(config);
            assert.strictEqual(result.valid, false);
            assert.ok(result.errors.some(e => e.field === 'git_workflow.enforce_tests_on_commit' && e.message.includes('boolean')));
        });
    });

    /**
     * Test Suite 10: Framework Config Validation
     */
    suite('Test 10: Framework configuration validation', () => {
        test('should reject invalid framework_type', () => {
            const config = {
                ...DEFAULT_CONFIG,
                framework: {
                    framework_type: 'invalid' as any
                }
            };

            const result = validator.validate(config);
            assert.strictEqual(result.valid, false);
            assert.ok(result.errors.some(e => e.field === 'framework.framework_type'));
        });

        test('should reject invalid vscode_api_version format', () => {
            const config = {
                ...DEFAULT_CONFIG,
                framework: {
                    framework_type: 'vscode-extension',
                    vscode_api_version: 'invalid-version'
                }
            };

            const result = validator.validate(config);
            assert.strictEqual(result.valid, false);
            assert.ok(result.errors.some(e => e.field === 'framework.vscode_api_version'));
        });

        test('should accept valid vscode_api_version formats', () => {
            const validVersions = ['^1.80.0', '~1.80.0', '>=1.80.0', '1.80.0'];

            validVersions.forEach(version => {
                const config = {
                    ...DEFAULT_CONFIG,
                    framework: {
                        framework_type: 'vscode-extension',
                        vscode_api_version: version
                    }
                };

                const result = validator.validate(config);
                const versionError = result.errors.find(e => e.field === 'framework.vscode_api_version');
                assert.strictEqual(versionError, undefined, 'Version ' + version + ' should be valid');
            });
        });

        test('should reject invalid nodejs_version format', () => {
            const config = {
                ...DEFAULT_CONFIG,
                framework: {
                    nodejs_version: 'invalid'
                }
            };

            const result = validator.validate(config);
            assert.strictEqual(result.valid, false);
            assert.ok(result.errors.some(e => e.field === 'framework.nodejs_version'));
        });
    });

    /**
     * Test Suite 11: Cross-Field Validation
     */
    suite('Test 11: Cross-field validation', () => {
        test('should warn when Rust project does not use cargo', () => {
            const config = {
                ...DEFAULT_CONFIG,
                language: {
                    ...DEFAULT_CONFIG.language,
                    language: 'rust',
                    package_manager: 'npm' as any
                }
            };

            const result = validator.validate(config);
            assert.strictEqual(result.valid, false);
            assert.ok(result.errors.some(e => e.field === 'language.package_manager' && e.message.includes('cargo')));
        });

        test('should warn when TypeScript project uses cargo', () => {
            const config = {
                ...DEFAULT_CONFIG,
                language: {
                    ...DEFAULT_CONFIG.language,
                    language: 'typescript',
                    package_manager: 'cargo' as any
                }
            };

            const result = validator.validate(config);
            assert.strictEqual(result.valid, false);
            assert.ok(result.errors.some(e => e.field === 'language.package_manager' && e.message.includes('npm')));
        });

        test('should require vscode_api_version for vscode-extension framework', () => {
            const config = {
                ...DEFAULT_CONFIG,
                framework: {
                    framework_type: 'vscode-extension'
                    // Missing vscode_api_version
                }
            };

            const result = validator.validate(config);
            assert.strictEqual(result.valid, false);
            assert.ok(result.errors.some(e => e.field === 'framework.vscode_api_version'));
        });
    });

    /**
     * Test Suite 12: Edge Cases
     */
    suite('Test 12: Edge cases', () => {
        test('should reject null config', () => {
            const result = validator.validate(null);
            assert.strictEqual(result.valid, false);
            assert.ok(result.errors.some(e => e.field === 'config'));
        });

        test('should reject undefined config', () => {
            const result = validator.validate(undefined);
            assert.strictEqual(result.valid, false);
            assert.ok(result.errors.some(e => e.field === 'config'));
        });

        test('should reject empty object', () => {
            const result = validator.validate({});
            assert.strictEqual(result.valid, false);
            assert.ok(result.errors.length > 0, 'Empty object should have validation errors');
        });

        test('should handle multiple validation errors', () => {
            const config = {
                schema_version: 'invalid',
                project_name: '',
                language: {
                    language: 'invalid',
                    file_extensions: [],
                    build_command: '',
                    test_command: '',
                    package_manager: 'invalid',
                    test_framework: 'invalid'
                }
            };

            const result = validator.validate(config);
            assert.strictEqual(result.valid, false);
            assert.ok(result.errors.length >= 5, 'Should have multiple validation errors');
        });
    });
});
