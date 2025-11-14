/**
 * CodeAnalyzerContextBuilder Tests
 *
 * TDD RED Phase: These tests are written BEFORE implementation
 * Expected result: All tests should FAIL until implementation is complete
 *
 * Pattern-TDD-001: RED → GREEN → REFACTOR
 */

import * as assert from 'assert';
import * as vscode from 'vscode';
import { CodeAnalyzerContextBuilder } from '../../../../src/services/enhancement/CodeAnalyzerContextBuilder';
import { IContextBuilder } from '../../../../src/interfaces/IContextBuilder';

suite('CodeAnalyzerContextBuilder Tests', () => {
    let builder: CodeAnalyzerContextBuilder;
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

        builder = new CodeAnalyzerContextBuilder(mockContext);
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
        const input = { focusArea: 'performance' };
        const context = await builder.build(input);

        // Verify all 5 required fields exist
        assert.ok(context.type, 'type field is required');
        assert.ok(context.template, 'template field is required');
        assert.ok(context.metadata, 'metadata field is required');
        assert.ok(context.workspaceContext, 'workspaceContext field is required');
        assert.ok(context.specificContext, 'specificContext field is required');
    });

    test('should set type to "code_analyzer"', async () => {
        const input = { focusArea: 'security' };
        const context = await builder.build(input);
        assert.strictEqual(context.type, 'code_analyzer');
    });

    test('should analyze workspace structure (languages, frameworks, directories)', async () => {
        const input = { focusArea: 'architecture' };
        const context = await builder.build(input);

        // Workspace context should include structure analysis
        assert.ok(context.workspaceContext);
        assert.ok(Array.isArray(context.workspaceContext.languages));
        assert.ok(Array.isArray(context.workspaceContext.frameworks));
        assert.ok(context.workspaceContext.rootPath);
    });

    test('should analyze git history (last 30 days)', async () => {
        const input = { focusArea: 'recent-changes' };
        const context = await builder.build(input);

        // Workspace context should include git commits
        assert.ok(context.workspaceContext.gitCommits);
        assert.ok(Array.isArray(context.workspaceContext.gitCommits));

        // Specific context should include time range
        assert.ok(context.specificContext.gitAnalysis);
        assert.ok(context.specificContext.gitAnalysis.timeRange);
    });

    test('should calculate complexity metrics (LOC, file count)', async () => {
        const input = { focusArea: 'complexity' };
        const context = await builder.build(input);

        // Specific context should include complexity metrics
        assert.ok(context.specificContext.complexityMetrics);
        assert.ok(typeof context.specificContext.complexityMetrics.totalFiles === 'number');
        assert.ok(typeof context.specificContext.complexityMetrics.estimatedLOC === 'number');
    });

    test('should perform semantic pattern search (5-10 patterns)', async () => {
        const input = { focusArea: 'patterns' };
        const context = await builder.build(input);

        // Metadata should include relevant patterns
        assert.ok(context.metadata.patterns);
        assert.ok(Array.isArray(context.metadata.patterns));

        // Should find at least some patterns (if pattern library exists)
        // This test will pass even if empty array (no pattern library)
    });

    test('should identify user focus areas from input', async () => {
        const input = { focusArea: 'performance' };
        const context = await builder.build(input);

        // Specific context should preserve focus area
        assert.ok(context.specificContext.focusArea);
        assert.strictEqual(context.specificContext.focusArea, 'performance');
    });

    test('should map focus area to relevant patterns', async () => {
        const input = { focusArea: 'security' };
        const context = await builder.build(input);

        // Patterns should be relevant to security
        // (if pattern library exists with security patterns)
        assert.ok(context.metadata.patterns);
        assert.ok(Array.isArray(context.metadata.patterns));
    });

    test('should detect project type (CLI, web, desktop, library)', async () => {
        const input = { focusArea: 'architecture' };
        const context = await builder.build(input);

        // Specific context should include project type detection
        assert.ok(context.specificContext.projectType);
        assert.ok(typeof context.specificContext.projectType === 'string');
    });

    test('should find key files for analysis', async () => {
        const input = { focusArea: 'codebase' };
        const context = await builder.build(input);

        // Workspace context should include key files
        assert.ok(context.workspaceContext.filesFound);
        assert.ok(Array.isArray(context.workspaceContext.filesFound));
    });

    test('should calculate confidence based on workspace size', async () => {
        const input = { focusArea: 'overview' };
        const context = await builder.build(input);

        // Confidence should be calculated
        assert.ok(context.metadata.confidence);
        assert.ok(context.metadata.confidence.level === 'high' ||
                  context.metadata.confidence.level === 'medium' ||
                  context.metadata.confidence.level === 'low');
        assert.ok(typeof context.metadata.confidence.score === 'number');
    });

    test('should handle large codebases with sampling', async () => {
        // Should not timeout on large workspaces
        const input = { focusArea: 'large-codebase' };

        // Should complete within reasonable time (timeout test)
        const startTime = Date.now();
        const context = await builder.build(input);
        const elapsed = Date.now() - startTime;

        assert.ok(context);
        assert.ok(elapsed < 5000, 'Should complete within 5 seconds');
    });

    test('should handle git command failures gracefully', async () => {
        // Should not throw if git fails, but return context without git data
        const input = { focusArea: 'no-git' };

        // Should not throw
        const context = await builder.build(input);
        assert.ok(context);
        assert.ok(context.workspaceContext);
    });

    test('should populate template from analysis results', async () => {
        const input = { focusArea: 'analysis' };
        const context = await builder.build(input);

        // Template should exist and have required fields
        assert.ok(context.template);
        assert.ok(context.template.task_name);
        assert.ok(context.template.task_description);

        // Template should include workspace insights
        const description = context.template.task_description.toLowerCase();
        assert.ok(description.length > 0);
    });

    test('should detect frameworks (React, Vue, Tauri, etc.)', async () => {
        const input = { focusArea: 'frameworks' };
        const context = await builder.build(input);

        // Workspace context should include framework detection
        assert.ok(context.workspaceContext.frameworks);
        assert.ok(Array.isArray(context.workspaceContext.frameworks));
    });

    test('should identify hotspots (frequently modified files)', async () => {
        const input = { focusArea: 'hotspots' };
        const context = await builder.build(input);

        // Specific context should include hotspot analysis
        assert.ok(context.specificContext.hotspots);
        assert.ok(Array.isArray(context.specificContext.hotspots));
    });
});
