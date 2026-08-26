import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getMerchantForUser } from '@/server/services/merchant-service';
import { InvestigationService } from '@/server/services/investigation-service';

/**
 * GET /api/incidents/[id]/hypotheses
 * Fetch evaluated candidate hypotheses for an incident.
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

    const { id: incidentId } = await context.params;

    const hypotheses = await InvestigationService.getIncidentHypotheses(merchant.merchantId, incidentId);
    return NextResponse.json({ hypotheses });
  } catch (error) {
    console.error('[GET_HYPOTHESES_ERROR]', error);
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR' } }, { status: 500 });
  }
}
