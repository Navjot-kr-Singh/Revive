import { describe, it, expect } from 'vitest';
import { CounterfactualSimulator } from '@/server/services/recovery/simulator';
import { ACTION_TYPES } from '@/lib/constants';

describe('Counterfactual Recovery Simulator', () => {
  it('simulates 6 candidate interventions with integer minor-unit EV calculations', () => {
    const simulation = CounterfactualSimulator.simulateCase({
      caseId: 'case_sim_001',
      amountMinor: 2499900, // ₹24,999
      failureCode: 'UPI_TIMEOUT',
      paymentMethod: 'upi',
      bank: 'HDFC Bank',
      retryCount: 0,
    });

    expect(simulation.candidates.length).toBe(6);
    expect(simulation.amountMinor).toBe(2499900);

    // Candidates should be ranked descending by EV
    for (let i = 0; i < simulation.candidates.length - 1; i++) {
      expect(simulation.candidates[i].expectedNetValueMinor).toBeGreaterThanOrEqual(
        simulation.candidates[i + 1].expectedNetValueMinor
      );
    }

    // Top action should be ALTERNATIVE_PAYMENT_METHOD (EV ~ ₹9,499.62)
    const top = simulation.candidates[0];
    expect(top.actionType).toBe(ACTION_TYPES.ALTERNATIVE_PAYMENT_METHOD);
    expect(top.expectedRecoveryMinor).toBe(949962);
    expect(top.expectedNetValueMinor).toBe(949762); // 949962 - 100 - 100 - 0

    // Check payment link
    const link = simulation.candidates.find((c) => c.actionType === ACTION_TYPES.SEND_PAYMENT_LINK);
    expect(link).toBeDefined();
    expect(link!.expectedRecoveryMinor).toBe(524979);
    expect(link!.expectedNetValueMinor).toBe(524779); // 524979 - 150 - 50 - 0

    // Check retry payment
    const retry = simulation.candidates.find((c) => c.actionType === ACTION_TYPES.RETRY_PAYMENT);
    expect(retry).toBeDefined();
    expect(retry!.expectedRecoveryMinor).toBe(299988);
    expect(retry!.expectedNetValueMinor).toBe(299838); // 299988 - 50 - 0 - 100
  });

  it('handles zero-dollar cases safely without negative values', () => {
    const simulation = CounterfactualSimulator.simulateCase({
      caseId: 'case_zero_001',
      amountMinor: 0,
      failureCode: 'UPI_TIMEOUT',
      paymentMethod: 'upi',
    });

    expect(simulation.candidates.length).toBe(6);
    expect(simulation.candidates.every((c) => c.expectedRecoveryMinor === 0)).toBe(true);
  });
});
