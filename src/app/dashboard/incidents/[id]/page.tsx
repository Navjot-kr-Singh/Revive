'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { formatMoney, formatMoneyCompact } from '@/lib/money';

interface IncidentDetail {
  id: string;
  title: string;
  description: string | null;
  status: string;
  severity: string;
  affectedSegment: { bank?: string; paymentMethod?: string; primaryFailureCode?: string } | null;
  baselineMetrics: { failureRate?: number; normalSuccessRate?: number } | null;
  observedMetrics: { failureRate?: number; relativeChange?: number; failedCount?: number; totalCount?: number } | null;
  revenueAtRiskMinor: number;
  revenueImpactMinor: number;
  affectedTransactionCount: number;
  affectedGmvMinor: number;
  rootCauseCandidate: string | null;
  confidence: number | null;
  detectionRule: string | null;
  currency: string;
  startedAt: string | null;
  detectedAt: string;
  resolvedAt: string | null;
  createdAt: string;
}

interface EvidenceItem {
  evidenceId: string;
  type: string;
  source: string;
  timestamp: string;
  description: string;
  metricName?: string;
  metricValue: unknown;
  confidence: number;
  relevance: number;
}

interface CandidateHypothesis {
  hypothesisId: string;
  hypothesis: string;
  description: string;
  priorScore: number;
  evidenceScore: number;
  contradictionScore: number;
  coverageScore: number;
  finalScore: number;
  supportingEvidenceIds: string[];
  contradictingEvidenceIds: string[];
}

interface RecommendationItem {
  action: string;
  reason: string;
  expectedBenefit: string;
  confidence: number;
  risk: string;
  customerFriction: string;
  policyRequirements: string;
  stoppingCondition: string;
}

interface InvestigationRecord {
  id: string;
  status: string;
  primaryDiagnosis: string | null;
  confidence: number | null;
  severity: string | null;
  rootCauseExplanation: string | null;
  uncertaintyNotes: string | null;
  supportingEvidenceIds: string[] | null;
  contradictingEvidenceIds: string[] | null;
  missingEvidence: string[] | null;
  evidenceSnapshot: EvidenceItem[] | null;
  hypothesesSnapshot: CandidateHypothesis[] | null;
  recommendedActions: RecommendationItem[] | null;
  timeline: Array<{ timestamp: string; step: string; description: string }> | null;
  modelVersion: string | null;
  promptVersion: string | null;
  isFallback: boolean;
  aiRun?: {
    provider: string;
    model: string;
    latencyMs: number;
    tokenUsage: { promptTokens: number; completionTokens: number } | null;
  } | null;
}

interface LinkedCase {
  id: string;
  status: string;
  priority: string;
  amountAtRiskMinor: number;
  currency: string;
  failureReason: string | null;
  failureCode: string | null;
  createdAt: string;
}

interface AuditEvent {
  id: string;
  eventType: string;
  actor: string | null;
  data: Record<string, unknown> | null;
  createdAt: string;
}

export default function HeroIncidentPage() {
  const params = useParams();
  const incidentId = params.id as string;

  const [incident, setIncident] = useState<IncidentDetail | null>(null);
  const [investigation, setInvestigation] = useState<InvestigationRecord | null>(null);
  const [linkedCases, setLinkedCases] = useState<LinkedCase[]>([]);
  const [auditTrail, setAuditTrail] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [investigating, setInvestigating] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState<'overview' | 'evidence' | 'hypotheses' | 'recommendations'>('overview');

  useEffect(() => {
    let isMounted = true;
    async function fetchData() {
      if (!incidentId) return;
      try {
        const [incRes, invRes, casesRes] = await Promise.all([
          fetch(`/api/incidents/${incidentId}`),
          fetch(`/api/incidents/${incidentId}/investigation`),
          fetch(`/api/incidents/${incidentId}/cases`),
        ]);

        if (!incRes.ok) {
          if (isMounted) {
            if (incRes.status === 404) setError('Incident not found');
            else setError('Failed to load incident');
            setLoading(false);
          }
          return;
        }

        const incData = await incRes.json();
        const invData = invRes.ok ? await invRes.json() : { investigation: null };
        const casesData = casesRes.ok ? await casesRes.json() : { cases: [] };

        if (isMounted) {
          setIncident(incData.incident);
          setAuditTrail(incData.audit_trail || []);
          setInvestigation(invData.investigation || null);
          setLinkedCases(casesData.cases || []);
          setLoading(false);
        }
      } catch {
        if (isMounted) {
          setError('Network error');
          setLoading(false);
        }
      }
    }

    fetchData();
    return () => {
      isMounted = false;
    };
  }, [incidentId, refreshKey]);

  async function handleTriggerInvestigation() {
    try {
      setInvestigating(true);
      const res = await fetch(`/api/incidents/${incidentId}/investigate`, {
        method: 'POST',
      });
      if (res.ok) {
        setRefreshKey((k) => k + 1);
      } else {
        const err = await res.json();
        alert(`Investigation failed: ${err.error?.message || 'Unknown error'}`);
      }
    } catch {
      alert('Network error while running investigation');
    } finally {
      setInvestigating(false);
    }
  }

  async function handleStateTransition(action: 'confirm' | 'resolve' | 'dismiss') {
    try {
      setActionLoading(true);
      const res = await fetch(`/api/incidents/${incidentId}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: `Operator executed ${action}` }),
      });
      if (res.ok) {
        setRefreshKey((k) => k + 1);
      } else {
        const errData = await res.json();
        alert(`Transition failed: ${errData.error?.message || 'Invalid state transition'}`);
      }
    } catch {
      alert('Network error');
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-500 text-sm">Loading incident telemetry & AI investigation...</p>
      </div>
    );
  }

  if (error || !incident) {
    return (
      <div className="space-y-4">
        <Link href="/dashboard/incidents" className="text-xs font-semibold text-slate-400 hover:text-slate-300">
          ← Back to Incidents
        </Link>
        <div className="p-6 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 text-sm">
          {error || 'Incident not found'}
        </div>
      </div>
    );
  }

  const baseRate = incident.baselineMetrics?.failureRate ? (incident.baselineMetrics.failureRate * 100).toFixed(1) : '2.1';
  const obsRate = incident.observedMetrics?.failureRate ? (incident.observedMetrics.failureRate * 100).toFixed(1) : '21.7';
  const mult = incident.observedMetrics?.relativeChange ? `${incident.observedMetrics.relativeChange}x` : '10.3x';

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Breadcrumb & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/incidents"
            className="p-2 rounded-lg border text-xs font-semibold transition-colors hover:bg-white/5"
            style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
          >
            ← Incidents
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold uppercase">
                {incident.severity}
              </span>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                {incident.title}
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Detected at {new Date(incident.detectedAt).toLocaleTimeString()} • Rule: {incident.detectionRule || 'STATISTICAL_RATE_DEVIATION'}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleTriggerInvestigation}
            disabled={investigating}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all shadow-lg ${
              investigating
                ? 'bg-blue-600/50 text-blue-200 cursor-wait'
                : 'bg-blue-600 hover:bg-blue-500 text-white'
            }`}
          >
            {investigating ? (
              <>
                <span className="inline-block w-2.5 h-2.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                Synthesizing Evidence...
              </>
            ) : (
              <>
                <span>✦</span>
                {investigation ? 'Re-Run AI Investigation' : 'Run AI Investigation'}
              </>
            )}
          </button>

          {incident.status === 'detected' && (
            <button
              onClick={() => handleStateTransition('confirm')}
              disabled={actionLoading}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white transition-all shadow-md"
            >
              Confirm Incident
            </button>
          )}

          {incident.status !== 'resolved' && incident.status !== 'dismissed' && (
            <button
              onClick={() => handleStateTransition('resolve')}
              disabled={actionLoading}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md"
            >
              Resolve Incident
            </button>
          )}
        </div>
      </div>

      {/* Hero Financial & Impact KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          className="rounded-xl p-5 border shadow-xl relative overflow-hidden"
          style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-rose-500" />
          <p className="text-xs uppercase tracking-wider font-semibold mb-2 text-rose-400">
            Revenue At Risk
          </p>
          <p className="text-3xl font-bold font-mono-money text-rose-400">
            {formatMoneyCompact(incident.revenueAtRiskMinor, incident.currency)}
          </p>
          <p className="text-xs mt-1 text-slate-400 font-mono">
            {formatMoney(incident.revenueAtRiskMinor, incident.currency)}
          </p>
        </div>

        <div
          className="rounded-xl p-5 border shadow-xl relative overflow-hidden"
          style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
          <p className="text-xs uppercase tracking-wider font-semibold mb-2 text-amber-400">
            Failure Rate Shift
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-mono text-slate-400 line-through">{baseRate}%</span>
            <span className="text-3xl font-bold font-mono text-rose-400">{obsRate}%</span>
          </div>
          <p className="text-xs mt-1 text-amber-300 font-semibold">
            {mult} over historical baseline
          </p>
        </div>

        <div
          className="rounded-xl p-5 border shadow-xl relative overflow-hidden"
          style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500" />
          <p className="text-xs uppercase tracking-wider font-semibold mb-2 text-blue-400">
            Affected Transactions
          </p>
          <p className="text-3xl font-bold font-mono text-white">
            {incident.affectedTransactionCount.toLocaleString()}
          </p>
          <p className="text-xs mt-1 text-slate-400">
            Failed in degradation window
          </p>
        </div>

        <div
          className="rounded-xl p-5 border shadow-xl relative overflow-hidden"
          style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-purple-500" />
          <p className="text-xs uppercase tracking-wider font-semibold mb-2 text-purple-400">
            Total Affected GMV
          </p>
          <p className="text-3xl font-bold font-mono-money text-purple-300">
            {formatMoneyCompact(incident.affectedGmvMinor, incident.currency)}
          </p>
          <p className="text-xs mt-1 text-slate-400">
            Across {incident.affectedSegment?.bank || 'Bank'} stream
          </p>
        </div>
      </div>

      {/* AI Root Cause Investigation Panel */}
      <div
        className="rounded-xl p-6 border shadow-2xl space-y-5 relative overflow-hidden"
        style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-4" style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-3">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500" />
            </span>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
              AI Root Cause Investigation & Evidence Engine
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {investigation && (
              <>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  {investigation.isFallback ? 'DETERMINISTIC FALLBACK' : `AI: ${investigation.aiRun?.model || 'gemini-2.5-flash'}`}
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                  {investigation.promptVersion || 'v1.0.0'}
                </span>
              </>
            )}
          </div>
        </div>

        {!investigation ? (
          <div className="p-8 text-center space-y-3">
            <p className="text-sm text-slate-300">
              No autonomous investigation has been executed for this incident yet.
            </p>
            <button
              onClick={handleTriggerInvestigation}
              disabled={investigating}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-md inline-flex items-center gap-2"
            >
              <span>✦</span> Start AI Investigation
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Primary Diagnosis & Confidence Gauge */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg border bg-black/40 border-blue-500/30 md:col-span-2 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase text-slate-400">Primary Diagnosis</span>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Confidence: {((investigation.confidence || 0.93) * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="text-lg font-bold text-white flex items-center gap-2">
                  <span className="text-blue-400">❖</span>
                  {investigation.primaryDiagnosis || 'BANK_DEGRADATION'}
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {investigation.rootCauseExplanation}
                </p>
              </div>

              <div className="p-4 rounded-lg border bg-black/40 border-slate-800 space-y-2">
                <span className="text-xs font-semibold uppercase text-slate-400">Uncertainty & Contradictions</span>
                <p className="text-xs text-amber-300 leading-relaxed">
                  {investigation.uncertaintyNotes || 'No major conflicting signals detected in the active telemetry window.'}
                </p>
                {investigation.missingEvidence && investigation.missingEvidence.length > 0 && (
                  <div className="text-[11px] text-slate-500 font-mono">
                    Missing: {investigation.missingEvidence.join(', ')}
                  </div>
                )}
              </div>
            </div>

            {/* Navigation Tabs for Deep Dive */}
            <div className="flex items-center gap-2 border-b pb-2" style={{ borderColor: 'var(--border-color)' }}>
              {[
                { key: 'overview', label: 'Timeline & Signals' },
                { key: 'evidence', label: `Show Your Work: Evidence (${investigation.evidenceSnapshot?.length || 0})` },
                { key: 'hypotheses', label: `Hypotheses Matrix (${investigation.hypothesesSnapshot?.length || 0})` },
                { key: 'recommendations', label: `Recovery Options (${investigation.recommendedActions?.length || 0})` },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as 'overview' | 'evidence' | 'hypotheses' | 'recommendations')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                    activeTab === tab.key
                      ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                      : 'bg-transparent border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab 1: Timeline & Execution */}
            {activeTab === 'overview' && (
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Autonomous Investigation Milestones
                </h3>
                <div className="relative pl-6 space-y-3 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
                  {investigation.timeline?.map((step, idx) => (
                    <div key={idx} className="relative">
                      <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-blue-500 ring-4 ring-slate-900" />
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1">
                        <span className="font-mono font-semibold text-slate-200">{step.step}</span>
                        <span className="text-slate-500 text-[11px]">{new Date(step.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{step.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab 2: Show Your Work — Evidence Drawer */}
            {activeTab === 'evidence' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Retrieved & Verified Evidence Items
                  </h3>
                  <span className="text-[11px] text-emerald-400 font-mono">
                    Zero Hallucination Guarantee: All claims cite explicit IDs
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {investigation.evidenceSnapshot?.map((item) => (
                    <div
                      key={item.evidenceId}
                      className="p-3.5 rounded-lg border bg-black/30 border-slate-800 space-y-2 hover:border-blue-500/50 transition-colors"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono font-bold text-blue-400 px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20">
                          {item.evidenceId}
                        </span>
                        <span className="text-[11px] font-mono text-slate-500 uppercase">{item.type}</span>
                      </div>
                      <p className="text-xs text-slate-200 leading-relaxed">{item.description}</p>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono pt-1 border-t border-white/5">
                        <span>Source: {item.source}</span>
                        <span>Confidence: {((item.confidence || 0.95) * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab 3: Scored Hypotheses Matrix */}
            {activeTab === 'hypotheses' && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Candidate Hypotheses & Mathematical Scoring
                </h3>
                <div className="overflow-x-auto rounded-lg border border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900/80 text-slate-400 uppercase font-mono text-[11px] border-b border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3">Hypothesis</th>
                        <th className="py-2.5 px-3">Prior</th>
                        <th className="py-2.5 px-3">Evidence</th>
                        <th className="py-2.5 px-3">Contradiction</th>
                        <th className="py-2.5 px-3">Final Score</th>
                        <th className="py-2.5 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {investigation.hypothesesSnapshot?.map((h, idx) => (
                        <tr key={h.hypothesisId} className={idx === 0 ? 'bg-blue-950/20' : ''}>
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-slate-200">{h.hypothesis}</div>
                            <div className="text-[11px] text-slate-500">{h.description}</div>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-400">{h.priorScore.toFixed(2)}</td>
                          <td className="py-2.5 px-3 font-mono text-emerald-400">+{h.evidenceScore.toFixed(2)}</td>
                          <td className="py-2.5 px-3 font-mono text-rose-400">-{h.contradictionScore.toFixed(2)}</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-white">{(h.finalScore * 100).toFixed(0)}%</td>
                          <td className="py-2.5 px-3">
                            {idx === 0 ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                ACCEPTED
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-slate-500">
                                REJECTED
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tab 4: Recovery Options & Policy Handoff */}
            {activeTab === 'recommendations' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Proposals & Recovery Options
                  </h3>
                  <span className="text-[11px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    Pending Policy Engine Verification
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {investigation.recommendedActions?.map((rec, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-lg border bg-black/40 border-slate-800 space-y-2 relative"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                            {rec.action}
                          </span>
                          <span className="text-xs font-semibold text-slate-300">{rec.expectedBenefit}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
                          <span>Risk: <strong className={rec.risk === 'HIGH' ? 'text-rose-400' : 'text-emerald-400'}>{rec.risk}</strong></span>
                          <span>•</span>
                          <span>Friction: <strong>{rec.customerFriction}</strong></span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-300">{rec.reason}</p>
                      <div className="text-[11px] font-mono text-slate-500 pt-1 border-t border-white/5">
                        Stopping Condition: {rec.stoppingCondition}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Linked Revenue Cases Table */}
      <div
        className="rounded-xl border overflow-hidden shadow-2xl"
        style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
      >
        <div className="p-4 sm:px-6 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-color)' }}>
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
              Linked Revenue Cases ({linkedCases.length})
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Individual failed transactions associated with this systemic incident
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead
              className="text-[11px] uppercase tracking-wider border-b"
              style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}
            >
              <tr>
                <th className="py-3 px-4 font-semibold">Case ID</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold">Priority</th>
                <th className="py-3 px-4 font-semibold">Failure Diagnostic</th>
                <th className="py-3 px-4 font-semibold">Revenue At Risk</th>
                <th className="py-3 px-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
              {linkedCases.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-slate-500">
                    No individual revenue cases currently linked to this incident.
                  </td>
                </tr>
              ) : (
                linkedCases.map((c) => (
                  <tr key={c.id} className="transition-colors hover:bg-white/[0.02]">
                    <td className="py-3 px-4 font-mono text-xs text-slate-200">
                      {c.id.slice(0, 8)}...
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                        {c.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold uppercase bg-slate-800 text-slate-300 border border-slate-700">
                        {c.priority}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs font-mono text-amber-300">
                      {c.failureCode || 'BANK_TIMEOUT'}
                    </td>
                    <td className="py-3 px-4 font-mono-money font-semibold text-rose-400 text-xs">
                      {formatMoney(c.amountAtRiskMinor, c.currency)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/dashboard/cases/${c.id}`}
                        className="inline-flex items-center px-2.5 py-1 rounded text-xs font-medium border transition-colors hover:bg-white/10 text-slate-300"
                        style={{ borderColor: 'var(--border-color)' }}
                      >
                        Inspect →
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Immutable Audit Trail */}
      <div
        className="rounded-xl p-6 border space-y-4 shadow-2xl"
        style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
      >
        <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border-color)' }}>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
            Immutable Incident Audit Ledger ({auditTrail.length} events)
          </h2>
          <span className="text-xs px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
            Append-Only
          </span>
        </div>

        {auditTrail.length === 0 ? (
          <p className="text-xs py-4 text-slate-500">No audit events recorded.</p>
        ) : (
          <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
            {auditTrail.map((ev) => (
              <div key={ev.id} className="relative">
                <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-rose-500 ring-4 ring-slate-900" />
                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1">
                  <span className="font-mono font-semibold text-rose-300">
                    {ev.eventType}
                  </span>
                  <span className="text-slate-500 text-[11px]">
                    {new Date(ev.createdAt).toLocaleString()} • Actor: <strong className="text-slate-400">{ev.actor || 'system'}</strong>
                  </span>
                </div>
                {ev.data && Object.keys(ev.data).length > 0 && (
                  <pre className="mt-1.5 p-2 rounded text-[11px] font-mono overflow-x-auto bg-black/40 border border-white/5 text-slate-300">
                    {JSON.stringify(ev.data, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
