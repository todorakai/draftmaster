'use client';

import { useState, useCallback, useRef } from 'react';
import type { Team } from '../types';

interface UseTeamSearchResult {
    teams: Team[];
    isLoading: boolean;
    error: string | null;
    search: (query: string) => Promise<Team[]>;
}

export function useTeamSearch(): UseTeamSearchResult {
    const [teams, setTeams] = useState<Team[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const cacheRef = useRef<Map<string, Team[]>>(new Map());
    const debounceRef = useRef<NodeJS.Timeout | null>(null);

    const search = useCallback(async (query: string): Promise<Team[]> => {
        // Clear previous debounce
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        // Check cache
        const cached = cacheRef.current.get(query.toLowerCase());
        if (cached) {
            setTeams(cached);
            return cached;
        }

        return new Promise((resolve) => {
            debounceRef.current = setTimeout(async () => {
                setIsLoading(true);
                setError(null);

                try {
                    const response = await fetch(`/api/grid/teams?q=${encodeURIComponent(query)}`);

                    if (!response.ok) {
                        const data = await response.json();
                        throw new Error(data.error || 'Failed to search teams');
                    }

                    const data = await response.json();
                    const results = data.teams || [];

                    // Cache results
                    cacheRef.current.set(query.toLowerCase(), results);
                    setTeams(results);
                    resolve(results);
                } catch (err) {
                    setError(err instanceof Error ? err.message : 'Unknown error');
                    setTeams([]);
                    resolve([]);
                } finally {
                    setIsLoading(false);
                }
            }, 300); // 300ms debounce
        });
    }, []);

    return {
        teams,
        isLoading,
        error,
        search
    };
}
