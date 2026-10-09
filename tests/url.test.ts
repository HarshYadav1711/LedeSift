import { describe, expect, it } from "vitest";
import { RetrievalError } from "@/lib/errors";
import { validatePublicHttpUrl, validateRedirectTarget } from "@/lib/url";

function expectCode(fn: () => unknown, code: string) {
  try {
    fn();
    throw new Error("expected throw");
  } catch (error) {
    expect(error).toBeInstanceOf(RetrievalError);
    expect((error as RetrievalError).code).toBe(code);
  }
}

describe("validatePublicHttpUrl", () => {
  it("accepts absolute http and https URLs on standard ports", () => {
    const httpsUrl = validatePublicHttpUrl("https://example.com/path?q=1");
    expect(httpsUrl.protocol).toBe("https:");
    expect(httpsUrl.hostname).toBe("example.com");
    expect(httpsUrl.href).toContain("https://example.com/path?q=1");

    const httpUrl = validatePublicHttpUrl("http://example.com/");
    expect(httpUrl.protocol).toBe("http:");
  });

  it("accepts explicit standard ports (WHATWG may normalize defaults away)", () => {
    const httpsUrl = validatePublicHttpUrl("https://example.com:443/");
    expect(["", "443"]).toContain(httpsUrl.port);
    const httpUrl = validatePublicHttpUrl("http://example.com:80/");
    expect(["", "80"]).toContain(httpUrl.port);
  });

  it("rejects nonstandard ports", () => {
    expectCode(() => validatePublicHttpUrl("https://example.com:8443/"), "INVALID_URL");
    expectCode(() => validatePublicHttpUrl("http://example.com:8080/"), "INVALID_URL");
  });

  it("rejects embedded credentials", () => {
    expectCode(
      () => validatePublicHttpUrl("https://user:pass@example.com/"),
      "UNSAFE_URL",
    );
  });

  it("rejects unsupported protocols and malformed values", () => {
    expectCode(() => validatePublicHttpUrl("ftp://example.com/"), "INVALID_URL");
    expectCode(() => validatePublicHttpUrl("javascript:alert(1)"), "INVALID_URL");
    expectCode(() => validatePublicHttpUrl("not a url"), "INVALID_URL");
    expectCode(() => validatePublicHttpUrl(""), "INVALID_URL");
  });

  it("rejects localhost and internal-only hostnames", () => {
    expectCode(() => validatePublicHttpUrl("http://localhost/"), "UNSAFE_URL");
    expectCode(() => validatePublicHttpUrl("http://foo.localhost/"), "UNSAFE_URL");
    expectCode(() => validatePublicHttpUrl("http://service.local/"), "UNSAFE_URL");
    expectCode(
      () => validatePublicHttpUrl("http://metadata.google.internal/"),
      "UNSAFE_URL",
    );
  });

  it("rejects loopback and private IP literals", () => {
    expectCode(() => validatePublicHttpUrl("http://127.0.0.1/"), "UNSAFE_URL");
    expectCode(() => validatePublicHttpUrl("http://192.168.0.20/"), "UNSAFE_URL");
    expectCode(() => validatePublicHttpUrl("http://10.1.2.3/"), "UNSAFE_URL");
    expectCode(() => validatePublicHttpUrl("http://169.254.169.254/"), "UNSAFE_URL");
    expectCode(() => validatePublicHttpUrl("http://[::1]/"), "UNSAFE_URL");
    expectCode(() => validatePublicHttpUrl("http://[fc00::1]/"), "UNSAFE_URL");
  });

  it("rejects IPv4-mapped IPv6 host literals that embed private addresses", () => {
    expectCode(
      () => validatePublicHttpUrl("http://[::ffff:127.0.0.1]/"),
      "UNSAFE_URL",
    );
    expectCode(
      () => validatePublicHttpUrl("http://[::ffff:169.254.169.254]/"),
      "UNSAFE_URL",
    );
  });

  it("normalizes with the WHATWG URL parser", () => {
    const validated = validatePublicHttpUrl("HTTPS://EXAMPLE.com:443/a/./b");
    expect(validated.href).toBe("https://example.com/a/b");
  });
});

describe("validateRedirectTarget", () => {
  it("resolves relative redirects then validates", () => {
    const next = validateRedirectTarget(
      "https://example.com/articles/1",
      "/articles/2",
    );
    expect(next.href).toBe("https://example.com/articles/2");
  });

  it("rejects unsafe redirect destinations", () => {
    expectCode(
      () => validateRedirectTarget("https://example.com/", "http://127.0.0.1/"),
      "UNSAFE_URL",
    );
  });
});
