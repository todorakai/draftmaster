import type { ApiKeyState } from '../types';

/**
 * API Key Manager for load balancing across multiple API keys
 * Implements round-robin selection with failure tracking
 */
export class ApiKeyManager {
    private keys: ApiKeyState[] = [];
    private currentIndex: number = 0;
    private readonly failureCooldownMs: number;
    private readonly maxFailures: number;

    constructor(
        apiKeys: string[],
        options: { failureCooldownMs?: number; maxFailures?: number } = {}
    ) {
        this.failureCooldownMs = options.failureCooldownMs ?? 60000; // 1 minute default
        this.maxFailures = options.maxFailures ?? 3;

        this.keys = apiKeys.map((key) => ({
            key,
            failureCount: 0,
            lastFailure: undefined,
            disabled: false
        }));
    }

    /**
     * Get the next available API key using round-robin
     * Skips keys that are temporarily disabled due to failures
     */
    getNextKey(): string {
        if (this.keys.length === 0) {
            throw new Error('No API keys configured');
        }

        const now = Date.now();
        let attempts = 0;

        while (attempts < this.keys.length) {
            const keyState = this.keys[this.currentIndex];
            this.currentIndex = (this.currentIndex + 1) % this.keys.length;
            attempts++;

            // Check if key is available
            if (this.isKeyAvailable(keyState, now)) {
                return keyState.key;
            }
        }

        // All keys are disabled, try to re-enable the one with oldest failure
        const oldestFailure = this.keys.reduce((oldest, current) => {
            if (!oldest.lastFailure) return current;
            if (!current.lastFailure) return oldest;
            return current.lastFailure < oldest.lastFailure ? current : oldest;
        });

        // Reset and return
        oldestFailure.disabled = false;
        oldestFailure.failureCount = 0;
        return oldestFailure.key;
    }

    /**
     * Check if a key is available for use
     */
    private isKeyAvailable(keyState: ApiKeyState, now: number): boolean {
        if (!keyState.disabled) {
            return true;
        }

        // Check if cooldown has passed
        if (keyState.lastFailure && now - keyState.lastFailure > this.failureCooldownMs) {
            // Re-enable the key
            keyState.disabled = false;
            keyState.failureCount = 0;
            return true;
        }

        return false;
    }

    /**
     * Report a failure for a specific key
     */
    reportFailure(key: string): void {
        const keyState = this.keys.find((k) => k.key === key);
        if (!keyState) return;

        keyState.failureCount++;
        keyState.lastFailure = Date.now();

        if (keyState.failureCount >= this.maxFailures) {
            keyState.disabled = true;
        }
    }

    /**
     * Report a success for a specific key
     * Resets failure count
     */
    reportSuccess(key: string): void {
        const keyState = this.keys.find((k) => k.key === key);
        if (!keyState) return;

        keyState.failureCount = 0;
        keyState.disabled = false;
    }

    /**
     * Get the number of available keys
     */
    getAvailableKeyCount(): number {
        const now = Date.now();
        return this.keys.filter((k) => this.isKeyAvailable(k, now)).length;
    }

    /**
     * Get total number of keys
     */
    getTotalKeyCount(): number {
        return this.keys.length;
    }

    /**
     * Check if any keys are available
     */
    hasAvailableKeys(): boolean {
        return this.getAvailableKeyCount() > 0;
    }

    /**
     * Get key states for debugging/monitoring
     */
    getKeyStates(): ApiKeyState[] {
        return this.keys.map((k) => ({ ...k }));
    }
}

/**
 * Create an API key manager from environment variable
 * Expects comma-separated keys
 */
export function createApiKeyManagerFromEnv(
    envVar: string,
    options?: { failureCooldownMs?: number; maxFailures?: number }
): ApiKeyManager {
    const keysString = process.env[envVar] || '';
    const keys = keysString
        .split(',')
        .map((k) => k.trim())
        .filter((k) => k.length > 0);

    if (keys.length === 0) {
        throw new Error(`No API keys found in environment variable: ${envVar}`);
    }

    return new ApiKeyManager(keys, options);
}
