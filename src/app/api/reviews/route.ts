import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getMerchantForUser } from '@/server/services/merchant-service';
import { getDb } from '@/server/db';
import { revenueCases, recoveryDecisions } from '@/server/db/schema';
import { eq, and, desc } from 'drizzle-orm';

/**
 * GET /api/reviews
 * List cases queued for human review.
 */
export async function GET(_request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401 });

    const merchant = await getMerchantForUser(user.userId);
    if (!merchant) return NextResponse.json({ error: { code: 'NO_MERCHANT' } }, { status: 403 });

    const db = getDb();

    const escalatedCases = await db
      .select({
        caseId: revenueCases.id,
        amountAtRiskMinor: revenueCases.amountAtRiskMinor,
        currency: revenueCases.currency,
        status: revenueCases.status,
        priority: revenueCases.priority,
        failureCode: revenueCases.failureCode,
        failureReason: revenueCases.failureReason,
        customerContactsCount: revenueCases.customerContacts,
        recoveryAttemptsCount: revenueCases.retryCount,
        createdAt: revenueCases.createdAt,
      })
      .from(revenueCases)
      .where(
        and(
          eq(revenueCases.merchantId, merchant.merchantId),
          eq(revenueCases.status, 'escalated')
        )
      )
      .orderBy(desc(revenueCases.createdAt));

    // Attach latest decision for each escalated case if present
    const casesWithDecisions = await Promise.all(
      escalatedCases.map(async (c) => {
        const [dec] = await db
          .select()
          .from(recoveryDecisions)
          .where(and(eq(recoveryDecisions.caseId, c.caseId), eq(recoveryDecisions.merchantId, merchant.merchantId)))
          .orderBy(desc(recoveryDecisions.createdAt))
          .limit(1);

        return {
          ...c,
          latestDecision: dec || null,
        };
      })
    );

    return NextResponse.json({ reviewCases: casesWithDecisions });
  } catch (error) {
    console.error('[GET_REVIEWS_ERROR]', error);
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR' } }, { status: 500 });
  }
}
