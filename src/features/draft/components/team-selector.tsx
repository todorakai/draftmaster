'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Search, X } from 'lucide-react';
import type { Team } from '../types';

interface TeamSelectorProps {
    selectedTeam?: Team | null;
    onSelect: (team: Team | null) => void;
    onSearch: (query: string) => Promise<Team[]>;
}

export function TeamSelector({ selectedTeam, onSelect, onSearch }: TeamSelectorProps) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Team[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showResults, setShowResults] = useState(false);

    const handleSearch = async () => {
        if (!query.trim()) return;

        setIsSearching(true);
        try {
            const teams = await onSearch(query);
            setResults(teams);
            setShowResults(true);
        } finally {
            setIsSearching(false);
        }
    };

    const handleSelect = (team: Team) => {
        onSelect(team);
        setShowResults(false);
        setQuery('');
    };

    const handleClear = () => {
        onSelect(null);
        setQuery('');
    };

    if (selectedTeam) {
        return (
            <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
                {selectedTeam.logoUrl && (
                    <img
                        src={selectedTeam.logoUrl}
                        alt={selectedTeam.name}
                        className="h-10 w-10 rounded-lg object-cover"
                    />
                )}
                <div className="flex-1">
                    <p className="font-medium">{selectedTeam.name}</p>
                    <p className="text-xs text-muted-foreground">Opponent Team</p>
                </div>
                <Button variant="ghost" size="icon" onClick={handleClear}>
                    <X className="h-4 w-4" />
                </Button>
            </div>
        );
    }

    return (
        <div className="relative">
            <div className="flex gap-2">
                <Input
                    placeholder="Search opponent team..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button onClick={handleSearch} disabled={isSearching}>
                    {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
            </div>

            {showResults && results.length > 0 && (
                <div className="absolute z-10 mt-1 w-full rounded-lg border bg-popover p-2 shadow-lg">
                    {results.map((team) => (
                        <div
                            key={team.id}
                            onClick={() => handleSelect(team)}
                            className="flex cursor-pointer items-center gap-2 rounded p-2 hover:bg-accent"
                        >
                            {team.logoUrl && (
                                <img src={team.logoUrl} alt={team.name} className="h-8 w-8 rounded object-cover" />
                            )}
                            <span>{team.name}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
