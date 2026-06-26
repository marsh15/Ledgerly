"use client";

import { AlertTriangle, ArrowRight, CheckCircle2, Copy, Sparkles } from "lucide-react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { ledgerKeys, useAnalytics } from "./queries";
import { emptyFilters } from "./types";
import { ErrorBlock, LoadingBlock, money, ScreenHeading } from "./presentation";

type Subscription = { merchant: string; amount: number; currencyCode: string; cadence: string; lastChargeDate: string; transactionCount: number };

export function OverviewScreen({ token, userId }: { token: string; userId: string }) {
  const analytics = useAnalytics(token, userId, emptyFilters);
  const subscriptions = useQuery({
    queryKey: [...ledgerKeys.root(userId), "subscriptions"],
    queryFn: () => apiFetch<{ subscriptions: Subscription[] }>("/api/analytics/subscriptions", token)
  });
  if (analytics.isLoading) return <><ScreenHeading title="Overview" description="Import, review, and clean your ledger so your numbers stay accurate." /><LoadingBlock /></>;
  if (analytics.error) return <><ScreenHeading title="Overview" description="Import, review, and clean your ledger so your numbers stay accurate." /><ErrorBlock message={analytics.error.message} /></>;
  const data = analytics.data;
  const primary = data?.currencySummaries[0];
  return <>
    <ScreenHeading title="Overview" description="Import, review, and clean your ledger so your numbers stay accurate." action={<Button asChild><Link href="/import">Import transactions</Link></Button>} />
    {!data?.transactionCount ? <div className="border bg-white px-6 py-16 text-center"><Sparkles className="mx-auto size-7 text-primary" /><h2 className="mt-4 text-xl font-semibold">Your clean ledger starts here</h2><p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">Import a CSV or add a transaction manually. Ledgerly will flag duplicates and anything that needs a closer look.</p><Button asChild className="mt-6"><Link href="/import">Import your first statement</Link></Button></div> : <>
      <section className="border bg-white" aria-labelledby="currency-heading">
        <div className="border-b px-5 py-4"><h2 id="currency-heading" className="font-semibold">Balances by currency</h2><p className="mt-1 text-xs text-muted-foreground">Currencies are shown separately and never added together.</p></div>
        <div className="grid divide-y md:grid-cols-2 md:divide-x md:divide-y-0 xl:grid-cols-3">
          {data.currencySummaries.map((summary) => <div key={summary.currencyCode} className="px-5 py-5"><div className="flex items-center justify-between"><strong className="text-lg">{summary.currencyCode}</strong><span className="text-xs text-muted-foreground">{summary.totals.debitCount + summary.totals.creditCount} entries</span></div><div className="mt-5 grid grid-cols-3 gap-3"><Metric label="Spend" value={money(summary.totals.spend, summary.currencyCode)} /><Metric label="Income" value={money(summary.totals.income, summary.currencyCode)} /><Metric label="Net" value={money(summary.totals.net, summary.currencyCode)} /></div></div>)}
        </div>
      </section>
      <div className="mt-4 grid gap-4 xl:grid-cols-[0.72fr_1.28fr]">
        <section className="border bg-white p-5"><h2 className="font-semibold">Needs review</h2><div className="mt-4 divide-y">
          <ReviewRow icon={<AlertTriangle className="size-4 text-amber-600" />} label="Unreviewed transactions" count={data.reviewCount} />
          <ReviewRow icon={<Copy className="size-4 text-slate-500" />} label="Possible duplicates" count={data.duplicateCount} />
          <ReviewRow icon={<CheckCircle2 className="size-4 text-emerald-700" />} label="Ledger entries" count={data.transactionCount} />
        </div><Link href="/transactions" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary">Go to transactions <ArrowRight className="size-4" /></Link></section>
        <section className="min-h-[330px] border bg-white p-5"><div className="flex items-start justify-between"><div><h2 className="font-semibold">Cash flow</h2><p className="mt-1 text-xs text-muted-foreground">{primary ? `${primary.currencyCode} only. Income and spend by month.` : "No chart data"}</p></div></div>
          {primary ? <div className="mt-5 h-64" role="img" aria-label={`Monthly ${primary.currencyCode} income and spend. ${primary.monthlySeries.map((point) => `${point.month}: income ${point.income}, spend ${point.spend}`).join("; ")}`}><ResponsiveContainer width="100%" height="100%"><BarChart data={primary.monthlySeries}><CartesianGrid vertical={false} stroke="#e5e7eb" /><XAxis dataKey="month" fontSize={11} tickLine={false} /><YAxis fontSize={11} tickLine={false} /><Tooltip formatter={(value) => money(Number(value), primary.currencyCode)} /><Bar dataKey="income" fill="#16a36a" radius={[2,2,0,0]} isAnimationActive={false} /><Bar dataKey="spend" fill="#cbd5e1" radius={[2,2,0,0]} isAnimationActive={false} /></BarChart></ResponsiveContainer></div> : null}
        </section>
      </div>
      <section className="mt-4 border bg-white"><div className="border-b px-5 py-4"><h2 className="font-semibold">Recurring charges</h2></div>{subscriptions.data?.subscriptions.length ? <div className="divide-y">{subscriptions.data.subscriptions.slice(0, 6).map((item) => <div key={`${item.merchant}-${item.currencyCode}`} className="grid grid-cols-[1fr_auto] gap-3 px-5 py-4 sm:grid-cols-[1fr_130px_130px]"><div><p className="text-sm font-medium">{item.merchant}</p><p className="mt-1 text-xs text-muted-foreground">Last charged {item.lastChargeDate}</p></div><span className="hidden text-sm text-muted-foreground sm:block">{item.cadence}</span><strong className="text-right text-sm tabular-nums">{money(item.amount, item.currencyCode)}</strong></div>)}</div> : <p className="px-5 py-10 text-center text-sm text-muted-foreground">Recurring charges appear after at least three matching transactions.</p>}</section>
    </>}
  </>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 truncate text-sm font-semibold tabular-nums" title={value}>{value}</p></div>; }
function ReviewRow({ icon, label, count }: { icon: ReactNode; label: string; count: number }) { return <div className="flex items-center gap-3 py-4 first:pt-1"><span>{icon}</span><span className="flex-1 text-sm">{label}</span><strong className="text-sm tabular-nums">{count}</strong></div>; }
