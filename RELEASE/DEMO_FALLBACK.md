# REVIVE — Deterministic Demo Fallback & Execution Guide

## 1. Demo Execution Principle
> **The live competition demonstration must NEVER fail due to external internet latency, LLM rate limits, third-party gateway downtime, or unseeded local state.**

REVIVE includes a self-contained, 100% deterministic demo harness (`scripts/demo-final.ts`) that executes locally in under 3 seconds without external dependencies.

---

## 2. What Is Real vs What Is Simulated in the Demo

| Component | What Is Real (Production Software) | What Is Simulated (Test Fixture) |
|---|---|---|
| **Anomaly Detection** | Real sliding-window streaming aggregator & baseline z-score algorithm (`aggregation-engine.ts`) | Historical telemetry events generated from deterministic Indian payment switch physics |
| **Root Cause Investigation** | Real hypothesis scoring, evidence extraction, and contradiction detection logic | LLM inference uses the local deterministic investigator fallback to guarantee $< 100\text{ms}$ latency |
| **Counterfactual Simulator** | Real integer minor units (paise) Net Expected Value calculation engine (`simulator.ts`) | Action costs and customer friction parameters |
| **Policy Engine** | Real 12-rule deterministic policy evaluator (`policy-rules.ts`) | Merchant policy configuration loaded from seed database |
| **Action Execution** | Real state machine transitions, PostgreSQL transactions, and Level-1 unique index locks | Upstream payment gateway dispatch calls Razorpay Test Adapter with simulated TCP reset hook |
| **Reconciliation Engine** | Real background reconciliation poller, state resolver, and audit logger | Gateway status polling resolves against local mock reference registry |
| **Settlement Proof** | Real HMAC webhook signature verification and prediction variance calculation | Webhook payload simulated locally |

---

## 3. Demo Failure Modes & Instant Recovery Commands

### Mode A: Primary CLI Demo (Recommended for Judges)
```bash
npm run demo:final
```
- **Execution Time**: ~2.5 seconds
- **Output**: Beautiful, timed terminal walkthrough displaying detection, AI evidence, EV simulation, policy rejection, network drop, reconciliation, settlement proof, and 100k scale summary.

### Mode B: Full Interactive Browser Demo
```bash
# 1. Seed fresh demo state
npm run db:seed

# 2. Open dashboard
open http://localhost:3000/dashboard
```
- **Live Screens**:
  - `/dashboard`: Shows live control room and ₹12,49,500 GMV at risk.
  - `/dashboard/cases/case_hdfc_upi_24999`: Shows candidate EV matrix, policy denial, and execution.
  - `/dashboard/review`: Shows high-value orders in the operator escalation queue.

### Mode C: Emergency Offline Fallback (If Node.js / Database Offline)
- Open [`RELEASE/MASTER_DEMO_SCRIPT.md`](file:///Users/navjotkumarsingh/Desktop/Revive/RELEASE/MASTER_DEMO_SCRIPT.md) and [`PLAN/demo/presentation-deck.md`](file:///Users/navjotkumarsingh/Desktop/Revive/PLAN/demo/presentation-deck.md).
- Explain: *"We will switch to the deterministic verification log so the architecture remains fully reproducible."*
