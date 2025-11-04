/**
 * Sprint Schema Validator Tests
 *
 * TDD: These tests should have been written FIRST (RED phase)
 * Then implementation (GREEN phase)
 *
 * Pattern: Pattern-TDD-001 (Test-Driven Development Ratchet)
 * Related: VAL-001, SprintSchemaValidator.ts
 */

import * as assert from 'assert';
import { SprintSchemaValidator, ValidationResult } from '../../services/SprintSchemaValidator';

suite('SprintSchemaValidator', () => {
    let validator: SprintSchemaValidator;

    setup(() => {
        validator = new SprintSchemaValidator();
    });

    suite('Rule 1: Tasks Section Validation', () => {
        test('should pass when tasks section exists', () => {
            const toml = `
[meta]
sprint_name = "Test Sprint"

[tasks.TEST-001]
id = "TEST-001"
name = "Test Task"
status = "pending"
phase = "phase_0"
agent = "test-agent"
`;
            const result = validator.validate(toml);
            assert.strictEqual(result.valid, true);
        });

        test('should fail when tasks section missing', () => {
            const toml = `
[meta]
sprint_name = "Test Sprint"
`;
            const result = validator.validate(toml);
            assert.strictEqual(result.valid, false);
            assert.ok(result.error?.includes('No [tasks] section found'));
            assert.ok(result.suggestions && result.suggestions.length > 0);
        });

        test('should fail when tasks section is empty', () => {
            const toml = `
[meta]
sprint_name = "Test Sprint"

[tasks]
`;
            const result = validator.validate(toml);
            assert.strictEqual(result.valid, false);
            assert.ok(result.error?.includes('empty [tasks] section'));
        });
    });

    suite('Rule 2: Reject [[epic.*.tasks]] Format', () => {
        test('should fail when epic format is used', () => {
            const toml = `
[meta]
sprint_name = "Test Sprint"

[[epic.middleware.tasks]]
id = "MID-001"
name = "Middleware Task"
status = "pending"
phase = "phase_0"
agent = "test-agent"
`;
            const result = validator.validate(toml);
            assert.strictEqual(result.valid, false);
            assert.ok(result.error?.includes('[[epic.*.tasks]] not supported'));
            assert.ok(result.suggestions && result.suggestions.length > 0);
            assert.ok(result.suggestions.some(s => s.includes('[tasks.ID]')));
        });

        test('should pass when using correct [tasks.ID] format', () => {
            const toml = `
[meta]
sprint_name = "Test Sprint"

[tasks.MID-001]
id = "MID-001"
name = "Middleware Task"
status = "pending"
phase = "phase_0"
agent = "test-agent"
`;
            const result = validator.validate(toml);
            assert.strictEqual(result.valid, true);
        });
    });

    suite('Rule 3: Required Fields Validation', () => {
        test('should pass when all required fields present', () => {
            const toml = `
[tasks.TEST-001]
id = "TEST-001"
name = "Test Task"
status = "pending"
phase = "phase_0"
agent = "test-agent"
`;
            const result = validator.validate(toml);
            assert.strictEqual(result.valid, true);
        });

        test('should fail when id field missing', () => {
            const toml = `
[tasks.TEST-001]
name = "Test Task"
status = "pending"
phase = "phase_0"
agent = "test-agent"
`;
            const result = validator.validate(toml);
            assert.strictEqual(result.valid, false);
            assert.ok(result.error?.includes('missing required fields'));
            assert.ok(result.error?.includes('id'));
        });

        test('should fail when name field missing', () => {
            const toml = `
[tasks.TEST-001]
id = "TEST-001"
status = "pending"
phase = "phase_0"
agent = "test-agent"
`;
            const result = validator.validate(toml);
            assert.strictEqual(result.valid, false);
            assert.ok(result.error?.includes('missing required fields'));
            assert.ok(result.error?.includes('name'));
        });

        test('should fail when status field missing', () => {
            const toml = `
[tasks.TEST-001]
id = "TEST-001"
name = "Test Task"
phase = "phase_0"
agent = "test-agent"
`;
            const result = validator.validate(toml);
            assert.strictEqual(result.valid, false);
            assert.ok(result.error?.includes('missing required fields'));
            assert.ok(result.error?.includes('status'));
        });

        test('should fail when phase field missing', () => {
            const toml = `
[tasks.TEST-001]
id = "TEST-001"
name = "Test Task"
status = "pending"
agent = "test-agent"
`;
            const result = validator.validate(toml);
            assert.strictEqual(result.valid, false);
            assert.ok(result.error?.includes('missing required fields'));
            assert.ok(result.error?.includes('phase'));
        });

        test('should fail when agent field missing', () => {
            const toml = `
[tasks.TEST-001]
id = "TEST-001"
name = "Test Task"
status = "pending"
phase = "phase_0"
`;
            const result = validator.validate(toml);
            assert.strictEqual(result.valid, false);
            assert.ok(result.error?.includes('missing required fields'));
            assert.ok(result.error?.includes('agent'));
        });

        test('should fail when multiple fields missing', () => {
            const toml = `
[tasks.TEST-001]
id = "TEST-001"
name = "Test Task"
`;
            const result = validator.validate(toml);
            assert.strictEqual(result.valid, false);
            assert.ok(result.error?.includes('missing required fields'));
            assert.ok(result.error?.includes('status'));
            assert.ok(result.error?.includes('phase'));
            assert.ok(result.error?.includes('agent'));
        });
    });

    suite('Rule 3b: Status Value Validation', () => {
        test('should pass with status "pending"', () => {
            const toml = `
[tasks.TEST-001]
id = "TEST-001"
name = "Test Task"
status = "pending"
phase = "phase_0"
agent = "test-agent"
`;
            const result = validator.validate(toml);
            assert.strictEqual(result.valid, true);
        });

        test('should pass with status "in_progress"', () => {
            const toml = `
[tasks.TEST-001]
id = "TEST-001"
name = "Test Task"
status = "in_progress"
phase = "phase_0"
agent = "test-agent"
`;
            const result = validator.validate(toml);
            assert.strictEqual(result.valid, true);
        });

        test('should pass with status "completed"', () => {
            const toml = `
[tasks.TEST-001]
id = "TEST-001"
name = "Test Task"
status = "completed"
phase = "phase_0"
agent = "test-agent"
`;
            const result = validator.validate(toml);
            assert.strictEqual(result.valid, true);
        });

        test('should fail with invalid status', () => {
            const toml = `
[tasks.TEST-001]
id = "TEST-001"
name = "Test Task"
status = "active"
phase = "phase_0"
agent = "test-agent"
`;
            const result = validator.validate(toml);
            assert.strictEqual(result.valid, false);
            assert.ok(result.error?.includes('invalid status'));
            assert.ok(result.error?.includes('active'));
            assert.ok(result.suggestions && result.suggestions.length > 0);
        });

        test('should fail with status "done" (common mistake)', () => {
            const toml = `
[tasks.TEST-001]
id = "TEST-001"
name = "Test Task"
status = "done"
phase = "phase_0"
agent = "test-agent"
`;
            const result = validator.validate(toml);
            assert.strictEqual(result.valid, false);
            assert.ok(result.error?.includes('invalid status'));
            assert.ok(result.suggestions?.some(s => s.includes('pending')));
        });
    });

    suite('Rule 4: Circular Dependency Detection', () => {
        test('should pass with no dependencies', () => {
            const toml = `
[tasks.TEST-001]
id = "TEST-001"
name = "Test Task"
status = "pending"
phase = "phase_0"
agent = "test-agent"
`;
            const result = validator.validate(toml);
            assert.strictEqual(result.valid, true);
        });

        test('should pass with linear dependencies', () => {
            const toml = `
[tasks.TEST-001]
id = "TEST-001"
name = "Task 1"
status = "pending"
phase = "phase_0"
agent = "test-agent"
dependencies = []

[tasks.TEST-002]
id = "TEST-002"
name = "Task 2"
status = "pending"
phase = "phase_0"
agent = "test-agent"
dependencies = ["TEST-001"]

[tasks.TEST-003]
id = "TEST-003"
name = "Task 3"
status = "pending"
phase = "phase_0"
agent = "test-agent"
dependencies = ["TEST-002"]
`;
            const result = validator.validate(toml);
            assert.strictEqual(result.valid, true);
        });

        test('should fail with simple circular dependency (A -> B -> A)', () => {
            const toml = `
[tasks.TEST-001]
id = "TEST-001"
name = "Task 1"
status = "pending"
phase = "phase_0"
agent = "test-agent"
dependencies = ["TEST-002"]

[tasks.TEST-002]
id = "TEST-002"
name = "Task 2"
status = "pending"
phase = "phase_0"
agent = "test-agent"
dependencies = ["TEST-001"]
`;
            const result = validator.validate(toml);
            assert.strictEqual(result.valid, false);
            assert.ok(result.error?.includes('Circular dependency detected'));
            assert.ok(result.suggestions && result.suggestions.length > 0);
        });

        test('should fail with complex circular dependency (A -> B -> C -> A)', () => {
            const toml = `
[tasks.TEST-001]
id = "TEST-001"
name = "Task 1"
status = "pending"
phase = "phase_0"
agent = "test-agent"
dependencies = ["TEST-003"]

[tasks.TEST-002]
id = "TEST-002"
name = "Task 2"
status = "pending"
phase = "phase_0"
agent = "test-agent"
dependencies = ["TEST-001"]

[tasks.TEST-003]
id = "TEST-003"
name = "Task 3"
status = "pending"
phase = "phase_0"
agent = "test-agent"
dependencies = ["TEST-002"]
`;
            const result = validator.validate(toml);
            assert.strictEqual(result.valid, false);
            assert.ok(result.error?.includes('Circular dependency detected'));
        });

        test('should pass with diamond dependency (A -> B,C -> D)', () => {
            const toml = `
[tasks.TEST-001]
id = "TEST-001"
name = "Task 1"
status = "pending"
phase = "phase_0"
agent = "test-agent"
dependencies = []

[tasks.TEST-002]
id = "TEST-002"
name = "Task 2"
status = "pending"
phase = "phase_0"
agent = "test-agent"
dependencies = ["TEST-001"]

[tasks.TEST-003]
id = "TEST-003"
name = "Task 3"
status = "pending"
phase = "phase_0"
agent = "test-agent"
dependencies = ["TEST-001"]

[tasks.TEST-004]
id = "TEST-004"
name = "Task 4"
status = "pending"
phase = "phase_0"
agent = "test-agent"
dependencies = ["TEST-002", "TEST-003"]
`;
            const result = validator.validate(toml);
            assert.strictEqual(result.valid, true);
        });
    });

    suite('Rule 5: ID Consistency Validation', () => {
        test('should pass when id matches section key', () => {
            const toml = `
[tasks.TEST-001]
id = "TEST-001"
name = "Test Task"
status = "pending"
phase = "phase_0"
agent = "test-agent"
`;
            const result = validator.validate(toml);
            assert.strictEqual(result.valid, true);
        });

        test('should fail when id does not match section key', () => {
            const toml = `
[tasks.TEST-001]
id = "TEST-002"
name = "Test Task"
status = "pending"
phase = "phase_0"
agent = "test-agent"
`;
            const result = validator.validate(toml);
            assert.strictEqual(result.valid, false);
            assert.ok(result.error?.includes("doesn't match section key"));
            assert.ok(result.error?.includes('TEST-001'));
            assert.ok(result.error?.includes('TEST-002'));
        });
    });

    suite('TOML Parse Errors', () => {
        test('should fail with invalid TOML syntax', () => {
            const toml = `
[tasks.TEST-001
id = "TEST-001"
`;
            const result = validator.validate(toml);
            assert.strictEqual(result.valid, false);
            assert.ok(result.error?.includes('TOML parse error'));
            assert.ok(result.suggestions && result.suggestions.length > 0);
        });

        test('should fail with invalid escape sequence (backtick)', () => {
            const toml = `
[tasks.TEST-001]
id = "TEST-001"
name = "Test \`backtick\`"
status = "pending"
phase = "phase_0"
agent = "test-agent"
`;
            const result = validator.validate(toml);
            assert.strictEqual(result.valid, false);
            assert.ok(result.error?.includes('TOML parse error'));
        });
    });

    suite('Complete Sprint File Validation', () => {
        test('should pass with realistic sprint file', () => {
            const toml = `
[meta]
sprint_name = "Test Sprint"
version = "0.16.0"
status = "active"
total_tasks = 2

[tasks.PROTO-001]
id = "PROTO-001"
name = "Universal Workflow Check"
phase = "phase_0"
assigned_engineer = "engineer_1"
status = "completed"
agent = "infrastructure-agent"
dependencies = []

[tasks.PROTO-002]
id = "PROTO-002"
name = "Update CLAUDE.md"
phase = "phase_0"
assigned_engineer = "engineer_1"
status = "in_progress"
agent = "documentation-agent"
dependencies = ["PROTO-001"]
`;
            const result = validator.validate(toml);
            assert.strictEqual(result.valid, true);
        });
    });
});
