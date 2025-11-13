/**
 * FeatureRequestContextBuilder Tests
 *
 * TDD RED Phase: These tests are written BEFORE implementation
 * Expected result: All tests should FAIL until implementation is complete
 *
 * Pattern-TDD-001: RED → GREEN → REFACTOR
 */

import * as assert from 'assert';
import * as vscode from 'vscode';
import { FeatureRequestContextBuilder } from '../../../../src/services/enhancement/FeatureRequestContextBuilder';
import { IContextBuilder } from '../../../../src/interfaces/IContextBuilder';
import { FeatureRequestFormData } from '../../../../src/services/TemplateTaskBuilder';

suite('FeatureRequestContextBuilder Tests', () => {
    let builder: FeatureRequestContextBuilder;
    let mockContext: vscode.ExtensionContext;

    const mockFeatureForm: FeatureRequestFormData = {
        title: 'Add dark mode toggle',
        priority: 'high',
        category: 'UI Enhancement',
        useCase: 'Users want dark theme for night coding',
        proposedSolution: 'Add theme toggle in settings',
        alternativeApproaches: 'Auto-detect system theme',
        additionalContext: 'Popular feature request from GitHub issues'
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

        builder = new FeatureRequestContextBuilder(mockContext);
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
        const context = await builder.build(mockFeatureForm);

        // Verify all 5 required fields exist
        assert.ok(context.type, 'type field is required');
        assert.ok(context.template, 'template field is required');
        assert.ok(context.metadata, 'metadata field is required');
        assert.ok(context.workspaceContext, 'workspaceContext field is required');
        assert.ok(context.specificContext, 'specificContext field is required');
    });

    test('should set type to "feature"', async () => {
        const context = await builder.build(mockFeatureForm);
        assert.strictEqual(context.type, 'feature');
    });

    test('should search git for similar features', async () => {
        const context = await builder.build(mockFeatureForm);

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

    test('should identify use case patterns', async () => {
        const context = await builder.build(mockFeatureForm);

        // Metadata should include pattern suggestions
        assert.ok(context.metadata);
        assert.ok(Array.isArray(context.metadata.patterns));

        // For UI-related feature, should suggest UI patterns
        // (might be empty if pattern library not found, but should be an array)
    });

    test('should populate metadata with confidence score', async () => {
        const context = await builder.build(mockFeatureForm);

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
        const context = await builder.build(mockFeatureForm);

        // Should still return valid context
        assert.ok(context);
        assert.ok(context.workspaceContext.gitCommits);

        // Git commits might be empty, but should be an array
        assert.ok(Array.isArray(context.workspaceContext.gitCommits));
    });

    test('should populate template from FeatureRequestFormData', async () => {
        const context = await builder.build(mockFeatureForm);

        // Template should exist and have required fields
        assert.ok(context.template);
        assert.ok(context.template.task_name);
        assert.ok(context.template.task_description);

        // Template should contain feature request data
        const taskDescription = context.template.task_description.toLowerCase();
        assert.ok(taskDescription.includes('dark mode') || taskDescription.includes('theme'));
    });

    test('should include priority in specificContext', async () => {
        const context = await builder.build(mockFeatureForm);

        // Specific context should include feature-specific fields
        assert.ok(context.specificContext);
        assert.strictEqual(context.specificContext.priority, 'high');
        assert.ok(context.specificContext.useCase);
        assert.ok(context.specificContext.proposedSolution);
    });
});
