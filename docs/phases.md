# Phases — LedeSift

Work proceeds phase by phase. **Do not start a phase until explicitly authorized.** Stop and report when a phase completes.

## Authority

Assignment > user decisions > rules > PRD > architecture > design > **this file** > phase prompt.

## Phase numbering note

Authorized prompts remapped delivery:

1. Phase 1 = secure retrieval/extraction
2. Phase 2 = Gemini summarization engine
3. Later = UI / public API / deploy

This file follows those explicit decisions.

## Phase 0 — Foundation and Context Lock

**Status:** Complete (`f29c3a7`).

## Phase 1 — Secure webpage retrieval and content extraction

**Status:** Complete (`a9ce672`).

## Phase 2 — Reliable AI summarization engine

**Status:** Complete (awaiting user commit authorization).

**Scope**

- Official `@google/genai` SDK with `gemini-2.5-flash-lite`.
- Consume Phase 1 `ExtractedPage`; return validated `SummarizationResult`.
- Input budgeting, structured JSON schema, prompt/data isolation.
- Provider error mapping, timeouts, deterministic mocked tests.
- Optional live smoke via `npm run smoke:summarize`.
- No public API route, no UI, no deployment.

**Validation**

- `npx tsc --noEmit`, `npm run lint`, `npm run build`, `npm test`
- `npm audit --omit=dev` / `npm audit`
- Live smoke when a real key is present

**Exit:** Wait for authorization before Phase 3. No auto-commit.

## Phase 3 — UI shell and API wiring (planned)

**Scope (planned)**

- Primary page: brand, tagline, URL form, loading/error/summary regions.
- `POST /api/summarize` Route Handler calling retrieve → extract → summarize.
- Accessibility and responsive behavior per Design.md.

## Phase 4 — Hardening, browser tests, and docs polish (planned)

## Phase 5 — Deploy and verify (planned)

## Global phase rules

- No push/deploy/commit unless the user explicitly asks.
- No phase-specific dependencies early.
- Record real commands and outcomes in the phase report.
