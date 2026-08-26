import { describe, it, expect } from 'vitest';
import { IncidentDetector } from '@/server/services/incident/incident-detector';
import { type WindowMetrics } from '@/server/services/incident/aggregation-engine';
import { INCIDENT_SEVERITY } from '@/lib/constants';

describe('Statistical Incident Detector & Anomaly Validation', () => {
  it('does NOT trigger an incident under normal statistical variance (false positive prevention)', () => {
    // Normal baseline for HDFC UPI is 2.1%. Suppose observed is 2.8% on 500 transactions.
    const normalWindow: WindowMetrics = {
      dimension: 'HDFC Bank|upi',
      bank: 'HDFC Bank',
      paymentMethod: 'upi',
      merchantId: 'merch_test',
      windowStart: new Date(),
      windowEnd: new Date(),
      totalTransactions: 500,
      successfulTransactions: 486,
      failedTransactions: 14,
      failureRate: 14 / 500, // 2.8% failure rate (within normal variance)
      successRate: 486 / 500,
      totalGmvMinor: 500 * 250000,
      failedGmvMinor: 14 * 250000,
      avgTicketMinor: 250000,
      failuresByCode: { INSUFFICIENT_FUNDS: 10, NETWORK_ERROR: 4 },
    };

    const signal = IncidentDetector.evaluateWindow(normalWindow);

    expect(signal.isAnomaly).toBe(false);
    expect(signal.revenueAtRiskMinor).toBe(0);
  });

  it('does NOT trigger an incident when sample size is too small to be statistically significant', () => {
    // 2 failures out of 3 transactions (66% failure rate, but sample size is only 3)
    const tinyWindow: WindowMetrics = {
      dimension: 'HDFC Bank|upi',
      bank: 'HDFC Bank',
      paymentMethod: 'upi',
      merchantId: 'merch_test',
      windowStart: new Date(),
      windowEnd: new Date(),
      totalTransactions: 3,
      successfulTransactions: 1,
      failedTransactions: 2,
      failureRate: 2 / 3,
      successRate: 1 / 3,
      totalGmvMinor: 3 * 250000,
      failedGmvMinor: 2 * 250000,
      avgTicketMinor: 250000,
      failuresByCode: { BANK_TIMEOUT: 2 },
    };

    const signal = IncidentDetector.evaluateWindow(tinyWindow);

    expect(signal.isAnomaly).toBe(false); // Ignored due to min sample size cutoff
  });

  it('DOES trigger a CRITICAL incident on genuine systemic degradation and accurately computes revenue at risk', () => {
    // Degradation: HDFC UPI failure rate spikes to 26.6% on 400 transactions
    const totalGmv = 400 * 300000; // 400 tx @ ₹3,000 = ₹12,00,000 (120,000,000 paise)
    const degradedWindow: WindowMetrics = {
      dimension: 'HDFC Bank|upi',
      bank: 'HDFC Bank',
      paymentMethod: 'upi',
      merchantId: 'merch_test',
      windowStart: new Date(),
      windowEnd: new Date(),
      totalTransactions: 400,
      successfulTransactions: 294,
      failedTransactions: 106, // 26.5% failure rate
      failureRate: 106 / 400,
      successRate: 294 / 400,
      totalGmvMinor: totalGmv,
      failedGmvMinor: 106 * 300000,
      avgTicketMinor: 300000,
      failuresByCode: { BANK_TIMEOUT: 100, INSUFFICIENT_FUNDS: 6 },
    };

    const signal = IncidentDetector.evaluateWindow(degradedWindow);

    expect(signal.isAnomaly).toBe(true);
    expect(signal.severity).toBe(INCIDENT_SEVERITY.CRITICAL);
    expect(signal.primaryFailureCode).toBe('BANK_TIMEOUT');
    expect(signal.relativeChange).toBeGreaterThan(8.0); // > 8x baseline
    expect(signal.confidence).toBeGreaterThanOrEqual(0.90);
    expect(signal.revenueAtRiskMinor).toBeGreaterThan(0);

    // Revenue at risk should represent lost GMV compared to 97.9% normal baseline
    // Expected Success: ~391.6 tx @ ₹3,000 = ~₹11,74,800
    // Observed Success: 294 tx @ ₹3,000 = ₹8,82,000
    // Revenue at Risk: ~₹2,92,800 (29,280,000 paise)
    expect(signal.revenueAtRiskMinor).toBeGreaterThan(25_000_000);
  });
});
