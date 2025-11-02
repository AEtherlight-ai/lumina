/**
 * Tests for PatternLibrary
 *
 * TEST STRATEGY (TDD - Red/Green/Refactor):
 * 1. Write tests FIRST → Run → FAIL (red)
 * 2. Implement minimum code → Run → PASS (green)
 * 3. Refactor for clarity → Run → STILL PASS
 *
 * TEST COVERAGE:
 * 1. Pattern file loading from filesystem
 * 2. Pattern metadata extraction (id, name, description, keywords, category)
 * 3. Keyword-based search (find relevant patterns)
 * 4. Top N results (return 3-5 most relevant)
 * 5. Pattern descriptions included in results
 * 6. Caching (no redundant file reads)
 * 7. Performance (<200ms per search)
 *
 * UNIT TEST APPROACH:
 * WHY: PatternLibrary is pure Node.js module (fs operations, no VS Code dependencies)
 * HOW: Run with plain Mocha in Node.js (npm run test:unit)
 * REASONING: Fast, isolated, proper TDD
 *
 * RUN TESTS: npm run test:unit
 */

import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import { PatternLibrary, Pattern, PatternSearchResult } from '../../services/PatternLibrary';

suite('PatternLibrary Tests', () => {
    let library: PatternLibrary;
    const testPatternsDir = path.join(__dirname, '../../../test-data/patterns');

    setup(() => {
        // Create test patterns directory
        if (!fs.existsSync(testPatternsDir)) {
            fs.mkdirSync(testPatternsDir, { recursive: true });
        }

        library = new PatternLibrary();
    });

    teardown(() => {
        // Cleanup test patterns
        if (fs.existsSync(testPatternsDir)) {
            const files = fs.readdirSync(testPatternsDir);
            files.forEach(file => fs.unlinkSync(path.join(testPatternsDir, file)));
            fs.rmdirSync(testPatternsDir);
        }
    });

    suite('Pattern Loading', () => {
        test('should load patterns from directory', async () => {
            // Create test pattern file
            const patternContent = `# Pattern-TEST-001: Test Pattern

**CREATED:** 2025-11-01
**CATEGORY:** Testing
**QUALITY SCORE:** 0.95
**APPLICABILITY:** Unit testing

## Context

This is a test pattern for unit testing.

## Problem

Testing patterns need to be loaded correctly.

## Solution

Load and parse pattern files.
`;
            fs.writeFileSync(path.join(testPatternsDir, 'Pattern-TEST-001.md'), patternContent);

            const patterns = await library.loadPatterns(testPatternsDir);
            assert.ok(patterns.length > 0);
            assert.ok(patterns.some(p => p.id === 'Pattern-TEST-001'));
        });

        test('should extract pattern metadata correctly', async () => {
            const patternContent = `# Pattern-API-001: REST Endpoint Structure

**CREATED:** 2025-10-15
**CATEGORY:** API Architecture
**QUALITY SCORE:** 0.92
**APPLICABILITY:** REST APIs with validation

## Context

REST endpoints need consistent structure.
`;
            fs.writeFileSync(path.join(testPatternsDir, 'Pattern-API-001.md'), patternContent);

            const patterns = await library.loadPatterns(testPatternsDir);
            const pattern = patterns.find(p => p.id === 'Pattern-API-001');

            assert.ok(pattern);
            assert.strictEqual(pattern!.id, 'Pattern-API-001');
            assert.strictEqual(pattern!.name, 'REST Endpoint Structure');
            assert.strictEqual(pattern!.category, 'API Architecture');
            assert.ok(pattern!.description.length > 0);
        });

        test('should extract keywords from pattern content', async () => {
            const patternContent = `# Pattern-AUTH-001: JWT Authentication Middleware

**CREATED:** 2025-10-15
**CATEGORY:** Authentication
**QUALITY SCORE:** 0.95
**APPLICABILITY:** Web applications with token-based auth

## Context

JWT tokens are widely used for authentication in modern web applications.

## Problem

Authentication logic scattered across codebase.

## Solution

Centralized JWT middleware for authentication and token validation.
`;
            fs.writeFileSync(path.join(testPatternsDir, 'Pattern-AUTH-001.md'), patternContent);

            const patterns = await library.loadPatterns(testPatternsDir);
            const pattern = patterns.find(p => p.id === 'Pattern-AUTH-001');

            assert.ok(pattern);
            assert.ok(pattern!.keywords.length > 0);
            assert.ok(pattern!.keywords.includes('jwt'));
            assert.ok(pattern!.keywords.includes('authentication'));
        });

        test('should handle multiple pattern files', async () => {
            fs.writeFileSync(path.join(testPatternsDir, 'Pattern-TEST-001.md'), '# Pattern-TEST-001: Test One\n\n**CATEGORY:** Testing\n\n## Context\n\nTest pattern 1.');
            fs.writeFileSync(path.join(testPatternsDir, 'Pattern-TEST-002.md'), '# Pattern-TEST-002: Test Two\n\n**CATEGORY:** Testing\n\n## Context\n\nTest pattern 2.');
            fs.writeFileSync(path.join(testPatternsDir, 'Pattern-TEST-003.md'), '# Pattern-TEST-003: Test Three\n\n**CATEGORY:** Testing\n\n## Context\n\nTest pattern 3.');

            const patterns = await library.loadPatterns(testPatternsDir);
            assert.strictEqual(patterns.length, 3);
        });
    });

    suite('Keyword Search', () => {
        test('should find patterns by keyword', async () => {
            const apiPattern = `# Pattern-API-001: REST API Structure

**CATEGORY:** API
**APPLICABILITY:** REST endpoints

## Context

RESTful API endpoint structure with validation.
`;
            fs.writeFileSync(path.join(testPatternsDir, 'Pattern-API-001.md'), apiPattern);

            await library.loadPatterns(testPatternsDir);
            const results = library.searchPatterns('api rest endpoint', 5);

            assert.ok(results.length > 0);
            assert.ok(results.some(r => r.pattern.id === 'Pattern-API-001'));
        });

        test('should rank patterns by relevance', async () => {
            const pattern1 = `# Pattern-AUTH-001: JWT Authentication

**CATEGORY:** Authentication

## Context

JWT token authentication and validation.
`;
            const pattern2 = `# Pattern-API-001: REST Endpoint

**CATEGORY:** API

## Context

REST endpoint structure.
`;
            fs.writeFileSync(path.join(testPatternsDir, 'Pattern-AUTH-001.md'), pattern1);
            fs.writeFileSync(path.join(testPatternsDir, 'Pattern-API-001.md'), pattern2);

            await library.loadPatterns(testPatternsDir);
            const results = library.searchPatterns('jwt authentication token', 5);

            assert.ok(results.length > 0);
            // Most relevant should be first
            assert.strictEqual(results[0].pattern.id, 'Pattern-AUTH-001');
        });

        test('should return top N results', async () => {
            // Create 10 patterns
            for (let i = 1; i <= 10; i++) {
                const content = `# Pattern-TEST-${i.toString().padStart(3, '0')}: Test Pattern ${i}

**CATEGORY:** Testing

## Context

Test pattern ${i} for search testing.
`;
                fs.writeFileSync(path.join(testPatternsDir, `Pattern-TEST-${i.toString().padStart(3, '0')}.md`), content);
            }

            await library.loadPatterns(testPatternsDir);
            const results = library.searchPatterns('test pattern', 5);

            assert.strictEqual(results.length, 5);
        });

        test('should include pattern descriptions in results', async () => {
            const pattern = `# Pattern-TEST-001: Test Pattern

**CATEGORY:** Testing
**APPLICABILITY:** Unit testing frameworks

## Context

This is a comprehensive test pattern description.
`;
            fs.writeFileSync(path.join(testPatternsDir, 'Pattern-TEST-001.md'), pattern);

            await library.loadPatterns(testPatternsDir);
            const results = library.searchPatterns('test', 5);

            assert.ok(results.length > 0);
            const result = results.find(r => r.pattern.id === 'Pattern-TEST-001');
            assert.ok(result);
            assert.ok(result!.pattern.description.length > 0);
        });

        test('should return empty array for no matches', async () => {
            const pattern = `# Pattern-API-001: REST API

**CATEGORY:** API

## Context

REST endpoint.
`;
            fs.writeFileSync(path.join(testPatternsDir, 'Pattern-API-001.md'), pattern);

            await library.loadPatterns(testPatternsDir);
            const results = library.searchPatterns('blockchain cryptocurrency', 5);

            assert.strictEqual(results.length, 0);
        });
    });

    suite('Caching', () => {
        test('should cache loaded patterns', async () => {
            const pattern = `# Pattern-CACHE-001: Caching Pattern

**CATEGORY:** Performance

## Context

Caching test pattern.
`;
            fs.writeFileSync(path.join(testPatternsDir, 'Pattern-CACHE-001.md'), pattern);

            // First load
            const start1 = Date.now();
            await library.loadPatterns(testPatternsDir);
            const duration1 = Date.now() - start1;

            // Second search (should use cache)
            const start2 = Date.now();
            library.searchPatterns('caching', 5);
            const duration2 = Date.now() - start2;

            // Cache should be faster (no file I/O)
            assert.ok(duration2 < duration1 + 50); // Allow 50ms margin
        });

        test('should not reload patterns on subsequent searches', async () => {
            const pattern = `# Pattern-TEST-001: Test

**CATEGORY:** Testing

## Context

Test pattern.
`;
            fs.writeFileSync(path.join(testPatternsDir, 'Pattern-TEST-001.md'), pattern);

            await library.loadPatterns(testPatternsDir);
            const results1 = library.searchPatterns('test', 5);

            // Delete file after loading
            fs.unlinkSync(path.join(testPatternsDir, 'Pattern-TEST-001.md'));

            // Should still work from cache
            const results2 = library.searchPatterns('test', 5);
            assert.strictEqual(results1.length, results2.length);
        });
    });

    suite('Performance', () => {
        test('should search patterns in <200ms', async () => {
            // Create 20 patterns
            for (let i = 1; i <= 20; i++) {
                const content = `# Pattern-PERF-${i.toString().padStart(3, '0')}: Performance Test ${i}

**CATEGORY:** Testing
**APPLICABILITY:** Performance testing

## Context

Performance test pattern ${i} with various keywords for search testing.
`;
                fs.writeFileSync(path.join(testPatternsDir, `Pattern-PERF-${i.toString().padStart(3, '0')}.md`), content);
            }

            await library.loadPatterns(testPatternsDir);

            const start = Date.now();
            library.searchPatterns('performance testing keywords', 5);
            const duration = Date.now() - start;

            assert.ok(duration < 200, `Search took ${duration}ms (should be <200ms)`);
        });
    });
});
