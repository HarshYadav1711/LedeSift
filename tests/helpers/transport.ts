import type {
  ResolveAddresses,
  TransportRequest,
  TransportResponse,
} from "@/lib/fetch-html";
import type { ResolvedAddress } from "@/lib/types";

/** Use a real public address — TEST-NET ranges are reserved and correctly rejected. */
export function publicIpv4(address = "8.8.8.8"): ResolvedAddress {
  return { address, family: 4 };
}

export function resolveTo(
  addresses: ResolvedAddress[],
): ResolveAddresses {
  return async () => addresses;
}

export function htmlResponse(
  html: string,
  init?: Partial<TransportResponse> & { location?: string },
): TransportResponse {
  const headers: TransportResponse["headers"] = {
    "content-type": "text/html; charset=utf-8",
  };
  if (init?.location) {
    headers.location = init.location;
  }
  return {
    statusCode: init?.statusCode ?? 200,
    headers: { ...headers, ...init?.headers },
    body: Buffer.from(html, "utf8"),
  };
}

export function scriptedTransport(
  script: Array<
    | TransportResponse
    | ((args: Parameters<TransportRequest>[0]) => TransportResponse | Promise<TransportResponse>)
  >,
): { transportRequest: TransportRequest; calls: Parameters<TransportRequest>[0][] } {
  const calls: Parameters<TransportRequest>[0][] = [];
  let index = 0;

  const transportRequest: TransportRequest = async (args) => {
    calls.push(args);
    const step = script[index];
    index += 1;
    if (!step) {
      throw new Error(`Unexpected transport call #${index}`);
    }
    return typeof step === "function" ? step(args) : step;
  };

  return { transportRequest, calls };
}
