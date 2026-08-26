import { describe, it, expect, beforeAll } from 'vitest';
import { ingestEventBatch, type IngestEventInput } from '@/server/services/event-ingestion';
import { runSeed } from '@/server/db/seed';
import { getDb } from '@/server/db';
import { merchants, paymentEvents, revenueCases } from '@/server/db/schema';
import { eq } from 'drizzle-orm';
import { EVENT_TYPES, EVENT_SOURCES } from '@/lib/constants';

describe('Bulk Event Ingestion & Batch Idempotency', () => {
  let merchantId: string;

  beforeAll(async () => {
    await runSeed();
    const db = getDb();
    const [acme] = await db.select().from(merchants);
    merchantId = acme.id;
  });

  it('ingests a batch of 200 events with mixed successes and failures efficiently', async () => {
    const inputs: IngestEventInput[] = [];
    for (let i = 0; i < 200; i++) {
      const isFailed = i % 5 === 0; // 20% failures = 40 failure events
      inputs.push({
        eventId: `evt_bulk_test_${i}`,
        eventType: isFailed ? EVENT_TYPES.PAYMENT_FAILED : EVENT_TYPES.PAYMENT_CAPTURED,
        source: EVENT_SOURCES.SYNTHETIC,
        sourceEventId: `src_bulk_event_${i}`,
        merchantId,
        payload: {
          payment_id: `pay_bulk_${i}`,
          amount_minor: 250000,
          currency: 'INR',
          bank: 'HDFC Bank',
          payment_method: 'upi',
          ...(isFailed ? { failure_code: 'BANK_TIMEOUT', failure_reason: 'Bank timeout' } : {}),
        },
      });
    }

    const result = await ingestEventBatch(inputs, 100);

    expect(result.totalReceived).toBe(200);
    expect(result.newEventsCount).toBe(200);
    expect(result.duplicateEventsCount).toBe(0);
    expect(result.casesCreatedCount).toBe(40); // 40 payment.failed cases created
  });

  it('maintains strict idempotency across entire batch on repeated delivery', async () => {
    const duplicateBatch: IngestEventInput[] = [];
    for (let i = 0; i < 50; i++) {
      duplicateBatch.push({
        eventId: `evt_bulk_test_${i}_RETRY`,
        eventType: EVENT_TYPES.PAYMENT_FAILED,
        source: EVENT_SOURCES.SYNTHETIC,
        sourceEventId: `src_bulk_event_${i}`, // Already ingested in previous test!
        merchantId,
        payload: {
          payment_id: `pay_bulk_${i}`,
          amount_minor: 250000,
          currency: 'INR',
          bank: 'HDFC Bank',
          payment_method: 'upi',
        },
      });
    }

    const result = await ingestEventBatch(duplicateBatch, 50);

    expect(result.totalReceived).toBe(50);
    expect(result.newEventsCount).toBe(0);
    expect(result.duplicateEventsCount).toBe(50);
    expect(result.casesCreatedCount).toBe(0); // ZERO duplicate cases created
  });
});
