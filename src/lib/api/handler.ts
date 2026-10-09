import type { SummarizeResponse } from "@/lib/api/contracts";
import { toFailureResponse } from "@/lib/api/map-error";
import {
  orchestrateSummarize,
  type OrchestrateDeps,
} from "@/lib/api/orchestrate";
import { parseSummarizeRequest } from "@/lib/api/parse-request";
import { RetrievalError } from "@/lib/errors";
import { validatePublicHttpUrl } from "@/lib/url";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
  "Content-Type": "application/json; charset=utf-8",
} as const;

export type HandlerResult = {
  status: number;
  body: SummarizeResponse;
  headers: Record<string, string>;
};

/**
 * Shared POST handler logic (injectable for tests).
 * Validates request fully before any retrieval or model call.
 */
export async function handleSummarizePost(
  request: Request,
  deps: OrchestrateDeps = {},
): Promise<HandlerResult> {
  try {
    const { url } = await parseSummarizeRequest(request);
    // Reuse Phase 1 validator — do not invent a weaker parallel check.
    validatePublicHttpUrl(url);
    const success = await orchestrateSummarize(url, deps);
    return {
      status: 200,
      body: success,
      headers: { ...NO_STORE_HEADERS },
    };
  } catch (error) {
    const failure = toFailureResponse(error);
    return {
      status: failure.status,
      body: failure.body,
      headers: { ...NO_STORE_HEADERS },
    };
  }
}

export function methodNotAllowed(): HandlerResult {
  const failure = toFailureResponse(
    new RetrievalError("METHOD_NOT_ALLOWED"),
  );
  return {
    status: failure.status,
    body: failure.body,
    headers: {
      ...NO_STORE_HEADERS,
      Allow: "POST",
    },
  };
}
