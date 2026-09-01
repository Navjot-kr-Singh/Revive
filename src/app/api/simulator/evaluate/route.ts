import { NextRequest, NextResponse } from 'next/server';
import { CounterfactualSimulator, type SimulationCandidate } from '@/server/services/recovery/simulator';
import { PolicyEvaluator } from '@/server/services/policy/policy-evaluator';
import { DEFAULT_POLICY, ACTION_TYPES } from '@/lib/constants';
import { toMinorUnits } from '@/lib/money';

/**
 * POST /api/simulator/evaluate
 * Interactive sandbox endpoint to run counterfactual simulation and policy gating
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      amountMajor = 24999,
      currency = 'INR',
      paymentMethod = 'upi',
      bank = 'HDFC Bank',
      failureCode = 'UPI_TIMEOUT',
      retryAttemptsCount = 0,
      customerContactsCount = 0,
    } = body;

    const amountMinor = toMinorUnits(amountMajor, currency);

    // 1. Run Counterfactual Simulator
    const simResult = CounterfactualSimulator.simulateCase({
      caseId: 'sim_sandbox_case',
      amountMinor,
      currency,
      failureCode,
      paymentMethod,
      bank,
      retryCount: retryAttemptsCount,
      customerContactsCount,
    });

    const mockMerchantPolicy = {
      id: 'pol_demo',
      merchantId: '00000000-0000-0000-0000-000000000000',
      policyVersion: 'POLICY-SANDBOX-V1.0',
      policyHash: 'hash_sandbox_001',
      maxRetryAttempts: DEFAULT_POLICY.MAX_RETRY_ATTEMPTS,
      maxCustomerContacts: DEFAULT_POLICY.MAX_CUSTOMER_CONTACTS,
      maxDiscountPercent: DEFAULT_POLICY.MAX_DISCOUNT_PERCENT,
      maxAutomatedRecoveryMinor: DEFAULT_POLICY.MAX_AUTOMATED_RECOVERY_MINOR,
      highValueThresholdMinor: DEFAULT_POLICY.HIGH_VALUE_THRESHOLD_MINOR,
      minRecoveryProbability: DEFAULT_POLICY.MIN_RECOVERY_PROBABILITY,
      minConfidence: DEFAULT_POLICY.MIN_CONFIDENCE,
      allowedActions: [
        ACTION_TYPES.RETRY_PAYMENT,
        ACTION_TYPES.SEND_PAYMENT_LINK,
        ACTION_TYPES.ALTERNATIVE_PAYMENT_METHOD,
        ACTION_TYPES.CUSTOMER_NOTIFICATION,
        ACTION_TYPES.HUMAN_ESCALATION,
        ACTION_TYPES.NO_ACTION,
      ],
      isActive: true,
    };

    // 2. Evaluate Policy for each candidate
    const evaluatedCandidates = simResult.candidates.map((cand: SimulationCandidate) => {
      const policyResult = PolicyEvaluator.evaluate({
        merchantPolicy: mockMerchantPolicy,
        caseContext: {
          caseId: 'sim_sandbox_case',
          merchantId: '00000000-0000-0000-0000-000000000000',
          amountMinor,
          currency,
          failureCode,
          paymentMethod,
          bank,
          retryAttemptsCount,
          customerContactsCount,
        },
        candidateAction: {
          actionType: cand.actionType,
          recoveryProbabilityBps: cand.recoveryProbabilityBps,
          expectedRecoveryMinor: cand.expectedRecoveryMinor,
          actionCostMinor: cand.actionCostMinor,
          frictionPenaltyMinor: cand.frictionPenaltyMinor,
          riskPenaltyMinor: cand.riskPenaltyMinor,
          expectedNetValueMinor: cand.expectedNetValueMinor,
          frictionLevel: cand.frictionLevel,
          stoppingCondition: cand.stoppingCondition,
        },
      });

      const failedRules = policyResult.rulesEvaluated.filter((r) => !r.passed).map((r) => r.ruleName);
      const passedRules = policyResult.rulesEvaluated.filter((r) => r.passed).map((r) => r.ruleName);
      const isPermitted = policyResult.result === 'ALLOW';

      return {
        ...cand,
        policyPermitted: isPermitted,
        failedRules,
        passedRules,
        evaluationReason: policyResult.reason,
      };
    });

    const selected = evaluatedCandidates.find((c: { policyPermitted: boolean }) => c.policyPermitted) || null;

    return NextResponse.json({
      amountMinor,
      amountMajor,
      currency,
      inputContext: {
        paymentMethod,
        bank,
        failureCode,
        retryAttemptsCount,
        customerContactsCount,
      },
      candidates: evaluatedCandidates,
      selectedAction: selected ? selected.actionType : 'NO_ACTION',
      selectedNetEVMinor: selected ? selected.expectedNetValueMinor : 0,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Simulation evaluation failed';
    return NextResponse.json({ error: { code: 'SIMULATION_ERROR', message: msg } }, { status: 500 });
  }
}
