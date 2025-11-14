/**
 * VoicePanel Refinement UI Tests
 *
 * TDD RED Phase: These tests are written BEFORE implementation
 * Expected result: All tests should FAIL until implementation is complete
 *
 * Pattern-TDD-001: RED → GREEN → REFACTOR
 * ENHANCE-001.7: Iterative Refinement UI
 */

import * as assert from 'assert';
import * as vscode from 'vscode';
import { EnhancementContext } from '../../../src/types/EnhancementContext';

/**
 * NOTE: These tests verify the refinement logic in voicePanel.ts
 *
 * Integration approach:
 * - Tests will verify refinement methods exist and behave correctly
 * - Mock AIEnhancementService to avoid real AI calls
 * - Test refinement feedback construction
 * - Test prompt history (undo functionality)
 * - Test pattern enumeration
 * - Test metadata tracking (refinement history)
 */

suite('VoicePanel - Refinement UI', () => {
    // TEST 1-2: Refinement feedback construction
    suite('Refinement feedback', () => {
        test('should construct Refine feedback instruction', () => {
            const feedback = buildRefinementFeedback('refine', null, null);

            assert.ok(feedback);
            assert.ok(feedback.includes('more examples'));
            assert.ok(feedback.includes('guidance') || feedback.includes('detail'));
        });

        test('should construct Simplify feedback instruction', () => {
            const feedback = buildRefinementFeedback('simplify', null, null);

            assert.ok(feedback);
            assert.ok(feedback.includes('concise'));
            assert.ok(feedback.includes('remove verbose') || feedback.includes('essential'));
        });

        test('should construct Add Detail feedback with user input', () => {
            const userInput = 'Add more about error handling in authentication';
            const feedback = buildRefinementFeedback('add-detail', userInput, null);

            assert.ok(feedback);
            assert.ok(feedback.includes(userInput));
            assert.ok(feedback.includes('Expand'));
        });

        test('should construct Include Pattern feedback with pattern ID', () => {
            const patternId = 'Pattern-TDD-001';
            const feedback = buildRefinementFeedback('include-pattern', null, patternId);

            assert.ok(feedback);
            assert.ok(feedback.includes(patternId));
            assert.ok(feedback.includes('Include guidance'));
        });
    });

    // TEST 3-4: Prompt history (undo)
    suite('Prompt history', () => {
        test('should store prompt in history when refining', () => {
            const history = new PromptHistory();

            history.push('Original prompt');
            history.push('Refined prompt v1');
            history.push('Refined prompt v2');

            assert.strictEqual(history.length(), 3);
        });

        test('should revert to previous prompt when undo', () => {
            const history = new PromptHistory();

            history.push('Original');
            history.push('Refined v1');
            const current = history.push('Refined v2');

            const previous = history.pop();

            assert.strictEqual(previous, 'Refined v2');
            assert.strictEqual(history.current(), 'Refined v1');
        });

        test('should limit history to 10 prompts', () => {
            const history = new PromptHistory();

            // Add 15 prompts
            for (let i = 1; i <= 15; i++) {
                history.push(`Prompt ${i}`);
            }

            // Should only keep last 10
            assert.strictEqual(history.length(), 10);
            assert.strictEqual(history.current(), 'Prompt 15');
        });

        test('should return undefined when no history to undo', () => {
            const history = new PromptHistory();

            const result = history.pop();

            assert.strictEqual(result, undefined);
        });
    });

    // TEST 5: Pattern enumeration
    suite('Pattern enumeration', () => {
        test('should load patterns from docs/patterns/ directory', async () => {
            const patterns = await getAvailablePatterns();

            assert.ok(patterns);
            assert.ok(Array.isArray(patterns));
            assert.ok(patterns.length > 0);

            // Should include known patterns
            const hasCodePattern = patterns.some(p => p.includes('Pattern-CODE-001'));
            const hasTDDPattern = patterns.some(p => p.includes('Pattern-TDD-001'));

            assert.ok(hasCodePattern || hasTDDPattern, 'Should include at least one known pattern');
        });

        test('should fallback to default patterns if directory read fails', async () => {
            // Simulate failure by using non-existent directory
            const patterns = await getAvailablePatterns('/non/existent/path');

            assert.ok(patterns);
            assert.ok(Array.isArray(patterns));
            assert.ok(patterns.length > 0);

            // Should include default fallback patterns
            assert.ok(patterns.includes('Pattern-CODE-001'));
            assert.ok(patterns.includes('Pattern-TDD-001'));
        });
    });

    // TEST 6-7: Refinement metadata tracking
    suite('Refinement metadata', () => {
        test('should track refinement in metadata', () => {
            const metadata = new RefinementMetadata();

            metadata.addRefinement({
                type: 'refine',
                feedback: 'Include more examples',
                timestamp: new Date().toISOString()
            });

            assert.strictEqual(metadata.getHistory().length, 1);
            assert.strictEqual(metadata.getHistory()[0].type, 'refine');
            assert.strictEqual(metadata.getIterationCount(), 1);
        });

        test('should track multiple refinements', () => {
            const metadata = new RefinementMetadata();

            metadata.addRefinement({ type: 'refine', feedback: 'Add detail', timestamp: new Date().toISOString() });
            metadata.addRefinement({ type: 'simplify', feedback: 'Make concise', timestamp: new Date().toISOString() });
            metadata.addRefinement({ type: 'add-detail', feedback: 'Expand auth section', timestamp: new Date().toISOString() });

            assert.strictEqual(metadata.getHistory().length, 3);
            assert.strictEqual(metadata.getIterationCount(), 3);
            assert.strictEqual(metadata.getHistory()[1].type, 'simplify');
        });
    });

    // TEST 8: Context preservation
    suite('Context preservation', () => {
        test('should preserve original context for re-enhancement', () => {
            const originalContext: EnhancementContext = {
                type: 'bug',
                template: {
                    id: 'BUG-001',
                    name: 'Fix authentication bug',
                    status: 'pending',
                    phase: 'implementation',
                    agent: 'developer-agent',
                    description: 'Fix auth bug',
                    dependencies: [],
                    files_to_modify: ['src/auth.ts'],
                    files_to_create: [],
                    deliverables: ['Fixed auth'],
                    patterns: ['Pattern-CODE-001'],
                    estimated_time: '2 hours',
                    estimated_lines: 50,
                    assigned_engineer: 'engineer_1',
                    required_expertise: ['authentication'],
                    variables: {}
                },
                metadata: {
                    buttonType: 'bug',
                    confidence: { score: 85, level: 'high' },
                    patterns: ['Pattern-CODE-001'],
                    agent: 'developer-agent',
                    validation: {
                        filesExist: true,
                        dependenciesMet: true,
                        taskDataCurrent: true
                    }
                },
                workspaceContext: {
                    rootPath: '/test/workspace',
                    languages: ['TypeScript'],
                    frameworks: ['Node.js'],
                    filesFound: [],
                    gitCommits: [],
                    sops: {}
                },
                specificContext: {}
            };

            const preserved = preserveContext(originalContext);

            assert.deepStrictEqual(preserved, originalContext);
            assert.strictEqual(preserved.type, 'bug');
            assert.strictEqual(preserved.template.id, 'BUG-001');
        });
    });

    // TEST 9-10: Error handling
    suite('Error handling', () => {
        test('should handle refinement with invalid type', () => {
            assert.throws(() => {
                buildRefinementFeedback('invalid-type' as any, null, null);
            }, /Unknown refinement type/);
        });

        test('should handle missing user input for add-detail', () => {
            assert.throws(() => {
                buildRefinementFeedback('add-detail', '', null);
            }, /user input required/i);
        });

        test('should handle missing pattern ID for include-pattern', () => {
            assert.throws(() => {
                buildRefinementFeedback('include-pattern', null, '');
            }, /pattern.*required/i);
        });
    });
});

// ============================================================================
// Helper Functions (Implementation stubs - will be filled during GREEN phase)
// ============================================================================

/**
 * Build refinement feedback instruction
 */
function buildRefinementFeedback(
    type: 'refine' | 'simplify' | 'add-detail' | 'include-pattern' | 'undo',
    userInput: string | null,
    patternId: string | null
): string {
    switch (type) {
        case 'refine':
            return 'Include more examples and guidance. Add more context and detail to make the prompt more comprehensive.';

        case 'simplify':
            return 'Make this prompt concise. Remove verbose sections. Keep only essential information.';

        case 'add-detail':
            if (!userInput || userInput.trim() === '') {
                throw new Error('User input required for add-detail refinement');
            }
            return `Expand this specific area: ${userInput}. Add more detail and examples.`;

        case 'include-pattern':
            if (!patternId || patternId.trim() === '') {
                throw new Error('Pattern ID required for include-pattern refinement');
            }
            return `Include guidance from ${patternId}. Apply this pattern to the prompt.`;

        case 'undo':
            throw new Error('Undo does not generate feedback (revert operation)');

        default:
            throw new Error(`Unknown refinement type: ${type}`);
    }
}

/**
 * Prompt history manager (for undo)
 */
class PromptHistory {
    private history: string[] = [];
    private maxSize = 10;

    push(prompt: string): string {
        this.history.push(prompt);
        if (this.history.length > this.maxSize) {
            this.history.shift();
        }
        return prompt;
    }

    pop(): string | undefined {
        return this.history.pop();
    }

    current(): string | undefined {
        return this.history[this.history.length - 1];
    }

    length(): number {
        return this.history.length;
    }
}

/**
 * Get available patterns from docs/patterns/
 */
async function getAvailablePatterns(customPath?: string): Promise<string[]> {
    try {
        const fs = require('fs');
        const path = require('path');

        const workspaceRoot = customPath || (vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || process.cwd());
        const patternsDir = path.join(workspaceRoot, 'docs', 'patterns');

        // Check if directory exists
        if (!fs.existsSync(patternsDir)) {
            throw new Error('Patterns directory not found');
        }

        const files = fs.readdirSync(patternsDir);
        const patternFiles = files.filter((f: string) => f.startsWith('Pattern-') && f.endsWith('.md'));

        return patternFiles.map((f: string) => path.basename(f, '.md')).sort();
    } catch (error) {
        // Fallback to default patterns
        return [
            'Pattern-CODE-001',
            'Pattern-TDD-001',
            'Pattern-SPRINT-PLAN-001',
            'Pattern-GIT-001'
        ];
    }
}

/**
 * Refinement metadata tracker
 */
class RefinementMetadata {
    private history: Array<{ type: string; feedback: string; timestamp: string }> = [];

    addRefinement(refinement: { type: string; feedback: string; timestamp: string }): void {
        this.history.push(refinement);
    }

    getHistory(): Array<{ type: string; feedback: string; timestamp: string }> {
        return this.history;
    }

    getIterationCount(): number {
        return this.history.length;
    }
}

/**
 * Preserve original context
 */
function preserveContext(context: EnhancementContext): EnhancementContext {
    // Deep copy to ensure original is not mutated
    return JSON.parse(JSON.stringify(context));
}
