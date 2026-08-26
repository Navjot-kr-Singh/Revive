import { pgTable, uuid, varchar, timestamp, bigint, integer, real, text, jsonb, index } from 'drizzle-orm/pg-core';
import { merchants } from './users';

// ─── Incidents ─────────────────────────────────────
export const incidents = pgTable('incidents', {
  id: uuid('id').primaryKey().defaultRandom(),
  merchantId: uuid('merchant_id').notNull().references(() => merchants.id),
  incidentType: varchar('incident_type', { length: 100 }).notNull().default('payment_degradation'),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  status: varchar('status', { length: 50 }).notNull().default('detected'),
  severity: varchar('severity', { length: 20 }).notNull().default('medium'),
  fingerprint: varchar('fingerprint', { length: 255 }), // For deterministic correlation & deduplication
  affectedSegment: jsonb('affected_segment'), // e.g. { bank: 'HDFC', paymentMethod: 'upi', platform: 'android' }
  baselineMetrics: jsonb('baseline_metrics'), // e.g. { failureRate: 0.021, normalVolume: 500 }
  observedMetrics: jsonb('observed_metrics'), // e.g. { failureRate: 0.187, currentVolume: 530 }
  revenueAtRiskMinor: bigint('revenue_at_risk_minor', { mode: 'number' }).notNull().default(0),
  revenueImpactMinor: bigint('revenue_impact_minor', { mode: 'number' }).notNull().default(0),
  affectedTransactionCount: integer('affected_transaction_count').notNull().default(0),
  affectedGmvMinor: bigint('affected_gmv_minor', { mode: 'number' }).notNull().default(0),
  casesCreated: integer('cases_created').notNull().default(0),
  casesRecovered: integer('cases_recovered').notNull().default(0),
  rootCauseCandidate: text('root_cause_candidate'),
  confidence: real('confidence').default(0.9),
  detectionRule: varchar('detection_rule', { length: 100 }).default('STATISTICAL_RATE_DEVIATION'),
  currency: varchar('currency', { length: 3 }).notNull().default('INR'),
  startedAt: timestamp('started_at', { withTimezone: true }),
  detectedAt: timestamp('detected_at', { withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_incidents_merchant_status').on(table.merchantId, table.status),
  index('idx_incidents_fingerprint').on(table.fingerprint),
]);

// ─── Incident Signals ──────────────────────────────
export const incidentSignals = pgTable('incident_signals', {
  id: uuid('id').primaryKey().defaultRandom(),
  incidentId: uuid('incident_id').references(() => incidents.id),
  merchantId: uuid('merchant_id').notNull().references(() => merchants.id),
  dimension: varchar('dimension', { length: 100 }).notNull(),
  dimensionValue: varchar('dimension_value', { length: 100 }).notNull(),
  windowStart: timestamp('window_start', { withTimezone: true }).notNull(),
  windowEnd: timestamp('window_end', { withTimezone: true }).notNull(),
  baselineValue: real('baseline_value').notNull(),
  observedValue: real('observed_value').notNull(),
  delta: real('delta').notNull(),
  relativeChange: real('relative_change').notNull(),
  transactionCount: integer('transaction_count').notNull(),
  affectedGmvMinor: bigint('affected_gmv_minor', { mode: 'number' }).notNull().default(0),
  severity: varchar('severity', { length: 20 }).notNull().default('medium'),
  confidence: real('confidence').notNull().default(0.9),
  detectionRule: varchar('detection_rule', { length: 100 }).notNull(),
  detectedAt: timestamp('detected_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_incident_signals_incident').on(table.incidentId),
  index('idx_incident_signals_merchant').on(table.merchantId),
]);
