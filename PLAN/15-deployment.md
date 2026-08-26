# REVIVE — Deployment

## 1. Production Environment

| Component | Platform | URL Pattern |
|-----------|----------|-------------|
| Next.js App | Vercel | `revive-app.vercel.app` |
| Database | Supabase | `*.supabase.co` |
| Redis | Upstash | `*.upstash.io` |
| Background Jobs | Trigger.dev | `cloud.trigger.dev` |
| Auth | Clerk | `clerk.com` |

## 2. Deployment Pipeline

```
git push → Vercel auto-deploy → Preview/Production
```

- **Preview**: Every PR gets a preview deployment
- **Production**: `main` branch auto-deploys

## 3. Environment Variables

See [16-environment.md](file:///Users/navjotkumarsingh/Desktop/Revive/PLAN/16-environment.md) for full list.

## 4. Database Migrations

```bash
pnpm db:migrate     # Run pending migrations
pnpm db:seed        # Seed demo data
pnpm db:reset       # Reset and re-seed (dev only)
```

Migrations run automatically on deployment via build script.

## 5. Health Checks

- `GET /api/health` — Application health
- `GET /api/health/db` — Database connectivity
- `GET /api/health/redis` — Redis connectivity

## 6. Monitoring

- Sentry for error tracking
- Vercel Analytics for performance
- Structured logs via Vercel log drain

## 7. Demo Reset

```bash
POST /api/demo/reset   # Resets all demo data
```

This endpoint:
1. Truncates demo-specific data
2. Re-seeds with deterministic data
3. Returns ready state
