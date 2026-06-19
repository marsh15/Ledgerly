import type { Prisma, Transaction } from "@prisma/client";
import type { TenantScope } from "./isolation";
import { buildTransactionWhere, type TransactionFilters } from "./transaction-query";

type TenantDb = Prisma.TransactionClient;

export type SubscriptionCandidate = {
  merchant: string;
  amount: number;
  currencyCode: string;
  cadence: "monthly" | "quarterly" | "weekly";
  lastChargeDate: string;
  confidence: number;
  transactionCount: number;
};

export async function detectSubscriptions(tx: TenantDb, scope: TenantScope, filters: TransactionFilters = {}): Promise<SubscriptionCandidate[]> {
  const rows = await tx.transaction.findMany({
    where: { ...buildTransactionWhere(scope, filters), type: "DEBIT" },
    orderBy: { date: "asc" },
    take: 2000
  });

  return detectSubscriptionCandidates(rows);
}

export function detectSubscriptionCandidates(rows: Transaction[]): SubscriptionCandidate[] {
  const groups = new Map<string, Transaction[]>();
  for (const row of rows) {
    const merchant = normalizeMerchant(row.description);
    if (!merchant || Number(row.amount) >= 0) continue;
    const currencyCode = cleanCurrencyCode(row.currencyCode);
    const amountBand = Math.round(Math.abs(Number(row.amount)) / 25) * 25;
    const key = `${merchant}:${currencyCode}:${amountBand}`;
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }

  const candidates: SubscriptionCandidate[] = [];
  for (const group of groups.values()) {
    if (group.length < 3) continue;
    const sorted = [...group].sort((a, b) => a.date.getTime() - b.date.getTime());
    const gaps = sorted.slice(1).map((row, index) => daysBetween(sorted[index]!.date, row.date));
    const cadence = inferCadence(gaps);
    if (!cadence) continue;

    const amounts = sorted.map((row) => Math.abs(Number(row.amount)));
    const averageAmount = amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length;
    const maxVariance = Math.max(...amounts.map((amount) => Math.abs(amount - averageAmount)));
    const varianceScore = Math.max(0, 1 - maxVariance / Math.max(averageAmount, 1));
    const cadenceScore = gaps.filter((gap) => cadenceMatches(cadence, gap)).length / gaps.length;
    const confidence = Math.round(Math.min(0.98, 0.45 + cadenceScore * 0.35 + varianceScore * 0.2) * 100) / 100;
    const last = sorted.at(-1)!;

    candidates.push({
      merchant: normalizeMerchant(last.description),
      amount: Math.round(averageAmount * 100) / 100,
      currencyCode: cleanCurrencyCode(last.currencyCode),
      cadence,
      lastChargeDate: last.date.toISOString().slice(0, 10),
      confidence,
      transactionCount: sorted.length
    });
  }

  return candidates.sort((a, b) => b.confidence - a.confidence || b.amount - a.amount).slice(0, 12);
}

function cleanCurrencyCode(value?: string | null): string {
  return value && /^[A-Z]{3}$/.test(value) ? value : "INR";
}

function normalizeMerchant(description: string): string {
  return description
    .replace(/\b(auto|pay|payment|upi|pos|txn|debit|card|subscription|monthly)\b/gi, " ")
    .replace(/[#*:|/\\()[\]{}._-]+/g, " ")
    .trim()
    .split(/\s+/)
    .slice(0, 3)
    .join(" ")
    .toUpperCase();
}

function inferCadence(gaps: number[]): SubscriptionCandidate["cadence"] | null {
  const cadenceScores = [
    ["weekly", gaps.filter((gap) => cadenceMatches("weekly", gap)).length],
    ["monthly", gaps.filter((gap) => cadenceMatches("monthly", gap)).length],
    ["quarterly", gaps.filter((gap) => cadenceMatches("quarterly", gap)).length]
  ] as const;
  const [cadence, score] = [...cadenceScores].sort((a, b) => b[1] - a[1])[0]!;
  return score >= Math.max(2, Math.ceil(gaps.length * 0.6)) ? cadence : null;
}

function cadenceMatches(cadence: SubscriptionCandidate["cadence"], gap: number): boolean {
  if (cadence === "weekly") return gap >= 6 && gap <= 8;
  if (cadence === "monthly") return gap >= 26 && gap <= 35;
  return gap >= 82 && gap <= 98;
}

function daysBetween(left: Date, right: Date): number {
  return Math.round((right.getTime() - left.getTime()) / 86_400_000);
}
