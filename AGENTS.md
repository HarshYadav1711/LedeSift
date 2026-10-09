# AGENTS.md — LedeSift

Operating instructions for AI coding agents working on this repository.

## Product

**LedeSift** — *The page, distilled.*

A public, deployable Next.js application that accepts a webpage URL, extracts main text from basic public HTML, summarizes it with a free-tier Gemini API, and displays the summary with loading and error states.

## Authority order

When instructions conflict, resolve in this order:

1. Assignment requirements
2. Explicit user decisions
3. `docs/rules.md`
4. `docs/PRD.md`
5. `docs/Architecture.md`
6. `docs/Design.md`
7. `docs/phases.md`
8. The current phase prompt

## Non-negotiables

- Do not add unsupported features, unnecessary infrastructure, or paid/card-gated dependencies.
- Do not expose API credentials to the browser. Server-only env vars only.
- Do not invent successful API responses, tests, screenshots, or completed features.
- Do not silently change the approved architecture or visual direction.
- Do not install phase-specific dependencies before they are needed.
- Never push, deploy, or create Git commits unless the user explicitly authorizes it.
- Stop after the authorized phase and wait for explicit authorization before the next phase.

## Out of scope (do not introduce)

Database, authentication, browser automation for scraping, Redis, microservices, RAG, LangGraph, analytics, payment services, background job queues.

## Stack (approved)

| Concern | Choice |
| --- | --- |
| Framework | Next.js App Router |
| UI | React + TypeScript + Tailwind CSS |
| API | Next.js Node.js Route Handlers (`POST /api/summarize`) |
| Extraction | Mozilla Readability + jsdom (Phase 1 libraries) |
| AI | Gemini 2.5 Flash-Lite via `@google/genai` (Phase 2 libraries) |
| Validation | Zod (URL input + AI output; HTTP API later) |
| Unit/integration tests | Vitest (Phase 1–2+) |
| Browser tests | Playwright (later phase) |
| Deploy | Vercel |

## Working method

1. Inspect the repository and relevant docs before changing code.
2. Implement only the authorized phase scope.
3. Validate with real local checks; record genuine results.
4. Prefer reconciliation over overwriting existing documents.
5. Keep diffs focused; no unrelated edits.

## Next.js runtime note

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Phase gate

Current authorized work: **Phase 5 — Secure production deployment and final submission**. Protected-deployment stage complete; **do not start public release** until explicitly authorized.
