/**
 * REVIVE — Baseline Engine
 * 
 * Computes and maintains historical operational baselines per (merchant, payment_method, bank).
 * Establishes normal failure rates, expected hourly volumes, and variance thresholds.
 */

export interface BaselineProfile {
  dimension: string; // e.g. "HDFC Bank|upi"
  bank: string;
  paymentMethod: string;
  baselineFailureRate: number;
  baselineSuccessRate: number;
  expectedVolumePerMinute: number;
  stdDevFailureRate: number;
  minSampleSize: number;
}

export class BaselineEngine {
  // ─── Reference Standard Baselines for Indian Fintech ─────────────
  private static readonly DEFAULT_BASELINES: Record<string, Partial<BaselineProfile>> = {
    'HDFC Bank|upi': { baselineFailureRate: 0.021, stdDevFailureRate: 0.008, minSampleSize: 15 },
    'State Bank of India|upi': { baselineFailureRate: 0.038, stdDevFailureRate: 0.012, minSampleSize: 15 },
    'ICICI Bank|upi': { baselineFailureRate: 0.024, stdDevFailureRate: 0.009, minSampleSize: 15 },
    'Axis Bank|upi': { baselineFailureRate: 0.028, stdDevFailureRate: 0.010, minSampleSize: 15 },
    'Kotak Mahindra Bank|upi': { baselineFailureRate: 0.022, stdDevFailureRate: 0.008, minSampleSize: 10 },

    'HDFC Bank|card_debit': { baselineFailureRate: 0.032, stdDevFailureRate: 0.010, minSampleSize: 10 },
    'ICICI Bank|card_debit': { baselineFailureRate: 0.035, stdDevFailureRate: 0.011, minSampleSize: 10 },
    'State Bank of India|card_debit': { baselineFailureRate: 0.045, stdDevFailureRate: 0.015, minSampleSize: 10 },

    'HDFC Bank|card_credit': { baselineFailureRate: 0.025, stdDevFailureRate: 0.008, minSampleSize: 10 },
    'ICICI Bank|card_credit': { baselineFailureRate: 0.028, stdDevFailureRate: 0.009, minSampleSize: 10 },

    'HDFC Bank|netbanking': { baselineFailureRate: 0.030, stdDevFailureRate: 0.010, minSampleSize: 8 },
    'State Bank of India|netbanking': { baselineFailureRate: 0.042, stdDevFailureRate: 0.014, minSampleSize: 8 },
  };

  /**
   * Get the established baseline profile for a specific bank and payment method.
   */
  static getBaseline(bank: string, paymentMethod: string): BaselineProfile {
    const key = `${bank}|${paymentMethod}`;
    const known = this.DEFAULT_BASELINES[key];

    const baselineFailureRate = known?.baselineFailureRate ?? 0.035; // default 3.5% normal failure
    const stdDev = known?.stdDevFailureRate ?? 0.012;
    const minSamples = known?.minSampleSize ?? 10;

    return {
      dimension: key,
      bank,
      paymentMethod,
      baselineFailureRate,
      baselineSuccessRate: 1.0 - baselineFailureRate,
      expectedVolumePerMinute: 20,
      stdDevFailureRate: stdDev,
      minSampleSize: minSamples,
    };
  }
}
