/**
 * Controlled error categories for retrieval and extraction.
 * User-facing messages must not leak internals, stack traces, or network details.
 */

export const ERROR_CODES = [
  "INVALID_URL",
  "UNSAFE_URL",
  "DNS_ERROR",
  "FETCH_TIMEOUT",
  "HTTP_ERROR",
  "UNSUPPORTED_CONTENT",
  "RESPONSE_TOO_LARGE",
  "EXTRACTION_FAILED",
  "INSUFFICIENT_CONTENT",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

const DEFAULT_MESSAGES: Record<ErrorCode, string> = {
  INVALID_URL: "The provided URL is not a valid public HTTP or HTTPS address.",
  UNSAFE_URL: "The URL points to a destination that is not allowed.",
  DNS_ERROR: "The hostname could not be resolved.",
  FETCH_TIMEOUT: "The page took too long to respond.",
  HTTP_ERROR: "The remote server returned an error response.",
  UNSUPPORTED_CONTENT: "The response was not a supported HTML document.",
  RESPONSE_TOO_LARGE: "The page exceeded the maximum download size.",
  EXTRACTION_FAILED: "The page content could not be extracted.",
  INSUFFICIENT_CONTENT: "The page did not contain enough readable text.",
};

export class RetrievalError extends Error {
  readonly code: ErrorCode;
  /** Optional non-user-facing detail for development logs only. */
  readonly diagnostic?: string;

  constructor(code: ErrorCode, message?: string, diagnostic?: string) {
    super(message ?? DEFAULT_MESSAGES[code]);
    this.name = "RetrievalError";
    this.code = code;
    this.diagnostic = diagnostic;
  }
}

export function isRetrievalError(value: unknown): value is RetrievalError {
  return value instanceof RetrievalError;
}

export function toUserError(error: unknown): { code: ErrorCode; message: string } {
  if (isRetrievalError(error)) {
    return { code: error.code, message: error.message };
  }
  return {
    code: "EXTRACTION_FAILED",
    message: DEFAULT_MESSAGES.EXTRACTION_FAILED,
  };
}
