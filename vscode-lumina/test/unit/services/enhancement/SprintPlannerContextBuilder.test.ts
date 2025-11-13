/**
 * SprintPlannerContextBuilder Tests
 *
 * TDD RED Phase: These tests are written BEFORE implementation
 * Expected result: All tests should FAIL until implementation is complete
 *
 * Pattern-TDD-001: RED → GREEN → REFACTOR
 */

import * as assert from 'assert';
import * as vscode from 'vscode';
import { SprintPlannerContextBuilder } from '../../../../src/services/enhancement/SprintPlannerContextBuilder';
import { IContextBuilder } from '../../../../src/interfaces/IContextBuilder';

suite('SprintPlannerContextBuilder Tests', () => {
    let builder: SprintPlannerContextBuilder;
    let mockContext: vscode.ExtensionContext;

    setup(() => {
        // Create mock extension context
        mockContext = {
            extensionPath: '/mock/path',
            workspaceState: {
                get: () => undefined,
                update: async () => {}
            },
            globalState: {
                get: () => undefined,
                update: async () => {}
            }
        } as any;

        builder = new SprintPlannerContextBuilder();
    });

    // TEST 1: Basic interface contract
    test('should implement IContextBuilder interface', () => {
        // Verify builder implements the interface contract
        assert.ok(builder);
        assert.strictEqual(typeof builder.build, 'function');

        // TypeScript compile-time check - if this compiles, interface is implemented
        const contextBuilder: IContextBuilder = builder;
        assert.ok(contextBuilder);
    });

    // TEST 2: EnhancementContext structure
    test('should return EnhancementContext with all required fields', async () => {
        const input = {
            sprintGoal: 'Implement AI enhancement system',
            duration: '2 weeks',
            priorities: ['new-features'],
            includeRetro: true
        };

        const context = await builder.build(input);

        // Verify all 5 required fields exist
        assert.ok(context.type, 'type field is required');
        assert.ok(context.template, 'template field is required');
        assert.ok(context.metadata, 'metadata field is required');
        assert.ok(context.workspaceContext, 'workspaceContext field is required');
        assert.ok(context.specificContext, 'specificContext field is required');
    });

    // TEST 3: Type field
    test('should set type to "sprint_planner"', async () => {
        const input = {
            sprintGoal: 'Test sprint',
            duration: '1 week',
            priorities: [],
            includeRetro: false
        };

        const context = await builder.build(input);
        assert.strictEqual(context.type, 'sprint_planner');
    });

    // TEST 4-5: Component 1 - Existing Sprints
    test('should load all ACTIVE_SPRINT_*.toml files', async () => {
        const input = {
            sprintGoal: 'Test',
            duration: '1 week',
            priorities: [],
            includeRetro: false
        };

        const context = await builder.build(input);

        const sprints = context.specificContext.existingSprints;
        assert.ok(Array.isArray(sprints));
        // Should find at least ACTIVE_SPRINT_17.1_BUGS.toml
        assert.ok(sprints.length > 0);
    });

    test('should parse sprint metadata correctly', async () => {
        const input = {
            sprintGoal: 'Test',
            duration: '1 week',
            priorities: [],
            includeRetro: false
        };

        const context = await builder.build(input);

        const sprint = context.specificContext.existingSprints[0];
        assert.ok(sprint.id);           // e.g., "17.1-BUGS"
        assert.ok(sprint.name);         // e.g., "Bug Fixes & Polish"
        assert.ok(sprint.status);       // e.g., "active"
        assert.ok(typeof sprint.taskCount === 'number');    // e.g., 42
        assert.ok(sprint.filePath);     // Absolute path
    });

    // TEST 6-10: Component 2 - Sprint Template
    test('should load SPRINT_TEMPLATE.toml successfully', async () => {
        const input = {
            sprintGoal: 'Test',
            duration: '1 week',
            priorities: [],
            includeRetro: false
        };

        const context = await builder.build(input);

        const template = context.specificContext.sprintTemplate;
        assert.ok(template);
        assert.ok(Array.isArray(template.required));
        assert.ok(Array.isArray(template.suggested));
        assert.ok(Array.isArray(template.conditional));
        assert.ok(Array.isArray(template.retrospective));
    });

    test('should extract REQUIRED tasks (14 tasks)', async () => {
        const input = {
            sprintGoal: 'Test',
            duration: '1 week',
            priorities: [],
            includeRetro: false
        };

        const context = await builder.build(input);

        const required = context.specificContext.sprintTemplate.required;
        assert.strictEqual(required.length, 14);

        // Verify structure of first task
        assert.ok(required[0].id);
        assert.ok(required[0].name);
        assert.strictEqual(required[0].category, 'required');
    });

    test('should extract SUGGESTED tasks (4 tasks)', async () => {
        const input = {
            sprintGoal: 'Test',
            duration: '1 week',
            priorities: [],
            includeRetro: false
        };

        const context = await builder.build(input);

        const suggested = context.specificContext.sprintTemplate.suggested;
        assert.strictEqual(suggested.length, 4);
        assert.strictEqual(suggested[0].category, 'suggested');
    });

    test('should extract CONDITIONAL tasks (8 tasks)', async () => {
        const input = {
            sprintGoal: 'Test',
            duration: '1 week',
            priorities: [],
            includeRetro: false
        };

        const context = await builder.build(input);

        const conditional = context.specificContext.sprintTemplate.conditional;
        assert.strictEqual(conditional.length, 8);
        assert.strictEqual(conditional[0].category, 'conditional');
    });

    test('should extract RETROSPECTIVE tasks (2 tasks)', async () => {
        const input = {
            sprintGoal: 'Test',
            duration: '1 week',
            priorities: [],
            includeRetro: false
        };

        const context = await builder.build(input);

        const retrospective = context.specificContext.sprintTemplate.retrospective;
        assert.strictEqual(retrospective.length, 2);
        assert.strictEqual(retrospective[0].category, 'retrospective');
    });

    // TEST 11-13: Component 3 - Agent Capabilities
    test('should load all agent context files', async () => {
        const input = {
            sprintGoal: 'Test',
            duration: '1 week',
            priorities: [],
            includeRetro: false
        };

        const context = await builder.build(input);

        const agents = context.specificContext.agentCapabilities;
        assert.ok(Array.isArray(agents));
        assert.ok(agents.length > 0);  // Should find at least developer-agent
    });

    test('should extract agent expertise areas', async () => {
        const input = {
            sprintGoal: 'Test',
            duration: '1 week',
            priorities: [],
            includeRetro: false
        };

        const context = await builder.build(input);

        const agent = context.specificContext.agentCapabilities.find((a: any) => a.name.toLowerCase().includes('infrastructure'));
        assert.ok(agent);
        assert.ok(Array.isArray(agent.expertise));
        assert.ok(agent.expertise.length > 0);
    });

    test('should extract test coverage requirements', async () => {
        const input = {
            sprintGoal: 'Test',
            duration: '1 week',
            priorities: [],
            includeRetro: false
        };

        const context = await builder.build(input);

        const agent = context.specificContext.agentCapabilities[0];
        assert.ok(typeof agent.testCoverage === 'number');
        assert.ok(agent.testCoverage >= 70 && agent.testCoverage <= 100);
    });

    // TEST 14: Component 4 - Git Branch
    test('should get current git branch name', async () => {
        const input = {
            sprintGoal: 'Test',
            duration: '1 week',
            priorities: [],
            includeRetro: false
        };

        const context = await builder.build(input);

        const branch = context.specificContext.gitBranch;
        assert.ok(typeof branch === 'string');
        assert.ok(branch.length > 0);
        // Should detect feature/v0.17.2-bug-fixes or similar
        assert.ok(branch === 'feature/v0.17.2-bug-fixes' || branch.includes('feature') || branch === 'master' || branch === 'main');
    });

    // TEST 15: Component 5 - Pattern Search
    test('should find sprint planning patterns', async () => {
        const input = {
            sprintGoal: 'Test',
            duration: '1 week',
            priorities: [],
            includeRetro: false
        };

        const context = await builder.build(input);

        const patterns = context.metadata.patterns;
        assert.ok(Array.isArray(patterns));
        assert.ok(patterns.includes('Pattern-SPRINT-PLAN-001'));
        assert.ok(patterns.includes('Pattern-SPRINT-TEMPLATE-001'));
    });

    // TEST 16: EnhancementContext Assembly
    test('should assemble complete EnhancementContext with all 5 components', async () => {
        const input = {
            sprintGoal: 'Implement AI enhancement system',
            duration: '2 weeks',
            priorities: ['new-features', 'bug-fixes'],
            includeRetro: true
        };

        const context = await builder.build(input);

        // Verify type
        assert.strictEqual(context.type, 'sprint_planner');

        // Verify metadata
        assert.strictEqual(context.metadata.buttonType, 'sprint_planner');
        assert.ok(context.metadata.confidence.score >= 40);
        assert.strictEqual(context.metadata.agent, 'sprint-planner-agent');

        // Verify specificContext has all 5 components
        assert.ok(context.specificContext.existingSprints);
        assert.ok(context.specificContext.sprintTemplate);
        assert.ok(context.specificContext.agentCapabilities);
        assert.ok(context.specificContext.gitBranch);
        assert.ok(context.metadata.patterns.length >= 2);

        // Verify user input passed through
        assert.strictEqual(context.specificContext.sprintGoal, 'Implement AI enhancement system');
        assert.strictEqual(context.specificContext.duration, '2 weeks');
        assert.deepStrictEqual(context.specificContext.priorities, ['new-features', 'bug-fixes']);
    });

    // TEST 17: Performance
    test('should build context in < 2 seconds', async () => {
        const input = {
            sprintGoal: 'Test',
            duration: '1 week',
            priorities: [],
            includeRetro: false
        };

        const startTime = Date.now();
        await builder.build(input);
        const duration = Date.now() - startTime;

        assert.ok(duration < 2000, `Context building took ${duration}ms (expected < 2000ms)`);
    });

    // TEST 18: Confidence Calculation
    test('should calculate high confidence when all data available', async () => {
        const input = {
            sprintGoal: 'Comprehensive test',
            duration: '2 weeks',
            priorities: ['new-features'],
            includeRetro: true
        };

        const context = await builder.build(input);

        const confidence = context.metadata.confidence;
        assert.ok(confidence.score >= 70, `Expected confidence >= 70, got ${confidence.score}`);
        assert.strictEqual(confidence.level, 'high');
    });
});
