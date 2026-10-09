import { extractMainContent } from "@/lib/extract";
import { fetchHtmlSafely, type FetchHtmlOptions } from "@/lib/fetch-html";
import type { ExtractedPage } from "@/lib/types";

/**
 * Server-side pipeline: validate → fetch → extract.
 * Not exposed as a public HTTP route in Phase 1.
 */
export async function retrieveAndExtract(
  url: string,
  options?: FetchHtmlOptions,
): Promise<ExtractedPage> {
  const fetched = await fetchHtmlSafely(url, options);
  return extractMainContent({
    html: fetched.html,
    requestedUrl: fetched.requestedUrl,
    finalUrl: fetched.finalUrl,
  });
}
