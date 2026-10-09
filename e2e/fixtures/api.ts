import type { SummarizeSuccess } from "../../src/lib/api/contracts";

/** Realistic typed success payload for mocked browser E2E (not a live Gemini response). */
export function successPayload(
  overrides?: Partial<SummarizeSuccess["data"]>,
): SummarizeSuccess {
  const base: SummarizeSuccess["data"] = {
    source: {
      requestedUrl: "https://example.com/coastal-forests",
      finalUrl: "https://example.com/coastal-forests",
      title: "Coastal Forests Recover After Storms",
      wordCount: 186,
      extractionMethod: "readability",
    },
    summary:
      "Coastal forests recovered faster than expected after consecutive storm seasons. Mixed-species stands retained soil moisture and reduced dune erosion, prompting local planting changes.",
    keyPoints: [
      "Seedling density rebounded across surveyed plots.",
      "Mixed-species stands held moisture better than monocultures.",
      "Conservation groups adapted planting schedules.",
    ],
    coverage: {
      extractionTruncated: false,
      inputTruncated: false,
    },
    sourcePreview:
      "Coastal forests recovered faster than expected after consecutive storm seasons. Researchers measured seedling density across twenty plots.",
  };

  return {
    ok: true,
    data: {
      ...base,
      ...overrides,
      source: {
        ...base.source,
        ...overrides?.source,
      },
      coverage: {
        ...base.coverage,
        ...overrides?.coverage,
      },
    },
  };
}

export function errorPayload(
  code: string,
  message: string,
  retryable = false,
) {
  return {
    ok: false as const,
    error: { code, message, retryable },
  };
}
