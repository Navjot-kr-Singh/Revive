import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getMerchantForUser } from '@/server/services/merchant-service';
import { DecisionEngine } from '@/server/services/recovery/decision-engine';

/**
 * POST /api/cases/[id]/decide
 * Run policy evaluation and generate recovery decision without executing money movement.
 */
export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401 });

    const merchant = await getMerchantForUser(user.userId);
    if (!merchant) return NextResponse.json({ error: { code: 'NO_MERCHANT' } }, { status: 403 });

    const { id: caseId } = await context.params;
    const decision = await DecisionEngine.decideCase(merchant.merchantId, caseId);

    return NextResponse.json({ decision }, { status: 201 });
  } catch (error: unknown) {
    console.error('[DECIDE_CASE_ERROR]', error);
    const msg = error instanceof Error ? error.message : 'Failed to evaluate decision';
    return NextResponse.json(
      { error: { code: 'DECISION_FAILED', message: msg } },
      { status: msg.includes('not found') ? 404 : 500 }
    );
  }
}
