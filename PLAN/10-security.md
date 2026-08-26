# REVIVE — Security

## 1. Authentication
- **Clerk** manages all authentication
- No custom auth implementation
- Protected routes via Clerk middleware
- Session tokens validated server-side

## 2. Authorization
- Every API route validates `merchant_id` ownership
- Server-side authorization — never rely on frontend filtering
- `merchant_members` table enforces membership
- Cross-merchant data access is a critical security violation

## 3. Multi-Tenancy
- Every business table has `merchant_id`
- Every query filters by authenticated user's merchant(s)
- Tests specifically verify tenant isolation:
  - Merchant A cannot see Merchant B's cases
  - Merchant A cannot approve Merchant B's decisions
  - Merchant A cannot access Merchant B's audit trail

## 4. Secrets Management
- **NEVER** commit: API keys, secrets, webhook secrets, LLM keys, Clerk secrets, database passwords
- Use `.env.local` for local development
- Use `.env.example` for documentation (no real values)
- Use environment variables in deployment
- **NEVER** expose server secrets through `NEXT_PUBLIC_*`

## 5. Razorpay Security
- Never use real money — Test Mode only
- Never expose Razorpay secrets to the browser
- Server-side API calls only
- Verify webhook signatures with `razorpay_webhook_secret`
- Implement idempotency for all payment operations

## 6. AI/LLM Safety
- LLM cannot modify financial records
- LLM cannot change money amounts
- LLM cannot bypass policy
- LLM cannot approve prohibited actions
- LLM cannot expose secrets
- LLM cannot execute arbitrary SQL
- LLM cannot call arbitrary external URLs
- Use structured tool schemas with Zod validation
- Allowlisted tools only

## 7. Input Validation
- All external input validated via Zod schemas
- SQL injection prevention via parameterized queries (Drizzle ORM)
- XSS prevention via React's default escaping
- CSRF protection via Next.js defaults
- Webhook signature verification

## 8. Rate Limiting
- Upstash Redis for rate limiting
- API endpoints: 100 req/min per merchant
- Event ingestion: 1000 req/min per merchant
- Demo endpoints: 10 req/min

## 9. Logging & PII
- Structured logging with correlation IDs
- Minimize customer PII in logs
- Use masked identifiers (e.g., `customer_8f2…`)
- Never log: card details, CVV, passwords, API keys
- Hash emails before storage

## 10. Security Review Checklist (Pre-Submission)

- [ ] Authorization review — all routes protected
- [ ] Tenant isolation review — cross-merchant tests pass
- [ ] Secret review — no secrets in code/git
- [ ] Webhook review — signatures verified
- [ ] AI tool review — allowlisted, validated
- [ ] SQL injection review — parameterized queries
- [ ] XSS review — React escaping, no dangerouslySetInnerHTML
- [ ] CSRF review — Next.js defaults
- [ ] Rate limit review — limits configured
- [ ] Logging/PII review — no sensitive data logged
