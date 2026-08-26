import { pgTable, uuid, varchar, timestamp, integer, real, text, jsonb, boolean, index } from 'drizzle-orm/pg-core';
import { merchants } from './users';
import { incidents } from './incidents';

// ─── Investigations ────────────────────────────────
export const investigations = pgTable('investigations', {
  id: uuid('id').primaryKey().defaultRandom(),
  incidentId: uuid('incident_id').notNull().references(() => incidents.id),
  merchantId: uuid('merchant_id').notNull().references(() => merchants.id),
  status: varchar('status', { length: 50 }).notNull().default('pending'), // 'pending' | 'collecting_evidence' | 'analyzing' | 'hypothesis_generated' | 'diagnosed' | 'recommendations_ready' | 'human_review' | 'failed'
  primaryDiagnosis: varchar('primary_diagnosis', { length: 100 }),
  confidence: real('confidence'),
  severity: varchar('severity', { length: 20 }),
  rootCauseExplanation: text('root_cause_explanation'),
  uncertaintyNotes: text('uncertainty_notes'),
  supportingEvidenceIds: jsonb('supporting_evidence_ids').$type<string[]>(),
  contradictingEvidenceIds: jsonb('contradicting_evidence_ids').$type<string[]>(),
  missingEvidence: jsonb('missing_evidence').$type<string[]>(),
  recommendedActions: jsonb('recommended_actions'),
  evidenceSnapshot: jsonb('evidence_snapshot'),
  hypothesesSnapshot: jsonb('hypotheses_snapshot'),
  timeline: jsonb('timeline'),
  modelVersion: varchar('model_version', { length: 50 }),
  promptVersion: varchar('prompt_version', { length: 50 }),
  isFallback: boolean('is_fallback').notNull().default(false),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_investigations_incident').on(table.incidentId),
  index('idx_investigations_merchant_status').on(table.merchantId, table.status),
]);

// ─── AI Runs (Immutable AI Execution Audit Ledger) ───
export const aiRuns = pgTable('ai_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  investigationId: uuid('investigation_id').references(() => investigations.id),
  incidentId: uuid('incident_id').references(() => incidents.id),
  merchantId: uuid('merchant_id').notNull().references(() => merchants.id),
  runType: varchar('run_type', { length: 50 }).notNull(), // 'root_cause' | 'hypothesis' | 'recommendation' | 'evaluation'
  provider: varchar('provider', { length: 50 }).notNull(), // 'google_gemini' | 'openai' | 'deterministic_fallback' | 'mock'
  model: varchar('model', { length: 100 }),
  modelVersion: varchar('model_version', { length: 50 }),
  promptId: varchar('prompt_id', { length: 100 }).notNull(),
  promptVersion: varchar('prompt_version', { length: 50 }).notNull(),
  inputData: jsonb('input_data'),
  outputData: jsonb('output_data'),
  inputHash: varchar('input_hash', { length: 64 }),
  outputHash: varchar('output_hash', { length: 64 }),
  tokenUsage: jsonb('token_usage'),
  latencyMs: integer('latency_ms'),
  status: varchar('status', { length: 50 }).notNull().default('success'), // 'success' | 'failed' | 'fallback' | 'timeout'
  error: text('error'),
  confidence: real('confidence'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_ai_runs_investigation').on(table.investigationId),
  index('idx_ai_runs_merchant_type').on(table.merchantId, table.runType),
  index('idx_ai_runs_created_at').on(table.createdAt),
]);
