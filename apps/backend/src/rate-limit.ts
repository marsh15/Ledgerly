import { HTTPException } from "hono/http-exception";

export interface RateLimiter {
  consume(key: string, limit: number, windowMs: number): Promise<boolean>;
}

export class MemoryRateLimiter implements RateLimiter {
  private readonly buckets = new Map<string, { count: number; resetAt: number }>();
  constructor(private readonly maxBuckets = 10_000) {}

  async consume(key: string, limit: number, windowMs: number): Promise<boolean> {
    const now = Date.now();
    if (this.buckets.size >= this.maxBuckets) this.sweep(now);
    const bucket = this.buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + windowMs });
      return true;
    }
    bucket.count += 1;
    return bucket.count <= limit;
  }

  private sweep(now: number) {
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) this.buckets.delete(key);
    }
    while (this.buckets.size >= this.maxBuckets) {
      const oldest = this.buckets.keys().next().value as string | undefined;
      if (!oldest) break;
      this.buckets.delete(oldest);
    }
  }
}

export interface RedisEvalClient {
  eval(script: string, options: { keys: string[]; arguments: string[] }): Promise<number>;
}

export class RedisRateLimiter implements RateLimiter {
  constructor(private readonly client: RedisEvalClient, private readonly prefix = "ledgerly:rate") {}

  async consume(key: string, limit: number, windowMs: number): Promise<boolean> {
    const count = await this.client.eval(
      "local current = redis.call('INCR', KEYS[1]); if current == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]); end; return current;",
      { keys: [`${this.prefix}:${key}`], arguments: [String(windowMs)] }
    );
    return count <= limit;
  }
}

let limiter: RateLimiter = new MemoryRateLimiter();

export function configureRateLimiter(next: RateLimiter): void {
  limiter = next;
}

export async function assertWithinRateLimit(key: string, limit = 30, windowMs = 60_000): Promise<void> {
  if (!(await limiter.consume(key, limit, windowMs))) {
    throw new HTTPException(429, { message: "Too many requests. Please retry in a minute." });
  }
}
