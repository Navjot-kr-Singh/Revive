/**
 * REVIVE — Revenue Case Service
 * 
 * Business logic for revenue case management.
 * All queries enforce merchant_id for tenant isolation.
 */

import { getDb } from '@/server/db';
import { revenueCases } from '@/server/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { validateTransition, type CaseState } from '@/lib/state-machine';
import { CASE_STATES } from '@/lib/constants';
import { createAuditEvent } from './audit-service';

/**
 * Get revenue cases for a merchant with pagination.
 * ENFORCES merchant_id — never returns cross-tenant data.
 */
export async function getCases(
  merchantId: string,
  options: {
    status?: string;
    caseType?: string;
    page?: number;
    limit?: number;
  } = {},
) {
  const db = getDb();
  const page = options.page ?? 1;
  const limit = Math.min(options.limit ?? 20, 100);
  const offset = (page - 1) * limit;

  // Build conditions — always start with merchant_id
  const conditions = [eq(revenueCases.merchantId, merchantId)];
  
  if (options.status) {
    conditions.push(eq(revenueCases.status, options.status));
  }
  if (options.caseType) {
    conditions.push(eq(revenueCases.caseType, options.caseType));
  }

  const [cases, countResult] = await Promise.all([
    db.select()
      .from(revenueCases)
      .where(and(...conditions))
      .orderBy(desc(revenueCases.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)::int` })
      .from(revenueCases)
      .where(and(...conditions)),
  ]);

  return {
    cases,
    total: countResult[0]?.count ?? 0,
    page,
    limit,
  };
}

/**
 * Get a single case by ID.
 * ENFORCES merchant_id — returns null if merchant doesn't own the case.
 */
export async function getCaseById(merchantId: string, caseId: string) {
  const db = getDb();

  const result = await db.select()
    .from(revenueCases)
    .where(
      and(
        eq(revenueCases.id, caseId),
        eq(revenueCases.merchantId, merchantId),
      )
    )
    .limit(1);

  return result[0] ?? null;
}

/**
 * Transition a case to a new state.
 * Validates the transition against the state machine.
 * Creates an audit event.
 */
export async function transitionCase(
  merchantId: string,
  caseId: string,
  targetState: CaseState,
  actor: string = 'system',
  data?: Record<string, unknown>,
) {
  const db = getDb();

  // Get current case
  const current = await getCaseById(merchantId, caseId);
  if (!current) {
    throw new Error(`Case ${caseId} not found for merchant ${merchantId}`);
  }

  // Validate transition
  validateTransition(current.status as CaseState, targetState);

  // Update state
  await db.update(revenueCases)
    .set({
      status: targetState,
      updatedAt: new Date(),
      ...(targetState === CASE_STATES.RECOVERED || targetState === CASE_STATES.FAILED || 
          targetState === CASE_STATES.EXPIRED || targetState === CASE_STATES.STOPPED
        ? { resolvedAt: new Date() } : {}),
    })
    .where(
      and(
        eq(revenueCases.id, caseId),
        eq(revenueCases.merchantId, merchantId),
      )
    );

  // Audit
  await createAuditEvent({
    merchantId,
    entityType: 'revenue_case',
    entityId: caseId,
    eventType: `case.transitioned_to.${targetState}`,
    actor,
    data: { from: current.status, to: targetState, ...data },
  });

  return { ...current, status: targetState };
}

/**
 * Get revenue summary for a merchant.
 * Used by the dashboard.
 */
export async function getRevenueSummary(merchantId: string) {
  const db = getDb();

  const result = await db.select({
    totalCases: sql<number>`count(*)::int`,
    totalAtRiskMinor: sql<number>`coalesce(sum(${revenueCases.amountAtRiskMinor}), 0)::bigint`,
    totalRecoveredMinor: sql<number>`coalesce(sum(${revenueCases.actualRecoveryMinor}), 0)::bigint`,
    activeCases: sql<number>`count(*) filter (where ${revenueCases.status} not in ('recovered', 'failed', 'expired', 'stopped'))::int`,
    recoveredCases: sql<number>`count(*) filter (where ${revenueCases.status} = 'recovered')::int`,
  })
    .from(revenueCases)
    .where(eq(revenueCases.merchantId, merchantId));

  const summary = result[0];
  const totalCases = summary?.totalCases ?? 0;
  const recoveredCases = summary?.recoveredCases ?? 0;

  return {
    totalCases,
    activeCases: summary?.activeCases ?? 0,
    recoveredCases,
    totalAtRiskMinor: Number(summary?.totalAtRiskMinor ?? 0),
    totalRecoveredMinor: Number(summary?.totalRecoveredMinor ?? 0),
    recoveryRate: totalCases > 0 ? recoveredCases / totalCases : 0,
    currency: 'INR',
  };
}
