# REVIVE — Master 5-Minute Competition Presentation Script

## Execution
```bash
npm run demo:final
```

---

## ⏱️ Precise Timeline & Narration Flow

### [0:00 – 0:30] The $400B Problem
- **Narration**: "Every year, digital merchants lose hundreds of billions to payment failures. When payment rails fail — like an HDFC Bank UPI degradation — payment gateways blindly retry on the broken rail, failing 88% of the time. Monitoring dashboards alert you after the fact, but can't act. Unconstrained AI bots are too dangerous to move money. REVIVE bridges this gap."
- **Visual**: Control Room ([`/dashboard`](file:///Users/navjotkumarsingh/Desktop/Revive/src/app/dashboard/page.tsx)) displaying live GMV at risk and subsystem health cards.

### [0:30 – 1:15] Telemetry Stream & Anomaly Detection
- **Narration**: "REVIVE's sliding-window stream aggregator processes over 4.5 million events per second in memory. When HDFC UPI transactions spike from a normal 1.4% failure baseline to 24.5%, the multi-threshold anomaly detector immediately triggers INC-HDFC-UPI-001 and isolates ₹12,49,500.00 of GMV at risk."
- **Visual**: Incident alert card with severity `CRITICAL` and affected segment `(HDFC Bank, UPI)`.

### [1:15 – 2:00] AI Root Cause Investigation & Evidence Grounding
- **Narration**: "REVIVE's AI Root Cause Investigator synthesizes dimensional telemetry. Notice: it isolates HDFC UPI timeouts from HDFC Debit Cards (healthy at 2.1%) and SBI UPI (healthy at 1.8%). It outputs BANK_PAYMENT_METHOD_DEGRADATION with 98% confidence. Every single fact is cryptographically grounded in active telemetry with zero unsupported claims."
- **Visual**: Scored hypotheses and verified evidence bag `[E-101, E-102, E-103, E-104, E-105]`.

### [2:00 – 2:45] Counterfactual Simulation (Integer Minor EV)
- **Narration**: "For this ₹24,999 failed transaction, the Counterfactual Simulator computes integer Net Expected Value across 6 candidates. Alternative Rail switching yields the highest theoretical return at ₹9,497.62 Net EV, followed by Multi-Rail Payment Links at ₹5,247.79, and Blind Retries at only ₹2,998.38."
- **Visual**: Candidate simulation matrix comparing probability bps, fees, and integer Net EV.

### [2:45 – 3:30] Policy Governance & Constrained Autonomy
- **Narration**: "**AI Recommends. Policy Decides. Executor Acts. Measurement Proves.** The merchant’s policy disables automated routing changes. The 12-rule Policy Engine strictly DENIES Candidate 1. Under Constrained Autonomy, REVIVE safely selects Candidate 2: SEND_PAYMENT_LINK (Net EV ₹5,247.79), which passes all 12 policy rules."
- **Visual**: Policy evaluation log showing Candidate 1 denied and Candidate 2 approved.

### [3:30 – 4:15] Safe Execution & Adversarial Network Drop
- **Narration**: "ActionExecutor re-validates the live policy hash and dispatches the payment link. But an upstream TCP connection reset drops the gateway response! An ordinary system would blindly retry and risk double-charging. REVIVE marks state UNKNOWN, refuses blind retries, and triggers background reconciliation."
- **Visual**: State machine transitions: `PROPOSED -> POLICY_PENDING -> APPROVED -> EXECUTING -> UNKNOWN -> RECONCILING -> SUCCEEDED`.

### [4:15 – 4:45] Settlement Verification & Revenue Proof
- **Narration**: "The reconciler confirms the link is active. The customer completes payment via ICICI Netbanking. An immutable webhook arrives, signature verified, and ₹24,999.00 is recovered into the merchant account."
- **Visual**: Case updated to `RECOVERED`, ₹24,999.00 gross recovery confirmed.

### [4:45 – 5:00] 100K Benchmark Proof & Final Line
- **Narration**: "Across 100,000 deterministic benchmark cases spanning 15 outage categories:
  - Control Baseline (Single Retry) recovered 10.2% (₹15.13 Cr).
  - REVIVE recovered 21.2% (₹31.45 Cr).
  - That is an absolute uplift of +11.0 percentage points and a **+107.8% relative net revenue lift** with exactly zero unsafe actions.
  
  **REVIVE does not give an AI agent permission to move money. It gives AI enough intelligence to recommend what should happen, while deterministic policy and execution systems decide what is actually allowed to happen.**"
