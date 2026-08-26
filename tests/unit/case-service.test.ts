import { describe, it, expect, beforeAll } from 'vitest';
import { getCases, getCaseById, transitionCase, getRevenueSummary } from '@/server/services/case-service';
import { getDb } from '@/server/db';
import { merchants, revenueCases, auditEvents } from '@/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { runSeed } from '@/server/db/seed';
import { CASE_STATES } from '@/lib/constants';
import { InvalidStateTransitionError } from '@/lib/state-machine';

describe('Case Service & Lifecycle', () => {
  let merchantId: string;
  let activeCaseId: string;

  beforeAll(async () => {
    await runSeed();
    const db = getDb();
    const allMerchants = await db.select().from(merchants);
    merchantId = allMerchants.find((m) => m.slug === 'acme-electronics')!.id;

    const cases = await getCases(merchantId, { status: 'new' });
    activeCaseId = cases.cases[0].id;
  });

  it('retrieves paginated cases for merchant', async () => {
    const result = await getCases(merchantId, { page: 1, limit: 10 });
    expect(result.cases.length).toBeGreaterThan(0);
    expect(result.total).toBeGreaterThanOrEqual(result.cases.length);
  });

  it('filters cases by status', async () => {
    const newCases = await getCases(merchantId, { status: 'new' });
    for (const c of newCases.cases) {
      expect(c.status).toBe('new');
    }
  });

  it('validates and executes state transitions with audit trail', async () => {
    const db = getDb();

    // NEW -> ANALYZING
    const transitioned = await transitionCase(
      merchantId,
      activeCaseId,
      CASE_STATES.ANALYZING,
      'ai_agent',
      { reason: 'Starting automated diagnosis' }
    );

    expect(transitioned.status).toBe(CASE_STATES.ANALYZING);

    // Verify in DB
    const fetched = await getCaseById(merchantId, activeCaseId);
    expect(fetched?.status).toBe(CASE_STATES.ANALYZING);

    // Verify audit event recorded
    const audits = await db
      .select()
      .from(auditEvents)
      .where(
        and(
          eq(auditEvents.entityId, activeCaseId),
          eq(auditEvents.eventType, `case.transitioned_to.${CASE_STATES.ANALYZING}`),
        ),
      );

    expect(audits.length).toBe(1);
    expect(audits[0].actor).toBe('ai_agent');
  });

  it('rejects invalid state transition and preserves state', async () => {
    // Current state is ANALYZING. Transition directly to RECOVERED (skipping SIMULATING, DECISION, EXECUTING) must fail!
    await expect(
      transitionCase(merchantId, activeCaseId, CASE_STATES.RECOVERED)
    ).rejects.toThrow(InvalidStateTransitionError);

    // Verify state unchanged
    const current = await getCaseById(merchantId, activeCaseId);
    expect(current?.status).toBe(CASE_STATES.ANALYZING);
  });

  it('calculates merchant revenue summary accurately', async () => {
    const summary = await getRevenueSummary(merchantId);
    expect(summary.totalCases).toBeGreaterThanOrEqual(3);
    expect(summary.totalAtRiskMinor).toBeGreaterThan(0);
    expect(summary.currency).toBe('INR');
    expect(summary.recoveryRate).toBeGreaterThanOrEqual(0);
    expect(summary.recoveryRate).toBeLessThanOrEqual(1);
  });
});
