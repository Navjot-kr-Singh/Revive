/**
 * REVIVE — Synthetic Incident Scenario Generator
 * 
 * Defines deterministic degradation scenarios for testing, evaluation, and hero demo execution.
 */

export interface DegradationScenarioConfig {
  scenarioId: 'BANK_UPI_DEGRADATION' | 'CARD_GATEWAY_OUTAGE' | 'NORMAL_BASELINE';
  targetBank: string;
  targetPaymentMethod: string;
  baselineFailureRate: number;
  incidentFailureRate: number;
  startWindowOffsetMinutes: number;
  durationMinutes: number;
  failureCode: string;
  failureReason: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
}

export const HERO_UPI_SCENARIO: DegradationScenarioConfig = {
  scenarioId: 'BANK_UPI_DEGRADATION',
  targetBank: 'HDFC Bank',
  targetPaymentMethod: 'upi',
  baselineFailureRate: 0.021, // 2.1% baseline failure rate
  incidentFailureRate: 0.266, // 26.6% failure rate (73.4% success rate)
  startWindowOffsetMinutes: 15,
  durationMinutes: 45,
  failureCode: 'BANK_TIMEOUT',
  failureReason: 'HDFC Bank UPI Switch timeout during MPIN debit verification',
  severity: 'critical',
  title: 'HDFC Bank UPI Payment Switch Degradation',
};

export const CARD_OUTAGE_SCENARIO: DegradationScenarioConfig = {
  scenarioId: 'CARD_GATEWAY_OUTAGE',
  targetBank: 'ICICI Bank',
  targetPaymentMethod: 'card_debit',
  baselineFailureRate: 0.035,
  incidentFailureRate: 0.35,
  startWindowOffsetMinutes: 10,
  durationMinutes: 30,
  failureCode: 'GATEWAY_TIMEOUT',
  failureReason: 'Card acquiring network timeout on 3DS verification',
  severity: 'high',
  title: 'ICICI Debit Card 3DS Verification Outage',
};
