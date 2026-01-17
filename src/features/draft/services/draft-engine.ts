import type {
    Champion,
    DraftAction,
    DraftConfig,
    DraftPhase,
    DraftSide,
    DraftState,
    ValidationResult
} from '../types';
import { championDataService } from './champion-data';

/**
 * Draft phase order following standard LoL competitive draft
 * Blue bans first, then alternating
 */
const DRAFT_PHASE_ORDER: DraftPhase[] = [
    // First ban phase (3 bans each)
    'ban_1', // Blue ban
    'ban_2', // Red ban
    'ban_3', // Blue ban
    // Note: In actual LoL, it's B-R-B-R-B-R for bans, simplified here
    // First pick phase
    'pick_1', // Blue pick
    'pick_2', // Red pick
    'pick_3', // Red pick
    'pick_4', // Blue pick
    'pick_5', // Blue pick
    // Second ban phase (2 bans each)
    'ban_4', // Red ban
    'ban_5', // Blue ban
    // Second pick phase
    'pick_6', // Red pick
    'pick_7', // Red pick
    'pick_8', // Blue pick
    'pick_9', // Blue pick
    'pick_10', // Red pick
    'complete'
];

/**
 * Maps each phase to which side should act
 */
const PHASE_TO_SIDE: Record<DraftPhase, DraftSide | null> = {
    ban_1: 'blue',
    ban_2: 'red',
    ban_3: 'blue',
    pick_1: 'blue',
    pick_2: 'red',
    pick_3: 'red',
    pick_4: 'blue',
    pick_5: 'blue',
    ban_4: 'red',
    ban_5: 'blue',
    pick_6: 'red',
    pick_7: 'red',
    pick_8: 'blue',
    pick_9: 'blue',
    pick_10: 'red',
    complete: null
};

/**
 * Maps each phase to action type (pick or ban)
 */
const PHASE_TO_ACTION_TYPE: Record<DraftPhase, 'pick' | 'ban' | null> = {
    ban_1: 'ban',
    ban_2: 'ban',
    ban_3: 'ban',
    pick_1: 'pick',
    pick_2: 'pick',
    pick_3: 'pick',
    pick_4: 'pick',
    pick_5: 'pick',
    ban_4: 'ban',
    ban_5: 'ban',
    pick_6: 'pick',
    pick_7: 'pick',
    pick_8: 'pick',
    pick_9: 'pick',
    pick_10: 'pick',
    complete: null
};

/**
 * Create a new draft with the given configuration
 */
export function createDraft(config: DraftConfig): DraftState {
    return {
        config,
        phase: 'ban_1',
        bluePicks: [],
        redPicks: [],
        blueBans: [],
        redBans: [],
        actionHistory: []
    };
}

/**
 * Get the current phase of the draft
 */
export function getCurrentPhase(state: DraftState): DraftPhase {
    return state.phase;
}

/**
 * Get the next phase after the current one
 */
export function getNextPhase(currentPhase: DraftPhase): DraftPhase {
    const currentIndex = DRAFT_PHASE_ORDER.indexOf(currentPhase);
    if (currentIndex === -1 || currentIndex >= DRAFT_PHASE_ORDER.length - 1) {
        return 'complete';
    }
    return DRAFT_PHASE_ORDER[currentIndex + 1];
}

/**
 * Get which side should act in the current phase
 */
export function getCurrentSide(phase: DraftPhase): DraftSide | null {
    return PHASE_TO_SIDE[phase];
}

/**
 * Get the action type for the current phase
 */
export function getPhaseActionType(phase: DraftPhase): 'pick' | 'ban' | null {
    return PHASE_TO_ACTION_TYPE[phase];
}

/**
 * Validate if an action is legal for the current draft state
 */
export function validateAction(
    state: DraftState,
    action: DraftAction
): ValidationResult {
    // Check if draft is complete
    if (state.phase === 'complete') {
        return { valid: false, error: 'Draft is already complete' };
    }

    // Check if it's the correct side's turn
    const expectedSide = getCurrentSide(state.phase);
    if (action.side !== expectedSide) {
        return {
            valid: false,
            error: `It is ${expectedSide}'s turn, not ${action.side}'s`
        };
    }

    // Check if action type matches phase
    const expectedActionType = getPhaseActionType(state.phase);
    if (action.type !== expectedActionType) {
        return {
            valid: false,
            error: `Current phase requires ${expectedActionType}, not ${action.type}`
        };
    }

    // Check if champion is already picked or banned
    const allPickedAndBanned = [
        ...state.bluePicks,
        ...state.redPicks,
        ...state.blueBans,
        ...state.redBans
    ];

    const isChampionTaken = allPickedAndBanned.some(
        (c) => c.id === action.champion.id
    );

    if (isChampionTaken) {
        return {
            valid: false,
            error: `${action.champion.name} is already picked or banned`
        };
    }

    return { valid: true };
}

/**
 * Apply an action to the draft state
 * Returns a new state (immutable)
 */
export function applyAction(
    state: DraftState,
    action: DraftAction
): DraftState {
    // Validate the action first
    const validation = validateAction(state, action);
    if (!validation.valid) {
        throw new Error(validation.error);
    }

    // Create new state
    const newState: DraftState = {
        ...state,
        bluePicks: [...state.bluePicks],
        redPicks: [...state.redPicks],
        blueBans: [...state.blueBans],
        redBans: [...state.redBans],
        actionHistory: [...state.actionHistory, action]
    };

    // Apply the action
    if (action.type === 'pick') {
        if (action.side === 'blue') {
            newState.bluePicks.push(action.champion);
        } else {
            newState.redPicks.push(action.champion);
        }
    } else {
        if (action.side === 'blue') {
            newState.blueBans.push(action.champion);
        } else {
            newState.redBans.push(action.champion);
        }
    }

    // Advance to next phase
    newState.phase = getNextPhase(state.phase);

    return newState;
}

/**
 * Get all champions that are still available (not picked or banned)
 */
export function getAvailableChampions(state: DraftState): Champion[] {
    const allChampions = championDataService.getAllChampions();

    const takenChampionIds = new Set([
        ...state.bluePicks.map((c) => c.id),
        ...state.redPicks.map((c) => c.id),
        ...state.blueBans.map((c) => c.id),
        ...state.redBans.map((c) => c.id)
    ]);

    return allChampions.filter((c) => !takenChampionIds.has(c.id));
}

/**
 * Check if the draft is complete
 */
export function isDraftComplete(state: DraftState): boolean {
    return state.phase === 'complete';
}

/**
 * Get draft summary
 */
export function getDraftSummary(state: DraftState): {
    blueTeam: Champion[];
    redTeam: Champion[];
    blueBans: Champion[];
    redBans: Champion[];
    isComplete: boolean;
} {
    return {
        blueTeam: state.bluePicks,
        redTeam: state.redPicks,
        blueBans: state.blueBans,
        redBans: state.redBans,
        isComplete: isDraftComplete(state)
    };
}

// Export phase constants for testing
export { DRAFT_PHASE_ORDER, PHASE_TO_SIDE, PHASE_TO_ACTION_TYPE };
