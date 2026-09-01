# REVIVE — Adversarial Testing & Failure Injection Matrix

## 1. Core Principle: Fail Closed
> Under any unexpected state, network drop, missing data, malformed AI response, or unauthorized request, REVIVE **FAILS CLOSED**. It never initiates blind retries, never moves money without approval, and never trusts external or AI inputs as authority.

---

## 2. 30 Adversarial Test Vectors & Verification Matrix

| Vector ID | Adversarial Threat / Failure Mode | System Defense & Invariant | Verification Status |
|---|---|---|---|
| **V-01** | Cross-tenant case decision attempt | Database query enforces `merchant_id`; throws Unauthorized | **PASSED** |
| **V-02** | Cross-tenant action execution attempt | Action claim query requires `merchant_id` match; throws Unauthorized | **PASSED** |
| **V-03** | Mid-flight policy hash mutation | Re-evaluates live policy before dispatch; blocks execution if denied | **PASSED** |
| **V-04** | Exceeded retry attempt budget | Deterministic rule `MAX_RETRY_COUNT` enforces hard `DENY` | **PASSED** |
| **V-05** | Exceeded customer contact budget | Deterministic rule `MAX_CUSTOMER_CONTACTS` enforces hard `DENY` | **PASSED** |
| **V-06** | Negative Expected Net Value ($EV \le 0$) | Deterministic rule `MIN_EXPECTED_VALUE` enforces hard `DENY` | **PASSED** |
| **V-07** | Sub-floor recovery probability ($< 15\%$) | Deterministic rule `MIN_RECOVERY_PROBABILITY` enforces hard `DENY` | **PASSED** |
| **V-08** | High-value transaction ($> ₹50,000$) | Rule `HIGH_VALUE_ESCALATION` escalates to `/dashboard/review` | **PASSED** |
| **V-09** | Broken rail retry during CRITICAL outage | Rule `INCIDENT_SEVERITY_LIMIT` enforces hard `DENY` | **PASSED** |
| **V-10** | Merchant disabled action type | Rule `MERCHANT_ACTION_ALLOWLIST` enforces hard `DENY` | **PASSED** |
| **V-11** | Malformed adapter execution context | Adapter validation layer rejects request before network dispatch | **PASSED** |
| **V-12** | Provider TCP reset / timeout | Transitions to `UNKNOWN`; invokes background reconciler | **PASSED** |
| **V-13** | AI hallucinated evidence citation | Evidence bag validator strips ungrounded citations | **PASSED** |
| **V-14** | Sparse / contradictory telemetry | Hypothesis engine safely defaults to `UNKNOWN_ROOT_CAUSE` | **PASSED** |
| **V-15** | All candidate actions denied by policy | Decision engine falls back safely to `NO_ACTION` / Escalation | **PASSED** |
| **V-16..30**| Boundary values (₹0 ticket, ₹10 Cr ticket, etc.) | Minor-unit integer precision handles all extrema safely | **PASSED** |
