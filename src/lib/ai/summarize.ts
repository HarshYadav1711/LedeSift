import { budgetModelInput } from "@/lib/ai/budget";
import {
  createGeminiProvider,
  readGeminiConfig,
  withTimeout,
  type GeminiProvider,
} from "@/lib/ai/gemini";
import {
  AI_MAX_OUTPUT_TOKENS,
  AI_TIMEOUT_MS,
  DEFAULT_GEMINI_MODEL,
} from "@/lib/ai/limits";
import { buildPromptFromExtractedPage } from "@/lib/ai/prompt";
import {
  aiSummarySchema,
  type SummarizationResult,
} from "@/lib/ai/schemas";
import { RetrievalError } from "@/lib/errors";
import type { ExtractedPage } from "@/lib/types";

export type SummarizeOptions = {
  provider?: GeminiProvider;
  model?: string;
  apiKey?: string;
  maxInputChars?: number;
  timeoutMs?: number;
  maxOutputTokens?: number;
};

function parseModelJson(raw: string) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new RetrievalError(
      "AI_INVALID_OUTPUT",
      undefined,
      error instanceof Error ? error.message : "JSON.parse failed",
    );
  }

  const result = aiSummarySchema.safeParse(parsed);
  if (!result.success) {
    throw new RetrievalError(
      "AI_INVALID_OUTPUT",
      undefined,
      result.error.message,
    );
  }

  return result.data;
}

function resolveProvider(options: SummarizeOptions): {
  provider: GeminiProvider;
  model: string;
} {
  if (options.provider) {
    return {
      provider: options.provider,
      model: options.model ?? DEFAULT_GEMINI_MODEL,
    };
  }

  const config = options.apiKey
    ? {
        apiKey: options.apiKey,
        model: options.model ?? DEFAULT_GEMINI_MODEL,
      }
    : readGeminiConfig();

  return {
    provider: createGeminiProvider(config),
    model: options.model ?? config.model,
  };
}

/**
 * Summarize an already-extracted page with Gemini.
 * Source metadata always comes from `page`, never from model fields.
 */
export async function summarizeExtractedPage(
  page: ExtractedPage,
  options: SummarizeOptions = {},
): Promise<SummarizationResult> {
  const budgeted = budgetModelInput(page, options.maxInputChars);
  const prompt = buildPromptFromExtractedPage({
    title: page.title,
    text: budgeted.text,
    finalUrl: page.finalUrl,
  });

  const { provider, model } = resolveProvider(options);
  const timeoutMs = options.timeoutMs ?? AI_TIMEOUT_MS;

  const generated = await withTimeout(
    (abortSignal) =>
      provider.generateStructured({
        model,
        systemInstruction: prompt.systemInstruction,
        userContent: prompt.userContent,
        maxOutputTokens: options.maxOutputTokens ?? AI_MAX_OUTPUT_TOKENS,
        abortSignal,
      }),
    timeoutMs,
  );

  const validated = parseModelJson(generated.text);

  return {
    summary: validated.summary,
    keyPoints: validated.keyPoints,
    inputTruncated: budgeted.inputTruncated,
    inputCharCount: budgeted.inputCharCount,
    source: {
      requestedUrl: page.requestedUrl,
      finalUrl: page.finalUrl,
      title: page.title,
      wordCount: page.wordCount,
      extractionMethod: page.extractionMethod,
      extractionTruncated: page.truncated,
    },
  };
}
