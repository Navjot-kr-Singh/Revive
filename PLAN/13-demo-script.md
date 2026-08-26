# REVIVE — Demo Script

## Hero Demo Scenario

### Merchant: Acme Electronics

**Normal state:** 96% payment success rate

### Incident Injection
Bank X payment degradation:
- Success rate drops: 96% → 73%
- Revenue at risk: ~₹12.7L/hour
- Affected: Bank X + UPI + specific time window

---

## Five-Minute Pitch

### 0:00 — The Problem (30s)
> "Every day, merchants lose revenue to payment failures. Not fraud — operational failures. Bank timeouts, network errors, checkout abandonment. Today, merchants either ignore these losses or blindly retry everything. Neither works."

### 0:30 — Revenue at Risk (30s)
> "Meet Acme Electronics. They're processing ₹50L/day with a 96% success rate. That 4% failure rate? That's ₹2L/day in lost revenue. But what happens when a bank has a bad day?"

*[Show Control Room — normal state]*

### 1:00 — Live Incident (30s)
> "Bank X just degraded. Success rate dropped from 96% to 73% for UPI payments. Revenue at risk just jumped to ₹12.7L/hour."

*[Trigger incident → Show detection in real-time]*

### 1:30 — AI Investigation (30s)
> "REVIVE detected this in under 30 seconds. The agent investigated — it pulled payment data, customer histories, failure patterns. It identified: Bank X, UPI, specific error signature, and a time window."

*[Show case detail → AI analysis → evidence panel]*

### 2:00 — Counterfactual Simulation (30s)
> "Here's what makes REVIVE different. For every affected transaction, we simulate multiple recovery strategies and calculate expected outcomes."

*[Show intervention simulator with 5 options]*

> "Do nothing? 4% recovery. Retry? 31%. Payment link? 22%. Alternative method? 37%. Each with cost, friction, and risk calculated."

### 2:30 — Policy Gate (30s)
> "The agent selected 'alternative payment method' as optimal. But before execution, every action goes through our deterministic policy engine. Maximum retries? Check. Amount limits? Check. Customer contact limits? Check. No AI makes financial decisions — policy does."

*[Show policy evaluation]*

### 3:00 — Recovery Execution (30s)
> "Approved actions execute through bounded workflows. Razorpay test mode processes the recovery. Webhooks confirm outcomes. The loop closes."

*[Show recovery action → success]*

### 3:30 — Actual Recovery (30s)
> "This is the number that matters: actual recovered revenue. Not predicted. Not simulated. Actual money that would have been lost."

*[Show recovered revenue metric updating]*

### 4:00 — Baseline vs REVIVE (30s)
> "We ran 50,000+ synthetic transactions through both a baseline and REVIVE. The results:"

*[Show experiment dashboard]*

> "Baseline: 12.7% recovery. REVIVE: 31.4%. That's a 2.47× improvement in recovery rate."

### 4:30 — Architecture (15s)
> "Under the hood: modular monolith on Next.js, PostgreSQL for the source of truth, deterministic policy engine, AI for investigation and reasoning, closed-loop measurement."

### 4:45 — Why This Matters (15s)
> "REVIVE does not measure whether an AI agent can make a decision. It measures whether that decision recovered money."

---

## Demo Controls

| Endpoint | Purpose |
|----------|---------|
| `POST /api/demo/reset` | Reset to clean state |
| `POST /api/demo/run-incident` | Trigger Bank X degradation |
| `POST /api/demo/run-recovery` | Execute recovery for all cases |

---

## Fallback Demo

If external services fail:
1. Switch to `DEMO_MODE=true`
2. All AI uses deterministic fallback
3. Payment execution is simulated
4. All data is synthetic
5. Demo still demonstrates full loop

The demo MUST work offline.
