/**
 * Property-Based Tests for GRID API Service
 * Feature: lol-draft-assistant
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { GridApiService } from '../services/grid-api';
import { GridGraphQLClient } from '../services/grid-client';
import { CacheService } from '../services/cache';

// Mock the GridGraphQLClient
const createMockClient = () => {
    return {
        query: vi.fn()
    } as unknown as GridGraphQLClient;
};

describe('GRID API Service - Property Tests', () => {
    let mockClient: GridGraphQLClient;
    let cache: CacheService;
    let service: GridApiService;

    beforeEach(() => {
        mockClient = createMockClient();
        cache = new CacheService();
        service = new GridApiService(mockClient, cache);
    });

    /**
     * Property 1: Team Search Returns Matching Results
     * For any search query Q, all returned teams SHALL have names containing Q
     * (case-insensitive substring match).
     *
     * Validates: Requirements 1.1
     */
    it('Property 1: team search returns only matching results', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.string({ minLength: 1, maxLength: 10 }).filter((s) => /^[a-zA-Z]+$/.test(s)),
                fc.array(
                    fc.record({
                        id: fc.string({ minLength: 1 }),
                        name: fc.string({ minLength: 1, maxLength: 30 })
                    }),
                    { minLength: 0, maxLength: 20 }
                ),
                async (query, teams) => {
                    cache.clear();

                    // Mock the GraphQL response
                    (mockClient.query as ReturnType<typeof vi.fn>).mockResolvedValue({
                        data: {
                            teams: {
                                edges: teams.map((t) => ({
                                    node: { id: t.id, name: t.name }
                                }))
                            }
                        }
                    });

                    const results = await service.searchTeams(query);

                    // All returned teams should contain the query (case-insensitive)
                    for (const team of results) {
                        expect(team.name.toLowerCase()).toContain(query.toLowerCase());
                    }
                }
            ),
            { numRuns: 100 }
        );
    });

    it('Property 1b: team search is case-insensitive', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.string({ minLength: 2, maxLength: 8 }).filter((s) => /^[a-zA-Z]+$/.test(s)),
                async (baseName) => {
                    cache.clear();

                    const teamName = baseName.charAt(0).toUpperCase() + baseName.slice(1).toLowerCase();

                    // Mock response with team
                    (mockClient.query as ReturnType<typeof vi.fn>).mockResolvedValue({
                        data: {
                            teams: {
                                edges: [{ node: { id: '1', name: teamName } }]
                            }
                        }
                    });

                    // Search with lowercase
                    const lowerResults = await service.searchTeams(baseName.toLowerCase());
                    cache.clear();

                    // Search with uppercase
                    const upperResults = await service.searchTeams(baseName.toUpperCase());

                    // Both should find the team
                    expect(lowerResults.length).toBe(upperResults.length);
                }
            ),
            { numRuns: 100 }
        );
    });

    it('Property 1c: empty search query returns all teams', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.array(
                    fc.record({
                        id: fc.string({ minLength: 1 }),
                        name: fc.string({ minLength: 1, maxLength: 30 })
                    }),
                    { minLength: 1, maxLength: 10 }
                ),
                async (teams) => {
                    cache.clear();

                    (mockClient.query as ReturnType<typeof vi.fn>).mockResolvedValue({
                        data: {
                            teams: {
                                edges: teams.map((t) => ({
                                    node: { id: t.id, name: t.name }
                                }))
                            }
                        }
                    });

                    const results = await service.searchTeams('');

                    // Empty query should return all teams
                    expect(results.length).toBe(teams.length);
                }
            ),
            { numRuns: 100 }
        );
    });

    it('Property 1d: search results are cached', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.string({ minLength: 1, maxLength: 10 }).filter((s) => /^[a-zA-Z]+$/.test(s)),
                async (query) => {
                    // Create fresh instances for each property run
                    const localMockClient = createMockClient();
                    const localCache = new CacheService();
                    const localService = new GridApiService(localMockClient, localCache);

                    const teams = [{ id: '1', name: query + 'Team' }];

                    (localMockClient.query as ReturnType<typeof vi.fn>).mockResolvedValue({
                        data: {
                            teams: {
                                edges: teams.map((t) => ({
                                    node: { id: t.id, name: t.name }
                                }))
                            }
                        }
                    });

                    // First call
                    await localService.searchTeams(query);

                    // Second call should use cache
                    await localService.searchTeams(query);

                    // Query should only be called once
                    expect(localMockClient.query).toHaveBeenCalledTimes(1);
                }
            ),
            { numRuns: 100 }
        );
    });

    it('Property 1e: getTeam returns correct team by ID', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.string({ minLength: 1, maxLength: 20 }),
                fc.string({ minLength: 1, maxLength: 30 }),
                async (id, name) => {
                    cache.clear();

                    (mockClient.query as ReturnType<typeof vi.fn>).mockResolvedValue({
                        data: {
                            team: { id, name }
                        }
                    });

                    const result = await service.getTeam(id);

                    expect(result).not.toBeNull();
                    expect(result?.id).toBe(id);
                    expect(result?.name).toBe(name);
                }
            ),
            { numRuns: 100 }
        );
    });

    it('Property 1f: getTeam returns null for non-existent team', async () => {
        await fc.assert(
            fc.asyncProperty(fc.string({ minLength: 1, maxLength: 20 }), async (id) => {
                cache.clear();

                (mockClient.query as ReturnType<typeof vi.fn>).mockResolvedValue({
                    data: { team: null }
                });

                const result = await service.getTeam(id);

                expect(result).toBeNull();
            }),
            { numRuns: 100 }
        );
    });
});
