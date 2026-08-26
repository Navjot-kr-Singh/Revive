import { describe, it, expect, beforeAll } from 'vitest';
import { ingestEvent } from '@/server/services/event-ingestion';
import { getDb } from '@/server/db';
import { merchants, revenueCases, paymentEvents, auditEvents } from '@/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { runSeed } from '@/server/db/seed';
import { toMinorUnits } from '@/lib/money';
import { CASE_PRIORITY, EVENT_TYPES } from '@/lib/constants';

describe('Event Ingestion & Idempotency', () => {
  let merchantId: string;

  beforeAll(async () => {
    await runSeed();
    const db = getDb();
    const allMerchants = await db.select().from(merchants);
    merchantId = allMerchants.find((m) => m.slug === 'acme-electronics')!.id;
  });

  it('ingests payment.failed event and automatically creates revenue case with exact revenue-at-risk', async () => {
    const paymentId = 'pay_test_failed_1001';
    const amountPaise = toMinorUnits(18999, 'INR'); // ₹18,999.00 = 1899900 paise

    const result = await ingestEvent({
      eventId: 'evt_unique_test_001',
      eventType: EVENT_TYPES.PAYMENT_FAILED,
      source: 'razorpay',
      sourceEventId: 'rzp_src_unique_001',
      merchantId,
      payload: {
        payment_id: paymentId,
        order_id: 'ord_test_001',
        customer_id: 'cust_test_001',
        amount_minor: amountPaise,
        currency: 'INR',
        failure_reason: 'Bank processing timeout',
        failure_code: 'BANK_TIMEOUT',
        payment_method: 'upi',
        bank: 'State Bank of India',
      },
    });

    expect(result.isDuplicate).toBe(false);
    expect(result.processingStatus).toBe('processed');
    expect(result.caseId).toBeDefined();

    // Verify case in database
    const db = getDb();
    const [createdCase] = await db
      .select()
      .from(revenueCases)
      .where(eq(revenueCases.id, result.caseId!));

    expect(createdCase).toBeDefined();
    expect(createdCase.merchantId).toBe(merchantId);
    expect(createdCase.status).toBe('new');
    expect(createdCase.amountAtRiskMinor).toBe(amountPaise);
    expect(createdCase.currency).toBe('INR');
    expect(createdCase.failureCode).toBe('BANK_TIMEOUT');
    expect(createdCase.priority).toBe(CASE_PRIORITY.HIGH); // ₹18,999 is >= ₹10,000 -> HIGH

    // Verify audit ledger entry
    const audits = await db
      .select()
      .from(auditEvents)
      .where(
        and(
          eq(auditEvents.entityId, result.caseId!),
          eq(auditEvents.eventType, EVENT_TYPES.REVENUE_CASE_CREATED),
        ),
      );

    expect(audits.length).toBe(1);
    expect(audits[0].actor).toBe('system');
  });

  it('guarantees idempotency: repeated delivery of identical event does not duplicate case or event', async () => {
    const db = getDb();
    const sourceEventId = 'rzp_src_duplicate_test_002';
    const amountPaise = toMinorUnits(4500, 'INR');

    // First ingestion
    const firstResult = await ingestEvent({
      eventId: 'evt_first_attempt_002',
      eventType: EVENT_TYPES.PAYMENT_FAILED,
      source: 'razorpay',
      sourceEventId,
      merchantId,
      payload: {
        payment_id: 'pay_test_dup_002',
        order_id: 'ord_test_dup_002',
        amount_minor: amountPaise,
        currency: 'INR',
        failure_reason: 'Insufficient funds',
        failureCode: 'INSUFFICIENT_FUNDS',
      },
    });

    expect(firstResult.isDuplicate).toBe(false);
    expect(firstResult.caseId).toBeDefined();

    // Second ingestion (exact same source and sourceEventId)
    const secondResult = await ingestEvent({
      eventId: 'evt_second_attempt_002_duplicate',
      eventType: EVENT_TYPES.PAYMENT_FAILED,
      source: 'razorpay',
      sourceEventId,
      merchantId,
      payload: {
        payment_id: 'pay_test_dup_002',
        order_id: 'ord_test_dup_002',
        amount_minor: amountPaise,
        currency: 'INR',
        failure_reason: 'Insufficient funds',
        failureCode: 'INSUFFICIENT_FUNDS',
      },
    });

    // Must be identified as duplicate
    expect(secondResult.isDuplicate).toBe(true);

    // Verify in database: exactly ONE payment_event row exists for this sourceEventId
    const eventRecords = await db
      .select()
      .from(paymentEvents)
      .where(
        and(
          eq(paymentEvents.source, 'razorpay'),
          eq(paymentEvents.sourceEventId, sourceEventId),
        ),
      );

    expect(eventRecords.length).toBe(1);
  });

  it('assigns CRITICAL priority for high-value payments exceeding threshold', async () => {
    const highValueAmount = toMinorUnits(65000, 'INR'); // ₹65,000 > ₹50,000 (high value threshold)

    const result = await ingestEvent({
      eventId: 'evt_high_val_003',
      eventType: EVENT_TYPES.PAYMENT_FAILED,
      source: 'razorpay',
      sourceEventId: 'rzp_src_high_val_003',
      merchantId,
      payload: {
        payment_id: 'pay_high_val_003',
        amount_minor: highValueAmount,
        currency: 'INR',
        failure_code: 'BANK_DECLINED',
      },
    });

    const db = getDb();
    const [createdCase] = await db
      .select()
      .from(revenueCases)
      .where(eq(revenueCases.id, result.caseId!));

    expect(createdCase.priority).toBe(CASE_PRIORITY.CRITICAL);
    expect(createdCase.amountAtRiskMinor).toBe(highValueAmount);
  });
});
