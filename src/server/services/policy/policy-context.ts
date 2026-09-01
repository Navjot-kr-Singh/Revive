/**
 * REVIVE — Policy Context & Evaluation Types
 * 
 * Defines the structured inputs and outputs for deterministic policy evaluation.
 */

export interface MerchantPolicyConfig {
  id: string;
  merchantId: string;
  policyVersion: string;
  policyHash?: string;
  maxRetryAttempts: number;
  maxCustomerContacts: number;
  maxDiscountPercent: number;
  maxAutomatedRecoveryMinor: number;
  highValueThresholdMinor: number;
  minRecoveryProbability: number; // 0..1
  minConfidence: number; // 0..1
  allowedActions: string[];
  cooldownSeconds?: number;
  maxDailyBudgetMinor?: number;
  maxAllowedFriction?: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';
  isActive: boolean;
}

export interface CaseEvaluationContext {
  caseId: string;
  merchantId: string;
  amountMinor: number;
  currency: string;
  failureCode: string;
  paymentMethod: string;
  bank?: string;
  retryAttemptsCount: number;
  customerContactsCount: number;
  lastActionAt?: Date | null;
  customerHistory?: {
    isVip?: boolean;
    totalOrdersCount?: number;
    successRate?: number;
  };
}

export interface IncidentEvaluationContext {
  incidentId?: string;
  severity?: string;
  status?: string;
  rootCauseCandidate?: string;
  affectedSegment?: {
    bank?: string;
    paymentMethod?: string;
    primaryFailureCode?: string;
  } | null;
}

export interface DiagnosisEvaluationContext {
  primaryDiagnosis?: string;
  confidence: number;
  isFallback?: boolean;
}

export interface CandidateActionContext {
  actionType: string;
  recoveryProbabilityBps: number;
  expectedRecoveryMinor: number;
  actionCostMinor: number;
  frictionPenaltyMinor: number;
  riskPenaltyMinor: number;
  expectedNetValueMinor: number;
  frictionLevel: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';
  stoppingCondition?: string;
}

export interface PolicyContext {
  merchantPolicy: MerchantPolicyConfig;
  caseContext: CaseEvaluationContext;
  incidentContext?: IncidentEvaluationContext;
  diagnosisContext?: DiagnosisEvaluationContext;
  candidateAction: CandidateActionContext;
  dailyStats?: {
    cumulativeAutomatedMinor: number;
  };
  evaluationTime?: Date;
}

export interface RuleEvaluationResult {
  ruleName: string;
  passed: boolean;
  isEscalation?: boolean;
  thresholdValue: unknown;
  actualValue: unknown;
  message: string;
}

export type PolicyDecisionResult = 'ALLOW' | 'DENY' | 'ESCALATE';

export interface PolicyEvaluationOutput {
  policyId: string;
  policyVersion: string;
  policyHash: string;
  actionType: string;
  result: PolicyDecisionResult;
  reason: string;
  rulesEvaluated: RuleEvaluationResult[];
  evaluatedAt: string;
  maximumAllowedAction?: string;
  stoppingCondition: string;
}
