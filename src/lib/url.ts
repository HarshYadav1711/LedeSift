import { z } from "zod";
import { RetrievalError } from "@/lib/errors";
import { isIpLiteral, isPublicIpAddress, normalizeIpLiteral } from "@/lib/ip";

export const urlInputSchema = z
  .string()
  .trim()
  .min(1, "URL is required")
  .max(2048, "URL is too long");

export type ValidatedHttpUrl = {
  /** Normalized absolute href from the WHATWG URL parser. */
  href: string;
  protocol: "http:" | "https:";
  hostname: string;
  port: string;
  pathname: string;
  search: string;
  hash: string;
  url: URL;
};

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "metadata.google.internal",
  "metadata.google",
  "metadata",
]);

function isBlockedHostname(hostname: string): boolean {
  const host = hostname.toLowerCase();

  if (BLOCKED_HOSTNAMES.has(host)) {
    return true;
  }

  if (host.endsWith(".localhost") || host.endsWith(".local")) {
    return true;
  }

  if (
    host.endsWith(".internal") ||
    host.endsWith(".intranet") ||
    host.endsWith(".corp") ||
    host.endsWith(".home") ||
    host.endsWith(".lan")
  ) {
    return true;
  }

  return false;
}

function assertAllowedPort(protocol: "http:" | "https:", port: string): void {
  if (port === "") {
    return;
  }

  const expected = protocol === "https:" ? "443" : "80";
  if (port !== expected) {
    throw new RetrievalError(
      "INVALID_URL",
      "Only standard HTTP (80) and HTTPS (443) ports are allowed.",
      `Rejected port ${port} for ${protocol}`,
    );
  }
}

/**
 * Validate and normalize an absolute public HTTP(S) URL.
 * Does not perform DNS. Callers must still bind connections to public addresses.
 */
export function validatePublicHttpUrl(input: unknown): ValidatedHttpUrl {
  const parsedInput = urlInputSchema.safeParse(input);
  if (!parsedInput.success) {
    throw new RetrievalError(
      "INVALID_URL",
      "The provided URL is not a valid public HTTP or HTTPS address.",
      parsedInput.error.message,
    );
  }

  let url: URL;
  try {
    url = new URL(parsedInput.data);
  } catch (error) {
    throw new RetrievalError(
      "INVALID_URL",
      "The provided URL is not a valid public HTTP or HTTPS address.",
      error instanceof Error ? error.message : String(error),
    );
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new RetrievalError(
      "INVALID_URL",
      "Only http and https URLs are supported.",
      `Rejected protocol ${url.protocol}`,
    );
  }

  if (url.username !== "" || url.password !== "") {
    throw new RetrievalError(
      "UNSAFE_URL",
      "The URL points to a destination that is not allowed.",
      "Rejected URL userinfo/credentials",
    );
  }

  if (!url.hostname) {
    throw new RetrievalError(
      "INVALID_URL",
      "The provided URL is not a valid public HTTP or HTTPS address.",
      "Empty hostname",
    );
  }

  assertAllowedPort(url.protocol, url.port);

  if (isBlockedHostname(url.hostname)) {
    throw new RetrievalError(
      "UNSAFE_URL",
      "The URL points to a destination that is not allowed.",
      `Blocked hostname ${url.hostname}`,
    );
  }

  if (isIpLiteral(url.hostname)) {
    const normalized = normalizeIpLiteral(url.hostname);
    if (!isPublicIpAddress(normalized)) {
      throw new RetrievalError(
        "UNSAFE_URL",
        "The URL points to a destination that is not allowed.",
        `Non-public IP literal ${normalized}`,
      );
    }
  }

  return {
    href: url.href,
    protocol: url.protocol,
    hostname: url.hostname,
    port: url.port,
    pathname: url.pathname,
    search: url.search,
    hash: url.hash,
    url,
  };
}

/**
 * Resolve a redirect Location against the current URL, then re-validate.
 */
export function validateRedirectTarget(
  currentUrl: string,
  locationHeader: string | undefined,
): ValidatedHttpUrl {
  if (!locationHeader || !locationHeader.trim()) {
    throw new RetrievalError(
      "HTTP_ERROR",
      "The remote server returned an error response.",
      "Redirect without Location header",
    );
  }

  let absolute: URL;
  try {
    absolute = new URL(locationHeader, currentUrl);
  } catch (error) {
    throw new RetrievalError(
      "INVALID_URL",
      "The provided URL is not a valid public HTTP or HTTPS address.",
      error instanceof Error ? error.message : String(error),
    );
  }

  return validatePublicHttpUrl(absolute.href);
}
