# REVIVE — Policy Gating & Constrained Autonomy

## 1. Constrained Autonomy Flow
1. **Case Ingested**: ₹24,999 failed checkout.
2. **AI Investigation**: Root cause diagnosed as `BANK_PAYMENT_METHOD_DEGRADATION` with 98% measured confidence.
3. **Counterfactual Simulation**:
   - `ALTERNATIVE_PAYMENT_METHOD`: EV ₹9,499.62 (Highest theoretical return)
   - `SEND_PAYMENT_LINK`: EV ₹5,249.79
   - `RETRY_PAYMENT`: EV ₹2,999.88
4. **Policy Gating**:
   - Merchant policy `POLICY-CONSERVATIVE-V1` has disabled automated rail switching.
   - Evaluator returns `DENIED` for Alternative Payment.
   - Decision Engine automatically falls back to highest-EV permitted candidate: `SEND_PAYMENT_LINK` (`ALLOW`).
5. **Human Review**: Transactions exceeding ₹50,000 are escalated to `/dashboard/review` for operator sign-off.
