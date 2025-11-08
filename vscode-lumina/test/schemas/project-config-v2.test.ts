/**
 * Tests for project-config v2.0 schema (with discovery fields)
 *
 * DESIGN DECISION: TDD approach - tests written BEFORE schema implementation
 * WHY: Ensures schema meets requirements, prevents regressions
 *
 * TEST STRATEGY:
 * 1. Schema loads successfully with ajv
 * 2. Complete v2 config validates (all discovery fields present)
 * 3. Partial v2 config validates (discovery fields optional)
 * 4. v1 config validates (backward compatibility)
 * 5. Invalid configs rejected with clear errors
 *
 * COVERAGE TARGET: 90% (infrastructure-agent requirement)
 * PATTERN: Pattern-TDD-001 (RED → GREEN → REFACTOR)
 * RELATED: SELF-003B (Extend config schema with discovery fields)
 */

import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import Ajv from 'ajv';

describe('ProjectConfig v2.0 Schema (Discovery Fields)', () => {
    let ajv: Ajv;
    let schema: any;
    const schemaPath = path.join(__dirname, '../../../.aetherlight/schemas/project-config-v2.json');

    beforeEach(() => {
        // Initialize ajv with JSON Schema Draft 7
        ajv = new Ajv({ strict: false });
    });

    describe('Schema Loading', () => {
        it('should load v2 schema file successfully', () => {
            assert.ok(fs.existsSync(schemaPath), 'Schema file should exist at .aetherlight/schemas/project-config-v2.json');

            const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
            schema = JSON.parse(schemaContent);

            assert.ok(schema, 'Schema should parse as valid JSON');
            assert.strictEqual(schema.$schema, 'http://json-schema.org/draft-07/schema#', 'Should use JSON Schema Draft 7');
        });

        it('should compile v2 schema with ajv', () => {
            const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
            schema = JSON.parse(schemaContent);

            const validate = ajv.compile(schema);
            assert.ok(validate, 'Schema should compile successfully');
        });
    });

    describe('Complete v2 Config Validation', () => {
        it('should validate v2 config with all discovery fields', () => {
            const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
            schema = JSON.parse(schemaContent);
            const validate = ajv.compile(schema);

            const completeV2Config = {
                $schema: 'https://aetherlight.dev/schemas/project-config-v2.json',
                version: '2.0.0',
                project: {
                    name: 'test-project',
                    type: 'library',
                    description: 'Test project'
                },
                structure: {
                    sprintDir: 'sprints',
                    activeSprint: 'ACTIVE_SPRINT.toml',
                    patternsDir: 'docs/patterns',
                    testsDir: 'test',
                    sourceDir: 'src'
                },
                testing: {
                    framework: 'mocha',
                    runner: 'npm test',
                    coverage: {
                        infrastructure: 90,
                        api: 85,
                        ui: 70
                    }
                },
                workflows: {
                    preFlightChecklistPath: '.claude/CLAUDE.md',
                    preFlightSections: [],
                    patternsDir: 'docs/patterns',
                    requiredPatterns: ['Pattern-CODE-001']
                },
                git: {
                    mainBranch: 'main',
                    commitMessageFormat: 'conventional',
                    preCommitHooks: true
                },
                // NEW v2.0 discovery fields:
                skills: [
                    {
                        id: 'publish',
                        intent: 'Publish release to npm',
                        description: 'Automated release pipeline',
                        path: '.claude/skills/publish.md',
                        enabled: true
                    }
                ],
                discoveredAgents: {
                    'infrastructure-agent': {
                        id: 'infrastructure-agent',
                        name: 'Infrastructure Agent',
                        expertise: ['services', 'utilities'],
                        description: 'Handles infrastructure code',
                        path: 'internal/agents/infrastructure-agent.md',
                        coverage_target: 90
                    }
                },
                discoveredPatterns: [
                    {
                        id: 'Pattern-CODE-001',
                        name: 'Code Development Workflow',
                        category: 'CODE',
                        purpose: '8-step workflow for writing code',
                        path: 'docs/patterns/Pattern-CODE-001.md',
                        required: true
                    }
                ],
                workspace: {
                    root: '/home/user/project',
                    gitBranch: 'main',
                    gitStatus: 'clean',
                    lastAnalysis: '2025-01-06T12:34:56Z',
                    analysisVersion: '0.16.15'
                },
                discovery: {
                    version: '2.0.0',
                    lastScan: '2025-01-06T12:34:56Z',
                    capabilitiesHash: 'a3f5c9d2e8b1f4a7c6d3e9b2f5a8c1d4e7b3f6a9c2d5e8b1f4a7c6d3e9b2f5a8',
                    skillsCount: 1,
                    agentsCount: 1,
                    patternsCount: 1,
                    scanDuration: 1250
                }
            };

            const valid = validate(completeV2Config);

            if (!valid) {
                console.error('Validation errors:', validate.errors);
            }

            assert.ok(valid, 'Complete v2 config with all discovery fields should validate');
        });

        it('should validate workspace metadata format', () => {
            const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
            schema = JSON.parse(schemaContent);
            const validate = ajv.compile(schema);

            const configWithWorkspace = {
                $schema: 'https://aetherlight.dev/schemas/project-config-v2.json',
                version: '2.0.0',
                project: { name: 'test', type: 'library', description: 'Test' },
                structure: { sprintDir: 's', activeSprint: 'a.toml', patternsDir: 'p', testsDir: 't', sourceDir: 's' },
                testing: { framework: 'mocha', runner: 'npm test', coverage: { infrastructure: 90, api: 85, ui: 70 } },
                workflows: { preFlightChecklistPath: 'c', preFlightSections: [], patternsDir: 'p', requiredPatterns: [] },
                git: { mainBranch: 'main', commitMessageFormat: 'conventional', preCommitHooks: true },
                workspace: {
                    root: '/home/user/project',
                    gitBranch: 'feature/test',
                    lastAnalysis: '2025-01-06T10:00:00Z'
                }
            };

            const valid = validate(configWithWorkspace);
            assert.ok(valid, 'Config with workspace metadata should validate');
        });

        it('should validate discovery metadata format', () => {
            const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
            schema = JSON.parse(schemaContent);
            const validate = ajv.compile(schema);

            const configWithDiscovery = {
                $schema: 'https://aetherlight.dev/schemas/project-config-v2.json',
                version: '2.0.0',
                project: { name: 'test', type: 'library', description: 'Test' },
                structure: { sprintDir: 's', activeSprint: 'a.toml', patternsDir: 'p', testsDir: 't', sourceDir: 's' },
                testing: { framework: 'mocha', runner: 'npm test', coverage: { infrastructure: 90, api: 85, ui: 70 } },
                workflows: { preFlightChecklistPath: 'c', preFlightSections: [], patternsDir: 'p', requiredPatterns: [] },
                git: { mainBranch: 'main', commitMessageFormat: 'conventional', preCommitHooks: true },
                discovery: {
                    version: '2.0.0',
                    lastScan: '2025-01-06T12:00:00Z',
                    capabilitiesHash: 'a'.repeat(64), // SHA-256 hash (64 hex chars)
                    skillsCount: 10,
                    agentsCount: 9,
                    patternsCount: 77
                }
            };

            const valid = validate(configWithDiscovery);
            assert.ok(valid, 'Config with discovery metadata should validate');
        });
    });

    describe('Partial v2 Config Validation (Optional Fields)', () => {
        it('should validate v2 config without discovery fields (all optional)', () => {
            const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
            schema = JSON.parse(schemaContent);
            const validate = ajv.compile(schema);

            const partialV2Config = {
                $schema: 'https://aetherlight.dev/schemas/project-config-v2.json',
                version: '2.0.0',
                project: {
                    name: 'test-project',
                    type: 'library',
                    description: 'Test project'
                },
                structure: {
                    sprintDir: 'sprints',
                    activeSprint: 'ACTIVE_SPRINT.toml',
                    patternsDir: 'docs/patterns',
                    testsDir: 'test',
                    sourceDir: 'src'
                },
                testing: {
                    framework: 'mocha',
                    runner: 'npm test',
                    coverage: {
                        infrastructure: 90,
                        api: 85,
                        ui: 70
                    }
                },
                workflows: {
                    preFlightChecklistPath: '.claude/CLAUDE.md',
                    preFlightSections: [],
                    patternsDir: 'docs/patterns',
                    requiredPatterns: []
                },
                git: {
                    mainBranch: 'main',
                    commitMessageFormat: 'conventional',
                    preCommitHooks: true
                }
                // NO discovery fields - should still validate
            };

            const valid = validate(partialV2Config);
            assert.ok(valid, 'v2 config without discovery fields should validate (fields are optional)');
        });

        it('should validate v2 config with only some discovery fields', () => {
            const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
            schema = JSON.parse(schemaContent);
            const validate = ajv.compile(schema);

            const partialDiscoveryConfig = {
                $schema: 'https://aetherlight.dev/schemas/project-config-v2.json',
                version: '2.0.0',
                project: { name: 'test', type: 'library', description: 'Test' },
                structure: { sprintDir: 's', activeSprint: 'a.toml', patternsDir: 'p', testsDir: 't', sourceDir: 's' },
                testing: { framework: 'mocha', runner: 'npm test', coverage: { infrastructure: 90, api: 85, ui: 70 } },
                workflows: { preFlightChecklistPath: 'c', preFlightSections: [], patternsDir: 'p', requiredPatterns: [] },
                git: { mainBranch: 'main', commitMessageFormat: 'conventional', preCommitHooks: true },
                // Only skills, no other discovery fields:
                skills: [
                    { id: 'test', intent: 'Test', description: 'Test skill', path: 'test.md' }
                ]
            };

            const valid = validate(partialDiscoveryConfig);
            assert.ok(valid, 'Config with partial discovery fields should validate');
        });
    });

    describe('Backward Compatibility (v1.0 configs)', () => {
        it('should validate v1.0 config against v2.0 schema', () => {
            const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
            schema = JSON.parse(schemaContent);
            const validate = ajv.compile(schema);

            const v1Config = {
                $schema: 'https://aetherlight.dev/schema/config.json',
                version: '1.0.0',
                project: {
                    name: 'legacy-project',
                    type: 'vscode-extension',
                    description: 'Legacy v1 project'
                },
                structure: {
                    sprintDir: 'internal/sprints',
                    activeSprint: 'ACTIVE_SPRINT.toml',
                    patternsDir: 'docs/patterns',
                    testsDir: 'test',
                    sourceDir: 'src'
                },
                testing: {
                    framework: 'mocha',
                    runner: 'npm test',
                    coverage: {
                        infrastructure: 90,
                        api: 85,
                        ui: 70
                    },
                    manualTestingRequired: true,
                    reason: 'VS Code extension'
                },
                workflows: {
                    preFlightChecklistPath: '.claude/CLAUDE.md',
                    preFlightSections: ['Before Modifying ACTIVE_SPRINT.toml'],
                    patternsDir: 'docs/patterns',
                    requiredPatterns: ['Pattern-CODE-001', 'Pattern-TDD-001']
                },
                git: {
                    mainBranch: 'master',
                    commitMessageFormat: 'conventional',
                    preCommitHooks: true
                }
            };

            const valid = validate(v1Config);
            assert.ok(valid, 'v1.0 config should validate against v2.0 schema (backward compatibility)');
        });
    });

    describe('Invalid Config Rejection', () => {
        it('should reject config with invalid version format', () => {
            const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
            schema = JSON.parse(schemaContent);
            const validate = ajv.compile(schema);

            const invalidConfig = {
                $schema: 'https://aetherlight.dev/schemas/project-config-v2.json',
                version: '3.0.0', // Invalid - v2 schema expects 2.x.x
                project: { name: 'test', type: 'library', description: 'Test' },
                structure: { sprintDir: 's', activeSprint: 'a.toml', patternsDir: 'p', testsDir: 't', sourceDir: 's' },
                testing: { framework: 'mocha', runner: 'npm test', coverage: { infrastructure: 90, api: 85, ui: 70 } },
                workflows: { preFlightChecklistPath: 'c', preFlightSections: [], patternsDir: 'p', requiredPatterns: [] },
                git: { mainBranch: 'main', commitMessageFormat: 'conventional', preCommitHooks: true }
            };

            const valid = validate(invalidConfig);
            assert.ok(!valid, 'Config with invalid version format should be rejected');
        });

        it('should reject config with invalid discovery hash format', () => {
            const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
            schema = JSON.parse(schemaContent);
            const validate = ajv.compile(schema);

            const invalidConfig = {
                $schema: 'https://aetherlight.dev/schemas/project-config-v2.json',
                version: '2.0.0',
                project: { name: 'test', type: 'library', description: 'Test' },
                structure: { sprintDir: 's', activeSprint: 'a.toml', patternsDir: 'p', testsDir: 't', sourceDir: 's' },
                testing: { framework: 'mocha', runner: 'npm test', coverage: { infrastructure: 90, api: 85, ui: 70 } },
                workflows: { preFlightChecklistPath: 'c', preFlightSections: [], patternsDir: 'p', requiredPatterns: [] },
                git: { mainBranch: 'main', commitMessageFormat: 'conventional', preCommitHooks: true },
                discovery: {
                    version: '2.0.0',
                    lastScan: '2025-01-06T12:00:00Z',
                    capabilitiesHash: 'invalid', // Should be 64 hex chars (SHA-256)
                    skillsCount: 10
                }
            };

            const valid = validate(invalidConfig);
            assert.ok(!valid, 'Config with invalid hash format should be rejected');
            assert.ok(validate.errors?.some(e => e.message?.includes('pattern')), 'Should report pattern validation error');
        });

        it('should reject config with missing required fields', () => {
            const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
            schema = JSON.parse(schemaContent);
            const validate = ajv.compile(schema);

            const invalidConfig = {
                $schema: 'https://aetherlight.dev/schemas/project-config-v2.json',
                version: '2.0.0',
                project: { name: 'test', type: 'library', description: 'Test' },
                // Missing required 'structure' field
                testing: { framework: 'mocha', runner: 'npm test', coverage: { infrastructure: 90, api: 85, ui: 70 } },
                workflows: { preFlightChecklistPath: 'c', preFlightSections: [], patternsDir: 'p', requiredPatterns: [] },
                git: { mainBranch: 'main', commitMessageFormat: 'conventional', preCommitHooks: true }
            };

            const valid = validate(invalidConfig);
            assert.ok(!valid, 'Config with missing required fields should be rejected');
        });
    });

    describe('Schema Performance', () => {
        it('should validate config in less than 10ms (performance target)', () => {
            const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
            schema = JSON.parse(schemaContent);
            const validate = ajv.compile(schema);

            const testConfig = {
                $schema: 'https://aetherlight.dev/schemas/project-config-v2.json',
                version: '2.0.0',
                project: { name: 'test', type: 'library', description: 'Test' },
                structure: { sprintDir: 's', activeSprint: 'a.toml', patternsDir: 'p', testsDir: 't', sourceDir: 's' },
                testing: { framework: 'mocha', runner: 'npm test', coverage: { infrastructure: 90, api: 85, ui: 70 } },
                workflows: { preFlightChecklistPath: 'c', preFlightSections: [], patternsDir: 'p', requiredPatterns: [] },
                git: { mainBranch: 'main', commitMessageFormat: 'conventional', preCommitHooks: true }
            };

            const startTime = Date.now();
            validate(testConfig);
            const duration = Date.now() - startTime;

            assert.ok(duration < 10, `Validation should complete in <10ms (actual: ${duration}ms)`);
        });
    });
});
