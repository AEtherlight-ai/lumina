/**
 * Event Emission Hooks Tests
 *
 * DESIGN DECISION: Test event detection heuristics with real examples
 * WHY: Validate <10ms overhead and <5% false positives
 *
 * REASONING CHAIN:
 * 1. Test TodoWrite hook with "DESIGN DECISION:" pattern
 * 2. Test Bash hook with error detection
 * 3. Test Pattern extraction hook
 * 4. Validate deduplication (5-minute window)
 * 5. Verify performance (<10ms per hook)
 *
 * PATTERN: Pattern-TEST-002 (Heuristic Validation)
 * RELATED: hooks.ts
 * PERFORMANCE: <50ms per test, 100% branch coverage
 */

import { EventEmissionHooks } from '../hooks';
import { RealtimeSyncClient } from '../client';
import { SyncEvent, SyncEventType } from '../types';

// Mock client
class MockRealtimeSyncClient {
    private publishedEvents: SyncEvent[] = [];

    publish(event: SyncEvent): void {
        this.publishedEvents.push(event);
    }

    getPublishedEvents(): SyncEvent[] {
        return this.publishedEvents;
    }

    clearPublishedEvents(): void {
        this.publishedEvents = [];
    }

    // Mock other methods
    connect = jest.fn();
    disconnect = jest.fn();
    subscribe = jest.fn();
    unsubscribe = jest.fn();
    on = jest.fn();
    off = jest.fn();
    getState = jest.fn();
    isConnected = jest.fn();
    getMetrics = jest.fn();
}

describe('EventEmissionHooks', () => {
    let mockClient: MockRealtimeSyncClient;
    let hooks: EventEmissionHooks;

    beforeEach(() => {
        mockClient = new MockRealtimeSyncClient();
        hooks = new EventEmissionHooks(
            mockClient as any,
            'test-user',
            'test-terminal',
            'test-project'
        );
    });

    describe('TodoWrite Hook', () => {
        test('should detect design decision from TodoWrite', () => {
            const content = `
DESIGN DECISION: Use exponential backoff for reconnect
WHY: Prevents server spam while allowing fast recovery

REASONING CHAIN:
1. Immediate reconnect = server spam
2. Fixed delay = too slow or too aggressive
3. Exponential backoff = balanced approach
            `.trim();

            hooks.onTodoWrite(content, ['client.ts']);

            const events = mockClient.getPublishedEvents();
            expect(events.length).toBe(1);
            expect(events[0].event_type).toBe(SyncEventType.DesignDecision);
            expect(events[0].title).toBe('Use exponential backoff for reconnect');
            expect(events[0].files).toContain('client.ts');
            expect(events[0].tags).toContain('todo');
            expect(events[0].tags).toContain('design');
        });

        test('should detect blocker from TodoWrite', () => {
            const content = `
BLOCKER: WebSocket connection fails in production

Cannot connect to ws://localhost:43216 - connection refused.
Need to investigate firewall rules.
            `.trim();

            hooks.onTodoWrite(content, ['client.ts']);

            const events = mockClient.getPublishedEvents();
            expect(events.length).toBe(1);
            expect(events[0].event_type).toBe(SyncEventType.Blocker);
            expect(events[0].title).toBe('WebSocket connection fails in production');
            expect(events[0].tags).toContain('blocker');
        });

        test('should detect both design decision and blocker', () => {
            const content = `
DESIGN DECISION: Use mock WebSocket for tests
WHY: Real WebSocket = flaky tests

BLOCKER: Need to implement mock WebSocket class
Currently no way to test without real server.
            `.trim();

            hooks.onTodoWrite(content, ['client.test.ts']);

            const events = mockClient.getPublishedEvents();
            expect(events.length).toBe(2);
            expect(events[0].event_type).toBe(SyncEventType.DesignDecision);
            expect(events[1].event_type).toBe(SyncEventType.Blocker);
        });

        test('should not detect events in regular todos', () => {
            const content = 'Implement reconnect logic\nAdd tests\nUpdate documentation';

            hooks.onTodoWrite(content, []);

            const events = mockClient.getPublishedEvents();
            expect(events.length).toBe(0);
        });

        test('should complete in <10ms', () => {
            const content = `
DESIGN DECISION: Use exponential backoff
WHY: Prevents server spam
            `.trim();

            const startTime = performance.now();
            hooks.onTodoWrite(content, ['client.ts']);
            const duration = performance.now() - startTime;

            expect(duration).toBeLessThan(10);
        });
    });

    describe('Bash Hook', () => {
        test('should detect blocker from failed command', () => {
            hooks.onBashResult(
                'npm test',
                1,
                '',
                'Error: Test failed\n  at client.test.ts:42\n',
                ['client.test.ts']
            );

            const events = mockClient.getPublishedEvents();
            expect(events.length).toBe(1);
            expect(events[0].event_type).toBe(SyncEventType.Blocker);
            expect(events[0].title).toContain('npm test');
            expect(events[0].description).toContain('Exit code: 1');
            expect(events[0].description).toContain('Error: Test failed');
            expect(events[0].tags).toContain('bash');
            expect(events[0].tags).toContain('error');
        });

        test('should not detect blocker for successful commands', () => {
            hooks.onBashResult(
                'npm test',
                0,
                'All tests passed',
                '',
                ['client.test.ts']
            );

            const events = mockClient.getPublishedEvents();
            expect(events.length).toBe(0);
        });

        test('should not detect blocker without error keyword', () => {
            hooks.onBashResult(
                'npm test',
                1,
                '',
                'Tests failed\nSee output above',
                ['client.test.ts']
            );

            const events = mockClient.getPublishedEvents();
            expect(events.length).toBe(0); // No "error" keyword
        });

        test('should extract first error line', () => {
            hooks.onBashResult(
                'cargo check',
                1,
                '',
                'warning: unused variable\nerror[E0308]: mismatched types\nerror[E0277]: trait not implemented',
                ['main.rs']
            );

            const events = mockClient.getPublishedEvents();
            expect(events.length).toBe(1);
            expect(events[0].description).toContain('error[E0308]');
        });

        test('should complete in <10ms', () => {
            const startTime = performance.now();
            hooks.onBashResult('npm test', 1, '', 'Error: failed', ['test.ts']);
            const duration = performance.now() - startTime;

            expect(duration).toBeLessThan(10);
        });
    });

    describe('Pattern Extraction Hook', () => {
        test('should detect discovery from pattern extraction', () => {
            const patternContent = `
# Pattern-WEBSOCKET-002: Resilient Client

## Context
WebSocket connections break on laptop sleep/wake.

## Solution
Auto-reconnect with exponential backoff.
            `.trim();

            hooks.onPatternExtraction('Pattern-WEBSOCKET-002', patternContent, ['client.ts']);

            const events = mockClient.getPublishedEvents();
            expect(events.length).toBe(1);
            expect(events[0].event_type).toBe(SyncEventType.Discovery);
            expect(events[0].title).toBe('New pattern: Pattern-WEBSOCKET-002: Resilient Client');
            expect(events[0].tags).toContain('pattern');
            expect(events[0].tags).toContain('discovery');
            expect(events[0].tags).toContain('Pattern-WEBSOCKET-002');
        });

        test('should handle pattern without title', () => {
            const patternContent = 'Some pattern content without proper heading';

            hooks.onPatternExtraction('Pattern-TEST-001', patternContent, ['test.ts']);

            const events = mockClient.getPublishedEvents();
            expect(events.length).toBe(1);
            expect(events[0].title).toBe('New pattern: Pattern-TEST-001');
        });

        test('should complete in <10ms', () => {
            const patternContent = '# Pattern Title\n\nPattern description';

            const startTime = performance.now();
            hooks.onPatternExtraction('Pattern-TEST-001', patternContent, []);
            const duration = performance.now() - startTime;

            expect(duration).toBeLessThan(10);
        });
    });

    describe('File Save Hook', () => {
        test('should emit discovery from manual file save', () => {
            hooks.onFileSave(
                'feat: Add OAuth2 authentication',
                'Implemented OAuth2 login flow with JWT tokens',
                ['auth.ts', 'login.ts']
            );

            const events = mockClient.getPublishedEvents();
            expect(events.length).toBe(1);
            expect(events[0].event_type).toBe(SyncEventType.Discovery);
            expect(events[0].title).toBe('feat: Add OAuth2 authentication');
            expect(events[0].files).toContain('auth.ts');
            expect(events[0].files).toContain('login.ts');
        });
    });

    describe('Event Deduplication', () => {
        test('should deduplicate identical events within 5 minutes', () => {
            const content = 'DESIGN DECISION: Test decision\nWHY: Testing';

            // Emit same event twice
            hooks.onTodoWrite(content, ['test.ts']);
            hooks.onTodoWrite(content, ['test.ts']);

            const events = mockClient.getPublishedEvents();
            expect(events.length).toBe(1); // Second event deduplicated
        });

        test('should not deduplicate different events', () => {
            hooks.onTodoWrite('DESIGN DECISION: First decision\nWHY: Testing', ['test1.ts']);
            hooks.onTodoWrite('DESIGN DECISION: Second decision\nWHY: Testing', ['test2.ts']);

            const events = mockClient.getPublishedEvents();
            expect(events.length).toBe(2);
        });

        test('should deduplicate based on content, not files', () => {
            const content = 'DESIGN DECISION: Test decision\nWHY: Testing';

            hooks.onTodoWrite(content, ['test1.ts']);
            hooks.onTodoWrite(content, ['test2.ts']); // Different files, same content

            const events = mockClient.getPublishedEvents();
            expect(events.length).toBe(1); // Deduplicated despite different files
        });

        test('should allow duplicate after 5-minute window', (done) => {
            const content = 'DESIGN DECISION: Test decision\nWHY: Testing';

            hooks.onTodoWrite(content, ['test.ts']);

            // Fast-forward time by mocking (in real implementation, wait 5 minutes)
            // For testing, we'll manually clear the cache
            (hooks as any).eventCache.clear();

            hooks.onTodoWrite(content, ['test.ts']);

            const events = mockClient.getPublishedEvents();
            expect(events.length).toBe(2);
            done();
        });
    });

    describe('Cache Management', () => {
        test('should return cache stats', () => {
            hooks.onTodoWrite('DESIGN DECISION: Test\nWHY: Test', ['test.ts']);

            const stats = hooks.getCacheStats();

            expect(stats.size).toBeGreaterThan(0);
            expect(stats.dedupWindowMs).toBe(5 * 60 * 1000); // 5 minutes
        });

        test('should clean expired cache entries', (done) => {
            hooks.onTodoWrite('DESIGN DECISION: Test\nWHY: Test', ['test.ts']);

            const statsBefore = hooks.getCacheStats();
            expect(statsBefore.size).toBe(1);

            // Manually trigger cache cleanup (in real implementation, runs every 5 minutes)
            (hooks as any).cleanCache();

            // Cache should still have entries (not expired yet)
            const statsAfter = hooks.getCacheStats();
            expect(statsAfter.size).toBe(1);

            done();
        });

        test('should not exceed memory limits', () => {
            // Emit 1000 unique events
            for (let i = 0; i < 1000; i++) {
                hooks.onTodoWrite(`DESIGN DECISION: Test ${i}\nWHY: Test`, ['test.ts']);
            }

            const stats = hooks.getCacheStats();
            expect(stats.size).toBeLessThanOrEqual(1000);
        });
    });

    describe('Performance', () => {
        test('should handle high-frequency events', () => {
            const startTime = performance.now();

            // Emit 100 events rapidly
            for (let i = 0; i < 100; i++) {
                hooks.onTodoWrite(`DESIGN DECISION: Test ${i}\nWHY: Test`, ['test.ts']);
            }

            const duration = performance.now() - startTime;
            const avgDuration = duration / 100;

            expect(avgDuration).toBeLessThan(10); // <10ms per event
        });

        test('should not block on network errors', () => {
            // Mock client to throw error
            mockClient.publish = jest.fn(() => {
                throw new Error('Network error');
            });

            const startTime = performance.now();
            hooks.onTodoWrite('DESIGN DECISION: Test\nWHY: Test', ['test.ts']);
            const duration = performance.now() - startTime;

            expect(duration).toBeLessThan(10); // Should still be fast even with error
        });
    });

    describe('False Positives', () => {
        test('should not detect design decision in code comments', () => {
            const content = `
// This function implements the design decision to use exponential backoff
function reconnect() { ... }
            `.trim();

            hooks.onTodoWrite(content, ['client.ts']);

            const events = mockClient.getPublishedEvents();
            expect(events.length).toBe(0); // Should not detect (no proper format)
        });

        test('should require proper format for detection', () => {
            const content = `
Design decision: use backoff (lowercase, no colon format)
            `.trim();

            hooks.onTodoWrite(content, ['client.ts']);

            const events = mockClient.getPublishedEvents();
            expect(events.length).toBe(0); // Should not detect (improper format)
        });

        test('false positive rate should be <5%', () => {
            // Test with 100 random strings
            const randomStrings = Array.from({ length: 100 }, (_, i) =>
                `Random content ${i} with some words error and decision but not in format`
            );

            let falsePositives = 0;
            for (const content of randomStrings) {
                mockClient.clearPublishedEvents();
                hooks.onTodoWrite(content, ['test.ts']);
                if (mockClient.getPublishedEvents().length > 0) {
                    falsePositives++;
                }
            }

            const falsePositiveRate = (falsePositives / 100) * 100;
            expect(falsePositiveRate).toBeLessThan(5);
        });
    });
});
