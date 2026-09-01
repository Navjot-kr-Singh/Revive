import { describe, it, expect, vi } from 'vitest';
import { DecisionEngine } from '@/server/services/recovery/decision-engine';
import { ActionExecutor } from '@/server/services/recovery/action-executor';

describe('Multi-Tenant Recovery Security', () => {
  it('blocks Merchant A from deciding or executing cases owned by Merchant B', async () => {
    const attackerMerchantId = '00000000-0000-0000-0000-000000000999';
    const targetCaseId = '00000000-0000-0000-0000-000000000001';

    // Attempting to decide a case with wrong merchantId throws authorization error
    await expect(
      DecisionEngine.decideCase(attackerMerchantId, targetCaseId)
    ).rejects.toThrow(/not found or unauthorized/i);

    // Attempting to execute an action with wrong merchantId throws authorization error
    await expect(
      ActionExecutor.executeDecision({
        merchantId: attackerMerchantId,
        caseId: targetCaseId,
        decisionId: '00000000-0000-0000-0000-000000000002',
        idempotencyKey: 'idemp_attack_001',
      })
    ).rejects.toThrow(/not found or unauthorized/i);
  });
});
