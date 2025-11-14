/**
 * BugReportContextBuilder Tests
 *
 * TDD RED Phase: These tests are written BEFORE implementation
 * Expected result: All tests should FAIL until implementation is complete
 *
 * Pattern-TDD-001: RED → GREEN → REFACTOR
 */

import * as assert from 'assert';
import * as vscode from 'vscode';
import { BugReportContextBuilder } from '../../../../src/services/enhancement/BugReportContextBuilder';
import { IContextBuilder } from '../../../../src/interfaces/IContextBuilder';
import { BugReportFormData } from '../../../../src/services/TemplateTaskBuilder';

suite('BugReportContextBuilder Tests', () => {
    let builder: BugReportContextBuilder;
    let mockContext: vscode.ExtensionContext;

    const mockBugForm: BugReportFormData = {
        title: 'Login fails for new users',
        severity: 'high',
        stepsToReproduce: '1. Create new user\n2. Try to login',
        expectedBehavior: 'User should login successfully',
        actualBehavior: 'Login fails with 401 error',
        additionalContext: 'Started after v0.16.0 deploy'
    };

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

        builder = new BugReportContextBuilder(mockContext);
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
        const context = await builder.build(mockBugForm);

        // Verify all 5 required fields exist
        assert.ok(context.type, 'type field is required');
        assert.ok(context.template, 'template field is required');
        assert.ok(context.metadata, 'metadata field is required');
        assert.ok(context.workspaceContext, 'workspaceContext field is required');
        assert.ok(context.specificContext, 'specificContext field is required');
    });

    test('should set type to "bug"', async () => {
        const context = await builder.build(mockBugForm);
        assert.strictEqual(context.type, 'bug');
    });

    test('should search git for similar bugs (keyword match in commit messages)', async () => {
        const context = await builder.build(mockBugForm);

        // Git commits should be populated (even if empty array)
        assert.ok(Array.isArray(context.workspaceContext.gitCommits));

        // If git is available and has history, commits should have structure
        if (context.workspaceContext.gitCommits.length > 0) {
            const commit = context.workspaceContext.gitCommits[0];
            assert.ok(commit.hash, 'commit should have hash');
            assert.ok(commit.message, 'commit should have message');
            assert.ok(commit.date, 'commit should have date');
        }
    });

    test('should find affected files by heuristic (keywords in paths)', async () => {
        const context = await builder.build(mockBugForm);

        // Files found should be populated (even if empty array)
        assert.ok(Array.isArray(context.workspaceContext.filesFound));

        // If files were found, they should have structure
        if (context.workspaceContext.filesFound.length > 0) {
            const file = context.workspaceContext.filesFound[0];
            assert.ok(file.path, 'file should have path');
            assert.ok(typeof file.relevance === 'number', 'file should have relevance score');
            assert.ok(file.reason, 'file should have reason');
        }
    });

    test('should populate metadata with confidence score', async () => {
        const context = await builder.build(mockBugForm);

        // Metadata should exist
        assert.ok(context.metadata);
        assert.ok(context.metadata.confidence);

        // Confidence should have score and level
        assert.ok(typeof context.metadata.confidence.score === 'number');
        assert.ok(['high', 'medium', 'low'].includes(context.metadata.confidence.level));

        // Score should be 0-100
        assert.ok(context.metadata.confidence.score >= 0);
        assert.ok(context.metadata.confidence.score <= 100);
    });

    test('should handle git command failures gracefully', async () => {
        // This should not throw even if git fails
        const context = await builder.build(mockBugForm);

        // Should still return valid context
        assert.ok(context);
        assert.ok(context.workspaceContext.gitCommits);

        // Git commits might be empty, but should be an array
        assert.ok(Array.isArray(context.workspaceContext.gitCommits));
    });

    test('should handle no similar bugs found', async () => {
        const uniqueBugForm: BugReportFormData = {
            title: 'XYZ-UNIQUE-BUG-12345',
            severity: 'low',
            stepsToReproduce: 'Very unique steps that no commit has',
            expectedBehavior: 'Expected behavior',
            actualBehavior: 'Actual behavior',
            additionalContext: 'UNIQUE-CONTEXT-987654'
        };

        const context = await builder.build(uniqueBugForm);

        // Should still return valid context even with no matches
        assert.ok(context);
        assert.ok(Array.isArray(context.workspaceContext.gitCommits));
    });

    test('should populate template from BugReportFormData', async () => {
        const context = await builder.build(mockBugForm);

        // Template should exist and have required fields
        assert.ok(context.template);
        assert.ok(context.template.task_name);
        assert.ok(context.template.task_description);

        // Template should contain bug report data
        const taskDescription = context.template.task_description.toLowerCase();
        assert.ok(taskDescription.includes('login') || taskDescription.includes('401'));
    });

    test('should include severity in specificContext', async () => {
        const context = await builder.build(mockBugForm);

        // Specific context should include bug-specific fields
        assert.ok(context.specificContext);
        assert.strictEqual(context.specificContext.severity, 'high');
        assert.ok(context.specificContext.stepsToReproduce);
        assert.ok(context.specificContext.expectedBehavior);
        assert.ok(context.specificContext.actualBehavior);
    });
});
