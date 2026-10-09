# Phases — LedeSift

Work proceeds phase by phase. **Do not start a phase until explicitly authorized.** Stop and report when a phase completes.

## Authority

Assignment > user decisions > rules > PRD > architecture > design > **this file** > phase prompt.

## Phase numbering note

1. Phase 1 = secure retrieval/extraction
2. Phase 2 = Gemini summarization engine
3. Phase 3 = public API + editorial UI
4. Phase 4 = hardening / browser E2E
5. Phase 5 = deploy and verify

## Phase 0 — Foundation and Context Lock

**Status:** Complete (`f29c3a7`).

## Phase 1 — Secure webpage retrieval and content extraction

**Status:** Complete (`a9ce672`).

## Phase 2 — Reliable AI summarization engine

**Status:** Complete (`3eaa4f7`).

## Phase 3 — Full-stack API and editorial interface

**Status:** Complete (`6e85552`).

## Phase 4 — Hardening, browser tests, and docs polish

**Status:** Complete locally (awaiting user commit authorization).

**Scope**

- Playwright Chromium E2E against production build (mocked API by default)
- Opt-in real browser + Gemini smoke (`LEDESIFT_LIVE_E2E=1`)
- SSRF / API / prompt-injection adversarial Vitest coverage
- Responsive + keyboard/accessibility checks
- Document Phase 5 WAF rate-limit prerequisite (do not publish rules)
- No deploy, auth, database, or rate-limit SaaS dependency

**Validation**

- `npx tsc --noEmit`, `npm run lint`, `npm run build`, `npm test`
- `npx playwright test --project=chromium-mocked` (after build)
- Opt-in: `npm run smoke:fullstack`, `npm run test:e2e:live` when credentials permit
- Audit comparison vs Phase 3 baseline

**Exit:** Wait for authorization before Phase 5. No auto-commit.

## Phase 5 — Deploy and verify (planned)

### Deployment security prerequisite

Before exposing `/api/summarize` publicly on Vercel, configure **platform-level rate limiting / WAF / bot protection**. This app does not claim distributed in-memory rate limiting.

**Provisional WAF starting point (Phase 5):**

- Match: `POST /api/summarize`
- Key: IP
- Window: 60s
- Threshold: 5 requests
- Action: HTTP 429

Counters are per-region on Vercel; treat thresholds as provisional policy, not a global hard cap.

## Global phase rules

- No push/deploy/commit unless the user explicitly asks.
- Record real commands and outcomes in the phase report.
