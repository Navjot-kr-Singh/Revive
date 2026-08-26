import { pgTable, uuid, varchar, timestamp, bigint, real, boolean, text } from 'drizzle-orm/pg-core';
import { revenueCases } from './cases';

// ─── Intervention Options ──────────────────────────
export const interventionOptions = pgTable('intervention_options', {
  id: uuid('id').primaryKey().defaultRandom(),
  caseId: uuid('case_id').notNull().references(() => revenueCases.id),
  actionType: varchar('action_type', { length: 100 }).notNull(),
  recoveryProbability: real('recovery_probability').notNull(),
  expectedRecoveryMinor: bigint('expected_recovery_minor', { mode: 'number' }).notNull(),
  interventionCostMinor: bigint('intervention_cost_minor', { mode: 'number' }).notNull().default(0),
  expectedNetValueMinor: bigint('expected_net_value_minor', { mode: 'number' }).notNull(),
  customerFriction: real('customer_friction').notNull().default(0),
  riskScore: real('risk_score').notNull().default(0),
  confidence: real('confidence').notNull(),
  isSelected: boolean('is_selected').default(false),
  isPolicyApproved: boolean('is_policy_approved'),
  policyRejectionReason: varchar('policy_rejection_reason', { length: 255 }),
  reasoning: text('reasoning'),
  modelVersion: varchar('model_version', { length: 50 }),
  currency: varchar('currency', { length: 3 }).notNull().default('INR'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
