# REVIVE — 5-Minute Master Competition Demo Script

## Overview
- **Product**: REVIVE (Revenue Intelligence & Verification Engine)
- **Target Audience**: Technical Judging Panel (Fintech Architects, SREs, ML Judges)
- **Core Theme**: "Autonomous Closed-Loop Revenue Recovery with Zero-Trust AI & Deterministic Governance"
- **Terminal Execution**: `npm run demo:final`

---

## ⏱️ Minute-by-Minute Presentation Timeline

### 0:00 – 0:30 | The Problem & The Control Room
- **Narration**:
  > "Digital merchants lose hundreds of billions every year to payment failures. When payment rails break — like an HDFC Bank UPI switch degradation — existing payment gateways blindly retry on the broken rail, failing 88% of the time. Monitoring tools like Datadog alert you, but can't act. Unconstrained AI bots are too dangerous to move money. REVIVE bridges this gap by creating an autonomous revenue recovery control plane."
- **Visual**:
  - Show REVIVE Control Room ([`/dashboard`](file:///Users/navjotkumarsingh/Desktop/Revive/src/app/dashboard/page.tsx)): Live GMV at Risk, Net Recovered GMV, Subsystem Health Cards.
- **Key Point**: Closed-loop control plane: $\mathbf{Observe \to Detect \to Investigate \to Simulate \to Govern \to Decide \to Act \to Reconcile \to Measure}$.

---

### 0:30 – 1:15 | Telemetry Stream & Anomaly Detection
- **Narration**:
  > "REVIVE’s sliding-window stream aggregator processes over 4.5 million events per second in memory. When HDFC UPI transactions spike from a normal 1.4% failure baseline to 24.5%, the multi-threshold anomaly detector immediately isolates the incident, triggers INC-HDFC-UPI-001, and calculates ₹12,49,500.00 of revenue at risk across 50 checkout cases."
- **Visual**:
  - Incident Alert card with severity badge `CRITICAL`, affected segment `(HDFC Bank, UPI)`.

---

### 1:15 – 2:00 | AI Root Cause Investigation & Zero-Hallucination Evidence
- **Narration**:
  > "Rather than firing a static rule, REVIVE's AI Root Cause Investigator synthesizes dimensional telemetry into an evidence bag. Notice: it isolates HDFC UPI timeouts from HDFC Debit Cards (which remain healthy at 2.1%) and SBI UPI (healthy at 1.8%). It outputs BANK_PAYMENT_METHOD_DEGRADATION with 98% confidence. Crucially, every single fact is cryptographically grounded in verified evidence IDs. If an AI hallucinates an ID, our evidence filter strips it immediately."
- **Visual**:
  - Evidence Bag: `[E-101: Failure Spike]`, `[E-102: Bank Concentration 92%]`, `[E-103: Rail Specificity]`.

---

### 2:00 – 2:45 | Counterfactual Simulation (Integer Minor EV)
- **Narration**:
  > "Now we zoom into a single ₹24,999.00 failed transaction. The Counterfactual Simulator computes integer Net Expected Value across 6 candidate interventions. Alternative Rail switching yields the highest theoretical return at ₹9,497.62 net EV, followed by Multi-Rail Payment Links at ₹5,247.79, and Blind Retries at only ₹2,998.38."
- **Visual**:
  - Simulation Table comparing candidates, probability bps, action costs, and Net EV.

---

### 2:45 – 3:30 | Policy Governance & Constrained Autonomy
- **Narration**:
  > "Here is our core architectural law: **AI Recommends. Policy Decides. Executor Acts. Measurement Proves.** The merchant’s policy disables automated routing changes. The 12-rule Policy Engine strictly DENIES Candidate 1. Under Constrained Autonomy, REVIVE does not fail or guess — it safely falls back to Candidate 2: SEND_PAYMENT_LINK (Net EV ₹5,247.79), which passes all 12 policy rules."
- **Visual**:
  - Policy evaluation log showing rule `MERCHANT_ACTION_ALLOWLIST` failing for Candidate 1, and Candidate 2 getting `APPROVED`.

---

### 3:30 – 4:15 | Safe Execution, Network Drop & Distributed Reconciliation
- **Narration**:
  > "ActionExecutor re-validates the live policy hash and dispatches the payment link. But look what happens: an upstream TCP connection reset drops the gateway response. An ordinary system would blindly retry and risk double-charging. REVIVE marks the state UNKNOWN, refuses blind retries, and triggers the background reconciler. The reconciler polls the external gateway reference, confirms the link is active, and safely transitions state to SUCCEEDED."
- **Visual**:
  - State transition: `PROPOSED -> POLICY_PENDING -> APPROVED -> EXECUTING -> UNKNOWN -> RECONCILING -> SUCCEEDED`.

---

### 4:15 – 4:45 | Settlement Verification & Revenue Proof
- **Narration**:
  > "The customer clicks the link and pays via ICICI Netbanking. An immutable webhook arrives, signature verified. ₹24,999.00 is recovered into the merchant account, and an immutable SHA-256 audit trail entry is sealed."
- **Visual**:
  - Case updated to `RECOVERED`, ₹24,999.00 gross recovery confirmed.

---

### 4:45 – 5:00 | 100,000-Case Scale Benchmark Proof & Conclusion
- **Narration**:
  > "This is not a toy demo. Across 100,000 deterministic cases spanning 15 outage categories:
  > - Control Baseline (Single Retry) recovered 10.2% (₹15.13 Cr).
  > - REVIVE recovered 21.2% (₹31.45 Cr).
  > - That is an absolute uplift of +11.0 percentage points and a **+107.8% relative net revenue lift** (₹16.31 Cr net gain).
  > - Hard safety violations: Exactly 0.
  > 
  > **REVIVE does not give an AI agent permission to move money. It gives AI enough intelligence to recommend what should happen, and gives deterministic software the authority to decide whether it is allowed to happen.**"
