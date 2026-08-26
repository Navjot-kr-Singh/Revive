# REVIVE — Judge Scorecard (Self-Assessment)

## Purpose
Score the product honestly to find weaknesses a skeptical judge would attack. The goal is NOT to give ourselves a high score. The goal is to find reasons a judge would reject us.

---

## Scoring (1-10)

| Criteria | Score | Justification | Weaknesses |
|----------|-------|---------------|------------|
| Problem Clarity | 9/10 | Revenue loss from payment failures is a real, quantifiable problem | Could be seen as too narrow |
| Novelty | 8/10 | Counterfactual simulator + closed-loop measurement is novel | Individual components exist elsewhere |
| AI Depth | 8/10 | Tool-using agent + deterministic guardrails + clear AI/rules separation | Not a novel ML architecture |
| Engineering Quality | TBD | Depends on implementation | Must verify |
| Reliability | TBD | Deterministic fallback + policy engine | Must stress test |
| Security | TBD | Multi-tenancy + bounded actions + audit trail | Must review |
| Business Impact | 9/10 | Direct ₹ metric for revenue recovered | Synthetic data, not real merchants |
| Metrics Quality | 9/10 | Reproducible evaluation with ground truth | Synthetic ground truth |
| UX Quality | TBD | Professional fintech UI | Must implement |
| Demo Quality | TBD | Hero scenario scripted | Must rehearse |
| Explainability | 8/10 | Every decision explained + audit trail | LLM explanations may be verbose |
| Production Readiness | 7/10 | Managed services + adapters + error handling | One-week timeline |
| Razorpay Relevance | 9/10 | Directly addresses payment recovery use case | Test mode only |
| Technical Storytelling | 8/10 | Clear architecture + evaluation framework | Must not over-explain |
| Differentiation | 8/10 | "Prove recovery, don't just predict it" | Must demonstrate convincingly |

---

## Hostile Judge Questions

### "Is this actually AI?"
**Answer**: Yes. The AI provides contextual root cause analysis, evidence synthesis, and intervention explanation. Without AI, you get static retry rules that treat every failure the same. We demonstrate specific cases where AI outperforms rules.

### "Why couldn't this be a rules engine?"
**Answer**: It could be — for simple cases. We show this: same failure code, different customers, different histories → different optimal interventions. Rules can't do this. We have a "Why Not Rules?" comparison.

### "Can you prove revenue recovery?"
**Answer**: Yes. We run 50k+ synthetic transactions with known ground truth. Baseline vs REVIVE. The numbers come from actual evaluation, not hardcoded UI.

### "How do you know your model is correct?"
**Answer**: Calibration curves against synthetic ground truth. When the model says 30% recovery, ~30% actually recover. Model version tracked on every prediction.

### "What happens when the model is wrong?"
**Answer**: Policy engine catches it. Bounded actions. Maximum retries. Amount limits. Negative expected value → no action. Low confidence → human review.

### "Can the agent lose money?"
**Answer**: Intervention costs are minimal (₹2-50 per action). The expected value calculation accounts for costs. Negative expected value → no action.

### "Can it execute an unauthorized action?"
**Answer**: No. Every action goes through the policy engine. The LLM cannot bypass policy. Merchant-configured allowlists. Server-side authorization.

### "What if Razorpay webhook arrives twice?"
**Answer**: Idempotent processing. `UNIQUE(source, source_event_id)` constraint. Second delivery is acknowledged but not reprocessed.

### "What if webhook arrives out of order?"
**Answer**: State machine handles it. Invalid transitions rejected. Events are processed idempotently regardless of order.

### "What happens if the LLM is unavailable?"
**Answer**: Deterministic fallback. System continues with rule-based analysis. Labeled clearly as "Deterministic Fallback".

### "Are your numbers real or fabricated?"
**Answer**: Numbers come from actual evaluation engine with deterministic seeds. Same seed = same dataset = same results. Dashboard clearly labels SIMULATED vs EXPECTED vs ACTUAL.

### "Why should Razorpay care?"
**Answer**: More recovered payments = more GMV = more commission. This directly increases Razorpay's revenue by recovering failed transactions.

---

## Areas to Strengthen Before Submission

1. [ ] Run full evaluation and verify metrics are reasonable
2. [ ] Demonstrate "Why Not Rules?" with specific cases
3. [ ] Ensure golden path never breaks
4. [ ] Security review passes
5. [ ] Demo works in fallback mode
6. [ ] Architecture diagram is clear and printable
