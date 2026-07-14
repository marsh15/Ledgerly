export function normalizeMerchant(description: string): string {
  return description
    .replace(/\b(auto|pay|payment|upi|pos|txn|debit|card|subscription|monthly)\b/gi, " ")
    .replace(/[#*:|/\\()[\]{}._-]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .join(" ")
    .toUpperCase();
}
