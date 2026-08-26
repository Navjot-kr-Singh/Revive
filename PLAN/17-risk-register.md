# REVIVE — Risk Register

## Risk Assessment

| # | Risk | Likelihood | Impact | Mitigation | Status |
|---|------|-----------|--------|------------|--------|
| R1 | LLM API unavailable during demo | Medium | High | Deterministic fallback mode; demo works offline | ✅ Mitigated by design |
| R2 | Razorpay test mode limitations | Medium | Medium | Simulated payment adapter; don't depend on real API for demo | ✅ Mitigated by design |
| R3 | Time constraints (7 days) | High | High | Strict P0/P1 prioritization; no feature creep; managed services | ⚠️ Ongoing |
| R4 | External service outage (Supabase, Clerk, etc.) | Low | High | Adapter pattern; local dev mode; .env fallbacks | ✅ Mitigated by design |
| R5 | Data model changes mid-project | Medium | Medium | Migration system; schema versioning; careful Day 1 design | ✅ Mitigated by design |
| R6 | AI produces incorrect financial recommendations | Medium | Critical | Policy engine gates ALL actions; bounded execution; audit trail | ✅ Mitigated by design |
| R7 | Race conditions in concurrent event processing | Medium | High | Idempotency keys; database transactions; Redis locks | ⚠️ Must test |
| R8 | Demo fails during presentation | Medium | Critical | Deterministic demo mode; pre-seeded data; reset endpoint | ✅ Mitigated by design |
| R9 | Scope creep | High | High | Strict scope control doc (section 42 of prompt); P0/P1 only | ⚠️ Ongoing |
| R10 | Security vulnerability discovered late | Low | High | Security review checklist; Day 6 hardening | ⚠️ Must execute |
| R11 | Evaluation shows poor results | Low | High | Synthetic data with known ground truth; tunable model | ✅ Mitigated by design |
| R12 | Judge asks "Is this really AI?" | High | High | "Why AI?" doc; "Why not rules?" demonstration; clear AI value demo | ⚠️ Must document |
| R13 | Financial calculation errors | Medium | Critical | BIGINT minor units; decimal.js; extensive financial tests | ⚠️ Must test |
| R14 | Cross-merchant data leak | Low | Critical | Server-side merchant_id filtering; tenant isolation tests | ⚠️ Must test |
| R15 | Deployment failure on Day 7 | Low | Critical | Deploy on Day 1; continuous deployment; always-deployable main | ✅ Mitigated by process |

## Risk Response Plan

### If LLM API fails during demo:
1. Switch to `DEMO_MODE=true`
2. Use deterministic analysis
3. Label as "Deterministic Fallback"
4. Demo still shows full loop

### If demo data gets corrupted:
1. Hit `POST /api/demo/reset`
2. Re-seeds deterministic data
3. Demo starts fresh

### If time runs short:
1. Freeze features
2. Polish golden path only
3. Ensure E2E tests pass
4. Focus on demo reliability over feature count
