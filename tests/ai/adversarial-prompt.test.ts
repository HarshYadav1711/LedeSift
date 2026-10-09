import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { MAX_MODEL_INPUT_CHARS } from "@/lib/ai/limits";
import type { GeminiProvider } from "@/lib/ai/gemini";
import {
  SYSTEM_INSTRUCTION,
  buildSummarizationPrompt,
  getContentBoundaryMarkers,
} from "@/lib/ai/prompt";
import { summarizeExtractedPage } from "@/lib/ai/summarize";
import { extractMainContent } from "@/lib/extract";
import { makeExtractedPage, SHORT_ARTICLE } from "../helpers/extracted";

const fixtures = path.join(process.cwd(), "tests", "fixtures");

function load(name: string): string {
  return readFileSync(path.join(fixtures, name), "utf8");
}

function providerFrom(
  impl: GeminiProvider["generateStructured"],
): GeminiProvider {
  return { generateStructured: impl };
}

const VALID_OUTPUT = {
  summary:
    "Estuary salinity measurements improved after wetland restoration, with more sensors planned next quarter.",
  keyPoints: [
    "Spring-tide salinity improved gradually.",
    "Wetland restoration preceded the improvement.",
    "Additional sensors are planned next quarter.",
  ],
};

describe("AI adversarial prompt and output handling", () => {
  it("keeps HTML-comment and fake-system injection inside untrusted markers only", () => {
    const extracted = extractMainContent({
      html: load("prompt-injection.html"),
      requestedUrl: "https://example.com/estuary",
      finalUrl: "https://example.com/estuary",
    });
    const markers = getContentBoundaryMarkers();
    const prompt = buildSummarizationPrompt({
      title: extracted.title,
      text: extracted.text,
      finalUrl: extracted.finalUrl,
    });

    expect(prompt.systemInstruction).toBe(SYSTEM_INSTRUCTION);
    expect(prompt.systemInstruction).not.toContain("GEMINI_API_KEY");
    expect(prompt.systemInstruction).not.toContain("IGNORE PREVIOUS");
    expect(prompt.systemInstruction).not.toContain("hacked");

    expect(prompt.userContent).toContain(markers.start);
    expect(prompt.userContent).toContain(markers.end);
    expect(prompt.userContent).toMatch(/IGNORE PREVIOUS/i);
    expect(prompt.userContent).toMatch(/untrusted/i);
  });

  it("does not execute or trust instructions embedded in extracted HTML text", async () => {
    const extracted = extractMainContent({
      html: load("prompt-injection.html"),
      requestedUrl: "https://example.com/estuary",
      finalUrl: "https://example.com/estuary",
    });

    const generateStructured = vi.fn(async (request) => {
      expect(request.systemInstruction).toBe(SYSTEM_INSTRUCTION);
      expect(request.userContent).toContain("IGNORE PREVIOUS");
      expect(request.systemInstruction).not.toContain("pirate");
      return { text: JSON.stringify(VALID_OUTPUT) };
    });

    const result = await summarizeExtractedPage(extracted, {
      provider: providerFrom(generateStructured),
    });

    expect(result.summary).toContain("salinity");
    expect(result.source.title).toMatch(/estuary/i);
    expect(result.source.finalUrl).toBe("https://example.com/estuary");
    expect(JSON.stringify(result)).not.toMatch(/AIza|GEMINI_API_KEY/);
  });

  it("strips unexpected model fields and never surfaces fake credentials", async () => {
    const result = await summarizeExtractedPage(
      makeExtractedPage({ text: SHORT_ARTICLE }),
      {
        provider: providerFrom(async () => ({
          text: JSON.stringify({
            summary: VALID_OUTPUT.summary,
            keyPoints: VALID_OUTPUT.keyPoints,
            hacked: true,
            apiKey: "AIzaSyFakeKeyShouldNeverBeAccepted",
          }),
        })),
      },
    );

    expect(result.summary).toContain("salinity");
    expect(result).not.toHaveProperty("hacked");
    expect(result).not.toHaveProperty("apiKey");
    expect(JSON.stringify(result)).not.toContain(
      "AIzaSyFakeKeyShouldNeverBeAccepted",
    );
  });

  it("applies the deterministic input budget to extremely long repetitive content", async () => {
    const repetitive = `${SHORT_ARTICLE}\n\n`.repeat(200);
    const page = makeExtractedPage({ text: repetitive });
    const generateStructured = vi.fn(async (request) => {
      expect(request.userContent.length).toBeLessThan(
        MAX_MODEL_INPUT_CHARS + 3_000,
      );
      return { text: JSON.stringify(VALID_OUTPUT) };
    });

    const result = await summarizeExtractedPage(page, {
      provider: providerFrom(generateStructured),
      maxInputChars: 1_200,
    });

    expect(result.inputTruncated).toBe(true);
    expect(result.inputCharCount).toBeLessThanOrEqual(1_200);
  });

  it("system instruction states summaries are not independently verified", () => {
    expect(SYSTEM_INSTRUCTION).toMatch(/not independently verified/i);
  });
});
