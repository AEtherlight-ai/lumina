/**
 * CacheManager Test Suite (TDD RED Phase)
 *
 * DESIGN DECISION: Write tests FIRST following TDD protocol
 * WHY: Creates "ratchet" enforcing caching requirements
 *
 * PATTERN: Pattern-TDD-001 (Test-Driven Development)
 * PATTERN: Pattern-PERFORMANCE-001 (Caching Strategy)
 * PATTERN: Pattern-MIDDLEWARE-001 (Service Integration Layer)
 * RELATED: MID-017
 */

import * as assert from 'assert';
import { CacheManager } from '../../services/CacheManager';
import { MiddlewareLogger } from '../../services/MiddlewareLogger';

suite('CacheManager Test Suite', () => {
	let cacheManager: CacheManager;
	let mockLogger: MiddlewareLogger;

	setup(() => {
		// Create mock logger
		mockLogger = MiddlewareLogger.getInstance();

		// Create cache manager with small size for testing
		cacheManager = new CacheManager(mockLogger, 10);
	});

	teardown(() => {
		// Clear cache after each test
		cacheManager.clear();
	});

	suite('Basic Cache Operations', () => {
		test('should set and get values', () => {
			// Arrange
			const key = 'test_key';
			const value = 'test_value';

			// Act
			cacheManager.set(key, value);
			const result = cacheManager.get(key);

			// Assert
			assert.strictEqual(result, value, 'Should retrieve cached value');
		});

		test('should return null for non-existent key', () => {
			// Act
			const result = cacheManager.get('non_existent_key');

			// Assert
			assert.strictEqual(result, null, 'Should return null for cache miss');
		});

		test('should cache complex objects', () => {
			// Arrange
			const key = 'complex_object';
			const value = { a: 1, b: { c: 2 }, d: [3, 4, 5] };

			// Act
			cacheManager.set(key, value);
			const result = cacheManager.get(key);

			// Assert
			assert.deepStrictEqual(result, value, 'Should cache and retrieve complex objects');
		});

		test('should cache arrays', () => {
			// Arrange
			const key = 'array_key';
			const value = [1, 2, 3, 4, 5];

			// Act
			cacheManager.set(key, value);
			const result = cacheManager.get(key);

			// Assert
			assert.deepStrictEqual(result, value, 'Should cache and retrieve arrays');
		});

		test('should cache null values', () => {
			// Arrange
			const key = 'null_key';
			const value = null;

			// Act
			cacheManager.set(key, value);
			const result = cacheManager.get(key);

			// Assert
			assert.strictEqual(result, null, 'Should cache null values');
		});

		test('should overwrite existing values', () => {
			// Arrange
			const key = 'overwrite_key';
			const value1 = 'first_value';
			const value2 = 'second_value';

			// Act
			cacheManager.set(key, value1);
			cacheManager.set(key, value2);
			const result = cacheManager.get(key);

			// Assert
			assert.strictEqual(result, value2, 'Should overwrite existing cached value');
		});
	});

	suite('TTL (Time-To-Live) Expiration', () => {
		test('should expire entries after TTL', function(done) {
			this.timeout(5000);

			// Arrange
			const key = 'ttl_key';
			const value = 'ttl_value';
			const ttl = 100; // 100ms

			// Act
			cacheManager.set(key, value, ttl);

			// Check immediately (should exist)
			const immediate = cacheManager.get(key);
			assert.strictEqual(immediate, value, 'Should exist immediately after set');

			// Check after expiration
			setTimeout(() => {
				const expired = cacheManager.get(key);
				assert.strictEqual(expired, null, 'Should be null after TTL expired');
				done();
			}, 150);
		});

		test('should not expire entries before TTL', function(done) {
			this.timeout(5000);

			// Arrange
			const key = 'ttl_key_2';
			const value = 'ttl_value_2';
			const ttl = 1000; // 1 second

			// Act
			cacheManager.set(key, value, ttl);

			// Check after 500ms (should still exist)
			setTimeout(() => {
				const result = cacheManager.get(key);
				assert.strictEqual(result, value, 'Should still exist before TTL expired');
				done();
			}, 500);
		});

		test('should support different TTLs for different entries', function(done) {
			this.timeout(5000);

			// Arrange
			const key1 = 'short_ttl';
			const key2 = 'long_ttl';
			const value1 = 'short_value';
			const value2 = 'long_value';

			// Act
			cacheManager.set(key1, value1, 100); // 100ms
			cacheManager.set(key2, value2, 2000); // 2 seconds

			// Check after 200ms (key1 expired, key2 still valid)
			setTimeout(() => {
				const result1 = cacheManager.get(key1);
				const result2 = cacheManager.get(key2);

				assert.strictEqual(result1, null, 'Short TTL should be expired');
				assert.strictEqual(result2, value2, 'Long TTL should still exist');
				done();
			}, 200);
		});

		test('should use default TTL if not specified', () => {
			// Arrange
			const key = 'default_ttl';
			const value = 'default_value';

			// Act
			cacheManager.set(key, value); // No TTL specified

			// Assert
			const result = cacheManager.get(key);
			assert.strictEqual(result, value, 'Should use default TTL');
		});
	});

	suite('LRU (Least Recently Used) Eviction', () => {
		test('should evict LRU entry when cache full', () => {
			// Arrange - Fill cache to capacity
			for (let i = 0; i < 10; i++) {
				cacheManager.set(`key_${i}`, `value_${i}`);
			}

			// Act - Add one more entry (should evict key_0)
			cacheManager.set('key_10', 'value_10');

			// Assert
			const evicted = cacheManager.get('key_0');
			const newest = cacheManager.get('key_10');

			assert.strictEqual(evicted, null, 'Oldest entry should be evicted');
			assert.strictEqual(newest, 'value_10', 'Newest entry should exist');
		});

		test('should keep recently accessed entries', () => {
			// Arrange - Fill cache to capacity
			for (let i = 0; i < 10; i++) {
				cacheManager.set(`key_${i}`, `value_${i}`);
			}

			// Act - Access key_0 (make it recently used)
			cacheManager.get('key_0');

			// Add one more entry (should evict key_1, not key_0)
			cacheManager.set('key_10', 'value_10');

			// Assert
			const accessed = cacheManager.get('key_0');
			const evicted = cacheManager.get('key_1');

			assert.strictEqual(accessed, 'value_0', 'Recently accessed entry should remain');
			assert.strictEqual(evicted, null, 'Least recently used entry should be evicted');
		});

		test('should evict multiple entries if needed', () => {
			// Arrange - Fill cache to capacity
			for (let i = 0; i < 10; i++) {
				cacheManager.set(`key_${i}`, `value_${i}`);
			}

			// Act - Add 5 more entries
			for (let i = 10; i < 15; i++) {
				cacheManager.set(`key_${i}`, `value_${i}`);
			}

			// Assert - First 5 entries should be evicted
			for (let i = 0; i < 5; i++) {
				const result = cacheManager.get(`key_${i}`);
				assert.strictEqual(result, null, `key_${i} should be evicted`);
			}

			// Last 10 entries should remain
			for (let i = 5; i < 15; i++) {
				const result = cacheManager.get(`key_${i}`);
				assert.strictEqual(result, `value_${i}`, `key_${i} should remain`);
			}
		});

		test('should handle eviction performance', () => {
			// Arrange - Fill cache to capacity
			for (let i = 0; i < 10; i++) {
				cacheManager.set(`key_${i}`, `value_${i}`);
			}

			// Act - Measure eviction time
			const startTime = Date.now();
			cacheManager.set('key_10', 'value_10'); // Triggers eviction
			const evictionTime = Date.now() - startTime;

			// Assert
			assert.ok(evictionTime < 5, `Eviction should be <5ms, was ${evictionTime}ms`);
		});
	});

	suite('Cache Invalidation', () => {
		test('should invalidate single key', () => {
			// Arrange
			const key = 'invalidate_key';
			const value = 'invalidate_value';
			cacheManager.set(key, value);

			// Act
			cacheManager.invalidate(key);

			// Assert
			const result = cacheManager.get(key);
			assert.strictEqual(result, null, 'Invalidated key should return null');
		});

		test('should invalidate by pattern', () => {
			// Arrange
			cacheManager.set('user_1', 'data_1');
			cacheManager.set('user_2', 'data_2');
			cacheManager.set('product_1', 'product_data_1');

			// Act - Invalidate all user_* keys
			cacheManager.invalidatePattern('^user_');

			// Assert
			const user1 = cacheManager.get('user_1');
			const user2 = cacheManager.get('user_2');
			const product1 = cacheManager.get('product_1');

			assert.strictEqual(user1, null, 'user_1 should be invalidated');
			assert.strictEqual(user2, null, 'user_2 should be invalidated');
			assert.strictEqual(product1, 'product_data_1', 'product_1 should remain');
		});

		test('should invalidate complex patterns', () => {
			// Arrange
			cacheManager.set('api_users_list', 'data_1');
			cacheManager.set('api_users_detail_1', 'data_2');
			cacheManager.set('api_products_list', 'data_3');

			// Act - Invalidate all api_users_* keys
			cacheManager.invalidatePattern('api_users_.*');

			// Assert
			const users = cacheManager.get('api_users_list');
			const detail = cacheManager.get('api_users_detail_1');
			const products = cacheManager.get('api_products_list');

			assert.strictEqual(users, null, 'api_users_list should be invalidated');
			assert.strictEqual(detail, null, 'api_users_detail_1 should be invalidated');
			assert.strictEqual(products, 'data_3', 'api_products_list should remain');
		});

		test('should clear all entries', () => {
			// Arrange
			for (let i = 0; i < 5; i++) {
				cacheManager.set(`key_${i}`, `value_${i}`);
			}

			// Act
			cacheManager.clear();

			// Assert
			for (let i = 0; i < 5; i++) {
				const result = cacheManager.get(`key_${i}`);
				assert.strictEqual(result, null, `key_${i} should be cleared`);
			}

			const stats = cacheManager.getStats();
			assert.strictEqual(stats.size, 0, 'Cache size should be 0');
		});
	});

	suite('Cache Statistics', () => {
		test('should track cache hits', () => {
			// Arrange
			cacheManager.set('key_1', 'value_1');

			// Act
			cacheManager.get('key_1'); // Hit
			cacheManager.get('key_1'); // Hit
			cacheManager.get('key_1'); // Hit

			// Assert
			const stats = cacheManager.getStats();
			assert.strictEqual(stats.hits, 3, 'Should track 3 hits');
		});

		test('should track cache misses', () => {
			// Act
			cacheManager.get('non_existent_1'); // Miss
			cacheManager.get('non_existent_2'); // Miss

			// Assert
			const stats = cacheManager.getStats();
			assert.strictEqual(stats.misses, 2, 'Should track 2 misses');
		});

		test('should calculate hit rate', () => {
			// Arrange
			cacheManager.set('key_1', 'value_1');

			// Act
			cacheManager.get('key_1'); // Hit
			cacheManager.get('key_1'); // Hit
			cacheManager.get('key_2'); // Miss

			// Assert
			const stats = cacheManager.getStats();
			const expectedHitRate = 2 / 3; // 2 hits, 1 miss

			assert.strictEqual(stats.hits, 2, 'Should have 2 hits');
			assert.strictEqual(stats.misses, 1, 'Should have 1 miss');
			assert.ok(Math.abs(stats.hitRate - expectedHitRate) < 0.01, `Hit rate should be ~0.67, was ${stats.hitRate}`);
		});

		test('should track cache size', () => {
			// Act
			cacheManager.set('key_1', 'value_1');
			cacheManager.set('key_2', 'value_2');
			cacheManager.set('key_3', 'value_3');

			// Assert
			const stats = cacheManager.getStats();
			assert.strictEqual(stats.size, 3, 'Should track cache size');
			assert.strictEqual(stats.maxSize, 10, 'Should track max size');
		});

		test('should reset statistics on clear', () => {
			// Arrange
			cacheManager.set('key_1', 'value_1');
			cacheManager.get('key_1'); // Hit
			cacheManager.get('key_2'); // Miss

			// Act
			cacheManager.clear();

			// Assert
			const stats = cacheManager.getStats();
			assert.strictEqual(stats.hits, 0, 'Hits should be reset');
			assert.strictEqual(stats.misses, 0, 'Misses should be reset');
			assert.strictEqual(stats.hitRate, 0, 'Hit rate should be reset');
		});

		test('should handle zero requests (no division by zero)', () => {
			// Act
			const stats = cacheManager.getStats();

			// Assert
			assert.strictEqual(stats.hitRate, 0, 'Hit rate should be 0 when no requests');
		});
	});

	suite('Performance', () => {
		test('should achieve <0.1ms cache hits', () => {
			// Arrange
			cacheManager.set('perf_key', 'perf_value');
			const iterations = 1000;

			// Act
			const startTime = Date.now();
			for (let i = 0; i < iterations; i++) {
				cacheManager.get('perf_key');
			}
			const totalTime = Date.now() - startTime;
			const avgTime = totalTime / iterations;

			// Assert
			assert.ok(avgTime < 0.1, `Cache hits should be <0.1ms, was ${avgTime.toFixed(3)}ms`);
		});

		test('should achieve <1ms cache misses', () => {
			// Arrange
			const iterations = 1000;

			// Act
			const startTime = Date.now();
			for (let i = 0; i < iterations; i++) {
				cacheManager.get(`non_existent_${i}`);
			}
			const totalTime = Date.now() - startTime;
			const avgTime = totalTime / iterations;

			// Assert
			assert.ok(avgTime < 1, `Cache misses should be <1ms, was ${avgTime.toFixed(3)}ms`);
		});

		test('should handle concurrent reads', () => {
			// Arrange
			cacheManager.set('concurrent_key', 'concurrent_value');
			const iterations = 100;
			const promises = [];

			// Act
			const startTime = Date.now();
			for (let i = 0; i < iterations; i++) {
				promises.push(Promise.resolve(cacheManager.get('concurrent_key')));
			}

			return Promise.all(promises).then(() => {
				const elapsedTime = Date.now() - startTime;

				// Assert
				assert.ok(elapsedTime < 100, `100 concurrent reads should complete in <100ms, took ${elapsedTime}ms`);
			});
		});

		test('should handle concurrent writes', () => {
			// Arrange
			const iterations = 100;
			const promises = [];

			// Act
			const startTime = Date.now();
			for (let i = 0; i < iterations; i++) {
				promises.push(Promise.resolve(cacheManager.set(`key_${i}`, `value_${i}`)));
			}

			return Promise.all(promises).then(() => {
				const elapsedTime = Date.now() - startTime;

				// Assert
				assert.ok(elapsedTime < 100, `100 concurrent writes should complete in <100ms, took ${elapsedTime}ms`);
			});
		});
	});

	suite('Size Limits & Memory Management', () => {
		test('should enforce max size limit', () => {
			// Arrange - Fill cache beyond capacity
			for (let i = 0; i < 15; i++) {
				cacheManager.set(`key_${i}`, `value_${i}`);
			}

			// Assert
			const stats = cacheManager.getStats();
			assert.ok(stats.size <= 10, `Cache size should not exceed max size, was ${stats.size}`);
		});

		test('should handle very large cache', () => {
			// Arrange
			const largeCacheManager = new CacheManager(mockLogger, 10000);

			// Act - Add 5000 entries
			const startTime = Date.now();
			for (let i = 0; i < 5000; i++) {
				largeCacheManager.set(`key_${i}`, `value_${i}`);
			}
			const elapsedTime = Date.now() - startTime;

			// Assert
			const stats = largeCacheManager.getStats();
			assert.strictEqual(stats.size, 5000, 'Should handle large cache');
			assert.ok(elapsedTime < 1000, `Should add 5000 entries in <1s, took ${elapsedTime}ms`);

			largeCacheManager.clear();
		});

		test('should not leak memory on repeated set/get cycles', () => {
			// Arrange
			const iterations = 1000;

			// Act - Repeated set/get cycles
			for (let i = 0; i < iterations; i++) {
				cacheManager.set(`key_${i % 10}`, `value_${i}`);
				cacheManager.get(`key_${i % 10}`);
			}

			// Assert - Cache size should be bounded
			const stats = cacheManager.getStats();
			assert.ok(stats.size <= 10, `Cache size should remain bounded, was ${stats.size}`);
		});
	});

	suite('Edge Cases', () => {
		test('should handle empty string keys', () => {
			// Act
			cacheManager.set('', 'empty_key_value');
			const result = cacheManager.get('');

			// Assert
			assert.strictEqual(result, 'empty_key_value', 'Should handle empty string keys');
		});

		test('should handle very long keys', () => {
			// Arrange
			const longKey = 'x'.repeat(10000);

			// Act
			cacheManager.set(longKey, 'long_key_value');
			const result = cacheManager.get(longKey);

			// Assert
			assert.strictEqual(result, 'long_key_value', 'Should handle very long keys');
		});

		test('should handle special characters in keys', () => {
			// Arrange
			const specialKey = 'key:with:special$chars@123!';

			// Act
			cacheManager.set(specialKey, 'special_value');
			const result = cacheManager.get(specialKey);

			// Assert
			assert.strictEqual(result, 'special_value', 'Should handle special characters in keys');
		});

		test('should handle undefined values', () => {
			// Arrange
			const key = 'undefined_key';
			const value = undefined;

			// Act
			cacheManager.set(key, value);
			const result = cacheManager.get(key);

			// Assert
			assert.strictEqual(result, undefined, 'Should cache undefined values');
		});

		test('should handle boolean values', () => {
			// Act
			cacheManager.set('true_key', true);
			cacheManager.set('false_key', false);

			// Assert
			assert.strictEqual(cacheManager.get('true_key'), true, 'Should cache true');
			assert.strictEqual(cacheManager.get('false_key'), false, 'Should cache false');
		});

		test('should handle number values', () => {
			// Act
			cacheManager.set('zero', 0);
			cacheManager.set('negative', -123);
			cacheManager.set('float', 3.14159);

			// Assert
			assert.strictEqual(cacheManager.get('zero'), 0, 'Should cache zero');
			assert.strictEqual(cacheManager.get('negative'), -123, 'Should cache negative numbers');
			assert.strictEqual(cacheManager.get('float'), 3.14159, 'Should cache floats');
		});
	});

	suite('Integration with Services', () => {
		test('should cache workflow check results', () => {
			// Arrange
			const workflowKey = 'workflow_code_context';
			const workflowResult = {
				status: 'ready',
				confidence: 0.9,
				gaps: []
			};

			// Act
			cacheManager.set(workflowKey, workflowResult, 600000); // 10 minutes
			const cached = cacheManager.get(workflowKey);

			// Assert
			assert.deepStrictEqual(cached, workflowResult, 'Should cache workflow results');
		});

		test('should cache confidence scores', () => {
			// Arrange
			const taskKey = 'confidence_MID-017';
			const score = 0.85;

			// Act
			cacheManager.set(taskKey, score, 60000); // 1 minute
			const cached = cacheManager.get(taskKey);

			// Assert
			assert.strictEqual(cached, score, 'Should cache confidence scores');
		});

		test('should invalidate workflow cache on user action', () => {
			// Arrange
			cacheManager.set('workflow_code_context_1', { status: 'ready' });
			cacheManager.set('workflow_code_context_2', { status: 'ready' });
			cacheManager.set('confidence_MID-001', 0.9);

			// Act - User saves file, invalidate all workflow_code_* caches
			cacheManager.invalidatePattern('^workflow_code_');

			// Assert
			const workflow1 = cacheManager.get('workflow_code_context_1');
			const workflow2 = cacheManager.get('workflow_code_context_2');
			const confidence = cacheManager.get('confidence_MID-001');

			assert.strictEqual(workflow1, null, 'workflow_code_context_1 should be invalidated');
			assert.strictEqual(workflow2, null, 'workflow_code_context_2 should be invalidated');
			assert.strictEqual(confidence, 0.9, 'confidence_MID-001 should remain');
		});
	});
});
