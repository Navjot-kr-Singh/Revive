import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/server/db';
import { auditEvents, merchants } from '@/server/db/schema';
import { getCurrentUser } from '@/lib/auth';
import { getMerchantForUser } from '@/server/services/merchant-service';
import { eq, desc } from 'drizzle-orm';

/**
 * GET /api/audit
 * Fetch immutable audit trail events for the authenticated merchant
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } }, { status: 401 });
    }

    const merchantInfo = await getMerchantForUser(user.userId);
    if (!merchantInfo) {
      return NextResponse.json({ error: { code: 'NO_MERCHANT', message: 'Merchant not found' } }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);

    const db = getDb();
    const events = await db
      .select()
      .from(auditEvents)
      .where(eq(auditEvents.merchantId, merchantInfo.merchantId))
      .orderBy(desc(auditEvents.createdAt))
      .limit(limit);

    const [merchant] = await db.select().from(merchants).where(eq(merchants.id, merchantInfo.merchantId)).limit(1);

    return NextResponse.json({
      merchant: merchant ? { id: merchant.id, name: merchant.name, slug: merchant.slug } : null,
      events: events.map((e) => ({
        id: e.id,
        entityType: e.entityType,
        entityId: e.entityId,
        eventType: e.eventType,
        actor: e.actor || 'system',
        correlationId: e.correlationId,
        data: e.data as Record<string, unknown> | null,
        createdAt: e.createdAt,
      })),
      totalCount: events.length,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch audit events';
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: msg } }, { status: 500 });
  }
}
