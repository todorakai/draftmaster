'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { DraftState, Champion, SynergyResult } from '../types';
import { ChampionCard } from './champion-card';
import { ChampionDataService } from '../services/champion-data';

interface DraftResultsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    draftState: DraftState;
}

const championService = new ChampionDataService();

export function DraftResultsModal({ open, onOpenChange, draftState }: DraftResultsModalProps) {
    const { bluePicks, redPicks, blueBans, redBans, config } = draftState;
    const userSide = config.userSide;
    const userPicks = userSide === 'blue' ? bluePicks : redPicks;
    const opponentPicks = userSide === 'blue' ? redPicks : bluePicks;

    const userSynergy = championService.calculateTeamSynergy(userPicks);
    const opponentSynergy = championService.calculateTeamSynergy(opponentPicks);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
                <DialogHeader className="px-6 pt-6 pb-4">
                    <DialogTitle className="text-2xl">Draft Complete - Final Analysis</DialogTitle>
                </DialogHeader>

                <ScrollArea className="flex-1 px-6 pb-6">
                    <div className="space-y-6 pr-4">
                        {/* Overall Summary */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Draft Summary</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-muted-foreground mb-1">Your Side</p>
                                        <Badge variant={userSide === 'blue' ? 'default' : 'destructive'} className="text-lg">
                                            {userSide.toUpperCase()}
                                        </Badge>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground mb-1">Team Synergy Score</p>
                                        <p className="text-2xl font-bold">{userSynergy.totalScore.toFixed(1)}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Your Team */}
                        <TeamAnalysis
                            title="Your Team"
                            picks={userPicks}
                            bans={userSide === 'blue' ? blueBans : redBans}
                            synergy={userSynergy}
                            side={userSide}
                        />

                        <Separator />

                        {/* Opponent Team */}
                        <TeamAnalysis
                            title="Opponent Team"
                            picks={opponentPicks}
                            bans={userSide === 'blue' ? redBans : blueBans}
                            synergy={opponentSynergy}
                            side={userSide === 'blue' ? 'red' : 'blue'}
                        />

                        {/* Comparison */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Team Comparison</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="text-center">
                                        <p className="text-sm text-muted-foreground mb-2">Your Synergy</p>
                                        <p className="text-3xl font-bold text-primary">
                                            {userSynergy.totalScore.toFixed(1)}
                                        </p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-sm text-muted-foreground mb-2">Opponent Synergy</p>
                                        <p className="text-3xl font-bold text-muted-foreground">
                                            {opponentSynergy.totalScore.toFixed(1)}
                                        </p>
                                    </div>
                                </div>

                                {userSynergy.totalScore > opponentSynergy.totalScore ? (
                                    <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-4 text-center">
                                        <p className="font-semibold text-green-600 dark:text-green-400">
                                            Your team has better synergy! (+{(userSynergy.totalScore - opponentSynergy.totalScore).toFixed(1)})
                                        </p>
                                    </div>
                                ) : userSynergy.totalScore < opponentSynergy.totalScore ? (
                                    <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4 text-center">
                                        <p className="font-semibold text-red-600 dark:text-red-400">
                                            Opponent has better synergy (-{(opponentSynergy.totalScore - userSynergy.totalScore).toFixed(1)})
                                        </p>
                                    </div>
                                ) : (
                                    <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-4 text-center">
                                        <p className="font-semibold text-blue-600 dark:text-blue-400">
                                            Equal synergy scores!
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}

interface TeamAnalysisProps {
    title: string;
    picks: Champion[];
    bans: Champion[];
    synergy: SynergyResult;
    side: 'blue' | 'red';
}

function TeamAnalysis({ title, picks, bans, synergy, side }: TeamAnalysisProps) {
    const roleOrder: Record<string, number> = {
        top: 0,
        jungle: 1,
        mid: 2,
        adc: 3,
        support: 4
    };

    const sortedPicks = [...picks].sort((a, b) => {
        return (roleOrder[a.role] || 99) - (roleOrder[b.role] || 99);
    });

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    {title}
                    <Badge variant={side === 'blue' ? 'default' : 'destructive'}>
                        {side.toUpperCase()}
                    </Badge>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Team Composition */}
                <div>
                    <h4 className="text-sm font-semibold mb-3">Team Composition</h4>
                    <div className="grid grid-cols-5 gap-2">
                        {sortedPicks.map((champion) => (
                            <div key={champion.id} className="text-center">
                                <ChampionCard champion={champion} size="md" />
                                <p className="text-xs text-muted-foreground mt-1 capitalize">
                                    {champion.role}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Bans */}
                <div>
                    <h4 className="text-sm font-semibold mb-3">Bans</h4>
                    <div className="flex gap-2 flex-wrap">
                        {bans.map((champion) => (
                            <div key={champion.id} className="opacity-60">
                                <ChampionCard champion={champion} size="sm" showName={false} />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Synergies */}
                <div>
                    <h4 className="text-sm font-semibold mb-3">
                        Team Synergies
                        <span className="ml-2 text-lg font-bold text-primary">
                            {synergy.totalScore.toFixed(1)}
                        </span>
                    </h4>
                    {synergy.synergies.length > 0 ? (
                        <div className="space-y-2">
                            {synergy.synergies.slice(0, 3).map((syn, idx) => (
                                <div
                                    key={idx}
                                    className="rounded-lg bg-muted/50 p-3 text-sm"
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-medium">
                                            {syn.champions.join(' + ')}
                                        </span>
                                        <Badge variant="outline">+{syn.score.toFixed(1)}</Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground">{syn.description}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">No significant synergies detected</p>
                    )}
                </div>

                {/* Warnings */}
                {synergy.warnings.length > 0 && (
                    <div>
                        <h4 className="text-sm font-semibold mb-3 text-yellow-600 dark:text-yellow-400">
                            Warnings
                        </h4>
                        <div className="space-y-2">
                            {synergy.warnings.map((warning, idx) => (
                                <div
                                    key={idx}
                                    className="rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-2 text-sm"
                                >
                                    {warning}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
