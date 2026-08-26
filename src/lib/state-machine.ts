/**
 * REVIVE — Revenue Case State Machine
 * 
 * Implements explicit state transitions with validation.
 * Invalid transitions are rejected — never silently ignored.
 */

import { CASE_STATES, VALID_TRANSITIONS, type CaseState } from './constants';

export type { CaseState };

export class InvalidStateTransitionError extends Error {
  constructor(
    public readonly currentState: CaseState,
    public readonly targetState: CaseState,
  ) {
    super(`Invalid state transition: ${currentState} → ${targetState}`);
    this.name = 'InvalidStateTransitionError';
  }
}

/**
 * Validate whether a state transition is allowed.
 * @returns true if the transition is valid
 * @throws InvalidStateTransitionError if the transition is invalid
 */
export function validateTransition(currentState: CaseState, targetState: CaseState): boolean {
  const allowedTargets = VALID_TRANSITIONS[currentState];
  
  if (!allowedTargets) {
    throw new InvalidStateTransitionError(currentState, targetState);
  }
  
  if (!allowedTargets.includes(targetState)) {
    throw new InvalidStateTransitionError(currentState, targetState);
  }
  
  return true;
}

/**
 * Check if a state transition is allowed without throwing.
 */
export function canTransition(currentState: CaseState, targetState: CaseState): boolean {
  const allowedTargets = VALID_TRANSITIONS[currentState];
  if (!allowedTargets) return false;
  return allowedTargets.includes(targetState);
}

/**
 * Get all valid target states from the current state.
 */
export function getValidTransitions(currentState: CaseState): CaseState[] {
  return VALID_TRANSITIONS[currentState] ?? [];
}

/**
 * Check if a state is terminal (no further transitions possible).
 */
export function isTerminalState(state: CaseState): boolean {
  const transitions = VALID_TRANSITIONS[state];
  return !transitions || transitions.length === 0;
}

/**
 * Validate that a string is a valid CaseState.
 */
export function isValidCaseState(state: string): state is CaseState {
  return Object.values(CASE_STATES).includes(state as CaseState);
}
