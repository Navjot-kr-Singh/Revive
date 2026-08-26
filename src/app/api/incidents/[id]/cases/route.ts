import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getMerchantForUser } from '@/server/services/merchant-service';
import { IncidentService } from '@/server/services/incident/incident-service';

/**
 * GET /api/incidents/[id]/cases
 * Fetch revenue cases linked to this incident.
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
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

    const { id: incidentId } = await context.params;

    const cases = await IncidentService.getIncidentCases(merchant.merchantId, incidentId);
    return NextResponse.json({ cases, total: cases.length });
  } catch (error) {
    console.error('[GET_INCIDENT_CASES_ERROR]', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch incident cases' } },
      { status: 500 }
    );
  }
}
