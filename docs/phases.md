# Phases — LedeSift

Work proceeds phase by phase. **Do not start a phase until explicitly authorized.** Stop and report when a phase completes.

## Authority

Assignment > user decisions > rules > PRD > architecture > design > **this file** > phase prompt.

## Phase numbering note

1. Phase 1 = secure retrieval/extraction
2. Phase 2 = Gemini summarization engine
3. Phase 3 = public API + editorial UI
4. Later = hardening / deploy

## Phase 0 — Foundation and Context Lock

**Status:** Complete (`f29c3a7`).

## Phase 1 — Secure webpage retrieval and content extraction

**Status:** Complete (`a9ce672`).

## Phase 2 — Reliable AI summarization engine

**Status:** Complete (`3eaa4f7`).

## Phase 3 — Full-stack API and editorial interface

**Status:** Complete (awaiting user commit authorization).

**Scope**

- `POST /api/summarize` Node.js Route Handler
- Request validation (~4 KiB JSON), Phase 1 + Phase 2 orchestration
- Editorial homepage: URL form, loading/error/success, copy, source preview
- Deterministic API + frontend tests; opt-in live full-stack smoke
- No deploy, auth, database, or rate-limit SaaS

**Validation**

- `npx tsc --noEmit`, `npm run lint`, `npm run build`, `npm test`
- `npm run smoke:fullstack` when a real Gemini key is available
- Audit comparison vs Phase 2 baseline

**Exit:** Wait for authorization before Phase 4. No auto-commit.

## Phase 4 — Hardening, browser tests, and docs polish (planned)

## Phase 5 — Deploy and verify (planned)

### Deployment security prerequisite

Before exposing `/api/summarize` publicly on Vercel, configure **platform-level rate limiting / WAF / bot protection**. This app does not claim distributed in-memory rate limiting.

## Global phase rules

- No push/deploy/commit unless the user explicitly asks.
- Record real commands and outcomes in the phase report.
