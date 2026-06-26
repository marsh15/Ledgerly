import { prisma, withTenant } from "../db";
import { app } from "../index";

type AuthResult = {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
};

const runId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const userA = {
  name: "Route Test A",
  email: `route-a-${runId}@example.com`,
  password: "Password123!"
};
const userB = {
  name: "Route Test B",
  email: `route-b-${runId}@example.com`,
  password: "Password123!"
};

let databaseReady = false;

beforeAll(async () => {
  databaseReady = await canReachDatabase();
  if (!databaseReady) throw new Error("Postgres is required for DB-backed integration tests. Start the test database and apply migrations before running Jest.");
  await cleanupUsers([userA.email, userB.email]);
});

afterAll(async () => {
  if (databaseReady) {
    await cleanupUsers([userA.email, userB.email]);
  }
  await prisma.$disconnect();
});

describe("auth routes and tenant-scoped transactions", () => {
  it("registers a user, creates a personal tenant, and returns a usable session token", async () => {
    if (!databaseReady) return skipDatabaseTest();
    const auth = await register(userA);

    expect(auth.user.email).toBe(userA.email);
    expect(auth.token).toEqual(expect.any(String));

    const list = await app.request("/api/transactions", {
      headers: bearer(auth.token)
    });

    expect(list.status).toBe(200);
    await expect(list.json()).resolves.toMatchObject({ items: [] });
  });

  it("logs in an existing user and returns a fresh bearer token", async () => {
    if (!databaseReady) return skipDatabaseTest();
    const auth = await login(userA.email, userA.password);

    expect(auth.user.email).toBe(userA.email);
    expect(auth.token).toEqual(expect.any(String));
  });

  it("rejects unauthenticated tenant-scoped requests", async () => {
    if (!databaseReady) return skipDatabaseTest();
    const list = await app.request("/api/transactions");
    const save = await app.request("/api/transactions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ drafts: [draft()] })
    });

    expect(list.status).toBe(401);
    expect(save.status).toBe(401);
  });

  it("ignores tampered ownership fields and keeps User B isolated from User A rows", async () => {
    if (!databaseReady) return skipDatabaseTest();
    const authA = await login(userA.email, userA.password);
    const authB = await register(userB);

    const saveA = await app.request("/api/transactions", {
      method: "POST",
      headers: { ...bearer(authA.token), "content-type": "application/json" },
      body: JSON.stringify({
        userId: authB.user.id,
        organizationId: "attacker-org",
        drafts: [
          {
            ...draft({ description: "STARBUCKS COFFEE MUMBAI" }),
            userId: authB.user.id,
            organizationId: "attacker-org"
          }
        ]
      })
    });
    expect(saveA.status).toBe(201);
    const created = await saveA.json() as { transactions: Array<{ id: string; description: string }> };
    const transactionId = created.transactions[0]?.id;
    expect(transactionId).toEqual(expect.any(String));

    const listB = await app.request("/api/transactions", {
      headers: bearer(authB.token)
    });
    await expect(listB.json()).resolves.toMatchObject({ items: [] });

    const deleteB = await app.request(`/api/transactions/${transactionId}`, {
      method: "DELETE",
      headers: bearer(authB.token)
    });
    expect(deleteB.status).toBe(404);

    const exportB = await app.request("/api/transactions/export", {
      headers: bearer(authB.token)
    });
    expect(exportB.status).toBe(200);
    expect(await exportB.text()).not.toContain("STARBUCKS COFFEE MUMBAI");

    const analyticsB = await app.request("/api/analytics/summary", {
      headers: bearer(authB.token)
    });
    expect(analyticsB.status).toBe(200);
    await expect(analyticsB.json()).resolves.toMatchObject({ transactionCount: 0 });

    const subscriptionsB = await app.request("/api/analytics/subscriptions", {
      headers: bearer(authB.token)
    });
    expect(subscriptionsB.status).toBe(200);
    await expect(subscriptionsB.json()).resolves.toMatchObject({ subscriptions: [] });

    const insightsB = await app.request("/api/insights/generate", {
      method: "POST",
      headers: { ...bearer(authB.token), "content-type": "application/json" },
      body: JSON.stringify({ userId: authA.user.id, organizationId: "attacker-org" })
    });
    expect(insightsB.status).toBe(200);
    await expect(insightsB.json()).resolves.toMatchObject({ insights: [], status: "empty" });
  });

  it("drops duplicateOfId when it points at another user's transaction", async () => {
    if (!databaseReady) return skipDatabaseTest();
    const authA = await login(userA.email, userA.password);
    const authB = await login(userB.email, userB.password);

    const saveA = await saveDraft(authA.token, draft({ description: "AMAZON ORDER" }));
    const transactionAId = saveA.transactions[0]?.id;
    expect(transactionAId).toEqual(expect.any(String));
    if (!transactionAId) throw new Error("Expected User A transaction id");

    const saveB = await saveDraft(authB.token, draft({ description: "USER B COFFEE", duplicateOfId: transactionAId }));
    expect(saveB.transactions[0]?.duplicateOfId).toBeNull();
  });
});

async function register(user: typeof userA): Promise<AuthResult> {
  const response = await app.request("/api/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(user)
  });
  expect(response.status).toBe(200);
  return expectAuthResult(response);
}

async function login(email: string, password: string): Promise<AuthResult> {
  const response = await app.request("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  expect(response.status).toBe(200);
  return expectAuthResult(response);
}

async function expectAuthResult(response: Response): Promise<AuthResult> {
  const payload = await response.json() as AuthResult;
  expect(payload.user).toMatchObject({ email: expect.stringContaining("@") });
  expect(payload.token).toEqual(expect.any(String));
  return payload;
}

async function saveDraft(token: string, input: ReturnType<typeof draft>) {
  const response = await app.request("/api/transactions", {
    method: "POST",
    headers: { ...bearer(token), "content-type": "application/json" },
    body: JSON.stringify({ drafts: [input] })
  });
  expect(response.status).toBe(201);
  return response.json() as Promise<{ transactions: Array<{ id: string; duplicateOfId: string | null }> }>;
}

function bearer(token: string): Record<string, string> {
  return { authorization: `Bearer ${token}` };
}

function draft(overrides: Partial<{
  description: string;
  duplicateOfId: string | null;
}> = {}) {
  return {
    date: "2025-12-11",
    description: overrides.description ?? "ROUTE TEST COFFEE",
    type: "DEBIT",
    amount: -420,
    currencyCode: "INR",
    balanceAfter: 18420.5,
    category: "Dining",
    confidence: 1,
    status: "SAVED",
    accountLabel: "Personal",
    sourceText: "route test source",
    ...(overrides.duplicateOfId !== undefined ? { duplicateOfId: overrides.duplicateOfId } : {})
  };
}

async function cleanupUsers(emails: string[]) {
  const users = await prisma.user.findMany({
    where: { email: { in: emails } },
    include: { members: true }
  });
  const organizationIds = users.flatMap((user) => user.members.map((member) => member.organizationId));
  for (const organizationId of organizationIds) {
    await withTenant({ userId: "test-cleanup", organizationId, teamId: null }, async (tx) => {
      await tx.transaction.deleteMany({ where: { organizationId } });
      await tx.categoryRule.deleteMany({ where: { organizationId } });
    });
  }
  await prisma.user.deleteMany({ where: { email: { in: emails } } });
  if (organizationIds.length > 0) {
    await prisma.organization.deleteMany({ where: { id: { in: organizationIds } } });
  }
}

async function canReachDatabase(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

function skipDatabaseTest() {
  throw new Error("Postgres became unavailable during an integration test.");
}
