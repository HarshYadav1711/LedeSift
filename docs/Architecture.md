# Architecture — LedeSift

## Overview

LedeSift is a single Next.js application. The browser will collect a URL; a Node.js Route Handler will perform fetch, extraction, and AI summarization. There is no separate backend service, database, or queue.

```
Browser (App Router UI)          [later phase]
    │  POST /api/summarize { url }
    ▼
Route Handler (Node.js runtime)  [later phase]
    │
    ▼
Phase 1 pipeline (implemented)
    │  validatePublicHttpUrl
    │  fetchHtmlSafely (SSRF-safe, pinned address)
    │  extractMainContent (Readability + jsdom)
    ▼
ExtractedPage → (Phase 3) Gemini → summary JSON
```

## Boundaries

| Layer | Responsibility | Must not |
| --- | --- | --- |
| UI (`src/app`) | Form, loading, summary/error display | Call Gemini or hold secrets |
| API route | Validate, fetch, extract, summarize, map errors | Trust client-supplied HTML as already-safe |
| Retrieval (`src/lib/fetch-html.ts`) | SSRF-safe HTML download | Execute scripts; follow unchecked redirects |
| Extraction (`src/lib/extract.ts`) | HTML → `ExtractedPage` | Call AI; perform network I/O |
| AI module | Text → summary string | Fetch URLs; expose raw SDK errors to clients |

## Implemented modules (Phase 1)

| Module | Role |
| --- | --- |
| `src/lib/errors.ts` | Controlled `RetrievalError` categories |
| `src/lib/ip.ts` | Public vs non-public IP classification (`ipaddr.js`) |
| `src/lib/url.ts` | Absolute HTTP(S) validation + redirect target checks (Zod input) |
| `src/lib/fetch-html.ts` | `fetchHtmlSafely()` with pinned DNS lookup |
| `src/lib/extract.ts` | `extractMainContent()` Readability + fallback |
| `src/lib/retrieve.ts` | `retrieveAndExtract()` composition helper |
| `src/lib/types.ts` | `ExtractedPage` contract |
| `src/lib/limits.ts` | Timeouts and size bounds |

No public HTTP scrape/summarize route is exposed in Phase 1.

## Extraction contract

```typescript
type ExtractedPage = {
  requestedUrl: string;   // caller URL after validation/normalization
  finalUrl: string;       // URL after allowed redirects
  title: string;          // page title or ""
  text: string;           // primary plain text
  wordCount: number;      // whitespace-delimited count of text
  extractionMethod: "readability" | "fallback";
  truncated: boolean;     // true when size bound applied
};
```

## URL acceptance rules

- Absolute `http:` / `https:` only.
- Standard ports only (80 / 443, including WHATWG-default empty port).
- No URL userinfo/credentials.
- Host required; localhost / `.local` / `.internal`-style names rejected.
- IP literals must be globally routable unicast (IPv4 and IPv6; mapped addresses unwrapped).
- DNS answers are filtered to public addresses before connect.

## SSRF invariants

1. **Validate URL syntax and policy before any network I/O.**
2. **Resolve DNS (or accept a literal), keep only public addresses.**
3. **Pin the outbound connection** with a custom `lookup` that returns only the validated address (Node `http`/`https`), preserving original hostname for `Host`, TLS SNI, and certificate verification.
4. **Never disable TLS verification** (`rejectUnauthorized: true`).
5. **Do not auto-follow redirects.** Each `Location` is resolved, re-validated, and re-pinned. Max **3** redirects.
6. **Overall timeout ~12s**; body cap **~2 MiB**; unsupported non-HTML content types rejected.
7. **No script execution and no remote resource loading** in jsdom.

## Limits (rationale)

| Limit | Value | Why |
| --- | --- | --- |
| Fetch timeout | 12s | Bound hung origins without feeling abandoned |
| Max redirects | 3 | Enough for common CMS redirects; limits hop abuse |
| Max HTML bytes | 2 MiB | Ordinary articles; stops memory exhaustion |
| Max extracted chars | 50_000 | Enough prose for summarization; bounds later model input |
| Min words / chars | 30 / 120 | Reject empty shells and nav-only pages |

## Error categories

`INVALID_URL` · `UNSAFE_URL` · `DNS_ERROR` · `FETCH_TIMEOUT` · `HTTP_ERROR` · `UNSUPPORTED_CONTENT` · `RESPONSE_TOO_LARGE` · `EXTRACTION_FAILED` · `INSUFFICIENT_CONTENT`

User-facing messages are stable and non-leaking. Optional `diagnostic` fields are for development logs only.

## AI boundary (later)

- Input: extracted plain text (already bounded) plus optional title.
- Output: summary string.
- Model: **Gemini 2.5 Flash-Lite** via the official maintained SDK.
- API key: server env `GEMINI_API_KEY` only.

## Security protections

1. **Secret hygiene** — no `NEXT_PUBLIC_` for keys; `.env*` gitignored except `.env.example`.
2. **Input validation** — Zod for string bounds; WHATWG URL parsing for structure.
3. **SSRF controls** — as above.
4. **Error mapping** — stable codes; no stack traces in user messages.
5. **Dependency surface** — approved libraries only; no scraping browsers.
6. **Deployment** — secrets via Vercel env configuration, not committed files.

## Runtime and hosting

- Next.js App Router on Vercel.
- Future Route Handlers use the Node.js runtime (required for jsdom / Readability / pinned sockets).
- No edge runtime for the summarize path.

## Testing architecture

- **Vitest** — URL/IP policy, fetch with injected resolver/transport, extraction fixtures.
- **Playwright** — later phase for browser flows.

## Explicit non-architecture

No database, auth, Redis, microservices, RAG, LangGraph, analytics, payments, or background jobs.
