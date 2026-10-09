import { z } from "zod";
import {
  MAX_KEY_POINT_CHARS,
  MAX_KEY_POINTS,
  MAX_SUMMARY_CHARS,
  MIN_KEY_POINTS,
  MIN_SUMMARY_CHARS,
} from "@/lib/ai/limits";
import type { ExtractionMethod } from "@/lib/types";

export const aiSummarySchema = z.object({
  summary: z
    .string()
    .trim()
    .min(MIN_SUMMARY_CHARS)
    .max(MAX_SUMMARY_CHARS),
  keyPoints: z
    .array(
      z
        .string()
        .trim()
        .min(1)
        .max(MAX_KEY_POINT_CHARS),
    )
    .min(MIN_KEY_POINTS)
    .max(MAX_KEY_POINTS),
});

export type AISummary = z.infer<typeof aiSummarySchema>;

export type SummarizationSourceMeta = {
  requestedUrl: string;
  finalUrl: string;
  title: string;
  wordCount: number;
  extractionMethod: ExtractionMethod;
  extractionTruncated: boolean;
};

export type SummarizationResult = {
  summary: string;
  keyPoints: string[];
  /** True when extracted text was truncated for the model input budget. */
  inputTruncated: boolean;
  /** Approximate character count of source text sent to the model. */
  inputCharCount: number;
  source: SummarizationSourceMeta;
};

/** JSON Schema-compatible shape for Gemini responseSchema / responseJsonSchema. */
export const geminiResponseJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "keyPoints"],
  properties: {
    summary: {
      type: "string",
      description:
        "Concise 2-4 sentence factual summary of the supplied webpage extract only.",
      minLength: MIN_SUMMARY_CHARS,
      maxLength: MAX_SUMMARY_CHARS,
    },
    keyPoints: {
      type: "array",
      description:
        "3-5 non-repetitive takeaways when the source supports them; fewer if not.",
      minItems: MIN_KEY_POINTS,
      maxItems: MAX_KEY_POINTS,
      items: {
        type: "string",
        minLength: 1,
        maxLength: MAX_KEY_POINT_CHARS,
      },
    },
  },
} as const;
