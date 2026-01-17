/**
 * GraphQL Client for GRID API
 * Implements fetch-based client with retry logic and exponential backoff
 */

export interface GraphQLResponse<T> {
    data?: T;
    errors?: Array<{ message: string; locations?: Array<{ line: number; column: number }> }>;
}

export interface GraphQLClientOptions {
    maxRetries?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
}

export class GridGraphQLClient {
    private readonly apiUrl: string;
    private readonly apiKey: string;
    private readonly maxRetries: number;
    private readonly baseDelayMs: number;
    private readonly maxDelayMs: number;

    constructor(apiUrl: string, apiKey: string, options: GraphQLClientOptions = {}) {
        this.apiUrl = apiUrl;
        this.apiKey = apiKey;
        this.maxRetries = options.maxRetries ?? 3;
        this.baseDelayMs = options.baseDelayMs ?? 1000;
        this.maxDelayMs = options.maxDelayMs ?? 10000;
    }

    /**
     * Execute a GraphQL query with retry logic
     */
    async query<T>(
        query: string,
        variables?: Record<string, unknown>
    ): Promise<GraphQLResponse<T>> {
        let lastError: Error | null = null;

        for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
            try {
                const response = await fetch(this.apiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': this.apiKey
                    },
                    body: JSON.stringify({ query, variables })
                });

                if (!response.ok) {
                    if (response.status >= 500 && attempt < this.maxRetries) {
                        await this.delay(attempt);
                        continue;
                    }
                    throw new Error(`GRID API error: ${response.status} ${response.statusText}`);
                }

                const result = (await response.json()) as GraphQLResponse<T>;

                if (result.errors && result.errors.length > 0) {
                    const errorMessages = result.errors.map((e) => e.message).join(', ');
                    throw new Error(`GraphQL errors: ${errorMessages}`);
                }

                return result;
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));

                if (attempt < this.maxRetries && this.isRetryableError(error)) {
                    await this.delay(attempt);
                    continue;
                }
            }
        }

        throw lastError || new Error('Unknown error during GraphQL request');
    }

    /**
     * Calculate delay with exponential backoff and jitter
     */
    private async delay(attempt: number): Promise<void> {
        const exponentialDelay = this.baseDelayMs * Math.pow(2, attempt);
        const jitter = Math.random() * 0.3 * exponentialDelay;
        const delay = Math.min(exponentialDelay + jitter, this.maxDelayMs);
        await new Promise((resolve) => setTimeout(resolve, delay));
    }

    /**
     * Check if error is retryable
     */
    private isRetryableError(error: unknown): boolean {
        if (error instanceof Error) {
            const message = error.message.toLowerCase();
            return (
                message.includes('network') ||
                message.includes('timeout') ||
                message.includes('econnreset') ||
                message.includes('500') ||
                message.includes('502') ||
                message.includes('503') ||
                message.includes('504')
            );
        }
        return false;
    }
}

/**
 * Create GRID client from environment variables
 */
export function createGridClient(options?: GraphQLClientOptions): GridGraphQLClient {
    const apiUrl = process.env.GRID_API_URL || 'https://api-op.grid.gg/central-data/graphql';
    const apiKey = process.env.GRID_API_KEY || '';

    if (!apiKey) {
        throw new Error('GRID_API_KEY environment variable is required');
    }

    return new GridGraphQLClient(apiUrl, apiKey, options);
}
