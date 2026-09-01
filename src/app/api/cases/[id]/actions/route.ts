import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getMerchantForUser } from '@/server/services/merchant-service';
import { getDb } from '@/server/db';
import { recoveryActions } from '@/server/db/schema';
import { eq, and, desc } from 'drizzle-orm';

/**
 * GET /api/cases/[id]/actions
 * List all recovery actions executed for a case.
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

    const actions = await db
      .select()
      .from(recoveryActions)
      .where(and(eq(recoveryActions.caseId, caseId), eq(recoveryActions.merchantId, merchant.merchantId)))
      .orderBy(desc(recoveryActions.createdAt));

    return NextResponse.json({ actions });
  } catch (error) {
    console.error('[GET_CASE_ACTIONS_ERROR]', error);
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR' } }, { status: 500 });
  }
}
