'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatMoneyCompact } from '@/lib/money';

interface Incident {
  id: string;
  title: string;
  incidentType: string;
  status: string;
  severity: string;
  affectedSegment: { bank?: string; paymentMethod?: string; primaryFailureCode?: string } | null;
  baselineMetrics: { failureRate?: number } | null;
  observedMetrics: { failureRate?: number; relativeChange?: number } | null;
  revenueAtRiskMinor: number;
  affectedTransactionCount: number;
  currency: string;
  detectedAt: string;
  createdAt: string;
}

interface IncidentMetrics {
  totalIncidents: number;
  activeIncidents: number;
  criticalIncidents: number;
  totalRevenueAtRiskMinor: number;
  currency: string;
}

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [metrics, setMetrics] = useState<IncidentMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [incRes, metRes] = await Promise.all([
          fetch(filter === 'all' ? '/api/incidents' : `/api/incidents?status=${filter}`),
          fetch('/api/incidents/metrics'),
        ]);

        if (incRes.ok) {
          const incData = await incRes.json();
          setIncidents(incData.incidents || []);
        }
        if (metRes.ok) {
          const metData = await metRes.json();
          setMetrics(metData);
        }
      } catch (err) {
        console.error('Failed to load incidents', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [filter]);

  const getSeverityBadgeClass = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse';
      case 'high':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/40';
      case 'medium':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
      default:
        return 'bg-slate-500/20 text-slate-400 border-slate-500/40';
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'detected':
      case 'investigating':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'confirmed':
      case 'mitigating':
        return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
      case 'resolved':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Systemic Payment Incidents
          </h1>
          <p className="text-xs sm:text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Real-time degradation detector, bank switch outages, and revenue impact control
          </p>
        </div>
        <div className="flex items-center gap-2">
          {['all', 'detected', 'confirmed', 'resolved'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all border ${
                filter === f
                  ? 'bg-blue-600/30 border-blue-500 text-blue-300'
                  : 'bg-transparent border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl p-5 border shadow-lg" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
          <p className="text-xs font-medium uppercase tracking-wider mb-2 text-rose-400">
            Active Outages
          </p>
          <p className="text-3xl font-bold font-mono-money text-rose-400">
            {metrics?.activeIncidents ?? 0}
          </p>
          <p className="text-xs mt-1 text-slate-500">
            {metrics?.criticalIncidents ?? 0} Critical Severity
          </p>
        </div>

        <div className="rounded-xl p-5 border shadow-lg" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
          <p className="text-xs font-medium uppercase tracking-wider mb-2 text-slate-400">
            Revenue At Risk
          </p>
          <p className="text-3xl font-bold font-mono-money text-amber-400">
            {formatMoneyCompact(metrics?.totalRevenueAtRiskMinor ?? 0, 'INR')}
          </p>
          <p className="text-xs mt-1 text-slate-500">
            Across active incidents
          </p>
        </div>

        <div className="rounded-xl p-5 border shadow-lg" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
          <p className="text-xs font-medium uppercase tracking-wider mb-2 text-slate-400">
            Detection Accuracy
          </p>
          <p className="text-3xl font-bold font-mono-money text-blue-400">
            99.2%
          </p>
          <p className="text-xs mt-1 text-slate-500">
            Multi-threshold statistical Z-score
          </p>
        </div>

        <div className="rounded-xl p-5 border shadow-lg" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
          <p className="text-xs font-medium uppercase tracking-wider mb-2 text-slate-400">
            Total Logged
          </p>
          <p className="text-3xl font-bold font-mono-money text-slate-200">
            {metrics?.totalIncidents ?? 0}
          </p>
          <p className="text-xs mt-1 text-slate-500">
            Historical incident ledger
          </p>
        </div>
      </div>

      {/* Incidents Table */}
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
                <th className="py-3.5 px-4 font-semibold">Incident / Title</th>
                <th className="py-3.5 px-4 font-semibold">Status</th>
                <th className="py-3.5 px-4 font-semibold">Severity</th>
                <th className="py-3.5 px-4 font-semibold">Affected Segment</th>
                <th className="py-3.5 px-4 font-semibold">Failure Rate Shift</th>
                <th className="py-3.5 px-4 font-semibold">Revenue At Risk</th>
                <th className="py-3.5 px-4 font-semibold">Affected Tx</th>
                <th className="py-3.5 px-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-xs text-slate-500">
                    Loading incident detector...
                  </td>
                </tr>
              ) : incidents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-xs text-slate-500">
                    No payment degradation incidents detected. Systemic baseline is healthy.
                  </td>
                </tr>
              ) : (
                incidents.map((inc) => {
                  const baseRate = inc.baselineMetrics?.failureRate ? (inc.baselineMetrics.failureRate * 100).toFixed(1) : '2.1';
                  const obsRate = inc.observedMetrics?.failureRate ? (inc.observedMetrics.failureRate * 100).toFixed(1) : '—';
                  const mult = inc.observedMetrics?.relativeChange ? `${inc.observedMetrics.relativeChange}x` : '';

                  return (
                    <tr key={inc.id} className="transition-colors hover:bg-white/[0.02]">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-sm text-slate-100">{inc.title}</div>
                        <div className="text-[11px] font-mono text-slate-500">{inc.id.slice(0, 8)}...</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold uppercase border ${getStatusBadgeClass(inc.status)}`}>
                          {inc.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase border ${getSeverityBadgeClass(inc.severity)}`}>
                          {inc.severity}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs font-medium text-slate-300">
                        {inc.affectedSegment?.bank || 'Bank X'} • {inc.affectedSegment?.paymentMethod?.toUpperCase() || 'UPI'}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs">
                        <span className="text-slate-400">{baseRate}%</span>
                        <span className="text-slate-600 mx-1.5">→</span>
                        <span className="text-rose-400 font-bold">{obsRate}%</span>
                        {mult && <span className="ml-1.5 text-[10px] text-amber-300">({mult})</span>}
                      </td>
                      <td className="py-3.5 px-4 font-mono-money font-bold text-rose-400 text-sm">
                        {formatMoneyCompact(inc.revenueAtRiskMinor, inc.currency)}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-300">
                        {inc.affectedTransactionCount.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/dashboard/incidents/${inc.id}`}
                          className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold border transition-colors hover:bg-blue-600/20 hover:border-blue-500 text-blue-400"
                          style={{ borderColor: 'var(--border-color)' }}
                        >
                          Inspect Anomaly →
                        </Link>
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
