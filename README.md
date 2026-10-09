# LedeSift

**The page, distilled.**

LedeSift accepts a public webpage URL, extracts the main readable text, and returns a concise Gemini summary with key takeaways.

> **Status:** Phase 3 full-stack API + editorial UI are implemented for local use. Deployment / production verification are not complete. Follow `docs/phases.md`.

## Stack

- Next.js App Router (React, TypeScript, Tailwind CSS)
- `POST /api/summarize` Node.js Route Handler
- Mozilla Readability + jsdom
- `@google/genai` + `gemini-2.5-flash-lite`
- Zod + Vitest
- Deploy target: Vercel (not verified in Phase 3)

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
npm test                 # deterministic suite (live smokes stay skipped)
npm run smoke:summarize  # Phase 2 live Gemini library smoke
npm run smoke:fullstack  # Phase 3 live retrieve + summarize API smoke
npx tsc --noEmit
```

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

## Known limitations

- Best-effort on basic public HTML; JS-rendered / paywalled pages may fail.
- Summaries are not independently verified.
- Model and extraction truncation are reported via coverage flags.
- Browser abort cancels only the browser request; Gemini work may still continue.
- Dev-only `braces` eslint advisory remains the accepted baseline.
- Live network smoke tests are opt-in and skipped under default `npm test`.

## License

Unset / assignment use unless otherwise specified.
