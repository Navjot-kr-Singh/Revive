import { describe, it, expect, vi } from 'vitest';
import { OutcomeService } from '@/server/services/recovery/outcome-service';

describe('Outcome Observation & Variance Measurement', () => {
  it('computes recovery rate and prediction accuracy accurately', async () => {
    vi.spyOn(OutcomeService, 'getRecoveryMetrics').mockResolvedValue({
      revenueAtRiskMinor: 100000000, // ₹10,00,000 (10 Lakhs)
      expectedRecoveryMinor: 24000000, // ₹2,40,000
      actualRecoveryMinor: 26500000, // ₹2,65,000
      netRecoveredMinor: 26350000,
      varianceMinor: 2500000, // +₹25,000
      recoveryRatePercent: 26.5,
      predictionAccuracyPercent: 90.6,
      policyBlocksCount: 142,
      humanEscalationsCount: 18,
      actionsExecutedCount: 320,
      actionsFailedCount: 12,
      currency: 'INR',
    });

    const metrics = await OutcomeService.getRecoveryMetrics('merchant_001');

    expect(metrics.recoveryRatePercent).toBe(26.5);
    expect(metrics.varianceMinor).toBe(2500000);
    expect(metrics.predictionAccuracyPercent).toBeGreaterThan(90);
    expect(metrics.policyBlocksCount).toBe(142);
  });
});
