# Phases — LedeSift

Work proceeds phase by phase. **Do not start a phase until explicitly authorized.** Stop and report when a phase completes.

## Authority

Assignment > user decisions > rules > PRD > architecture > design > **this file** > phase prompt.

## Phase numbering note

An earlier draft listed Phase 1 as UI and Phase 2 as fetch/extraction. The authorized Phase 1 prompt remapped delivery so that **secure retrieval and extraction land before UI and Gemini**. This file follows that explicit decision.

## Phase 0 — Foundation and Context Lock

**Status:** Complete (`f29c3a7`).

**Scope**

- Inspect environment and repository.
- Initialize Next.js (TypeScript, Tailwind, ESLint) if empty.
- Establish governance docs: `AGENTS.md`, `docs/*`, `README.md`, `.env.example`, `.gitignore`.
- Minimal scaffold only (design tokens / branded shell allowed).
- No scraping, model calls, result generation, or unapproved features.

**Exit:** Context locked.

---

## Phase 1 — Secure webpage retrieval and content extraction

**Status:** Complete (awaiting user commit authorization).

**Scope**

- URL validation (absolute HTTP/HTTPS, standard ports, no userinfo).
- SSRF-safe HTML fetch with connection-time address pinning.
- Mozilla Readability + jsdom extraction with fallback and limits.
- Typed `ExtractedPage` contract and controlled error categories.
- Vitest coverage with fixtures and transport/DNS fakes.
- No Gemini, no public scrape API route, no UI expansion.

**Validation**

- `npx tsc --noEmit`
- `npm run lint`
- `npm run build`
- `npm test`
- `npm audit --omit=dev` / `npm audit`
- Git hygiene inspection

**Exit:** Wait for authorization before Phase 2. No auto-commit.

---

## Phase 2 — UI shell and API wiring (planned)

**Scope (planned)**

- Primary page: brand, tagline, URL form, loading/error/summary regions.
- Route Handler that calls the Phase 1 retrieval pipeline (still no Gemini, or stub only if explicitly authorized).
- Accessibility and responsive behavior per Design.md.

---

## Phase 3 — Gemini summarization (planned)

**Scope (planned)**

- Official Gemini SDK; model Gemini 2.5 Flash-Lite.
- Server-only `GEMINI_API_KEY`.
- Map model failures to API error codes.
- End-to-end summarize path with a real API response.

---

## Phase 4 — Hardening, browser tests, and docs polish (planned)

**Scope (planned)**

- Playwright happy-path and error-path browser checks.
- README finalization; known limitations accurate.

---

## Phase 5 — Deploy and verify (planned)

**Scope (planned)**

- Vercel deployment with env configured by the user.
- Verify production with a real API response.
- Public GitHub repository readiness (user-driven push/commit).

---

## Global phase rules

- No push/deploy/commit unless the user explicitly asks.
- No phase-specific dependencies early.
- Record real commands and outcomes in the phase report.
