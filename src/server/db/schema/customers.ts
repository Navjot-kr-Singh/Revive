import { pgTable, uuid, varchar, timestamp, integer, bigint } from 'drizzle-orm/pg-core';
import { merchants } from './users';

// ─── Customers ─────────────────────────────────────
export const customers = pgTable('customers', {
  id: uuid('id').primaryKey().defaultRandom(),
  merchantId: uuid('merchant_id').notNull().references(() => merchants.id),
  externalId: varchar('external_id', { length: 255 }),
  emailHash: varchar('email_hash', { length: 255 }),
  displayId: varchar('display_id', { length: 50 }).notNull(),
  segment: varchar('segment', { length: 100 }),
  totalOrders: integer('total_orders').default(0),
  totalSuccessPayments: integer('total_success_payments').default(0),
  totalFailedPayments: integer('total_failed_payments').default(0),
  lifetimeValueMinor: bigint('lifetime_value_minor', { mode: 'number' }).default(0),
  currency: varchar('currency', { length: 3 }).default('INR'),
  firstSeenAt: timestamp('first_seen_at', { withTimezone: true }),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
