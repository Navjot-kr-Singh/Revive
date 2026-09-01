import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getMerchantForUser } from '@/server/services/merchant-service';
import { OutcomeService } from '@/server/services/recovery/outcome-service';

/**
 * GET /api/recovery/metrics
 * Recovery Control Room aggregated performance metrics.
 */
export async function GET(_request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401 });

    const merchant = await getMerchantForUser(user.userId);
    if (!merchant) return NextResponse.json({ error: { code: 'NO_MERCHANT' } }, { status: 403 });

    const metrics = await OutcomeService.getRecoveryMetrics(merchant.merchantId);

    return NextResponse.json({ metrics });
  } catch (error) {
    console.error('[GET_RECOVERY_METRICS_ERROR]', error);
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR' } }, { status: 500 });
  }
}
