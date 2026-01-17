'use client';

import { create } from 'zustand';
import type { DraftState, Champion, DraftPhase, DraftConfig } from '../types';
import { createDraft, applyAction, getAvailableChampions, getCurrentSide, getPhaseActionType } from '../services/draft-engine';
import { ChampionDataService } from '../services/champion-data';

interface DraftStore {
    draftState: DraftState | null;
    allChampions: Champion[];
    availableChampions: Champion[];
    selectedChampion: Champion | null;

    // Actions
    startDraft: (userSide: 'blue' | 'red') => void;
    pick: (champion: Champion) => void;
    ban: (champion: Champion) => void;
    selectChampion: (champion: Champion | null) => void;
    confirmAction: () => void;
    reset: () => void;
}

const championService = new ChampionDataService();

export const useDraftStore = create<DraftStore>((set, get) => ({
    draftState: null,
    allChampions: championService.getAllChampions(),
    availableChampions: [],
    selectedChampion: null,

    startDraft: (userSide) => {
        const allChampions = championService.getAllChampions();
        const config: DraftConfig = { userSide };
        const draftState = createDraft(config);
        const availableChampions = getAvailableChampions(draftState);

        set({
            draftState,
            allChampions,
            availableChampions,
            selectedChampion: null
        });
    },

    pick: (champion) => {
        const { draftState } = get();
        if (!draftState || draftState.phase === 'complete') return;

        const side = getCurrentSide(draftState.phase);
        if (!side) return;

        try {
            const newState = applyAction(draftState, {
                type: 'pick',
                champion,
                side
            });

            set({
                draftState: newState,
                availableChampions: getAvailableChampions(newState),
                selectedChampion: null
            });
        } catch (e) {
            console.error('Failed to pick:', e);
        }
    },

    ban: (champion) => {
        const { draftState } = get();
        if (!draftState || draftState.phase === 'complete') return;

        const side = getCurrentSide(draftState.phase);
        if (!side) return;

        try {
            const newState = applyAction(draftState, {
                type: 'ban',
                champion,
                side
            });

            set({
                draftState: newState,
                availableChampions: getAvailableChampions(newState),
                selectedChampion: null
            });
        } catch (e) {
            console.error('Failed to ban:', e);
        }
    },

    selectChampion: (champion) => {
        set({ selectedChampion: champion });
    },

    confirmAction: () => {
        const { draftState, selectedChampion } = get();
        if (!draftState || !selectedChampion) return;

        const actionType = getPhaseActionType(draftState.phase);
        if (actionType === 'ban') {
            get().ban(selectedChampion);
        } else if (actionType === 'pick') {
            get().pick(selectedChampion);
        }
    },

    reset: () => {
        set({
            draftState: null,
            availableChampions: [],
            selectedChampion: null
        });
    }
}));

export function useDraft() {
    return useDraftStore();
}
