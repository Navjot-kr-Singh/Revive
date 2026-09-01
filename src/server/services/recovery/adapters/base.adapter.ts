/**
 * REVIVE — Recovery Action Adapter Interface
 * 
 * Clean adapter boundary isolating provider-specific logic.
 * Exposes validate, execute, getStatus, cancel, and reconcile.
 */

export interface AdapterExecutionContext {
  actionId: string;
  decisionId: string;
  caseId: string;
  merchantId: string;
  amountMinor: number;
  currency: string;
  paymentMethod: string;
  bank?: string;
  failureCode?: string;
  idempotencyKey: string;
  mode?: 'DEMO' | 'SIMULATION' | 'TEST_PROVIDER';
}

export interface AdapterExecutionResult {
  status: 'SUCCEEDED' | 'PENDING' | 'FAILED' | 'UNKNOWN';
  externalReferenceId?: string;
  payload?: Record<string, unknown>;
  recoveredAmountMinor?: number;
  errorMessage?: string;
}

export interface RecoveryActionAdapter {
  validate(context: AdapterExecutionContext): Promise<{ valid: boolean; reason?: string }>;
  execute(context: AdapterExecutionContext): Promise<AdapterExecutionResult>;
  getStatus(externalReferenceId: string): Promise<AdapterExecutionResult>;
  cancel?(externalReferenceId: string): Promise<{ cancelled: boolean; reason?: string }>;
  reconcile?(externalReferenceId: string): Promise<AdapterExecutionResult>;
}
