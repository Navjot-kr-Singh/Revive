import { describe, it, expect, vi } from 'vitest';
import { PolicyEngine } from '@/server/services/policy/policy-engine';
import { ACTION_TYPES } from '@/lib/constants';

describe('Policy Mutation Defense', () => {
  it('blocks execution when merchant policy changed after decision was created', async () => {
    // Scenario: Decision was made under POLICY-V1 where alternative payment was permitted (hash: original_hash)
    // Merchant changes policy to POLICY-V2 disabling alternative payment
    vi.spyOn(PolicyEngine, 'getMerchantPolicy').mockResolvedValue({
      id: '00000000-0000-0000-0000-000000000002',
      merchantId: '00000000-0000-0000-0000-000000000001',
      policyVersion: 'POLICY-ENTERPRISE-V2',
      policyHash: 'new_mutated_hash_456',
      maxRetryAttempts: 2,
      maxCustomerContacts: 1,
      maxDiscountPercent: 10,
      maxAutomatedRecoveryMinor: 5000000,
      highValueThresholdMinor: 5000000,
      minRecoveryProbability: 0.15,
      minConfidence: 0.85,
      allowedActions: [ACTION_TYPES.RETRY_PAYMENT, ACTION_TYPES.SEND_PAYMENT_LINK], // alternative payment removed!
      isActive: true,
    });

    const reval = await PolicyEngine.revalidatePolicyBeforeExecution({
      merchantId: '00000000-0000-0000-0000-000000000001',
      originalPolicyHash: 'original_hash_123',
      caseContext: {
        caseId: 'case_001',
        merchantId: '00000000-0000-0000-0000-000000000001',
        amountMinor: 2499900,
        currency: 'INR',
        failureCode: 'UPI_TIMEOUT',
        paymentMethod: 'upi',
        bank: 'HDFC Bank',
        retryAttemptsCount: 0,
        customerContactsCount: 0,
      },
      candidateAction: {
        actionType: ACTION_TYPES.ALTERNATIVE_PAYMENT_METHOD,
        recoveryProbabilityBps: 3800,
        expectedRecoveryMinor: 949962,
        actionCostMinor: 100,
        frictionPenaltyMinor: 100,
        riskPenaltyMinor: 0,
        expectedNetValueMinor: 949762,
        frictionLevel: 'LOW',
      },
    });

    expect(reval.permitted).toBe(false);
    expect(reval.reason).toContain('Policy changed since decision');
  });
});
