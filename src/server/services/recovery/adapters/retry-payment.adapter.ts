import { type RecoveryActionAdapter, type AdapterExecutionContext, type AdapterExecutionResult } from './base.adapter';

export class RetryPaymentAdapter implements RecoveryActionAdapter {
  async validate(context: AdapterExecutionContext): Promise<{ valid: boolean; reason?: string }> {
    if (context.amountMinor <= 0) {
      return { valid: false, reason: 'Amount must be greater than zero.' };
    }
    return { valid: true };
  }

  async execute(context: AdapterExecutionContext): Promise<AdapterExecutionResult> {
    const extRef = `retry_${context.idempotencyKey.slice(0, 16)}_${Date.now()}`;

    // Deterministic simulation / test execution
    // If the bank is down and failure is BANK_TIMEOUT, retrying on the same rail has low immediate success unless resolved
    return {
      status: 'SUCCEEDED',
      externalReferenceId: extRef,
      recoveredAmountMinor: context.amountMinor,
      payload: {
        method: 'retry_payment',
        bank: context.bank,
        rail: context.paymentMethod,
        timestamp: new Date().toISOString(),
      },
    };
  }

  async getStatus(externalReferenceId: string): Promise<AdapterExecutionResult> {
    return {
      status: 'SUCCEEDED',
      externalReferenceId,
    };
  }

  async reconcile(externalReferenceId: string): Promise<AdapterExecutionResult> {
    return {
      status: 'SUCCEEDED',
      externalReferenceId,
    };
  }
}
