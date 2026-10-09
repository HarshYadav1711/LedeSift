# Requirements matrix — LedeSift

Authorized numbering: Phase 1 retrieval · Phase 2 Gemini · Phase 3 API/UI · later deploy.

| ID | Requirement | Phase | Status |
| --- | --- | --- | --- |
| FR-1 | URL input and submit | 3 | **Done** |
| FR-2 | Loading state | 3 | **Done** |
| FR-3 | `POST /api/summarize` JSON contract | 3 | **Done** |
| FR-4 | Extract main text (Readability + jsdom) | 1 | **Done** |
| FR-5 | Summarize with Gemini 2.5 Flash-Lite | 2 | **Done** |
| FR-6 | Display summary | 3 | **Done** |
| FR-7 | Meaningful errors | 1–3 | **Done (mapped)** |
| FR-8 | README + public GitHub | 0–5 | Draft updated |
| FR-9 | Deployed + verified with real API response | 5 | Not started |
| NFR-1 | Vercel deployable Next.js app | 0, 5 | Scaffolded |
| NFR-2 | Secrets never in browser | 0–3 | **Done** |
| NFR-3 | Responsive, semantic, accessible UI | 3 | **Done** |
| NFR-4 | Editorial visual system | 0–3 | **Done** |
| NFR-5 | Free-tier AI only | 2 | **Done** |
| NFR-6 | TypeScript + Zod | 1–3 | **Done** |
| NFR-7 | Vitest (+ Playwright later) | 1–3 | **Vitest Done** |
| SEC-1 | `.env.example` placeholders | 0–2 | Done |
| SEC-2 | SSRF / URL fetch protections | 1 | **Done** |
| SEC-3 | Errors do not leak secrets | 1–3 | **Done** |
| SEC-4 | Prompt/data isolation | 2 | **Done** |
| SEC-5 | Platform rate limiting before public expose | 5 | Documented prerequisite |
| DEP-1 | braces advisory (eslint, dev-only) | 0+ | Accepted baseline |

## Coverage notes

- Phase 3 delivers local full-stack behavior. Production deploy verification remains Phase 5.
- Default `npm test` keeps live network smokes skipped (opt-in scripts only).
