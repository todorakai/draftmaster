import type {
    Champion,
    ChampionDatabase,
    ChampionRole,
    Counter,
    Synergy,
    SynergyResult
} from '../types';
import championsData from '../data/champions.json';
import synergiesJson from '../data/synergies.json';

// Type assertion for imported JSON
const database: ChampionDatabase = {
    champions: championsData.champions as Champion[],
    synergies: synergiesJson.synergies as Synergy[],
    counters: synergiesJson.counters as Counter[]
};

/**
 * ChampionDataService - Manages champion information and synergy calculations
 */
export class ChampionDataService {
    private champions: Champion[];
    private synergies: Synergy[];
    private counters: Counter[];

    constructor() {
        this.champions = database.champions || [];
        this.synergies = database.synergies || [];
        this.counters = database.counters || [];
    }

    /**
     * Get all champions in the database
     */
    getAllChampions(): Champion[] {
        return [...this.champions];
    }

    /**
     * Get a champion by ID
     */
    getChampion(id: string): Champion | undefined {
        return this.champions.find((c) => c.id === id);
    }

    /**
     * Search champions by name (fuzzy search)
     * Returns champions whose names contain the query (case-insensitive)
     */
    searchChampions(query: string): Champion[] {
        if (!query || query.trim() === '') {
            return this.getAllChampions();
        }

        const normalizedQuery = query.toLowerCase().trim();

        return this.champions.filter((champion) => {
            const normalizedName = champion.name.toLowerCase();
            // Check if name contains query or starts with query
            return (
                normalizedName.includes(normalizedQuery) ||
                normalizedName.startsWith(normalizedQuery)
            );
        });
    }

    /**
     * Filter champions by role
     */
    getChampionsByRole(role: ChampionRole): Champion[] {
        return this.champions.filter((c) => c.role === role);
    }

    /**
     * Get synergies for a specific champion
     */
    getChampionSynergies(championId: string): Synergy[] {
        return this.synergies.filter(
            (s) => s.championId === championId || s.partnerChampionId === championId
        );
    }

    /**
     * Get counters for a specific champion
     */
    getChampionCounters(championId: string): Counter[] {
        return this.counters.filter(
            (c) => c.championId === championId || c.counterChampionId === championId
        );
    }

    /**
     * Calculate team synergy score based on champion pairs
     * Returns total score, active synergies, and warnings
     */
    calculateTeamSynergy(champions: Champion[]): SynergyResult {
        const warnings: string[] = [];
        const activeSynergies: Synergy[] = [];
        let totalScore = 0;

        // Check for role coverage
        const roles = new Set(champions.map((c) => c.role));
        const requiredRoles: ChampionRole[] = [
            'top',
            'jungle',
            'mid',
            'adc',
            'support'
        ];
        const missingRoles = requiredRoles.filter((r) => !roles.has(r));

        if (missingRoles.length > 0 && champions.length >= 3) {
            warnings.push(`Missing roles: ${missingRoles.join(', ')}`);
        }

        // Check for duplicate roles
        const roleCounts = champions.reduce(
            (acc, c) => {
                acc[c.role] = (acc[c.role] || 0) + 1;
                return acc;
            },
            {} as Record<string, number>
        );

        Object.entries(roleCounts).forEach(([role, count]) => {
            if (count > 1) {
                warnings.push(`Multiple ${role} champions (${count})`);
            }
        });

        // Calculate synergy score from champion pairs
        const championIds = champions.map((c) => c.id);

        for (let i = 0; i < championIds.length; i++) {
            for (let j = i + 1; j < championIds.length; j++) {
                const synergy = this.synergies.find(
                    (s) =>
                        (s.championId === championIds[i] &&
                            s.partnerChampionId === championIds[j]) ||
                        (s.championId === championIds[j] &&
                            s.partnerChampionId === championIds[i])
                );

                if (synergy) {
                    activeSynergies.push(synergy);
                    totalScore += synergy.score;
                }
            }
        }

        // Base score for having champions
        totalScore += champions.length * 10;

        // Bonus for complete team composition
        if (champions.length === 5 && missingRoles.length === 0) {
            totalScore += 25;
        }

        return {
            totalScore,
            synergies: activeSynergies.map((s) => ({
                champions: [s.championId, s.partnerChampionId],
                score: s.score,
                description: s.description
            })),
            warnings
        };
    }

    /**
     * Load synergy data
     */
    loadSynergies(synergies: Synergy[]): void {
        this.synergies = synergies;
    }

    /**
     * Load counter data
     */
    loadCounters(counters: Counter[]): void {
        this.counters = counters;
    }

    /**
     * Serialize champion database to JSON string
     */
    serialize(): string {
        return JSON.stringify(
            {
                champions: this.champions,
                synergies: this.synergies,
                counters: this.counters
            },
            null,
            2
        );
    }

    /**
     * Deserialize champion database from JSON string
     */
    static deserialize(json: string): ChampionDataService {
        const data = JSON.parse(json) as ChampionDatabase;
        const service = new ChampionDataService();

        if (data.champions) {
            service.champions = data.champions;
        }
        if (data.synergies) {
            service.loadSynergies(data.synergies);
        }
        if (data.counters) {
            service.loadCounters(data.counters);
        }

        return service;
    }
}

// Singleton instance for convenience
export const championDataService = new ChampionDataService();
