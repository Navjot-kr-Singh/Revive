import { pgTable, uuid, varchar, timestamp, bigint, real, integer, jsonb, text } from 'drizzle-orm/pg-core';
import { merchants } from './users';
import { revenueCases } from './cases';
import { interventionOptions } from './interventions';

// ─── Recovery Decisions ────────────────────────────
export const recoveryDecisions = pgTable('recovery_decisions', {
  id: uuid('id').primaryKey().defaultRandom(),
  caseId: uuid('case_id').notNull().references(() => revenueCases.id),
  merchantId: uuid('merchant_id').notNull().references(() => merchants.id),
  interventionOptionId: uuid('intervention_option_id').references(() => interventionOptions.id),
  actionType: varchar('action_type', { length: 100 }).notNull(),
  reason: text('reason').notNull(),
  inputSignals: jsonb('input_signals'),
  modelVersion: varchar('model_version', { length: 50 }),
  policyVersion: varchar('policy_version', { length: 50 }),
  confidence: real('confidence'),
  expectedRecoveryMinor: bigint('expected_recovery_minor', { mode: 'number' }),
  expectedCostMinor: bigint('expected_cost_minor', { mode: 'number' }),
  expectedCustomerFriction: real('expected_customer_friction'),
  decisionStatus: varchar('decision_status', { length: 50 }).notNull().default('pending'),
  decidedBy: varchar('decided_by', { length: 100 }),
  decidedAt: timestamp('decided_at', { withTimezone: true }),
  currency: varchar('currency', { length: 3 }).notNull().default('INR'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Recovery Actions ──────────────────────────────
export const recoveryActions = pgTable('recovery_actions', {
  id: uuid('id').primaryKey().defaultRandom(),
  caseId: uuid('case_id').notNull().references(() => revenueCases.id),
  decisionId: uuid('decision_id').notNull().references(() => recoveryDecisions.id),
  merchantId: uuid('merchant_id').notNull().references(() => merchants.id),
  actionType: varchar('action_type', { length: 100 }).notNull(),
  status: varchar('status', { length: 50 }).notNull().default('pending'),
  attemptNumber: integer('attempt_number').notNull().default(1),
  maxAttempts: integer('max_attempts').notNull().default(2),
  externalReferenceId: varchar('external_reference_id', { length: 255 }),
  requestPayload: jsonb('request_payload'),
  responsePayload: jsonb('response_payload'),
  errorMessage: text('error_message'),
  timeoutSeconds: integer('timeout_seconds').default(300),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Recovery Outcomes ─────────────────────────────
export const recoveryOutcomes = pgTable('recovery_outcomes', {
  id: uuid('id').primaryKey().defaultRandom(),
  caseId: uuid('case_id').notNull().references(() => revenueCases.id),
  actionId: uuid('action_id').notNull().references(() => recoveryActions.id),
  merchantId: uuid('merchant_id').notNull().references(() => merchants.id),
  outcomeType: varchar('outcome_type', { length: 50 }).notNull(),
  recoveredAmountMinor: bigint('recovered_amount_minor', { mode: 'number' }).notNull().default(0),
  currency: varchar('currency', { length: 3 }).notNull().default('INR'),
  verificationMethod: varchar('verification_method', { length: 100 }),
  verificationData: jsonb('verification_data'),
  timeToRecoverySeconds: integer('time_to_recovery_seconds'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
