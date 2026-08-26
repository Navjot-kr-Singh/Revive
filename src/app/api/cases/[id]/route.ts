import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getCaseById } from '@/server/services/case-service';
import { getMerchantForUser } from '@/server/services/merchant-service';
import { getAuditTrail } from '@/server/services/audit-service';

/**
 * GET /api/cases/[id]
 * Retrieve a specific revenue case with tenant isolation and audit trail.
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

    const { id: caseId } = await context.params;

    const caseData = await getCaseById(merchant.merchantId, caseId);
    if (!caseData) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Case not found or unauthorized' } },
        { status: 404 }
      );
    }

    const auditTrail = await getAuditTrail(merchant.merchantId, 'revenue_case', caseId);

    return NextResponse.json({
      case: caseData,
      audit_trail: auditTrail,
    });
  } catch (error) {
    console.error('[GET_CASE_BY_ID_ERROR]', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch case details' } },
      { status: 500 }
    );
  }
}
