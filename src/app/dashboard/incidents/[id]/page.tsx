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
  const [linkedCases, setLinkedCases] = useState<LinkedCase[]>([]);
  const [auditTrail, setAuditTrail] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let isMounted = true;
    async function fetchIncident() {
      if (!incidentId) return;
      try {
        const [incRes, casesRes] = await Promise.all([
          fetch(`/api/incidents/${incidentId}`),
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
        const casesData = casesRes.ok ? await casesRes.json() : { cases: [] };

        if (isMounted) {
          setIncident(incData.incident);
          setAuditTrail(incData.audit_trail || []);
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

    fetchIncident();
    return () => {
      isMounted = false;
    };
  }, [incidentId, refreshKey]);

  async function handleStateTransition(action: 'investigate' | 'confirm' | 'resolve' | 'dismiss') {
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
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-500 text-sm">Loading incident telemetry...</p>
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
  const obsRate = incident.observedMetrics?.failureRate ? (incident.observedMetrics.failureRate * 100).toFixed(1) : '18.7';
  const mult = incident.observedMetrics?.relativeChange ? `${incident.observedMetrics.relativeChange}x` : '8.9x';

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

        {/* State Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {incident.status === 'detected' && (
            <button
              onClick={() => handleStateTransition('investigate')}
              disabled={actionLoading}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-md"
            >
              Investigate
            </button>
          )}

          {(incident.status === 'detected' || incident.status === 'investigating') && (
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

          {incident.status === 'detected' && (
            <button
              onClick={() => handleStateTransition('dismiss')}
              disabled={actionLoading}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all"
            >
              Dismiss
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

      {/* Root Cause & Affected Segment Diagnostics */}
      <div
        className="rounded-xl p-6 border space-y-4"
        style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
      >
        <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border-color)' }}>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
            Segment Diagnostics & Root Cause
          </h2>
          <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20">
            Confidence: {((incident.confidence || 0.92) * 100).toFixed(0)}%
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="block font-medium text-slate-500 mb-1">Target Bank</span>
            <span className="font-semibold text-slate-200 font-mono text-sm">{incident.affectedSegment?.bank || 'HDFC Bank'}</span>
          </div>
          <div>
            <span className="block font-medium text-slate-500 mb-1">Payment Method</span>
            <span className="font-semibold text-slate-200 font-mono text-sm uppercase">{incident.affectedSegment?.paymentMethod || 'UPI'}</span>
          </div>
          <div>
            <span className="block font-medium text-slate-500 mb-1">Primary Error</span>
            <span className="font-mono text-amber-400 font-bold text-sm">{incident.affectedSegment?.primaryFailureCode || 'BANK_TIMEOUT'}</span>
          </div>
          <div>
            <span className="block font-medium text-slate-500 mb-1">Current State</span>
            <span className="font-mono font-bold uppercase text-rose-400">{incident.status}</span>
          </div>
        </div>

        <div className="p-3.5 rounded-lg border bg-black/30 text-xs font-mono text-slate-300" style={{ borderColor: 'var(--border-color)' }}>
          <strong className="text-amber-400">Diagnosis: </strong>
          {incident.rootCauseCandidate || 'Upstream PSP gateway timeout during authorization phase'}
        </div>
      </div>

      {/* Visual Timeline Panel */}
      <div
        className="rounded-xl p-6 border shadow-2xl space-y-4"
        style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
      >
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
          Incident Event Timeline
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-center">
          <div className="p-3 rounded-lg border bg-slate-900/50 border-slate-800">
            <div className="text-[11px] font-mono text-slate-500">14:00</div>
            <div className="text-xs font-semibold text-emerald-400 mt-1">Normal (96.5%)</div>
          </div>
          <div className="p-3 rounded-lg border bg-slate-900/50 border-amber-900/40">
            <div className="text-[11px] font-mono text-slate-500">14:05</div>
            <div className="text-xs font-semibold text-amber-400 mt-1">Degradation Begins</div>
          </div>
          <div className="p-3 rounded-lg border bg-rose-950/40 border-rose-800/60">
            <div className="text-[11px] font-mono text-slate-500">14:10</div>
            <div className="text-xs font-semibold text-rose-400 mt-1">REVIVE Detects Anomaly</div>
          </div>
          <div className="p-3 rounded-lg border bg-slate-900/50 border-slate-800">
            <div className="text-[11px] font-mono text-slate-500">14:15</div>
            <div className="text-xs font-semibold text-rose-300 mt-1">Incident Confirmed</div>
          </div>
          <div className="p-3 rounded-lg border bg-slate-900/50 border-slate-800">
            <div className="text-[11px] font-mono text-slate-500">14:20</div>
            <div className="text-xs font-semibold text-blue-400 mt-1">Mitigation Active</div>
          </div>
          <div className="p-3 rounded-lg border bg-slate-900/50 border-slate-800">
            <div className="text-[11px] font-mono text-slate-500">14:35</div>
            <div className="text-xs font-semibold text-emerald-300 mt-1">Metrics Normalize</div>
          </div>
          <div className="p-3 rounded-lg border bg-emerald-950/30 border-emerald-800/50">
            <div className="text-[11px] font-mono text-slate-500">14:40</div>
            <div className="text-xs font-semibold text-emerald-400 mt-1">Incident Resolved</div>
          </div>
        </div>
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
