'use client';

import { cn } from '@/lib/utils';
import type { Champion } from '../types';

interface ChampionCardProps {
    champion: Champion;
    size?: 'sm' | 'md' | 'lg';
    showName?: boolean;
    disabled?: boolean;
    selected?: boolean;
    onClick?: () => void;
}

const ROLE_COLORS: Record<string, string> = {
    top: 'bg-amber-500/20 text-amber-500',
    jungle: 'bg-green-500/20 text-green-500',
    mid: 'bg-purple-500/20 text-purple-500',
    adc: 'bg-red-500/20 text-red-500',
    support: 'bg-blue-500/20 text-blue-500'
};

const SIZE_CLASSES = {
    sm: 'h-12 w-12',
    md: 'h-16 w-16',
    lg: 'h-20 w-20'
};

export function ChampionCard({
    champion,
    size = 'md',
    showName = true,
    disabled = false,
    selected = false,
    onClick
}: ChampionCardProps) {
    const roleColor = ROLE_COLORS[champion.role.toLowerCase()] || 'bg-gray-500/20 text-gray-500';

    return (
        <div
            onClick={disabled ? undefined : onClick}
            className={cn(
                'group flex flex-col items-center gap-1 rounded-lg p-2 transition-all',
                onClick && !disabled && 'cursor-pointer hover:bg-accent',
                disabled && 'cursor-not-allowed opacity-40',
                selected && 'ring-2 ring-primary'
            )}
        >
            <div
                className={cn(
                    'flex items-center justify-center rounded-lg bg-muted',
                    SIZE_CLASSES[size]
                )}
            >
                {champion.imageUrl ? (
                    <img
                        src={champion.imageUrl}
                        alt={champion.name}
                        className="h-full w-full rounded-lg object-cover"
                    />
                ) : (
                    <span className="text-lg font-bold">{champion.name.charAt(0)}</span>
                )}
            </div>
            {showName && (
                <div className="text-center">
                    <p className="text-xs font-medium leading-tight">{champion.name}</p>
                    <span className={cn('rounded px-1 text-[10px] capitalize', roleColor)}>
                        {champion.role}
                    </span>
                </div>
            )}
        </div>
    );
}
