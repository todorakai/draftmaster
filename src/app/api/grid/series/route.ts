import { NextRequest, NextResponse } from 'next/server';
import { GridGraphQLClient } from '@/features/draft/services/grid-client';
import { GridApiService } from '@/features/draft/services/grid-api';
import { CacheService } from '@/features/draft/services/cache';

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
        const id = searchParams.get('id');
        const hoursAhead = parseInt(searchParams.get('hours') || '24', 10);

        const service = getGridService();

        if (id) {
            const series = await service.getSeries(id);
            if (!series) {
                return NextResponse.json({ error: 'Series not found' }, { status: 404 });
            }
            return NextResponse.json({ series });
        }

        const upcomingSeries = await service.getUpcomingSeries(hoursAhead);
        return NextResponse.json({ series: upcomingSeries });
    } catch (error) {
        console.error('GRID API error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}
