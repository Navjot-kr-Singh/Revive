import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getCases } from '@/server/services/case-service';
import { getMerchantForUser } from '@/server/services/merchant-service';

/**
 * GET /api/cases
 * List revenue cases for the authenticated user's merchant.
 * Enforces tenant isolation via merchant context.
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
    const caseType = searchParams.get('case_type') ?? undefined;
    const page = parseInt(searchParams.get('page') ?? '1', 10);
    const limit = parseInt(searchParams.get('limit') ?? '20', 10);

    const result = await getCases(merchant.merchantId, {
      status,
      caseType,
      page,
      limit,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[CASES_LIST_ERROR]', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch cases' } },
      { status: 500 }
    );
  }
}
