'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDraft } from '@/features/draft/hooks/use-draft';
import { useRecommendations } from '@/features/draft/hooks/use-recommendations';
import { useTeamSearch } from '@/features/draft/hooks/use-team-search';
import { DraftBoard } from '@/features/draft/components/draft-board';
import { ChampionGrid } from '@/features/draft/components/champion-grid';
import { RecommendationPanel } from '@/features/draft/components/recommendation-panel';
import { TeamSelector } from '@/features/draft/components/team-selector';
import { SynergyDisplay } from '@/features/draft/components/synergy-display';
import { DraftResultsModal } from '@/features/draft/components/draft-results-modal';
import { ChampionDataService } from '@/features/draft/services/champion-data';
import type { Team, Champion } from '@/features/draft/types';

const championService = new ChampionDataService();

export default function DraftPage() {
    const {
        draftState,
        allChampions,
        selectedChampion,
        startDraft,
        selectChampion,
        confirmAction,
        reset
    } = useDraft();

    const [opponentTeam, setOpponentTeam] = useState<Team | null>(null);
    const [showResults, setShowResults] = useState(false);
    const { search: searchTeams } = useTeamSearch();

    const { recommendations, isLoading: isLoadingRecs, error: recError } = useRecommendations({
        draftState,
        enabled: !!draftState && draftState.phase !== 'complete'
    });

    // Calculate synergy for user's team
    const userPicks = draftState
        ? draftState.config.userSide === 'blue'
            ? draftState.bluePicks
            : draftState.redPicks
        : [];
    const synergy = userPicks.length > 0 ? championService.calculateTeamSynergy(userPicks) : null;

    // Get disabled champion IDs
    const disabledIds = new Set<string>();
    if (draftState) {
        [...draftState.bluePicks, ...draftState.redPicks].forEach((c) => disabledIds.add(c.id));
        [...draftState.blueBans, ...draftState.redBans].forEach((c) => disabledIds.add(c.id));
    }

    const handleChampionSelect = (champion: Champion) => {
        selectChampion(champion);
    };

    const handleRecommendationSelect = (rec: { champion: Champion }) => {
        selectChampion(rec.champion);
    };

    const handleReset = () => {
        setShowResults(false);
        reset();
    };

    const isDraftComplete = draftState?.phase === 'complete';

    if (!draftState) {
        return <DraftSetup onStart={startDraft} />;
    }

    // Transform state for DraftBoard component
    const boardState = {
        id: 'draft-1',
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

    return (
        <div className="container mx-auto space-y-6 p-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold">Draft Master</h1>
                </div>
                <div className="flex gap-2">
                    {isDraftComplete && (
                        <Button onClick={() => setShowResults(true)} size="lg" className="font-semibold">
                            View Final Results
                        </Button>
                    )}
                    <Button variant="outline" onClick={handleReset}>
                        Reset Draft
                    </Button>
                </div>
            </div>

            {isDraftComplete && (
                <Card className="border-primary bg-primary/5">
                    <CardContent className="flex items-center justify-between py-4">
                        <div>
                            <h3 className="text-lg font-semibold">Draft Complete!</h3>
                            <p className="text-sm text-muted-foreground">
                                Click to view detailed analysis and team comparison
                            </p>
                        </div>
                        <Button onClick={() => setShowResults(true)} size="lg">
                            View Results & Analysis
                        </Button>
                    </CardContent>
                </Card>
            )}

            <DraftBoard draftState={boardState} />

            <div className="grid gap-6 lg:grid-cols-3">
                <div className="space-y-4 lg:col-span-2">
                    <ChampionGrid
                        champions={allChampions}
                        disabledIds={disabledIds}
                        selectedId={selectedChampion?.id}
                        onSelect={handleChampionSelect}
                    />

                    {selectedChampion && (
                        <div className="flex items-center justify-between rounded-lg border bg-card p-4">
                            <span>
                                Selected: <strong>{selectedChampion.name}</strong>
                            </span>
                            <Button onClick={confirmAction}>
                                {draftState.phase.startsWith('ban') ? 'Ban' : 'Pick'}{' '}
                                {selectedChampion.name}
                            </Button>
                        </div>
                    )}
                </div>

                <div className="space-y-4">
                    <TeamSelector
                        selectedTeam={opponentTeam}
                        onSelect={setOpponentTeam}
                        onSearch={searchTeams}
                    />

                    <RecommendationPanel
                        recommendations={recommendations}
                        isLoading={isLoadingRecs}
                        error={recError}
                        onSelect={handleRecommendationSelect}
                    />

                    <SynergyDisplay synergy={synergy} />
                </div>
            </div>

            {/* Results Modal */}
            {draftState && (
                <DraftResultsModal
                    open={showResults}
                    onOpenChange={setShowResults}
                    draftState={draftState}
                />
            )}
        </div>
    );
}


interface DraftSetupProps {
    onStart: (side: 'blue' | 'red') => void;
}

function DraftSetup({ onStart }: DraftSetupProps) {
    return (
        <div className="container mx-auto flex min-h-[60vh] items-center justify-center p-6">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl">Welcome to Draft Master</CardTitle>
                    <p className="text-sm text-muted-foreground mt-2">
                        AI-Powered League of Legends Draft Assistant
                    </p>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-center text-muted-foreground">
                        Choose your side to begin the draft simulation
                    </p>
                    <div className="flex gap-4">
                        <Button
                            className="flex-1 bg-blue-600 hover:bg-blue-700"
                            onClick={() => onStart('blue')}
                        >
                            Blue Side
                        </Button>
                        <Button
                            className="flex-1 bg-red-600 hover:bg-red-700"
                            onClick={() => onStart('red')}
                        >
                            Red Side
                        </Button>
                    </div>
                    <p className="text-center text-xs text-muted-foreground">
                        Blue side picks first, Red side gets last pick
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
