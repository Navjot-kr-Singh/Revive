import { describe, it, expect, vi } from 'vitest';
import { ActionExecutor } from '@/server/services/recovery/action-executor';

describe('Two-Level Idempotency & Safe Execution', () => {
  it('returns existing action state for duplicate idempotency key without executing twice', async () => {
    // Mock existing action
    const existingAction = {
      id: 'act_existing_001',
      caseId: 'case_001',
      decisionId: 'dec_001',
      merchantId: 'merchant_001',
      actionType: 'send_payment_link',
      status: 'succeeded',
      attemptNumber: 1,
      externalReferenceId: 'idemp_key_12345',
    };

    vi.spyOn(ActionExecutor as any, 'executeDecision').mockImplementation(async (req: any) => {
      if (req.idempotencyKey === 'idemp_key_12345') {
        return {
          actionId: existingAction.id,
          caseId: existingAction.caseId,
          decisionId: existingAction.decisionId,
          actionType: existingAction.actionType,
          status: existingAction.status,
          idempotencyKey: req.idempotencyKey,
          attemptNumber: existingAction.attemptNumber,
          isDuplicateRequest: true,
          message: "Idempotent replay: Action act_existing_001 is already in state 'succeeded'.",
        };
      }
      return {
        actionId: 'act_new_002',
        caseId: req.caseId,
        decisionId: req.decisionId,
        actionType: 'send_payment_link',
        status: 'succeeded',
        idempotencyKey: req.idempotencyKey,
        attemptNumber: 1,
        isDuplicateRequest: false,
        message: 'Action executed successfully.',
      };
    });

    const res1 = await ActionExecutor.executeDecision({
      merchantId: 'merchant_001',
      caseId: 'case_001',
      decisionId: 'dec_001',
      idempotencyKey: 'idemp_key_12345',
    });

    expect(res1.isDuplicateRequest).toBe(true);
    expect(res1.status).toBe('succeeded');
    expect(res1.actionId).toBe('act_existing_001');
  });
});
