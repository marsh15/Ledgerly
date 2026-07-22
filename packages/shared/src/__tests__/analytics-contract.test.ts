import { normalizeAnalyticsResponse, type AnalyticsResponsePayload } from "../index";

describe("analytics response compatibility", () => {
  it("defaults merchant totals omitted by older backend deployments", () => {
    const legacyResponse = {
      currencySummaries: [{
        currencyCode: "INR",
        totals: { spend: 420, income: 0, net: -420, debitCount: 1, creditCount: 0 },
        monthlySeries: [{ month: "2026-07", spend: 420, income: 0, net: -420, count: 1 }],
        categoryTotals: [{ category: "Dining", spend: 420, income: 0, count: 1 }]
      }],
      duplicateCount: 0,
      reviewCount: 0,
      transactionCount: 1
    } satisfies AnalyticsResponsePayload;

    expect(normalizeAnalyticsResponse(legacyResponse).currencySummaries[0]?.merchantTotals).toEqual([]);
  });
});
