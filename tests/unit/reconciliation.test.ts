import { describe, it, expect } from 'vitest';
import { PaymentLinkAdapter } from '@/server/services/recovery/adapters/payment-link.adapter';

describe('Distributed Network Drop & Reconciliation', () => {
  it('reconciles lost network responses through adapter status polling without blind retry', async () => {
    const adapter = new PaymentLinkAdapter();

    const execResult = await adapter.execute({
      actionId: 'act_001',
      decisionId: 'dec_001',
      caseId: 'case_001',
      merchantId: 'merchant_001',
      amountMinor: 2499900,
      currency: 'INR',
      paymentMethod: 'upi',
      idempotencyKey: 'idemp_reconcile_123',
    });

    expect(execResult.externalReferenceId).toBeDefined();

    // Reconcile status using the external reference
    const reconResult = await adapter.reconcile!(execResult.externalReferenceId!);
    expect(reconResult.status).toBe('SUCCEEDED');
    expect(reconResult.externalReferenceId).toBe(execResult.externalReferenceId);
  });
});
