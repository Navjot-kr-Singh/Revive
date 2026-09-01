# REVIVE — Final 5-Minute Competition Presentation Guide

**Target Presentation Duration**: Exactly 5:00 Minutes | **Command**: `npm run demo:final`

---

## ⏱️ Section-by-Section Script & Presenter Cues

### [0:00 – 0:30] The Hook: The $400B Decision Dilemma
- **Visual**: Blank screen or Title Slide.
- **Presenter**:
  > *"Every failed payment creates a critical decision:
  > Retry on the same rail? Switch switches? Send an instant payment link? Or escalate?
  > 
  > Today, digital commerce loses over $400 Billion annually because traditional payment gateways blindly retry on degraded banking rails, failing 88% of the time. Monitoring dashboards alert engineers after revenue is lost, and unconstrained AI bots are far too dangerous to touch money.
  > 
  > REVIVE closes that gap."*

### [0:30 – 1:15] What REVIVE Is: The Closed Recovery Loop
- **Visual**: Show Control Room ([`/dashboard`](file:///Users/navjotkumarsingh/Desktop/Revive/src/app/dashboard/page.tsx)).
- **Presenter**:
  > *"REVIVE is an Autonomous Revenue Recovery Control Plane. It unites high-volume telemetry observation, AI root-cause diagnosis, integer economic simulation, deterministic risk governance, and safe execution into one closed control loop:
  > **Observe $\to$ Detect $\to$ Investigate $\to$ Simulate $\to$ Govern $\to$ Decide $\to$ Act $\to$ Reconcile $\to$ Measure.**"*

### [1:15 – 2:00] Architecture & The AI Safety Wall
- **Visual**: Show Architecture Diagram ([`RELEASE/ARCHITECTURE_TALK.md`](file:///Users/navjotkumarsingh/Desktop/Revive/RELEASE/ARCHITECTURE_TALK.md)).
- **Presenter**:
  > *"Here is our core architectural law:
  > **AI Recommends. Policy Decides. Executor Acts. Measurement Proves.**
  > 
  > The AI service has zero database mutation credentials and zero payment execution authority. It extracts cryptographically grounded Evidence Bags with zero hallucination. 
  > 
  > A deterministic 12-rule TypeScript policy engine holds 100% of the authorization authority, enforcing merchant budgets, velocity limits, and acquirer allowlists."*

### [2:00 – 3:30] The Master Hero Demo (₹24,999 Checkout Recovery)
- **Visual**: Run terminal demo `npm run demo:final` or display Case Screen ([`/dashboard/cases/case_hdfc_upi_24999`](file:///Users/navjotkumarsingh/Desktop/Revive/src/app/dashboard/cases/case_hdfc_upi_24999)).
- **Presenter**:
  > *"Watch this ₹24,999 failed checkout:
  > 1. Ingestion: In-memory stream flags HDFC UPI failure spike from 1.4% to 24.5%.
  > 2. AI Diagnosis: Isolates BANK_PAYMENT_METHOD_DEGRADATION with 98% confidence.
  > 3. Simulator: Evaluates 6 candidates—Alternative Rail yields ₹9,497 Net EV, Payment Link yields ₹5,247, Retry yields ₹2,998.
  > 4. Policy Rejection: Merchant policy **DENIES** Alternative Rail due to allowlist rules!
  > 5. Constrained Fallback: REVIVE does not halt—it safely approves Candidate 2: Payment Link.
  > 6. Network Failure: Upstream TCP connection reset occurs!
  > 7. Refusal to Guess: REVIVE refuses blind retries, marks state UNKNOWN, and invokes the background reconciler.
  > 8. Reconciliation: Provider reference confirms link active $\to$ customer completes ICICI checkout $\to$ **₹24,999 recovered into the merchant account.**"*

### [3:30 – 4:15] Verified Benchmark Results
- **Visual**: Display 100k Benchmark Slide.
- **Presenter**:
  > *"Across 100,000 deterministic benchmark cases evaluated across 15 failure categories:
  > - Control Baseline (Single Retry) recovered 10.2% (₹15.14 Cr).
  > - REVIVE recovered 21.2% (₹31.45 Cr).
  > - That is an absolute uplift of +11.0 percentage points and a **+107.8% relative net revenue lift (+₹16.31 Crores)**.
  > - Hard safety violations: exactly zero across all 100,000 cases.
  > - Holdout probability calibration: Brier 0.1244, ECE 0.56%."*

### [4:15 – 4:45] Business Impact & ROI
- **Visual**: Display Business Value derivation.
- **Presenter**:
  > *"For an enterprise merchant processing ₹100 Crores monthly with a 10% failure rate, REVIVE recovers an incremental ₹1.10 Crores monthly. At a 2.5% success fee, the merchant captures over ₹1.03 Crores in pure net cash monthly—a **19.4x software ROI**."*

### [4:45 – 5:00] The Unforgettable Closing Statement
- **Presenter**:
  > *"REVIVE does not give an AI agent permission to move money.
  > 
  > It gives AI enough intelligence to recommend what should happen, while deterministic policy and execution systems decide what is actually allowed to happen."*
- **Action**: *(Stop speaking immediately).*
