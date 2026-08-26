import { describe, it, expect } from 'vitest';
import { DiagnosisEngine } from '@/ai/investigation/diagnosis-engine';
import { type EvidenceItem, type CandidateHypothesis } from '@/ai/investigation/schemas';
import { CANDIDATE_HYPOTHESES, EVIDENCE_TYPES, INCIDENT_SEVERITY } from '@/lib/constants';

describe('Diagnosis Engine & Non-Hallucination Enforcement', () => {
  const dummyIncidentId = '00000000-0000-0000-0000-000000000001';

  it('filters out hallucinated evidence IDs that do not exist in the evidence bag', async () => {
    const validEvidence: EvidenceItem[] = [
      {
        evidenceId: 'E-101',
        incidentId: dummyIncidentId,
        type: EVIDENCE_TYPES.PAYMENT_METRIC,
        source: 'detector',
        timestamp: new Date().toISOString(),
        description: 'Valid evidence item.',
        metricValue: 123,
        confidence: 0.95,
        relevance: 1.0,
      },
    ];

    const hypotheses: CandidateHypothesis[] = [
      {
        hypothesisId: 'hyp_1',
        hypothesis: CANDIDATE_HYPOTHESES.BANK_DEGRADATION,
        description: 'Bank degradation.',
        priorScore: 0.3,
        evidenceScore: 0.6,
        contradictionScore: 0.0,
        coverageScore: 0.9,
        finalScore: 0.9,
        supportingEvidenceIds: ['E-101', 'E-999'], // E-999 is fabricated/hallucinated
        contradictingEvidenceIds: ['E-888'], // E-888 is fabricated
      },
    ];

    const { diagnosisResult } = await DiagnosisEngine.synthesize({
      incidentId: dummyIncidentId,
      incidentTitle: 'HDFC UPI Degradation',
      severity: INCIDENT_SEVERITY.CRITICAL,
      evidence: validEvidence,
      hypotheses,
    });

    expect(diagnosisResult.primaryDiagnosis).toBe(CANDIDATE_HYPOTHESES.BANK_DEGRADATION);
    // E-999 and E-888 must be stripped out!
    expect(diagnosisResult.supportingEvidenceIds).toContain('E-101');
    expect(diagnosisResult.supportingEvidenceIds).not.toContain('E-999');
    expect(diagnosisResult.contradictingEvidenceIds).not.toContain('E-888');
  });

  it('correctly handles low-confidence unknown scenarios with missing evidence', async () => {
    const emptyEvidence: EvidenceItem[] = [];
    const hypotheses: CandidateHypothesis[] = [];

    const { diagnosisResult } = await DiagnosisEngine.synthesize({
      incidentId: dummyIncidentId,
      incidentTitle: 'Ambiguous Incident',
      severity: INCIDENT_SEVERITY.LOW,
      evidence: emptyEvidence,
      hypotheses,
    });

    expect(diagnosisResult.primaryDiagnosis).toBe('UNKNOWN');
    expect(diagnosisResult.recommendations.length).toBeGreaterThan(0);
    expect(diagnosisResult.recommendations.some((r) => r.action === 'HUMAN_ESCALATION')).toBe(true);
  });
});
