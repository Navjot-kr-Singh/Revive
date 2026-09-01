import { type RecoveryActionAdapter, type AdapterExecutionContext, type AdapterExecutionResult } from './base.adapter';

export class HumanEscalationAdapter implements RecoveryActionAdapter {
  async validate(_context: AdapterExecutionContext): Promise<{ valid: boolean; reason?: string }> {
    return { valid: true };
  }

  async execute(context: AdapterExecutionContext): Promise<AdapterExecutionResult> {
    const extRef = `esc_${context.idempotencyKey.slice(0, 16)}_${Date.now()}`;
    return {
      status: 'PENDING',
      externalReferenceId: extRef,
      payload: {
        queue: 'high_value_operations_review',
        assignedTo: 'on_call_agent',
        enqueuedAt: new Date().toISOString(),
      },
    };
  }

  async getStatus(externalReferenceId: string): Promise<AdapterExecutionResult> {
    return {
      status: 'PENDING',
      externalReferenceId,
    };
  }
}
