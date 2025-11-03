/**
 * EventBus Test Suite (TDD RED Phase)
 *
 * DESIGN DECISION: Write tests FIRST following TDD protocol
 * WHY: Creates "ratchet" enforcing event-driven architecture requirements
 *
 * PATTERN: Pattern-TDD-001 (Test-Driven Development)
 * PATTERN: Pattern-EVENT-DRIVEN-001 (Event-Driven Architecture)
 * PATTERN: Pattern-MIDDLEWARE-001 (Service Integration Layer)
 * RELATED: MID-018
 */

import * as assert from 'assert';
import { EventBus, EventPriority, Event } from '../../services/EventBus';
import { MiddlewareLogger } from '../../services/MiddlewareLogger';

suite('EventBus Test Suite', () => {
	let eventBus: EventBus;
	let mockLogger: MiddlewareLogger;

	setup(() => {
		// Create mock logger
		mockLogger = MiddlewareLogger.getInstance();

		// Create event bus
		eventBus = new EventBus(mockLogger);
	});

	teardown(() => {
		// Clear event bus after each test
		eventBus.clear();
	});

	suite('Basic Pub/Sub Operations', () => {
		test('should subscribe to event', () => {
			// Arrange
			const eventType = 'test.event';
			let received = false;

			// Act
			eventBus.subscribe(eventType, () => {
				received = true;
			});

			// Trigger event
			return eventBus.publish(eventType, { message: 'test' }).then(() => {
				// Assert
				assert.strictEqual(received, true, 'Subscriber should receive event');
			});
		});

		test('should publish event to subscriber', () => {
			// Arrange
			const eventType = 'test.publish';
			const eventData = { value: 123 };
			let receivedData: any = null;

			// Act
			eventBus.subscribe(eventType, (event) => {
				receivedData = event.data;
			});

			return eventBus.publish(eventType, eventData).then(() => {
				// Assert
				assert.deepStrictEqual(receivedData, eventData, 'Subscriber should receive event data');
			});
		});

		test('should publish event to multiple subscribers', () => {
			// Arrange
			const eventType = 'test.multiple';
			const counters = [0, 0, 0];

			// Act
			eventBus.subscribe(eventType, () => { counters[0]++; });
			eventBus.subscribe(eventType, () => { counters[1]++; });
			eventBus.subscribe(eventType, () => { counters[2]++; });

			return eventBus.publish(eventType, {}).then(() => {
				// Assert
				assert.strictEqual(counters[0], 1, 'First subscriber should receive event');
				assert.strictEqual(counters[1], 1, 'Second subscriber should receive event');
				assert.strictEqual(counters[2], 1, 'Third subscriber should receive event');
			});
		});

		test('should not publish to unsubscribed handler', () => {
			// Arrange
			const eventType = 'test.unsubscribe';
			let counter = 0;

			// Act
			const unsubscribe = eventBus.subscribe(eventType, () => {
				counter++;
			});

			// Publish first time
			return eventBus.publish(eventType, {}).then(() => {
				assert.strictEqual(counter, 1, 'Should receive first event');

				// Unsubscribe
				unsubscribe();

				// Publish second time
				return eventBus.publish(eventType, {});
			}).then(() => {
				// Assert
				assert.strictEqual(counter, 1, 'Should not receive event after unsubscribe');
			});
		});

		test('should handle events with no subscribers', () => {
			// Act & Assert - should not throw
			return eventBus.publish('nonexistent.event', {}).then(() => {
				assert.ok(true, 'Publishing to non-existent event should not throw');
			});
		});

		test('should support different event types', () => {
			// Arrange
			const events: string[] = [];

			eventBus.subscribe('system.startup', () => { events.push('startup'); });
			eventBus.subscribe('user.action', () => { events.push('action'); });
			eventBus.subscribe('service.completed', () => { events.push('completed'); });

			// Act
			return Promise.all([
				eventBus.publish('system.startup', {}),
				eventBus.publish('user.action', {}),
				eventBus.publish('service.completed', {})
			]).then(() => {
				// Assert
				assert.strictEqual(events.length, 3, 'Should receive all 3 events');
				assert.ok(events.includes('startup'), 'Should include startup event');
				assert.ok(events.includes('action'), 'Should include action event');
				assert.ok(events.includes('completed'), 'Should include completed event');
			});
		});
	});

	suite('Async Event Handling', () => {
		test('should handle async subscribers', () => {
			// Arrange
			const eventType = 'test.async';
			let completed = false;

			// Act
			eventBus.subscribe(eventType, async () => {
				await new Promise(resolve => setTimeout(resolve, 10));
				completed = true;
			});

			return eventBus.publish(eventType, {}).then(() => {
				// Assert
				assert.strictEqual(completed, true, 'Async subscriber should complete');
			});
		});

		test('should handle multiple async subscribers in parallel', function() {
			this.timeout(5000);

			// Arrange
			const eventType = 'test.parallel';
			const startTime = Date.now();
			const delays = [50, 50, 50]; // All 50ms

			// Act
			delays.forEach((delay, index) => {
				eventBus.subscribe(eventType, async () => {
					await new Promise(resolve => setTimeout(resolve, delay));
				});
			});

			return eventBus.publish(eventType, {}).then(() => {
				const elapsed = Date.now() - startTime;

				// Assert - Should complete in ~50ms (parallel), not 150ms (sequential)
				assert.ok(elapsed < 100, `Async subscribers should run in parallel, took ${elapsed}ms`);
			});
		});

		test('should handle subscriber errors gracefully', () => {
			// Arrange
			const eventType = 'test.error';
			let secondCalled = false;

			// Act
			eventBus.subscribe(eventType, () => {
				throw new Error('First subscriber error');
			});

			eventBus.subscribe(eventType, () => {
				secondCalled = true;
			});

			return eventBus.publish(eventType, {}).then(() => {
				// Assert - Second subscriber should still be called despite first error
				assert.strictEqual(secondCalled, true, 'Second subscriber should be called despite first error');
			});
		});

		test('should handle async subscriber errors gracefully', () => {
			// Arrange
			const eventType = 'test.async.error';
			let secondCalled = false;

			// Act
			eventBus.subscribe(eventType, async () => {
				throw new Error('Async subscriber error');
			});

			eventBus.subscribe(eventType, async () => {
				secondCalled = true;
			});

			return eventBus.publish(eventType, {}).then(() => {
				// Assert
				assert.strictEqual(secondCalled, true, 'Second subscriber should be called despite first async error');
			});
		});
	});

	suite('Event Priority', () => {
		test('should publish event with default priority', () => {
			// Arrange
			const eventType = 'test.priority.default';
			let receivedEvent: Event | null = null;

			// Act
			eventBus.subscribe(eventType, (event) => {
				receivedEvent = event;
			});

			return eventBus.publish(eventType, {}).then(() => {
				// Assert
				assert.ok(receivedEvent, 'Should receive event');
				assert.strictEqual(receivedEvent!.priority, EventPriority.Normal, 'Default priority should be Normal');
			});
		});

		test('should publish event with critical priority', () => {
			// Arrange
			const eventType = 'test.priority.critical';
			let receivedEvent: Event | null = null;

			// Act
			eventBus.subscribe(eventType, (event) => {
				receivedEvent = event;
			});

			return eventBus.publish(eventType, {}, EventPriority.Critical).then(() => {
				// Assert
				assert.ok(receivedEvent, 'Should receive event');
				assert.strictEqual(receivedEvent!.priority, EventPriority.Critical, 'Priority should be Critical');
			});
		});

		test('should support all priority levels', () => {
			// Arrange
			const priorities: EventPriority[] = [];

			eventBus.subscribe('test.priority', (event) => {
				priorities.push(event.priority);
			});

			// Act
			return Promise.all([
				eventBus.publish('test.priority', {}, EventPriority.Critical),
				eventBus.publish('test.priority', {}, EventPriority.High),
				eventBus.publish('test.priority', {}, EventPriority.Normal),
				eventBus.publish('test.priority', {}, EventPriority.Low)
			]).then(() => {
				// Assert
				assert.strictEqual(priorities.length, 4, 'Should receive all 4 priority events');
				assert.ok(priorities.includes(EventPriority.Critical), 'Should include Critical');
				assert.ok(priorities.includes(EventPriority.High), 'Should include High');
				assert.ok(priorities.includes(EventPriority.Normal), 'Should include Normal');
				assert.ok(priorities.includes(EventPriority.Low), 'Should include Low');
			});
		});
	});

	suite('Event History', () => {
		test('should record events in history', () => {
			// Arrange
			const eventType = 'test.history';

			// Act
			return eventBus.publish(eventType, { value: 1 }).then(() => {
				// Assert
				const history = eventBus.getHistory();
				assert.strictEqual(history.length, 1, 'History should contain 1 event');
				assert.strictEqual(history[0].type, eventType, 'History should contain published event');
			});
		});

		test('should record multiple events in history', () => {
			// Act
			return Promise.all([
				eventBus.publish('event.1', { id: 1 }),
				eventBus.publish('event.2', { id: 2 }),
				eventBus.publish('event.3', { id: 3 })
			]).then(() => {
				// Assert
				const history = eventBus.getHistory();
				assert.strictEqual(history.length, 3, 'History should contain 3 events');
			});
		});

		test('should limit history to max size', function() {
			this.timeout(10000);

			// Arrange
			const maxSize = 1000;
			const promises: Promise<void>[] = [];

			// Act - Publish 1100 events
			for (let i = 0; i < 1100; i++) {
				promises.push(eventBus.publish('test.overflow', { index: i }));
			}

			return Promise.all(promises).then(() => {
				// Assert
				const history = eventBus.getHistory();
				assert.ok(history.length <= maxSize, `History should not exceed ${maxSize}, was ${history.length}`);
			});
		});

		test('should filter history by event type', () => {
			// Arrange
			return Promise.all([
				eventBus.publish('type.a', {}),
				eventBus.publish('type.b', {}),
				eventBus.publish('type.a', {}),
				eventBus.publish('type.c', {})
			]).then(() => {
				// Act
				const filtered = eventBus.getHistory({ type: 'type.a' });

				// Assert
				assert.strictEqual(filtered.length, 2, 'Should filter to 2 type.a events');
				assert.ok(filtered.every(e => e.type === 'type.a'), 'All events should be type.a');
			});
		});

		test('should filter history by priority', () => {
			// Arrange
			return Promise.all([
				eventBus.publish('event', {}, EventPriority.Critical),
				eventBus.publish('event', {}, EventPriority.Normal),
				eventBus.publish('event', {}, EventPriority.Critical),
				eventBus.publish('event', {}, EventPriority.Low)
			]).then(() => {
				// Act
				const filtered = eventBus.getHistory({ priority: EventPriority.Critical });

				// Assert
				assert.strictEqual(filtered.length, 2, 'Should filter to 2 Critical events');
				assert.ok(filtered.every(e => e.priority === EventPriority.Critical), 'All events should be Critical');
			});
		});

		test('should filter history by type and priority', () => {
			// Arrange
			return Promise.all([
				eventBus.publish('workflow.completed', {}, EventPriority.Normal),
				eventBus.publish('workflow.failed', {}, EventPriority.Critical),
				eventBus.publish('workflow.completed', {}, EventPriority.High),
				eventBus.publish('workflow.completed', {}, EventPriority.Normal)
			]).then(() => {
				// Act
				const filtered = eventBus.getHistory({
					type: 'workflow.completed',
					priority: EventPriority.Normal
				});

				// Assert
				assert.strictEqual(filtered.length, 2, 'Should filter to 2 matching events');
			});
		});

		test('should include timestamp in events', () => {
			// Arrange
			const beforeTime = Date.now();

			// Act
			return eventBus.publish('test.timestamp', {}).then(() => {
				const afterTime = Date.now();

				// Assert
				const history = eventBus.getHistory();
				const event = history[0];

				assert.ok(event.timestamp >= beforeTime, 'Timestamp should be >= start time');
				assert.ok(event.timestamp <= afterTime, 'Timestamp should be <= end time');
			});
		});
	});

	suite('Event Replay', () => {
		test('should replay events', () => {
			// Arrange
			const counters: number[] = [];

			eventBus.subscribe('replay.event', (event) => {
				counters.push(event.data.value);
			});

			// Publish original events
			return Promise.all([
				eventBus.publish('replay.event', { value: 1 }),
				eventBus.publish('replay.event', { value: 2 }),
				eventBus.publish('replay.event', { value: 3 })
			]).then(() => {
				// Get history
				const history = eventBus.getHistory({ type: 'replay.event' });

				// Clear counters
				counters.length = 0;

				// Act - Replay events
				return eventBus.replay(history);
			}).then(() => {
				// Assert - Should receive events again
				assert.strictEqual(counters.length, 3, 'Should replay all 3 events');
				assert.deepStrictEqual(counters, [1, 2, 3], 'Should replay in order');
			});
		});

		test('should replay filtered events', () => {
			// Arrange
			let criticalCount = 0;

			eventBus.subscribe('test.event', (event) => {
				if (event.priority === EventPriority.Critical) {
					criticalCount++;
				}
			});

			// Publish events
			return Promise.all([
				eventBus.publish('test.event', {}, EventPriority.Normal),
				eventBus.publish('test.event', {}, EventPriority.Critical),
				eventBus.publish('test.event', {}, EventPriority.Low),
				eventBus.publish('test.event', {}, EventPriority.Critical)
			]).then(() => {
				// Reset counter
				criticalCount = 0;

				// Get critical events only
				const critical = eventBus.getHistory({ priority: EventPriority.Critical });

				// Act - Replay critical events only
				return eventBus.replay(critical);
			}).then(() => {
				// Assert
				assert.strictEqual(criticalCount, 2, 'Should replay only 2 critical events');
			});
		});
	});

	suite('Performance', () => {
		test('should publish events in <1ms', () => {
			// Arrange
			const iterations = 1000;
			const promises: Promise<void>[] = [];

			// Act
			const startTime = Date.now();
			for (let i = 0; i < iterations; i++) {
				promises.push(eventBus.publish('perf.test', { index: i }));
			}

			return Promise.all(promises).then(() => {
				const totalTime = Date.now() - startTime;
				const avgTime = totalTime / iterations;

				// Assert
				assert.ok(avgTime < 1, `Average publish time should be <1ms, was ${avgTime.toFixed(3)}ms`);
			});
		});

		test('should dispatch events in <5ms', () => {
			// Arrange
			let counter = 0;

			// Add 10 subscribers
			for (let i = 0; i < 10; i++) {
				eventBus.subscribe('perf.dispatch', () => {
					counter++;
				});
			}

			// Act
			const startTime = Date.now();
			return eventBus.publish('perf.dispatch', {}).then(() => {
				const elapsedTime = Date.now() - startTime;

				// Assert
				assert.ok(elapsedTime < 5, `Dispatch to 10 subscribers should be <5ms, was ${elapsedTime}ms`);
				assert.strictEqual(counter, 10, 'All 10 subscribers should be called');
			});
		});

		test('should handle high volume of events', function() {
			this.timeout(10000);

			// Arrange
			const eventCount = 1000;
			const promises: Promise<void>[] = [];

			// Act
			const startTime = Date.now();
			for (let i = 0; i < eventCount; i++) {
				promises.push(eventBus.publish('volume.test', { index: i }));
			}

			return Promise.all(promises).then(() => {
				const elapsedTime = Date.now() - startTime;

				// Assert
				assert.ok(elapsedTime < 5000, `${eventCount} events should publish in <5s, took ${elapsedTime}ms`);
			});
		});
	});

	suite('Clear Operations', () => {
		test('should clear all subscribers', () => {
			// Arrange
			let counter = 0;

			eventBus.subscribe('test.clear', () => { counter++; });

			// Publish once
			return eventBus.publish('test.clear', {}).then(() => {
				assert.strictEqual(counter, 1, 'Should receive first event');

				// Act - Clear
				eventBus.clear();

				// Publish again
				return eventBus.publish('test.clear', {});
			}).then(() => {
				// Assert
				assert.strictEqual(counter, 1, 'Should not receive event after clear');
			});
		});

		test('should clear event history', () => {
			// Arrange
			return Promise.all([
				eventBus.publish('event.1', {}),
				eventBus.publish('event.2', {}),
				eventBus.publish('event.3', {})
			]).then(() => {
				assert.strictEqual(eventBus.getHistory().length, 3, 'Should have 3 events');

				// Act
				eventBus.clear();

				// Assert
				assert.strictEqual(eventBus.getHistory().length, 0, 'History should be empty after clear');
			});
		});
	});

	suite('Edge Cases', () => {
		test('should handle empty event type', () => {
			// Arrange
			let received = false;

			// Act
			eventBus.subscribe('', () => { received = true; });

			return eventBus.publish('', {}).then(() => {
				// Assert
				assert.strictEqual(received, true, 'Should handle empty event type');
			});
		});

		test('should handle null data', () => {
			// Arrange
			let receivedData: any = undefined;

			// Act
			eventBus.subscribe('null.test', (event) => {
				receivedData = event.data;
			});

			return eventBus.publish('null.test', null).then(() => {
				// Assert
				assert.strictEqual(receivedData, null, 'Should handle null data');
			});
		});

		test('should handle undefined data', () => {
			// Arrange
			let receivedData: any = null;

			// Act
			eventBus.subscribe('undefined.test', (event) => {
				receivedData = event.data;
			});

			return eventBus.publish('undefined.test', undefined).then(() => {
				// Assert
				assert.strictEqual(receivedData, undefined, 'Should handle undefined data');
			});
		});

		test('should handle complex data objects', () => {
			// Arrange
			const complexData = {
				nested: { deep: { value: 123 } },
				array: [1, 2, 3],
				fn: () => 'test'
			};
			let receivedData: any = null;

			// Act
			eventBus.subscribe('complex.test', (event) => {
				receivedData = event.data;
			});

			return eventBus.publish('complex.test', complexData).then(() => {
				// Assert
				assert.deepStrictEqual(receivedData, complexData, 'Should handle complex data');
			});
		});

		test('should handle subscriber that unsubscribes during event', () => {
			// Arrange
			let firstCalled = false;
			let secondCalled = false;
			let unsubscribe: (() => void) | null = null;

			unsubscribe = eventBus.subscribe('test.unsubscribe.during', () => {
				firstCalled = true;
				if (unsubscribe) {
					unsubscribe();
				}
			});

			eventBus.subscribe('test.unsubscribe.during', () => {
				secondCalled = true;
			});

			// Act
			return eventBus.publish('test.unsubscribe.during', {}).then(() => {
				// Assert
				assert.strictEqual(firstCalled, true, 'First subscriber should be called');
				assert.strictEqual(secondCalled, true, 'Second subscriber should be called');

				// Publish again
				firstCalled = false;
				secondCalled = false;
				return eventBus.publish('test.unsubscribe.during', {});
			}).then(() => {
				// Assert - First should not be called (unsubscribed)
				assert.strictEqual(firstCalled, false, 'First subscriber should not be called after unsubscribe');
				assert.strictEqual(secondCalled, true, 'Second subscriber should still be called');
			});
		});
	});

	suite('Service Integration', () => {
		test('should support workflow events', () => {
			// Arrange
			const events: string[] = [];

			eventBus.subscribe('workflow.started', () => { events.push('started'); });
			eventBus.subscribe('workflow.completed', () => { events.push('completed'); });
			eventBus.subscribe('workflow.failed', () => { events.push('failed'); });

			// Act
			return Promise.all([
				eventBus.publish('workflow.started', { type: 'code' }),
				eventBus.publish('workflow.completed', { confidence: 0.9 }),
				eventBus.publish('workflow.failed', { error: 'test' }, EventPriority.Critical)
			]).then(() => {
				// Assert
				assert.strictEqual(events.length, 3, 'Should receive all workflow events');
			});
		});

		test('should support UI update events', () => {
			// Arrange
			let uiUpdated = false;

			// Act
			eventBus.subscribe('ui.update', () => {
				uiUpdated = true;
			});

			return eventBus.publish('ui.update', { component: 'SprintPanel' }).then(() => {
				// Assert
				assert.strictEqual(uiUpdated, true, 'UI should be updated on event');
			});
		});

		test('should support cache invalidation events', () => {
			// Arrange
			let cacheInvalidated = false;

			// Act
			eventBus.subscribe('cache.invalidate', (event) => {
				cacheInvalidated = event.data.pattern === 'workflow_*';
			});

			return eventBus.publish('cache.invalidate', { pattern: 'workflow_*' }).then(() => {
				// Assert
				assert.strictEqual(cacheInvalidated, true, 'Cache should be invalidated on event');
			});
		});
	});
});
