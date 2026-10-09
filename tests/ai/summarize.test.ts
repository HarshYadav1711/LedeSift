import { describe, expect, it, vi } from "vitest";
import { MAX_MODEL_INPUT_CHARS } from "@/lib/ai/limits";
import type { GeminiProvider } from "@/lib/ai/gemini";
import { summarizeExtractedPage } from "@/lib/ai/summarize";
import { SYSTEM_INSTRUCTION } from "@/lib/ai/prompt";
import { RetrievalError } from "@/lib/errors";
import {
  INJECTION_ARTICLE,
  SHORT_ARTICLE,
  makeExtractedPage,
} from "../helpers/extracted";

function providerFrom(
  impl: GeminiProvider["generateStructured"],
): GeminiProvider {
  return { generateStructured: impl };
}

const VALID_OUTPUT = {
  summary:
    "Coastal forests recovered faster than expected after storms. Mixed-species stands retained moisture and reduced erosion, prompting local planting changes.",
  keyPoints: [
    "Seedling density rebounded across surveyed plots.",
    "Mixed-species stands held moisture better than monocultures.",
    "Conservation groups adapted planting schedules.",
  ],
};

describe("summarizeExtractedPage", () => {
  it("returns a validated summary for a short article", async () => {
    const page = makeExtractedPage({ text: SHORT_ARTICLE });
    const generateStructured = vi.fn(async () => ({
      text: JSON.stringify(VALID_OUTPUT),
    }));

    const result = await summarizeExtractedPage(page, {
      provider: providerFrom(generateStructured),
    });

    expect(result.summary).toContain("Coastal forests");
    expect(result.keyPoints).toHaveLength(3);
    expect(result.inputTruncated).toBe(false);
    expect(result.source.title).toBe(page.title);
    expect(generateStructured).toHaveBeenCalledOnce();
  });

  it("respects input limits for longer articles", async () => {
    const longText = Array.from({ length: 80 }, (_, i) => {
      return `Paragraph ${i}. ${SHORT_ARTICLE}`;
    }).join("\n\n");
    const page = makeExtractedPage({ text: longText, truncated: false });

    const generateStructured = vi.fn(async (request) => {
      expect(request.userContent.length).toBeLessThan(
        MAX_MODEL_INPUT_CHARS + 2_000,
      );
      return { text: JSON.stringify(VALID_OUTPUT) };
    });

    const result = await summarizeExtractedPage(page, {
      provider: providerFrom(generateStructured),
      maxInputChars: 800,
    });

    expect(result.inputTruncated).toBe(true);
    expect(result.inputCharCount).toBeLessThanOrEqual(800);
  });

  it("rejects inadequate source text before calling the provider", async () => {
    const generateStructured = vi.fn(async () => ({
      text: JSON.stringify(VALID_OUTPUT),
    }));

    try {
      await summarizeExtractedPage(
        makeExtractedPage({ text: "Too short." }),
        { provider: providerFrom(generateStructured) },
      );
      throw new Error("expected throw");
    } catch (error) {
      expect((error as RetrievalError).code).toBe("AI_INPUT_INVALID");
    }

    expect(generateStructured).not.toHaveBeenCalled();
  });

  it("reports AI input truncation accurately", async () => {
    const page = makeExtractedPage({
      text: `${SHORT_ARTICLE}\n\n`.repeat(40),
    });
    const result = await summarizeExtractedPage(page, {
      maxInputChars: 500,
      provider: providerFrom(async () => ({
        text: JSON.stringify(VALID_OUTPUT),
      })),
    });
    expect(result.inputTruncated).toBe(true);
  });

  it("preserves extractionTruncated metadata from Phase 1", async () => {
    const page = makeExtractedPage({
      text: SHORT_ARTICLE,
      truncated: true,
    });
    const result = await summarizeExtractedPage(page, {
      provider: providerFrom(async () => ({
        text: JSON.stringify(VALID_OUTPUT),
      })),
    });
    expect(result.source.extractionTruncated).toBe(true);
    expect(result.inputTruncated).toBe(false);
  });

  it("does not let model output overwrite source title or URLs", async () => {
    const page = makeExtractedPage({
      text: SHORT_ARTICLE,
      title: "Real Title",
      requestedUrl: "https://example.com/requested",
      finalUrl: "https://example.com/final",
    });

    const poisoned = {
      summary: VALID_OUTPUT.summary,
      keyPoints: VALID_OUTPUT.keyPoints,
      title: "Hacked Title",
      requestedUrl: "https://evil.example/",
      finalUrl: "https://evil.example/final",
    };

    const result = await summarizeExtractedPage(page, {
      provider: providerFrom(async () => ({
        text: JSON.stringify(poisoned),
      })),
    });

    expect(result.source.title).toBe("Real Title");
    expect(result.source.requestedUrl).toBe("https://example.com/requested");
    expect(result.source.finalUrl).toBe("https://example.com/final");
  });

  it("accepts valid structured JSON", async () => {
    const result = await summarizeExtractedPage(
      makeExtractedPage({ text: SHORT_ARTICLE }),
      {
        provider: providerFrom(async () => ({
          text: JSON.stringify(VALID_OUTPUT),
        })),
      },
    );
    expect(result.keyPoints.length).toBeGreaterThan(0);
  });

  it("rejects invalid JSON", async () => {
    try {
      await summarizeExtractedPage(
        makeExtractedPage({ text: SHORT_ARTICLE }),
        {
          provider: providerFrom(async () => ({ text: "not-json" })),
        },
      );
      throw new Error("expected throw");
    } catch (error) {
      expect((error as RetrievalError).code).toBe("AI_INVALID_OUTPUT");
    }
  });

  it("rejects missing fields", async () => {
    try {
      await summarizeExtractedPage(
        makeExtractedPage({ text: SHORT_ARTICLE }),
        {
          provider: providerFrom(async () => ({
            text: JSON.stringify({ summary: VALID_OUTPUT.summary }),
          })),
        },
      );
      throw new Error("expected throw");
    } catch (error) {
      expect((error as RetrievalError).code).toBe("AI_INVALID_OUTPUT");
    }
  });

  it("rejects empty summary", async () => {
    try {
      await summarizeExtractedPage(
        makeExtractedPage({ text: SHORT_ARTICLE }),
        {
          provider: providerFrom(async () => ({
            text: JSON.stringify({ summary: "   ", keyPoints: [] }),
          })),
        },
      );
      throw new Error("expected throw");
    } catch (error) {
      expect((error as RetrievalError).code).toBe("AI_INVALID_OUTPUT");
    }
  });

  it("rejects malformed keyPoints", async () => {
    try {
      await summarizeExtractedPage(
        makeExtractedPage({ text: SHORT_ARTICLE }),
        {
          provider: providerFrom(async () => ({
            text: JSON.stringify({
              summary: VALID_OUTPUT.summary,
              keyPoints: ["ok", ""],
            }),
          })),
        },
      );
      throw new Error("expected throw");
    } catch (error) {
      expect((error as RetrievalError).code).toBe("AI_INVALID_OUTPUT");
    }
  });

  it("handles provider rate limits", async () => {
    try {
      await summarizeExtractedPage(
        makeExtractedPage({ text: SHORT_ARTICLE }),
        {
          provider: providerFrom(async () => {
            throw new RetrievalError("AI_RATE_LIMITED");
          }),
        },
      );
      throw new Error("expected throw");
    } catch (error) {
      expect((error as RetrievalError).code).toBe("AI_RATE_LIMITED");
    }
  });

  it("handles provider timeout", async () => {
    try {
      await summarizeExtractedPage(
        makeExtractedPage({ text: SHORT_ARTICLE }),
        {
          timeoutMs: 30,
          provider: providerFrom(async ({ abortSignal }) => {
            await new Promise<void>((_, reject) => {
              abortSignal?.addEventListener("abort", () => {
                reject(new RetrievalError("AI_TIMEOUT"));
              });
            });
            return { text: "{}" };
          }),
        },
      );
      throw new Error("expected throw");
    } catch (error) {
      expect((error as RetrievalError).code).toBe("AI_TIMEOUT");
    }
  });

  it("handles authentication failure", async () => {
    try {
      await summarizeExtractedPage(
        makeExtractedPage({ text: SHORT_ARTICLE }),
        {
          provider: providerFrom(async () => {
            throw new RetrievalError("AI_AUTH_FAILED");
          }),
        },
      );
      throw new Error("expected throw");
    } catch (error) {
      expect((error as RetrievalError).code).toBe("AI_AUTH_FAILED");
    }
  });

  it("handles missing API key when no provider is injected", async () => {
    const previous = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    try {
      await summarizeExtractedPage(
        makeExtractedPage({ text: SHORT_ARTICLE }),
      );
      throw new Error("expected throw");
    } catch (error) {
      expect((error as RetrievalError).code).toBe("MISSING_API_CONFIG");
    } finally {
      if (previous === undefined) {
        delete process.env.GEMINI_API_KEY;
      } else {
        process.env.GEMINI_API_KEY = previous;
      }
    }
  });

  it("handles safety-blocked responses", async () => {
    try {
      await summarizeExtractedPage(
        makeExtractedPage({ text: SHORT_ARTICLE }),
        {
          provider: providerFrom(async () => {
            throw new RetrievalError("AI_SAFETY_BLOCKED");
          }),
        },
      );
      throw new Error("expected throw");
    } catch (error) {
      expect((error as RetrievalError).code).toBe("AI_SAFETY_BLOCKED");
    }
  });

  it("handles unexpected provider errors without leaking secrets", async () => {
    const secret = "super-secret-key-xyz";
    try {
      await summarizeExtractedPage(
        makeExtractedPage({ text: SHORT_ARTICLE }),
        {
          provider: providerFrom(async () => {
            throw new RetrievalError(
              "AI_PROVIDER_ERROR",
              undefined,
              `upstream failed for ${secret}`,
            );
          }),
        },
      );
      throw new Error("expected throw");
    } catch (error) {
      const err = error as RetrievalError;
      expect(err.code).toBe("AI_PROVIDER_ERROR");
      expect(err.message).not.toContain(secret);
    }
  });

  it("keeps prompt-injection text from altering trusted request structure", async () => {
    const generateStructured = vi.fn(async (request) => {
      expect(request.systemInstruction).toBe(SYSTEM_INSTRUCTION);
      expect(request.systemInstruction).not.toContain("IGNORE PREVIOUS");
      expect(request.userContent).toContain("IGNORE PREVIOUS");
      expect(request.userContent).toContain(
        "<<<UNTRUSTED_WEBPAGE_EXTRACT_START>>>",
      );
      return { text: JSON.stringify(VALID_OUTPUT) };
    });

    await summarizeExtractedPage(
      makeExtractedPage({ text: `${SHORT_ARTICLE}\n\n${INJECTION_ARTICLE}` }),
      { provider: providerFrom(generateStructured) },
    );

    expect(generateStructured).toHaveBeenCalledOnce();
  });
});
