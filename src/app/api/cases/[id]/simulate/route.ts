import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getMerchantForUser } from '@/server/services/merchant-service';
import { CounterfactualSimulator } from '@/server/services/recovery/simulator';
import { getCaseById } from '@/server/services/case-service';

/**
 * POST /api/cases/[id]/simulate
 * Run pure counterfactual simulation over candidate interventions for a case.
 */
export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401 });

    const merchant = await getMerchantForUser(user.userId);
    if (!merchant) return NextResponse.json({ error: { code: 'NO_MERCHANT' } }, { status: 403 });

    const { id: caseId } = await context.params;
    const c = await getCaseById(merchant.merchantId, caseId);
    if (!c) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Case not found' } }, { status: 404 });
    }

    const simulation = CounterfactualSimulator.simulateCase({
      caseId: c.id,
      amountMinor: c.amountAtRiskMinor,
      currency: c.currency,
      failureCode: c.failureCode || 'BANK_TIMEOUT',
      paymentMethod: 'upi',
      bank: 'HDFC Bank',
      retryCount: c.retryCount || 0,
      customerContactsCount: c.customerContacts || 0,
      timeSinceFailureSeconds: Math.floor((Date.now() - new Date(c.createdAt).getTime()) / 1000),
    });

    return NextResponse.json({ simulation });
  } catch (error) {
    console.error('[SIMULATE_CASE_ERROR]', error);
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR' } }, { status: 500 });
  }
}
