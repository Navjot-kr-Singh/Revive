import { pgTable, uuid, varchar, timestamp, bigint, integer, boolean, jsonb, unique } from 'drizzle-orm/pg-core';
import { merchants } from './users';
import { orders } from './orders';
import { customers } from './customers';

// ─── Payments ──────────────────────────────────────
export const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  merchantId: uuid('merchant_id').notNull().references(() => merchants.id),
  orderId: uuid('order_id').notNull().references(() => orders.id),
  customerId: uuid('customer_id').notNull().references(() => customers.id),
  externalPaymentId: varchar('external_payment_id', { length: 255 }),
  amountMinor: bigint('amount_minor', { mode: 'number' }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('INR'),
  status: varchar('status', { length: 50 }).notNull().default('created'),
  paymentMethod: varchar('payment_method', { length: 50 }),
  bank: varchar('bank', { length: 100 }),
  failureReason: varchar('failure_reason', { length: 255 }),
  failureCode: varchar('failure_code', { length: 100 }),
  attemptCount: integer('attempt_count').notNull().default(1),
  isRecurring: boolean('is_recurring').default(false),
  authorizedAt: timestamp('authorized_at', { withTimezone: true }),
  capturedAt: timestamp('captured_at', { withTimezone: true }),
  failedAt: timestamp('failed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Payment Events (Append-Only) ──────────────────
export const paymentEvents = pgTable('payment_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  merchantId: uuid('merchant_id').notNull().references(() => merchants.id),
  paymentId: uuid('payment_id').references(() => payments.id),
  eventType: varchar('event_type', { length: 100 }).notNull(),
  eventId: varchar('event_id', { length: 255 }).notNull(),
  source: varchar('source', { length: 100 }).notNull(),
  sourceEventId: varchar('source_event_id', { length: 255 }),
  payload: jsonb('payload').notNull(),
  payloadHash: varchar('payload_hash', { length: 64 }),
  processingStatus: varchar('processing_status', { length: 50 }).notNull().default('pending'),
  processedAt: timestamp('processed_at', { withTimezone: true }),
  receivedAt: timestamp('received_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique('uq_payment_events_source_event').on(table.source, table.sourceEventId),
]);
