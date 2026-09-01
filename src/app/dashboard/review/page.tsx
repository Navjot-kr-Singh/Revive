'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatMoney } from '@/lib/money';

interface ReviewCase {
  caseId: string;
  amountAtRiskMinor: number;
  currency: string;
  state: string;
  priority: string;
  failureCode: string | null;
  failureReason: string | null;
  paymentMethod: string | null;
  bank: string | null;
  recoveryAttemptsCount: number;
  createdAt: string;
  latestDecision?: {
    actionType: string;
    reason: string;
    decisionStatus: string;
  } | null;
}

export default function HumanReviewQueuePage() {
  const [reviewCases, setReviewCases] = useState<ReviewCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let isMounted = true;
    async function fetchReviews() {
      try {
        setLoading(true);
        const res = await fetch('/api/reviews');
        if (res.ok) {
          const data = await res.json();
          if (isMounted) setReviewCases(data.reviewCases || []);
        }
      } catch (err) {
        console.error('Failed to fetch review cases', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchReviews();
    return () => {
      isMounted = false;
    };
  }, [refreshKey]);

  async function handleOperatorAction(caseId: string, action: 'APPROVE' | 'REJECT' | 'ESCALATE', modifiedActionType?: string) {
    try {
      setActionInProgress(caseId);
      const res = await fetch(`/api/reviews/${caseId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          note: `Operator executed ${action} via Review Queue`,
          modifiedActionType,
        }),
      });

      if (res.ok) {
        setRefreshKey((k) => k + 1);
      } else {
        const errJson = await res.json();
        alert(`Action failed: ${errJson.error?.message || 'Unknown error'}`);
      }
    } catch {
      alert('Network error');
    } finally {
      setActionInProgress(null);
    }
  }

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30 font-bold uppercase">
              Human Review Queue
            </span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Escalated Revenue Cases
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Cases escalated due to high transaction value, policy constraints, or diagnostic uncertainty
          </p>
        </div>

        <button
          onClick={() => setRefreshKey((k) => k + 1)}
          className="px-3 py-1.5 rounded-lg border text-xs font-semibold hover:bg-white/5 transition-colors text-slate-300"
          style={{ borderColor: 'var(--border-color)' }}
        >
          ↻ Refresh Queue
        </button>
      </div>

      {/* Queue Table */}
      <div
        className="rounded-xl border overflow-hidden shadow-2xl"
        style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
      >
        <div className="p-4 sm:px-6 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-color)' }}>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
            Pending Operator Reviews ({reviewCases.length})
          </h2>
          <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            Zero Automated Financial Mutations Allowed in Queue
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead
              className="text-[11px] uppercase tracking-wider border-b"
              style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}
            >
              <tr>
                <th className="py-3 px-4 font-semibold">Case ID</th>
                <th className="py-3 px-4 font-semibold">Amount At Risk</th>
                <th className="py-3 px-4 font-semibold">Failure Diagnostic</th>
                <th className="py-3 px-4 font-semibold">Escalation Reason</th>
                <th className="py-3 px-4 font-semibold">Proposed Action</th>
                <th className="py-3 px-4 font-semibold text-right">Operator Action</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-slate-500">
                    Loading review queue...
                  </td>
                </tr>
              ) : reviewCases.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-slate-500 space-y-2">
                    <p className="text-sm text-slate-300 font-semibold">All Clear — No Escalated Cases</p>
                    <p className="text-slate-500">Automated policies are operating within configured parameters.</p>
                  </td>
                </tr>
              ) : (
                reviewCases.map((c) => {
                  const isProcessing = actionInProgress === c.caseId;
                  return (
                    <tr key={c.caseId} className="transition-colors hover:bg-white/[0.02]">
                      <td className="py-3 px-4 font-mono text-xs text-slate-200">
                        <Link href={`/dashboard/cases/${c.caseId}`} className="text-blue-400 hover:underline">
                          {c.caseId.slice(0, 8)}...
                        </Link>
                      </td>
                      <td className="py-3 px-4 font-mono-money font-bold text-rose-400 text-xs">
                        {formatMoney(c.amountAtRiskMinor, c.currency)}
                      </td>
                      <td className="py-3 px-4 text-xs">
                        <div className="font-mono text-amber-300">{c.failureCode || 'BANK_TIMEOUT'}</div>
                        <div className="text-[11px] text-slate-500">{c.bank || 'HDFC'} • {c.paymentMethod || 'UPI'}</div>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-300 max-w-xs">
                        {c.latestDecision?.reason || 'Exceeds automated value threshold; requires operator clearance.'}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-xs font-mono font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30 uppercase">
                          {c.latestDecision?.actionType || 'PAYMENT_LINK'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          onClick={() => handleOperatorAction(c.caseId, 'APPROVE')}
                          disabled={isProcessing}
                          className="px-2.5 py-1 rounded text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-sm"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleOperatorAction(c.caseId, 'REJECT')}
                          disabled={isProcessing}
                          className="px-2.5 py-1 rounded text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white transition-all shadow-sm"
                        >
                          Reject
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
