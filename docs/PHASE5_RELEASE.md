# Phase 5 release — LedeSift

**Status:** PROTECTED DEPLOYMENT VERIFIED · GitHub synchronized · **Public release not authorized** · Final submission pending

**Do not treat this document as authorization to remove Production authentication.**

## Status matrix

| Item | Status |
| --- | --- |
| Protected deployment verified | **Yes** — SSO All Deployments; live Gemini; Node 24; `maxDuration` 60 |
| Production WAF verified | **Yes** — `ledesift-summarize-limit` published and enforced |
| GitHub synchronization | **Done** — `main` @ `d5be78c` on https://github.com/HarshYadav1711/LedeSift |
| Git → Vercel production deploy | **Done** — production deployment SHA matches `d5be78c` |
| Public release | **Not authorized** — authentication remains All Deployments |
| Final submission | **Pending** |

## Hobby eligibility (documented)

Personal Hobby use for this independently developed recruitment-assessment project is treated as eligible under Vercel’s personal/noncommercial Hobby rules (no monetization, no team commercial use, no Pro upgrade). Residual fair-use / ToS judgment remains with the account holder.

## Git / Vercel parity (observed)

| Item | Value |
| --- | --- |
| GitHub | `https://github.com/HarshYadav1711/LedeSift` (public, default branch `main`) |
| Vercel project | `ledesift` (`prj_uYtpIKavgR51hqCMaXl5mvEGxUVJ`) |
| Git link | `HarshYadav1711/LedeSift`, **production branch `main`** |
| Push to `main` | Triggers production deployment (confirmed for `d5be78c`) |
| Production aliases | `https://ledesift.vercel.app`, `https://ledesift-harshs-projects-fc8c193d.vercel.app` |
| Auth | `ssoProtection.deploymentType: "all"` (unauthenticated `/` → 302 → `vercel.com/sso-api`) |
| Runtime | Node.js 24.x / `nodejs24.x` |
| Function duration | `maxDuration = 60` (route export + `vercel.json`) |
| Env (Production) | `GEMINI_API_KEY`, `GEMINI_MODEL` Encrypted — values not printed |
| Preview env | Not configured |

## Local validation baseline (Phase 5 / 5B)

| Command | Expected |
| --- | --- |
| `npm audit --omit=dev` | 0 vulnerabilities |
| `npm audit` | 5 high `braces` via `eslint-config-next` (dev baseline; no force upgrade) |
| `npm ls jsdom` | `jsdom@26.1.0` |
| Production build | `next build --webpack` |

## Production defects addressed in Phase 5 / 5B

1. Empty HTTP 500 — jsdom 27+ ESM `@exodus/bytes` under Vercel loader → pin `jsdom@26.1.0` + webpack production build.
2. WAF 429 UX — map non-`SummarizeResponse` / empty 429 to shared rate-limit handling; user copy describes **request** throttling (not Gemini quota).
3. Webpack CSS gap (5B) — `@tailwindcss/turbopack` alone does not process Tailwind under `next build --webpack` → add `postcss.config.mjs` + `@tailwindcss/postcss` so production utilities (layout, touch targets, wrapping) apply. **Live production at `d5be78c` still serves CSS without utility classes** (fonts/globals only); this fix is local/uncommitted until the next authorized commit + Git-triggered deploy.

## WAF

| Field | Value |
| --- | --- |
| Rule | `ledesift-summarize-limit` (`rule_ledesift_summarize_limit_HLI2gi`) |
| Match | POST `/api/summarize` |
| Key / algo | IP / fixed_window 60s / 5 → HTTP 429 |
| Active | Yes (`firewallEnabled: true`) |

Counters are **per region**.

## Public release

**Not authorized.** Do not remove authentication or claim public availability until explicit approval.
