import { describe, it, expect } from 'vitest';
import { PolicyRules } from '@/server/services/policy/policy-rules';
import { PolicyEvaluator } from '@/server/services/policy/policy-evaluator';
import { PolicyEngine } from '@/server/services/policy/policy-engine';
import { type MerchantPolicyConfig, type PolicyContext } from '@/server/services/policy/policy-context';
import { ACTION_TYPES, DEFAULT_POLICY } from '@/lib/constants';

describe('Deterministic Policy Engine & 12 Rules', () => {
  const merchantPolicy: MerchantPolicyConfig = {
    id: '00000000-0000-0000-0000-000000000001',
    merchantId: 'merchant_001',
    policyVersion: 'POLICY-DEFAULT-V1',
    maxRetryAttempts: 2,
    maxCustomerContacts: 1,
    maxDiscountPercent: 10,
    maxAutomatedRecoveryMinor: 5000000, // ₹50,000
    highValueThresholdMinor: 5000000, // ₹50,000
    minRecoveryProbability: 0.15, // 15%
    minConfidence: 0.85,
    allowedActions: [ACTION_TYPES.RETRY_PAYMENT, ACTION_TYPES.SEND_PAYMENT_LINK, ACTION_TYPES.CUSTOMER_NOTIFICATION],
    cooldownSeconds: 60,
    maxDailyBudgetMinor: 50000000,
    maxAllowedFriction: 'MEDIUM',
    isActive: true,
  };

  function getBaseContext(): PolicyContext {
    return {
      merchantPolicy,
      caseContext: {
        caseId: 'case_001',
        merchantId: 'merchant_001',
        amountMinor: 2499900, // ₹24,999
        currency: 'INR',
        failureCode: 'UPI_TIMEOUT',
        paymentMethod: 'upi',
        bank: 'HDFC Bank',
        retryAttemptsCount: 0,
        customerContactsCount: 0,
      },
      candidateAction: {
        actionType: ACTION_TYPES.SEND_PAYMENT_LINK,
        recoveryProbabilityBps: 2100,
        expectedRecoveryMinor: 524979,
        actionCostMinor: 150,
        frictionPenaltyMinor: 50,
        riskPenaltyMinor: 0,
        expectedNetValueMinor: 524779,
        frictionLevel: 'LOW',
      },
    };
  }

  it('Rule 1: MAX_RETRY_COUNT blocks retries when count >= maxRetryAttempts', () => {
    const ctx = getBaseContext();
    ctx.candidateAction.actionType = ACTION_TYPES.RETRY_PAYMENT;
    ctx.caseContext.retryAttemptsCount = 2;

    const res = PolicyRules.evaluateMaxRetryCount(ctx);
    expect(res.passed).toBe(false);
    expect(res.actualValue).toBe(2);
    expect(res.thresholdValue).toBe(2);
  });

  it('Rule 2: MAX_CUSTOMER_CONTACTS blocks contacts when count >= maxCustomerContacts', () => {
    const ctx = getBaseContext();
    ctx.caseContext.customerContactsCount = 1;

    const res = PolicyRules.evaluateMaxCustomerContacts(ctx);
    expect(res.passed).toBe(false);
    expect(res.actualValue).toBe(1);
    expect(res.thresholdValue).toBe(1);
  });

  it('Rule 3: MAX_ACTION_AMOUNT blocks automated interventions above threshold', () => {
    const ctx = getBaseContext();
    ctx.caseContext.amountMinor = 6000000; // ₹60,000 > ₹50,000

    const res = PolicyRules.evaluateMaxActionAmount(ctx);
    expect(res.passed).toBe(false);
  });

  it('Rule 4: MIN_RECOVERY_PROBABILITY blocks actions with probability below threshold', () => {
    const ctx = getBaseContext();
    ctx.candidateAction.recoveryProbabilityBps = 1000; // 10% < 15%

    const res = PolicyRules.evaluateMinRecoveryProbability(ctx);
    expect(res.passed).toBe(false);
  });

  it('Rule 5: MIN_EXPECTED_VALUE blocks actions with EV <= 0', () => {
    const ctx = getBaseContext();
    ctx.candidateAction.expectedNetValueMinor = -50;

    const res = PolicyRules.evaluateMinExpectedValue(ctx);
    expect(res.passed).toBe(false);
  });

  it('Rule 6: MAX_CUSTOMER_FRICTION blocks HIGH friction when max is MEDIUM', () => {
    const ctx = getBaseContext();
    ctx.candidateAction.frictionLevel = 'HIGH';

    const res = PolicyRules.evaluateMaxCustomerFriction(ctx);
    expect(res.passed).toBe(false);
  });

  it('Rule 7: HIGH_VALUE_ESCALATION escalates transactions > highValueThresholdMinor', () => {
    const ctx = getBaseContext();
    ctx.caseContext.amountMinor = 7500000; // ₹75,000

    const res = PolicyRules.evaluateHighValueEscalation(ctx);
    expect(res.passed).toBe(false);
    expect(res.isEscalation).toBe(true);
  });

  it('Rule 8: LOW_CONFIDENCE_ESCALATION escalates when diagnosis confidence is below threshold', () => {
    const ctx = getBaseContext();
    ctx.diagnosisContext = { confidence: 0.60 }; // 60% < 85%

    const res = PolicyRules.evaluateLowConfidenceEscalation(ctx);
    expect(res.passed).toBe(false);
    expect(res.isEscalation).toBe(true);
  });

  it('Rule 9: INCIDENT_SEVERITY_LIMIT blocks retries during critical outages', () => {
    const ctx = getBaseContext();
    ctx.candidateAction.actionType = ACTION_TYPES.RETRY_PAYMENT;
    ctx.incidentContext = { severity: 'critical' };

    const res = PolicyRules.evaluateIncidentSeverityLimit(ctx);
    expect(res.passed).toBe(false);
  });

  it('Rule 10: ACTION_COOLDOWN blocks interventions when cooldown is active', () => {
    const ctx = getBaseContext();
    ctx.caseContext.lastActionAt = new Date(Date.now() - 20000); // 20s ago < 60s
    ctx.evaluationTime = new Date();

    const res = PolicyRules.evaluateActionCooldown(ctx);
    expect(res.passed).toBe(false);
  });

  it('Rule 11: MERCHANT_ACTION_ALLOWLIST denies actions not in allowlist', () => {
    const ctx = getBaseContext();
    ctx.candidateAction.actionType = ACTION_TYPES.ALTERNATIVE_PAYMENT_METHOD; // Not in merchantPolicy.allowedActions

    const res = PolicyRules.evaluateMerchantActionAllowlist(ctx);
    expect(res.passed).toBe(false);
  });

  it('Rule 12: DAILY_RECOVERY_BUDGET enforces daily automated ceiling', () => {
    const ctx = getBaseContext();
    ctx.dailyStats = { cumulativeAutomatedMinor: 49000000 };
    ctx.caseContext.amountMinor = 2499900; // 49000000 + 2499900 > 50000000

    const res = PolicyRules.evaluateDailyRecoveryBudget(ctx);
    expect(res.passed).toBe(false);
  });

  it('PolicyEvaluator returns ALLOW when all rules pass', () => {
    const ctx = getBaseContext();
    const output = PolicyEvaluator.evaluate(ctx);
    expect(output.result).toBe('ALLOW');
    expect(output.policyVersion).toBe('POLICY-DEFAULT-V1');
    expect(output.policyHash).toBeDefined();
    expect(output.rulesEvaluated.length).toBe(12);
  });

  it('computes deterministic SHA-256 hash for versioned policies', () => {
    const hash1 = PolicyEngine.computePolicyHash(merchantPolicy);
    const hash2 = PolicyEngine.computePolicyHash(merchantPolicy);
    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64);
  });
});
