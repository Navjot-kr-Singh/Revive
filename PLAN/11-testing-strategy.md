# REVIVE — Testing Strategy

## 1. Testing Framework
- **Unit/Integration**: Vitest
- **E2E**: Playwright
- **Coverage Target**: 80%+ on core business logic

---

## 2. Unit Tests

### Money Calculations
- ₹0, ₹1, ₹99, ₹100, ₹999, ₹24,999, ₹50,000, ₹1,00,000
- Large amounts, rounding, currency handling
- Negative values where applicable
- No silent rounding
- Overflow protection

### Expected Value Engine
- Correct recovery probability × amount
- Intervention cost subtraction
- Net value calculation
- Edge cases: zero amount, zero probability, high cost

### Recovery Probability Model
- Output always in [0.0, 1.0]
- Known failure types → expected probability ranges
- Time decay reduces probability
- Customer factor increases for repeat customers
- Deterministic: same input → same output
- Model version tracked

### Policy Engine
- Every rule has dedicated test
- Retry limit enforcement
- Contact limit enforcement
- High-value escalation
- Low probability blocking
- Low confidence escalation
- Negative EV blocking
- Allowlist enforcement
- Multiple rules interaction

### State Machine
- Every valid transition
- Every invalid transition (must be rejected)
- Terminal states
- Idempotent transitions

### Action Eligibility
- Each action type's eligibility conditions
- Boundary conditions

### Idempotency
- Same event processed once
- Duplicate detection
- Payload hash verification

---

## 3. Integration Tests

### Payment Event Ingestion
- External event → database record
- Correct event type handling
- Idempotent processing

### Case Creation
- Payment failure → revenue case
- Correct amount at risk calculation
- Correct case type assignment

### Agent Tools
- Each tool returns expected format
- Tools handle missing data gracefully
- Tools enforce merchant isolation

### Policy Gate
- Case → analysis → simulation → policy evaluation → correct outcome

### Recovery Execution
- Action creation → dispatch → outcome recording

### Webhook Processing
- Valid webhook → processed
- Invalid signature → rejected
- Duplicate webhook → idempotent

### Database Transactions
- Concurrent case updates → no corruption
- Failed transaction → rollback

---

## 4. End-to-End Tests

### Golden Path
```
Sign in → Control Room → View Case → Inspect Analysis → 
View Simulation → Approve Recovery → Execute → Verify Outcome → 
Check Audit Trail
```

### Demo Flow
```
Reset Demo → Inject Incident → View Detection → 
View Investigation → View Recovery → Check Metrics
```

---

## 5. Failure Tests

| Test | Scenario | Expected Behavior |
|------|----------|-------------------|
| Duplicate webhook | Same webhook ID twice | Second ignored |
| Delayed webhook | Late arrival | Correct state update |
| Invalid state | EXECUTING → NEW | Rejected with error |
| API timeout | External API times out | Graceful degradation |
| AI timeout | LLM doesn't respond | Deterministic fallback |
| Malformed AI output | LLM returns invalid JSON | Fallback + error logged |
| Database error | Connection failure | Error returned, no partial state |
| Retry exhaustion | Max retries reached | Action marked failed, case escalated |

---

## 6. Security Tests

| Test | Scenario | Expected Behavior |
|------|----------|-------------------|
| Unauthorized access | No auth token | 401 returned |
| Cross-merchant access | Merchant A accesses Merchant B data | 403 returned |
| Cross-merchant case | Merchant A approves Merchant B case | 403 returned |
| Exposed secrets | Scan for hardcoded secrets | None found |
| Unsafe tool execution | LLM attempts unauthorized tool | Rejected |
| Malformed input | Invalid JSON/params | 400 with validation error |
| Webhook signature failure | Invalid signature | 401 returned |
| Rate limit | Excessive requests | 429 returned |

---

## 7. Test Organization

```
tests/
├── unit/
│   ├── money.test.ts
│   ├── expected-value.test.ts
│   ├── recovery-model.test.ts
│   ├── policy-engine.test.ts
│   ├── state-machine.test.ts
│   ├── action-eligibility.test.ts
│   └── idempotency.test.ts
├── integration/
│   ├── event-ingestion.test.ts
│   ├── case-creation.test.ts
│   ├── agent-tools.test.ts
│   ├── policy-gate.test.ts
│   ├── recovery-execution.test.ts
│   ├── webhook-processing.test.ts
│   └── database-transactions.test.ts
├── e2e/
│   ├── golden-path.test.ts
│   └── demo-flow.test.ts
├── failure/
│   ├── duplicate-webhook.test.ts
│   ├── api-timeout.test.ts
│   ├── ai-fallback.test.ts
│   └── state-corruption.test.ts
└── security/
    ├── auth.test.ts
    ├── tenant-isolation.test.ts
    ├── webhook-signature.test.ts
    └── rate-limiting.test.ts
```
