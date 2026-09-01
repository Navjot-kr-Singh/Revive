import { describe, it, expect } from 'vitest';
import { HypothesisEngine } from '@/ai/investigation/hypothesis-engine';
import { type EvidenceItem } from '@/ai/investigation/schemas';
import { CANDIDATE_HYPOTHESES, EVIDENCE_TYPES } from '@/lib/constants';

describe('Hypothesis Engine & Dimensional Specificity', () => {
  const dummyIncidentId = '00000000-0000-0000-0000-000000000001';

  it('accurately scores BANK_PAYMENT_METHOD_DEGRADATION when HDFC UPI fails but cards remain normal', () => {
    const evidence: EvidenceItem[] = [
      {
        evidenceId: 'E-101',
        incidentId: dummyIncidentId,
        type: EVIDENCE_TYPES.PAYMENT_METRIC,
        source: 'detector',
        timestamp: new Date().toISOString(),
        description: 'Failure rate spiked to 21.7% from 2.1%.',
        metricValue: { failureRate: 0.217 },
        confidence: 0.99,
        relevance: 1.0,
      },
      {
        evidenceId: 'E-102',
        incidentId: dummyIncidentId,
        type: EVIDENCE_TYPES.BANK_SIGNAL,
        source: 'bank_monitor',
        timestamp: new Date().toISOString(),
        description: 'Failures heavily concentrated in HDFC Bank.',
        metricValue: { targetBank: 'HDFC Bank' },
        confidence: 0.95,
        relevance: 0.95,
      },
      {
        evidenceId: 'E-103',
        incidentId: dummyIncidentId,
        type: EVIDENCE_TYPES.PAYMENT_METHOD_SIGNAL,
        source: 'rail_monitor',
        timestamp: new Date().toISOString(),
        description: 'UPI rail failing; Card rail normal at 2.5%.',
        metricValue: { targetRail: 'upi' },
        confidence: 0.94,
        relevance: 0.95,
      },
    ];

    const hypotheses = HypothesisEngine.generateAndScore(evidence);

    expect(hypotheses.length).toBeGreaterThanOrEqual(2);

    // Top hypothesis should be BANK_PAYMENT_METHOD_DEGRADATION
    const top = hypotheses[0];
    expect(top.hypothesis).toBe(CANDIDATE_HYPOTHESES.BANK_PAYMENT_METHOD_DEGRADATION);
    expect(top.finalScore).toBeGreaterThan(0.80);
    expect(top.supportingEvidenceIds).toContain('E-101');
    expect(top.supportingEvidenceIds).toContain('E-102');
    expect(top.supportingEvidenceIds).toContain('E-103');

    // General bank degradation should have a contradiction penalty due to normal cards
    const bankHyp = hypotheses.find((h) => h.hypothesis === CANDIDATE_HYPOTHESES.BANK_DEGRADATION);
    expect(bankHyp).toBeDefined();
    expect(bankHyp!.contradictionScore).toBeGreaterThan(0);
    expect(bankHyp!.contradictingEvidenceIds).toContain('E-103');
  });

  it('accurately distinguishes BANK_DEGRADATION when all payment rails fail equally for a bank', () => {
    const evidence: EvidenceItem[] = [
      {
        evidenceId: 'E-101',
        incidentId: dummyIncidentId,
        type: EVIDENCE_TYPES.PAYMENT_METRIC,
        source: 'detector',
        timestamp: new Date().toISOString(),
        description: 'Failure rate spiked to 35.0% from 2.5%.',
        metricValue: { failureRate: 0.35 },
        confidence: 0.99,
        relevance: 1.0,
      },
      {
        evidenceId: 'E-102',
        incidentId: dummyIncidentId,
        type: EVIDENCE_TYPES.BANK_SIGNAL,
        source: 'bank_monitor',
        timestamp: new Date().toISOString(),
        description: 'Concentrated in ICICI Bank.',
        metricValue: { targetBank: 'ICICI Bank' },
        confidence: 0.96,
        relevance: 0.95,
      },
      {
        evidenceId: 'E-103',
        incidentId: dummyIncidentId,
        type: EVIDENCE_TYPES.PAYMENT_METHOD_SIGNAL,
        source: 'rail_monitor',
        timestamp: new Date().toISOString(),
        description: 'All payment rails (UPI, Card, Netbanking) failing equally across the board.',
        metricValue: { targetRail: 'all' },
        confidence: 0.95,
        relevance: 0.90,
      },
    ];

    const hypotheses = HypothesisEngine.generateAndScore(evidence);
    expect(hypotheses[0].hypothesis).toBe(CANDIDATE_HYPOTHESES.BANK_DEGRADATION);
    expect(hypotheses[0].finalScore).toBeGreaterThanOrEqual(0.95);
  });
});
