# REVIVE — 5-Minute Master Hackathon Demo Script
**Dramatic Progression & Timed Narration Flow**

---

## ⏱️ Precise Timeline & Presenter Cues

### [0:00 – 0:20] The Opening Hook
- **Visual**: Blank screen $\to$ Focus on Presenter.
- **Presenter**:
  > *"Watch a ₹24,999 payment fail in real time."*
- **Action**: Display checkout error notification for ₹24,999.00 order.

### [0:20 – 0:40] The Conventional Gateway Mistake
- **Visual**: Payment gateway error log showing `PAYMENT_FAILED: NPCI_UPI_TIMEOUT`.
- **Presenter**:
  > *"Most payment systems would blindly retry that same UPI rail, fail again, and trigger an issuer velocity ban. REVIVE asks a completely different question: Why did it fail?"*

### [0:40 – 1:00] Real-Time Telemetry & Anomaly Ingestion
- **Visual**: Open Control Room ([`/dashboard`](file:///Users/navjotkumarsingh/Desktop/Revive/src/app/dashboard/page.tsx)). Show streaming metrics card (4.5M ev/s).
- **Presenter**:
  > *"REVIVE is processing live telemetry across millions of events. Look at this spike: HDFC Bank UPI failure rates have jumped from a normal 1.4% baseline to 24.5%. The incident detector opens INC-HDFC-UPI-001 with ₹12,49,500 of GMV at risk."*

### [1:00 – 1:40] AI Root Cause Investigation & Evidence Grounding
- **Visual**: Click into incident details view; open Evidence Drawer.
- **Presenter**:
  > *"REVIVE activates the AI Root Cause Investigator. Notice how it synthesizes dimensional signals into an immutable Evidence Bag:
  > - E-101: HDFC UPI failure rate at 24.5%.
  > - E-102: 92.4% of active timeouts isolated to HDFC.
  > - E-103: HDFC Debit Cards remain healthy at 2.1%.
  > - E-104: SBI and ICICI UPI switches are normal at 1.8%.
  > 
  > The AI diagnoses BANK_PAYMENT_METHOD_DEGRADATION with 98% confidence. Zero hallucinations — every single fact is cryptographically grounded in active telemetry."*

### [1:40 – 2:20] Competing Hypotheses & Counterfactual Simulation
- **Visual**: Open Case `#case_hdfc_upi_24999`. Display Candidate Simulation Matrix.
- **Presenter**:
  > *"For this failed ₹24,999 transaction, our Counterfactual Simulator models 6 recovery actions using exact integer paise arithmetic. 
  > - Alternative Rail switching yields the highest theoretical return at ₹9,497.62 Net EV.
  > - Multi-Rail Payment Link yields ₹5,247.79 Net EV.
  > - Blind Retry yields only ₹2,998.38 Net EV."*

### [2:20 – 3:10] 🔥 THE WOW MOMENT: Policy Denies Highest-EV & Safe Fallback
- **Visual**: Trigger Decision Evaluation. Policy log displays Candidate 1: `ALTERNATIVE_PAYMENT_METHOD` in RED `DENIED`.
- **Presenter**:
  > *"Here is why REVIVE is different. An unconstrained AI agent would immediately execute Candidate 1 because the math says ₹9,497. 
  > 
  > **REVIVE's 12-rule Policy Engine evaluates merchant rules and DENIES Candidate 1!**"*
- **Action**: *(Pause for 2 seconds to let the denial sink in).*
- **Presenter**:
  > *"Why? The merchant’s policy disables automated routing changes to avoid interchange variance. Under Constrained Autonomy, REVIVE does not fail or halt — it automatically evaluates Candidate 2: SEND_PAYMENT_LINK (Net EV ₹5,247.79). It passes all 12 policy rules and is APPROVED for safe execution."*

### [3:10 – 3:45] Safe Action Execution & Adversarial Fault Injection
- **Visual**: Dispatch execution. Inject upstream network drop.
- **Presenter**:
  > *"ActionExecutor re-validates the live policy hash and dispatches the multi-rail checkout link. But watch: upstream TCP connection reset! The gateway drops the network response."*

### [3:45 – 4:20] Refusal to Guess & Background Reconciliation
- **Visual**: Action state transitions to amber `UNKNOWN`.
- **Presenter**:
  > *"An ordinary system would panic or blindly retry, risking double charges. **REVIVE refuses to guess.** It transitions the action to UNKNOWN, refuses blind retries, and triggers the background reconciler.
  > 
  > The reconciler polls the gateway's external reference key, confirms the checkout link was created, and transitions safely to SUCCEEDED."*

### [4:20 – 4:45] Settlement Verification & Proven Revenue
- **Visual**: Show incoming webhook signature verification. Case status changes to green `RECOVERED`.
- **Presenter**:
  > *"The customer completes payment via ICICI Netbanking. An immutable payment.captured webhook arrives with verified signature. 
  > 
  > Gross recovered: ₹24,999.00. Audit trail sealed."*

### [4:45 – 5:00] Scale Benchmark Proof & Closing Statement
- **Visual**: Display 100k Benchmark Summary slide (+107.8% Net Lift).
- **Presenter**:
  > *"Across 100,000 deterministic benchmark cases:
  > - Control Baseline recovered 10.2% (₹15.13 Cr).
  > - REVIVE recovered 21.2% (₹31.45 Cr).
  > - That is +11.0 percentage points and a **+107.8% relative net revenue lift** with exactly zero unsafe financial actions.
  > 
  > **REVIVE does not give an AI agent permission to move money. It gives AI enough intelligence to recommend what should happen, while deterministic policy and execution systems decide what is actually allowed to happen.**"*
- **Action**: *(Stop speaking immediately).*
