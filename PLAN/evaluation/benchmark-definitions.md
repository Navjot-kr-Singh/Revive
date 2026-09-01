# REVIVE — Formal Benchmark Definitions & Taxonomy

## 1. Important Disclaimers & Scoping Principle
> **All benchmark measurements in the REVIVE evaluation suite are deterministic synthetic evaluations or local test-mode provider executions unless explicitly identified as live external integrations.**

---

## 2. Benchmark Categories & Definitions

### A. In-Memory Streaming Benchmark
- **Scope**: CPU-bound memory generation, sliding-window temporal aggregation, and multi-threshold anomaly detection.
- **Measured Result**: **4,546,108 events/second** (1,000,000 transactions / 4,946,165 events in memory).
- **Subsystem**: `src/server/services/incident/aggregation-engine.ts`.
- **Note**: Does *not* include disk I/O or network serialization overhead.

### B. Database-Backed Benchmark
- **Scope**: Transactional persistence, row locking, foreign key integrity, and prepared query execution on PostgreSQL.
- **Measured Result**: **1,250 events/sec** batch insert throughput, **5.190 ms (p50)** decision transaction latency.
- **Subsystem**: `src/server/db/` via Drizzle ORM.

### C. Pure Computational Decision Benchmark
- **Scope**: CPU evaluation of 6 counterfactual recovery candidates against 12 deterministic merchant policy rules.
- **Measured Result**: **0.034 ms (p50) / 0.080 ms (p99)**.
- **Subsystem**: `src/server/services/recovery/simulator.ts` & `src/server/services/policy/policy-evaluator.ts`.

### D. Holdout Probability Calibration Benchmark
- **Scope**: Reliability diagram and Brier score evaluation on an independent validation set ($N = 5,000$) generated with distinct cryptographic seeds to guarantee zero data leakage.
- **Measured Result**: **Brier: 0.1244**, **ECE: 0.56%**, **MCE: 1.02%**.
- **Subsystem**: `src/server/services/recovery/recovery-model.ts`.

### E. 100,000-Case Economic Recovery Benchmark
- **Scope**: End-to-end evaluation comparing Control Baseline (Single Retry) against REVIVE across 15 failure categories ($₹1,482.5\text{ Cr}$ GMV evaluated).
- **Measured Result**: **+11.0 percentage points** recovery rate uplift (21.2% vs 10.2%), **+107.8% relative net revenue lift** (+₹16.31 Cr net value).
- **Subsystem**: `scripts/evaluate-100k-recovery.ts`.

### F. Test-Mode Provider Execution & Reconciliation
- **Scope**: Dispatching idempotent recovery actions against Razorpay Test Mode and simulated TCP connection drop hooks to verify state transition to `UNKNOWN` and background reconciliation.
- **Measured Result**: **100% fail-closed recovery**, **0 duplicate charges**.
- **Subsystem**: `src/server/services/recovery/adapters/`.
