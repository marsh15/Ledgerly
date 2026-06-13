import { extractTransaction } from "../transaction-extractor";

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
});
