import type { TransactionInput } from "./contracts";
import { isValidIsoDate } from "./contracts";

export type CsvDateFormat = "YYYY-MM-DD" | "DD/MM/YYYY" | "MM/DD/YYYY";
export type CsvColumn = "date" | "description" | "amount" | "type" | "currencyCode" | "category" | "accountLabel";
export type CsvMapping = Partial<Record<CsvColumn, string>>;

const headerAliases: Record<CsvColumn, string[]> = {
  date: ["date", "transaction date", "posted date"],
  description: ["description", "narration", "merchant", "details", "memo"],
  amount: ["amount", "transaction amount", "value"],
  type: ["type", "transaction type", "debit credit", "dr cr"],
  currencyCode: ["currency", "currency code", "ccy"],
  category: ["category", "classification"],
  accountLabel: ["account", "account name", "account label"]
};

export function parseCsv(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const matrix: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const normalized = text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");

  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index];
    if (char === '"') {
      if (quoted && normalized[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell.trim());
      cell = "";
    } else if (char === "\n" && !quoted) {
      row.push(cell.trim());
      if (row.some(Boolean)) matrix.push(row);
      row = [];
      cell = "";
    } else cell += char;
  }
  row.push(cell.trim());
  if (row.some(Boolean)) matrix.push(row);
  const headers = matrix[0] ?? [];
  const rows = matrix.slice(1).map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])));
  return { headers, rows };
}

export function autoMapCsvHeaders(headers: string[]): CsvMapping {
  const mapping: CsvMapping = {};
  for (const [field, aliases] of Object.entries(headerAliases) as Array<[CsvColumn, string[]]>) {
    const match = headers.find((header) => aliases.includes(header.trim().toLowerCase()));
    if (match) mapping[field] = match;
  }
  return mapping;
}

export function isAmbiguousCsvDate(value: string): boolean {
  const match = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(value.trim());
  return Boolean(match && Number(match[1]) <= 12 && Number(match[2]) <= 12);
}

export function normalizeCsvRows(rows: Record<string, string>[], mapping: CsvMapping, dateFormat: CsvDateFormat): Array<{ record?: TransactionInput; errors: string[] }> {
  return rows.map((row) => {
    const errors: string[] = [];
    const date = normalizeDate(read(row, mapping.date), dateFormat);
    if (!date || !isValidIsoDate(date)) errors.push("Invalid date");
    const description = read(row, mapping.description).trim();
    if (!description) errors.push("Missing description");
    const rawAmount = Number(read(row, mapping.amount).replace(/[^0-9+.-]/g, ""));
    if (!Number.isFinite(rawAmount) || rawAmount === 0) errors.push("Invalid amount");
    const rawType = read(row, mapping.type).toUpperCase();
    const type = /CREDIT|CR|INCOME/.test(rawType) ? "CREDIT" : /DEBIT|DR|EXPENSE/.test(rawType) ? "DEBIT" : rawAmount < 0 ? "DEBIT" : "CREDIT";
    const amount = type === "DEBIT" ? -Math.abs(rawAmount) : Math.abs(rawAmount);
    const currencyCode = (read(row, mapping.currencyCode) || "INR").trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(currencyCode)) errors.push("Invalid currency");
    if (errors.length) return { errors };
    return {
      errors,
      record: {
        date,
        description,
        type,
        amount,
        currencyCode,
        balanceAfter: null,
        category: read(row, mapping.category).trim() || null,
        confidence: 1,
        status: "SAVED",
        accountLabel: read(row, mapping.accountLabel).trim() || "Personal",
        source: "CSV"
      }
    };
  });
}

function read(row: Record<string, string>, header?: string): string {
  return header ? row[header] ?? "" : "";
}

function normalizeDate(value: string, format: CsvDateFormat): string {
  const trimmed = value.trim();
  if (format === "YYYY-MM-DD") return trimmed;
  const match = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(trimmed);
  if (!match) return trimmed;
  const first = Number(match[1]);
  const second = Number(match[2]);
  const year = match[3];
  const day = format === "DD/MM/YYYY" ? first : second;
  const month = format === "DD/MM/YYYY" ? second : first;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
