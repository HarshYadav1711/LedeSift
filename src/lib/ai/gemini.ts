import { GoogleGenAI, Type, type Schema } from "@google/genai";
import { RetrievalError } from "@/lib/errors";
import {
  AI_MAX_OUTPUT_TOKENS,
  AI_TIMEOUT_MS,
  DEFAULT_GEMINI_MODEL,
  MAX_KEY_POINT_CHARS,
  MAX_KEY_POINTS,
  MAX_SUMMARY_CHARS,
  MIN_KEY_POINTS,
  MIN_SUMMARY_CHARS,
} from "@/lib/ai/limits";

export type GeminiGenerateRequest = {
  model: string;
  systemInstruction: string;
  userContent: string;
  maxOutputTokens?: number;
  abortSignal?: AbortSignal;
};

export type GeminiGenerateResult = {
  text: string;
  finishReason?: string;
  blockReason?: string;
};

export type GeminiProvider = {
  generateStructured(
    request: GeminiGenerateRequest,
  ): Promise<GeminiGenerateResult>;
};

export type GeminiConfig = {
  apiKey: string;
  model: string;
};

export function readGeminiConfig(
  env: Record<string, string | undefined> = process.env,
): GeminiConfig {
  const apiKey = env.GEMINI_API_KEY?.trim() ?? "";
  if (!apiKey) {
    throw new RetrievalError(
      "MISSING_API_CONFIG",
      "The summarization service is not configured.",
      "GEMINI_API_KEY missing",
    );
  }

  const model =
    env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;

  return { apiKey, model };
}

export const geminiOutputSchema: Schema = {
  type: Type.OBJECT,
  propertyOrdering: ["summary", "keyPoints"],
  required: ["summary", "keyPoints"],
  properties: {
    summary: {
      type: Type.STRING,
      description:
        "Concise 2-4 sentence factual summary of the supplied webpage extract only.",
      minLength: String(MIN_SUMMARY_CHARS),
      maxLength: String(MAX_SUMMARY_CHARS),
    },
    keyPoints: {
      type: Type.ARRAY,
      description:
        "3-5 non-repetitive takeaways when supported; fewer if the extract is thin.",
      minItems: String(MIN_KEY_POINTS),
      maxItems: String(MAX_KEY_POINTS),
      items: {
        type: Type.STRING,
        minLength: "1",
        maxLength: String(MAX_KEY_POINT_CHARS),
      },
    },
  },
};

function redactSecrets(value: string, apiKey?: string): string {
  let next = value;
  if (apiKey && apiKey.length > 0) {
    next = next.split(apiKey).join("[REDACTED]");
  }
  return next.replace(/key[=:]\s*["']?[\w-]{8,}/gi, "key=[REDACTED]");
}

export function mapGeminiError(
  error: unknown,
  apiKey?: string,
): RetrievalError {
  if (error instanceof RetrievalError) {
    return error;
  }

  const message =
    error instanceof Error ? error.message : String(error);
  const safe = redactSecrets(message, apiKey);
  const status =
    error && typeof error === "object" && "status" in error
      ? Number((error as { status?: number }).status)
      : undefined;
  const code =
    error && typeof error === "object" && "code" in error
      ? String((error as { code?: string }).code)
      : "";
  const lower = safe.toLowerCase();

  if (
    lower.includes("aborted") ||
    lower.includes("timeout") ||
    code === "ETIMEDOUT" ||
    code === "ABORT_ERR"
  ) {
    return new RetrievalError("AI_TIMEOUT", undefined, safe);
  }

  if (status === 401 || status === 403 || lower.includes("api key") || lower.includes("permission")) {
    return new RetrievalError("AI_AUTH_FAILED", undefined, safe);
  }

  if (status === 404 || lower.includes("not found") || lower.includes("not supported")) {
    return new RetrievalError("AI_MODEL_UNAVAILABLE", undefined, safe);
  }

  if (
    status === 429 ||
    lower.includes("resource_exhausted") ||
    lower.includes("rate") ||
    lower.includes("quota")
  ) {
    return new RetrievalError("AI_RATE_LIMITED", undefined, safe);
  }

  if (
    code === "ENOTFOUND" ||
    code === "ECONNRESET" ||
    code === "ECONNREFUSED" ||
    lower.includes("fetch failed") ||
    lower.includes("network")
  ) {
    return new RetrievalError("AI_NETWORK_ERROR", undefined, safe);
  }

  if (
    lower.includes("safety") ||
    lower.includes("blocked") ||
    lower.includes("prohibit")
  ) {
    return new RetrievalError("AI_SAFETY_BLOCKED", undefined, safe);
  }

  return new RetrievalError("AI_PROVIDER_ERROR", undefined, safe);
}

export function createGeminiProvider(config: GeminiConfig): GeminiProvider {
  const client = new GoogleGenAI({ apiKey: config.apiKey });

  return {
    async generateStructured(request) {
      try {
        const response = await client.models.generateContent({
          model: request.model || config.model,
          contents: request.userContent,
          config: {
            systemInstruction: request.systemInstruction,
            temperature: 0.2,
            maxOutputTokens:
              request.maxOutputTokens ?? AI_MAX_OUTPUT_TOKENS,
            responseMimeType: "application/json",
            responseSchema: geminiOutputSchema,
            abortSignal: request.abortSignal,
          },
        });

        const candidate = response.candidates?.[0];
        const finishReason = candidate?.finishReason
          ? String(candidate.finishReason)
          : undefined;
        const blockReason = response.promptFeedback?.blockReason
          ? String(response.promptFeedback.blockReason)
          : undefined;

        if (blockReason) {
          throw new RetrievalError(
            "AI_SAFETY_BLOCKED",
            undefined,
            `promptFeedback.blockReason=${blockReason}`,
          );
        }

        if (
          finishReason &&
          /safety|block|prohibit|recitation/i.test(finishReason)
        ) {
          throw new RetrievalError(
            "AI_SAFETY_BLOCKED",
            undefined,
            `finishReason=${finishReason}`,
          );
        }

        const text = response.text?.trim() ?? "";
        if (!text) {
          throw new RetrievalError(
            "AI_INVALID_OUTPUT",
            undefined,
            `Empty model text (finishReason=${finishReason ?? "unknown"})`,
          );
        }

        return { text, finishReason, blockReason };
      } catch (error) {
        throw mapGeminiError(error, config.apiKey);
      }
    },
  };
}

export async function withTimeout<T>(
  work: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number = AI_TIMEOUT_MS,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    return await work(controller.signal);
  } catch (error) {
    if (controller.signal.aborted) {
      throw new RetrievalError(
        "AI_TIMEOUT",
        undefined,
        "Application-level abort fired",
      );
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Cancellation note: AbortSignal cancels the client request only.
 * The Gemini service may still complete work and consume quota after abort.
 */
export const ABORT_LIMITATION =
  "AbortSignal is client-side only; provider-side work/quota may still occur after cancel.";
