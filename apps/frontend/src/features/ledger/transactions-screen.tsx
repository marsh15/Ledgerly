"use client";

import { AlertTriangle, ChevronDown, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLedgerMutations, useTransactions } from "./queries";
import { emptyFilters, type Filters, type PresentedTransaction, type TransactionInput } from "./types";
import { ErrorBlock, LoadingBlock, money, ScreenHeading } from "./presentation";
import { TransactionForm } from "./transaction-form";

export function TransactionsScreen({ token, userId }: { token: string; userId: string }) {
  const [draftFilters, setDraftFilters] = useState<Filters>(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState<Filters>(emptyFilters);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [editing, setEditing] = useState<PresentedTransaction | "new" | null>(null);
  const [deleting, setDeleting] = useState<PresentedTransaction | null>(null);
  const query = useTransactions(token, userId, appliedFilters);
  const mutations = useLedgerMutations(token, userId);
  const transactions = useMemo(() => query.data?.pages.flatMap((page) => page.items) ?? [], [query.data]);
  const activeCount = Object.values(appliedFilters).filter(Boolean).length;

  async function save(input: TransactionInput) {
    try {
      if (editing === "new") await mutations.createTransaction.mutateAsync(input);
      else if (editing) await mutations.editTransaction.mutateAsync({ id: editing.id, input: { ...input, expectedUpdatedAt: editing.updatedAt } });
      setEditing(null);
      toast.success(editing === "new" ? "Transaction added" : "Transaction updated");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to save transaction"); }
  }

  async function remove() {
    if (!deleting) return;
    try { await mutations.deleteTransaction.mutateAsync(deleting.id); toast.success("Transaction deleted"); setDeleting(null); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Unable to delete transaction"); }
  }

  return <>
    <ScreenHeading title="Transactions" description="Search, review, and correct every ledger entry." action={<Button onClick={() => setEditing("new")}><Plus className="size-4" />Add transaction</Button>} />
    <section className="border bg-white">
      <button className="flex w-full items-center justify-between border-b px-5 py-4 text-left text-sm font-semibold" onClick={() => setFiltersOpen((open) => !open)} aria-expanded={filtersOpen}><span>Filters {activeCount ? <span className="ml-2 text-primary">{activeCount} applied</span> : null}</span><ChevronDown className={`size-4 transition-transform ${filtersOpen ? "rotate-180" : ""}`} /></button>
      {filtersOpen ? <form className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-[1.5fr_1fr_1fr_1fr_1fr_auto]" onSubmit={(event) => { event.preventDefault(); setAppliedFilters(draftFilters); }}>
        <label className="relative"><span className="sr-only">Search descriptions</span><Search className="absolute left-3 top-3 size-4 text-muted-foreground" /><Input className="pl-9" placeholder="Search descriptions" value={draftFilters.search} onChange={(e) => setDraftFilters({ ...draftFilters, search: e.target.value })} /></label>
        <Input aria-label="From date" type="date" value={draftFilters.dateFrom} onChange={(e) => setDraftFilters({ ...draftFilters, dateFrom: e.target.value })} />
        <select aria-label="Transaction type" className="form-control" value={draftFilters.type} onChange={(e) => setDraftFilters({ ...draftFilters, type: e.target.value as Filters["type"] })}><option value="">All types</option><option value="DEBIT">Debit</option><option value="CREDIT">Credit</option></select>
        <select aria-label="Review status" className="form-control" value={draftFilters.status} onChange={(e) => setDraftFilters({ ...draftFilters, status: e.target.value as Filters["status"] })}><option value="">All statuses</option><option value="SAVED">Saved</option><option value="NEEDS_REVIEW">Needs review</option></select>
        <Input aria-label="Currency code" placeholder="Currency" maxLength={3} value={draftFilters.currencyCode} onChange={(e) => setDraftFilters({ ...draftFilters, currencyCode: e.target.value.toUpperCase() })} />
        <Button type="submit" variant="outline">Apply filters</Button>
      </form> : null}
    </section>
    <div className="mt-4">
      {query.isLoading ? <LoadingBlock /> : query.error ? <ErrorBlock message={query.error.message} /> : transactions.length === 0 ? <div className="border bg-white px-6 py-16 text-center"><p className="font-semibold">No transactions found</p><p className="mt-1 text-sm text-muted-foreground">Try clearing the filters or add a transaction.</p></div> : <>
        <div className="hidden overflow-x-auto border bg-white md:block"><table className="w-full min-w-[980px] text-left text-sm"><thead className="border-b bg-slate-50/70 text-xs text-muted-foreground"><tr><Th>Date</Th><Th>Description</Th><Th>Category</Th><Th>Account</Th><Th>Type</Th><Th>Amount</Th><Th>Status</Th><th className="w-24 px-4 py-3"><span className="sr-only">Actions</span></th></tr></thead><tbody className="divide-y">{transactions.map((transaction) => <tr key={transaction.id} className={transaction.status === "NEEDS_REVIEW" ? "bg-amber-50/55" : "hover:bg-slate-50/60"}><td className="whitespace-nowrap px-4 py-4 text-muted-foreground">{transaction.date}</td><td className="max-w-[280px] px-4 py-4 font-medium"><span className="block truncate">{transaction.description}</span></td><td className="px-4 py-4 text-muted-foreground">{transaction.category ?? "Uncategorized"}</td><td className="px-4 py-4 text-muted-foreground">{transaction.accountLabel}</td><td className="px-4 py-4 text-muted-foreground">{transaction.type === "DEBIT" ? "Debit" : "Credit"}</td><td className="whitespace-nowrap px-4 py-4 font-semibold tabular-nums">{money(Math.abs(transaction.amount), transaction.currencyCode)}</td><td className="px-4 py-4">{transaction.status === "NEEDS_REVIEW" ? <span className="inline-flex items-center gap-1.5 text-amber-700"><AlertTriangle className="size-3.5" />Needs review</span> : <span className="text-muted-foreground">Saved</span>}</td><td className="px-3 py-2"><div className="flex justify-end"><button className="rounded p-2 hover:bg-slate-100" onClick={() => setEditing(transaction)} aria-label={`Edit ${transaction.description}`}><Pencil className="size-4" /></button><button className="rounded p-2 text-red-700 hover:bg-red-50" onClick={() => setDeleting(transaction)} aria-label={`Delete ${transaction.description}`}><Trash2 className="size-4" /></button></div></td></tr>)}</tbody></table></div>
        <div className="space-y-3 md:hidden">{transactions.map((transaction) => <article key={transaction.id} className="border bg-white p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-medium">{transaction.description}</p><p className="mt-1 text-xs text-muted-foreground">{transaction.date} · {transaction.category ?? "Uncategorized"}</p></div><strong className="text-sm tabular-nums">{money(Math.abs(transaction.amount), transaction.currencyCode)}</strong></div><div className="mt-4 flex items-center justify-between"><span className="text-xs text-muted-foreground">{transaction.accountLabel} · {transaction.type}</span><Button size="sm" variant="ghost" onClick={() => setEditing(transaction)}>Edit</Button></div></article>)}</div>
        {query.hasNextPage ? <div className="mt-5 text-center"><Button variant="outline" disabled={query.isFetchingNextPage} onClick={() => query.fetchNextPage()}>{query.isFetchingNextPage ? "Loading…" : "Load more"}</Button></div> : null}
      </>}
    </div>
    {editing ? <div className="fixed inset-0 z-50 bg-slate-950/30" onMouseDown={() => setEditing(null)}><section role="dialog" aria-modal="true" aria-labelledby="transaction-dialog-title" className="ml-auto flex h-full w-full max-w-md flex-col bg-white shadow-xl" onMouseDown={(event) => event.stopPropagation()}><div className="flex items-center justify-between border-b px-6 py-5"><h2 id="transaction-dialog-title" className="text-xl font-semibold">{editing === "new" ? "Add transaction" : "Edit transaction"}</h2><button onClick={() => setEditing(null)} aria-label="Close"><X className="size-5" /></button></div><TransactionForm {...(editing === "new" ? {} : { transaction: editing })} busy={mutations.createTransaction.isPending || mutations.editTransaction.isPending} onCancel={() => setEditing(null)} onSubmit={save} /></section></div> : null}
    {deleting ? <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/35 p-4"><section role="alertdialog" aria-modal="true" aria-labelledby="delete-title" className="w-full max-w-md border bg-white p-6 shadow-xl"><h2 id="delete-title" className="text-lg font-semibold">Delete this transaction?</h2><p className="mt-2 text-sm text-muted-foreground">{deleting.description} will be permanently removed. This action cannot be undone.</p><div className="mt-6 flex justify-end gap-3"><Button variant="outline" onClick={() => setDeleting(null)}>Cancel</Button><Button className="bg-red-700 hover:bg-red-800" disabled={mutations.deleteTransaction.isPending} onClick={remove}>Delete transaction</Button></div></section></div> : null}
  </>;
}

function Th({ children }: { children: ReactNode }) { return <th className="px-4 py-3 font-medium">{children}</th>; }
