/**
 * REVIVE — Incident Service & Lifecycle Engine
 * 
 * Handles incident creation, deterministic deduplication/fingerprinting,
 * signal ingestion, case-to-incident correlation, state transitions, and audit logging.
 */

import { getDb } from '@/server/db';
import { incidents, incidentSignals, revenueCases } from '@/server/db/schema';
import { eq, and, desc, inArray, sql } from 'drizzle-orm';
import { createHash } from 'crypto';
import {
  INCIDENT_STATES,
  VALID_INCIDENT_TRANSITIONS,
  type IncidentState,
  EVENT_TYPES,
} from '@/lib/constants';
import { createAuditEvent } from '../audit-service';
import { type DetectionSignal } from './incident-detector';

export class InvalidIncidentTransitionError extends Error {
  constructor(public readonly currentState: IncidentState, public readonly targetState: IncidentState) {
    super(`Invalid incident transition: ${currentState} → ${targetState}`);
    this.name = 'InvalidIncidentTransitionError';
  }
}

/**
 * Deterministic fingerprint for incident deduplication across sliding windows.
 */
export function computeIncidentFingerprint(
  merchantId: string,
  paymentMethod: string,
  bank: string,
  primaryFailureCode?: string
): string {
  const raw = `${merchantId}:${paymentMethod.toLowerCase()}:${bank.toLowerCase()}:${(primaryFailureCode || 'ANY').toLowerCase()}`;
  return createHash('sha256').update(raw).digest('hex').slice(0, 32);
}

export class IncidentService {
  /**
   * Process a detection signal.
   * If anomaly: creates or updates a deduplicated active incident.
   */
  static async processSignal(signal: DetectionSignal): Promise<{
    incidentId: string;
    isNewIncident: boolean;
    linkedCasesCount: number;
  }> {
    const db = getDb();
    const fingerprint = computeIncidentFingerprint(
      signal.merchantId,
      signal.paymentMethod,
      signal.bank,
      signal.primaryFailureCode
    );

    // 1. Look for existing active incident with same fingerprint
    const activeStates = [
      INCIDENT_STATES.DETECTED,
      INCIDENT_STATES.INVESTIGATING,
      INCIDENT_STATES.CONFIRMED,
      INCIDENT_STATES.MITIGATING,
      INCIDENT_STATES.MONITORING,
    ];

    const existingList = await db
      .select()
      .from(incidents)
      .where(
        and(
          eq(incidents.merchantId, signal.merchantId),
          eq(incidents.fingerprint, fingerprint),
          inArray(incidents.status, activeStates)
        )
      )
      .limit(1);

    let incidentId: string;
    let isNew = false;

    if (existingList.length > 0) {
      // ─── Deduplication: Update existing incident ─────────────────
      const existing = existingList[0];
      incidentId = existing.id;

      const updatedRevenueAtRisk = existing.revenueAtRiskMinor + signal.revenueAtRiskMinor;
      const updatedTxCount = existing.affectedTransactionCount + signal.failedCount;
      const updatedGmv = existing.affectedGmvMinor + signal.totalGmvMinor;

      await db
        .update(incidents)
        .set({
          revenueAtRiskMinor: updatedRevenueAtRisk,
          revenueImpactMinor: updatedRevenueAtRisk,
          affectedTransactionCount: updatedTxCount,
          affectedGmvMinor: updatedGmv,
          observedMetrics: {
            failureRate: signal.observedValue,
            recentFailedCount: signal.failedCount,
            recentTotalCount: signal.transactionCount,
            relativeChange: signal.relativeChange,
          },
          updatedAt: new Date(),
        })
        .where(eq(incidents.id, incidentId));

      await createAuditEvent({
        merchantId: signal.merchantId,
        entityType: 'incident',
        entityId: incidentId,
        eventType: EVENT_TYPES.INCIDENT_UPDATED,
        actor: 'incident_detector',
        data: {
          additionalRevenueAtRisk: signal.revenueAtRiskMinor,
          newObservedFailureRate: signal.observedValue,
          totalRevenueAtRiskMinor: updatedRevenueAtRisk,
        },
      });
    } else {
      // ─── Create New Incident ─────────────────────────────────────
      isNew = true;
      const title = `${signal.bank} ${signal.paymentMethod.toUpperCase()} Degradation`;
      const description = `Failure rate jumped from ${(signal.baselineValue * 100).toFixed(1)}% to ${(signal.observedValue * 100).toFixed(1)}% (${signal.relativeChange}x baseline). Primary error: ${signal.primaryFailureCode || 'UNKNOWN'}.`;

      const [created] = await db
        .insert(incidents)
        .values({
          merchantId: signal.merchantId,
          incidentType: 'payment_degradation',
          title,
          description,
          status: INCIDENT_STATES.DETECTED,
          severity: signal.severity,
          fingerprint,
          affectedSegment: {
            bank: signal.bank,
            paymentMethod: signal.paymentMethod,
            primaryFailureCode: signal.primaryFailureCode,
          },
          baselineMetrics: {
            failureRate: signal.baselineValue,
            normalSuccessRate: 1 - signal.baselineValue,
          },
          observedMetrics: {
            failureRate: signal.observedValue,
            relativeChange: signal.relativeChange,
            failedCount: signal.failedCount,
            totalCount: signal.transactionCount,
          },
          revenueAtRiskMinor: signal.revenueAtRiskMinor,
          revenueImpactMinor: signal.revenueAtRiskMinor,
          affectedTransactionCount: signal.failedCount,
          affectedGmvMinor: signal.totalGmvMinor,
          rootCauseCandidate: `${signal.bank} PSP / UPI switch gateway timeout`,
          confidence: signal.confidence,
          detectionRule: signal.detectionRule,
          currency: 'INR',
          startedAt: signal.windowStart,
          detectedAt: new Date(),
        })
        .returning();

      incidentId = created.id;

      await createAuditEvent({
        merchantId: signal.merchantId,
        entityType: 'incident',
        entityId: incidentId,
        eventType: EVENT_TYPES.INCIDENT_DETECTED,
        actor: 'incident_detector',
        data: {
          severity: signal.severity,
          revenueAtRiskMinor: signal.revenueAtRiskMinor,
          bank: signal.bank,
          paymentMethod: signal.paymentMethod,
          baselineRate: signal.baselineValue,
          observedRate: signal.observedValue,
        },
      });
    }

    // 2. Record the raw Detection Signal
    await db.insert(incidentSignals).values({
      incidentId,
      merchantId: signal.merchantId,
      dimension: signal.dimension,
      dimensionValue: `${signal.bank}:${signal.paymentMethod}`,
      windowStart: signal.windowStart,
      windowEnd: signal.windowEnd,
      baselineValue: signal.baselineValue,
      observedValue: signal.observedValue,
      delta: signal.delta,
      relativeChange: signal.relativeChange,
      transactionCount: signal.transactionCount,
      affectedGmvMinor: signal.totalGmvMinor,
      severity: signal.severity,
      confidence: signal.confidence,
      detectionRule: signal.detectionRule,
      detectedAt: signal.detectedAt,
    });

    // 3. Correlate unlinked revenue cases to this incident
    const linkedCount = await this.correlateCasesToIncident(
      signal.merchantId,
      incidentId,
      signal.bank,
      signal.paymentMethod,
      signal.primaryFailureCode
    );

    return {
      incidentId,
      isNewIncident: isNew,
      linkedCasesCount: linkedCount,
    };
  }

  /**
   * Link unassociated revenue cases matching the incident segment to the incident.
   */
  static async correlateCasesToIncident(
    merchantId: string,
    incidentId: string,
    bank: string,
    _paymentMethod: string,
    failureCode?: string
  ): Promise<number> {
    const db = getDb();
    
    // Find unassociated cases for this merchant with matching failure code
    const conditions = [
      eq(revenueCases.merchantId, merchantId),
      sql`${revenueCases.incidentId} IS NULL`,
    ];

    if (failureCode) {
      conditions.push(eq(revenueCases.failureCode, failureCode));
    }

    const unlinkedCases = await db
      .select({ id: revenueCases.id })
      .from(revenueCases)
      .where(and(...conditions))
      .limit(100);

    if (unlinkedCases.length === 0) return 0;

    const caseIds = unlinkedCases.map((c) => c.id);
    await db
      .update(revenueCases)
      .set({ incidentId, updatedAt: new Date() })
      .where(inArray(revenueCases.id, caseIds));

    // Update case count on incident
    await db
      .update(incidents)
      .set({
        casesCreated: sql`${incidents.casesCreated} + ${caseIds.length}`,
        updatedAt: new Date(),
      })
      .where(eq(incidents.id, incidentId));

    return caseIds.length;
  }

  /**
   * Transition an incident to a new state with strict state machine validation.
   */
  static async transitionIncident(
    merchantId: string,
    incidentId: string,
    targetState: IncidentState,
    actor: string = 'system',
    data?: Record<string, unknown>
  ) {
    const db = getDb();

    // 1. Fetch current incident
    const [current] = await db
      .select()
      .from(incidents)
      .where(and(eq(incidents.id, incidentId), eq(incidents.merchantId, merchantId)))
      .limit(1);

    if (!current) {
      throw new Error(`Incident ${incidentId} not found for merchant ${merchantId}`);
    }

    // 2. Validate transition
    const validNextStates = VALID_INCIDENT_TRANSITIONS[current.status as IncidentState] || [];
    if (!validNextStates.includes(targetState)) {
      throw new InvalidIncidentTransitionError(current.status as IncidentState, targetState);
    }

    // 3. Update status
    const isTerminal = targetState === INCIDENT_STATES.RESOLVED || targetState === INCIDENT_STATES.DISMISSED || targetState === INCIDENT_STATES.FALSE_POSITIVE;

    await db
      .update(incidents)
      .set({
        status: targetState,
        updatedAt: new Date(),
        ...(isTerminal ? { resolvedAt: new Date() } : {}),
      })
      .where(and(eq(incidents.id, incidentId), eq(incidents.merchantId, merchantId)));

    // 4. Audit event
    await createAuditEvent({
      merchantId,
      entityType: 'incident',
      entityId: incidentId,
      eventType: `incident.${targetState}`,
      actor,
      data: { from: current.status, to: targetState, ...data },
    });

    return { ...current, status: targetState };
  }

  /**
   * List incidents for a merchant with tenant isolation and optional filtering.
   */
  static async getIncidents(
    merchantId: string,
    options: {
      status?: string;
      severity?: string;
      page?: number;
      limit?: number;
    } = {}
  ) {
    const db = getDb();
    const page = options.page ?? 1;
    const limit = Math.min(options.limit ?? 20, 100);
    const offset = (page - 1) * limit;

    const conditions = [eq(incidents.merchantId, merchantId)];
    if (options.status) {
      conditions.push(eq(incidents.status, options.status));
    }
    if (options.severity) {
      conditions.push(eq(incidents.severity, options.severity));
    }

    const [items, countResult] = await Promise.all([
      db
        .select()
        .from(incidents)
        .where(and(...conditions))
        .orderBy(desc(incidents.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(incidents)
        .where(and(...conditions)),
    ]);

    return {
      incidents: items,
      total: countResult[0]?.count ?? 0,
      page,
      limit,
    };
  }

  /**
   * Get single incident by ID with tenant isolation.
   */
  static async getIncidentById(merchantId: string, incidentId: string) {
    const db = getDb();
    const [result] = await db
      .select()
      .from(incidents)
      .where(and(eq(incidents.id, incidentId), eq(incidents.merchantId, merchantId)))
      .limit(1);

    return result ?? null;
  }

  /**
   * Get cases linked to a specific incident.
   */
  static async getIncidentCases(merchantId: string, incidentId: string) {
    const db = getDb();
    return db
      .select()
      .from(revenueCases)
      .where(and(eq(revenueCases.incidentId, incidentId), eq(revenueCases.merchantId, merchantId)))
      .orderBy(desc(revenueCases.createdAt))
      .limit(100);
  }

  /**
   * Get signals recorded for a specific incident.
   */
  static async getIncidentSignals(merchantId: string, incidentId: string) {
    const db = getDb();
    return db
      .select()
      .from(incidentSignals)
      .where(and(eq(incidentSignals.incidentId, incidentId), eq(incidentSignals.merchantId, merchantId)))
      .orderBy(desc(incidentSignals.createdAt))
      .limit(50);
  }

  /**
   * Get incident summary metrics for merchant dashboard.
   */
  static async getIncidentMetrics(merchantId: string) {
    const db = getDb();
    const activeStates = [
      INCIDENT_STATES.DETECTED,
      INCIDENT_STATES.INVESTIGATING,
      INCIDENT_STATES.CONFIRMED,
      INCIDENT_STATES.MITIGATING,
      INCIDENT_STATES.MONITORING,
    ];

    const result = await db
      .select({
        totalIncidents: sql<number>`count(*)::int`,
        activeIncidents: sql<number>`count(*) filter (where ${inArray(incidents.status, activeStates)})::int`,
        criticalIncidents: sql<number>`count(*) filter (where ${eq(incidents.severity, 'critical')} and ${inArray(incidents.status, activeStates)})::int`,
        totalRevenueAtRiskMinor: sql<number>`coalesce(sum(${incidents.revenueAtRiskMinor}) filter (where ${inArray(incidents.status, activeStates)}), 0)::bigint`,
      })
      .from(incidents)
      .where(eq(incidents.merchantId, merchantId));

    const metrics = result[0];
    return {
      totalIncidents: metrics?.totalIncidents ?? 0,
      activeIncidents: metrics?.activeIncidents ?? 0,
      criticalIncidents: metrics?.criticalIncidents ?? 0,
      totalRevenueAtRiskMinor: Number(metrics?.totalRevenueAtRiskMinor ?? 0),
      currency: 'INR',
    };
  }
}
