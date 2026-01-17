'use client';

import { useState, useEffect, useCallback } from 'react';
import type { DraftState, Recommendation, TeamStatistics } from '../types';

interface UseRecommendationsOptions {
    draftState: DraftState | null;
    teamStatistics?: TeamStatistics;
    opponentStatistics?: TeamStatistics;
    enabled?: boolean;
}

interface UseRecommendationsResult {
    recommendations: Recommendation[];
    isLoading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

export function useRecommendations({
    draftState,
    teamStatistics,
    opponentStatistics,
    enabled = true
}: UseRecommendationsOptions): UseRecommendationsResult {
    const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchRecommendations = useCallback(async () => {
        if (!draftState || !enabled || draftState.phase === 'complete') {
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // Transform DraftState to the format expected by the API
            const apiDraftState = {
                id: 'draft-session',
                currentPhase: draftState.phase,
                userSide: draftState.config.userSide,
                blueTeam: {
                    picks: draftState.bluePicks,
                    bans: draftState.blueBans
                },
                redTeam: {
                    picks: draftState.redPicks,
                    bans: draftState.redBans
                },
                phaseIndex: 0
            };

            const response = await fetch('/api/ai/recommend', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    draftState: apiDraftState,
                    teamStatistics,
                    opponentStatistics
                })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to get recommendations');
            }

            const data = await response.json();
            setRecommendations(data.recommendations || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
            setRecommendations([]);
        } finally {
            setIsLoading(false);
        }
    }, [draftState, teamStatistics, opponentStatistics, enabled]);

    // Fetch when draft state changes
    useEffect(() => {
        if (draftState && enabled) {
            fetchRecommendations();
        }
    }, [draftState?.phase, enabled]);

    return {
        recommendations,
        isLoading,
        error,
        refetch: fetchRecommendations
    };
}
