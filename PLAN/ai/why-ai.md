# REVIVE — AI: Why AI?

## Where AI Is Required

### 1. Root Cause Reasoning
**Why AI**: Same failure code can have different root causes depending on context (customer history, time of day, bank patterns). Static rules can identify the failure code but cannot reason about the contextual cause.

**Example**: `BANK_TIMEOUT` for a repeat customer during peak hours vs. a new customer during off-hours → different root causes, different recovery strategies.

### 2. Contextual Evidence Synthesis
**Why AI**: The agent gathers multiple signals (payment history, customer behavior, failure patterns, similar cases) and synthesizes them into a coherent analysis. This requires natural language reasoning over structured data.

### 3. Failure Classification
**Why AI**: While simple failures map 1:1 to categories, complex failures require multi-feature classification considering the combination of error code, bank, payment method, customer profile, and temporal patterns.

### 4. Intervention Explanation
**Why AI**: Generating clear, contextual explanations for why a specific intervention was chosen for a specific case. Template-based explanations are generic; AI-generated explanations reference the specific evidence.

### 5. Complex Case Investigation
**Why AI**: When a case doesn't fit standard patterns, the agent can use tools to explore the case, gather additional evidence, and reason about novel failure modes.

### 6. Natural-Language Operator Interaction
**Why AI**: Revenue ops managers need to understand decisions in plain language, not rule IDs.

---

## Where Deterministic Systems Handle

| Function | Why NOT AI |
|----------|-----------|
| Money calculations | Financial precision, auditability |
| Policy enforcement | Compliance, safety, predictability |
| Authorization | Security, consistency |
| State transitions | Data integrity |
| Idempotency | Correctness |
| Execution safety | Bounded actions, stopping rules |
| Expected value | Mathematical formula, must be auditable |
| Recovery probability baseline | Statistical model, calibrated |

---

## The "Why Not Rules?" Demonstration

### Scenario: Same Failure Code, Different Optimal Actions

| Feature | Customer A | Customer B | Customer C | Customer D |
|---------|-----------|-----------|-----------|-----------|
| Failure | bank_timeout | bank_timeout | bank_timeout | bank_timeout |
| Amount | ₹2,499 | ₹24,999 | ₹999 | ₹75,000 |
| Customer Type | Repeat (50 orders) | Repeat (3 orders) | New (1st order) | VIP (200 orders) |
| Success Rate | 98% | 85% | N/A | 99% |
| Recent Failures | 0 in 90d | 2 in 30d | N/A | 0 in 180d |

### Static Rule: "Retry all bank_timeout failures"

| Customer | Rule Action | Outcome |
|----------|-------------|---------|
| A | Retry | ✅ Works — but customer usually retries themselves (wasted) |
| B | Retry | ⚠️ Risk — 2 recent failures suggest deeper issue |
| C | Retry | ❌ Poor — new customer, send payment link instead |
| D | Retry | ❌ Dangerous — high-value VIP, needs human touch |

### REVIVE Decision:

| Customer | REVIVE Action | Reasoning |
|----------|---------------|-----------|
| A | **No Action** | 98% success rate, will self-recover. Avoid unnecessary friction. |
| B | **Payment Link** | Recent failures suggest card/bank issue. Alternative path safer. |
| C | **Retry + Payment Link** | New customer, maximize conversion chance. |
| D | **Human Escalation** | High-value VIP. Personal touch protects relationship. |

**This demonstrates contextual intelligence that rules cannot replicate.**
