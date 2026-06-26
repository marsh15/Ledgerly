import type { Prisma, Transaction } from "@prisma/client";
import type { AnalyticsResponse, CurrencySummary } from "@ledgerly/shared";
import type { TenantScope } from "./isolation";
import { buildTransactionWhere, type TransactionFilters } from "./transaction-query";

type TenantDb = Prisma.TransactionClient;
export type AnalyticsSummary = AnalyticsResponse;

export async function getAnalyticsSummary(tx: TenantDb, scope: TenantScope, filters: TransactionFilters = {}): Promise<AnalyticsSummary> {
  const rows = await tx.transaction.findMany({
    where: buildTransactionWhere(scope, filters),
    orderBy: { date: "asc" },
    take: 5000
  });
  return summarizeTransactions(rows);
}

export function summarizeTransactions(rows: Transaction[]): AnalyticsSummary {
  const currencies = new Map<string, {
    totals: CurrencySummary["totals"];
    monthly: Map<string, CurrencySummary["monthlySeries"][number]>;
    categories: Map<string, CurrencySummary["categoryTotals"][number]>;
  }>();
  let duplicateCount = 0;
  let reviewCount = 0;

  for (const row of rows) {
    const currencyCode = /^[A-Z]{3}$/.test(row.currencyCode) ? row.currencyCode : "INR";
    const bucket = currencies.get(currencyCode) ?? {
      totals: { spend: 0, income: 0, net: 0, debitCount: 0, creditCount: 0 },
      monthly: new Map(),
      categories: new Map()
    };
    const amount = Number(row.amount);
    const spend = row.type === "DEBIT" ? Math.abs(amount) : 0;
    const income = row.type === "CREDIT" ? Math.abs(amount) : 0;
    bucket.totals.spend += spend;
    bucket.totals.income += income;
    bucket.totals.net += income - spend;
    if (row.type === "DEBIT") bucket.totals.debitCount += 1;
    else bucket.totals.creditCount += 1;

    const month = row.date.toISOString().slice(0, 7);
    const monthly = bucket.monthly.get(month) ?? { month, spend: 0, income: 0, net: 0, count: 0 };
    monthly.spend += spend;
    monthly.income += income;
    monthly.net += income - spend;
    monthly.count += 1;
    bucket.monthly.set(month, monthly);

    const category = row.category || "Uncategorized";
    const categoryTotal = bucket.categories.get(category) ?? { category, spend: 0, income: 0, count: 0 };
    categoryTotal.spend += spend;
    categoryTotal.income += income;
    categoryTotal.count += 1;
    bucket.categories.set(category, categoryTotal);
    currencies.set(currencyCode, bucket);
    if (row.duplicateOfId) duplicateCount += 1;
    if (row.status === "NEEDS_REVIEW") reviewCount += 1;
  }

  const currencySummaries = [...currencies.entries()].map(([currencyCode, bucket]) => ({
    currencyCode,
    totals: roundMoneyObject(bucket.totals),
    monthlySeries: [...bucket.monthly.values()].map(roundMoneyObject),
    categoryTotals: [...bucket.categories.values()].sort((a, b) => b.spend - a.spend).slice(0, 12).map(roundMoneyObject)
  })).sort((a, b) => (b.totals.debitCount + b.totals.creditCount) - (a.totals.debitCount + a.totals.creditCount));

  return { currencySummaries, duplicateCount, reviewCount, transactionCount: rows.length };
}

function roundMoneyObject<T extends Record<string, unknown>>(value: T): T {
  const rounded: Record<string, unknown> = { ...value };
  for (const key of ["spend", "income", "net"] as const) {
    if (typeof rounded[key] === "number") rounded[key] = Math.round((rounded[key] as number) * 100) / 100;
  }
  return rounded as T;
}
