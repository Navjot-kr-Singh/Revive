import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getMerchantForUser } from '@/server/services/merchant-service';
import { ActionExecutor } from '@/server/services/recovery/action-executor';

/**
 * POST /api/actions/[id]/cancel
 * Cancel a pending or scheduled recovery action.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401 });

    const merchant = await getMerchantForUser(user.userId);
    if (!merchant) return NextResponse.json({ error: { code: 'NO_MERCHANT' } }, { status: 403 });

    const { id: actionId } = await context.params;
    const body = await request.json().catch(() => ({}));
    const reason = body.reason || 'Operator cancellation';

    const cancelled = await ActionExecutor.cancelAction(merchant.merchantId, actionId, reason);

    return NextResponse.json({ cancelled });
  } catch (error: unknown) {
    console.error('[CANCEL_ACTION_ERROR]', error);
    const msg = error instanceof Error ? error.message : 'Failed to cancel action';
    return NextResponse.json(
      { error: { code: 'CANCEL_FAILED', message: msg } },
      { status: 500 }
    );
  }
}
