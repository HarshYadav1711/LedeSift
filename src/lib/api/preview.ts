import { MAX_SOURCE_PREVIEW_CHARS } from "@/lib/api/contracts";

/**
 * Build a bounded plain-text preview from extracted content.
 * Avoids cutting in the middle of a UTF-16 surrogate pair.
 */
export function buildSourcePreview(
  text: string,
  maxChars: number = MAX_SOURCE_PREVIEW_CHARS,
): string {
  const normalized = text.trim();
  if (normalized.length <= maxChars) {
    return normalized;
  }

  let end = maxChars;
  const code = normalized.charCodeAt(end - 1);
  // High surrogate — include the following low surrogate, or back up one.
  if (code >= 0xd800 && code <= 0xdbff && end < normalized.length) {
    end += 1;
  } else if (code >= 0xdc00 && code <= 0xdfff && end > 1) {
    end -= 1;
  }

  const slice = normalized.slice(0, end);
  const breakAt = Math.max(
    slice.lastIndexOf("\n\n"),
    slice.lastIndexOf(". "),
    slice.lastIndexOf(" "),
  );
  const cut =
    breakAt > maxChars * 0.55 ? slice.slice(0, breakAt + (slice[breakAt] === "." ? 1 : 0)) : slice;

  return `${cut.trimEnd()}…`;
}
