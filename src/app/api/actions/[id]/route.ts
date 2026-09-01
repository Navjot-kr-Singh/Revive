import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getMerchantForUser } from '@/server/services/merchant-service';
import { getDb } from '@/server/db';
import { recoveryActions } from '@/server/db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * GET /api/actions/[id]
 * Get details for a single recovery action.
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

    const { id: actionId } = await context.params;
    const db = getDb();

    const [action] = await db
      .select()
      .from(recoveryActions)
      .where(and(eq(recoveryActions.id, actionId), eq(recoveryActions.merchantId, merchant.merchantId)));

    if (!action) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Action not found' } }, { status: 404 });
    }

    return NextResponse.json({ action });
  } catch (error) {
    console.error('[GET_ACTION_ERROR]', error);
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR' } }, { status: 500 });
  }
}
