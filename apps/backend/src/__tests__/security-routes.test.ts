import { app, rateLimiterReady } from "../index";
import { configureRateLimiter, MemoryRateLimiter, type RateLimiter } from "../rate-limit";

describe("login security", () => {
  afterEach(() => configureRateLimiter(new MemoryRateLimiter()));

  it("uses private composite/IP keys and returns Retry-After at configured thresholds", async () => {
    await rateLimiterReady;
    const calls: Array<{ key: string; limit: number; windowMs: number }> = [];
    const limiter: RateLimiter = {
      consume: async (key, limit, windowMs) => {
        calls.push({ key, limit, windowMs });
        return { allowed: calls.length === 1, retryAfterSeconds: 900 };
      }
    };
    configureRateLimiter(limiter);
    const response = await app.request("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.9" },
      body: JSON.stringify({ email: "Private.User@Example.com", password: "Password123!" })
    });
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("900");
    expect(calls.map(({ limit, windowMs }) => ({ limit, windowMs }))).toEqual([{ limit: 5, windowMs: 900_000 }, { limit: 30, windowMs: 900_000 }]);
    expect(JSON.stringify(calls)).not.toContain("private.user@example.com");
    expect(JSON.stringify(calls)).not.toContain("203.0.113.9");
  });
});
