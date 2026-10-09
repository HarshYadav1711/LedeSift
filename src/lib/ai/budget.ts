import { RetrievalError } from "@/lib/errors";
import { MAX_MODEL_INPUT_CHARS } from "@/lib/ai/limits";
import { MIN_TEXT_CHARS, MIN_WORD_COUNT } from "@/lib/limits";
import { countWords } from "@/lib/extract";
import type { ExtractedPage } from "@/lib/types";

export type BudgetedInput = {
  text: string;
  inputTruncated: boolean;
  inputCharCount: number;
};

/**
 * Deterministically bound extracted text for the model.
 * Prefers cutting on paragraph or sentence boundaries when possible.
 */
export function budgetModelInput(
  page: Pick<ExtractedPage, "text" | "wordCount">,
  maxChars: number = MAX_MODEL_INPUT_CHARS,
): BudgetedInput {
  const text = page.text.trim();
  const words = page.wordCount || countWords(text);

  if (!text || words < MIN_WORD_COUNT || text.length < MIN_TEXT_CHARS) {
    throw new RetrievalError(
      "AI_INPUT_INVALID",
      "The extracted page content is not suitable for summarization.",
      `words=${words} chars=${text.length}`,
    );
  }

  if (maxChars < MIN_TEXT_CHARS) {
    throw new RetrievalError(
      "AI_INPUT_TOO_LARGE",
      "The extracted content exceeds the summarization input limit.",
      `Configured maxChars ${maxChars} is below minimum usable size`,
    );
  }

  if (text.length <= maxChars) {
    return {
      text,
      inputTruncated: false,
      inputCharCount: text.length,
    };
  }

  const slice = text.slice(0, maxChars);
  const paragraphBreak = slice.lastIndexOf("\n\n");
  const sentenceBreak = Math.max(
    slice.lastIndexOf(". "),
    slice.lastIndexOf("? "),
    slice.lastIndexOf("! "),
  );

  let cutAt = -1;
  if (paragraphBreak >= maxChars * 0.5) {
    cutAt = paragraphBreak;
  } else if (sentenceBreak >= maxChars * 0.5) {
    cutAt = sentenceBreak + 1;
  } else {
    const space = slice.lastIndexOf(" ");
    cutAt = space > maxChars * 0.6 ? space : maxChars;
  }

  const truncated = slice.slice(0, cutAt).trimEnd();
  if (truncated.length < MIN_TEXT_CHARS) {
    throw new RetrievalError(
      "AI_INPUT_TOO_LARGE",
      "The extracted content exceeds the summarization input limit.",
      "Truncation would leave insufficient content",
    );
  }

  return {
    text: truncated,
    inputTruncated: true,
    inputCharCount: truncated.length,
  };
}
