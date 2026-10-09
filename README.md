# LedeSift

**The page, distilled.**

LedeSift is a public Next.js application that accepts a webpage URL, extracts the main text from basic public HTML, and summarizes it with Gemini 2.5 Flash-Lite.

> **Status:** Phase 2 summarization libraries are implemented and tested. Public API route and UI wiring are not implemented yet. Follow `docs/phases.md`.

## Stack

- Next.js App Router (React, TypeScript, Tailwind CSS)
- Node.js Route Handlers (planned API)
- Mozilla Readability + jsdom (Phase 1 extraction)
- Zod + `ipaddr.js` (URL/IP policy)
- `@google/genai` + `gemini-2.5-flash-lite` (Phase 2 summarization)
- Vitest (unit/integration); Playwright (planned)
- Deploy target: Vercel

## Prerequisites

- Node.js 20+ recommended
- npm 10+
- A Google AI / Gemini API key on the free tier (for live summarization)

## Setup

```bash
git clone <repository-url>
cd LedeSift
npm install
cp .env.example .env.local
```

Edit `.env.local`:

```bash
GEMINI_API_KEY=your_api_key_here
GEMINI_MODEL=gemini-2.5-flash-lite
```

Never commit `.env.local` or real keys. Never expose the key to the browser (`NEXT_PUBLIC_` is forbidden for secrets).

## Scripts

```bash
npm run dev           # local development server
npm run build         # production build
npm run start         # run production build
npm run lint          # ESLint
npm test              # Vitest (deterministic; no live Gemini by default)
npm run smoke:summarize  # opt-in live Gemini smoke (requires .env.local)
npx tsc --noEmit      # TypeScript check
```

## Library surfaces

### Phase 1 — retrieval/extraction

- `validatePublicHttpUrl`, `fetchHtmlSafely`, `extractMainContent`, `retrieveAndExtract`

### Phase 2 — summarization

- `summarizeExtractedPage(extractedPage)` → `SummarizationResult`
- Uses structured JSON (`summary`, `keyPoints`) validated with Zod
- Trusted system instructions are isolated from untrusted webpage extract text
- Model input budget: 12_000 characters (paragraph/sentence-aware truncation)
- Application timeout: ~20s; `maxOutputTokens`: 512
- AbortSignal cancellation is **client-side only**; provider work/quota may still occur after abort

These modules are **not** exposed as a public HTTP endpoint yet.

## Environment variables

| Variable | Where | Purpose |
| --- | --- | --- |
| `GEMINI_API_KEY` | Server only | Gemini API access |
| `GEMINI_MODEL` | Server only | Defaults to `gemini-2.5-flash-lite` |

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

## Known limitations

- Targets basic public HTML pages; JavaScript-rendered or paywalled pages may fail.
- Long pages are truncated for the model input budget; `inputTruncated` reports this honestly.
- Summaries are generated from extracted text only and are not independently verified.
- Free-tier model quotas and latency apply.
- No accounts, history, database, or public scrape/summarize HTTP route yet.
- Dev-only `braces` advisory via `eslint-config-next` remains an accepted baseline until upstream patches.

## License

Unset / assignment use unless otherwise specified.
