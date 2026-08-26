import { pgTable, uuid, varchar, timestamp, bigint, integer, boolean, real, jsonb, index } from 'drizzle-orm/pg-core';
import { merchants } from './users';
import { payments } from './payments';
import { customers } from './customers';
import { orders } from './orders';

// ─── Revenue Cases ─────────────────────────────────
export const revenueCases = pgTable('revenue_cases', {
  id: uuid('id').primaryKey().defaultRandom(),
  merchantId: uuid('merchant_id').notNull().references(() => merchants.id),
  paymentId: uuid('payment_id').references(() => payments.id),
  customerId: uuid('customer_id').references(() => customers.id),
  orderId: uuid('order_id').references(() => orders.id),
  caseType: varchar('case_type', { length: 50 }).notNull(),
  status: varchar('status', { length: 50 }).notNull().default('new'),
  priority: varchar('priority', { length: 20 }).default('medium'),
  amountAtRiskMinor: bigint('amount_at_risk_minor', { mode: 'number' }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('INR'),
  failureReason: varchar('failure_reason', { length: 255 }),
  failureCode: varchar('failure_code', { length: 100 }),
  rootCause: varchar('root_cause', { length: 255 }),
  rootCauseConfidence: real('root_cause_confidence'),
  recoveryProbability: real('recovery_probability'),
  modelVersion: varchar('model_version', { length: 50 }),
  selectedIntervention: varchar('selected_intervention', { length: 100 }),
  expectedRecoveryMinor: bigint('expected_recovery_minor', { mode: 'number' }),
  actualRecoveryMinor: bigint('actual_recovery_minor', { mode: 'number' }).default(0),
  interventionCostMinor: bigint('intervention_cost_minor', { mode: 'number' }).default(0),
  netRecoveryMinor: bigint('net_recovery_minor', { mode: 'number' }).default(0),
  retryCount: integer('retry_count').default(0),
  customerContacts: integer('customer_contacts').default(0),
  escalated: boolean('escalated').default(false),
  escalationReason: varchar('escalation_reason', { length: 255 }),
  experimentId: uuid('experiment_id'),
  experimentGroup: varchar('experiment_group', { length: 20 }),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_revenue_cases_merchant_status').on(table.merchantId, table.status),
  index('idx_revenue_cases_payment').on(table.paymentId),
]);

// ─── Revenue Case Signals ──────────────────────────
export const revenueCaseSignals = pgTable('revenue_case_signals', {
  id: uuid('id').primaryKey().defaultRandom(),
  caseId: uuid('case_id').notNull().references(() => revenueCases.id),
  signalType: varchar('signal_type', { length: 100 }).notNull(),
  signalData: jsonb('signal_data').notNull(),
  source: varchar('source', { length: 100 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
