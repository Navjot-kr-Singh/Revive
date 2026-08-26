# REVIVE — Demo Scenario

## The Hero Demo: Bank X Payment Degradation

### Setup
- Merchant: **Acme Electronics**
- Normal payment success rate: **96%**
- Daily volume: **~₹50L**
- Time: **Tuesday 2:30 PM IST** (peak hour)

### Incident
- **Bank X** UPI payments start failing
- Success rate: **96% → 73%**
- Error: `BANK_TIMEOUT` with specific error signature
- Duration: **2 hours**
- Revenue at risk: **~₹12.7L/hour**

### REVIVE Response

1. **Detection** (T+0:30s)
   - Payment success rate anomaly detected
   - Incident created: "Bank X UPI Payment Degradation"
   - Severity: HIGH

2. **Investigation** (T+1:00)
   - Agent pulls failure patterns
   - Identifies: Bank X + UPI + specific error code
   - Segments affected transactions

3. **Case Creation** (T+1:30)
   - Revenue cases created for each affected transaction
   - Amount at risk calculated per case

4. **Simulation** (T+2:00)
   - Counterfactual simulator runs for each case
   - 5 intervention options compared
   - Best option selected per case context

5. **Policy Gate** (T+2:30)
   - All actions pass through policy engine
   - High-value cases escalated
   - Normal cases auto-approved

6. **Recovery Execution** (T+3:00)
   - Approved actions executed
   - Retry for eligible cases
   - Payment links for non-retry cases
   - Human escalation for high-value

7. **Outcome** (T+5:00)
   - Recovery results measured
   - Actual recovered revenue displayed
   - Metrics updated

### Expected Numbers (from actual evaluation)
- Cases affected: ~150
- Recovery rate: ~31%
- Revenue recovered: ~₹3.9L
- Time to first recovery: ~3 minutes
- Policy violations: 0
- Human escalations: ~12 cases

---

## Demo Reset Procedure

```bash
# 1. Reset demo data
curl -X POST http://localhost:3000/api/demo/reset

# 2. Verify clean state
curl http://localhost:3000/api/revenue/summary

# 3. Run incident
curl -X POST http://localhost:3000/api/demo/run-incident

# 4. Run recovery
curl -X POST http://localhost:3000/api/demo/run-recovery
```

---

## Fallback Demo Procedure

If external services fail:

1. Set `DEMO_MODE=true` in environment
2. All AI uses deterministic fallback
3. Payment execution is simulated locally
4. Data is synthetic but realistic
5. Demo demonstrates full loop without external dependencies
