# REVIVE — 5-Minute Master Hackathon Presentation Script

## Key Information
- **Title**: REVIVE: Autonomous Revenue Recovery Control Plane
- **Presenter**: Technical Lead / Architect
- **Target Audience**: Senior Fintech Judges, Distributed Systems Engineers, ML Architects
- **Execution Command**: `npm run demo:final`
- **Dashboard URL**: `http://localhost:3001/dashboard`

---

## ⏱️ Timeline & Narration

### [0:00 – 0:20] Slide 1 & 2: The $400B Problem
- **Narration**:
  > "Every year, digital commerce loses hundreds of billions to failed transactions. But here is the dirty secret of payment infrastructure: when payment rails fail — like an HDFC Bank UPI degradation — payment gateways blindly retry on the broken rail, failing 88% of the time. Monitoring dashboards alert you after the fact, but can't act. Unconstrained AI bots are too dangerous to move money. REVIVE bridges this gap."

### [0:20 – 0:40] Control Room Overview
- **Action**: Open [`/dashboard`](file:///Users/navjotkumarsingh/Desktop/Revive/src/app/dashboard/page.tsx).
- **Narration**:
  > "Welcome to the REVIVE Control Room. REVIVE connects payment observability, AI root cause diagnosis, counterfactual simulation, deterministic risk governance, and safe execution into one closed control loop."

### [0:40 – 1:00] The Hero Incident Triggered
- **Action**: Trigger `INC-HDFC-UPI-001`.
- **Narration**:
  > "We're observing a live stream processing over 4.5 million events per second. Look: HDFC UPI error rates spike from 1.4% to 24.5%. An anomaly is detected, INC-HDFC-UPI-001 is opened, and ₹12,49,500.00 of GMV is immediately identified at risk."

### [1:00 – 1:50] AI Root Cause Investigation & Evidence Bag
- **Action**: Open incident details view.
- **Narration**:
  > "REVIVE's AI Root Cause Investigator synthesizes dimensional telemetry. Notice: it isolates HDFC UPI timeouts from HDFC Debit Cards (which remain healthy at 2.1%) and SBI UPI (healthy at 1.8%). It outputs BANK_PAYMENT_METHOD_DEGRADATION with 98% confidence. Every fact is cryptographically grounded in active telemetry with zero unsupported claims."

### [1:50 – 2:40] Counterfactual Simulation (Integer Minor EV)
- **Action**: Open Case `#case_hdfc_upi_24999` (Amount: ₹24,999.00).
- **Narration**:
  > "For this ₹24,999 failed checkout, the Counterfactual Simulator evaluates 6 candidate interventions using integer Net Expected Value. Alternative Rail switching yields the highest theoretical return at ₹9,497.62 Net EV, followed by Multi-Rail Payment Links at ₹5,247.79, and Blind Retries at only ₹2,998.38."

### [2:40 – 3:20] Policy Governance & Constrained Autonomy
- **Narration**:
  > "Here is our core law: **AI Recommends. Policy Decides. Executor Acts. Measurement Proves.** The merchant’s policy disables automated routing changes. The 12-rule Policy Engine strictly DENIES Candidate 1. Under Constrained Autonomy, REVIVE does not halt or fail — it safely selects Candidate 2: SEND_PAYMENT_LINK (Net EV ₹5,247.79), which passes all 12 policy rules."

### [3:20 – 4:00] Safe Execution & Adversarial Network Drop
- **Narration**:
  > "ActionExecutor re-validates the live policy hash and dispatches the payment link. But an upstream TCP connection reset drops the gateway response! An ordinary system would blindly retry and risk double-charging. REVIVE transitions the state to UNKNOWN, refuses blind retries, and triggers the background reconciler."

### [4:00 – 4:40] Reconciliation & Settlement Verification
- **Narration**:
  > "The reconciler polls the provider's external reference key, confirms the link is active, and transitions state to SUCCEEDED. The customer completes payment via ICICI Netbanking. An immutable webhook arrives, signature verified, and ₹24,999.00 is recovered into the merchant account."

### [4:40 – 5:00] 100K Benchmark Proof & Final Line
- **Action**: Show 100k Benchmark Summary.
- **Narration**:
  > "Across 100,000 deterministic benchmark cases spanning 15 outage categories:
  > - Control Baseline (Single Retry) recovered 10.2% (₹15.13 Cr).
  > - REVIVE recovered 21.2% (₹31.45 Cr).
  > - That is an absolute uplift of +11.0 percentage points and a **+107.8% relative net revenue lift** with exactly zero unsafe actions.
  > 
  > **REVIVE does not give an AI agent permission to move money. It gives AI enough intelligence to recommend what should happen, while deterministic policy and execution systems decide what is actually allowed to happen.**"

*(Stop speaking immediately).*
