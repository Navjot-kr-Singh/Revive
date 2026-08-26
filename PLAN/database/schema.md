# REVIVE — Database Schema

## Migration Strategy

Using Drizzle ORM with `drizzle-kit` for migrations.

```bash
pnpm db:generate   # Generate migration from schema changes
pnpm db:migrate    # Apply pending migrations
pnpm db:push       # Push schema directly (dev only)
pnpm db:seed       # Run seed script
pnpm db:reset      # Drop all + re-migrate + re-seed
```

## Schema Files

```
src/server/db/
├── index.ts           # Database connection
├── schema/
│   ├── index.ts       # Re-exports all schemas
│   ├── users.ts       # users, merchants, merchant_members
│   ├── customers.ts   # customers
│   ├── orders.ts      # orders
│   ├── payments.ts    # payments, payment_events
│   ├── cases.ts       # revenue_cases, revenue_case_signals
│   ├── interventions.ts # intervention_options
│   ├── decisions.ts   # recovery_decisions, recovery_actions, recovery_outcomes
│   ├── policies.ts    # policies, policy_evaluations
│   ├── ai.ts          # ai_runs, model_versions
│   ├── audit.ts       # audit_events
│   ├── experiments.ts # experiments, experiment_assignments, experiment_results
│   ├── incidents.ts   # incidents
│   ├── notifications.ts # notifications
│   └── operations.ts  # simulation_runs, batch_runs
└── migrations/
    └── ... (auto-generated)
```

## Key Constraints

1. All monetary columns: `BIGINT` (stored as integer minor units)
2. All timestamps: `TIMESTAMPTZ` with `DEFAULT NOW()`
3. All IDs: `UUID` with `DEFAULT gen_random_uuid()`
4. `payment_events(source, source_event_id)`: UNIQUE for idempotency
5. `merchant_members(merchant_id, user_id)`: UNIQUE for membership
6. `model_versions(model_name, version)`: UNIQUE for versioning
7. `experiment_assignments(experiment_id, case_id)`: UNIQUE for assignment

See [04-data-model.md](file:///Users/navjotkumarsingh/Desktop/Revive/PLAN/04-data-model.md) for complete table definitions.
