# LedeSift

**The page, distilled.**

LedeSift accepts a public webpage URL, extracts the main readable text from basic HTML, and returns a concise Gemini summary with key takeaways.

| | |
| --- | --- |
| **Live demo** | https://ledesift.vercel.app |
| **GitHub** | https://github.com/HarshYadav1711/LedeSift |
| **Release** | Public production verified (Phase 5D) — Hobby / free-tier constraints apply |

## What it does

1. Validate a public `http`/`https` URL (SSRF-safe fetch).
2. Extract main article text with Mozilla Readability + jsdom.
3. Summarize with Gemini **2.5 Flash-Lite** on the server.
4. Show summary, key takeaways, source metadata, and a collapsible text preview.

No accounts, databases, or dashboards.

## Stack

| Concern | Choice |
| --- | --- |
| Framework | Next.js 16 App Router (React, TypeScript) |
| UI | Tailwind CSS v4 (Webpack PostCSS in production) |
| API | `POST /api/summarize` Node.js Route Handler |
| Extraction | `@mozilla/readability` + `jsdom@26.1.0` |
| AI | `@google/genai` · `gemini-2.5-flash-lite` |
| Validation | Zod |
| Tests | Vitest + Playwright (Chromium) |
| Deploy | Vercel (Hobby) · WAF rate limit on `/api/summarize` |

## Architecture (brief)

```
Browser → POST /api/summarize (Node.js, maxDuration 60)
       → validate URL → pinned public fetch → Readability/jsdom
       → Gemini structured summary → JSON response
```

Secrets (`GEMINI_API_KEY`) stay server-only. Never use `NEXT_PUBLIC_` for API keys.

## Features

- Editorial single-page UI (Source Serif 4 / Source Sans 3)
- Loading, success, and plain-language error states
- Partial-coverage notices when extraction or model input is truncated
- Copy summary + open source (safe `rel` attributes)
- Platform HTTP 429 mapped to “Too many requests…” (not Gemini-quota wording)

## Setup (local)

```bash
git clone https://github.com/HarshYadav1711/LedeSift.git
cd LedeSift
npm install
cp .env.example .env.local
```

Configure `.env.local`:

```bash
GEMINI_API_KEY=your_api_key_here
GEMINI_MODEL=gemini-2.5-flash-lite
```

```bash
npm run dev
```

## Scripts

```bash
npm run build            # next build --webpack
npm run start
npm run lint
npm test                 # deterministic Vitest (live smokes skipped)
npm run test:e2e         # build + Playwright mocked browser suite
npm run test:e2e:live    # opt-in browser → API → Gemini
npm run smoke:summarize  # live Gemini library smoke
npm run smoke:fullstack  # live retrieve + summarize via handler
npx tsc --noEmit
```

Playwright uses port **4173** (`PLAYWRIGHT_PORT`). Default E2E mocks `/api/summarize` and does **not** prove Gemini.

## API

`POST /api/summarize`
`Content-Type: application/json` · body limit ~4 KiB
Body: `{ "url": "https://example.com/article" }`

**Success `200`:** `{ "ok": true, "data": { source, summary, keyPoints, coverage, sourcePreview } }`
**Failure:** `{ "ok": false, "error": { "code", "message", "retryable" } }`

Responses use `Cache-Control: no-store`. Same-origin browser use is intended.

## Deployment (Vercel)

- Project: `ledesift`
- Production domain: https://ledesift.vercel.app
- Production branch: `main` (GitHub → Vercel)
- Runtime: Node.js 24.x · route `runtime = "nodejs"` · `maxDuration = 60`
- Auth: **Standard Protection** — production domains public; deployment-specific / preview URLs require Vercel Authentication
- Env (Production): `GEMINI_API_KEY`, `GEMINI_MODEL` (server-only)

### WAF

Published rule `ledesift-summarize-limit`:

| Field | Value |
| --- | --- |
| Path / method | `/api/summarize` · POST |
| Key | IP |
| Window | Fixed 60s · 5 requests |
| Action | HTTP 429 |

Counters are **per Vercel region**. This is not a global spend or quota guarantee.

## Security notes

- SSRF defenses: public DNS filtering, pinned outbound connections, redirect re-validation, size/time limits (see Architecture).
- Gemini credentials never shipped to the browser.
- Production packaging uses Webpack because Turbopack + newer jsdom ESM deps failed on Vercel serverless; `jsdom` is pinned to **26.1.0**.

## Limitations

- Best-effort on **basic public HTML**; JS-heavy, paywalled, or bot-blocked pages may fail or yield thin text.
- Summaries are model-generated from extracted text and are **not** independently verified.
- Free-tier Gemini and Hobby WAF limits apply; heavy use can rate-limit.
- Browser abort cancels only the browser request; upstream model work may still finish.
- Dev-only `braces` advisory via `eslint-config-next` remains an accepted baseline (`npm audit --omit=dev` is clean).

## Data handling

Submitted URLs and extracted page text are processed server-side and sent to Google’s Gemini API for summarization under your API key / free-tier terms. This app does not add a product database or user accounts.

## License

Unset / assignment use unless otherwise specified.
