import type { Transaction } from "@prisma/client";
import { summarizeTransactions } from "../analytics";
import { detectSubscriptionCandidates } from "../subscriptions";

describe("analytics and subscription helpers", () => {
  it("summarizes totals, categories, merchants, duplicates, and review counts", () => {
    const summary = summarizeTransactions([
      row({ description: "NETFLIX INDIA", amount: -649, category: "Entertainment" }),
      row({ description: "ACME SALARY", amount: 100000, type: "CREDIT", category: "Salary" }),
      row({ description: "NETFLIX INDIA", amount: -649, category: "Entertainment", duplicateOfId: "dup", status: "NEEDS_REVIEW" })
    ]);

    expect(summary.transactionCount).toBe(3);
    expect(summary.primaryCurrencyCode).toBe("INR");
    expect(summary.currencyBreakdown[0]).toMatchObject({ currencyCode: "INR", spend: 1298, income: 100000, net: 98702, count: 3 });
    expect(summary.totals).toMatchObject({ spend: 1298, income: 100000, net: 98702, debitCount: 2, creditCount: 1 });
    expect(summary.categoryTotals[0]).toMatchObject({ category: "Entertainment", spend: 1298, count: 2 });
    expect(summary.merchantTotals[0]).toMatchObject({ merchant: "NETFLIX INDIA", spend: 1298, count: 2 });
    expect(summary.duplicateCount).toBe(1);
    expect(summary.reviewCount).toBe(1);
  });

  it("detects recurring monthly debits and ignores one-off rows", () => {
    const subscriptions = detectSubscriptionCandidates([
      row({ date: "2026-01-05", description: "NETFLIX INDIA SUBSCRIPTION", amount: -649 }),
      row({ date: "2026-02-05", description: "NETFLIX INDIA SUBSCRIPTION", amount: -649 }),
      row({ date: "2026-03-06", description: "NETFLIX INDIA SUBSCRIPTION", amount: -649 }),
      row({ date: "2026-03-10", description: "ONE OFF STORE", amount: -5000 })
    ]);

    expect(subscriptions).toHaveLength(1);
    expect(subscriptions[0]).toMatchObject({
      merchant: "NETFLIX INDIA",
      amount: 649,
      currencyCode: "INR",
      cadence: "monthly",
      lastChargeDate: "2026-03-06",
      transactionCount: 3
    });
  });
});

type TransactionOverride = {
  id?: string;
  date?: string;
  description: string;
  amount: number;
  type?: Transaction["type"];
  category?: string | null;
  confidence?: number;
  status?: Transaction["status"];
  duplicateOfId?: string | null;
  currencyCode?: string;
};

function row(overrides: TransactionOverride): Transaction {
  const amount = overrides.amount as unknown as Transaction["amount"];
  return {
    id: overrides.id ?? Math.random().toString(36).slice(2),
    userId: "user-a",
    organizationId: "org-a",
    teamId: null,
    date: new Date(`${overrides.date ?? "2026-01-01"}T00:00:00.000Z`),
    description: overrides.description,
    type: overrides.type ?? (overrides.amount < 0 ? "DEBIT" : "CREDIT"),
    amount,
    currencyCode: overrides.currencyCode ?? "INR",
    balanceAfter: null,
    category: overrides.category ?? null,
    confidence: overrides.confidence ?? 1,
    status: overrides.status ?? "SAVED",
    accountLabel: "Personal",
    duplicateOfId: overrides.duplicateOfId ?? null,
    rawText: "test aggregate row",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z")
  };
}
