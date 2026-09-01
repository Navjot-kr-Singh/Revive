import { type RecommendationItem, type CandidateHypothesis, type EvidenceItem } from './schemas';
import { RECOVERY_RECOMMENDATIONS, CANDIDATE_HYPOTHESES } from '@/lib/constants';

export class RecommendationEngine {
  /**
   * Generates structured recovery recommendations based on verified diagnosis and evidence
   */
  static generate(
    primaryDiagnosis: string,
    topHypothesis: CandidateHypothesis,
    _evidence: EvidenceItem[]
  ): RecommendationItem[] {
    const recommendations: RecommendationItem[] = [];
    const citedEvidenceIds = topHypothesis.supportingEvidenceIds;

    switch (primaryDiagnosis) {
      case CANDIDATE_HYPOTHESES.BANK_PAYMENT_METHOD_DEGRADATION:
      case CANDIDATE_HYPOTHESES.PAYMENT_METHOD_DEGRADATION:
        recommendations.push({
          action: RECOVERY_RECOMMENDATIONS.ALTERNATIVE_PAYMENT_METHOD,
          reason: 'Degradation is isolated to a specific payment rail (e.g., UPI) while Card and Netbanking rails remain operational.',
          expectedBenefit: 'Estimated 65–80% recovery rate on failed transactions by prompting fallback to saved card or alternate UPI VPA.',
          confidence: 0.92,
          risk: 'LOW',
          customerFriction: 'LOW',
          requiredEvidence: citedEvidenceIds,
          policyRequirements: 'Pending Policy Engine Verification',
          stoppingCondition: 'Halt rail switch when target rail failure rate drops below 3.5% for 3 consecutive 1-minute windows.',
        });
        recommendations.push({
          action: RECOVERY_RECOMMENDATIONS.PAYMENT_LINK,
          reason: 'Send asynchronous recovery payment links for high-value orders to prevent cart abandonment.',
          expectedBenefit: 'Estimated 45–60% conversion on high-value items within 2 hours.',
          confidence: 0.85,
          risk: 'LOW',
          customerFriction: 'LOW',
          requiredEvidence: citedEvidenceIds,
          policyRequirements: 'Pending Policy Engine Verification',
          stoppingCondition: 'Cease link issuance when case TTL reaches 24 hours.',
        });
        break;

      case CANDIDATE_HYPOTHESES.BANK_DEGRADATION:
        recommendations.push({
          action: RECOVERY_RECOMMENDATIONS.TRAFFIC_ROUTING,
          reason: 'Bank-wide switch authorization failure across all rails for the target bank.',
          expectedBenefit: 'Avoids continued failed payment attempts; prompts user for alternate bank account.',
          confidence: 0.88,
          risk: 'MEDIUM',
          customerFriction: 'MEDIUM',
          requiredEvidence: citedEvidenceIds,
          policyRequirements: 'Pending Policy Engine Verification',
          stoppingCondition: 'Resume normal routing when bank authorization health checks pass.',
        });
        break;

      case CANDIDATE_HYPOTHESES.GATEWAY_DEGRADATION:
        recommendations.push({
          action: RECOVERY_RECOMMENDATIONS.TRAFFIC_ROUTING,
          reason: 'Acquiring gateway latency exceeded timeout thresholds across multiple banking institutions.',
          expectedBenefit: 'Failover traffic to secondary payment aggregator (e.g., Cashfree / PayU).',
          confidence: 0.90,
          risk: 'HIGH',
          customerFriction: 'NONE',
          requiredEvidence: citedEvidenceIds,
          policyRequirements: 'Pending Policy Engine Verification',
          stoppingCondition: 'Restore primary gateway after 5 minutes of stable latency < 800ms.',
        });
        break;

      case CANDIDATE_HYPOTHESES.UNKNOWN:
      default:
        recommendations.push({
          action: RECOVERY_RECOMMENDATIONS.HUMAN_ESCALATION,
          reason: 'Ambiguous or conflicting multi-factor signals prevent confident automated recovery.',
          expectedBenefit: 'Prevents automated intervention errors; triggers on-call operations review.',
          confidence: 0.95,
          risk: 'LOW',
          customerFriction: 'NONE',
          requiredEvidence: citedEvidenceIds,
          policyRequirements: 'Pending Policy Engine Verification',
          stoppingCondition: 'Operator manually resolves or re-triggers investigation with new telemetry.',
        });
        break;
    }

    // Always include passive monitoring
    recommendations.push({
      action: RECOVERY_RECOMMENDATIONS.MONITOR,
      reason: 'Continuously observe sliding failure rate window metrics.',
      expectedBenefit: 'Real-time telemetry validation of recovery effectiveness.',
      confidence: 0.99,
      risk: 'LOW',
      customerFriction: 'NONE',
      requiredEvidence: citedEvidenceIds,
      policyRequirements: 'Pending Policy Engine Verification',
      stoppingCondition: 'Complete monitoring when incident reaches RESOLVED state.',
    });

    return recommendations;
  }
}
