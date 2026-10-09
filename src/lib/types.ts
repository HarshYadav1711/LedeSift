/**
 * Normalized extraction result consumed by later summarization phases.
 * Every field is factual source/extraction metadata — never model-generated.
 */
export type ExtractionMethod = "readability" | "fallback";

export type ExtractedPage = {
  /** Original URL supplied by the caller (after validation/normalization). */
  requestedUrl: string;
  /** Final URL after following allowed redirects. */
  finalUrl: string;
  /** Document title when available; empty string if none. */
  title: string;
  /** Primary extracted plain text with normalized whitespace. */
  text: string;
  /** Deterministic whitespace-delimited word count of `text`. */
  wordCount: number;
  /** Which extraction strategy produced the text. */
  extractionMethod: ExtractionMethod;
  /** True when extracted text was truncated to the configured size bound. */
  truncated: boolean;
};

export type ResolvedAddress = {
  address: string;
  family: 4 | 6;
};
