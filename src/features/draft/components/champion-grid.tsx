'use client';

import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Champion } from '../types';
import { ChampionCard } from './champion-card';

interface ChampionGridProps {
    champions: Champion[];
    disabledIds?: Set<string>;
    selectedId?: string;
    onSelect?: (champion: Champion) => void;
}

const ROLES = ['all', 'top', 'jungle', 'mid', 'adc', 'support'] as const;

export function ChampionGrid({ champions, disabledIds, selectedId, onSelect }: ChampionGridProps) {
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>('all');

    const filteredChampions = useMemo(() => {
        return champions.filter((champ) => {
            const matchesSearch = champ.name.toLowerCase().includes(search.toLowerCase());
            const matchesRole = roleFilter === 'all' || champ.role.toLowerCase() === roleFilter;
            return matchesSearch && matchesRole;
        });
    }, [champions, search, roleFilter]);

    return (
        <div className="space-y-4">
            <div className="flex gap-4">
                <Input
                    placeholder="Search champions..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="max-w-xs"
                />
                <div className="flex gap-1">
                    {ROLES.map((role) => (
                        <Button
                            key={role}
                            variant={roleFilter === role ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setRoleFilter(role)}
                            className="capitalize"
                        >
                            {role}
                        </Button>
                    ))}
                </div>
            </div>

            <div className="grid max-h-[400px] grid-cols-6 gap-2 overflow-y-auto rounded-lg border bg-card p-4 lg:grid-cols-8">
                {filteredChampions.map((champion) => (
                    <ChampionCard
                        key={champion.id}
                        champion={champion}
                        size="md"
                        disabled={disabledIds?.has(champion.id)}
                        selected={selectedId === champion.id}
                        onClick={() => onSelect?.(champion)}
                    />
                ))}
                {filteredChampions.length === 0 && (
                    <div className="col-span-full py-8 text-center text-muted-foreground">
                        No champions found
                    </div>
                )}
            </div>
        </div>
    );
}
