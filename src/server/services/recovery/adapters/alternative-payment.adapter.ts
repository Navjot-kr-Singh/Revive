import { type RecoveryActionAdapter, type AdapterExecutionContext, type AdapterExecutionResult } from './base.adapter';

export class AlternativePaymentAdapter implements RecoveryActionAdapter {
  async validate(context: AdapterExecutionContext): Promise<{ valid: boolean; reason?: string }> {
    if (context.amountMinor <= 0) {
      return { valid: false, reason: 'Amount must be greater than zero.' };
    }
    return { valid: true };
  }

  async execute(context: AdapterExecutionContext): Promise<AdapterExecutionResult> {
    const extRef = `alt_rail_${context.idempotencyKey.slice(0, 16)}_${Date.now()}`;
    const targetRail = context.paymentMethod === 'upi' ? 'card_debit' : 'upi';

    return {
      status: 'SUCCEEDED',
      externalReferenceId: extRef,
      recoveredAmountMinor: context.amountMinor,
      payload: {
        originalRail: context.paymentMethod,
        switchedRail: targetRail,
        reason: 'Automated fallback to healthy alternate processing switch',
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
