import { describe, expect, it } from "vitest";
import { isPublicIpAddress } from "@/lib/ip";

describe("isPublicIpAddress", () => {
  it("accepts public IPv4 addresses", () => {
    expect(isPublicIpAddress("8.8.8.8")).toBe(true);
    expect(isPublicIpAddress("1.1.1.1")).toBe(true);
    expect(isPublicIpAddress("93.184.216.34")).toBe(true);
  });

  it("rejects documentation / TEST-NET ranges", () => {
    expect(isPublicIpAddress("203.0.113.10")).toBe(false);
    expect(isPublicIpAddress("198.51.100.20")).toBe(false);
    expect(isPublicIpAddress("192.0.2.1")).toBe(false);
  });

  it("rejects loopback, private, link-local, and CGNAT IPv4", () => {
    expect(isPublicIpAddress("127.0.0.1")).toBe(false);
    expect(isPublicIpAddress("10.0.0.5")).toBe(false);
    expect(isPublicIpAddress("192.168.1.10")).toBe(false);
    expect(isPublicIpAddress("172.16.0.1")).toBe(false);
    expect(isPublicIpAddress("169.254.169.254")).toBe(false);
    expect(isPublicIpAddress("100.64.0.1")).toBe(false);
    expect(isPublicIpAddress("0.0.0.0")).toBe(false);
    expect(isPublicIpAddress("255.255.255.255")).toBe(false);
  });

  it("rejects IPv6 loopback, unique-local, and link-local", () => {
    expect(isPublicIpAddress("::1")).toBe(false);
    expect(isPublicIpAddress("fc00::1")).toBe(false);
    expect(isPublicIpAddress("fd12:3456:789a::1")).toBe(false);
    expect(isPublicIpAddress("fe80::1")).toBe(false);
  });

  it("unwraps IPv4-mapped IPv6 and classifies the embedded IPv4", () => {
    expect(isPublicIpAddress("::ffff:127.0.0.1")).toBe(false);
    expect(isPublicIpAddress("::ffff:10.0.0.1")).toBe(false);
    expect(isPublicIpAddress("::ffff:169.254.169.254")).toBe(false);
    expect(isPublicIpAddress("::ffff:8.8.8.8")).toBe(true);
  });

  it("rejects multicast and unspecified", () => {
    expect(isPublicIpAddress("224.0.0.1")).toBe(false);
    expect(isPublicIpAddress("ff02::1")).toBe(false);
    expect(isPublicIpAddress("::")).toBe(false);
  });
});
