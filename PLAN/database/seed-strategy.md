# REVIVE — Seed Strategy

## Overview

The seed system creates deterministic demo data for development and presentation.

## Seed Command

```bash
pnpm db:seed               # Full seed with default config
pnpm db:seed --seed=20260826  # Specific seed for reproducibility
pnpm db:seed --count=50000    # Generate 50k transactions
```

## Seed Order (Respecting Foreign Keys)

1. Merchants (Acme Electronics + 2 others)
2. Users (demo user)
3. Merchant Members (link user to merchants)
4. Customers (1,000+ per merchant)
5. Policies (default policy per merchant)
6. Orders (from synthetic generator)
7. Payments (from synthetic generator)
8. Payment Events (from synthetic generator)
9. Revenue Cases (auto-created from failed payments)
10. Model Versions (v1.0 recovery model)

## Demo Merchant: Acme Electronics

- Name: "Acme Electronics"
- Category: "electronics"
- Normal success rate: 96%
- Daily volume: ~₹50L
- Customer mix: 60% repeat, 40% new

## Synthetic Data Generator Requirements

See [PLAN/evaluation/datasets.md](file:///Users/navjotkumarsingh/Desktop/Revive/PLAN/evaluation/datasets.md)

## Deterministic Seeding

- `SEED=20260826` → same dataset every time
- Uses seeded PRNG (e.g., `seedrandom`)
- Allows reproducible demo scenarios
- Allows reproducible evaluation benchmarks

## Demo Reset

`POST /api/demo/reset`:
1. Delete all non-system data for demo merchant
2. Re-run seed with default seed
3. Return ready state
