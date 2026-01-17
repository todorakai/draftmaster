/**
 * Property-Based Tests for Cache Service
 * Feature: lol-draft-assistant
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { CacheService } from '../services/cache';

describe('Cache Service - Property Tests', () => {
    let cache: CacheService;

    beforeEach(() => {
        cache = new CacheService();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    /**
     * Property 7: Cache TTL Behavior
     * For any cached value with TTL T, requests within time T SHALL return
     * the cached value, and requests after time T SHALL trigger a fresh fetch
     * (return undefined).
     * 
     * Validates: Requirements 8.4
     */
    it('Property 7: cache returns value within TTL', () => {
        fc.assert(
            fc.property(
                fc.string({ minLength: 1 }),
                fc.anything(),
                fc.integer({ min: 100, max: 10000 }),
                fc.integer({ min: 0, max: 99 }),
                (key, value, ttlMs, percentageWithinTtl) => {
                    cache.clear();

                    // Set the value
                    cache.set(key, value, ttlMs);

                    // Advance time to within TTL
                    const timeWithinTtl = Math.floor((ttlMs * percentageWithinTtl) / 100);
                    vi.advanceTimersByTime(timeWithinTtl);

                    // Value should still be available
                    const retrieved = cache.get(key);
                    expect(retrieved).toEqual(value);
                }
            ),
            { numRuns: 100 }
        );
    });

    it('Property 7b: cache returns undefined after TTL expires', () => {
        fc.assert(
            fc.property(
                fc.string({ minLength: 1 }),
                fc.anything(),
                fc.integer({ min: 100, max: 10000 }),
                fc.integer({ min: 1, max: 1000 }),
                (key, value, ttlMs, extraMs) => {
                    cache.clear();

                    // Set the value
                    cache.set(key, value, ttlMs);

                    // Advance time past TTL
                    vi.advanceTimersByTime(ttlMs + extraMs);

                    // Value should be expired
                    const retrieved = cache.get(key);
                    expect(retrieved).toBeUndefined();
                }
            ),
            { numRuns: 100 }
        );
    });

    it('Property 7c: cache invalidation removes value immediately', () => {
        fc.assert(
            fc.property(
                fc.string({ minLength: 1 }),
                fc.anything(),
                fc.integer({ min: 1000, max: 100000 }),
                (key, value, ttlMs) => {
                    cache.clear();

                    // Set the value with long TTL
                    cache.set(key, value, ttlMs);

                    // Verify it's cached
                    expect(cache.get(key)).toEqual(value);

                    // Invalidate
                    cache.invalidate(key);

                    // Should be gone
                    expect(cache.get(key)).toBeUndefined();
                }
            ),
            { numRuns: 100 }
        );
    });

    it('Property 7d: pattern invalidation removes matching keys', () => {
        fc.assert(
            fc.property(
                fc.string({ minLength: 1, maxLength: 10 }).filter((s) => !s.includes('*')),
                fc.array(fc.string({ minLength: 1, maxLength: 5 }), { minLength: 1, maxLength: 5 }),
                fc.anything(),
                (prefix, suffixes, value) => {
                    cache.clear();

                    // Set multiple values with same prefix
                    const keys = suffixes.map((s) => `${prefix}:${s}`);
                    for (const key of keys) {
                        cache.set(key, value, 10000);
                    }

                    // Set a value with different prefix
                    const otherKey = `other:${prefix}`;
                    cache.set(otherKey, value, 10000);

                    // Invalidate by pattern
                    cache.invalidatePattern(`${prefix}:*`);

                    // All matching keys should be gone
                    for (const key of keys) {
                        expect(cache.get(key)).toBeUndefined();
                    }

                    // Other key should still exist
                    expect(cache.get(otherKey)).toEqual(value);
                }
            ),
            { numRuns: 100 }
        );
    });

    it('Property 7e: set overwrites existing value', () => {
        fc.assert(
            fc.property(
                fc.string({ minLength: 1 }),
                fc.anything(),
                fc.anything(),
                fc.integer({ min: 1000, max: 10000 }),
                (key, value1, value2, ttlMs) => {
                    cache.clear();

                    // Set first value
                    cache.set(key, value1, ttlMs);
                    expect(cache.get(key)).toEqual(value1);

                    // Overwrite with second value
                    cache.set(key, value2, ttlMs);
                    expect(cache.get(key)).toEqual(value2);
                }
            ),
            { numRuns: 100 }
        );
    });

    it('Property 7f: has returns correct boolean', () => {
        fc.assert(
            fc.property(
                fc.string({ minLength: 1 }),
                fc.string(), // Use string instead of anything to avoid undefined
                fc.integer({ min: 100, max: 10000 }),
                (key, value, ttlMs) => {
                    cache.clear();

                    // Initially should not have key
                    expect(cache.has(key)).toBe(false);

                    // After setting, should have key
                    cache.set(key, value, ttlMs);
                    expect(cache.has(key)).toBe(true);

                    // After TTL expires, should not have key
                    vi.advanceTimersByTime(ttlMs + 1);
                    expect(cache.has(key)).toBe(false);
                }
            ),
            { numRuns: 100 }
        );
    });
});
