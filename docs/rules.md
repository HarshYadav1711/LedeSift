# Engineering rules — LedeSift

## Governance

1. Inspect the current repository before making changes.
2. Record branch, HEAD, and working-tree status when starting phase work.
3. Preserve existing files and Git history. Reconcile documents; do not blindly overwrite.
4. Use stable, maintained, compatible dependencies.
5. Do not introduce paid or card-gated services.
6. Do not expose API credentials to the browser.
7. Do not invent successful API responses, tests, screenshots, or completed features.
8. Do not silently change the approved architecture or visual direction.
9. Do not make unrelated edits.
10. Validate every phase using real local checks.
11. Never push, deploy, or create Git commits automatically. Wait for explicit user authorization.
12. Stop after the authorized phase; wait for explicit authorization before the next phase.

## Dependency policy

- Install only what the current phase requires.
- Prefer official maintained SDKs and libraries named in Architecture.
- No paid APIs, browser scraping automation, or heavy unnecessary platforms.

## Security policy

- Secrets live in server environment variables only (e.g. `GEMINI_API_KEY`).
- Never prefix secrets with `NEXT_PUBLIC_`.
- Validate and sanitize all URL inputs with Zod before fetch.
- Fetch only `http:` / `https:` URLs; reject credentials in URLs, non-public schemes, and oversized responses.
- Do not follow redirects to private/link-local/metadata addresses (SSRF protections — see Architecture).
- Return meaningful, non-leaking error messages to the client.

## Documentation policy

- Authority order: Assignment > user decisions > rules > PRD > architecture > design > phases > phase prompt.
- Keep README setup-complete and accurate; use placeholders in `.env.example` only.
- Record known limitations honestly.

## Testing policy

- Prefer real checks over mocks for phase gates where feasible.
- Do not claim green tests without running them.
- Phase completion requires the checks listed in `docs/phases.md` for that phase.
