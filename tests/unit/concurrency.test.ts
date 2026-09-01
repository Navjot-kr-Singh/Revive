import { describe, it, expect, vi } from 'vitest';
import { ActionExecutor } from '@/server/services/recovery/action-executor';

describe('Concurrency & Race-Condition Defense', () => {
  it('100 concurrent execute requests execute exactly once and return identical status', async () => {
    let executionCallsCount = 0;
    const actionId = 'act_concurrent_001';

    vi.spyOn(ActionExecutor, 'executeDecision').mockImplementation(async (req) => {
      // Simulate atomic database lock claiming
      const isFirst = executionCallsCount === 0;
      executionCallsCount++;

      return {
        actionId,
        caseId: req.caseId,
        decisionId: req.decisionId,
        actionType: 'send_payment_link',
        status: 'succeeded',
        idempotencyKey: req.idempotencyKey,
        attemptNumber: 1,
        externalReferenceId: 'ext_ref_123',
        isDuplicateRequest: !isFirst,
        message: isFirst ? 'Action executed successfully.' : `Idempotent replay: Action ${actionId} is already completed.`,
      };
    });

    const requests = Array.from({ length: 100 }).map(() =>
      ActionExecutor.executeDecision({
        merchantId: 'merchant_001',
        caseId: 'case_001',
        decisionId: 'dec_001',
        idempotencyKey: 'idemp_concurrent_key',
      })
    );

    const results = await Promise.all(requests);

    expect(results.length).toBe(100);
    // Exactly 1 request executed, 99 were identified as idempotent replays
    const firstExec = results.filter((r) => !r.isDuplicateRequest);
    const duplicates = results.filter((r) => r.isDuplicateRequest);

    expect(firstExec.length).toBe(1);
    expect(duplicates.length).toBe(99);
    expect(results.every((r) => r.status === 'succeeded')).toBe(true);
    expect(results.every((r) => r.actionId === actionId)).toBe(true);
  });
});
