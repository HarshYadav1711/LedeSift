import ipaddr from "ipaddr.js";

/**
 * Returns true only for globally routable unicast addresses.
 * IPv4-mapped IPv6 addresses are unwrapped and classified as IPv4.
 */
export function isPublicIpAddress(raw: string): boolean {
  let addr: ipaddr.IPv4 | ipaddr.IPv6;

  try {
    addr = ipaddr.parse(raw.trim());
  } catch {
    return false;
  }

  if (addr.kind() === "ipv6") {
    const v6 = addr as ipaddr.IPv6;
    if (v6.isIPv4MappedAddress()) {
      addr = v6.toIPv4Address();
    }
  }

  // After unwrapping mapped addresses, only globally routable unicast is allowed.
  // ipaddr.js marks documentation/TEST-NET, broadcast, private, etc. as non-unicast.
  return addr.range() === "unicast";
}

export function isIpLiteral(hostname: string): boolean {
  const trimmed = hostname.trim();
  // WHATWG URL hostnames for IPv6 are without brackets when taken from URL.hostname,
  // but callers may pass bracketed forms.
  const candidate =
    trimmed.startsWith("[") && trimmed.endsWith("]")
      ? trimmed.slice(1, -1)
      : trimmed;

  try {
    ipaddr.parse(candidate);
    return true;
  } catch {
    return false;
  }
}

export function normalizeIpLiteral(hostname: string): string {
  const trimmed = hostname.trim();
  const candidate =
    trimmed.startsWith("[") && trimmed.endsWith("]")
      ? trimmed.slice(1, -1)
      : trimmed;
  const addr = ipaddr.parse(candidate);
  return addr.toString();
}

export function ipFamily(address: string): 4 | 6 {
  const addr = ipaddr.parse(address);
  return addr.kind() === "ipv4" ? 4 : 6;
}
