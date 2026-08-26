import { type EvidenceItem, type CandidateHypothesis, type DiagnosisResult, DiagnosisResultSchema } from './schemas';
import { INCIDENT_INVESTIGATOR_PROMPT_V1 } from './prompts';
import { getAIProvider, type AIStructuredResponse } from '../provider';
import { RecommendationEngine } from './recommendation-engine';

export class DiagnosisEngine {
  /**
   * Synthesize evidence and scored hypotheses into a verified, operator-grade diagnosis
   */
  static async synthesize(params: {
    incidentId: string;
    incidentTitle: string;
    severity: string;
    evidence: EvidenceItem[];
    hypotheses: CandidateHypothesis[];
  }): Promise<{ diagnosisResult: DiagnosisResult; aiRunMetadata: AIStructuredResponse<DiagnosisResult> }> {
    const { incidentId, incidentTitle, severity, evidence, hypotheses } = params;

    const validEvidenceIdSet = new Set(evidence.map((e) => e.evidenceId));
    const topHypothesis = hypotheses[0] || {
      hypothesisId: 'hyp_unknown',
      hypothesis: 'UNKNOWN',
      finalScore: 0.5,
      supportingEvidenceIds: [],
      contradictingEvidenceIds: [],
    };

    const recommendations = RecommendationEngine.generate(
      topHypothesis.hypothesis,
      topHypothesis,
      evidence
    );

    const contextPayload = {
      incidentId,
      incidentTitle,
      severity,
      evidence: evidence.map((e) => ({
        evidenceId: e.evidenceId,
        type: e.type,
        description: e.description,
        metricName: e.metricName,
        metricValue: e.metricValue,
        confidence: e.confidence,
      })),
      candidateHypotheses: hypotheses.map((h) => ({
        hypothesis: h.hypothesis,
        finalScore: h.finalScore,
        supportingEvidenceIds: h.supportingEvidenceIds,
        contradictingEvidenceIds: h.contradictingEvidenceIds,
      })),
      mockResult: {
        primaryDiagnosis: topHypothesis.hypothesis,
        confidence: topHypothesis.finalScore,
        severity,
        supportingEvidenceIds: topHypothesis.supportingEvidenceIds,
        contradictingEvidenceIds: topHypothesis.contradictingEvidenceIds,
        missingEvidence: hypotheses.length > 2 ? ['bank_internal_switch_telemetry'] : [],
        rootCauseExplanation: `Analysis of ${evidence.length} evidence signals confirms ${topHypothesis.hypothesis} with ${(topHypothesis.finalScore * 100).toFixed(0)}% confidence based on concentrated metric deviations.`,
        uncertaintyNotes: topHypothesis.contradictingEvidenceIds.length > 0
          ? 'Alternate rails exhibited normal baseline variance, ruling out a full core banking outage.'
          : 'No major conflicting signals detected in the active telemetry window.',
        recommendations,
      },
    };

    const aiProvider = getAIProvider();
    const aiResponse = await aiProvider.generateStructured<DiagnosisResult>({
      promptId: INCIDENT_INVESTIGATOR_PROMPT_V1.promptId,
      promptVersion: INCIDENT_INVESTIGATOR_PROMPT_V1.version,
      systemInstruction: INCIDENT_INVESTIGATOR_PROMPT_V1.systemInstruction,
      userPrompt: INCIDENT_INVESTIGATOR_PROMPT_V1.formatUserPrompt(contextPayload),
      schema: DiagnosisResultSchema,
    });

    const result = aiResponse.data;

    // Strict No-Hallucination Evidence Filter:
    // Ensure all cited evidence IDs strictly exist in the collected evidence bag
    result.supportingEvidenceIds = result.supportingEvidenceIds.filter((id) => validEvidenceIdSet.has(id));
    result.contradictingEvidenceIds = result.contradictingEvidenceIds.filter((id) => validEvidenceIdSet.has(id));

    // If all supporting evidence was hallucinated/empty, fall back to top hypothesis citations
    if (result.supportingEvidenceIds.length === 0 && topHypothesis.supportingEvidenceIds.length > 0) {
      result.supportingEvidenceIds = topHypothesis.supportingEvidenceIds;
    }

    return {
      diagnosisResult: result,
      aiRunMetadata: aiResponse,
    };
  }
}
