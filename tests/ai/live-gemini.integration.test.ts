import { describe, expect, it } from "vitest";
import { summarizeExtractedPage } from "@/lib/ai/summarize";
import { SHORT_ARTICLE, makeExtractedPage } from "../helpers/extracted";

/**
 * Opt-in live check. Excluded from default `npm test`.
 * Run: npm run smoke:summarize
 */
const enabled =
  Boolean(process.env.GEMINI_API_KEY?.trim()) &&
  (process.env.LEDESIFT_LIVE_GEMINI === "1" ||
    process.env.npm_lifecycle_event === "smoke:summarize");

describe.runIf(enabled)("live Gemini integration", () => {
  it(
    "returns a Zod-validated summary from the configured model",
    async () => {
      const page = makeExtractedPage({
        text: SHORT_ARTICLE,
        title: "Coastal Forests Recover After Storm Season",
      });

      const result = await summarizeExtractedPage(page);

      expect(result.summary.length).toBeGreaterThan(20);
      expect(result.keyPoints.length).toBeGreaterThanOrEqual(0);
      expect(result.source.title).toBe(page.title);
      expect(result.summary.toLowerCase()).toMatch(/forest|storm|seedling|coast/);
    },
    45_000,
  );
});

describe.runIf(!enabled)("live Gemini integration (skipped)", () => {
  it("is blocked without LEDESIFT_LIVE_GEMINI=1 and GEMINI_API_KEY", () => {
    expect(enabled).toBe(false);
  });
});
