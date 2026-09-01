/**
 * REVIVE — Policy Evaluator
 * 
 * Deterministically evaluates candidate recovery interventions against merchant policy rules.
 * Produces ALLOW, DENY, or ESCALATE with a full audit breakdown of rules evaluated.
 */

import { type PolicyContext, type PolicyEvaluationOutput, type RuleEvaluationResult } from './policy-context';
import { PolicyRules } from './policy-rules';
import { createHash } from 'crypto';

export class PolicyEvaluator {
  /**
   * Deterministically evaluate a candidate action against merchant policy rules.
   */
  static evaluate(context: PolicyContext): PolicyEvaluationOutput {
    const rulesEvaluated: RuleEvaluationResult[] = [
      PolicyRules.evaluateMerchantActionAllowlist(context),
      PolicyRules.evaluateHighValueEscalation(context),
      PolicyRules.evaluateLowConfidenceEscalation(context),
      PolicyRules.evaluateMaxActionAmount(context),
      PolicyRules.evaluateMaxRetryCount(context),
      PolicyRules.evaluateMaxCustomerContacts(context),
      PolicyRules.evaluateIncidentSeverityLimit(context),
      PolicyRules.evaluateMinRecoveryProbability(context),
      PolicyRules.evaluateMinExpectedValue(context),
      PolicyRules.evaluateMaxCustomerFriction(context),
      PolicyRules.evaluateActionCooldown(context),
      PolicyRules.evaluateDailyRecoveryBudget(context),
    ];

    const escalationRules = rulesEvaluated.filter((r) => !r.passed && r.isEscalation);
    const failedRules = rulesEvaluated.filter((r) => !r.passed && !r.isEscalation);

    let result: 'ALLOW' | 'DENY' | 'ESCALATE' = 'ALLOW';
    let reason = 'All policy constraints and safety limits satisfied.';

    if (escalationRules.length > 0) {
      result = 'ESCALATE';
      reason = escalationRules.map((r) => r.message).join(' ');
    } else if (failedRules.length > 0) {
      result = 'DENY';
      reason = failedRules.map((r) => r.message).join(' ');
    }

    const policyString = JSON.stringify({
      policyVersion: context.merchantPolicy.policyVersion,
      maxRetries: context.merchantPolicy.maxRetryAttempts,
      maxContacts: context.merchantPolicy.maxCustomerContacts,
      maxAutomatedRecovery: context.merchantPolicy.maxAutomatedRecoveryMinor,
      highValueThreshold: context.merchantPolicy.highValueThresholdMinor,
      minProbability: context.merchantPolicy.minRecoveryProbability,
      minConfidence: context.merchantPolicy.minConfidence,
      allowedActions: context.merchantPolicy.allowedActions,
    });

    const policyHash = context.merchantPolicy.policyHash || createHash('sha256').update(policyString).digest('hex');

    const stoppingCondition =
      context.candidateAction.stoppingCondition ||
      'Stop after one successful recovery confirmation or 24-hour case TTL expiry.';

    return {
      policyId: context.merchantPolicy.id,
      policyVersion: context.merchantPolicy.policyVersion,
      policyHash,
      actionType: context.candidateAction.actionType,
      result,
      reason,
      rulesEvaluated,
      evaluatedAt: (context.evaluationTime || new Date()).toISOString(),
      maximumAllowedAction: context.merchantPolicy.allowedActions.join(', '),
      stoppingCondition,
    };
  }
}
