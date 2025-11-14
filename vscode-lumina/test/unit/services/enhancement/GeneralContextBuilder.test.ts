/**
 * GeneralContextBuilder Tests
 *
 * TDD RED Phase: These tests are written BEFORE implementation
 * Expected result: All tests should FAIL until implementation is complete
 *
 * Pattern-TDD-001: RED → GREEN → REFACTOR
 */

import * as assert from 'assert';
import * as vscode from 'vscode';
import { GeneralContextBuilder } from '../../../../src/services/enhancement/GeneralContextBuilder';
import { IContextBuilder } from '../../../../src/interfaces/IContextBuilder';

suite('GeneralContextBuilder Tests', () => {
    let builder: GeneralContextBuilder;
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

        builder = new GeneralContextBuilder(mockContext);
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
        const input = { text: 'Implement user authentication' };
        const context = await builder.build(input);

        // Verify all 5 required fields exist
        assert.ok(context.type, 'type field is required');
        assert.ok(context.template, 'template field is required');
        assert.ok(context.metadata, 'metadata field is required');
        assert.ok(context.workspaceContext, 'workspaceContext field is required');
        assert.ok(context.specificContext, 'specificContext field is required');
    });

    test('should set type to "general"', async () => {
        const input = { text: 'Do something' };
        const context = await builder.build(input);
        assert.strictEqual(context.type, 'general');
    });

    test('should extract intent: "implement" from text', async () => {
        const input = { text: 'Implement user authentication with JWT tokens' };
        const context = await builder.build(input);

        // Specific context should contain extracted intent
        assert.ok(context.specificContext);
        assert.ok(context.specificContext.intent);
        assert.strictEqual(context.specificContext.intent, 'implement');
    });

    test('should extract intent: "refactor" from text', async () => {
        const input = { text: 'Refactor the database connection pooling logic' };
        const context = await builder.build(input);

        assert.ok(context.specificContext.intent);
        assert.strictEqual(context.specificContext.intent, 'refactor');
    });

    test('should extract intent: "debug" from text', async () => {
        const input = { text: 'Debug why the API endpoint returns 500 errors' };
        const context = await builder.build(input);

        assert.ok(context.specificContext.intent);
        assert.strictEqual(context.specificContext.intent, 'debug');
    });

    test('should extract intent: "analyze" from text', async () => {
        const input = { text: 'Analyze the performance of the query pipeline' };
        const context = await builder.build(input);

        assert.ok(context.specificContext.intent);
        assert.strictEqual(context.specificContext.intent, 'analyze');
    });

    test('should default to "general" for ambiguous text', async () => {
        const input = { text: 'Something vague and unclear' };
        const context = await builder.build(input);

        // Intent should default to 'general' when ambiguous
        assert.ok(context.specificContext.intent);
        assert.strictEqual(context.specificContext.intent, 'general');
    });

    test('should find relevant patterns via keyword search', async () => {
        const input = { text: 'Implement authentication system' };
        const context = await builder.build(input);

        // Metadata should include pattern suggestions
        assert.ok(context.metadata);
        assert.ok(Array.isArray(context.metadata.patterns));

        // For authentication-related text, might suggest Pattern-AUTH-* patterns
        // (might be empty if pattern library not found, but should be an array)
    });

    test('should populate template from text input', async () => {
        const input = { text: 'Add dark mode support to the application' };
        const context = await builder.build(input);

        // Template should exist and have required fields
        assert.ok(context.template);
        assert.ok(context.template.task_name);
        assert.ok(context.template.task_description);

        // Template should contain original text
        const taskDescription = context.template.task_description.toLowerCase();
        assert.ok(taskDescription.includes('dark mode') || taskDescription.includes('application'));
    });
});
