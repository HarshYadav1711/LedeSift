# Phase 5 release — LedeSift

**Status:** PROTECTED-DEPLOYMENT STAGE COMPLETE — awaiting explicit approval for public release  
**Do not treat this document as authorization to remove Production authentication.**

## Hobby eligibility (documented)

Personal Hobby use for this independently developed recruitment-assessment project is treated as eligible under Vercel’s personal/noncommercial Hobby rules (no monetization, no team commercial use, no Pro upgrade). Residual fair-use / ToS judgment remains with the account holder.

## Starting Git state (context lock)

| Item | Value |
| --- | --- |
| Branch | `main` |
| HEAD at stage start | `94f8e07` — `test: harden LedeSift browser workflows and security boundaries` |
| Remote | `https://github.com/HarshYadav1711/LedeSift.git` |
| GitHub visibility (observed) | **PUBLIC** |
| Node (local) | v24.19.0 |
| Next.js | 16.4.0 |

## Protected deployment (verified this stage)

| Item | Value |
| --- | --- |
| Vercel project | `ledesift` (`prj_uYtpIKavgR51hqCMaXl5mvEGxUVJ`) |
| Team / scope | `harshs-projects-fc8c193d` / Hobby |
| Production alias | `https://ledesift-harshs-projects-fc8c193d.vercel.app` |
| Auth | Vercel Authentication **All Deployments** (unauthenticated `/` → `302` → `vercel.com/sso-api`) |
| Runtime | Node.js `nodejs24.x` (project Node 24.x) |
| Function duration | `maxDuration = 60` (`export` on route + `vercel.json`) |
| Env (Production) | `GEMINI_API_KEY` Encrypted; `GEMINI_MODEL=gemini-2.5-flash-lite` Encrypted — values not printed |
| Preview env | Not configured (no demonstrated need) |
| Framework | `nextjs`; production build `next build --webpack` |

## Local validation (this stage)

| Command | Exit | Result |
| --- | --- | --- |
| `npx tsc --noEmit` | 0 | |
| `npm run lint` | 0 | `.vercel/**` ignored |
| `npm run build` | 0 | `/` static; `/api/summarize` dynamic Node |
| `npm test` | 0 | **126 passed \| 2 skipped** |

## Production defects found and addressed

1. **Empty HTTP 500 on `/api/summarize`** — Vercel serverless Node loader rejects `require()` of ESM `@exodus/bytes` pulled by jsdom 27+. **Fix:** pin `jsdom@26.1.0` (whatwg-encoding path). Verified with live Gemini success after redeploy.
2. **WAF 429 UX** — Platform body `{"error":{"code":"429","message":"Too Many Requests",...}}` is not `SummarizeResponse`. Client previously showed generic INTERNAL_ERROR. **Fix:** map HTTP 429 (JSON or empty) to `AI_RATE_LIMITED` in `src/lib/api/client.ts` (unit tested).

## WAF (published / active)

| Field | Value |
| --- | --- |
| Rule id | `rule_ledesift_summarize_limit_HLI2gi` |
| Name | `ledesift-summarize-limit` |
| Path | `/api/summarize` (`eq`) |
| Method | `POST` (`eq`) |
| Key | `ip` |
| Algorithm | `fixed_window` |
| Window | 60 seconds |
| Threshold | 5 |
| Action | HTTP 429 (`rate_limit`) |
| Active config | `firewallEnabled: true`, custom rules count **1** |
| Enforcement evidence | Authenticated bypass burst: requests 1–5 → app JSON; request 6 → **429** platform JSON |

Notes: counters are **per region**. Authentication was **not** disabled for the test; protection bypass header was used.

## Public release

**Not authorized.** Production remains SSO-protected. Do not remove authentication or claim public availability until explicit approval.

## Manual Git (not performed)

No automatic commit or push in this stage. See checkpoint report for suggested commands.
