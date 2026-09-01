import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getMerchantForUser } from '@/server/services/merchant-service';
import { OutcomeService } from '@/server/services/recovery/outcome-service';

/**
 * GET /api/cases/[id]/outcomes
 * List all observed recovery outcomes for a case.
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
    const outcomes = await OutcomeService.getCaseOutcomes(merchant.merchantId, caseId);

    return NextResponse.json({ outcomes });
  } catch (error) {
    console.error('[GET_CASE_OUTCOMES_ERROR]', error);
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR' } }, { status: 500 });
  }
}
