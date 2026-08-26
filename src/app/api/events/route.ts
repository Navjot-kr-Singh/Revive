import { NextRequest, NextResponse } from 'next/server';
import { ingestEvent } from '@/server/services/event-ingestion';
import { z } from 'zod';

const EventSchema = z.object({
  event_id: z.string().min(1),
  event_type: z.string().min(1),
  source: z.string().min(1),
  source_event_id: z.string().min(1),
  merchant_id: z.string().uuid(),
  payload: z.record(z.string(), z.unknown()),
  timestamp: z.string().optional(),
});

/**
 * POST /api/events
 * Ingest external payment/revenue events.
 * Idempotent: duplicate (source, source_event_id) returns 200 without reprocessing.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = EventSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid event payload', details: validated.error.flatten() } },
        { status: 400 }
      );
    }

    const { event_id, event_type, source, source_event_id, merchant_id, payload, timestamp } = validated.data;

    const result = await ingestEvent({
      eventId: event_id,
      eventType: event_type,
      source,
      sourceEventId: source_event_id,
      merchantId: merchant_id,
      payload,
      timestamp,
    });

    // Return 200 for duplicates, 201 for new events
    const status = result.isDuplicate ? 200 : 201;

    return NextResponse.json(
      {
        event_id: result.eventId,
        processing_status: result.processingStatus,
        case_id: result.caseId,
        is_duplicate: result.isDuplicate,
      },
      { status }
    );
  } catch (error) {
    console.error('[EVENT_INGESTION_ERROR]', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to process event' } },
      { status: 500 }
    );
  }
}
