# REVIVE — System Architecture (Detailed)

## Component Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                         VERCEL                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    Next.js Application                       │ │
│  │                                                             │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │ │
│  │  │  React UI    │  │  API Routes  │  │  Server Actions  │  │ │
│  │  │  (App Router)│  │  (/api/*)    │  │                  │  │ │
│  │  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘  │ │
│  │         │                 │                    │             │ │
│  │         └─────────────────┼────────────────────┘             │ │
│  │                           │                                  │ │
│  │              ┌────────────┴────────────┐                     │ │
│  │              │    Service Layer         │                     │ │
│  │              │  ┌──────────────────┐   │                     │ │
│  │              │  │ Revenue Engine   │   │                     │ │
│  │              │  │ Decision Engine  │   │                     │ │
│  │              │  │ Policy Engine    │   │                     │ │
│  │              │  │ Recovery Agent   │   │                     │ │
│  │              │  │ Action Executor  │   │                     │ │
│  │              │  │ Audit Service    │   │                     │ │
│  │              │  │ Eval Framework   │   │                     │ │
│  │              │  └──────────────────┘   │                     │ │
│  │              └────────────┬────────────┘                     │ │
│  │                           │                                  │ │
│  │              ┌────────────┴────────────┐                     │ │
│  │              │    Adapter Layer         │                     │ │
│  │              │  ┌──────────────────┐   │                     │ │
│  │              │  │ DatabaseAdapter  │   │                     │ │
│  │              │  │ AIAdapter        │   │                     │ │
│  │              │  │ PaymentAdapter   │   │                     │ │
│  │              │  │ CacheAdapter     │   │                     │ │
│  │              │  │ EmailAdapter     │   │                     │ │
│  │              │  │ WorkflowAdapter  │   │                     │ │
│  │              │  └──────────────────┘   │                     │ │
│  │              └─────────────────────────┘                     │ │
│  └─────────────────────────────────────────────────────────────┘ │
└────────────┬──────────┬──────────┬──────────┬───────────────────┘
             │          │          │          │
             ▼          ▼          ▼          ▼
        ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
        │Supabase│ │Upstash │ │Trigger │ │Razorpay│
        │Postgres│ │Redis   │ │.dev    │ │Test    │
        └────────┘ └────────┘ └────────┘ └────────┘
             │
             ▼
        ┌────────┐  ┌────────┐  ┌────────┐
        │ Clerk  │  │  LLM   │  │ Sentry │
        └────────┘  └────────┘  └────────┘
```

## Request Flow: Event → Recovery

```mermaid
sequenceDiagram
    participant W as Webhook/API
    participant E as Event Ingestion
    participant R as Revenue Engine
    participant A as AI Agent
    participant S as Simulator
    participant P as Policy Engine
    participant X as Action Executor
    participant O as Outcome Observer
    participant AU as Audit Service

    W->>E: POST /api/events (payment.failed)
    E->>E: Idempotency check
    E->>R: Process event
    R->>R: Create revenue case (NEW)
    R->>AU: audit: case.created
    R->>A: Analyze case
    A->>A: Gather evidence (tools)
    A->>A: Classify failure
    A->>A: Estimate probability
    A->>AU: audit: case.analyzed
    A->>S: Simulate interventions
    S->>S: Calculate 5 options
    S->>S: Rank by expected value
    S->>AU: audit: intervention.simulated
    S->>P: Check policy for best option
    P->>P: Evaluate all rules
    P->>AU: audit: decision.created
    alt Approved
        P->>X: Execute recovery action
        X->>X: Dispatch (Razorpay/notification)
        X->>AU: audit: recovery.action_started
        X->>O: Wait for outcome
        O->>O: Verify recovery
        O->>R: Update case outcome
        O->>AU: audit: recovery.completed
    else Blocked
        P->>AU: audit: policy.violation
        P->>R: Update case (STOPPED)
    else Escalated
        P->>AU: audit: human.escalation
        P->>R: Update case (ESCALATED)
    end
```
