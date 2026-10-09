import { z } from "zod";
import type { ExtractionMethod } from "@/lib/types";

/** Maximum JSON request body size (~4 KiB). */
export const MAX_REQUEST_BODY_BYTES = 4 * 1024;

/** Bounded extracted-text preview returned to the browser. */
export const MAX_SOURCE_PREVIEW_CHARS = 1_500;

export const summarizeRequestSchema = z
  .object({
    url: z.string().trim().min(1).max(2048),
  })
  .strict();

export type SummarizeRequest = z.infer<typeof summarizeRequestSchema>;

export type SummarizeSuccess = {
  ok: true;
  data: {
    source: {
      requestedUrl: string;
      finalUrl: string;
      title: string;
      wordCount: number;
      extractionMethod: ExtractionMethod;
    };
    summary: string;
    keyPoints: string[];
    coverage: {
      extractionTruncated: boolean;
      inputTruncated: boolean;
    };
    sourcePreview: string;
  };
};

export type SummarizeFailure = {
  ok: false;
  error: {
    code: string;
    message: string;
    retryable: boolean;
  };
};

export type SummarizeResponse = SummarizeSuccess | SummarizeFailure;
