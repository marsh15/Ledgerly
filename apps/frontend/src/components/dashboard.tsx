"use client";

import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Download,
  FileText,
  Filter,
  Layers3,
  Loader2,
  LockKeyhole,
  LogOut,
  PieChart,
  PencilLine,
  ReceiptText,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2
} from "lucide-react";
import { signOut } from "next-auth/react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart as RechartsPieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch, apiText } from "@/lib/api";

type TransactionStatus = "SAVED" | "NEEDS_REVIEW";
type TransactionType = "DEBIT" | "CREDIT";

type Transaction = {
  id: string;
  date: string;
  description: string;
  type: TransactionType;
  amount: number;
  currencyCode: string;
  balanceAfter: number | null;
  category: string | null;
  confidence: number;
  status: TransactionStatus;
  accountLabel: string;
  duplicateOfId: string | null;
  createdAt: string;
};

type TransactionDraft = Omit<Transaction, "id" | "createdAt" | "duplicateOfId"> & {
  draftId: string;
  sourceText: string;
  rawText: string;
  duplicate: { isDuplicate: boolean; existingId: string | null };
  duplicateOfId?: string | null;
};

type TransactionsPage = {
  items?: Transaction[];
  transactions?: Transaction[];
  nextCursor: string | null;
};

type CategoryRule = {
  id: string;
  matchText: string;
  category: string;
};

type AnalyticsSummary = {
  totals: { spend: number; income: number; net: number; debitCount: number; creditCount: number };
  primaryCurrencyCode: string;
  currencyBreakdown: Array<{ currencyCode: string; spend: number; income: number; net: number; count: number }>;
  monthlySeries: Array<{ month: string; spend: number; income: number; net: number; count: number }>;
  categoryTotals: Array<{ category: string; spend: number; income: number; count: number }>;
  merchantTotals: Array<{ merchant: string; spend: number; income: number; count: number }>;
  duplicateCount: number;
  reviewCount: number;
  transactionCount: number;
};

type SubscriptionCandidate = {
  merchant: string;
  amount: number;
  currencyCode: string;
  cadence: string;
  lastChargeDate: string;
  confidence: number;
  transactionCount: number;
};

type InsightCard = {
  title: string;
  summary: string;
  severity: "info" | "warning" | "positive";
  metric: string;
};

type Filters = {
  search: string;
  dateFrom: string;
  dateTo: string;
  type: "" | TransactionType;
  category: string;
  status: "" | TransactionStatus;
  accountLabel: string;
  minConfidence: string;
};

type Feedback = {
  tone: "success" | "error" | "idle";
  title: string;
  message: string;
};

const samples = [
  {
    label: "Statement",
    text: `Date: 11 Dec 2025
Description: STARBUCKS COFFEE MUMBAI
Amount: -420.00
Balance after transaction: 18,420.50`
  },
  {
    label: "SMS alert",
    text: `Uber Ride * Airport Drop
12/11/2025 -> ₹1,250.00 debited
Available Balance -> ₹17,170.50`
  },
  {
    label: "Export",
    text: "txn123 2025-12-10 Amazon.in Order #403-1234567-8901234 ₹2,999.00 Dr Bal 14171.50 Shopping"
  },
  {
    label: "Bulk",
    text: `Date: 14 Dec 2025
Description: BIGBASKET GROCERY BANGALORE
Amount: -1,842.75
Balance after transaction: 32,910.25
Category: Groceries

Swiggy Instamart Order
12/15/2025 -> ₹684.00 debited
Available Balance -> ₹32,226.25 Food

Date: 17 Dec 2025
Description: SALARY CREDIT ACME TECHNOLOGIES
Amount: +85,000.00
Balance after transaction: 116,577.25
Category: Salary`
  }
];

const emptyFilters: Filters = {
  search: "",
  dateFrom: "",
  dateTo: "",
  type: "",
  category: "",
  status: "",
  accountLabel: "",
  minConfidence: ""
};

const MAX_TRANSACTION_TEXT_LENGTH = 50_000;
const tableActionColumnClass = "sticky right-0 z-10 bg-background text-right shadow-[-12px_0_16px_-16px_rgba(15,23,42,0.45)] group-hover:bg-secondary/45";
const tableActionHeadClass = "sticky right-0 z-20 bg-muted/55 text-right shadow-[-12px_0_16px_-16px_rgba(15,23,42,0.45)]";
const chartColors = ["#047857", "#0f766e", "#2563eb", "#9333ea", "#c2410c"];

export function Dashboard({ token, userName }: { token: string; userName: string }) {
  const queryClient = useQueryClient();
  const [text, setText] = useState(samples[0]?.text ?? "");
  const [accountLabel, setAccountLabel] = useState("Personal");
  const [drafts, setDrafts] = useState<TransactionDraft[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [rules, setRules] = useState<CategoryRule[]>([]);
  const [ruleDraft, setRuleDraft] = useState({ matchText: "", category: "" });
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>({
    tone: "idle",
    title: "Ready to review",
    message: "Paste one snippet or a blank-line-separated batch to preview editable drafts."
  });
  const queryString = useMemo(() => buildQuery(filters), [filters]);
  const insightFilters = useMemo(() => compactFilters(filters), [filters]);
  const summaryQuery = useQuery({
    queryKey: ["analytics-summary", queryString],
    queryFn: () => apiFetch<AnalyticsSummary>(`/api/analytics/summary?${queryString}`, token)
  });
  const subscriptionsQuery = useQuery({
    queryKey: ["subscriptions", queryString],
    queryFn: () => apiFetch<{ subscriptions: SubscriptionCandidate[] }>(`/api/analytics/subscriptions?${queryString}`, token)
  });
  const rulesQuery = useQuery({
    queryKey: ["category-rules"],
    queryFn: () => apiFetch<{ rules: CategoryRule[] }>("/api/category-rules", token)
  });
  const insightsMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ insights: InsightCard[]; status: "ready" | "empty" | "not_enough_data" | "disabled" | "missing_api_key" }>("/api/insights/generate", token, {
        method: "POST",
        body: JSON.stringify({ filters: insightFilters })
      }),
    onError: (error) => showError("Insights failed", error, "Unable to generate spending insights")
  });

  const analytics = summaryQuery.data;
  const subscriptions = subscriptionsQuery.data?.subscriptions ?? [];
  const totalSpend = analytics?.totals.spend ?? 0;
  const averageConfidence = useMemo(() => {
    if (transactions.length === 0) return null;
    return Math.round((transactions.reduce((sum, transaction) => sum + transaction.confidence, 0) / transactions.length) * 100);
  }, [transactions]);
  const needsReviewCount = analytics?.reviewCount ?? 0;
  const duplicateDraftCount = useMemo(() => drafts.filter((draft) => draft.duplicate.isDuplicate).length, [drafts]);
  const savedDuplicateCount = useMemo(() => transactions.filter((transaction) => transaction.duplicateOfId).length, [transactions]);
  const hasActiveFilters = useMemo(() => Object.values(filters).some((value) => value.trim().length > 0), [filters]);

  async function load(cursor?: string, activeFilters: Filters = filters) {
    setLoading(true);
    try {
      const page = await apiFetch<TransactionsPage>(`/api/transactions?${buildQuery(activeFilters, cursor)}`, token);
      const items = page.items ?? page.transactions ?? [];
      setTransactions((current) => (cursor ? [...current, ...items] : items));
      setNextCursor(page.nextCursor);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["analytics-summary"] }),
        queryClient.invalidateQueries({ queryKey: ["subscriptions"] })
      ]);
    } catch (error) {
      showError("Ledger could not load", error, "Unable to load transactions");
    } finally {
      setLoading(false);
    }
  }

  async function loadRules() {
    try {
      const result = await apiFetch<{ rules: CategoryRule[] }>("/api/category-rules", token);
      setRules(result.rules);
    } catch (error) {
      showError("Rules could not load", error, "Unable to load category rules");
    }
  }

  async function previewTransactions() {
    const trimmedText = text.trim();
    if (trimmedText.length < 8) return;
    if (trimmedText.length > MAX_TRANSACTION_TEXT_LENGTH) {
      setFeedback({ tone: "error", title: "Text is too long", message: "Paste up to 50,000 characters at a time, or split the statement into smaller batches." });
      return;
    }

    setWorking(true);
    setFeedback({ tone: "idle", title: "Building editable drafts", message: "Ledgerly is parsing, categorizing, and checking for duplicates." });
    try {
      const result = await apiFetch<{ drafts: TransactionDraft[] }>("/api/transactions/preview", token, {
        method: "POST",
        body: JSON.stringify({ text: trimmedText, accountLabel: accountLabel.trim() })
      });
      setDrafts(result.drafts);
      const duplicates = result.drafts.filter((draft) => draft.duplicate.isDuplicate).length;
      const review = result.drafts.filter((draft) => draft.status === "NEEDS_REVIEW").length;
      setFeedback({
        tone: duplicates > 0 || review > 0 ? "idle" : "success",
        title: `${result.drafts.length} draft${result.drafts.length === 1 ? "" : "s"} ready`,
        message:
          duplicates > 0
            ? `${duplicates} possible duplicate${duplicates === 1 ? "" : "s"} found. Discard recorded rows before saving.`
            : `${review} need review. Check the fields, then save the reviewed rows.`
      });
    } catch (error) {
      showError("Preview failed", error, "Unable to preview transactions");
    } finally {
      setWorking(false);
    }
  }

  async function saveDrafts() {
    if (drafts.length === 0) return;
    const invalidDraft = drafts.find((draft) => !draft.date || !draft.description.trim() || !Number.isFinite(draft.amount));
    if (invalidDraft) {
      setFeedback({ tone: "error", title: "Draft needs review", message: "Every draft needs a date, description, and valid amount before saving." });
      return;
    }

    setWorking(true);
    try {
      const result = await apiFetch<{ transactions: Transaction[] }>("/api/transactions", token, {
        method: "POST",
        body: JSON.stringify({
          drafts: drafts.map((draft) => ({
            ...draft,
            description: draft.description.trim(),
            category: draft.category?.trim() || null,
            accountLabel: draft.accountLabel?.trim() || accountLabel.trim(),
            duplicateOfId: draft.duplicate.isDuplicate ? draft.duplicate.existingId : null
          }))
        })
      });
      setDrafts([]);
      setTransactions((current) => [...result.transactions, ...current]);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["analytics-summary"] }),
        queryClient.invalidateQueries({ queryKey: ["subscriptions"] })
      ]);
      setFeedback({ tone: "success", title: "Reviewed drafts saved", message: `${result.transactions.length} transaction rows were added to this workspace.` });
      toast.success("Transactions saved");
    } catch (error) {
      showError("Save failed", error, "Unable to save reviewed drafts");
    } finally {
      setWorking(false);
    }
  }

  function discardDuplicateDrafts() {
    setDrafts((current) => current.filter((draft) => !draft.duplicate.isDuplicate));
    setFeedback({ tone: "success", title: "Duplicate drafts discarded", message: "Only drafts that do not match existing rows remain in review." });
  }

  function applyFilters() {
    if (filters.dateFrom && filters.dateTo && filters.dateFrom > filters.dateTo) {
      setFeedback({ tone: "error", title: "Date range is invalid", message: "The From date must be earlier than or equal to the To date." });
      return;
    }
    if (filters.minConfidence.trim()) {
      const confidence = Number(filters.minConfidence);
      if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
        setFeedback({ tone: "error", title: "Confidence filter is invalid", message: "Use a value from 0 to 1, for example 0.75." });
        return;
      }
    }
    void load();
  }

  function resetFilters() {
    setFilters(emptyFilters);
    void load(undefined, emptyFilters);
  }

  async function createRule() {
    if (ruleDraft.matchText.trim().length < 2 || ruleDraft.category.trim().length < 2) return;
    setWorking(true);
    try {
      await apiFetch<{ rule: CategoryRule }>("/api/category-rules", token, {
        method: "POST",
        body: JSON.stringify(ruleDraft)
      });
      setRuleDraft({ matchText: "", category: "" });
      await queryClient.invalidateQueries({ queryKey: ["category-rules"] });
      await loadRules();
      toast.success("Category rule saved");
    } catch (error) {
      showError("Rule failed", error, "Unable to save category rule");
    } finally {
      setWorking(false);
    }
  }

  async function deleteRule(id: string) {
    setWorking(true);
    try {
      await apiFetch<{ ok: true }>(`/api/category-rules/${id}`, token, { method: "DELETE" });
      setRules((current) => current.filter((rule) => rule.id !== id));
      await queryClient.invalidateQueries({ queryKey: ["category-rules"] });
      toast.success("Category rule deleted");
    } catch (error) {
      showError("Delete failed", error, "Unable to delete category rule");
    } finally {
      setWorking(false);
    }
  }

  async function deleteTransaction(transaction: Transaction) {
    const confirmed = window.confirm(`Delete "${transaction.description}" from your ledger?`);
    if (!confirmed) return;

    setWorking(true);
    try {
      await apiFetch<{ ok: true }>(`/api/transactions/${transaction.id}`, token, { method: "DELETE" });
      setTransactions((current) => current.filter((item) => item.id !== transaction.id));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["analytics-summary"] }),
        queryClient.invalidateQueries({ queryKey: ["subscriptions"] })
      ]);
      toast.success("Transaction deleted");
    } catch (error) {
      showError("Delete failed", error, "Unable to delete transaction");
    } finally {
      setWorking(false);
    }
  }

  async function exportCsv() {
    setWorking(true);
    try {
      const csv = await apiText(`/api/transactions/export?${buildQuery(filters)}`, token);
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `ledgerly-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success("CSV export ready");
    } catch (error) {
      showError("Export failed", error, "Unable to export transactions");
    } finally {
      setWorking(false);
    }
  }

  function updateDraft(index: number, patch: Partial<TransactionDraft>) {
    setDrafts((current) => current.map((draft, draftIndex) => (draftIndex === index ? { ...draft, ...patch } : draft)));
  }

  function removeDraft(index: number) {
    setDrafts((current) => current.filter((_, draftIndex) => draftIndex !== index));
  }

  function showError(title: string, error: unknown, fallback: string) {
    const message = error instanceof Error ? error.message : fallback;
    setFeedback({ tone: "error", title, message });
    toast.error(message);
  }

  useEffect(() => {
    void load();
    void loadRules();
  }, []);

  useEffect(() => {
    if (rulesQuery.data?.rules) setRules(rulesQuery.data.rules);
  }, [rulesQuery.data?.rules]);

  const initials = getInitials(userName);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,hsl(var(--secondary))_0,transparent_34rem),linear-gradient(180deg,hsl(var(--background)),#fff_42rem)]">
      <header className="border-b bg-card/88 backdrop-blur">
        <div className="mx-auto flex max-w-368 items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm shadow-emerald-950/20">
              <ReceiptText className="size-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold leading-tight text-foreground">Ledgerly</h1>
              <p className="text-sm text-muted-foreground">Private transaction workspace</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-3 border-r pr-4 sm:flex">
              <div className="flex size-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">{initials}</div>
              <div className="text-sm">
                <p className="font-medium text-foreground">{userName}</p>
                <p className="text-xs text-muted-foreground">Signed in</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => signOut({ callbackUrl: "/login" })}>
              <LogOut data-icon="inline-start" className="size-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-368 gap-6 px-4 py-6 sm:px-6 xl:grid-cols-[minmax(23rem,0.78fr)_minmax(0,1.45fr)]">
        <div className="flex flex-col gap-6">
          <Card className="overflow-hidden border-slate-200/80">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileText className="size-5 text-primary" />
                    Extract transactions
                  </CardTitle>
                  <CardDescription className="mt-2 max-w-prose">
                    Preview editable drafts from a single snippet or blank-line-separated batch.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="hidden whitespace-nowrap text-primary sm:inline-flex">
                  Secure
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <div className="grid gap-2">
                <label htmlFor="account-label" className="text-sm font-semibold text-foreground">
                  Account / workspace label
                </label>
                <Input id="account-label" value={accountLabel} onChange={(event) => setAccountLabel(event.target.value)} placeholder="Personal" maxLength={60} />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <label htmlFor="transaction-text" className="text-sm font-semibold text-foreground">
                    Raw transaction text
                  </label>
                  <button type="button" onClick={() => setText("")} className="text-xs font-medium text-muted-foreground transition-colors hover:text-primary">
                    Clear
                  </button>
                </div>
                <Textarea
                  id="transaction-text"
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  aria-label="Statement text"
                  maxLength={MAX_TRANSACTION_TEXT_LENGTH}
                  className="min-h-56 resize-y font-mono text-[13px] tabular-nums"
                />
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-primary" />
                  {text.trim().length > 0 ? `${text.trim().length.toLocaleString("en-IN")} characters ready` : "Paste a snippet to enable preview"}
                  </div>
                  <span>{MAX_TRANSACTION_TEXT_LENGTH.toLocaleString("en-IN")} max</span>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold text-foreground">Try a sample</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {samples.map((sample) => (
                    <Button key={sample.label} type="button" variant="secondary" size="sm" onClick={() => setText(sample.text)} className="justify-start">
                      <ClipboardList data-icon="inline-start" className="size-4" />
                      {sample.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <Button onClick={previewTransactions} disabled={working || text.trim().length < 8} className="h-11">
                  {working ? <Loader2 data-icon="inline-start" className="size-4 animate-spin" /> : <PencilLine data-icon="inline-start" className="size-4" />}
                  Preview drafts
                </Button>
                <Button onClick={saveDrafts} disabled={working || drafts.length === 0} variant="outline" className="h-11">
                  <Save data-icon="inline-start" className="size-4" />
                  Save reviewed
                </Button>
              </div>

              <div className="flex items-center gap-2 rounded-md border border-primary/15 bg-secondary/70 px-3 py-2.5 text-xs text-muted-foreground">
                <LockKeyhole className="size-4 text-primary" />
                Ownership is derived from your verified session, never from pasted text.
              </div>

              <FeedbackPanel feedback={feedback} />
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-slate-200/80">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="size-5 text-primary" />
                Category rules
              </CardTitle>
              <CardDescription className="mt-2">Rules run before explicit or built-in categories.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid gap-2 sm:grid-cols-[1fr_0.85fr_auto]">
                <Input value={ruleDraft.matchText} onChange={(event) => setRuleDraft((current) => ({ ...current, matchText: event.target.value }))} placeholder="Description contains" maxLength={80} />
                <Input value={ruleDraft.category} onChange={(event) => setRuleDraft((current) => ({ ...current, category: event.target.value }))} placeholder="Category" maxLength={60} />
                <Button type="button" onClick={createRule} disabled={working || ruleDraft.matchText.trim().length < 2 || ruleDraft.category.trim().length < 2}>
                  Save
                </Button>
              </div>
              <div className="divide-y rounded-md border">
                {rules.length === 0 ? (
                  <p className="px-3 py-4 text-sm text-muted-foreground">No rules yet.</p>
                ) : (
                  rules.map((rule) => (
                    <div key={rule.id} className="flex items-center justify-between gap-3 px-3 py-2">
                      <div className="min-w-0 text-sm">
                        <p className="truncate font-medium text-foreground">{rule.matchText}</p>
                        <p className="text-xs text-muted-foreground">{rule.category}</p>
                      </div>
                      <Button type="button" variant="outline" size="sm" onClick={() => deleteRule(rule.id)} disabled={working} aria-label={`Delete rule for ${rule.matchText}`}>
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          {drafts.length > 0 ? (
            <Card className="overflow-hidden border-slate-200/80">
              <CardHeader className="border-b bg-card pb-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <PencilLine className="size-5 text-primary" />
                      Review drafts
                    </CardTitle>
                    <CardDescription className="mt-2">Edit parser output, keep duplicate warnings, then save the reviewed rows.</CardDescription>
                  </div>
                  {duplicateDraftCount > 0 ? (
                    <Button type="button" variant="outline" size="sm" onClick={discardDuplicateDrafts} disabled={working} className="shrink-0">
                      <Trash2 data-icon="inline-start" className="size-4" />
                      Discard duplicates
                    </Button>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 p-4">
                {drafts.map((draft, index) => (
                  <DraftEditor key={draft.draftId} draft={draft} index={index} onChange={updateDraft} onRemove={removeDraft} />
                ))}
              </CardContent>
            </Card>
          ) : null}

          <Card className="overflow-hidden border-slate-200/80">
            <CardHeader className="border-b bg-card pb-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <ReceiptText className="size-5 text-primary" />
                    Transactions
                  </CardTitle>
                  <CardDescription className="mt-2">
                    Searchable, filterable, exportable, and scoped to your private organization.
                    {savedDuplicateCount > 0 ? ` ${savedDuplicateCount} saved duplicate${savedDuplicateCount === 1 ? "" : "s"} marked.` : ""}
                  </CardDescription>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:flex">
                  <Stat label="Visible" value={transactions.length.toLocaleString("en-IN")} />
                  <Stat label="Spend" value={formatMoney(totalSpend, analytics?.primaryCurrencyCode, false)} />
                  <Stat label="Confidence" value={averageConfidence === null ? "--" : `${averageConfidence}%`} />
                  <Stat label="Review" value={needsReviewCount.toLocaleString("en-IN")} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 p-0">
              <div className="border-b bg-muted/20 p-4">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-[minmax(14rem,1.2fr)_repeat(4,minmax(10rem,1fr))]">
                  <Field label="Search">
                    <Input value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} placeholder="Merchant or description" />
                  </Field>
                  <Field label="From">
                    <Input className="min-w-0" type="date" value={filters.dateFrom} onChange={(event) => setFilters((current) => ({ ...current, dateFrom: event.target.value }))} />
                  </Field>
                  <Field label="To">
                    <Input className="min-w-0" type="date" value={filters.dateTo} onChange={(event) => setFilters((current) => ({ ...current, dateTo: event.target.value }))} />
                  </Field>
                  <Field label="Type">
                    <Select value={filters.type} onChange={(value) => setFilters((current) => ({ ...current, type: value as Filters["type"] }))}>
                      <option value="">All</option>
                      <option value="DEBIT">Debit</option>
                      <option value="CREDIT">Credit</option>
                    </Select>
                  </Field>
                  <Field label="Status">
                    <Select value={filters.status} onChange={(value) => setFilters((current) => ({ ...current, status: value as Filters["status"] }))}>
                      <option value="">All</option>
                      <option value="SAVED">Saved</option>
                      <option value="NEEDS_REVIEW">Needs review</option>
                    </Select>
                  </Field>
                </div>
                <div className="mt-3 grid gap-3 lg:grid-cols-3 2xl:grid-cols-[repeat(3,minmax(0,1fr))_auto]">
                  <Input value={filters.category} onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value }))} placeholder="Category" />
                  <Input value={filters.accountLabel} onChange={(event) => setFilters((current) => ({ ...current, accountLabel: event.target.value }))} placeholder="Account label" />
                  <Input
                    type="number"
                    min="0"
                    max="1"
                    step="0.05"
                    value={filters.minConfidence}
                    onChange={(event) => setFilters((current) => ({ ...current, minConfidence: event.target.value }))}
                    placeholder="Min confidence 0-1"
                  />
                  <div className="grid grid-cols-3 gap-2 lg:col-span-3 2xl:col-span-1 2xl:flex 2xl:justify-end">
                    <Button type="button" variant="secondary" onClick={applyFilters} disabled={loading} className="h-11 px-3">
                      <Filter data-icon="inline-start" className="size-4" />
                      Apply
                    </Button>
                    <Button type="button" variant="outline" onClick={resetFilters} disabled={loading && !hasActiveFilters} className="h-11 px-3">
                      <RefreshCw data-icon="inline-start" className="size-4" />
                      Reset
                    </Button>
                    <Button type="button" variant="outline" onClick={exportCsv} disabled={working} className="h-11 px-3">
                      <Download data-icon="inline-start" className="size-4" />
                      CSV
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 px-4 md:grid-cols-2">
                <InsightList
                  title="Category spend"
                  items={(analytics?.categoryTotals ?? []).slice(0, 5).map((item) => ({ label: item.category, value: formatMoney(Math.round(item.spend), analytics?.primaryCurrencyCode, false) }))}
                />
                <InsightList
                  title="Merchant trends"
                  items={(analytics?.merchantTotals ?? []).slice(0, 5).map((item) => ({ label: item.merchant, value: formatMoney(Math.round(item.spend), analytics?.primaryCurrencyCode, false) }))}
                />
              </div>

              <div className="grid gap-3 px-4 xl:grid-cols-[1.15fr_0.85fr]">
                <AnalyticsCharts summary={analytics} loading={summaryQuery.isLoading} />
                <SubscriptionsPanel subscriptions={subscriptions} loading={subscriptionsQuery.isLoading} />
              </div>

              <div className="px-4">
                <AiInsightsPanel
                  result={insightsMutation.data}
                  loading={insightsMutation.isPending}
                  transactionCount={analytics?.transactionCount ?? 0}
                  onGenerate={() => insightsMutation.mutate()}
                />
              </div>

              <div className="px-4 text-xs text-muted-foreground md:hidden">Swipe the table sideways for balance, category, and actions.</div>
              <div>
                <Table className="min-w-265">
                  <TableHeader className="bg-muted/55">
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead className="text-right">Confidence</TableHead>
                      <TableHead className={tableActionHeadClass}>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading && transactions.length === 0 ? <SkeletonRows /> : null}
                    {transactions.map((transaction) => (
                      <TableRow key={transaction.id} className="group">
                        <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">{transaction.date}</TableCell>
                        <TableCell className="max-w-[18rem] truncate font-medium">
                          {transaction.description}
                          {transaction.duplicateOfId ? <p className="text-xs text-amber-700">Possible duplicate</p> : null}
                        </TableCell>
                        <TableCell className={`text-right font-mono font-semibold ${transaction.amount < 0 ? "text-foreground" : "text-primary"}`}>
                          {formatMoney(transaction.amount, transaction.currencyCode)}
                        </TableCell>
                        <TableCell>
                          <TypeBadge type={transaction.type} />
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-right font-mono text-muted-foreground">
                          {transaction.balanceAfter === null ? "Not found" : formatMoney(transaction.balanceAfter, transaction.currencyCode, false)}
                        </TableCell>
                        <TableCell>{transaction.category ? <CategoryBadge value={transaction.category} /> : <span className="text-muted-foreground">None</span>}</TableCell>
                        <TableCell>
                          <StatusBadge status={transaction.status} />
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{transaction.accountLabel}</TableCell>
                        <TableCell className="text-right font-semibold text-primary">{Math.round(transaction.confidence * 100)}%</TableCell>
                        <TableCell className={tableActionColumnClass}>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => deleteTransaction(transaction)}
                            disabled={working}
                            aria-label={`Delete transaction ${transaction.description}`}
                            title="Delete transaction"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {!loading && transactions.length === 0 ? <EmptyRows /> : null}
                  </TableBody>
                </Table>
              </div>
              <div className="flex flex-col gap-3 border-t bg-muted/30 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ShieldCheck className="size-4 text-primary" />
                  Filters, exports, rules, and rows use tenant-scoped backend queries.
                </div>
                <Button variant="outline" onClick={() => nextCursor && load(nextCursor)} disabled={!nextCursor || loading} className="sm:w-auto">
                  {loading ? <Loader2 data-icon="inline-start" className="size-4 animate-spin" /> : null}
                  Load more
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}

function DraftEditor({
  draft,
  index,
  onChange,
  onRemove
}: {
  draft: TransactionDraft;
  index: number;
  onChange: (index: number, patch: Partial<TransactionDraft>) => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div className="rounded-md border bg-background p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">Draft {index + 1}</Badge>
          <StatusBadge status={draft.status} />
          {draft.duplicate.isDuplicate ? (
            <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
              Duplicate warning
            </Badge>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-primary">{Math.round(draft.confidence * 100)}% confidence</span>
          <Button type="button" variant="outline" size="sm" onClick={() => onRemove(index)} aria-label={`Discard draft ${index + 1}`} title="Discard draft" className="h-9 px-2.5">
            <Trash2 className="size-4" />
            <span className="hidden sm:inline">Discard</span>
          </Button>
        </div>
      </div>
      {draft.duplicate.isDuplicate ? (
        <p className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          This appears to match an existing saved row. Discard it if the transaction was already recorded.
        </p>
      ) : null}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Field label="Date">
          <Input type="date" value={draft.date} onChange={(event) => onChange(index, { date: event.target.value })} />
        </Field>
        <Field label="Type">
          <Select value={draft.type} onChange={(value) => onChange(index, { type: value as TransactionType })}>
            <option value="DEBIT">Debit</option>
            <option value="CREDIT">Credit</option>
          </Select>
        </Field>
        <Field label="Amount">
          <Input type="number" step="0.01" value={draft.amount} onChange={(event) => onChange(index, { amount: Number(event.target.value) })} />
        </Field>
        <Field label="Currency">
          <Select value={draft.currencyCode} onChange={(value) => onChange(index, { currencyCode: value })}>
            <option value="INR">INR</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
          </Select>
        </Field>
        <Field label="Balance">
          <Input
            type="number"
            step="0.01"
            value={draft.balanceAfter ?? ""}
            onChange={(event) => onChange(index, { balanceAfter: event.target.value === "" ? null : Number(event.target.value) })}
          />
        </Field>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-[1.4fr_0.7fr_0.7fr]">
        <Field label="Description">
          <Input value={draft.description} onChange={(event) => onChange(index, { description: event.target.value })} maxLength={160} />
        </Field>
        <Field label="Category">
          <Input value={draft.category ?? ""} onChange={(event) => onChange(index, { category: event.target.value || null })} maxLength={60} />
        </Field>
        <Field label="Status">
          <Select value={draft.status} onChange={(value) => onChange(index, { status: value as TransactionStatus })}>
            <option value="SAVED">Saved</option>
            <option value="NEEDS_REVIEW">Needs review</option>
          </Select>
        </Field>
      </div>
    </div>
  );
}

function FeedbackPanel({ feedback }: { feedback: Feedback }) {
  const isSuccess = feedback.tone === "success";
  const isError = feedback.tone === "error";
  const Icon = isSuccess ? CheckCircle2 : isError ? AlertTriangle : ShieldCheck;

  return (
    <div
      className={`rounded-lg border px-4 py-4 ${
        isSuccess
          ? "border-emerald-200 bg-emerald-50 text-emerald-950"
          : isError
            ? "border-rose-200 bg-rose-50 text-rose-950"
            : "border-slate-200 bg-muted/45 text-foreground"
      }`}
    >
      <div className="flex gap-3">
        <Icon className={`mt-0.5 size-5 shrink-0 ${isError ? "text-rose-600" : "text-primary"}`} />
        <div>
          <p className="font-semibold">{feedback.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{feedback.message}</p>
        </div>
      </div>
    </div>
  );
}

function InsightList({ title, items }: { title: string; items: { label: string; value: string }[] }) {
  return (
    <div className="rounded-md border bg-background p-3">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Layers3 className="size-4 text-primary" />
        {title}
      </h2>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">No data in the current view.</p>
      ) : (
        <div className="mt-3 space-y-2">
          {items.map((item) => (
            <div key={item.label} className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate text-muted-foreground">{item.label}</span>
              <span className="font-mono font-semibold text-foreground">{item.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AnalyticsCharts({ summary, loading }: { summary: AnalyticsSummary | undefined; loading: boolean }) {
  const monthly = summary?.monthlySeries ?? [];
  const categories = summary?.categoryTotals.slice(0, 5) ?? [];
  const hasData = Boolean(summary && summary.transactionCount > 0);

  return (
    <div className="rounded-md border bg-background p-3">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <PieChart className="size-4 text-primary" />
        Spend analytics
      </h2>
      {loading ? (
        <div className="mt-3 h-62 rounded-md bg-muted" />
      ) : !hasData ? (
        <p className="mt-3 text-sm text-muted-foreground">No saved transactions match these filters yet.</p>
      ) : (
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <div className="h-62 min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} width={48} />
                <Tooltip formatter={(value) => formatMoney(Number(value), summary?.primaryCurrencyCode, false)} />
                <Bar dataKey="spend" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="income" fill="#0f766e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="h-62 min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie data={categories} dataKey="spend" nameKey="category" innerRadius={46} outerRadius={82} paddingAngle={3}>
                  {categories.map((entry, index) => (
                    <Cell key={entry.category} fill={chartColors[index % chartColors.length] ?? "#047857"} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatMoney(Number(value), summary?.primaryCurrencyCode, false)} />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

function SubscriptionsPanel({ subscriptions, loading }: { subscriptions: SubscriptionCandidate[]; loading: boolean }) {
  return (
    <div className="rounded-md border bg-background p-3">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <RefreshCw className="size-4 text-primary" />
        Recurring charges
      </h2>
      {loading ? (
        <div className="mt-3 space-y-2">
          <div className="h-12 rounded-md bg-muted" />
          <div className="h-12 rounded-md bg-muted" />
        </div>
      ) : subscriptions.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No recurring debit pattern detected in this filtered set.</p>
      ) : (
        <div className="mt-3 divide-y rounded-md border">
          {subscriptions.map((item) => (
            <div key={`${item.merchant}-${item.amount}-${item.lastChargeDate}`} className="grid gap-2 px-3 py-3 text-sm sm:grid-cols-[1fr_auto]">
              <div className="min-w-0">
                <p className="truncate font-semibold text-foreground">{item.merchant}</p>
                <p className="text-xs text-muted-foreground">
                  {item.cadence} cadence · last charged {item.lastChargeDate}
                </p>
              </div>
              <div className="text-left sm:text-right">
                <p className="font-mono font-semibold">{formatMoney(-item.amount, item.currencyCode)}</p>
                <p className="text-xs text-primary">{Math.round(item.confidence * 100)}% confidence</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AiInsightsPanel({
  result,
  loading,
  transactionCount,
  onGenerate
}: {
  result: { insights: InsightCard[]; status: string } | undefined;
  loading: boolean;
  transactionCount: number;
  onGenerate: () => void;
}) {
  const status = result?.status;
  const disabledMessage =
    status === "disabled"
      ? "AI insights are disabled for this environment."
      : status === "missing_api_key"
        ? "AI insights need an OpenAI API key on the backend."
        : status === "not_enough_data"
          ? "Save at least three transactions to generate meaningful insights."
          : status === "empty" || transactionCount === 0
            ? "Save transactions first; new workspaces stay empty until you import data."
            : null;

  return (
    <div className="rounded-md border bg-background p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Sparkles className="size-4 text-primary" />
            AI spending insights
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">Generated from tenant-scoped aggregates only.</p>
        </div>
        <Button type="button" variant="outline" onClick={onGenerate} disabled={loading || transactionCount === 0} className="h-10">
          {loading ? <Loader2 data-icon="inline-start" className="size-4 animate-spin" /> : <Sparkles data-icon="inline-start" className="size-4" />}
          Generate
        </Button>
      </div>
      {loading ? <p className="mt-3 text-sm text-muted-foreground">Analyzing aggregate trends...</p> : null}
      {disabledMessage ? <p className="mt-3 rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">{disabledMessage}</p> : null}
      {result?.insights?.length ? (
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {result.insights.map((insight) => (
            <div key={insight.title} className="rounded-md border px-3 py-3">
              <div className="flex items-start justify-between gap-3">
                <p className="font-semibold text-foreground">{insight.title}</p>
                <Badge variant="outline" className={insight.severity === "warning" ? "border-amber-200 bg-amber-50 text-amber-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}>
                  {insight.metric}
                </Badge>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{insight.summary}</p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid min-w-0 gap-1.5 text-xs font-medium text-muted-foreground">
      {label}
      {children}
    </label>
  );
}

function Select({ value, onChange, children }: { value: string; onChange: (value: string) => void; children: ReactNode }) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-11 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    >
      {children}
    </select>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-background px-3 py-2 text-right shadow-sm shadow-slate-950/5">
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <p className="mt-0.5 whitespace-nowrap font-mono text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function SkeletonRows() {
  return Array.from({ length: 5 }).map((_, index) => (
    <TableRow key={index}>
      {Array.from({ length: 10 }).map((__, cellIndex) => (
        <TableCell key={cellIndex}>
          <div className="h-3 rounded-full bg-muted" />
        </TableCell>
      ))}
    </TableRow>
  ));
}

function EmptyRows() {
  return (
    <TableRow>
      <TableCell colSpan={10} className="h-60">
        <div className="flex flex-col items-center justify-center gap-3 text-center">
          <div className="flex size-12 items-center justify-center rounded-md border bg-background text-muted-foreground">
            <Search className="size-6" />
          </div>
          <div>
            <p className="font-semibold text-foreground">No transactions in this view</p>
            <p className="mt-1 text-sm text-muted-foreground">Preview and save drafts, or adjust the active filters.</p>
          </div>
        </div>
      </TableCell>
    </TableRow>
  );
}

function TypeBadge({ type }: { type: TransactionType }) {
  return (
    <Badge variant="outline" className={type === "DEBIT" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}>
      {type}
    </Badge>
  );
}

function StatusBadge({ status }: { status: TransactionStatus }) {
  return (
    <Badge variant="outline" className={status === "NEEDS_REVIEW" ? "border-amber-200 bg-amber-50 text-amber-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}>
      {status === "NEEDS_REVIEW" ? "Needs review" : "Saved"}
    </Badge>
  );
}

function CategoryBadge({ value }: { value: string }) {
  return (
    <Badge variant="outline" className="border-sky-200 bg-sky-50 text-sky-700">
      {value}
    </Badge>
  );
}

function buildQuery(filters: Filters, cursor?: string): string {
  const params = new URLSearchParams();
  params.set("limit", "10");
  if (cursor) params.set("cursor", cursor);
  for (const [key, value] of Object.entries(filters)) {
    if (value.trim()) params.set(key, value.trim());
  }
  return params.toString();
}

function compactFilters(filters: Filters): Partial<TransactionFiltersForApi> {
  const compacted: Partial<TransactionFiltersForApi> = {};
  for (const [key, value] of Object.entries(filters)) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    if (key === "minConfidence") compacted.minConfidence = Number(trimmed);
    else compacted[key as keyof Omit<TransactionFiltersForApi, "minConfidence">] = trimmed as never;
  }
  return compacted;
}

type TransactionFiltersForApi = {
  search: string;
  dateFrom: string;
  dateTo: string;
  type: TransactionType;
  category: string;
  status: TransactionStatus;
  accountLabel: string;
  minConfidence: number;
};

function getInitials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "L"
  );
}

function formatMoney(value: number, currencyCode = "INR", showSign = true): string {
  const prefix = showSign ? (value < 0 ? "-" : "+") : "";
  const locale = currencyCode === "INR" ? "en-IN" : "en-US";
  const symbol = currencySymbol(currencyCode);
  return `${prefix}${symbol}${Math.abs(value).toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function currencySymbol(currencyCode: string): string {
  if (currencyCode === "INR") return "₹";
  if (currencyCode === "USD") return "$";
  if (currencyCode === "EUR") return "€";
  if (currencyCode === "GBP") return "£";
  return `${currencyCode} `;
}
