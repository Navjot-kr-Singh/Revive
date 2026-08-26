import { describe, it, expect, beforeAll } from 'vitest';
import { EvidenceCollector } from '@/ai/investigation/evidence-collector';
import { runSeed } from '@/server/db/seed';
import { getDb } from '@/server/db';
import { merchants, incidents } from '@/server/db/schema';
import { EVIDENCE_TYPES, EVIDENCE_BUDGET } from '@/lib/constants';

describe('Evidence Engine & Collector', () => {
  let merchantId: string;
  let incidentId: string;

  beforeAll(async () => {
    await runSeed();
    const db = getDb();
    const [acme] = await db.select().from(merchants);
    merchantId = acme.id;

    // Create a mock incident for testing
    const [inc] = await db
      .insert(incidents)
      .values({
        merchantId,
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

  it('collects multi-dimensional evidence items with sequential IDs conforming to format', async () => {
    const collector = new EvidenceCollector(merchantId, incidentId);
    const { evidence, toolCalls, budgetExceeded } = await collector.collectAll();

    expect(evidence.length).toBeGreaterThan(4);
    expect(evidence.length).toBeLessThanOrEqual(EVIDENCE_BUDGET.MAX_EVIDENCE_ITEMS);
    expect(toolCalls).toBeLessThanOrEqual(EVIDENCE_BUDGET.MAX_TOOL_CALLS);
    expect(budgetExceeded).toBe(false);

    // Verify evidence ID formats
    for (const item of evidence) {
      expect(item.evidenceId).toMatch(/^E-\d{3,}$/);
      expect(item.incidentId).toBe(incidentId);
      expect(item.confidence).toBeGreaterThan(0);
      expect(item.confidence).toBeLessThanOrEqual(1.0);
      expect(item.relevance).toBeGreaterThan(0);
      expect(item.description).toBeTruthy();
    }

    // Verify key evidence types exist
    const types = evidence.map((e) => e.type);
    expect(types).toContain(EVIDENCE_TYPES.PAYMENT_METRIC);
    expect(types).toContain(EVIDENCE_TYPES.BANK_SIGNAL);
    expect(types).toContain(EVIDENCE_TYPES.PAYMENT_METHOD_SIGNAL);
    expect(types).toContain(EVIDENCE_TYPES.HISTORICAL_PATTERN);
  });

  it('strictly rejects cross-tenant evidence collection queries', async () => {
    const db = getDb();
    const all = await db.select().from(merchants);
    const globex = all.find((m) => m.slug === 'globex-retail')!;

    // Globex attempts to collect evidence for Acme's incident
    const unauthorizedCollector = new EvidenceCollector(globex.id, incidentId);
    await expect(unauthorizedCollector.collectAll()).rejects.toThrow();
  });
});
