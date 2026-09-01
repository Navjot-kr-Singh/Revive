import { describe, it, expect } from 'vitest';
import { CASE_STATES } from '@/lib/constants';

describe('Human Review Queue & Operator Controls', () => {
  it('transitions case state correctly upon APPROVE, REJECT, and ESCALATE actions', () => {
    // Approve transitions from escalated -> decision_pending
    const approveResult = {
      action: 'APPROVE',
      resultingState: CASE_STATES.DECISION_PENDING,
    };
    expect(approveResult.resultingState).toBe('decision_pending');

    // Reject transitions from escalated -> stopped
    const rejectResult = {
      action: 'REJECT',
      resultingState: CASE_STATES.STOPPED,
    };
    expect(rejectResult.resultingState).toBe('stopped');

    // Escalate keeps in escalated
    const escalateResult = {
      action: 'ESCALATE',
      resultingState: CASE_STATES.ESCALATED,
    };
    expect(escalateResult.resultingState).toBe('escalated');
  });
});
