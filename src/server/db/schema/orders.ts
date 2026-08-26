import { pgTable, uuid, varchar, timestamp, bigint, jsonb } from 'drizzle-orm/pg-core';
import { merchants } from './users';
import { customers } from './customers';

// ─── Orders ────────────────────────────────────────
export const orders = pgTable('orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  merchantId: uuid('merchant_id').notNull().references(() => merchants.id),
  customerId: uuid('customer_id').notNull().references(() => customers.id),
  externalOrderId: varchar('external_order_id', { length: 255 }),
  amountMinor: bigint('amount_minor', { mode: 'number' }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('INR'),
  status: varchar('status', { length: 50 }).notNull().default('created'),
  paymentMethod: varchar('payment_method', { length: 50 }),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
