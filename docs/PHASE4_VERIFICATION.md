# Phase 4 verification — LedeSift

**Branch:** `main`  
**Baseline HEAD (before Phase 4 edits):** `6e85552` — `feat: build full-stack LedeSift summarization interface`  
**Scope:** Adversarial verification, Playwright browser E2E, UX hardening. No deploy.

## Evidence categories

| Category | How verified | Proves |
| --- | --- | --- |
| Deterministic Vitest | `npm test` | Unit/integration contracts, SSRF doubles, AI validation |
| Deterministic browser E2E | `npx playwright test --project=chromium-mocked` | UI workflows with **mocked** `POST /api/summarize` |
| API library integration | `npm run smoke:fullstack` | Real retrieve + Gemini via `handleSummarizePost` (not a spawned Next server) |
| Real Gemini library smoke | `npm run smoke:summarize` | Phase 2 provider path |
| Real browser + Gemini | `LEDESIFT_LIVE_E2E=1` Playwright live project | End-to-end browser → Next → Gemini |
| Production deployment | — | **Not performed** (Phase 5) |

Mocked E2E does **not** prove external Gemini integration.

## Baseline (context lock)

- Working tree was clean on `6e85552` before Phase 4 edits.
- Vitest: **104 passed | 2 skipped**.
- `npm audit --omit=dev`: **0** vulnerabilities.
- `npm audit`: **5 high** (`braces` via `eslint-config-next`) — known accepted baseline.

## Fixes applied in Phase 4

| Severity | Finding | Action |
| --- | --- | --- |
| MEDIUM | Submit control not disabled while loading (Design: disable submit) | Disable URL input + submit during `submitting`; unit + E2E coverage |
| MEDIUM | Long unbroken URLs / titles could stress narrow layouts | `break-words` / `overflow-wrap` on summary, titles, key points, body |
| LOW | Playwright absent | Added `@playwright/test`, Chromium, mocked + opt-in live suites |

No CRITICAL SSRF or credential-exposure defect was found in review.

## SSRF review

Reviewed `createPinnedLookup()` (including `{ all: true }` and callback-as-options shapes), DNS filtering, redirect re-validation, pinned transport, TLS `rejectUnauthorized: true` + `servername`.

Additional deterministic adversarial tests cover link-local IPv6, all-private DNS sets, first-public-only pinning (no unvalidated alternate fallback), redirect chains, credential/port redirect rejects, interrupted transfers, malformed/missing Content-Type, overall deadline, and pinned-lookup shape locks.

**Not claimed:** mathematical completeness of SSRF resistance. No live requests to metadata/private destinations.

## API abuse / quota risk

Anonymous clients can repeatedly call `POST /api/summarize` and exhaust free-tier Gemini quota. This app does **not** implement distributed in-memory rate limiting (would falsely claim multi-instance protection).

### Phase 5 WAF proposal (provisional — do not publish in Phase 4)

| Field | Provisional choice |
| --- | --- |
| Match | `POST` `/api/summarize` only |
| Key | Client IP |
| Window | 60 seconds (fixed window) |
| Threshold | 5 requests |
| Action | HTTP **429** |

**Vercel plan notes (docs review, not applied):**

- WAF Rate Limiting available on Hobby / Pro / Enterprise.
- Hobby: 1 rate-limit rule per project; 1M allowed requests/month included.
- Pro: usage-based; up to 40 rules; regional pricing typically **$0.50–$0.80 per 1M allowed requests**.
- Counters are **per-region** — multi-region traffic can exceed a single-region configured limit in aggregate.
- Counting window min 10s / max 10m on Hobby & Pro.

## Prompt injection / extraction

- Mocked tests verify prompt isolation, Zod rejection/stripping, truncation flags, and credential non-leakage.
- Fixtures include ignore-instructions, schema-change attempts, fake system messages, HTML comments, conflicts, long/repetitive/thin pages, unicode.
- These tests **do not** prove model-level resistance to all prompt injections.

## Browser / responsive / a11y

- Playwright screenshots + overflow checks at 1440 / 1280 / 1024 / 768 / 390 / 360 / ~320 px for idle, loading, success, error.
- Keyboard: labelled URL field, Enter submit, focus on controls, disclosure via Enter, loading `role="status"`, errors `role="alert"`.
- Automated checks are **not** a WCAG compliance claim.

## Server shutdown investigation

Phase 3 `smoke:fullstack` calls `handleSummarizePost` in-process — it does **not** spawn `next start`. No Phase 3 harness exit-code artifact from a managed Next child process was reproduced in-repo.

Playwright `webServer` starts `next start` on port **4173**, waits for readiness, and terminates the child on suite end. An exit code from that managed shutdown is a **harness termination artifact**, not evidence of an unhandled rejection in application code, provided requests succeeded during the run.

## Next.js runtime / `cacheComponents`

`cacheComponents` remains off: incompatible with `export const runtime = "nodejs"` on the summarize Route Handler in Next.js 16.4. Node.js runtime preserved for jsdom / Readability / pinned sockets.

## Dependency audit (Phase 4)

Re-run after Playwright install; compare to Phase 3 baseline. Dev-only `braces` chain remains the accepted exception unless new findings appear.

## Known limitations

- Best-effort HTML extraction; JS-heavy/paywalled pages may fail.
- Summaries are not independently fact-checked.
- Browser abort cancels only the browser request; provider work may continue.
- No platform rate limit until Phase 5 WAF configuration.
- Alternate public DNS addresses after the first are not tried on connect failure (documented; first public address is pinned).
- Production deploy verification outstanding.

## Phase 5 readiness recommendation

Ready to begin Phase 5 **after** user review/commit of Phase 4, provided:

1. Deterministic Vitest + mocked Playwright E2E are green.
2. No unresolved CRITICAL security defects.
3. Operator configures Vercel WAF rate limiting before public exposure.
4. Production env sets `GEMINI_API_KEY` (server-only).
5. Deployed smoke uses a real API response (FR-9).

## Commands & results

| Command | Exit | Notes |
| --- | --- | --- |
| `npx tsc --noEmit` | 0 | |
| `npm run lint` | 0 | |
| `npm run build` | 0 | Next.js 16.4.0 production build |
| `npm test` | 0 | **124 passed \| 2 skipped** (was 104 / 2 at baseline) |
| `npx playwright test --project=chromium-mocked` | 0 | **19 passed** |
| `npx playwright test` (with live env available) | 0 | **20 passed** (19 mocked + 1 live) |
| `npm run smoke:fullstack` | 0 | Real retrieve + Gemini via handler; `quotes.toscrape.com` |
| Live Playwright (`LEDESIFT_LIVE_E2E=1`) | 0 | Browser → `next start` :4173 → Gemini |
| `npm audit --omit=dev` | 0 | 0 vulnerabilities |
| `npm audit` | 1 | Same 5 high `braces` (dev) as Phase 3 — no Playwright-introduced findings |
| `git diff --check` | 0 | CRLF warnings only |

### Responsive evidence

28 Playwright screenshots under `test-results/responsive/` (gitignored): idle/loading/success/error × widths 1440, 1280, 1024, 768, 390, 360, 320. No horizontal overflow detected (`scrollWidth ≤ clientWidth + 1`).

### Client bundle spot-check

Largest JS chunks ~224 KB / ~181 KB / ~110 KB. No matches for `@google/genai`, `GEMINI_API_KEY`, or `AIza` under `.next/static`. Fonts via `next/font` (Source Serif / Source Sans). Lighthouse not run.

### Phase 4 completion

**Complete** for local adversarial verification and browser E2E. Phase 5 deploy not started.
