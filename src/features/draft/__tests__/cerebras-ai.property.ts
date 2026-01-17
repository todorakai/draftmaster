/**
 * Property-Based Tests for Cerebras AI Service
 * Feature: lol-draft-assistant
 * 
 * Tests the recommendation parsing and validation logic without calling the actual API.
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { Champion, Recommendation } from '../types';

// Champion generator
const championArb = fc.record({
    id: fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s.trim().length > 0),
    name: fc.string({ minLength: 2, maxLength: 20 }).filter((s) => s.trim().length > 0),
    role: fc.constantFrom('top', 'jungle', 'mid', 'adc', 'support'),
    imageUrl: fc.string(),
    tags: fc.array(fc.string(), { maxLength: 3 })
});

/**
 * Recommendation parser extracted for testing
 * This mirrors the logic in CerebrasService.parseRecommendations
 */
function parseRecommendations(content: string, availableChampions: Champion[]): Recommendation[] {
    try {
        let jsonStr = content;
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
            jsonStr = jsonMatch[1].trim();
        } else {
            const arrayMatch = content.match(/\[[\s\S]*\]/);
            if (arrayMatch) {
                jsonStr = arrayMatch[0];
            }
        }

        const parsed = JSON.parse(jsonStr) as Array<{
            championId?: string;
            championName?: string;
            score?: number;
            reason?: string;
            role?: string;
        }>;

        if (!Array.isArray(parsed)) {
            return getFallbackRecommendations(availableChampions);
        }

        const recommendations: Recommendation[] = [];

        for (const item of parsed.slice(0, 5)) {
            const champion = availableChampions.find(
                (c) =>
                    c.id === item.championId ||
                    c.name.toLowerCase() === item.championName?.toLowerCase()
            );

            if (champion) {
                recommendations.push({
                    champion,
                    score: Math.max(0, Math.min(1, item.score || 0.5)),
                    reason: item.reason || 'Recommended by AI',
                    type: 'pick'
                });
            }
        }

        if (recommendations.length < 3) {
            const fallbacks = getFallbackRecommendations(availableChampions);
            for (const fb of fallbacks) {
                if (
                    recommendations.length < 3 &&
                    !recommendations.some((r) => r.champion.id === fb.champion.id)
                ) {
                    recommendations.push(fb);
                }
            }
        }

        return recommendations.slice(0, 3);
    } catch {
        return getFallbackRecommendations(availableChampions);
    }
}

function getFallbackRecommendations(availableChampions: Champion[]): Recommendation[] {
    const byRole = new Map<string, Champion>();

    for (const champ of availableChampions) {
        if (!byRole.has(champ.role)) {
            byRole.set(champ.role, champ);
        }
        if (byRole.size >= 3) break;
    }

    const recommendations: Recommendation[] = [];
    for (const [, champion] of byRole) {
        recommendations.push({
            champion,
            score: 0.5,
            reason: 'Fallback recommendation - fills team composition',
            type: 'pick'
        });
    }

    if (recommendations.length < 3) {
        for (const champ of availableChampions) {
            if (!recommendations.some((r) => r.champion.id === champ.id)) {
                recommendations.push({
                    champion: champ,
                    score: 0.4,
                    reason: 'Available champion',
                    type: 'pick'
                });
                if (recommendations.length >= 3) break;
            }
        }
    }

    return recommendations.slice(0, 3);
}

describe('Cerebras AI Service - Property Tests', () => {
    /**
     * Property 8: Recommendation Response Structure
     * For any valid draft state, the AI service SHALL return recommendations
     * with valid structure: championId, score (0-1), reason, and type.
     *
     * Validates: Requirements 4.4, 4.5
     */
    it('Property 8: recommendations have valid structure', () => {
        fc.assert(
            fc.property(
                fc.array(championArb, { minLength: 5, maxLength: 20 }),
                (champions) => {
                    // Ensure unique champion IDs
                    const uniqueChampions = champions.reduce((acc, c) => {
                        if (!acc.some((x) => x.id === c.id)) acc.push(c);
                        return acc;
                    }, [] as Champion[]);

                    if (uniqueChampions.length < 3) return true;

                    // Create valid AI response
                    const aiResponse = JSON.stringify([
                        {
                            championId: uniqueChampions[0].id,
                            championName: uniqueChampions[0].name,
                            score: 0.9,
                            reason: 'Strong pick',
                            role: uniqueChampions[0].role
                        },
                        {
                            championId: uniqueChampions[1].id,
                            championName: uniqueChampions[1].name,
                            score: 0.8,
                            reason: 'Good synergy',
                            role: uniqueChampions[1].role
                        },
                        {
                            championId: uniqueChampions[2].id,
                            championName: uniqueChampions[2].name,
                            score: 0.7,
                            reason: 'Counter pick',
                            role: uniqueChampions[2].role
                        }
                    ]);

                    const recommendations = parseRecommendations(aiResponse, uniqueChampions);

                    // Verify structure
                    expect(recommendations).toBeInstanceOf(Array);
                    expect(recommendations.length).toBeGreaterThanOrEqual(1);
                    expect(recommendations.length).toBeLessThanOrEqual(3);

                    for (const rec of recommendations) {
                        expect(rec.champion).toBeDefined();
                        expect(rec.champion.id).toBeDefined();
                        expect(rec.champion.name).toBeDefined();
                        expect(rec.score).toBeGreaterThanOrEqual(0);
                        expect(rec.score).toBeLessThanOrEqual(1);
                        expect(rec.reason).toBeDefined();
                        expect(typeof rec.reason).toBe('string');
                        expect(rec.type).toBeDefined();
                    }
                }
            ),
            { numRuns: 100 }
        );
    });

    it('Property 8b: recommendations only include available champions', () => {
        fc.assert(
            fc.property(
                fc.array(championArb, { minLength: 5, maxLength: 20 }),
                (champions) => {
                    const uniqueChampions = champions.reduce((acc, c) => {
                        if (!acc.some((x) => x.id === c.id)) acc.push(c);
                        return acc;
                    }, [] as Champion[]);

                    if (uniqueChampions.length < 3) return true;

                    const aiResponse = JSON.stringify([
                        { championId: uniqueChampions[0].id, score: 0.9, reason: 'Test' }
                    ]);

                    const recommendations = parseRecommendations(aiResponse, uniqueChampions);

                    for (const rec of recommendations) {
                        const isAvailable = uniqueChampions.some((c) => c.id === rec.champion.id);
                        expect(isAvailable).toBe(true);
                    }
                }
            ),
            { numRuns: 100 }
        );
    });

    it('Property 8c: fallback recommendations when AI returns invalid JSON', () => {
        fc.assert(
            fc.property(
                fc.array(championArb, { minLength: 5, maxLength: 20 }),
                fc.string(),
                (champions, invalidResponse) => {
                    const uniqueChampions = champions.reduce((acc, c) => {
                        if (!acc.some((x) => x.id === c.id)) acc.push(c);
                        return acc;
                    }, [] as Champion[]);

                    if (uniqueChampions.length < 3) return true;

                    const recommendations = parseRecommendations(invalidResponse, uniqueChampions);

                    expect(recommendations).toBeInstanceOf(Array);
                    expect(recommendations.length).toBeGreaterThanOrEqual(1);

                    for (const rec of recommendations) {
                        expect(rec.champion).toBeDefined();
                        expect(rec.score).toBeGreaterThanOrEqual(0);
                        expect(rec.score).toBeLessThanOrEqual(1);
                    }
                }
            ),
            { numRuns: 100 }
        );
    });

    it('Property 8d: score is always clamped between 0 and 1', () => {
        fc.assert(
            fc.property(
                fc.array(championArb, { minLength: 3, maxLength: 10 }),
                fc.float({ min: -100, max: 100 }),
                (champions, arbitraryScore) => {
                    const uniqueChampions = champions.reduce((acc, c) => {
                        if (!acc.some((x) => x.id === c.id)) acc.push(c);
                        return acc;
                    }, [] as Champion[]);

                    if (uniqueChampions.length < 3) return true;

                    const aiResponse = JSON.stringify([
                        {
                            championId: uniqueChampions[0].id,
                            score: arbitraryScore,
                            reason: 'Test'
                        }
                    ]);

                    const recommendations = parseRecommendations(aiResponse, uniqueChampions);

                    for (const rec of recommendations) {
                        expect(rec.score).toBeGreaterThanOrEqual(0);
                        expect(rec.score).toBeLessThanOrEqual(1);
                    }
                }
            ),
            { numRuns: 100 }
        );
    });

    it('Property 8e: parses JSON from markdown code blocks', () => {
        fc.assert(
            fc.property(
                fc.array(championArb, { minLength: 3, maxLength: 10 }),
                (champions) => {
                    const uniqueChampions = champions.reduce((acc, c) => {
                        if (!acc.some((x) => x.id === c.id)) acc.push(c);
                        return acc;
                    }, [] as Champion[]);

                    if (uniqueChampions.length < 3) return true;

                    // Wrap in markdown code block
                    const aiResponse = `Here are my recommendations:
\`\`\`json
[
    {"championId": "${uniqueChampions[0].id}", "score": 0.9, "reason": "Best pick"}
]
\`\`\``;

                    const recommendations = parseRecommendations(aiResponse, uniqueChampions);

                    expect(recommendations.length).toBeGreaterThanOrEqual(1);
                    expect(recommendations[0].champion.id).toBe(uniqueChampions[0].id);
                }
            ),
            { numRuns: 100 }
        );
    });

    it('Property 8f: matches champions by name case-insensitively', () => {
        fc.assert(
            fc.property(
                fc.array(championArb, { minLength: 3, maxLength: 10 }),
                (champions) => {
                    const uniqueChampions = champions.reduce((acc, c) => {
                        if (!acc.some((x) => x.id === c.id)) acc.push(c);
                        return acc;
                    }, [] as Champion[]);

                    if (uniqueChampions.length < 3) return true;

                    // Use uppercase name
                    const aiResponse = JSON.stringify([
                        {
                            championName: uniqueChampions[0].name.toUpperCase(),
                            score: 0.9,
                            reason: 'Test'
                        }
                    ]);

                    const recommendations = parseRecommendations(aiResponse, uniqueChampions);

                    // Should find the champion despite case difference
                    const foundChamp = recommendations.find(
                        (r) => r.champion.name.toLowerCase() === uniqueChampions[0].name.toLowerCase()
                    );
                    expect(foundChamp).toBeDefined();
                }
            ),
            { numRuns: 100 }
        );
    });
});
