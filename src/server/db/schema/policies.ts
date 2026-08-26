import { pgTable, uuid, varchar, timestamp, bigint, integer, real, boolean, jsonb } from 'drizzle-orm/pg-core';
import { merchants } from './users';

// ─── Policies ──────────────────────────────────────
export const policies = pgTable('policies', {
  id: uuid('id').primaryKey().defaultRandom(),
  merchantId: uuid('merchant_id').notNull().references(() => merchants.id),
  policyVersion: varchar('policy_version', { length: 50 }).notNull(),
  rules: jsonb('rules').notNull(),
  maxRetryAttempts: integer('max_retry_attempts').notNull().default(2),
  maxCustomerContacts: integer('max_customer_contacts').notNull().default(2),
  maxDiscountPercent: integer('max_discount_percent').notNull().default(5),
  maxAutomatedRecoveryMinor: bigint('max_automated_recovery_minor', { mode: 'number' }).notNull().default(10000000),
  highValueThresholdMinor: bigint('high_value_threshold_minor', { mode: 'number' }).notNull().default(5000000),
  minRecoveryProbability: real('min_recovery_probability').notNull().default(0.1),
  minConfidence: real('min_confidence').notNull().default(0.3),
  allowedActions: jsonb('allowed_actions').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
