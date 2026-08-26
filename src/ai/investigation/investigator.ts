import { getDb } from '@/server/db';
import { incidents, investigations, aiRuns, auditEvents } from '@/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { EvidenceCollector } from './evidence-collector';
import { HypothesisEngine } from './hypothesis-engine';
import { DiagnosisEngine } from './diagnosis-engine';
import { type InvestigationResult, InvestigationResultSchema } from './schemas';
import { INVESTIGATION_STATES } from '@/lib/constants';

export class IncidentInvestigator {
  /**
   * Execute full end-to-end investigation pipeline for an incident
   */
  static async investigate(merchantId: string, incidentId: string): Promise<InvestigationResult> {
    const db = getDb();
    const startTime = new Date();

    // 1. Verify Incident exists and belongs to merchant
    const [inc] = await db
      .select()
      .from(incidents)
      .where(and(eq(incidents.id, incidentId), eq(incidents.merchantId, merchantId)));

    if (!inc) {
      throw new Error(`Incident not found or unauthorized: ${incidentId}`);
    }

    // 2. Initialize Investigation Record (PENDING)
    const timeline: Array<{ timestamp: string; step: string; description: string }> = [
      {
        timestamp: startTime.toISOString(),
        step: 'INVESTIGATION_STARTED',
        description: `Autonomous investigation initiated for incident ${incidentId.slice(0, 8)}...`,
      },
    ];

    const [inv] = await db
      .insert(investigations)
      .values({
        incidentId,
        merchantId,
        status: INVESTIGATION_STATES.COLLECTING_EVIDENCE,
        timeline,
      })
      .returning();

    try {
      // 3. Collect Multi-dimensional Evidence
      const collector = new EvidenceCollector(merchantId, incidentId);
      const { evidence, toolCalls } = await collector.collectAll();

      timeline.push({
        timestamp: new Date().toISOString(),
        step: 'EVIDENCE_COLLECTED',
        description: `Retrieved ${evidence.length} verified evidence items across ${toolCalls} diagnostic tools.`,
      });

      // 4. Generate & Score Candidate Hypotheses
      await db
        .update(investigations)
        .set({ status: INVESTIGATION_STATES.ANALYZING, timeline })
        .where(eq(investigations.id, inv.id));

      const hypotheses = HypothesisEngine.generateAndScore(evidence);

      timeline.push({
        timestamp: new Date().toISOString(),
        step: 'HYPOTHESES_SCORED',
        description: `Evaluated and scored ${hypotheses.length} candidate hypotheses against observed metrics.`,
      });

      // 5. Synthesize AI Diagnosis
      await db
        .update(investigations)
        .set({ status: INVESTIGATION_STATES.HYPOTHESIS_GENERATED, timeline })
        .where(eq(investigations.id, inv.id));

      const { diagnosisResult, aiRunMetadata } = await DiagnosisEngine.synthesize({
        incidentId,
        incidentTitle: inc.title,
        severity: inc.severity,
        evidence,
        hypotheses,
      });

      timeline.push({
        timestamp: new Date().toISOString(),
        step: 'DIAGNOSIS_COMPLETED',
        description: `Primary diagnosis: ${diagnosisResult.primaryDiagnosis} (${(diagnosisResult.confidence * 100).toFixed(0)}% confidence) via ${aiRunMetadata.provider}.`,
      });

      timeline.push({
        timestamp: new Date().toISOString(),
        step: 'RECOMMENDATIONS_READY',
        description: `Generated ${diagnosisResult.recommendations.length} recovery recommendations pending Policy Engine evaluation.`,
      });

      const completedAt = new Date();

      // 6. Record Audit in ai_runs table
      await db.insert(aiRuns).values({
        investigationId: inv.id,
        incidentId,
        merchantId,
        runType: 'root_cause',
        provider: aiRunMetadata.provider,
        model: aiRunMetadata.model,
        modelVersion: aiRunMetadata.modelVersion,
        promptId: aiRunMetadata.promptId,
        promptVersion: aiRunMetadata.promptVersion,
        inputData: { incidentId, severity: inc.severity },
        outputData: diagnosisResult,
        inputHash: aiRunMetadata.inputHash,
        outputHash: aiRunMetadata.outputHash,
        tokenUsage: { promptTokens: aiRunMetadata.promptTokens, completionTokens: aiRunMetadata.completionTokens },
        latencyMs: aiRunMetadata.latencyMs,
        status: aiRunMetadata.status,
        confidence: diagnosisResult.confidence,
      });

      // 7. Update Investigation Record (RECOMMENDATIONS_READY)
      const [finalInv] = await db
        .update(investigations)
        .set({
          status: INVESTIGATION_STATES.RECOMMENDATIONS_READY,
          primaryDiagnosis: diagnosisResult.primaryDiagnosis,
          confidence: diagnosisResult.confidence,
          severity: diagnosisResult.severity,
          rootCauseExplanation: diagnosisResult.rootCauseExplanation,
          uncertaintyNotes: diagnosisResult.uncertaintyNotes,
          supportingEvidenceIds: diagnosisResult.supportingEvidenceIds,
          contradictingEvidenceIds: diagnosisResult.contradictingEvidenceIds,
          missingEvidence: diagnosisResult.missingEvidence,
          recommendedActions: diagnosisResult.recommendations,
          evidenceSnapshot: evidence,
          hypothesesSnapshot: hypotheses,
          timeline,
          modelVersion: aiRunMetadata.model,
          promptVersion: aiRunMetadata.promptVersion,
          isFallback: aiRunMetadata.status === 'fallback',
          completedAt,
          updatedAt: completedAt,
        })
        .where(eq(investigations.id, inv.id))
        .returning();

      // 8. Update incident with root cause candidate & confidence
      await db
        .update(incidents)
        .set({
          rootCauseCandidate: diagnosisResult.rootCauseExplanation,
          confidence: diagnosisResult.confidence,
          status: 'investigating',
          updatedAt: completedAt,
        })
        .where(eq(incidents.id, incidentId));

      // 9. Append to Immutable Audit Ledger
      await db.insert(auditEvents).values({
        merchantId,
        entityType: 'investigation',
        entityId: inv.id,
        eventType: 'investigation.completed',
        actor: 'ai_investigator',
        data: {
          incidentId,
          primaryDiagnosis: diagnosisResult.primaryDiagnosis,
          confidence: diagnosisResult.confidence,
          provider: aiRunMetadata.provider,
          evidenceCount: evidence.length,
          recommendationsCount: diagnosisResult.recommendations.length,
        },
      });

      return InvestigationResultSchema.parse({
        investigationId: finalInv.id,
        incidentId: finalInv.incidentId,
        merchantId: finalInv.merchantId,
        status: finalInv.status,
        primaryDiagnosis: finalInv.primaryDiagnosis || diagnosisResult.primaryDiagnosis,
        confidence: finalInv.confidence || diagnosisResult.confidence,
        severity: finalInv.severity || inc.severity,
        rootCauseExplanation: finalInv.rootCauseExplanation || diagnosisResult.rootCauseExplanation,
        uncertaintyNotes: finalInv.uncertaintyNotes || diagnosisResult.uncertaintyNotes,
        supportingEvidenceIds: finalInv.supportingEvidenceIds || diagnosisResult.supportingEvidenceIds,
        contradictingEvidenceIds: finalInv.contradictingEvidenceIds || diagnosisResult.contradictingEvidenceIds,
        missingEvidence: finalInv.missingEvidence || diagnosisResult.missingEvidence,
        evidence,
        hypotheses,
        recommendations: diagnosisResult.recommendations,
        timeline,
        modelVersion: aiRunMetadata.model,
        promptVersion: aiRunMetadata.promptVersion,
        isFallback: finalInv.isFallback,
        completedAt: completedAt.toISOString(),
      });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      timeline.push({
        timestamp: new Date().toISOString(),
        step: 'INVESTIGATION_FAILED',
        description: `Investigation failed: ${errorMsg}`,
      });

      await db
        .update(investigations)
        .set({
          status: INVESTIGATION_STATES.FAILED,
          uncertaintyNotes: `Pipeline failure: ${errorMsg}`,
          timeline,
          updatedAt: new Date(),
        })
        .where(eq(investigations.id, inv.id));

      throw err;
    }
  }
}
