/**
 * Tests for AIEnhancementService
 *
 * DESIGN DECISION: Test VS Code LM API integration + template fallback
 * WHY: Core service that orchestrates AI enhancement with graceful degradation
 *
 * REASONING CHAIN:
 * 1. AIEnhancementService is the bridge between context and enhanced prompt
 * 2. Primary path: VS Code Language Model API (user's existing AI)
 * 3. Fallback path: Template system (when no AI available)
 * 4. Must handle errors gracefully (network issues, AI unavailable, etc.)
 * 5. Result: Reliable enhancement with multiple fallback layers
 *
 * PATTERN: Pattern-TDD-001 (Test Service Layer)
 * RELATED: AIEnhancementService.ts, EnhancementContext.ts
 */

import * as assert from 'assert';
import * as vscode from 'vscode';
import { AIEnhancementService } from '../../../src/services/AIEnhancementService';
import { EnhancementContext } from '../../../src/types/EnhancementContext';
import { TemplateTask } from '../../../src/services/TemplateTaskBuilder';

/**
 * Mock EnhancementContext for testing
 */
function createMockContext(): EnhancementContext {
    return {
        type: 'bug',
        template: {
            id: 'BUG-001',
            name: 'Fix authentication bug',
            description: 'Authentication fails for new users',
            phase: 'implementation',
            status: 'pending',
            agent: 'developer',
            dependencies: [],
            files_to_modify: ['src/auth.ts'],
            approach: 'Investigate auth flow, add validation',
            validation_steps: ['Test with new user account'],
            estimated_time: '2h'
        } as TemplateTask,
        metadata: {
            buttonType: 'bug_report',
            confidence: { score: 90, level: 'high' },
            patterns: ['Pattern-AUTH-001', 'Pattern-TDD-001'],
            agent: 'developer',
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
            filesFound: [
                { path: 'src/auth.ts', relevance: 95, reason: 'Authentication logic' }
            ],
            gitCommits: [
                { hash: 'abc123', message: 'Add user login', date: '2025-01-10' }
            ],
            sops: {
                claudeMd: 'Follow TDD workflow',
                aetherlightMd: 'Use Pattern-AUTH-001'
            }
        },
        specificContext: {
            severity: 'high',
            stepsToReproduce: '1. Create new user\n2. Try to login',
            expectedBehavior: 'User should be able to login',
            actualBehavior: 'Login fails with error'
        }
    };
}

suite('AIEnhancementService Tests', () => {
    let service: AIEnhancementService;

    setup(() => {
        service = new AIEnhancementService();
    });

    test('should instantiate AIEnhancementService', () => {
        assert.ok(service, 'AIEnhancementService should instantiate');
        assert.ok(typeof service.enhance === 'function', 'should have enhance method');
    });

    test('should return string from enhance method', async () => {
        const context = createMockContext();

        const result = await service.enhance(context);

        assert.ok(typeof result === 'string', 'enhance() should return string');
        assert.ok(result.length > 0, 'enhance() should return non-empty string');
    });

    test('should fall back to template when no AI available', async () => {
        const context = createMockContext();

        // Mock vscode.lm.selectChatModels to return empty array
        const originalSelectChatModels = vscode.lm.selectChatModels;
        (vscode.lm as any).selectChatModels = async () => [];

        try {
            const result = await service.enhance(context);

            // Verify fallback to template
            assert.ok(result.includes('BUG-001'), 'Should include task ID from template');
            assert.ok(result.includes('Fix authentication bug'), 'Should include task name from template');
            assert.ok(result.includes('src/auth.ts'), 'Should include files to modify');
        } finally {
            // Restore original
            (vscode.lm as any).selectChatModels = originalSelectChatModels;
        }
    });

    test('should embed metadata in HTML comment', async () => {
        const context = createMockContext();

        const result = await service.enhance(context);

        // Verify metadata embedding
        assert.ok(result.includes('<!--'), 'Should include HTML comment start');
        assert.ok(result.includes('AETHERLIGHT_ENHANCEMENT_METADATA'), 'Should include metadata marker');
        assert.ok(result.includes('-->'), 'Should include HTML comment end');
    });

    test('should include confidence score in metadata', async () => {
        const context = createMockContext();

        const result = await service.enhance(context);

        // Extract metadata from HTML comment
        const metadataMatch = result.match(/<!--\s*AETHERLIGHT_ENHANCEMENT_METADATA\s*([\s\S]*?)-->/);
        assert.ok(metadataMatch, 'Should have metadata comment');

        const metadataJson = metadataMatch![1];
        const metadata = JSON.parse(metadataJson);

        assert.strictEqual(metadata.confidence.score, 90, 'Should include confidence score');
        assert.strictEqual(metadata.confidence.level, 'high', 'Should include confidence level');
    });

    test('should include filesAnalyzed in metadata', async () => {
        const context = createMockContext();

        const result = await service.enhance(context);

        const metadataMatch = result.match(/<!--\s*AETHERLIGHT_ENHANCEMENT_METADATA\s*([\s\S]*?)-->/);
        const metadata = JSON.parse(metadataMatch![1]);

        assert.ok(Array.isArray(metadata.filesAnalyzed), 'Should have filesAnalyzed array');
        assert.ok(metadata.filesAnalyzed.includes('src/auth.ts'), 'Should include auth.ts');
    });

    test('should include validation status in metadata', async () => {
        const context = createMockContext();

        const result = await service.enhance(context);

        const metadataMatch = result.match(/<!--\s*AETHERLIGHT_ENHANCEMENT_METADATA\s*([\s\S]*?)-->/);
        const metadata = JSON.parse(metadataMatch![1]);

        assert.strictEqual(metadata.validation.filesExist, true, 'Should include filesExist validation');
        assert.strictEqual(metadata.validation.dependenciesMet, true, 'Should include dependenciesMet validation');
        assert.strictEqual(metadata.validation.taskDataCurrent, true, 'Should include taskDataCurrent validation');
    });

    test('should handle VS Code LM API errors gracefully', async () => {
        const context = createMockContext();

        // Mock vscode.lm.selectChatModels to throw error
        const originalSelectChatModels = vscode.lm.selectChatModels;
        (vscode.lm as any).selectChatModels = async () => {
            throw new Error('LM API error');
        };

        try {
            const result = await service.enhance(context);

            // Should fall back to template instead of throwing
            assert.ok(result.includes('BUG-001'), 'Should fall back to template on error');
        } finally {
            (vscode.lm as any).selectChatModels = originalSelectChatModels;
        }
    });

    test('should build AI prompt from context', async () => {
        const context = createMockContext();

        // Access private method through any cast (for testing only)
        const prompt = (service as any).buildAIPrompt(context);

        // Verify prompt structure
        assert.ok(typeof prompt === 'string', 'buildAIPrompt should return string');
        assert.ok(prompt.includes('Fix authentication bug'), 'Should include task name');
        assert.ok(prompt.includes('Pattern-AUTH-001'), 'Should include patterns');
        assert.ok(prompt.includes('src/auth.ts'), 'Should include files to modify');
        assert.ok(prompt.includes('TDD workflow'), 'Should include SOPs');
    });

    test('should handle missing SOPs gracefully', async () => {
        const context = createMockContext();
        context.workspaceContext.sops = {}; // No SOPs

        const result = await service.enhance(context);

        // Should still generate prompt without SOPs
        assert.ok(result.includes('BUG-001'), 'Should work without SOPs');
    });

    test('should handle empty files array gracefully', async () => {
        const context = createMockContext();
        context.workspaceContext.filesFound = []; // No files

        const result = await service.enhance(context);

        // Should still generate prompt without files
        assert.ok(result.includes('BUG-001'), 'Should work without files');
    });

    test('should handle empty patterns array gracefully', async () => {
        const context = createMockContext();
        context.metadata.patterns = []; // No patterns

        const result = await service.enhance(context);

        // Should still generate prompt without patterns
        assert.ok(result.includes('BUG-001'), 'Should work without patterns');
    });

    test('should use different template for different types', async () => {
        const bugContext = createMockContext();
        bugContext.type = 'bug';

        const featureContext = createMockContext();
        featureContext.type = 'feature';

        const bugResult = await service.enhance(bugContext);
        const featureResult = await service.enhance(featureContext);

        // Templates should differ based on type
        // (Exact differences depend on template implementation)
        assert.notStrictEqual(bugResult, featureResult, 'Different types should use different templates');
    });

    test('should respect confidence level in metadata', async () => {
        const highConfidenceContext = createMockContext();
        highConfidenceContext.metadata.confidence = { score: 95, level: 'high' };

        const lowConfidenceContext = createMockContext();
        lowConfidenceContext.metadata.confidence = { score: 40, level: 'low' };

        const highResult = await service.enhance(highConfidenceContext);
        const lowResult = await service.enhance(lowConfidenceContext);

        // Extract metadata
        const highMetadata = JSON.parse(highResult.match(/<!--\s*AETHERLIGHT_ENHANCEMENT_METADATA\s*([\s\S]*?)-->/)![1]);
        const lowMetadata = JSON.parse(lowResult.match(/<!--\s*AETHERLIGHT_ENHANCEMENT_METADATA\s*([\s\S]*?)-->/)![1]);

        assert.strictEqual(highMetadata.confidence.level, 'high');
        assert.strictEqual(lowMetadata.confidence.level, 'low');
    });
});
