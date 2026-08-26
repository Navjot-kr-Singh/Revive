'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatMoney } from '@/lib/money';

interface RevenueCase {
  id: string;
  caseType: string;
  status: string;
  priority: string;
  amountAtRiskMinor: number;
  currency: string;
  failureReason: string | null;
  failureCode: string | null;
  recoveryProbability: number | null;
  expectedRecoveryMinor: number | null;
  actualRecoveryMinor: number | null;
  createdAt: string;
}

export default function CasesPage() {
  const [cases, setCases] = useState<RevenueCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    async function fetchCases() {
      try {
        setLoading(true);
        const url = statusFilter === 'all' ? '/api/cases' : `/api/cases?status=${statusFilter}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setCases(data.cases || []);
        }
      } catch (err) {
        console.error('Failed to load cases', err);
      } finally {
        setLoading(false);
      }
    }
    fetchCases();
  }, [statusFilter]);

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'recovered':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'new':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'analyzing':
      case 'simulating':
      case 'executing':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'failed':
      case 'stopped':
        return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
      default:
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  const getPriorityBadgeClass = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
      case 'high':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'medium':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      default:
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Revenue Cases
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Active recovery pipeline and automated interventions
          </p>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2">
          {['all', 'new', 'analyzing', 'recovered', 'failed'].map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium uppercase tracking-wider transition-all border ${
                statusFilter === filter
                  ? 'bg-blue-600/30 border-blue-500 text-blue-300'
                  : 'bg-transparent border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Cases Table */}
      <div
        className="rounded-xl border overflow-hidden shadow-2xl"
        style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead
              className="text-xs uppercase tracking-wider border-b"
              style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}
            >
              <tr>
                <th className="py-3.5 px-4 font-semibold">Case ID</th>
                <th className="py-3.5 px-4 font-semibold">Status</th>
                <th className="py-3.5 px-4 font-semibold">Priority</th>
                <th className="py-3.5 px-4 font-semibold">Failure Reason</th>
                <th className="py-3.5 px-4 font-semibold">Amount At Risk</th>
                <th className="py-3.5 px-4 font-semibold">Recovered / Exp.</th>
                <th className="py-3.5 px-4 font-semibold">Created</th>
                <th className="py-3.5 px-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center" style={{ color: 'var(--text-muted)' }}>
                    Loading cases...
                  </td>
                </tr>
              ) : cases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center" style={{ color: 'var(--text-muted)' }}>
                    No revenue cases found for the selected filter.
                  </td>
                </tr>
              ) : (
                cases.map((c) => (
                  <tr key={c.id} className="transition-colors hover:bg-white/[0.02]">
                    <td className="py-3.5 px-4 font-mono text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                      {c.id.slice(0, 8)}...
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusBadgeClass(c.status)}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase border ${getPriorityBadgeClass(c.priority)}`}>
                        {c.priority}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-xs" style={{ color: 'var(--text-primary)' }}>
                        {c.failureCode || 'UNKNOWN'}
                      </div>
                      <div className="text-xs truncate max-w-xs" style={{ color: 'var(--text-muted)' }}>
                        {c.failureReason || 'Payment failure'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono-money font-semibold text-rose-400">
                      {formatMoney(c.amountAtRiskMinor, c.currency)}
                    </td>
                    <td className="py-3.5 px-4 font-mono-money text-xs">
                      {c.status === 'recovered' ? (
                        <span className="text-emerald-400 font-semibold">
                          {formatMoney(c.actualRecoveryMinor ?? 0, c.currency)}
                        </span>
                      ) : c.expectedRecoveryMinor ? (
                        <span className="text-slate-400">
                          ~{formatMoney(c.expectedRecoveryMinor, c.currency)}
                        </span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/dashboard/cases/${c.id}`}
                        className="inline-flex items-center px-2.5 py-1 rounded text-xs font-medium border transition-colors hover:bg-white/10"
                        style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
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
    </div>
  );
}
