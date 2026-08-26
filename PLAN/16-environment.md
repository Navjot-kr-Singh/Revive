# REVIVE — Environment Configuration

## Required Environment Variables

### `.env.example`

```bash
# ─── Database ───────────────────────────────────────
DATABASE_URL=postgresql://user:password@host:5432/revive
DIRECT_URL=postgresql://user:password@host:5432/revive

# ─── Clerk Authentication ──────────────────────────
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# ─── Razorpay (Test Mode ONLY) ────────────────────
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...

# ─── AI / LLM ─────────────────────────────────────
# Provider: 'openai' | 'google' | 'anthropic' | 'deterministic'
AI_PROVIDER=deterministic
OPENAI_API_KEY=sk-...
# GOOGLE_AI_API_KEY=...
# ANTHROPIC_API_KEY=...

# ─── Upstash Redis ─────────────────────────────────
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...

# ─── Trigger.dev ───────────────────────────────────
TRIGGER_API_KEY=tr_dev_...
TRIGGER_API_URL=https://api.trigger.dev

# ─── Sentry ────────────────────────────────────────
SENTRY_DSN=https://...@sentry.io/...
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...

# ─── Resend (optional) ─────────────────────────────
RESEND_API_KEY=re_...

# ─── Application ───────────────────────────────────
NEXT_PUBLIC_APP_URL=http://localhost:3000
DEMO_MODE=true
NODE_ENV=development
```

## Notes

### Server-only vs Public
- `NEXT_PUBLIC_*` — Available in browser (safe to expose)
- Everything else — Server-only (NEVER expose to browser)

### Required for MVP
1. `DATABASE_URL` — Must have for any functionality
2. `CLERK_*` — Must have for authentication
3. `AI_PROVIDER=deterministic` — Can run without LLM API key

### Optional
- `RAZORPAY_*` — Can use simulated payments
- `UPSTASH_*` — Can fall back to in-memory
- `TRIGGER_*` — Can use synchronous processing for dev
- `SENTRY_*` — Can skip observability for dev
- `RESEND_*` — Can mock email
