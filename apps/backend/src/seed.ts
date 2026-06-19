import { auth } from "./auth";
import { demoUsers } from "./demo-users";
import { env } from "./env";
import { prisma, withTenant } from "./db";
import { ensurePersonalTenant } from "./tenant";

for (const user of demoUsers) {
  const response = await auth.handler(
    new Request(new URL("/api/auth/sign-up/email", env.betterAuthUrl), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(user)
    })
  );

  const payload = await response.json().catch(() => null) as { user?: { id: string; email: string; name: string } } | null;
  if (payload?.user) {
    const scope = await ensurePersonalTenant(payload.user);
    await seedDemoTransactions(scope, user.email);
    console.log(`Seeded ${user.email}`);
  } else {
    const existing = await prisma.user.findUnique({
      where: { email: user.email },
      select: { id: true, email: true, name: true }
    });

    if (existing) {
      const scope = await ensurePersonalTenant(existing);
      await seedDemoTransactions(scope, user.email);
      console.log(`Repaired tenant for existing demo user ${user.email}`);
    } else {
      console.log(`Skipped ${user.email}; seed failed and no existing user was found.`);
    }
  }
}

await prisma.$disconnect();
process.exit(0);

async function seedDemoTransactions(scope: Awaited<ReturnType<typeof ensurePersonalTenant>>, email: string) {
  const existingCount = await withTenant(scope, (tx) => tx.transaction.count({
    where: { userId: scope.userId, organizationId: scope.organizationId }
  }));
  if (existingCount > 0) return;

  const rows = demoRowsFor(email);
  await withTenant(scope, async (tx) => {
    await tx.transaction.createMany({
      data: rows.map((row) => ({
        userId: scope.userId,
        organizationId: scope.organizationId,
        teamId: scope.teamId,
        date: new Date(`${row.date}T00:00:00.000Z`),
        description: row.description,
        type: row.amount < 0 ? "DEBIT" : "CREDIT",
        amount: row.amount,
        balanceAfter: row.balanceAfter,
        category: row.category,
        confidence: row.confidence,
        status: row.confidence < 0.85 ? "NEEDS_REVIEW" : "SAVED",
        accountLabel: row.accountLabel,
        duplicateOfId: null,
        rawText: `Demo aggregate-safe transaction for ${email}: ${row.description}`
      }))
    });
  });
}

function demoRowsFor(email: string) {
  const base = email === "asha@example.com" ? ashaRows : rohanRows;
  return base.flatMap((row) => repeatMonthly(row));
}

function repeatMonthly(row: DemoSeedRow): DemoSeedRow[] {
  return [0, 1, 2].map((offset) => {
    const date = new Date(`${row.date}T00:00:00.000Z`);
    date.setUTCMonth(date.getUTCMonth() + offset);
    return { ...row, date: date.toISOString().slice(0, 10), balanceAfter: row.balanceAfter + offset * row.balanceDelta };
  });
}

type DemoSeedRow = {
  date: string;
  description: string;
  amount: number;
  balanceAfter: number;
  balanceDelta: number;
  category: string;
  confidence: number;
  accountLabel: string;
};

const ashaRows: DemoSeedRow[] = [
  { date: "2026-01-03", description: "ACME TECHNOLOGIES SALARY", amount: 145000, balanceAfter: 245000, balanceDelta: 76000, category: "Salary", confidence: 0.99, accountLabel: "HDFC Salary" },
  { date: "2026-01-05", description: "NETFLIX INDIA SUBSCRIPTION", amount: -649, balanceAfter: 244351, balanceDelta: 76000, category: "Entertainment", confidence: 0.97, accountLabel: "HDFC Salary" },
  { date: "2026-01-08", description: "BIGBASKET GROCERY BANGALORE", amount: -3875, balanceAfter: 240476, balanceDelta: 76000, category: "Groceries", confidence: 0.94, accountLabel: "HDFC Salary" },
  { date: "2026-01-12", description: "CULT FIT MEMBERSHIP", amount: -1799, balanceAfter: 238677, balanceDelta: 76000, category: "Fitness", confidence: 0.93, accountLabel: "HDFC Salary" },
  { date: "2026-01-18", description: "INDIGO AIRLINES BLR DEL", amount: -7340, balanceAfter: 231337, balanceDelta: 76000, category: "Travel", confidence: 0.89, accountLabel: "HDFC Salary" }
];

const rohanRows: DemoSeedRow[] = [
  { date: "2026-01-01", description: "FREELANCE CLIENT PAYOUT", amount: 98000, balanceAfter: 156000, balanceDelta: 42000, category: "Income", confidence: 0.98, accountLabel: "ICICI Current" },
  { date: "2026-01-04", description: "ADOBE CREATIVE CLOUD", amount: -1999, balanceAfter: 154001, balanceDelta: 42000, category: "Software", confidence: 0.98, accountLabel: "ICICI Current" },
  { date: "2026-01-07", description: "WEWORK MEMBERSHIP", amount: -14200, balanceAfter: 139801, balanceDelta: 42000, category: "Workspace", confidence: 0.95, accountLabel: "ICICI Current" },
  { date: "2026-01-13", description: "UBER TRIP AIRPORT", amount: -1180, balanceAfter: 138621, balanceDelta: 42000, category: "Transport", confidence: 0.91, accountLabel: "ICICI Current" },
  { date: "2026-01-22", description: "APPLE SERVICES", amount: -899, balanceAfter: 137722, balanceDelta: 42000, category: "Software", confidence: 0.86, accountLabel: "ICICI Current" }
];
