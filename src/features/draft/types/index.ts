// ============================================
// Champion Types
// ============================================

export type ChampionRole = 'top' | 'jungle' | 'mid' | 'adc' | 'support';

export interface Champion {
    id: string;
    name: string;
    role: ChampionRole;
    imageUrl: string;
    tags: string[];
}

export interface Synergy {
    championId: string;
    partnerChampionId: string;
    score: number;
    description: string;
}

export interface Counter {
    championId: string;
    counterChampionId: string;
    score: number;
    description: string;
}

export interface SynergyResult {
    totalScore: number;
    synergies: Array<{
        champions: string[];
        score: number;
        description: string;
    }>;
    warnings: string[];
}

export interface Recommendation {
    champion: Champion;
    score: number;
    reason: string;
    type: 'pick' | 'ban';
}

export interface ChampionDatabase {
    champions: Champion[];
    synergies: Synergy[];
    counters: Counter[];
}

// ============================================
// Draft Types
// ============================================

export type DraftPhase =
    | 'ban_1'
    | 'ban_2'
    | 'ban_3'
    | 'pick_1'
    | 'pick_2'
    | 'pick_3'
    | 'pick_4'
    | 'pick_5'
    | 'ban_4'
    | 'ban_5'
    | 'pick_6'
    | 'pick_7'
    | 'pick_8'
    | 'pick_9'
    | 'pick_10'
    | 'complete';

export type DraftSide = 'blue' | 'red';

export interface DraftConfig {
    userSide: DraftSide;
    opponentTeamId?: string;
}

export interface DraftState {
    config: DraftConfig;
    phase: DraftPhase;
    bluePicks: Champion[];
    redPicks: Champion[];
    blueBans: Champion[];
    redBans: Champion[];
    actionHistory: DraftAction[];
}

export interface DraftAction {
    type: 'pick' | 'ban';
    champion: Champion;
    side: DraftSide;
}

export interface ValidationResult {
    valid: boolean;
    error?: string;
}

// ============================================
// GRID API Types
// ============================================

export interface Team {
    id: string;
    name: string;
    colorPrimary: string;
    colorSecondary: string;
    logoUrl: string;
}

export interface Player {
    id: string;
    nickname: string;
    role?: string;
    teamId?: string;
}

export interface AggregatedStat {
    sum: number;
    min: number;
    max: number;
    avg: number;
}

export interface StatValue {
    value: boolean;
    count: number;
    percentage: number;
}

export interface TeamStatistics {
    id: string;
    seriesCount: number;
    gameCount: number;
    wins: StatValue;
    kills: AggregatedStat;
    deaths: AggregatedStat;
}

export interface PlayerStatistics {
    id: string;
    seriesCount: number;
    gameCount: number;
    wins: StatValue;
    kills: AggregatedStat;
    deaths: AggregatedStat;
}

export type TimeWindow = 'LAST_3_MONTHS' | 'LAST_6_MONTHS' | 'ALL_TIME';

export interface StatisticsFilter {
    timeWindow?: TimeWindow;
    tournamentIds?: string[];
}

export interface Tournament {
    id: string;
    name: string;
    nameShortened: string;
}

export interface Series {
    id: string;
    title: string;
    tournament: Tournament;
    startTimeScheduled: string;
    teams: SeriesTeam[];
}

export interface SeriesTeam {
    name: string;
    scoreAdvantage: number;
}

export interface TimeRange {
    start: Date;
    end: Date;
}

// ============================================
// AI Recommendation Types
// ============================================

export interface DraftContext {
    currentPhase: DraftPhase;
    userSide: DraftSide;
    bluePicks: Champion[];
    redPicks: Champion[];
    bans: Champion[];
    opponentTeamId?: string;
    opponentStats?: TeamStatistics;
    opponentPlayerStats?: PlayerStatistics[];
}

export interface ChampionRecommendation {
    champion: Champion;
    score: number;
    reason: string;
}

export interface DraftRecommendation {
    recommendations: ChampionRecommendation[];
    reasoning: string;
}

// ============================================
// Cache Types
// ============================================

export interface CacheEntry<T> {
    value: T;
    expiresAt: number;
}

// ============================================
// API Key Manager Types
// ============================================

export interface ApiKeyState {
    key: string;
    failureCount: number;
    lastFailure?: number;
    disabled: boolean;
}

// ============================================
// Retry Config Types
// ============================================

export interface RetryConfig {
    maxAttempts: number;
    baseDelayMs: number;
    maxDelayMs: number;
    backoffMultiplier: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
    maxAttempts: 3,
    baseDelayMs: 1000,
    maxDelayMs: 10000,
    backoffMultiplier: 2
};
