import { afterEach, describe, expect, it, vi } from "vitest";
import { requestSummarize } from "@/lib/api/client";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("requestSummarize platform 429 handling", () => {
  it("maps Vercel WAF JSON 429 to AI_RATE_LIMITED", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: {
              code: "429",
              message: "Too Many Requests",
              id: "bom1::test",
            },
          }),
          { status: 429, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    const result = await requestSummarize("https://example.com/article");
    expect(result).toEqual({
      kind: "error",
      code: "AI_RATE_LIMITED",
      message: "Too many requests. Please wait a moment and try again.",
      retryable: true,
      status: 429,
    });
    expect(result.kind === "error" && result.message).not.toMatch(/quota|gemini/i);
  });

  it("maps empty-body 429 to AI_RATE_LIMITED without quota wording", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("", { status: 429 })),
    );

    const result = await requestSummarize("https://example.com/article");
    expect(result.kind).toBe("error");
    if (result.kind === "error") {
      expect(result.code).toBe("AI_RATE_LIMITED");
      expect(result.status).toBe(429);
      expect(result.retryable).toBe(true);
      expect(result.message).toBe(
        "Too many requests. Please wait a moment and try again.",
      );
      expect(result.message).not.toMatch(/quota|gemini|summarization service/i);
    }
  });
});
