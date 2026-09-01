import { type RecoveryActionAdapter, type AdapterExecutionContext, type AdapterExecutionResult } from './base.adapter';

export class CustomerNotificationAdapter implements RecoveryActionAdapter {
  async validate(_context: AdapterExecutionContext): Promise<{ valid: boolean; reason?: string }> {
    return { valid: true };
  }

  async execute(context: AdapterExecutionContext): Promise<AdapterExecutionResult> {
    const extRef = `notif_${context.idempotencyKey.slice(0, 16)}_${Date.now()}`;
    return {
      status: 'SUCCEEDED',
      externalReferenceId: extRef,
      payload: {
        channel: 'push_and_email',
        template: 'payment_retry_prompt_v1',
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
}
