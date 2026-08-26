import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getMerchantForUser } from '@/server/services/merchant-service';
import { IncidentService } from '@/server/services/incident/incident-service';

/**
 * GET /api/incidents
 * List incidents for the authenticated merchant with tenant isolation.
 */
export async function GET(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') ?? undefined;
    const severity = searchParams.get('severity') ?? undefined;
    const page = parseInt(searchParams.get('page') ?? '1', 10);
    const limit = parseInt(searchParams.get('limit') ?? '20', 10);

    const result = await IncidentService.getIncidents(merchant.merchantId, {
      status,
      severity,
      page,
      limit,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[GET_INCIDENTS_ERROR]', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch incidents' } },
      { status: 500 }
    );
  }
}
