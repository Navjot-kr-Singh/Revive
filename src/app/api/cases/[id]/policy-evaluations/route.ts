import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getMerchantForUser } from '@/server/services/merchant-service';
import { getDb } from '@/server/db';
import { auditEvents } from '@/server/db/schema';
import { eq, and, desc } from 'drizzle-orm';

/**
 * GET /api/cases/[id]/policy-evaluations
 * List historical policy evaluation audit logs for a case.
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401 });

    const merchant = await getMerchantForUser(user.userId);
    if (!merchant) return NextResponse.json({ error: { code: 'NO_MERCHANT' } }, { status: 403 });

    const { id: caseId } = await context.params;
    const db = getDb();

    const evaluations = await db
      .select()
      .from(auditEvents)
      .where(
        and(
          eq(auditEvents.merchantId, merchant.merchantId),
          eq(auditEvents.eventType, 'policy.evaluated')
        )
      )
      .orderBy(desc(auditEvents.createdAt))
      .limit(20);

    const filtered = evaluations.filter((ev) => {
      const data = ev.data as Record<string, unknown> | null;
      return data?.caseId === caseId;
    });

    return NextResponse.json({ policyEvaluations: filtered });
  } catch (error) {
    console.error('[GET_POLICY_EVALUATIONS_ERROR]', error);
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR' } }, { status: 500 });
  }
}
