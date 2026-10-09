import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { RetrievalError } from "@/lib/errors";
import { countWords, extractMainContent } from "@/lib/extract";
import { MAX_EXTRACTED_CHARS } from "@/lib/limits";

const fixtures = path.join(process.cwd(), "tests", "fixtures");

function load(name: string): string {
  return readFileSync(path.join(fixtures, name), "utf8");
}

describe("extractMainContent", () => {
  it("extracts a normal article with readability", () => {
    const result = extractMainContent({
      html: load("normal-article.html"),
      requestedUrl: "https://example.com/forests",
      finalUrl: "https://example.com/forests",
    });

    expect(result.extractionMethod).toBe("readability");
    expect(result.title).toMatch(/Coastal Forests/i);
    expect(result.wordCount).toBe(countWords(result.text));
    expect(result.wordCount).toBeGreaterThan(30);
    expect(result.text).toMatch(/seedling density/i);
    expect(result.truncated).toBe(false);
    expect(result.requestedUrl).toBe("https://example.com/forests");
    expect(result.finalUrl).toBe("https://example.com/forests");
  });

  it("extracts documentation-style HTML", () => {
    const result = extractMainContent({
      html: load("docs-style.html"),
      requestedUrl: "https://example.com/docs/caching",
      finalUrl: "https://example.com/docs/caching",
    });

    expect(result.title).toMatch(/HTTP Caching/i);
    expect(result.text).toMatch(/Cache-Control/i);
    expect(result.wordCount).toBeGreaterThan(30);
  });

  it("rejects navigation-heavy pages with inadequate readable text", () => {
    expect(() =>
      extractMainContent({
        html: load("nav-heavy.html"),
        requestedUrl: "https://example.com/",
        finalUrl: "https://example.com/",
      }),
    ).toThrow(RetrievalError);

    try {
      extractMainContent({
        html: load("nav-heavy.html"),
        requestedUrl: "https://example.com/",
        finalUrl: "https://example.com/",
      });
    } catch (error) {
      expect((error as RetrievalError).code).toBe("INSUFFICIENT_CONTENT");
    }
  });

  it("supports pages with a missing title", () => {
    const result = extractMainContent({
      html: load("missing-title.html"),
      requestedUrl: "https://example.com/notes",
      finalUrl: "https://example.com/notes",
    });

    expect(result.title).toBe("");
    expect(result.text).toMatch(/morning fog/i);
  });

  it("rejects empty HTML", () => {
    try {
      extractMainContent({
        html: load("empty.html"),
        requestedUrl: "https://example.com/empty",
        finalUrl: "https://example.com/empty",
      });
      throw new Error("expected throw");
    } catch (error) {
      expect(error).toBeInstanceOf(RetrievalError);
      expect((error as RetrievalError).code).toBe("INSUFFICIENT_CONTENT");
    }
  });

  it("does not execute scripts and still extracts script-heavy pages", () => {
    const result = extractMainContent({
      html: load("script-heavy.html"),
      requestedUrl: "https://example.com/report",
      finalUrl: "https://example.com/report",
    });

    expect(result.text).toMatch(/warehouse throughput/i);
    expect(result.text).not.toMatch(/injected/i);
  });

  it("recovers usable text from malformed HTML", () => {
    const result = extractMainContent({
      html: load("malformed.html"),
      requestedUrl: "https://example.com/broken",
      finalUrl: "https://example.com/broken",
    });

    expect(result.text).toMatch(/imperfect HTML/i);
    expect(result.wordCount).toBeGreaterThan(30);
  });

  it("can fall back to main landmark content", () => {
    const result = extractMainContent({
      html: load("fallback-main.html"),
      requestedUrl: "https://example.com/fallback",
      finalUrl: "https://example.com/fallback",
    });

    expect(["readability", "fallback"]).toContain(result.extractionMethod);
    expect(result.text).toMatch(/main landmark/i);
    expect(result.wordCount).toBeGreaterThan(30);
  });

  it("rejects inadequate readable text", () => {
    try {
      extractMainContent({
        html: load("inadequate.html"),
        requestedUrl: "https://example.com/short",
        finalUrl: "https://example.com/short",
      });
      throw new Error("expected throw");
    } catch (error) {
      expect((error as RetrievalError).code).toBe("INSUFFICIENT_CONTENT");
    }
  });

  it("truncates oversized extracted text and records truncation", () => {
    const paragraph = "word ".repeat(200).trim();
    const chunks = Array.from({ length: 40 }, (_, i) => `<p>${i} ${paragraph}</p>`).join(
      "\n",
    );
    const html = `<!DOCTYPE html><html><head><title>Long</title></head><body><article><h1>Long</h1>${chunks}</article></body></html>`;

    const result = extractMainContent({
      html,
      requestedUrl: "https://example.com/long",
      finalUrl: "https://example.com/long",
      maxChars: 500,
    });

    expect(result.truncated).toBe(true);
    expect(result.text.length).toBeLessThanOrEqual(500);
    expect(result.wordCount).toBe(countWords(result.text));
  });

  it("uses the default extraction bound", () => {
    expect(MAX_EXTRACTED_CHARS).toBeGreaterThan(1000);
  });
});
