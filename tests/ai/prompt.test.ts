import { describe, expect, it } from "vitest";
import {
  SYSTEM_INSTRUCTION,
  buildSummarizationPrompt,
  getContentBoundaryMarkers,
} from "@/lib/ai/prompt";
import { INJECTION_ARTICLE } from "../helpers/extracted";

describe("summarization prompt isolation", () => {
  it("keeps trusted instructions out of the untrusted extract channel", () => {
    const markers = getContentBoundaryMarkers();
    const prompt = buildSummarizationPrompt({
      title: "Estuary Update",
      text: INJECTION_ARTICLE,
      finalUrl: "https://example.com/estuary",
    });

    expect(prompt.systemInstruction).toBe(SYSTEM_INSTRUCTION);
    expect(prompt.systemInstruction).not.toContain("IGNORE PREVIOUS");
    expect(prompt.systemInstruction).not.toContain(INJECTION_ARTICLE);

    expect(prompt.userContent).toContain(markers.start);
    expect(prompt.userContent).toContain(markers.end);
    expect(prompt.userContent).toContain(INJECTION_ARTICLE);
    expect(prompt.userContent).toContain("https://example.com/estuary");
    expect(prompt.userContent).toMatch(/untrusted/i);
  });

  it("does not place scraped text inside the system instruction", () => {
    const secretBlob = "SCRAPED_SECRET_TOKEN_XYZ";
    const prompt = buildSummarizationPrompt({
      title: "Title",
      text: `${INJECTION_ARTICLE}\n${secretBlob}`,
      finalUrl: "https://example.com/x",
    });

    expect(prompt.systemInstruction).not.toContain(secretBlob);
    expect(prompt.userContent).toContain(secretBlob);
  });
});
