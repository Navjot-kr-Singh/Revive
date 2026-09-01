import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getMerchantForUser } from '@/server/services/merchant-service';
import { getDb } from '@/server/db';
import { revenueCases, recoveryDecisions, auditEvents } from '@/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { CASE_STATES } from '@/lib/constants';

/**
 * POST /api/reviews/[id]/action
 * Operator review action on escalated cases: APPROVE, REJECT, MODIFY, ESCALATE.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401 });

    const merchant = await getMerchantForUser(user.userId);
    if (!merchant) return NextResponse.json({ error: { code: 'NO_MERCHANT' } }, { status: 403 });

    const { id: caseId } = await context.params;
    const body = await request.json().catch(() => ({}));
    const action = (body.action || '').toUpperCase(); // 'APPROVE' | 'REJECT' | 'MODIFY' | 'ESCALATE'
    const note = body.note || 'Operator review decision';
    const modifiedActionType = body.modifiedActionType;

    const db = getDb();
    const [c] = await db
      .select()
      .from(revenueCases)
      .where(and(eq(revenueCases.id, caseId), eq(revenueCases.merchantId, merchant.merchantId)));

    if (!c) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Case not found' } }, { status: 404 });
    }

    let nextStatus: string = c.status;

    if (action === 'APPROVE') {
      nextStatus = CASE_STATES.DECISION_PENDING;
      await db
        .update(recoveryDecisions)
        .set({ decisionStatus: 'approved', decidedBy: user.email || 'operator' })
        .where(and(eq(recoveryDecisions.caseId, caseId), eq(recoveryDecisions.merchantId, merchant.merchantId)));
    } else if (action === 'REJECT') {
      nextStatus = CASE_STATES.STOPPED;
      await db
        .update(recoveryDecisions)
        .set({ decisionStatus: 'denied', reason: `Rejected by operator: ${note}` })
        .where(and(eq(recoveryDecisions.caseId, caseId), eq(recoveryDecisions.merchantId, merchant.merchantId)));
    } else if (action === 'MODIFY') {
      nextStatus = CASE_STATES.DECISION_PENDING;
      if (modifiedActionType) {
        await db
          .update(recoveryDecisions)
          .set({
            actionType: modifiedActionType,
            decisionStatus: 'approved',
            reason: `Modified by operator to ${modifiedActionType}: ${note}`,
            decidedBy: user.email || 'operator',
          })
          .where(and(eq(recoveryDecisions.caseId, caseId), eq(recoveryDecisions.merchantId, merchant.merchantId)));
      }
    } else if (action === 'ESCALATE') {
      nextStatus = CASE_STATES.ESCALATED;
    }

    await db
      .update(revenueCases)
      .set({ status: nextStatus, updatedAt: new Date() })
      .where(eq(revenueCases.id, caseId));

    // Audit operator action
    await db.insert(auditEvents).values({
      merchantId: merchant.merchantId,
      entityType: 'revenue_case',
      entityId: caseId,
      eventType: 'human.review_action',
      actor: user.email || 'operator',
      data: { caseId, action, note, modifiedActionType, resultingState: nextStatus },
    });

    return NextResponse.json({
      success: true,
      caseId,
      operatorAction: action,
      resultingState: nextStatus,
    });
  } catch (error: unknown) {
    console.error('[REVIEW_ACTION_ERROR]', error);
    const msg = error instanceof Error ? error.message : 'Failed to apply review action';
    return NextResponse.json(
      { error: { code: 'ACTION_FAILED', message: msg } },
      { status: 500 }
    );
  }
}
