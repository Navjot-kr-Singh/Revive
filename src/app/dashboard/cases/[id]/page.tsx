'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { formatMoney } from '@/lib/money';

interface AuditEvent {
  id: string;
  eventType: string;
  actor: string | null;
  data: Record<string, unknown> | null;
  createdAt: string;
}

interface CaseDetails {
  id: string;
  caseType: string;
  status: string;
  priority: string;
  amountAtRiskMinor: number;
  currency: string;
  failureReason: string | null;
  failureCode: string | null;
  rootCause: string | null;
  rootCauseConfidence: number | null;
  recoveryProbability: number | null;
  expectedRecoveryMinor: number | null;
  actualRecoveryMinor: number | null;
  recoveredAmountMinor: number | null;
  netRecoveryMinor: number | null;
  retryCount: number;
  customerContacts: number;
  createdAt: string;
  resolvedAt: string | null;
}

interface SimulationCandidate {
  actionType: string;
  recoveryProbabilityBps: number;
  recoveryProbability: number;
  expectedRecoveryMinor: number;
  actionCostMinor: number;
  frictionPenaltyMinor: number;
  riskPenaltyMinor: number;
  expectedNetValueMinor: number;
  frictionLevel: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';
  confidence: number;
  reason: string;
  stoppingCondition: string;
}

interface DecisionRecord {
  decisionId: string;
  caseId: string;
  selectedAction: string;
  decisionStatus: 'approved' | 'escalated' | 'no_action' | 'denied';
  expectedRecoveryMinor: number;
  expectedCostMinor: number;
  expectedNetValueMinor: number;
  recoveryProbabilityBps: number;
  policyVersion: string;
  policyResult: string;
  reason: string;
  explanation: {
    whatChosen: string;
    whyChosen: string;
    whatConsidered: string[];
    whyAlternativesRejected: Array<{ action: string; reason: string }>;
    whatPolicyAllowed: string;
    whatCausesStop: string;
  };
  simulationSnapshot?: {
    candidates: SimulationCandidate[];
  };
  createdAt: string;
}

interface ActionRecord {
  id: string;
  actionType: string;
  status: string;
  attemptNumber: number;
  externalReferenceId: string | null;
  errorMessage: string | null;
  createdAt: string;
}

interface OutcomeRecord {
  id: string;
  outcomeType: string;
  recoveredAmountMinor: number;
  currency: string;
  timeToRecoverySeconds: number | null;
  createdAt: string;
}

export default function CaseDetailPage() {
  const params = useParams();
  const caseId = params.id as string;

  const [caseData, setCaseData] = useState<CaseDetails | null>(null);
  const [decision, setDecision] = useState<DecisionRecord | null>(null);
  const [simulationCandidates, setSimulationCandidates] = useState<SimulationCandidate[]>([]);
  const [actions, setActions] = useState<ActionRecord[]>([]);
  const [outcomes, setOutcomes] = useState<OutcomeRecord[]>([]);
  const [auditTrail, setAuditTrail] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [deciding, setDeciding] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let isMounted = true;
    async function loadCaseData() {
      try {
        setLoading(true);
        const [caseRes, decRes, simRes, actRes, outRes] = await Promise.all([
          fetch(`/api/cases/${caseId}`),
          fetch(`/api/cases/${caseId}/decision`),
          fetch(`/api/cases/${caseId}/simulation`),
          fetch(`/api/cases/${caseId}/actions`),
          fetch(`/api/cases/${caseId}/outcomes`),
        ]);

        if (!caseRes.ok) {
          if (isMounted) {
            if (caseRes.status === 404) setError('Case not found');
            else setError('Failed to load case');
            setLoading(false);
          }
          return;
        }

        const caseJson = await caseRes.json();
        const decJson = decRes.ok ? await decRes.json() : { decision: null };
        const simJson = simRes.ok ? await simRes.json() : { simulation: null };
        const actJson = actRes.ok ? await actRes.json() : { actions: [] };
        const outJson = outRes.ok ? await outRes.json() : { outcomes: [] };

        if (isMounted) {
          setCaseData(caseJson.case);
          setAuditTrail(caseJson.audit_trail || []);
          setDecision(decJson.decision || null);
          setSimulationCandidates(
            decJson.decision?.simulationSnapshot?.candidates || simJson.simulation?.candidates || []
          );
          setActions(actJson.actions || []);
          setOutcomes(outJson.outcomes || []);
          setLoading(false);
        }
      } catch (_err) {
        if (isMounted) {
          setError('Network error');
          setLoading(false);
        }
      }
    }

    if (caseId) loadCaseData();
    return () => {
      isMounted = false;
    };
  }, [caseId, refreshKey]);

  async function handleDecide() {
    try {
      setDeciding(true);
      const res = await fetch(`/api/cases/${caseId}/decide`, { method: 'POST' });
      if (res.ok) {
        setRefreshKey((k) => k + 1);
      } else {
        const errJson = await res.json();
        alert(`Decision failed: ${errJson.error?.message || 'Unknown error'}`);
      }
    } catch {
      alert('Network error while running decision engine');
    } finally {
      setDeciding(false);
    }
  }

  async function handleExecute() {
    if (!decision) return;
    try {
      setExecuting(true);
      const res = await fetch(`/api/cases/${caseId}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decisionId: decision.decisionId,
          idempotencyKey: `exec_${caseId}_${Date.now()}`,
          mode: 'DEMO',
        }),
      });

      if (res.ok) {
        setRefreshKey((k) => k + 1);
      } else {
        const errJson = await res.json();
        alert(`Execution blocked: ${errJson.error?.message || 'Execution failed'}`);
        setRefreshKey((k) => k + 1);
      }
    } catch {
      alert('Network error while executing recovery action');
    } finally {
      setExecuting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-xs text-slate-500">Loading Recovery Decision Center...</p>
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className="space-y-4">
        <Link href="/dashboard/cases" className="text-xs font-semibold text-slate-400 hover:text-slate-300">
          ← Back to Cases
        </Link>
        <div className="p-6 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 text-sm">
          {error || 'Case not found'}
        </div>
      </div>
    );
  }

  const latestOutcome = outcomes[0] || null;
  const actualRecovered = latestOutcome?.recoveredAmountMinor ?? caseData.recoveredAmountMinor ?? 0;
  const expectedRecovery = decision?.expectedRecoveryMinor ?? 0;
  const variance = actualRecovered - expectedRecovery;

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/cases"
            className="p-2 rounded-lg border text-xs font-semibold transition-colors hover:bg-white/5"
            style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
          >
            ← Cases
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 font-bold uppercase">
                {caseData.status}
              </span>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                Revenue Recovery Case
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Case ID: <span className="font-mono">{caseData.id}</span> • Failure: <span className="font-mono text-amber-300">{caseData.failureCode || 'BANK_TIMEOUT'}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleDecide}
            disabled={deciding}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all shadow-lg ${
              deciding ? 'bg-blue-600/50 text-blue-200 cursor-wait' : 'bg-blue-600 hover:bg-blue-500 text-white'
            }`}
          >
            {deciding ? (
              <>
                <span className="inline-block w-2.5 h-2.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                Simulating Policy...
              </>
            ) : (
              <>
                <span>✦</span>
                {decision ? 'Re-Evaluate Policy Decision' : 'Evaluate & Decide Recovery'}
              </>
            )}
          </button>

          {decision && decision.decisionStatus === 'approved' && caseData.status !== 'recovered' && (
            <button
              onClick={handleExecute}
              disabled={executing}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all shadow-lg ${
                executing
                  ? 'bg-emerald-600/50 text-emerald-200 cursor-wait'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              {executing ? (
                <>
                  <span className="inline-block w-2.5 h-2.5 rounded-full border-2 border-white border-t-transparent animate-spin mr-1" />
                  Executing Action...
                </>
              ) : (
                <>⚡ Execute {decision.selectedAction}</>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Hero Financial KPI Cards */}
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
            {formatMoney(caseData.amountAtRiskMinor, caseData.currency)}
          </p>
          <p className="text-xs mt-1 text-slate-400">
            Initial failed checkout transaction
          </p>
        </div>

        <div
          className="rounded-xl p-5 border shadow-xl relative overflow-hidden"
          style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500" />
          <p className="text-xs uppercase tracking-wider font-semibold mb-2 text-blue-400">
            Expected Net Value (EV)
          </p>
          <p className="text-3xl font-bold font-mono-money text-blue-300">
            {decision ? formatMoney(decision.expectedNetValueMinor, caseData.currency) : '₹0.00'}
          </p>
          <p className="text-xs mt-1 text-slate-400">
            {decision ? `EV = P(${(decision.recoveryProbabilityBps / 100).toFixed(0)}%) × Amount - Costs` : 'Pending simulation'}
          </p>
        </div>

        <div
          className="rounded-xl p-5 border shadow-xl relative overflow-hidden"
          style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
          <p className="text-xs uppercase tracking-wider font-semibold mb-2 text-emerald-400">
            Actual Recovery
          </p>
          <p className="text-3xl font-bold font-mono-money text-emerald-400">
            {formatMoney(actualRecovered, caseData.currency)}
          </p>
          <p className="text-xs mt-1 text-slate-400">
            {caseData.status === 'recovered' ? 'Verified confirmed settlement' : 'Pending action execution'}
          </p>
        </div>

        <div
          className="rounded-xl p-5 border shadow-xl relative overflow-hidden"
          style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-purple-500" />
          <p className="text-xs uppercase tracking-wider font-semibold mb-2 text-purple-400">
            Prediction Variance
          </p>
          <p className={`text-3xl font-bold font-mono-money ${variance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {actualRecovered > 0 ? (variance >= 0 ? `+${formatMoney(variance, caseData.currency)}` : formatMoney(variance, caseData.currency)) : '₹0.00'}
          </p>
          <p className="text-xs mt-1 text-slate-400">
            Actual vs Expected differential
          </p>
        </div>
      </div>

      {/* Recovery Decision Center — Counterfactual Comparison Matrix */}
      <div
        className="rounded-xl p-6 border shadow-2xl space-y-6 relative overflow-hidden"
        style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-4" style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-3">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
            </span>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
              Counterfactual Recovery Simulation Matrix
            </h2>
          </div>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
            Model: revive-stat-recovery-v1.2.0
          </span>
        </div>

        {simulationCandidates.length === 0 ? (
          <div className="p-8 text-center space-y-3">
            <p className="text-sm text-slate-300">
              No counterfactual simulation has been computed for this case yet.
            </p>
            <button
              onClick={handleDecide}
              disabled={deciding}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-md inline-flex items-center gap-2"
            >
              <span>✦</span> Run Policy & Simulation Engine
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {simulationCandidates.map((cand) => {
              const isSelected = decision?.selectedAction === cand.actionType;
              const rejectedAlt = decision?.explanation.whyAlternativesRejected.find(
                (r) => r.action.toLowerCase().replace(/_/g, '') === cand.actionType.toLowerCase().replace(/_/g, '')
              );
              const isDenied = !!rejectedAlt;

              return (
                <div
                  key={cand.actionType}
                  className={`p-4 rounded-xl border relative space-y-3 transition-all ${
                    isSelected
                      ? 'bg-blue-950/40 border-blue-500 ring-2 ring-blue-500/30'
                      : isDenied
                      ? 'bg-black/30 border-rose-900/40 opacity-80'
                      : 'bg-black/40 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-white uppercase">
                      {cand.actionType.replace(/_/g, ' ')}
                    </span>
                    {isSelected ? (
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        SELECTED
                      </span>
                    ) : isDenied ? (
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                        DENIED
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                        ALLOWED
                      </span>
                    )}
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Recovery Probability:</span>
                      <span className="font-mono font-bold text-white">{(cand.recoveryProbability * 100).toFixed(0)}% ({cand.recoveryProbabilityBps} bps)</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Expected Recovery:</span>
                      <span className="font-mono font-bold text-emerald-300">{formatMoney(cand.expectedRecoveryMinor, caseData.currency)}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Action Cost & Friction:</span>
                      <span className="font-mono text-slate-300">-{formatMoney(cand.actionCostMinor + cand.frictionPenaltyMinor, caseData.currency)}</span>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-white/5 text-slate-200 font-semibold">
                      <span>Expected Net Value (EV):</span>
                      <span className="font-mono text-blue-300 font-bold">{formatMoney(cand.expectedNetValueMinor, caseData.currency)}</span>
                    </div>
                  </div>

                  {isDenied && (
                    <div className="p-2 rounded bg-rose-950/30 border border-rose-800/40 text-[11px] text-rose-300">
                      Reason: {rejectedAlt.reason}
                    </div>
                  )}

                  {isSelected && (
                    <div className="p-2 rounded bg-blue-950/40 border border-blue-700/50 text-[11px] text-blue-200">
                      Optimal policy-eligible action with highest net return.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Decision Explanation: The 6 Core Questions */}
      {decision && (
        <div
          className="rounded-xl p-6 border space-y-4 shadow-2xl"
          style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
        >
          <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border-color)' }}>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
              Deterministic Decision Explanation
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
              Policy Version: {decision.policyVersion}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-lg border bg-black/40 border-slate-800 space-y-1.5">
              <span className="font-bold text-slate-400 uppercase text-[11px]">1. What did we choose?</span>
              <p className="text-white font-mono font-bold text-sm">{decision.explanation.whatChosen}</p>
            </div>

            <div className="p-3.5 rounded-lg border bg-black/40 border-slate-800 space-y-1.5">
              <span className="font-bold text-slate-400 uppercase text-[11px]">2. Why?</span>
              <p className="text-slate-200 leading-relaxed">{decision.explanation.whyChosen}</p>
            </div>

            <div className="p-3.5 rounded-lg border bg-black/40 border-slate-800 space-y-1.5">
              <span className="font-bold text-slate-400 uppercase text-[11px]">3. What policy allowed it?</span>
              <p className="text-slate-200 leading-relaxed">{decision.explanation.whatPolicyAllowed}</p>
            </div>

            <div className="p-3.5 rounded-lg border bg-black/40 border-slate-800 space-y-1.5">
              <span className="font-bold text-slate-400 uppercase text-[11px]">4. What causes us to stop?</span>
              <p className="text-slate-200 leading-relaxed">{decision.explanation.whatCausesStop}</p>
            </div>
          </div>
        </div>
      )}

      {/* Execution Tracker & History */}
      <div
        className="rounded-xl border overflow-hidden shadow-2xl"
        style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
      >
        <div className="p-4 sm:px-6 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-color)' }}>
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
              Recovery Action Execution & Outcome History ({actions.length})
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Idempotent execution ledger with outcome confirmation
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
                <th className="py-3 px-4 font-semibold">Action ID</th>
                <th className="py-3 px-4 font-semibold">Action Type</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold">Attempt</th>
                <th className="py-3 px-4 font-semibold">External Reference</th>
                <th className="py-3 px-4 font-semibold">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
              {actions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-slate-500">
                    No recovery actions executed yet.
                  </td>
                </tr>
              ) : (
                actions.map((act) => (
                  <tr key={act.id} className="transition-colors hover:bg-white/[0.02]">
                    <td className="py-3 px-4 font-mono text-xs text-slate-200">{act.id.slice(0, 8)}...</td>
                    <td className="py-3 px-4 font-semibold text-xs text-white uppercase">{act.actionType}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                        act.status === 'succeeded'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : act.status === 'executing'
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}>
                        {act.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-300">#{act.attemptNumber}</td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-400">{act.externalReferenceId || 'none'}</td>
                    <td className="py-3 px-4 text-xs text-slate-400">{new Date(act.createdAt).toLocaleTimeString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Immutable Audit Ledger */}
      <div
        className="rounded-xl p-6 border space-y-4 shadow-2xl"
        style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
      >
        <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border-color)' }}>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
            Immutable Decision Audit Ledger ({auditTrail.length} events)
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
                <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-slate-900" />
                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1">
                  <span className="font-mono font-semibold text-emerald-300">{ev.eventType}</span>
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
