# LedeSift

**The page, distilled.**

LedeSift is a public Next.js application that accepts a webpage URL, extracts the main text from basic public HTML, and summarizes it with Gemini 2.5 Flash-Lite.

> **Status:** Phase 0 foundation complete. URL summarization is not implemented yet. Follow `docs/phases.md` for delivery order.

## Stack

- Next.js App Router (React, TypeScript, Tailwind CSS)
- Node.js Route Handlers (planned API)
- Mozilla Readability + jsdom (planned extraction)
- Gemini 2.5 Flash-Lite via official SDK (planned)
- Zod, Vitest, Playwright (planned when needed)
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

Edit `.env.local` and set:

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
npx tsc --noEmit # TypeScript check
```

Vitest and Playwright scripts will be added when those tools are introduced.

## Environment variables

| Variable | Where | Purpose |
| --- | --- | --- |
| `GEMINI_API_KEY` | Server only (`.env.local` / Vercel env) | Gemini API access |

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
- Free-tier model quotas and latency apply.
- No accounts, history, or database.
- Scraping via browser automation is intentionally out of scope.

## License

Unset / assignment use unless otherwise specified.
