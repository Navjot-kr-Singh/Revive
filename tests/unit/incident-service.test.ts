import { describe, it, expect, beforeAll } from 'vitest';
import { IncidentService, InvalidIncidentTransitionError } from '@/server/services/incident/incident-service';
import { runSeed } from '@/server/db/seed';
import { getDb } from '@/server/db';
import { merchants, incidents, revenueCases, auditEvents } from '@/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { INCIDENT_STATES, INCIDENT_SEVERITY, EVENT_TYPES } from '@/lib/constants';
import { type DetectionSignal } from '@/server/services/incident/incident-detector';

describe('Incident Lifecycle, Deduplication & Case Correlation', () => {
  let acmeId: string;
  let globexId: string;

  beforeAll(async () => {
    await runSeed();
    const db = getDb();
    const all = await db.select().from(merchants);
    acmeId = all.find((m) => m.slug === 'acme-electronics')!.id;
    globexId = all.find((m) => m.slug === 'globex-retail')!.id;
  });

  it('creates an incident upon receiving first degradation anomaly signal', async () => {
    const signal1: DetectionSignal = {
      signalId: 'sig_test_001',
      merchantId: acmeId,
      dimension: 'HDFC Bank|upi',
      bank: 'HDFC Bank',
      paymentMethod: 'upi',
      windowStart: new Date(),
      windowEnd: new Date(),
      baselineValue: 0.021,
      observedValue: 0.22,
      delta: 0.199,
      relativeChange: 10.47,
      transactionCount: 200,
      failedCount: 44,
      totalGmvMinor: 60000000,
      revenueAtRiskMinor: 11940000,
      severity: INCIDENT_SEVERITY.CRITICAL,
      confidence: 0.95,
      detectionRule: 'STATISTICAL_RATE_DEVIATION',
      primaryFailureCode: 'BANK_TIMEOUT',
      isAnomaly: true,
      detectedAt: new Date(),
    };

    const result = await IncidentService.processSignal(signal1);

    expect(result.isNewIncident).toBe(true);
    expect(result.incidentId).toBeDefined();

    const db = getDb();
    const [inc] = await db.select().from(incidents).where(eq(incidents.id, result.incidentId));

    expect(inc).toBeDefined();
    expect(inc.status).toBe(INCIDENT_STATES.DETECTED);
    expect(inc.severity).toBe(INCIDENT_SEVERITY.CRITICAL);
    expect(inc.revenueAtRiskMinor).toBe(11940000);
    expect(inc.affectedTransactionCount).toBe(44);

    // Verify audit event
    const audits = await db
      .select()
      .from(auditEvents)
      .where(and(eq(auditEvents.entityId, result.incidentId), eq(auditEvents.eventType, EVENT_TYPES.INCIDENT_DETECTED)));

    expect(audits.length).toBe(1);
  });

  it('deduplicates subsequent signals into the SAME active incident (prevents duplicate incidents)', async () => {
    const db = getDb();

    // Send a 2nd signal for the same merchant + bank + method + failureCode
    const signal2: DetectionSignal = {
      signalId: 'sig_test_002',
      merchantId: acmeId,
      dimension: 'HDFC Bank|upi',
      bank: 'HDFC Bank',
      paymentMethod: 'upi',
      windowStart: new Date(),
      windowEnd: new Date(),
      baselineValue: 0.021,
      observedValue: 0.25,
      delta: 0.229,
      relativeChange: 11.9,
      transactionCount: 150,
      failedCount: 38,
      totalGmvMinor: 45000000,
      revenueAtRiskMinor: 10300000,
      severity: INCIDENT_SEVERITY.CRITICAL,
      confidence: 0.96,
      detectionRule: 'STATISTICAL_RATE_DEVIATION',
      primaryFailureCode: 'BANK_TIMEOUT',
      isAnomaly: true,
      detectedAt: new Date(),
    };

    const result = await IncidentService.processSignal(signal2);

    // MUST NOT create a new incident — attaches to existing
    expect(result.isNewIncident).toBe(false);

    const [inc] = await db.select().from(incidents).where(eq(incidents.id, result.incidentId));
    // Revenue at risk and affected transactions should aggregate
    expect(inc.revenueAtRiskMinor).toBe(11940000 + 10300000);
    expect(inc.affectedTransactionCount).toBe(44 + 38);
  });

  it('executes valid state machine transitions (DETECTED -> INVESTIGATING -> CONFIRMED -> RESOLVED)', async () => {
    const list = await IncidentService.getIncidents(acmeId);
    const incidentId = list.incidents[0].id;

    // 1. DETECTED -> INVESTIGATING
    const step1 = await IncidentService.transitionIncident(acmeId, incidentId, INCIDENT_STATES.INVESTIGATING, 'operator');
    expect(step1.status).toBe(INCIDENT_STATES.INVESTIGATING);

    // 2. INVESTIGATING -> CONFIRMED
    const step2 = await IncidentService.transitionIncident(acmeId, incidentId, INCIDENT_STATES.CONFIRMED, 'operator');
    expect(step2.status).toBe(INCIDENT_STATES.CONFIRMED);

    // 3. CONFIRMED -> RESOLVED
    const step3 = await IncidentService.transitionIncident(acmeId, incidentId, INCIDENT_STATES.RESOLVED, 'operator');
    expect(step3.status).toBe(INCIDENT_STATES.RESOLVED);
  });

  it('rejects invalid state machine transitions', async () => {
    const list = await IncidentService.getIncidents(acmeId);
    const incidentId = list.incidents[0].id; // Currently in RESOLVED terminal state

    // RESOLVED -> INVESTIGATING must be rejected!
    await expect(
      IncidentService.transitionIncident(acmeId, incidentId, INCIDENT_STATES.INVESTIGATING)
    ).rejects.toThrow(InvalidIncidentTransitionError);
  });

  it('enforces multi-tenant isolation on incident queries and mutations', async () => {
    const acmeList = await IncidentService.getIncidents(acmeId);
    const acmeIncidentId = acmeList.incidents[0].id;

    // Globex cannot view Acme's incident
    const unauthorizedGet = await IncidentService.getIncidentById(globexId, acmeIncidentId);
    expect(unauthorizedGet).toBeNull();

    // Globex cannot mutate Acme's incident
    await expect(
      IncidentService.transitionIncident(globexId, acmeIncidentId, INCIDENT_STATES.CONFIRMED)
    ).rejects.toThrow();
  });
});
