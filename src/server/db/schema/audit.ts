import { pgTable, uuid, varchar, timestamp, jsonb } from 'drizzle-orm/pg-core';

// ─── Audit Events (Append-Only) ────────────────────
// NO UPDATE or DELETE operations allowed on this table.
export const auditEvents = pgTable('audit_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  merchantId: uuid('merchant_id').notNull(),
  entityType: varchar('entity_type', { length: 100 }).notNull(),
  entityId: uuid('entity_id').notNull(),
  eventType: varchar('event_type', { length: 100 }).notNull(),
  actor: varchar('actor', { length: 255 }),
  data: jsonb('data'),
  correlationId: varchar('correlation_id', { length: 255 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
