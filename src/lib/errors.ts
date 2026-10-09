/**
 * Controlled error categories for retrieval, extraction, and summarization.
 * User-facing messages must not leak internals, stack traces, or secrets.
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
  "MISSING_API_CONFIG",
  "AI_INPUT_INVALID",
  "AI_INPUT_TOO_LARGE",
  "AI_AUTH_FAILED",
  "AI_MODEL_UNAVAILABLE",
  "AI_RATE_LIMITED",
  "AI_TIMEOUT",
  "AI_NETWORK_ERROR",
  "AI_SAFETY_BLOCKED",
  "AI_INVALID_OUTPUT",
  "AI_PROVIDER_ERROR",
  "MALFORMED_REQUEST",
  "UNSUPPORTED_MEDIA_TYPE",
  "REQUEST_TOO_LARGE",
  "METHOD_NOT_ALLOWED",
  "INTERNAL_ERROR",
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
  MISSING_API_CONFIG: "The summarization service is not configured.",
  AI_INPUT_INVALID: "The extracted page content is not suitable for summarization.",
  AI_INPUT_TOO_LARGE: "The extracted content exceeds the summarization input limit.",
  AI_AUTH_FAILED: "The summarization service could not authenticate.",
  AI_MODEL_UNAVAILABLE: "The summarization model is unavailable.",
  AI_RATE_LIMITED: "The summarization service rate limit was reached. Try again later.",
  AI_TIMEOUT: "The summarization request timed out.",
  AI_NETWORK_ERROR: "The summarization service could not be reached.",
  AI_SAFETY_BLOCKED: "The model declined to summarize this content.",
  AI_INVALID_OUTPUT: "The summarization service returned an invalid response.",
  AI_PROVIDER_ERROR: "The summarization service failed.",
  MALFORMED_REQUEST: "The request body is missing or invalid.",
  UNSUPPORTED_MEDIA_TYPE: "Requests must use application/json.",
  REQUEST_TOO_LARGE: "The request body exceeds the allowed size.",
  METHOD_NOT_ALLOWED: "This HTTP method is not supported.",
  INTERNAL_ERROR: "An unexpected error occurred.",
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
    code: "AI_PROVIDER_ERROR",
    message: DEFAULT_MESSAGES.AI_PROVIDER_ERROR,
  };
}
