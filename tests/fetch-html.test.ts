import { describe, expect, it } from "vitest";
import { RetrievalError } from "@/lib/errors";
import { fetchHtmlSafely } from "@/lib/fetch-html";
import { MAX_HTML_BYTES } from "@/lib/limits";
import {
  htmlResponse,
  publicIpv4,
  resolveTo,
  scriptedTransport,
} from "./helpers/transport";

const SAMPLE_HTML =
  "<!DOCTYPE html><html><head><title>Ok</title></head><body><p>Hello world content for tests.</p></body></html>";

async function expectFetchCode(
  fn: () => Promise<unknown>,
  code: string,
): Promise<void> {
  try {
    await fn();
    throw new Error(`expected ${code}`);
  } catch (error) {
    expect(error).toBeInstanceOf(RetrievalError);
    expect((error as RetrievalError).code).toBe(code);
  }
}

describe("fetchHtmlSafely", () => {
  it("fetches HTML when DNS and transport are public", async () => {
    const { transportRequest, calls } = scriptedTransport([
      htmlResponse(SAMPLE_HTML),
    ]);

    const result = await fetchHtmlSafely("https://example.com/page", {
      resolveAddresses: resolveTo([publicIpv4()]),
      transportRequest,
    });

    expect(result.statusCode).toBe(200);
    expect(result.html).toContain("Hello world");
    expect(result.finalUrl).toBe("https://example.com/page");
    expect(calls[0]?.pinned.address).toBe("8.8.8.8");
    expect(calls[0]?.url.hostname).toBe("example.com");
  });

  it("rejects localhost before network I/O", async () => {
    await expectFetchCode(
      () => fetchHtmlSafely("http://localhost/"),
      "UNSAFE_URL",
    );
  });

  it("rejects 127.0.0.1 literals", async () => {
    await expectFetchCode(
      () => fetchHtmlSafely("http://127.0.0.1/"),
      "UNSAFE_URL",
    );
  });

  it("rejects private IPv4 destinations from DNS", async () => {
    await expectFetchCode(
      () =>
        fetchHtmlSafely("https://example.com/", {
          resolveAddresses: resolveTo([{ address: "10.0.0.8", family: 4 }]),
          transportRequest: async () => {
            throw new Error("should not connect");
          },
        }),
      "UNSAFE_URL",
    );
  });

  it("rejects IPv6 loopback and unique-local DNS answers", async () => {
    await expectFetchCode(
      () =>
        fetchHtmlSafely("https://example.com/", {
          resolveAddresses: resolveTo([{ address: "::1", family: 6 }]),
          transportRequest: async () => {
            throw new Error("should not connect");
          },
        }),
      "UNSAFE_URL",
    );

    await expectFetchCode(
      () =>
        fetchHtmlSafely("https://example.com/", {
          resolveAddresses: resolveTo([{ address: "fc00::2", family: 6 }]),
          transportRequest: async () => {
            throw new Error("should not connect");
          },
        }),
      "UNSAFE_URL",
    );
  });

  it("rejects IPv4-mapped private answers", async () => {
    await expectFetchCode(
      () =>
        fetchHtmlSafely("https://example.com/", {
          resolveAddresses: resolveTo([
            { address: "::ffff:192.168.1.5", family: 6 },
          ]),
          transportRequest: async () => {
            throw new Error("should not connect");
          },
        }),
      "UNSAFE_URL",
    );
  });

  it("rejects cloud metadata addresses", async () => {
    await expectFetchCode(
      () => fetchHtmlSafely("http://169.254.169.254/latest/meta-data/"),
      "UNSAFE_URL",
    );
  });

  it("uses only public addresses when DNS returns a mixed set", async () => {
    const { transportRequest, calls } = scriptedTransport([
      htmlResponse(SAMPLE_HTML),
    ]);

    await fetchHtmlSafely("https://example.com/", {
      resolveAddresses: resolveTo([
        { address: "10.0.0.1", family: 4 },
        { address: "1.1.1.1", family: 4 },
      ]),
      transportRequest,
    });

    expect(calls[0]?.pinned.address).toBe("1.1.1.1");
  });

  it("pins the validated address for connection-time safety (DNS rebinding)", async () => {
    const { transportRequest, calls } = scriptedTransport([
      (args) => {
        // Simulate a world where a second DNS lookup would return loopback;
        // production transport never re-resolves — it must use args.pinned.
        expect(args.pinned.address).toBe("8.8.4.4");
        return htmlResponse(SAMPLE_HTML);
      },
    ]);

    await fetchHtmlSafely("https://example.com/", {
      resolveAddresses: async () => [{ address: "8.8.4.4", family: 4 }],
      transportRequest,
    });

    expect(calls).toHaveLength(1);
  });

  it("validates redirect targets and refuses unsafe chains", async () => {
    const { transportRequest } = scriptedTransport([
      htmlResponse("", { statusCode: 302, location: "http://127.0.0.1/secret" }),
    ]);

    await expectFetchCode(
      () =>
        fetchHtmlSafely("https://example.com/start", {
          resolveAddresses: resolveTo([publicIpv4()]),
          transportRequest,
        }),
      "UNSAFE_URL",
    );
  });

  it("follows a safe redirect and returns the final URL", async () => {
    const { transportRequest, calls } = scriptedTransport([
      htmlResponse("", {
        statusCode: 301,
        location: "https://example.com/final",
      }),
      htmlResponse(SAMPLE_HTML),
    ]);

    const result = await fetchHtmlSafely("https://example.com/start", {
      resolveAddresses: resolveTo([publicIpv4()]),
      transportRequest,
    });

    expect(result.finalUrl).toBe("https://example.com/final");
    expect(calls).toHaveLength(2);
  });

  it("enforces the redirect limit", async () => {
    const { transportRequest } = scriptedTransport([
      htmlResponse("", { statusCode: 302, location: "https://example.com/r1" }),
      htmlResponse("", { statusCode: 302, location: "https://example.com/r2" }),
      htmlResponse("", { statusCode: 302, location: "https://example.com/r3" }),
      htmlResponse("", { statusCode: 302, location: "https://example.com/r4" }),
    ]);

    await expectFetchCode(
      () =>
        fetchHtmlSafely("https://example.com/start", {
          resolveAddresses: resolveTo([publicIpv4()]),
          transportRequest,
          maxRedirects: 3,
        }),
      "HTTP_ERROR",
    );
  });

  it("maps DNS failures", async () => {
    await expectFetchCode(
      () =>
        fetchHtmlSafely("https://example.com/", {
          resolveAddresses: async () => {
            throw Object.assign(new Error("getaddrinfo ENOTFOUND"), {
              code: "ENOTFOUND",
            });
          },
          transportRequest: async () => {
            throw new Error("should not connect");
          },
        }),
      "DNS_ERROR",
    );
  });

  it("maps timeouts", async () => {
    await expectFetchCode(
      () =>
        fetchHtmlSafely("https://example.com/", {
          resolveAddresses: resolveTo([publicIpv4()]),
          transportRequest: async () => {
            throw Object.assign(new Error("Timeout"), { code: "ETIMEDOUT" });
          },
        }),
      "FETCH_TIMEOUT",
    );
  });

  it("rejects unsupported content types", async () => {
    const { transportRequest } = scriptedTransport([
      {
        statusCode: 200,
        headers: { "content-type": "application/json" },
        body: Buffer.from("{}"),
      },
    ]);

    await expectFetchCode(
      () =>
        fetchHtmlSafely("https://example.com/api", {
          resolveAddresses: resolveTo([publicIpv4()]),
          transportRequest,
        }),
      "UNSUPPORTED_CONTENT",
    );
  });

  it("rejects oversized responses from the transport", async () => {
    const { transportRequest } = scriptedTransport([
      async () => {
        throw new RetrievalError("RESPONSE_TOO_LARGE");
      },
    ]);

    await expectFetchCode(
      () =>
        fetchHtmlSafely("https://example.com/huge", {
          resolveAddresses: resolveTo([publicIpv4()]),
          transportRequest,
          maxBytes: 1024,
        }),
      "RESPONSE_TOO_LARGE",
    );
  });

  it("rejects non-success HTTP statuses", async () => {
    const { transportRequest } = scriptedTransport([
      htmlResponse("nope", { statusCode: 500 }),
    ]);

    await expectFetchCode(
      () =>
        fetchHtmlSafely("https://example.com/err", {
          resolveAddresses: resolveTo([publicIpv4()]),
          transportRequest,
        }),
      "HTTP_ERROR",
    );
  });

  it("documents the configured download ceiling", () => {
    expect(MAX_HTML_BYTES).toBe(2 * 1024 * 1024);
  });
});
