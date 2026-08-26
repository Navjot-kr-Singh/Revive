import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getMerchantForUser } from '@/server/services/merchant-service';
import { IncidentService } from '@/server/services/incident/incident-service';

/**
 * GET /api/incidents/metrics
 * Summary incident metrics (active incidents, critical count, revenue at risk) for dashboard.
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

    const metrics = await IncidentService.getIncidentMetrics(merchant.merchantId);
    return NextResponse.json(metrics);
  } catch (error) {
    console.error('[GET_INCIDENT_METRICS_ERROR]', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch incident metrics' } },
      { status: 500 }
    );
  }
}
