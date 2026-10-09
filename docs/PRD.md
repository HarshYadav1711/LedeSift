# Product Requirements Document — LedeSift

## Summary

LedeSift is a public web application that takes a webpage URL, extracts the main readable text from basic public HTML pages, and returns a concise AI-generated summary. It is built as a software-engineering assignment deliverable: deployable, documented, and verified with a real API response.

**Tagline:** The page, distilled.

## Goals

- Accept a user-supplied webpage URL.
- Fetch and extract main article/body text from basic public HTML.
- Summarize extracted content with a free-tier AI API (Gemini 2.5 Flash-Lite).
- Show clear loading state and meaningful errors.
- Ship a public GitHub repository with a complete setup README.
- Deploy (Vercel) and verify using a real API response.

## Non-goals

- Databases, user accounts, or authentication
- Browser automation / headless scraping for JS-heavy sites
- Redis, queues, microservices, RAG, LangGraph
- Analytics, payments, or monetization
- Paid or card-gated third-party services
- Summarizing authenticated, paywalled, or non-HTML resources

## Personas and primary use

A single anonymous visitor pastes a public article URL and wants a short, readable summary without leaving the page.

## Complete user journey

1. Visitor opens the deployed or local LedeSift homepage.
2. Sees product name, tagline, and a URL input with a submit control.
3. Enters an `http`/`https` URL and submits.
4. UI enters a loading state (submit disabled / progress indicated; no fake success).
5. Client sends `POST /api/summarize` with `{ "url": "<string>" }`.
6. Server validates the URL, fetches HTML, extracts main text, calls Gemini, returns summary JSON.
7. UI displays the summary in a readable layout.
8. On failure, UI shows a meaningful error (invalid URL, fetch failure, empty content, model error, rate limit, etc.) without exposing secrets or stack traces.
9. Visitor may correct the URL and retry.

## Functional requirements

| ID | Requirement |
| --- | --- |
| FR-1 | URL input and submit on the primary page |
| FR-2 | Client-side loading state while the request is in flight |
| FR-3 | Server route accepts JSON `{ url }` and returns structured success/error |
| FR-4 | Extract main text from basic public HTML (Readability + jsdom) |
| FR-5 | Summarize extracted text with Gemini 2.5 Flash-Lite (official SDK) |
| FR-6 | Display summary text to the user |
| FR-7 | Display meaningful errors for validation, network, extraction, and AI failures |
| FR-8 | README covers clone, env setup, local run, test, and deploy |
| FR-9 | Deployed app verified with a real API response |

## Non-functional requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | Public, deployable on Vercel |
| NFR-2 | API keys never shipped to the browser |
| NFR-3 | Responsive layout; accessible form controls; semantic HTML |
| NFR-4 | Editorial visual system per Design.md |
| NFR-5 | Free-tier compatible AI usage |
| NFR-6 | Type-safe TypeScript; Zod at API boundary |
| NFR-7 | Automated checks: Vitest (unit/integration), Playwright (browser) |

## Request–response contract (planned)

### `POST /api/summarize`

**Request**

```json
{ "url": "https://example.com/article" }
```

**Success `200`**

```json
{
  "summary": "…",
  "title": "Optional extracted title",
  "sourceUrl": "https://example.com/article"
}
```

**Error `4xx` / `5xx`**

```json
{
  "error": {
    "code": "INVALID_URL | FETCH_FAILED | EMPTY_CONTENT | AI_FAILED | RATE_LIMITED | INTERNAL",
    "message": "Human-readable explanation"
  }
}
```

Exact field shapes may be refined in implementation phases but must remain JSON, typed with Zod, and documented if changed.

## Success criteria

- A stranger can clone the repo, configure env from `.env.example`, run locally, and obtain a real summary for a basic public HTML page.
- Production deployment returns a real model summary for at least one verified URL.
- No secrets in the repository or client bundles.

## Known product limitations

- Best-effort extraction on static/basic HTML; JS-rendered or heavily paywalled pages may fail.
- Free-tier model quotas and latency apply.
- No persistence of history or user accounts.
