/**
 * REVIVE — Recovery Outcome Service
 * 
 * Tracks actual vs expected recovery metrics, outcome observation, and prediction error.
 */

import { getDb } from '@/server/db';
import { revenueCases, recoveryDecisions, recoveryActions, recoveryOutcomes } from '@/server/db/schema';
import { eq, and, sql } from 'drizzle-orm';

export interface RecoveryMetricsSummary {
  revenueAtRiskMinor: number;
  expectedRecoveryMinor: number;
  actualRecoveryMinor: number;
  netRecoveredMinor: number;
  varianceMinor: number;
  recoveryRatePercent: number;
  predictionAccuracyPercent: number;
  policyBlocksCount: number;
  humanEscalationsCount: number;
  actionsExecutedCount: number;
  actionsFailedCount: number;
  currency: string;
}

export class OutcomeService {
  /**
   * Get all observed outcomes for a case
   */
  static async getCaseOutcomes(merchantId: string, caseId: string) {
    const db = getDb();
    return db
      .select()
      .from(recoveryOutcomes)
      .where(and(eq(recoveryOutcomes.caseId, caseId), eq(recoveryOutcomes.merchantId, merchantId)));
  }

  /**
   * Compute aggregate recovery performance metrics for merchant control room
   */
  static async getRecoveryMetrics(merchantId: string): Promise<RecoveryMetricsSummary> {
    const db = getDb();

    // 1. Total Revenue at Risk from Cases
    const [caseStats] = await db
      .select({
        totalAtRisk: sql<number>`coalesce(sum(${revenueCases.amountAtRiskMinor}), 0)::bigint`,
        totalRecovered: sql<number>`coalesce(sum(${revenueCases.actualRecoveryMinor}), 0)::bigint`,
        escalatedCount: sql<number>`count(*) filter (where ${revenueCases.status} = 'escalated')::int`,
      })
      .from(revenueCases)
      .where(eq(revenueCases.merchantId, merchantId));

    // 2. Total Expected Recovery from Decisions
    const [decisionStats] = await db
      .select({
        totalExpected: sql<number>`coalesce(sum(${recoveryDecisions.expectedRecoveryMinor}), 0)::bigint`,
        totalExpectedCost: sql<number>`coalesce(sum(${recoveryDecisions.expectedCostMinor}), 0)::bigint`,
      })
      .from(recoveryDecisions)
      .where(eq(recoveryDecisions.merchantId, merchantId));

    // 3. Action Execution Stats
    const [actionStats] = await db
      .select({
        executedCount: sql<number>`count(*) filter (where ${recoveryActions.status} = 'succeeded')::int`,
        failedCount: sql<number>`count(*) filter (where ${recoveryActions.status} = 'execution_failed')::int`,
        deniedCount: sql<number>`count(*) filter (where ${recoveryActions.status} = 'denied')::int`,
      })
      .from(recoveryActions)
      .where(eq(recoveryActions.merchantId, merchantId));

    const totalAtRiskMinor = Number(caseStats?.totalAtRisk || 0);
    const actualRecoveryMinor = Number(caseStats?.totalRecovered || 0);
    const expectedRecoveryMinor = Number(decisionStats?.totalExpected || 0);
    const expectedCostMinor = Number(decisionStats?.totalExpectedCost || 0);

    const netRecoveredMinor = Math.max(0, actualRecoveryMinor - expectedCostMinor);
    const varianceMinor = actualRecoveryMinor - expectedRecoveryMinor;

    const recoveryRatePercent = totalAtRiskMinor > 0
      ? Number(((actualRecoveryMinor / totalAtRiskMinor) * 100).toFixed(1))
      : 0;

    let predictionAccuracyPercent = 100.0;
    if (actualRecoveryMinor > 0) {
      const errorRatio = Math.abs(varianceMinor) / actualRecoveryMinor;
      predictionAccuracyPercent = Math.max(0, Number(((1 - Math.min(1.0, errorRatio)) * 100).toFixed(1)));
    }

    return {
      revenueAtRiskMinor: totalAtRiskMinor,
      expectedRecoveryMinor,
      actualRecoveryMinor,
      netRecoveredMinor,
      varianceMinor,
      recoveryRatePercent,
      predictionAccuracyPercent,
      policyBlocksCount: actionStats?.deniedCount || 0,
      humanEscalationsCount: caseStats?.escalatedCount || 0,
      actionsExecutedCount: actionStats?.executedCount || 0,
      actionsFailedCount: actionStats?.failedCount || 0,
      currency: 'INR',
    };
  }
}
