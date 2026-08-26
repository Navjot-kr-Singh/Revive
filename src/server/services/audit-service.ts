/**
 * REVIVE — Audit Service
 * 
 * Append-only audit ledger for decision traceability.
 * Every state change, decision, and action is recorded.
 */

import { getDb } from '@/server/db';
import { auditEvents } from '@/server/db/schema';

export interface AuditEventInput {
  merchantId: string;
  entityType: string;
  entityId: string;
  eventType: string;
  actor?: string;
  data?: Record<string, unknown>;
  correlationId?: string;
}

/**
 * Create an append-only audit event.
 * This function NEVER updates or deletes existing audit records.
 */
export async function createAuditEvent(input: AuditEventInput): Promise<string> {
  const db = getDb();

  const result = await db.insert(auditEvents).values({
    merchantId: input.merchantId,
    entityType: input.entityType,
    entityId: input.entityId,
    eventType: input.eventType,
    actor: input.actor ?? 'system',
    data: input.data ?? {},
    correlationId: input.correlationId,
  }).returning({ id: auditEvents.id });

  return result[0].id;
}

/**
 * Get audit trail for a specific entity.
 * Enforces merchant_id for tenant isolation.
 */
export async function getAuditTrail(
  merchantId: string,
  entityType: string,
  entityId: string,
) {
  const db = getDb();
  const { eq, and, desc } = await import('drizzle-orm');

  return db.select()
    .from(auditEvents)
    .where(
      and(
        eq(auditEvents.merchantId, merchantId),
        eq(auditEvents.entityType, entityType),
        eq(auditEvents.entityId, entityId),
      )
    )
    .orderBy(desc(auditEvents.createdAt));
}
