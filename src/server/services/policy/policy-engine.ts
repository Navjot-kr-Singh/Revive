/**
 * REVIVE — Policy Engine
 * 
 * Master policy management, evaluation, versioning, and execution gating.
 */

import { getDb } from '@/server/db';
import { policies, auditEvents } from '@/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { createHash } from 'crypto';
import {
  type MerchantPolicyConfig,
  type PolicyContext,
  type PolicyEvaluationOutput,
  type CandidateActionContext,
  type CaseEvaluationContext,
} from './policy-context';
import { PolicyEvaluator } from './policy-evaluator';
import { DEFAULT_POLICY, ACTION_TYPES } from '@/lib/constants';

export class PolicyEngine {
  /**
   * Compute deterministic SHA-256 hash of a policy configuration
   */
  static computePolicyHash(policy: Partial<MerchantPolicyConfig>): string {
    const payload = JSON.stringify({
      policyVersion: policy.policyVersion,
      maxRetries: policy.maxRetryAttempts,
      maxContacts: policy.maxCustomerContacts,
      maxDiscount: policy.maxDiscountPercent,
      maxAutomated: policy.maxAutomatedRecoveryMinor,
      highValue: policy.highValueThresholdMinor,
      minProbability: policy.minRecoveryProbability,
      minConfidence: policy.minConfidence,
      allowedActions: [...(policy.allowedActions || [])].sort(),
    });
    return createHash('sha256').update(payload).digest('hex');
  }

  /**
   * Retrieve active policy configuration for a merchant.
   */
  static async getMerchantPolicy(merchantId: string): Promise<MerchantPolicyConfig> {
    const db = getDb();
    const [existing] = await db
      .select()
      .from(policies)
      .where(and(eq(policies.merchantId, merchantId), eq(policies.isActive, true)));

    if (existing) {
      const allowedActions = (existing.allowedActions as string[]) || [
        ACTION_TYPES.SEND_PAYMENT_LINK,
        ACTION_TYPES.RETRY_PAYMENT,
        ACTION_TYPES.CUSTOMER_NOTIFICATION,
        ACTION_TYPES.ALTERNATIVE_PAYMENT_METHOD,
      ];

      const config: MerchantPolicyConfig = {
        id: existing.id,
        merchantId: existing.merchantId,
        policyVersion: existing.policyVersion,
        maxRetryAttempts: existing.maxRetryAttempts,
        maxCustomerContacts: existing.maxCustomerContacts,
        maxDiscountPercent: existing.maxDiscountPercent,
        maxAutomatedRecoveryMinor: existing.maxAutomatedRecoveryMinor,
        highValueThresholdMinor: existing.highValueThresholdMinor,
        minRecoveryProbability: existing.minRecoveryProbability,
        minConfidence: existing.minConfidence,
        allowedActions,
        maxAllowedFriction: 'MEDIUM',
        isActive: existing.isActive,
      };

      config.policyHash = this.computePolicyHash(config);
      return config;
    }

    // Default fallback policy
    const defaultActions = [
      ACTION_TYPES.SEND_PAYMENT_LINK,
      ACTION_TYPES.RETRY_PAYMENT,
      ACTION_TYPES.CUSTOMER_NOTIFICATION,
      ACTION_TYPES.ALTERNATIVE_PAYMENT_METHOD,
    ];

    const defaultConfig: MerchantPolicyConfig = {
      id: '00000000-0000-0000-0000-000000000000',
      merchantId,
      policyVersion: 'POLICY-DEFAULT-V1',
      maxRetryAttempts: DEFAULT_POLICY.MAX_RETRY_ATTEMPTS,
      maxCustomerContacts: DEFAULT_POLICY.MAX_CUSTOMER_CONTACTS,
      maxDiscountPercent: DEFAULT_POLICY.MAX_DISCOUNT_PERCENT,
      maxAutomatedRecoveryMinor: DEFAULT_POLICY.MAX_AUTOMATED_RECOVERY_MINOR,
      highValueThresholdMinor: DEFAULT_POLICY.HIGH_VALUE_THRESHOLD_MINOR,
      minRecoveryProbability: DEFAULT_POLICY.MIN_RECOVERY_PROBABILITY,
      minConfidence: DEFAULT_POLICY.MIN_CONFIDENCE,
      allowedActions: defaultActions,
      maxAllowedFriction: 'MEDIUM',
      isActive: true,
    };

    defaultConfig.policyHash = this.computePolicyHash(defaultConfig);
    return defaultConfig;
  }

  /**
   * Deterministically evaluate candidate action against merchant policy and record audit trail.
   */
  static async evaluateAction(context: PolicyContext): Promise<PolicyEvaluationOutput> {
    const evaluation = PolicyEvaluator.evaluate(context);

    // Audit policy evaluation
    const db = getDb();
    try {
      await db.insert(auditEvents).values({
        merchantId: context.merchantPolicy.merchantId,
        entityType: 'policy',
        entityId: context.merchantPolicy.id,
        eventType: 'policy.evaluated',
        actor: 'policy_engine',
        data: {
          caseId: context.caseContext.caseId,
          actionType: context.candidateAction.actionType,
          policyVersion: evaluation.policyVersion,
          policyHash: evaluation.policyHash,
          result: evaluation.result,
          reason: evaluation.reason,
          rulesSummary: evaluation.rulesEvaluated.map((r) => ({ rule: r.ruleName, passed: r.passed })),
        },
      });
    } catch (err) {
      console.warn('[POLICY_AUDIT_LOG_WARNING]', err);
    }

    return evaluation;
  }

  /**
   * Re-evaluates merchant policy immediately prior to execution.
   * Defends against Policy Mutation races where policy settings changed between decision and execute.
   */
  static async revalidatePolicyBeforeExecution(params: {
    merchantId: string;
    originalPolicyHash?: string;
    caseContext: CaseEvaluationContext;
    candidateAction: CandidateActionContext;
  }): Promise<{ permitted: boolean; reason: string; evaluation: PolicyEvaluationOutput }> {
    const livePolicy = await this.getMerchantPolicy(params.merchantId);

    const context: PolicyContext = {
      merchantPolicy: livePolicy,
      caseContext: params.caseContext,
      candidateAction: params.candidateAction,
      evaluationTime: new Date(),
    };

    const evaluation = PolicyEvaluator.evaluate(context);

    // Check if policy hash mutated
    const isPolicyMutated = params.originalPolicyHash && params.originalPolicyHash !== livePolicy.policyHash;

    if (isPolicyMutated) {
      try {
        const db = getDb();
        await db.insert(auditEvents).values({
          merchantId: params.merchantId,
          entityType: 'policy',
          entityId: livePolicy.id,
          eventType: 'policy_changed_since_decision',
          actor: 'policy_revalidator',
          data: {
            caseId: params.caseContext.caseId,
            originalPolicyHash: params.originalPolicyHash,
            newPolicyHash: livePolicy.policyHash,
            revalidationResult: evaluation.result,
          },
        });
      } catch (err) {
        console.warn('[POLICY_REVALIDATE_AUDIT_WARNING]', err);
      }
    }

    if (evaluation.result !== 'ALLOW') {
      return {
        permitted: false,
        reason: isPolicyMutated
          ? `Policy changed since decision: action is no longer permitted (${evaluation.reason})`
          : evaluation.reason,
        evaluation,
      };
    }

    return {
      permitted: true,
      reason: 'Policy revalidation confirmed action is permitted.',
      evaluation,
    };
  }
}
