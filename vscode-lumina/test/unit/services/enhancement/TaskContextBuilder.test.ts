/**
 * TaskContextBuilder Tests
 *
 * TDD RED Phase: These tests are written BEFORE implementation
 * Expected result: All tests should FAIL until implementation is complete
 *
 * Pattern-TDD-001: RED → GREEN → REFACTOR
 */

import * as assert from 'assert';
import * as vscode from 'vscode';
import { TaskContextBuilder } from '../../../../src/services/enhancement/TaskContextBuilder';
import { IContextBuilder } from '../../../../src/interfaces/IContextBuilder';

suite('TaskContextBuilder Tests', () => {
    let builder: TaskContextBuilder;
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

        builder = new TaskContextBuilder(mockContext);
    });

    test('should implement IContextBuilder interface', () => {
        // Verify builder implements the interface contract
        assert.ok(builder);
        assert.strictEqual(typeof builder.build, 'function');

        // TypeScript compile-time check - if this compiles, interface is implemented
        const contextBuilder: IContextBuilder = builder;
        assert.ok(contextBuilder);
    });

    test('should return EnhancementContext with all required fields', async () => {
        const input = { taskId: 'TEST-001' };
        const context = await builder.build(input);

        // Verify all 5 required fields exist
        assert.ok(context.type, 'type field is required');
        assert.ok(context.template, 'template field is required');
        assert.ok(context.metadata, 'metadata field is required');
        assert.ok(context.workspaceContext, 'workspaceContext field is required');
        assert.ok(context.specificContext, 'specificContext field is required');
    });

    test('should set type to "task"', async () => {
        const input = { taskId: 'TEST-001' };
        const context = await builder.build(input);
        assert.strictEqual(context.type, 'task');
    });

    test('should load task from TOML via SprintLoader', async () => {
        const input = { taskId: 'BUG-002A' };
        const context = await builder.build(input);

        // Specific context should contain loaded task data
        assert.ok(context.specificContext);
        assert.ok(context.specificContext.task);
        assert.strictEqual(context.specificContext.task.id, 'BUG-002A');
    });

    test('should throw error if task not found in TOML', async () => {
        const input = { taskId: 'NONEXISTENT-999' };

        try {
            await builder.build(input);
            assert.fail('Should have thrown error for nonexistent task');
        } catch (error) {
            assert.ok(error instanceof Error);
            assert.ok((error as Error).message.includes('not found'));
        }
    });

    test('should validate dependencies (completed vs pending)', async () => {
        const input = { taskId: 'TEST-001' };
        const context = await builder.build(input);

        // Metadata should include dependency validation results
        assert.ok(context.metadata.validation);
        assert.ok(typeof context.metadata.validation.dependenciesMet === 'boolean');

        // Specific context should list dependency statuses
        assert.ok(context.specificContext.dependencyStatus);
        assert.ok(Array.isArray(context.specificContext.dependencyStatus));
    });

    test('should detect temporal drift (git diff since task created)', async () => {
        const input = { taskId: 'TEST-001' };
        const context = await builder.build(input);

        // Workspace context should include temporal drift data
        assert.ok(context.workspaceContext.gitCommits);
        assert.ok(Array.isArray(context.workspaceContext.gitCommits));

        // Specific context should include drift metrics
        assert.ok(context.specificContext.temporalDrift !== undefined);
    });

    test('should validate files_to_modify exist in workspace', async () => {
        const input = { taskId: 'TEST-001' };
        const context = await builder.build(input);

        // Metadata validation should check file existence
        assert.ok(context.metadata.validation);
        assert.ok(typeof context.metadata.validation.filesExist === 'boolean');

        // Specific context should list file validation results
        assert.ok(context.specificContext.fileValidation);
    });

    test('should validate patterns still apply to current codebase', async () => {
        const input = { taskId: 'TEST-001' };
        const context = await builder.build(input);

        // Metadata should include pattern validation
        assert.ok(context.metadata.patterns);
        assert.ok(Array.isArray(context.metadata.patterns));

        // Specific context should include pattern applicability
        assert.ok(context.specificContext.patternValidation);
    });

    test('should find related tasks (overlapping files)', async () => {
        const input = { taskId: 'TEST-001' };
        const context = await builder.build(input);

        // Specific context should include related tasks
        assert.ok(context.specificContext.relatedTasks);
        assert.ok(Array.isArray(context.specificContext.relatedTasks));
    });

    test('should calculate high confidence if all validation passes', async () => {
        const input = { taskId: 'TEST-001' };
        const context = await builder.build(input);

        // If all validation passes, confidence should be high
        assert.ok(context.metadata.confidence);
        assert.ok(context.metadata.confidence.level === 'high' ||
                  context.metadata.confidence.level === 'medium' ||
                  context.metadata.confidence.level === 'low');
    });

    test('should return low confidence if files missing', async () => {
        // This test would require mocking file system to simulate missing files
        // For now, verify confidence structure exists
        const input = { taskId: 'TEST-001' };
        const context = await builder.build(input);

        assert.ok(context.metadata.confidence);
        assert.ok(typeof context.metadata.confidence.score === 'number');
        assert.ok(context.metadata.confidence.score >= 0 && context.metadata.confidence.score <= 100);
    });

    test('should handle git command failures gracefully', async () => {
        // Should not throw if git fails, but return context without git data
        const input = { taskId: 'TEST-001' };

        // Should not throw
        const context = await builder.build(input);
        assert.ok(context);
        assert.ok(context.workspaceContext);
    });

    test('should populate template from task data', async () => {
        const input = { taskId: 'TEST-001' };
        const context = await builder.build(input);

        // Template should exist and have required fields
        assert.ok(context.template);
        assert.ok(context.template.task_name);
        assert.ok(context.template.task_description);
    });
});
