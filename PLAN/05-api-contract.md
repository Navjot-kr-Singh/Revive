# REVIVE — API Contract

## Conventions

- All endpoints under `/api/`
- Authentication required via Clerk (except webhooks)
- Merchant context derived from authenticated user's membership
- JSON request/response bodies
- ISO 8601 timestamps
- Monetary values in minor units with currency
- Pagination: `?page=1&limit=20`
- Correlation via `X-Request-Id` header

---

## Event Ingestion

### `POST /api/events`
Ingest external payment/revenue events.

**Request:**
```json
{
  "event_id": "evt_abc123",
  "event_type": "payment.failed",
  "source": "razorpay",
  "source_event_id": "pay_xyz789",
  "payload": { ... },
  "timestamp": "2026-08-26T00:00:00Z"
}
```

**Response:** `201 Created` or `200 OK` (idempotent)
```json
{
  "event_id": "evt_abc123",
  "processing_status": "processed",
  "case_id": "case_xyz" // if case was created
}
```

**Idempotency:** Duplicate (source, source_event_id) returns `200 OK` without reprocessing.

---

## Revenue Summary

### `GET /api/revenue/summary`
Dashboard summary metrics.

**Query:** `?period=24h` | `7d` | `30d`

**Response:**
```json
{
  "period": "24h",
  "total_revenue_minor": 12500000,
  "revenue_at_risk_minor": 1870000,
  "recovered_revenue_minor": 580000,
  "recovery_rate": 0.31,
  "active_cases": 47,
  "active_incidents": 2,
  "avg_recovery_time_seconds": 1847,
  "currency": "INR"
}
```

---

## Revenue Cases

### `GET /api/cases`
List revenue cases with filtering and pagination.

**Query:** `?status=analyzing&case_type=payment_failure&page=1&limit=20&sort=created_at&order=desc`

**Response:**
```json
{
  "cases": [...],
  "total": 142,
  "page": 1,
  "limit": 20
}
```

### `GET /api/cases/:id`
Get full case detail including signals, interventions, decisions, actions, outcomes, and audit trail.

### `POST /api/cases/:id/analyze`
Trigger AI analysis for a case.

**Response:** `202 Accepted`
```json
{
  "case_id": "...",
  "ai_run_id": "...",
  "status": "analyzing"
}
```

### `POST /api/cases/:id/simulate`
Run counterfactual intervention simulation.

**Response:** `202 Accepted`
```json
{
  "case_id": "...",
  "simulation_run_id": "...",
  "status": "simulating"
}
```

### `POST /api/cases/:id/approve`
Manually approve a recovery decision.

**Request:**
```json
{
  "decision_id": "...",
  "approved": true,
  "reason": "Approved by ops team"
}
```

### `POST /api/cases/:id/reject`
Reject a recovery decision.

**Request:**
```json
{
  "decision_id": "...",
  "reason": "Risk too high for this customer"
}
```

### `POST /api/cases/:id/recover`
Execute the approved recovery action.

**Response:** `202 Accepted`

### `GET /api/cases/:id/audit`
Get audit trail for a case.

**Response:**
```json
{
  "events": [
    {
      "id": "...",
      "event_type": "case.created",
      "actor": "system",
      "data": { ... },
      "created_at": "..."
    }
  ]
}
```

---

## Simulations

### `POST /api/simulations`
Run a standalone simulation.

**Request:**
```json
{
  "case_id": "...",
  "actions_to_simulate": ["retry_payment", "send_payment_link", "alternative_payment_method"]
}
```

---

## Evaluations / Experiments

### `POST /api/evaluations`
Start a batch evaluation experiment.

**Request:**
```json
{
  "name": "Baseline vs REVIVE - Aug 2026",
  "total_events": 50000,
  "seed": 20260826,
  "config": { ... }
}
```

**Response:** `202 Accepted`

### `GET /api/evaluations/:id`
Get evaluation status and results.

---

## Incidents

### `POST /api/incidents/simulate`
Simulate a payment degradation incident (demo mode).

**Request:**
```json
{
  "incident_type": "payment_degradation",
  "affected_bank": "Bank X",
  "affected_method": "upi",
  "degraded_success_rate": 0.73,
  "duration_minutes": 60
}
```

### `POST /api/incidents/:id/investigate`
Trigger AI investigation of an incident.

### `POST /api/incidents/:id/resolve`
Mark incident as resolved.

---

## Demo

### `POST /api/demo/reset`
Reset demo data to initial state.

### `POST /api/demo/run-incident`
Run the hero demo incident scenario.

### `POST /api/demo/run-recovery`
Run recovery for all eligible cases.

---

## Webhooks

### `POST /api/webhooks/razorpay`
Receive Razorpay webhooks.

**Security:** Verify webhook signature. No Clerk auth required.

---

## Error Response Format

```json
{
  "error": {
    "code": "INVALID_STATE_TRANSITION",
    "message": "Cannot transition from NEW to EXECUTING",
    "details": { ... }
  }
}
```

HTTP Status Codes:
- `200` — Success
- `201` — Created
- `202` — Accepted (async processing)
- `400` — Bad Request
- `401` — Unauthorized
- `403` — Forbidden (wrong merchant)
- `404` — Not Found
- `409` — Conflict (duplicate, invalid state)
- `422` — Unprocessable Entity
- `429` — Rate Limited
- `500` — Internal Server Error
