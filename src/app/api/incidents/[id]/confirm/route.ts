import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getMerchantForUser } from '@/server/services/merchant-service';
import { IncidentService, InvalidIncidentTransitionError } from '@/server/services/incident/incident-service';
import { INCIDENT_STATES } from '@/lib/constants';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401 });

    const merchant = await getMerchantForUser(user.userId);
    if (!merchant) return NextResponse.json({ error: { code: 'NO_MERCHANT' } }, { status: 403 });

    const { id: incidentId } = await context.params;
    const body = await request.json().catch(() => ({}));

    const result = await IncidentService.transitionIncident(
      merchant.merchantId,
      incidentId,
      INCIDENT_STATES.CONFIRMED,
      user.email || 'operator',
      body
    );

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof InvalidIncidentTransitionError) {
      return NextResponse.json({ error: { code: 'INVALID_TRANSITION', message: error.message } }, { status: 400 });
    }
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR' } }, { status: 500 });
  }
}
