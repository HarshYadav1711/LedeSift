/** Overall wall-clock budget for a retrieval attempt including redirects. */
export const FETCH_TIMEOUT_MS = 12_000;

/** Maximum redirects followed (each destination re-validated). */
export const MAX_REDIRECTS = 3;

/** Maximum downloaded HTML body size (~2 MiB). */
export const MAX_HTML_BYTES = 2 * 1024 * 1024;

/** Maximum characters retained after extraction (bounds later model input). */
export const MAX_EXTRACTED_CHARS = 50_000;

/**
 * Minimum word count for usable primary content.
 * Below this, pages are treated as navigation shells or empty.
 */
export const MIN_WORD_COUNT = 30;

/** Minimum character length after whitespace normalization. */
export const MIN_TEXT_CHARS = 120;

export const USER_AGENT =
  "LedeSift/0.1 (+https://github.com/; webpage text extraction for summarization)";
