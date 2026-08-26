import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getMerchantForUser } from '@/server/services/merchant-service';
import { InvestigationService } from '@/server/services/investigation-service';

/**
 * POST /api/incidents/[id]/investigate
 * Triggers autonomous evidence collection, hypothesis scoring, and AI diagnosis.
 */
export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, { status: 401 });
    }

    const merchant = await getMerchantForUser(user.userId);
    if (!merchant) {
      return NextResponse.json({ error: { code: 'NO_MERCHANT', message: 'No merchant found' } }, { status: 403 });
    }

    const { id: incidentId } = await context.params;

    const result = await InvestigationService.runInvestigation(merchant.merchantId, incidentId);
    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('[INVESTIGATE_INCIDENT_ERROR]', error);
    const errorMsg = error instanceof Error ? error.message : 'Investigation failed';
    return NextResponse.json(
      { error: { code: 'INVESTIGATION_ERROR', message: errorMsg } },
      { status: 500 }
    );
  }
}
