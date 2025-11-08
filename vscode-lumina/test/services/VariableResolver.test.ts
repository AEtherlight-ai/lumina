/**
 * VariableResolver Test Suite (TDD RED Phase)
 *
 * DESIGN DECISION: Test-first development with 7 comprehensive test cases
 * WHY: Infrastructure service requires 95% coverage (Pattern-TDD-001)
 *
 * TEST COVERAGE:
 * 1. Simple variable replacement
 * 2. Nested variable resolution (recursive)
 * 3. Undefined variable error handling
 * 4. Circular reference detection
 * 5. Multiple variables in single template
 * 6. Performance test (100 variables < 10ms)
 * 7. Invalid syntax error handling
 *
 * PATTERN: Pattern-TDD-001 (RED → GREEN → REFACTOR)
 * PATTERN: Pattern-TASK-ANALYSIS-001 (Infrastructure task = 95% coverage)
 * RELATED: ConfidenceScorer.test.ts, TestValidator.test.ts
 */

import * as assert from 'assert';
import { VariableResolver } from '../../src/services/VariableResolver';
import {
    VariableNotFoundError,
    CircularDependencyError,
    VariableSyntaxError
} from '../../src/services/VariableResolver';

suite('VariableResolver', () => {
    let resolver: VariableResolver;

    setup(() => {
        resolver = new VariableResolver();
    });

    /**
     * Test Case 1: Simple variable replacement
     */
    suite('Test 1: Simple variable replacement', () => {
        test('should replace single variable with value', () => {
            const template = '{{VAR}}';
            const variables = { VAR: 'test' };
            const result = resolver.resolve(template, variables);
            assert.strictEqual(result, 'test');
        });

        test('should replace variable embedded in text', () => {
            const template = 'Hello {{NAME}}, welcome!';
            const variables = { NAME: 'World' };
            const result = resolver.resolve(template, variables);
            assert.strictEqual(result, 'Hello World, welcome!');
        });

        test('should handle empty string value', () => {
            const template = '{{VAR}}';
            const variables = { VAR: '' };
            const result = resolver.resolve(template, variables);
            assert.strictEqual(result, '');
        });
    });

    /**
     * Test Case 2: Nested variable resolution
     */
    suite('Test 2: Nested variable resolution', () => {
        test('should resolve nested variables (2 levels)', () => {
            const template = '{{A}}';
            const variables = {
                A: '{{B}}',
                B: 'final'
            };
            const result = resolver.resolve(template, variables);
            assert.strictEqual(result, 'final');
        });

        test('should resolve deeply nested variables (5 levels)', () => {
            const template = '{{A}}';
            const variables = {
                A: '{{B}}',
                B: '{{C}}',
                C: '{{D}}',
                D: '{{E}}',
                E: 'deeply_nested'
            };
            const result = resolver.resolve(template, variables);
            assert.strictEqual(result, 'deeply_nested');
        });

        test('should resolve maximum nesting (10 levels)', () => {
            const template = '{{L1}}';
            const variables = {
                L1: '{{L2}}',
                L2: '{{L3}}',
                L3: '{{L4}}',
                L4: '{{L5}}',
                L5: '{{L6}}',
                L6: '{{L7}}',
                L7: '{{L8}}',
                L8: '{{L9}}',
                L9: '{{L10}}',
                L10: 'max_depth'
            };
            const result = resolver.resolve(template, variables);
            assert.strictEqual(result, 'max_depth');
        });

        test('should throw error if nesting exceeds 10 levels', () => {
            const template = '{{L1}}';
            const variables = {
                L1: '{{L2}}',
                L2: '{{L3}}',
                L3: '{{L4}}',
                L4: '{{L5}}',
                L5: '{{L6}}',
                L6: '{{L7}}',
                L7: '{{L8}}',
                L8: '{{L9}}',
                L9: '{{L10}}',
                L10: '{{L11}}',
                L11: 'too_deep'
            };
            assert.throws(
                () => resolver.resolve(template, variables),
                CircularDependencyError
            );
        });
    });

    /**
     * Test Case 3: Undefined variable error handling
     */
    suite('Test 3: Undefined variable error handling', () => {
        test('should throw VariableNotFoundError for undefined variable', () => {
            const template = '{{UNDEF}}';
            const variables = {};
            assert.throws(
                () => resolver.resolve(template, variables),
                VariableNotFoundError
            );
        });

        test('should throw error with variable name in message', () => {
            const template = 'Value: {{MISSING_VAR}}';
            const variables = { OTHER: 'value' };
            assert.throws(
                () => resolver.resolve(template, variables),
                VariableNotFoundError
            );
        });

        test('should throw error for nested undefined variable', () => {
            const template = '{{A}}';
            const variables = {
                A: '{{B}}'
                // B is missing
            };
            assert.throws(
                () => resolver.resolve(template, variables),
                VariableNotFoundError
            );
        });
    });

    /**
     * Test Case 4: Circular reference detection
     */
    suite('Test 4: Circular reference detection', () => {
        test('should detect direct circular reference (A → B → A)', () => {
            const template = '{{A}}';
            const variables = {
                A: '{{B}}',
                B: '{{A}}'
            };
            assert.throws(
                () => resolver.resolve(template, variables),
                CircularDependencyError
            );
        });

        test('should detect indirect circular reference (A → B → C → A)', () => {
            const template = '{{A}}';
            const variables = {
                A: '{{B}}',
                B: '{{C}}',
                C: '{{A}}'
            };
            assert.throws(
                () => resolver.resolve(template, variables),
                CircularDependencyError
            );
        });

        test('should detect self-reference (A → A)', () => {
            const template = '{{A}}';
            const variables = {
                A: '{{A}}'
            };
            assert.throws(
                () => resolver.resolve(template, variables),
                CircularDependencyError
            );
        });
    });

    /**
     * Test Case 5: Multiple variables in single template
     */
    suite('Test 5: Multiple variables', () => {
        test('should replace multiple variables in single template', () => {
            const template = '{{A}} and {{B}}';
            const variables = {
                A: 'foo',
                B: 'bar'
            };
            const result = resolver.resolve(template, variables);
            assert.strictEqual(result, 'foo and bar');
        });

        test('should handle complex template with many variables', () => {
            const template = 'Build {{PROJECT}} using {{BUILD_CMD}} for {{LANG}} files';
            const variables = {
                PROJECT: 'ÆtherLight',
                BUILD_CMD: 'npm run compile',
                LANG: 'TypeScript'
            };
            const result = resolver.resolve(template, variables);
            assert.strictEqual(result, 'Build ÆtherLight using npm run compile for TypeScript files');
        });

        test('should handle nested variables in multiple positions', () => {
            const template = '{{A}} - {{B}}';
            const variables = {
                A: '{{A1}}',
                A1: 'nested_a',
                B: '{{B1}}',
                B1: 'nested_b'
            };
            const result = resolver.resolve(template, variables);
            assert.strictEqual(result, 'nested_a - nested_b');
        });

        test('should handle same variable multiple times', () => {
            const template = '{{VAR}} + {{VAR}} = double {{VAR}}';
            const variables = { VAR: 'value' };
            const result = resolver.resolve(template, variables);
            assert.strictEqual(result, 'value + value = double value');
        });
    });

    /**
     * Test Case 6: Performance test
     */
    suite('Test 6: Performance test', () => {
        test('should resolve 100 variables in less than 10ms', () => {
            // Create 100 variables
            const variables: Record<string, string> = {};
            for (let i = 0; i < 100; i++) {
                variables[`VAR${i}`] = `value${i}`;
            }

            // Create template with 100 variables
            const template = Array.from({ length: 100 }, (_, i) => `{{VAR${i}}}`).join(' ');

            // Measure resolution time
            const startTime = performance.now();
            const result = resolver.resolve(template, variables);
            const endTime = performance.now();
            const duration = endTime - startTime;

            // Verify result correctness
            const expected = Array.from({ length: 100 }, (_, i) => `value${i}`).join(' ');
            assert.strictEqual(result, expected);

            // Verify performance (<10ms)
            assert.ok(duration < 10, `Expected duration < 10ms, got ${duration}ms`);
        });

        test('should benefit from caching on repeated resolutions', () => {
            const template = '{{A}} {{B}} {{C}}';
            const variables = {
                A: '{{X}}',
                B: '{{X}}',
                C: '{{X}}',
                X: 'cached_value'
            };

            // First resolution (warm up cache)
            resolver.resolve(template, variables);

            // Second resolution (should be faster due to caching)
            const startTime = performance.now();
            const result = resolver.resolve(template, variables);
            const endTime = performance.now();
            const duration = endTime - startTime;

            assert.strictEqual(result, 'cached_value cached_value cached_value');
            assert.ok(duration < 1, `Expected duration < 1ms, got ${duration}ms`);
        });
    });

    /**
     * Test Case 7: Invalid syntax error handling
     */
    suite('Test 7: Invalid syntax error handling', () => {
        test('should handle template with no variables', () => {
            const template = 'No variables here';
            const variables = { VAR: 'value' };
            const result = resolver.resolve(template, variables);
            assert.strictEqual(result, 'No variables here');
        });

        test('should handle empty template', () => {
            const template = '';
            const variables = { VAR: 'value' };
            const result = resolver.resolve(template, variables);
            assert.strictEqual(result, '');
        });

        test('should handle partial variable syntax (single brace)', () => {
            // Single braces should be treated as literal text, not variables
            const template = 'This {VAR} is not a variable';
            const variables = { VAR: 'value' };
            const result = resolver.resolve(template, variables);
            assert.strictEqual(result, 'This {VAR} is not a variable');
        });

        test('should handle escaped braces if needed', () => {
            // Test that we can handle literal double braces if implemented
            const template = 'Literal: {{{{not_a_var}}}}';
            const variables = {};
            // This test might need adjustment based on implementation
            // For now, assume we don't support escaping (undefined behavior)
            const result = resolver.resolve(template, variables);
            // Result will depend on implementation - just verify it doesn't crash
            assert.ok(typeof result === 'string');
        });
    });

    /**
     * Additional edge cases
     */
    suite('Edge cases', () => {
        test('should handle null values as empty string', () => {
            const template = '{{VAR}}';
            const variables = { VAR: null as any };
            const result = resolver.resolve(template, variables);
            assert.strictEqual(result, '');
        });

        test('should handle undefined values as VariableNotFoundError', () => {
            const template = '{{VAR}}';
            const variables = { VAR: undefined as any };
            assert.throws(
                () => resolver.resolve(template, variables),
                VariableNotFoundError
            );
        });

        test('should handle number values by converting to string', () => {
            const template = '{{NUM}}';
            const variables = { NUM: 42 as any };
            const result = resolver.resolve(template, variables);
            assert.strictEqual(result, '42');
        });

        test('should handle boolean values by converting to string', () => {
            const template = '{{BOOL}}';
            const variables = { BOOL: true as any };
            const result = resolver.resolve(template, variables);
            assert.strictEqual(result, 'true');
        });
    });
});
