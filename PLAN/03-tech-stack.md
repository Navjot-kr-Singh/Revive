# REVIVE — Technology Stack

## Core Application

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Framework | Next.js | 15.x | Full-stack React framework |
| Language | TypeScript | 5.x | Type safety |
| Styling | Tailwind CSS | 4.x | Utility-first CSS |
| Components | shadcn/ui | latest | Accessible component system |
| Charts | Recharts | 2.x | Data visualization |

## Infrastructure

| Service | Provider | Plan | Purpose |
|---------|----------|------|---------|
| Auth | Clerk | Free/Dev | Authentication, sessions, identity |
| Database | Supabase | Free | PostgreSQL source of truth |
| Cache | Upstash Redis | Free | Rate limiting, idempotency |
| Background Jobs | Trigger.dev | Free/Dev | Durable workflows |
| Payments | Razorpay | Test Mode | Payment operations |
| Email | Resend | Free | Recovery notifications (if needed) |
| Observability | Sentry | Free | Error tracking |
| Deployment | Vercel | Free/Hobby | Hosting |

## AI

| Component | Technology | Purpose |
|-----------|-----------|---------|
| LLM Provider | Abstracted (OpenAI/Google/etc.) | Case analysis, root cause, explanation |
| Fallback | Deterministic engine | Demo mode, offline analysis |
| ML Model | Custom logistic regression | Recovery probability estimation |

## Development Tools

| Tool | Purpose |
|------|---------|
| pnpm | Package manager |
| ESLint | Code linting |
| Prettier | Code formatting |
| Vitest | Unit/integration testing |
| Playwright | E2E testing |
| Drizzle ORM | Type-safe database queries |
| Zod | Runtime schema validation |

## Key Libraries

| Library | Purpose |
|---------|---------|
| `drizzle-orm` + `drizzle-kit` | Database ORM and migrations |
| `zod` | Schema validation |
| `decimal.js` | Safe financial arithmetic |
| `uuid` / `nanoid` | ID generation |
| `date-fns` | Date manipulation |
| `@clerk/nextjs` | Auth integration |
| `@supabase/supabase-js` | Database client (if direct access needed) |
| `@upstash/redis` | Redis client |
| `@trigger.dev/sdk` | Background job SDK |
| `razorpay` | Payment API client |
| `@sentry/nextjs` | Error tracking |
| `resend` | Email SDK |

## Decision Log

| Decision | Alternatives Considered | Rationale |
|----------|------------------------|-----------|
| Drizzle ORM over Prisma | Prisma, raw SQL | Better serverless performance, type-safe SQL |
| Vitest over Jest | Jest | Faster, native ESM support |
| pnpm over npm/yarn | npm, yarn | Speed, disk efficiency |
| Tailwind 4.x | CSS Modules, Styled Components | User requirement; rapid iteration |
| shadcn/ui | Radix, MUI, Chakra | Accessible, customizable, no runtime overhead |
| Recharts over D3 | D3, Chart.js, Nivo | React-native, simple API for dashboard charts |
| decimal.js | big.js, bignumber.js | Well-maintained, comprehensive decimal arithmetic |
