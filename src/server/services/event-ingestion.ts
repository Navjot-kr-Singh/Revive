/**
 * REVIVE — Event Ingestion Service
 * 
 * Handles idempotent ingestion of payment/revenue events.
 * Duplicate events (same source + source_event_id) are detected and rejected.
 */

import { getDb } from '@/server/db';
import { paymentEvents, revenueCases } from '@/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { createHash } from 'crypto';
import { PROCESSING_STATUS, EVENT_TYPES, CASE_TYPES, CASE_PRIORITY, DEFAULT_POLICY } from '@/lib/constants';
import { createAuditEvent } from './audit-service';

export interface IngestEventInput {
  eventId: string;
  eventType: string;
  source: string;
  sourceEventId: string;
  merchantId: string;
  payload: Record<string, unknown>;
  timestamp?: string;
}

export interface IngestEventResult {
  eventId: string;
  processingStatus: string;
  caseId?: string;
  isDuplicate: boolean;
}

/**
 * Compute SHA-256 hash of the event payload for deduplication.
 */
function computePayloadHash(payload: Record<string, unknown>): string {
  const canonical = JSON.stringify(payload, Object.keys(payload).sort());
  return createHash('sha256').update(canonical).digest('hex');
}

/**
 * Determine case priority based on amount.
 */
function determinePriority(amountMinor: number): string {
  if (amountMinor >= DEFAULT_POLICY.HIGH_VALUE_THRESHOLD_MINOR) return CASE_PRIORITY.CRITICAL;
  if (amountMinor >= 1_000_000) return CASE_PRIORITY.HIGH; // ₹10,000+
  if (amountMinor >= 100_000) return CASE_PRIORITY.MEDIUM; // ₹1,000+
  return CASE_PRIORITY.LOW;
}

/**
 * Ingest a payment/revenue event with idempotency.
 * 
 * - Checks for duplicate (source, source_event_id) pairs
 * - If duplicate: returns existing record, does NOT reprocess
 * - If new: inserts event, processes it, creates revenue case if applicable
 */
export async function ingestEvent(input: IngestEventInput): Promise<IngestEventResult> {
  const db = getDb();
  const payloadHash = computePayloadHash(input.payload);

  // ─── Idempotency Check ─────────────────────────
  const existing = await db.select()
    .from(paymentEvents)
    .where(
      and(
        eq(paymentEvents.source, input.source),
        eq(paymentEvents.sourceEventId, input.sourceEventId),
      )
    )
    .limit(1);

  if (existing.length > 0) {
    return {
      eventId: existing[0].eventId,
      processingStatus: existing[0].processingStatus,
      isDuplicate: true,
    };
  }

  // ─── Insert Event ──────────────────────────────
  const eventRecord = await db.insert(paymentEvents).values({
    merchantId: input.merchantId,
    eventType: input.eventType,
    eventId: input.eventId,
    source: input.source,
    sourceEventId: input.sourceEventId,
    payload: input.payload,
    payloadHash,
    processingStatus: PROCESSING_STATUS.PENDING,
  }).returning();

  const event = eventRecord[0];

  // ─── Process Event ─────────────────────────────
  try {
    let caseId: string | undefined;

    if (input.eventType === EVENT_TYPES.PAYMENT_FAILED) {
      caseId = await processPaymentFailed(input);
    }

    // Mark as processed
    await db.update(paymentEvents)
      .set({
        processingStatus: PROCESSING_STATUS.PROCESSED,
        processedAt: new Date(),
      })
      .where(eq(paymentEvents.id, event.id));

    return {
      eventId: event.eventId,
      processingStatus: PROCESSING_STATUS.PROCESSED,
      caseId,
      isDuplicate: false,
    };
  } catch (error) {
    // Mark as failed
    await db.update(paymentEvents)
      .set({ processingStatus: PROCESSING_STATUS.FAILED })
      .where(eq(paymentEvents.id, event.id));

    throw error;
  }
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function toValidUuidOrNull(val: unknown): string | null {
  if (typeof val === 'string' && UUID_REGEX.test(val)) {
    return val;
  }
  return null;
}

/**
 * Process a payment.failed event:
 * 1. Check for existing revenue case
 * 2. If no case exists, create one
 * 3. Create audit event
 */
async function processPaymentFailed(input: IngestEventInput): Promise<string> {
  const db = getDb();
  const payload = input.payload as Record<string, unknown>;

  // Extract payment details from payload
  const rawPaymentId = payload.payment_id as string | undefined;
  const rawOrderId = payload.order_id as string | undefined;
  const rawCustomerId = payload.customer_id as string | undefined;
  const amountMinor = Number(payload.amount_minor ?? 0);
  const currency = (payload.currency as string) || 'INR';
  const failureReason = payload.failure_reason as string | undefined;
  const failureCode = payload.failure_code as string | undefined;
  const paymentMethod = payload.payment_method as string | undefined;
  const bank = payload.bank as string | undefined;

  const validPaymentId = toValidUuidOrNull(rawPaymentId);
  const validOrderId = toValidUuidOrNull(rawOrderId);
  const validCustomerId = toValidUuidOrNull(rawCustomerId);

  // Check if a revenue case already exists for this payment (if valid UUID)
  if (validPaymentId) {
    const existingCase = await db.select()
      .from(revenueCases)
      .where(
        and(
          eq(revenueCases.paymentId, validPaymentId),
          eq(revenueCases.merchantId, input.merchantId),
        )
      )
      .limit(1);

    if (existingCase.length > 0) {
      return existingCase[0].id;
    }
  }

  // Create revenue case
  const priority = determinePriority(amountMinor);
  
  const newCase = await db.insert(revenueCases).values({
    merchantId: input.merchantId,
    paymentId: validPaymentId,
    customerId: validCustomerId,
    orderId: validOrderId,
    caseType: CASE_TYPES.PAYMENT_FAILURE,
    status: 'new',
    priority,
    amountAtRiskMinor: amountMinor,
    currency,
    failureReason,
    failureCode,
  }).returning();

  const revenueCase = newCase[0];

  // Create audit event
  await createAuditEvent({
    merchantId: input.merchantId,
    entityType: 'revenue_case',
    entityId: revenueCase.id,
    eventType: EVENT_TYPES.REVENUE_CASE_CREATED,
    actor: 'system',
    data: {
      caseType: CASE_TYPES.PAYMENT_FAILURE,
      amountAtRiskMinor: amountMinor,
      currency,
      failureReason,
      failureCode,
      paymentMethod,
      bank,
      priority,
      externalPaymentId: rawPaymentId,
      externalOrderId: rawOrderId,
      externalCustomerId: rawCustomerId,
    },
  });

  return revenueCase.id;
}
