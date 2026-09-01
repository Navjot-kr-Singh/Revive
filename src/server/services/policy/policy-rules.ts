/**
 * REVIVE — Policy Rules
 * 
 * 12 independently testable, deterministic rule evaluators.
 * Every rule evaluation returns structured metadata with boolean outcome,
 * threshold, actual value, and human-readable explanation.
 */

import { type PolicyContext, type RuleEvaluationResult } from './policy-context';
import { ACTION_TYPES, RECOVERY_RECOMMENDATIONS } from '@/lib/constants';
import { formatMoney } from '@/lib/money';

const FRICTION_LEVEL_ORDER: Record<string, number> = {
  NONE: 0,
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
};

export class PolicyRules {
  /**
   * Rule 1: MAX_RETRY_COUNT
   * Blocks automated retries when merchant attempt budget is exhausted.
   */
  static evaluateMaxRetryCount(context: PolicyContext): RuleEvaluationResult {
    const action = context.candidateAction.actionType.toLowerCase();
    const isRetry = action === ACTION_TYPES.RETRY_PAYMENT || action === RECOVERY_RECOMMENDATIONS.RETRY.toLowerCase();

    if (!isRetry) {
      return {
        ruleName: 'MAX_RETRY_COUNT',
        passed: true,
        thresholdValue: context.merchantPolicy.maxRetryAttempts,
        actualValue: context.caseContext.retryAttemptsCount,
        message: 'Rule not applicable for non-retry action.',
      };
    }

    const currentAttempts = context.caseContext.retryAttemptsCount;
    const maxAttempts = context.merchantPolicy.maxRetryAttempts;
    const passed = currentAttempts < maxAttempts;

    return {
      ruleName: 'MAX_RETRY_COUNT',
      passed,
      thresholdValue: maxAttempts,
      actualValue: currentAttempts,
      message: passed
        ? `Retry attempt count ${currentAttempts} within limit (${maxAttempts}).`
        : `Maximum retry count reached (${currentAttempts}/${maxAttempts}).`,
    };
  }

  /**
   * Rule 2: MAX_CUSTOMER_CONTACTS
   * Prevents customer spam by capping outward notification and payment link attempts.
   */
  static evaluateMaxCustomerContacts(context: PolicyContext): RuleEvaluationResult {
    const action = context.candidateAction.actionType.toLowerCase();
    const isContact =
      action === ACTION_TYPES.CUSTOMER_NOTIFICATION ||
      action === ACTION_TYPES.SEND_PAYMENT_LINK ||
      action === RECOVERY_RECOMMENDATIONS.PAYMENT_LINK.toLowerCase() ||
      action === RECOVERY_RECOMMENDATIONS.CUSTOMER_NOTIFICATION.toLowerCase();

    if (!isContact) {
      return {
        ruleName: 'MAX_CUSTOMER_CONTACTS',
        passed: true,
        thresholdValue: context.merchantPolicy.maxCustomerContacts,
        actualValue: context.caseContext.customerContactsCount,
        message: 'Rule not applicable for non-contact action.',
      };
    }

    const currentContacts = context.caseContext.customerContactsCount;
    const maxContacts = context.merchantPolicy.maxCustomerContacts;
    const passed = currentContacts < maxContacts;

    return {
      ruleName: 'MAX_CUSTOMER_CONTACTS',
      passed,
      thresholdValue: maxContacts,
      actualValue: currentContacts,
      message: passed
        ? `Customer contacts ${currentContacts} within limit (${maxContacts}).`
        : `Maximum customer contacts reached (${currentContacts}/${maxContacts}).`,
    };
  }

  /**
   * Rule 3: MAX_ACTION_AMOUNT
   * Caps maximum monetary value for automated recovery interventions.
   */
  static evaluateMaxActionAmount(context: PolicyContext): RuleEvaluationResult {
    const action = context.candidateAction.actionType.toLowerCase();
    const isPassive =
      action === ACTION_TYPES.NO_ACTION ||
      action === ACTION_TYPES.HUMAN_ESCALATION ||
      action === RECOVERY_RECOMMENDATIONS.MONITOR.toLowerCase();

    if (isPassive) {
      return {
        ruleName: 'MAX_ACTION_AMOUNT',
        passed: true,
        thresholdValue: context.merchantPolicy.maxAutomatedRecoveryMinor,
        actualValue: context.caseContext.amountMinor,
        message: 'Rule not applicable for passive / human review action.',
      };
    }

    const amount = context.caseContext.amountMinor;
    const maxAmount = context.merchantPolicy.maxAutomatedRecoveryMinor;
    const passed = amount <= maxAmount;

    return {
      ruleName: 'MAX_ACTION_AMOUNT',
      passed,
      thresholdValue: maxAmount,
      actualValue: amount,
      message: passed
        ? `Transaction amount ${formatMoney(amount)} within automated ceiling ${formatMoney(maxAmount)}.`
        : `Transaction amount ${formatMoney(amount)} exceeds maximum automated ceiling ${formatMoney(maxAmount)}.`,
    };
  }

  /**
   * Rule 4: MIN_RECOVERY_PROBABILITY
   * Ensures action has a statistically viable probability of recovering revenue.
   */
  static evaluateMinRecoveryProbability(context: PolicyContext): RuleEvaluationResult {
    const action = context.candidateAction.actionType.toLowerCase();
    const isPassive =
      action === ACTION_TYPES.NO_ACTION ||
      action === ACTION_TYPES.HUMAN_ESCALATION ||
      action === RECOVERY_RECOMMENDATIONS.MONITOR.toLowerCase();

    if (isPassive) {
      return {
        ruleName: 'MIN_RECOVERY_PROBABILITY',
        passed: true,
        thresholdValue: context.merchantPolicy.minRecoveryProbability,
        actualValue: context.candidateAction.recoveryProbabilityBps / 10000,
        message: 'Rule not applicable for passive actions.',
      };
    }

    const actualProb = context.candidateAction.recoveryProbabilityBps / 10000;
    const minProb = context.merchantPolicy.minRecoveryProbability;
    const passed = actualProb >= minProb;

    return {
      ruleName: 'MIN_RECOVERY_PROBABILITY',
      passed,
      thresholdValue: minProb,
      actualValue: actualProb,
      message: passed
        ? `Recovery probability ${(actualProb * 100).toFixed(1)}% satisfies minimum threshold ${(minProb * 100).toFixed(1)}%.`
        : `Recovery probability ${(actualProb * 100).toFixed(1)}% is below minimum threshold ${(minProb * 100).toFixed(1)}%.`,
    };
  }

  /**
   * Rule 5: MIN_EXPECTED_VALUE
   * Ensures economic viability (EV > 0).
   */
  static evaluateMinExpectedValue(context: PolicyContext): RuleEvaluationResult {
    const action = context.candidateAction.actionType.toLowerCase();
    if (action === ACTION_TYPES.NO_ACTION || action === ACTION_TYPES.HUMAN_ESCALATION) {
      return {
        ruleName: 'MIN_EXPECTED_VALUE',
        passed: true,
        thresholdValue: 0,
        actualValue: context.candidateAction.expectedNetValueMinor,
        message: 'Passive / review actions are exempt from minimum EV threshold.',
      };
    }

    const ev = context.candidateAction.expectedNetValueMinor;
    const passed = ev > 0;

    return {
      ruleName: 'MIN_EXPECTED_VALUE',
      passed,
      thresholdValue: 0,
      actualValue: ev,
      message: passed
        ? `Expected net value ${formatMoney(ev)} is economically positive.`
        : `Expected net value ${formatMoney(ev)} is non-positive; intervention uneconomic.`,
    };
  }

  /**
   * Rule 6: MAX_CUSTOMER_FRICTION
   * Ensures customer friction does not exceed merchant tolerance.
   */
  static evaluateMaxCustomerFriction(context: PolicyContext): RuleEvaluationResult {
    const allowedFriction = context.merchantPolicy.maxAllowedFriction || 'MEDIUM';
    const actionFriction = context.candidateAction.frictionLevel || 'LOW';

    const allowedRank = FRICTION_LEVEL_ORDER[allowedFriction] ?? 2;
    const actionRank = FRICTION_LEVEL_ORDER[actionFriction] ?? 1;
    const passed = actionRank <= allowedRank;

    return {
      ruleName: 'MAX_CUSTOMER_FRICTION',
      passed,
      thresholdValue: allowedFriction,
      actualValue: actionFriction,
      message: passed
        ? `Action friction ${actionFriction} is within merchant policy tolerance (${allowedFriction}).`
        : `Action friction ${actionFriction} exceeds maximum allowed friction (${allowedFriction}).`,
    };
  }

  /**
   * Rule 7: HIGH_VALUE_ESCALATION
   * Automatically escalates high-value transactions to human review.
   */
  static evaluateHighValueEscalation(context: PolicyContext): RuleEvaluationResult {
    const amount = context.caseContext.amountMinor;
    const highValueThreshold = context.merchantPolicy.highValueThresholdMinor;
    const isHighValue = amount > highValueThreshold;

    const action = context.candidateAction.actionType.toLowerCase();
    const isHumanReview = action === ACTION_TYPES.HUMAN_ESCALATION || action === RECOVERY_RECOMMENDATIONS.HUMAN_ESCALATION.toLowerCase();

    if (isHighValue && !isHumanReview) {
      return {
        ruleName: 'HIGH_VALUE_ESCALATION',
        passed: false,
        isEscalation: true,
        thresholdValue: highValueThreshold,
        actualValue: amount,
        message: `Transaction amount ${formatMoney(amount)} exceeds high-value threshold ${formatMoney(highValueThreshold)}; automated actions restricted. Escalate to human review.`,
      };
    }

    return {
      ruleName: 'HIGH_VALUE_ESCALATION',
      passed: true,
      thresholdValue: highValueThreshold,
      actualValue: amount,
      message: isHighValue
        ? `High-value order properly assigned to human review.`
        : `Transaction amount ${formatMoney(amount)} is within standard threshold.`,
    };
  }

  /**
   * Rule 8: LOW_CONFIDENCE_ESCALATION
   * Triggers human escalation when diagnostic confidence is below required threshold.
   */
  static evaluateLowConfidenceEscalation(context: PolicyContext): RuleEvaluationResult {
    const confidence = context.diagnosisContext?.confidence ?? 1.0;
    const minConfidence = context.merchantPolicy.minConfidence;
    const isLowConfidence = confidence < minConfidence;

    const action = context.candidateAction.actionType.toLowerCase();
    const isHumanReview = action === ACTION_TYPES.HUMAN_ESCALATION || action === RECOVERY_RECOMMENDATIONS.HUMAN_ESCALATION.toLowerCase();

    if (isLowConfidence && !isHumanReview) {
      return {
        ruleName: 'LOW_CONFIDENCE_ESCALATION',
        passed: false,
        isEscalation: true,
        thresholdValue: minConfidence,
        actualValue: confidence,
        message: `Diagnostic confidence ${(confidence * 100).toFixed(1)}% is below required ${(minConfidence * 100).toFixed(1)}%; automated action blocked. Escalate to human review.`,
      };
    }

    return {
      ruleName: 'LOW_CONFIDENCE_ESCALATION',
      passed: true,
      thresholdValue: minConfidence,
      actualValue: confidence,
      message: `Diagnostic confidence ${(confidence * 100).toFixed(1)}% meets safety threshold.`,
    };
  }

  /**
   * Rule 9: INCIDENT_SEVERITY_LIMIT
   * Prevents destructive blind retries during active critical outages on degraded rails.
   */
  static evaluateIncidentSeverityLimit(context: PolicyContext): RuleEvaluationResult {
    const severity = context.incidentContext?.severity;
    const action = context.candidateAction.actionType.toLowerCase();
    const isRetry = action === ACTION_TYPES.RETRY_PAYMENT || action === RECOVERY_RECOMMENDATIONS.RETRY.toLowerCase();

    if (severity === 'critical' && isRetry) {
      return {
        ruleName: 'INCIDENT_SEVERITY_LIMIT',
        passed: false,
        thresholdValue: 'CRITICAL',
        actualValue: severity,
        message: 'Direct payment retries are prohibited during active critical rail degradation.',
      };
    }

    return {
      ruleName: 'INCIDENT_SEVERITY_LIMIT',
      passed: true,
      thresholdValue: 'STANDARD',
      actualValue: severity || 'none',
      message: 'Action permitted under current incident severity constraints.',
    };
  }

  /**
   * Rule 10: ACTION_COOLDOWN
   * Enforces temporal cooldown between consecutive interventions on the same transaction.
   */
  static evaluateActionCooldown(context: PolicyContext): RuleEvaluationResult {
    const lastActionAt = context.caseContext.lastActionAt;
    const cooldownSeconds = context.merchantPolicy.cooldownSeconds ?? 60;

    if (!lastActionAt) {
      return {
        ruleName: 'ACTION_COOLDOWN',
        passed: true,
        thresholdValue: `${cooldownSeconds}s`,
        actualValue: 'none',
        message: 'No previous action executed; cooldown satisfied.',
      };
    }

    const now = context.evaluationTime || new Date();
    const elapsedSeconds = Math.floor((now.getTime() - new Date(lastActionAt).getTime()) / 1000);
    const passed = elapsedSeconds >= cooldownSeconds;

    return {
      ruleName: 'ACTION_COOLDOWN',
      passed,
      thresholdValue: `${cooldownSeconds}s`,
      actualValue: `${elapsedSeconds}s`,
      message: passed
        ? `Cooldown satisfied (${elapsedSeconds}s elapsed, min ${cooldownSeconds}s).`
        : `Action cooldown active (${elapsedSeconds}s elapsed, required ${cooldownSeconds}s).`,
    };
  }

  /**
   * Rule 11: MERCHANT_ACTION_ALLOWLIST
   * Enforces merchant-configured permitted action whitelist.
   */
  static evaluateMerchantActionAllowlist(context: PolicyContext): RuleEvaluationResult {
    const rawAction = context.candidateAction.actionType;
    const allowed = context.merchantPolicy.allowedActions || [];

    // Normalize comparison
    const normalizedAction = rawAction.toLowerCase().replace(/_/g, '');
    const normalizedAllowed = allowed.map((a) => a.toLowerCase().replace(/_/g, ''));

    // NO_ACTION and HUMAN_ESCALATION are always system-permitted
    if (
      normalizedAction.includes('noaction') ||
      normalizedAction.includes('humanescalation') ||
      normalizedAction.includes('monitor')
    ) {
      return {
        ruleName: 'MERCHANT_ACTION_ALLOWLIST',
        passed: true,
        thresholdValue: allowed,
        actualValue: rawAction,
        message: 'Passive / escalation actions are universally allowed.',
      };
    }

    const passed = normalizedAllowed.includes(normalizedAction);

    return {
      ruleName: 'MERCHANT_ACTION_ALLOWLIST',
      passed,
      thresholdValue: allowed,
      actualValue: rawAction,
      message: passed
        ? `Action ${rawAction} is explicitly permitted by merchant policy.`
        : `Action ${rawAction} is disabled in merchant policy settings.`,
    };
  }

  /**
   * Rule 12: DAILY_RECOVERY_BUDGET
   * Caps daily cumulative automated recovery volume.
   */
  static evaluateDailyRecoveryBudget(context: PolicyContext): RuleEvaluationResult {
    const maxDaily = context.merchantPolicy.maxDailyBudgetMinor;
    if (!maxDaily || maxDaily <= 0) {
      return {
        ruleName: 'DAILY_RECOVERY_BUDGET',
        passed: true,
        thresholdValue: 'unlimited',
        actualValue: context.dailyStats?.cumulativeAutomatedMinor ?? 0,
        message: 'No daily automated recovery cap configured.',
      };
    }

    const currentCumulative = context.dailyStats?.cumulativeAutomatedMinor ?? 0;
    const actionAmount = context.caseContext.amountMinor;
    const projected = currentCumulative + actionAmount;
    const passed = projected <= maxDaily;

    return {
      ruleName: 'DAILY_RECOVERY_BUDGET',
      passed,
      thresholdValue: maxDaily,
      actualValue: projected,
      message: passed
        ? `Projected daily recovery ${formatMoney(projected)} is within budget ${formatMoney(maxDaily)}.`
        : `Projected daily recovery ${formatMoney(projected)} exceeds budget ceiling ${formatMoney(maxDaily)}.`,
    };
  }
}
