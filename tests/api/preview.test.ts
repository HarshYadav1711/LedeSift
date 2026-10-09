import { describe, expect, it } from "vitest";
import { buildSourcePreview } from "@/lib/api/preview";

describe("buildSourcePreview", () => {
  it("returns short text unchanged", () => {
    expect(buildSourcePreview("Hello world")).toBe("Hello world");
  });

  it("bounds long text and appends an ellipsis", () => {
    const text = "word ".repeat(500).trim();
    const preview = buildSourcePreview(text, 80);
    expect(preview.length).toBeLessThanOrEqual(90);
    expect(preview.endsWith("…")).toBe(true);
  });

  it("does not split a surrogate pair", () => {
    const emoji = "🙂";
    const text = `${"a".repeat(10)}${emoji}${"b".repeat(20)}`;
    const preview = buildSourcePreview(text, 11);
    expect(preview.includes("\ud83d") && !preview.includes("\ude42")).toBe(false);
  });
});
