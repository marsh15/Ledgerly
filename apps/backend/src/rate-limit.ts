import { createClient } from "redis";
import { HTTPException } from "hono/http-exception";

export type RateLimitResult = { allowed: boolean; retryAfterSeconds: number };

export interface RateLimiter {
  consume(key: string, limit: number, windowMs: number): Promise<RateLimitResult>;
  ready?(): Promise<void>;
}

type RedisClient = {
  eval(script: string, options: { keys: string[]; arguments: string[] }): Promise<unknown>;
  ping(): Promise<unknown>;
};

export class MemoryRateLimiter implements RateLimiter {
  private readonly buckets = new Map<string, { count: number; resetAt: number }>();
  constructor(private readonly maxBuckets = 10_000) {}

  async consume(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
    const now = Date.now();
    if (this.buckets.size >= this.maxBuckets) this.sweep(now);
    let bucket = this.buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      this.buckets.set(key, bucket);
    }
    bucket.count += 1;
    return { allowed: bucket.count <= limit, retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) };
  }

  private sweep(now: number) {
    for (const [key, bucket] of this.buckets) if (bucket.resetAt <= now) this.buckets.delete(key);
    while (this.buckets.size >= this.maxBuckets) {
      const oldest = this.buckets.keys().next().value as string | undefined;
      if (!oldest) break;
      this.buckets.delete(oldest);
    }
  }
}

export class RedisRateLimiter implements RateLimiter {
  constructor(private readonly client: RedisClient, private readonly prefix = "ledgerly:rate") {}

  async consume(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
    const result = await this.client.eval(
      "local current = redis.call('INCR', KEYS[1]); if current == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]); end; local ttl = redis.call('PTTL', KEYS[1]); return {current, ttl};",
      { keys: [`${this.prefix}:${key}`], arguments: [String(windowMs)] }
    ) as [number, number];
    return { allowed: Number(result[0]) <= limit, retryAfterSeconds: Math.max(1, Math.ceil(Number(result[1]) / 1000)) };
  }

  async ready(): Promise<void> { await this.client.ping(); }
}

let limiter: RateLimiter = new MemoryRateLimiter();

export function configureRateLimiter(next: RateLimiter): void { limiter = next; }

export async function initializeRateLimiter(redisUrl?: string): Promise<void> {
  if (!redisUrl) return;
  configureRateLimiter({
    consume: async () => { throw new Error("Redis limiter is not connected"); },
    ready: async () => { throw new Error("Redis limiter is not connected"); }
  });
  const client = createClient({ url: redisUrl });
  client.on("error", (error) => console.error(JSON.stringify({ event: "redis.error", message: error.message })));
  await client.connect();
  client.unref();
  configureRateLimiter(new RedisRateLimiter(client));
}

export async function checkRateLimiterReadiness(): Promise<void> { await limiter.ready?.(); }

export class RateLimitExceededError extends HTTPException {
  constructor(readonly retryAfterSeconds: number) { super(429, { message: "Too many requests. Please try again later." }); }
}

export async function assertWithinRateLimit(key: string, limit = 30, windowMs = 60_000): Promise<void> {
  let result: RateLimitResult;
  try {
    result = await limiter.consume(key, limit, windowMs);
  } catch {
    throw new HTTPException(503, { message: "Request limiting is temporarily unavailable." });
  }
  if (!result.allowed) throw new RateLimitExceededError(result.retryAfterSeconds);
}
