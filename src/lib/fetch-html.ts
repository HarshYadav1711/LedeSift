import dns from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import type { IncomingMessage } from "node:http";
import type { LookupFunction } from "node:net";
import { RetrievalError } from "@/lib/errors";
import {
  ipFamily,
  isIpLiteral,
  isPublicIpAddress,
  normalizeIpLiteral,
} from "@/lib/ip";
import {
  FETCH_TIMEOUT_MS,
  MAX_HTML_BYTES,
  MAX_REDIRECTS,
  USER_AGENT,
} from "@/lib/limits";
import type { ResolvedAddress } from "@/lib/types";
import {
  validatePublicHttpUrl,
  validateRedirectTarget,
  type ValidatedHttpUrl,
} from "@/lib/url";

export type FetchHtmlResult = {
  requestedUrl: string;
  finalUrl: string;
  html: string;
  contentType: string;
  statusCode: number;
};

export type ResolveAddresses = (hostname: string) => Promise<ResolvedAddress[]>;

export type TransportResponse = {
  statusCode: number;
  headers: http.IncomingHttpHeaders;
  body: Buffer;
};

export type TransportRequest = (args: {
  url: URL;
  pinned: ResolvedAddress;
  headers: Record<string, string>;
  timeoutMs: number;
  maxBytes: number;
}) => Promise<TransportResponse>;

export type FetchHtmlOptions = {
  resolveAddresses?: ResolveAddresses;
  transportRequest?: TransportRequest;
  timeoutMs?: number;
  maxBytes?: number;
  maxRedirects?: number;
  now?: () => number;
};

const HTML_CONTENT_TYPES = [
  "text/html",
  "application/xhtml+xml",
] as const;

function defaultResolveAddresses(hostname: string): Promise<ResolvedAddress[]> {
  if (isIpLiteral(hostname)) {
    const address = normalizeIpLiteral(hostname);
    if (!isPublicIpAddress(address)) {
      return Promise.reject(
        new RetrievalError(
          "UNSAFE_URL",
          "The URL points to a destination that is not allowed.",
          `Non-public literal ${address}`,
        ),
      );
    }
    return Promise.resolve([{ address, family: ipFamily(address) }]);
  }

  return dns
    .lookup(hostname, { all: true, verbatim: true })
    .then((results) => {
      if (!results.length) {
        throw new RetrievalError(
          "DNS_ERROR",
          "The hostname could not be resolved.",
          `No addresses for ${hostname}`,
        );
      }

      const publicAddresses = results
        .map((entry) => ({
          address: entry.address,
          family: (entry.family === 6 ? 6 : 4) as 4 | 6,
        }))
        .filter((entry) => isPublicIpAddress(entry.address));

      if (publicAddresses.length === 0) {
        throw new RetrievalError(
          "UNSAFE_URL",
          "The URL points to a destination that is not allowed.",
          `All resolved addresses for ${hostname} were non-public`,
        );
      }

      return publicAddresses;
    })
    .catch((error: unknown) => {
      if (error instanceof RetrievalError) {
        throw error;
      }
      throw new RetrievalError(
        "DNS_ERROR",
        "The hostname could not be resolved.",
        error instanceof Error ? error.message : String(error),
      );
    });
}

/**
 * Custom DNS lookup that always returns a pre-validated public address.
 * Supports both Node callback shapes: (err, address, family) and
 * (err, addresses[]) when `options.all` is true.
 */
export function createPinnedLookup(pinned: ResolvedAddress): LookupFunction {
  return ((_hostname, options, callback) => {
    const opts = typeof options === "function" ? undefined : options;
    const cb =
      typeof options === "function"
        ? options
        : (callback as (
            err: NodeJS.ErrnoException | null,
            address: string | Array<{ address: string; family: number }>,
            family?: number,
          ) => void);

    // Always connect to the pre-validated public address (anti DNS-rebinding).
    // Node's HTTP stack may call lookup with `{ all: true }`, which expects an
    // address array rather than (address, family) — returning the wrong shape
    // yields "Invalid IP address: undefined" on real connections.
    queueMicrotask(() => {
      if (opts && typeof opts === "object" && opts.all) {
        cb(null, [{ address: pinned.address, family: pinned.family }]);
        return;
      }
      cb(null, pinned.address, pinned.family);
    });
  }) as LookupFunction;
}

function isRedirectStatus(statusCode: number): boolean {
  return (
    statusCode === 301 ||
    statusCode === 302 ||
    statusCode === 303 ||
    statusCode === 307 ||
    statusCode === 308
  );
}

function assertHtmlContentType(contentTypeHeader: string | undefined): string {
  if (!contentTypeHeader) {
    throw new RetrievalError(
      "UNSUPPORTED_CONTENT",
      "The response was not a supported HTML document.",
      "Missing Content-Type",
    );
  }

  const mediaType = contentTypeHeader.split(";")[0]?.trim().toLowerCase() ?? "";
  if (!(HTML_CONTENT_TYPES as readonly string[]).includes(mediaType)) {
    throw new RetrievalError(
      "UNSUPPORTED_CONTENT",
      "The response was not a supported HTML document.",
      `Content-Type ${contentTypeHeader}`,
    );
  }

  return contentTypeHeader;
}

function readLimitedBody(
  response: IncomingMessage,
  maxBytes: number,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;
    let settled = false;

    const fail = (error: RetrievalError) => {
      if (settled) return;
      settled = true;
      response.destroy();
      reject(error);
    };

    response.on("data", (chunk: Buffer | string) => {
      const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      total += buf.length;
      if (total > maxBytes) {
        fail(
          new RetrievalError(
            "RESPONSE_TOO_LARGE",
            "The page exceeded the maximum download size.",
            `Exceeded ${maxBytes} bytes`,
          ),
        );
        return;
      }
      chunks.push(buf);
    });

    response.on("end", () => {
      if (settled) return;
      settled = true;
      resolve(Buffer.concat(chunks));
    });

    response.on("error", (error) => {
      if (settled) return;
      settled = true;
      reject(
        new RetrievalError(
          "HTTP_ERROR",
          "The remote server returned an error response.",
          error.message,
        ),
      );
    });
  });
}

function mapNetworkError(error: unknown): RetrievalError {
  if (error instanceof RetrievalError) {
    return error;
  }

  const message = error instanceof Error ? error.message : String(error);
  const code =
    error && typeof error === "object" && "code" in error
      ? String((error as { code?: string }).code)
      : "";

  if (
    code === "ETIMEDOUT" ||
    code === "ESOCKETTIMEDOUT" ||
    message.toLowerCase().includes("timeout")
  ) {
    return new RetrievalError(
      "FETCH_TIMEOUT",
      "The page took too long to respond.",
      message,
    );
  }

  if (
    code === "ENOTFOUND" ||
    code === "EAI_AGAIN" ||
    code === "EADDRNOTAVAIL"
  ) {
    return new RetrievalError(
      "DNS_ERROR",
      "The hostname could not be resolved.",
      message,
    );
  }

  if (
    code.startsWith("ERR_TLS") ||
    code === "CERT_HAS_EXPIRED" ||
    code === "UNABLE_TO_VERIFY_LEAF_SIGNATURE" ||
    message.toLowerCase().includes("certificate")
  ) {
    return new RetrievalError(
      "HTTP_ERROR",
      "The remote server returned an error response.",
      `TLS failure: ${message}`,
    );
  }

  return new RetrievalError(
    "HTTP_ERROR",
    "The remote server returned an error response.",
    message,
  );
}

const defaultTransportRequest: TransportRequest = async ({
  url,
  pinned,
  headers,
  timeoutMs,
  maxBytes,
}) => {
  const isHttps = url.protocol === "https:";
  const lib = isHttps ? https : http;
  const port = url.port
    ? Number(url.port)
    : isHttps
      ? 443
      : 80;

  return new Promise<TransportResponse>((resolve, reject) => {
    let settled = false;
    const settleReject = (error: unknown) => {
      if (settled) return;
      settled = true;
      reject(mapNetworkError(error));
    };

    const request = lib.request(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port,
        path: `${url.pathname}${url.search}`,
        method: "GET",
        headers,
        lookup: createPinnedLookup(pinned),
        servername: isHttps ? url.hostname : undefined,
        // Never disable certificate verification.
        rejectUnauthorized: true,
        timeout: timeoutMs,
      },
      (response) => {
        readLimitedBody(response, maxBytes)
          .then((body) => {
            if (settled) return;
            settled = true;
            resolve({
              statusCode: response.statusCode ?? 0,
              headers: response.headers,
              body,
            });
          })
          .catch(settleReject);
      },
    );

    request.on("timeout", () => {
      request.destroy(
        new RetrievalError(
          "FETCH_TIMEOUT",
          "The page took too long to respond.",
          "Socket timeout",
        ),
      );
    });

    request.on("error", settleReject);
    request.end();
  });
};

async function fetchOnce(
  validated: ValidatedHttpUrl,
  options: Required<
    Pick<
      FetchHtmlOptions,
      "resolveAddresses" | "transportRequest" | "timeoutMs" | "maxBytes"
    >
  > & { remainingMs: number },
): Promise<TransportResponse & { pinned: ResolvedAddress }> {
  if (options.remainingMs <= 0) {
    throw new RetrievalError(
      "FETCH_TIMEOUT",
      "The page took too long to respond.",
      "Overall deadline exhausted before request",
    );
  }

  const resolved = await options.resolveAddresses(validated.hostname);
  const publicAddresses = resolved.filter((entry) =>
    isPublicIpAddress(entry.address),
  );
  const pinned = publicAddresses[0];
  if (!pinned) {
    throw new RetrievalError(
      "UNSAFE_URL",
      "The URL points to a destination that is not allowed.",
      "No public address available at connection time",
    );
  }

  // Connection-time guarantee: transport must use pinned lookup / address.
  const response = await options.transportRequest({
    url: validated.url,
    pinned,
    headers: {
      Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en",
      "User-Agent": USER_AGENT,
      Connection: "close",
    },
    timeoutMs: options.remainingMs,
    maxBytes: options.maxBytes,
  });

  return { ...response, pinned };
}

/**
 * Fetch HTML from a public HTTP(S) URL with SSRF-safe connection binding.
 *
 * Invariant: every outbound connection is pinned to a pre-validated public
 * destination address via a custom DNS lookup function (or transport fake).
 * Automatic redirects are disabled; each Location is re-validated and re-pinned.
 */
export async function fetchHtmlSafely(
  inputUrl: string,
  options: FetchHtmlOptions = {},
): Promise<FetchHtmlResult> {
  const timeoutMs = options.timeoutMs ?? FETCH_TIMEOUT_MS;
  const maxBytes = options.maxBytes ?? MAX_HTML_BYTES;
  const maxRedirects = options.maxRedirects ?? MAX_REDIRECTS;
  const now = options.now ?? Date.now;
  const resolveAddresses = options.resolveAddresses ?? defaultResolveAddresses;
  const transportRequest = options.transportRequest ?? defaultTransportRequest;

  const started = now();
  const requested = validatePublicHttpUrl(inputUrl);
  let current = requested;
  let redirects = 0;

  while (true) {
    const remainingMs = timeoutMs - (now() - started);
    let response: TransportResponse & { pinned: ResolvedAddress };

    try {
      response = await fetchOnce(current, {
        resolveAddresses,
        transportRequest,
        timeoutMs,
        maxBytes,
        remainingMs,
      });
    } catch (error) {
      throw mapNetworkError(error);
    }

    // Re-assert the pinned address remains public (defense in depth).
    if (!isPublicIpAddress(response.pinned.address)) {
      throw new RetrievalError(
        "UNSAFE_URL",
        "The URL points to a destination that is not allowed.",
        "Pinned address failed public check after response",
      );
    }

    if (isRedirectStatus(response.statusCode)) {
      if (redirects >= maxRedirects) {
        throw new RetrievalError(
          "HTTP_ERROR",
          "The remote server returned an error response.",
          `Redirect limit exceeded (${maxRedirects})`,
        );
      }

      const location = Array.isArray(response.headers.location)
        ? response.headers.location[0]
        : response.headers.location;

      current = validateRedirectTarget(current.href, location);
      redirects += 1;
      continue;
    }

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw new RetrievalError(
        "HTTP_ERROR",
        "The remote server returned an error response.",
        `HTTP status ${response.statusCode}`,
      );
    }

    const contentTypeHeader = Array.isArray(response.headers["content-type"])
      ? response.headers["content-type"][0]
      : response.headers["content-type"];
    const contentType = assertHtmlContentType(contentTypeHeader);

    const html = response.body.toString("utf8");

    return {
      requestedUrl: requested.href,
      finalUrl: current.href,
      html,
      contentType,
      statusCode: response.statusCode,
    };
  }
}
