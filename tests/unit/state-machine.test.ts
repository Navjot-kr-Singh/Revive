import { describe, it, expect } from 'vitest';
import {
  validateTransition,
  canTransition,
  getValidTransitions,
  isTerminalState,
  isValidCaseState,
  InvalidStateTransitionError,
} from '@/lib/state-machine';
import { CASE_STATES } from '@/lib/constants';

describe('Revenue Case State Machine', () => {
  describe('valid transitions', () => {
    it('NEW → ANALYZING', () => {
      expect(validateTransition(CASE_STATES.NEW, CASE_STATES.ANALYZING)).toBe(true);
    });

    it('ANALYZING → ANALYZED', () => {
      expect(validateTransition(CASE_STATES.ANALYZING, CASE_STATES.ANALYZED)).toBe(true);
    });

    it('ANALYZING → FAILED', () => {
      expect(validateTransition(CASE_STATES.ANALYZING, CASE_STATES.FAILED)).toBe(true);
    });

    it('ANALYZING → ESCALATED', () => {
      expect(validateTransition(CASE_STATES.ANALYZING, CASE_STATES.ESCALATED)).toBe(true);
    });

    it('ANALYZED → SIMULATING', () => {
      expect(validateTransition(CASE_STATES.ANALYZED, CASE_STATES.SIMULATING)).toBe(true);
    });

    it('SIMULATING → DECISION_PENDING', () => {
      expect(validateTransition(CASE_STATES.SIMULATING, CASE_STATES.DECISION_PENDING)).toBe(true);
    });

    it('SIMULATING → FAILED', () => {
      expect(validateTransition(CASE_STATES.SIMULATING, CASE_STATES.FAILED)).toBe(true);
    });

    it('DECISION_PENDING → APPROVED', () => {
      expect(validateTransition(CASE_STATES.DECISION_PENDING, CASE_STATES.APPROVED)).toBe(true);
    });

    it('DECISION_PENDING → ESCALATED', () => {
      expect(validateTransition(CASE_STATES.DECISION_PENDING, CASE_STATES.ESCALATED)).toBe(true);
    });

    it('DECISION_PENDING → STOPPED', () => {
      expect(validateTransition(CASE_STATES.DECISION_PENDING, CASE_STATES.STOPPED)).toBe(true);
    });

    it('APPROVED → EXECUTING', () => {
      expect(validateTransition(CASE_STATES.APPROVED, CASE_STATES.EXECUTING)).toBe(true);
    });

    it('EXECUTING → RECOVERED', () => {
      expect(validateTransition(CASE_STATES.EXECUTING, CASE_STATES.RECOVERED)).toBe(true);
    });

    it('EXECUTING → FAILED', () => {
      expect(validateTransition(CASE_STATES.EXECUTING, CASE_STATES.FAILED)).toBe(true);
    });

    it('EXECUTING → ESCALATED', () => {
      expect(validateTransition(CASE_STATES.EXECUTING, CASE_STATES.ESCALATED)).toBe(true);
    });

    it('EXECUTING → EXPIRED', () => {
      expect(validateTransition(CASE_STATES.EXECUTING, CASE_STATES.EXPIRED)).toBe(true);
    });
  });

  describe('invalid transitions', () => {
    it('NEW → EXECUTING is invalid', () => {
      expect(() => validateTransition(CASE_STATES.NEW, CASE_STATES.EXECUTING))
        .toThrow(InvalidStateTransitionError);
    });

    it('NEW → RECOVERED is invalid', () => {
      expect(() => validateTransition(CASE_STATES.NEW, CASE_STATES.RECOVERED))
        .toThrow(InvalidStateTransitionError);
    });

    it('RECOVERED → NEW is invalid', () => {
      expect(() => validateTransition(CASE_STATES.RECOVERED, CASE_STATES.NEW))
        .toThrow(InvalidStateTransitionError);
    });

    it('FAILED → ANALYZING is invalid', () => {
      expect(() => validateTransition(CASE_STATES.FAILED, CASE_STATES.ANALYZING))
        .toThrow(InvalidStateTransitionError);
    });

    it('EXPIRED → EXECUTING is invalid', () => {
      expect(() => validateTransition(CASE_STATES.EXPIRED, CASE_STATES.EXECUTING))
        .toThrow(InvalidStateTransitionError);
    });

    it('STOPPED → APPROVED is invalid', () => {
      expect(() => validateTransition(CASE_STATES.STOPPED, CASE_STATES.APPROVED))
        .toThrow(InvalidStateTransitionError);
    });

    it('ANALYZING → RECOVERED is invalid (skip steps)', () => {
      expect(() => validateTransition(CASE_STATES.ANALYZING, CASE_STATES.RECOVERED))
        .toThrow(InvalidStateTransitionError);
    });
  });

  describe('canTransition', () => {
    it('returns true for valid transitions', () => {
      expect(canTransition(CASE_STATES.NEW, CASE_STATES.ANALYZING)).toBe(true);
    });

    it('returns false for invalid transitions', () => {
      expect(canTransition(CASE_STATES.NEW, CASE_STATES.RECOVERED)).toBe(false);
    });

    it('returns false from terminal states', () => {
      expect(canTransition(CASE_STATES.RECOVERED, CASE_STATES.NEW)).toBe(false);
    });
  });

  describe('terminal states', () => {
    it('RECOVERED is terminal', () => {
      expect(isTerminalState(CASE_STATES.RECOVERED)).toBe(true);
    });

    it('FAILED is terminal', () => {
      expect(isTerminalState(CASE_STATES.FAILED)).toBe(true);
    });

    it('ESCALATED is terminal', () => {
      expect(isTerminalState(CASE_STATES.ESCALATED)).toBe(true);
    });

    it('EXPIRED is terminal', () => {
      expect(isTerminalState(CASE_STATES.EXPIRED)).toBe(true);
    });

    it('STOPPED is terminal', () => {
      expect(isTerminalState(CASE_STATES.STOPPED)).toBe(true);
    });

    it('NEW is not terminal', () => {
      expect(isTerminalState(CASE_STATES.NEW)).toBe(false);
    });

    it('ANALYZING is not terminal', () => {
      expect(isTerminalState(CASE_STATES.ANALYZING)).toBe(false);
    });

    it('EXECUTING is not terminal', () => {
      expect(isTerminalState(CASE_STATES.EXECUTING)).toBe(false);
    });
  });

  describe('getValidTransitions', () => {
    it('NEW can transition to ANALYZING only', () => {
      expect(getValidTransitions(CASE_STATES.NEW)).toEqual([CASE_STATES.ANALYZING]);
    });

    it('EXECUTING can transition to RECOVERED, FAILED, ESCALATED, EXPIRED', () => {
      const valid = getValidTransitions(CASE_STATES.EXECUTING);
      expect(valid).toContain(CASE_STATES.RECOVERED);
      expect(valid).toContain(CASE_STATES.FAILED);
      expect(valid).toContain(CASE_STATES.ESCALATED);
      expect(valid).toContain(CASE_STATES.EXPIRED);
    });

    it('terminal states have no valid transitions', () => {
      expect(getValidTransitions(CASE_STATES.RECOVERED)).toEqual([]);
      expect(getValidTransitions(CASE_STATES.FAILED)).toEqual([]);
    });
  });

  describe('isValidCaseState', () => {
    it('recognizes valid states', () => {
      expect(isValidCaseState('new')).toBe(true);
      expect(isValidCaseState('analyzing')).toBe(true);
      expect(isValidCaseState('recovered')).toBe(true);
    });

    it('rejects invalid states', () => {
      expect(isValidCaseState('invalid')).toBe(false);
      expect(isValidCaseState('')).toBe(false);
      expect(isValidCaseState('RECOVERED')).toBe(false); // case-sensitive
    });
  });
});
