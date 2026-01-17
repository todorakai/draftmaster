import { NextRequest, NextResponse } from 'next/server';
import { GridGraphQLClient } from '@/features/draft/services/grid-client';
import { GridApiService } from '@/features/draft/services/grid-api';
import { CacheService } from '@/features/draft/services/cache';
import type { StatisticsFilter } from '@/features/draft/types';

let gridService: GridApiService | null = null;
const cache = new CacheService();

function getGridService(): GridApiService {
    if (!gridService) {
        const apiUrl = process.env.GRID_API_URL || 'https://api-op.grid.gg/central-data/graphql';
        const apiKey = process.env.GRID_API_KEY || '';

        if (!apiKey) {
            throw new Error('GRID_API_KEY environment variable is required');
        }

        const client = new GridGraphQLClient(apiUrl, apiKey);
        gridService = new GridApiService(client, cache);
    }
    return gridService;
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type'); // 'team' or 'player'
        const id = searchParams.get('id');
        const timeWindow = searchParams.get('timeWindow') as StatisticsFilter['timeWindow'];
        const tournamentIds = searchParams.get('tournamentIds')?.split(',').filter(Boolean);

        if (!type || !id) {
            return NextResponse.json(
                { error: 'Type (team/player) and ID are required' },
                { status: 400 }
            );
        }

        if (type !== 'team' && type !== 'player') {
            return NextResponse.json(
                { error: 'Type must be "team" or "player"' },
                { status: 400 }
            );
        }

        const service = getGridService();

        const filter: StatisticsFilter = {};
        if (timeWindow) filter.timeWindow = timeWindow;
        if (tournamentIds?.length) filter.tournamentIds = tournamentIds;

        const statistics =
            type === 'team'
                ? await service.getTeamStatistics(id, filter)
                : await service.getPlayerStatistics(id, filter);

        if (!statistics) {
            return NextResponse.json({ error: 'Statistics not found' }, { status: 404 });
        }

        return NextResponse.json({ statistics });
    } catch (error) {
        console.error('GRID API error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}
