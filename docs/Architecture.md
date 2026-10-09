# Architecture — LedeSift

## Overview

LedeSift is a single Next.js application. The browser will collect a URL; a Node.js Route Handler will perform fetch, extraction, and AI summarization. There is no separate backend service, database, or queue.

```
Browser (App Router UI)          [Phase 3]
    │  POST /api/summarize { url }
    ▼
Route Handler (nodejs runtime)   [Phase 3]
    │  parse JSON (~4 KiB) + Phase 1 URL validate
    │  orchestrateSummarize()
    ▼
Phase 1 retrieve/extract → Phase 2 summarize
    ▼
SummarizeSuccess JSON (bounded sourcePreview, coverage flags)
```

## Boundaries

| Layer | Responsibility | Must not |
| --- | --- | --- |
| UI (`src/app`) | Form, loading, summary/error display | Call Gemini or hold secrets |
| API route | Validate, fetch, extract, summarize, map errors | Trust client-supplied HTML as already-safe |
| Retrieval (`src/lib/fetch-html.ts`) | SSRF-safe HTML download | Execute scripts; follow unchecked redirects |
| Extraction (`src/lib/extract.ts`) | HTML → `ExtractedPage` | Call AI; perform network I/O |
| AI (`src/lib/ai`) | `ExtractedPage` → validated summary | Fetch pages; trust model JSON without Zod; expose secrets |

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

## Implemented modules (Phase 3)

| Module | Role |
| --- | --- |
| `src/app/api/summarize/route.ts` | `POST` only, `runtime = "nodejs"` |
| `src/lib/api/parse-request.ts` | Content-type + body-size + Zod request |
| `src/lib/api/orchestrate.ts` | Direct library orchestration (injectable) |
| `src/lib/api/handler.ts` | Shared handler + error envelope |
| `src/lib/api/map-error.ts` | HTTP status + retryable mapping |
| `src/lib/api/preview.ts` | Bounded Unicode-safe source preview |
| `src/components/*` | Editorial form, result, preview, feedback |

Request body limit: **4 KiB** (measured from actual body bytes, not Content-Length alone).
Source preview: **≤ 1,500** characters from extracted text.
Cache: `no-store`. No wildcard CORS.

**Production prerequisite:** platform-level rate limiting before public exposure. This app does not implement distributed in-memory rate limiting.

## Implemented modules (Phase 2)

| Module | Role |
| --- | --- |
| `src/lib/ai/prompt.ts` | Trusted system instruction + delimited untrusted extract |
| `src/lib/ai/budget.ts` | Deterministic model-input truncation |
| `src/lib/ai/schemas.ts` | Zod `AISummary` / `SummarizationResult` |
| `src/lib/ai/gemini.ts` | Official SDK provider + error mapping + timeout helper |
| `src/lib/ai/summarize.ts` | Orchestration: budget → prompt → generate → validate |

SDK: `@google/genai@2.28.0` · Model: `gemini-2.5-flash-lite` (override via `GEMINI_MODEL`)

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
3. **Pin the outbound connection** with a custom `lookup` that returns only the validated address (Node `http`/`https`), preserving original hostname for `Host`, TLS SNI, and certificate verification. The lookup supports both `(address, family)` and `{ all: true }` Node callback shapes (Phase 3 regression fix), plus the legacy callback-as-second-argument overload. Only the first public address is pinned; there is no automatic fallback to other resolved addresses after connect failure.
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

Retrieval/extraction: `INVALID_URL` · `UNSAFE_URL` · `DNS_ERROR` · `FETCH_TIMEOUT` · `HTTP_ERROR` · `UNSUPPORTED_CONTENT` · `RESPONSE_TOO_LARGE` · `EXTRACTION_FAILED` · `INSUFFICIENT_CONTENT`

Summarization: `MISSING_API_CONFIG` · `AI_INPUT_INVALID` · `AI_INPUT_TOO_LARGE` · `AI_AUTH_FAILED` · `AI_MODEL_UNAVAILABLE` · `AI_RATE_LIMITED` · `AI_TIMEOUT` · `AI_NETWORK_ERROR` · `AI_SAFETY_BLOCKED` · `AI_INVALID_OUTPUT` · `AI_PROVIDER_ERROR`

User-facing messages are stable and non-leaking. Optional `diagnostic` fields are for development logs only.

## AI boundary (Phase 2)

- Input: Phase 1 `ExtractedPage` (title + text + factual source metadata).
- Model input budget: **12_000** characters with paragraph/sentence-aware truncation; `inputTruncated` reported separately from `extractionTruncated`.
- Output: Zod-validated `{ summary, keyPoints }` merged with Phase 1 source metadata into `SummarizationResult`.
- Structured output via SDK `responseMimeType: application/json` + `responseSchema`; still re-validated with Zod.
- Prompt isolation: trusted `systemInstruction` never includes scraped text; extract is wrapped in explicit untrusted markers in the user content.
- Timeout: ~20s application abort. **AbortSignal is client-only** — provider-side work/quota may still occur after cancel.
- Retries: none for quota/auth failures; no uncontrolled retry loops.
- API key: server env `GEMINI_API_KEY` only (optional `GEMINI_MODEL`).

## Security protections

1. **Secret hygiene** — no `NEXT_PUBLIC_` for keys; `.env*` gitignored except `.env.example`.
2. **Input validation** — Zod for string bounds; WHATWG URL parsing for structure; Zod for model JSON.
3. **SSRF controls** — as above.
4. **Prompt injection resistance** — extract treated as data; system instructions forbid following embedded commands.
5. **Error mapping** — stable codes; diagnostics redact API keys; no stack traces in user messages.
6. **Dependency surface** — approved libraries only; no scraping browsers; single AI provider.
7. **Deployment** — secrets via Vercel env configuration, not committed files.

## Runtime and hosting

- Next.js App Router on Vercel.
- Future Route Handlers use the Node.js runtime (required for jsdom / Readability / pinned sockets).
- No edge runtime for the summarize path.

## Testing architecture

- **Vitest** — URL/IP policy, fetch fakes, extraction fixtures, AI provider injection, adversarial SSRF/prompt suites, opt-in live smoke (`smoke:summarize`, `smoke:fullstack`).
- **Playwright** — Chromium E2E against `next start` on dedicated port `4173`. Default suite mocks `POST /api/summarize` via route interception. Opt-in live browser smoke: `LEDESIFT_LIVE_E2E=1` / `npm run test:e2e:live`.

### Live smoke scope note

`npm run smoke:fullstack` exercises real retrieval + Gemini through `handleSummarizePost` in-process. It does **not** spawn an HTTP Next.js server. Browser → HTTP → Gemini is covered by the opt-in Playwright live project.

### Production rate limiting (Phase 5)

Platform WAF rate limiting is a deployment prerequisite. Provisional starting policy: IP-keyed fixed window, 60s / 5 requests, HTTP 429 on `POST /api/summarize`. Vercel counters are per-region; Hobby includes one rate-limit rule per project.

## Explicit non-architecture

No database, auth, Redis, microservices, RAG, LangGraph, analytics, payments, or background jobs.
