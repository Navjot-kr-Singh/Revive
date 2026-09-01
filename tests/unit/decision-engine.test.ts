import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DecisionEngine } from '@/server/services/recovery/decision-engine';
import { PolicyEngine } from '@/server/services/policy/policy-engine';
import { ACTION_TYPES } from '@/lib/constants';

const mockCase = {
  id: 'case_mock_001',
  merchantId: 'merchant_mock_001',
  paymentId: null,
  amountAtRiskMinor: 2499900,
  currency: 'INR',
  failureCode: 'UPI_TIMEOUT',
  paymentMethod: 'upi',
  bank: 'HDFC Bank',
  retryCount: 0,
  customerContacts: 0,
  createdAt: new Date(),
};

// Mock DB
vi.mock('@/server/db', () => ({
  getDb: () => {
    const mockQuery: any = Promise.resolve([mockCase]);
    mockQuery.from = () => mockQuery;
    mockQuery.where = () => mockQuery;
    mockQuery.orderBy = () => mockQuery;
    mockQuery.limit = () => Promise.resolve([mockCase]);

    return {
      select: () => mockQuery,
      insert: () => ({
        values: () => ({
          returning: () => Promise.resolve([
            {
              id: 'dec_mock_001',
              createdAt: new Date(),
            },
          ]),
        }),
      }),
      update: () => ({
        set: () => ({
          where: () => Promise.resolve(),
        }),
      }),
    };
  },
}));

describe('Decision Engine & Constrained Autonomy', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('selects payment link when alternative payment is prohibited by policy', async () => {
    // Mock merchant policy with rail switching disabled
    vi.spyOn(PolicyEngine, 'getMerchantPolicy').mockResolvedValue({
      id: 'pol_mock_001',
      merchantId: 'merchant_mock_001',
      policyVersion: 'POLICY-CONSERVATIVE-V1',
      policyHash: 'mock_hash_123',
      maxRetryAttempts: 2,
      maxCustomerContacts: 1,
      maxDiscountPercent: 10,
      maxAutomatedRecoveryMinor: 5000000,
      highValueThresholdMinor: 5000000,
      minRecoveryProbability: 0.15,
      minConfidence: 0.85,
      allowedActions: [ACTION_TYPES.RETRY_PAYMENT, ACTION_TYPES.SEND_PAYMENT_LINK], // Alternative payment disabled
      isActive: true,
    });

    const decision = await DecisionEngine.decideCase('merchant_mock_001', 'case_mock_001');

    expect(decision.selectedAction).toBe(ACTION_TYPES.SEND_PAYMENT_LINK);
    expect(decision.decisionStatus).toBe('approved');
    expect(decision.expectedNetValueMinor).toBe(524779); // ₹5,247.79

    // Explanation should answer all 6 questions
    expect(decision.explanation.whatChosen).toBe(ACTION_TYPES.SEND_PAYMENT_LINK);
    expect(decision.explanation.whyChosen).toBeDefined();
    expect(decision.explanation.whatConsidered.length).toBe(6);
    expect(decision.explanation.whatPolicyAllowed).toBeDefined();
    expect(decision.explanation.whatCausesStop).toBeDefined();

    // Verify Alternative Rail was recorded in rejected alternatives
    const altRejection = decision.explanation.whyAlternativesRejected.find(
      (r) => r.action === ACTION_TYPES.ALTERNATIVE_PAYMENT_METHOD
    );
    expect(altRejection).toBeDefined();
  });
});
