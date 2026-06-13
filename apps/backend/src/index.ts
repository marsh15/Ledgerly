import { serve } from "@hono/node-server";
import { createTransactionDrafts, extractTransaction, normalizeForMatching, reviewStatusForConfidence } from "@ledgerly/shared";
import type { Prisma, Transaction } from "@prisma/client";
import { Hono } from "hono";
import type { Context, Next } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { auth } from "./auth";
import { prisma, withTenant } from "./db";
import { env } from "./env";
import { assertWithinRateLimit } from "./rate-limit";
import { getTenantScope, ensurePersonalTenant } from "./tenant";
import { buildTransactionWhere, type TransactionFilters } from "./transaction-query";
import { presentTransaction } from "./transaction-presenter";

type Variables = {
  scope: Awaited<ReturnType<typeof getTenantScope>>;
};

export const app = new Hono<{ Variables: Variables }>();

app.use(
  "*",
  cors({
    origin: env.frontendOrigin,
    allowHeaders: ["Content-Type", "Authorization", "Cookie"],
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
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

async function scopedAuth(c: Context<{ Variables: Variables }>, next: Next) {
  const scope = await getTenantScope(c.req.raw.headers);
  c.set("scope", scope);
  await next();
}

app.use("/api/transactions", scopedAuth);
app.use("/api/transactions/*", scopedAuth);
app.use("/api/category-rules", scopedAuth);
app.use("/api/category-rules/*", scopedAuth);

app.post("/api/transactions/preview", async (c) => {
  const scope = c.get("scope");
  assertWithinRateLimit(scope.userId);

  const body = previewBodySchema.parse(await c.req.json());
  const enrichedDrafts = await withTenant(scope, async (tx) => {
    const rules = await getCategoryRules(tx, scope);
    const drafts = createTransactionDrafts(body.text, {
      categoryRules: rules,
      enableBuiltInCategories: true,
      ...(body.accountLabel ? { accountLabel: body.accountLabel } : {})
    });

    return Promise.all(
      drafts.map(async (draft) => ({
        ...draft,
        duplicate: await findDuplicate(tx, scope, draft)
      }))
    );
  });

  return c.json({ drafts: enrichedDrafts });
});

app.post("/api/transactions", async (c) => {
  const scope = c.get("scope");
  assertWithinRateLimit(scope.userId);

  const body = saveDraftsBodySchema.parse(await c.req.json());
  const saved = await withTenant(scope, async (tx) => {
    const transactions: Transaction[] = [];

    for (const draft of body.drafts) {
      const duplicateOfId = await resolveDuplicateOfId(tx, scope, draft.duplicateOfId);
      transactions.push(
        await tx.transaction.create({
          data: {
            userId: scope.userId,
            organizationId: scope.organizationId,
            teamId: scope.teamId,
            date: new Date(`${draft.date}T00:00:00.000Z`),
            description: draft.description,
            type: draft.type,
            amount: draft.amount,
            balanceAfter: draft.balanceAfter,
            category: draft.category || null,
            confidence: draft.confidence,
            status: draft.status ?? reviewStatusForConfidence(draft.confidence),
            accountLabel: cleanAccountLabel(draft.accountLabel),
            duplicateOfId,
            rawText: draft.sourceText ?? draft.rawText ?? draft.description
          }
        })
      );
    }

    return transactions;
  });

  return c.json({ transactions: saved.map(presentTransaction) }, 201);
});

app.post("/api/transactions/extract", async (c) => {
  const scope = c.get("scope");
  assertWithinRateLimit(scope.userId);

  const body = extractBodySchema.parse(await c.req.json());
  const { saved, duplicate } = await withTenant(scope, async (tx) => {
    const rules = await getCategoryRules(tx, scope);
    const extracted = extractTransaction(body.text, { categoryRules: rules, enableBuiltInCategories: true });
    const duplicate = await findDuplicate(tx, scope, { ...extracted, accountLabel: body.accountLabel ?? "Personal" });
    const saved = await tx.transaction.create({
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
        status: reviewStatusForConfidence(extracted.confidence),
        accountLabel: cleanAccountLabel(body.accountLabel),
        duplicateOfId: duplicate.isDuplicate ? duplicate.existingId : null,
        rawText: body.text
      }
    });
    return { saved, duplicate };
  });

  return c.json({ transaction: presentTransaction(saved), duplicate }, 201);
});

app.get("/api/transactions/export", async (c) => {
  const scope = c.get("scope");
  const filters = parseTransactionFilters(c);
  const rows = await withTenant(scope, (tx) => tx.transaction.findMany({
    where: buildTransactionWhere(scope, filters),
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 1000
  }));

  return new Response(toCsv(rows.map(presentTransaction)), {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="ledgerly-transactions-${new Date().toISOString().slice(0, 10)}.csv"`
    }
  });
});

app.get("/api/transactions", async (c) => {
  const scope = c.get("scope");
  const query = paginationQuerySchema.parse({
    cursor: c.req.query("cursor"),
    limit: c.req.query("limit")
  });
  const limit = query.limit ? Number(query.limit) : 10;
  const filters = parseTransactionFilters(c);
  const cursor = query.cursor ? parseTransactionCursor(query.cursor) : null;

  const rows = await withTenant(scope, async (tx) => {
    if (cursor) {
      const cursorOwner = await tx.transaction.findFirst({
        where: {
          id: cursor.id,
          createdAt: cursor.createdAt,
          userId: scope.userId,
          organizationId: scope.organizationId
        },
        select: { id: true }
      });
      if (!cursorOwner) throw new HTTPException(400, { message: "Invalid transaction cursor" });
    }

    return tx.transaction.findMany({
      where: {
        ...buildTransactionWhere(scope, filters),
        ...(cursor ? { OR: [{ createdAt: { lt: cursor.createdAt } }, { createdAt: cursor.createdAt, id: { lt: cursor.id } }] } : {})
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1
    });
  });

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;

  return c.json({
    items: page.map(presentTransaction),
    transactions: page.map(presentTransaction),
    nextCursor: hasMore ? encodeTransactionCursor(page.at(-1) ?? null) : null
  });
});

app.delete("/api/transactions/:id", async (c) => {
  const scope = c.get("scope");
  const deleted = await withTenant(scope, async (tx) => {
    const existing = await tx.transaction.findFirst({
      where: {
        id: c.req.param("id"),
        userId: scope.userId,
        organizationId: scope.organizationId
      },
      select: { id: true }
    });
    if (!existing) return false;

    await tx.transaction.delete({ where: { id: existing.id } });
    return true;
  });
  if (!deleted) throw new HTTPException(404, { message: "Transaction not found" });
  return c.json({ ok: true });
});

app.get("/api/category-rules", async (c) => {
  const scope = c.get("scope");
  const rules = await withTenant(scope, (tx) => tx.categoryRule.findMany({
    where: { userId: scope.userId, organizationId: scope.organizationId },
    orderBy: { createdAt: "desc" }
  }));

  return c.json({ rules });
});

app.post("/api/category-rules", async (c) => {
  const scope = c.get("scope");
  const body = categoryRuleBodySchema.parse(await c.req.json());
  const rule = await withTenant(scope, (tx) => tx.categoryRule.upsert({
    where: {
      organizationId_matchText: {
        organizationId: scope.organizationId,
        matchText: body.matchText.trim()
      }
    },
    create: {
      userId: scope.userId,
      organizationId: scope.organizationId,
      matchText: body.matchText.trim(),
      category: body.category.trim()
    },
    update: {
      category: body.category.trim()
    }
  }));

  return c.json({ rule }, 201);
});

app.patch("/api/category-rules/:id", async (c) => {
  const scope = c.get("scope");
  const body = categoryRuleBodySchema.parse(await c.req.json());
  const rule = await withTenant(scope, async (tx) => {
    const existing = await tx.categoryRule.findFirst({
      where: { id: c.req.param("id"), userId: scope.userId, organizationId: scope.organizationId }
    });
    if (!existing) return null;

    return tx.categoryRule.update({
      where: { id: existing.id },
      data: {
        matchText: body.matchText.trim(),
        category: body.category.trim()
      }
    });
  });
  if (!rule) throw new HTTPException(404, { message: "Category rule not found" });

  return c.json({ rule });
});

app.delete("/api/category-rules/:id", async (c) => {
  const scope = c.get("scope");
  const deleted = await withTenant(scope, async (tx) => {
    const existing = await tx.categoryRule.findFirst({
      where: { id: c.req.param("id"), userId: scope.userId, organizationId: scope.organizationId }
    });
    if (!existing) return false;

    await tx.categoryRule.delete({ where: { id: existing.id } });
    return true;
  });
  if (!deleted) throw new HTTPException(404, { message: "Category rule not found" });
  return c.json({ ok: true });
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

if (process.env.NODE_ENV !== "test") {
  serve({ fetch: app.fetch, port: env.port }, (info) => {
    console.log(`Ledgerly API listening on http://localhost:${info.port}`);
  });
}

const extractBodySchema = z.object({
  text: z.string().min(8).max(10_000),
  accountLabel: z.string().max(60).optional()
});

const previewBodySchema = z.object({
  text: z.string().min(8).max(50_000),
  accountLabel: z.string().max(60).optional()
});

const draftInputSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().min(1).max(160),
  type: z.enum(["DEBIT", "CREDIT"]),
  amount: z.number(),
  balanceAfter: z.number().nullable(),
  category: z.string().max(60).nullable().optional(),
  confidence: z.number().min(0).max(1),
  status: z.enum(["SAVED", "NEEDS_REVIEW"]).optional(),
  accountLabel: z.string().max(60).optional(),
  duplicateOfId: z.unknown().optional(),
  sourceText: z.string().optional(),
  rawText: z.string().optional()
}).passthrough();

const saveDraftsBodySchema = z.object({
  drafts: z.array(draftInputSchema).min(1).max(100)
});

const categoryRuleBodySchema = z.object({
  matchText: z.string().min(2).max(80),
  category: z.string().min(2).max(60)
});

const paginationQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z
    .string()
    .min(1)
    .optional()
    .refine((value) => !value || Number(value) <= 50, "Limit cannot exceed 50")
});

function parseTransactionFilters(c: Context<{ Variables: Variables }>): TransactionFilters {
  return transactionFiltersSchema.parse({
    search: c.req.query("search"),
    dateFrom: c.req.query("dateFrom"),
    dateTo: c.req.query("dateTo"),
    type: c.req.query("type"),
    category: c.req.query("category"),
    status: c.req.query("status"),
    accountLabel: c.req.query("accountLabel"),
    minConfidence: c.req.query("minConfidence")
  });
}

const transactionFiltersSchema = z.object({
  search: z.string().trim().min(1).max(120).optional(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  type: z.enum(["DEBIT", "CREDIT"]).optional(),
  category: z.string().trim().min(1).max(60).optional(),
  status: z.enum(["SAVED", "NEEDS_REVIEW"]).optional(),
  accountLabel: z.string().trim().min(1).max(60).optional(),
  minConfidence: z
    .string()
    .regex(/^(0(\.\d+)?|1(\.0+)?)$/)
    .optional()
    .transform((value) => (value === undefined ? undefined : Number(value)))
});

type TenantDb = Prisma.TransactionClient;

async function getCategoryRules(tx: TenantDb, scope: Variables["scope"]) {
  return tx.categoryRule.findMany({
    where: { userId: scope.userId, organizationId: scope.organizationId },
    select: { matchText: true, category: true },
    orderBy: { createdAt: "desc" }
  });
}

async function findDuplicate(
  tx: TenantDb,
  scope: Variables["scope"],
  draft: { date?: string; amount?: number; description?: string; accountLabel?: string }
): Promise<{ isDuplicate: boolean; existingId: string | null }> {
  if (!draft.date || draft.amount === undefined || !draft.description) {
    return { isDuplicate: false, existingId: null };
  }

  const accountLabel = cleanAccountLabel(draft.accountLabel);
  const candidates = await tx.transaction.findMany({
    where: {
      userId: scope.userId,
      organizationId: scope.organizationId,
      date: new Date(`${draft.date}T00:00:00.000Z`),
      amount: draft.amount,
      accountLabel
    },
    select: { id: true, description: true },
    take: 10
  });
  const normalizedDescription = normalizeForMatching(draft.description);
  const duplicate = candidates.find((candidate) => {
    const normalizedCandidate = normalizeForMatching(candidate.description);
    return normalizedCandidate === normalizedDescription || normalizedCandidate.includes(normalizedDescription) || normalizedDescription.includes(normalizedCandidate);
  });

  return { isDuplicate: Boolean(duplicate), existingId: duplicate?.id ?? null };
}

async function resolveDuplicateOfId(tx: TenantDb, scope: Variables["scope"], value: unknown): Promise<string | null> {
  if (typeof value !== "string" || !value.trim()) return null;
  const existing = await tx.transaction.findFirst({
    where: {
      id: value.trim(),
      userId: scope.userId,
      organizationId: scope.organizationId
    },
    select: { id: true }
  });
  return existing?.id ?? null;
}

function encodeTransactionCursor(row: { id: string; createdAt: Date } | null): string | null {
  if (!row) return null;
  return Buffer.from(JSON.stringify({ createdAt: row.createdAt.toISOString(), id: row.id }), "utf8").toString("base64url");
}

function parseTransactionCursor(value: string): { createdAt: Date; id: string } {
  try {
    const payload = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as { createdAt?: unknown; id?: unknown };
    if (typeof payload.id !== "string" || typeof payload.createdAt !== "string") throw new Error("Invalid cursor payload");
    const createdAt = new Date(payload.createdAt);
    if (Number.isNaN(createdAt.getTime())) throw new Error("Invalid cursor date");
    return { createdAt, id: payload.id };
  } catch {
    throw new HTTPException(400, { message: "Invalid transaction cursor" });
  }
}

function cleanAccountLabel(value?: string | null): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed.slice(0, 60) : "Personal";
}

function toCsv(rows: ReturnType<typeof presentTransaction>[]): string {
  const headers = ["date", "description", "amount", "type", "balanceAfter", "category", "confidence", "status", "accountLabel", "createdAt"];
  const body = rows.map((row) =>
    headers
      .map((header) => csvCell(String(row[header as keyof typeof row] ?? "")))
      .join(",")
  );
  return [headers.join(","), ...body].join("\n");
}

function csvCell(value: string): string {
  if (!/[",\n]/.test(value)) return value;
  return `"${value.replace(/"/g, '""')}"`;
}

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
