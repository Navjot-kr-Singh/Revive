# REVIVE — AI Investigation Architecture & State Machine

## 1. System Pipeline Overview

The AI Root Cause Investigator operates as a bounded, multi-stage state machine orchestrator that transforms statistical anomaly detections into verifiable, auditable incident diagnoses.

```
                    ┌────────────────────────────────────────┐
                    │      INCIDENT DETECTED (Phase 2)       │
                    └───────────────────┬────────────────────┘
                                        │
                                        ▼
                    ┌────────────────────────────────────────┐
                    │       1. EVIDENCE RETRIEVAL            │
                    │   (Tool Budget: ≤ 10 DB / API calls)   │
                    │   (Output: Sequenced Evidence E-101..) │
                    └───────────────────┬────────────────────┘
                                        │
                                        ▼
                    ┌────────────────────────────────────────┐
                    │      2. HYPOTHESIS GENERATOR           │
                    │  (Evaluates 10 Candidate Hypotheses)   │
                    │  (Scores: S_final = S_prior + S_ev     │
                    │                    - S_contradiction)  │
                    └───────────────────┬────────────────────┘
                                        │
                                        ▼
                    ┌────────────────────────────────────────┐
                    │       3. DIAGNOSIS SYNTHESIS           │
                    │   (Gemini 2.5 / Fallback Provider)     │
                    │   (Strict JSON Schema & Citation Gating│
                    └───────────────────┬────────────────────┘
                                        │
                                        ▼
                    ┌────────────────────────────────────────┐
                    │      4. RECOVERY RECOMMENDATIONS       │
                    │   (Risk, Friction, Stopping Condition) │
                    │   ("Pending Policy Engine Verification")│
                    └───────────────────┬────────────────────┘
                                        │
                                        ▼
                    ┌────────────────────────────────────────┐
                    │       5. IMMUTABLE AUDIT LEDGER        │
                    │  (Record to ai_runs & audit_events)    │
                    └────────────────────────────────────────┘
```

---

## 2. Investigation State Machine

The investigation state transitions follow an explicit, non-bypassable workflow defined in `src/lib/constants.ts`:

| State | Description | Trigger |
| :--- | :--- | :--- |
| `pending` | Investigation record created | `POST /api/incidents/[id]/investigate` |
| `collecting_evidence` | Executing bounded diagnostic tools | `EvidenceCollector.collectAll()` |
| `analyzing` | Evidence collected; computing signals | Data returned to orchestrator |
| `hypothesis_generated` | Scoring 10 candidate hypotheses | `HypothesisEngine.generateAndScore()` |
| `diagnosed` | Primary root cause synthesized | `DiagnosisEngine.synthesize()` |
| `recommendations_ready` | Recovery options mapped with citations | `RecommendationEngine.generate()` |
| `human_review` | Low confidence (<0.60) or unknown case | Flagged for operator review |
| `failed` | Tool timeout or fatal exception | Error boundary caught |

---

## 3. Strict Tool Budget Constraints (`src/lib/constants.ts`)

To prevent unbounded resource consumption and runaway LLM execution loops:
- `MAX_TOOL_CALLS`: **10** (Actual: 7–8 tools executed)
- `MAX_EVIDENCE_ITEMS`: **25** (Actual: 8 items collected per incident)
- `MAX_LLM_TOKENS`: **2,000** completion tokens
- `TIMEOUT_MS`: **10,000ms**

---

## 4. Immutable AI Run Audit Ledger (`ai_runs` table)

Every AI synthesis call appends an immutable record to the `ai_runs` table containing:
1. `prompt_id` & `prompt_version` (e.g. `incident-investigator`, `v1.0.0`)
2. `input_hash`: SHA-256 hash of the complete retrieved evidence payload.
3. `output_hash`: SHA-256 hash of the structured JSON response.
4. `token_usage`: Prompt & completion token counts.
5. `latency_ms`: Execution latency in milliseconds.
6. `status`: `success` or `fallback`.
