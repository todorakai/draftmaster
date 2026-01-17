'use client';

import { cn } from '@/lib/utils';
import type { Champion, DraftPhase } from '../types';
import { ChampionCard } from './champion-card';

interface DraftBoardState {
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
}

interface DraftBoardProps {
    draftState: DraftBoardState;
    onSlotClick?: (side: 'blue' | 'red', type: 'pick' | 'ban', index: number) => void;
}

const PHASE_LABELS: Record<DraftPhase, string> = {
    ban_1: 'Ban Phase 1',
    ban_2: 'Ban Phase 1',
    ban_3: 'Ban Phase 1',
    pick_1: 'Pick Phase 1',
    pick_2: 'Pick Phase 1',
    pick_3: 'Pick Phase 1',
    pick_4: 'Pick Phase 1',
    pick_5: 'Pick Phase 1',
    ban_4: 'Ban Phase 2',
    ban_5: 'Ban Phase 2',
    pick_6: 'Pick Phase 2',
    pick_7: 'Pick Phase 2',
    pick_8: 'Pick Phase 2',
    pick_9: 'Pick Phase 2',
    pick_10: 'Pick Phase 2',
    complete: 'Draft Complete'
};

export function DraftBoard({ draftState, onSlotClick }: DraftBoardProps) {
    const { blueTeam, redTeam, currentPhase, userSide } = draftState;

    return (
        <div className="w-full space-y-4">
            <div className="text-center">
                <span className="rounded-full bg-primary/10 px-4 py-2 text-sm font-medium">
                    {PHASE_LABELS[currentPhase]}
                </span>
            </div>

            <div className="grid grid-cols-2 gap-8">
                <TeamSection
                    side="blue"
                    picks={blueTeam.picks}
                    bans={blueTeam.bans}
                    isUserSide={userSide === 'blue'}
                    onSlotClick={onSlotClick}
                />
                <TeamSection
                    side="red"
                    picks={redTeam.picks}
                    bans={redTeam.bans}
                    isUserSide={userSide === 'red'}
                    onSlotClick={onSlotClick}
                />
            </div>
        </div>
    );
}


interface TeamSectionProps {
    side: 'blue' | 'red';
    picks: Champion[];
    bans: Champion[];
    isUserSide: boolean;
    onSlotClick?: (side: 'blue' | 'red', type: 'pick' | 'ban', index: number) => void;
}

function TeamSection({ side, picks, bans, isUserSide, onSlotClick }: TeamSectionProps) {
    const sideColor = side === 'blue' ? 'border-blue-500' : 'border-red-500';
    const sideBg = side === 'blue' ? 'bg-blue-500/10' : 'bg-red-500/10';

    return (
        <div className={cn('rounded-lg border-2 p-4', sideColor, sideBg)}>
            <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold capitalize">
                    {side} Side {isUserSide && '(You)'}
                </h3>
            </div>

            <div className="space-y-4">
                <div>
                    <h4 className="mb-2 text-sm font-medium text-muted-foreground">Bans</h4>
                    <div className="flex gap-2">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <ChampionSlot
                                key={`ban-${i}`}
                                champion={bans[i]}
                                type="ban"
                                onClick={() => onSlotClick?.(side, 'ban', i)}
                            />
                        ))}
                    </div>
                </div>

                <div>
                    <h4 className="mb-2 text-sm font-medium text-muted-foreground">Picks</h4>
                    <div className="flex gap-2">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <ChampionSlot
                                key={`pick-${i}`}
                                champion={picks[i]}
                                type="pick"
                                onClick={() => onSlotClick?.(side, 'pick', i)}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

interface ChampionSlotProps {
    champion?: Champion;
    type: 'pick' | 'ban';
    onClick?: () => void;
}

function ChampionSlot({ champion, type, onClick }: ChampionSlotProps) {
    const isEmpty = !champion;
    const isBan = type === 'ban';

    return (
        <div
            onClick={onClick}
            className={cn(
                'flex h-16 w-16 cursor-pointer items-center justify-center rounded-lg border-2 transition-all',
                isEmpty && 'border-dashed border-muted-foreground/30 bg-muted/20',
                !isEmpty && isBan && 'border-red-500/50 bg-red-500/10 opacity-50',
                !isEmpty && !isBan && 'border-primary/50 bg-primary/10'
            )}
        >
            {champion ? (
                <ChampionCard champion={champion} size="sm" showName={false} />
            ) : (
                <span className="text-xs text-muted-foreground">{isBan ? 'Ban' : 'Pick'}</span>
            )}
        </div>
    );
}
