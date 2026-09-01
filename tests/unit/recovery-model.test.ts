import { describe, it, expect } from 'vitest';
import { RecoveryModel } from '@/server/services/recovery/recovery-model';
import { ACTION_TYPES } from '@/lib/constants';

describe('Statistical Recovery Model & Probability Calibration', () => {
  it('calculates deterministic calibrated probabilities for HDFC UPI hero case', () => {
    const input = {
      failureCode: 'UPI_TIMEOUT',
      paymentMethod: 'upi',
      bank: 'HDFC Bank',
      amountMinor: 2499900,
      retryCount: 0,
      customerContactsCount: 0,
      actionType: ACTION_TYPES.ALTERNATIVE_PAYMENT_METHOD,
    };

    const res = RecoveryModel.calculateProbability(input);
    expect(res.probabilityBps).toBe(3800); // 38%
    expect(res.probability).toBe(0.38);
    expect(res.modelVersion).toBe(RecoveryModel.MODEL_VERSION);
  });

  it('applies retry decay factor diminishing subsequent retry probabilities', () => {
    const res0 = RecoveryModel.calculateProbability({
      failureCode: 'BANK_TIMEOUT',
      paymentMethod: 'upi',
      amountMinor: 2499900,
      retryCount: 0,
      actionType: ACTION_TYPES.RETRY_PAYMENT,
    });

    const res1 = RecoveryModel.calculateProbability({
      failureCode: 'BANK_TIMEOUT',
      paymentMethod: 'upi',
      amountMinor: 2499900,
      retryCount: 1,
      actionType: ACTION_TYPES.RETRY_PAYMENT,
    });

    expect(res1.probabilityBps).toBeLessThan(res0.probabilityBps);
  });

  it('boosts probability for VIP customers with positive order history', () => {
    const baseRes = RecoveryModel.calculateProbability({
      failureCode: 'CARD_DECLINED',
      paymentMethod: 'card_debit',
      amountMinor: 500000,
      retryCount: 0,
      actionType: ACTION_TYPES.SEND_PAYMENT_LINK,
    });

    const vipRes = RecoveryModel.calculateProbability({
      failureCode: 'CARD_DECLINED',
      paymentMethod: 'card_debit',
      amountMinor: 500000,
      retryCount: 0,
      actionType: ACTION_TYPES.SEND_PAYMENT_LINK,
      customerHistory: {
        isVip: true,
        totalOrdersCount: 10,
        successRate: 0.95,
      },
    });

    expect(vipRes.probabilityBps).toBeGreaterThan(baseRes.probabilityBps);
  });

  it('computes Brier score calibration metric accurately', () => {
    const predictions = [
      { predictedBps: 8000, actualRecovered: true }, // 0.8 vs 1.0 -> (0.2)^2 = 0.04
      { predictedBps: 2000, actualRecovered: false }, // 0.2 vs 0.0 -> (0.2)^2 = 0.04
    ];

    const score = RecoveryModel.computeBrierScore(predictions);
    expect(score).toBe(0.04);
  });
});
