/**
 * Tests for MultiFormatParser
 *
 * TEST STRATEGY (TDD):
 * 1. Test format detection (MD/TOML/JSON)
 * 2. Test Markdown parsing (PHASE_A.md format)
 * 3. Test TOML parsing (ACTIVE_SPRINT.toml format)
 * 4. Test JSON parsing (custom format)
 * 5. Test error handling (malformed files, missing files)
 * 6. Test performance (<500ms per file)
 *
 * UNIT TEST APPROACH:
 * WHY: MultiFormatParser is a pure Node.js module (no VS Code dependencies)
 * HOW: Run with plain Mocha in Node.js (npm run test:unit)
 * REASONING CHAIN:
 * 1. MultiFormatParser uses only: fs, path, @iarna/toml (no vscode API)
 * 2. Unit tests for pure modules run faster in Node.js (no Electron overhead)
 * 3. VS Code test runner (@vscode/test-electron) reserved for integration tests
 * 4. This matches TDD best practice: unit tests isolated, fast, no external deps
 * 5. Module will be consumed by extension, but tested independently
 *
 * RUN TESTS: npm run test:unit
 * NOTE: VS Code integration tests (test:) require extension host, saved for UI/command tests
 */

import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import { MultiFormatParser } from '../../services/MultiFormatParser';

suite('MultiFormatParser Tests', () => {
    let parser: MultiFormatParser;
    const testDataDir = path.join(__dirname, '../../../test-data');

    setup(() => {
        parser = new MultiFormatParser();

        // Create test data directory if it doesn't exist
        if (!fs.existsSync(testDataDir)) {
            fs.mkdirSync(testDataDir, { recursive: true });
        }
    });

    suite('Format Detection', () => {
        test('should detect Markdown from .md extension', async () => {
            const testFile = path.join(testDataDir, 'test.md');
            fs.writeFileSync(testFile, '# Phase A\n\n### Task A-001: Test\n');

            const result = await parser.parseFile(testFile);
            assert.strictEqual(result.success, true);
            if (result.success) {
                assert.strictEqual(result.data.source, 'markdown');
            }

            fs.unlinkSync(testFile);
        });

        test('should detect TOML from .toml extension', async () => {
            const testFile = path.join(testDataDir, 'test.toml');
            fs.writeFileSync(testFile, '[meta]\nname = "Test Sprint"\n\n[tasks.A-001]\nid = "A-001"\nname = "Test Task"\n');

            const result = await parser.parseFile(testFile);
            assert.strictEqual(result.success, true);
            if (result.success) {
                assert.strictEqual(result.data.source, 'toml');
            }

            fs.unlinkSync(testFile);
        });

        test('should detect JSON from .json extension', async () => {
            const testFile = path.join(testDataDir, 'test.json');
            fs.writeFileSync(testFile, JSON.stringify({ tasks: [] }));

            const result = await parser.parseFile(testFile);
            assert.strictEqual(result.success, true);
            if (result.success) {
                assert.strictEqual(result.data.source, 'json');
            }

            fs.unlinkSync(testFile);
        });
    });

    suite('Markdown Parsing', () => {
        test('should parse simple Markdown task', async () => {
            const content = `# Phase A: Authentication

### Task A-001: Implement JWT
**Description:** Create JWT token system
**Estimated Time:** 3-4 hours
**Agent:** security-agent
**Patterns:** Pattern-AUTH-001, Pattern-SECURITY-002
**Deliverables:**
- Create JWT service
- Add token validation
- Add refresh token logic
`;

            const testFile = path.join(testDataDir, 'phase_a.md');
            fs.writeFileSync(testFile, content);

            const result = await parser.parseFile(testFile);
            assert.strictEqual(result.success, true);

            if (result.success) {
                assert.strictEqual(result.data.tasks.length, 1);
                const task = result.data.tasks[0];
                assert.strictEqual(task.id, 'A-001');
                assert.strictEqual(task.name, 'Implement JWT');
                assert.strictEqual(task.phase, 'Phase A: Authentication');
                assert.strictEqual(task.estimated_time, '3-4 hours');
                assert.strictEqual(task.agent, 'security-agent');
                assert.strictEqual(task.patterns?.length, 2);
                assert.strictEqual(task.deliverables?.length, 3);
            }

            fs.unlinkSync(testFile);
        });

        test('should parse multiple Markdown tasks', async () => {
            const content = `# Phase B: API

### Task B-001: Create REST endpoints
**Estimated Time:** 4-5 hours

### Task B-002: Add GraphQL schema
**Estimated Time:** 3-4 hours
`;

            const testFile = path.join(testDataDir, 'phase_b.md');
            fs.writeFileSync(testFile, content);

            const result = await parser.parseFile(testFile);
            assert.strictEqual(result.success, true);

            if (result.success) {
                assert.strictEqual(result.data.tasks.length, 2);
                assert.strictEqual(result.data.tasks[0].id, 'B-001');
                assert.strictEqual(result.data.tasks[1].id, 'B-002');
            }

            fs.unlinkSync(testFile);
        });
    });

    suite('TOML Parsing', () => {
        test('should parse TOML sprint file', async () => {
            const content = `[meta]
sprint_name = "Test Sprint"
version = "1.0"
total_tasks = 2

[tasks.T-001]
id = "T-001"
name = "Test Task 1"
description = "First test task"
status = "pending"
estimated_time = "2-3 hours"
agent = "test-agent"
patterns = ["Pattern-TEST-001"]
deliverables = ["Create test file", "Add test logic"]

[tasks.T-002]
id = "T-002"
name = "Test Task 2"
description = "Second test task"
status = "completed"
dependencies = ["T-001"]
`;

            const testFile = path.join(testDataDir, 'sprint.toml');
            fs.writeFileSync(testFile, content);

            const result = await parser.parseFile(testFile);
            assert.strictEqual(result.success, true);

            if (result.success) {
                assert.strictEqual(result.data.tasks.length, 2);
                assert.strictEqual(result.data.metadata?.sprint_name, 'Test Sprint');
                assert.strictEqual(result.data.metadata?.version, '1.0');

                const task1 = result.data.tasks.find(t => t.id === 'T-001');
                assert.ok(task1);
                assert.strictEqual(task1.name, 'Test Task 1');
                assert.strictEqual(task1.status, 'pending');
                assert.strictEqual(task1.patterns?.length, 1);
                assert.strictEqual(task1.deliverables?.length, 2);

                const task2 = result.data.tasks.find(t => t.id === 'T-002');
                assert.ok(task2);
                assert.strictEqual(task2.status, 'completed');
                assert.strictEqual(task2.dependencies?.length, 1);
            }

            fs.unlinkSync(testFile);
        });
    });

    suite('JSON Parsing', () => {
        test('should parse JSON analysis file', async () => {
            const data = {
                tasks: [
                    {
                        id: 'J-001',
                        name: 'JSON Task 1',
                        description: 'First JSON task',
                        status: 'pending',
                        patterns: ['Pattern-JSON-001']
                    },
                    {
                        id: 'J-002',
                        name: 'JSON Task 2',
                        description: 'Second JSON task',
                        status: 'in_progress'
                    }
                ],
                metadata: {
                    sprint_name: 'JSON Sprint',
                    version: '2.0'
                }
            };

            const testFile = path.join(testDataDir, 'analysis.json');
            fs.writeFileSync(testFile, JSON.stringify(data));

            const result = await parser.parseFile(testFile);
            assert.strictEqual(result.success, true);

            if (result.success) {
                assert.strictEqual(result.data.tasks.length, 2);
                assert.strictEqual(result.data.metadata?.sprint_name, 'JSON Sprint');
                assert.strictEqual(result.data.tasks[0].patterns?.length, 1);
            }

            fs.unlinkSync(testFile);
        });

        test('should reject invalid JSON (missing tasks array)', async () => {
            const data = { invalid: true };

            const testFile = path.join(testDataDir, 'invalid.json');
            fs.writeFileSync(testFile, JSON.stringify(data));

            const result = await parser.parseFile(testFile);
            assert.strictEqual(result.success, false);

            if (!result.success) {
                assert.ok(result.error.includes('missing tasks array'));
            }

            fs.unlinkSync(testFile);
        });
    });

    suite('Error Handling', () => {
        test('should handle missing file', async () => {
            const result = await parser.parseFile('/nonexistent/file.md');
            assert.strictEqual(result.success, false);

            if (!result.success) {
                assert.ok(result.error.includes('File not found'));
            }
        });

        test('should handle malformed TOML', async () => {
            const content = `[meta
name = "Broken TOML"  # Missing closing bracket
`;

            const testFile = path.join(testDataDir, 'broken.toml');
            fs.writeFileSync(testFile, content);

            const result = await parser.parseFile(testFile);
            assert.strictEqual(result.success, false);

            if (!result.success) {
                assert.ok(result.error.includes('TOML parse error'));
            }

            fs.unlinkSync(testFile);
        });

        test('should handle malformed JSON', async () => {
            const content = `{ "tasks": [ { "id": "BROKEN" }`;  // Unclosed

            const testFile = path.join(testDataDir, 'broken.json');
            fs.writeFileSync(testFile, content);

            const result = await parser.parseFile(testFile);
            assert.strictEqual(result.success, false);

            if (!result.success) {
                assert.ok(result.error.includes('JSON parse error'));
            }

            fs.unlinkSync(testFile);
        });
    });

    suite('Performance', () => {
        test('should parse file in <500ms', async () => {
            // Create a reasonably large TOML file
            let content = `[meta]
sprint_name = "Performance Test"
version = "1.0"

`;
            for (let i = 0; i < 50; i++) {
                content += `[tasks.T-${i.toString().padStart(3, '0')}]
id = "T-${i.toString().padStart(3, '0')}"
name = "Task ${i}"
description = "Test task ${i}"
status = "pending"
estimated_time = "1-2 hours"

`;
            }

            const testFile = path.join(testDataDir, 'large_sprint.toml');
            fs.writeFileSync(testFile, content);

            const startTime = Date.now();
            const result = await parser.parseFile(testFile);
            const duration = Date.now() - startTime;

            assert.strictEqual(result.success, true);
            assert.ok(duration < 500, `Parse took ${duration}ms (should be <500ms)`);

            if (result.success) {
                assert.strictEqual(result.data.tasks.length, 50);
            }

            fs.unlinkSync(testFile);
        });
    });

    teardown(() => {
        // Cleanup test data directory if empty
        try {
            const files = fs.readdirSync(testDataDir);
            if (files.length === 0) {
                fs.rmdirSync(testDataDir);
            }
        } catch (error) {
            // Directory might not exist, ignore
        }
    });
});
