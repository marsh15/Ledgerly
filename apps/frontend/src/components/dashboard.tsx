"use client";

import { AlertTriangle, CheckCircle2, ClipboardList, FileText, Loader2, LockKeyhole, LogOut, ReceiptText, SendHorizontal, ShieldCheck } from "lucide-react";
import { signOut } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api";

type Transaction = {
  id: string;
  date: string;
  description: string;
  type: "DEBIT" | "CREDIT";
  amount: number;
  balanceAfter: number | null;
  category: string | null;
  confidence: number;
  createdAt: string;
};

type TransactionsPage = {
  items?: Transaction[];
  transactions?: Transaction[];
  nextCursor: string | null;
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
12/11/2025 → ₹1,250.00 debited
Available Balance → ₹17,170.50`
  },
  {
    label: "Export",
    text: "txn123 2025-12-10 Amazon.in Order #403-1234567-8901234 ₹2,999.00 Dr Bal 14171.50 Shopping"
  }
];

type Feedback = {
  tone: "success" | "error" | "idle";
  title: string;
  message: string;
};

export function Dashboard({ token, userName }: { token: string; userName: string }) {
  const [text, setText] = useState(samples[0]?.text ?? "");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>({
    tone: "idle",
    title: "Ready to extract",
    message: "Paste a transaction snippet or load a sample to begin."
  });

  const totalSpend = useMemo(
    () => transactions.reduce((sum, transaction) => sum + (transaction.amount < 0 ? Math.abs(transaction.amount) : 0), 0),
    [transactions]
  );
  const averageConfidence = useMemo(() => {
    if (transactions.length === 0) return null;
    return Math.round((transactions.reduce((sum, transaction) => sum + transaction.confidence, 0) / transactions.length) * 100);
  }, [transactions]);

  async function load(cursor?: string) {
    setLoading(true);
    try {
      const page = await apiFetch<TransactionsPage>(`/api/transactions?limit=10${cursor ? `&cursor=${cursor}` : ""}`, token);
      const items = page.items ?? page.transactions ?? [];
      setTransactions((current) => (cursor ? [...current, ...items] : items));
      setNextCursor(page.nextCursor);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load transactions";
      setFeedback({ tone: "error", title: "Ledger could not load", message });
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  async function parseAndSave() {
    setSaving(true);
    setFeedback({ tone: "idle", title: "Parsing transaction", message: "Ledgerly is normalizing the submitted text." });
    try {
      const result = await apiFetch<{ transaction: Transaction }>("/api/transactions/extract", token, {
        method: "POST",
        body: JSON.stringify({ text })
      });
      setTransactions((current) => [result.transaction, ...current]);
      setFeedback({
        tone: "success",
        title: "Transaction saved",
        message: `${result.transaction.description} was added with ${Math.round(result.transaction.confidence * 100)}% confidence.`
      });
      toast.success("Transaction parsed and saved");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to parse transaction";
      setFeedback({ tone: "error", title: "Parsing failed", message });
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const initials = getInitials(userName);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,hsl(var(--secondary))_0,transparent_34rem),linear-gradient(180deg,hsl(var(--background)),#fff_42rem)]">
      <header className="border-b bg-card/88 backdrop-blur">
        <div className="mx-auto flex max-w-[88rem] items-center justify-between px-4 py-4 sm:px-6">
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

      <div className="mx-auto grid max-w-[88rem] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(22rem,0.78fr)_minmax(0,1.35fr)]">
        <Card className="self-start overflow-hidden border-slate-200/80">
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="size-5 text-primary" />
                  Extract transactions
                </CardTitle>
                <CardDescription className="mt-2 max-w-prose">
                  Paste raw text from a bank message, email, or statement excerpt.
                </CardDescription>
              </div>
              <Badge variant="outline" className="hidden whitespace-nowrap text-primary sm:inline-flex">
                Secure
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="transaction-text" className="text-sm font-semibold text-foreground">
                  Raw transaction text
                </label>
                <button
                  type="button"
                  onClick={() => setText("")}
                  className="text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
                >
                  Clear
                </button>
              </div>
              <Textarea
                id="transaction-text"
                value={text}
                onChange={(event) => setText(event.target.value)}
                aria-label="Statement text"
                className="min-h-48 resize-y font-mono text-[13px] tabular-nums"
              />
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="size-1.5 rounded-full bg-primary" />
                {text.trim().length > 0 ? `${text.trim().length.toLocaleString("en-IN")} characters ready` : "Paste a snippet to enable parsing"}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">Try a sample</p>
              <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              {samples.map((sample) => (
                <Button key={sample.label} type="button" variant="secondary" size="sm" onClick={() => setText(sample.text)} className="justify-start">
                  <ClipboardList data-icon="inline-start" className="size-4" />
                  {sample.label}
                </Button>
              ))}
              </div>
            </div>

            <Button onClick={parseAndSave} disabled={saving || text.trim().length < 8} className="h-11">
              {saving ? <Loader2 data-icon="inline-start" className="size-4 animate-spin" /> : <SendHorizontal data-icon="inline-start" className="size-4" />}
              Parse & Save transaction
            </Button>

            <div className="flex items-center gap-2 rounded-md border border-primary/15 bg-secondary/70 px-3 py-2.5 text-xs text-muted-foreground">
              <LockKeyhole className="size-4 text-primary" />
              Ownership is derived from your verified session, never from pasted text.
            </div>

            <FeedbackPanel feedback={feedback} />
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-slate-200/80">
          <CardHeader className="border-b bg-card pb-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <ReceiptText className="size-5 text-primary" />
                  Transactions
                </CardTitle>
                <CardDescription className="mt-2">
                  Cursor-paginated and scoped to your private organization.
                </CardDescription>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:flex">
                <Stat label="Saved" value={transactions.length.toLocaleString("en-IN")} />
                <Stat label="Spend" value={`₹${totalSpend.toLocaleString("en-IN")}`} />
                <Stat label="Confidence" value={averageConfidence === null ? "—" : `${averageConfidence}%`} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/55">
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Confidence</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                {loading && transactions.length === 0
                  ? Array.from({ length: 5 }).map((_, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <SkeletonLine className="w-20" />
                        </TableCell>
                        <TableCell>
                          <SkeletonLine className="w-56" />
                        </TableCell>
                        <TableCell className="text-right">
                          <SkeletonLine className="ml-auto w-16" />
                        </TableCell>
                        <TableCell>
                          <SkeletonLine className="w-14" />
                        </TableCell>
                        <TableCell className="text-right">
                          <SkeletonLine className="ml-auto w-20" />
                        </TableCell>
                        <TableCell>
                          <SkeletonLine className="w-16" />
                        </TableCell>
                        <TableCell className="text-right">
                          <SkeletonLine className="ml-auto w-12" />
                        </TableCell>
                      </TableRow>
                    ))
                  : null}
                {transactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">{transaction.date}</TableCell>
                    <TableCell className="max-w-[18rem] truncate font-medium">{transaction.description}</TableCell>
                    <TableCell className={`text-right font-mono font-semibold ${transaction.amount < 0 ? "text-foreground" : "text-primary"}`}>
                      {formatMoney(transaction.amount)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={transaction.type === "DEBIT" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}
                      >
                        {transaction.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right font-mono text-muted-foreground">
                      {transaction.balanceAfter === null ? "Not found" : formatMoney(transaction.balanceAfter, false)}
                    </TableCell>
                    <TableCell>
                      {transaction.category ? (
                        <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
                          {transaction.category}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">None</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-primary">{Math.round(transaction.confidence * 100)}%</TableCell>
                  </TableRow>
                ))}
                {!loading && transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-60">
                      <div className="flex flex-col items-center justify-center gap-3 text-center">
                        <div className="flex size-12 items-center justify-center rounded-md border bg-background text-muted-foreground">
                          <ReceiptText className="size-6" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">No transactions yet</p>
                          <p className="mt-1 text-sm text-muted-foreground">Paste text and click Parse & Save transaction to get started.</p>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : null}
                </TableBody>
              </Table>
            </div>
            <div className="flex flex-col gap-3 border-t bg-muted/30 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ShieldCheck className="size-4 text-primary" />
                Only your tenant-scoped records are returned.
              </div>
              <Button variant="outline" onClick={() => nextCursor && load(nextCursor)} disabled={!nextCursor || loading} className="sm:w-auto">
                {loading ? <Loader2 data-icon="inline-start" className="size-4 animate-spin" /> : null}
                Load more
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-background px-3 py-2 text-right shadow-sm shadow-slate-950/5">
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <p className="mt-0.5 whitespace-nowrap font-mono text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function SkeletonLine({ className }: { className?: string }) {
  return <div className={`h-3 rounded-full bg-muted ${className ?? ""}`} />;
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "L";
}

function formatMoney(value: number, showSign = true): string {
  const prefix = showSign ? (value < 0 ? "-" : "+") : "";
  return `${prefix}₹${Math.abs(value).toLocaleString("en-IN")}`;
}
