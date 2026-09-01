# REVIVE — Production Deployment Readiness & Privacy Specification

## 1. Runtime Architecture
- **Framework**: Next.js 16 (App Router + Turbopack)
- **Database**: PostgreSQL 16 (Drizzle ORM) with composite tenant isolation indexes on `(merchant_id, id)`
- **Authentication**: Clerk Multi-Tenant Session Management with seamless local fallback
- **State & Caching**: Upstash Redis / In-Memory Atomic Cache
- **Financial Gateway**: Multi-Rail Adapter Architecture with Razorpay Test Mode integration

---

## 2. Privacy & PII Protection Audit
1. **PII Masking**: Customer emails and phone numbers are hashed with SHA-256 or truncated to masked representations (e.g. `c***@domain.com`) in all logs, database records, and AI prompts.
2. **PCI-DSS Compliance**: Raw primary account numbers (PAN) and CVV codes are NEVER ingested or stored. Only tokenized references (`payment_id`, `card_network`, `last4`) are stored.
3. **AI Context Sanitization**: The AI prompt payload only receives sanitized evidence items (`E-101`, `metricName`, `metricValue`, `description`). Customer identifiers and internal API secrets are strictly filtered out before LLM dispatch.

---

## 3. Observability & SRE Endpoints
- **Liveness Probe**: `GET /api/health` (Reports uptime, memory RSS, service version)
- **Readiness Probe**: `GET /api/ready` (Validates active PostgreSQL connection pool, Redis cache, and subsystem health)
- **Structured Correlation**: Every request logs `merchantId`, `caseId`, `incidentId`, `decisionId`, `idempotencyKey`.
