import { createHash } from "node:crypto";

export function securityHash(value: string): string {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex").slice(0, 24);
}

export function requestIp(headers: Headers, trustProxyHeaders: boolean, directAddress?: string): string {
  if (trustProxyHeaders) {
    const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip")?.trim();
    if (forwarded) return forwarded;
  }
  return directAddress?.trim() || "unknown";
}

export function securityLog(event: string, details: Record<string, string | number | boolean | undefined>): void {
  console.info(JSON.stringify({ event, ...details }));
}
