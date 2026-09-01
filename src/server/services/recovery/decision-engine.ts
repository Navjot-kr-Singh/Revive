/**
 * REVIVE — Recovery Decision Engine
 * 
 * Selects the economically optimal, policy-permitted recovery intervention.
 * Enforces Constrained Autonomy:
 * AI Recommends -> Simulator Evaluates -> Policy Decides -> Decision Engine Selects.
 * 
 * Generates structured 6-question human-readable explanations and persists
 * immutable decision records.
 * 
 * IMPORTANT: Decision Engine NEVER executes financial actions.
 */

import { getDb } from '@/server/db';
import { revenueCases, recoveryDecisions, auditEvents, incidents, investigations, payments } from '@/server/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { CounterfactualSimulator, type SimulationCandidate, type SimulationResult } from './simulator';
import { PolicyEngine } from '../policy/policy-engine';
import { PolicyEvaluator } from '../policy/policy-evaluator';
import { type PolicyEvaluationOutput, type PolicyContext } from '../policy/policy-context';
import { CASE_STATES, ACTION_TYPES } from '@/lib/constants';
import { formatMoney } from '@/lib/money';

export interface DecisionExplanation {
  whatChosen: string;
  whyChosen: string;
  whatConsidered: string[];
  whyAlternativesRejected: Array<{ action: string; reason: string }>;
  whatPolicyAllowed: string;
  whatCausesStop: string;
}

export interface DecisionResult {
  decisionId: string;
  caseId: string;
  merchantId: string;
  investigationId?: string | null;
  selectedAction: string;
  decisionStatus: 'approved' | 'escalated' | 'no_action' | 'denied';
  expectedRecoveryMinor: number;
  expectedCostMinor: number;
  expectedFrictionMinor: number;
  expectedRiskMinor: number;
  expectedNetValueMinor: number;
  recoveryProbabilityBps: number;
  policyId: string;
  policyVersion: string;
  policyHash: string;
  policyResult: string;
  reason: string;
  explanation: DecisionExplanation;
  simulationSnapshot: SimulationResult;
  decisionModelVersion: string;
  createdAt: string;
}

export class DecisionEngine {
  static readonly DECISION_MODEL_VERSION = 'revive-decision-v1.2.0';

  /**
   * Evaluate a revenue case, rank candidate interventions, evaluate policy, and record immutable decision.
   */
  static async decideCase(merchantId: string, caseId: string): Promise<DecisionResult> {
    const db = getDb();

    // 1. Fetch Case and verify tenant ownership
    const [c] = await db
      .select()
      .from(revenueCases)
      .where(and(eq(revenueCases.id, caseId), eq(revenueCases.merchantId, merchantId)));

    if (!c) {
      throw new Error(`Case not found or unauthorized: ${caseId}`);
    }

    // 2. Fetch associated payment if available
    let paymentMethod = 'upi';
    let bank = 'HDFC Bank';
    if (c.paymentId) {
      const [p] = await db
        .select()
        .from(payments)
        .where(and(eq(payments.id, c.paymentId), eq(payments.merchantId, merchantId)));
      if (p) {
        if (p.paymentMethod) paymentMethod = p.paymentMethod;
        if (p.bank) bank = p.bank;
      }
    }

    // 3. Fetch associated incident and diagnosis if available
    let incidentSeverity: string | undefined;
    let primaryDiagnosis: string | undefined;
    let diagnosisConfidence = 0.95;
    let investigationId: string | null = null;

    if (c.incidentId) {
      const [inc] = await db
        .select()
        .from(incidents)
        .where(and(eq(incidents.id, c.incidentId), eq(incidents.merchantId, merchantId)));

      if (inc) {
        incidentSeverity = inc.severity;
        const [inv] = await db
          .select()
          .from(investigations)
          .where(and(eq(investigations.incidentId, inc.id), eq(investigations.merchantId, merchantId)))
          .orderBy(desc(investigations.createdAt))
          .limit(1);

        if (inv) {
          investigationId = inv.id;
          primaryDiagnosis = inv.primaryDiagnosis || undefined;
          diagnosisConfidence = inv.confidence || 0.95;
        }
      }
    }

    // 4. Fetch active merchant policy
    const merchantPolicy = await PolicyEngine.getMerchantPolicy(merchantId);

    // 5. Run Counterfactual Simulation
    const simulation = CounterfactualSimulator.simulateCase({
      caseId,
      amountMinor: c.amountAtRiskMinor,
      currency: c.currency,
      failureCode: c.failureCode || 'BANK_TIMEOUT',
      paymentMethod,
      bank,
      retryCount: c.retryCount || 0,
      customerContactsCount: c.customerContacts || 0,
      timeSinceFailureSeconds: Math.floor((Date.now() - c.createdAt.getTime()) / 1000),
      incidentSeverity,
    });

    // 6. Evaluate Policy for Candidates in Descending EV Order
    let selectedCandidate: SimulationCandidate | null = null;
    let selectedPolicyOutput: PolicyEvaluationOutput | null = null;
    const alternativesRejected: Array<{ action: string; reason: string }> = [];
    const whatConsidered: string[] = simulation.candidates.map((cand) => cand.actionType);

    for (const candidate of simulation.candidates) {
      const policyContext: PolicyContext = {
        merchantPolicy,
        caseContext: {
          caseId,
          merchantId,
          amountMinor: c.amountAtRiskMinor,
          currency: c.currency,
          failureCode: c.failureCode || 'BANK_TIMEOUT',
          paymentMethod,
          bank,
          retryAttemptsCount: c.retryCount || 0,
          customerContactsCount: c.customerContacts || 0,
        },
        incidentContext: {
          incidentId: c.incidentId || undefined,
          severity: incidentSeverity,
        },
        diagnosisContext: {
          primaryDiagnosis,
          confidence: diagnosisConfidence,
        },
        candidateAction: {
          actionType: candidate.actionType,
          recoveryProbabilityBps: candidate.recoveryProbabilityBps,
          expectedRecoveryMinor: candidate.expectedRecoveryMinor,
          actionCostMinor: candidate.actionCostMinor,
          frictionPenaltyMinor: candidate.frictionPenaltyMinor,
          riskPenaltyMinor: candidate.riskPenaltyMinor,
          expectedNetValueMinor: candidate.expectedNetValueMinor,
          frictionLevel: candidate.frictionLevel,
          stoppingCondition: candidate.stoppingCondition,
        },
      };

      const policyEval = PolicyEvaluator.evaluate(policyContext);

      if (policyEval.result === 'ALLOW' && !selectedCandidate) {
        // If candidate EV <= 0 and not NO_ACTION, reject uneconomic candidate
        if (candidate.expectedNetValueMinor <= 0 && candidate.actionType !== ACTION_TYPES.NO_ACTION) {
          alternativesRejected.push({
            action: candidate.actionType,
            reason: `Uneconomic net expected value (${formatMoney(candidate.expectedNetValueMinor)} <= 0).`,
          });
          continue;
        }

        selectedCandidate = candidate;
        selectedPolicyOutput = policyEval;
      } else {
        alternativesRejected.push({
          action: candidate.actionType,
          reason: policyEval.reason,
        });
      }
    }

    // If no candidate permitted, fallback to HUMAN_ESCALATION or NO_ACTION
    if (!selectedCandidate || !selectedPolicyOutput) {
      const escalationCandidate = simulation.candidates.find((cand) => cand.actionType === ACTION_TYPES.HUMAN_ESCALATION) || simulation.candidates[simulation.candidates.length - 1];
      selectedCandidate = escalationCandidate;
      selectedPolicyOutput = {
        policyId: merchantPolicy.id,
        policyVersion: merchantPolicy.policyVersion,
        policyHash: merchantPolicy.policyHash || 'default',
        actionType: escalationCandidate.actionType,
        result: 'ESCALATE',
        reason: 'All automated candidate interventions were denied by merchant policy constraints.',
        rulesEvaluated: [],
        evaluatedAt: new Date().toISOString(),
        stoppingCondition: escalationCandidate.stoppingCondition,
      };
    }

    let decisionStatus: 'approved' | 'escalated' | 'no_action' | 'denied' = 'approved';
    if (selectedPolicyOutput.result === 'ESCALATE') {
      decisionStatus = 'escalated';
    } else if (selectedCandidate.actionType === ACTION_TYPES.NO_ACTION) {
      decisionStatus = 'no_action';
    }

    // 7. Formulate 6-Question Human-Readable Explanation
    const explanation: DecisionExplanation = {
      whatChosen: selectedCandidate.actionType,
      whyChosen: `Highest expected net value (${formatMoney(selectedCandidate.expectedNetValueMinor)}) among policy-eligible recovery interventions with ${(selectedCandidate.recoveryProbability * 100).toFixed(1)}% recovery probability.`,
      whatConsidered,
      whyAlternativesRejected: alternativesRejected,
      whatPolicyAllowed: `Merchant policy ${merchantPolicy.policyVersion} verified all safety thresholds: max retry budget, customer contact limits, and automated value ceilings.`,
      whatCausesStop: selectedCandidate.stoppingCondition,
    };

    // 8. Persist Immutable Decision in recovery_decisions
    const [savedDecision] = await db
      .insert(recoveryDecisions)
      .values({
        caseId,
        merchantId,
        actionType: selectedCandidate.actionType,
        reason: explanation.whyChosen,
        inputSignals: {
          amountMinor: c.amountAtRiskMinor,
          failureCode: c.failureCode,
          diagnosis: primaryDiagnosis,
          confidence: diagnosisConfidence,
          recoveryProbabilityBps: selectedCandidate.recoveryProbabilityBps,
          expectedNetValueMinor: selectedCandidate.expectedNetValueMinor,
          explanation,
          simulationSnapshot: simulation,
        },
        modelVersion: this.DECISION_MODEL_VERSION,
        policyVersion: merchantPolicy.policyVersion,
        confidence: selectedCandidate.confidence,
        expectedRecoveryMinor: selectedCandidate.expectedRecoveryMinor,
        expectedCostMinor: selectedCandidate.actionCostMinor,
        expectedCustomerFriction: selectedCandidate.frictionPenaltyMinor / 100,
        decisionStatus,
        decidedBy: 'revive_decision_engine',
        decidedAt: new Date(),
        currency: c.currency,
      })
      .returning();

    // 9. Update case state
    const nextCaseStatus = decisionStatus === 'escalated' ? CASE_STATES.ESCALATED : CASE_STATES.DECISION_PENDING;
    await db
      .update(revenueCases)
      .set({
        status: nextCaseStatus,
        updatedAt: new Date(),
      })
      .where(eq(revenueCases.id, caseId));

    // 9. Append to Immutable Audit Ledger
    await db.insert(auditEvents).values({
      merchantId,
      entityType: 'recovery_decision',
      entityId: savedDecision.id,
      eventType: 'decision.created',
      actor: 'decision_engine',
      data: {
        caseId,
        selectedAction: selectedCandidate.actionType,
        decisionStatus,
        expectedNetValueMinor: selectedCandidate.expectedNetValueMinor,
        policyVersion: merchantPolicy.policyVersion,
        policyResult: selectedPolicyOutput.result,
        reason: explanation.whyChosen,
      },
    });

    return {
      decisionId: savedDecision.id,
      caseId,
      merchantId,
      investigationId,
      selectedAction: selectedCandidate.actionType,
      decisionStatus,
      expectedRecoveryMinor: selectedCandidate.expectedRecoveryMinor,
      expectedCostMinor: selectedCandidate.actionCostMinor,
      expectedFrictionMinor: selectedCandidate.frictionPenaltyMinor,
      expectedRiskMinor: selectedCandidate.riskPenaltyMinor,
      expectedNetValueMinor: selectedCandidate.expectedNetValueMinor,
      recoveryProbabilityBps: selectedCandidate.recoveryProbabilityBps,
      policyId: merchantPolicy.id,
      policyVersion: merchantPolicy.policyVersion,
      policyHash: merchantPolicy.policyHash || 'default',
      policyResult: selectedPolicyOutput.result,
      reason: explanation.whyChosen,
      explanation,
      simulationSnapshot: simulation,
      decisionModelVersion: this.DECISION_MODEL_VERSION,
      createdAt: savedDecision.createdAt.toISOString(),
    };
  }

  /**
   * Retrieve latest decision for a case
   */
  static async getLatestDecision(merchantId: string, caseId: string): Promise<DecisionResult | null> {
    const db = getDb();
    const [dec] = await db
      .select()
      .from(recoveryDecisions)
      .where(and(eq(recoveryDecisions.caseId, caseId), eq(recoveryDecisions.merchantId, merchantId)))
      .orderBy(desc(recoveryDecisions.createdAt))
      .limit(1);

    if (!dec) return null;

    const signals = (dec.inputSignals as Record<string, unknown>) || {};
    const defaultExplanation: DecisionExplanation = {
      whatChosen: dec.actionType,
      whyChosen: dec.reason,
      whatConsidered: [dec.actionType],
      whyAlternativesRejected: [],
      whatPolicyAllowed: `Merchant policy ${dec.policyVersion || 'v1'}`,
      whatCausesStop: 'Stop upon recovery confirmation or expiry.',
    };

    const explanation = (signals.explanation as DecisionExplanation) || defaultExplanation;
    const simulationSnapshot = (signals.simulationSnapshot as SimulationResult) || {
      caseId: dec.caseId,
      amountMinor: dec.expectedRecoveryMinor || 0,
      currency: 'INR',
      simulatedAt: dec.createdAt.toISOString(),
      simulationVersion: 'revive-sim-v1.2.0',
      candidates: [],
      highestEvAction: {
        actionType: dec.actionType,
        recoveryProbabilityBps: Number(signals.recoveryProbabilityBps) || 0,
        recoveryProbability: 0,
        expectedRecoveryMinor: dec.expectedRecoveryMinor || 0,
        actionCostMinor: dec.expectedCostMinor || 0,
        frictionPenaltyMinor: 0,
        riskPenaltyMinor: 0,
        expectedNetValueMinor: Number(signals.expectedNetValueMinor) || 0,
        frictionLevel: 'LOW',
        confidence: 0.95,
        reason: dec.reason,
        stoppingCondition: 'Stop upon recovery confirmation.',
        modelVersion: 'v1',
      },
    };

    return {
      decisionId: dec.id,
      caseId: dec.caseId,
      merchantId: dec.merchantId,
      selectedAction: dec.actionType,
      decisionStatus: (dec.decisionStatus as 'approved' | 'escalated' | 'no_action' | 'denied') || 'approved',
      expectedRecoveryMinor: dec.expectedRecoveryMinor || 0,
      expectedCostMinor: dec.expectedCostMinor || 0,
      expectedFrictionMinor: Math.round((dec.expectedCustomerFriction || 0) * 100),
      expectedRiskMinor: 0,
      expectedNetValueMinor: Number(signals.expectedNetValueMinor) || 0,
      recoveryProbabilityBps: Number(signals.recoveryProbabilityBps) || 0,
      policyId: '00000000-0000-0000-0000-000000000000',
      policyVersion: dec.policyVersion || 'POLICY-DEFAULT-V1',
      policyHash: 'default',
      policyResult: dec.decisionStatus === 'escalated' ? 'ESCALATE' : 'ALLOW',
      reason: dec.reason,
      explanation,
      simulationSnapshot,
      decisionModelVersion: dec.modelVersion || this.DECISION_MODEL_VERSION,
      createdAt: dec.createdAt.toISOString(),
    };
  }
}
