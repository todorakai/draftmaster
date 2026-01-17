'use client';

import { cn } from '@/lib/utils';
import { Loader2, Sparkles, AlertCircle } from 'lucide-react';
import type { Recommendation } from '../types';
import { ChampionCard } from './champion-card';

interface RecommendationPanelProps {
    recommendations: Recommendation[];
    isLoading?: boolean;
    error?: string | null;
    onSelect?: (recommendation: Recommendation) => void;
}

export function RecommendationPanel({
    recommendations,
    isLoading,
    error,
    onSelect
}: RecommendationPanelProps) {
    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center rounded-lg border bg-card p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="mt-2 text-sm text-muted-foreground">Getting AI recommendations...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center rounded-lg border border-destructive/50 bg-destructive/10 p-8">
                <AlertCircle className="h-8 w-8 text-destructive" />
                <p className="mt-2 text-sm text-destructive">{error}</p>
            </div>
        );
    }

    if (recommendations.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center rounded-lg border bg-card p-8">
                <Sparkles className="h-8 w-8 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">
                    Start drafting to get AI recommendations
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-3 rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">AI Recommendations</h3>
            </div>

            <div className="space-y-2">
                {recommendations.map((rec, index) => (
                    <RecommendationItem
                        key={rec.champion.id}
                        recommendation={rec}
                        rank={index + 1}
                        onClick={() => onSelect?.(rec)}
                    />
                ))}
            </div>
        </div>
    );
}


interface RecommendationItemProps {
    recommendation: Recommendation;
    rank: number;
    onClick?: () => void;
}

function RecommendationItem({ recommendation, rank, onClick }: RecommendationItemProps) {
    const { champion, score, reason } = recommendation;
    const scorePercent = Math.round(score * 100);

    return (
        <div
            onClick={onClick}
            className={cn(
                'flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-all hover:bg-accent',
                rank === 1 && 'border-primary/50 bg-primary/5'
            )}
        >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                #{rank}
            </div>

            <ChampionCard champion={champion} size="sm" showName={false} />

            <div className="flex-1">
                <div className="flex items-center justify-between">
                    <span className="font-medium">{champion.name}</span>
                    <span
                        className={cn(
                            'rounded px-2 py-0.5 text-xs font-medium',
                            scorePercent >= 80 && 'bg-green-500/20 text-green-500',
                            scorePercent >= 60 && scorePercent < 80 && 'bg-yellow-500/20 text-yellow-500',
                            scorePercent < 60 && 'bg-red-500/20 text-red-500'
                        )}
                    >
                        {scorePercent}%
                    </span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{reason}</p>
            </div>
        </div>
    );
}
