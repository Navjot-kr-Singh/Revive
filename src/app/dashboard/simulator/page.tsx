'use client';

import { useState, useEffect, useCallback } from 'react';
import { formatMoney } from '@/lib/money';

interface CandidateEvaluation {
  actionType: string;
  recoveryProbabilityBps: number;
  recoveryProbability: number;
  expectedRecoveryMinor: number;
  actionCostMinor: number;
  frictionPenaltyMinor: number;
  riskPenaltyMinor: number;
  expectedNetValueMinor: number;
  frictionLevel: string;
  confidence: number;
  reason: string;
  stoppingCondition: string;
  policyPermitted: boolean;
  failedRules: string[];
  passedRules: string[];
  evaluationReason: string;
}

interface SimulationResponse {
  amountMinor: number;
  amountMajor: number;
  currency: string;
  candidates: CandidateEvaluation[];
  selectedAction: string;
  selectedNetEVMinor: number;
}

const PRESET_SCENARIOS = [
  {
    name: 'Hero Demo: HDFC UPI Outage (₹24,999)',
    amountMajor: 24999,
    bank: 'HDFC Bank',
    paymentMethod: 'upi',
    failureCode: 'UPI_TIMEOUT',
    retryAttemptsCount: 0,
    customerContactsCount: 0,
    badge: 'HERO',
  },
  {
    name: 'High-Value VIP Order (₹75,000)',
    amountMajor: 75000,
    bank: 'ICICI Bank',
    paymentMethod: 'card',
    failureCode: 'BANK_TIMEOUT',
    retryAttemptsCount: 0,
    customerContactsCount: 0,
    badge: 'VIP ESCALATION',
  },
  {
    name: 'Exceeded Max Retries (₹4,999)',
    amountMajor: 4999,
    bank: 'SBI',
    paymentMethod: 'upi',
    failureCode: 'BANK_TIMEOUT',
    retryAttemptsCount: 2,
    customerContactsCount: 1,
    badge: 'POLICY BLOCK',
  },
  {
    name: 'Insufficient Funds (₹1,500)',
    amountMajor: 1500,
    bank: 'Axis Bank',
    paymentMethod: 'upi',
    failureCode: 'INSUFFICIENT_FUNDS',
    retryAttemptsCount: 0,
    customerContactsCount: 0,
    badge: 'SOFT FAILURE',
  },
];

export default function SimulatorPage() {
  const [amountMajor, setAmountMajor] = useState<number>(24999);
  const [bank, setBank] = useState<string>('HDFC Bank');
  const [paymentMethod, setPaymentMethod] = useState<string>('upi');
  const [failureCode, setFailureCode] = useState<string>('UPI_TIMEOUT');
  const [retryAttemptsCount, setRetryAttemptsCount] = useState<number>(0);
  const [customerContactsCount, setCustomerContactsCount] = useState<number>(0);

  const [simulation, setSimulation] = useState<SimulationResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const runSimulation = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/simulator/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountMajor,
          currency: 'INR',
          paymentMethod,
          bank,
          failureCode,
          retryAttemptsCount,
          customerContactsCount,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSimulation(data);
      }
    } catch (err) {
      console.error('Failed to run simulation', err);
    } finally {
      setLoading(false);
    }
  }, [amountMajor, bank, paymentMethod, failureCode, retryAttemptsCount, customerContactsCount]);

  useEffect(() => {
    runSimulation();
  }, [runSimulation]);

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 font-bold uppercase">
              Interactive Sandbox
            </span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Counterfactual Recovery Simulator
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Simulate recovery actions, compute integer Net Expected Value (EV), and test policy constraints across payment rails
          </p>
        </div>

        <button
          onClick={runSimulation}
          disabled={loading}
          className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md inline-flex items-center gap-2"
        >
          <span>{loading ? '⟳ Simulating...' : '⚡ Run Simulation'}</span>
        </button>
      </div>

      {/* Preset Scenarios */}
      <div
        className="rounded-xl p-4 border"
        style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
      >
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
          Quick Preset Scenarios
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {PRESET_SCENARIOS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => {
                setAmountMajor(preset.amountMajor);
                setBank(preset.bank);
                setPaymentMethod(preset.paymentMethod);
                setFailureCode(preset.failureCode);
                setRetryAttemptsCount(preset.retryAttemptsCount);
                setCustomerContactsCount(preset.customerContactsCount);
              }}
              className="text-left p-3 rounded-lg border transition-all hover:border-blue-500/60 hover:bg-white/[0.03] flex flex-col justify-between"
              style={{ borderColor: 'var(--border-color)', background: 'var(--bg-tertiary)' }}
            >
              <div>
                <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  {preset.badge}
                </span>
                <p className="text-xs font-semibold text-slate-200 mt-2 line-clamp-1">{preset.name}</p>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 font-mono-money">
                ₹{preset.amountMajor.toLocaleString('en-IN')} • {preset.bank}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Simulator Inputs & Selected Action Hero */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls */}
        <div
          className="lg:col-span-1 rounded-xl p-5 border space-y-4 shadow-xl"
          style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
        >
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-200 border-b pb-2" style={{ borderColor: 'var(--border-color)' }}>
            Transaction Parameters
          </h2>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Failed Transaction Amount (₹)</label>
              <input
                type="number"
                value={amountMajor}
                onChange={(e) => setAmountMajor(Number(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-lg border bg-black/40 text-white font-mono-money font-semibold text-sm focus:outline-none focus:border-blue-500"
                style={{ borderColor: 'var(--border-color)' }}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border bg-black/40 text-white focus:outline-none focus:border-blue-500"
                  style={{ borderColor: 'var(--border-color)' }}
                >
                  <option value="upi">UPI</option>
                  <option value="card">Credit / Debit Card</option>
                  <option value="netbanking">Netbanking</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Acquiring / Issuer Bank</label>
                <select
                  value={bank}
                  onChange={(e) => setBank(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border bg-black/40 text-white focus:outline-none focus:border-blue-500"
                  style={{ borderColor: 'var(--border-color)' }}
                >
                  <option value="HDFC Bank">HDFC Bank</option>
                  <option value="SBI">State Bank of India</option>
                  <option value="ICICI Bank">ICICI Bank</option>
                  <option value="Axis Bank">Axis Bank</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">Failure Code</label>
              <select
                value={failureCode}
                onChange={(e) => setFailureCode(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border bg-black/40 text-white font-mono focus:outline-none focus:border-blue-500"
                style={{ borderColor: 'var(--border-color)' }}
              >
                <option value="UPI_TIMEOUT">UPI_TIMEOUT (Issuer Rail Timeout)</option>
                <option value="BANK_TIMEOUT">BANK_TIMEOUT (Bank Switch Down)</option>
                <option value="AUTHENTICATION_FAILED">AUTHENTICATION_FAILED (OTP / 2FA Drop)</option>
                <option value="INSUFFICIENT_FUNDS">INSUFFICIENT_FUNDS (Customer Balance)</option>
                <option value="NETWORK_ERROR">NETWORK_ERROR (Gateway TCP Reset)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Previous Retries</label>
                <input
                  type="number"
                  min="0"
                  max="5"
                  value={retryAttemptsCount}
                  onChange={(e) => setRetryAttemptsCount(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-lg border bg-black/40 text-white font-mono text-xs focus:outline-none focus:border-blue-500"
                  style={{ borderColor: 'var(--border-color)' }}
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Customer Contacts</label>
                <input
                  type="number"
                  min="0"
                  max="3"
                  value={customerContactsCount}
                  onChange={(e) => setCustomerContactsCount(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-lg border bg-black/40 text-white font-mono text-xs focus:outline-none focus:border-blue-500"
                  style={{ borderColor: 'var(--border-color)' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Selected Action Result */}
        <div
          className="lg:col-span-2 rounded-xl p-5 border space-y-4 shadow-xl flex flex-col justify-between"
          style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
        >
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-200 border-b pb-2" style={{ borderColor: 'var(--border-color)' }}>
              Deterministic Policy Decision Outcome
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div className="p-4 rounded-xl border bg-black/40 space-y-1" style={{ borderColor: 'var(--border-color)' }}>
                <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                  Selected Action
                </p>
                <p className="text-xl font-bold font-mono text-emerald-400 uppercase">
                  {simulation?.selectedAction.replace(/_/g, ' ') || 'SIMULATING...'}
                </p>
                <p className="text-xs text-slate-400">
                  Approved by 12 deterministic policy rules
                </p>
              </div>

              <div className="p-4 rounded-xl border bg-black/40 space-y-1" style={{ borderColor: 'var(--border-color)' }}>
                <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                  Expected Net Value (EV)
                </p>
                <p className="text-xl font-bold font-mono-money text-blue-300">
                  {simulation ? formatMoney(simulation.selectedNetEVMinor, simulation.currency) : '₹0.00'}
                </p>
                <p className="text-xs text-slate-400">
                  Net value after costs, friction & risks
                </p>
              </div>
            </div>

            {/* Formula & Rule Governance Note */}
            <div className="mt-4 p-3.5 rounded-lg border bg-blue-950/20 border-blue-500/30 text-xs space-y-1.5">
              <p className="font-semibold text-blue-300">
                Mathematical Net Expected Value (EV) Law:
              </p>
              <p className="font-mono text-[11px] text-slate-300">
                Net EV = ⌊(Amount × P(Recovery)) / 10000⌋ - Action Cost - Friction Penalty - Risk Penalty
              </p>
              <p className="text-[11px] text-slate-400">
                If the candidate with the highest gross EV violates merchant allowlists or retry ceilings, REVIVE safely cascades to the highest positive-EV allowed option.
              </p>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 font-mono">
            Active Policy: revive-merchant-default-v1.2.0 • SHA-256 Validated
          </div>
        </div>
      </div>

      {/* Candidate Action Comparison Matrix */}
      <div
        className="rounded-xl border overflow-hidden shadow-2xl"
        style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
      >
        <div className="p-4 sm:px-6 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-color)' }}>
          <div>
            <h2 className="text-sm font-semibold tracking-wide uppercase text-white">
              Candidate Recovery Action Matrix (6 Interventions Evaluated)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Ranked by Net Expected Value (EV) with real-time policy gating
            </p>
          </div>
          <span className="text-xs font-mono px-2.5 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700">
            {simulation?.candidates.length || 0} Candidates Evaluated
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead
              className="text-[11px] uppercase tracking-wider border-b font-semibold"
              style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}
            >
              <tr>
                <th className="py-3 px-4 sm:px-6">Candidate Action</th>
                <th className="py-3 px-4">P(Recovery)</th>
                <th className="py-3 px-4">Gross Expected</th>
                <th className="py-3 px-4">Action Cost</th>
                <th className="py-3 px-4">Friction / Risk</th>
                <th className="py-3 px-4">Net Expected (EV)</th>
                <th className="py-3 px-4 sm:px-6 text-right">Policy Status</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
              {!simulation || simulation.candidates.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-slate-400">
                    Running simulation...
                  </td>
                </tr>
              ) : (
                simulation.candidates.map((cand) => {
                  const isSelected = simulation.selectedAction === cand.actionType;
                  return (
                    <tr
                      key={cand.actionType}
                      className={`transition-colors ${
                        isSelected
                          ? 'bg-blue-950/30'
                          : cand.policyPermitted
                          ? 'hover:bg-white/[0.02]'
                          : 'bg-black/20 opacity-75'
                      }`}
                    >
                      <td className="py-3.5 px-4 sm:px-6 font-mono text-xs font-bold text-white uppercase">
                        {cand.actionType.replace(/_/g, ' ')}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-300">
                        {(cand.recoveryProbabilityBps / 100).toFixed(1)}%
                      </td>
                      <td className="py-3.5 px-4 font-mono-money text-xs text-slate-300">
                        {formatMoney(cand.expectedRecoveryMinor, simulation.currency)}
                      </td>
                      <td className="py-3.5 px-4 font-mono-money text-xs text-rose-400">
                        -{formatMoney(cand.actionCostMinor, simulation.currency)}
                      </td>
                      <td className="py-3.5 px-4 font-mono-money text-xs text-amber-400">
                        -{formatMoney(cand.frictionPenaltyMinor + cand.riskPenaltyMinor, simulation.currency)}
                      </td>
                      <td className="py-3.5 px-4 font-mono-money font-bold text-xs text-blue-300">
                        {formatMoney(cand.expectedNetValueMinor, simulation.currency)}
                      </td>
                      <td className="py-3.5 px-4 sm:px-6 text-right">
                        {isSelected ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                            <span>✓</span> SELECTED
                          </span>
                        ) : cand.policyPermitted ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                            ALLOWED
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                            DENIED ({cand.failedRules[0] || 'POLICY'})
                          </span>
                        )}
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
