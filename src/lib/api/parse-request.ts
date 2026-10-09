import {
  MAX_REQUEST_BODY_BYTES,
  summarizeRequestSchema,
  type SummarizeRequest,
} from "@/lib/api/contracts";
import { RetrievalError } from "@/lib/errors";

function mediaType(contentType: string | null): string {
  if (!contentType) {
    return "";
  }
  return contentType.split(";")[0]?.trim().toLowerCase() ?? "";
}

/**
 * Parse and validate a summarize POST body.
 * Enforces content-type and a hard body-size cap by reading the body text.
 */
export async function parseSummarizeRequest(
  request: Request,
): Promise<SummarizeRequest> {
  const type = mediaType(request.headers.get("content-type"));
  if (type !== "application/json") {
    throw new RetrievalError(
      "UNSUPPORTED_MEDIA_TYPE",
      undefined,
      `content-type=${contentTypeOrNone(request)}`,
    );
  }

  const raw = await request.text();
  // Measure UTF-8 bytes, not JS string length, for the ~4 KiB bound.
  const bytes = Buffer.byteLength(raw, "utf8");
  if (bytes > MAX_REQUEST_BODY_BYTES) {
    throw new RetrievalError(
      "REQUEST_TOO_LARGE",
      undefined,
      `bodyBytes=${bytes}`,
    );
  }

  if (!raw.trim()) {
    throw new RetrievalError(
      "MALFORMED_REQUEST",
      undefined,
      "Empty body",
    );
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (error) {
    throw new RetrievalError(
      "MALFORMED_REQUEST",
      undefined,
      error instanceof Error ? error.message : "JSON.parse failed",
    );
  }

  const parsed = summarizeRequestSchema.safeParse(json);
  if (!parsed.success) {
    throw new RetrievalError(
      "MALFORMED_REQUEST",
      undefined,
      parsed.error.message,
    );
  }

  return parsed.data;
}

function contentTypeOrNone(request: Request): string {
  return request.headers.get("content-type") ?? "(missing)";
}
