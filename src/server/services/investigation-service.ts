import { getDb } from '@/server/db';
import { investigations, aiRuns } from '@/server/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { IncidentInvestigator } from '@/ai/investigation/investigator';
import { type InvestigationResult } from '@/ai/investigation/schemas';

export class InvestigationService {
  /**
   * Run or re-run investigation for an incident
   */
  static async runInvestigation(merchantId: string, incidentId: string): Promise<InvestigationResult> {
    return IncidentInvestigator.investigate(merchantId, incidentId);
  }

  /**
   * Get latest completed or active investigation for an incident
   */
  static async getLatestInvestigation(merchantId: string, incidentId: string) {
    const db = getDb();
    const [inv] = await db
      .select()
      .from(investigations)
      .where(and(eq(investigations.incidentId, incidentId), eq(investigations.merchantId, merchantId)))
      .orderBy(desc(investigations.createdAt))
      .limit(1);

    if (!inv) return null;

    // Fetch latest AI Run audit metadata
    const [latestRun] = await db
      .select()
      .from(aiRuns)
      .where(and(eq(aiRuns.investigationId, inv.id), eq(aiRuns.merchantId, merchantId)))
      .orderBy(desc(aiRuns.createdAt))
      .limit(1);

    return {
      ...inv,
      aiRun: latestRun || null,
    };
  }

  /**
   * Get single investigation by investigation ID
   */
  static async getInvestigationById(merchantId: string, investigationId: string) {
    const db = getDb();
    const [inv] = await db
      .select()
      .from(investigations)
      .where(and(eq(investigations.id, investigationId), eq(investigations.merchantId, merchantId)));

    return inv || null;
  }

  /**
   * Get evidence snapshot for an incident
   */
  static async getIncidentEvidence(merchantId: string, incidentId: string) {
    const latest = await this.getLatestInvestigation(merchantId, incidentId);
    return latest?.evidenceSnapshot || [];
  }

  /**
   * Get hypotheses snapshot for an incident
   */
  static async getIncidentHypotheses(merchantId: string, incidentId: string) {
    const latest = await this.getLatestInvestigation(merchantId, incidentId);
    return latest?.hypothesesSnapshot || [];
  }

  /**
   * Get recommended recovery actions for an incident
   */
  static async getIncidentRecommendations(merchantId: string, incidentId: string) {
    const latest = await this.getLatestInvestigation(merchantId, incidentId);
    return latest?.recommendedActions || [];
  }
}
