/**
 * GRID API Service
 * Provides methods for fetching esports data from GRID GraphQL API
 */

import type {
    Team,
    Player,
    TeamStatistics,
    PlayerStatistics,
    Tournament,
    Series,
    StatisticsFilter
} from '../types';
import { GridGraphQLClient } from './grid-client';
import { CacheService } from './cache';

// GraphQL Fragments
const TEAM_FIELDS = `
    id
    name
    colorPrimary
    colorSecondary
    logoUrl
    externalLinks {
        dataProvider { name }
        externalEntity { id }
    }
`;

const PLAYER_FIELDS = `
    id
    nickname
    title { name }
`;

const TOURNAMENT_FIELDS = `
    id
    name
    nameShortened
`;

const SERIES_FIELDS = `
    id
    title { nameShortened }
    tournament { nameShortened }
    startTimeScheduled
    format { name nameShortened }
    teams {
        baseInfo { name }
        scoreAdvantage
    }
`;

// GraphQL Queries
const QUERIES = {
    searchTeams: `
        query SearchTeams($first: Int, $after: String) {
            teams(first: $first, after: $after) {
                totalCount
                pageInfo { hasNextPage endCursor }
                edges {
                    node { ${TEAM_FIELDS} }
                }
            }
        }
    `,

    getTeam: `
        query GetTeam($id: ID!) {
            team(id: $id) { ${TEAM_FIELDS} }
        }
    `,

    getTeamRoster: `
        query GetTeamRoster($teamId: ID!) {
            players(filter: { teamIdFilter: { id: $teamId } }) {
                edges {
                    node { ${PLAYER_FIELDS} }
                }
            }
        }
    `,

    getPlayer: `
        query GetPlayer($id: ID!) {
            player(id: $id) { ${PLAYER_FIELDS} }
        }
    `,

    getTeamStatistics: `
        query GetTeamStatistics($teamId: ID!, $filter: TeamStatisticsFilterInput) {
            teamStatistics(teamId: $teamId, filter: $filter) {
                id
                aggregationSeriesIds
                series { count kills { sum min max avg } }
                game { count wins { value count percentage streak { min max current } } }
                segment { type count deaths { sum min max avg } }
            }
        }
    `,

    getPlayerStatistics: `
        query GetPlayerStatistics($playerId: ID!, $filter: PlayerStatisticsFilterInput) {
            playerStatistics(playerId: $playerId, filter: $filter) {
                id
                aggregationSeriesIds
                series { count kills { sum min max avg } }
                game { count wins { value count percentage streak { min max current } } }
                segment { type count deaths { sum min max avg } }
            }
        }
    `,

    getTournaments: `
        query GetTournaments($first: Int) {
            tournaments(first: $first) {
                edges {
                    node { ${TOURNAMENT_FIELDS} }
                }
            }
        }
    `,

    getTournament: `
        query GetTournament($id: ID!) {
            tournament(id: $id) { ${TOURNAMENT_FIELDS} }
        }
    `,

    getUpcomingSeries: `
        query GetUpcomingSeries($gte: DateTime!, $lte: DateTime!) {
            allSeries(
                filter: { startTimeScheduled: { gte: $gte, lte: $lte } }
                orderBy: StartTimeScheduled
            ) {
                totalCount
                edges {
                    node { ${SERIES_FIELDS} }
                }
            }
        }
    `,

    getSeries: `
        query GetSeries($id: ID!) {
            series(id: $id) { ${SERIES_FIELDS} }
        }
    `
};

export class GridApiService {
    private client: GridGraphQLClient;
    private cache: CacheService;
    private readonly cacheTtlMs: number;

    constructor(client: GridGraphQLClient, cache?: CacheService, cacheTtlMs = 300000) {
        this.client = client;
        this.cache = cache || new CacheService();
        this.cacheTtlMs = cacheTtlMs;
    }


    /**
     * Search teams by name
     */
    async searchTeams(query: string, limit = 20): Promise<Team[]> {
        const cacheKey = `teams:search:${query}:${limit}`;
        const cached = this.cache.get<Team[]>(cacheKey);
        if (cached) return cached;

        const response = await this.client.query<{
            teams: {
                edges: Array<{ node: GridTeamResponse }>;
            };
        }>(QUERIES.searchTeams, { first: limit });

        if (!response.data?.teams?.edges) return [];

        const teams = response.data.teams.edges
            .map((edge) => this.mapTeam(edge.node))
            .filter((team) => team.name.toLowerCase().includes(query.toLowerCase()));

        this.cache.set(cacheKey, teams, this.cacheTtlMs);
        return teams;
    }

    /**
     * Get team by ID
     */
    async getTeam(id: string): Promise<Team | null> {
        const cacheKey = `teams:${id}`;
        const cached = this.cache.get<Team>(cacheKey);
        if (cached) return cached;

        const response = await this.client.query<{ team: GridTeamResponse }>(QUERIES.getTeam, {
            id
        });

        if (!response.data?.team) return null;

        const team = this.mapTeam(response.data.team);
        this.cache.set(cacheKey, team, this.cacheTtlMs);
        return team;
    }

    /**
     * Get team roster (players)
     */
    async getTeamRoster(teamId: string): Promise<Player[]> {
        const cacheKey = `teams:${teamId}:roster`;
        const cached = this.cache.get<Player[]>(cacheKey);
        if (cached) return cached;

        const response = await this.client.query<{
            players: { edges: Array<{ node: GridPlayerResponse }> };
        }>(QUERIES.getTeamRoster, { teamId });

        if (!response.data?.players?.edges) return [];

        const players = response.data.players.edges.map((edge) => this.mapPlayer(edge.node));
        this.cache.set(cacheKey, players, this.cacheTtlMs);
        return players;
    }

    /**
     * Get player by ID
     */
    async getPlayer(id: string): Promise<Player | null> {
        const cacheKey = `players:${id}`;
        const cached = this.cache.get<Player>(cacheKey);
        if (cached) return cached;

        const response = await this.client.query<{ player: GridPlayerResponse }>(QUERIES.getPlayer, {
            id
        });

        if (!response.data?.player) return null;

        const player = this.mapPlayer(response.data.player);
        this.cache.set(cacheKey, player, this.cacheTtlMs);
        return player;
    }

    /**
     * Get team statistics
     */
    async getTeamStatistics(teamId: string, filter?: StatisticsFilter): Promise<TeamStatistics | null> {
        const filterKey = filter ? JSON.stringify(filter) : 'default';
        const cacheKey = `teams:${teamId}:stats:${filterKey}`;
        const cached = this.cache.get<TeamStatistics>(cacheKey);
        if (cached) return cached;

        const graphqlFilter = this.buildStatisticsFilter(filter);
        const response = await this.client.query<{ teamStatistics: GridStatisticsResponse }>(
            QUERIES.getTeamStatistics,
            { teamId, filter: graphqlFilter }
        );

        if (!response.data?.teamStatistics) return null;

        const stats = this.mapStatistics(response.data.teamStatistics, teamId, 'team');
        this.cache.set(cacheKey, stats, this.cacheTtlMs);
        return stats as TeamStatistics;
    }

    /**
     * Get player statistics
     */
    async getPlayerStatistics(playerId: string, filter?: StatisticsFilter): Promise<PlayerStatistics | null> {
        const filterKey = filter ? JSON.stringify(filter) : 'default';
        const cacheKey = `players:${playerId}:stats:${filterKey}`;
        const cached = this.cache.get<PlayerStatistics>(cacheKey);
        if (cached) return cached;

        const graphqlFilter = this.buildStatisticsFilter(filter);
        const response = await this.client.query<{ playerStatistics: GridStatisticsResponse }>(
            QUERIES.getPlayerStatistics,
            { playerId, filter: graphqlFilter }
        );

        if (!response.data?.playerStatistics) return null;

        const stats = this.mapStatistics(response.data.playerStatistics, playerId, 'player');
        this.cache.set(cacheKey, stats, this.cacheTtlMs);
        return stats as PlayerStatistics;
    }

    /**
     * Get tournaments
     */
    async getTournaments(limit = 50): Promise<Tournament[]> {
        const cacheKey = `tournaments:list:${limit}`;
        const cached = this.cache.get<Tournament[]>(cacheKey);
        if (cached) return cached;

        const response = await this.client.query<{
            tournaments: { edges: Array<{ node: GridTournamentResponse }> };
        }>(QUERIES.getTournaments, { first: limit });

        if (!response.data?.tournaments?.edges) return [];

        const tournaments = response.data.tournaments.edges.map((edge) =>
            this.mapTournament(edge.node)
        );
        this.cache.set(cacheKey, tournaments, this.cacheTtlMs);
        return tournaments;
    }

    /**
     * Get tournament by ID
     */
    async getTournament(id: string): Promise<Tournament | null> {
        const cacheKey = `tournaments:${id}`;
        const cached = this.cache.get<Tournament>(cacheKey);
        if (cached) return cached;

        const response = await this.client.query<{ tournament: GridTournamentResponse }>(
            QUERIES.getTournament,
            { id }
        );

        if (!response.data?.tournament) return null;

        const tournament = this.mapTournament(response.data.tournament);
        this.cache.set(cacheKey, tournament, this.cacheTtlMs);
        return tournament;
    }

    /**
     * Get upcoming series within time range
     */
    async getUpcomingSeries(hoursAhead = 24): Promise<Series[]> {
        const now = new Date();
        const future = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);

        const cacheKey = `series:upcoming:${hoursAhead}`;
        const cached = this.cache.get<Series[]>(cacheKey);
        if (cached) return cached;

        const response = await this.client.query<{
            allSeries: { edges: Array<{ node: GridSeriesResponse }> };
        }>(QUERIES.getUpcomingSeries, {
            gte: now.toISOString(),
            lte: future.toISOString()
        });

        if (!response.data?.allSeries?.edges) return [];

        const series = response.data.allSeries.edges.map((edge) => this.mapSeries(edge.node));
        this.cache.set(cacheKey, series, 60000); // Cache for 1 minute
        return series;
    }

    /**
     * Get series by ID
     */
    async getSeries(id: string): Promise<Series | null> {
        const cacheKey = `series:${id}`;
        const cached = this.cache.get<Series>(cacheKey);
        if (cached) return cached;

        const response = await this.client.query<{ series: GridSeriesResponse }>(QUERIES.getSeries, {
            id
        });

        if (!response.data?.series) return null;

        const series = this.mapSeries(response.data.series);
        this.cache.set(cacheKey, series, this.cacheTtlMs);
        return series;
    }


    // Private helper methods

    private buildStatisticsFilter(filter?: StatisticsFilter): Record<string, unknown> | undefined {
        if (!filter) return undefined;

        const graphqlFilter: Record<string, unknown> = {};

        if (filter.timeWindow) {
            graphqlFilter.timeWindow = filter.timeWindow;
        }

        if (filter.tournamentIds && filter.tournamentIds.length > 0) {
            graphqlFilter.tournamentIds = { in: filter.tournamentIds };
        }

        return Object.keys(graphqlFilter).length > 0 ? graphqlFilter : undefined;
    }

    private mapTeam(data: GridTeamResponse): Team {
        return {
            id: data.id,
            name: data.name,
            logoUrl: data.logoUrl || '',
            colorPrimary: data.colorPrimary || '#000000',
            colorSecondary: data.colorSecondary || '#ffffff'
        };
    }

    private mapPlayer(data: GridPlayerResponse): Player {
        return {
            id: data.id,
            nickname: data.nickname,
            role: data.title?.name
        };
    }

    private mapTournament(data: GridTournamentResponse): Tournament {
        return {
            id: data.id,
            name: data.name,
            nameShortened: data.nameShortened || data.name
        };
    }

    private mapSeries(data: GridSeriesResponse): Series {
        return {
            id: data.id,
            title: data.title?.nameShortened || 'Unknown',
            tournament: {
                id: '',
                name: data.tournament?.nameShortened || 'Unknown',
                nameShortened: data.tournament?.nameShortened || 'Unknown'
            },
            startTimeScheduled: data.startTimeScheduled,
            teams: data.teams?.map((t) => ({
                name: t.baseInfo?.name || 'Unknown',
                scoreAdvantage: t.scoreAdvantage || 0
            })) || []
        };
    }

    private mapStatistics(
        data: GridStatisticsResponse,
        entityId: string,
        _type: 'team' | 'player'
    ): TeamStatistics | PlayerStatistics {
        return {
            id: data.id,
            seriesCount: data.series?.count || 0,
            gameCount: data.game?.count || 0,
            wins: {
                value: data.game?.wins?.value || false,
                count: data.game?.wins?.count || 0,
                percentage: data.game?.wins?.percentage || 0
            },
            kills: {
                sum: data.series?.kills?.sum || 0,
                min: data.series?.kills?.min || 0,
                max: data.series?.kills?.max || 0,
                avg: data.series?.kills?.avg || 0
            },
            deaths: {
                sum: data.segment?.[0]?.deaths?.sum || 0,
                min: data.segment?.[0]?.deaths?.min || 0,
                max: data.segment?.[0]?.deaths?.max || 0,
                avg: data.segment?.[0]?.deaths?.avg || 0
            }
        };
    }
}

// GRID API Response Types
interface GridTeamResponse {
    id: string;
    name: string;
    logoUrl?: string;
    colorPrimary?: string;
    colorSecondary?: string;
    externalLinks?: Array<{
        dataProvider: { name: string };
        externalEntity: { id: string };
    }>;
}

interface GridPlayerResponse {
    id: string;
    nickname: string;
    title?: { name: string };
}

interface GridTournamentResponse {
    id: string;
    name: string;
    nameShortened?: string;
}

interface GridSeriesResponse {
    id: string;
    title?: { nameShortened: string };
    tournament?: { nameShortened: string };
    startTimeScheduled: string;
    format?: { name: string; nameShortened: string };
    teams?: Array<{
        baseInfo?: { name: string };
        scoreAdvantage?: number;
    }>;
}

interface GridStatisticsResponse {
    id: string;
    aggregationSeriesIds?: string[];
    series?: {
        count: number;
        kills?: { sum: number; min: number; max: number; avg: number };
    };
    game?: {
        count: number;
        wins?: {
            value: boolean;
            count: number;
            percentage: number;
            streak?: { min: number; max: number; current: number };
        };
    };
    segment?: Array<{
        type: string;
        count: number;
        deaths?: { sum: number; min: number; max: number; avg: number };
    }>;
}
