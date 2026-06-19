import { createTransactionDrafts, extractTransaction, splitTransactionInput } from "../transaction-extractor";

describe("extractTransaction", () => {
  it("parses the labelled Starbucks sample", () => {
    const result = extractTransaction(`Date: 11 Dec 2025
Description: STARBUCKS COFFEE MUMBAI
Amount: -420.00
Balance after transaction: 18,420.50`);

    expect(result).toMatchObject({
      date: "2025-12-11",
      description: "STARBUCKS COFFEE MUMBAI",
      amount: -420,
      currencyCode: "INR",
      type: "DEBIT",
      balanceAfter: 18420.5,
      category: null,
      confidence: 0.95
    });
  });

  it("parses the Uber debited sample", () => {
    const result = extractTransaction(`Uber Ride * Airport Drop
12/11/2025 → ₹1,250.00 debited
Available Balance → ₹17,170.50`);

    expect(result.description).toContain("Uber Ride");
    expect(result.date).toBe("2025-12-11");
    expect(result.amount).toBe(-1250);
    expect(result.currencyCode).toBe("INR");
    expect(result.type).toBe("DEBIT");
    expect(result.balanceAfter).toBe(17170.5);
    expect(result.category).toBeNull();
    expect(result.confidence).toBe(0.95);
  });

  it("parses the messy Amazon Dr sample", () => {
    const result = extractTransaction("txn123 2025-12-10 Amazon.in Order #403-1234567-8901234 ₹2,999.00 Dr Bal 14171.50 Shopping");

    expect(result).toMatchObject({
      date: "2025-12-10",
      amount: -2999,
      currencyCode: "INR",
      type: "DEBIT",
      balanceAfter: 14171.5,
      category: "Shopping",
      confidence: 1
    });
    expect(result.description).toContain("Amazon.in Order");
  });

  it("returns lower confidence for incomplete text without a balance", () => {
    const result = extractTransaction("12 Dec 2025 Local Store -99.00");

    expect(result.balanceAfter).toBeNull();
    expect(result.confidence).toBeLessThan(0.9);
  });

  it("applies user category rules before built-in categorization", () => {
    const result = extractTransaction("Date: 11 Dec 2025 Description: STARBUCKS COFFEE MUMBAI Amount: -420.00 Balance after transaction: 18,420.50", {
      categoryRules: [{ matchText: "starbucks", category: "Client Meals" }],
      enableBuiltInCategories: true
    });

    expect(result.category).toBe("Client Meals");
    expect(result.confidence).toBe(1);
  });

  it("uses built-in categories when enabled", () => {
    const result = extractTransaction(
      `Uber Ride * Airport Drop
12/11/2025 -> ₹1,250.00 debited
Available Balance -> ₹17,170.50`,
      {
        enableBuiltInCategories: true
      }
    );

    expect(result.category).toBe("Travel");
    expect(result.confidence).toBe(1);
  });

  it("preserves dollar currency for dollar-denominated entries", () => {
    const result = extractTransaction(`Date: 18 Dec 2025
Description: AWS CLOUD SERVICES
Amount: $42.50
Balance after transaction: $1,250.00
Category: Cloud`);

    expect(result).toMatchObject({
      date: "2025-12-18",
      description: "AWS CLOUD SERVICES",
      amount: 42.5,
      currencyCode: "USD",
      type: "CREDIT",
      balanceAfter: 1250,
      category: "Cloud"
    });
  });

  it("creates editable drafts from blank-line-separated bulk input", () => {
    const raw = `Date: 14 Dec 2025
Description: BIGBASKET GROCERY BANGALORE
Amount: -1,842.75
Balance after transaction: 32,910.25

txn123 2025-12-10 Amazon.in Order #403-1234567-8901234 ₹2,999.00 Dr Bal 14171.50 Shopping`;

    expect(splitTransactionInput(raw)).toHaveLength(2);
    const drafts = createTransactionDrafts(raw, { enableBuiltInCategories: true, accountLabel: "Business" });

    expect(drafts).toHaveLength(2);
    expect(drafts[0]).toMatchObject({ accountLabel: "Business", status: "SAVED", category: "Groceries" });
    expect(drafts[1]).toMatchObject({ category: "Shopping" });
  });
});
