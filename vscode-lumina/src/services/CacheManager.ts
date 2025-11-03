/**
 * Cache Manager Service
 *
 * DESIGN DECISION: In-memory cache with LRU eviction and TTL support
 * WHY: Fast data retrieval, reduced API calls, better performance
 *
 * REASONING CHAIN:
 * 1. Cache structure: Map for O(1) lookup performance
 * 2. LRU eviction: Track lastAccessed timestamp, evict oldest when full
 * 3. TTL support: Automatic expiration via expiresAt timestamp
 * 4. Statistics: Track hits/misses for monitoring (target: >80% hit rate)
 * 5. Performance: <0.1ms cache hits, <1ms misses, <5ms eviction
 *
 * PATTERN: Pattern-PERFORMANCE-001 (Caching Strategy)
 * PATTERN: Pattern-MIDDLEWARE-001 (Service Integration Layer)
 * RELATED: MID-017, WorkflowCheck, ConfidenceScorer
 *
 * @module services/CacheManager
 */

import { MiddlewareLogger } from './MiddlewareLogger';

/**
 * Cache entry structure
 */
interface CacheEntry<T> {
	value: T;
	expiresAt: number;
	lastAccessed: number;
}

/**
 * Cache statistics
 */
export interface CacheStats {
	size: number;
	maxSize: number;
	hits: number;
	misses: number;
	hitRate: number;
}

/**
 * Cache Manager Service
 *
 * Provides in-memory caching with LRU eviction, TTL support, and cache invalidation.
 */
export class CacheManager {
	private cache = new Map<string, CacheEntry<any>>();
	private maxSize: number;
	private hits = 0;
	private misses = 0;
	private logger: MiddlewareLogger;

	/**
	 * Constructor
	 *
	 * @param logger - MiddlewareLogger instance for cache operations logging
	 * @param maxSize - Maximum cache size (default: 1000 entries)
	 */
	constructor(logger: MiddlewareLogger, maxSize: number = 1000) {
		this.logger = logger;
		this.maxSize = maxSize;
	}

	/**
	 * Get value from cache
	 *
	 * DESIGN DECISION: Check expiration on every get
	 * WHY: Automatic cleanup, no background timers needed
	 *
	 * @param key - Cache key
	 * @returns Cached value or null if not found/expired
	 */
	get<T>(key: string): T | null {
		const entry = this.cache.get(key);

		if (!entry) {
			this.misses++;
			this.logger.debug(`Cache miss: ${key}`);
			return null;
		}

		// Check if expired
		if (entry.expiresAt < Date.now()) {
			this.cache.delete(key);
			this.misses++;
			this.logger.debug(`Cache expired: ${key}`);
			return null;
		}

		// Update last accessed time for LRU
		entry.lastAccessed = Date.now();
		this.hits++;
		this.logger.debug(`Cache hit: ${key}`);

		return entry.value as T;
	}

	/**
	 * Set value in cache
	 *
	 * DESIGN DECISION: Evict LRU entry when cache full
	 * WHY: Keeps hot data in cache, cold data evicted automatically
	 *
	 * @param key - Cache key
	 * @param value - Value to cache
	 * @param ttlMs - Time-to-live in milliseconds (default: 10 minutes)
	 */
	set<T>(key: string, value: T, ttlMs: number = 600000): void {
		// Evict LRU item if cache full
		if (this.cache.size >= this.maxSize) {
			this.evictLRU();
		}

		this.cache.set(key, {
			value,
			expiresAt: Date.now() + ttlMs,
			lastAccessed: Date.now()
		});

		this.logger.debug(`Cache set: ${key} (TTL: ${ttlMs}ms)`);
	}

	/**
	 * Invalidate single cache entry
	 *
	 * @param key - Cache key to invalidate
	 */
	invalidate(key: string): void {
		this.cache.delete(key);
		this.logger.debug(`Cache invalidated: ${key}`);
	}

	/**
	 * Invalidate cache entries by pattern
	 *
	 * DESIGN DECISION: Use regex for flexible pattern matching
	 * WHY: Invalidate related entries (e.g., all user_* caches)
	 *
	 * @param pattern - Regex pattern to match keys
	 */
	invalidatePattern(pattern: string): void {
		const regex = new RegExp(pattern);
		let invalidatedCount = 0;

		for (const key of this.cache.keys()) {
			if (regex.test(key)) {
				this.cache.delete(key);
				invalidatedCount++;
			}
		}

		this.logger.debug(`Cache invalidated by pattern: ${pattern} (${invalidatedCount} entries)`);
	}

	/**
	 * Clear all cache entries
	 *
	 * DESIGN DECISION: Also reset statistics
	 * WHY: Clean slate for new caching session
	 */
	clear(): void {
		this.cache.clear();
		this.hits = 0;
		this.misses = 0;
		this.logger.info('Cache cleared');
	}

	/**
	 * Get cache statistics
	 *
	 * DESIGN DECISION: Calculate hit rate on demand
	 * WHY: No need to update on every operation, calculate when needed
	 *
	 * @returns Cache statistics (size, hits, misses, hit rate)
	 */
	getStats(): CacheStats {
		const hitRate = this.hits + this.misses > 0
			? this.hits / (this.hits + this.misses)
			: 0;

		return {
			size: this.cache.size,
			maxSize: this.maxSize,
			hits: this.hits,
			misses: this.misses,
			hitRate
		};
	}

	/**
	 * Evict least recently used entry
	 *
	 * DESIGN DECISION: Linear search for oldest entry
	 * WHY: Simple, correct, fast enough for our cache sizes
	 *
	 * Alternative: Use doubly-linked list for O(1) eviction
	 * Trade-off: More complex, only matters for very large caches (>10k entries)
	 */
	private evictLRU(): void {
		let oldestKey: string | null = null;
		let oldestTime = Infinity;

		for (const [key, entry] of this.cache.entries()) {
			if (entry.lastAccessed < oldestTime) {
				oldestTime = entry.lastAccessed;
				oldestKey = key;
			}
		}

		if (oldestKey) {
			this.cache.delete(oldestKey);
			this.logger.debug(`Cache evicted (LRU): ${oldestKey}`);
		}
	}
}
