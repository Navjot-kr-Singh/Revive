# REVIVE — AI Agent Contract

## Tool Schemas

### get_payment
```typescript
{
  name: "get_payment",
  description: "Retrieve payment details by payment ID",
  parameters: {
    payment_id: { type: "string", required: true }
  },
  returns: {
    id: "string",
    amount_minor: "number",
    currency: "string",
    status: "string",
    payment_method: "string",
    bank: "string",
    failure_reason: "string",
    failure_code: "string",
    attempt_count: "number",
    created_at: "string"
  }
}
```

### get_customer_history
```typescript
{
  name: "get_customer_history",
  description: "Retrieve customer payment history and statistics",
  parameters: {
    customer_id: { type: "string", required: true }
  },
  returns: {
    customer_id: "string",
    display_id: "string",
    segment: "string",
    total_orders: "number",
    total_success_payments: "number",
    total_failed_payments: "number",
    success_rate: "number",
    lifetime_value_minor: "number",
    recent_failures: "FailureRecord[]",
    purchase_frequency: "number"
  }
}
```

### get_similar_cases
```typescript
{
  name: "get_similar_cases",
  description: "Find historical cases with similar attributes and their outcomes",
  parameters: {
    failure_code: { type: "string", required: true },
    payment_method: { type: "string" },
    bank: { type: "string" },
    amount_bucket: { type: "string" },
    limit: { type: "number", default: 10 }
  },
  returns: {
    cases: [{
      case_id: "string",
      failure_code: "string",
      amount_minor: "number",
      intervention: "string",
      outcome: "string",
      recovery_probability: "number",
      time_to_recovery_seconds: "number"
    }],
    aggregate: {
      total_similar: "number",
      recovery_rate: "number",
      most_successful_intervention: "string"
    }
  }
}
```

### estimate_recovery_probability
```typescript
{
  name: "estimate_recovery_probability",
  description: "Get ML model prediction for recovery probability",
  parameters: {
    case_id: { type: "string", required: true },
    intervention_type: { type: "string", required: true }
  },
  returns: {
    recovery_probability: "number",
    confidence: "number",
    model_version: "string",
    features_used: "Record<string, any>",
    explanation: "string"
  }
}
```

### compare_interventions
```typescript
{
  name: "compare_interventions",
  description: "Simulate and compare all candidate interventions for a case",
  parameters: {
    case_id: { type: "string", required: true }
  },
  returns: {
    interventions: [{
      action_type: "string",
      recovery_probability: "number",
      expected_recovery_minor: "number",
      intervention_cost_minor: "number",
      expected_net_value_minor: "number",
      customer_friction: "number",
      risk_score: "number",
      confidence: "number"
    }],
    recommended: "string",
    reasoning: "string"
  }
}
```

### check_policy
```typescript
{
  name: "check_policy",
  description: "Validate a proposed action against merchant policy",
  parameters: {
    case_id: { type: "string", required: true },
    action_type: { type: "string", required: true }
  },
  returns: {
    result: "'approved' | 'blocked' | 'escalated'",
    rules_triggered: "PolicyRuleResult[]",
    blocking_reason: "string | null"
  }
}
```

---

## Agent System Prompt (Template)

```
You are the REVIVE Recovery Agent. Your job is to analyze a revenue case, determine the root cause of a payment failure, and recommend the optimal recovery intervention.

RULES:
1. Always gather evidence before making recommendations
2. Use tools to retrieve data — do not hallucinate facts
3. Consider all intervention options before recommending
4. Explain your reasoning clearly
5. If uncertain, recommend human escalation
6. Never recommend actions that violate policy
7. Maximum 15 tool calls per analysis

TOOLS AVAILABLE:
- get_payment: Retrieve payment details
- get_order: Retrieve order details
- get_customer_history: Customer payment history
- get_failure_history: Past failures
- get_similar_cases: Historical analogues
- estimate_recovery_probability: ML model prediction
- compare_interventions: Simulate all options
- check_policy: Validate against policy

OUTPUT FORMAT:
Return a structured JSON with:
- root_cause: string
- root_cause_confidence: number (0-1)
- failure_classification: string
- recommended_action: string
- reasoning: string
- evidence_summary: string[]
```

---

## Guardrails

1. **Tool call limit**: 15 per run
2. **LLM iteration limit**: 5 per run
3. **Timeout**: 60 seconds
4. **Output validation**: Zod schema on every LLM output
5. **Fallback**: Deterministic analysis if LLM fails
6. **No direct execution**: Agent returns recommendation, not execution
