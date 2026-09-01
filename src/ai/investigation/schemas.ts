import { z } from 'zod';
import {
  EVIDENCE_TYPES,
  CANDIDATE_HYPOTHESES,
  RECOVERY_RECOMMENDATIONS,
  INCIDENT_SEVERITY,
} from '@/lib/constants';

// ─── Evidence Item ─────────────────────────────────
export const EvidenceItemSchema = z.object({
  evidenceId: z.string().regex(/^E-\d{3,}$/, 'Evidence ID must be formatted like E-101, E-102'),
  incidentId: z.string().uuid(),
  type: z.enum([
    EVIDENCE_TYPES.PAYMENT_METRIC,
    EVIDENCE_TYPES.FAILURE_DISTRIBUTION,
    EVIDENCE_TYPES.BANK_SIGNAL,
    EVIDENCE_TYPES.PAYMENT_METHOD_SIGNAL,
    EVIDENCE_TYPES.TIME_SIGNAL,
    EVIDENCE_TYPES.GEOGRAPHIC_SIGNAL,
    EVIDENCE_TYPES.DEVICE_SIGNAL,
    EVIDENCE_TYPES.CUSTOMER_SIGNAL,
    EVIDENCE_TYPES.HISTORICAL_PATTERN,
    EVIDENCE_TYPES.SIMILAR_INCIDENT,
    EVIDENCE_TYPES.SYSTEM_SIGNAL,
  ]),
  source: z.string().min(1),
  timestamp: z.string(),
  description: z.string().min(1),
  metricName: z.string().optional(),
  metricValue: z.union([z.number(), z.string(), z.record(z.string(), z.unknown())]),
  confidence: z.number().min(0).max(1),
  relevance: z.number().min(0).max(1),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type EvidenceItem = z.infer<typeof EvidenceItemSchema>;

// ─── Candidate Hypothesis ──────────────────────────
export const CandidateHypothesisSchema = z.object({
  hypothesisId: z.string(),
  hypothesis: z.enum([
    CANDIDATE_HYPOTHESES.BANK_DEGRADATION,
    CANDIDATE_HYPOTHESES.PAYMENT_METHOD_DEGRADATION,
    CANDIDATE_HYPOTHESES.BANK_PAYMENT_METHOD_DEGRADATION,
    CANDIDATE_HYPOTHESES.GATEWAY_DEGRADATION,
    CANDIDATE_HYPOTHESES.REGIONAL_DEGRADATION,
    CANDIDATE_HYPOTHESES.DEVICE_SPECIFIC_DEGRADATION,
    CANDIDATE_HYPOTHESES.TRAFFIC_SPIKE,
    CANDIDATE_HYPOTHESES.MERCHANT_CONFIGURATION_CHANGE,
    CANDIDATE_HYPOTHESES.CUSTOMER_BEHAVIOR_SHIFT,
    CANDIDATE_HYPOTHESES.TEMPORARY_NETWORK_FAILURE,
    CANDIDATE_HYPOTHESES.UNKNOWN,
  ]),
  description: z.string(),
  priorScore: z.number().min(0).max(1),
  evidenceScore: z.number().min(0).max(1),
  contradictionScore: z.number().min(0).max(1),
  coverageScore: z.number().min(0).max(1),
  finalScore: z.number().min(0).max(1),
  supportingEvidenceIds: z.array(z.string()),
  contradictingEvidenceIds: z.array(z.string()),
});

export type CandidateHypothesis = z.infer<typeof CandidateHypothesisSchema>;

// ─── Recovery Recommendation ───────────────────────
export const RecommendationItemSchema = z.object({
  action: z.enum([
    RECOVERY_RECOMMENDATIONS.RETRY,
    RECOVERY_RECOMMENDATIONS.ALTERNATIVE_PAYMENT_METHOD,
    RECOVERY_RECOMMENDATIONS.PAYMENT_LINK,
    RECOVERY_RECOMMENDATIONS.CUSTOMER_NOTIFICATION,
    RECOVERY_RECOMMENDATIONS.TRAFFIC_ROUTING,
    RECOVERY_RECOMMENDATIONS.MONITOR,
    RECOVERY_RECOMMENDATIONS.HUMAN_ESCALATION,
    RECOVERY_RECOMMENDATIONS.NO_ACTION,
  ]),
  reason: z.string().min(5),
  expectedBenefit: z.string().min(5),
  confidence: z.number().min(0).max(1),
  risk: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  customerFriction: z.enum(['NONE', 'LOW', 'MEDIUM', 'HIGH']),
  requiredEvidence: z.array(z.string()).optional(),
  policyRequirements: z.string().default('Pending Policy Engine Verification'),
  stoppingCondition: z.string().min(5),
});

export type RecommendationItem = z.infer<typeof RecommendationItemSchema>;

// ─── AI Diagnosis Output Schema ─────────────────────
export const DiagnosisResultSchema = z.object({
  primaryDiagnosis: z.string(),
  confidence: z.number().min(0).max(1),
  severity: z.enum([
    INCIDENT_SEVERITY.LOW,
    INCIDENT_SEVERITY.MEDIUM,
    INCIDENT_SEVERITY.HIGH,
    INCIDENT_SEVERITY.CRITICAL,
  ]),
  supportingEvidenceIds: z.array(z.string()),
  contradictingEvidenceIds: z.array(z.string()),
  missingEvidence: z.array(z.string()),
  rootCauseExplanation: z.string().min(10),
  uncertaintyNotes: z.string().min(5),
  recommendations: z.array(RecommendationItemSchema),
});

export type DiagnosisResult = z.infer<typeof DiagnosisResultSchema>;

// ─── Complete Investigation Result ─────────────────
export const InvestigationResultSchema = z.object({
  investigationId: z.string().uuid(),
  incidentId: z.string().uuid(),
  merchantId: z.string().uuid(),
  status: z.string(),
  primaryDiagnosis: z.string(),
  confidence: z.number().min(0).max(1),
  severity: z.string(),
  rootCauseExplanation: z.string(),
  uncertaintyNotes: z.string(),
  supportingEvidenceIds: z.array(z.string()),
  contradictingEvidenceIds: z.array(z.string()),
  missingEvidence: z.array(z.string()),
  evidence: z.array(EvidenceItemSchema),
  hypotheses: z.array(CandidateHypothesisSchema),
  recommendations: z.array(RecommendationItemSchema),
  timeline: z.array(z.object({
    timestamp: z.string(),
    step: z.string(),
    description: z.string(),
  })),
  modelVersion: z.string(),
  promptVersion: z.string(),
  isFallback: z.boolean(),
  completedAt: z.string().optional(),
});

export type InvestigationResult = z.infer<typeof InvestigationResultSchema>;
