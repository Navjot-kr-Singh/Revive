# REVIVE — Policy Engine Architecture & Specification

## 1. Core Principle
> **AI RECOMMENDS. POLICY DECIDES. EXECUTOR ACTS. MEASUREMENT PROVES.**
>
> The AI/LLM must NEVER directly execute any financial mutation, retry, routing change, or payment link generation. All candidate interventions must pass through the deterministic Policy Engine before execution.

---

## 2. The 12 Deterministic Policy Rules
Every rule evaluates independently and produces a structured result containing pass/fail, threshold, actual value, and explanation.

| Rule Name | Scope / Target | Action |
|---|---|---|
| `MAX_RETRY_COUNT` | Direct Retries | Caps retry budget to prevent customer card blocking (e.g. max 2 retries) |
| `MAX_CUSTOMER_CONTACTS` | Links & Notifications | Limits outward notifications to avoid customer fatigue (e.g. max 1 contact) |
| `MAX_ACTION_AMOUNT` | Automated Interventions | Caps maximum monetary value for automated recovery (e.g. ₹50,000) |
| `MIN_RECOVERY_PROBABILITY` | Statistical Viability | Ensures action satisfies statistical recovery floor (e.g. $\ge 15\%$) |
| `MIN_EXPECTED_VALUE` | Economic Viability | Enforces positive net expected return ($EV > 0$) |
| `MAX_CUSTOMER_FRICTION` | Customer Experience | Caps allowable customer friction (e.g. `MEDIUM`) |
| `HIGH_VALUE_ESCALATION` | High-Value Transactions | Escalates transactions $> ₹50,000$ to human review queue |
| `LOW_CONFIDENCE_ESCALATION` | Diagnostic Safety | Escalates when AI root cause confidence is below safety threshold (e.g. $< 85\%$) |
| `INCIDENT_SEVERITY_LIMIT` | Systemic Outages | Prohibits retrying degraded rails during active `CRITICAL` outages |
| `ACTION_COOLDOWN` | Temporal Throttling | Enforces minimum wait between attempts (e.g. $\ge 60$ seconds) |
| `MERCHANT_ACTION_ALLOWLIST` | Merchant Governance | Restricts actions to merchant-enabled allowlists |
| `DAILY_RECOVERY_BUDGET` | Portfolio Limits | Caps cumulative daily automated recovery amount |

---

## 3. Policy Output & Cryptographic Hashing
The Policy Evaluator produces:
- `ALLOW`: Permitted to execute.
- `DENY`: Hard constraint violation; engine evaluates next-best candidate.
- `ESCALATE`: Requires human clearance in `/dashboard/review`.

Each merchant policy is versioned (`POLICY-DEFAULT-V1`, `POLICY-ENTERPRISE-V2`) and hashed using SHA-256 over its canonical JSON representation.

---

## 4. Pre-Execution Policy Mutation Defense
Immediately prior to execution in `ActionExecutor.executeDecision()`, the executor re-evaluates the merchant's live policy. If policy settings changed between decision creation and execution, execution is **BLOCKED** with reason `policy_changed_since_decision` and recorded in the audit trail.
