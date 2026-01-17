/**
 * Property-Based Tests for Champion Data Service
 * Feature: lol-draft-assistant
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { ChampionDataService } from '../services/champion-data';
import type { Champion, ChampionRole, Synergy, Counter } from '../types';

// Arbitraries for generating test data
const championRoleArb = fc.constantFrom<ChampionRole>(
    'top',
    'jungle',
    'mid',
    'adc',
    'support'
);

const championArb: fc.Arbitrary<Champion> = fc.record({
    id: fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s.trim().length > 0),
    name: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
    role: championRoleArb,
    imageUrl: fc.webUrl(),
    tags: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 3 })
});

const synergyArb: fc.Arbitrary<Synergy> = fc.record({
    championId: fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s.trim().length > 0),
    partnerChampionId: fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s.trim().length > 0),
    score: fc.integer({ min: 0, max: 100 }),
    description: fc.string({ minLength: 1, maxLength: 200 })
});

const counterArb: fc.Arbitrary<Counter> = fc.record({
    championId: fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s.trim().length > 0),
    counterChampionId: fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s.trim().length > 0),
    score: fc.integer({ min: 0, max: 100 }),
    description: fc.string({ minLength: 1, maxLength: 200 })
});

describe('Champion Data Service - Property Tests', () => {
    /**
     * Property 4: Champion Data Serialization Round-Trip
     * For any valid champion database (champions, synergies, counters),
     * serializing to JSON and then deserializing SHALL produce an equivalent
     * data structure with all fields preserved.
     * 
     * Validates: Requirements 5.4, 5.5
     */
    it('Property 4: serialization round-trip preserves all data', () => {
        fc.assert(
            fc.property(
                fc.array(championArb, { minLength: 1, maxLength: 10 }),
                fc.array(synergyArb, { minLength: 0, maxLength: 5 }),
                fc.array(counterArb, { minLength: 0, maxLength: 5 }),
                (champions, synergies, counters) => {
                    // Create a service and load data
                    const service = new ChampionDataService();

                    // We need to create a custom service with our test data
                    // Since the constructor loads from JSON, we'll test the serialize/deserialize methods
                    const testData = {
                        champions,
                        synergies,
                        counters
                    };

                    // Serialize the test data
                    const serialized = JSON.stringify(testData, null, 2);

                    // Deserialize using the static method
                    const deserializedService = ChampionDataService.deserialize(serialized);

                    // Re-serialize the deserialized data
                    const reSerialized = deserializedService.serialize();

                    // Parse both to compare
                    const original = JSON.parse(serialized);
                    const roundTripped = JSON.parse(reSerialized);

                    // Verify champions are preserved
                    expect(roundTripped.champions).toHaveLength(original.champions.length);
                    for (let i = 0; i < original.champions.length; i++) {
                        expect(roundTripped.champions[i].id).toBe(original.champions[i].id);
                        expect(roundTripped.champions[i].name).toBe(original.champions[i].name);
                        expect(roundTripped.champions[i].role).toBe(original.champions[i].role);
                        expect(roundTripped.champions[i].imageUrl).toBe(original.champions[i].imageUrl);
                        expect(roundTripped.champions[i].tags).toEqual(original.champions[i].tags);
                    }

                    // Verify synergies are preserved
                    expect(roundTripped.synergies).toHaveLength(original.synergies.length);
                    for (let i = 0; i < original.synergies.length; i++) {
                        expect(roundTripped.synergies[i].championId).toBe(original.synergies[i].championId);
                        expect(roundTripped.synergies[i].partnerChampionId).toBe(original.synergies[i].partnerChampionId);
                        expect(roundTripped.synergies[i].score).toBe(original.synergies[i].score);
                        expect(roundTripped.synergies[i].description).toBe(original.synergies[i].description);
                    }

                    // Verify counters are preserved
                    expect(roundTripped.counters).toHaveLength(original.counters.length);
                    for (let i = 0; i < original.counters.length; i++) {
                        expect(roundTripped.counters[i].championId).toBe(original.counters[i].championId);
                        expect(roundTripped.counters[i].counterChampionId).toBe(original.counters[i].counterChampionId);
                        expect(roundTripped.counters[i].score).toBe(original.counters[i].score);
                        expect(roundTripped.counters[i].description).toBe(original.counters[i].description);
                    }
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Additional property: Deserialized service returns same champions as original
     * Note: Uses uniqueArray to ensure no duplicate IDs
     */
    it('Property 4b: deserialized service getAllChampions returns equivalent data', () => {
        fc.assert(
            fc.property(
                fc.uniqueArray(championArb, {
                    minLength: 1,
                    maxLength: 10,
                    selector: (c) => c.id
                }),
                (champions) => {
                    const testData = { champions, synergies: [], counters: [] };
                    const serialized = JSON.stringify(testData);

                    const service = ChampionDataService.deserialize(serialized);
                    const retrievedChampions = service.getAllChampions();

                    expect(retrievedChampions).toHaveLength(champions.length);

                    // Each champion should be retrievable by ID (unique IDs guaranteed)
                    for (const champion of champions) {
                        const found = service.getChampion(champion.id);
                        expect(found).toBeDefined();
                        expect(found?.name).toBe(champion.name);
                        expect(found?.role).toBe(champion.role);
                    }
                }
            ),
            { numRuns: 100 }
        );
    });
});


describe('Synergy Score Calculation - Property Tests', () => {
    const service = new ChampionDataService();
    const allChampions = service.getAllChampions();

    // Arbitrary for selecting random champions from the actual database
    const championFromDbArb = fc.integer({ min: 0, max: allChampions.length - 1 }).map(
        (i) => allChampions[i]
    );

    const teamCompositionArb = fc.array(championFromDbArb, { minLength: 1, maxLength: 5 });

    /**
     * Property 5: Synergy Score Calculation Consistency
     * For any valid team composition of 1-5 champions, the synergy calculation
     * SHALL produce a numeric score, and the score SHALL be deterministic
     * (same input always produces same output).
     * 
     * Validates: Requirements 5.3
     */
    it('Property 5: synergy calculation produces numeric score', () => {
        fc.assert(
            fc.property(teamCompositionArb, (champions) => {
                const result = service.calculateTeamSynergy(champions);

                // Score must be a number
                expect(typeof result.totalScore).toBe('number');
                expect(Number.isFinite(result.totalScore)).toBe(true);

                // Score must be non-negative (base score is champions.length * 10)
                expect(result.totalScore).toBeGreaterThanOrEqual(0);

                // Synergies array must be defined
                expect(Array.isArray(result.synergies)).toBe(true);

                // Warnings array must be defined
                expect(Array.isArray(result.warnings)).toBe(true);
            }),
            { numRuns: 100 }
        );
    });

    it('Property 5b: synergy calculation is deterministic', () => {
        fc.assert(
            fc.property(teamCompositionArb, (champions) => {
                // Calculate synergy twice with same input
                const result1 = service.calculateTeamSynergy(champions);
                const result2 = service.calculateTeamSynergy(champions);

                // Results must be identical
                expect(result1.totalScore).toBe(result2.totalScore);
                expect(result1.synergies.length).toBe(result2.synergies.length);
                expect(result1.warnings.length).toBe(result2.warnings.length);

                // Deep equality check for synergies
                for (let i = 0; i < result1.synergies.length; i++) {
                    expect(result1.synergies[i].championId).toBe(result2.synergies[i].championId);
                    expect(result1.synergies[i].partnerChampionId).toBe(result2.synergies[i].partnerChampionId);
                    expect(result1.synergies[i].score).toBe(result2.synergies[i].score);
                }
            }),
            { numRuns: 100 }
        );
    });

    it('Property 5c: base score scales with team size', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: 1, max: 5 }),
                (teamSize) => {
                    // Get unique champions for the team
                    const uniqueChampions = allChampions.slice(0, teamSize);
                    const result = service.calculateTeamSynergy(uniqueChampions);

                    // Base score should be at least teamSize * 10
                    expect(result.totalScore).toBeGreaterThanOrEqual(teamSize * 10);
                }
            ),
            { numRuns: 100 }
        );
    });
});
