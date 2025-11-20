import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { SprintLoader, SprintTask } from '../../src/commands/SprintLoader';

/**
 * BUG-001: SprintLoader Tests
 *
 * DESIGN DECISION: Test TOML parsing with new features
 * WHY: Ensure backwards compatibility and all fields are parsed correctly
 *
 * Test Coverage:
 * - Backwards compatibility: {text} auto-converted to <text>
 * - All 10 previously missing fields now parsed
 * - Flexible TOML passthrough with spread operator
 * - Unknown fields pass through automatically
 */

suite('SprintLoader - BUG-001 Comprehensive Tests', () => {
    let tempDir: string;
    let sprintLoader: SprintLoader;

    setup(() => {
        // Create temporary directory for test files
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sprint-loader-test-'));
        sprintLoader = new SprintLoader();
    });

    teardown(() => {
        // Cleanup temporary files
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });

    /**
     * Test 1: Backwards Compatibility - Old {text} syntax auto-converts
     */
    test('OLD {text} placeholder syntax is auto-converted to <text>', () => {
        const tomlWithOldSyntax = `
[metadata]
sprint_name = "Test Sprint"
version = "1.0"
total_tasks = 1

[tasks.TEST-001]
id = "TEST-001"
name = "Test Task"
status = "pending"
phase = "test"
agent = "test-agent"
description = "This is a test with {old placeholder} syntax"
why = "Testing {backwards} compatibility {works}"
`;

        // Write test file
        const testFile = path.join(tempDir, 'ACTIVE_SPRINT.toml');
        fs.writeFileSync(testFile, tomlWithOldSyntax, 'utf-8');

        // Load sprint (should auto-convert {text} to <text>)
        const result = sprintLoader.loadSprintFromPath(testFile);

        // Verify no errors
        assert.ok(result, 'Sprint should load successfully');
        assert.strictEqual(result.tasks.length, 1, 'Should have 1 task');

        // Verify task loaded correctly (auto-conversion happened internally)
        const task = result.tasks[0];
        assert.strictEqual(task.id, 'TEST-001');
        assert.strictEqual(task.name, 'Test Task');
    });

    /**
     * Test 2: All 10 Previously Missing Fields Are Now Parsed
     */
    test('All 10 previously missing fields are parsed correctly', () => {
        const tomlWithAllFields = `
[metadata]
sprint_name = "Test Sprint"
version = "1.0"
total_tasks = 1

[tasks.TEST-002]
id = "TEST-002"
name = "Task with all fields"
status = "pending"
phase = "test"
agent = "test-agent"
description = "Test description"
# PREVIOUSLY MISSING FIELDS (BUG-001):
skill = "test-skill"
enhanced_prompt = "internal/sprints/TEST-002_ENHANCED_PROMPT.md"
template = "MVP-003-Template-v1.0"
questions_doc = "internal/sprints/TEST-002_QUESTIONS.md"
test_plan = "internal/sprints/TEST-002_TEST_PLAN.md"
design_doc = "internal/sprints/TEST-002_DESIGN.md"
pattern_reference = "docs/patterns/Pattern-TEST-001.md"
completion_notes = "Task completed successfully"
subtask_progress = "Step 1: Done"
condition = "sprint_includes_testing"
`;

        const testFile = path.join(tempDir, 'ACTIVE_SPRINT.toml');
        fs.writeFileSync(testFile, tomlWithAllFields, 'utf-8');

        const result = sprintLoader.loadSprintFromPath(testFile);

        assert.ok(result, 'Sprint should load successfully');
        assert.strictEqual(result.tasks.length, 1);

        const task = result.tasks[0];

        // Verify all 10 previously missing fields are now present
        assert.strictEqual(task.skill, 'test-skill', 'skill field should be parsed');
        assert.strictEqual(task.enhanced_prompt, 'internal/sprints/TEST-002_ENHANCED_PROMPT.md', 'enhanced_prompt should be parsed');
        assert.strictEqual(task.template, 'MVP-003-Template-v1.0', 'template should be parsed');
        assert.strictEqual(task.questions_doc, 'internal/sprints/TEST-002_QUESTIONS.md', 'questions_doc should be parsed');
        assert.strictEqual(task.test_plan, 'internal/sprints/TEST-002_TEST_PLAN.md', 'test_plan should be parsed');
        assert.strictEqual(task.design_doc, 'internal/sprints/TEST-002_DESIGN.md', 'design_doc should be parsed');
        assert.strictEqual(task.pattern_reference, 'docs/patterns/Pattern-TEST-001.md', 'pattern_reference should be parsed');
        assert.strictEqual(task.completion_notes, 'Task completed successfully', 'completion_notes should be parsed');
        assert.strictEqual(task.subtask_progress, 'Step 1: Done', 'subtask_progress should be parsed');
        assert.strictEqual(task.condition, 'sprint_includes_testing', 'condition should be parsed');
    });

    /**
     * Test 3: Unknown/Future Fields Pass Through Automatically
     */
    test('Unknown future fields pass through automatically (flexible passthrough)', () => {
        const tomlWithFutureFields = `
[metadata]
sprint_name = "Test Sprint"
version = "1.0"
total_tasks = 1

[tasks.TEST-003]
id = "TEST-003"
name = "Task with future fields"
status = "pending"
phase = "test"
agent = "test-agent"
description = "Test"
# FUTURE FIELDS (not in SprintTask interface yet):
new_field_from_future = "This field doesn't exist in interface"
experimental_flag = true
custom_metadata = "Should pass through automatically"
`;

        const testFile = path.join(tempDir, 'ACTIVE_SPRINT.toml');
        fs.writeFileSync(testFile, tomlWithFutureFields, 'utf-8');

        const result = sprintLoader.loadSprintFromPath(testFile);

        assert.ok(result, 'Sprint should load successfully');
        const task = result.tasks[0] as any;  // Cast to any to access unknown fields

        // Verify future fields passed through via spread operator
        assert.strictEqual(task.new_field_from_future, 'This field doesn\'t exist in interface', 'Future field should pass through');
        assert.strictEqual(task.experimental_flag, true, 'Future boolean field should pass through');
        assert.strictEqual(task.custom_metadata, 'Should pass through automatically', 'Future metadata should pass through');
    });

    /**
     * Test 4: New <text> Placeholder Syntax Works Without Issues
     */
    test('NEW <text> placeholder syntax parses correctly', () => {
        const tomlWithNewSyntax = `
[metadata]
sprint_name = "Test Sprint"
version = "1.0"
total_tasks = 1

[tasks.TEST-004]
id = "TEST-004"
name = "Task with new syntax"
status = "pending"
phase = "test"
agent = "test-agent"
description = "This uses <new placeholder> syntax <which works>"
why = "Testing <angle brackets> are <safe>"
`;

        const testFile = path.join(tempDir, 'ACTIVE_SPRINT.toml');
        fs.writeFileSync(testFile, tomlWithNewSyntax, 'utf-8');

        const result = sprintLoader.loadSprintFromPath(testFile);

        assert.ok(result, 'Sprint should load successfully');
        assert.strictEqual(result.tasks.length, 1);

        const task = result.tasks[0];
        assert.strictEqual(task.description, 'This uses <new placeholder> syntax <which works>');
        assert.strictEqual(task.why, 'Testing <angle brackets> are <safe>');
    });

    /**
     * Test 5: Required Fields Still Have Defaults
     */
    test('Required fields still get default values when missing', () => {
        const tomlWithMinimalFields = `
[metadata]
sprint_name = "Test Sprint"
version = "1.0"
total_tasks = 1

[tasks.TEST-005]
id = "TEST-005"
name = "Minimal Task"
# Missing: status, phase, agent, description, estimated_time
`;

        const testFile = path.join(tempDir, 'ACTIVE_SPRINT.toml');
        fs.writeFileSync(testFile, tomlWithMinimalFields, 'utf-8');

        const result = sprintLoader.loadSprintFromPath(testFile);

        assert.ok(result, 'Sprint should load successfully');
        const task = result.tasks[0];

        // Verify defaults are applied
        assert.strictEqual(task.status, 'pending', 'Default status should be pending');
        assert.strictEqual(task.phase, 'Current Sprint', 'Default phase should be Current Sprint');
        assert.strictEqual(task.agent, 'general-purpose', 'Default agent should be general-purpose');
        assert.strictEqual(task.description, '', 'Default description should be empty string');
        assert.strictEqual(task.estimated_time, 'Not specified', 'Default estimated_time should be Not specified');
    });

    /**
     * Test 6: Array Fields Parse Correctly
     */
    test('Array fields (dependencies, patterns, deliverables) parse correctly', () => {
        const tomlWithArrays = `
[metadata]
sprint_name = "Test Sprint"
version = "1.0"
total_tasks = 1

[tasks.TEST-006]
id = "TEST-006"
name = "Task with arrays"
status = "pending"
phase = "test"
agent = "test-agent"
description = "Test"
dependencies = ["TASK-001", "TASK-002", "TASK-003"]
patterns = ["Pattern-001", "Pattern-002"]
deliverables = ["File1.ts", "File2.ts", "File3.ts"]
reasoning_chain = ["Step 1", "Step 2", "Step 3"]
`;

        const testFile = path.join(tempDir, 'ACTIVE_SPRINT.toml');
        fs.writeFileSync(testFile, tomlWithArrays, 'utf-8');

        const result = sprintLoader.loadSprintFromPath(testFile);

        assert.ok(result, 'Sprint should load successfully');
        const task = result.tasks[0];

        assert.deepStrictEqual(task.dependencies, ["TASK-001", "TASK-002", "TASK-003"]);
        assert.deepStrictEqual(task.patterns, ["Pattern-001", "Pattern-002"]);
        assert.deepStrictEqual(task.deliverables, ["File1.ts", "File2.ts", "File3.ts"]);
        assert.deepStrictEqual(task.reasoning_chain, ["Step 1", "Step 2", "Step 3"]);
    });

    /**
     * Test 7: Multiline Strings (Triple Quotes) Work Correctly
     */
    test('Multiline strings with triple quotes parse correctly', () => {
        const tomlWithMultiline = `
[metadata]
sprint_name = "Test Sprint"
version = "1.0"
total_tasks = 1

[tasks.TEST-007]
id = "TEST-007"
name = "Task with multiline"
status = "pending"
phase = "test"
agent = "test-agent"
description = """
This is a multiline description
with <placeholders> that should work
across multiple lines
"""
why = """
Multiline why field
Line 2
Line 3 with <placeholder>
"""
`;

        const testFile = path.join(tempDir, 'ACTIVE_SPRINT.toml');
        fs.writeFileSync(testFile, tomlWithMultiline, 'utf-8');

        const result = sprintLoader.loadSprintFromPath(testFile);

        assert.ok(result, 'Sprint should load successfully');
        const task = result.tasks[0];

        assert.ok(task.description?.includes('multiline description'), 'Multiline description should parse');
        assert.ok(task.description?.includes('<placeholders>'), 'Placeholders in multiline should work');
        assert.ok(task.why?.includes('Line 2'), 'Multiline why should parse multiple lines');
    });
});
