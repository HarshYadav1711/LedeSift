import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import { RetrievalError } from "@/lib/errors";
import {
  MAX_EXTRACTED_CHARS,
  MIN_TEXT_CHARS,
  MIN_WORD_COUNT,
} from "@/lib/limits";
import type { ExtractedPage, ExtractionMethod } from "@/lib/types";

export type ExtractMainContentInput = {
  html: string;
  requestedUrl: string;
  finalUrl: string;
  maxChars?: number;
  minWordCount?: number;
  minTextChars?: number;
};

function normalizeWhitespace(value: string): string {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

/** Deterministic whitespace-delimited word count. */
export function countWords(text: string): number {
  const normalized = text.trim();
  if (!normalized) {
    return 0;
  }
  return normalized.split(/\s+/).filter(Boolean).length;
}

function truncateText(
  text: string,
  maxChars: number,
): { text: string; truncated: boolean } {
  if (text.length <= maxChars) {
    return { text, truncated: false };
  }

  const slice = text.slice(0, maxChars);
  const lastSpace = slice.lastIndexOf(" ");
  const cut = lastSpace > maxChars * 0.6 ? slice.slice(0, lastSpace) : slice;
  return { text: cut.trimEnd(), truncated: true };
}

function createDom(html: string, url: string): JSDOM {
  // Critical: never enable script execution or remote resource loading.
  return new JSDOM(html, {
    url,
    contentType: "text/html",
    pretendToBeVisual: false,
  });
}

function cleanTitle(raw: string | null | undefined): string {
  return normalizeWhitespace(raw ?? "");
}

function removeBoilerplate(root: Element): void {
  const selectors = [
    "script",
    "style",
    "noscript",
    "svg",
    "iframe",
    "canvas",
    "nav",
    "footer",
    "header",
    "aside",
    "form",
    "[role='navigation']",
    "[role='banner']",
    "[role='contentinfo']",
    ".nav",
    ".navbar",
    ".menu",
    ".sidebar",
    ".advertisement",
    ".ads",
    ".ad",
  ];

  for (const selector of selectors) {
    for (const node of Array.from(root.querySelectorAll(selector))) {
      node.remove();
    }
  }
}

function textFromElement(element: Element | null): string {
  if (!element) {
    return "";
  }
  removeBoilerplate(element);
  return normalizeWhitespace(element.textContent ?? "");
}

function fallbackExtract(document: Document): {
  title: string;
  text: string;
} {
  const title = cleanTitle(document.querySelector("title")?.textContent);

  const main = document.querySelector("main");
  const mainText = textFromElement(main);
  if (mainText) {
    return { title, text: mainText };
  }

  const article = document.querySelector("article");
  const articleText = textFromElement(article);
  if (articleText) {
    return { title, text: articleText };
  }

  const body = document.querySelector("body");
  if (!body) {
    return { title, text: "" };
  }

  const clone = body.cloneNode(true) as Element;
  removeBoilerplate(clone);

  // Drop obvious link-only blocks to reduce navigation noise.
  for (const list of Array.from(clone.querySelectorAll("ul, ol"))) {
    const links = list.querySelectorAll("a");
    const text = normalizeWhitespace(list.textContent ?? "");
    if (links.length >= 5 && countWords(text) < links.length * 3) {
      list.remove();
    }
  }

  return { title, text: normalizeWhitespace(clone.textContent ?? "") };
}

function assertUsable(
  text: string,
  wordCount: number,
  minWordCount: number,
  minTextChars: number,
): void {
  if (!text || wordCount < minWordCount || text.length < minTextChars) {
    throw new RetrievalError(
      "INSUFFICIENT_CONTENT",
      "The page did not contain enough readable text.",
      `words=${wordCount} chars=${text.length}`,
    );
  }
}

/**
 * Extract primary readable text from HTML.
 * Network I/O is intentionally out of scope — pass already-fetched HTML.
 */
export function extractMainContent(
  input: ExtractMainContentInput,
): ExtractedPage {
  const maxChars = input.maxChars ?? MAX_EXTRACTED_CHARS;
  const minWordCount = input.minWordCount ?? MIN_WORD_COUNT;
  const minTextChars = input.minTextChars ?? MIN_TEXT_CHARS;

  if (!input.html || !input.html.trim()) {
    throw new RetrievalError(
      "INSUFFICIENT_CONTENT",
      "The page did not contain enough readable text.",
      "Empty HTML",
    );
  }

  let dom: JSDOM;
  try {
    dom = createDom(input.html, input.finalUrl);
  } catch (error) {
    throw new RetrievalError(
      "EXTRACTION_FAILED",
      "The page content could not be extracted.",
      error instanceof Error ? error.message : String(error),
    );
  }

  const { document } = dom.window;
  let method: ExtractionMethod = "readability";
  let title = "";
  let text = "";

  try {
    const readableDocument = createDom(input.html, input.finalUrl).window
      .document;
    const article = new Readability(readableDocument).parse();
    const candidate = normalizeWhitespace(article?.textContent ?? "");
    const candidateWords = countWords(candidate);

    if (
      article &&
      candidate &&
      candidateWords >= minWordCount &&
      candidate.length >= minTextChars
    ) {
      title = cleanTitle(article.title) || cleanTitle(document.title);
      text = candidate;
      method = "readability";
    } else {
      method = "fallback";
      const fallback = fallbackExtract(document);
      title = fallback.title;
      text = fallback.text;
    }
  } catch (error) {
    if (error instanceof RetrievalError) {
      throw error;
    }
    method = "fallback";
    try {
      const fallback = fallbackExtract(document);
      title = fallback.title;
      text = fallback.text;
    } catch (fallbackError) {
      throw new RetrievalError(
        "EXTRACTION_FAILED",
        "The page content could not be extracted.",
        fallbackError instanceof Error
          ? fallbackError.message
          : String(fallbackError),
      );
    }
  }

  // If readability path set method to fallback already, text may still be weak.
  if (method === "fallback") {
    // no-op; assert below
  }

  const bounded = truncateText(text, maxChars);
  const wordCount = countWords(bounded.text);
  assertUsable(bounded.text, wordCount, minWordCount, minTextChars);

  return {
    requestedUrl: input.requestedUrl,
    finalUrl: input.finalUrl,
    title,
    text: bounded.text,
    wordCount,
    extractionMethod: method,
    truncated: bounded.truncated,
  };
}
