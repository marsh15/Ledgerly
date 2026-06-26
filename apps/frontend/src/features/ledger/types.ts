import type { AnalyticsResponse, ImportBatchResponse, PresentedTransaction, TransactionInput } from "@ledgerly/shared";

export type { AnalyticsResponse, ImportBatchResponse, PresentedTransaction, TransactionInput };
export type LedgerSection = "overview" | "transactions" | "import" | "rules";
export type TransactionPage = { items: PresentedTransaction[]; nextCursor: string | null };
export type CategoryRule = { id: string; matchText: string; category: string };
export type Filters = {
  search: string;
  dateFrom: string;
  dateTo: string;
  type: "" | "DEBIT" | "CREDIT";
  status: "" | "SAVED" | "NEEDS_REVIEW";
  currencyCode: string;
};

export const emptyFilters: Filters = { search: "", dateFrom: "", dateTo: "", type: "", status: "", currencyCode: "" };

export function queryString(filters: Filters): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value);
  return params.toString();
}
