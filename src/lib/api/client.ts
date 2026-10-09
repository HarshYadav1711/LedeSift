import type { SummarizeResponse } from "@/lib/api/contracts";

export type ClientSummarizeResult =
  | { kind: "success"; data: Extract<SummarizeResponse, { ok: true }>["data"] }
  | {
      kind: "error";
      code: string;
      message: string;
      retryable: boolean;
      status: number;
    };

function isSummarizeResponse(value: unknown): value is SummarizeResponse {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as { ok?: unknown };
  return record.ok === true || record.ok === false;
}

/**
 * Browser client for POST /api/summarize.
 * Never receives or sends the Gemini API key.
 */
export async function requestSummarize(
  url: string,
  init?: { signal?: AbortSignal },
): Promise<ClientSummarizeResult> {
  let response: Response;
  try {
    response = await fetch("/api/summarize", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ url }),
      signal: init?.signal,
      cache: "no-store",
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }
    return {
      kind: "error",
      code: "AI_NETWORK_ERROR",
      message: "Could not reach the summarization service.",
      retryable: true,
      status: 0,
    };
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return {
      kind: "error",
      code: "INTERNAL_ERROR",
      message: "The server returned an unexpected response.",
      retryable: true,
      status: response.status,
    };
  }

  if (!isSummarizeResponse(payload)) {
    return {
      kind: "error",
      code: "INTERNAL_ERROR",
      message: "The server returned an unexpected response.",
      retryable: true,
      status: response.status,
    };
  }

  if (payload.ok) {
    return { kind: "success", data: payload.data };
  }

  return {
    kind: "error",
    code: payload.error.code,
    message: payload.error.message,
    retryable: payload.error.retryable,
    status: response.status,
  };
}

export function basicClientUrlCheck(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return "Enter a webpage URL to distill.";
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return "Use an http:// or https:// URL.";
    }
  } catch {
    return "Enter a valid absolute URL, including https://.";
  }
  return null;
}
