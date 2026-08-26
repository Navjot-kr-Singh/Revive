# REVIVE — System Architecture

## 1. Architecture Overview

REVIVE is a **modular monolith** deployed on Vercel with managed backend services. It uses event-driven internal processing with strong domain boundaries.

```
                     ┌─────────────────────────┐
                     │        USER              │
                     │ Merchant / Operator      │
                     └────────────┬─────────────┘
                                  │
                                  ▼
                     ┌─────────────────────────┐
                     │       Next.js UI         │
                     │ Revenue Control Room     │
                     └────────────┬─────────────┘
                                  │
                                  ▼
                     ┌─────────────────────────┐
                     │      API / BFF           │
                     └────────────┬─────────────┘
                                  │
            ┌─────────────────────┼─────────────────────┐
            │                     │                     │
            ▼                     ▼                     ▼
   ┌────────────────┐   ┌────────────────┐   ┌────────────────┐
   │ Revenue Engine  │   │ Decision Engine│   │ Audit Service  │
   └───────┬────────┘   └───────┬────────┘   └───────┬────────┘
           │                    │                    │
           ▼                    ▼                    ▼
   ┌────────────────┐   ┌────────────────┐   ┌────────────────┐
   │ Case Builder    │   │ Policy Engine  │   │ Audit Ledger   │
   └───────┬────────┘   └───────┬────────┘   └────────────────┘
           │                    │
           ▼                    ▼
   ┌────────────────┐   ┌────────────────┐
   │ Root Cause AI   │   │ Recovery       │
   │ / ML            │   │ Simulator      │
   └───────┬────────┘   └───────┬────────┘
           │                    │
           └──────────┬─────────┘
                      ▼
             ┌─────────────────┐
             │ Recovery Agent   │
             └────────┬────────┘
                      │
                Policy Gate
                      │
                      ▼
             ┌─────────────────┐
             │ Action Executor  │
             └────────┬────────┘
                      │
           ┌──────────┴──────────┐
           ▼                     ▼
   Razorpay Test Mode     Notification Service
           │
           ▼
         Events
           │
           ▼
    Outcome Measurement
           │
           └──────────► Revenue Engine
```

## 2. Infrastructure Components

| Component | Service | Purpose |
|-----------|---------|---------|
| Frontend + API | **Vercel / Next.js** | UI, API routes, BFF |
| Authentication | **Clerk** | Auth, sessions, user identity |
| Database | **Supabase PostgreSQL** | Source of truth |
| Cache | **Upstash Redis** | Rate limiting, idempotency, locks |
| Background Jobs | **Trigger.dev** | Durable workflows, batch processing |
| Payments | **Razorpay Test Mode** | Payment operations (server-side only) |
| AI | **LLM Provider (abstracted)** | Case analysis, root cause, explanation |
| Email | **Resend** (if needed) | Recovery notifications |
| Observability | **Sentry** | Error tracking, correlation IDs |
| Deployment | **Vercel** | Managed hosting |

## 3. Domain Modules

### 3.1 Revenue Engine
- Event ingestion and deduplication
- Revenue-at-risk calculation
- Case creation and management
- State machine enforcement

### 3.2 Decision Engine
- Recovery probability estimation
- Counterfactual intervention simulation
- Expected value calculation
- Intervention ranking

### 3.3 Policy Engine
- Deterministic rule evaluation
- Boundary enforcement (retry limits, amount caps)
- Human escalation triggers
- Merchant-specific policies

### 3.4 Recovery Agent
- AI-powered root cause analysis
- Evidence gathering via structured tools
- Intervention recommendation
- Decision explanation

### 3.5 Action Executor
- Recovery action dispatch
- Razorpay API integration
- Notification dispatch
- Outcome observation

### 3.6 Audit Service
- Append-only audit ledger
- Decision tracing
- Compliance logging
- Event correlation

### 3.7 Evaluation Framework
- Synthetic data generation
- Experiment assignment
- Baseline vs REVIVE comparison
- Metric collection and reporting

## 4. Data Flow

### 4.1 Event Ingestion
```
External Event → API → Idempotency Check → Event Store → Revenue Engine → Case Builder
```

### 4.2 Recovery Loop
```
Case Created → AI Analysis → Simulation → Decision → Policy Gate → Execute → Observe → Measure
```

### 4.3 Audit Flow
```
Every state change → Audit Event → Audit Ledger (append-only)
```

## 5. Key Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| Modular monolith over microservices | One-week hackathon; managed complexity |
| Adapter pattern for all external services | Swap vendors; local fallbacks |
| Append-only events | Auditability; reproducibility |
| BIGINT for money | Financial correctness |
| Deterministic fallback mode | Demo reliability |
| Server-side authorization | Security; never trust client |
| Background workflows for AI | Don't block HTTP requests |

## 6. Security Architecture

- All API routes require Clerk authentication
- Every business query filtered by `merchant_id`
- Razorpay secrets server-side only
- Webhook signatures verified
- LLM has allowlisted tools only
- No raw SQL from user input
- Rate limiting via Upstash Redis
- Structured logging with PII masking

## 7. Deployment Architecture

```
Vercel (Next.js)
  ├── API Routes (serverless functions)
  ├── React Server Components
  └── Static assets

Supabase (PostgreSQL)
  ├── Migrations
  ├── Indexes
  └── RLS where applicable

Upstash Redis
  ├── Rate limiting
  ├── Idempotency keys
  └── Temporary state

Trigger.dev
  ├── AI analysis workflows
  ├── Batch simulation jobs
  └── Recovery execution workflows
```
