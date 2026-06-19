import type { Prisma, Transaction } from "@prisma/client";
import type { TenantScope } from "./isolation";
import { buildTransactionWhere, type TransactionFilters } from "./transaction-query";

type TenantDb = Prisma.TransactionClient;

export type AnalyticsSummary = {
  totals: {
    spend: number;
    income: number;
    net: number;
    debitCount: number;
    creditCount: number;
  };
  monthlySeries: Array<{ month: string; spend: number; income: number; net: number; count: number }>;
  categoryTotals: Array<{ category: string; spend: number; income: number; count: number }>;
  merchantTotals: Array<{ merchant: string; spend: number; income: number; count: number }>;
  duplicateCount: number;
  reviewCount: number;
  transactionCount: number;
};

export async function getAnalyticsSummary(tx: TenantDb, scope: TenantScope, filters: TransactionFilters = {}): Promise<AnalyticsSummary> {
  const rows = await tx.transaction.findMany({
    where: buildTransactionWhere(scope, filters),
    orderBy: { date: "asc" },
    take: 5000
  });

  return summarizeTransactions(rows);
}

export function summarizeTransactions(rows: Transaction[]): AnalyticsSummary {
  const totals = { spend: 0, income: 0, net: 0, debitCount: 0, creditCount: 0 };
  const monthly = new Map<string, { month: string; spend: number; income: number; net: number; count: number }>();
  const categories = new Map<string, { category: string; spend: number; income: number; count: number }>();
  const merchants = new Map<string, { merchant: string; spend: number; income: number; count: number }>();
  let duplicateCount = 0;
  let reviewCount = 0;

  for (const row of rows) {
    const amount = Number(row.amount);
    const magnitude = Math.abs(amount);
    const isDebit = row.type === "DEBIT" || amount < 0;
    const spend = isDebit ? magnitude : 0;
    const income = isDebit ? 0 : magnitude;
    const month = row.date.toISOString().slice(0, 7);
    const category = row.category || "Uncategorized";
    const merchant = merchantFromDescription(row.description);

    totals.spend += spend;
    totals.income += income;
    totals.net += income - spend;
    if (isDebit) totals.debitCount += 1;
    else totals.creditCount += 1;
    if (row.duplicateOfId) duplicateCount += 1;
    if (row.status === "NEEDS_REVIEW") reviewCount += 1;

    const monthlyBucket = monthly.get(month) ?? { month, spend: 0, income: 0, net: 0, count: 0 };
    monthlyBucket.spend += spend;
    monthlyBucket.income += income;
    monthlyBucket.net += income - spend;
    monthlyBucket.count += 1;
    monthly.set(month, monthlyBucket);

    const categoryBucket = categories.get(category) ?? { category, spend: 0, income: 0, count: 0 };
    categoryBucket.spend += spend;
    categoryBucket.income += income;
    categoryBucket.count += 1;
    categories.set(category, categoryBucket);

    const merchantBucket = merchants.get(merchant) ?? { merchant, spend: 0, income: 0, count: 0 };
    merchantBucket.spend += spend;
    merchantBucket.income += income;
    merchantBucket.count += 1;
    merchants.set(merchant, merchantBucket);
  }

  return {
    totals: roundMoneyObject(totals),
    monthlySeries: [...monthly.values()].map(roundMoneyObject),
    categoryTotals: [...categories.values()].sort((a, b) => b.spend - a.spend).slice(0, 12).map(roundMoneyObject),
    merchantTotals: [...merchants.values()].sort((a, b) => b.spend - a.spend || b.count - a.count).slice(0, 12).map(roundMoneyObject),
    duplicateCount,
    reviewCount,
    transactionCount: rows.length
  };
}

function merchantFromDescription(description: string): string {
  return description
    .replace(/\b(upi|pos|txn|transaction|debit|credit|card|ref|no)\b/gi, " ")
    .replace(/[#*:|/\\()[\]{}._-]+/g, " ")
    .trim()
    .split(/\s+/)
    .slice(0, 3)
    .join(" ")
    .toUpperCase() || "UNKNOWN";
}

function roundMoneyObject<T extends Record<string, unknown>>(value: T): T {
  const rounded: Record<string, unknown> = { ...value };
  for (const key of ["spend", "income", "net"] as const) {
    if (typeof rounded[key] === "number") rounded[key] = Math.round((rounded[key] as number) * 100) / 100;
  }
  return rounded as T;
}
