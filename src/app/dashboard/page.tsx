'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatMoney, formatMoneyCompact } from '@/lib/money';

interface RevenueSummary {
  totalCases: number;
  activeCases: number;
  recoveredCases: number;
  totalAtRiskMinor: number;
  totalRecoveredMinor: number;
  recoveryRate: number;
  currency: string;
}

interface RevenueCase {
  id: string;
  caseType: string;
  status: string;
  priority: string;
  amountAtRiskMinor: number;
  currency: string;
  failureReason: string | null;
  failureCode: string | null;
  expectedRecoveryMinor: number | null;
  actualRecoveryMinor: number | null;
  createdAt: string;
}

function MetricCard({
  label,
  value,
  subValue,
  color,
}: {
  label: string;
  value: string;
  subValue?: string;
  color?: string;
}) {
  return (
    <div
      className="rounded-xl p-5 border transition-all hover:border-slate-700 shadow-lg"
      style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
    >
      <p className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
        {label}
      </p>
      <p
        className="text-2xl lg:text-3xl font-bold font-mono-money tracking-tight"
        style={{ color: color ?? 'var(--text-primary)' }}
      >
        {value}
      </p>
      {subValue && (
        <p className="text-xs mt-1.5 font-medium" style={{ color: 'var(--text-muted)' }}>
          {subValue}
        </p>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<RevenueSummary | null>(null);
  const [recentCases, setRecentCases] = useState<RevenueCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [sumRes, casesRes] = await Promise.all([
          fetch('/api/revenue/summary'),
          fetch('/api/cases?limit=5'),
        ]);

        if (!sumRes.ok) {
          if (sumRes.status === 403) {
            setError('no_merchant');
            return;
          }
          throw new Error('Failed to fetch summary');
        }

        const sumData = await sumRes.json();
        setSummary(sumData);

        if (casesRes.ok) {
          const casesData = await casesRes.json();
          setRecentCases(casesData.cases || []);
        }
      } catch (_err) {
        setError('fetch_error');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p style={{ color: 'var(--text-muted)' }}>Loading revenue data...</p>
      </div>
    );
  }

  if (error === 'no_merchant') {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Revenue Control Room
        </h1>
        <div
          className="rounded-xl p-6 border"
          style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
        >
          <p style={{ color: 'var(--text-secondary)' }}>
            No merchant context found. Run the seed script to set up demo data.
          </p>
          <pre className="mt-3 text-sm font-mono p-3 rounded" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
            npm run db:seed
          </pre>
        </div>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Revenue Control Room
        </h1>
        <div
          className="rounded-xl p-6 border border-rose-500/40 bg-rose-500/10 text-rose-400"
        >
          Failed to load revenue data. Ensure database migrations and seeds are executed.
        </div>
      </div>
    );
  }

  const recoveryRate = (summary.recoveryRate * 100).toFixed(1);

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Revenue Control Room
          </h1>
          <p className="text-xs sm:text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Real-time revenue recovery monitoring & automated policy execution
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            CONTROL PLANE ACTIVE
          </span>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Revenue at Risk"
          value={formatMoneyCompact(summary.totalAtRiskMinor, summary.currency)}
          subValue={`${summary.totalCases} total failed transactions`}
          color="var(--accent-red)"
        />
        <MetricCard
          label="Revenue Recovered"
          value={formatMoneyCompact(summary.totalRecoveredMinor, summary.currency)}
          subValue={`${summary.recoveredCases} verified recovered`}
          color="var(--accent-green)"
        />
        <MetricCard
          label="Recovery Efficiency"
          value={`${recoveryRate}%`}
          subValue={`${summary.recoveredCases} of ${summary.totalCases} cases closed`}
          color="var(--accent-blue)"
        />
        <MetricCard
          label="Active Cases"
          value={summary.activeCases.toString()}
          subValue="In automated pipeline"
          color="var(--accent-amber)"
        />
      </div>

      {/* Live Pipeline Preview */}
      <div
        className="rounded-xl border overflow-hidden shadow-2xl"
        style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
      >
        <div className="p-4 sm:px-6 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-color)' }}>
          <div>
            <h2 className="text-sm font-semibold tracking-wide uppercase" style={{ color: 'var(--text-primary)' }}>
              Active Recovery Pipeline
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Latest cases under active AI investigation and recovery execution
            </p>
          </div>
          <Link
            href="/dashboard/cases"
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors hover:bg-white/5"
            style={{ borderColor: 'var(--border-color)', color: 'var(--accent-blue)' }}
          >
            View All ({summary.totalCases}) →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead
              className="text-[11px] uppercase tracking-wider border-b"
              style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}
            >
              <tr>
                <th className="py-3 px-4 sm:px-6 font-semibold">Case ID</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold">Priority</th>
                <th className="py-3 px-4 font-semibold">Failure Diagnostic</th>
                <th className="py-3 px-4 font-semibold">Revenue At Risk</th>
                <th className="py-3 px-4 sm:px-6 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
              {recentCases.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                    No revenue cases in pipeline.
                  </td>
                </tr>
              ) : (
                recentCases.map((c) => (
                  <tr key={c.id} className="transition-colors hover:bg-white/[0.02]">
                    <td className="py-3.5 px-4 sm:px-6 font-mono text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                      {c.id.slice(0, 8)}...
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
                        {c.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold uppercase bg-slate-800 text-slate-300 border border-slate-700">
                        {c.priority}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-xs text-amber-300">
                        {c.failureCode || 'UNKNOWN'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono-money font-semibold text-rose-400 text-xs">
                      {formatMoney(c.amountAtRiskMinor, c.currency)}
                    </td>
                    <td className="py-3.5 px-4 sm:px-6 text-right">
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
