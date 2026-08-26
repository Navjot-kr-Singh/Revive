/**
 * REVIVE — Statistical Incident & Degradation Detector
 * 
 * Analyzes aggregated window metrics against established baselines using
 * deterministic statistical rules. Prevents false positives through minimum sample
 * size cutoffs and multi-threshold significance validation.
 */

import { type WindowMetrics } from './aggregation-engine';
import { BaselineEngine, type BaselineProfile } from './baseline-engine';
import { INCIDENT_SEVERITY, type IncidentSeverity } from '@/lib/constants';
import { multiplyMoney, subtractMoney } from '@/lib/money';

export interface DetectionSignal {
  signalId: string;
  merchantId: string;
  dimension: string;
  bank: string;
  paymentMethod: string;
  windowStart: Date;
  windowEnd: Date;
  baselineValue: number; // Baseline failure rate
  observedValue: number; // Observed failure rate
  delta: number; // absolute difference
  relativeChange: number; // e.g. 8.9x baseline
  transactionCount: number;
  failedCount: number;
  totalGmvMinor: number;
  revenueAtRiskMinor: number;
  severity: IncidentSeverity;
  confidence: number;
  detectionRule: string;
  primaryFailureCode?: string;
  isAnomaly: boolean;
  detectedAt: Date;
}

export class IncidentDetector {
  /**
   * Minimum absolute rate increase required to consider an anomaly (e.g. 4.0% increase)
   */
  private static readonly MIN_ABSOLUTE_DELTA = 0.04;

  /**
   * Minimum relative multiplier over baseline (e.g. 2.0x baseline)
   */
  private static readonly MIN_RELATIVE_MULTIPLIER = 2.0;

  /**
   * Minimum sample size across window
   */
  private static readonly DEFAULT_MIN_SAMPLES = 10;

  /**
   * Evaluate a single aggregated window metric for degradation anomalies.
   */
  static evaluateWindow(metrics: WindowMetrics, baselineOverride?: BaselineProfile): DetectionSignal {
    const bank = metrics.bank || 'UNKNOWN_BANK';
    const method = metrics.paymentMethod || 'unknown';
    const baseline = baselineOverride ?? BaselineEngine.getBaseline(bank, method);

    const n = metrics.totalTransactions;
    const observedRate = metrics.failureRate;
    const baseRate = baseline.baselineFailureRate;
    const delta = observedRate - baseRate;
    const relativeChange = baseRate > 0 ? observedRate / baseRate : 1.0;

    // Determine primary failure code in this window
    let topFailureCode: string | undefined;
    let topFailureCount = 0;
    for (const [code, count] of Object.entries(metrics.failuresByCode)) {
      if (count > topFailureCount) {
        topFailureCount = count;
        topFailureCode = code;
      }
    }

    // ─── 1. Check Sample Size Cutoff ──────────────────────────────
    const minSamples = Math.max(baseline.minSampleSize, this.DEFAULT_MIN_SAMPLES);
    if (n < minSamples) {
      return this.createNonAnomalySignal(metrics, baseline, delta, relativeChange, topFailureCode);
    }

    // ─── 2. Evaluate Statistical Anomaly Conditions ───────────────
    // An anomaly requires BOTH:
    // (a) Absolute failure rate increase >= MIN_ABSOLUTE_DELTA
    // (b) Relative failure rate >= MIN_RELATIVE_MULTIPLIER * baseline
    const isStatisticallyDegraded =
      delta >= this.MIN_ABSOLUTE_DELTA &&
      relativeChange >= this.MIN_RELATIVE_MULTIPLIER;

    if (!isStatisticallyDegraded) {
      return this.createNonAnomalySignal(metrics, baseline, delta, relativeChange, topFailureCode);
    }

    // ─── 3. Calculate Financial Revenue at Risk ───────────────────
    // Expected Successful GMV = totalTransactions * avgTicket * baselineSuccessRate
    // Observed Successful GMV = successfulTransactions * avgTicket
    // Revenue At Risk Minor = max(0, Expected GMV - Observed GMV)
    const expectedSuccessGmv = multiplyMoney(metrics.totalGmvMinor, baseline.baselineSuccessRate);
    const observedSuccessGmv = multiplyMoney(metrics.totalGmvMinor, metrics.successRate);
    const rawRevenueAtRiskMinor = Math.max(0, subtractMoney(expectedSuccessGmv, observedSuccessGmv));

    // ─── 4. Compute Confidence Score (0.0 to 1.0) ─────────────────
    // Factors: sample size weight + delta magnitude
    const sampleWeight = Math.min(1.0, n / 50); // full weight at 50+ transactions
    const deltaWeight = Math.min(1.0, delta / 0.20); // full weight at 20%+ delta
    const confidence = Math.min(0.99, 0.70 + 0.15 * sampleWeight + 0.14 * deltaWeight);

    // ─── 5. Determine Severity Tier ───────────────────────────────
    const severity = this.calculateSeverity(observedRate, delta, relativeChange, rawRevenueAtRiskMinor, n);

    return {
      signalId: `sig_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      merchantId: metrics.merchantId,
      dimension: metrics.dimension,
      bank,
      paymentMethod: method,
      windowStart: metrics.windowStart,
      windowEnd: metrics.windowEnd,
      baselineValue: baseRate,
      observedValue: observedRate,
      delta: Number(delta.toFixed(4)),
      relativeChange: Number(relativeChange.toFixed(2)),
      transactionCount: n,
      failedCount: metrics.failedTransactions,
      totalGmvMinor: metrics.totalGmvMinor,
      revenueAtRiskMinor: rawRevenueAtRiskMinor,
      severity,
      confidence: Number(confidence.toFixed(2)),
      detectionRule: 'STATISTICAL_RATE_DEVIATION',
      primaryFailureCode: topFailureCode,
      isAnomaly: true,
      detectedAt: new Date(),
    };
  }

  /**
   * Deterministic Severity Matrix based on rate delta, revenue impact, and volume.
   */
  private static calculateSeverity(
    observedRate: number,
    delta: number,
    relativeChange: number,
    revenueAtRiskMinor: number,
    volume: number
  ): IncidentSeverity {
    // CRITICAL: failure rate >= 20% with 30+ tx, OR revenue at risk >= ₹5,00,000, OR 8x baseline
    if (
      (observedRate >= 0.20 && volume >= 30) ||
      revenueAtRiskMinor >= 50_000_000 || // ₹5,00,000
      relativeChange >= 8.0
    ) {
      return INCIDENT_SEVERITY.CRITICAL;
    }

    // HIGH: failure rate >= 12% with 20+ tx, OR revenue at risk >= ₹1,00,000, OR 4x baseline
    if (
      (observedRate >= 0.12 && volume >= 20) ||
      revenueAtRiskMinor >= 10_000_000 || // ₹1,00,000
      relativeChange >= 4.0
    ) {
      return INCIDENT_SEVERITY.HIGH;
    }

    // MEDIUM: failure rate >= 7% with 15+ tx, OR revenue at risk >= ₹25,000
    if (
      (observedRate >= 0.07 && volume >= 15) ||
      revenueAtRiskMinor >= 2_500_000 ||
      relativeChange >= 2.5
    ) {
      return INCIDENT_SEVERITY.MEDIUM;
    }

    return INCIDENT_SEVERITY.LOW;
  }

  private static createNonAnomalySignal(
    metrics: WindowMetrics,
    baseline: BaselineProfile,
    delta: number,
    relativeChange: number,
    topFailureCode?: string
  ): DetectionSignal {
    return {
      signalId: `sig_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      merchantId: metrics.merchantId,
      dimension: metrics.dimension,
      bank: metrics.bank || 'UNKNOWN_BANK',
      paymentMethod: metrics.paymentMethod || 'unknown',
      windowStart: metrics.windowStart,
      windowEnd: metrics.windowEnd,
      baselineValue: baseline.baselineFailureRate,
      observedValue: metrics.failureRate,
      delta: Number(delta.toFixed(4)),
      relativeChange: Number(relativeChange.toFixed(2)),
      transactionCount: metrics.totalTransactions,
      failedCount: metrics.failedTransactions,
      totalGmvMinor: metrics.totalGmvMinor,
      revenueAtRiskMinor: 0,
      severity: INCIDENT_SEVERITY.LOW,
      confidence: 0.95,
      detectionRule: 'STATISTICAL_RATE_DEVIATION',
      primaryFailureCode: topFailureCode,
      isAnomaly: false,
      detectedAt: new Date(),
    };
  }
}
