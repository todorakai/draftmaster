/**
 * Cerebras AI Service for Draft Recommendations
 * Uses Cerebras Cloud SDK with API key load balancing
 */

import Cerebras from '@cerebras/cerebras_cloud_sdk';
import type { Champion, Recommendation, TeamStatistics, DraftPhase } from '../types';
import { ApiKeyManager } from './api-key-manager';

const MODEL = 'qwen-3-235b-a22b-instruct-2507';
const MAX_COMPLETION_TOKENS = 65536;

// API draft state format (transformed from frontend)
interface ApiDraftState {
    id?: string;
    currentPhase: DraftPhase;
    userSide: 'blue' | 'red';
    blueTeam: {
        picks: Champion[];
        bans: Champion[];
    };
    redTeam: {
        picks: Champion[];
        bans: Champion[];
    };
    phaseIndex?: number;
}

export interface RecommendationContext {
    draftState: ApiDraftState;
    availableChampions: Champion[];
    teamStatistics?: TeamStatistics;
    opponentStatistics?: TeamStatistics;
}

export class CerebrasService {
    private keyManager: ApiKeyManager;

    constructor(keyManager: ApiKeyManager) {
        this.keyManager = keyManager;
    }

    /**
     * Get AI-powered draft recommendations
     */
    async getRecommendation(context: RecommendationContext): Promise<Recommendation[]> {
        const apiKey = this.keyManager.getNextKey();

        try {
            const cerebras = new Cerebras({ apiKey });

            const systemPrompt = this.buildSystemPrompt();
            const userPrompt = this.buildUserPrompt(context);

            const response = await cerebras.chat.completions.create({
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                model: MODEL,
                stream: false,
                max_completion_tokens: MAX_COMPLETION_TOKENS,
                temperature: 0.6,
                top_p: 0.95
            });

            this.keyManager.reportSuccess(apiKey);

            // Type assertion needed as Cerebras SDK types are incomplete
            const choices = response.choices as Array<{ message?: { content?: string } }> | undefined;
            const content = choices?.[0]?.message?.content || '';
            return this.parseRecommendations(content, context.availableChampions);
        } catch (error) {
            this.keyManager.reportFailure(apiKey);
            throw error;
        }
    }

    /**
     * Build system prompt with LoL draft knowledge
     */
    private buildSystemPrompt(): string {
        return `You are an expert League of Legends draft analyst and coach. Your role is to provide strategic draft recommendations during the pick/ban phase.

Key draft principles:
1. Team composition balance: Ensure a mix of damage types (AD/AP), engage, peel, and wave clear
2. Win conditions: Identify and draft toward clear win conditions (teamfight, split push, pick comp, etc.)
3. Power picks: Prioritize meta-strong champions that fit the composition
4. Flex picks: Value champions that can be played in multiple roles to hide strategy
5. Counter-picking: In later picks, prioritize countering enemy champions
6. Synergies: Look for champion combinations that amplify each other's strengths
7. Bans: Target champions that counter your strategy or are comfort picks for opponents

When recommending picks, consider:
- Current meta strength of champions
- Team composition needs (tank, damage, utility)
- Enemy team threats and how to counter them
- Lane matchups and scaling

Respond with exactly 3 champion recommendations in JSON format:
[
  {
    "championId": "champion_id",
    "championName": "Champion Name",
    "score": 0.0-1.0,
    "reason": "Brief explanation",
    "role": "top/jungle/mid/adc/support"
  }
]`;
    }

    /**
     * Build user prompt with current draft context
     */
    private buildUserPrompt(context: RecommendationContext): string {
        const { draftState, availableChampions, teamStatistics, opponentStatistics } = context;

        const bluePicks = draftState.blueTeam.picks.map((p) => p.name).join(', ') || 'None';
        const redPicks = draftState.redTeam.picks.map((p) => p.name).join(', ') || 'None';
        const blueBans = draftState.blueTeam.bans.map((b) => b.name).join(', ') || 'None';
        const redBans = draftState.redTeam.bans.map((b) => b.name).join(', ') || 'None';

        const userSide = draftState.userSide;
        const userPicks = userSide === 'blue' ? bluePicks : redPicks;
        const enemyPicks = userSide === 'blue' ? redPicks : bluePicks;

        const availableByRole = this.groupChampionsByRole(availableChampions);

        let prompt = `Current Draft State:
- Phase: ${draftState.currentPhase}
- You are on: ${userSide.toUpperCase()} side

Your Team Picks: ${userPicks}
Enemy Team Picks: ${enemyPicks}

Blue Side Bans: ${blueBans}
Red Side Bans: ${redBans}

Available Champions by Role:
- Top: ${availableByRole.top.slice(0, 10).join(', ')}
- Jungle: ${availableByRole.jungle.slice(0, 10).join(', ')}
- Mid: ${availableByRole.mid.slice(0, 10).join(', ')}
- ADC: ${availableByRole.adc.slice(0, 10).join(', ')}
- Support: ${availableByRole.support.slice(0, 10).join(', ')}`;

        if (teamStatistics) {
            prompt += `\n\nYour Team Statistics:
- Win Rate: ${teamStatistics.wins.percentage.toFixed(1)}%
- Games Played: ${teamStatistics.gameCount}`;
        }

        if (opponentStatistics) {
            prompt += `\n\nOpponent Statistics:
- Win Rate: ${opponentStatistics.wins.percentage.toFixed(1)}%
- Games Played: ${opponentStatistics.gameCount}`;
        }

        prompt += `\n\nBased on the current draft state, recommend the best 3 champions to pick next. Consider team composition, counters, and win conditions. Respond with JSON only.`;

        return prompt;
    }


    /**
     * Group champions by their primary role
     */
    private groupChampionsByRole(champions: Champion[]): Record<string, string[]> {
        const roles: Record<string, string[]> = {
            top: [],
            jungle: [],
            mid: [],
            adc: [],
            support: []
        };

        for (const champ of champions) {
            const role = champ.role.toLowerCase();
            if (role in roles) {
                roles[role].push(champ.name);
            }
        }

        return roles;
    }

    /**
     * Parse AI response into structured recommendations
     */
    private parseRecommendations(content: string, availableChampions: Champion[]): Recommendation[] {
        try {
            // Extract JSON from response (handle markdown code blocks)
            let jsonStr = content;
            const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (jsonMatch) {
                jsonStr = jsonMatch[1].trim();
            } else {
                // Try to find JSON array directly
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
                return this.getFallbackRecommendations(availableChampions);
            }

            const recommendations: Recommendation[] = [];

            for (const item of parsed.slice(0, 5)) {
                // Find champion by name or ID
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

            // If we couldn't parse enough recommendations, add fallbacks
            if (recommendations.length < 3) {
                const fallbacks = this.getFallbackRecommendations(availableChampions);
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
            return this.getFallbackRecommendations(availableChampions);
        }
    }

    /**
     * Get fallback recommendations when AI parsing fails
     */
    private getFallbackRecommendations(availableChampions: Champion[]): Recommendation[] {
        // Return top 3 champions by role diversity
        const byRole = new Map<string, Champion>();

        for (const champ of availableChampions) {
            if (!byRole.has(champ.role)) {
                byRole.set(champ.role, champ);
            }
            if (byRole.size >= 3) break;
        }

        const recommendations: Recommendation[] = [];
        byRole.forEach((champion) => {
            recommendations.push({
                champion,
                score: 0.5,
                reason: 'Fallback recommendation - fills team composition',
                type: 'pick'
            });
        });

        // If still not enough, just take first available
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
}

/**
 * Create Cerebras service from environment variable
 */
export function createCerebrasService(): CerebrasService {
    const keysString = process.env.CEREBRAS_API_KEYS || '';
    const keys = keysString
        .split(',')
        .map((k) => k.trim())
        .filter((k) => k.length > 0);

    if (keys.length === 0) {
        throw new Error('CEREBRAS_API_KEYS environment variable is required');
    }

    const keyManager = new ApiKeyManager(keys);
    return new CerebrasService(keyManager);
}
