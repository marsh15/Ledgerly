import { autoMapCsvHeaders, isAmbiguousCsvDate, normalizeCsvRows, parseCsv, transactionInputSchema } from "../index";

describe("transaction contracts", () => {
  it("rejects impossible dates and amount/type conflicts", () => {
    expect(() => transactionInputSchema.parse({ date: "2026-02-30", description: "Store", type: "DEBIT", amount: -10, currencyCode: "INR" })).toThrow();
    expect(() => transactionInputSchema.parse({ date: "2026-02-20", description: "Store", type: "DEBIT", amount: 10, currencyCode: "INR" })).toThrow();
  });

  it("normalizes ISO currency codes", () => {
    expect(transactionInputSchema.parse({ date: "2026-02-20", description: "Salary", type: "CREDIT", amount: 10, currencyCode: "usd" }).currencyCode).toBe("USD");
  });
});

describe("CSV import helpers", () => {
  it("parses quoted values and automatically maps common headers", () => {
    const csv = parseCsv('Transaction Date,Narration,Amount,Currency\n2026-06-01,"Coffee, shop",-420,INR');
    const mapping = autoMapCsvHeaders(csv.headers);
    expect(mapping).toMatchObject({ date: "Transaction Date", description: "Narration", amount: "Amount", currencyCode: "Currency" });
    expect(csv.rows[0]?.Narration).toBe("Coffee, shop");
  });

  it("flags ambiguous numeric dates and normalizes an explicit format", () => {
    expect(isAmbiguousCsvDate("06/07/2026")).toBe(true);
    const result = normalizeCsvRows([{ Date: "06/07/2026", Description: "Coffee", Amount: "420", Type: "Debit" }], {
      date: "Date", description: "Description", amount: "Amount", type: "Type"
    }, "DD/MM/YYYY");
    expect(result[0]?.record).toMatchObject({ date: "2026-07-06", amount: -420, type: "DEBIT" });
  });
});
