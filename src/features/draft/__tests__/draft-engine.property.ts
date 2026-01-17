/**
 * Property-Based Tests for Draft Engine
 * Feature: lol-draft-assistant
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
    createDraft,
    applyAction,
    getAvailableChampions,
    validateAction,
    getCurrentPhase,
    getCurrentSide,
    getPhaseActionType,
    DRAFT_PHASE_ORDER
} from '../services/draft-engine';
import { championDataService } from '../services/champion-data';
import type { Champion, DraftAction, DraftConfig, DraftState } from '../types';

// Get all champions for testing
const allChampions = championDataService.getAllChampions();

// Arbitrary for draft config
const draftConfigArb: fc.Arbitrary<DraftConfig> = fc.record({
    userSide: fc.constantFrom('blue' as const, 'red' as const),
    opponentTeamId: fc.option(fc.string(), { nil: undefined })
});

// Helper to get a valid action for current phase
function getValidAction(state: DraftState, availableChampions: Champion[]): DraftAction | null {
    const phase = getCurrentPhase(state);
    const side = getCurrentSide(phase);
    const actionType = getPhaseActionType(phase);

    if (!side || !actionType || availableChampions.length === 0) {
        return null;
    }

    return {
        type: actionType,
        side,
        champion: availableChampions[0]
    };
}

describe('Draft Engine - Property Tests', () => {
    /**
     * Property 2: Draft State Champion Exclusion Invariant
     * For any draft state and any pick or ban action, after the action is applied,
     * the selected champion SHALL NOT appear in the available champions pool,
     * and the champion SHALL appear exactly once in either the picks or bans list.
     * 
     * Validates: Requirements 3.3
     */
    it('Property 2: picked/banned champions are excluded from available pool', () => {
        fc.assert(
            fc.property(draftConfigArb, (config) => {
                let state = createDraft(config);
                const usedChampions: Champion[] = [];

                // Simulate several valid actions
                for (let i = 0; i < 5; i++) {
                    const available = getAvailableChampions(state);
                    const action = getValidAction(state, available);

                    if (!action) break;

                    // Apply the action
                    state = applyAction(state, action);
                    usedChampions.push(action.champion);

                    // Verify the champion is no longer available
                    const newAvailable = getAvailableChampions(state);
                    const isStillAvailable = newAvailable.some(
                        (c) => c.id === action.champion.id
                    );
                    expect(isStillAvailable).toBe(false);

                    // Verify the champion appears exactly once in picks or bans
                    const allPicksAndBans = [
                        ...state.bluePicks,
                        ...state.redPicks,
                        ...state.blueBans,
                        ...state.redBans
                    ];
                    const occurrences = allPicksAndBans.filter(
                        (c) => c.id === action.champion.id
                    ).length;
                    expect(occurrences).toBe(1);
                }

                // Verify all used champions are in picks or bans
                const allPicksAndBans = [
                    ...state.bluePicks,
                    ...state.redPicks,
                    ...state.blueBans,
                    ...state.redBans
                ];
                for (const champion of usedChampions) {
                    const found = allPicksAndBans.some((c) => c.id === champion.id);
                    expect(found).toBe(true);
                }
            }),
            { numRuns: 100 }
        );
    });

    it('Property 2b: available champions decreases after each action', () => {
        fc.assert(
            fc.property(draftConfigArb, (config) => {
                let state = createDraft(config);
                let previousCount = getAvailableChampions(state).length;

                // Apply several valid actions
                for (let i = 0; i < 5; i++) {
                    const available = getAvailableChampions(state);
                    const action = getValidAction(state, available);

                    if (!action) break;

                    state = applyAction(state, action);
                    const newCount = getAvailableChampions(state).length;

                    // Available count should decrease by exactly 1
                    expect(newCount).toBe(previousCount - 1);
                    previousCount = newCount;
                }
            }),
            { numRuns: 100 }
        );
    });
});

describe('Draft Phase Transition - Property Tests', () => {
    /**
     * Property 3: Draft Phase Transition Validity
     * For any draft state, the draft engine SHALL only allow actions that are
     * valid for the current phase.
     * 
     * Validates: Requirements 3.4
     */
    it('Property 3: only valid actions for current phase are accepted', () => {
        fc.assert(
            fc.property(draftConfigArb, (config) => {
                let state = createDraft(config);

                // Test several phases
                for (let i = 0; i < 5; i++) {
                    const phase = getCurrentPhase(state);
                    const expectedSide = getCurrentSide(phase);
                    const expectedActionType = getPhaseActionType(phase);

                    if (!expectedSide || !expectedActionType) break;

                    const available = getAvailableChampions(state);
                    if (available.length === 0) break;

                    const champion = available[0];

                    // Test wrong side
                    const wrongSide = expectedSide === 'blue' ? 'red' : 'blue';
                    const wrongSideAction: DraftAction = {
                        type: expectedActionType,
                        side: wrongSide,
                        champion
                    };
                    const wrongSideResult = validateAction(state, wrongSideAction);
                    expect(wrongSideResult.valid).toBe(false);
                    expect(wrongSideResult.error).toContain(expectedSide);

                    // Test wrong action type
                    const wrongActionType = expectedActionType === 'pick' ? 'ban' : 'pick';
                    const wrongTypeAction: DraftAction = {
                        type: wrongActionType,
                        side: expectedSide,
                        champion
                    };
                    const wrongTypeResult = validateAction(state, wrongTypeAction);
                    expect(wrongTypeResult.valid).toBe(false);
                    expect(wrongTypeResult.error).toContain(expectedActionType);

                    // Test correct action
                    const correctAction: DraftAction = {
                        type: expectedActionType,
                        side: expectedSide,
                        champion
                    };
                    const correctResult = validateAction(state, correctAction);
                    expect(correctResult.valid).toBe(true);

                    // Apply and continue
                    state = applyAction(state, correctAction);
                }
            }),
            { numRuns: 100 }
        );
    });

    it('Property 3b: phases progress in correct order', () => {
        fc.assert(
            fc.property(draftConfigArb, (config) => {
                let state = createDraft(config);
                const observedPhases: string[] = [state.phase];

                // Progress through draft
                for (let i = 0; i < 15; i++) {
                    const available = getAvailableChampions(state);
                    const action = getValidAction(state, available);

                    if (!action) break;

                    state = applyAction(state, action);
                    observedPhases.push(state.phase);
                }

                // Verify phases follow the expected order
                for (let i = 0; i < observedPhases.length - 1; i++) {
                    const currentPhase = observedPhases[i];
                    const nextPhase = observedPhases[i + 1];

                    const currentIndex = DRAFT_PHASE_ORDER.indexOf(currentPhase as any);
                    const nextIndex = DRAFT_PHASE_ORDER.indexOf(nextPhase as any);

                    // Next phase should be exactly one step ahead
                    expect(nextIndex).toBe(currentIndex + 1);
                }
            }),
            { numRuns: 100 }
        );
    });

    it('Property 3c: cannot act on completed draft', () => {
        fc.assert(
            fc.property(draftConfigArb, (config) => {
                let state = createDraft(config);

                // Complete the entire draft
                while (state.phase !== 'complete') {
                    const available = getAvailableChampions(state);
                    const action = getValidAction(state, available);
                    if (!action) break;
                    state = applyAction(state, action);
                }

                // If draft is complete, any action should be invalid
                if (state.phase === 'complete') {
                    const available = getAvailableChampions(state);
                    if (available.length > 0) {
                        const action: DraftAction = {
                            type: 'pick',
                            side: 'blue',
                            champion: available[0]
                        };
                        const result = validateAction(state, action);
                        expect(result.valid).toBe(false);
                        expect(result.error).toContain('complete');
                    }
                }
            }),
            { numRuns: 50 }
        );
    });

    it('Property 3d: cannot pick/ban already taken champion', () => {
        fc.assert(
            fc.property(draftConfigArb, (config) => {
                let state = createDraft(config);

                // Make one valid action
                const available = getAvailableChampions(state);
                const action = getValidAction(state, available);

                if (action) {
                    state = applyAction(state, action);
                    const takenChampion = action.champion;

                    // Try to use the same champion again
                    const newPhase = getCurrentPhase(state);
                    const newSide = getCurrentSide(newPhase);
                    const newActionType = getPhaseActionType(newPhase);

                    if (newSide && newActionType) {
                        const duplicateAction: DraftAction = {
                            type: newActionType,
                            side: newSide,
                            champion: takenChampion
                        };
                        const result = validateAction(state, duplicateAction);
                        expect(result.valid).toBe(false);
                        expect(result.error).toContain('already');
                    }
                }
            }),
            { numRuns: 100 }
        );
    });
});
