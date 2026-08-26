import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getMerchantForUser } from '@/server/services/merchant-service';
import { InvestigationService } from '@/server/services/investigation-service';

/**
 * GET /api/investigations/[id]
 * Fetch single investigation details by ID.
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

    const { id: investigationId } = await context.params;

    const investigation = await InvestigationService.getInvestigationById(merchant.merchantId, investigationId);
    if (!investigation) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Investigation not found' } }, { status: 404 });
    }

    return NextResponse.json({ investigation });
  } catch (error) {
    console.error('[GET_INVESTIGATION_BY_ID_ERROR]', error);
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR' } }, { status: 500 });
  }
}
