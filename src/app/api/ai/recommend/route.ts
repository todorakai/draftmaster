import { NextRequest, NextResponse } from 'next/server';
import { CerebrasService } from '@/features/draft/services/cerebras-ai';
import { ApiKeyManager } from '@/features/draft/services/api-key-manager';
import { ChampionDataService } from '@/features/draft/services/champion-data';
import type { Champion, DraftPhase, TeamStatistics } from '@/features/draft/types';

let cerebrasService: CerebrasService | null = null;
let championService: ChampionDataService | null = null;

function getCerebrasService(): CerebrasService {
    if (!cerebrasService) {
        const keysString = process.env.CEREBRAS_API_KEYS || '';
        const keys = keysString
            .split(',')
            .map((k) => k.trim())
            .filter((k) => k.length > 0);

        if (keys.length === 0) {
            throw new Error('CEREBRAS_API_KEYS environment variable is required');
        }

        const keyManager = new ApiKeyManager(keys);
        cerebrasService = new CerebrasService(keyManager);
    }
    return cerebrasService;
}

function getChampionService(): ChampionDataService {
    if (!championService) {
        championService = new ChampionDataService();
    }
    return championService;
}

// API request format (transformed from frontend)
interface ApiDraftState {
    id: string;
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
    phaseIndex: number;
}

interface RecommendRequest {
    draftState: ApiDraftState;
    teamStatistics?: TeamStatistics;
    opponentStatistics?: TeamStatistics;
}

export async function POST(request: NextRequest) {
    try {
        const body = (await request.json()) as RecommendRequest;
        const { draftState, teamStatistics, opponentStatistics } = body;

        if (!draftState) {
            return NextResponse.json({ error: 'Draft state is required' }, { status: 400 });
        }

        const service = getCerebrasService();
        const champService = getChampionService();

        // Get all champions and filter out picked/banned
        const allChampions = champService.getAllChampions();
        const pickedIds = new Set([
            ...draftState.blueTeam.picks.map((c) => c.id),
            ...draftState.redTeam.picks.map((c) => c.id)
        ]);
        const bannedIds = new Set([
            ...draftState.blueTeam.bans.map((c) => c.id),
            ...draftState.redTeam.bans.map((c) => c.id)
        ]);

        const availableChampions = allChampions.filter(
            (c) => !pickedIds.has(c.id) && !bannedIds.has(c.id)
        );

        const recommendations = await service.getRecommendation({
            draftState,
            availableChampions,
            teamStatistics,
            opponentStatistics
        });

        return NextResponse.json({ recommendations });
    } catch (error) {
        console.error('AI recommendation error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to get recommendations' },
            { status: 500 }
        );
    }
}
