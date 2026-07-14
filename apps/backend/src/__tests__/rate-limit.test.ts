import { createClient } from "redis";
import { assertWithinRateLimit, configureRateLimiter, MemoryRateLimiter, RedisRateLimiter } from "../rate-limit";

describe("rate limiters", () => {
  it("returns allowance and retry timing", async () => {
    const limiter = new MemoryRateLimiter();
    expect(await limiter.consume("private-key", 1, 15_000)).toMatchObject({ allowed: true, retryAfterSeconds: 15 });
    expect(await limiter.consume("private-key", 1, 15_000)).toMatchObject({ allowed: false, retryAfterSeconds: 15 });
  });

  it("shares Redis counters through the backing client", async () => {
    let count = 0;
    const client = { eval: async () => [++count, 15_000], ping: async () => "PONG" } as never;
    const first = new RedisRateLimiter(client);
    const second = new RedisRateLimiter(client);
    expect((await first.consume("key", 1, 15_000)).allowed).toBe(true);
    expect((await second.consume("key", 1, 15_000)).allowed).toBe(false);
  });

  (process.env.REDIS_URL ? it : it.skip)("shares counters across real Redis limiter instances", async () => {
    const client = createClient({ url: process.env.REDIS_URL! });
    await client.connect();
    const prefix = `ledgerly:test:${Date.now()}`;
    try {
      const first = new RedisRateLimiter(client, prefix);
      const second = new RedisRateLimiter(client, prefix);
      expect((await first.consume("shared", 1, 15_000)).allowed).toBe(true);
      expect((await second.consume("shared", 1, 15_000)).allowed).toBe(false);
    } finally {
      await client.del(`${prefix}:shared`);
      await client.quit();
    }
  });

  it("fails closed when the limiter backend fails", async () => {
    configureRateLimiter({ consume: async () => { throw new Error("offline"); } });
    await expect(assertWithinRateLimit("key")).rejects.toMatchObject({ status: 503 });
    configureRateLimiter(new MemoryRateLimiter());
  });
});
