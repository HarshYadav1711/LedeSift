# LedeSift

**The page, distilled.**

LedeSift accepts a public webpage URL, extracts the main readable text, and returns a concise Gemini summary with key takeaways.

> **Status:** Phase 4 browser E2E + hardening are implemented for local verification. Deployment / production verification are not complete. Follow `docs/phases.md`.

## Stack

- Next.js App Router (React, TypeScript, Tailwind CSS)
- `POST /api/summarize` Node.js Route Handler
- Mozilla Readability + jsdom
- `@google/genai` + `gemini-2.5-flash-lite`
- Zod + Vitest + Playwright (Chromium)
- Deploy target: Vercel (not verified yet)

## Setup

```bash
git clone <repository-url>
cd LedeSift
npm install
cp .env.example .env.local
```

Configure `.env.local`:

```bash
GEMINI_API_KEY=your_api_key_here
GEMINI_MODEL=gemini-2.5-flash-lite
```

Never commit real keys. Never use `NEXT_PUBLIC_` for secrets.

## Scripts

```bash
npm run dev              # local UI + API
npm run build
npm run start
npm run lint
npm test                 # deterministic Vitest (live smokes stay skipped)
npm run test:e2e         # build + Playwright mocked browser suite
npm run test:e2e:live    # opt-in real browser → API → Gemini (needs key)
npm run smoke:summarize  # Phase 2 live Gemini library smoke
npm run smoke:fullstack  # live retrieve + summarize via handler (needs key)
npx tsc --noEmit
```

Playwright starts a production server on port **4173** (override with `PLAYWRIGHT_PORT`). Default E2E mocks `/api/summarize`; it does not prove Gemini. See `docs/PHASE4_VERIFICATION.md`.

## API contract

`POST /api/summarize`
Content-Type: `application/json`
Body limit: ~4 KiB
Body: `{ "url": "https://example.com/article" }`

**Success `200`**

```json
{
  "ok": true,
  "data": {
    "source": {
      "requestedUrl": "…",
      "finalUrl": "…",
      "title": "…",
      "wordCount": 123,
      "extractionMethod": "readability"
    },
    "summary": "…",
    "keyPoints": ["…"],
    "coverage": {
      "extractionTruncated": false,
      "inputTruncated": false
    },
    "sourcePreview": "…"
  }
}
```

**Failure**

```json
{
  "ok": false,
  "error": {
    "code": "INVALID_URL",
    "message": "…",
    "retryable": false
  }
}
```

Responses use `Cache-Control: no-store`. Same-origin browser use is intended; there is no wildcard CORS.

### Production exposure prerequisite

Before exposing this endpoint publicly on Vercel, configure platform-level rate limiting / bot protection. This repository does not implement distributed rate limiting.

**Provisional Phase 5 WAF starting point:** `POST /api/summarize`, IP key, 60s window, 5 requests, HTTP 429. Vercel rate-limit counters are per-region; Hobby includes one rate-limit rule per project. Do not treat this as a globally guaranteed cap.

## Known limitations

- Best-effort on basic public HTML; JS-rendered / paywalled pages may fail.
- Summaries are not independently verified.
- Model and extraction truncation are reported via coverage flags.
- Browser abort cancels only the browser request; Gemini work may still continue.
- Dev-only `braces` eslint advisory remains the accepted baseline.
- Live network smoke tests are opt-in and skipped under default `npm test`.

## License

Unset / assignment use unless otherwise specified.
