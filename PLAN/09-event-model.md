# REVIVE — Event Model

## 1. Overview

REVIVE uses an append-only event model. Events are immutable once written. State changes are derived from events.

---

## 2. Event Types

### Payment Events
| Event | Source | Trigger |
|-------|--------|---------|
| `payment.created` | Razorpay/Synthetic | New payment initiated |
| `payment.authorized` | Razorpay/Synthetic | Payment authorized |
| `payment.captured` | Razorpay/Synthetic | Payment captured |
| `payment.failed` | Razorpay/Synthetic | Payment failed |

### Checkout Events
| Event | Source | Trigger |
|-------|--------|---------|
| `checkout.started` | Synthetic | Customer started checkout |
| `checkout.abandoned` | Synthetic | Customer abandoned checkout |

### Subscription Events
| Event | Source | Trigger |
|-------|--------|---------|
| `subscription.payment_failed` | Synthetic | Recurring payment failed |
| `subscription.payment_recovered` | Synthetic | Recurring payment recovered |

### Revenue Case Events
| Event | Source | Trigger |
|-------|--------|---------|
| `revenue.case_created` | System | Case created from event |
| `revenue.case_analyzed` | System | AI analysis completed |

### Intervention Events
| Event | Source | Trigger |
|-------|--------|---------|
| `intervention.simulated` | System | Simulation completed |

### Decision Events
| Event | Source | Trigger |
|-------|--------|---------|
| `decision.created` | System | Decision recorded |
| `decision.approved` | System/Human | Decision approved |
| `decision.rejected` | System/Human | Decision rejected |

### Recovery Events
| Event | Source | Trigger |
|-------|--------|---------|
| `recovery.action_started` | System | Recovery action initiated |
| `recovery.action_succeeded` | System | Recovery action succeeded |
| `recovery.action_failed` | System | Recovery action failed |
| `recovery.completed` | System | Case fully resolved |

### Policy Events
| Event | Source | Trigger |
|-------|--------|---------|
| `policy.violation` | System | Policy rule blocked action |

### Human Events
| Event | Source | Trigger |
|-------|--------|---------|
| `human.escalation` | System | Case escalated to human |

---

## 3. Event Structure

```typescript
interface ReviveEvent {
  id: string;                    // UUID
  merchant_id: string;           // UUID
  event_type: string;            // Dot-notation type
  event_id: string;              // Unique event identifier
  source: string;                // 'razorpay', 'synthetic', 'internal'
  source_event_id?: string;      // Original external event ID
  payload: Record<string, any>;  // Event-specific data
  payload_hash?: string;         // SHA-256 for dedup
  received_at: string;           // ISO 8601
  processed_at?: string;         // ISO 8601
  processing_status: string;     // 'pending', 'processed', 'failed', 'duplicate'
}
```

---

## 4. Idempotency

Every external event is deduplicated by:

```
UNIQUE(source, source_event_id)
```

Processing flow:
1. Compute `payload_hash` = SHA-256 of canonical JSON payload
2. Check for existing `(source, source_event_id)` pair
3. If exists and `processing_status = 'processed'` → return `200 OK`, do not reprocess
4. If exists and `processing_status = 'failed'` → optionally retry
5. If not exists → insert with `processing_status = 'pending'`
6. Process event
7. Update `processing_status` to `'processed'` and set `processed_at`

---

## 5. Event Processing Rules

### `payment.failed`
1. Create or update payment record
2. Calculate revenue at risk
3. Check for existing revenue case for this payment
4. If no case exists → create revenue case (status: NEW)
5. Create audit event

### `payment.captured`
1. Update payment record
2. If associated revenue case exists → check if this is a recovery
3. Update recovery outcome
4. Create audit event

### `checkout.abandoned`
1. Create revenue case (type: checkout_abandonment)
2. Calculate revenue at risk from order amount

### `subscription.payment_failed`
1. Create revenue case (type: subscription_failure)
2. Mark as recurring context

---

## 6. Event Ordering

**NEVER** assume webhook delivery order.

Events may arrive:
- Out of order
- Duplicated
- Delayed

The system must handle all scenarios:
- `payment.captured` before `payment.authorized` → accept
- `payment.failed` after `payment.captured` → reject (invalid state)
- Same event twice → idempotent (no reprocessing)

---

## 7. Testing Requirements

| Test | Description |
|------|-------------|
| Duplicate event | Same (source, source_event_id) → no duplicate processing |
| Out-of-order events | Correct state regardless of arrival order |
| Delayed event | Late arrival doesn't corrupt state |
| Invalid state transition | Rejected with error |
| Payload hash | Same payload produces same hash |
| Missing fields | Graceful handling with defaults |
| Unknown event type | Logged and ignored, not crash |
