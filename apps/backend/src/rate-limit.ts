import { HTTPException } from "hono/http-exception";

const buckets = new Map<string, { count: number; resetAt: number }>();

export function assertWithinRateLimit(key: string, limit = 30, windowMs = 60_000): void {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    throw new HTTPException(429, { message: "Too many requests. Please retry in a minute." });
  }
}
