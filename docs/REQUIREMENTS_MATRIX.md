# Requirements matrix — LedeSift

Maps assignment and product requirements to design artifacts and delivery phases.

| ID | Requirement | Source | Spec | Phase | Status |
| --- | --- | --- | --- | --- | --- |
| FR-1 | URL input and submit | Assignment | PRD, Design | 1 | Not started |
| FR-2 | Loading state | Assignment | PRD, Design | 1 | Not started |
| FR-3 | `POST /api/summarize` JSON contract | Assignment / decisions | PRD, Architecture | 1–3 | Not started |
| FR-4 | Extract main text (Readability + jsdom) | Assignment / stack | Architecture | 2 | Not started |
| FR-5 | Summarize with Gemini 2.5 Flash-Lite (official SDK) | Assignment / stack | Architecture | 3 | Not started |
| FR-6 | Display summary | Assignment | PRD, Design | 1, 3 | Not started |
| FR-7 | Meaningful errors | Assignment | PRD, Architecture | 1–3 | Not started |
| FR-8 | Complete setup README + public GitHub | Assignment | README | 0, 4–5 | Phase 0 README draft |
| FR-9 | Deployed + verified with real API response | Assignment | phases | 5 | Not started |
| NFR-1 | Vercel deployable Next.js app | Decisions | Architecture | 0, 5 | Scaffolded |
| NFR-2 | Secrets never in browser | Rules | Architecture, rules | 0+ | Hygiene established |
| NFR-3 | Responsive, semantic, accessible UI | Design | Design | 1 | Tokens/shell only |
| NFR-4 | Editorial visual system | Design | Design | 0–1 | Tokens applied |
| NFR-5 | Free-tier AI only | Assignment | Architecture | 3 | Documented |
| NFR-6 | TypeScript + Zod at boundary | Stack | Architecture | 0, 2–3 | TS scaffold; Zod later |
| NFR-7 | Vitest + Playwright | Stack | Architecture, phases | 4 | Not installed yet |
| SEC-1 | `.env.example` placeholders only | Rules | README | 0 | Done |
| SEC-2 | SSRF / URL fetch protections | Architecture | Architecture | 2 | Specified |
| SEC-3 | Error responses do not leak secrets | Rules | Architecture | 2–3 | Specified |
| GOV-1 | Governance docs + authority order | Phase 0 | AGENTS, rules | 0 | Done |
| GOV-2 | No out-of-scope infra | Assignment | rules, Architecture | 0+ | Enforced in docs |
| LIM-1 | Basic public HTML only | PRD | PRD limitations | — | Documented |
| LIM-2 | Free-tier quota/latency | PRD | PRD limitations | — | Documented |

## Coverage notes

- Phase 0 locks context and scaffold; feature IDs remain **Not started** until their phase.
- Zod, Vitest, Playwright, Readability, jsdom, and Gemini SDK install only when their phase requires them.
- Status column must be updated with genuine completion—never speculative “done.”
