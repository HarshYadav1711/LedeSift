import type { SummarizeFailure } from "@/lib/api/contracts";
import {
  isRetrievalError,
  type ErrorCode,
  toUserError,
} from "@/lib/errors";

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  INVALID_URL: 400,
  MALFORMED_REQUEST: 400,
  UNSAFE_URL: 403,
  REQUEST_TOO_LARGE: 413,
  UNSUPPORTED_MEDIA_TYPE: 415,
  INSUFFICIENT_CONTENT: 422,
  AI_INPUT_INVALID: 422,
  AI_RATE_LIMITED: 429,
  DNS_ERROR: 502,
  HTTP_ERROR: 502,
  UNSUPPORTED_CONTENT: 502,
  RESPONSE_TOO_LARGE: 502,
  EXTRACTION_FAILED: 502,
  AI_AUTH_FAILED: 502,
  AI_MODEL_UNAVAILABLE: 502,
  AI_NETWORK_ERROR: 502,
  AI_SAFETY_BLOCKED: 502,
  AI_INVALID_OUTPUT: 502,
  AI_PROVIDER_ERROR: 502,
  AI_INPUT_TOO_LARGE: 502,
  MISSING_API_CONFIG: 503,
  FETCH_TIMEOUT: 504,
  AI_TIMEOUT: 504,
  METHOD_NOT_ALLOWED: 405,
  INTERNAL_ERROR: 500,
};

const RETRYABLE: ReadonlySet<ErrorCode> = new Set([
  "FETCH_TIMEOUT",
  "AI_TIMEOUT",
  "AI_NETWORK_ERROR",
  "HTTP_ERROR",
  "DNS_ERROR",
  "AI_PROVIDER_ERROR",
]);

export function httpStatusForCode(code: ErrorCode): number {
  return STATUS_BY_CODE[code] ?? 500;
}

export function isRetryable(code: ErrorCode): boolean {
  return RETRYABLE.has(code);
}

export function toFailureResponse(error: unknown): {
  status: number;
  body: SummarizeFailure;
} {
  const mapped = isRetrievalError(error)
    ? { code: error.code, message: error.message }
    : toUserError(error);

  const code = mapped.code;
  return {
    status: httpStatusForCode(code),
    body: {
      ok: false,
      error: {
        code,
        message: mapped.message,
        retryable: isRetryable(code),
      },
    },
  };
}
