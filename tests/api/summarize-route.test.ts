import { describe, expect, it, vi } from "vitest";
import { MAX_REQUEST_BODY_BYTES } from "@/lib/api/contracts";
import { handleSummarizePost, methodNotAllowed } from "@/lib/api/handler";
import { RetrievalError } from "@/lib/errors";
import { SHORT_ARTICLE, makeExtractedPage } from "../helpers/extracted";

function jsonRequest(
  body: unknown,
  init?: { contentType?: string | null },
): Request {
  const payload = typeof body === "string" ? body : JSON.stringify(body);
  const headers = new Headers();
  if (init?.contentType !== null) {
    headers.set("content-type", init?.contentType ?? "application/json");
  }
  return new Request("http://localhost/api/summarize", {
    method: "POST",
    headers,
    body: payload,
  });
}

const successPage = makeExtractedPage({
  text: SHORT_ARTICLE,
  title: "Coastal Forests",
  requestedUrl: "https://example.com/a",
  finalUrl: "https://example.com/a",
  truncated: true,
});

const successSummary = {
  summary:
    "Coastal forests recovered after storms as mixed stands retained moisture and reduced erosion.",
  keyPoints: [
    "Seedling density rebounded.",
    "Mixed stands held moisture.",
    "Planting schedules changed.",
  ],
  inputTruncated: true,
  inputCharCount: 400,
  source: {
    requestedUrl: successPage.requestedUrl,
    finalUrl: successPage.finalUrl,
    title: successPage.title,
    wordCount: successPage.wordCount,
    extractionMethod: successPage.extractionMethod,
    extractionTruncated: true,
  },
};

describe("handleSummarizePost", () => {
  it("returns a successful response for a valid request", async () => {
    const retrieve = vi.fn(async () => successPage);
    const summarize = vi.fn(async () => successSummary);

    const result = await handleSummarizePost(
      jsonRequest({ url: "https://example.com/a" }),
      {
        retrieveAndExtract: retrieve,
        summarizeExtractedPage: summarize,
      },
    );

    expect(result.status).toBe(200);
    expect(result.body.ok).toBe(true);
    if (result.body.ok) {
      expect(result.body.data.summary).toContain("Coastal forests");
      expect(result.body.data.coverage.extractionTruncated).toBe(true);
      expect(result.body.data.coverage.inputTruncated).toBe(true);
      expect(result.body.data.sourcePreview.length).toBeGreaterThan(20);
      expect(result.body.data.source.title).toBe("Coastal Forests");
    }
    expect(result.headers["Cache-Control"]).toBe("no-store");
    expect(retrieve).toHaveBeenCalledOnce();
    expect(summarize).toHaveBeenCalledOnce();
  });

  it("rejects a missing URL", async () => {
    const retrieve = vi.fn();
    const result = await handleSummarizePost(jsonRequest({}), {
      retrieveAndExtract: retrieve,
    });
    expect(result.status).toBe(400);
    expect(result.body.ok).toBe(false);
    if (!result.body.ok) {
      expect(result.body.error.code).toBe("MALFORMED_REQUEST");
    }
    expect(retrieve).not.toHaveBeenCalled();
  });

  it("rejects an invalid URL", async () => {
    const retrieve = vi.fn();
    const result = await handleSummarizePost(
      jsonRequest({ url: "not-a-url" }),
      { retrieveAndExtract: retrieve },
    );
    expect(result.status).toBe(400);
    expect(result.body.ok).toBe(false);
    if (!result.body.ok) {
      expect(result.body.error.code).toBe("INVALID_URL");
    }
    expect(retrieve).not.toHaveBeenCalled();
  });

  it("rejects an unsafe URL before orchestration", async () => {
    const retrieve = vi.fn();
    const summarize = vi.fn();
    const result = await handleSummarizePost(
      jsonRequest({ url: "http://127.0.0.1/" }),
      {
        retrieveAndExtract: retrieve,
        summarizeExtractedPage: summarize,
      },
    );
    expect(result.status).toBe(403);
    expect(result.body.ok).toBe(false);
    if (!result.body.ok) {
      expect(result.body.error.code).toBe("UNSAFE_URL");
    }
    expect(retrieve).not.toHaveBeenCalled();
    expect(summarize).not.toHaveBeenCalled();
  });

  it("rejects invalid JSON", async () => {
    const result = await handleSummarizePost(jsonRequest("{bad"));
    expect(result.status).toBe(400);
    expect(result.body.ok).toBe(false);
    if (!result.body.ok) {
      expect(result.body.error.code).toBe("MALFORMED_REQUEST");
    }
  });

  it("rejects unsupported content type", async () => {
    const result = await handleSummarizePost(
      jsonRequest({ url: "https://example.com/" }, { contentType: "text/plain" }),
    );
    expect(result.status).toBe(415);
    expect(result.body.ok).toBe(false);
    if (!result.body.ok) {
      expect(result.body.error.code).toBe("UNSUPPORTED_MEDIA_TYPE");
    }
  });

  it("rejects oversized request bodies", async () => {
    const huge = "x".repeat(MAX_REQUEST_BODY_BYTES + 10);
    const result = await handleSummarizePost(
      jsonRequest(`{"url":"https://example.com/${huge}"}`),
    );
    expect(result.status).toBe(413);
    expect(result.body.ok).toBe(false);
    if (!result.body.ok) {
      expect(result.body.error.code).toBe("REQUEST_TOO_LARGE");
    }
  });

  it("maps Phase 1 extraction failure", async () => {
    const result = await handleSummarizePost(
      jsonRequest({ url: "https://example.com/a" }),
      {
        retrieveAndExtract: async () => {
          throw new RetrievalError("INSUFFICIENT_CONTENT");
        },
      },
    );
    expect(result.status).toBe(422);
    expect(result.body.ok).toBe(false);
    if (!result.body.ok) {
      expect(result.body.error.code).toBe("INSUFFICIENT_CONTENT");
      expect(JSON.stringify(result.body)).not.toMatch(/api[_-]?key/i);
    }
  });

  it("maps Phase 2 Gemini failure", async () => {
    const result = await handleSummarizePost(
      jsonRequest({ url: "https://example.com/a" }),
      {
        retrieveAndExtract: async () => successPage,
        summarizeExtractedPage: async () => {
          throw new RetrievalError("AI_PROVIDER_ERROR");
        },
      },
    );
    expect(result.status).toBe(502);
    expect(result.body.ok).toBe(false);
  });

  it("maps Gemini quota exhaustion", async () => {
    const result = await handleSummarizePost(
      jsonRequest({ url: "https://example.com/a" }),
      {
        retrieveAndExtract: async () => successPage,
        summarizeExtractedPage: async () => {
          throw new RetrievalError("AI_RATE_LIMITED");
        },
      },
    );
    expect(result.status).toBe(429);
    expect(result.body.ok).toBe(false);
    if (!result.body.ok) {
      expect(result.body.error.retryable).toBe(false);
    }
  });

  it("maps timeouts", async () => {
    const result = await handleSummarizePost(
      jsonRequest({ url: "https://example.com/a" }),
      {
        retrieveAndExtract: async () => {
          throw new RetrievalError("FETCH_TIMEOUT");
        },
      },
    );
    expect(result.status).toBe(504);
  });

  it("preserves source metadata and does not invent fields", async () => {
    const result = await handleSummarizePost(
      jsonRequest({ url: "https://example.com/a" }),
      {
        retrieveAndExtract: async () => successPage,
        summarizeExtractedPage: async () => successSummary,
      },
    );
    expect(result.body.ok).toBe(true);
    if (result.body.ok) {
      expect(result.body.data.source.finalUrl).toBe("https://example.com/a");
      expect(result.body.data.source.extractionMethod).toBe("readability");
    }
  });

  it("keeps source preview bounded", async () => {
    const longPage = makeExtractedPage({
      text: `${SHORT_ARTICLE}\n\n`.repeat(100),
      title: "Long",
    });
    const result = await handleSummarizePost(
      jsonRequest({ url: "https://example.com/long" }),
      {
        retrieveAndExtract: async () => longPage,
        summarizeExtractedPage: async () => ({
          ...successSummary,
          source: {
            ...successSummary.source,
            title: "Long",
            wordCount: longPage.wordCount,
            requestedUrl: longPage.requestedUrl,
            finalUrl: longPage.finalUrl,
          },
        }),
      },
    );
    expect(result.body.ok).toBe(true);
    if (result.body.ok) {
      expect(result.body.data.sourcePreview.length).toBeLessThanOrEqual(1600);
    }
  });

  it("does not invoke the model when validation fails", async () => {
    const summarize = vi.fn();
    await handleSummarizePost(jsonRequest({ url: "ftp://example.com/" }), {
      summarizeExtractedPage: summarize,
    });
    expect(summarize).not.toHaveBeenCalled();
  });

  it("does not leak full extracted text on error", async () => {
    const secretPassage = "SECRET_PASSAGE_SHOULD_NOT_LEAK_IN_ERROR";
    const result = await handleSummarizePost(
      jsonRequest({ url: "https://example.com/a" }),
      {
        retrieveAndExtract: async () =>
          makeExtractedPage({ text: `${SHORT_ARTICLE}\n${secretPassage}` }),
        summarizeExtractedPage: async () => {
          throw new RetrievalError("AI_PROVIDER_ERROR", undefined, secretPassage);
        },
      },
    );
    expect(JSON.stringify(result.body)).not.toContain(secretPassage);
  });
});

describe("methodNotAllowed", () => {
  it("returns 405 without orchestration", () => {
    const result = methodNotAllowed();
    expect(result.status).toBe(405);
    expect(result.body.ok).toBe(false);
    expect(result.headers.Allow).toBe("POST");
  });
});
