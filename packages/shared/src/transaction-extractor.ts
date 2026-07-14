import { z } from "zod";
import { isValidIsoDate } from "./contracts";

const monthIndex: Record<string, number> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11
};

export const extractedTransactionSchema = z.object({
  date: z.string().nullable(),
  description: z.string().min(1).nullable(),
  amount: z.number().nullable(),
  currencyCode: z.string().min(3).max(3).nullable(),
  type: z.enum(["DEBIT", "CREDIT"]).nullable(),
  balanceAfter: z.number().nullable(),
  category: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  rawText: z.string().min(1),
  issues: z.array(z.object({
    field: z.enum(["date", "description", "amount", "type", "currencyCode"]),
    code: z.string(),
    message: z.string()
  }))
});

export type ExtractedTransaction = z.infer<typeof extractedTransactionSchema>;
export type ExtractionIssue = ExtractedTransaction["issues"][number];

export type CategoryRuleInput = {
  matchText: string;
  category: string;
};

export type ExtractTransactionOptions = {
  categoryRules?: CategoryRuleInput[];
  enableBuiltInCategories?: boolean;
};

export type TransactionReviewStatus = "SAVED" | "NEEDS_REVIEW";

export type TransactionDraft = ExtractedTransaction & {
  draftId: string;
  sourceText: string;
  status: TransactionReviewStatus;
  accountLabel: string;
};

type DateHit = {
  iso: string;
  raw: string;
  index: number;
};

export function extractTransaction(rawText: string, options: ExtractTransactionOptions = {}): ExtractedTransaction {
  const text = rawText.replace(/\s+/g, " ").trim();
  const dateHit = findDate(text);
  const amountHit = findAmount(text);
  const currencyCode = amountHit?.currencyCode ?? findCurrencyCode(text);
  const type = findTransactionType(text, amountHit?.value ?? null);
  const validAmount = amountHit && Number.isFinite(amountHit.value) && amountHit.value !== 0 ? amountHit.value : null;
  const amount = validAmount !== null && type ? normalizeAmount(validAmount, type) : validAmount;
  const balanceAfter = findBalance(text);
  const description = findDescription(text, dateHit?.raw, amountHit?.raw) || null;
  const explicitCategory = findCategory(text);
  const category = resolveCategory(description ?? "", explicitCategory, options);
  const issues: ExtractionIssue[] = [];
  if (!dateHit) issues.push({ field: "date", code: "MISSING_OR_INVALID_DATE", message: "Add a valid calendar date." });
  if (!description) issues.push({ field: "description", code: "MISSING_DESCRIPTION", message: "Add a transaction description." });
  if (!amountHit || !Number.isFinite(amountHit.value) || amountHit.value === 0) issues.push({ field: "amount", code: "MISSING_OR_INVALID_AMOUNT", message: "Add a non-zero transaction amount." });
  if (!type) issues.push({ field: "type", code: "MISSING_TYPE", message: "Choose debit or credit; the amount was ambiguous." });
  if (!currencyCode) issues.push({ field: "currencyCode", code: "MISSING_CURRENCY", message: "Add an explicit currency code or symbol." });

  const confidence =
    (dateHit ? 0.25 : 0) +
    (amountHit ? 0.25 : 0) +
    (description ? 0.2 : 0) +
    (type ? 0.15 : 0) +
    (balanceAfter !== null ? 0.1 : 0) +
    (category ? 0.05 : 0);

  return extractedTransactionSchema.parse({
    date: dateHit?.iso ?? null,
    description,
    amount,
    currencyCode,
    type,
    balanceAfter,
    category,
    confidence: Number(confidence.toFixed(2)),
    rawText,
    issues
  });
}

export function createTransactionDrafts(rawText: string, options: ExtractTransactionOptions & { accountLabel?: string } = {}): TransactionDraft[] {
  return splitTransactionInput(rawText).map((sourceText, index) => {
    const extracted = extractTransaction(sourceText, options);
    return {
      ...extracted,
      draftId: `draft-${index + 1}`,
      sourceText,
      status: reviewStatusForConfidence(extracted.confidence),
      accountLabel: cleanAccountLabel(options.accountLabel)
    };
  });
}

export function splitTransactionInput(rawText: string): string[] {
  const normalized = rawText.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  const blankSeparated = normalized
    .split(/\n\s*\n+/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 8);

  if (blankSeparated.length > 1) return blankSeparated;

  return [normalized];
}

export function reviewStatusForConfidence(confidence: number): TransactionReviewStatus {
  return confidence < 0.85 ? "NEEDS_REVIEW" : "SAVED";
}

export function normalizeForMatching(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function findDate(text: string): DateHit | null {
  const iso = /\b(20\d{2})-(0?[1-9]|1[0-2])-(0?[1-9]|[12]\d|3[01])\b/.exec(text);
  if (iso?.[0] && iso[1] && iso[2] && iso[3]) {
    const value = `${iso[1]}-${String(iso[2]).padStart(2, "0")}-${String(iso[3]).padStart(2, "0")}`;
    return isValidIsoDate(value) ? { raw: iso[0], iso: value, index: iso.index } : null;
  }

  const named = /\b(?:Date:\s*)?([0-3]?\d)\s+([A-Za-z]{3,9})\s+(20\d{2})\b/i.exec(text);
  if (named?.[0] && named[1] && named[2] && named[3]) {
    const month = monthIndex[named[2].toLowerCase()];
    if (month !== undefined) {
      const value = toIso(Number(named[3]), month, Number(named[1]));
      return value ? { raw: named[0], iso: value, index: named.index } : null;
    }
  }

  const numeric = /\b([0-3]?\d)[/-]([01]?\d)[/-](20\d{2})\b/.exec(text);
  if (numeric?.[0] && numeric[1] && numeric[2] && numeric[3]) {
    const first = Number(numeric[1]);
    const second = Number(numeric[2]);
    const dayFirst = first > 12;
    const day = dayFirst ? first : second;
    const month = dayFirst ? second - 1 : first - 1;
    const value = toIso(Number(numeric[3]), month, day);
    return value ? { raw: numeric[0], iso: value, index: numeric.index } : null;
  }

  return null;
}

function findTransactionType(text: string, amount: number | null): "DEBIT" | "CREDIT" | null {
  if (amount !== null && amount < 0) return "DEBIT";
  if (amount !== null && /(?:\+\s*(?:(?:₹|\$|Rs\.?|USD|INR)\s*)?[\d,]|(?:₹|\$|Rs\.?|USD|INR)\s*\+\s*[\d,])/i.test(text)) return "CREDIT";
  if (/\b(debit(?:ed)?|dr|withdrawn|spent|paid)\b/i.test(text)) return "DEBIT";
  if (/\b(credit(?:ed)?|cr|deposit(?:ed)?|received)\b/i.test(text)) return "CREDIT";
  return null;
}

function normalizeAmount(amount: number, type: "DEBIT" | "CREDIT"): number {
  if (type === "DEBIT") return amount > 0 ? -amount : amount;
  return Math.abs(amount);
}

function findAmount(text: string): { raw: string; value: number; index: number; currencyCode: string | null } | null {
  const labelled = /\bAmount:\s*((?:(?:₹|\$|Rs\.?|USD|INR)\s*)?[+-]?[\d,]+(?:\.\d{2})?)\b/i.exec(text);
  if (labelled?.[0] && labelled[1]) {
    return {
      raw: labelled[0],
      value: parseMoney(labelled[1]),
      currencyCode: findCurrencyCode(labelled[1]),
      index: labelled.index
    };
  }

  const moneyMatches = [...text.matchAll(/(?:₹|\$|Rs\.?\s*|USD\s*)\s*([+-]?[\d,]+(?:\.\d{2})?)/gi)];
  const debitWord = /\b(debit(?:ed)?|dr|withdrawn|spent|paid)\b/i.test(text);
  const creditWord = /\b(credit(?:ed)?|cr|deposit(?:ed)?|received)\b/i.test(text);

  for (const match of moneyMatches) {
    if (!match[0] || match.index === undefined) continue;
    const window = text.slice(Math.max(0, match.index - 16), match.index + match[0].length + 18);
    if (!/\b(balance|bal)\b/i.test(window)) {
      const value = parseMoney(match[0]);
      return {
        raw: match[0],
        value: debitWord && value > 0 && !creditWord ? -value : value,
        currencyCode: findCurrencyCode(match[0]),
        index: match.index
      };
    }
  }

  const dr = /\b([\d,]+(?:\.\d{2})?)\s*(Dr|debited)\b/i.exec(text);
  if (dr?.[0] && dr[1]) {
    return { raw: dr[0], value: -parseMoney(dr[1]), currencyCode: findCurrencyCode(text), index: dr.index };
  }

  return null;
}

function findBalance(text: string): number | null {
  const hit = /\b(?:Balance after transaction|Available Balance|Bal(?:ance)?)\s*(?:after transaction)?\s*(?::|→|->|-)?\s*(?:₹|\$|Rs\.?\s*|USD\s*)?([\d,]+(?:\.\d{2})?)/i.exec(text);
  return hit?.[1] ? parseMoney(hit[1]) : null;
}

function findDescription(text: string, dateRaw?: string, amountRaw?: string): string {
  const labelled = /\bDescription:\s*(.+?)(?:\s+Amount:|\s+Balance after transaction:|$)/i.exec(text);
  if (labelled?.[1]) return cleanDescription(labelled[1]);

  let working = text;
  if (dateRaw) working = working.replace(dateRaw, " ");
  if (amountRaw) working = working.replace(amountRaw, " ");
  working = working
    .replace(/\btxn\w+\b/i, " ")
    .replace(/\b(?:Available Balance|Balance after transaction|Bal(?:ance)?)\b.*$/i, " ")
    .replace(/[→]/g, " ")
    .replace(/\b(?:debited|credited|Dr|Cr)\b/gi, " ");

  return cleanDescription(working);
}

function cleanDescription(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .replace(/^[^\w#]+|[^\w.#+-]+$/g, "")
    .trim()
    .slice(0, 160);
}

function findCategory(text: string): string | null {
  const labelled = /\bCategory:\s*([A-Za-z][A-Za-z &/-]{1,40})\b/i.exec(text);
  if (labelled?.[1]) return labelled[1].trim();

  const afterBalance = /\b(?:Available Balance|Balance after transaction|Bal(?:ance)?)\s*(?:after transaction)?\s*(?::|→|->|-)?\s*(?:₹|\$|Rs\.?\s*|USD\s*)?[\d,]+(?:\.\d{2})?\s+([A-Za-z][A-Za-z &/-]{1,40})$/i.exec(text);
  return afterBalance?.[1]?.trim() ?? null;
}

function resolveCategory(description: string, explicitCategory: string | null, options: ExtractTransactionOptions): string | null {
  const ruleCategory = matchCategoryRule(description, options.categoryRules ?? []);
  if (ruleCategory) return ruleCategory;
  if (explicitCategory) return explicitCategory;
  if (options.enableBuiltInCategories) return builtInCategory(description);
  return null;
}

function matchCategoryRule(description: string, rules: CategoryRuleInput[]): string | null {
  const normalizedDescription = normalizeForMatching(description);
  const rule = rules.find((candidate) => {
    const normalizedMatch = normalizeForMatching(candidate.matchText);
    return normalizedMatch.length > 0 && normalizedDescription.includes(normalizedMatch);
  });

  return rule?.category.trim() || null;
}

function builtInCategory(description: string): string | null {
  const normalized = normalizeForMatching(description);
  const mappings: CategoryRuleInput[] = [
    { matchText: "starbucks coffee", category: "Dining" },
    { matchText: "zomato", category: "Dining" },
    { matchText: "swiggy instamart", category: "Groceries" },
    { matchText: "bigbasket", category: "Groceries" },
    { matchText: "uber", category: "Travel" },
    { matchText: "ola", category: "Travel" },
    { matchText: "amazon", category: "Shopping" },
    { matchText: "myntra", category: "Shopping" },
    { matchText: "netflix", category: "Entertainment" },
    { matchText: "bookmyshow", category: "Entertainment" },
    { matchText: "apollo pharmacy", category: "Health" },
    { matchText: "salary", category: "Income" },
    { matchText: "interest credit", category: "Income" },
    { matchText: "rent", category: "Rent" },
    { matchText: "credit card payment", category: "Bills" },
    { matchText: "recharge", category: "Utilities" }
  ];

  return mappings.find((mapping) => normalized.includes(normalizeForMatching(mapping.matchText)))?.category ?? null;
}

function cleanAccountLabel(value?: string): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed.slice(0, 60) : "Personal";
}

function parseMoney(value: string): number {
  const normalized = value.replace(/₹|\$|rs\.?|usd|inr/gi, "").replace(/[,\s]/g, "");
  return Number(normalized);
}

function findCurrencyCode(value: string): string | null {
  if (/(₹|\brs\.?\b|\binr\b)/i.test(value)) return "INR";
  if (/(\$|\busd\b)/i.test(value)) return "USD";
  return null;
}

function toIso(year: number, month: number, day: number): string | null {
  const value = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return isValidIsoDate(value) ? value : null;
}
