import { NextRequest, NextResponse } from 'next/server';
import { GridGraphQLClient } from '@/features/draft/services/grid-client';
import { GridApiService } from '@/features/draft/services/grid-api';
import { CacheService } from '@/features/draft/services/cache';

// Singleton instances
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
        const query = searchParams.get('q') || '';
        const id = searchParams.get('id');
        const limit = parseInt(searchParams.get('limit') || '20', 10);

        const service = getGridService();

        // Get specific team by ID
        if (id) {
            const team = await service.getTeam(id);
            if (!team) {
                return NextResponse.json({ error: 'Team not found' }, { status: 404 });
            }

            // Also fetch roster
            const roster = await service.getTeamRoster(id);

            return NextResponse.json({ team, roster });
        }

        // Search teams
        const teams = await service.searchTeams(query, limit);
        return NextResponse.json({ teams });
    } catch (error) {
        console.error('GRID API error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}
