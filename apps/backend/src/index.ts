import { serve } from "@hono/node-server";
import { extractTransaction } from "@ledgerly/shared";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { auth } from "./auth";
import { prisma } from "./db";
import { env } from "./env";
import { buildScopedTransactionWhere } from "./isolation";
import { assertWithinRateLimit } from "./rate-limit";
import { getTenantScope, ensurePersonalTenant } from "./tenant";
import { presentTransaction } from "./transaction-presenter";

type Variables = {
  scope: Awaited<ReturnType<typeof getTenantScope>>;
};

const app = new Hono<{ Variables: Variables }>();

app.use(
  "*",
  cors({
    origin: env.frontendOrigin,
    allowHeaders: ["Content-Type", "Authorization", "Cookie"],
    allowMethods: ["GET", "POST", "OPTIONS"],
    exposeHeaders: ["set-auth-token", "set-auth-jwt", "set-cookie"],
    credentials: true,
    maxAge: 600
  })
);

app.get("/health", (c) => c.json({ ok: true }));

app.post("/api/auth/register", async (c) => {
  const body = await c.req.json();
  const response = await forwardToBetterAuth(c.req.raw, "/api/auth/sign-up/email", {
    name: body.name ?? body.email?.split("@")[0] ?? "User",
    email: body.email,
    password: body.password
  });

  const payload = await response.clone().json().catch(() => null) as AuthPayload | null;
  if (!response.ok || !payload) return response;

  const user = payload.user ?? payload.data?.user;
  if (user?.id && user.email && user.name) {
    await ensurePersonalTenant({ id: user.id, email: user.email, name: user.name });
  }

  return withAuthHeaders(response, {
    user,
    token: response.headers.get("set-auth-token"),
    jwt: response.headers.get("set-auth-jwt")
  });
});

app.post("/api/auth/login", async (c) => {
  const body = await c.req.json();
  const response = await forwardToBetterAuth(c.req.raw, "/api/auth/sign-in/email", {
    email: body.email,
    password: body.password
  });

  if (!response.ok) return response;
  const payload = await response.clone().json().catch(() => null) as AuthPayload | null;
  const user = payload?.user ?? payload?.data?.user;
  if (user?.id && user.email && user.name) {
    await ensurePersonalTenant({ id: user.id, email: user.email, name: user.name });
  }

  return withAuthHeaders(response, {
    user,
    token: response.headers.get("set-auth-token"),
    jwt: response.headers.get("set-auth-jwt")
  });
});

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

app.use("/api/transactions/*", async (c, next) => {
  const scope = await getTenantScope(c.req.raw.headers);
  c.set("scope", scope);
  await next();
});

app.post("/api/transactions/extract", async (c) => {
  const scope = c.get("scope");
  assertWithinRateLimit(scope.userId);

  const body = extractBodySchema.parse(await c.req.json());
  const extracted = extractTransaction(body.text);
  const saved = await prisma.transaction.create({
    data: {
      userId: scope.userId,
      organizationId: scope.organizationId,
      teamId: scope.teamId,
      date: new Date(`${extracted.date}T00:00:00.000Z`),
      description: extracted.description,
      type: extracted.type,
      amount: extracted.amount,
      balanceAfter: extracted.balanceAfter,
      category: extracted.category,
      confidence: extracted.confidence,
      rawText: body.text
    }
  });

  return c.json({ transaction: presentTransaction(saved) }, 201);
});

app.get("/api/transactions", async (c) => {
  const scope = c.get("scope");
  const query = paginationQuerySchema.parse({
    cursor: c.req.query("cursor"),
    limit: c.req.query("limit")
  });
  const limit = query.limit ? Number(query.limit) : 10;

  const rows = await prisma.transaction.findMany({
    where: buildScopedTransactionWhere(scope),
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {})
  });

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;

  return c.json({
    items: page.map(presentTransaction),
    transactions: page.map(presentTransaction),
    nextCursor: hasMore ? page.at(-1)?.id ?? null : null
  });
});

app.onError((error, c) => {
  if (error instanceof HTTPException) {
    return c.json({ error: { code: httpErrorCode(error.status), message: error.message } }, error.status);
  }

  if (error instanceof z.ZodError) {
    return c.json({ error: { code: "BAD_REQUEST", message: "Invalid request", issues: error.issues } }, 400);
  }

  console.error(error);
  return c.json({ error: { code: "INTERNAL_SERVER_ERROR", message: "Internal server error" } }, 500);
});

serve({ fetch: app.fetch, port: env.port }, (info) => {
  console.log(`Ledgerly API listening on http://localhost:${info.port}`);
});

const extractBodySchema = z.object({
  text: z.string().min(8).max(10_000)
});

const paginationQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z
    .string()
    .regex(/^\d+$/)
    .optional()
    .refine((value) => !value || Number(value) <= 50, "Limit cannot exceed 50")
});

type AuthPayload = {
  user?: { id: string; email: string; name: string };
  data?: { user?: { id: string; email: string; name: string } };
};

async function forwardToBetterAuth(source: Request, path: string, body: unknown): Promise<Response> {
  const url = new URL(path, env.betterAuthUrl);
  const headers = new Headers(source.headers);
  headers.set("content-type", "application/json");

  return auth.handler(
    new Request(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    })
  );
}

function withAuthHeaders(source: Response, body: unknown): Response {
  const headers = new Headers(source.headers);
  headers.set("content-type", "application/json");
  return new Response(JSON.stringify(body), {
    status: source.status,
    headers
  });
}

function httpErrorCode(status: number): string {
  if (status === 401) return "UNAUTHORIZED";
  if (status === 403) return "FORBIDDEN";
  if (status === 404) return "NOT_FOUND";
  return "HTTP_ERROR";
}
