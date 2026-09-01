# REVIVE — Day 4 Execution Plan: Autonomous Recovery Decision + Policy Engine + Safe Execution

## 1. Existing Architecture Discovered & Reusable Components
1. **Multi-Tenant Foundation & Database Schema**:
   - `merchants`, `users`, `policies`, `revenue_cases`, `incidents`, `investigations`, `ai_runs`, `audit_events`.
   - `recovery_decisions`, `recovery_actions`, `recovery_outcomes`, `intervention_options` schema structures ready to be utilized and extended.
2. **Investigation & Evidence Engine (Phase 3)**:
   - Zero-hallucination evidence retrieval (`EvidenceCollector`).
   - Hypothesis scoring engine (`HypothesisEngine`).
   - Strict Zod schemas and AI provider abstraction (`GeminiProvider`, `DeterministicFallbackProvider`).
3. **Idempotent Ingestion & Case Lifecycle (Phase 1 & 2)**:
   - Idempotent transaction processing with SHA-256 deduplication.
   - Sliding window telemetry aggregator & anomaly detector.
   - Money utilities (`src/lib/money.ts`) with minor-unit integer precision.

---

## 2. Required Schema Updates & Additions
- Extend `src/server/db/schema/decisions.ts` and `src/server/db/schema/policies.ts` if needed with:
  - Basis point probability (`probabilityBps: integer`).
  - Expected net value (`expectedNetValueMinor: bigint`).
  - Friction and risk penalties in minor units.
  - Policy hash (`policyHash: varchar(64)`).
  - Idempotency key unique constraints on `recovery_actions`.
  - Reconciling / Unknown status fields on `recovery_actions`.

---

## 3. Required Services & Directory Structure
```
src/server/services/
├── policy/
│   ├── policy-context.ts       # Context object for evaluation
│   ├── policy-rules.ts         # 12 deterministic independent rule evaluators
│   ├── policy-evaluator.ts     # ALLOW / DENY / ESCALATE deterministic evaluator
│   └── policy-engine.ts        # Policy CRUD, versioning, hash, audit trail
└── recovery/
    ├── recovery-model.ts       # Calibrated conditional recovery probability model (bps)
    ├── simulator.ts            # Counterfactual simulation of candidate interventions
    ├── decision-engine.ts      # EV ranking, policy gating, 6-question explanations
    ├── action-executor.ts      # Atomic execution, row locking, policy revalidation
    ├── outcome-service.ts      # Outcome observation, expected vs actual variance
    └── adapters/
        ├── retry-payment.adapter.ts
        ├── payment-link.adapter.ts
        ├── alternative-payment.adapter.ts
        ├── customer-notification.adapter.ts
        └── human-escalation.adapter.ts
```

---

## 4. Required REST APIs
- `POST /api/cases/:id/simulate`
- `GET /api/cases/:id/simulation`
- `POST /api/cases/:id/decide`
- `GET /api/cases/:id/decision`
- `POST /api/cases/:id/execute`
- `GET /api/cases/:id/actions`
- `GET /api/actions/:id`
- `POST /api/actions/:id/cancel`
- `GET /api/cases/:id/outcomes`
- `GET /api/cases/:id/policy-evaluations`
- `GET /api/reviews` & `POST /api/reviews/:id/action`

---

## 5. Required UI Enhancements
- `/dashboard/cases/[id]` → **Recovery Decision Center** (Counterfactual options comparison, EV breakdown, policy evaluation, 6-question explanation, execution tracker, outcome variance).
- `/dashboard/review` → **Human Review Queue** (Escalated case review, Approve, Reject, Modify, Escalate actions with audit logs).

---

## 6. Safety, Concurrency & Idempotency Strategies
1. **Level 1 (Internal Idempotency)**:
   - Database unique constraint on `(merchant_id, idempotency_key)` and transactional row locking.
2. **Level 2 (External Idempotency)**:
   - External reference IDs generated deterministically and forwarded to payment adapters.
3. **Concurrency Control**:
   - Atomic state claiming (`APPROVED` $\to$ `EXECUTING`) via transactional DB updates. 100 concurrent requests result in exactly 1 execution.
4. **Policy Mutation Revalidation**:
   - Immediately prior to execution, re-evaluates the merchant's live policy. If policy changed since decision, execution is BLOCKED and audited.
5. **Distributed Network Drop Reconciliation**:
   - Actions transition to `UNKNOWN` $\to$ `RECONCILING` on network drops, polling the adapter for external status without blind duplicate retries.

---

## 7. 10k-Case Benchmark & Hero Demo Strategy
- `scripts/evaluate-recovery.ts`: Evaluates 10,000 deterministic cases comparing **Control Baseline (Single Retry)** vs **REVIVE (Contextual + Simulation + Policy)**.
- `scripts/demo-recovery.ts`: Hero adversarial demo demonstrating ₹24,999 case, HDFC UPI degradation, Alt Rail highest EV ₹9,500 denied by policy, Payment Link ₹5,250 approved, executed, network drop simulated $\to$ UNKNOWN $\to$ reconciliation confirms $\to$ ₹24,999 recovered.

---

## 8. Phase 4 Acceptance Gates
- [ ] Diagnosis taxonomy includes `BANK_PAYMENT_METHOD_DEGRADATION`.
- [ ] Integer minor unit financial arithmetic & basis point probabilities.
- [ ] Deterministic policy engine with 12 rules and versioned hashes.
- [ ] Counterfactual simulator computing integer minor-unit EV.
- [ ] Decision engine selecting highest permitted EV with 6-question explanations.
- [ ] Action executor with 2-level idempotency, concurrency row locking, and policy revalidation.
- [ ] Adapter pattern with reconciliation support (`UNKNOWN` $\to$ `RECONCILING` $\to$ `SUCCEEDED`).
- [ ] Outcome observation tracking expected vs actual recovery and variance.
- [ ] Human review queue (`/dashboard/review`).
- [ ] 10k-case benchmark with 0 unsafe financial actions, 0 policy bypasses, 0 duplicate executions, 0 cross-tenant actions, 0 AI direct executions.
- [ ] All previous Phase 1–3 tests pass (100% pass rate).
- [ ] TypeScript clean, ESLint clean.
