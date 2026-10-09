# Architecture — LedeSift

## Overview

LedeSift is a single Next.js application. The browser collects a URL; a Node.js Route Handler performs fetch, extraction, and AI summarization. There is no separate backend service, database, or queue.

```
Browser (App Router UI)
    │  POST /api/summarize { url }
    ▼
Route Handler (Node.js runtime)
    │  Zod validate URL
    │  SSRF-safe fetch HTML
    │  jsdom + Readability → main text
    │  Gemini 2.5 Flash-Lite (official SDK) → summary
    ▼
JSON response → UI (summary | error)
```

## Boundaries

| Layer | Responsibility | Must not |
| --- | --- | --- |
| UI (`src/app`) | Form, loading, summary/error display | Call Gemini or hold secrets |
| API route | Validate, fetch, extract, summarize, map errors | Trust client-supplied HTML as already-safe |
| Extraction module | HTML → main text/title | Call AI; fetch network (receive HTML/text only) |
| AI module | Text → summary string | Fetch URLs; expose raw SDK errors to clients |

## Planned modules (later phases)

- `src/app/page.tsx` — primary UI
- `src/app/api/summarize/route.ts` — Route Handler
- `src/lib/url.ts` — URL validation / normalization
- `src/lib/fetch-page.ts` — bounded HTML fetch + redirect policy
- `src/lib/extract.ts` — Readability + jsdom
- `src/lib/summarize.ts` — Gemini client wrapper
- `src/lib/schemas.ts` — Zod request/response schemas

Phase 0 does not create these feature modules yet.

## Extraction boundary

- Input: HTML string (and final URL).
- Output: `{ title?: string; text: string }` or a typed empty/failure result.
- Use Mozilla Readability with jsdom.
- Reject or error when extracted text is empty or below a minimum useful length (threshold set in implementation).

## AI boundary

- Input: extracted plain text (truncated if needed to model context limits) plus optional title.
- Output: summary string.
- Model: **Gemini 2.5 Flash-Lite** via the **official maintained Google Gen AI / Gemini SDK**.
- API key: server env `GEMINI_API_KEY` only.
- Prompting stays minimal: instruct concise factual summary of provided text; do not browse or invent sources.

## Security protections

1. **Secret hygiene** — no `NEXT_PUBLIC_` for keys; `.env*` gitignored except `.env.example`.
2. **Input validation** — Zod; absolute `http:`/`https:` only; reject userinfo in URLs.
3. **SSRF controls** — block private, loopback, link-local, and cloud metadata hosts (and resolve/check redirects where practical); timeout and max response size.
4. **Error mapping** — stable error codes; no stack traces or API key material in responses.
5. **Dependency surface** — only approved libraries; no scraping browsers.
6. **Deployment** — secrets via Vercel env configuration, not committed files.

## Runtime and hosting

- Next.js App Router on Vercel.
- Route Handlers use the Node.js runtime (required for jsdom / Readability).
- No edge runtime for the summarize path.

## Testing architecture

- **Vitest** — unit/integration for validation, extraction helpers, error mapping (with fixtures).
- **Playwright** — browser flow: submit URL, observe loading and result/error against a controlled page or mocked route where appropriate; production verification uses a real API response as required by the assignment.

## Explicit non-architecture

No database, auth, Redis, microservices, RAG, LangGraph, analytics, payments, or background jobs.
