/**
 * REVIVE — Counterfactual Recovery Simulator
 * 
 * Simulates candidate recovery interventions without executing them.
 * Calculates Expected Value using integer minor-unit arithmetic:
 * EV = floor(amount_minor * probability_bps / 10000) - cost - friction - risk
 */

import { ACTION_TYPES } from '@/lib/constants';
import { RecoveryModel, type RecoveryModelInput } from './recovery-model';
import { calculateExpectedRecoveryMinor, calculateExpectedNetValueMinor } from '@/lib/money';

export interface SimulationCandidate {
  actionType: string;
  recoveryProbabilityBps: number;
  recoveryProbability: number;
  expectedRecoveryMinor: number;
  actionCostMinor: number;
  frictionPenaltyMinor: number;
  riskPenaltyMinor: number;
  expectedNetValueMinor: number;
  frictionLevel: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';
  confidence: number;
  reason: string;
  stoppingCondition: string;
  modelVersion: string;
}

export interface SimulationResult {
  caseId: string;
  amountMinor: number;
  currency: string;
  simulatedAt: string;
  simulationVersion: string;
  candidates: SimulationCandidate[];
  highestEvAction: SimulationCandidate;
}

export class CounterfactualSimulator {
  static readonly SIMULATION_VERSION = 'revive-sim-v1.2.0';

  /**
   * Intervention parameter profiles (costs and friction in minor units / paise)
   */
  private static readonly INTERVENTION_PROFILES: Record<
    string,
    {
      actionCostMinor: number;
      frictionPenaltyMinor: number;
      riskPenaltyMinor: number;
      frictionLevel: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';
      reason: string;
      stoppingCondition: string;
    }
  > = {
    [ACTION_TYPES.NO_ACTION]: {
      actionCostMinor: 0,
      frictionPenaltyMinor: 0,
      riskPenaltyMinor: 0,
      frictionLevel: 'NONE',
      reason: 'Passive observation; rely on customer organic retry.',
      stoppingCondition: 'Cease when transaction reaches terminal expiry.',
    },
    [ACTION_TYPES.RETRY_PAYMENT]: {
      actionCostMinor: 50, // 50 paise payment gateway ping cost
      frictionPenaltyMinor: 0,
      riskPenaltyMinor: 100, // 100 paise repeat decline risk penalty
      frictionLevel: 'NONE',
      reason: 'Automated background payment retry on original processing rail.',
      stoppingCondition: 'Stop after 1 successful authorization or max 2 retry attempts.',
    },
    [ACTION_TYPES.ALTERNATIVE_PAYMENT_METHOD]: {
      actionCostMinor: 100,
      frictionPenaltyMinor: 100,
      riskPenaltyMinor: 0,
      frictionLevel: 'LOW',
      reason: 'Prompt customer or route traffic to alternate banking switch or card rail.',
      stoppingCondition: 'Halt rail switch when primary bank health check recovers.',
    },
    [ACTION_TYPES.SEND_PAYMENT_LINK]: {
      actionCostMinor: 150, // 150 paise SMS / WhatsApp link generation cost
      frictionPenaltyMinor: 50,
      riskPenaltyMinor: 0,
      frictionLevel: 'LOW',
      reason: 'Generate asynchronous recovery payment link with multi-rail checkout options.',
      stoppingCondition: 'Expire link after 24 hours or immediate customer payment.',
    },
    [ACTION_TYPES.CUSTOMER_NOTIFICATION]: {
      actionCostMinor: 80,
      frictionPenaltyMinor: 200,
      riskPenaltyMinor: 0,
      frictionLevel: 'MEDIUM',
      reason: 'Send transactional push/email alert prompting customer to complete payment.',
      stoppingCondition: 'Limit to 1 notification per transaction failure.',
    },
    [ACTION_TYPES.HUMAN_ESCALATION]: {
      actionCostMinor: 1000, // ₹10.00 human operator handling cost
      frictionPenaltyMinor: 0,
      riskPenaltyMinor: 0,
      frictionLevel: 'NONE',
      reason: 'Queue case for high-touch human account specialist review.',
      stoppingCondition: 'Operator manually resolves or cancels recovery attempt.',
    },
  };

  /**
   * Run pure counterfactual simulation over candidate interventions for a case.
   */
  static simulateCase(params: {
    caseId: string;
    amountMinor: number;
    currency?: string;
    failureCode: string;
    paymentMethod: string;
    bank?: string;
    retryCount?: number;
    customerContactsCount?: number;
    timeSinceFailureSeconds?: number;
    customerHistory?: {
      isVip?: boolean;
      totalOrdersCount?: number;
      successRate?: number;
    };
    incidentSeverity?: string;
  }): SimulationResult {
    const currency = params.currency || 'INR';
    const retryCount = params.retryCount ?? 0;
    const candidates: SimulationCandidate[] = [];

    const actionKeys = [
      ACTION_TYPES.NO_ACTION,
      ACTION_TYPES.RETRY_PAYMENT,
      ACTION_TYPES.ALTERNATIVE_PAYMENT_METHOD,
      ACTION_TYPES.SEND_PAYMENT_LINK,
      ACTION_TYPES.CUSTOMER_NOTIFICATION,
      ACTION_TYPES.HUMAN_ESCALATION,
    ];

    for (const actionType of actionKeys) {
      const profile = this.INTERVENTION_PROFILES[actionType];

      const modelInput: RecoveryModelInput = {
        failureCode: params.failureCode,
        paymentMethod: params.paymentMethod,
        bank: params.bank,
        amountMinor: params.amountMinor,
        retryCount,
        customerContactsCount: params.customerContactsCount,
        timeSinceFailureSeconds: params.timeSinceFailureSeconds,
        customerHistory: params.customerHistory,
        incidentSeverity: params.incidentSeverity,
        actionType,
      };

      const probResult = RecoveryModel.calculateProbability(modelInput);

      const expectedRecoveryMinor = calculateExpectedRecoveryMinor(
        params.amountMinor,
        probResult.probabilityBps
      );

      const expectedNetValueMinor = calculateExpectedNetValueMinor(
        expectedRecoveryMinor,
        profile.actionCostMinor,
        profile.frictionPenaltyMinor,
        profile.riskPenaltyMinor
      );

      candidates.push({
        actionType,
        recoveryProbabilityBps: probResult.probabilityBps,
        recoveryProbability: probResult.probability,
        expectedRecoveryMinor,
        actionCostMinor: profile.actionCostMinor,
        frictionPenaltyMinor: profile.frictionPenaltyMinor,
        riskPenaltyMinor: profile.riskPenaltyMinor,
        expectedNetValueMinor,
        frictionLevel: profile.frictionLevel,
        confidence: probResult.confidence,
        reason: profile.reason,
        stoppingCondition: profile.stoppingCondition,
        modelVersion: probResult.modelVersion,
      });
    }

    // Sort descending by Expected Net Value (EV)
    candidates.sort((a, b) => b.expectedNetValueMinor - a.expectedNetValueMinor);

    return {
      caseId: params.caseId,
      amountMinor: params.amountMinor,
      currency,
      simulatedAt: new Date().toISOString(),
      simulationVersion: this.SIMULATION_VERSION,
      candidates,
      highestEvAction: candidates[0],
    };
  }
}
