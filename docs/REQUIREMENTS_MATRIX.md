# Requirements matrix — LedeSift

Maps assignment and product requirements to design artifacts and delivery phases.

Phase numbering follows the authorized remapping: Phase 1 = retrieval/extraction; UI and Gemini follow.

| ID | Requirement | Source | Spec | Phase | Status |
| --- | --- | --- | --- | --- | --- |
| FR-1 | URL input and submit | Assignment | PRD, Design | 2 | Not started |
| FR-2 | Loading state | Assignment | PRD, Design | 2 | Not started |
| FR-3 | `POST /api/summarize` JSON contract | Assignment / decisions | PRD, Architecture | 2–3 | Not started |
| FR-4 | Extract main text (Readability + jsdom) | Assignment / stack | Architecture | 1 | **Done (library)** |
| FR-5 | Summarize with Gemini 2.5 Flash-Lite (official SDK) | Assignment / stack | Architecture | 3 | Not started |
| FR-6 | Display summary | Assignment | PRD, Design | 2, 3 | Not started |
| FR-7 | Meaningful errors | Assignment | PRD, Architecture | 1–3 | **Partial (library codes)** |
| FR-8 | Complete setup README + public GitHub | Assignment | README | 0, 4–5 | Phase 0/1 README draft |
| FR-9 | Deployed + verified with real API response | Assignment | phases | 5 | Not started |
| NFR-1 | Vercel deployable Next.js app | Decisions | Architecture | 0, 5 | Scaffolded |
| NFR-2 | Secrets never in browser | Rules | Architecture, rules | 0+ | Hygiene established |
| NFR-3 | Responsive, semantic, accessible UI | Design | Design | 2 | Tokens/shell only |
| NFR-4 | Editorial visual system | Design | Design | 0–2 | Tokens applied |
| NFR-5 | Free-tier AI only | Assignment | Architecture | 3 | Documented |
| NFR-6 | TypeScript + Zod at boundary | Stack | Architecture | 0–1 | **Zod on URL input** |
| NFR-7 | Vitest + Playwright | Stack | Architecture, phases | 1, 4 | **Vitest added** |
| SEC-1 | `.env.example` placeholders only | Rules | README | 0 | Done |
| SEC-2 | SSRF / URL fetch protections | Architecture | Architecture | 1 | **Done (library)** |
| SEC-3 | Error responses do not leak secrets | Rules | Architecture | 1+ | **Library messages safe** |
| GOV-1 | Governance docs + authority order | Phase 0 | AGENTS, rules | 0 | Done |
| GOV-2 | No out-of-scope infra | Assignment | rules, Architecture | 0+ | Enforced in docs |
| LIM-1 | Basic public HTML only | PRD | PRD limitations | — | Documented |
| LIM-2 | Free-tier quota/latency | PRD | PRD limitations | — | Documented |
| DEP-1 | braces advisory (eslint chain) | Phase 0 audit | phases | 0+ | Accepted baseline (dev-only) |

## Coverage notes

- Phase 1 delivers retrieval/extraction **libraries and tests**, not a public HTTP endpoint.
- Playwright and Gemini remain deferred.
- Status column must be updated with genuine completion—never speculative “done.”
