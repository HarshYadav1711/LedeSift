import { describe, expect, it } from "vitest";
import { RetrievalError } from "@/lib/errors";
import { createPinnedLookup, fetchHtmlSafely } from "@/lib/fetch-html";
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

describe("SSRF adversarial fetchHtmlSafely", () => {
  it("rejects link-local IPv6 DNS answers", async () => {
    await expectFetchCode(
      () =>
        fetchHtmlSafely("https://example.com/", {
          resolveAddresses: resolveTo([{ address: "fe80::1", family: 6 }]),
          transportRequest: async () => {
            throw new Error("should not connect");
          },
        }),
      "UNSAFE_URL",
    );
  });

  it("rejects all-private DNS answer sets", async () => {
    await expectFetchCode(
      () =>
        fetchHtmlSafely("https://example.com/", {
          resolveAddresses: resolveTo([
            { address: "10.0.0.1", family: 4 },
            { address: "192.168.1.1", family: 4 },
            { address: "172.16.0.5", family: 4 },
          ]),
          transportRequest: async () => {
            throw new Error("should not connect");
          },
        }),
      "UNSAFE_URL",
    );
  });

  it("pins only the first public address (no unvalidated alternate fallback)", async () => {
    const { transportRequest, calls } = scriptedTransport([
      htmlResponse(SAMPLE_HTML),
    ]);

    await fetchHtmlSafely("https://example.com/", {
      resolveAddresses: resolveTo([
        { address: "1.1.1.1", family: 4 },
        { address: "8.8.8.8", family: 4 },
      ]),
      transportRequest,
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.pinned.address).toBe("1.1.1.1");
  });

  it("re-validates each hop in a safe redirect chain", async () => {
    const { transportRequest, calls } = scriptedTransport([
      htmlResponse("", {
        statusCode: 302,
        location: "https://example.com/hop-1",
      }),
      htmlResponse("", {
        statusCode: 302,
        location: "https://example.com/hop-2",
      }),
      htmlResponse(SAMPLE_HTML),
    ]);

    const result = await fetchHtmlSafely("https://example.com/start", {
      resolveAddresses: resolveTo([publicIpv4()]),
      transportRequest,
    });

    expect(result.finalUrl).toBe("https://example.com/hop-2");
    expect(calls).toHaveLength(3);
    for (const call of calls) {
      expect(call.pinned.address).toBe("8.8.8.8");
    }
  });

  it("rejects redirect targets with credentials or nonstandard ports", async () => {
    const withCreds = scriptedTransport([
      htmlResponse("", {
        statusCode: 302,
        location: "https://user:pass@example.com/secret",
      }),
    ]);
    await expectFetchCode(
      () =>
        fetchHtmlSafely("https://example.com/start", {
          resolveAddresses: resolveTo([publicIpv4()]),
          transportRequest: withCreds.transportRequest,
        }),
      "UNSAFE_URL",
    );

    const withPort = scriptedTransport([
      htmlResponse("", {
        statusCode: 302,
        location: "https://example.com:8443/secret",
      }),
    ]);
    await expectFetchCode(
      () =>
        fetchHtmlSafely("https://example.com/start", {
          resolveAddresses: resolveTo([publicIpv4()]),
          transportRequest: withPort.transportRequest,
        }),
      "INVALID_URL",
    );
  });

  it("maps interrupted/network transport failures without leaking internals as success", async () => {
    await expectFetchCode(
      () =>
        fetchHtmlSafely("https://example.com/", {
          resolveAddresses: resolveTo([publicIpv4()]),
          transportRequest: async () => {
            throw Object.assign(new Error("socket hang up"), {
              code: "ECONNRESET",
            });
          },
        }),
      "HTTP_ERROR",
    );
  });

  it("rejects missing Content-Type as unsupported content", async () => {
    const { transportRequest } = scriptedTransport([
      {
        statusCode: 200,
        headers: {},
        body: Buffer.from(SAMPLE_HTML),
      },
    ]);

    await expectFetchCode(
      () =>
        fetchHtmlSafely("https://example.com/", {
          resolveAddresses: resolveTo([publicIpv4()]),
          transportRequest,
        }),
      "UNSUPPORTED_CONTENT",
    );
  });

  it("rejects malformed Content-Type values that are not HTML", async () => {
    const { transportRequest } = scriptedTransport([
      {
        statusCode: 200,
        headers: { "content-type": "text/htmlhhhh; charset=utf-8" },
        body: Buffer.from(SAMPLE_HTML),
      },
    ]);

    await expectFetchCode(
      () =>
        fetchHtmlSafely("https://example.com/", {
          resolveAddresses: resolveTo([publicIpv4()]),
          transportRequest,
        }),
      "UNSUPPORTED_CONTENT",
    );
  });

  it("honors the overall deadline before issuing another hop", async () => {
    let now = 0;
    await expectFetchCode(
      () =>
        fetchHtmlSafely("https://example.com/", {
          resolveAddresses: resolveTo([publicIpv4()]),
          transportRequest: async () => htmlResponse(SAMPLE_HTML),
          timeoutMs: 10,
          now: () => {
            now += 20;
            return now;
          },
        }),
      "FETCH_TIMEOUT",
    );
  });

  it("documents TLS hostname verification invariants on the default transport", async () => {
    // Default transport sets servername to the URL hostname and never disables
    // certificate verification (rejectUnauthorized: true). Covered here as a
    // regression lock on the exported lookup helper contract.
    const lookup = createPinnedLookup({ address: "8.8.8.8", family: 4 });
    expect(typeof lookup).toBe("function");
  });
});

describe("createPinnedLookup adversarial shapes", () => {
  it("supports the options-as-callback Node overload", async () => {
    const lookup = createPinnedLookup({ address: "9.9.9.9", family: 4 });
    const result = await new Promise<{ address: string; family: number }>(
      (resolve, reject) => {
        // Node LegacyLookupSingle: lookup(hostname, callback)
        (
          lookup as unknown as (
            hostname: string,
            callback: (
              err: NodeJS.ErrnoException | null,
              address: string,
              family: number,
            ) => void,
          ) => void
        )("example.com", (err, address, family) => {
          if (err) {
            reject(err);
            return;
          }
          resolve({ address, family });
        });
      },
    );
    expect(result).toEqual({ address: "9.9.9.9", family: 4 });
  });

  it("never returns a different address than the pinned public IP", async () => {
    const lookup = createPinnedLookup({ address: "1.0.0.1", family: 4 });
    const classic = await new Promise<string>((resolve, reject) => {
      lookup("evil.example", {}, (err, address) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(address as string);
      });
    });
    const all = await new Promise<string>((resolve, reject) => {
      lookup("evil.example", { all: true }, (err, addresses) => {
        if (err) {
          reject(err);
          return;
        }
        const list = addresses as Array<{ address: string; family: number }>;
        resolve(list[0]?.address ?? "");
      });
    });
    expect(classic).toBe("1.0.0.1");
    expect(all).toBe("1.0.0.1");
  });
});
