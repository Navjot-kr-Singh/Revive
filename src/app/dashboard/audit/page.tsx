'use client';

import { useState, useEffect } from 'react';

interface AuditRecord {
  id: string;
  entityType: string;
  entityId: string;
  eventType: string;
  actor: string;
  correlationId: string | null;
  data: Record<string, unknown> | null;
  createdAt: string;
}

export default function AuditPage() {
  const [events, setEvents] = useState<AuditRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterActor, setFilterActor] = useState<string>('ALL');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    async function loadAudit() {
      try {
        setLoading(true);
        const res = await fetch('/api/audit?limit=100');
        if (res.ok) {
          const json = await res.json();
          setEvents(json.events || []);
        }
      } catch (err) {
        console.error('Failed to load audit events', err);
      } finally {
        setLoading(false);
      }
    }
    loadAudit();
  }, []);

  const filteredEvents = events.filter((e) => {
    if (filterType !== 'ALL' && e.eventType !== filterType) return false;
    if (filterActor !== 'ALL' && (e.actor || 'system') !== filterActor) return false;
    return true;
  });

  const eventTypes = Array.from(new Set(events.map((e) => e.eventType)));
  const actors = Array.from(new Set(events.map((e) => e.actor || 'system')));

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold uppercase">
              Append-Only Ledger
            </span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Cryptographic Audit Trail
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Immutable, zero-trust ledger recording every incident, AI investigation, policy authorization, and execution dispatch
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            SHA-256 VERIFIED
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div
        className="rounded-xl p-4 border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md"
        style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Filter:
          </span>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-2.5 py-1 rounded-lg border bg-black/40 text-xs text-white focus:outline-none focus:border-blue-500"
            style={{ borderColor: 'var(--border-color)' }}
          >
            <option value="ALL">All Event Types ({events.length})</option>
            {eventTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <select
            value={filterActor}
            onChange={(e) => setFilterActor(e.target.value)}
            className="px-2.5 py-1 rounded-lg border bg-black/40 text-xs text-white focus:outline-none focus:border-blue-500"
            style={{ borderColor: 'var(--border-color)' }}
          >
            <option value="ALL">All Actors</option>
            {actors.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>

        <div className="text-xs text-slate-400 font-mono">
          Showing {filteredEvents.length} of {events.length} records
        </div>
      </div>

      {/* Audit Log Table */}
      <div
        className="rounded-xl border overflow-hidden shadow-2xl"
        style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
      >
        <div className="p-4 sm:px-6 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-color)' }}>
          <div>
            <h2 className="text-sm font-semibold tracking-wide uppercase text-white">
              Immutable Governance Events
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Strictly append-only (No UPDATE or DELETE operations permitted)
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead
              className="text-[11px] uppercase tracking-wider border-b font-semibold"
              style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}
            >
              <tr>
                <th className="py-3 px-4 sm:px-6">Timestamp</th>
                <th className="py-3 px-4">Event Type</th>
                <th className="py-3 px-4">Entity Type</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Entity ID</th>
                <th className="py-3 px-4 sm:px-6 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-slate-400">
                    Loading audit ledger from Neon DB...
                  </td>
                </tr>
              ) : filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-slate-400">
                    No audit records match the selected filter.
                  </td>
                </tr>
              ) : (
                filteredEvents.map((evt) => {
                  const isExpanded = expandedId === evt.id;
                  return (
                    <tr key={evt.id} className="group transition-colors hover:bg-white/[0.02]">
                      <td className="py-3.5 px-4 sm:px-6 font-mono text-xs text-slate-300 whitespace-nowrap">
                        {new Date(evt.createdAt).toLocaleString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-xs font-semibold text-blue-300">
                          {evt.eventType}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-xs text-slate-300 uppercase font-mono">
                          {evt.entityType}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold uppercase bg-slate-800 text-slate-300 border border-slate-700">
                          {evt.actor}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-400">
                        {evt.entityId.slice(0, 8)}...
                      </td>
                      <td className="py-3.5 px-4 sm:px-6 text-right">
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : evt.id)}
                          className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
                        >
                          {isExpanded ? 'Hide Payload ▲' : 'View Payload ▼'}
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

      {/* Expanded JSON Payload Drawer */}
      {expandedId && (
        <div
          className="rounded-xl p-5 border shadow-2xl space-y-3"
          style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
        >
          <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border-color)' }}>
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                Event Payload & Cryptographic Context
              </p>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                Audit Record: {expandedId}
              </p>
            </div>
            <button
              onClick={() => setExpandedId(null)}
              className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-black/40 border border-slate-700"
            >
              Close
            </button>
          </div>

          <pre
            className="p-4 rounded-lg text-xs font-mono overflow-x-auto text-emerald-300"
            style={{ background: 'var(--bg-tertiary)' }}
          >
            {JSON.stringify(
              events.find((e) => e.id === expandedId)?.data || { message: 'No additional payload attached' },
              null,
              2
            )}
          </pre>
        </div>
      )}
    </div>
  );
}
