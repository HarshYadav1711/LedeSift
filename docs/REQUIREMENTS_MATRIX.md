# Requirements matrix — LedeSift

Authorized numbering: Phase 1 retrieval · Phase 2 Gemini · Phase 3 API/UI · Phase 4 hardening · Phase 5 deploy.

| ID | Requirement | Phase | Status |
| --- | --- | --- | --- |
| FR-1 | URL input and submit | 3–4 | **Done** (E2E covered) |
| FR-2 | Loading state | 3–4 | **Done** (disabled controls + E2E) |
| FR-3 | `POST /api/summarize` JSON contract | 3 | **Done** |
| FR-4 | Extract main text (Readability + jsdom) | 1–4 | **Done** (extra fixtures) |
| FR-5 | Summarize with Gemini 2.5 Flash-Lite | 2 | **Done** |
| FR-6 | Display summary | 3–4 | **Done** (E2E covered) |
| FR-7 | Meaningful errors | 1–4 | **Done** (API + browser) |
| FR-8 | README + public GitHub | 0–5 | Draft updated |
| FR-9 | Deployed + verified with real API response | 5 | Not started |
| NFR-1 | Vercel deployable Next.js app | 0, 5 | Scaffolded |
| NFR-2 | Secrets never in browser | 0–4 | **Done** |
| NFR-3 | Responsive, semantic, accessible UI | 3–4 | **Done** (checked; not WCAG-certified) |
| NFR-4 | Editorial visual system | 0–4 | **Done** |
| NFR-5 | Free-tier AI only | 2 | **Done** |
| NFR-6 | TypeScript + Zod | 1–4 | **Done** |
| NFR-7 | Vitest + Playwright | 1–4 | **Done** |
| SEC-1 | `.env.example` placeholders | 0–2 | Done |
| SEC-2 | SSRF / URL fetch protections | 1–4 | **Done** (adversarial Vitest) |
| SEC-3 | Errors do not leak secrets | 1–4 | **Done** |
| SEC-4 | Prompt/data isolation | 2–4 | **Done** (mocked adversarial; not universal model proof) |
| SEC-5 | Platform rate limiting before public expose | 5 | Documented prerequisite + WAF proposal |
| DEP-1 | braces advisory (eslint, dev-only) | 0+ | Accepted baseline |

## Coverage notes

- Phase 4 proves local browser workflows with mocked API responses, plus opt-in live paths.
- Production deploy verification remains Phase 5.
- Default `npm test` / mocked Playwright keep live network smokes skipped (opt-in scripts only).
