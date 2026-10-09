import type { SummarizeSuccess } from "@/lib/api/contracts";
import { buildSourcePreview } from "@/lib/api/preview";
import {
  summarizeExtractedPage as defaultSummarizeExtractedPage,
  type SummarizeOptions,
} from "@/lib/ai/summarize";
import { retrieveAndExtract as defaultRetrieveAndExtract } from "@/lib/retrieve";
import type { FetchHtmlOptions } from "@/lib/fetch-html";
import type { ExtractedPage } from "@/lib/types";

export type OrchestrateDeps = {
  retrieveAndExtract?: (
    url: string,
    options?: FetchHtmlOptions,
  ) => Promise<ExtractedPage>;
  summarizeExtractedPage?: (
    page: ExtractedPage,
    options?: SummarizeOptions,
  ) => Promise<Awaited<ReturnType<typeof defaultSummarizeExtractedPage>>>;
};

/**
 * Full server pipeline: retrieve/extract → summarize → public success payload.
 * Does not perform an internal HTTP round-trip.
 */
export async function orchestrateSummarize(
  url: string,
  deps: OrchestrateDeps = {},
): Promise<SummarizeSuccess> {
  const retrieve = deps.retrieveAndExtract ?? defaultRetrieveAndExtract;
  const summarize =
    deps.summarizeExtractedPage ?? defaultSummarizeExtractedPage;

  const extracted = await retrieve(url);
  const summarized = await summarize(extracted);

  return {
    ok: true,
    data: {
      source: {
        requestedUrl: summarized.source.requestedUrl,
        finalUrl: summarized.source.finalUrl,
        title: summarized.source.title,
        wordCount: summarized.source.wordCount,
        extractionMethod: summarized.source.extractionMethod,
      },
      summary: summarized.summary,
      keyPoints: summarized.keyPoints,
      coverage: {
        extractionTruncated: summarized.source.extractionTruncated,
        inputTruncated: summarized.inputTruncated,
      },
      sourcePreview: buildSourcePreview(extracted.text),
    },
  };
}
