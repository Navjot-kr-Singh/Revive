# REVIVE — Final Security & Financial Safety Audit (25-Point Check)

**Audit Status**: **ALL 25 GATES PASS** | **Zero Vulnerabilities / Zero Policy Bypasses**

---

## 1. 25-Point Hostile Security Verification Table

| # | Security / Safety Invariant | Implementation Mechanism | Test / Verification Reference | Audit Result |
|---|---|---|---|---|
| **1** | AI cannot execute financial actions | AI provider returns structured JSON; has 0 DB write credentials & 0 gateway keys | `src/ai/provider.ts` | **PASS** |
| **2** | AI output cannot bypass policy | Output passes through deterministic TypeScript `PolicyEvaluator` before execution | `src/server/services/policy/policy-evaluator.ts` | **PASS** |
| **3** | Policy cannot be skipped | `ActionExecutor` requires `decision.decisionStatus === 'approved'` from DB | `src/server/services/recovery/action-executor.ts` | **PASS** |
| **4** | `APPROVED` required before `EXECUTING` | FSM validates state transition `PROPOSED` $\to$ `POLICY_PENDING` $\to$ `APPROVED` | `src/server/services/recovery/state-machine.ts` | **PASS** |
| **5** | `EXECUTING` cannot be claimed by 2 workers | Atomic SQL `UPDATE WHERE id = :id AND status = 'approved'` row-level lock | `tests/unit/concurrency.test.ts` | **PASS** |
| **6** | Duplicate execution cannot mutate money | Level-1 unique index on `(merchant_id, external_reference_id)` + Level-2 gateway key | `tests/unit/idempotent-execution.test.ts` | **PASS** |
| **7** | Provider idempotency key is deterministic | Deterministically derived from `merchantId`, `caseId`, and `actionType` | `src/server/services/recovery/action-executor.ts` | **PASS** |
| **8** | `UNKNOWN` never triggers blind retry | FSM strictly forbids direct retry transition from `UNKNOWN` | `src/server/services/recovery/state-machine.ts` | **PASS** |
| **9** | `UNKNOWN` enters reconciliation | Background reconciler polls gateway reference to confirm external state | `tests/unit/reconciliation.test.ts` | **PASS** |
| **10**| Policy is revalidated before dispatch | Pre-execution check evaluates live policy against decision's recorded SHA-256 hash | `src/server/services/recovery/action-executor.ts` | **PASS** |
| **11**| Policy mutation blocks stale decisions | Blocks execution with `policy_changed_since_decision` if policy changed | `tests/unit/policy-mutation.test.ts` | **PASS** |
| **12**| Tenant ID enforced on all sensitive queries | Composite queries enforce `(merchant_id = :authMerchantId, id = :id)` | `tests/unit/tenant-isolation.test.ts` | **PASS** |
| **13**| Case ownership is verified | `/api/cases/[id]` checks `merchantId` against authenticated session | `src/app/api/cases/[id]/route.ts` | **PASS** |
| **14**| Action ownership is verified | `/api/actions/[id]` verifies composite tenant foreign key | `src/app/api/actions/[id]/route.ts` | **PASS** |
| **15**| Review queue cannot cross tenants | `/api/reviews` filters strictly by merchant context | `tests/unit/cross-tenant-recovery.test.ts` | **PASS** |
| **16**| Negative EV cannot execute | Policy Rule 5 `MIN_EXPECTED_VALUE` strictly rejects candidates where $EV \le 0$ | `tests/unit/policy-engine.test.ts` | **PASS** |
| **17**| Exceeded budget cannot execute | Policy Rule 12 `DAILY_RECOVERY_BUDGET` stops execution if spend cap reached | `src/server/services/policy/policy-rules.ts` | **PASS** |
| **18**| Exceeded retry limit cannot execute | Policy Rule 1 `MAX_RETRY_COUNT` enforces retry ceiling ($\le 2$) | `tests/unit/policy-engine.test.ts` | **PASS** |
| **19**| Exceeded contact limit cannot execute | Policy Rule 2 `MAX_CUSTOMER_CONTACTS` enforces $\le 1$ message per incident | `src/server/services/policy/policy-rules.ts` | **PASS** |
| **20**| High-value actions escalate correctly | Policy Rule 7 `HIGH_VALUE_ESCALATION` routes orders $> ₹50,000$ to Human Review | `tests/unit/human-review.test.ts` | **PASS** |
| **21**| Low-confidence diagnosis escalates | Policy Rule 8 `LOW_CONFIDENCE_ESCALATION` escalates when confidence $< 85\%$ | `src/server/services/policy/policy-rules.ts` | **PASS** |
| **22**| Critical broken rail receives no retry | Policy Rule 9 `INCIDENT_SEVERITY_LIMIT` bans same-rail retry during active outage | `tests/unit/policy-engine.test.ts` | **PASS** |
| **23**| Malformed inputs fail closed | Zod schemas validate all event payloads; invalid JSON returns HTTP 400 | `src/server/services/event-ingestion.ts` | **PASS** |
| **24**| Prompt injection treated as untrusted | Adversarial prompt text cannot alter TypeScript policy rules or mutate DB | `tests/unit/ai-prompt-injection.test.ts` | **PASS** |
| **25**| Recovery requires settlement proof | Webhook signature (`payment.captured`) verified cryptographically before `RECOVERED` | `tests/unit/recovery-outcome.test.ts` | **PASS** |
