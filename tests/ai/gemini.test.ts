import { describe, expect, it } from "vitest";
import { RetrievalError } from "@/lib/errors";
import { mapGeminiError, readGeminiConfig } from "@/lib/ai/gemini";

describe("readGeminiConfig", () => {
  it("requires GEMINI_API_KEY", () => {
    try {
      readGeminiConfig({});
      throw new Error("expected throw");
    } catch (error) {
      expect(error).toBeInstanceOf(RetrievalError);
      expect((error as RetrievalError).code).toBe("MISSING_API_CONFIG");
    }
  });

  it("reads model override", () => {
    const config = readGeminiConfig({
      GEMINI_API_KEY: "test-key",
      GEMINI_MODEL: "gemini-2.5-flash-lite",
    });
    expect(config.apiKey).toBe("test-key");
    expect(config.model).toBe("gemini-2.5-flash-lite");
  });
});

describe("mapGeminiError", () => {
  it("maps rate limits", () => {
    const error = mapGeminiError({ status: 429, message: "quota exceeded" });
    expect(error.code).toBe("AI_RATE_LIMITED");
  });

  it("maps auth failures", () => {
    const error = mapGeminiError({ status: 401, message: "API key invalid" });
    expect(error.code).toBe("AI_AUTH_FAILED");
  });

  it("maps timeouts", () => {
    const error = mapGeminiError(
      Object.assign(new Error("Timeout"), { code: "ETIMEDOUT" }),
    );
    expect(error.code).toBe("AI_TIMEOUT");
  });

  it("redacts secrets from diagnostics", () => {
    const key = "secret-api-key-value-123456";
    const error = mapGeminiError(new Error(`failed with ${key}`), key);
    expect(error.diagnostic).not.toContain(key);
    expect(error.diagnostic).toContain("[REDACTED]");
    expect(error.message).not.toContain(key);
  });

  it("maps safety blocks", () => {
    const error = mapGeminiError(new Error("Response blocked by safety"));
    expect(error.code).toBe("AI_SAFETY_BLOCKED");
  });
});
