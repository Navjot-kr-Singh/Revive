import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getMerchantForUser } from '@/server/services/merchant-service';
import { ActionExecutor } from '@/server/services/recovery/action-executor';

/**
 * POST /api/cases/[id]/execute
 * Atomically execute an approved recovery action with strict idempotency and policy revalidation.
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

    const { id: caseId } = await context.params;
    const body = await request.json().catch(() => ({}));

    const decisionId = body.decisionId;
    const idempotencyKey = body.idempotencyKey || request.headers.get('x-idempotency-key') || `exec_${caseId}_${Date.now()}`;
    const mode = body.mode || 'DEMO';

    if (!decisionId) {
      return NextResponse.json(
        { error: { code: 'MISSING_PARAM', message: 'decisionId is required to execute recovery action' } },
        { status: 400 }
      );
    }

    const execution = await ActionExecutor.executeDecision({
      merchantId: merchant.merchantId,
      caseId,
      decisionId,
      idempotencyKey,
      mode,
    });

    return NextResponse.json({ execution }, { status: execution.status === 'denied' ? 403 : 200 });
  } catch (error: unknown) {
    console.error('[EXECUTE_ACTION_ERROR]', error);
    const msg = error instanceof Error ? error.message : 'Failed to execute recovery action';
    return NextResponse.json(
      { error: { code: 'EXECUTION_FAILED', message: msg } },
      { status: 500 }
    );
  }
}
