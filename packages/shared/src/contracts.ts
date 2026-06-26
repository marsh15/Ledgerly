import { z } from "zod";

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

export function isValidIsoDate(value: string): boolean {
  if (!isoDatePattern.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export const currencyCodeSchema = z.string().trim().transform((value) => value.toUpperCase()).pipe(z.string().regex(/^[A-Z]{3}$/, "Use a three-letter ISO currency code"));
export const transactionTypeSchema = z.enum(["DEBIT", "CREDIT"]);
export const transactionStatusSchema = z.enum(["SAVED", "NEEDS_REVIEW"]);
export const transactionSourceSchema = z.enum(["TEXT", "CSV", "MANUAL"]);

export const transactionInputBaseSchema = z.object({
  date: z.string().refine(isValidIsoDate, "Use a valid calendar date in YYYY-MM-DD format"),
  description: z.string().trim().min(1).max(160),
  type: transactionTypeSchema,
  amount: z.number().finite().refine((value) => value !== 0, "Amount cannot be zero"),
  currencyCode: currencyCodeSchema.default("INR"),
  balanceAfter: z.number().finite().nullable().default(null),
  category: z.string().trim().max(60).nullable().default(null),
  confidence: z.number().min(0).max(1).default(1),
  status: transactionStatusSchema.default("SAVED"),
  accountLabel: z.string().trim().min(1).max(60).default("Personal"),
  duplicateOfId: z.string().trim().min(1).nullable().optional(),
  sourceText: z.string().max(50_000).optional(),
  rawText: z.string().max(50_000).optional(),
  source: transactionSourceSchema.default("MANUAL")
});

export const transactionInputSchema = transactionInputBaseSchema.superRefine((value, context) => {
  if (value.type === "DEBIT" && value.amount > 0) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["amount"], message: "Debit amounts must be negative" });
  }
  if (value.type === "CREDIT" && value.amount < 0) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["amount"], message: "Credit amounts must be positive" });
  }
});

export const transactionUpdateSchema = transactionInputBaseSchema.omit({
  confidence: true,
  duplicateOfId: true,
  rawText: true,
  sourceText: true,
  source: true
}).partial().extend({
  expectedUpdatedAt: z.string().datetime()
});

export const transactionFilterSchema = z.object({
  search: z.string().trim().min(1).max(120).optional(),
  dateFrom: z.string().refine(isValidIsoDate).optional(),
  dateTo: z.string().refine(isValidIsoDate).optional(),
  type: transactionTypeSchema.optional(),
  category: z.string().trim().min(1).max(60).optional(),
  status: transactionStatusSchema.optional(),
  accountLabel: z.string().trim().min(1).max(60).optional(),
  currencyCode: currencyCodeSchema.optional(),
  minConfidence: z.number().min(0).max(1).optional()
});

export const importPreviewBodySchema = z.object({
  filename: z.string().trim().min(1).max(255),
  records: z.array(transactionInputBaseSchema.extend({ source: z.literal("CSV").default("CSV") }).superRefine((value, context) => {
    if (value.type === "DEBIT" && value.amount > 0) context.addIssue({ code: z.ZodIssueCode.custom, path: ["amount"], message: "Debit amounts must be negative" });
    if (value.type === "CREDIT" && value.amount < 0) context.addIssue({ code: z.ZodIssueCode.custom, path: ["amount"], message: "Credit amounts must be positive" });
  })).min(1).max(1000)
});

export const importCreateBodySchema = z.object({
  filename: z.string().trim().min(1).max(255),
  records: z.array(transactionInputBaseSchema.extend({
    source: z.literal("CSV").default("CSV"),
    include: z.boolean().default(true)
  }).superRefine((value, context) => {
    if (value.type === "DEBIT" && value.amount > 0) context.addIssue({ code: z.ZodIssueCode.custom, path: ["amount"], message: "Debit amounts must be negative" });
    if (value.type === "CREDIT" && value.amount < 0) context.addIssue({ code: z.ZodIssueCode.custom, path: ["amount"], message: "Credit amounts must be positive" });
  })).min(1).max(1000)
});

export type TransactionInput = z.input<typeof transactionInputSchema>;
export type TransactionUpdate = z.input<typeof transactionUpdateSchema>;
export type TransactionFilters = z.infer<typeof transactionFilterSchema>;
export type TransactionSource = z.infer<typeof transactionSourceSchema>;

export type PresentedTransaction = {
  id: string;
  date: string;
  description: string;
  type: "DEBIT" | "CREDIT";
  amount: number;
  currencyCode: string;
  balanceAfter: number | null;
  category: string | null;
  confidence: number;
  status: "SAVED" | "NEEDS_REVIEW";
  accountLabel: string;
  duplicateOfId: string | null;
  source: TransactionSource;
  importBatchId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CurrencySummary = {
  currencyCode: string;
  totals: { spend: number; income: number; net: number; debitCount: number; creditCount: number };
  monthlySeries: Array<{ month: string; spend: number; income: number; net: number; count: number }>;
  categoryTotals: Array<{ category: string; spend: number; income: number; count: number }>;
};

export type AnalyticsResponse = {
  currencySummaries: CurrencySummary[];
  duplicateCount: number;
  reviewCount: number;
  transactionCount: number;
};

export type ImportBatchResponse = {
  id: string;
  filename: string;
  totalRows: number;
  importedRows: number;
  skippedRows: number;
  createdAt: string;
};

export type StructuredError = { error: { code: string; message: string; issues?: unknown } };
