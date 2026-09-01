# REVIVE — Complete 5-Minute Video Walkthrough Script

**Target Duration**: Exactly 5:00 Minutes | **Format**: Screen Recording + Voiceover Walkthrough  
**Project**: REVIVE — Autonomous Revenue Recovery Control Plane

---

## 🎬 Video Overview & Recording Setup

### Recommended Recording Layout:
- **Primary Window**: Google Chrome opened at `http://localhost:3000` (or your deployed Vercel URL).
- **Secondary Window**: Terminal side-by-side or picture-in-picture ready to show CLI commands (`npm test`, `npm run demo:final`).
- **Audio Quality**: Clear, confident, technical, and well-paced.

---

## ⏱️ Detailed Minute-by-Minute Script

---

### Part 1: The $400B Dilemma & Project Overview
**Timestamp: `[0:00 – 0:45]` | Duration: 45 Seconds**

#### 🖥️ What to Show on Screen:
1. Start on the **Revenue Control Room** (`/dashboard`).
2. Point cursor at the **Revenue at Risk (₹12.5L)** and **Revenue Recovered** metric cards.

#### 🎙️ Voiceover Script:
> *"Hello judges! Every single day, digital commerce loses over $400 Billion to failed online payments.
>
> When an underlying banking rail degrades—such as an issuer bank UPI switch timeout or gateway latency spike—traditional payment systems do one of two things: they either alert engineers hours too late on Grafana dashboards after the revenue is already lost, or they blindly retry the payment on the exact same broken rail, which fails over 88% of the time.
>
> Meanwhile, giving unconstrained AI agents permission to move money is dangerous and unacceptable in fintech.
>
> Welcome to **REVIVE** — an Autonomous Revenue Recovery Control Plane. 
>
> REVIVE unites high-throughput telemetry observation, zero-trust AI root-cause diagnosis, counterfactual economic simulation, deterministic risk governance, and safe execution into one closed control loop:
> **Observe $\to$ Detect $\to$ Investigate $\to$ Simulate $\to$ Govern $\to$ Decide $\to$ Act $\to$ Reconcile $\to$ Measure.**"*

---

### Part 2: The Core Architecture & Zero-Trust AI Safety Wall
**Timestamp: `[0:45 – 1:30]` | Duration: 45 Seconds**

#### 🖥️ What to Show on Screen:
1. Switch briefly to the terminal or show an architectural slide illustrating the 5-layer pipeline.
2. Navigate to **Cases** (`/dashboard/cases`) and select `case_hdfc_upi_24999`.

#### 🎙️ Voiceover Script:
> *"Before diving into live cases, let's understand REVIVE's unshakeable architectural law:
> **AI Recommends. Policy Decides. Executor Acts. Measurement Proves.**
>
> In REVIVE, the AI has **zero database mutation credentials** and **zero payment execution authority**. 
>
> Instead, our in-memory streaming aggregator ingests payment events at over **4.5 Million events per second**, computing statistical z-score baselines across multidimensional slices: merchant, acquiring bank, payment rail, and error code.
>
> When an anomaly occurs, our AI investigator extracts structured, cryptographically grounded **Evidence Bags**. It evaluates competing hypotheses—distinguishing bank switch degradation from gateway timeouts—with a verified **0.0% hallucination rate**."*

---

### Part 3: Live Case Walkthrough — Counterfactual Net EV & Policy Gating
**Timestamp: `[1:30 – 2:30]` | Duration: 60 Seconds**

#### 🖥️ What to Show on Screen:
1. On the **Case Detail Screen** (`/dashboard/cases/[id]`), scroll down to the **Counterfactual Recovery Simulation Matrix**.
2. Highlight **Candidate 1: ALTERNATIVE_PAYMENT_METHOD (DENIED - Red Badge)**.
3. Highlight **Candidate 2: SEND_PAYMENT_LINK (SELECTED - Green Badge)**.

#### 🎙️ Voiceover Script:
> *"Let's look at this live case: a ₹24,999 checkout failed due to an HDFC UPI timeout.
>
> Here is what happens inside REVIVE:
> 
> **1. Counterfactual Simulation:** REVIVE's simulator evaluates 6 candidate interventions in pure CPU memory using integer minor-unit arithmetic (paise) and basis points:
> - Switching to Alternative Rail yields 38% recovery probability and a Net Expected Value (EV) of **₹9,497**.
> - Sending an Instant Multi-Rail Payment Link yields 21% recovery probability and a Net EV of **₹5,247**.
> - Blind Retry yields only 12% probability and **₹2,998** Net EV.
>
> **2. Deterministic Policy Gating:** Why didn't REVIVE automatically switch rails, since it had the highest EV?
> Because the merchant's policy rule—`MERCHANT_ACTION_ALLOWLIST`—explicitly prohibits autonomous routing mutations!
>
> **3. Constrained Autonomy:** Instead of crashing or doing nothing, REVIVE's policy engine safely rejects Candidate 1 and approves Candidate 2: `SEND_PAYMENT_LINK`."*

---

### Part 4: Safe Execution, Network Drops & Fault-Tolerant Reconciliation
**Timestamp: `[2:30 – 3:15]` | Duration: 45 Seconds**

#### 🖥️ What to Show on Screen:
1. Point to the **Execution & State Machine Transition** timeline on the Case Screen.
2. Show the **Actual Recovery: ₹24,999.00** and **Positive Variance** KPI card.

#### 🎙️ Voiceover Script:
> *"Now watch what happens during execution:
>
> **1. Two-Level Idempotency:** The action executor generates a deterministic idempotency key and locks the database row, preventing race conditions.
>
> **2. Handling Network Drops:** When dispatching the link to the payment gateway, what if an upstream network drop occurs? 
> Traditional systems blindly retry and risk double-charging customers. REVIVE **strictly refuses to guess**. It transitions the case to `UNKNOWN` and invokes our background reconciler.
>
> **3. Verified Settlement:** The reconciler polls the external gateway reference, confirms the link was generated, the customer completes checkout via ICICI Netbanking, and a cryptographically signed `payment.captured` webhook verifies the settlement.
>
> Exactly **₹24,999.00** in cold hard cash is recovered into the merchant's account."*

---

### Part 5: Interactive Simulator Sandbox & Human Review Queue
**Timestamp: `[3:15 – 4:00]` | Duration: 45 Seconds**

#### 🖥️ What to Show on Screen:
1. Click **Simulator** in the sidebar (`/dashboard/simulator`).
2. Click the preset button **"Hero Demo: HDFC UPI Outage (₹24,999)"** and show real-time Net EV ranking.
3. Change the amount to `₹75,000` or select **"High-Value VIP Order"** preset.
4. Click **Human Review** in the sidebar (`/dashboard/review`) to show the operator queue with `APPROVE` / `REJECT` buttons.

#### 🎙️ Voiceover Script:
> *"Next, let's explore the **Interactive Simulator Sandbox** (`/dashboard/simulator`).
>
> Here, operators and financial risk officers can adjust transaction amounts, acquiring banks, payment methods, and failure codes to test the policy engine in real time.
>
> For example, if an order exceeds ₹50,000, Policy Rule 7 triggers a **High-Value Escalation**. 
>
> Over on the **Human Review Queue** (`/dashboard/review`), all escalated transactions appear in a dedicated operator dashboard. Payment ops teams can review the AI diagnostic evidence and approve, reject, or modify recovery actions with a single click."*

---

### Part 6: Empirical Benchmark Proof & Cryptographic Audit Ledger
**Timestamp: `[4:00 – 4:35]` | Duration: 35 Seconds**

#### 🖥️ What to Show on Screen:
1. Click **Experiments** in the sidebar (`/dashboard/experiments`).
2. Show the **100,000-Case Benchmark table** (+107.8% relative lift).
3. Switch to the **5-Tier Ablation** tab and **Holdout Calibration** tab (Brier: 0.1244).
4. Click **Audit** in the sidebar (`/dashboard/audit`) and expand an event payload.

#### 🎙️ Voiceover Script:
> *"REVIVE is not just a concept—it is backed by rigorous empirical proof:
>
> In our **100,000-Case Recovery Benchmark** (`/dashboard/experiments`):
> - The industry-standard Single Retry baseline recovered 10.2% (₹15.14 Crores).
> - REVIVE recovered **21.2% (₹31.45 Crores)**.
> - That is an absolute lift of **+11.0 percentage points** and a **+107.8% relative net revenue increase (+₹16.31 Crores)**.
> - Hard safety violations: **exactly zero**.
> - Holdout probability calibration: Brier score **0.1244**, ECE **0.56%**.
>
> And every single decision, AI diagnostic, and execution dispatch is immutably recorded in our **Cryptographic Audit Ledger** (`/dashboard/audit`) with SHA-256 integrity verification."*

---

### Part 7: Business Model & Unforgettable Closing
**Timestamp: `[4:35 – 5:00]` | Duration: 25 Seconds**

#### 🖥️ What to Show on Screen:
1. Return to the **Revenue Control Room** (`/dashboard`).
2. Show the active control plane status badge (`CONTROL PLANE ACTIVE`).

#### 🎙️ Voiceover Script:
> *"For an enterprise merchant processing ₹100 Crores monthly, REVIVE delivers over **₹1.03 Crores in pure net incremental cash monthly**—representing a **19.4x software ROI** on a 2.5% success-based fee.
>
> To conclude:
> **REVIVE does not give an AI agent permission to move money.**
> **It gives AI enough intelligence to recommend what should happen, while deterministic policy and execution systems decide what is actually allowed to happen.**
>
> Thank you!"*

---

## 📋 Feature & Functionality Checklist Covered in Video

| Functionality | Where Demonstrated | Key Concept Highlighted |
|---|---|---|
| **Real-Time Revenue Control Room** | `/dashboard` | Revenue at risk, recovered GMV, recovery efficiency rate |
| **High-Throughput Streaming Aggregation** | Architecture overview | 4.55M+ events/sec in-memory sliding-window anomaly detection |
| **AI Root Cause Investigator** | `/dashboard/cases/[id]` | Grounded Evidence Bags, hypothesis scoring, 0% hallucination |
| **Counterfactual Simulator** | `/dashboard/cases/[id]` & `/dashboard/simulator` | Integer Net Expected Value ($EV$), action cost, customer friction |
| **12-Rule Policy Gating Engine** | `/dashboard/cases/[id]` & `/dashboard/simulator` | Merchant allowlist rejection, velocity limits, constrained autonomy |
| **Safe Execution & Reconciler** | Case Detail timeline | Two-level idempotency, refusal of blind retries, `UNKNOWN` state |
| **Interactive Simulator Sandbox** | `/dashboard/simulator` | Live scenario parameter tuning, instant Net EV recomputation |
| **Human Review VIP Queue** | `/dashboard/review` | High-value order escalation ($> ₹50,000$), 1-click operator actions |
| **100k Benchmark & 5-Tier Ablation** | `/dashboard/experiments` | +107.8% net lift (+₹16.31 Cr), Brier calibration ($0.1244$) |
| **Cryptographic Audit Trail** | `/dashboard/audit` | Append-only ledger, SHA-256 signatures, raw JSON payload drawer |
