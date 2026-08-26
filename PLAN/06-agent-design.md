# REVIVE — Agent Design

## 1. Agent Architecture

The REVIVE Recovery Agent is a **tool-using AI agent** with structured inputs, bounded execution, and deterministic guardrails.

### Core Principle
The agent **recommends** actions. It does **not** execute financial actions directly. All execution passes through the Policy Engine and Action Executor.

```
Case Input → Agent → Tool Calls → Evidence → Analysis → Recommendation → Policy Gate → Executor
```

### Execution Bounds
- **Maximum tool calls per run**: 15
- **Maximum LLM iterations**: 5
- **Timeout per run**: 60 seconds (LLM) / 5 seconds (deterministic)
- **No infinite loops**: Hard iteration limit enforced

---

## 2. AI Provider Abstraction

```typescript
interface AIProvider {
  analyzeCase(input: CaseAnalysisInput): Promise<CaseAnalysisOutput>;
  classifyFailure(input: FailureClassificationInput): Promise<FailureClassification>;
  explainDecision(input: DecisionExplanationInput): Promise<string>;
  summarizeIncident(input: IncidentSummaryInput): Promise<string>;
}
```

### Implementations
1. **LLMProvider** — Uses OpenAI/Google/Anthropic via structured tool calls
2. **DeterministicProvider** — Rule-based fallback for demo mode and LLM outage

The system **must** continue functioning in deterministic mode if the LLM is unavailable.

---

## 3. Agent Tools

Each tool has a defined schema, input validation, and output format. The agent cannot call arbitrary functions.

### Tool Catalog

| Tool | Purpose | Returns |
|------|---------|---------|
| `get_payment` | Retrieve payment details | Payment record |
| `get_order` | Retrieve order details | Order record |
| `get_customer_history` | Customer payment history | Success rate, frequency, LTV |
| `get_failure_history` | Past failures for this customer/bank | Failure patterns |
| `get_similar_cases` | Historical cases with similar attributes | Case summaries with outcomes |
| `get_merchant_policy` | Active merchant recovery policy | Policy rules and limits |
| `calculate_revenue_at_risk` | Compute revenue at risk | Amount and confidence |
| `estimate_recovery_probability` | ML model prediction | Probability + confidence |
| `simulate_intervention` | Simulate a single intervention | Expected outcome |
| `compare_interventions` | Simulate all candidate interventions | Ranked comparison |
| `check_policy` | Validate action against policy | Approved/blocked + reason |
| `create_recovery_action` | Propose a recovery action | Action proposal |
| `get_action_status` | Check execution status | Current status |
| `get_recovery_outcome` | Get actual outcome | Recovery result |
| `record_decision` | Record decision with reasoning | Audit entry |

### Tool Safety Rules
- Tools operate on **read-only** data except `create_recovery_action` and `record_decision`
- `create_recovery_action` creates a **proposal**, not an execution
- No tool can modify financial records directly
- No tool can bypass policy
- No tool can execute arbitrary SQL
- No tool can call arbitrary external URLs
- All tools validate input via Zod schemas

---

## 4. Agent Loop

```
1.  Receive case
2.  Retrieve payment details               → get_payment()
3.  Retrieve order details                  → get_order()
4.  Retrieve customer history               → get_customer_history()
5.  Identify revenue at risk                → calculate_revenue_at_risk()
6.  Classify failure                        → classifyFailure() [AI]
7.  Retrieve historical analogues           → get_similar_cases()
8.  Estimate recovery probability           → estimate_recovery_probability()
9.  Generate candidate interventions        → [structured enumeration]
10. Simulate candidate outcomes             → compare_interventions()
11. Rank interventions by expected value    → [deterministic calculation]
12. Run policy gate                         → check_policy()
13. Record decision                         → record_decision()
14. Return recommendation
```

### Iteration Limit
The agent has a **hard limit of 15 tool calls** per run. If reached, it must return its best recommendation with whatever evidence it has gathered.

---

## 5. Structured Output

The agent must return a structured `CaseAnalysisOutput`:

```typescript
interface CaseAnalysisOutput {
  case_id: string;
  root_cause: string;
  root_cause_confidence: number;
  failure_classification: string;
  revenue_at_risk_minor: number;
  recovery_probability: number;
  recommended_action: string;
  reasoning: string;
  intervention_comparison: InterventionComparison[];
  policy_evaluation: PolicyEvaluation;
  evidence_summary: string[];
  model_version: string;
  agent_run_id: string;
  tool_calls_made: number;
  latency_ms: number;
}
```

---

## 6. Deterministic Fallback

When the LLM is unavailable:

1. Classify failure using rule-based mapping (failure_code → category)
2. Use historical statistics for recovery probability
3. Run counterfactual simulator with deterministic model
4. Apply policy engine (always deterministic)
5. Return structured recommendation

Label output clearly: `provider: "deterministic"`

---

## 7. Error Handling

| Failure | Action |
|---------|--------|
| LLM timeout | Fall back to deterministic |
| Malformed LLM output | Fall back to deterministic |
| Tool call fails | Log error, continue with available data |
| All tools fail | Return "insufficient evidence" + escalate |
| Iteration limit reached | Return best available recommendation |
| Unknown error | Stop + escalate |

**Critical rule**: On any unknown failure, **STOP** and **ESCALATE**. Never execute a financial action on uncertain analysis.

---

## 8. LLM Safety Constraints

The LLM **CANNOT**:
- ❌ Modify financial records
- ❌ Change money amounts
- ❌ Bypass policy
- ❌ Approve prohibited actions
- ❌ Expose secrets
- ❌ Execute arbitrary SQL
- ❌ Call arbitrary external URLs

The LLM **CAN**:
- ✅ Read case data via tools
- ✅ Classify failures
- ✅ Reason about root causes
- ✅ Explain decisions in natural language
- ✅ Recommend (not execute) interventions
