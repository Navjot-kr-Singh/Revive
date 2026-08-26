import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getMerchantForUser } from '@/server/services/merchant-service';
import { IncidentService } from '@/server/services/incident/incident-service';

/**
 * GET /api/incidents/active
 * Return all currently active incidents for the merchant.
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

    const result = await IncidentService.getIncidents(merchant.merchantId, {
      limit: 10,
    });

    // Filter to active statuses only
    const active = result.incidents.filter(
      (inc) => inc.status !== 'resolved' && inc.status !== 'dismissed' && inc.status !== 'false_positive'
    );

    return NextResponse.json({ incidents: active, total: active.length });
  } catch (error) {
    console.error('[GET_ACTIVE_INCIDENTS_ERROR]', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch active incidents' } },
      { status: 500 }
    );
  }
}
