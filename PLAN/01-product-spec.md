# REVIVE — Product Specification

## 1. Product Name

**REVIVE** — Revenue Intelligence & Verification Engine

## 2. Tagline

> "Recover revenue, not just payments."

## 3. Problem Statement

Merchants lose significant revenue to payment failures, checkout abandonment, and subscription lapses. Current solutions either:
- **Detect** failures but don't act on them
- **Act** without intelligence (blind retries)
- **Claim** recovery without proof

There is no system that:
1. Detects revenue at risk
2. Investigates root cause intelligently
3. Simulates multiple intervention strategies
4. Selects the economically optimal bounded action
5. Executes safely through policy gates
6. Measures actual money recovered
7. Proves the system's value through controlled experiments

## 4. Solution

REVIVE is an autonomous revenue recovery control plane that implements the full recovery loop:

```
OBSERVE → UNDERSTAND → SIMULATE → DECIDE → GATE → ACT → MEASURE → LEARN
```

## 5. Target Users

### Primary: Merchant / Revenue Operations Manager
- Needs to understand revenue health at a glance
- Wants autonomous recovery with safety guarantees
- Requires auditability for compliance

### Secondary: Finance / Payment Operations Analyst
- Deep-dives into specific cases
- Analyzes patterns across failure types
- Evaluates system performance

## 6. User Capabilities

| # | Capability | Priority |
|---|-----------|----------|
| 1 | Sign in | P0 |
| 2 | Select merchant | P0 |
| 3 | View revenue health | P0 |
| 4 | View revenue at risk | P0 |
| 5 | View recovery cases | P0 |
| 6 | Inspect a case | P0 |
| 7 | See AI investigation | P1 |
| 8 | Compare intervention options | P1 |
| 9 | See policy decision | P1 |
| 10 | Approve/reject manual cases | P1 |
| 11 | Trigger a simulation | P1 |
| 12 | Run a batch evaluation | P2 |
| 13 | Inspect recovered revenue | P0 |
| 14 | Inspect audit logs | P1 |

## 7. Revenue Sources (MVP)

### Must Have
1. **Payment failures** — Bank declines, timeouts, insufficient funds
2. **Checkout abandonment** — Customer started but didn't complete
3. **Subscription/payment retry** — Recurring payment failures

### Future (Architecture-ready)
4. B2B receivables
5. Mandate failures
6. Invoice recovery

## 8. Key Product Principles

### 8.1 LLM is NOT the source of truth
```
LLM recommendation → deterministic validation → policy engine → risk gate → action executor → outcome verification
```

### 8.2 Every financial action is bounded
- `MAX_RETRY_ATTEMPTS = 2`
- `MAX_CUSTOMER_CONTACTS = 2`
- `MAX_DISCOUNT_PERCENT = 5`
- `MAX_AUTOMATED_RECOVERY_AMOUNT = configurable`
- `HIGH_VALUE_THRESHOLD = configurable`
- `LOW_CONFIDENCE_THRESHOLD = configurable`

### 8.3 Every decision is auditable
Full audit record for every decision with 16+ fields.

### 8.4 Never fabricate financial results
Dashboard clearly labels: **SIMULATED** | **EXPECTED** | **ACTUAL**

## 9. Key Differentiator: Counterfactual Recovery Simulator

For every revenue case, calculate multiple possible interventions with:
- Recovery probability
- Expected recovered amount
- Intervention cost
- Customer friction
- Risk
- Confidence

Then select and explain the best bounded action.

## 10. Control Group / Experimental Evaluation

- 50,000+ synthetic failed-revenue events
- 25,000 baseline (no intervention)
- 25,000 REVIVE (AI-driven intervention)
- Reproducible with deterministic seeds

## 11. Non-Functional Requirements

| Requirement | Target |
|------------|--------|
| Dashboard load time | < 2.5s |
| API response time | < 500ms |
| Decision calculation (excl. LLM) | < 300ms |
| Event ingestion | Idempotent, async |
| Batch evaluation | Background workflow |
| Multi-tenancy | Full merchant isolation |
| Auth | Clerk-managed |
| Data integrity | No float for money |
