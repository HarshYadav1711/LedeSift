# LedeSift

**The page, distilled.**

LedeSift is a public Next.js application that accepts a webpage URL, extracts the main text from basic public HTML, and summarizes it with Gemini 2.5 Flash-Lite.

> **Status:** Phase 1 retrieval/extraction libraries are implemented and tested. UI wiring, public API route, and Gemini summarization are not implemented yet. Follow `docs/phases.md`.

## Stack

- Next.js App Router (React, TypeScript, Tailwind CSS)
- Node.js Route Handlers (planned API)
- Mozilla Readability + jsdom (Phase 1 extraction)
- Zod + `ipaddr.js` (URL/IP policy)
- Gemini 2.5 Flash-Lite via official SDK (planned)
- Vitest (unit/integration); Playwright (planned)
- Deploy target: Vercel

## Prerequisites

- Node.js 20+ recommended
- npm 10+
- A Google AI / Gemini API key on the free tier (required only when summarization is implemented)

## Setup

```bash
git clone <repository-url>
cd LedeSift
npm install
cp .env.example .env.local
```

Edit `.env.local` and set (later phase):

```bash
GEMINI_API_KEY=your_api_key_here
```

Never commit `.env.local` or real keys. Never expose the key to the browser.

## Scripts

```bash
npm run dev      # local development server
npm run build    # production build
npm run start    # run production build
npm run lint     # ESLint
npm test         # Vitest (retrieval/extraction)
npx tsc --noEmit # TypeScript check
```

## Phase 1 library surface

Server-side modules under `src/lib/`:

- `validatePublicHttpUrl` — absolute public HTTP(S) URL policy
- `fetchHtmlSafely` — SSRF-aware HTML download with pinned destination addresses
- `extractMainContent` — Readability + fallback → `ExtractedPage`
- `retrieveAndExtract` — compose validate → fetch → extract

These are **not** exposed as a public HTTP endpoint yet.

### Limits

| Concern | Value |
| --- | --- |
| Timeout | ~12 seconds overall |
| Redirects | max 3 (each re-validated) |
| Download | ~2 MiB HTML |
| Extracted text | max 50_000 characters |
| Minimum content | 30 words and 120 characters |

### Error codes

`INVALID_URL`, `UNSAFE_URL`, `DNS_ERROR`, `FETCH_TIMEOUT`, `HTTP_ERROR`, `UNSUPPORTED_CONTENT`, `RESPONSE_TOO_LARGE`, `EXTRACTION_FAILED`, `INSUFFICIENT_CONTENT`

## Environment variables

| Variable | Where | Purpose |
| --- | --- | --- |
| `GEMINI_API_KEY` | Server only (`.env.local` / Vercel env) | Gemini API access (later) |

See `.env.example` for placeholders.

## Project docs

| Document | Role |
| --- | --- |
| [AGENTS.md](./AGENTS.md) | Agent operating instructions |
| [docs/rules.md](./docs/rules.md) | Engineering rules |
| [docs/PRD.md](./docs/PRD.md) | Product requirements and user journey |
| [docs/Architecture.md](./docs/Architecture.md) | System design and security boundaries |
| [docs/Design.md](./docs/Design.md) | Visual and UX direction |
| [docs/phases.md](./docs/phases.md) | Phased delivery plan |
| [docs/REQUIREMENTS_MATRIX.md](./docs/REQUIREMENTS_MATRIX.md) | Requirements coverage |

Authority order: Assignment > user decisions > rules > PRD > architecture > design > phases > phase prompt.

## Deploy (Vercel)

1. Push the repository to GitHub (when ready).
2. Import the project in Vercel.
3. Set `GEMINI_API_KEY` in Vercel project environment variables.
4. Deploy and verify with a real summary response once the API is implemented.

## Known limitations

- Targets basic public HTML pages; JavaScript-rendered or paywalled pages may fail.
- Free-tier model quotas and latency apply (when Gemini is added).
- No accounts, history, or database.
- Scraping via browser automation is intentionally out of scope.
- Phase 1 has no public scrape endpoint; libraries are for server-side use.
- Dev-only `braces` advisory via `eslint-config-next` remains an accepted Phase 0 baseline until upstream patches.

## License

Unset / assignment use unless otherwise specified.
