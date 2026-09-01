# REVIVE — Technical Judge Defense & Hostile Q&A

## 1. Why AI? Why not simple heuristics/rules?
**Defense**: Simple rules work for single-dimensional, obvious anomalies (e.g. if error rate $> 5\%$, alert). But real payment outages are noisy, multi-dimensional, and contradictory. For example, during an HDFC UPI incident:
- HDFC UPI fails at 24.5%
- HDFC Credit & Debit cards are healthy at 2.1%
- SBI and ICICI UPI switches are healthy at 1.8%
- Retry success rate on the failing rail drops by 88%

In our comparative benchmark, static rules achieved only **62.5% accuracy** on multi-signal/ambiguous scenarios, while AI achieved **97.5% top-1 accuracy** by synthesizing multidimensional telemetry into structured causal evidence bags without manual heuristic explosion.

---

## 2. What if the AI hallucinates?
**Defense**: REVIVE implements **Zero-Trust AI Architecture**:
1. AI outputs are constrained to strict Zod schemas.
2. Every cited evidence ID is cross-referenced against active in-memory telemetry by our Evidence Verification Engine.
3. Ungrounded or hallucinated IDs are stripped before hypothesis scoring.
4. If diagnostic confidence drops below 85%, the Policy Engine automatically escalates to human review.
5. Measured unsupported factual claim rate: **`0.0%`**.

---

## 3. Can the AI move money or trigger payment links autonomously?
**Defense**: **NEVER.** The immutable architectural law is:
$$\mathbf{AI\ RECOMMENDS} \longrightarrow \mathbf{POLICY\ DECIDES} \longrightarrow \mathbf{EXECUTOR\ ACTS} \longrightarrow \mathbf{MEASUREMENT\ PROVES}$$
The AI service has zero database mutation credentials, zero gateway API keys, and zero execution tools. It only outputs hypotheses and recommendations. The deterministic Policy Engine evaluates 12 mathematical rules to decide whether an action is permitted.

---

## 4. What prevents double charging or duplicate retry execution?
**Defense**: Two-level idempotency protection:
1. **Level 1 (Internal)**: PostgreSQL unique constraint on `(merchant_id, external_reference_id)`. Replays return the existing state immediately.
2. **Level 2 (External)**: Deterministic external idempotency keys forwarded to payment gateways.
3. In concurrency tests with 100 simultaneous execution requests, **exactly 1 succeeds and 99 receive duplicate status**.

---

## 5. What happens if the payment provider times out or drops the network connection?
**Defense**: If an upstream TCP reset or timeout occurs after dispatch, REVIVE never assumes failure and **never initiates a blind retry**. The action transitions to `UNKNOWN`. A background reconciliation engine polls the provider's idempotent external reference key. Only upon explicit gateway confirmation does it transition to `SUCCEEDED` or `EXECUTION_FAILED`.

---

## 6. What if merchant policy changes while a decision is pending execution?
**Defense**: **Pre-Execution Policy Mutation Revalidation.** Immediately before dispatching money movement, `ActionExecutor` re-evaluates the merchant's live policy against the decision's recorded SHA-256 policy hash. If the merchant disabled the action type in the interim, execution is **BLOCKED** and audited with `policy_changed_since_decision`.

---

## 7. What happens when every recovery candidate is denied by merchant policy?
**Defense**: The Decision Engine gracefully defaults to `NO_ACTION` ($EV = 0$) or routes the transaction to the Human Review Queue for operator discretion, logging a `policy.all_candidates_denied` audit event.

---

## 8. How do you calculate recovery probability?
**Defense**: Probabilities are computed in **basis points ($0 \dots 10,000\text{ bps}$)** using failure taxonomy base rates, action multipliers, exponential retry decay ($-25\%$ per attempt), time decay curves, and customer VIP tier adjustments. Floating-point arithmetic is strictly prohibited.

---

## 9. How is the probability model calibrated?
**Defense**: Calibrated on an independent, non-leaking Holdout dataset ($N = 5,000$).
- **Holdout Brier Score**: `0.1244` (Target $< 0.15$)
- **Theoretical Bayes Irreducible Variance**: `0.1237`
- **Pure Calibration Loss**: `0.0007` ($< 0.07\%$)
- **Expected Calibration Error (ECE)**: `0.56%` (Target $< 2.5\%$)

---

## 10. How did you avoid benchmark leakage?
**Defense**: Calibration tuning and Holdout validation datasets were generated using distinct, non-overlapping cryptographic PRNG seeds (`seed_calib_` vs `seed_holdout_`). The holdout data was never used to adjust base rates or multipliers.

---

## 11. How was the Control baseline designed? Is it artificially weakened?
**Defense**: No. The Control baseline runs the standard industry default: automated single retry on eligible network/timeout errors. It was given realistic conditional probabilities (e.g. 12% on UPI timeouts, 23% on network errors).

---

## 12. Are your benchmark datasets synthetic or real?
**Defense**: The datasets are **deterministic synthetic benchmarks** generated with known ground truth, realistic merchant topologies, and stochastic Bernoulli outcome physics. Every numerical claim is fully reproducible via `npm run evaluate:100k` and `npm run evaluate:calibration`.

---

## 13. What is actually production-ready vs test mode?
**Defense**:
- **Production-Ready**: In-memory streaming aggregator, anomaly detector, policy engine, counterfactual simulator, decision state machine, two-level idempotency, multi-tenant isolation, Clerk auth, and PostgreSQL database schema.
- **Test Mode**: External payment gateway adapters run against Razorpay Test Mode with realistic simulation hooks.

---

## 14. What is the difference between 4.5M ev/s and database throughput?
**Defense**:
- **4,546,108 events/sec** is **In-Memory Streaming Aggregation Throughput** (CPU memory transformation and sliding-window grouping).
- **1,250 events/sec** is **Database Batch Ingestion Throughput** (PostgreSQL bulk insert with disk I/O).
- **0.034 ms** is **Pure Computational Decision Latency** (CPU in-memory).
- **5.19 ms** is **Database-Backed Decision Latency** (PostgreSQL read + decide + insert).

---

## 15. How does REVIVE scale to millions of events?
**Defense**: The event pipeline uses chunked in-memory streaming aggregation and vectorized metrics slicing. In our 1,000,000 transaction benchmark (4.94M events), peak memory RSS remained under **636 MB**.

---

## 16. How is tenant isolation enforced?
**Defense**: Every database table includes `merchant_id` with composite indexes `(merchant_id, id)`. All Drizzle ORM queries enforce `and(eq(table.id, id), eq(table.merchantId, merchantId))`. Concurrency tests across 100 merchants verified 0 cross-tenant leaks.

---

## 17. What is your biggest architectural limitation today?
**Defense**: Alternative payment rail switching requires merchant gateway multi-acquirer setup (e.g. Razorpay Optimizer or Juspay Hypercheckout). For single-acquirer merchants, REVIVE automatically falls back to Payment Links and customer notifications.

---

## 18. Why did Full REVIVE net GMV slightly decrease vs Tier 4 in the ablation study?
**Defense**: Tier 5 introduces **VIP Escalation Gating** ($> ₹50,000$ to human review) and **Action Cost Accounting**. This deliberate trade-off ensures that high-value transactions are never processed automatically without human oversight, preventing high-ticket disputes while maintaining a massive **+413.5% net lift** over Control.

---

## 19. What happens if the AI service is completely unavailable (503/Timeout)?
**Defense**: The system falls back seamlessly to the deterministic **Rule-Only Investigator**, scoring hypotheses via statistical anomaly thresholds without interrupting the recovery control plane.

---

## 20. Why should a merchant trust this with their checkout?
**Defense**: Because REVIVE gives merchants **100% deterministic control** via policy configurations. If a merchant allows 0 retries, REVIVE executes 0 retries. If a merchant sets a ₹50,000 threshold, high-ticket orders are never touched autonomously. REVIVE is a safety and governance wrapper around recovery.
