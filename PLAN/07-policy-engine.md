# REVIVE — Policy Engine

## 1. Overview

The Policy Engine is a **deterministic rule evaluator** that sits between the Decision Engine and the Action Executor. It ensures all recovery actions comply with merchant-configured boundaries and safety constraints.

**The Policy Engine NEVER uses LLM inference.** It is pure deterministic logic.

---

## 2. Policy Rules

### 2.1 Retry Limits
```
IF retry_count >= MAX_RETRY_ATTEMPTS (default: 2)
  → BLOCK action: RETRY_PAYMENT
  → reason: "Maximum retry attempts reached"
```

### 2.2 Customer Contact Limits
```
IF customer_contacts >= MAX_CUSTOMER_CONTACTS (default: 2)
  → BLOCK actions: SEND_PAYMENT_LINK, CUSTOMER_NOTIFICATION
  → reason: "Maximum customer contacts reached"
```

### 2.3 High-Value Threshold
```
IF amount_at_risk > HIGH_VALUE_THRESHOLD (default: ₹50,000)
  → ESCALATE to human review
  → reason: "High-value transaction requires human approval"
```

### 2.4 Automated Recovery Limit
```
IF amount_at_risk > MAX_AUTOMATED_RECOVERY_AMOUNT (default: ₹1,00,000)
  → BLOCK automated execution
  → reason: "Amount exceeds automated recovery limit"
```

### 2.5 Low Recovery Probability
```
IF recovery_probability < MIN_RECOVERY_PROBABILITY (default: 0.10)
  → BLOCK action: NO_ACTION recommended
  → reason: "Recovery probability below minimum threshold"
```

### 2.6 Low Model Confidence
```
IF model_confidence < MIN_CONFIDENCE (default: 0.30)
  → ESCALATE to human review
  → reason: "Model confidence below minimum threshold"
```

### 2.7 Negative Expected Value
```
IF expected_net_value <= 0
  → BLOCK action: NO_ACTION recommended
  → reason: "Expected net value is non-positive"
```

### 2.8 Merchant Action Allowlist
```
IF action NOT IN merchant.allowed_actions
  → BLOCK action
  → reason: "Action not permitted by merchant policy"
```

### 2.9 Discount Limits
```
IF discount_percent > MAX_DISCOUNT_PERCENT (default: 5%)
  → BLOCK action
  → reason: "Discount exceeds maximum allowed percentage"
```

### 2.10 Case Expiry
```
IF case.created_at + CASE_TTL < NOW()
  → BLOCK action, transition to EXPIRED
  → reason: "Case has expired"
```

---

## 3. Policy Evaluation Flow

```
Input: (case, proposed_action, decision_context)

1. Load merchant's active policy
2. Evaluate ALL rules against input
3. Collect results:
   - rules_evaluated: [list of all rules checked]
   - rules_triggered: [list of rules that fired]
4. Determine outcome:
   - If ANY rule blocks → BLOCKED
   - If ANY rule escalates → ESCALATED  
   - If no rules fire → APPROVED
5. Record policy_evaluation to database
6. If BLOCKED or ESCALATED → create audit_event
7. Return PolicyResult
```

---

## 4. Policy Result

```typescript
interface PolicyResult {
  result: 'approved' | 'blocked' | 'escalated';
  policy_id: string;
  policy_version: string;
  rules_evaluated: PolicyRuleResult[];
  rules_triggered: PolicyRuleResult[];
  blocking_reason?: string;
  escalation_reason?: string;
}

interface PolicyRuleResult {
  rule_id: string;
  rule_name: string;
  condition: string;
  result: 'pass' | 'block' | 'escalate';
  details: Record<string, any>;
}
```

---

## 5. Default Policy Configuration

```json
{
  "policy_version": "1.0.0",
  "max_retry_attempts": 2,
  "max_customer_contacts": 2,
  "max_discount_percent": 5,
  "max_automated_recovery_minor": 10000000,
  "high_value_threshold_minor": 5000000,
  "min_recovery_probability": 0.10,
  "min_confidence": 0.30,
  "case_ttl_hours": 72,
  "allowed_actions": [
    "no_action",
    "retry_payment",
    "send_payment_link",
    "alternative_payment_method",
    "customer_notification",
    "human_escalation"
  ]
}
```

---

## 6. Audit Requirements

Every policy evaluation MUST record:
- Which rules were evaluated
- Which rules triggered
- What the outcome was
- Why the action was blocked/escalated (if applicable)

This creates a complete audit trail for compliance.

---

## 7. Testing Requirements

| Test | Description |
|------|-------------|
| Retry limit blocks retry | After 2 retries, retry action is blocked |
| Contact limit blocks notification | After 2 contacts, notification is blocked |
| High value escalates | Amount above threshold triggers escalation |
| Low probability blocks | Below minimum probability, no action taken |
| Low confidence escalates | Below minimum confidence, escalation triggered |
| Negative EV blocks | Non-positive expected value blocks action |
| Allowlist blocks | Action not in allowlist is blocked |
| No rules triggered approves | Clean action is approved |
| Multiple rules triggered | Most restrictive outcome wins |
| Policy evaluation recorded | Database record created for every evaluation |
| Audit event created | Blocked/escalated actions create audit events |
