import { describe, it, expect, beforeAll } from 'vitest';
import { InvestigationService } from '@/server/services/investigation-service';
import { runSeed } from '@/server/db/seed';
import { getDb } from '@/server/db';
import { merchants, incidents, investigations, aiRuns, auditEvents } from '@/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { INVESTIGATION_STATES } from '@/lib/constants';

describe('Investigation Service & AI Execution Audit', () => {
  let acmeId: string;
  let globexId: string;
  let incidentId: string;

  beforeAll(async () => {
    await runSeed();
    const db = getDb();
    const all = await db.select().from(merchants);
    acmeId = all.find((m) => m.slug === 'acme-electronics')!.id;
    globexId = all.find((m) => m.slug === 'globex-retail')!.id;

    // Create an incident for Acme
    const [inc] = await db
      .insert(incidents)
      .values({
        merchantId: acmeId,
        title: 'HDFC Bank UPI Degradation',
        incidentType: 'payment_degradation',
        severity: 'critical',
        affectedSegment: { bank: 'HDFC Bank', paymentMethod: 'upi', primaryFailureCode: 'BANK_TIMEOUT' },
        baselineMetrics: { failureRate: 0.021 },
        observedMetrics: { failureRate: 0.217, relativeChange: 10.32 },
        revenueAtRiskMinor: 147730009,
        affectedTransactionCount: 119,
      })
      .returning();

    incidentId = inc.id;
  });

  it('runs complete end-to-end investigation and records audit trails', async () => {
    const result = await InvestigationService.runInvestigation(acmeId, incidentId);

    expect(result.investigationId).toBeDefined();
    expect(result.status).toBe(INVESTIGATION_STATES.RECOMMENDATIONS_READY);
    expect(result.primaryDiagnosis).toBeTruthy();
    expect(result.confidence).toBeGreaterThan(0.70);
    expect(result.evidence.length).toBeGreaterThan(0);
    expect(result.hypotheses.length).toBeGreaterThan(0);
    expect(result.recommendations.length).toBeGreaterThan(0);
    expect(result.timeline.length).toBeGreaterThanOrEqual(4);

    const db = getDb();

    // Verify DB investigation record
    const [inv] = await db
      .select()
      .from(investigations)
      .where(eq(investigations.id, result.investigationId));

    expect(inv).toBeDefined();
    expect(inv.status).toBe(INVESTIGATION_STATES.RECOMMENDATIONS_READY);

    // Verify AI Runs audit ledger
    const runs = await db
      .select()
      .from(aiRuns)
      .where(eq(aiRuns.investigationId, result.investigationId));

    expect(runs.length).toBe(1);
    expect(runs[0].promptId).toBe('incident-investigator');
    expect(runs[0].promptVersion).toBe('v1.0.0');
    expect(runs[0].inputHash).toBeTruthy();
    expect(runs[0].outputHash).toBeTruthy();

    // Verify audit_events append
    const audits = await db
      .select()
      .from(auditEvents)
      .where(and(eq(auditEvents.entityId, result.investigationId), eq(auditEvents.eventType, 'investigation.completed')));

    expect(audits.length).toBe(1);
  });

  it('enforces multi-tenant isolation on investigation queries', async () => {
    // Acme can view its latest investigation
    const acmeInv = await InvestigationService.getLatestInvestigation(acmeId, incidentId);
    expect(acmeInv).toBeDefined();
    expect(acmeInv?.aiRun).toBeDefined();

    // Globex cannot query Acme's investigation
    const globexInv = await InvestigationService.getLatestInvestigation(globexId, incidentId);
    expect(globexInv).toBeNull();
  });
});
