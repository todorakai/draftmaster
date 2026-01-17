import type { CacheEntry } from '../types';

/**
 * In-memory cache service with TTL support
 */
export class CacheService {
    private cache: Map<string, CacheEntry<unknown>> = new Map();

    /**
     * Get a value from the cache
     * Returns undefined if not found or expired
     */
    get<T>(key: string): T | undefined {
        const entry = this.cache.get(key);

        if (!entry) {
            return undefined;
        }

        // Check if expired
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return undefined;
        }

        return entry.value as T;
    }

    /**
     * Set a value in the cache with TTL
     */
    set<T>(key: string, value: T, ttlMs: number): void {
        const entry: CacheEntry<T> = {
            value,
            expiresAt: Date.now() + ttlMs
        };
        this.cache.set(key, entry);
    }

    /**
     * Check if a key exists and is not expired
     */
    has(key: string): boolean {
        const entry = this.cache.get(key);
        if (!entry) return false;
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return false;
        }
        return true;
    }

    /**
     * Invalidate (delete) a specific key
     */
    invalidate(key: string): void {
        this.cache.delete(key);
    }


    /**
     * Invalidate all keys matching a pattern
     * Pattern supports * as wildcard
     */
    invalidatePattern(pattern: string): void {
        const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp('^' + escaped.replace(/\*/g, '.*').replace(/\?/g, '.') + '$');

        const keysToDelete: string[] = [];
        this.cache.forEach((_, key) => {
            if (regex.test(key)) {
                keysToDelete.push(key);
            }
        });

        keysToDelete.forEach((key) => this.cache.delete(key));
    }

    /**
     * Clear all cached entries
     */
    clear(): void {
        this.cache.clear();
    }

    /**
     * Get the number of entries in the cache
     */
    size(): number {
        return this.cache.size;
    }

    /**
     * Clean up expired entries
     */
    cleanup(): void {
        const now = Date.now();
        const keysToDelete: string[] = [];
        this.cache.forEach((entry, key) => {
            if (now > entry.expiresAt) {
                keysToDelete.push(key);
            }
        });
        keysToDelete.forEach((key) => this.cache.delete(key));
    }

    /**
     * Get or set a value with a factory function
     */
    async getOrSet<T>(key: string, factory: () => Promise<T>, ttlMs: number): Promise<T> {
        const cached = this.get<T>(key);
        if (cached !== undefined) {
            return cached;
        }

        const value = await factory();
        this.set(key, value, ttlMs);
        return value;
    }
}

// Singleton instance
export const cacheService = new CacheService();

// Cache TTL constants (in milliseconds)
export const CACHE_TTL = {
    TEAM_INFO: 60 * 60 * 1000,
    PLAYER_INFO: 60 * 60 * 1000,
    TEAM_STATISTICS: 15 * 60 * 1000,
    PLAYER_STATISTICS: 15 * 60 * 1000,
    TOURNAMENTS: 60 * 60 * 1000,
    SERIES: 5 * 60 * 1000
} as const;
