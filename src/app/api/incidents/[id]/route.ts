import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getMerchantForUser } from '@/server/services/merchant-service';
import { IncidentService } from '@/server/services/incident/incident-service';
import { getAuditTrail } from '@/server/services/audit-service';

/**
 * GET /api/incidents/[id]
 * Fetch full incident details, diagnostic signals, and immutable audit trail.
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

    const incident = await IncidentService.getIncidentById(merchant.merchantId, incidentId);
    if (!incident) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Incident not found or unauthorized' } },
        { status: 404 }
      );
    }

    const [signals, auditTrail] = await Promise.all([
      IncidentService.getIncidentSignals(merchant.merchantId, incidentId),
      getAuditTrail(merchant.merchantId, 'incident', incidentId),
    ]);

    return NextResponse.json({
      incident,
      signals,
      audit_trail: auditTrail,
    });
  } catch (error) {
    console.error('[GET_INCIDENT_BY_ID_ERROR]', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch incident' } },
      { status: 500 }
    );
  }
}
