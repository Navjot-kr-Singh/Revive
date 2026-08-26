# REVIVE — Recovery Probability Model

## 1. Overview

The Recovery Probability Model estimates the likelihood that a specific recovery intervention will successfully recover revenue for a given case.

**This is NOT an LLM prediction.** This is a deterministic/statistical model with calibrated probabilities.

---

## 2. Model Type

### MVP: Calibrated Logistic Regression

A simple, interpretable model that:
- Takes structured features as input
- Outputs a calibrated probability [0.0, 1.0]
- Provides confidence/calibration information
- Tracks model version

### Why Logistic Regression?
1. **Interpretable** — Feature weights are explainable
2. **Calibrated** — Output is a true probability
3. **Fast** — Sub-millisecond inference
4. **Auditable** — No black box
5. **Sufficient** — For hackathon scope with synthetic data

---

## 3. Features

| # | Feature | Type | Description |
|---|---------|------|-------------|
| 1 | `failure_reason` | Categorical | Bank timeout, insufficient funds, etc. |
| 2 | `customer_previous_success_rate` | Float [0,1] | Historical payment success rate |
| 3 | `customer_purchase_frequency` | Integer | Orders in last 90 days |
| 4 | `amount_bucket` | Categorical | low/medium/high/very_high |
| 5 | `merchant_category` | Categorical | electronics, saas, etc. |
| 6 | `payment_method` | Categorical | upi, card, netbanking, wallet |
| 7 | `hour_of_day` | Integer [0-23] | Time bucket |
| 8 | `retry_count` | Integer | Number of previous retries |
| 9 | `historical_recovery_rate` | Float [0,1] | Recovery rate for similar cases |
| 10 | `time_since_failure_minutes` | Float | Minutes since original failure |

---

## 4. Amount Buckets

| Bucket | Range (INR) |
|--------|-------------|
| low | ₹0 – ₹999 |
| medium | ₹1,000 – ₹9,999 |
| high | ₹10,000 – ₹49,999 |
| very_high | ₹50,000+ |

---

## 5. Base Recovery Rates

Derived from synthetic ground truth data:

| Failure Reason | Base Rate | Notes |
|---------------|-----------|-------|
| bank_timeout | 0.35 | Often temporary |
| insufficient_funds | 0.12 | Usually persistent |
| bank_declined | 0.08 | Unlikely to change |
| network_error | 0.42 | Transient |
| card_expired | 0.05 | Needs card update |
| authentication_failed | 0.15 | May retry with correct auth |
| upi_timeout | 0.38 | Often recoverable |
| mandate_failure | 0.10 | Requires customer action |
| checkout_abandoned | 0.22 | Recoverable with nudge |

---

## 6. Intervention Modifiers

Each intervention type modifies the base recovery rate:

| Intervention | Multiplier | Cost (₹) | Friction |
|-------------|-----------|-----------|---------|
| NO_ACTION | 0.15× | 0 | 0.0 |
| RETRY_PAYMENT | 1.0× | 2 | 0.0 |
| SEND_PAYMENT_LINK | 0.7× | 5 | 0.3 |
| ALTERNATIVE_PAYMENT_METHOD | 1.1× | 3 | 0.2 |
| CUSTOMER_NOTIFICATION | 0.5× | 8 | 0.5 |
| HUMAN_ESCALATION | 0.8× | 50 | 0.1 |

---

## 7. Expected Value Calculation

For every intervention:

```
recovery_probability = base_rate × intervention_modifier × customer_factor × time_decay

expected_recovery = amount_at_risk × recovery_probability

intervention_cost = base_cost × attempt_number

estimated_risk_cost = amount_at_risk × risk_score × 0.01

estimated_friction_cost = amount_at_risk × customer_friction × 0.005

expected_net_value = expected_recovery - intervention_cost - estimated_risk_cost - estimated_friction_cost
```

### Customer Factor
```
customer_factor = 0.5 + (customer_success_rate × 0.5) + min(customer_frequency / 20, 0.3)
```

### Time Decay
```
time_decay = max(0.1, 1.0 - (time_since_failure_minutes / 1440) × 0.5)
```

Recovery probability decays over time. After 24 hours, it's at least 50% lower.

---

## 8. Model Output

```typescript
interface RecoveryPrediction {
  recovery_probability: number;  // [0.0, 1.0]
  confidence: number;            // [0.0, 1.0]
  model_version: string;
  features_used: Record<string, any>;
  explanation: string;           // Human-readable
}
```

---

## 9. Confidence Calculation

```
confidence = data_completeness × historical_sample_size_factor

data_completeness = (features_available / total_features)

historical_sample_size_factor = min(1.0, similar_cases_count / 100)
```

If confidence < 0.3, the policy engine should escalate to human review.

---

## 10. Model Versioning

| Version | Description | Features |
|---------|-------------|----------|
| v1.0 | Base logistic regression | All 10 features |
| v1.0-deterministic | Rule-based fallback | failure_reason + amount_bucket |

Every prediction records its `model_version`.

---

## 11. Calibration

The model should be calibrated such that:
- When it predicts 30% recovery, ~30% of cases actually recover
- Measured via calibration curve on synthetic ground truth
- Reported in evaluation results

---

## 12. Testing Requirements

| Test | Description |
|------|-------------|
| Output range | Probability always in [0.0, 1.0] |
| Known inputs | Specific failure types produce expected ranges |
| Time decay | Older failures have lower probability |
| Customer factor | Repeat customers have higher probability |
| Model version | Every prediction includes version |
| Deterministic | Same input → same output |
| Edge cases | ₹0 amount, 0 history, unknown failure |
| Expected value | Correct arithmetic on financial calculations |
