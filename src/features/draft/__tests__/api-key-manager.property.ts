/**
 * Property-Based Tests for API Key Manager
 * Feature: lol-draft-assistant
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { ApiKeyManager } from '../services/api-key-manager';

describe('API Key Manager - Property Tests', () => {
    /**
     * Property 6: API Key Load Balancing Distribution
     * Given N API keys, after N*M requests without failures, each key SHALL
     * have been selected approximately M times (within acceptable variance).
     *
     * Validates: Requirements 8.2
     */
    it('Property 6: round-robin distributes keys evenly', () => {
        fc.assert(
            fc.property(
                fc.array(fc.string({ minLength: 10, maxLength: 20 }), { minLength: 2, maxLength: 8 }),
                fc.integer({ min: 5, max: 20 }),
                (keys, multiplier) => {
                    // Ensure unique keys
                    const uniqueKeys = [...new Set(keys)];
                    if (uniqueKeys.length < 2) return true; // Skip if not enough unique keys

                    const manager = new ApiKeyManager(uniqueKeys);
                    const totalRequests = uniqueKeys.length * multiplier;
                    const keyCounts = new Map<string, number>();

                    // Initialize counts
                    for (const key of uniqueKeys) {
                        keyCounts.set(key, 0);
                    }

                    // Make requests
                    for (let i = 0; i < totalRequests; i++) {
                        const key = manager.getNextKey();
                        keyCounts.set(key, (keyCounts.get(key) || 0) + 1);
                    }

                    // Each key should be selected exactly multiplier times (perfect round-robin)
                    for (const key of uniqueKeys) {
                        expect(keyCounts.get(key)).toBe(multiplier);
                    }
                }
            ),
            { numRuns: 100 }
        );
    });

    it('Property 6b: failed keys are skipped until cooldown', () => {
        fc.assert(
            fc.property(
                fc.array(fc.string({ minLength: 10, maxLength: 20 }), { minLength: 3, maxLength: 6 }),
                fc.integer({ min: 3, max: 5 }),
                (keys, maxFailures) => {
                    const uniqueKeys = [...new Set(keys)];
                    if (uniqueKeys.length < 3) return true;

                    const manager = new ApiKeyManager(uniqueKeys, {
                        maxFailures,
                        failureCooldownMs: 60000
                    });

                    // Fail the first key enough times to disable it
                    const firstKey = manager.getNextKey();
                    for (let i = 0; i < maxFailures; i++) {
                        manager.reportFailure(firstKey);
                    }

                    // Next N-1 requests should not return the failed key
                    const nextKeys: string[] = [];
                    for (let i = 0; i < uniqueKeys.length - 1; i++) {
                        nextKeys.push(manager.getNextKey());
                    }

                    // The failed key should not appear in the next batch
                    expect(nextKeys).not.toContain(firstKey);
                }
            ),
            { numRuns: 100 }
        );
    });

    it('Property 6c: success resets failure count', () => {
        fc.assert(
            fc.property(
                fc.array(fc.string({ minLength: 10, maxLength: 20 }), { minLength: 2, maxLength: 5 }),
                fc.integer({ min: 1, max: 2 }),
                (keys, failuresBelowMax) => {
                    const uniqueKeys = [...new Set(keys)];
                    if (uniqueKeys.length < 2) return true;

                    const maxFailures = 3;
                    const manager = new ApiKeyManager(uniqueKeys, { maxFailures });

                    const firstKey = manager.getNextKey();

                    // Report some failures (but not enough to disable)
                    for (let i = 0; i < failuresBelowMax; i++) {
                        manager.reportFailure(firstKey);
                    }

                    // Report success - should reset
                    manager.reportSuccess(firstKey);

                    // Key should still be available
                    expect(manager.getAvailableKeyCount()).toBe(uniqueKeys.length);
                }
            ),
            { numRuns: 100 }
        );
    });

    it('Property 6d: getAvailableKeyCount reflects disabled keys', () => {
        fc.assert(
            fc.property(
                fc.array(fc.string({ minLength: 10, maxLength: 20 }), { minLength: 3, maxLength: 6 }),
                fc.integer({ min: 1, max: 2 }),
                (keys, keysToDisable) => {
                    const uniqueKeys = [...new Set(keys)];
                    if (uniqueKeys.length < 3) return true;

                    const actualKeysToDisable = Math.min(keysToDisable, uniqueKeys.length - 1);
                    const manager = new ApiKeyManager(uniqueKeys, { maxFailures: 1 });

                    // Disable some keys
                    const disabledKeys: string[] = [];
                    for (let i = 0; i < actualKeysToDisable; i++) {
                        const key = manager.getNextKey();
                        manager.reportFailure(key);
                        disabledKeys.push(key);
                    }

                    // Available count should reflect disabled keys
                    expect(manager.getAvailableKeyCount()).toBe(uniqueKeys.length - actualKeysToDisable);
                }
            ),
            { numRuns: 100 }
        );
    });

    it('Property 6e: always returns a key even when all are disabled', () => {
        fc.assert(
            fc.property(
                fc.array(fc.string({ minLength: 10, maxLength: 20 }), { minLength: 1, maxLength: 5 }),
                (keys) => {
                    const uniqueKeys = [...new Set(keys)];
                    if (uniqueKeys.length === 0) return true;

                    const manager = new ApiKeyManager(uniqueKeys, { maxFailures: 1 });

                    // Disable all keys
                    for (let i = 0; i < uniqueKeys.length; i++) {
                        const key = manager.getNextKey();
                        manager.reportFailure(key);
                    }

                    // Should still return a key (re-enables oldest failure)
                    const key = manager.getNextKey();
                    expect(uniqueKeys).toContain(key);
                }
            ),
            { numRuns: 100 }
        );
    });

    it('Property 6f: getTotalKeyCount is constant', () => {
        fc.assert(
            fc.property(
                fc.array(fc.string({ minLength: 10, maxLength: 20 }), { minLength: 1, maxLength: 10 }),
                fc.integer({ min: 1, max: 20 }),
                (keys, operations) => {
                    const uniqueKeys = [...new Set(keys)];
                    if (uniqueKeys.length === 0) return true;

                    const manager = new ApiKeyManager(uniqueKeys, { maxFailures: 2 });
                    const initialCount = manager.getTotalKeyCount();

                    // Perform random operations
                    for (let i = 0; i < operations; i++) {
                        const key = manager.getNextKey();
                        if (i % 3 === 0) {
                            manager.reportFailure(key);
                        } else if (i % 3 === 1) {
                            manager.reportSuccess(key);
                        }
                    }

                    // Total count should never change
                    expect(manager.getTotalKeyCount()).toBe(initialCount);
                    expect(manager.getTotalKeyCount()).toBe(uniqueKeys.length);
                }
            ),
            { numRuns: 100 }
        );
    });

    it('Property 6g: throws error when no keys configured', () => {
        const manager = new ApiKeyManager([]);
        expect(() => manager.getNextKey()).toThrow('No API keys configured');
    });
});
