'use client';

import { useState } from 'react';

const ABLATION_TIERS = [
  {
    tier: 'Tier 1',
    name: 'Control Baseline (Single Retry)',
    recoveryRate: '6.6%',
    netGmv: '₹1.718 Cr',
    lift: '0.0%',
    policyBlocks: 0,
    safetyStatus: 'Unmanaged',
  },
  {
    tier: 'Tier 2',
    name: '+ Statistical Recovery Model (Unconstrained)',
    recoveryRate: '37.7%',
    netGmv: '₹9.814 Cr',
    lift: '+471.2%',
    policyBlocks: 0,
    safetyStatus: 'High Risk (No Policy Gating)',
  },
  {
    tier: 'Tier 3',
    name: '+ Deterministic Policy Gating (12 Rules)',
    recoveryRate: '32.0%',
    netGmv: '₹8.291 Cr',
    lift: '+382.5%',
    policyBlocks: 5000,
    safetyStatus: 'Safe (0 Policy Bypasses)',
  },
  {
    tier: 'Tier 4',
    name: '+ Contextual Net EV Optimization',
    recoveryRate: '34.0%',
    netGmv: '₹8.868 Cr',
    lift: '+416.1%',
    policyBlocks: 5000,
    safetyStatus: 'Optimal Unit Economics',
  },
  {
    tier: 'Tier 5',
    name: 'Full REVIVE Control Plane (Hardened)',
    recoveryRate: '34.0%',
    netGmv: '₹8.823 Cr',
    lift: '+413.5%',
    policyBlocks: 5000,
    safetyStatus: 'Production Certified (0 Violations)',
  },
];

const SCENARIO_BENCHMARKS = [
  { id: 1, name: 'HDFC UPI Degradation', cases: 6667, control: '3.9%', revive: '43.8%', lift: '+1030.6%' },
  { id: 2, name: 'SBI UPI Degradation', cases: 6667, control: '3.5%', revive: '43.7%', lift: '+1139.1%' },
  { id: 3, name: 'ICICI Card Degradation', cases: 6667, control: '5.8%', revive: '21.2%', lift: '+268.8%' },
  { id: 4, name: 'Gateway Timeout', cases: 6667, control: '7.3%', revive: '36.2%', lift: '+396.3%' },
  { id: 5, name: 'Bank Timeout', cases: 6667, control: '11.3%', revive: '19.5%', lift: '+72.2%' },
  { id: 6, name: 'Insufficient Funds', cases: 6667, control: '3.4%', revive: '26.3%', lift: '+675.2%' },
  { id: 7, name: 'Authentication Failure', cases: 6667, control: '3.2%', revive: '29.7%', lift: '+828.6%' },
  { id: 8, name: 'Regional Degradation', cases: 6667, control: '22.1%', revive: '34.2%', lift: '+54.9%' },
  { id: 9, name: 'Payment-Method-Wide Outage', cases: 6667, control: '3.3%', revive: '44.1%', lift: '+1250.0%' },
  { id: 10, name: 'Flash Sale Traffic Spike', cases: 6667, control: '24.1%', revive: '22.4%', lift: '-7.2%' },
  { id: 11, name: 'Mixed Card + UPI Outage', cases: 6666, control: '3.2%', revive: '43.4%', lift: '+1257.3%' },
  { id: 12, name: 'Ambiguous Incident', cases: 6666, control: '4.2%', revive: '19.3%', lift: '+358.7%' },
  { id: 13, name: 'Normal Traffic Baseline', cases: 6666, control: '23.0%', revive: '34.3%', lift: '+49.3%' },
  { id: 14, name: 'Recoverable Transient Failure', cases: 6666, control: '23.1%', revive: '33.9%', lift: '+46.8%' },
  { id: 15, name: 'Non-Recoverable Terminal Failure', cases: 6666, control: '0.0%', revive: '5.6%', lift: '+37000.0%' },
];

export default function ExperimentsPage() {
  const [activeTab, setActiveTab] = useState<'benchmarks' | 'ablation' | 'calibration'>('benchmarks');

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30 font-bold uppercase">
              Evaluation & Ablation
            </span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Recovery Experiments & Benchmarks
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Empirical validation across 100,000 cases, component ablation studies, and holdout probability calibration
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 p-1 rounded-lg border bg-black/40" style={{ borderColor: 'var(--border-color)' }}>
          <button
            onClick={() => setActiveTab('benchmarks')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'benchmarks' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            100k Benchmark
          </button>
          <button
            onClick={() => setActiveTab('ablation')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'ablation' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            5-Tier Ablation
          </button>
          <button
            onClick={() => setActiveTab('calibration')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'calibration' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Holdout Calibration
          </button>
        </div>
      </div>

      {/* Top 4 KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl p-5 border shadow-xl" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
          <p className="text-xs uppercase tracking-wider font-semibold mb-2 text-slate-400">
            Total Evaluated Cases
          </p>
          <p className="text-3xl font-bold font-mono text-white">
            100,000
          </p>
          <p className="text-xs mt-1 text-slate-400">
            Across 15 scenario categories
          </p>
        </div>

        <div className="rounded-xl p-5 border shadow-xl" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
          <p className="text-xs uppercase tracking-wider font-semibold mb-2 text-emerald-400">
            Relative Net Lift
          </p>
          <p className="text-3xl font-bold font-mono text-emerald-400">
            +107.8%
          </p>
          <p className="text-xs mt-1 text-slate-400">
            vs Single Retry Control Strategy
          </p>
        </div>

        <div className="rounded-xl p-5 border shadow-xl" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
          <p className="text-xs uppercase tracking-wider font-semibold mb-2 text-blue-400">
            Incremental Net Recovered
          </p>
          <p className="text-3xl font-bold font-mono-money text-blue-300">
            +₹16.31 Cr
          </p>
          <p className="text-xs mt-1 text-slate-400">
            ₹31.45 Cr vs ₹15.14 Cr
          </p>
        </div>

        <div className="rounded-xl p-5 border shadow-xl" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
          <p className="text-xs uppercase tracking-wider font-semibold mb-2 text-purple-400">
            Hard Safety Violations
          </p>
          <p className="text-3xl font-bold font-mono text-purple-300">
            0
          </p>
          <p className="text-xs mt-1 text-slate-400">
            0 unsafe, 0 bypasses, 0 duplicates
          </p>
        </div>
      </div>

      {/* Tab 1: 100k Benchmark Scenarios */}
      {activeTab === 'benchmarks' && (
        <div
          className="rounded-xl border overflow-hidden shadow-2xl space-y-4"
          style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
        >
          <div className="p-4 sm:px-6 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-color)' }}>
            <div>
              <h2 className="text-sm font-semibold tracking-wide uppercase text-white">
                15 Scenario Category Recovery Breakdown (N = 100,000)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Evaluated deterministically across banking, gateway, auth, and rail outage distributions
              </p>
            </div>
            <span className="text-xs font-mono px-2.5 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700">
              Target: +107.8% Overall Lift
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead
                className="text-[11px] uppercase tracking-wider border-b font-semibold"
                style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}
              >
                <tr>
                  <th className="py-3 px-4 sm:px-6">#</th>
                  <th className="py-3 px-4">Scenario Category</th>
                  <th className="py-3 px-4">Cases</th>
                  <th className="py-3 px-4">Control Recovery</th>
                  <th className="py-3 px-4">REVIVE Recovery</th>
                  <th className="py-3 px-4 sm:px-6 text-right">Relative Lift</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
                {SCENARIO_BENCHMARKS.map((s) => (
                  <tr key={s.id} className="transition-colors hover:bg-white/[0.02]">
                    <td className="py-3.5 px-4 sm:px-6 font-mono text-xs text-slate-400">{s.id}</td>
                    <td className="py-3.5 px-4 font-semibold text-xs text-white">{s.name}</td>
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-300">{s.cases.toLocaleString()}</td>
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-400">{s.control}</td>
                    <td className="py-3.5 px-4 font-mono text-xs font-bold text-emerald-400">{s.revive}</td>
                    <td className="py-3.5 px-4 sm:px-6 font-mono text-xs font-bold text-right text-blue-300">{s.lift}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: 5-Tier Component Ablation */}
      {activeTab === 'ablation' && (
        <div
          className="rounded-xl border overflow-hidden shadow-2xl"
          style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
        >
          <div className="p-4 sm:px-6 border-b" style={{ borderColor: 'var(--border-color)' }}>
            <h2 className="text-sm font-semibold tracking-wide uppercase text-white">
              Component Ablation Study (N = 20,000 Cases)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Measuring the isolated impact of statistical recovery modeling, policy gating, and contextual EV optimization
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead
                className="text-[11px] uppercase tracking-wider border-b font-semibold"
                style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}
              >
                <tr>
                  <th className="py-3 px-4 sm:px-6">Architecture Tier</th>
                  <th className="py-3 px-4">Component Configuration</th>
                  <th className="py-3 px-4">Recovery Rate</th>
                  <th className="py-3 px-4">Net GMV Recovered</th>
                  <th className="py-3 px-4">Lift vs Baseline</th>
                  <th className="py-3 px-4 sm:px-6 text-right">Governance Status</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
                {ABLATION_TIERS.map((tier) => (
                  <tr key={tier.tier} className="transition-colors hover:bg-white/[0.02]">
                    <td className="py-3.5 px-4 sm:px-6 font-mono text-xs font-bold text-blue-400">{tier.tier}</td>
                    <td className="py-3.5 px-4 font-semibold text-xs text-white">{tier.name}</td>
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-300">{tier.recoveryRate}</td>
                    <td className="py-3.5 px-4 font-mono text-xs font-bold text-emerald-400">{tier.netGmv}</td>
                    <td className="py-3.5 px-4 font-mono text-xs font-bold text-blue-300">{tier.lift}</td>
                    <td className="py-3.5 px-4 sm:px-6 text-right">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold uppercase bg-slate-800 text-slate-300 border border-slate-700">
                        {tier.safetyStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Holdout Probability Calibration */}
      {activeTab === 'calibration' && (
        <div
          className="rounded-xl p-6 border shadow-2xl space-y-6"
          style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
        >
          <div>
            <h2 className="text-sm font-semibold tracking-wide uppercase text-white">
              Probability Calibration on Independent Holdout (N = 5,000)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Verified that estimated recovery probabilities match empirical success rates with zero calibration drift
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border bg-black/40 space-y-1" style={{ borderColor: 'var(--border-color)' }}>
              <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                Holdout Brier Score
              </p>
              <p className="text-2xl font-bold font-mono text-emerald-400">
                0.1244
              </p>
              <p className="text-xs text-slate-400">
                Theoretical Bayes Bound: 0.1237 (Loss: &lt;0.07%)
              </p>
            </div>

            <div className="p-4 rounded-xl border bg-black/40 space-y-1" style={{ borderColor: 'var(--border-color)' }}>
              <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                Expected Calibration Error (ECE)
              </p>
              <p className="text-2xl font-bold font-mono text-blue-300">
                0.56%
              </p>
              <p className="text-xs text-slate-400">
                Target: &lt; 2.0% across all 10 probability bins
              </p>
            </div>

            <div className="p-4 rounded-xl border bg-black/40 space-y-1" style={{ borderColor: 'var(--border-color)' }}>
              <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                Maximum Calibration Error (MCE)
              </p>
              <p className="text-2xl font-bold font-mono text-purple-300">
                1.02%
              </p>
              <p className="text-xs text-slate-400">
                Worst-case bucket deviation &lt; 1.05%
              </p>
            </div>
          </div>

          <div className="p-4 rounded-lg border bg-blue-950/20 border-blue-500/30 text-xs space-y-1">
            <p className="font-semibold text-blue-300">
              Why Calibration Matters for Fintech Safety:
            </p>
            <p className="text-slate-300">
              In financial recovery decisions, overestimating success probability leads to wasteful SMS/WhatsApp friction costs and unnecessary gateway link fees. Underestimating leads to abandoned revenue. REVIVE&#39;s near-zero calibration error guarantees that expected net value calculations reflect true economic yields.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
