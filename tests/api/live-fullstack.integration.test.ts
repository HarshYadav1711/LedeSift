import { describe, expect, it } from "vitest";
import { handleSummarizePost } from "@/lib/api/handler";

/**
 * Opt-in live full-stack check (real fetch + real Gemini).
 * Kept skipped under default `npm test`.
 * Run: npm run smoke:fullstack
 *
 * Phase 2 skipped live Gemini test remains separate in
 * tests/ai/live-gemini.integration.test.ts (opt-in without LEDESIFT_LIVE_GEMINI /
 * smoke script). Do not delete or rename that skip away.
 */
const enabled =
  Boolean(process.env.GEMINI_API_KEY?.trim()) &&
  (process.env.LEDESIFT_LIVE_FULLSTACK === "1" ||
    process.env.npm_lifecycle_event === "smoke:fullstack");

// Public, nonconfidential static HTML used for live verification.
// External pages can change; failures are recorded honestly in the Phase report.
const PUBLIC_URL = "https://quotes.toscrape.com/";

describe.runIf(enabled)("live full-stack summarize API", () => {
  it(
    "retrieves a public page, summarizes it, and returns bounded preview metadata",
    async () => {
      const request = new Request("http://localhost/api/summarize", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: PUBLIC_URL }),
      });

      const result = await handleSummarizePost(request);

      if (!result.body.ok) {
        // External pages can fail independently of local parser quality.
        throw new Error(
          `Live summarize failed for ${PUBLIC_URL}: ${result.status} ${result.body.error.code} — ${result.body.error.message}`,
        );
      }

      expect(result.status).toBe(200);
      expect(result.body.data.source.finalUrl).toMatch(/^https:\/\//);
      expect(result.body.data.summary.length).toBeGreaterThan(20);
      expect(result.body.data.sourcePreview.length).toBeGreaterThan(0);
      expect(result.body.data.sourcePreview.length).toBeLessThanOrEqual(1600);
      expect(JSON.stringify(result.body)).not.toMatch(/GEMINI_API_KEY|AIza/);
    },
    90_000,
  );
});

describe.runIf(!enabled)("live full-stack summarize API (skipped)", () => {
  it("is blocked without smoke:fullstack and GEMINI_API_KEY", () => {
    expect(enabled).toBe(false);
  });
});
