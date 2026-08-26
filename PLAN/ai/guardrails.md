# REVIVE — AI Guardrails

## 1. Input Guardrails

- All tool inputs validated via Zod schemas
- No arbitrary string execution
- No SQL injection via tool parameters
- Parameter types enforced at runtime

## 2. Output Guardrails

- All LLM outputs validated via Zod schema
- Malformed output → deterministic fallback
- Missing required fields → deterministic fallback
- Out-of-range values → clamped or rejected

## 3. Execution Guardrails

| Guard | Limit | On Violation |
|-------|-------|-------------|
| Tool call limit | 15 per run | Return best available recommendation |
| LLM iteration limit | 5 per run | Return best available recommendation |
| Total timeout | 60 seconds | Fallback to deterministic |
| Token limit | 4096 output tokens | Truncate + validate |
| Concurrent runs | 10 per merchant | Queue additional |

## 4. Content Guardrails

The LLM CANNOT:
- Modify any database record directly
- Call external APIs outside the tool allowlist
- Access environment variables or secrets
- Generate SQL queries for execution
- Recommend amounts different from the original payment
- Override policy engine decisions
- Create or delete merchant data

## 5. Financial Guardrails

- LLM never touches money amounts directly
- All financial calculations use deterministic `decimal.js`
- Recovery amounts bounded by original payment amount
- Discount percentages bounded by policy
- No LLM-generated financial arithmetic trusted

## 6. Monitoring

- Every AI run logged with latency, token count, status
- Fallback invocations tracked as metrics
- Tool call patterns monitored
- Error rates tracked per model version
