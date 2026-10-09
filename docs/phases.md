# Phases — LedeSift

Work proceeds phase by phase. **Do not start a phase until explicitly authorized.** Stop and report when a phase completes.

## Authority

Assignment > user decisions > rules > PRD > architecture > design > **this file** > phase prompt.

## Phase 0 — Foundation and Context Lock

**Status:** Complete (awaiting user commit authorization).

**Scope**

- Inspect environment and repository.
- Initialize Next.js (TypeScript, Tailwind, ESLint) if empty.
- Establish governance docs: `AGENTS.md`, `docs/*`, `README.md`, `.env.example`, `.gitignore`.
- Minimal scaffold only (design tokens / branded shell allowed).
- No scraping, model calls, result generation, or unapproved features.

**Validation**

- Dependency installation
- TypeScript check
- ESLint
- Production build
- Git diff inspection
- Secret/configuration hygiene review

**Exit:** Context locked; wait for Phase 1 authorization. No auto-commit.

---

## Phase 1 — UI shell and client contract

**Scope (planned)**

- Primary page: brand, tagline, URL form, loading and error regions, summary region.
- Client calls `POST /api/summarize` with the agreed JSON shape (handler may still be a stub or return structured “not implemented” only if authorized—prefer wiring UI against real contract as phases allow).
- Accessibility and responsive behavior per Design.md.

**Validation (planned):** lint, typecheck, build; manual UI review; no invented screenshots.

---

## Phase 2 — Fetch and extraction

**Scope (planned)**

- Install Readability + jsdom when needed.
- SSRF-aware fetch, HTML size/time limits.
- Extraction module returning title/text or typed failure.
- Integrate into summarize route (AI may still be stubbed until Phase 3 if split).

**Validation (planned):** unit tests on fixtures; real fetch against a basic public HTML page where safe.

---

## Phase 3 — Gemini summarization

**Scope (planned)**

- Official Gemini SDK; model Gemini 2.5 Flash-Lite.
- Server-only `GEMINI_API_KEY`.
- Map model failures to API error codes.
- End-to-end summarize path with a real API response.

**Validation (planned):** real local summarize against a basic page; no fabricated responses.

---

## Phase 4 — Hardening, tests, and docs polish

**Scope (planned)**

- Vitest coverage for validation/extraction/error mapping.
- Playwright happy-path and error-path browser checks.
- README finalization; known limitations accurate.

**Validation (planned):** full test suite green locally with genuine results.

---

## Phase 5 — Deploy and verify

**Scope (planned)**

- Vercel deployment with env configured by the user.
- Verify production with a real API response.
- Public GitHub repository readiness (user-driven push/commit).

**Validation (planned):** live URL returns a real summary; hygiene re-check.

---

## Global phase rules

- No push/deploy/commit unless the user explicitly asks.
- No phase-specific dependencies early.
- Record real commands and outcomes in the phase report.
