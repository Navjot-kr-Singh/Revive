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
  netRecoveryMinor: number | null;
  retryCount: number;
  customerContacts: number;
  createdAt: string;
  resolvedAt: string | null;
}

export default function CaseDetailPage() {
  const params = useParams();
  const caseId = params.id as string;

  const [caseData, setCaseData] = useState<CaseDetails | null>(null);
  const [auditTrail, setAuditTrail] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCase() {
      try {
        setLoading(true);
        const res = await fetch(`/api/cases/${caseId}`);
        if (!res.ok) {
          if (res.status === 404) setError('Case not found');
          else setError('Failed to load case');
          return;
        }
        const data = await res.json();
        setCaseData(data.case);
        setAuditTrail(data.audit_trail || []);
      } catch (_err) {
        setError('Network error');
      } finally {
        setLoading(false);
      }
    }
    if (caseId) loadCase();
  }, [caseId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p style={{ color: 'var(--text-muted)' }}>Loading case details...</p>
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Link href="/dashboard/cases" className="text-sm hover:underline" style={{ color: 'var(--text-muted)' }}>
            ← Back to Cases
          </Link>
        </div>
        <div className="p-6 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400">
          {error || 'Case not found'}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Top Breadcrumb & Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/cases"
            className="p-2 rounded-lg border text-xs font-medium transition-colors hover:bg-white/5"
            style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
          >
            ← Back
          </Link>
          <div>
            <h1 className="text-xl font-bold font-mono" style={{ color: 'var(--text-primary)' }}>
              Case #{caseData.id}
            </h1>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Created on {new Date(caseData.createdAt).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-blue-500/20 text-blue-400 border border-blue-500/30">
            {caseData.status}
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-500/20 text-rose-400 border border-rose-500/30">
            {caseData.priority} Priority
          </span>
        </div>
      </div>

      {/* Main Grid: Financial Overview & Diagnosis */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Amount at Risk */}
        <div
          className="rounded-xl p-5 border"
          style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
        >
          <div className="text-xs uppercase tracking-wider font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>
            Revenue At Risk
          </div>
          <div className="text-3xl font-bold font-mono-money text-rose-400">
            {formatMoney(caseData.amountAtRiskMinor, caseData.currency)}
          </div>
          <div className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
            100% of original payment value
          </div>
        </div>

        {/* Card 2: Recovered Revenue */}
        <div
          className="rounded-xl p-5 border"
          style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
        >
          <div className="text-xs uppercase tracking-wider font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>
            Actual Recovered
          </div>
          <div className="text-3xl font-bold font-mono-money text-emerald-400">
            {formatMoney(caseData.actualRecoveryMinor ?? 0, caseData.currency)}
          </div>
          <div className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
            {caseData.status === 'recovered' ? 'Verified in ledger' : 'Recovery in progress'}
          </div>
        </div>

        {/* Card 3: Model Prediction */}
        <div
          className="rounded-xl p-5 border"
          style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
        >
          <div className="text-xs uppercase tracking-wider font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>
            Recovery Probability
          </div>
          <div className="text-3xl font-bold font-mono-money text-blue-400">
            {caseData.recoveryProbability ? `${(caseData.recoveryProbability * 100).toFixed(0)}%` : '—'}
          </div>
          <div className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
            Expected Recovery: {caseData.expectedRecoveryMinor ? formatMoney(caseData.expectedRecoveryMinor, caseData.currency) : '—'}
          </div>
        </div>
      </div>

      {/* Failure & Diagnostic Details */}
      <div
        className="rounded-xl p-6 border space-y-4"
        style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
      >
        <h2 className="text-sm font-semibold tracking-wide uppercase" style={{ color: 'var(--text-primary)' }}>
          Failure Diagnostics
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="block font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Failure Code</span>
            <span className="font-mono font-semibold px-2 py-1 rounded bg-white/5 border border-white/10 inline-block text-amber-300">
              {caseData.failureCode || 'N/A'}
            </span>
          </div>
          <div>
            <span className="block font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Case Type</span>
            <span className="font-mono capitalize text-slate-300">
              {caseData.caseType}
            </span>
          </div>
          <div>
            <span className="block font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Retry Attempts</span>
            <span className="font-mono text-slate-300">
              {caseData.retryCount} / 2 allowed
            </span>
          </div>
          <div>
            <span className="block font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Customer Contacts</span>
            <span className="font-mono text-slate-300">
              {caseData.customerContacts} / 2 allowed
            </span>
          </div>
        </div>

        <div className="pt-2">
          <span className="block font-medium mb-1 text-xs" style={{ color: 'var(--text-muted)' }}>Raw Gateway Message</span>
          <div className="p-3 rounded-lg font-mono text-xs border bg-black/20" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
            {caseData.failureReason || 'No gateway error message recorded.'}
          </div>
        </div>
      </div>

      {/* Append-Only Audit Trail */}
      <div
        className="rounded-xl p-6 border space-y-4 shadow-2xl"
        style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-wide uppercase" style={{ color: 'var(--text-primary)' }}>
            Immutable Audit Trail ({auditTrail.length} events)
          </h2>
          <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Append-Only Ledger
          </span>
        </div>

        {auditTrail.length === 0 ? (
          <p className="text-xs py-4" style={{ color: 'var(--text-muted)' }}>
            No audit events recorded yet for this case.
          </p>
        ) : (
          <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
            {auditTrail.map((ev) => (
              <div key={ev.id} className="relative group">
                <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-blue-500 ring-4 ring-slate-900" />
                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1">
                  <span className="font-mono font-semibold text-blue-300">
                    {ev.eventType}
                  </span>
                  <span className="text-slate-500 text-[11px]">
                    {new Date(ev.createdAt).toLocaleString()} • Actor: <strong className="text-slate-400">{ev.actor || 'system'}</strong>
                  </span>
                </div>
                {ev.data && Object.keys(ev.data).length > 0 && (
                  <pre className="mt-2 p-2.5 rounded text-[11px] font-mono overflow-x-auto bg-black/30 border border-white/5 text-slate-300">
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
