'use client';

import { cn } from '@/lib/utils';
import { Zap, AlertTriangle } from 'lucide-react';
import type { SynergyResult } from '../types';

interface SynergyDisplayProps {
    synergy: SynergyResult | null;
}

export function SynergyDisplay({ synergy }: SynergyDisplayProps) {
    if (!synergy) {
        return (
            <div className="rounded-lg border bg-card p-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Zap className="h-5 w-5" />
                    <span>Pick champions to see synergies</span>
                </div>
            </div>
        );
    }

    const { totalScore, synergies, warnings } = synergy;
    const scoreColor =
        totalScore >= 70 ? 'text-green-500' : totalScore >= 40 ? 'text-yellow-500' : 'text-red-500';

    return (
        <div className="space-y-3 rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold">Team Synergy</h3>
                </div>
                <span className={cn('text-2xl font-bold', scoreColor)}>{totalScore}</span>
            </div>

            {synergies.length > 0 && (
                <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Active Synergies</p>
                    {synergies.map((syn, i) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                            <span className="text-green-500">
                                {syn.champions.join(' + ')}
                            </span>
                            <span className="text-xs text-muted-foreground">{syn.description}</span>
                        </div>
                    ))}
                </div>
            )}

            {warnings.length > 0 && (
                <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Warnings</p>
                    {warnings.map((warning, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm text-yellow-500">
                            <AlertTriangle className="h-3 w-3" />
                            <span>{warning}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
