# REVIVE — Evaluation Methodology

## 1. Purpose

REVIVE must prove its value through objective, reproducible measurement. The evaluation framework compares REVIVE against a baseline (no intervention) using synthetic data with known ground truth.

---

## 2. Experimental Design

### Setup
- **Total events**: 50,000+ synthetic failed-revenue events
- **Baseline group**: 25,000 events — no intervention (natural recovery only)
- **REVIVE group**: 25,000 events — AI-driven intervention
- **Assignment**: Deterministic hash-based assignment (reproducible)
- **Seed**: `SEED=20260826` — same seed = same dataset

### Ground Truth
Every synthetic failed-revenue event has hidden attributes:
- `recoverable`: boolean
- `optimal_intervention`: action type
- `expected_recovery_probability`: float
- `actual_simulated_outcome`: 'recovered' | 'failed'
- `recovery_delay_minutes`: integer

This allows objective evaluation without ambiguity.

---

## 3. Metrics

### Primary Metrics

| Metric | Formula | Description |
|--------|---------|-------------|
| Recovery Rate | recovered_cases / total_cases | % of cases where revenue was recovered |
| Recovered GMV | Σ recovered_amount_minor | Total revenue recovered |
| Net Recovered GMV | Recovered GMV - intervention costs | After subtracting costs |

### Secondary Metrics

| Metric | Formula | Description |
|--------|---------|-------------|
| Detection Precision | true_positive_detections / all_detections | Are we detecting the right cases? |
| Detection Recall | true_positive_detections / all_recoverable | Are we catching all recoverable cases? |
| Recovery Precision | correctly_intervened / all_interventions | Are interventions appropriate? |
| Recovery Recall | correctly_intervened / all_recoverable | Are we intervening on all we should? |
| False Intervention Rate | unnecessary_interventions / all_interventions | Wasted effort |
| Escalation Rate | escalated_cases / total_cases | Cases requiring human review |
| Policy Violation Count | count of blocked actions | Safety metric |
| Decision Latency | avg(decision_timestamp - case_created) | Speed of decision-making |
| Agent Latency | avg(agent_completion - agent_start) | AI processing time |
| Cost per Recovered Rupee | total_cost / recovered_GMV | Efficiency |
| Tool Failure Rate | failed_tool_calls / total_tool_calls | Reliability |
| Workflow Success Rate | successful_workflows / total_workflows | End-to-end reliability |
| Customer Contact Rate | cases_with_contacts / total_cases | Customer friction |
| Average Recovery Time | avg(recovery_timestamp - failure_timestamp) | Time to recovery |

---

## 4. Expected Results Format

```
BASELINE
────────────────────────────
Recovery Rate:        12.7%
Recovered GMV:        ₹7.2L
Net Recovered GMV:    ₹7.2L
Intervention Rate:    0%
Avg Recovery Time:    N/A

REVIVE
────────────────────────────
Recovery Rate:        31.4%
Recovered GMV:        ₹18.6L
Net Recovered GMV:    ₹18.1L
Intervention Rate:    72.3%
False Intervention:   8.1%
Customer Contact:     23.4%
Avg Recovery Time:    47 min
Avg Decision Latency: 230ms
Policy Violations:    0
Escalation Rate:      11.2%

IMPROVEMENT
────────────────────────────
Recovery Rate:        2.47×
Recovered GMV:        2.58×
Net Recovered GMV:    2.51×
```

> **These numbers MUST come from actual evaluation runs. They are NOT hardcoded.**

---

## 5. Evaluation Pipeline

```
1. Generate synthetic dataset with seed
2. Split into baseline/REVIVE groups
3. For baseline: simulate natural recovery only
4. For REVIVE: run full agent pipeline
5. Collect outcomes
6. Compute metrics
7. Compare groups
8. Store results in experiment_results table
9. Display in dashboard
```

---

## 6. Reproducibility

- Deterministic seed ensures same dataset
- Same seed + same model version → same results
- Evaluation can be re-run at any time
- Results stored with experiment_id, timestamps, and config

---

## 7. Statistical Rigor

### Confidence Intervals
Where sample sizes permit, compute 95% confidence intervals on recovery rate and recovered GMV.

### Significance
With 25,000 events per group, differences of >1% in recovery rate should be statistically significant at p < 0.01.

---

## 8. "Why Not Rules?" Demonstration

Include specific case examples showing where REVIVE outperforms static rules:

| Case | Static Rule | REVIVE | Why Different |
|------|-------------|--------|---------------|
| Same failure, repeat customer | Retry | Retry | Alignment |
| Same failure, new customer | Retry | Payment link | Customer has no payment history |
| Same failure, high-value | Retry | Human escalation | Risk too high for auto |
| Timeout, repeat customer | Retry | Do nothing | Customer always retries themselves |

---

## 9. Failure Analysis

For REVIVE false interventions:
- Why did the model recommend an intervention?
- What features drove the prediction?
- Was the policy gate working correctly?

This demonstrates system maturity and self-awareness.
