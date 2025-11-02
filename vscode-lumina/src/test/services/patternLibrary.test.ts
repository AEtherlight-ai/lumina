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

    suite('Relationship Extraction (Neural Network Foundation)', () => {
        test('should extract related patterns', async () => {
            const content = `# Pattern-API-001: REST API Structure

**CATEGORY:** API
**RELATED:** Pattern-AUTH-001, Pattern-JWT-001

## Context

REST API with authentication.
`;
            fs.writeFileSync(path.join(testPatternsDir, 'Pattern-API-001.md'), content);

            const patterns = await library.loadPatterns(testPatternsDir);
            const pattern = patterns.find(p => p.id === 'Pattern-API-001');

            assert.ok(pattern);
            assert.strictEqual(pattern!.relatedPatterns.length, 2);
            assert.ok(pattern!.relatedPatterns.includes('Pattern-AUTH-001'));
            assert.ok(pattern!.relatedPatterns.includes('Pattern-JWT-001'));
        });

        test('should extract supersedes relationship', async () => {
            const content = `# Pattern-API-002: REST API Structure v2

**CATEGORY:** API
**SUPERSEDES:** Pattern-API-001

## Context

Improved REST API structure.
`;
            fs.writeFileSync(path.join(testPatternsDir, 'Pattern-API-002.md'), content);

            const patterns = await library.loadPatterns(testPatternsDir);
            const pattern = patterns.find(p => p.id === 'Pattern-API-002');

            assert.ok(pattern);
            assert.strictEqual(pattern!.supersedes, 'Pattern-API-001');
        });

        test('should extract dependencies', async () => {
            const content = `# Pattern-AUTH-001: JWT Authentication

**CATEGORY:** Authentication
**DEPENDENCIES:** Pattern-BASE-001, Pattern-CRYPTO-001

## Context

JWT authentication requires base utilities and crypto.
`;
            fs.writeFileSync(path.join(testPatternsDir, 'Pattern-AUTH-001.md'), content);

            const patterns = await library.loadPatterns(testPatternsDir);
            const pattern = patterns.find(p => p.id === 'Pattern-AUTH-001');

            assert.ok(pattern);
            assert.strictEqual(pattern!.dependencies.length, 2);
            assert.ok(pattern!.dependencies.includes('Pattern-BASE-001'));
            assert.ok(pattern!.dependencies.includes('Pattern-CRYPTO-001'));
        });

        test('should extract cross-links from content', async () => {
            const content = `# Pattern-API-001: REST API

**CATEGORY:** API

## Context

This pattern builds on Pattern-AUTH-001 and Pattern-JWT-001 for authentication.

## Solution

Use Pattern-VALIDATION-001 for input validation.
`;
            fs.writeFileSync(path.join(testPatternsDir, 'Pattern-API-001.md'), content);

            const patterns = await library.loadPatterns(testPatternsDir);
            const pattern = patterns.find(p => p.id === 'Pattern-API-001');

            assert.ok(pattern);
            // Cross-links include patterns referenced in content (including self-reference)
            assert.ok(pattern!.crossLinks.length >= 3);
            assert.ok(pattern!.crossLinks.includes('PATTERN-AUTH-001'));
            assert.ok(pattern!.crossLinks.includes('PATTERN-JWT-001'));
            assert.ok(pattern!.crossLinks.includes('PATTERN-VALIDATION-001'));
        });
    });

    suite('Content Hashing (Pattern-CONTEXT-002)', () => {
        test('should calculate SHA-256 hash for pattern', async () => {
            const content = `# Pattern-HASH-001: Test Pattern

**CATEGORY:** Testing

## Context

Test pattern for content hashing.
`;
            fs.writeFileSync(path.join(testPatternsDir, 'Pattern-HASH-001.md'), content);

            const patterns = await library.loadPatterns(testPatternsDir);
            const pattern = patterns.find(p => p.id === 'Pattern-HASH-001');

            assert.ok(pattern);
            assert.ok(pattern!.contentHash);
            assert.strictEqual(pattern!.contentHash!.length, 64); // SHA-256 = 64 hex chars
        });

        test('should produce different hashes for different content', async () => {
            const content1 = `# Pattern-HASH-001: Test Pattern 1

**CATEGORY:** Testing

## Context

Test pattern 1.
`;
            const content2 = `# Pattern-HASH-002: Test Pattern 2

**CATEGORY:** Testing

## Context

Test pattern 2.
`;
            fs.writeFileSync(path.join(testPatternsDir, 'Pattern-HASH-001.md'), content1);
            fs.writeFileSync(path.join(testPatternsDir, 'Pattern-HASH-002.md'), content2);

            const patterns = await library.loadPatterns(testPatternsDir);
            const pattern1 = patterns.find(p => p.id === 'Pattern-HASH-001');
            const pattern2 = patterns.find(p => p.id === 'Pattern-HASH-002');

            assert.ok(pattern1);
            assert.ok(pattern2);
            assert.notStrictEqual(pattern1!.contentHash, pattern2!.contentHash);
        });
    });

    suite('Domain and Region Classification', () => {
        test('should extract domain from category', async () => {
            const apiContent = `# Pattern-API-001: REST API

**CATEGORY:** API Architecture

## Context

REST API pattern.
`;
            const authContent = `# Pattern-AUTH-001: JWT Authentication

**CATEGORY:** Authentication

## Context

JWT authentication pattern.
`;
            fs.writeFileSync(path.join(testPatternsDir, 'Pattern-API-001.md'), apiContent);
            fs.writeFileSync(path.join(testPatternsDir, 'Pattern-AUTH-001.md'), authContent);

            const patterns = await library.loadPatterns(testPatternsDir);
            const apiPattern = patterns.find(p => p.id === 'Pattern-API-001');
            const authPattern = patterns.find(p => p.id === 'Pattern-AUTH-001');

            assert.ok(apiPattern);
            assert.ok(authPattern);
            assert.strictEqual(apiPattern!.domain, 'api');
            assert.strictEqual(authPattern!.domain, 'authentication');
        });

        test('should extract region from content', async () => {
            const content = `# Pattern-REGION-001: Regional Pattern

**CATEGORY:** Regional
**REGION:** us-midwest

## Context

Region-specific pattern.
`;
            fs.writeFileSync(path.join(testPatternsDir, 'Pattern-REGION-001.md'), content);

            const patterns = await library.loadPatterns(testPatternsDir);
            const pattern = patterns.find(p => p.id === 'Pattern-REGION-001');

            assert.ok(pattern);
            assert.strictEqual(pattern!.region, 'us-midwest');
        });
    });

    suite('Graph Traversal (Neural Network)', () => {
        test('should find related patterns at depth 1', async () => {
            // Create pattern network: API-001 -> AUTH-001 -> JWT-001
            const api = `# Pattern-API-001: REST API

**CATEGORY:** API
**RELATED:** Pattern-AUTH-001

## Context

REST API.
`;
            const auth = `# Pattern-AUTH-001: Authentication

**CATEGORY:** Authentication
**RELATED:** Pattern-JWT-001

## Context

Authentication.
`;
            const jwt = `# Pattern-JWT-001: JWT

**CATEGORY:** Authentication

## Context

JWT tokens.
`;
            fs.writeFileSync(path.join(testPatternsDir, 'Pattern-API-001.md'), api);
            fs.writeFileSync(path.join(testPatternsDir, 'Pattern-AUTH-001.md'), auth);
            fs.writeFileSync(path.join(testPatternsDir, 'Pattern-JWT-001.md'), jwt);

            await library.loadPatterns(testPatternsDir);
            const related = library.findRelatedPatterns('Pattern-API-001', 1);

            assert.strictEqual(related.length, 1);
            assert.strictEqual(related[0].pattern.id, 'Pattern-AUTH-001');
            assert.strictEqual(related[0].distance, 1);
        });

        test('should find related patterns at depth 2', async () => {
            // Create pattern network: API-001 -> AUTH-001 -> JWT-001
            const api = `# Pattern-API-001: REST API

**CATEGORY:** API
**RELATED:** Pattern-AUTH-001

## Context

REST API.
`;
            const auth = `# Pattern-AUTH-001: Authentication

**CATEGORY:** Authentication
**RELATED:** Pattern-JWT-001

## Context

Authentication.
`;
            const jwt = `# Pattern-JWT-001: JWT

**CATEGORY:** Authentication

## Context

JWT tokens.
`;
            fs.writeFileSync(path.join(testPatternsDir, 'Pattern-API-001.md'), api);
            fs.writeFileSync(path.join(testPatternsDir, 'Pattern-AUTH-001.md'), auth);
            fs.writeFileSync(path.join(testPatternsDir, 'Pattern-JWT-001.md'), jwt);

            await library.loadPatterns(testPatternsDir);
            const related = library.findRelatedPatterns('Pattern-API-001', 2);

            assert.strictEqual(related.length, 2);
            assert.ok(related.some(r => r.pattern.id === 'Pattern-AUTH-001' && r.distance === 1));
            assert.ok(related.some(r => r.pattern.id === 'Pattern-JWT-001' && r.distance === 2));
        });

        test('should find dependencies recursively', async () => {
            // Create dependency chain: API-001 -> AUTH-001 -> JWT-001
            const api = `# Pattern-API-001: REST API

**CATEGORY:** API
**DEPENDENCIES:** Pattern-AUTH-001

## Context

REST API.
`;
            const auth = `# Pattern-AUTH-001: Authentication

**CATEGORY:** Authentication
**DEPENDENCIES:** Pattern-JWT-001

## Context

Authentication.
`;
            const jwt = `# Pattern-JWT-001: JWT

**CATEGORY:** Authentication

## Context

JWT tokens.
`;
            fs.writeFileSync(path.join(testPatternsDir, 'Pattern-API-001.md'), api);
            fs.writeFileSync(path.join(testPatternsDir, 'Pattern-AUTH-001.md'), auth);
            fs.writeFileSync(path.join(testPatternsDir, 'Pattern-JWT-001.md'), jwt);

            await library.loadPatterns(testPatternsDir);
            const deps = library.findDependencies('Pattern-API-001');

            // Should return dependencies in order: JWT-001, AUTH-001
            assert.strictEqual(deps.length, 2);
            assert.strictEqual(deps[0].id, 'Pattern-JWT-001'); // Deepest dependency first
            assert.strictEqual(deps[1].id, 'Pattern-AUTH-001');
        });

        test('should follow supersession chain', async () => {
            // Create supersession chain: API-001 -> API-002 -> API-003
            const api1 = `# Pattern-API-001: REST API v1

**CATEGORY:** API
**SUPERSEDED BY:** Pattern-API-002
**STATUS:** Deprecated

## Context

Old API.
`;
            const api2 = `# Pattern-API-002: REST API v2

**CATEGORY:** API
**SUPERSEDES:** Pattern-API-001
**SUPERSEDED BY:** Pattern-API-003
**STATUS:** Deprecated

## Context

Intermediate API.
`;
            const api3 = `# Pattern-API-003: REST API v3

**CATEGORY:** API
**SUPERSEDES:** Pattern-API-002
**STATUS:** Active

## Context

Current API.
`;
            fs.writeFileSync(path.join(testPatternsDir, 'Pattern-API-001.md'), api1);
            fs.writeFileSync(path.join(testPatternsDir, 'Pattern-API-002.md'), api2);
            fs.writeFileSync(path.join(testPatternsDir, 'Pattern-API-003.md'), api3);

            await library.loadPatterns(testPatternsDir);
            const current = library.findSupersededBy('Pattern-API-001');

            assert.ok(current);
            assert.strictEqual(current!.id, 'Pattern-API-003');
        });
    });

    suite('Ripple Effect Detection', () => {
        test('should detect patterns affected by changes', async () => {
            // Create pattern network where multiple patterns depend on BASE-001
            const base = `# Pattern-BASE-001: Base Utilities

**CATEGORY:** Infrastructure

## Context

Base utilities.
`;
            const api = `# Pattern-API-001: REST API

**CATEGORY:** API
**DEPENDENCIES:** Pattern-BASE-001

## Context

REST API depends on base utilities.
`;
            const auth = `# Pattern-AUTH-001: Authentication

**CATEGORY:** Authentication
**RELATED:** Pattern-BASE-001

## Context

Authentication uses base utilities.
`;
            fs.writeFileSync(path.join(testPatternsDir, 'Pattern-BASE-001.md'), base);
            fs.writeFileSync(path.join(testPatternsDir, 'Pattern-API-001.md'), api);
            fs.writeFileSync(path.join(testPatternsDir, 'Pattern-AUTH-001.md'), auth);

            await library.loadPatterns(testPatternsDir);
            const affected = library.detectRippleEffects('Pattern-BASE-001');

            assert.ok(affected.length >= 2);
            assert.ok(affected.some(p => p.id === 'Pattern-API-001')); // Depends on BASE-001
            assert.ok(affected.some(p => p.id === 'Pattern-AUTH-001')); // Related to BASE-001
        });
    });

    suite('Pattern Graph Visualization', () => {
        test('should generate pattern graph structure', async () => {
            const api = `# Pattern-API-001: REST API

**CATEGORY:** API
**RELATED:** Pattern-AUTH-001

## Context

REST API.
`;
            const auth = `# Pattern-AUTH-001: Authentication

**CATEGORY:** Authentication

## Context

Authentication.
`;
            fs.writeFileSync(path.join(testPatternsDir, 'Pattern-API-001.md'), api);
            fs.writeFileSync(path.join(testPatternsDir, 'Pattern-AUTH-001.md'), auth);

            await library.loadPatterns(testPatternsDir);
            const graph = library.getPatternGraph();

            assert.ok(graph);
            assert.strictEqual(graph.nodes.length, 2);
            assert.ok(graph.edges.length >= 1); // At least the related edge
            assert.ok(graph.nodes.some(n => n.id === 'Pattern-API-001'));
            assert.ok(graph.nodes.some(n => n.id === 'Pattern-AUTH-001'));
            assert.ok(graph.edges.some(e => e.source === 'Pattern-API-001' && e.target === 'Pattern-AUTH-001' && e.type === 'related'));
        });
    });
});
