import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getRevenueSummary } from '@/server/services/case-service';
import { getMerchantForUser } from '@/server/services/merchant-service';

/**
 * GET /api/revenue/summary
 * Dashboard summary metrics for the authenticated merchant.
 */
export async function GET(_request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const merchant = await getMerchantForUser(user.userId);
    if (!merchant) {
      return NextResponse.json(
        { error: { code: 'NO_MERCHANT', message: 'No merchant found for user' } },
        { status: 403 }
      );
    }

    const summary = await getRevenueSummary(merchant.merchantId);

    return NextResponse.json(summary);
  } catch (error) {
    console.error('[REVENUE_SUMMARY_ERROR]', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch revenue summary' } },
      { status: 500 }
    );
  }
}
