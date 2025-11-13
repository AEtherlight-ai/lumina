/**
 * Tests for IContextBuilder Interface
 *
 * DESIGN DECISION: Test interface contract via mock implementation
 * WHY: Interfaces can't be tested directly, verify contract through implementation
 *
 * REASONING CHAIN:
 * 1. IContextBuilder defines contract for all context builders
 * 2. Each builder must implement build(input: any): Promise<EnhancementContext>
 * 3. Test verifies mock implementation satisfies interface requirements
 * 4. Result: Contract validation + example for future builders
 *
 * PATTERN: Pattern-TDD-001 (Test Interface Contracts)
 * RELATED: IContextBuilder.ts, EnhancementContext.ts
 */

import * as assert from 'assert';
import { IContextBuilder } from '../../../src/interfaces/IContextBuilder';
import { EnhancementContext } from '../../../src/types/EnhancementContext';
import { TemplateTask } from '../../../src/services/TemplateTaskBuilder';

/**
 * Mock Context Builder for testing interface contract
 */
class MockContextBuilder implements IContextBuilder {
    async build(input: any): Promise<EnhancementContext> {
        return {
            type: 'general',
            template: {
                id: 'TEST-001',
                name: 'Test Task',
                description: 'Test description',
                phase: 'test',
                status: 'pending',
                agent: 'test-agent',
                dependencies: [],
                files_to_modify: [],
                approach: 'Test approach',
                validation_steps: [],
                estimated_time: '1h'
            } as TemplateTask,
            metadata: {
                buttonType: 'test',
                confidence: { score: 95, level: 'high' },
                patterns: ['Pattern-TEST-001'],
                agent: 'test-agent',
                validation: {
                    filesExist: true,
                    dependenciesMet: true,
                    taskDataCurrent: true
                }
            },
            workspaceContext: {
                rootPath: '/test/workspace',
                languages: ['TypeScript'],
                frameworks: ['VS Code'],
                filesFound: [],
                gitCommits: [],
                sops: {}
            },
            specificContext: {}
        };
    }
}

suite('IContextBuilder Interface Tests', () => {
    let builder: IContextBuilder;

    setup(() => {
        builder = new MockContextBuilder();
    });

    test('should implement build method', async () => {
        // Verify build method exists and returns Promise<EnhancementContext>
        const result = builder.build({});
        assert.ok(result instanceof Promise, 'build() should return Promise');

        const context = await result;
        assert.ok(context, 'build() should resolve to EnhancementContext');
    });

    test('should return EnhancementContext with required fields', async () => {
        const context = await builder.build({});

        // Verify required fields exist
        assert.ok(context.type, 'EnhancementContext must have type');
        assert.ok(context.template, 'EnhancementContext must have template');
        assert.ok(context.metadata, 'EnhancementContext must have metadata');
        assert.ok(context.workspaceContext, 'EnhancementContext must have workspaceContext');
        assert.ok('specificContext' in context, 'EnhancementContext must have specificContext');
    });

    test('should return valid type field', async () => {
        const context = await builder.build({});

        const validTypes = ['task', 'bug', 'feature', 'code_analyzer', 'sprint_planner', 'general'];
        assert.ok(validTypes.includes(context.type), `type must be one of: ${validTypes.join(', ')}`);
    });

    test('should return valid metadata structure', async () => {
        const context = await builder.build({});

        // Verify metadata fields
        assert.ok(context.metadata.buttonType, 'metadata must have buttonType');
        assert.ok(context.metadata.confidence, 'metadata must have confidence');
        assert.ok(typeof context.metadata.confidence.score === 'number', 'confidence.score must be number');
        assert.ok(['high', 'medium', 'low'].includes(context.metadata.confidence.level), 'confidence.level must be high/medium/low');
        assert.ok(Array.isArray(context.metadata.patterns), 'metadata.patterns must be array');
        assert.ok(context.metadata.agent, 'metadata must have agent');
        assert.ok(context.metadata.validation, 'metadata must have validation');
        assert.ok(typeof context.metadata.validation.filesExist === 'boolean', 'validation.filesExist must be boolean');
        assert.ok(typeof context.metadata.validation.dependenciesMet === 'boolean', 'validation.dependenciesMet must be boolean');
        assert.ok(typeof context.metadata.validation.taskDataCurrent === 'boolean', 'validation.taskDataCurrent must be boolean');
    });

    test('should return valid workspaceContext structure', async () => {
        const context = await builder.build({});

        // Verify workspaceContext fields
        assert.ok(context.workspaceContext.rootPath, 'workspaceContext must have rootPath');
        assert.ok(Array.isArray(context.workspaceContext.languages), 'workspaceContext.languages must be array');
        assert.ok(Array.isArray(context.workspaceContext.frameworks), 'workspaceContext.frameworks must be array');
        assert.ok(Array.isArray(context.workspaceContext.filesFound), 'workspaceContext.filesFound must be array');
        assert.ok(Array.isArray(context.workspaceContext.gitCommits), 'workspaceContext.gitCommits must be array');
        assert.ok(typeof context.workspaceContext.sops === 'object', 'workspaceContext.sops must be object');
    });

    test('should accept any input type', async () => {
        // Verify build() accepts any input (flexibility for different button types)
        await builder.build({}); // Empty object
        await builder.build({ test: 'data' }); // Custom data
        await builder.build(null); // Null
        await builder.build(undefined); // Undefined

        // All should succeed without throwing
        assert.ok(true, 'build() should accept any input type');
    });

    test('should handle errors gracefully', async () => {
        class ErrorContextBuilder implements IContextBuilder {
            async build(input: any): Promise<EnhancementContext> {
                throw new Error('Test error');
            }
        }

        const errorBuilder = new ErrorContextBuilder();

        try {
            await errorBuilder.build({});
            assert.fail('Should have thrown error');
        } catch (error) {
            assert.ok(error instanceof Error, 'Should throw Error');
            assert.strictEqual((error as Error).message, 'Test error');
        }
    });
});
